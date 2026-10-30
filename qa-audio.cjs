// Web Audio graph/lifecycle checks. Does not claim loudspeaker listening QA.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const contexts=[],events={};
class Param{constructor(value=0){this.value=value;this.events=[];}setValueAtTime(v,t){this.value=v;this.events.push(['set',v,t]);}linearRampToValueAtTime(v,t){this.value=v;this.events.push(['linear',v,t]);}exponentialRampToValueAtTime(v,t){this.value=v;this.events.push(['exp',v,t]);}cancelScheduledValues(t){this.events.push(['cancel',t]);}}
class Node{constructor(kind){this.kind=kind;this.frequency=new Param();this.gain=new Param(1);this.playbackRate=new Param(1);this.stopped=null;}connect(n){this.next=n;return n;}disconnect(){this.disconnected=true;}start(t){this.started=t;}stop(t){this.stopped=t;}}
class Audio{constructor(){this.sampleRate=48000;this.currentTime=12;this.destination=new Node('output');this.nodes=[];contexts.push(this);}node(k){const n=new Node(k);this.nodes.push(n);return n;}createGain(){return this.node('gain');}createBufferSource(){return this.node('source');}createOscillator(){return this.node('oscillator');}createBiquadFilter(){return this.node('filter');}createBuffer(c,n){const d=new Float32Array(n);return{getChannelData:()=>d};}resume(){this.running=true;return Promise.resolve();}close(){this.closed=true;return Promise.resolve();}}
const sandbox={window:null,Math,Float32Array,AudioContext:Audio,addEventListener(k,f){events[k]=f;}};sandbox.window=sandbox;
vm.runInNewContext(fs.readFileSync('dist/camera-sound.js','utf8'),sandbox);
sandbox.CameraSound.unlock();const ctx=contexts[0];assert.ok(ctx.running);
sandbox.CameraSound.flash();const spark=ctx.nodes.find(n=>n.kind==='oscillator');assert.equal(spark.started,12);assert.equal(spark.stopped,12.15);
const transient=ctx.nodes.find(n=>n.kind==='source');assert.ok(transient.buffer.getChannelData(0).some(x=>x!==0));assert.ok(transient.buffer.getChannelData(0).every(Number.isFinite));
sandbox.CameraSound.startFeed(.6);const roll=ctx.nodes.filter(n=>n.kind==='source').at(-1),gear=ctx.nodes.filter(n=>n.kind==='oscillator').at(-1);assert.equal(roll.loop,true);assert.equal(roll.playbackRate.value,.6);assert.equal(gear.frequency.value,90);assert.equal(roll.stopped,null);
ctx.currentTime=112;assert.equal(roll.stopped,null,'feed is not cut short by a fixed recording length');sandbox.CameraSound.stopFeed();assert.equal(roll.stopped,112.045);assert.equal(gear.stopped,112.045);roll.onended();assert.ok(roll.disconnected);
sandbox.CameraSound.startFeed(.6);const oldRoll=ctx.nodes.filter(n=>n.kind==='source').at(-1);sandbox.CameraSound.startFeed(.6);assert.notEqual(oldRoll.stopped,null,'restarting feed cleans up old audio');events.pagehide();assert.ok(ctx.closed);
const noAudio={window:null,addEventListener(){}};noAudio.window=noAudio;vm.runInNewContext(fs.readFileSync('dist/camera-sound.js','utf8'),noAudio);assert.doesNotThrow(()=>{noAudio.CameraSound.flash();noAudio.CameraSound.startFeed();noAudio.CameraSound.stopFeed();});
console.log(JSON.stringify({passed:true,flashGraph:true,feedLoopsUntilSettle:true,speed:.6,cleanup:true,unsupportedAudioFallback:true,listeningQA:false}));
