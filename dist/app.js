/* Photographic workbench. Feed uses a critically damped .48 Hz base at .6x.
   paper flight is light/gentle, camera is gentle, flip is smooth. Browser
   keyframes are baked from exact physical trajectories by Feel.handoff.
   Their lengths are computed from settling, not arbitrary animation times. */
(() => {
'use strict';
const $=id=>document.getElementById(id),memories=window.MEMORIES,total=memories.length,regularCount=Math.min(20,total-1);
const root=$('experience'),camera=$('camera'),scene=$('camera-scene'),viewer=$('viewer'),photo=$('photo'),turn=$('photo-turn'),actions=$('photo-actions');
const STORAGE_KEY='six-years-personal-v1';
const state={mode:'idle',count:0,active:-1,flipped:false,origin:'line',previewFlashed:false};
let focusReturn=camera,flight=null,flightBody=null,flightScale=null,flightPose=null,baseWidth=270,projectionDistance=1100;
const printSpeed=.6;
let photoReady=false,developmentReady=false;
let framing={x:0,y:0,scale:1};
const pad=n=>String(n).padStart(2,'0');
try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));if(saved?.version===1&&Number.isInteger(saved.count)&&saved.count>=0&&saved.count<=total){state.count=Math.min(saved.count,regularCount);if(saved.count>regularCount)save();}}catch{}
const line=createMemoryLine({memories,onOpen:(index,source)=>{if(state.mode==='idle')openMemory(index,source,'line');}});
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({version:1,count:state.count}));}catch{}}
function mode(value){state.mode=value;root.dataset.state=value;const busy=value!=='idle';camera.disabled=busy||state.count>=regularCount;$('shoot').disabled=camera.disabled;line.setBusy(busy);camera.setAttribute('aria-label',`按下快门，拍出第 ${Math.min(state.count+1,regularCount)} 张照片`);}
function say(text){$('status').textContent=text;}
function controls(){
  const done=state.count>=regularCount;const ending=done&&state.mode==='idle';$('pile').hidden=state.count===0||ending;$('pile-count').textContent=`${state.count} / ${regularCount}`;
  $('pile').setAttribute('aria-label',`查看已经显影的 ${state.count} 张照片`);$('ending').hidden=!ending;$('intro').hidden=ending;scene.parentElement.hidden=ending;
  $('shoot').innerHTML=state.count?'拍下一张 <span aria-hidden="true">↗</span>':'按下快门 <span aria-hidden="true">↗</span>';
}
function resetBody(body,value){body.interrupt();Feel.loop.remove(body);body.x=value;body.v=0;body.target=value;body.moved=false;body.onFrame?.(body);}
function cameraStyles(b){return[[scene,{transform:`translate(-50%,-50%) translate(${b.x*framing.x}px,${b.x*framing.y}px) scale(${1+b.x*(framing.scale-1)})`}]];}
function shutterStyles(b){return[[$('camera-shell'),{transform:`translateY(${b.x*.3}px) rotate(${b.x*.035}deg)`}],[$('flash'),{opacity:String(state.previewFlashed?0:Math.min(.65,Math.abs(b.v)/650))}]];}
function feedStyles(b){return[[$('eject-paper'),{transform:`translateY(${101*(1-Math.max(0,Math.min(1,b.x)))}%)`}]];}
function devStyles(b){const p=Math.max(0,Math.min(1,b.x)),opacity=String(1-p);return[[$('developer'),{opacity}],[$('eject-developer'),{opacity}]];}
const zoom=new Feel.Body({feel:'gentle',x:0,target:0,restX:.001,restV:.001,onFrame:b=>Feel.paint(cameraStyles(b))});
const shutter=new Feel.Body({feel:'light',x:0,target:0,restX:.005,restV:.005,onFrame:b=>Feel.paint(shutterStyles(b))});
const fade=new Feel.Body({feel:'soft',x:0,target:0,restX:.001,restV:.001,onFrame:b=>{viewer.style.background=`rgba(255,255,255,${Math.max(0,b.x)*.92})`;$('final-copy').style.opacity=String(Math.max(0,Math.min(1,b.x)));}});
// A softly damped angular spring turns the entire print back to landscape.
const paintTurn=()=>{turn.style.transform=`rotateZ(${angle.x}deg) rotateY(${flip.x}deg)`;};
const flip=new Feel.Body({feel:'smooth',x:0,target:0,restX:.02,restV:.02,onFrame:paintTurn});
const angle=new Feel.Body({mass:1,freq:1.1,zeta:.85,x:0,target:0,restX:.02,restV:.02,onFrame:paintTurn});
// Two unit-mass, critically damped springs start together at the same .6x
// print rate. Development (.42 Hz base) follows the slightly quicker feed
// (.48 Hz base), without overshoot or restarting opacity at the handoff.
const developer=new Feel.Body({mass:1,freq:.42*printSpeed,zeta:1,x:0,target:0,restX:.008,restV:.015*printSpeed,onFrame:b=>Feel.paint(devStyles(b)),onSettle:()=>{if(state.mode==='printing'||state.mode==='developing'){developmentReady=true;maybeReview();}}});
const feed=new Feel.Body({mass:1,freq:.48*printSpeed,zeta:1,x:0,target:0,restX:.008,restV:.015*printSpeed,onFrame:b=>Feel.paint(feedStyles(b)),onSettle:()=>{if(state.mode==='printing')liftPhoto();}});
Feel.handoff(zoom,cameraStyles);Feel.handoff(shutter,shutterStyles);Feel.handoff(feed,feedStyles);Feel.handoff(developer,devStyles);
Feel.handoff(fade,b=>[[viewer,{background:`rgba(255,255,255,${Math.max(0,b.x)*.92})`}],[$('final-copy'),{opacity:String(Math.max(0,Math.min(1,b.x)))}]]);
function calibrate(){
  const size=scene.clientWidth,r=KeepsakeGeometry.slotLayout(size),el=$('eject-window');
  Object.assign(el.style,{left:`${r.x}px`,top:`${r.y}px`,width:`${r.width}px`,height:`${r.height}px`});
  const finalWidth=photoSize().w,dateSize=Math.min(38,Math.max(9,(finalWidth*.852-2)*.14));
  $('eject-date').style.setProperty('--eject-date-font-size',`${dateSize*r.width/finalWidth}px`);
  const bay=scene.parentElement.getBoundingClientRect();
  const paperWidth=Math.min(innerWidth*.62,(innerHeight*.72-32)*54/86),scale=Math.max(1,paperWidth/r.width);
  const mouthY=innerHeight*.72;
  framing={x:innerWidth/2-(bay.x+bay.width/2)-(r.centerX-size/2)*scale,y:mouthY+(size/2-r.mouthY)*scale-(bay.y+bay.height/2),scale};
  line.resize();
}
function maybeReview(){
  if(state.mode!=='developing'||!photoReady||!developmentReady)return;
  state.origin='fresh';mode('viewing');photo.disabled=false;showActions();
  const from=photo.getBoundingClientRect();fly({x:from.x,y:from.y,w:from.width},centerRect(),()=>{});
  if(memories[state.active].landscape)angle.to(-90);say('照片已经显影，点一下可以看看背面。');$('flip').focus({preventScroll:true});
}
function photoSize(){const height=Math.max(170,innerHeight-(state.origin==='final'&&innerWidth<1200?300:210));const landscape=state.mode==='viewing'&&memories[state.active]?.landscape;const w=Math.min(380,innerWidth-64,height*54/86,landscape?(innerWidth-48)*54/86:Infinity);return{w,h:w*86/54};}
function centerRect(){const s=photoSize(),final=state.origin==='final';return{x:(final&&innerWidth>=1200?innerWidth*.65:innerWidth/2)-s.w/2,y:Math.max(final&&innerWidth<1200?180:48,(innerHeight-s.h)/2+(final&&innerWidth<1200?25:-35)),w:s.w};}
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
  const m=memories[index];state.active=index;state.flipped=false;resetBody(angle,0);resetBody(flip,0);resetBody(developer,0);
  $('photo-date').replaceChildren(window.createPhotoDate(index));
  $('eject-date').replaceChildren(window.createPhotoDate(index));
  $('back-handwriting').replaceChildren(window.createPhotoBack(index));photo.removeAttribute('aria-describedby');
  $('photo-title').textContent=m.title;$('photo-number').textContent=pad(index+1);$('back-number').textContent=`${index+1} / ${total}`;$('back-title').textContent=m.title;$('back-text').textContent=m.text;
  $('photo-image').src=m.image;$('photo-image').alt=m.alt;$('photo-image').dataset.photo=String(index+1);$('eject-image').src=m.image;$('eject-image').dataset.photo=String(index+1);photo.setAttribute('aria-pressed','false');photo.setAttribute('aria-label',`第 ${index+1} 张，${m.title}，翻到背面`);
  photo.querySelector('.photo-front').setAttribute('aria-hidden','false');photo.querySelector('.photo-back').setAttribute('aria-hidden','true');$('flip').textContent='翻到背面';$('flip-hint').textContent='点一下照片，看看背面。';
}
function backgroundInert(on){for(const id of ['workbench','heading','clothesline','footer','album'])$(id).inert=on;}
async function shoot(previewFlashed=false){
  if(state.mode!=='idle'||state.count>=regularCount)return;focusReturn=document.activeElement;mode('loading');say('相纸准备中');
  try{const image=new Image();image.src=memories[state.count].image;await image.decode();}catch{mode('idle');say('这张相纸还没准备好，点相机再试一次。');return;}
  state.previewFlashed=previewFlashed;photoReady=false;developmentReady=false;preparePhoto(state.count);calibrate();actions.hidden=true;photo.disabled=true;mode('printing');controls();resetBody(feed,0);zoom.to(1);shutter.kick(200);if(!previewFlashed)window.CameraSound?.flash();if(!Feel.reducedMotion)window.CameraSound?.startFeed(printSpeed);say(`第 ${state.active+1} 张，正在出片，照片也在慢慢显影。`);
  if(Feel.reducedMotion){resetBody(developer,1);developmentReady=true;resetBody(feed,1);queueMicrotask(liftPhoto);}else{developer.to(1);feed.to(1);}
}
function liftPhoto(){
  const rect=$('eject-window').getBoundingClientRect();window.CameraSound?.stopFeed();viewer.hidden=false;mode('developing');say('相纸已经吐出，正在拿近这张照片。');
  fly({x:rect.x,y:rect.y,w:rect.width,pose:1},centerRect(),()=>{photoReady=true;maybeReview();});resetBody(feed,0);fade.to(1);backgroundInert(true);viewer.focus({preventScroll:true});
  // The same developer body keeps running; neither image becomes blank again.
  maybeReview();
}
function hangPhoto(){
  if(state.mode!=='viewing'||state.origin!=='fresh')return;actions.hidden=true;photo.disabled=true;angle.to(0);flip.to(0);resetBody(developer,1);mode('hanging');say('把这一张，挂到回忆里。');
  const index=state.count;line.sync(index+1);line.pending(index,true);line.reveal(index);const dest=line.rect(index),from=photo.getBoundingClientRect();
  fade.to(0);backgroundInert(false);line.setBusy(true);
  fly({x:from.x,y:from.y,w:from.width},{x:dest.x,y:dest.y,w:dest.width},()=>{
    line.pending(index,false);line.swing(index,11);state.count=index+1;save();viewer.hidden=true;resetBody(fade,0);zoom.to(0);mode('idle');controls();say(`第 ${state.count} 张已经挂好。`);
    if(state.count>=regularCount)$('ending-surprise').focus({preventScroll:true});else camera.focus({preventScroll:true});
  });
}
function showActions(){const fresh=state.origin==='fresh',final=state.origin==='final';actions.hidden=false;$('collect').textContent=final?'回到结尾':fresh?'挂到晾绳':state.origin==='album'?'放回相册':'挂回晾绳';$('previous').hidden=final||fresh||state.active===0;$('next').hidden=final||fresh||state.active>=state.count-1;}
function openMemory(index,source,origin=state.origin){
  if(index<0||index>=total)return;if(origin==='final'){if(state.count<regularCount||index!==regularCount)return;}else if(index>=state.count)return;
  stopFlight();focusReturn=source||focusReturn;state.origin=origin;preparePhoto(index);resetBody(developer,1);resetBody(fade,1);viewer.hidden=false;photo.disabled=false;mode('viewing');showActions();
  const final=origin==='final';$('final-copy').hidden=!final;
  const r=centerRect();baseWidth=r.w;photo.style.width=`${r.w}px`;photo.style.height=`${r.w*86/54}px`;photo.style.transform=flightTransform(r.x,r.y,1,0);backgroundInert(true);if(final){resetBody(fade,0);fade.to(1);fly({x:r.x+r.w*.03,y:r.y+28,w:r.w*.94},r,()=>{});}if(memories[index].landscape)angle.to(-90);photo.focus({preventScroll:true});
}
function flipPhoto(){
  if(state.mode!=='viewing')return;state.flipped=!state.flipped;flip.to(state.flipped?180:0);angle.to(state.flipped?0:(memories[state.active].landscape?-90:0));photo.setAttribute('aria-pressed',String(state.flipped));photo.setAttribute('aria-label',state.flipped?'翻回照片正面':'翻到照片背面');
  photo.querySelector('.photo-front').setAttribute('aria-hidden',String(state.flipped));photo.querySelector('.photo-back').setAttribute('aria-hidden',String(!state.flipped));if(state.flipped)photo.setAttribute('aria-describedby','back-text');else photo.removeAttribute('aria-describedby');$('flip').textContent=state.flipped?'翻回正面':'翻到背面';$('flip-hint').textContent=state.flipped?'有些话，写在照片背面。':'点一下照片，看看背面。';
}
function closeViewer(){
  if(state.mode!=='viewing')return;if(state.origin==='fresh'){hangPhoto();return;}actions.hidden=true;backgroundInert(false);
  if(state.origin==='final'){$('final-copy').hidden=true;viewer.hidden=true;resetBody(fade,0);state.origin='line';mode('idle');controls();$('ending-surprise').focus({preventScroll:true});return;}
  if(state.origin==='album'){viewer.hidden=true;resetBody(fade,0);mode('album');$('album').inert=false;(focusReturn?.isConnected?focusReturn:$('close-album')).focus({preventScroll:true});return;}
  mode('returning');photo.disabled=true;resetBody(angle,0);flip.to(0);line.reveal(state.active);line.pending(state.active,true);const to=line.rect(state.active),from=photo.getBoundingClientRect();fade.to(0);
  fly({x:from.x,y:from.y,w:from.width},{x:to.x,y:to.y,w:to.width},()=>{line.pending(state.active,false);viewer.hidden=true;resetBody(fade,0);mode('idle');controls();line.card(state.active)?.focus({preventScroll:true});});
}
function navigate(delta){if(state.mode!=='viewing'||state.origin==='fresh'||state.origin==='final')return;const index=state.active+delta;if(index>=0&&index<state.count)openMemory(index);}
function openAlbum(){
  if(state.mode!=='idle'||!state.count)return;focusReturn=document.activeElement;mode('album');$('album-grid').replaceChildren();
  memories.slice(0,state.count).forEach((m,i)=>{
    const b=document.createElement('button');b.className='album-card';b.style.setProperty('--angle',`${[-2,1.5,1,-1.5][i%4]}deg`);b.setAttribute('aria-label',`查看第 ${i+1} 张，${m.title}`);
    const img=new Image();img.src=m.image;img.alt=m.alt;img.dataset.photo=String(i+1);img.loading='lazy';const caption=document.createElement('span');caption.className='album-caption';caption.append(window.createPhotoDate(i));b.append(img,caption);b.addEventListener('click',()=>openMemory(i,b,'album'));$('album-grid').append(b);
  });
  $('album-summary').textContent=`${state.count} 张已经显影，共 ${regularCount} 张。`;$('album').hidden=false;$('workbench').inert=true;$('clothesline').inert=true;$('heading').inert=true;$('footer').inert=true;$('close-album').focus({preventScroll:true});
}
function closeAlbum(){if(state.mode!=='album')return;$('album').hidden=true;backgroundInert(false);mode('idle');controls();(focusReturn?.isConnected?focusReturn:camera).focus({preventScroll:true});}
function requestShot(){if(window.openCameraOperation)window.openCameraOperation();else shoot();}
window.KeepsakeWorkbench={get nextIndex(){return state.count;},get mode(){return state.mode;},beginFraming(){if(state.mode!=='idle'||state.count>=regularCount)return false;mode('framing');return true;},cancelFraming(){if(state.mode==='framing'){mode('idle');controls();}},capture(){if(state.mode!=='framing')return;mode('idle');return shoot(true);}};
camera.addEventListener('click',requestShot);$('shoot').addEventListener('click',requestShot);photo.addEventListener('click',flipPhoto);$('flip').addEventListener('click',flipPhoto);$('collect').addEventListener('click',closeViewer);$('pile').addEventListener('click',openAlbum);$('ending-album').addEventListener('click',openAlbum);$('close-album').addEventListener('click',closeAlbum);$('previous').addEventListener('click',()=>navigate(-1));$('next').addEventListener('click',()=>navigate(1));
// Only the blank backdrop collects the print. Photo/controls keep their own
// actions; a print still travelling or developing cannot be dismissed.
viewer.addEventListener('click',event=>{if(event.target===viewer&&state.mode==='viewing')closeViewer();});
$('ending-surprise').addEventListener('click',()=>{if(state.mode==='idle'&&state.count>=regularCount)openMemory(regularCount,$('ending-surprise'),'final');});
$('restart').addEventListener('click',()=>{if(state.mode==='idle')$('reset-dialog').showModal();});
$('reset-dialog').addEventListener('close',()=>{if($('reset-dialog').returnValue==='reset'){state.count=0;save();line.sync(0);mode('idle');controls();say('');camera.focus({preventScroll:true});}});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){if(state.mode==='viewing'){e.preventDefault();closeViewer();}else if(state.mode==='album')closeAlbum();}
  if(e.key==='ArrowLeft')navigate(-1);if(e.key==='ArrowRight')navigate(1);
  const modal=!viewer.hidden?viewer:!$('album').hidden?$('album'):null;
  if(modal&&e.key==='Tab'){const buttons=[...modal.querySelectorAll('button:not(:disabled)')].filter(el=>el.getClientRects().length&&!el.closest('[hidden]'));if(!buttons.length){e.preventDefault();modal.focus();return;}const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&(document.activeElement===first||!modal.contains(document.activeElement))){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||!modal.contains(document.activeElement))){e.preventDefault();first.focus();}}
});
window.addEventListener('resize',()=>{calibrate();if(state.mode==='viewing'){const r=centerRect();stopFlight();photo.style.width=`${r.w}px`;photo.style.height=`${r.w*86/54}px`;photo.style.transform=flightTransform(r.x,r.y,1,0);}else{const target=zoom.target;zoom.interrupt();Feel.loop.remove(zoom);Feel.paint(cameraStyles(zoom));if(Math.abs(zoom.x-target)>.001)zoom.to(target);}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)window.CameraSound?.suspendFeed();else if(state.mode==='printing'&&!Feel.reducedMotion)window.CameraSound?.startFeed(printSpeed);});
window.addEventListener('pagehide',()=>window.CameraSound?.stopFeed());
$('camera-image').addEventListener('error',()=>say('相机图片加载失败，请刷新重试。'));
document.querySelector('.demo-label').textContent=`${regularCount} 张相纸，一起慢慢看。`;
line.sync(state.count);if(state.count)line.reveal(state.count-1);calibrate();mode('idle');controls();Feel.paint(cameraStyles(zoom));
})();
