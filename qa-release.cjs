// Release asset checks. Browser visual QA remains a separate verification.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const sharp=require('C:/Users/San/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=__dirname,dist=path.join(root,'dist'),context={window:{}};
function asset(relative){const file=path.resolve(dist,relative);assert.ok(file.startsWith(dist+path.sep),'Resource stays within static output');assert.ok(fs.statSync(file).isFile(),'Missing asset '+relative);return file;}
function refs(html){return [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]).filter(x=>x&&!/^(?:data:|https?:|#)/.test(x));}
(async()=>{
 const html=fs.readFileSync(asset('index.html'),'utf8');assert.equal(html,fs.readFileSync(asset('anniversary.html'),'utf8'));assert.ok(html.includes('id="opening-six"'));assert.ok(html.includes('id="eject-image"'));assert.ok(!/想把这一刻留下来|src="handwritten-/.test(html));
 for(const page of ['index.html','anniversary.html','reset-progress.html'])for(const ref of refs(fs.readFileSync(asset(page),'utf8')))asset(ref);
 const js=refs(html).filter(x=>x.endsWith('.js'));for(const file of [...js,'reset-progress.js'])new vm.Script(fs.readFileSync(asset(file),'utf8'),{filename:file});
 for(const css of ['style.css','journey.css','yozai.css'])for(const m of fs.readFileSync(asset(css),'utf8').matchAll(/url\(["']?([^"')]+)["']?\)/g))if(!/^(data:|https?:)/.test(m[1]))asset(m[1]);
 for(const file of ['memories.js','capture-media.js','capture-copy.js','photo-dates.js'])vm.runInNewContext(fs.readFileSync(asset(file),'utf8'),context);
 const {MEMORIES:memories,CAPTURE_MEDIA:media,CAPTURE_COPY:copy,PHOTO_DATES:dates}=context.window;
 assert.equal(memories.length,21);assert.equal(media.length,21);assert.equal(copy.length,20);assert.equal(dates.length,21);assert.equal(new Set(memories.map(m=>m.id)).size,21);
 for(const m of memories){const info=await sharp(asset(m.image)).metadata();assert.ok(info.width>0&&info.height>0);}
 const ffdir=path.resolve(root,'../.media-tools/imageio_ffmpeg/binaries'),ff=path.join(ffdir,fs.readdirSync(ffdir).find(f=>f.endsWith('.exe')));let videos=0;
 for(const [i,m] of media.entries()){
  assert.equal(m.number,i+1);asset(m.poster);const file=asset(m.src);
  if(m.kind==='video'){
   videos++;const bytes=fs.readFileSync(file),boxes=[];for(let at=0;at+8<=bytes.length;){let length=bytes.readUInt32BE(at);if(length===1)length=Number(bytes.readBigUInt64BE(at+8));if(length===0)length=bytes.length-at;assert.ok(length>=8);boxes.push(bytes.toString('ascii',at+4,at+8));at+=length;}
   assert.ok(boxes.indexOf('moov')>=0&&boxes.indexOf('moov')<boxes.indexOf('mdat'),'Video starts with streamable metadata');
   const check=spawnSync(ff,['-hide_banner','-i',file,'-frames:v','1','-f','null','-'],{encoding:'utf8',windowsHide:true,maxBuffer:2e6});assert.equal(check.status,0,'Video first frame decodes: '+m.number);assert.match(check.stderr,/Video: h264/);assert.match(check.stderr,/yuvj?420p/);
  }
 }
 assert.equal(videos,19);const fonts=JSON.parse(fs.readFileSync(asset('assets/fonts/yozai/manifest.json'),'utf8'));for(const p of fonts.parts)asset('assets/fonts/yozai/'+p.filename);asset('assets/fonts/yozai/OFL.txt');
 const result={passed:true,repository:'Lyhan16/slow-days',url:'https://lyhan16.github.io/slow-days/',photos:21,capturePrompts:20,videos,videoFormat:'H264 / 8-bit 4:2:0 / faststart',fontFiles:fonts.parts.length,htmlEntrypointsMatch:true,resetPage:true,syntax:true,resourceReferences:true,browserVisualQA:false};fs.mkdirSync(path.join(root,'qa'),{recursive:true});fs.writeFileSync(path.join(root,'qa/release-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})().catch(error=>{console.error(error);process.exitCode=1;});
