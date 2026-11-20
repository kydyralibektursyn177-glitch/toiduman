const params = new URLSearchParams(location.search);
const horizontal = params.get('mode') === 'horizontal';
const stage = $('stage');
const width = horizontal ? 1920 : 1080;
const height = horizontal ? 1080 : 1920;
stage.classList.toggle('horizontal', horizontal);
stage.style.width = width + 'px';
stage.style.height = height + 'px';
function resize() {
  stage.style.transform = 'scale(' + Math.min(innerWidth / width, innerHeight / height) + ')';
}
addEventListener('resize', resize);
resize();

const socket = io();
let liveStats;
let previewTimer;
socket.on('connect', async () => {
  try {
    const { state } = await call(socket, 'subscribe', { user: params.get('user'), role: 'overlay' });
    update(state);
    $('overlay-error').textContent = '';
  } catch (error) { $('overlay-error').textContent = error.message; }
});
socket.on('disconnect', () => { $('overlay-error').textContent = 'Сервер недоступен · переподключение…'; });
function update(state) {
  liveStats = state;
  renderStats(state);
}
socket.on('state', update);
socket.on('test-stats', state => {
  renderStats(state);
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => { if (liveStats) renderStats(liveStats); }, 5500);
});

const cues = [];
const priorities = { cinema: 4, goal: 3, eagle: 2, rose: 1, proverb: 1, doughnut: 1, hat: 1 };
const duration = { cinema: 8500, eagle: 10000, goal: 7000, rose: 3600, proverb: 4900, doughnut: 4300, hat: 3900 };
let playing = false;
socket.on('cue', cue => {
  const priority = priorities[cue.action] ?? 0;
  const index = cues.findIndex(item => (priorities[item.action] ?? 0) < priority);
  cues.splice(index < 0 ? cues.length : index, 0, cue);
  if (cues.length > 64) cues.pop();
  playNext();
});
function playNext() {
  if (playing || !cues.length) return;
  const cue = cues.shift();
  const action = Object.hasOwn(duration, cue.action) ? cue.action : 'proverb';
  const ms = duration[action];
  playing = true;
  const root = element('div', null, 'scene ' + action);
  const panel = element('div', null, 'announcement');
  const label = {
    rose: 'Қошқар мүйіз', proverb: 'Алға, Қазақстан!', doughnut: 'Рахмет, ' + cue.name + '!',
    hat: 'Тақия', eagle: 'Алтын бүркіт', cinema: 'ХАН ЛАЙВА', goal: 'Мақсат орындалды!'
  };
  const subtitle = {
    rose: 'Казахский орнамент', proverb: 'Вперёд, Казахстан!', doughnut: 'Спасибо, ' + cue.name + '!',
    hat: 'Казахская тюбетейка', eagle: 'Золотой беркут', cinema: 'Подарок эфира', goal: 'Цель достигнута!'
  };
  if (action === 'cinema' || action === 'goal') {
    root.append(art(ornament, 'halo'));
    panel.append(art(action === 'cinema' ? crown : ornament, 'insignia'));
  }
  if (action === 'rose') root.append(art(ornament, 'bloom'));
  if (action === 'eagle') root.append(art(eagle, 'bird'));
  if (action === 'hat') root.append(art(silhouette, 'silhouette'), art(hat, 'falling-hat'));
  if (action === 'doughnut') shower(root);
  if (action === 'eagle' || action === 'cinema') panel.append(avatar(cue));
  panel.append(element('h1', label[action]), element('p', subtitle[action], 'translation'));
  if (action === 'proverb') {
    const proverbs = ['Отан отбасынан басталады.', 'Бірлік болмай, тірлік болмас.', 'Өнер алды — қызыл тіл.'];
    const line = element('p', '', 'proverb-text');
    panel.append(line);
    typewrite(line, proverbs[Math.floor(Math.random() * proverbs.length)]);
  }
  if (action !== 'doughnut') panel.append(element('strong', cue.name, 'donor'));
  if (cue.count > 1) {
    const combo = element('div', 'x' + cue.count, 'combo');
    panel.append(combo);
    animateCombo(combo, cue.count);
  }
  if (cue.test) panel.append(element('small', 'СЫНАҚ / ТЕСТ', 'test-label'));
  root.append(panel);
  $('effects').append(root);
  sound(action);
  const stop = sceneParticles(action, root);
  if (action === 'cinema') {
    root.animate([{translate:'0 0'}, {translate:'12px -8px'}, {translate:'-10px 7px'}, {translate:'5px -3px'}, {translate:'0 0'}],
      {duration: 620, iterations: 2});
  }
  setTimeout(() => { root.classList.add('leaving'); }, ms - 300);
  setTimeout(() => {
    stop();
    root.remove();
    playing = false;
    playNext();
  }, ms);
}
function typewrite(node, text) {
  let index = 0;
  const chars = Array.from(text);
  const timer = setInterval(() => {
    node.textContent += chars[index++];
    if (index === chars.length) clearInterval(timer);
  }, 48);
}
function animateCombo(node, count) {
  const begun = performance.now();
  function frame(time) {
    const ratio = Math.max(0, Math.min(1, (time - begun) / 800));
    node.textContent = 'x' + Math.max(1, Math.ceil(ratio * count));
    node.style.transform = 'scale(' + (0.55 + ratio * (0.48 + Math.min(0.35, count / 75))) + ')';
    if (ratio < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
function shower(root) {
  for (let i = 0; i < 20; i++) {
    const piece = art(doughnut, 'pastry');
    piece.style.left = (4 + Math.random() * 89) + '%';
    piece.style.width = (55 + Math.random() * 105) + 'px';
    root.append(piece);
    piece.animate([
      { transform: 'translateY(-165px) rotate(0deg)' },
      { transform: 'translateY(' + height * .72 + 'px) rotate(244deg)', offset: .75 },
      { transform: 'translateY(' + height * .61 + 'px) rotate(306deg)', offset: .86 },
      { transform: 'translateY(' + height * .8 + 'px) rotate(365deg)', opacity: 0 }
    ], { duration: 1900 + Math.random() * 950, delay: Math.random() * 850, fill: 'both' });
  }
}

const canvas = $('particles');
canvas.width = width;
canvas.height = height;
const ctx = canvas.getContext('2d');
const particles = [];
let frameId;
let last = 0;
function emitParticles(x, y, count, kind) {
  for (let i = 0; i < count && particles.length < 550; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * (kind === 'spark' ? 3 : 12);
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      life: .65 + Math.random() * .85, size: 2 + Math.random() * 7, kind,
      color: (kind === 'confetti' ? ['#5cf5e0','#ffcb78','#ed91ff','#fff4be'] : ['#fff3be','#ffcd72','#f0a63e'])[i % (kind === 'confetti' ? 4 : 3)] });
  }
  if (!frameId) { last = 0; frameId = requestAnimationFrame(paint); }
}
function paint(time) {
  const dt = last ? Math.min(32, time - last) : 16;
  last = time;
  ctx.clearRect(0, 0, width, height);
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt / 1000;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.x += p.vx * dt / 16;
    p.y += p.vy * dt / 16;
    p.vy += dt * .014;
    ctx.globalAlpha = Math.min(1, p.life * 1.5);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.kind === 'confetti' ? p.size * 2 : p.size);
  }
  ctx.globalAlpha = 1;
  frameId = particles.length ? requestAnimationFrame(paint) : 0;
}
function sceneParticles(action, root) {
  const timers = [];
  if (action === 'hat' || action === 'rose') timers.push(setTimeout(() => {
    emitParticles(width / 2, height * .38, action === 'hat' ? 155 : 65, action === 'hat' ? 'confetti' : 'spark');
  }, action === 'hat' ? 720 : 480));
  if (action === 'eagle') {
    const start = performance.now();
    const bird = root.querySelector('.bird');
    timers.push(setInterval(() => {
      if (performance.now() - start > 4800) return;
      const bounds = stage.getBoundingClientRect();
      const box = bird.getBoundingClientRect();
      emitParticles((box.left + box.width * .2 - bounds.left) * width / bounds.width,
        (box.top + box.height * .58 - bounds.top) * height / bounds.height, 7, 'spark');
    }, 50));
  }
  if (action === 'cinema' || action === 'goal') {
    const burst = () => emitParticles(width * (.13 + Math.random() * .74),
      height * (.16 + Math.random() * .54), 80, 'firework');
    burst();
    timers.push(setInterval(burst, 420));
  }
  return () => timers.forEach(timer => { clearTimeout(timer); clearInterval(timer); });
}

let toastTimer;
socket.on('toast', event => {
  const line = {
    chat: event.name + ' · ' + event.comment,
    follow: event.name + ' жазылды! / ' + event.name + ' подписался!',
    share: event.name + ' бөлісті! / ' + event.name + ' поделился эфиром!'
  };
  const node = $('toast');
  node.textContent = (event.test ? 'ТЕСТ · ' : '') + line[event.kind];
  node.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { node.hidden = true; }, 3300);
});

let audio;
let enabled = false;
const clips = new Map();
const pending = new Map();
function clip(action) {
  if (!pending.has(action)) {
    pending.set(action, fetch('/sounds/' + action + '.wav').then(response => {
      if (!response.ok) throw new Error('Sound file unavailable');
      return response.arrayBuffer();
    }).then(buffer => audio.decodeAudioData(buffer)).then(buffer => {
      clips.set(action, buffer);
      return buffer;
    }).catch(() => null));
  }
  return pending.get(action);
}
async function enableSound() {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    await audio.resume();
    enabled = audio.state === 'running';
    $('sound').hidden = enabled;
    if (enabled) {
      localStorage.setItem('qazaq-sound', 'on');
      Object.keys(duration).forEach(clip);
    }
  } catch { $('sound').hidden = false; }
}
$('sound').onclick = enableSound;
if (localStorage.getItem('qazaq-sound') === 'on') {
  // Some browser sources allow autoplay. If suspended, wait for a real click.
  try {
    audio = new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'running') enableSound();
  } catch { /* Video effects continue without audio. */ }
}
function sound(action) {
  if (!enabled || audio.state !== 'running') return;
  const buffer = clips.get(action);
  if (buffer) {
    const source = audio.createBufferSource();
    source.buffer = buffer;
    source.connect(audio.destination);
    source.start();
    return;
  }
  [196, 293.66, 392, 440].forEach((pitch, i) => {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const time = audio.currentTime + i * .075;
    oscillator.type = action === 'rose' ? 'triangle' : 'sine';
    oscillator.frequency.value = pitch;
    gain.gain.setValueAtTime(.08, time);
    gain.gain.exponentialRampToValueAtTime(.001, time + .28);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(time);
    oscillator.stop(time + .29);
  });
}
