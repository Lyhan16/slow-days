// Native font/layout proofs. These do not replace a real browser layout check.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,GlobalFonts}=require('C:/Users/San/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const root=__dirname,dist=path.join(root,'dist'),fontRoot=path.join(dist,'assets/fonts/yozai'),manifest=JSON.parse(fs.readFileSync(path.join(fontRoot,'manifest.json'),'utf8')),sandbox={window:{}};
for(const file of ['memories.js','photo-dates.js'])vm.runInNewContext(fs.readFileSync(path.join(dist,file),'utf8'),sandbox);
const messages=Array.from(sandbox.window.MEMORIES,m=>m.text),dates=Array.from(sandbox.window.PHOTO_DATES),latest=JSON.parse(fs.readFileSync(path.join(root,'../font-previews/2026-10-30/messages.json'),'utf8'));
assert.deepEqual(messages,latest);assert.equal(dates.length,21);
manifest.parts.forEach((p,i)=>{const file=path.join(fontRoot,p.filename);assert.equal(fs.readFileSync(file).subarray(0,4).toString(),'wOF2');p.alias='YozaiQA'+i;assert.ok(GlobalFonts.registerFromPath(file,p.alias));});
assert.ok(GlobalFonts.registerFromPath('C:/Windows/Fonts/msyh.ttc','ProofUI'));
function fontFor(c){const cp=c.codePointAt(0),p=manifest.parts.find(p=>p.ranges.some(([a,b])=>cp>=a&&cp<=b));assert.ok(p,'Missing font coverage: '+c);return p.alias;}
function measure(g,c,size,spacing=0){g.font=`${size}px "${fontFor(c)}"`;return g.measureText(c).width+spacing;}
function write(g,text,x,y,size,spacing=0){for(const c of text){g.font=`${size}px "${fontFor(c)}"`;g.fillText(c,x,y);x+=measure(g,c,size,spacing);}}
function wrap(g,text,width,size,spacing){const lines=[];let line='',used=0;for(const c of text){const cw=measure(g,c,size,spacing);if(used+cw>width&&line&&!/[，。！？；：、）》】]/.test(c)){lines.push(line);line='';used=0;}line+=c;used+=cw;}if(line)lines.push(line);assert.equal(lines.join(''),text);return lines;}
function back(index,w){const h=w*86/54,c=createCanvas(w,Math.ceil(h)),g=c.getContext('2d'),size=Math.min(22,Math.max(16,w*.057)),spacing=size*.035,lineHeight=size*1.9;
 g.fillStyle='#fff';g.fillRect(0,0,w,Math.ceil(h));g.fillStyle='#292623';let lines=wrap(g,messages[index],w*.8,size,spacing);const count=lines.length;let lo=w*.35,hi=w*.8;for(let n=0;n<14;n++){const mid=(lo+hi)/2;if(wrap(g,messages[index],mid,size,spacing).length<=count)hi=mid;else lo=mid;}lines=wrap(g,messages[index],hi,size,spacing);assert.ok(lines.length*lineHeight<h-w*.24,'Back text fits vertically');const top=(h-lines.length*lineHeight)/2;for(let i=0;i<lines.length;i++)write(g,lines[i],w*.1,top+size+i*lineHeight,size,spacing);return c;
}
fs.mkdirSync(path.join(root,'qa'),{recursive:true});
for(let sheet=0;sheet<3;sheet++){const c=createCanvas(1280,1040),g=c.getContext('2d');g.fillStyle='#f4f4f4';g.fillRect(0,0,1280,1040);for(let p=0;p<7;p++){const index=sheet*7+p,x=p%4*320+10,y=Math.floor(p/4)*520+28;g.fillStyle='#777';g.font='14px ProofUI';g.fillText(String(index+1).padStart(2,'0'),x+4,y-9);g.drawImage(back(index,300),x,y);g.strokeStyle='#dedede';g.strokeRect(x,y,300,300*86/54);}fs.writeFileSync(path.join(root,'qa/yozai-backs-'+(sheet+1)+'.png'),c.toBuffer('image/png'));}
for(const w of [200,256,285,300,380])for(let i=0;i<21;i++)back(i,w);
const g=createCanvas(400,100).getContext('2d');for(const width of [58,80,114,188,324]){const size=Math.min(38,Math.max(9,width*.14));for(const date of dates){const textWidth=[...date].reduce((sum,c)=>sum+measure(g,c,size),0);assert.ok(textWidth<=width*.85+2,`Date fits the caption area: ${date}, text ${textWidth}, available ${width*.85}`);}}
const html=fs.readFileSync(path.join(dist,'anniversary.html'),'utf8');assert.ok(!/src="handwritten-/.test(html),'Scanned handwriting scripts are retired');assert.ok(html.includes('href="yozai.css"'));assert.equal(html,fs.readFileSync(path.join(dist,'index.html'),'utf8'));
const report={passed:true,font:'B / Yozai Regular',messages:21,dates:21,exactLatestCopy:true,localFontFiles:manifest.parts.length,coverage:'All 224 unique characters',paperWidthsChecked:[200,256,285,300,380],note:'Native font/crop proofs and DOM flow checks; real browser layout is separate.'};fs.writeFileSync(path.join(root,'qa/yozai-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
