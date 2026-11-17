const {test} = require('node:test');
const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const {readFileSync} = require('node:fs');
const vm = require('node:vm');

test('switching LIVE accounts routes gifts and ignores stale connections', async () => {
  const routes = new Map(), connections = [], messages = [];
  const app = {use(){}, get(){}, post(path, ...handlers){routes.set(path,handlers.at(-1));}, listen(){return {};}};
  const express = Object.assign(() => app, {json:()=>()=>{}, static:()=>()=>{}});
  class SocketServer extends EventEmitter {
    constructor(){super(); this.clients = [{readyState:1, send:text=>messages.push(JSON.parse(text))}];}
  }
  class Connection extends EventEmitter {
    constructor(username){super(); this.username=username; connections.push(this);}
    async connect(){}
    disconnect(){this.emit('disconnected');}
  }
  const dependencies = {
    express, ws:{WebSocketServer:SocketServer}, 'node:crypto':require('node:crypto'),
    'tiktok-live-connector':{TikTokLiveConnection:Connection, WebcastEvent:{CHAT:'chat', LIKE:'like', GIFT:'gift', MEMBER:'member'}}
  };
  const context = vm.createContext({require:name=>dependencies[name], process:{env:{}}, Buffer, console,
    setTimeout, clearTimeout, __dirname});
  vm.runInContext(readFileSync('server.cjs','utf8'), context);
  const connect = async username => {
    routes.get('/api/connect')({body:{username}}, {json(){}, status(){return this;}});
    await Promise.resolve();
  };
  const rose = {user:{idStr:'123', displayId:'viewer'}, giftId:5655, gift:{name:'Rose', diamondCount:1}, groupId:'batch', repeatCount:1};
  await connect('first.account');
  connections[0].emit('member', {user:{idStr:'123', nickname:'Алихан'}});
  assert.equal(messages.at(-1).joins, 1);
  assert.equal(messages.at(-1).build, 'live-chat-4');
  assert.equal(messages.filter(m=>m.type==='join').at(-1).name, 'Алихан');
  assert.equal(messages.filter(m=>m.type==='join').at(-1).userId, '123');
  connections[0].emit('member', {});
  assert.equal(messages.at(-1).rejectedViewers, 1, 'missing identity is visible');
  connections[0].emit('chat', {user:{idStr:'123'}, comment:'Сәлем!'});
  assert.equal(messages.at(-1).chats, 1);
  assert.equal(messages.filter(m=>m.type==='chat').at(-1).message, 'Сәлем!');
  assert.equal(messages.filter(m=>m.type==='chat').at(-1).userId, '123', 'chat uses the same identity as entry');
  connections[0].emit('gift', rose);
  await connect('@erll.04');
  assert.equal(connections[1].username,'erll.04');
  const resetDiagnostics = messages.filter(m=>m.type==='diagnostics').at(-1);
  assert.equal(resetDiagnostics.chats,0);
  assert.equal(resetDiagnostics.joins,0);
  connections[1].emit('gift', rose);
  assert.equal(messages.filter(m=>m.type==='gift').length,2,'same gift key is valid after switching accounts');
  assert.equal(messages.filter(m=>m.type==='gift').at(-1).action,'join');
  assert.ok(Number.isFinite(messages.filter(m=>m.type==='gift').at(-1).serverTime));
  connections[1].emit('gift', rose);
  assert.equal(messages.filter(m=>m.type==='gift').length,2,'duplicate combo does not add another guest');
  const joins = messages.filter(m=>m.type==='join').length;
  connections[0].emit('member', {user:{idStr:'old-viewer'}});
  assert.equal(messages.filter(m=>m.type==='join').length, joins, 'old connection cannot add viewers');
  connections[0].emit('gift', {...rose, groupId:'late'});
  assert.equal(messages.filter(m=>m.type==='gift').length,2,'old account cannot deliver gifts');
  connections[1].emit('error',new Error('test connection error'));
  assert.equal(messages.at(-1).issue,'test connection error');
  connections[1].emit('gift',{giftId:5655});
  assert.ok(messages.at(-1).issue,'missing sender is visible in diagnostics');
  // A superseded retry uses the same generation; identity must also be checked.
  await vm.runInContext('connect(generation)', context);
  connections[1].emit('gift',{...rose,groupId:'old-retry'});
  assert.equal(messages.filter(m=>m.type==='gift').length,2);
  connections[2].emit('gift',{...rose,groupId:'new-retry'});
  assert.equal(messages.filter(m=>m.type==='gift').length,3);
  assert.equal(messages.filter(m=>m.type==='status').at(-1).username,'erll.04');
});

test('gift lifetime uses server time despite wrong or changed computer clock', () => {
  const source = readFileSync('club.js','utf8');
  const clock = source.slice(source.indexOf('let clockEpoch'), source.indexOf('const liveDiagnostics'));
  for (const skew of [-86400000, 86400000]) {
    let tick = 100, wall = 1700000000000 + skew;
    const ctx = vm.createContext({Date:{now:()=>wall}, performance:{now:()=>tick}});
    vm.runInContext(clock,ctx);
    vm.runInContext('syncClock(1700000000000)',ctx);
    assert.equal(vm.runInContext('serverNow()',ctx),1700000000000);
    wall += 3600000;
    tick += 59000;
    assert.equal(vm.runInContext('serverNow()',ctx),1700000059000);
    assert.ok(1700000000000 + 60000 > vm.runInContext('serverNow()',ctx));
    tick += 1001;
    assert.ok(1700000000000 + 60000 < vm.runInContext('serverNow()',ctx));
  }
});


test('entry creates a named dancer and focuses once; history restores quietly', () => {
  const source = readFileSync('club.js','utf8');
  const receive = source.slice(source.indexOf('function receive('), source.indexOf('function updateDuet('));
  const dancers = new Map(), focused = [], announced = [];
  const ctx = vm.createContext({
    model:true, cameraGuestId:undefined, processed:new Set(), dancers, pending:[], speechPending:new Map(),
    serverNow:()=>1000,
    addDancer:event=>{const dancer = {name:event.name}; dancers.set(event.userId,dancer); return dancer;},
    announceEntrance:event=>announced.push(event.userId), focusGuest:id=>focused.push(id)
  });
  vm.runInContext(receive, ctx);
  vm.runInContext("receive({type:'join',userId:'1',id:'entry-1',name:'Айша'})",ctx);
  assert.equal(dancers.get('1').name,'Айша');
  assert.deepEqual(focused,['1']);
  vm.runInContext("receive({type:'join',userId:'1',id:'entry-2',name:'Айша'})",ctx);
  vm.runInContext("receive({type:'join',userId:'2',id:'history-2',name:'Әли'},true)",ctx);
  assert.equal(dancers.size,2);
  assert.deepEqual(announced,['1']);
  assert.deepEqual(focused,['1']);
  vm.runInContext('model = false',ctx);
  vm.runInContext("receive({type:'join',userId:'3',id:'entry-3',name:'Дана'})",ctx);
  assert.equal(ctx.pending.length,1, 'entry waits for avatar loading');
  vm.runInContext('model = true; receive(pending.shift())',ctx);
  assert.equal(dancers.get('3').name,'Дана');
  assert.deepEqual(focused,['1','3']);
});


test('chat displays a text bubble above its viewer, replaces it and cleans up', () => {
  const source = readFileSync('club.js','utf8');
  const speechCode = source.slice(source.indexOf('const CHAT_MS'), source.indexOf('const clothes'));
  const bubbles = [], dancers = new Map();
  const ctx = vm.createContext({model:true, MAX_DANCERS:10, dancers,
    serverNow:()=>1000,
    guestLayer:{append:element=>bubbles.push(element)},
    document:{createElement:()=>({style:{},remove(){this.removed=true;}})},
    addDancer:event=>{const dancer={name:event.name,until:61000};dancers.set(event.userId,dancer);return dancer;}
  });
  vm.runInContext(speechCode,ctx);
  vm.runInContext("showSpeech({userId:'viewer',name:'Айша',message:'Сәлем, достар!'})",ctx);
  const dancer = dancers.get('viewer');
  assert.equal(dancer.speech.textContent,'Сәлем, достар!');
  assert.equal(dancer.speech.className,'guest-speech');
  assert.equal(bubbles.length,1);
  assert.equal(dancer.speechUntil,11000);
  vm.runInContext("showSpeech({userId:'viewer',message:'<img src=x onerror=alert(1)>'})",ctx);
  assert.equal(bubbles[0].removed,true);
  assert.equal(dancer.speech.textContent,'<img src=x onerror=alert(1)>', 'chat is plain text');
  vm.runInContext("showSpeech({userId:'viewer',message:'old',at:-10000})",ctx);
  assert.equal(bubbles.length,2,'expired messages do not replace current chat');
  vm.runInContext("clearSpeech(dancers.get('viewer'))",ctx);
  assert.equal(bubbles[1].removed,true);
  assert.equal(dancer.speech,null);
});


test('arrivals preserve speaking viewers on a full stage', () => {
  const source = readFileSync('club.js','utf8');
  const code = source.slice(source.indexOf('function evictionCandidate('), source.indexOf('function addDancer('));
  const dancers = new Map([['speaker',{speechUntil:11000}],['quiet',{}],['partner',{}]]);
  const ctx = vm.createContext({dancers,duet:{ids:['partner']},duetTickets:new Map()});
  vm.runInContext(code,ctx);
  assert.equal(vm.runInContext("evictionCandidate({type:'join'},1000)",ctx),'quiet');
  dancers.get('quiet').speechUntil=11000;
  assert.equal(vm.runInContext("evictionCandidate({type:'join'},1000)",ctx),undefined,'entry waits when all available viewers are speaking');
  assert.equal(vm.runInContext("evictionCandidate({type:'chat'},1000)",ctx),'speaker','new chat can still appear when stage is full');
  assert.equal(vm.runInContext("evictionCandidate({type:'join'},12000)",ctx),'speaker','expired speech releases the slot');
});
