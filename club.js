import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
const $ = id => document.getElementById(id);
document.querySelectorAll('.gift-card-icon img').forEach(img => {
  function showIcon() {
    if (!img.naturalWidth) return;
    img.previousElementSibling.hidden = true;
    img.hidden = false;
  }
  img.addEventListener('load',showIcon);
  showIcon();
});
const query = new URLSearchParams(location.search);
// LIVE timestamps belong to the server, not the viewer's Windows clock.
let clockEpoch = Date.now(), clockTick = performance.now();
function serverNow() { return clockEpoch + performance.now() - clockTick; }
function syncClock(timestamp) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return;
  clockEpoch = timestamp;
  clockTick = performance.now();
}
const liveDiagnostics = document.createElement('p');
liveDiagnostics.className = 'muted';
liveDiagnostics.setAttribute('role','status');
$('connection-message').after(liveDiagnostics);
let giftDiagnostics = {received:0, accepted:0, issue:''};
let socketConnected = false, avatarError = '';
function renderDiagnostics() {
  liveDiagnostics.textContent = `Нұсқа: live-chat-3 · Сервер: ${socketConnected ? 'қосылған' : 'ажыратылған'} · Кіру: ${giftDiagnostics.joins ?? 0} · Чат: ${giftDiagnostics.chats ?? 0} · ID қатесі: ${giftDiagnostics.rejectedViewers ?? 0} · Сыйлық оқиғалары: ${giftDiagnostics.received} · Қабылданған сыйлықтар: ${giftDiagnostics.accepted} · Сахна: ${model ? '3D дайын' : 'жүктелуде'}`
    + (avatarError ? ' · Аватар қатесі: ' + avatarError : '')
    + (giftDiagnostics.build && giftDiagnostics.build !== 'live-chat-3' ? ' · Сервер нұсқасы ескі, серверді қайта іске қос.' : '')
    + (giftDiagnostics.issue ? ' · ' + giftDiagnostics.issue : '');
}
const capture = query.has('capture');
document.body.classList.toggle('capture', capture);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#171c32');
scene.fog = new THREE.FogExp2('#242b43', .018);
const canvas = $('club');
const renderer = new THREE.WebGLRenderer({canvas, antialias:false});
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.09;
const camera = new THREE.PerspectiveCamera(48, 1, .1, 100); camera.position.set(0, 6, 17); camera.lookAt(0, 2, -2);
scene.add(new THREE.HemisphereLight(0xffe8d7,0x63425d,1.7));
const light = new THREE.DirectionalLight(0xffe0bf,1.85); light.position.set(3,8,6); scene.add(light);
const material = (color, emissive=false) => new THREE.MeshStandardMaterial({color,metalness:.55,roughness:.28,...(emissive?{emissive:color,emissiveIntensity:3}:{})});
const dark=material('#293247'), neon=material('#b69ce8',true), cyan=material('#77cfc9',true);
function box(w,h,d,x,y,z,mat=dark){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);scene.add(mesh);return mesh}
box(26,.4,30,0,-.25,0); box(26,10,.4,0,5,-12); box(.4,10,30,-13,5,0); box(.4,10,30,13,5,0);
const parquet = document.createElement('canvas');
parquet.width = parquet.height = 512;
const grain = parquet.getContext('2d');
const wood = ['#91613e','#a7774d','#946244','#ac8055','#845739'];
for (let row = 0; row < 16; row++) {
  for (let col = -1; col < 4; col++) {
    const x = col * 128 + (row % 2) * 64, y = row * 32;
    grain.fillStyle = wood[(row * 7 + col + 5) % wood.length];
    grain.fillRect(x,y,127,31);
    grain.fillStyle = '#54362224';
    for (let line = 2; line < 30; line += 3) grain.fillRect(x,y + line,127,1);
  }
}
const woodMap = new THREE.CanvasTexture(parquet);
woodMap.colorSpace = THREE.SRGBColorSpace;
woodMap.wrapS = woodMap.wrapT = THREE.RepeatWrapping;
woodMap.repeat.set(3,3);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(18,16),new THREE.MeshStandardMaterial({map:woodMap,roughness:.75}));
floor.rotation.x = -Math.PI / 2;
floor.position.set(0,.01,1);
scene.add(floor);
const brass = new THREE.MeshStandardMaterial({color:0xc99e58,metalness:.5,roughness:.46});
const floorCenter = new THREE.Vector3(0, .03, 1.25);
const danceCircle = new THREE.Mesh(new THREE.CircleGeometry(6.8,96),new THREE.MeshStandardMaterial({color:0x49263e,roughness:.59,metalness:.18}));
danceCircle.rotation.x = -Math.PI / 2;
danceCircle.position.copy(floorCenter);
scene.add(danceCircle);
const floorTrim = [];
for (const [radius,width,color] of [[6.72,.035,0xffba68],[6.44,.022,0xcca2ff],[4.1,.012,0x7c5570],[2.05,.012,0xb27383]]) {
  const trim = new THREE.Mesh(new THREE.RingGeometry(radius-width,radius,96),new THREE.MeshBasicMaterial({color, side:THREE.DoubleSide}));
  trim.rotation.x = -Math.PI/2;
  trim.position.copy(floorCenter).y += .006;
  scene.add(trim);
  floorTrim.push(trim);
}
const ornament = new THREE.Mesh(new THREE.RingGeometry(.15,.19,4),new THREE.MeshBasicMaterial({color:0xffd2a5,side:THREE.DoubleSide}));
ornament.rotation.x = -Math.PI/2;
for (let i = 0; i < 24; i++) {
  const detail = ornament.clone(), angle = i * Math.PI / 12;
  detail.position.set(Math.cos(angle)*6.58,.042,floorCenter.z + Math.sin(angle)*6.58);
  detail.rotation.z = angle;
  scene.add(detail);
}
for (const x of [-9,9]) box(.04,.016,16,x,.025,1,brass);
for (const z of [-7,9]) box(18,.016,.04,0,.025,z,brass);
box(13,.6,4,0,.25,-9);box(6,1.8,1.5,0,1.5,-9);box(6,.04,1.6,0,2.42,-9,neon);
const bars=[];for(let i=0;i<16;i++)bars.push(box(.13,1,.05,-2.55+i*.34,1.4,-8.22,i%3?neon:cyan));
for(const x of [-9,9]){for(let y=0;y<3;y++){box(1.8,1.5,1.2,x,.9+y*1.6,-9);const speaker=new THREE.Mesh(new THREE.CylinderGeometry(.48,.48,.08,32),material('#060609'));speaker.rotation.x=Math.PI/2;speaker.position.set(x,.9+y*1.6,-8.35);scene.add(speaker)}}
for(let i=0;i<5;i++){const frame=new THREE.Mesh(new THREE.TorusGeometry(5.3+i*.32,.025,8,100,Math.PI),i%2?cyan:neon);frame.position.set(0,2.7,-11+i*.05);scene.add(frame)}
function textSprite(text,size=1,color='#ffffff'){const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;const context=canvas.getContext('2d');context.font='600 60px Arial';context.fillStyle=color;context.textAlign='center';context.fillText(text,512,85);const texture=new THREE.CanvasTexture(canvas);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));sprite.scale.set(size*8,size,1);return sprite}
const sign=textSprite('ҚАЗАҚША КЛУБ БХБ',1.3,'#ead7ff');sign.position.set(0,5.2,-10.8);scene.add(sign);
const DANCE_MS = 60_000;
const MAX_DANCERS = 10;
let lastLikeGoal = 0, totalLikes = 0;
let fireworksUntil = 0, galaxyUntil = 0;
let battleTimer, discoUntil = 0, shashuUntil = 0, duet = null;
const duetTickets = new Map();
const DUET_WAIT_MS = 45_000;
const DUET_MS = 16_000;
const dancers=new Map(), pending=[], queue=[], processed=new Set();const humans = {}; let model,alertBusy=false,angle=0;
const guestLayer = $('guest-labels');
const recentGuest = $('recent-guest');
let arrivalUntil = 0;
let cameraGuestId, cameraGuestUntil = 0;
const cameraTarget = new THREE.Vector3(0, 1.8, 0);
const cameraDestination = new THREE.Vector3();
function focusGuest(userId) {
  cameraGuestId = userId;
  cameraGuestUntil = serverNow() + 4200;
}
let stageWidth = 1, stageHeight = 1;
const namePosition = new THREE.Vector3();
let nextArrivalId, nextArrivalAt = 0;

function guestBadge(event) {
  const badge = document.createElement('div');
  badge.className = 'guest-badge';
  const avatar = document.createElement('span');
  avatar.className = 'guest-photo';
  avatar.textContent = Array.from(event.name || '?')[0].toUpperCase();
  if (event.thumbnail) {
    const image = document.createElement('img');
    image.alt = '';
    image.referrerPolicy = 'no-referrer';
    image.addEventListener('error',()=>image.remove(),{once:true});
    image.src = event.thumbnail;
    avatar.append(image);
  }
  const name = document.createElement('b');
  name.textContent = event.name;
  badge.append(avatar,name);
  return badge;
}

function announceEntrance(event) {
  const time = serverNow();
  if (time < nextArrivalAt || nextArrivalId === event.userId && time < arrivalUntil) return;
  nextArrivalAt = time + 1800;
  nextArrivalId = event.userId;
  arrivalUntil = time + 3200;
  const badge = guestBadge(event);
  const description = document.createElement('span');
  description.textContent = ' залға кірді';
  badge.append(description);
  recentGuest.replaceChildren(badge);
  recentGuest.hidden = false;
}

function positionGuestNames(now) {
  camera.updateMatrixWorld();
  const positions = [];
  for (const dancer of dancers.values()) {
    const point = namePosition.copy(dancer.root.position);
    point.y += dancer.labelHeight * dancer.root.scale.y;
    point.project(camera);
    const visible = point.z > -1 && point.z < 1 && Math.abs(point.x) < 1.13 && Math.abs(point.y) < 1.13;
    dancer.label.hidden = !visible;
    if (dancer.speech) {
      dancer.speech.hidden = !visible;
      dancer.speech.style.transform = `translate(${Math.round((point.x+1)*stageWidth*.5)}px,${Math.round((1-point.y)*stageHeight*.5-40)}px) translate(-50%,-100%)`;
    }
    if (visible) positions.push({dancer,x:(point.x+1)*stageWidth*.5,y:(1-point.y)*stageHeight*.5});
  }
  positions.sort((a,b)=>b.y-a.y);
  for (let i=0;i<positions.length;i++) {
    const item = positions[i];
    const width = Math.min(stageWidth*.36, 156, 32 + item.dancer.name.length*8);
    item.x = THREE.MathUtils.clamp(item.x,width*.5+4,stageWidth-width*.5-4);
    for (let j=i-1;j>=0;j--) {
      const other = positions[j];
      if (Math.abs(item.x-other.x) < width*.5 + other.width*.5 + 4 && Math.abs(item.y-other.y) < 26) item.y = other.y-26;
    }
    item.width = width;
    item.dancer.label.style.transform = `translate(${Math.round(item.x)}px,${Math.round(item.y)}px) translate(-50%,-100%)`;
  }
  if (!recentGuest.hidden && now >= arrivalUntil) recentGuest.hidden = true;
}
const CHAT_MS = 5500;
const speechPending = new Map();

function clearSpeech(dancer) {
  dancer.speech?.remove();
  dancer.speech = null;
}

function showSpeech(event) {
  const text = String(event.message || '').trim();
  const until = (event.at || serverNow()) + CHAT_MS;
  if (!text || until <= serverNow()) return;
  if (!model) {
    speechPending.delete(event.userId);
    speechPending.set(event.userId, event);
    if (speechPending.size > MAX_DANCERS) speechPending.delete(speechPending.keys().next().value);
    return;
  }
  let dancer = dancers.get(event.userId);
  if (!dancer) dancer = addDancer({...event, at:serverNow()});
  if (!dancer) return;
  speechPending.delete(event.userId);
  dancer.until = Math.max(dancer.until, until + 1000);
  if (event.appearance && event.appearance !== dancer.appearance) {
    dancer = addDancer({...event, name:dancer.name, until:dancer.until});
  }
  clearSpeech(dancer);
  const speech = document.createElement('div');
  speech.className = 'guest-speech';
  speech.textContent = Array.from(text).slice(0, 100).join('');
  guestLayer.append(speech);
  dancer.speech = speech;
  dancer.speechUntil = until;
}
const clothes = new WeakMap();
function outfit(texture, variant) {
  if (!texture?.image || variant === 0) return texture;
  if (!clothes.has(texture)) clothes.set(texture, new Map());
  const variants = clothes.get(texture);
  if (variants.has(variant)) return variants.get(variant);
  const image = texture.image;
  const canvas = document.createElement('canvas');
  const scale = Math.min(1,512/Math.max(image.width,image.height));
  canvas.width = Math.max(1,Math.round(image.width*scale));
  canvas.height = Math.max(1,Math.round(image.height*scale));
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  const palette = [[.83,.32,.34],[.28,.68,.48],[.74,.62,.39],[.62,.44,.74]];
  const color = palette[(variant - 1) % palette.length];
  for (let i = 0; i < pixels.data.length; i += 4) {
    const r = pixels.data[i], g = pixels.data[i+1], b = pixels.data[i+2];
    const blueFabric = b > r + 14 && g > r + 8;
    const goldFabric = g > b * 1.55 && r > b * 1.55 && g > r * .8;
    if (!blueFabric && !goldFabric) continue;
    const value = (.25*r + .58*g + .17*b) / 150;
    const trousers = blueFabric && r + g + b < 260;
    const stripe = !trousers && variant === 2 && Math.floor(i / 4 / canvas.width) % 16 < 3 ? 1.55 : 1;
    for (let channel = 0; channel < 3; channel++) pixels.data[i+channel] = Math.min(255, 255 * value * (trousers ? .36 : color[channel] * stripe));
  }
  context.putImageData(pixels,0,0);
  const map = texture.clone();
  map.source = new THREE.Source(canvas);
  map.needsUpdate = true;
  variants.set(variant,map);
  return map;
}
function addDancer(event) {
  const now = serverNow();
  const until = event.until ?? ((event.at || now) + DANCE_MS);
  if (until <= now) return;
  if (!model) {
    if (pending.length >= 150) pending.shift();
    pending.push(event);
    return;
  }
  let dancer = dancers.get(event.userId);
  if (dancer) {
    dancer.until = Math.max(dancer.until, until);
    if (!event.appearance || dancer.appearance === event.appearance) return dancer;
    removeDancer(event.userId);
    event = { ...event, until: dancer.until };
  }
  if (dancers.size >= MAX_DANCERS) {
    const ids = [...dancers.keys()];
    const oldest = ids.find(id => !duet?.ids.includes(id) && !duetTickets.has(id))
      ?? ids.find(id => !duet?.ids.includes(id));
    if (oldest === undefined) return;
    removeDancer(oldest);
    duetTickets.delete(oldest);
  }
  const occupied = new Set(Array.from(dancers.values(), guest => guest.slot));
  let slot = dancer?.slot ?? 0;
  while (occupied.has(slot)) slot++;
  const appearance = event.appearance === 'man' || event.appearance === 'woman'
    ? event.appearance : slot % 2 ? 'woman' : 'man';
  const human = humans[appearance];
  const root = new THREE.Group(), pivot = new THREE.Group(), body = clone(human.scene);
  const identity = Array.from(String(event.userId)).reduce((hash, char) => Math.imul(hash, 31) + char.codePointAt(0), 0) >>> 0;
  const heightScale = .92 + (identity % 5) * .038;
  body.scale.set(human.scale * heightScale * (.93 + (identity % 3) * .07), human.scale * heightScale, human.scale * heightScale);
  const tones = [0xffffff,0xebede8,0xdde7f8,0xf8ebd8,0xcdd8d4];
  body.traverse(mesh => {
    if (!mesh.isMesh) return;
    const tint = source => {
      const material = source.clone();
      material.color?.multiply(new THREE.Color(tones[slot % tones.length]));
      if (material.map) material.map = outfit(material.map, identity % 5);
      return material;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(tint) : tint(mesh.material);
  });
  root.add(pivot);
  pivot.add(body);
  const label = guestBadge(event);
  guestLayer.append(label);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.6,.016,8,40),cyan);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = .05;
  root.add(ring);
  const radius = Math.sqrt(slot + 1) * 1.05 + .5;
  const home = new THREE.Vector3(Math.sin(slot * 2.399) * radius * 1.05, .08, 2 + Math.cos(slot * 2.399) * radius * .8);
  root.position.copy(home);
  scene.add(root);
  const mixer = new THREE.AnimationMixer(body);
  const action = mixer.clipAction(human.clip).play();
  action.time = slot * .83 % human.clip.duration;
  const idle = human.idle && mixer.clipAction(human.idle).play();
  action.setEffectiveWeight(0);
  mixer.update(0);
  const joints = [];
  body.traverse(bone => {
    if (!bone.isBone) return;
    const match = bone.name.match(/(?:Left|Right)?(?:ForeArm|UpLeg|Arm|Leg|Spine[12]?|Foot|Hips|Shoulder|Hand|Head|Neck)$/i);
    if (match) joints.push({bone, name:match[0].toLowerCase(), pose:bone.quaternion.clone()});
  });
  idle?.stop();
  action.setEffectiveWeight(1);
  mixer.update(0);
  body.updateWorldMatrix(true, true);
  const baseY = -new THREE.Box3().setFromObject(body).min.y + root.position.y;
  body.position.y += baseY;
  dancer = { name:event.name, appearance, slot, home, root, pivot, body, label, labelHeight:2.65*heightScale+.3, mixer, action, joints, ring, facing:0,
    phase:slot * .79, groove:identity % 3, combo:dancer?.combo, started:dancer?.started, until:event.until ?? until, highlight:now + 3000, entered:performance.now(),
    move: dancer?.move || 'join', boost: dancer?.boost || 0 };
  dancers.set(event.userId,dancer);
  return dancer;
}
function removeDancer(id){const d=dancers.get(id);clearSpeech(d);scene.remove(d.root);d.mixer.stopAllAction();d.mixer.uncacheRoot(d.body);d.label.remove();d.ring.geometry.dispose();d.body.traverse(mesh=>{if(mesh.isMesh) for(const material of [mesh.material].flat())material.dispose()});dancers.delete(id)}
function receive(event, quiet = false) {
  if (event.type !== 'gift' && event.type !== 'join') return;
  if (!model) {
    if (pending.length >= 150) pending.shift();
    pending.push({...event, at:event.at || serverNow(), quiet});
    return;
  }
  if (processed.has(event.id)) return;
  processed.add(event.id);
  if (processed.size > 3000) processed.delete(processed.values().next().value);
  const existing = dancers.has(event.userId);
  const dancer = addDancer(event);
  if (!dancer) return;
  if (event.type === 'join' && !quiet && !existing) {
    announceEntrance(event);
    focusGuest(event.userId);
  }
  const comment = speechPending.get(event.userId);
  if (comment) { speechPending.delete(event.userId); showSpeech(comment); }
  if (event.type === 'join') return;
  if (event.action === 'duet') {
    const at = event.at || serverNow();
    if (at + DUET_WAIT_MS > serverNow() && !duet?.ids.includes(event.userId)) {
      if (duetTickets.size >= MAX_DANCERS && !duetTickets.has(event.userId)) duetTickets.delete(duetTickets.keys().next().value);
      duetTickets.set(event.userId, at + DUET_WAIT_MS);
    }
  }
  if (event.action === 'shashu' && !quiet) startShashu();
  const duration = event.action === 'flip' ? 1450 : event.action === 'galaxy' ? 12000 : 8000;
  const timeLeft = (event.at || serverNow()) + duration - serverNow();
  if (quiet && timeLeft <= 0) return;
  if (event.combo && dancer.combo === event.combo) return;
  dancer.combo = event.combo;
  dancer.move = event.action || 'join';
  dancer.started = performance.now() - Math.max(0, duration - timeLeft);
  dancer.boost = serverNow() + Math.max(0, timeLeft);
  dancer.highlight = serverNow() + 5000;
  if (dancer.move === 'breakdance') discoUntil = Math.max(discoUntil,dancer.boost);
  if (quiet) return;
  if (event.action === 'galaxy') {
    galaxyUntil = serverNow() + 12000;
  }
  if (event.action === 'battle') battle(event.name);
  queue.push(event);
  if (queue.length > 12) queue.shift();
  showNext();
  const line = document.createElement('div');
  line.textContent = event.name + ' · ' + event.gift + ' ×' + event.count;
  $('feed').prepend(line);
  while ($('feed').children.length > 8) $('feed').lastChild.remove();
}

function updateDuet(now) {
  if (duet && (now >= duet.until || duet.ids.some(id => !dancers.has(id)))) duet = null;
  for (const [id,until] of duetTickets) if (until <= now || !dancers.has(id)) duetTickets.delete(id);
  if (duet || duetTickets.size < 2) return;
  const ids = [...duetTickets.keys()];
  const man = ids.find(id => dancers.get(id).appearance === 'man');
  const woman = ids.find(id => dancers.get(id).appearance === 'woman');
  if (!man || !woman) return;
  duet = {ids:[man,woman], from:now, until:now+DUET_MS};
  for (const id of duet.ids) {
    duetTickets.delete(id);
    const dancer = dancers.get(id);
    dancer.until = Math.max(dancer.until,duet.until+700);
  }
}
function showNext(){if(alertBusy||!queue.length)return;alertBusy=true;const event=queue.shift();$('donor').textContent=event.name;document.querySelector('.gift-icon').textContent=({join:'🌹',circle:'🎩',dance:'💗',flip:'✨',duet:'🍩',shashu:'✦',breakdance:'🔥',battle:'👑',fireworks:'🎆',galaxy:'🌌'})[event.action]||'🎁';$('gift-detail').textContent=({join:'залға қош келдің!',circle:'ортада бірге билейміз!',dance:'жеке би алаңы сенікі!',fireworks:'10 000 лайк · отшашу!',galaxy:'Ғаламшар шоуы!',flip:'Акробатикалық сальто!',duet:'Жұптық вальске шақыру!',shashu:'Шашу! Ортақ би басталды!',breakdance:'Брейк-данс!',battle:'Би батлы басталды!'})[event.action]||'рақмет, би алаңы сенікі!';if(event.coins) $('gift-detail').textContent+= ' · '+event.coins+' монета';$('combo').textContent=event.action==='fireworks'?'♥':'×'+event.total;$('gift-label').textContent=event.demo?'СЫЙЛЫҚТЫҢ ДЕМОСЫ':'СЫЙЛЫҒЫҢА РАҚМЕТ';$('alert').classList.add('show');setTimeout(()=>{$('alert').classList.remove('show');setTimeout(()=>{alertBusy=false;showNext()},500)},3500)}
function battle(name) {
  document.body.classList.add('battle');
  $('battle-name').textContent = name + ' · БИ БАТЛЫ';
  clearTimeout(battleTimer);
  battleTimer = setTimeout(() => document.body.classList.remove('battle'), 8000);
}
const loader = new GLTFLoader();
function transferDance(clip, sourceRig, targetRig) {
  const sourceJoints = new Map(), targetJoints = new Map();
  const boneKey = name => name.replace(/^mixamorig[:_]?/i, '');
  sourceRig.updateMatrixWorld(true);
  targetRig.updateMatrixWorld(true);
  sourceRig.traverse(node => { if (node.isBone) sourceJoints.set(node.name, node); });
  targetRig.traverse(node => { if (node.isBone) targetJoints.set(boneKey(node.name), node); });
  const frame = new THREE.Quaternion();
  const tracks = [];
  for (const track of clip.tracks) {
    const binding = THREE.PropertyBinding.parseTrackName(track.name);
    const source = sourceJoints.get(binding.nodeName);
    const target = targetJoints.get(boneKey(binding.nodeName));
    if (!source || !target || binding.propertyName !== 'quaternion') continue;
    const intoTarget = target.getWorldQuaternion(new THREE.Quaternion()).invert()
      .multiply(source.getWorldQuaternion(new THREE.Quaternion()));
    const fromTarget = intoTarget.clone().invert();
    const sourceRestInverse = source.quaternion.clone().invert();
    const values = new Float32Array(track.values.length);
    for (let i = 0; i < values.length; i += 4) {
      frame.fromArray(track.values, i).premultiply(sourceRestInverse).premultiply(intoTarget)
        .multiply(fromTarget).premultiply(target.quaternion).normalize().toArray(values, i);
    }
    tracks.push(new THREE.QuaternionKeyframeTrack(target.name + '.quaternion', track.times, values));
  }
  if (tracks.length < 15) throw new Error('Dance rig has incomplete bone mapping');
  return new THREE.AnimationClip('Samba · guest', clip.duration, tracks);
}
Promise.all([loader.loadAsync('/assets/guest.glb'), loader.loadAsync('/assets/woman.glb')])
  .then(([man, woman]) => {
    const dance = woman.animations.find(clip => clip.name === 'SambaDance');
    const tracks = dance.tracks.map(track => {
      const width = track.getValueSize();
      const times = [...track.times, dance.duration + .45];
      const values = [...track.values, ...track.values.slice(0, width)];
      return new track.constructor(track.name, times, values, track.getInterpolation());
    });
    const seamlessDance = new THREE.AnimationClip('Той биі', -1, tracks);
    for (const [key, object, clip] of [
      ['woman', woman.scene, seamlessDance],
      ['man', man.scene, transferDance(seamlessDance, woman.scene, man.scene)]
    ]) {
      object.updateMatrixWorld(true);
      const height = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3()).y;
      humans[key] = {scene:object, clip, idle:key === 'man' ? man.animations.find(animation => animation.name === 'Idle') : null, scale:2.65 / height};
    }
    model = true;
    renderDiagnostics();
    $('loading').hidden = true;
    pending.splice(0).forEach(event => receive(event, event.quiet));
    for (const event of [...speechPending.values()]) showSpeech(event);
    if (query.get('demo') === '10') {
      const names = ['Алихан', 'Аружан', 'Данияр', 'Айша', 'Мирас', 'Амина', 'Ерлан', 'Дана', 'Әли', 'Жансая'];
      names.forEach((name, index) => {
        const appearance = query.get('avatars') === 'men' ? 'man' : undefined;
        const dancer = addDancer({userId:'crowd-demo-' + index, name, appearance, until:Infinity});
        dancer.move = ['join', 'dance', 'join', 'waltz', 'join'][index % 5];
        dancer.boost = Infinity;
        dancer.highlight = 0;
      });
      if (query.has('chat')) {
        const samples = [[0,'Сәлем, БХБ!'],[3,'Бүгінгі той керемет!'],[6,'Алға, қазақша клуб!']];
        const demoChat = () => {
          samples.forEach(([index,message], i) => setTimeout(() => {
            const userId = 'crowd-demo-' + index;
            if (dancers.has(userId)) showSpeech({userId, message, at:serverNow()});
          }, i * 2200));
        };
        demoChat();
        setInterval(demoChat, 8500);
      }
    }
  })
  .catch(error => { avatarError = error.message; renderDiagnostics(); $('loading').textContent = 'Аватарларды жүктеу қатесі · ' + error.message; });

const linen = new THREE.MeshStandardMaterial({color:0xe7cfad,roughness:.82});
const candle = new THREE.MeshBasicMaterial({color:0xffdf92});
const chandelier = new THREE.Mesh(new THREE.TorusGeometry(2.1,.05,10,64),brass);
chandelier.rotation.x = Math.PI / 2;
chandelier.position.set(0,6.8,-3);
scene.add(chandelier);
for (let i = 0; i < 16; i++) {
  const a = i * Math.PI / 8;
  box(.065,.33,.065,Math.cos(a)*2.1,7,Math.sin(a)*2.1-3,candle);
}
const centerWash = new THREE.SpotLight(0xffe2bb,100,25,.59,.85,1.25);
centerWash.position.set(0,10,2);
centerWash.target.position.copy(floorCenter);
scene.add(centerWash,centerWash.target);
const overheadBeam = new THREE.ConeGeometry(1,1,18,1,true);
const beamUp = new THREE.Vector3(0,1,0);
for (const [x,color] of [[-3.5,0x9b9dff],[0,0xffc980],[3.5,0xf79ddb]]) {
  const origin = new THREE.Vector3(x,8.1,-1.6);
  const target = new THREE.Vector3(x*.48,.07,floorCenter.z);
  const axis = origin.clone().sub(target);
  const beam = new THREE.Mesh(overheadBeam,new THREE.MeshBasicMaterial({
    color,transparent:true,opacity:.048,depthWrite:false,blending:THREE.AdditiveBlending
  }));
  beam.position.copy(origin).lerp(target,.5);
  beam.scale.set(1.65,axis.length(),1.65);
  beam.quaternion.setFromUnitVectors(beamUp,axis.normalize());
  scene.add(beam);
  box(.31,.12,.31,origin.x,origin.y,origin.z,new THREE.MeshBasicMaterial({color}));
}
const confettiCount = 40;
const confettiGeometry = new THREE.BufferGeometry();
const confettiPositions = new Float32Array(confettiCount*3);
const confettiColors = new Float32Array(confettiCount*3);
const confettiOrigin = [];
const goldPalette = [0xffdf91,0xf6a65e,0xffebbc,0xc97947];
for (let i=0;i<confettiCount;i++) {
  new THREE.Color(goldPalette[i%goldPalette.length]).toArray(confettiColors,i*3);
  confettiOrigin.push([Math.random()*Math.PI*2, Math.random()*5.5, 2+Math.random()*4, .7+Math.random()*1.8]);
}
confettiGeometry.setAttribute('position',new THREE.BufferAttribute(confettiPositions,3));
confettiGeometry.setAttribute('color',new THREE.BufferAttribute(confettiColors,3));
const confetti = new THREE.Points(confettiGeometry,new THREE.PointsMaterial({size:.09,vertexColors:true,transparent:true}));
confetti.frustumCulled = false;
confetti.visible = false;
scene.add(confetti);
const effectRing = new THREE.Mesh(new THREE.RingGeometry(.94,1,64),
  new THREE.MeshBasicMaterial({color:0xffc56d,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
effectRing.rotation.x = -Math.PI/2;
effectRing.position.copy(floorCenter).y += .025;
effectRing.visible = false;
scene.add(effectRing);
function startShashu() {
  shashuUntil = serverNow() + 9000;
}
for (const side of [-1,1]) {
  box(.16,4,.16,side*11,2,-4,side<0 ? neon : cyan);
}
for(const side of [-1,1])for(let z=-4;z<=6;z+=5){
 box(2.2,.65,2,side*11.45,.5,z,material('#461c43'));box(.4,1.2,2,side*11,1,z,material('#461c43'));
 const table=new THREE.Mesh(new THREE.CylinderGeometry(.85,.85,.73,32),linen);table.position.set(side*10,.5,z);scene.add(table);box(.09,.28,.09,side*10,1,z,candle);
}
const disco=new THREE.Mesh(new THREE.SphereGeometry(.7,24,16),new THREE.MeshStandardMaterial({color:0xdce5ff,metalness:1,roughness:.12,flatShading:true}));disco.position.set(0,7,1);scene.add(disco);

const offset = new THREE.Quaternion(), angles = new THREE.Euler();
const destination = new THREE.Vector3();
function animateGuest(dancer, dt, time, pairIndex) {
  const now = serverNow();
  const remaining = (dancer.until - now) / 1000;
  const age = (performance.now() - dancer.entered) / 1000;
  const elapsed = (performance.now() - (dancer.started ?? dancer.entered)) / 1000;
  const paired = pairIndex >= 0;
  const move = paired ? 'waltz' : now < shashuUntil ? 'shashu' : dancer.boost > now ? dancer.move : 'join';
  const cycle = (age + dancer.phase) % 18;
  const resting = move === 'join' && dancer.boost <= now && cycle > 14;
  const restBlend = resting ? Math.min(1, (cycle-14)*2, (18-cycle)*2) : 0;
  const fast = ['dance','breakdance','battle','shashu','galaxy'].includes(move);
  const floorwork = move === 'breakdance' || move === 'battle';
  dancer.beat = (dancer.beat ?? dancer.phase) + dt * (move === 'waltz' ? 3 : fast ? 8 : 4.5 + dancer.slot % 3 * .5);
  const beat = dancer.beat;
  const transition = 1 - Math.exp(-dt * 16);
  for (const joint of dancer.joints) {
    joint.previous ??= new THREE.Quaternion();
    joint.previous.copy(joint.bone.quaternion);
  }
  const wave = Math.sin(beat);
  const shoulderDance = move === 'circle';
  if (!floorwork && move !== 'waltz') {
    dancer.action.timeScale = resting ? .35 : move === 'shashu' ? 1.4 : fast ? 1.3 : .90 + dancer.groove * .085;
    dancer.mixer.update(dt);
  } else {
    for (const {bone, name, pose} of dancer.joints) {
      const side = name.startsWith('left') ? 1 : -1;
      const swing = Math.sin(beat + (side === 1 ? 0 : Math.PI));
      const groove = dancer.groove;
      angles.set(0, 0, 0);
      if (name.endsWith('forearm')) {
        angles.x = .28 + .34 * Math.cos(beat * .5 + side);
        angles.y = side * (.25 + swing * (.24 + groove * .12));
      } else if (name.endsWith('arm')) {
        angles.z = side * (.36 + .28 * Math.cos(beat * .5 + side)) + swing * .25;
        angles.x = Math.cos(beat + groove) * (.22 + groove * .15);
        if (move === 'dance') angles.x += .43 * Math.sin(beat * .5 + side);
      }
      if (name.endsWith('upleg')) {
        angles.x = swing * (floorwork ? .42 : fast ? .40 : .23);
        angles.z = side * (floorwork ? .35 : .08) * (.5 + .5 * Math.cos(beat));
      } else if (name.endsWith('leg')) angles.x = Math.max(swing,0) * (floorwork ? .5 : .27);
      if (name === 'spine') {
        angles.z = wave * (shoulderDance ? .16 : .09);
        angles.y = Math.sin(beat * 2) * (shoulderDance ? .14 : .04);
      }
      bone.quaternion.copy(pose).multiply(offset.setFromEuler(angles));
    }
  }
  if (move === 'waltz') {
    const bars = paired ? (now-duet.from)/1800 : time/1.8;
    const step = Math.sin(bars * Math.PI * 2 + (pairIndex === 1 ? Math.PI : 0));
    for (const {bone,name,pose} of dancer.joints) {
      const side = name.startsWith('left') ? 1 : -1;
      angles.set(0,0,0);
      if (name.endsWith('forearm')) angles.set(.34,side*.31,0);
      else if (name.endsWith('arm')) angles.set(-.35,0,side*.34);
      if (name.endsWith('upleg')) angles.x = step * side * .19;
      else if (name.endsWith('leg')) angles.x = .14 + Math.max(0,step*side)*.19;
      if (name === 'spine') angles.z = step*.085;
      bone.quaternion.copy(pose).multiply(offset.setFromEuler(angles));
    }
  }
  for (const {bone, previous, pose, name} of dancer.joints) {
    if (restBlend) {
      bone.quaternion.slerp(pose, restBlend*.85);
      if (name === 'head') bone.quaternion.multiply(offset.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, Math.sin(age*1.1)*.2*restBlend));
    }
    bone.quaternion.copy(previous.slerp(bone.quaternion, transition));
  }
  destination.copy(dancer.home);
  destination.y += floorwork ? 0 : Math.abs(wave) * .065;
  destination.x += floorwork ? 0 : wave * .16;
  if (move === 'circle' || move === 'shashu' || (duet && !paired)) {
    const arc = dancer.slot * 2.399;
    const radius = 3.8 + dancer.slot % 4 * .62;
    destination.x = Math.cos(arc) * radius;
    destination.z = floorCenter.z + Math.sin(arc) * radius;
  }
  if (paired) {
    const orbit = (now-duet.from)/1000 * .70 + pairIndex * Math.PI;
    const sway = Math.sin((now-duet.from)/1800 * Math.PI * 2);
    destination.x = Math.sin(orbit) * (.95+.07*sway);
    destination.z = floorCenter.z + Math.cos(orbit) * (.95+.07*sway);
    destination.y = .075 + .032 * (1 + sway);
  }
  dancer.root.position.lerp(destination, 1 - Math.exp(-dt * 6));
  dancer.pivot.rotation.set(0, 0, 0);
  dancer.pivot.position.y = 0;
  if (move === 'flip') {
    const progress = THREE.MathUtils.clamp(elapsed / 1.45, 0, 1);
    const turn = -THREE.MathUtils.smoothstep(progress, 0, 1) * Math.PI * 2;
    dancer.pivot.rotation.x = turn;
    dancer.pivot.position.y = 1.45 * Math.sin(Math.PI * progress) + 1.25 * (1 - Math.cos(turn));
    dancer.pivot.position.z = -1.25 * Math.sin(turn);
  }
  if (floorwork) {
    const lower = THREE.MathUtils.smoothstep(elapsed, 0, .85);
    const rise = THREE.MathUtils.smoothstep((dancer.boost - now) / 1000, 0, .85);
    const tilt = Math.PI * .47 * lower * rise;
    dancer.pivot.rotation.z = tilt;
    dancer.pivot.position.y = Math.sin(tilt) * .29;
    dancer.pivot.position.x = Math.sin(tilt) * 1.25;
    dancer.root.rotation.y = Math.max(0, elapsed - .45) * Math.PI * 1.15;
  }
  if (!floorwork) dancer.pivot.position.x = 0;
  if (move !== 'flip') dancer.pivot.position.z = 0;
  if (move !== 'breakdance' && move !== 'battle') dancer.root.rotation.y = Math.sin(beat * .24) * (move === 'waltz' ? 1.3 : fast ? .75 : .32);
  if (paired) {
    const faceCenter = Math.atan2(-dancer.root.position.x,floorCenter.z-dancer.root.position.z);
    const angleDelta = Math.atan2(Math.sin(faceCenter-dancer.facing),Math.cos(faceCenter-dancer.facing));
    dancer.facing += angleDelta * (1-Math.exp(-dt*8));
    dancer.root.rotation.y = dancer.facing;
  } else {
    dancer.facing = dancer.root.rotation.y;
  }
  dancer.root.scale.setScalar(Math.max(.01, Math.min(1, age * 2, remaining * 1.8)));
  dancer.ring.visible = dancer.highlight > now;
}
const FRAME_MS = 1000 / 30;
let lastDraw = null, nextDraw = 0, contextLost = false;
function render(timestamp) {
  requestAnimationFrame(render);
  if (contextLost || document.hidden || timestamp + .25 < nextDraw) return;
  const dt = lastDraw === null ? 1/30 : Math.min((timestamp-lastDraw)/1000,.1);
  lastDraw = timestamp;
  nextDraw = nextDraw ? Math.max(nextDraw + FRAME_MS, timestamp + .25) : timestamp + FRAME_MS;
  const time = timestamp / 1000;
  const now = serverNow();
  updateDuet(now);
  const pulse = Math.exp(-4 * ((time * 2) % 1));
  const shashu = now < shashuUntil;
  const galaxy = now < galaxyUntil;
  const fireworks = now < fireworksUntil;
  const discoMode = now < discoUntil || shashu || galaxy;
  const [title,detail] = duet
    ? ['Ортада жұптық вальс!',duet.ids.map(id=>dancers.get(id).name).join(' × ')]
    : shashu ? ['Шашу! Ал, бәріміз билейік!','Бишілер шеңберге жиналды.']
    : duetTickets.size ? ['Вальске жұп іздейміз','Екінші пончикті басқа көрерменнен күтеміз. Ер және әйел аватары керек.']
    : galaxy ? ['Ғаламшар шоуы!','Би алаңына ғарыш түсті.']
    : fireworks ? ['Отшашу!','10 000 лайкқа рақмет!']
    : ['Екі пончик, бір вальс','Екі қонақ бір-бір пончик жіберсе, ортада жұп болып вальс билейді.'];
  if ($('mission-title').textContent !== title) $('mission-title').textContent = title;
  if ($('mission-detail').textContent !== detail) $('mission-detail').textContent = detail;
  centerWash.color.setHex(galaxy ? 0xffc687 : discoMode ? 0xffae70 : 0xffd3a5);
  centerWash.intensity = duet ? 170 : discoMode ? 140 + pulse*12 : 132;
  floorTrim[0].material.color.setHex(galaxy ? 0xffe2a3 : duet ? 0xffedcb : discoMode ? 0xffb376 : 0xe5a25f);
  danceCircle.material.color.setHex(galaxy ? 0x463a65 : 0x343c53);
  const progress = fireworks ? 10000 : totalLikes % 10000;
  if ($('mission-progress').value !== progress) {
    $('mission-progress').value = progress;
    $('mission-likes').textContent = String(progress).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' / 10 000';
  }
  confetti.visible = shashu || galaxy || fireworks;
  effectRing.visible = galaxy || fireworks;
  if (effectRing.visible) {
    const age = galaxy ? 12-(galaxyUntil-now)/1000 : 6-(fireworksUntil-now)/1000;
    const phase = (age / (galaxy ? 2.2 : 1.4)) % 1;
    effectRing.scale.setScalar(.35+phase*6.15);
    effectRing.material.opacity = .55*(1-phase);
  }
  if (confetti.visible) {
    const age = galaxy ? 12-(galaxyUntil-now)/1000 : fireworks ? 6-(fireworksUntil-now)/1000 : 9-(shashuUntil-now)/1000;
    confettiOrigin.forEach(([angle,radius,height,speed],i) => {
      const fall = (age*speed+i*.013)%1;
      if (galaxy) {
        const orbit = angle + age*(.75+speed*.4);
        confettiPositions[i*3] = Math.cos(orbit)*radius;
        confettiPositions[i*3+1] = .7+height*.65 + Math.sin(orbit*2)*.38;
        confettiPositions[i*3+2] = floorCenter.z+Math.sin(orbit)*radius;
      } else if (fireworks) {
        const cluster = Math.floor(i/10);
        const phase = (age*.72 + cluster*.19)%1;
        confettiPositions[i*3] = (cluster-1.5)*2.55 + Math.cos(angle)*radius*.46*phase;
        confettiPositions[i*3+1] = 4.25 + Math.sin(angle)*height*.42*phase - 1.35*phase*phase;
        confettiPositions[i*3+2] = floorCenter.z - 3 + cluster*.66 + Math.sin(angle*2)*radius*.43*phase;
      } else {
        confettiPositions[i*3] = Math.cos(angle+fall)*radius*fall;
        confettiPositions[i*3+1] = .2 + height*(1-fall*fall);
        confettiPositions[i*3+2] = floorCenter.z+Math.sin(angle+fall)*radius*fall;
      }
    });
    confettiGeometry.attributes.position.needsUpdate = true;
  }
  disco.rotation.y = time * (discoMode ? 1.8 : .3);
  bars.forEach((bar,i) => { bar.scale.y = .45 + Math.abs(Math.sin(time*2.5+i*.6)) * .48; });
  for (const [id,dancer] of dancers) {
    if (now >= dancer.until) { removeDancer(id); continue; }
    if (dancer.speech) {
      const remaining = dancer.speechUntil - now;
      if (remaining <= 0) clearSpeech(dancer);
      else dancer.speech.style.opacity = Math.min(1, remaining / 500);
    }
    animateGuest(dancer,dt,time,duet?.ids.indexOf(id) ?? -1);
  }
  const focused = now < cameraGuestUntil && dancers.get(cameraGuestId);
  const blend = 1 - Math.exp(-dt * 3);
  if (focused) {
    cameraDestination.copy(focused.root.position).add(new THREE.Vector3(0, 3.8, camera.aspect < .8 ? 12 : 9));
    namePosition.copy(focused.root.position).y += 2;
  } else {
    cameraDestination.set(angle === 0 ? Math.sin(time * .09) * .7 : angle === 1 ? 9 : -9, 6, camera.aspect < .8 ? 26 : 19);
    namePosition.set(0, 1.8, 0);
  }
  camera.position.lerp(cameraDestination, blend);
  cameraTarget.lerp(namePosition, blend);
  camera.lookAt(cameraTarget);
  positionGuestNames(now);
  const count = String(dancers.size);
  if ($('count').textContent !== count) $('count').textContent = count;
  renderer.render(scene,camera);
}
function resize() {
  const width = Math.max(1,canvas.clientWidth), height = Math.max(1,canvas.clientHeight);
  stageWidth = width;
  stageHeight = height;
  camera.aspect = width/height;
  camera.position.z = camera.aspect < .8 ? 26 : 19;
  camera.fov = camera.aspect < .8 ? 55 : 48;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(.8,Math.sqrt(650000/(width*height))));
  renderer.setSize(width,height,false);
}
function resetFrameTiming() {
  lastDraw = null;
  nextDraw = 0;
}
canvas.addEventListener('webglcontextlost',event => {
  event.preventDefault();
  contextLost = true;
});
canvas.addEventListener('webglcontextrestored',() => {
  contextLost = false;
  resetFrameTiming();
});
document.addEventListener('visibilitychange',resetFrameTiming);
window.addEventListener('resize',resize);
resize();
requestAnimationFrame(render);
function setPanel(open) {
  $('settings').classList.toggle('open', open);
  $('settings').inert = !open;
  $('settings-toggle').setAttribute('aria-expanded', String(open));
}
setPanel(new URLSearchParams(location.search).has('admin'));
$('settings-toggle').onclick = () => setPanel(!$('settings').classList.contains('open'));
$('close').onclick = () => { setPanel(false); $('settings-toggle').focus(); };
window.addEventListener('keydown', event => {
  if (event.key === 'Escape') setPanel(false);
  if (event.altKey && event.code === 'KeyA') { event.preventDefault(); setPanel(!$('settings').classList.contains('open')); }
});
document.body.classList.toggle('demo', new URLSearchParams(location.search).has('demo'));
$('camera').onclick=()=>angle=(angle+1)%3;$('capture').onclick=()=>window.open('/?capture=1','_blank');$('username').value=localStorage.getItem('tiktokUsername')||'';
async function adminRequest(path, body) {
  const secret = $('admin-key').value;
  const response = await fetch(path, {
    method:'POST',
    headers:{'Content-Type':'application/json', ...(secret ? {Authorization:'Bearer ' + secret} : {})},
    body:JSON.stringify(body || {})
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Сервер қатесі');
}
fetch('/api/status').then(response=>response.json()).then(status=>{
  $('admin-key-box').hidden = !status.requiresKey;
}).catch(()=>{});
$('connect').onclick = async () => {
  const username = $('username').value.trim();
  localStorage.setItem('tiktokUsername',username);
  try { await adminRequest('/api/connect',{username}); }
  catch (error) { $('connection-message').textContent = error.message; }
};
$('disconnect').onclick = async () => {
  try { await adminRequest('/api/disconnect'); }
  catch (error) { $('connection-message').textContent = error.message; }
};
const demoGifts = {1:['Раушан','join'],5:['Саусақ жүрегі','shashu'],10:['Қызыл раушан','dance'],
  30:['Пончик','duet'],100:['Қос қол жүрегі','breakdance'],1000:['Ғаламшар','galaxy'],battle:['Тәж','battle']};
let demoIndex = 0;
$('preview').onclick = () => {
  const selected = $('demo-tier').value;
  if (selected === 'likes') { startFireworks(true); return; }
  const [gift,action] = demoGifts[selected];
  demoIndex++;
  const id = 'demo-' + demoIndex;
  const appearance = action === 'duet' ? (demoIndex % 2 ? 'man' : 'woman') : undefined;
  receive({type:'gift',gift,action,appearance,coins:Number(selected)||0,id,userId:id,name:'@qonaq_' + demoIndex,count:1,total:1,demo:true});
};
$('preview-join').onclick = () => {
  demoIndex++;
  const userId = 'demo-' + demoIndex;
  receive({type:'join', id:'join:' + userId, userId, name:'@qonaq_' + demoIndex, at:serverNow()});
};
$('preview-chat').onclick = () => showSpeech({userId:demoIndex ? 'demo-' + demoIndex : 'viewer-demo', name:'Қонақ', message:'Сәлем, достар!'});
function startFireworks(demo = false) {
  fireworksUntil = serverNow() + 6000;
  queue.push({name:'Барша көрермен', gift:'10 000 лайк', action:'fireworks', demo});
  showNext();
}
function updateLikes(count, live) {
  totalLikes = Math.max(totalLikes, Number(count) || 0);
  $('like-count').textContent = totalLikes.toLocaleString('kk-KZ');
  const goal = Math.floor(totalLikes / 10000);
  if (goal <= lastLikeGoal) return;
  lastLikeGoal = goal;
  if (live) startFireworks();
}
function openSocket() {
  const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
  const socket = new WebSocket(scheme + '://' + location.host);
  socket.onopen = () => { socketConnected = true; renderDiagnostics(); };
  socket.onmessage = event => {
    const data = JSON.parse(event.data);
    syncClock(data.serverTime);
    switch (data.type) {
      case 'diagnostics':
        giftDiagnostics = data;
        renderDiagnostics();
        break;
      case 'gift': receive(data); break;
      case 'chat': showSpeech(data); break;
      case 'join': receive({...data,id:'join:' + data.userId + ':' + data.at}); break;
      case 'likes': updateLikes(data.count,true); break;
      case 'history': {
        updateLikes(data.likes,false);
        const recent = new Map();

        const cutoff = serverNow() - DANCE_MS;
        for (const gift of [...(data.viewers || []), ...data.gifts].sort((a,b)=>a.at-b.at)) {
          if (gift.at <= cutoff) continue;
          if (recent.get(gift.userId)?.at > gift.at) continue;
          recent.delete(gift.userId);
          recent.set(gift.userId,gift);
        }
        for (const gift of [...recent.values()].sort((a,b)=>a.at-b.at).slice(-MAX_DANCERS)) receive({...gift,id:gift.id || 'join:' + gift.userId + ':' + gift.at},true);
        break;
      }
      case 'reset':
        for (const id of dancers.keys()) removeDancer(id);
        processed.clear();
        pending.length = 0;
        recentGuest.hidden = true;
        nextArrivalAt = arrivalUntil = 0;
        nextArrivalId = cameraGuestId = undefined;
        cameraGuestUntil = 0;
        speechPending.clear();
        queue.length = 0;
        lastLikeGoal = totalLikes = fireworksUntil = galaxyUntil = discoUntil = shashuUntil = 0;
        duet = null;
        duetTickets.clear();
        $('like-count').textContent = '0';
        break;
      case 'status':
        if (data.username && document.activeElement !== $('username')) $('username').value = data.username;
        document.body.classList.toggle('connected',data.state==='connected');
        $('status').textContent = ({connected:'LIVE · @'+data.username,connecting:'ҚОСЫЛУ',retrying:'ҚАЙТА ҚОСЫЛУ',offline:'ЭФИР ҚОСЫЛМАҒАН'})[data.state];
        $('connection-message').textContent = (data.username ? '@' + data.username + ' · ' : '') + (data.message || 'TikTok LIVE эфирін баста да, атыңды енгіз.');
        $('connect').disabled = data.state === 'connecting';
        $('preview').disabled = data.state === 'connected' && !query.has('demo');
        break;
    }
  };
  socket.onclose = () => {
    socketConnected = false;
    renderDiagnostics();
    $('status').textContent = 'СЕРВЕРГЕ ҚОСЫЛУ МҮМКІН ЕМЕС';
    document.body.classList.remove('connected');
    setTimeout(openSocket,3000);
  };
}
openSocket();
