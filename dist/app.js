/* Photographic workbench. Feed uses a slow, critically damped .48 Hz model;
   paper flight is light/gentle, camera is gentle, flip is smooth. Browser
   keyframes are baked from exact physical trajectories by Feel.handoff.
   Their lengths are computed from settling, not arbitrary animation times. */
(() => {
'use strict';
const $=id=>document.getElementById(id),memories=window.MEMORIES,total=memories.length;
const root=$('experience'),camera=$('camera'),scene=$('camera-scene'),viewer=$('viewer'),photo=$('photo'),turn=$('photo-turn'),actions=$('photo-actions');
const STORAGE_KEY='six-years-demo-v1';
const state={mode:'idle',count:0,active:-1,flipped:false,origin:'line',sound:false};
let focusReturn=camera,audio,motor,flight=null,flightBody=null,flightScale=null,flightPose=null,baseWidth=270,projectionDistance=1100;
const pad=n=>String(n).padStart(2,'0');
try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));if(saved?.version===1&&Number.isInteger(saved.count)&&saved.count>=0&&saved.count<=total)state.count=saved.count;}catch{}
const line=createMemoryLine({memories,onOpen:(index,source)=>{if(state.mode==='idle')openMemory(index,source,'line');}});
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({version:1,count:state.count}));}catch{}}
function mode(value){state.mode=value;root.dataset.state=value;const busy=value!=='idle';camera.disabled=busy||state.count===total;$('shoot').disabled=camera.disabled;line.setBusy(busy);camera.setAttribute('aria-label',`按下快门，拍出第 ${Math.min(state.count+1,total)} 张照片`);}
function say(text){$('status').textContent=text;}
function controls(){
  const done=state.count===total;const ending=done&&state.mode==='idle';$('pile').hidden=state.count===0||ending;$('pile-count').textContent=`${state.count} / ${total}`;
  $('pile').setAttribute('aria-label',`查看已经显影的 ${state.count} 张照片`);$('ending').hidden=!ending;$('intro').hidden=ending;scene.parentElement.hidden=ending;
  $('shoot').innerHTML=state.count?'拍下一张 <span aria-hidden="true">↗</span>':'按下快门 <span aria-hidden="true">↗</span>';
}
function resetBody(body,value){body.interrupt();Feel.loop.remove(body);body.x=value;body.v=0;body.target=value;body.moved=false;body.onFrame?.(body);}
function cameraStyles(b){return[[scene,{transform:`translate(-50%,-50%) translateY(${b.x*scene.clientWidth*.10}px) scale(${1+b.x*.16})`}]];}
function shutterStyles(b){return[[$('camera-shell'),{transform:`translateY(${b.x*.3}px) rotate(${b.x*.035}deg)`}],[$('flash'),{opacity:String(Math.min(.65,Math.abs(b.v)/650))}]];}
function feedStyles(b){return[[$('eject-paper'),{transform:`translateY(${101*(1-Math.max(0,Math.min(1,b.x)))}%)`}]];}
function devStyles(b){const p=Math.max(0,Math.min(1,b.x));return[[$('developer'),{opacity:String(1-p)}]];}
const zoom=new Feel.Body({feel:'gentle',x:0,target:0,restX:.001,restV:.001,onFrame:b=>Feel.paint(cameraStyles(b))});
const shutter=new Feel.Body({feel:'light',x:0,target:0,restX:.005,restV:.005,onFrame:b=>Feel.paint(shutterStyles(b))});
const fade=new Feel.Body({feel:'soft',x:0,target:0,restX:.001,restV:.001,onFrame:b=>{viewer.style.background=`rgba(255,255,255,${Math.max(0,b.x)*.92})`;}});
const flip=new Feel.Body({feel:'smooth',x:0,target:0,restX:.02,restV:.02,onFrame:b=>{turn.style.transform=`rotateY(${b.x}deg)`;}});
const developer=new Feel.Body({mass:1,freq:.42,zeta:1,x:0,target:0,restX:.008,restV:.015,onFrame:b=>Feel.paint(devStyles(b)),onSettle:()=>{if(state.mode==='developing')hangPhoto();}});
const feed=new Feel.Body({mass:1,freq:.48,zeta:1,x:0,target:0,restX:.008,restV:.015,onFrame:b=>Feel.paint(feedStyles(b)),onSettle:()=>{if(state.mode==='printing')liftPhoto();}});
Feel.handoff(zoom,cameraStyles);Feel.handoff(shutter,shutterStyles);Feel.handoff(feed,feedStyles);Feel.handoff(developer,devStyles);
Feel.handoff(fade,b=>[[viewer,{background:`rgba(255,255,255,${Math.max(0,b.x)*.92})`}]]);Feel.handoff(flip,b=>[[turn,{transform:`rotateY(${b.x}deg)`}]]);
function calibrate(){const r=KeepsakeGeometry.slotLayout(scene.clientWidth);const el=$('eject-window');Object.assign(el.style,{left:`${r.x}px`,top:`${r.y}px`,width:`${r.width}px`,height:`${r.height}px`});line.resize();}
function photoSize(){const height=Math.max(170,innerHeight-230);const w=Math.min(285,innerWidth-90,height*54/86);return{w,h:w*86/54};}
function centerRect(){const s=photoSize();return{x:(innerWidth-s.w)/2,y:Math.max(48,(innerHeight-s.h)/2-35),w:s.w};}
function stopFlight(){for(const body of [flightBody,flightScale,flightPose]){if(body){body.onSettle=null;body.interrupt();Feel.loop.remove(body);}}flightBody=flightScale=flightPose=null;}
function flightTransform(x,y,s,p){const cx=baseWidth/2,cy=baseWidth*86/54;return`translate3d(${x}px,${y}px,0) scale(${s}) translate(${cx}px,${cy}px) perspective(${projectionDistance}px) rotateZ(${-p*.35}deg) rotateX(${p*9}deg) translate(${-cx}px,${-cy}px)`;}
function fly(from,to,done){
  stopFlight();baseWidth=photoSize().w;photo.style.width=`${baseWidth}px`;photo.style.height=`${baseWidth*86/54}px`;
  projectionDistance=from.pose?1100*baseWidth/parseFloat($('eject-window').style.width):1100;
  flight={x:from.x,y:from.y,s:from.w/baseWidth,p:from.pose||0};
  const paint=()=>{photo.style.transform=flightTransform(flight.x,flight.y,flight.s,flight.p);};
  if(Feel.reducedMotion||(Math.hypot(to.x-from.x,to.y-from.y)<.25&&Math.abs(to.w-from.w)<.2)){
    flight={x:to.x,y:to.y,s:to.w/baseWidth,p:0};paint();queueMicrotask(()=>done?.());return;
  }
  // One baked scalar body carries the whole transform, so the browser never
  // has competing position/scale animations writing the same property.
  const start={...flight};const progress=new Feel.Body({feel:'light, gentle',x:0,target:0,restX:.001,restV:.002});
  flightBody=progress;
  const transformAt=b=>{const p=b.x;const x=start.x+(to.x-start.x)*p,y=start.y+(to.y-start.y)*p,s=start.s+(to.w/baseWidth-start.s)*p,pose=start.p*(1-p);return[[photo,{transform:flightTransform(x,y,s,pose)}]];};
  progress.onFrame=b=>{Feel.paint(transformAt(b));};progress.onSettle=()=>done?.();Feel.handoff(progress,transformAt);paint();progress.to(1);
}
function preparePhoto(index){
  const m=memories[index];state.active=index;state.flipped=false;resetBody(flip,0);resetBody(developer,0);
  $('photo-title').textContent=m.title;$('photo-number').textContent=pad(index+1);$('back-number').textContent=`${index+1} / ${total}`;$('back-title').textContent=m.title;$('back-text').textContent=m.text;
  $('photo-image').src=m.image;$('photo-image').alt=m.alt;photo.setAttribute('aria-pressed','false');photo.setAttribute('aria-label',`第 ${index+1} 张，${m.title}，翻到背面`);
  photo.querySelector('.photo-front').setAttribute('aria-hidden','false');photo.querySelector('.photo-back').setAttribute('aria-hidden','true');$('flip').textContent='翻到背面';$('flip-hint').textContent='点一下照片，看看背面。';
}
function backgroundInert(on){for(const id of ['workbench','heading','clothesline','footer','album'])$(id).inert=on;}
async function shoot(){
  if(state.mode!=='idle'||state.count>=total)return;focusReturn=document.activeElement;mode('loading');say('相纸准备中');
  try{const image=new Image();image.src=memories[state.count].image;await image.decode();}catch{mode('idle');say('这张相纸还没准备好，点相机再试一次。');return;}
  preparePhoto(state.count);calibrate();actions.hidden=true;photo.disabled=true;mode('printing');controls();resetBody(feed,0);zoom.to(1);shutter.kick(200);startSound();say(`第 ${state.active+1} 张，正在出片。`);
  if(Feel.reducedMotion){resetBody(feed,1);queueMicrotask(liftPhoto);}else feed.to(1);
}
function liftPhoto(){
  const rect=$('eject-window').getBoundingClientRect();stopMotor();viewer.hidden=false;mode('developing');say('等一会儿，照片正在慢慢显影。');
  fly({x:rect.x,y:rect.y,w:rect.width,pose:1},centerRect(),()=>{});resetBody(feed,0);fade.to(1);backgroundInert(true);viewer.focus({preventScroll:true});
  if(Feel.reducedMotion){resetBody(developer,1);queueMicrotask(hangPhoto);}else developer.to(1);
}
function hangPhoto(){
  if(state.mode!=='developing')return;resetBody(developer,1);mode('hanging');say('把这一张，挂到回忆里。');
  const index=state.count;line.sync(index+1);line.pending(index,true);line.reveal(index);const dest=line.rect(index),from=photo.getBoundingClientRect();
  fade.to(0);backgroundInert(false);line.setBusy(true);
  fly({x:from.x,y:from.y,w:from.width},{x:dest.x,y:dest.y,w:dest.width},()=>{
    line.pending(index,false);line.swing(index,11);state.count=index+1;save();viewer.hidden=true;resetBody(fade,0);zoom.to(0);mode('idle');controls();say(`第 ${state.count} 张已经挂好。`);
    if(state.count===total)$('ending-album').focus({preventScroll:true});else camera.focus({preventScroll:true});
  });
}
function showActions(){actions.hidden=false;$('collect').textContent=state.origin==='album'?'放回相册':'挂回晾绳';$('previous').hidden=state.active===0;$('next').hidden=state.active>=state.count-1;}
function openMemory(index,source,origin=state.origin){
  stopFlight();focusReturn=source||focusReturn;state.origin=origin;preparePhoto(index);resetBody(developer,1);resetBody(fade,1);viewer.hidden=false;photo.disabled=false;mode('viewing');showActions();
  const r=centerRect();baseWidth=r.w;photo.style.width=`${r.w}px`;photo.style.height=`${r.w*86/54}px`;photo.style.transform=flightTransform(r.x,r.y,1,0);backgroundInert(true);photo.focus({preventScroll:true});
}
function flipPhoto(){
  if(state.mode!=='viewing')return;state.flipped=!state.flipped;flip.to(state.flipped?180:0);photo.setAttribute('aria-pressed',String(state.flipped));photo.setAttribute('aria-label',state.flipped?'翻回照片正面':'翻到照片背面');
  photo.querySelector('.photo-front').setAttribute('aria-hidden',String(state.flipped));photo.querySelector('.photo-back').setAttribute('aria-hidden',String(!state.flipped));$('flip').textContent=state.flipped?'翻回正面':'翻到背面';$('flip-hint').textContent=state.flipped?'有些话，写在照片背面。':'点一下照片，看看背面。';
}
function closeViewer(){
  if(state.mode!=='viewing')return;actions.hidden=true;backgroundInert(false);
  if(state.origin==='album'){viewer.hidden=true;resetBody(fade,0);mode('album');$('album').inert=false;(focusReturn?.isConnected?focusReturn:$('close-album')).focus({preventScroll:true});return;}
  mode('returning');photo.disabled=true;flip.to(0);line.reveal(state.active);line.pending(state.active,true);const to=line.rect(state.active),from=photo.getBoundingClientRect();fade.to(0);
  fly({x:from.x,y:from.y,w:from.width},{x:to.x,y:to.y,w:to.width},()=>{line.pending(state.active,false);viewer.hidden=true;resetBody(fade,0);mode('idle');controls();line.card(state.active)?.focus({preventScroll:true});});
}
function navigate(delta){if(state.mode!=='viewing')return;const index=state.active+delta;if(index>=0&&index<state.count)openMemory(index);}
function openAlbum(){
  if(state.mode!=='idle'||!state.count)return;focusReturn=document.activeElement;mode('album');$('album-grid').replaceChildren();
  memories.slice(0,state.count).forEach((m,i)=>{
    const b=document.createElement('button');b.className='album-card';b.style.setProperty('--angle',`${[-2,1.5,1,-1.5][i%4]}deg`);b.setAttribute('aria-label',`查看第 ${i+1} 张，${m.title}`);
    const img=new Image();img.src=m.image;img.alt=m.alt;img.loading='lazy';const caption=document.createElement('span');caption.className='album-caption';const label=document.createElement('span');label.textContent=m.title;const n=document.createElement('small');n.textContent=pad(i+1);caption.append(label,n);b.append(img,caption);b.addEventListener('click',()=>openMemory(i,b,'album'));$('album-grid').append(b);
  });
  $('album-summary').textContent=`${state.count} 张已经显影，共 ${total} 张。`;$('album').hidden=false;$('workbench').inert=true;$('clothesline').inert=true;$('heading').inert=true;$('footer').inert=true;$('close-album').focus({preventScroll:true});
}
function closeAlbum(){if(state.mode!=='album')return;$('album').hidden=true;backgroundInert(false);mode('idle');controls();(focusReturn?.isConnected?focusReturn:camera).focus({preventScroll:true});}
function startSound(){
  if(!state.sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});const t=audio.currentTime,n=audio.createBuffer(1,audio.sampleRate*.065,audio.sampleRate),d=n.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);const s=audio.createBufferSource(),g=audio.createGain();g.gain.value=.055;s.buffer=n;s.connect(g).connect(audio.destination);s.start(t);const o=audio.createOscillator(),gain=audio.createGain();o.type='triangle';o.frequency.value=105;gain.gain.value=.01;o.connect(gain).connect(audio.destination);o.start(t);motor={o,gain};}catch{}
}
function stopMotor(){if(motor){try{motor.o.stop();motor.o.disconnect();motor.gain.disconnect();}catch{}motor=null;}}
$('sound').addEventListener('click',()=>{state.sound=!state.sound;$('sound').setAttribute('aria-pressed',String(state.sound));$('sound').textContent=state.sound?'声音开':'声音关';if(!state.sound)stopMotor();});
camera.addEventListener('click',shoot);$('shoot').addEventListener('click',shoot);photo.addEventListener('click',flipPhoto);$('flip').addEventListener('click',flipPhoto);$('collect').addEventListener('click',closeViewer);$('pile').addEventListener('click',openAlbum);$('ending-album').addEventListener('click',openAlbum);$('close-album').addEventListener('click',closeAlbum);$('previous').addEventListener('click',()=>navigate(-1));$('next').addEventListener('click',()=>navigate(1));
$('restart').addEventListener('click',()=>{if(state.mode==='idle')$('reset-dialog').showModal();});
$('reset-dialog').addEventListener('close',()=>{if($('reset-dialog').returnValue==='reset'){state.count=0;save();line.sync(0);mode('idle');controls();say('');camera.focus({preventScroll:true});}});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){if(state.mode==='viewing'){e.preventDefault();closeViewer();}else if(state.mode==='album')closeAlbum();}
  if(e.key==='ArrowLeft')navigate(-1);if(e.key==='ArrowRight')navigate(1);
  const modal=!viewer.hidden?viewer:!$('album').hidden?$('album'):null;
  if(modal&&e.key==='Tab'){const buttons=[...modal.querySelectorAll('button:not(:disabled)')].filter(el=>el.getClientRects().length&&!el.closest('[hidden]'));if(!buttons.length){e.preventDefault();modal.focus();return;}const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&(document.activeElement===first||!modal.contains(document.activeElement))){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||!modal.contains(document.activeElement))){e.preventDefault();first.focus();}}
});
window.addEventListener('resize',()=>{calibrate();if(state.mode==='viewing'){const r=centerRect();stopFlight();photo.style.width=`${r.w}px`;photo.style.height=`${r.w*86/54}px`;photo.style.transform=flightTransform(r.x,r.y,1,0);}else if(state.mode==='idle')Feel.paint(cameraStyles(zoom));});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMotor();});
$('camera-image').addEventListener('error',()=>say('相机图片加载失败，请刷新重试。'));
document.querySelector('.demo-label').textContent=`${total} 张演示相纸，等着换成我们的照片。`;
line.sync(state.count);if(state.count)line.reveal(state.count-1);calibrate();mode('idle');controls();Feel.paint(cameraStyles(zoom));
})();
