// State-machine integration checks in a DOM test double. Uses the actual Feel
// solver; WAAPI completion is immediate so all 21 transitions can be checked.
// This verifies logic, not rendering or real-time animation; browser QA is separate.
const fs=require('node:fs');const vm=require('node:vm');const assert=require('node:assert/strict');const path=require('node:path');
const dist=path.join(__dirname,'dist');
async function scenario(reduced,initialSave=null,brokenImage=false,journey=false,entryMethod='wheel',liveMotion=false){
  const elements=new Map();let active=null;let saved=initialSave;const raf=[];let clock=0,timerID=0;const timers=new Map(),documentEvents={},windowEvents={};
  class El{
    constructor(id=''){this.id=id;this.hidden=false;this.disabled=false;this.inert=false;this.attrs={};this.events={};this.children=[];this.textContent='';this.dataset={};this.style={setProperty(k,v){this[k]=v;}};this.clientWidth=390;this.clientHeight=190;this.scrollLeft=0;this.parentElement={hidden:false};this.isConnected=true;this.subs={};this.animations=[];}
    setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k]??null;}removeAttribute(k){delete this.attrs[k];}
    pause(){this.paused=true;}play(){this.paused=false;return Promise.resolve();}load(){}
    addEventListener(k,f){(this.events[k]??=[]).push(f);}async fire(k,e={}){for(const f of this.events[k]||[])await f(e);}
    append(...els){for(const el of els){el.parentElement=this;this.children.push(el);}}replaceChildren(...els){this.children=[];this.append(...els);}remove(){if(this.parentElement.children)this.parentElement.children=this.parentElement.children.filter(x=>x!==this);this.isConnected=false;}
    querySelector(s){return this.subs[s]??=new El(s);}querySelectorAll(){return this.children;}
    getBoundingClientRect(){const r=this.id==='pile-cards'?{x:280,y:630,width:80,height:128}:this.id==='photo'?{x:52,y:150,width:285,height:454}:{x:130,y:120,width:125,height:199};return{...r,left:r.x,top:r.y,right:r.x+r.width,bottom:r.y+r.height};}
    focus(){active=this;}showModal(){this.open=true;}
    animate(frames){this.animations.push(frames);return{currentTime:1e6,finished:Promise.resolve(),cancel(){}};}
    getClientRects(){return this.hidden?[]:[this.getBoundingClientRect()];}contains(e){return e===this||this.children.includes(e);}closest(){return null;}
  }
  if(liveMotion)El.prototype.animate=undefined;
  const get=id=>{if(!elements.has(id))elements.set(id,new El(id));return elements.get(id);};
  const html=fs.readFileSync(path.join(dist,'anniversary.html'),'utf8');for(const tag of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)){const el=get(tag[1]);el.hidden=/\bhidden\b/.test(tag[0]);}
  const doc={body:new El('body'),hidden:false,getElementById:get,querySelector:s=>get(s),createElement:()=>new El(),createElementNS:()=>new El(),addEventListener(k,f){(documentEvents[k]??=[]).push(f);},get activeElement(){return active;}};
  class Img extends El{async decode(){if(brokenImage)throw Error('Missing test image');}}
  const settings=new Map(),soundEvents=[];
  get('camera-scene').parentElement=new El('camera-bay');
  const sandbox={console,document:doc,Image:Img,innerWidth:390,innerHeight:844,queueMicrotask,performance:{now:()=>clock},setTimeout(fn,ms){const id=++timerID;timers.set(id,{fn,at:clock+ms,ms});return id;},clearTimeout(id){timers.delete(id);},Event:class{constructor(type){this.type=type;}},matchMedia:()=>({matches:reduced,addEventListener(){}}),requestAnimationFrame:fn=>{raf.push(fn);return raf.length;},cancelAnimationFrame(){},localStorage:{getItem(k){return k==='six-years-personal-v1'?saved:settings.get(k)??null;},setItem(k,v){if(k==='six-years-personal-v1')saved=v;else settings.set(k,v);}},addEventListener(k,f){(windowEvents[k]??=[]).push(f);},dispatchEvent(e){for(const f of windowEvents[e.type]||[])f(e);}};
  sandbox.CameraSound={unlock:()=>soundEvents.push(['unlock']),flash:()=>soundEvents.push(['flash']),startFeed:speed=>soundEvents.push(['feed',speed]),stopFeed:()=>soundEvents.push(['stop']),suspendFeed:()=>soundEvents.push(['suspend'])};
  sandbox.window=sandbox;const context=vm.createContext(sandbox);
  for(const file of ['assets/feel.js','memories.js','photo-dates.js','photo-labels.js','geometry.js','clothesline.js','app.js'])vm.runInContext(fs.readFileSync(path.join(dist,file),'utf8'),context,{filename:file});
  if(journey)for(const file of ['capture-copy.js','capture-media.js','journey.js'])vm.runInContext(fs.readFileSync(path.join(dist,file),'utf8'),context,{filename:file});
  async function drain(steps=850,until=null){for(let i=0;i<steps;i++){await Promise.resolve();clock+=16.7;const frames=raf.splice(0);frames.forEach(fn=>fn(clock));for(const [id,t] of [...timers])if(t.at<=clock){timers.delete(id);t.fn();}await Promise.resolve();if(until?.())break;}}
  const mode=()=>get('experience').dataset.state;
  const click=async id=>{assert.equal(get(id).disabled,false,id+' enabled');await get(id).fire('click');await drain();};
  assert.equal(mode(),'idle');
  if(journey){assert.equal(get('experience').inert,true);assert.equal(get('opening-prints').children.length,40);if(entryMethod==='keyboard'||entryMethod==='pointer'||reduced){await get('enter-keepsake').fire('click',{detail:entryMethod==='keyboard'?0:1});await drain();}else{await get('opening').fire('wheel',{deltaY:-100,deltaMode:0,preventDefault(){}});assert.equal(get('experience').style.visibility,'hidden');await get('opening').fire('wheel',{deltaY:90,deltaMode:0,preventDefault(){}});assert.match(get('experience').style.transform,/translateY/);await drain();}assert.equal(get('opening').hidden,true);assert.equal(get('experience').inert,false);assert.equal(get('experience').style.transform,'');if(entryMethod==='keyboard')assert.equal(doc.activeElement,get('camera'),'keyboard entry moves focus into the workbench');else assert.notEqual(doc.activeElement,get('camera'),'pointer/wheel entry does not auto-focus the camera');}
  assert.equal(get('footer').hidden,true);assert.ok(!html.includes('id="print-speed"'),'speed control removed');
  const starting=JSON.parse(saved||'null')?.count||0;
  assert.ok(html.includes('2026.10.21'),'anniversary date is shown');
  if(starting<20){await get('ending-surprise').fire('click');assert.equal(mode(),'idle','bonus cannot open before twenty photos');assert.equal(get('final-copy').hidden,true);}
  if(brokenImage){await click('camera');assert.equal(mode(),'idle');assert.match(get('status').textContent,/再试/);return{imageFailureRetry:true};}
  for(let n=starting+1;n<=20;n++){
    if(journey)await click('camera');else await get('camera').fire('click');
    if(journey){
      assert.equal(mode(),'framing');assert.equal(get('capture-room').hidden,false);assert.equal(get('capture-shutter').disabled,true);assert.equal(get('capture-video').muted,false,'preview audio defaults on');
      assert.equal(sandbox.CAPTURE_COPY.length,20,'twenty prompts, with no capture stage for the bonus');assert.equal(get('capture-copy-text').textContent,sandbox.CAPTURE_COPY[n-1],`scene ${n} has the matching approved prompt`);
      if(n===1){await click('capture-close');assert.equal(mode(),'idle');assert.equal(get('hanging-photos').children.length,0);await click('camera');}
      if(n===5){get('capture-video').onerror();get('capture-still').onload();}else if(sandbox.CAPTURE_MEDIA[n-1].kind==='video')get('capture-video').onloadeddata();else get('capture-still').onload();
      assert.equal(get('capture-shutter').disabled,false);await get('capture-shutter').fire('click');await get('capture-shutter').fire('click');
    }
    if(!reduced){await get('viewer').fire('click',{target:get('viewer')});assert.ok(['loading','printing','developing','framing'].includes(mode()),'backdrop cannot dismiss a print before viewing');}
    if(liveMotion){await drain(300,()=>mode()==='printing'&&Number(get('eject-developer').style.opacity)<.85);assert.equal(mode(),'printing','image develops before paper finishes feeding');const partial=Number(get('eject-developer').style.opacity);assert.ok(partial>0&&partial<1);assert.equal(get('developer').style.opacity,get('eject-developer').style.opacity,'both images share one development state');await drain(12);assert.ok(Number(get('eject-developer').style.opacity)<partial,'image continues developing while printing');assert.equal(get('photo-actions').hidden,true);await drain(600,()=>mode()==='developing');assert.equal(mode(),'developing');assert.ok(Number(get('developer').style.opacity)<partial,'lift does not restart the cover');assert.equal(get('developer').style.opacity,get('eject-developer').style.opacity,'handoff keeps image opacity continuous');}
    await drain();assert.equal(mode(),'viewing','new print waits for manual collection');assert.equal(get('developer').style.opacity,'0','photo is fully developed');assert.equal(get('eject-developer').style.opacity,'0','ejection image also fully develops');assert.equal(get('eject-image').src,sandbox.MEMORIES[n-1].image,'correct photo is already present in the ejection stage');assert.equal(get('photo-actions').hidden,false);assert.equal(get('previous').hidden,true);assert.equal(get('next').hidden,true);
    assert.equal(get('photo-date').children[0].getAttribute('data-date-number'),String(n),'new print has its own date');assert.equal(get('photo-date').children[0].textContent,sandbox.PHOTO_DATES[n-1]);
    assert.equal(get('back-handwriting').children[0].getAttribute('data-back-number'),String(n),'typed back matches its photo');assert.equal(get('back-handwriting').children[0].textContent,sandbox.MEMORIES[n-1].text,'latest exact text is typeset');assert.equal(get('back-handwriting').children[0].getAttribute('aria-label'),sandbox.MEMORIES[n-1].text,'message remains accessible');
    assert.equal(get('hanging-photos').children.length,n-1,'no premature hanging');
    if(n===starting+1){await drain(1800);assert.equal(mode(),'viewing','no timer automatically collects the print');for(const f of documentEvents.keydown||[])f({key:'ArrowLeft'});assert.equal(Number(get('photo-number').textContent),n,'fresh photo cannot be lost through keyboard navigation');}
    await get('viewer').fire('click',{target:get('photo')});assert.equal(mode(),'viewing','click on the print must not collect it');
    await click('photo');assert.equal(get('photo').attrs['aria-pressed'],'true','fresh print itself still flips');assert.equal(get('photo').getAttribute('aria-describedby'),'back-text','handwritten message can also be read by a screen reader');
    if(n%2){await get('viewer').fire('click',{target:get('viewer')});await drain();}else await click('collect');
    if(journey)assert.equal(get('capture-room').hidden,true);
    assert.equal(mode(),'idle',`photo ${n} manually hung`);assert.equal(Number(get('photo-number').textContent),n);
    assert.equal(get('hanging-photos').children.length,n);const item=get('hanging-photos').children[n-1],card=item.children[1];
    assert.equal(card.getAttribute('data-memory-index'),String(n-1));assert.equal(card.style.visibility,'visible');
    assert.equal(card.children[1].children[0].getAttribute('data-date-number'),String(n),'rope date keeps the photo order');
    if(n===1&&!reduced){const before=item.style.transform;await card.fire('pointerenter',{clientX:270});await drain(8);assert.notEqual(item.style.transform,before,'hover supplies a physical impulse');await drain();}
    await card.fire('click');await drain();assert.equal(mode(),'viewing');
    await click('flip');assert.equal(get('photo').attrs['aria-pressed'],'true');assert.equal(get('photo').querySelector('.photo-back').attrs['aria-hidden'],'false');
    if(n%2)await click('collect');else{await get('viewer').fire('click',{target:get('viewer')});await drain();}assert.equal(mode(),'idle',`photo ${n} returned to line`);assert.equal(JSON.parse(saved).count,n);
  }
  assert.equal(get('ending').hidden,false);assert.equal(get('intro').hidden,true);assert.equal(get('camera-scene').parentElement.hidden,true);assert.ok(parseFloat(get('line-track').style.width)>390,'twenty photos scroll within the line');assert.equal(get('hanging-photos').children.length,20);assert.equal(get('camera').disabled,true);
  assert.equal(soundEvents.filter(e=>e[0]==='flash').length,20-starting,'one flash sound per shutter');assert.equal(soundEvents.filter(e=>e[0]==='feed').length,reduced?0:20-starting);for(const event of soundEvents.filter(e=>e[0]==='feed'))assert.equal(event[1],.6);
  if(!reduced){const cards=get('hanging-photos').children,angle=el=>parseFloat(el.style.transform.match(/rotateZ\(([-\d.]+)/)[1]);let baseline=cards.map(angle),oldOffset=get('line-viewport').scrollLeft;await get('line-previous').fire('click');await drain(8);assert.ok(get('line-viewport').scrollLeft<oldOffset);cards.forEach((el,i)=>assert.ok(angle(el)<baseline[i]-.1,'left paging leans every print to the right'));await drain(40);cards.forEach((el,i)=>assert.ok(Math.abs(angle(el)-baseline[i])<.25,'left paging returns near rest within 0.8 seconds'));await drain();baseline=cards.map(angle);oldOffset=get('line-viewport').scrollLeft;await get('line-next').fire('click');await drain(8);assert.ok(get('line-viewport').scrollLeft>oldOffset);cards.forEach((el,i)=>assert.ok(angle(el)>baseline[i]+.1,'right paging leans every print to the left'));await drain(40);cards.forEach((el,i)=>assert.ok(Math.abs(angle(el)-baseline[i])<.25,'right paging returns near rest within 0.8 seconds'));await drain();}
  await click('ending-album');assert.equal(mode(),'album');assert.equal(get('album-grid').children.length,20,'bonus is separate from the twenty-photo album');
  get('album-grid').children.forEach((card,i)=>assert.equal(card.children[1].children[0].getAttribute('data-date-number'),String(i+1),'album date matches its photograph'));
  await get('album-grid').children[19].fire('click');await drain();assert.equal(mode(),'viewing');assert.equal(get('photo-number').textContent,'20');assert.equal(get('next').hidden,true);
  await click('previous');assert.equal(get('photo-number').textContent,'19');assert.equal(get('next').hidden,false);
  await get('viewer').fire('click',{target:get('viewer')});await drain();assert.equal(mode(),'album','blank space returns an album photo to its album');await click('close-album');assert.equal(mode(),'idle');
  await click('ending-surprise');assert.equal(mode(),'viewing');assert.equal(get('photo-number').textContent,'21');assert.equal(get('final-copy').hidden,false);assert.equal(get('previous').hidden,true);assert.equal(get('next').hidden,true);assert.equal(get('hanging-photos').children.length,20);await click('flip');assert.equal(get('photo').attrs['aria-pressed'],'true');assert.equal(get('back-text').textContent,sandbox.MEMORIES[20].text,'keep original bonus photo back text');for(const f of documentEvents.keydown||[])f({key:'ArrowLeft'});assert.equal(get('photo-number').textContent,'21');await click('collect');assert.equal(mode(),'idle');assert.equal(get('ending').hidden,false);assert.equal(get('final-copy').hidden,true);assert.equal(JSON.parse(saved||'{"count":20}').count,20,'bonus viewing does not add a rope photo');
  await click('ending-surprise');assert.equal(get('photo-date').children[0].getAttribute('data-date-number'),'21','bonus uses the final handwritten date');assert.equal(get('back-handwriting').children[0].getAttribute('data-back-number'),'21','bonus uses the last handwritten paragraph');await get('viewer').fire('click',{target:get('viewer')});await drain();assert.equal(mode(),'idle','blank space also closes the bonus photo');assert.equal(get('final-copy').hidden,true);
  get('reset-dialog').returnValue='reset';await get('reset-dialog').fire('close');await drain();assert.equal(JSON.parse(saved).count,0);assert.equal(get('hanging-photos').children.length,0);assert.equal(get('intro').hidden,false);assert.equal(get('camera-scene').parentElement.hidden,false);
  return{reducedMotion:reduced,journey,regularPhotographs:20,bonusPhotographs:1,fixedOrder:true,manualCollection:true,soundSync:true,directionalWind:!reduced,quickWindRecovery:!reduced,hoverImpulse:!reduced,flip:true,returnToLine:true,endingAfter20:true,bonusAfterEnding:true,album:true,navigation:true,reset:true,resumedAt:starting};
}
(async()=>{
  const dataContext={window:{}};vm.runInNewContext(fs.readFileSync(path.join(dist,'memories.js'),'utf8'),dataContext);
  const ms=dataContext.window.MEMORIES;assert.equal(ms.length,21);assert.equal(new Set(ms.map(x=>x.id)).size,21);
  for(const m of ms){assert.equal(fs.existsSync(path.join(dist,m.image)),true);assert.ok(fs.statSync(path.join(dist,m.image)).size>1000);}
  const geometryContext={};vm.runInNewContext(fs.readFileSync(path.join(dist,'geometry.js'),'utf8'),geometryContext);const geo=geometryContext.KeepsakeGeometry;
  for(const size of [264,320,390,460,490]){const r=geo.slotLayout(size),scale=size/geo.camera.width;assert.ok(Math.abs(r.y+r.height-r.mouthY)<1e-8,'paper bottom at slot');assert.ok(r.x>geo.camera.slot.left*scale);assert.ok(r.x+r.width<geo.camera.slot.right*scale);assert.ok(Math.abs(r.height/r.width-86/54)<1e-8);}
  const results=[await scenario(false),await scenario(true),await scenario(false,JSON.stringify({version:1,count:20})),await scenario(true,null,true),await scenario(false,null,false,true),await scenario(true,null,false,true),await scenario(true,JSON.stringify({version:1,count:21})),await scenario(false,null,false,true,'keyboard'),await scenario(false,null,false,true,'pointer'),await scenario(false,null,false,false,'wheel',true)];
  fs.mkdirSync(path.join(__dirname,'qa'),{recursive:true});fs.writeFileSync(path.join(__dirname,'qa','flow-results.json'),JSON.stringify({note:'Logic checks using a DOM test double; does not verify browser rendering or real-time animation.',assets:21,results},null,2));console.log(JSON.stringify({passed:true,assets:21,results},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
