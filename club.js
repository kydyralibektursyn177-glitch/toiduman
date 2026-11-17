import * as THREE from 'three';
import {mergeGeometries} from '/vendor/examples/jsm/utils/BufferGeometryUtils.js';
const $=id=>document.getElementById(id), query=new URLSearchParams(location.search);
const MAX_GUESTS=50, DANCE_MS=60000, CHAT_MS=10000, BUILD='wedding-50-v1';
let epoch=Date.now(), tick=performance.now();
const now=()=>epoch+performance.now()-tick;
function syncClock(at){if(Number.isFinite(at)){epoch=at;tick=performance.now();}}
const guests=new Map(), waiting=new Map(), seen=new Set();
let demoIndex=0, clock=0, totalLikes=0, noticeUntil=0, chatUntil=0, showUntil=0, groupDanceUntil=0, focusId=null, focusUntil=0, cameraMode='overview';
let diagnostics={}, socketReady=false, isLive=false;
const stage=$('stage'), renderer=new THREE.WebGLRenderer({canvas:$('club'),antialias:false,alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,1));renderer.setClearColor('#3d1658');
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
const scene=new THREE.Scene();scene.fog=new THREE.FogExp2('#522263',.014);
const camera=new THREE.PerspectiveCamera(42,1,.1,160), target=new THREE.Vector3(0,1,0), cameraGoal=new THREE.Vector3();
scene.add(new THREE.HemisphereLight('#fff2d0','#553060',2.8));
const key=new THREE.DirectionalLight('#ffefbd',3);key.position.set(8,20,15);scene.add(key);
const fill=new THREE.DirectionalLight('#f6a9df',1.4);fill.position.set(-10,10,0);scene.add(fill);
const mats={};
function mat(color,metalness=.1){return new THREE.MeshStandardMaterial({color,metalness,roughness:.54});}
const gold=mat('#e6b85b',.6), cream=mat('#ffe3a0'), purple=mat('#64247b'), deep=mat('#321347'), pink=mat('#dc8fa9');
const sphere=new THREE.SphereGeometry(1,10,7), cylinder=new THREE.CylinderGeometry(1,1,1,12), cube=new THREE.BoxGeometry(1,1,1);
function mesh(geo,material,x,y,z,sx=1,sy=sx,sz=sx){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);scene.add(m);return m;}
// A velvet carpet with a woven gold border, made locally without external assets.
const rug=document.createElement('canvas');rug.width=rug.height=1024;const r=rug.getContext('2d');
r.fillStyle='#792556';r.fillRect(0,0,1024,1024);r.strokeStyle='#d8ae60';
for(const inset of [18,32,56]){r.lineWidth=inset===32?5:2;r.strokeRect(inset,inset,1024-inset*2,1024-inset*2);}
for(let row=0;row<7;row++)for(let col=0;col<6;col++){const x=95+col*167,y=85+row*143;r.save();r.translate(x,y);r.rotate(Math.PI/4);r.lineWidth=2;r.strokeRect(-19,-19,38,38);r.beginPath();r.arc(0,0,6,0,Math.PI*2);r.stroke();r.restore();}
r.save();r.translate(512,512);for(let i=0;i<12;i++){r.rotate(Math.PI/6);r.beginPath();r.ellipse(0,74,19,66,0,0,Math.PI*2);r.fillStyle=i%2?'#e3ba6c':'#c68b49';r.fill();}r.restore();
const rugMap=new THREE.CanvasTexture(rug);rugMap.colorSpace=THREE.SRGBColorSpace;
mesh(cube,deep,0,-.45,0,35,.7,40);mesh(cube,mat('#ab7848'),0,-.07,0,29,.08,30);
const carpet=mesh(new THREE.PlaneGeometry(26,28),new THREE.MeshStandardMaterial({map:rugMap,roughness:.9}),0,.02,0);carpet.rotation.x=-Math.PI/2;
mesh(cube,purple,0,6,-14.3,34,13,.5);
for(const x of [-14.5,14.5]){mesh(cube,purple,x,5,0,.4,11,30);for(let z=-12;z<=12;z+=6){mesh(cylinder,cream,x*.92,3.5,z,.45,7,.45);mesh(cylinder,gold,x*.92,.25,z,.8,.4,.8);mesh(cylinder,gold,x*.92,7,z,.8,.4,.8);}}
// Wedding portal, pleated curtains, balloon garland and warm lamps.
mesh(cube,gold,0,5,-13.8,11,10,.5);mesh(cube,cream,0,5,-13.45,10,9.4,.3);
for(let i=0;i<17;i++)mesh(cylinder,i%2?pink:purple,-4.6+i*.575,4.8,-13.1,.38,9,.38);
for(let side of [-1,1])for(let i=0;i<16;i++){const a=i/15*Math.PI*.55;const x=side*(4.8-Math.sin(a)*1.4),y=1+i*.5;mesh(sphere,[gold,pink,cream][i%3],x,y,-12.4,.52);}
const path=mesh(cube,mat('#bd3d65'),0,.09,-10,4,.08,6);mesh(cube,gold,0,.08,-7.6,4.3,.04,.15);
for(const x of [-11,11])for(let z=-10;z<=10;z+=5){mesh(cylinder,gold,x,1.1,z,.08,2,.08);mesh(sphere,cream,x,2.2,z,.27);}
// Merge static decor by material so the hall stays inexpensive to draw.
const batches=new Map();
for(const item of [...scene.children])if(item.isMesh){
 item.updateMatrix();const geometry=item.geometry.clone().applyMatrix4(item.matrix);
 if(!batches.has(item.material))batches.set(item.material,[]);batches.get(item.material).push(geometry);scene.remove(item);
}
for(const [material,geometries]of batches){scene.add(new THREE.Mesh(mergeGeometries(geometries),material));for(const geometry of geometries)geometry.dispose();}
// Instanced cartoon people: every body part is one draw call for all 50 guests.
const partSpecs=[
 ['head',sphere,'#edbd94'],['hair',sphere,'#382322'],['eyeL',sphere,'#24192a'],['eyeR',sphere,'#24192a'],['nose',sphere,'#e9aa84'],['smile',cube,'#ae525e'],
 ['torso',cylinder,'#f6cd79'],['belt',cylinder,'#f4d88c'],['skirt',cylinder,'#bf5b9f'],['armL',cylinder,'#f0c392'],['armR',cylinder,'#f0c392'],['handL',sphere,'#edbd94'],['handR',sphere,'#edbd94'],
 ['legL',cylinder,'#40304d'],['legR',cylinder,'#40304d'],['shoeL',sphere,'#382136'],['shoeR',sphere,'#382136'],['hat',cylinder,'#63407a'],['brim',cylinder,'#dcaf5d']
];
const parts={};for(const [name,geometry,color]of partSpecs){const m=new THREE.InstancedMesh(geometry,mat(color),MAX_GUESTS);m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.frustumCulled=false;scene.add(m);parts[name]=m;}
const dummy=new THREE.Object3D(), color=new THREE.Color();
const palette=['#d95887','#537cc4','#58a68a','#da9a4c','#925bc3','#ba514e','#69a5b1','#d5b165'];
function hash(id){return Array.from(String(id)).reduce((a,c)=>(Math.imul(a,31)+c.codePointAt(0))>>>0,0);}
function homeFor(slot){const row=Math.floor(slot/10),col=slot%10;return new THREE.Vector3((col-4.5)*2.05,.08,5.5-row*3.2);}
function count(){ $('count').textContent=guests.size+' / 50';$('waiting').textContent='Кезекте '+waiting.size;}
function notice(text){$('notice').textContent=text;$('notice').hidden=false;noticeUntil=now()+3500;}
function focus(guest){if(cameraMode==='focus'){focusId=guest.id;focusUntil=now()+5000;}}
function join(event,quiet=false){
 if(!event.userId)return;
 let guest=guests.get(event.userId);
 if(guest){guest.until=Math.max(guest.until,event.until??now()+DANCE_MS);if(event.appearance)guest.gender=event.appearance;return guest;}
 const at=event.at??now();if(at+DANCE_MS<=now()&&!event.until)return;
 if(guests.size>=MAX_GUESTS){waiting.delete(event.userId);waiting.set(event.userId,{...event,at:now()});if(waiting.size>300)waiting.delete(waiting.keys().next().value);count();return;}
 const occupied=new Set([...guests.values()].map(g=>g.slot));let slot=0;while(occupied.has(slot))slot++;
 const label=document.createElement('div');label.className='guest';const name=document.createElement('span');name.className='name';name.textContent=event.name||'Қонақ';label.append(name);$('labels').append(label);
 guest={id:event.userId,name:event.name||'Қонақ',slot,seed:hash(event.userId),home:homeFor(slot),position:homeFor(slot),until:event.until??at+DANCE_MS,gender:event.appearance||(slot%2?'woman':'man'),label,entered:performance.now(),speechUntil:0,boost:0,action:'join'};
 guests.set(event.userId,guest);if(!quiet){notice(guest.name+' · тойға қош келдің!');focus(guest);}count();return guest;
}
function removeGuest(id){const g=guests.get(id);if(!g)return;g.label.remove();guests.delete(id);}
function promote(){for(const [id,e]of waiting){if(guests.size>=MAX_GUESTS)break;waiting.delete(id);const guest=join({...e,at:now()},true);if(e.message&&guest)speak({...e,at:now()});}count();}
function speak(event){
 const text=String(event.message||'').trim();if(!text)return;
 const at=event.at??now();if(at+CHAT_MS<=now())return;
 const author=document.createElement('strong');author.textContent=event.name||'Қонақ';$('latest-chat').replaceChildren(author,document.createTextNode(' · '+Array.from(text).slice(0,100).join('')));$('latest-chat').hidden=false;chatUntil=now()+CHAT_MS;
 let g=guests.get(event.userId)||join(event,true);
 if(!g){waiting.set(event.userId,{...event,at:now()});return;}
 if(event.appearance)g.gender=event.appearance;
 g.until=Math.max(g.until,now()+CHAT_MS+1500);g.bubble?.remove();g.bubble=document.createElement('div');g.bubble.className='bubble';g.bubble.textContent=Array.from(text).slice(0,100).join('');g.label.append(g.bubble);g.label.classList.add('speaking');g.speechUntil=now()+CHAT_MS;focus(g);
}
function gift(event,quiet=false){if(event.id&&seen.has(event.id))return;if(event.id)seen.add(event.id);if(seen.size>3000)seen.delete(seen.values().next().value);const g=join(event,true);if(!g)return;g.action=event.action||'dance';g.boost=(event.at??now())+10000;if(quiet)return;
 notice((event.name||'Қонақ')+' · '+(event.gift||'Сыйлық')+' ×'+(event.total||1));if(event.action==='shashu')groupDanceUntil=now()+10000;if(['galaxy','battle','fireworks'].includes(event.action))showUntil=now()+10000;
 if(event.action==='duet'){const partner=[...guests.values()].find(other=>other!==g&&other.action==='duet'&&other.boost>now());if(partner){g.partner=partner.id;partner.partner=g.id;}}
 focus(g);
}
function reset(){for(const id of guests.keys())removeGuest(id);waiting.clear();seen.clear();totalLikes=0;$('latest-chat').hidden=true;$('notice').hidden=true;focusId=null;count();}
const matrixPosition=new THREE.Vector3(), projected=new THREE.Vector3();
function put(name,index,x,y,z,sx,sy,sz,rz=0){dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(0,0,rz);dummy.updateMatrix();parts[name].setMatrixAt(index,dummy.matrix);}
function drawGuest(g,index,time){
 const beat=time*(g.boost>now()?5:3)+g.seed%20,bounce=Math.abs(Math.sin(beat))*.08,wave=Math.sin(beat),female=g.gender==='woman';
 const s=.82+(g.seed%5)*.025;const dancing=g.boost>now()||now()<groupDanceUntil;
 const waltz=g.action==='duet'&&g.partner&&guests.has(g.partner)&&g.boost>now();
 let x=g.home.x+Math.sin(beat*.5)*.11,y=.12+bounce,z=g.home.z;
 if(dancing){x+=Math.sin(beat)*.13;y+=Math.abs(Math.sin(beat))*.13;}
 if(waltz){const p=guests.get(g.partner),side=g.slot<p.slot?1:-1;x=(g.home.x+p.home.x)/2+Math.cos(clock*1.5)*.8*side;z=(g.home.z+p.home.z)/2+Math.sin(clock*1.5)*.8*side;}
 g.position.set(x,y,z);const tint=palette[g.seed%palette.length];
 for(const name of ['torso','armL','armR','hat','skirt'])parts[name].setColorAt(index,color.set(tint));
 for(const name of ['head','nose','handL','handR'])parts[name].setColorAt(index,color.set(['#edbd94','#d8a17d','#f4d1a9','#b97858'][g.seed%4]));
 const P=(name,dx,dy,dz,sx,sy,sz,rz=0)=>put(name,index,x+dx*s,y+dy*s,z+dz*s,sx*s,sy*s,sz*s,rz);
 P('head',0,2.28,0,.53,.56,.46);P('hair',0,2.52,-.06,.55,.36,.46);P('eyeL',-.19,2.34,.405,.055,.073,.035);P('eyeR',.19,2.34,.405,.055,.073,.035);P('nose',0,2.19,.46,.075,.07,.06);P('smile',0,2.08,.425,.16,.025,.02);
 P('torso',0,1.45,0,.37,.86,.28);P('belt',0,1.14,0,.39,.1,.3);
 P('skirt',0,.85,0,female?.55:.001,female?.66:.001,female?.4:.001);
 const a=.55+wave*.35;P('armL',-.54,1.55+wave*.1,0,.105,.69,.11,-a);P('armR',.54,1.55-wave*.1,0,.105,.69,.11,a);
 P('handL',-.72,1.3+wave*.12,0,.13,.14,.12);P('handR',.72,1.3-wave*.12,0,.13,.14,.12);
 P('legL',-.19,.52,Math.sin(beat)*.09,.12,.68,.12,wave*.1);P('legR',.19,.52,-Math.sin(beat)*.09,.12,.68,.12,-wave*.1);
 P('shoeL',-.2,.17,.09+wave*.08,.17,.11,.25);P('shoeR',.2,.17,.09-wave*.08,.17,.11,.25);
 P('hat',0,2.88,0,female?.33:.42,female?.37:.27,.35);P('brim',0,2.73,0,.51,.06,.45);
}
const confettiCount=200,confettiPositions=new Float32Array(confettiCount*3),confettiGeo=new THREE.BufferGeometry();confettiGeo.setAttribute('position',new THREE.BufferAttribute(confettiPositions,3));
const confetti=new THREE.Points(confettiGeo,new THREE.PointsMaterial({color:'#ffe4a2',size:.12,transparent:true,opacity:.9}));scene.add(confetti);
let lastFrame=0,frames=0,measurementStart=performance.now();
function render(at){requestAnimationFrame(render);if(document.hidden||at-lastFrame<1000/30)return;const dt=Math.min(.1,(at-lastFrame)/1000||1/30);lastFrame=at;clock=at/1000;const t=now();
 for(const [id,g]of guests){if(t>=g.until){removeGuest(id);continue;}if(g.bubble&&t>=g.speechUntil){g.bubble.remove();g.bubble=null;g.label.classList.remove('speaking');}}
 if(waiting.size&&guests.size<MAX_GUESTS)promote();
 let index=0;for(const g of guests.values())drawGuest(g,index++,clock);
 for(const part of Object.values(parts)){part.count=index;part.instanceMatrix.needsUpdate=true;if(part.instanceColor)part.instanceColor.needsUpdate=true;}
 const focused=t<focusUntil?guests.get(focusId):null;
 if(focused){cameraGoal.set(focused.position.x*.8,10,focused.position.z+19);matrixPosition.copy(focused.position).y=1.5;}
 else{cameraGoal.set(0,23,26);matrixPosition.set(0,0,-1);}
 camera.position.lerp(cameraGoal,1-Math.exp(-dt*3));target.lerp(matrixPosition,1-Math.exp(-dt*3));camera.lookAt(target);camera.updateMatrixWorld();
 const w=$('club').clientWidth,h=$('club').clientHeight,offset=$('club').offsetTop;for(const g of guests.values()){
 projected.copy(g.position).y+=2.9;projected.project(camera);const visible=Math.abs(projected.x)<1&&Math.abs(projected.y)<1&&projected.z<1;g.label.hidden=!visible;
 g.label.style.transform=`translate(${Math.max(25,Math.min(w-25,(projected.x+1)*w/2))}px,${offset+(1-projected.y)*h/2}px) translate(-50%,-100%)`;
 }
 confetti.visible=t<showUntil||t<groupDanceUntil;if(confetti.visible){for(let i=0;i<confettiCount;i++){confettiPositions[i*3]=Math.sin(i*12.7)*13;confettiPositions[i*3+1]=12-((clock*2+i*.37)%12);confettiPositions[i*3+2]=Math.cos(i*4.3)*12;}confettiGeo.attributes.position.needsUpdate=true;}
 if(t>=noticeUntil)$('notice').hidden=true;if(t>=chatUntil)$('latest-chat').hidden=true;
 renderer.render(scene,camera);frames++;if(at-measurementStart>2000){window.weddingStats={guests:guests.size,waiting:waiting.size,fps:Math.round(frames*1000/(at-measurementStart)),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};frames=0;measurementStart=at;}
}
function resize(){camera.aspect=$('club').clientWidth/$('club').clientHeight;camera.updateProjectionMatrix();renderer.setSize($('club').clientWidth,$('club').clientHeight,false);}new ResizeObserver(resize).observe(stage);resize();camera.position.set(0,23,26);camera.lookAt(target);$('loading').hidden=true;requestAnimationFrame(render);
function renderDiagnostics(){$('diagnostics').textContent=`${BUILD} · Сервер: ${socketReady?'қосылған':'ажыратылған'} · Кіру: ${diagnostics.joins||0} · Чат: ${diagnostics.chats||0} · Сыйлық: ${diagnostics.accepted||0}`+(diagnostics.issue?' · '+diagnostics.issue:'');}
function likes(value){const oldGoal=Math.floor(totalLikes/10000);totalLikes=Math.max(totalLikes,Number(value)||0);$('likes').textContent=totalLikes.toLocaleString('kk-KZ');$('progress').value=totalLikes%10000;if(Math.floor(totalLikes/10000)>oldGoal){showUntil=now()+10000;notice('10 000 лайк! Тойымыз жарқырай берсін!');}}
function openSocket(){const ws=new WebSocket((location.protocol==='https:'?'wss':'ws')+'://'+location.host);ws.onopen=()=>{socketReady=true;renderDiagnostics();};ws.onclose=()=>{socketReady=false;renderDiagnostics();$('status').textContent='СЕРВЕРГЕ ҚАЙТА ҚОСЫЛУ';setTimeout(openSocket,3000);};ws.onmessage=e=>{let data;try{data=JSON.parse(e.data);}catch{return;}syncClock(data.serverTime);switch(data.type){
 case'join':join(data);break;case'chat':speak(data);break;case'gift':gift(data);break;case'likes':likes(data.count);break;
 case'history':{likes(data.likes);const events=[...(data.viewers||[]),...(data.gifts||[])].sort((a,b)=>a.at-b.at);for(const event of events)if(event.at+DANCE_MS>now()){if(event.type==='gift')gift(event,true);else join(event,true);}break;}
 case'reset':reset();break;case'diagnostics':diagnostics=data;renderDiagnostics();break;
 case'status':isLive=data.state==='connected';$('status').textContent=({connected:'LIVE · @'+data.username,connecting:'ҚОСЫЛУДА…',retrying:'ҚАЙТА ҚОСЫЛУ…',offline:'ТОЙҒА ҚОШ КЕЛДІҢ!'})[data.state]||data.state;$('connection-message').textContent=data.message||'TikTok эфирін баста.';break;
 } };}openSocket();
const adminHeaders=()=>({'Content-Type':'application/json',...($('admin-key').value?{Authorization:'Bearer '+$('admin-key').value}:{})});
async function request(path,body={}){const response=await fetch(path,{method:'POST',headers:adminHeaders(),body:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw new Error(data.error||'Қосылу қатесі');return data;}
$('connect').onclick=async()=>{try{await request('/api/connect',{username:$('username').value});localStorage.setItem('weddingUsername',$('username').value);}catch(e){$('connection-message').textContent=e.message;}};
$('disconnect').onclick=async()=>{try{await request('/api/disconnect');}catch(e){$('connection-message').textContent=e.message;}};
$('settings-toggle').onclick=()=>$('settings').classList.add('open');$('close').onclick=()=>$('settings').classList.remove('open');
$('save-title').onclick=()=>{const text=$('title-input').value.trim().slice(0,80);$('couple-name').textContent=text||'БҮГІНГІ ТОЙДЫҢ ҚҰРМЕТТІ ҚОНАҒЫСЫҢ!';localStorage.setItem('weddingTitle',text);};$('title-input').value=localStorage.getItem('weddingTitle')||'';$('save-title').click();$('username').value=localStorage.getItem('weddingUsername')||'';
window.addEventListener('storage',event=>{if(event.key==='weddingTitle')$('couple-name').textContent=event.newValue||'БҮГІНГІ ТОЙДЫҢ ҚҰРМЕТТІ ҚОНАҒЫСЫҢ!';});
const demoNames=['Алихан','Аружан','Данияр','Айша','Мирас','Амина','Ерлан','Дана','Әли','Жансая'];
function demoGuest(){demoIndex++;return{userId:'demo-'+demoIndex,name:demoNames[(demoIndex-1)%10]+' '+demoIndex,at:now(),until:Infinity};}
function demo50(){for(let i=0;i<50;i++)join(demoGuest(),true);notice('50 қонақ · тойдың демосы');}
$('demo-50').onclick=()=>{if(isLive){notice('Демоны бөлек терезеде аш: ?demo=50');return;}reset();demo50();};$('demo-join').onclick=()=>join(demoGuest());
$('demo-chat').onclick=()=>{const g=[...guests.values()].find(g=>g.id.startsWith('demo-'))||join(demoGuest(),true);if(g)speak({userId:g.id,name:g.name,message:'Той тойға ұлассын! Құтты болсын! 🎉',at:now()});};
$('demo-gift').onclick=()=>{const g=[...guests.values()].find(g=>g.id.startsWith('demo-'))||join(demoGuest(),true);if(!g)return;const coins=Number($('gift-select').value);const [name,action]=({1:['Раушан','join'],5:['Жүрек','shashu'],30:['Пончик','duet'],100:['Тәж','battle'],1000:['Ғаламшар','galaxy']})[coins];gift({type:'gift',id:'demo-gift-'+performance.now(),userId:g.id,name:g.name,gift:name,action,coins,total:1,at:now()});};
$('clear-demo').onclick=()=>{for(const [id]of guests)if(id.startsWith('demo-'))removeGuest(id);for(const id of waiting.keys())if(id.startsWith('demo-'))waiting.delete(id);promote();};
$('overview').onclick=()=>{cameraMode=cameraMode==='overview'?'focus':'overview';focusUntil=0;$('overview').textContent=cameraMode==='overview'?'Камера: барлық қонақ':'Камера: кірген адамға жақындау';};
$('capture').onclick=()=>window.open('/?capture=1','_blank');document.body.classList.toggle('capture',query.has('capture'));if(query.has('admin'))$('settings').classList.add('open');
fetch('/api/status').then(r=>r.json()).then(data=>$('key-box').hidden=!data.requiresKey).catch(()=>{});
if(query.get('demo')==='50')demo50();
