const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
function harness(){
 const source=readFileSync('club.js','utf8');
 const elements=new Map();
 const element=()=>({className:'',textContent:'',hidden:false,children:[],classList:{add(){},remove(){}},append(...nodes){this.children.push(...nodes)},replaceChildren(...nodes){this.children=nodes},remove(){this.removed=true;}});
 const document={createElement:element,createTextNode:text=>({textContent:text})};
 const guests=new Map(),waiting=new Map();
 const ctx=vm.createContext({THREE:{Vector3:class{constructor(x,y,z){Object.assign(this,{x,y,z})}}},MAX_GUESTS:50,DANCE_MS:60000,CHAT_MS:10000,
 guests,waiting,seen:new Set(),now:()=>100000,performance:{now:()=>1000},document,
 $:id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id)},
 cameraMode:'overview',noticeUntil:0,chatUntil:0,showUntil:0,groupDanceUntil:0,totalLikes:0,focusId:null,hash:()=>1});
 vm.runInContext(source.slice(source.indexOf('function homeFor('),source.indexOf('const matrixPosition')),ctx);
 return {ctx,guests,waiting,elements,run:code=>vm.runInContext(code,ctx)};
}
test('50 guests retain unique slots and the 51st enters when a place becomes free',()=>{
 const h=harness();h.run("for(let i=0;i<51;i++)join({userId:'u'+i,name:'Қонақ '+i})");
 assert.equal(h.guests.size,50);assert.equal(h.waiting.size,1);
 assert.equal(new Set([...h.guests.values()].map(g=>g.slot)).size,50);
 h.run("removeGuest('u0');promote()");assert.equal(h.guests.size,50);assert.equal(h.waiting.size,0);assert.ok(h.guests.has('u50'));
});
test('chat is attached to the matching name and uses plain text',()=>{
 const h=harness();h.run("speak({userId:'chat',name:'Айша',message:'<b>Сәлем!</b>'})");
 const g=h.guests.get('chat');assert.equal(g.bubble.textContent,'<b>Сәлем!</b>');assert.ok(g.label.children.includes(g.bubble));
 assert.equal(g.speechUntil,110000);
 const old=g.bubble;h.run("speak({userId:'chat',name:'Айша',message:'Той құтты болсын!'})");assert.equal(old.removed,true);assert.equal(g.bubble.textContent,'Той құтты болсын!');
});
test('full-stage chat remains visible and is queued for its own character',()=>{
 const h=harness();h.run("for(let i=0;i<50;i++)join({userId:'u'+i,name:'Қонақ '+i});speak({userId:'extra',name:'Әли',message:'Сәлем!'})");
 assert.equal(h.guests.size,50);assert.equal(h.waiting.get('extra').message,'Сәлем!');assert.equal(h.elements.get('latest-chat').hidden,false);
 h.run("removeGuest('u0');promote()");assert.equal(h.guests.get('extra').bubble.textContent,'Сәлем!');
});
test('duplicate gifts do not replay effects, reset empties stage and queue',()=>{
 const h=harness();h.run("gift({id:'g1',userId:'u1',name:'Дана',gift:'Жүрек',action:'shashu'})");assert.equal(h.ctx.groupDanceUntil,110000);
 h.run("groupDanceUntil=0;gift({id:'g1',userId:'u1',name:'Дана',action:'shashu'})");assert.equal(h.ctx.groupDanceUntil,0);
 h.run('reset()');assert.equal(h.guests.size,0);assert.equal(h.waiting.size,0);
});
