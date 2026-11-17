const express = require('express');
const { WebSocketServer } = require('ws');
const { timingSafeEqual } = require('node:crypto');
const { TikTokLiveConnection, WebcastEvent } = require('tiktok-live-connector');
const app = express();
app.use(express.json());
app.use('/assets', express.static('assets'));
app.use('/vendor', express.static('node_modules/three'));
for (const file of ['index.html', 'club.js', 'style.css']) app.get(file === 'index.html' ? '/' : '/' + file, (_, res) => res.sendFile(require('path').join(__dirname, file)));
const hosted = Boolean(process.env.PORT);
const port = Number(process.env.PORT || 3001);
const adminKey = process.env.ADMIN_KEY || '';
if (hosted && !adminKey) throw new Error('Set ADMIN_KEY before running the hosted club');
const server = app.listen(port, hosted ? '0.0.0.0' : '127.0.0.1', () => console.log('Club listening on port ' + port));
function authorizeAdmin(req, res, next) {
  if (!adminKey) return next();
  const expected = Buffer.from('Bearer ' + adminKey);
  const received = Buffer.from(req.get('Authorization') || '');
  if (received.length === expected.length && timingSafeEqual(received, expected)) return next();
  res.status(401).json({error:'Басқару кілті қате немесе енгізілмеген.'});
}
const sockets = new WebSocketServer({ server });
let connection, generation = 0, retry, username = '', status = { state: 'offline' }, likeTotal = 0;
const history = [], seen = new Map(), appearances = new Map(), arrivals = new Map();
let diagnostics = {received:0, accepted:0, lastGiftAt:0, issue:''};
function reportGifts() { broadcast({type:'diagnostics', ...diagnostics}); }

function broadcast(event) {
  const message = JSON.stringify({...event, serverTime:Date.now()});
  for (const client of sockets.clients) if (client.readyState === 1) client.send(message);
}
function update(state, message = '') { status = { state, message, username }; broadcast({ type: 'status', ...status }); }
function viewer(data) {
  const user = data.user || data;
  const handle = String(user.uniqueId || user.displayId || data.uniqueId || data.displayId || '').trim();
  const userId = [user.idStr,user.id,user.userId,data.userId,handle]
    .map(value=>String(value ?? '').trim()).find(value=>value && value !== '0');
  if (!userId) return;
  const nickname = String(user.nickname || '').trim();
  const name = nickname || (handle ? '@' + handle : 'TikTok ' + userId);
  const thumbnail = [user.avatarThumb?.urlList?.[0],user.avatarMedium?.urlList?.[0],user.profilePictureUrl]
    .find(value=>typeof value === 'string' && /^https:\/\/[^/]+\.(?:tiktokcdn\.com|tiktokcdn-us\.com|tiktokv\.com)\//i.test(value));
  return {userId,name:name.slice(0,64),handle,thumbnail,appearance:appearances.get(userId)};
}
function giftReaction(data) {
  const details = [data.gift, data.giftDetails, data];
  const gift = details.map(info => info?.name || info?.giftName || info?.gift_name).find(Boolean) || 'TikTok';
  const coins = details.map(info => Number(info?.diamondCount || info?.diamond_count)).find(value => Number.isFinite(value) && value > 0) || 0;
  if (/crown|корон|тәж/i.test(gift)) return {gift, coins, action:'battle'};
  if (String(data.giftId || data.gift?.id) === '11046' || /\bgalaxy\b|галактик|ғаламшар/i.test(gift)) return {gift, coins, action:'galaxy'};
  if (String(data.giftId || data.gift?.id) === '5879' || /doughnut|donut|пончик/i.test(gift)) return {gift, coins, action:'duet'};
  if (coins >= 100) return {gift, coins, action:'breakdance'};
  if (coins >= 30) return {gift, coins, action:'flip'};
  if (coins >= 10) return {gift, coins, action:'dance'};
  if (coins >= 5) return {gift, coins, action:'shashu'};
  if (!coins && /finger heart|саусақ/i.test(gift)) return {gift, coins:5, action:'shashu'};
  if (!coins && /heart|серд|жүрек/i.test(gift)) return {gift, coins, action:'dance'};
  if (!coins && /\bhat\b|шляп/i.test(gift)) return {gift, coins, action:'circle'};
  return {gift, coins, action:'join'};
}
sockets.on('connection', client => {
  client.send(JSON.stringify({ type:'status', ...status, serverTime:Date.now() }));
  client.send(JSON.stringify({type:'history', gifts:history, viewers:[...arrivals.values()], likes:likeTotal, serverTime:Date.now()}));
  client.send(JSON.stringify({type:'diagnostics', ...diagnostics, serverTime:Date.now()}));
});
async function connect(token) {
  if (token !== generation) return;
  update('connecting', 'Подключаемся к @' + username);
  // Preloading the gift catalog requires a separate paid signing endpoint.
  const current = new TikTokLiveConnection(username, { processInitialData: false });
  connection = current;
  const active = () => token === generation && current === connection;
  current.on(WebcastEvent.MEMBER, data => {
    if (!active()) return;
    const guest = viewer(data);
    if (!guest) return;
    const event = {type:'join', ...guest, at:Date.now()};
    arrivals.delete(guest.userId);
    arrivals.set(guest.userId, event);
    if (arrivals.size > 150) arrivals.delete(arrivals.keys().next().value);
    broadcast(event);
  });
  current.on(WebcastEvent.CHAT, data => {
    if (!active()) return;
    const comment = String(data.comment || '').replace(/\s+/gu, ' ').trim();
    if (!comment) return;
    const command = comment.toLowerCase().replace(/^[!/]/, '');
    const appearance = /^(boy|man|male|бала|ұл|парень|м)$/.test(command) ? 'man'
      : /^(woman|girl|female|қыз|девушка|ж)$/.test(command) ? 'woman' : undefined;
    const guest = viewer(data);
    if (!guest) return;
    if (appearance) {
      appearances.set(guest.userId, appearance);
      if (appearances.size > 5000) appearances.delete(appearances.keys().next().value);
      for (const gift of history) if (gift.userId === guest.userId) gift.appearance = appearance;
    }
    const at = Date.now();
    broadcast({type:'chat', ...guest, appearance, message:Array.from(comment).slice(0, 100).join(''), at});
  });
  current.on(WebcastEvent.LIKE, data => {
    if (!active()) return;
    const total = Number(data.totalLikeCount) || 0;
    likeTotal = total > 0 ? Math.max(likeTotal, total) : likeTotal + (Number(data.likeCount) || 0);
    broadcast({type:'likes',count:likeTotal});
  });
  current.on(WebcastEvent.GIFT, data => {
    if (!active()) return;
    diagnostics.received++;
    diagnostics.lastGiftAt = Date.now();
    const guest = viewer(data);
    if (!guest) {
      diagnostics.issue = 'Сыйлық келді, бірақ жіберушінің ID-і жоқ.';
      reportGifts();
      return;
    }
    const giftId = data.giftId || data.gift?.id;
    const combo = [data.groupId, data.common?.msgId, data.msgId, data.logId].find(value => value && String(value) !== '0') || Date.now();
    const key = `${guest.userId}:${giftId}:${combo}`;
    const count = Math.max(1, Math.floor(Number(data.repeatCount) || 1));
    const prior = seen.get(key) || 0;
    if (count <= prior) { reportGifts(); return; }
    seen.set(key, count);
    if (seen.size > 5000) seen.delete(seen.keys().next().value);
    const gift = { type:'gift', ...guest, ...giftReaction(data), id:`${key}:${count}`,
      combo:key, count:count-prior, total:count, at:Date.now() };
    history.push(gift); if (history.length > 150) history.shift(); broadcast(gift);
    diagnostics.accepted += gift.count;
    diagnostics.issue = '';
    reportGifts();
  });
  current.on('error', error => {
    if (!active()) return;
    diagnostics.issue = String(error?.exception?.message || error?.message || error?.info || 'TikTok байланысының қатесі').slice(0,250);
    reportGifts();
  });
  current.on('disconnected', () => { if (active()) schedule(token, 'Связь потеряна. Переподключение через 15 секунд'); });
  current.on('streamEnd', () => { if (active()) { generation++; clearTimeout(retry); update('offline', 'Эфир завершён'); } });
  try { await current.connect(); if (!active()) { current.disconnect(); return; } clearTimeout(retry); update('connected', 'Эфир подключён'); }
  catch (error) { if (active()) schedule(token, String(error.message || error).slice(0, 250)); }
}
function schedule(token, message) { clearTimeout(retry); update('retrying', message); retry = setTimeout(() => {
  if (token !== generation) return;
  const previous = connection;
  connection = null;
  previous?.disconnect();
  connect(token);
}, 15000); }
app.post('/api/connect', authorizeAdmin, (req, res) => {
  const name = String(req.body.username || '').trim().replace(/^@/, '');
  if (!/^[\w.]{2,32}$/.test(name)) return res.status(400).json({ error: 'Введите ник TikTok без ссылки' });
  generation++; clearTimeout(retry); connection?.disconnect(); username = name; likeTotal = 0; history.length = 0; seen.clear(); appearances.clear(); arrivals.clear();
  diagnostics = {received:0, accepted:0, lastGiftAt:0, issue:''};
  broadcast({ type: 'reset' }); reportGifts(); connect(generation); res.json({ ok: true });
});
app.post('/api/disconnect', authorizeAdmin, (_, res) => { generation++; clearTimeout(retry); connection?.disconnect(); connection = null; update('offline', 'Отключено'); res.json({ ok: true }); });
app.get('/api/status', (_, res) => res.json({...status, requiresKey:Boolean(adminKey)}));
