const $ = id => document.getElementById(id);
const number = new Intl.NumberFormat('kk-KZ');
const cities = { almaty: 'Алматы', astana: 'Астана', shymkent: 'Шымкент' };
function element(tag, content, className) {
  const node = document.createElement(tag);
  if (content != null) node.textContent = content;
  if (className) node.className = className;
  return node;
}
function avatar(person) {
  const icon = element('span', person.name.slice(0, 1), 'avatar');
  if (person.avatar) {
    const image = document.createElement('img');
    image.alt = '';
    image.referrerPolicy = 'no-referrer';
    image.addEventListener('error', () => image.remove());
    image.src = person.avatar;
    icon.append(image);
  }
  return icon;
}
function leaderRow(person, index) {
  const row = element('div', null, 'leader');
  row.append(avatar(person), element('strong', person.name),
    element('span', index === 0 ? '♛ ХАН ЛАЙВА' : '#' + (index + 1), 'rank'),
    element('b', number.format(person.points)));
  return row;
}
function setBar(root, id, label, count, ratio) {
  let row = root.querySelector('[data-bar="' + id + '"]');
  if (!row) {
    row = element('div', null, 'meter');
    row.dataset.bar = id;
    const heading = element('div', null, 'meter-label');
    heading.append(element('span'), element('b'));
    const track = element('div', null, 'track');
    track.append(element('i'));
    row.append(heading, track);
    root.append(row);
  }
  row.firstChild.firstChild.textContent = label;
  row.firstChild.lastChild.textContent = count;
  row.lastChild.firstChild.style.width = Math.min(100, ratio * 100) + '%';
}
function renderStats(state) {
  const goal = state.goal;
  setBar($('goal'), 'goal', goal.label, number.format(goal.progress) + ' / ' + number.format(goal.target),
    goal.progress / goal.target);
  const total = Object.values(state.teams).reduce((sum, value) => sum + value, 0);
  for (const [id, name] of Object.entries(cities)) {
    setBar($('teams'), id, name, number.format(state.teams[id]), total ? state.teams[id] / total : 0);
  }
  $('leaders').replaceChildren(...state.leaders.map(leaderRow));
  if (!state.leaders.length) $('leaders').append(element('p', 'Әзірге бос / Пока пусто', 'muted'));
}
function call(socket, event, data) {
  return new Promise((resolve, reject) => {
    if (!socket.connected) { reject(new Error('Сервер недоступен.')); return; }
    socket.timeout(5000).emit(event, data, (error, response) => {
      if (error || !response?.ok) reject(new Error(response?.error || 'Сервер не ответил.'));
      else resolve(response);
    });
  });
}