// State-machine integration checks in a DOM test double. Uses the actual Feel
// solver; WAAPI completion is immediate so all 21 transitions can be checked.
// This verifies logic, not rendering or real-time animation; browser QA is separate.
const fs=require('node:fs');const vm=require('node:vm');const assert=require('node:assert/strict');const path=require('node:path');
const dist=path.join(__dirname,'dist');
async function scenario(reduced,initialSave=null,brokenImage=false){
  const elements=new Map();let active=null;let saved=initialSave;const raf=[];
  class El{
    constructor(id=''){this.id=id;this.hidden=false;this.disabled=false;this.inert=false;this.attrs={};this.events={};this.children=[];this.textContent='';this.dataset={};this.style={setProperty(k,v){this[k]=v;}};this.clientWidth=390;this.isConnected=true;this.subs={};}
    setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k]??null;}
    addEventListener(k,f){(this.events[k]??=[]).push(f);}async fire(k,e={}){for(const f of this.events[k]||[])await f(e);}
    append(...els){this.children.push(...els);}replaceChildren(...els){this.children=els;}
    querySelector(s){return this.subs[s]??=new El(s);}querySelectorAll(){return this.children;}
    getBoundingClientRect(){const r=this.id==='pile-cards'?{x:280,y:630,width:80,height:128}:this.id==='photo'?{x:52,y:150,width:285,height:454}:{x:130,y:120,width:125,height:199};return{...r,left:r.x,top:r.y,right:r.x+r.width,bottom:r.y+r.height};}
    focus(){active=this;}showModal(){this.open=true;}
    animate(){return{currentTime:1e6,finished:Promise.resolve(),cancel(){}};}
    getClientRects(){return this.hidden?[]:[this.getBoundingClientRect()];}contains(e){return e===this||this.children.includes(e);}closest(){return null;}
  }
  const get=id=>{if(!elements.has(id))elements.set(id,new El(id));return elements.get(id);};
  const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');for(const tag of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)){const el=get(tag[1]);el.hidden=/\bhidden\b/.test(tag[0]);}
  const doc={getElementById:get,querySelector:s=>get(s),createElement:()=>new El(),addEventListener(){},get activeElement(){return active;}};
  class Img extends El{async decode(){if(brokenImage)throw Error('Missing test image');}}
  const sandbox={console,document:doc,Image:Img,innerWidth:390,innerHeight:844,queueMicrotask,performance,matchMedia:()=>({matches:reduced,addEventListener(){}}),requestAnimationFrame:fn=>{raf.push(fn);return raf.length;},cancelAnimationFrame(){},localStorage:{getItem(){return saved;},setItem(k,v){saved=v;}},addEventListener(){}};
  sandbox.window=sandbox;const context=vm.createContext(sandbox);
  for(const file of ['assets/feel.js','memories.js','app.js'])vm.runInContext(fs.readFileSync(path.join(dist,file),'utf8'),context,{filename:file});
  async function drain(){for(let i=0;i<20;i++){await Promise.resolve();const frames=raf.splice(0);frames.forEach(fn=>fn((i+1)*16.7));await Promise.resolve();}}
  const mode=()=>get('experience').dataset.state;
  const click=async id=>{assert.equal(get(id).disabled,false,id+' enabled');await get(id).fire('click');await drain();};
  assert.equal(mode(),'idle');
  const starting=JSON.parse(saved||'null')?.count||0;
  if(brokenImage){await click('camera');assert.equal(mode(),'idle');assert.match(get('status').textContent,/再试/);return{imageFailureRetry:true};}
  for(let n=starting+1;n<=21;n++){
    await click('camera');assert.equal(mode(),'viewing',`photo ${n} viewing`);assert.equal(Number(get('photo-number').textContent),n);
    await click('flip');assert.equal(get('photo').attrs['aria-pressed'],'true');assert.equal(get('photo').querySelector('.photo-back').attrs['aria-hidden'],'false');
    await click('collect');assert.equal(mode(),'idle',`photo ${n} collected`);assert.equal(JSON.parse(saved).count,n);
  }
  assert.equal(get('ending').hidden,false);assert.equal(get('camera').hidden,true);
  await click('ending-album');assert.equal(mode(),'album');assert.equal(get('album-grid').children.length,21);
  await get('album-grid').children[20].fire('click');await drain();assert.equal(mode(),'viewing');assert.equal(get('photo-number').textContent,'21');assert.equal(get('next').hidden,true);
  await click('previous');assert.equal(get('photo-number').textContent,'20');assert.equal(get('next').hidden,false);
  await click('collect');assert.equal(mode(),'album');await click('close-album');assert.equal(mode(),'idle');
  get('reset-dialog').returnValue='reset';await get('reset-dialog').fire('close');await drain();assert.equal(JSON.parse(saved).count,0);assert.equal(get('heading').hidden,true);assert.equal(get('camera').hidden,false);
  return{reducedMotion:reduced,photographs:21,fixedOrder:true,flip:true,collect:true,ending:true,album:true,navigation:true,reset:true,resumedAt:starting};
}
(async()=>{
  const dataContext={window:{}};vm.runInNewContext(fs.readFileSync(path.join(dist,'memories.js'),'utf8'),dataContext);
  const ms=dataContext.window.MEMORIES;assert.equal(ms.length,21);assert.equal(new Set(ms.map(x=>x.id)).size,21);
  for(const m of ms){assert.equal(fs.existsSync(path.join(dist,m.image)),true);assert.ok(fs.statSync(path.join(dist,m.image)).size>1000);}
  const results=[await scenario(false),await scenario(true),await scenario(false,JSON.stringify({version:1,count:20})),await scenario(true,null,true)];
  fs.mkdirSync(path.join(__dirname,'qa'),{recursive:true});fs.writeFileSync(path.join(__dirname,'qa','flow-results.json'),JSON.stringify({note:'Logic checks using a DOM test double; does not verify browser rendering or real-time animation.',assets:21,results},null,2));console.log(JSON.stringify({passed:true,assets:21,results},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
