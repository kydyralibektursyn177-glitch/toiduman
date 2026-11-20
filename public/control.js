const socket = io();
const defaultUser = 'demo';
let current = '';
let subscribed = '';
let busy = false;
$('user').value = localStorage.getItem('qazaq-user') || '';
$('mode').value = localStorage.getItem('qazaq-mode') || 'vertical';
const notice = text => { $('notice').textContent = text; };
function updateLink() {
  const url = new URL('/overlay', location.origin);
  url.searchParams.set('user', current || defaultUser);
  url.searchParams.set('mode', $('mode').value);
  $('link').value = url.href;
  $('preview').href = url.href;
}
function showState(state, setForm = false) {
  const names = { live: 'Эфирде / В эфире', offline: 'Офлайн', connecting: 'Қосылуда / Подключение', error: 'Қате / Ошибка' };
  $('status').textContent = names[state.status];
  $('status').dataset.status = state.status;
  $('viewers').textContent = number.format(state.viewers);
  if (setForm) {
    $('label').value = state.goal.label;
    $('target-gift').value = state.goal.gift;
    $('target').value = state.goal.target;
  }
  renderStats(state);
  $('feed').replaceChildren(...state.feed.map(event => {
    const row = element('li');
    row.append(avatar(event), element('strong', event.name),
      element('span', event.gift + ' ×' + event.count),
      element('small', event.test ? 'TEST' : number.format(event.coins * event.count)));
    return row;
  }));
  if (!state.feed.length) $('feed').append(element('li', 'Сыйлықтар жоқ / Подарков пока нет', 'muted'));
  notice(state.message);
}
async function subscribe(user) {
  if (subscribed === user) return;
  const { state } = await call(socket, 'subscribe', { user, role: 'control' });
  subscribed = user;
  current = user;
  updateLink();
  showState(state, true);
}
async function run(fn) {
  if (busy) return;
  busy = true;
  try { await fn(); } catch (error) { notice(error.message); }
  finally { busy = false; }
}
socket.on('connect', () => {
  $('local').textContent = 'Сервер · Online';
  const saved = $('user').value.trim().replace(/^@/, '').toLowerCase();
  subscribe(current || saved || defaultUser).catch(error => notice(error.message));
});
socket.on('disconnect', () => {
  subscribed = '';
  $('local').textContent = 'Сервер · Offline';
  $('status').dataset.status = 'offline';
  $('status').textContent = 'Сервер недоступен';
  $('viewers').textContent = '0';
});
socket.on('state', showState);
$('connect').onsubmit = event => {
  event.preventDefault();
  run(async () => {
    const user = $('user').value.trim().replace(/^@/, '').toLowerCase();
    await subscribe(user);
    localStorage.setItem('qazaq-user', user);
    await call(socket, 'start-live', null);
  });
};
$('mode').onchange = () => {
  localStorage.setItem('qazaq-mode', $('mode').value);
  updateLink();
};
$('copy').onclick = async () => {
  try { await navigator.clipboard.writeText($('link').value); }
  catch {
    $('link').select();
    try {
      if (!document.execCommand('copy')) throw new Error();
    } catch { notice('Скопируйте выделенную ссылку.'); return; }
  }
  notice('Сілтеме көшірілді / Ссылка скопирована');
};
$('goal-editor').onsubmit = event => {
  event.preventDefault();
  run(() => call(socket, 'set-goal', {
    label: $('label').value, gift: $('target-gift').value, target: Number($('target').value)
  }));
};
fetch('/api/tests').then(res => res.json()).then(tests => {
  tests.forEach(([name, , count], index) => {
    const button = element('button', name + (count > 1 ? ' ×' + count : ''));
    button.onclick = () => run(() => call(socket, 'test-gift', index));
    $('tests').append(button);
  });
}).catch(() => notice('Не удалось загрузить тесты.'));
document.querySelectorAll('[data-event]').forEach(button => {
  button.onclick = () => run(() => call(socket, 'test-event', button.dataset.event));
});
updateLink();
