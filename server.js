import 'dotenv/config';
import express from 'express';
import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { TikTokLiveConnection, WebcastEvent } from 'tiktok-live-connector';
import { Show, normalize, explainError } from './show.js';

const config = JSON.parse(readFileSync(new URL('./gifts.json', import.meta.url)));
const hosted = Boolean(process.env.PORT);
const adminKey = process.env.ADMIN_KEY || '';
if (hosted && adminKey.length < 16) throw new Error('Render: set ADMIN_KEY to a password of at least 16 characters in Environment.');
const host = process.env.HOST || (hosted ? '0.0.0.0' : '127.0.0.1');
if (host !== '127.0.0.1' && host !== 'localhost' && adminKey.length < 16) {
  throw new Error('Public hosting requires ADMIN_KEY with at least 16 characters.');
}
function authorized(req) {
  if (!adminKey) return true;
  const expected = Buffer.from('Basic ' + Buffer.from('admin:' + adminKey).toString('base64'));
  const supplied = Buffer.from(req.headers.authorization || '');
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
const app = express();
app.use((req, res, next) => {
  if (authorized(req)) return next();
  res.set('WWW-Authenticate', 'Basic realm="Qazaq Show", charset="UTF-8"');
  res.status(401).send('Authentication required');
});
const server = createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 16_384,
  allowRequest(req, done) {
    if (!authorized(req)) return done(null, false);
    const origin = req.headers.origin;
    if (!origin) return done(null, true);
    try { done(null, new URL(origin).host === req.headers.host); }
    catch { done(null, false); }
  }
});
const publicDir = fileURLToPath(new URL('./public/', import.meta.url));
app.get('/', (_, res) => res.sendFile('control.html', { root: publicDir }));
app.get('/overlay', (_, res) => res.sendFile('overlay.html', { root: publicDir }));
app.use(express.static(publicDir));
app.get('/api/tests', (_, res) => res.json(config.tests));

const shows = new Map();
function getShow(user) {
  if (!shows.has(user)) {
    if (shows.size >= 32) throw new Error('Слишком много комнат. Перезапустите сервер.');
    shows.set(user, new Show(config, (event, value) => io.to(user).emit(event, value)));
  }
  return shows.get(user);
}

// Keep the connection alive independently of control and overlay browser tabs.
class LiveFeed {
  constructor(user, show) {
    this.user = user;
    this.show = show;
    this.attempt = 0;
  }
  start() {
    clearTimeout(this.timer);
    this.timer = null;
    if (this.connection) return;
    this.show.status('connecting');
    let connection;
    try {
      connection = new TikTokLiveConnection(this.user, {
        processInitialData: false, enableExtendedGiftInfo: true,
        ...(process.env.SIGN_API_KEY ? { signApiKey: process.env.SIGN_API_KEY } : {})
      });
    } catch (error) {
      this.retry(error);
      return;
    }
    this.connection = connection;
    const on = (event, fn) => connection.on(event, data => {
      if (this.connection === connection) fn(data);
    });
    on(WebcastEvent.GIFT, data => this.show.gift(data));
    on(WebcastEvent.ROOM_USER, data => this.show.viewers(data.viewerCount ?? data.total ?? data.memberCount));
    on(WebcastEvent.CHAT, data => this.show.chat(data));
    on(WebcastEvent.FOLLOW, data => this.show.toast('follow', data));
    on(WebcastEvent.SHARE, data => this.show.toast('share', data));
    on(WebcastEvent.STREAM_END, () => this.drop(connection, new Error('Live has ended')));
    on('disconnected', data => this.drop(connection, data ?? new Error('Connection lost')));
    on('error', error => {
      if (this.show.state.status === 'live') this.drop(connection, error?.exception ?? error);
    });
    Promise.resolve().then(() => connection.connect()).then(() => {
      if (this.connection !== connection) return;
      this.attempt = 0;
      this.show.status('live');
    }).catch(error => this.drop(connection, error));
  }
  drop(connection, error) {
    if (this.connection !== connection) return;
    this.connection = null;
    Promise.resolve().then(() => connection.disconnect()).catch(() => {});
    this.retry(error);
  }
  retry(error) {
    const { status, message, retry = true, limited } = explainError(error);
    const delay = Math.min(120_000, (limited ? 30_000 : 4000) * 2 ** Math.min(this.attempt++, 6));
    this.show.status(status, retry ? message + ' Повтор через ' + Math.ceil(delay / 1000) + ' с.' : message);
    if (retry) this.timer = setTimeout(() => this.start(), delay);
    console.warn('TikTok @%s: %s', this.user, message);
  }
}

io.on('connection', socket => {
  let show;
  let room;
  let control = false;
  function respond(ack, callback) {
    if (typeof ack !== 'function') return;
    try { ack({ ok: true, ...callback() }); }
    catch (error) { ack({ ok: false, error: error.message }); }
  }
  socket.on('subscribe', (data, ack) => respond(ack, () => {
    const user = normalize(data?.user);
    const next = getShow(user);
    if (room) socket.leave(room);
    room = user;
    show = next;
    control = data?.role === 'control';
    socket.join(room);
    return { state: show.state };
  }));
  function edit(event, callback) {
    socket.on(event, (data, ack) => respond(ack, () => {
      if (!control || !show) throw new Error('Сначала выберите комнату в панели.');
      callback(data);
    }));
  }
  edit('start-live', () => {
    show.live ??= new LiveFeed(room, show);
    if (show.live.timer) throw new Error('Переподключение уже запланировано.');
    show.live.start();
  });
  edit('set-goal', data => show.goal(data));
  edit('test-gift', index => {
    const gift = Number.isInteger(index) && config.tests[index];
    if (!gift) throw new Error('Неизвестный тест.');
    const [name, coins, count] = gift;
    show.sample(name, coins, count);
  });
  edit('test-event', kind => {
    if (!['chat', 'follow', 'share'].includes(kind)) throw new Error('Неизвестное событие.');
    show.toast(kind, { user: { nickname: 'Айгерім' }, comment: 'Алға, Қазақстан!' }, true);
  });
});

const port = Number(process.env.PORT || 3000);
server.listen(port, host, () => console.log('Қазақ Шоу • http://%s:%s', host, server.address().port));
