/* The opener is a slow critically damped reveal. The camera panel is gentle;
   shutter flash is a fast critically damped decay. All stage changes follow
   input, actual media events, or spring settlement, never animation timers. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),root=$('experience'),opening=$('opening'),room=$('capture-room'),device=$('capture-device'),video=$('capture-video'),still=$('capture-still'),shutter=$('capture-shutter'),api=window.KeepsakeWorkbench;
const memories=window.MEMORIES;let phase='opening',opener=null,mediaToken=0,activeMedia=null,keyboardEntry=false;
const clamp=n=>Math.max(0,Math.min(1,n));
const stop=b=>{b.interrupt();Feel.loop.remove(b);};
const set=(b,x)=>{stop(b);b.x=x;b.v=0;b.target=x;b.onFrame?.(b);};
const alpha=new Feel.Body({mass:1,freq:.16,zeta:1,x:0,target:0,restX:.003,restV:.0015,onFrame:b=>{$('opening-six').style.opacity=clamp(b.x);$('opening-strip').style.opacity=clamp(b.x)*.075;}});
// Half the original frequency and velocity threshold: exactly twice the reveal time.
function paintEntrance(b){const p=clamp(b.x);opening.style.transform=`translateY(${-p*innerHeight}px)`;root.style.transform=`translateY(${(1-p)*innerHeight}px)`;}
function entered(){if(phase!=='entering')return;opening.hidden=true;root.style.transform='';root.inert=false;document.body.style.overflow='';phase='workbench';window.dispatchEvent(new Event('resize'));if(keyboardEntry)($('camera').disabled?$('ending-surprise'):$('camera')).focus({preventScroll:true});}
const entrance=new Feel.Body({mass:1,freq:.9,zeta:1,x:0,target:0,restX:.001,restV:.002,onFrame:paintEntrance,onSettle:entered});
const arrow=new Feel.Body({mass:1,freq:.7,zeta:1,x:0,target:0,restX:.015,restV:.02,onFrame:b=>{$('enter-keepsake').style.opacity=clamp(alpha.x)*(.22+clamp(b.x)*.6);},onSettle:()=>{if(phase==='opening'&&!Feel.reducedMotion&&!document.hidden)arrow.to(arrow.target===1?0:1);}});
const reveal=new Feel.Body({feel:'gentle',x:0,target:0,restX:.002,restV:.004,onFrame:b=>{device.style.opacity=clamp(b.x);device.style.transform=`translateY(${(1-b.x)*14}px) scale(${.975+.025*b.x})`;}});
const copyReveal=new Feel.Body({mass:1,freq:.36,zeta:1,x:0,target:0,restX:.003,restV:.003,onFrame:b=>{$('capture-copy-text').style.opacity=clamp(b.x);$('capture-copy-text').style.transform=`translateY(${(1-b.x)*10}px)`;}});
const flash=new Feel.Body({mass:1,freq:1.6,zeta:1,x:0,target:0,restX:.008,restV:.0064,onFrame:b=>{$('capture-flash').style.opacity=clamp(b.x);shutter.style.transform=`scale(${1-clamp(b.x)*.045})`;},onSettle:()=>{if(phase==='flashing')completeCapture();}});
const printHost=$('opening-prints');
for(let pass=0;pass<2;pass++)for(let i=0;i<20;i++){
  const frame=document.createElement('div');frame.className='opening-print';frame.style.setProperty('--tilt',`${[-7,4,-3,6,-5][i%5]}deg`);
  const img=new Image();img.src=memories[i].image;img.alt='';img.decoding='async';const date=document.createElement('span');date.className='opening-date';date.append(window.createPhotoDate(i));frame.append(img,date);printHost.append(frame);
}
// A constant pull balances viscous damping at 13 px/s. Position wraps only at
// the boundary between identical strips; no duplicated content is announced.
const drift=new Feel.Body({mass:1,stiffness:1,damping:3,x:0,v:13,target:null,forces:[Feel.gravity(39)],restV:.01,onFrame:b=>{const span=printHost.children[20].offsetLeft-printHost.children[0].offsetLeft;if(span)printHost.style.transform=`translateX(${-((b.x%span+span)%span)}px)`;}});
function enter(fromKeyboard=false){if(phase!=='opening')return;keyboardEntry=fromKeyboard;phase='entering';stop(alpha);stop(arrow);stop(drift);root.style.visibility='visible';root.removeAttribute('aria-hidden');set(entrance,0);if(Feel.reducedMotion){set(entrance,1);entered();}else entrance.to(1);}
// Keyboard/screen-reader activation has detail=0. Pointer/wheel/touch entry
// leaves focus alone, avoiding a programmatic focus-visible camera rectangle.
$('enter-keepsake').addEventListener('click',event=>enter(event.detail===0));
let wheelTravel=0,touchStart=null;
opening.addEventListener('wheel',e=>{if(phase!=='opening'&&phase!=='entering')return;e.preventDefault();if(phase!=='opening')return;const scale=e.deltaMode===1?16:e.deltaMode===2?innerHeight:1;wheelTravel=Math.max(0,wheelTravel+e.deltaY*scale);if(wheelTravel>=60)enter();},{passive:false});
opening.addEventListener('touchstart',e=>{touchStart=e.touches[0]?.clientY;},{passive:true});
opening.addEventListener('touchmove',e=>{if(phase!=='opening'||touchStart==null)return;if(touchStart-e.touches[0].clientY>45){e.preventDefault();enter();}},{passive:false});
root.inert=true;root.setAttribute('aria-hidden','true');root.style.visibility='hidden';
document.body.style.overflow='hidden';
if(Feel.reducedMotion){set(alpha,1);set(arrow,1);}else {alpha.to(1);arrow.to(1);Feel.loop.add(drift);}

function unloadMedia(){mediaToken++;video.pause();video.removeAttribute('src');video.load();video.hidden=true;still.hidden=true;video.muted=false;video.volume=.65;}
function ready(token){if(token!==mediaToken||phase!=='framing')return;$('capture-loading').hidden=true;shutter.disabled=false;}
function fallback(token,index){if(token!==mediaToken||phase!=='framing')return;video.pause();video.hidden=true;still.hidden=false;still.src=activeMedia?.poster||memories[index].image;still.onload=()=>ready(token);still.onerror=()=>{if(token!==mediaToken)return;shutter.disabled=false;$('capture-loading').textContent='取景画面未能加载，仍可拍出这张回忆。';};}
window.openCameraOperation=function(){
  if(phase!=='workbench'||!api.beginFraming())return;
  phase='framing';opener=document.activeElement;window.CameraSound?.unlock();const index=api.nextIndex;unloadMedia();const token=mediaToken;
  activeMedia=window.CAPTURE_MEDIA[index];room.hidden=false;root.inert=true;shutter.disabled=true;
  $('capture-loading').hidden=false;$('capture-loading').textContent='正在装入这段回忆';$('capture-index').textContent=`第 ${index+1} 张 / ${memories.length} 张`;$('capture-counter').textContent=String(index+1).padStart(2,'0');
  $('capture-note').textContent='';
  $('capture-copy-text').textContent=window.CAPTURE_COPY[index]||'';
  set(flash,0);set(reveal,0);set(copyReveal,0);if(Feel.reducedMotion){set(reveal,1);set(copyReveal,1);}else {reveal.to(1);copyReveal.to(1);}
  if(activeMedia?.kind==='video'){
    video.hidden=false;video.poster=activeMedia.poster;video.onloadeddata=()=>{ready(token);};video.onerror=()=>fallback(token,index);video.src=activeMedia.src;video.load();
    video.play().catch(()=>{if(token===mediaToken&&phase==='framing'){$('capture-note').textContent='视频未能自动播放，可直接拍摄这一刻。';}});
  }else fallback(token,index);
  room.focus({preventScroll:true});
};
function closeOperation(){if(phase!=='framing')return;phase='workbench';unloadMedia();stop(reveal);stop(copyReveal);room.hidden=true;root.inert=false;api.cancelFraming();(opener?.isConnected?opener:$('camera')).focus({preventScroll:true});}
function completeCapture(){if(phase!=='flashing')return;phase='workbench';unloadMedia();room.hidden=true;root.inert=false;stop(reveal);stop(copyReveal);$('capture-close').disabled=false;api.capture();}
function capture(){if(phase!=='framing'||shutter.disabled)return;phase='flashing';shutter.disabled=true;$('capture-close').disabled=true;video.pause();window.CameraSound?.flash();if(Feel.reducedMotion){completeCapture();return;}set(flash,1);flash.to(0);}
$('capture-close').addEventListener('click',closeOperation);shutter.addEventListener('click',capture);
document.addEventListener('keydown',e=>{
  if(room.hidden)return;
  if(e.key==='Escape'){e.preventDefault();closeOperation();}
  if((e.key===' '||e.key==='Enter')&&e.target===room){e.preventDefault();capture();}
  if(e.key==='Tab'){const controls=[...room.querySelectorAll('button')].filter(b=>!b.disabled&&!b.hidden);if(!controls.length){e.preventDefault();return;}const first=controls[0],last=controls.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===room)){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===room)){e.preventDefault();first.focus();}}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){video.pause();stop(drift);stop(arrow);}else {if(phase==='opening'&&!Feel.reducedMotion){Feel.loop.add(drift);arrow.to(1);}if(phase==='framing'&&activeMedia?.kind==='video')video.play().catch(()=>{});}});
window.addEventListener('pagehide',()=>{unloadMedia();for(const b of [alpha,entrance,arrow,reveal,copyReveal,flash,drift])stop(b);});
})();
