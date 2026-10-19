/* Physical model: the camera uses a gentle spring (1.2 Hz, critical damping),
   film a slow critically damped roller (0.48 Hz, no reverse travel), and the
   loose photograph a light spring. Development uses a slower 0.42 Hz response.
   These frequencies make feed legible and the light paper settle softly.
   The shutter has an impulse, not a timed shake. Every visual reads a body. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const memories=window.MEMORIES;
  const total=memories.length;
  const STORAGE_KEY='six-years-demo-v1';
  const root=$('experience'), camera=$('camera'), scene=$('camera-scene');
  const viewer=$('viewer'),photo=$('photo'),turn=$('photo-turn'),actions=$('photo-actions');
  const state={mode:'idle',count:0,active:-1,flipped:false,fromAlbum:false,sound:false};
  let focusReturn=camera, audio, motor, flight=null,flightBody=null,scaleBody=null;
  let archiveStarted=false;
  const pad=n=>String(n).padStart(2,'0');
  function setMode(mode){state.mode=mode;root.dataset.state=mode;camera.disabled=mode!=='idle';camera.setAttribute('aria-label',state.count<total?`按下快门，拍出第 ${state.count+1} 张照片`:'相纸已经拍完，查看收好的回忆');}
  function say(message){$('status').textContent=message;}
  function storageSave(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({version:1,count:state.count}));}catch{/* Browsing can continue when persistent storage is unavailable. */}}
  try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));if(saved?.version===1&&Number.isInteger(saved.count)&&saved.count>=0&&saved.count<=total)state.count=saved.count;}catch{/* An invalid or blocked save starts a fresh film pack. */}
  const zoom=new Feel.Body({feel:'gentle',x:0,target:0,restX:.001,restV:.001,onFrame:paintCamera});
  const shutter=new Feel.Body({feel:'light',x:0,target:0,restX:.005,restV:.005,onFrame:paintShutter});
  const fade=new Feel.Body({feel:'soft',x:0,target:0,restX:.001,restV:.001,onFrame:b=>{viewer.style.background=`rgba(255,255,255,${Math.max(0,b.x)*.94})`;}});
  const flip=new Feel.Body({feel:'smooth',x:0,target:0,restX:.02,restV:.02,onFrame:b=>{turn.style.transform=`rotateY(${b.x}deg)`;}});
  const developer=new Feel.Body({mass:1,freq:.42,zeta:1,x:0,target:0,restX:.008,restV:.015,onFrame:b=>{
    const p=Math.max(0,Math.min(1,b.x));$('developer').style.opacity=String(1-p);$('photo-image').style.filter=`saturate(${.3+.7*p}) contrast(${.72+.28*p}) blur(${(1-p)*3}px)`;
  },onSettle:()=>{if(state.mode==='developing')ready();}});
  const feed=new Feel.Body({mass:1,freq:.48,zeta:1,x:0,target:0,restX:.008,restV:.015,onFrame:b=>{
    $('eject-paper').style.transform=`translateY(${102*(1-Math.max(0,Math.min(1,b.x)))}%)`;
  },onSettle:()=>{if(state.mode==='printing')liftPhoto();}});
  function cameraStyles(b){return [[scene,{transform:`translate(-50%,-50%) translateY(${b.x*scene.clientWidth*.32}px) scale(${1+b.x*.22})`,opacity:String(1-b.x*.25)}]];}
  function shutterStyles(b){return [[camera,{transform:`translateY(${b.x*.4}px) rotate(${b.x*.045}deg)`}],[$('flash'),{opacity:String(Math.min(.75,Math.abs(b.v)/650))}]];}
  function developmentStyles(b){const p=Math.max(0,Math.min(1,b.x));return [[$('developer'),{opacity:String(1-p)}],[$('photo-image'),{filter:`saturate(${.3+.7*p}) contrast(${.72+.28*p}) blur(${(1-p)*3}px)`}]];}
  function paintCamera(){Feel.paint(cameraStyles(zoom));}
  function paintShutter(){Feel.paint(shutterStyles(shutter));}
  // Browser keyframes are baked from the exact physical trajectory; their
  // length is computed by Feel from the model's settling time. This avoids
  // slowing the experience when a preview surface throttles animation frames.
  Feel.handoff(zoom,cameraStyles);Feel.handoff(shutter,shutterStyles);
  Feel.handoff(fade,b=>[[viewer,{background:`rgba(255,255,255,${Math.max(0,b.x)*.94})`}]]);
  Feel.handoff(flip,b=>[[turn,{transform:`rotateY(${b.x}deg)`}]]);
  Feel.handoff(developer,developmentStyles);
  Feel.handoff(feed,b=>[[$('eject-paper'),{transform:`translateY(${102*(1-Math.max(0,Math.min(1,b.x)))}%)`}]]);
  function resetBody(body,value){body.interrupt();Feel.loop.remove(body);body.x=value;body.v=0;body.target=value;body.moved=false;body.onFrame?.(body);}
  function stopFlight(){if(flightBody){flightBody.onSettle=null;flightBody.interrupt();Feel.loop.remove(flightBody);flightBody=null;}if(scaleBody){scaleBody.interrupt();Feel.loop.remove(scaleBody);scaleBody=null;}}
  function controls(){
    const began=state.count>0||state.mode!=='idle';$('heading').hidden=!began;$('footer').hidden=!began;
    $('pile').hidden=state.count===0||state.mode==='printing'||state.mode==='developing'||state.mode==='viewing'||state.mode==='storing';
    $('pile-count').textContent=`${pad(state.count)} / ${total}`;
    $('pile').setAttribute('aria-label',`查看收好的 ${state.count} 张照片`);
    $('ending').hidden=state.count!==total||state.mode!=='idle';
    camera.hidden=state.count===total&&state.mode==='idle';
    if(state.count===total&&state.mode==='idle'){$('camera-scene').style.visibility='hidden';}else{$('camera-scene').style.visibility='visible';}
  }
  function renderPile(){
    $('pile-cards').replaceChildren();
    const rotations=[-10,7,-3];
    for(let i=Math.max(0,state.count-3);i<state.count;i++){
      const span=document.createElement('span');span.className='pile-mini';span.style.transform=`rotate(${rotations[(i-Math.max(0,state.count-3))%3]}deg)`;
      const img=new Image();img.src=memories[i].image;img.alt='';span.append(img);$('pile-cards').append(span);
    }
    controls();
  }
  function preparePhoto(index){
    const m=memories[index];state.active=index;state.flipped=false;resetBody(flip,0);resetBody(developer,0);
    $('photo-title').textContent=m.title;$('photo-number').textContent=pad(index+1);$('back-number').textContent=`${pad(index+1)} / ${total}`;
    $('back-title').textContent=m.title;$('back-text').textContent=m.text;
    $('photo-image').src=m.image;$('photo-image').alt=m.alt;
    photo.setAttribute('aria-pressed','false');photo.setAttribute('aria-label',`第 ${index+1} 张，${m.title}，翻到背面`);
    $('flip').textContent='翻到背面';$('flip-hint').textContent='点一下照片，看看背面';
    photo.querySelector('.photo-front').setAttribute('aria-hidden','false');photo.querySelector('.photo-back').setAttribute('aria-hidden','true');
  }
  function photoSize(){
    const maxHeight=Math.max(170,window.innerHeight-245);
    const width=Math.min(285,window.innerWidth-100,maxHeight*54/86);
    return {w:width,h:width*86/54};
  }
  function targetRect(){const size=photoSize();return {x:(innerWidth-size.w)/2,y:Math.max(48,(innerHeight-size.h)/2-45),w:size.w};}
  function fly(from,to,onDone){
    stopFlight();
    flight={x:from.x,y:from.y,w:from.w};
    const paint=()=>{photo.style.width=`${flight.w}px`;photo.style.height=`${flight.w*86/54}px`;photo.style.transform=`translate3d(${flight.x}px,${flight.y}px,0) rotate(${state.mode==='storing'?-5:0}deg)`;};
    if(Feel.reducedMotion){flight={...to};paint();queueMicrotask(()=>onDone?.());return;}
    const p=Feel.words('light, gentle').params;
    flightBody=new Feel.Body2D({...p,x:from.x,y:from.y,target:{x:from.x,y:from.y},restX:.25,restV:.5,onFrame:b=>{flight.x=b.x;flight.y=b.y;paint();},onSettle:()=>{onDone?.();}});
    scaleBody=new Feel.Body({feel:'smooth',x:from.w,target:from.w,restX:.15,restV:.3,onFrame:b=>{flight.w=b.x;paint();}});
    Feel.handoff(flightBody,b=>[[photo,{transform:`translate3d(${b.x}px,${b.y}px,0) rotate(${state.mode==='storing'?-5:0}deg)`}]]);
    Feel.handoff(scaleBody,b=>[[photo,{width:`${b.x}px`,height:`${b.x*86/54}px`}]]);
    paint();scaleBody.to(to.w);flightBody.to({x:to.x,y:to.y});
  }
  function showActions(){actions.hidden=false;$('collect').innerHTML=state.fromAlbum?'放回相片堆 <span aria-hidden="true">↙</span>':'收好这张 <span aria-hidden="true">↗</span>';$('previous').hidden=!state.fromAlbum||state.active===0;$('next').hidden=!state.fromAlbum||state.active>=state.count-1;}
  function ready(){
    resetBody(developer,1);stopMotor();setMode('viewing');showActions();say('');photo.disabled=false;photo.focus({preventScroll:true});
  }
  async function shoot(){
    if(state.mode!=='idle'||state.count>=total)return;
    focusReturn=camera;state.fromAlbum=false;setMode('loading');controls();say('相纸准备中');
    try{const pre=new Image();pre.src=memories[state.count].image;await pre.decode();}catch{setMode('idle');say('这张相纸还没准备好，点相机再试一次');controls();return;}
    if(state.mode!=='loading')return;
    preparePhoto(state.count);actions.hidden=true;photo.disabled=true;setMode('printing');
    $('camera-image').style.filter='none';shutter.kick(220);zoom.to(1);resetBody(feed,0);
    if(Feel.reducedMotion){resetBody(feed,1);queueMicrotask(liftPhoto);}else{feed.to(1);}
    startSound();say(`${pad(state.active+1)} / ${total} · 正在出片`);controls();
  }
  function liftPhoto(){
    stopMotor();const r=$('eject-paper').getBoundingClientRect();viewer.hidden=false;resetBody(feed,0);fade.to(1);
    setMode('developing');say(`${pad(state.active+1)} / ${total} · 慢慢显影`);
    fly({x:r.x,y:r.y,w:r.width},targetRect(),()=>{});
    if(Feel.reducedMotion){resetBody(developer,1);queueMicrotask(ready);}else{developer.to(1);}viewer.focus({preventScroll:true});backgroundInert(true);
  }
  function flipPhoto(){
    if(state.mode!=='viewing')return;state.flipped=!state.flipped;flip.to(state.flipped?180:0);
    photo.setAttribute('aria-pressed',String(state.flipped));photo.setAttribute('aria-label',state.flipped?'翻回照片正面':'翻到照片背面');
    photo.querySelector('.photo-front').setAttribute('aria-hidden',String(state.flipped));photo.querySelector('.photo-back').setAttribute('aria-hidden',String(!state.flipped));
    $('flip').textContent=state.flipped?'翻回正面':'翻到背面';$('flip-hint').textContent=state.flipped?'有些话，写在照片背面':'点一下照片，看看背面';
  }
  function collect(){
    if(state.mode!=='viewing')return;
    if(state.fromAlbum){closeViewer();return;}
    setMode('storing');actions.hidden=true;photo.disabled=true;flip.to(0);backgroundInert(false);
    const rect=photo.getBoundingClientRect();state.count++;storageSave();renderPile();$('pile').hidden=false;
    const dest=$('pile-cards').getBoundingClientRect();
    fly({x:rect.x,y:rect.y,w:rect.width},{x:dest.x,y:dest.y,w:dest.width},()=>{
      if(archiveStarted)return;archiveStarted=true;
      viewer.hidden=true;fade.to(0);zoom.to(0);setMode('idle');say('');controls();camera.hidden||camera.focus({preventScroll:true});if(state.count===total)$('ending-album').focus({preventScroll:true});
      archiveStarted=false;
    });
  }
  function backgroundInert(on){for(const id of ['camera-scene','heading','pile','footer','ending','album'])$(id).inert=on;}
  function openAlbum(){
    if(state.mode!=='idle'||state.count===0)return;focusReturn=document.activeElement;setMode('album');$('album-grid').replaceChildren();
    memories.slice(0,state.count).forEach((m,i)=>{
      const b=document.createElement('button');b.className='album-card';b.style.setProperty('--angle',`${[-3,2,1,-2,3][i%5]}deg`);b.setAttribute('aria-label',`查看第 ${i+1} 张，${m.title}`);
      const img=new Image();img.src=m.image;img.alt=m.alt;img.loading='lazy';const caption=document.createElement('span');caption.className='album-caption';const label=document.createElement('span');label.textContent=m.title;const num=document.createElement('small');num.textContent=pad(i+1);caption.append(label,num);b.append(img,caption);b.addEventListener('click',()=>openMemory(i,b));$('album-grid').append(b);
    });
    $('album-summary').textContent=`${state.count} 张已显影 / 共 ${total} 张 · 按拍摄顺序排列`;$('album').hidden=false;$('album').inert=false;camera.inert=true;$('close-album').focus({preventScroll:true});
  }
  function closeAlbum(){if(state.mode!=='album')return;$('album').hidden=true;camera.inert=false;setMode('idle');controls();(focusReturn?.isConnected?focusReturn:$('pile')).focus({preventScroll:true});}
  function openMemory(index,source){
    stopFlight();
    focusReturn=source||focusReturn;state.fromAlbum=true;preparePhoto(index);resetBody(developer,1);resetBody(fade,1);viewer.hidden=false;photo.disabled=false;setMode('viewing');showActions();
    const to=targetRect();flight={...to};photo.style.width=`${to.w}px`;photo.style.height=`${to.w*86/54}px`;photo.style.transform=`translate3d(${to.x}px,${to.y}px,0)`;
    backgroundInert(true);photo.focus({preventScroll:true});
  }
  function closeViewer(){
    viewer.hidden=true;actions.hidden=true;backgroundInert(false);resetBody(fade,0);state.fromAlbum=false;setMode('album');$('album').hidden=false;$('album').inert=false;(focusReturn?.isConnected?focusReturn:$('close-album')).focus({preventScroll:true});
  }
  function navigate(delta){if(state.mode==='viewing'&&state.fromAlbum){const index=state.active+delta;if(index>=0&&index<state.count)openMemory(index);}}
  function startSound(){
    if(!state.sound)return;
    try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});
      const t=audio.currentTime;const n=audio.createBuffer(1,audio.sampleRate*.065,audio.sampleRate);const d=n.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);
      const s=audio.createBufferSource(),g=audio.createGain();g.gain.value=.065;s.buffer=n;s.connect(g).connect(audio.destination);s.start(t);
      const o=audio.createOscillator(),gain=audio.createGain();o.type='triangle';o.frequency.value=105;gain.gain.value=.012;o.connect(gain).connect(audio.destination);o.start(t);motor={o,gain};
    }catch{/* Sound is optional; unsupported audio cannot interrupt a photo. */}
  }
  function stopMotor(){if(motor){try{motor.o.stop();motor.o.disconnect();motor.gain.disconnect();}catch{}motor=null;}}
  $('sound').addEventListener('click',()=>{state.sound=!state.sound;$('sound').setAttribute('aria-pressed',String(state.sound));$('sound').textContent=`声音 · ${state.sound?'开':'关'}`;if(!state.sound)stopMotor();});
  camera.addEventListener('click',shoot);photo.addEventListener('click',flipPhoto);$('flip').addEventListener('click',flipPhoto);$('collect').addEventListener('click',collect);
  $('pile').addEventListener('click',openAlbum);$('ending-album').addEventListener('click',openAlbum);$('close-album').addEventListener('click',closeAlbum);$('previous').addEventListener('click',()=>navigate(-1));$('next').addEventListener('click',()=>navigate(1));
  $('restart').addEventListener('click',()=>{if(state.mode==='idle')$('reset-dialog').showModal();});
  $('reset-dialog').addEventListener('close',()=>{if($('reset-dialog').returnValue==='reset'){state.count=0;storageSave();renderPile();$('heading').hidden=true;$('footer').hidden=true;setMode('idle');say('');controls();camera.focus({preventScroll:true});}});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){if(state.mode==='viewing'){e.preventDefault();collect();}else if(state.mode==='album')closeAlbum();}
    if(e.key==='ArrowLeft')navigate(-1);if(e.key==='ArrowRight')navigate(1);
    const modal=!viewer.hidden?viewer:!$('album').hidden?$('album'):null;
    if(modal&&e.key==='Tab'){
      const tabbable=[...modal.querySelectorAll('button:not(:disabled)')].filter(el=>el.getClientRects().length&& !el.closest('[hidden]'));
      if(!tabbable.length){e.preventDefault();modal.focus();return;}
      const first=tabbable[0],last=tabbable.at(-1);if(e.shiftKey&&(document.activeElement===first||!modal.contains(document.activeElement))){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||!modal.contains(document.activeElement))){e.preventDefault();first.focus();}
    }
  });
  window.addEventListener('resize',()=>{if(['viewing','developing'].includes(state.mode)){const to=targetRect();if(flightBody){flightBody.to({x:to.x,y:to.y});scaleBody.to(to.w);}else{photo.style.width=`${to.w}px`;photo.style.height=`${to.w*86/54}px`;photo.style.transform=`translate3d(${to.x}px,${to.y}px,0)`;}}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMotor();});
  document.querySelector('.demo-label').textContent=`演示相纸 · ${total} 张`;$('ending').querySelector('.eyebrow').textContent=`${total} / ${total}`;
  renderPile();setMode('idle');controls();paintCamera();
  $('camera-image').addEventListener('error',()=>say('相机图片加载失败，请刷新重试。'));
})();
