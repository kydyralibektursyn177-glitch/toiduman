export const teams = ['almaty', 'astana', 'shymkent'];
const text = (value, max = 80) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const integer = (value, max) => Math.max(0, Math.min(max, Math.floor(Number(value) || 0)));
const key = value => text(value).toLowerCase();

export function normalize(value) {
  const user = key(value).replace(/^@/, '');
  if (!/^[a-z0-9_][a-z0-9_.]{0,23}$/.test(user) || user.endsWith('.')) {
    throw new Error('Жарамсыз атау / Некорректное имя TikTok.');
  }
  return user;
}

export function explainError(error) {
  // Connector versions can surface HTTP errors through nested causes.
  const details = [error, error?.cause, error?.exception].map(item =>
    [item?.name, item?.message ?? item, item?.code, item?.status, item?.response?.status].join(' ')
  ).join(' ');
  if (/429|rate.limit|too many|quota/i.test(details)) return {
    status: 'error', message: 'Слишком много запросов TikTok.', limited: true
  };
  if (/usernotfound|invaliduniqueid|user not found|invalid username|account not found/i.test(details)) return {
    status: 'error', message: 'Аккаунт TikTok не найден. Проверьте имя.', retry: false
  };
  if (/not.?live|offline|ended|roomnotlive/i.test(details)) return {
    status: 'offline', message: 'Аккаунт сейчас не в эфире.'
  };
  if (/401|403|sign.*key|unauthori[sz]ed|forbidden/i.test(details)) return {
    status: 'error', message: 'TikTok или сервис подписи отклонил запрос. Проверьте SIGN_API_KEY.'
  };
  return { status: 'error', message: 'Связь с TikTok потеряна или недоступна.' };
}

function donor(data) {
  const user = data.user ?? data;
  const id = String(user.userId || user.idStr || user.id || user.uniqueId || user.displayId || 'unknown');
  const name = text(user.nickname || user.uniqueId || user.displayId) || 'Көрермен';
  const image = user.profilePictureUrl || user.profilePicture?.url?.[0] ||
    user.profilePicture?.urls?.[0] || user.avatarThumb?.urlList?.[0] ||
    user.avatarLarge?.urlList?.[0] || data.profilePictureUrl;
  let avatar = '';
  try {
    const url = new URL(image);
    if (url.protocol === 'https:') avatar = url.href;
  } catch { /* The overlay displays initials when there is no avatar. */ }
  return { id, name, avatar };
}

export class Show {
  constructor(config, emit) {
    this.config = config;
    this.emit = emit;
    this.donors = new Map();
    this.members = new Map();
    this.seen = new Set();
    this.state = {
      status: 'offline', message: '', viewers: 0, feed: [], leaders: [],
      goal: { label: 'Бесбармақ дайындаймыз', gift: 'Rose', target: 300, progress: 0 },
      teams: Object.fromEntries(teams.map(team => [team, 0]))
    };
  }
  publish() { this.emit('state', this.state); }
  status(status, message = '') {
    this.state.status = status;
    this.state.message = message;
    if (status !== 'live') this.state.viewers = 0;
    this.publish();
  }
  viewers(value) {
    this.state.viewers = integer(value, 1e9);
    this.publish();
  }
  goal(data) {
    const label = text(data?.label, 100);
    const gift = text(data?.gift, 50);
    const target = Number(data?.target);
    if (!label || !gift || !Number.isInteger(target) || target < 1 || target > 1e6) {
      throw new Error('Введите название, подарок и количество от 1 до 1 000 000.');
    }
    const previous = this.state.goal;
    const progress = key(gift) === key(previous.gift) ? previous.progress : 0;
    this.state.goal = { label, gift, target, progress };
    this.preview = undefined;
    this.publish();
    if (progress >= target && previous.progress < previous.target) this.celebrate();
  }
  chat(data) {
    const match = /^!(almaty|astana|shymkent)$/i.exec(text(data.comment, 150));
    if (match) this.members.set(donor(data).id, match[1].toLowerCase());
    this.toast('chat', data);
  }
  toast(kind, data, test = false) {
    // Keep chat activity readable on busy streams.
    const now = Date.now();
    if (!test && kind === 'chat' && now - (this.lastChat || 0) < 1800) return;
    if (kind === 'chat') this.lastChat = now;
    this.emit('toast', { kind, name: donor(data).name, comment: text(data.comment, 100), test });
  }
  gift(data) {
    const details = data.giftDetails ?? data.extendedGiftInfo ?? data.gift ?? {};
    const type = Number(details.giftType ?? details.type ?? data.giftType);
    const ended = data.repeatEnd ?? details.repeatEnd;
    // TikTok emits cumulative counts throughout a streak. Credit the final packet once.
    if (type === 1 && ended !== true && Number(ended) !== 1) return;
    const messageId = data.common?.msgId ?? data.msgId;
    if (messageId != null && String(messageId) !== '0') {
      const id = String(messageId);
      if (this.seen.has(id)) return;
      this.seen.add(id);
      if (this.seen.size > 4096) this.seen.delete(this.seen.values().next().value);
    }
    const name = text(details.giftName || details.name || data.giftName || data.extendedGiftInfo?.name) || 'Сыйлық';
    const coins = integer(details.diamondCount ?? data.diamondCount ?? data.extendedGiftInfo?.diamond_count, 1e6);
    this.record(name, coins, integer(data.repeatCount ?? details.repeatCount, 1e5) || 1, donor(data), false);
  }
  sample(name, coins, count) {
    const user = { id: 'test', name: 'Айгерім', avatar: '' };
    if (!this.preview) {
      this.preview = new Show(this.config, () => {});
      this.preview.state.goal = { ...this.state.goal, progress: 0 };
      this.preview.members.set(user.id, 'almaty');
    }
    this.record(name, coins, count, user, true);
    const previous = this.preview.state.goal.progress;
    this.preview.record(name, coins, count, user, false);
    const { goal, leaders, teams } = this.preview.state;
    this.emit('test-stats', { goal, leaders, teams });
    if (previous < goal.target && goal.progress >= goal.target) {
      this.emit('cue', { action: 'goal', name: goal.label, count: 1, test: true });
    }
  }
  record(gift, coins, count, user, test) {
    const rule = this.config.rules.find(item => item.names.some(name => key(name) === key(gift)));
    const tier = [...this.config.tiers].sort((a, b) => b.minCoins - a.minCoins).find(item => coins >= item.minCoins);
    const event = { ...user, gift, coins, count, action: rule?.action ?? tier?.action ?? 'proverb', test };
    this.state.feed.unshift(event);
    this.state.feed.length = Math.min(this.state.feed.length, 25);
    let reached = false;
    if (!test) {
      const points = coins * count;
      const previous = this.donors.get(user.id)?.points ?? 0;
      if (points > 0) {
        this.donors.set(user.id, { ...user, points: previous + points });
        this.state.leaders = [...this.donors.values()].sort((a, b) => b.points - a.points).slice(0, 5);
      }
      const team = this.members.get(user.id);
      if (team) this.state.teams[team] += points;
      const goal = this.state.goal;
      if (key(gift) === key(goal.gift)) {
        reached = goal.progress < goal.target && goal.progress + count >= goal.target;
        goal.progress += count;
      }
    }
    this.publish();
    this.emit('cue', event);
    if (reached) this.celebrate();
  }
  celebrate() {
    this.emit('cue', { action: 'goal', name: this.state.goal.label, count: 1 });
  }
}
