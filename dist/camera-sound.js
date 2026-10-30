/* Small synthesized camera sounds. No external audio requests. Motor lifetime
   is controlled by feed start/settle, not a guessed recording length. */
(()=>{
'use strict';
let context=null,master=null,motor=null;
function ready(){
  try{if(!context){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return null;context=new Audio();master=context.createGain();master.gain.value=.6;master.connect(context.destination);}context.resume().catch(()=>{});return context;}catch{return null;}
}
function noise(ctx,seconds){const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*seconds),ctx.sampleRate),data=buffer.getChannelData(0);let prev=0;for(let i=0;i<data.length;i++){prev=prev*.8+(Math.random()*2-1)*.2;data[i]=prev;}return buffer;}
function flash(){
  const ctx=ready();if(!ctx)return;
  const now=ctx.currentTime,click=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
  click.buffer=noise(ctx,.16);filter.type='highpass';filter.frequency.value=1400;gain.gain.setValueAtTime(.18,now);gain.gain.exponentialRampToValueAtTime(.0001,now+.15);click.connect(filter).connect(gain).connect(master);click.onended=()=>{click.disconnect();filter.disconnect();gain.disconnect();};click.start(now);
  const spark=ctx.createOscillator(),level=ctx.createGain();spark.type='sine';spark.frequency.setValueAtTime(2200,now);spark.frequency.exponentialRampToValueAtTime(420,now+.1);level.gain.setValueAtTime(.035,now);level.gain.exponentialRampToValueAtTime(.0001,now+.13);spark.connect(level).connect(master);spark.onended=()=>{spark.disconnect();level.disconnect();};spark.start(now);spark.stop(now+.15);
}
function stopFeed(){
  if(!motor||!context)return;const old=motor;motor=null;const now=context.currentTime;old.gain.gain.cancelScheduledValues(now);old.gain.gain.setValueAtTime(old.gain.gain.value,now);old.gain.gain.linearRampToValueAtTime(0,now+.04);
  for(const source of old.sources){source.onended??=()=>source.disconnect();try{source.stop(now+.045);}catch{}}
}
function startFeed(speed=.6){
  stopFeed();const ctx=ready();if(!ctx)return;const now=ctx.currentTime,gain=ctx.createGain(),roll=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gear=ctx.createOscillator();
  roll.buffer=noise(ctx,1);roll.loop=true;roll.playbackRate.value=speed;filter.type='lowpass';filter.frequency.value=950;gear.type='triangle';gear.frequency.value=150*speed;
  const gearGain=ctx.createGain();gearGain.gain.value=.12;gear.connect(gearGain).connect(gain);roll.connect(filter).connect(gain);gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.13,now+.06);gain.connect(master);roll.start(now);gear.start(now);
  motor={sources:[roll,gear],gain};roll.onended=()=>{roll.disconnect();filter.disconnect();gain.disconnect();gearGain.disconnect();};
}
window.CameraSound={unlock:ready,flash,startFeed,stopFeed,suspendFeed:stopFeed};
window.addEventListener('pagehide',()=>{stopFeed();context?.close().catch(()=>{});context=null;master=null;});
})();
