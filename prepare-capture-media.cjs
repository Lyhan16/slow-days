// Reproducible, local-only conversion. Originals are never modified.
const fs=require('node:fs/promises'),path=require('node:path'),{spawnSync}=require('node:child_process');
const sharp=require('C:/Users/San/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const source='D:/Users/San/Desktop/iCloud 照片2/iCloud 照片2';
const ffdir=path.resolve(__dirname,'../.media-tools/imageio_ffmpeg/binaries');
const out=path.join(__dirname,'dist/assets/capture');
function run(ff,args){const r=spawnSync(ff,args,{encoding:'utf8',windowsHide:true,maxBuffer:5e6});if(r.status!==0)throw Error(r.stderr||r.error);return r;}
(async()=>{const ff=path.join(ffdir,(await fs.readdir(ffdir)).find(f=>f.endsWith('.exe')));await fs.mkdir(out,{recursive:true});const files=await fs.readdir(source),media=[];
for(let n=1;n<=21;n++){
 const id=String(n).padStart(2,'0'),file=files.find(f=>parseInt(path.parse(f).name)===n),poster='assets/capture/'+id+'.jpg';
 if(file&&/\.(mov|mp4)$/i.test(file)){
  run(ff,['-y','-hide_banner','-loglevel','error','-i',path.join(source,file),'-map','0:v:0','-map','0:a?','-vf','fps=24,scale=960:960:force_original_aspect_ratio=decrease:force_divisible_by=2','-c:v','libx264','-profile:v','main','-crf','22','-preset','medium','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-movflags','+faststart',path.join(out,id+'.mp4')]);
  run(ff,['-y','-hide_banner','-loglevel','error','-i',path.join(out,id+'.mp4'),'-frames:v','1','-q:v','3',path.join(out,id+'.jpg')]);
  run(ff,['-v','error','-i',path.join(out,id+'.mp4'),'-f','null','-']);
  media.push({number:n,kind:'video',src:'assets/capture/'+id+'.mp4',poster});
 }else{
  const input=file?path.join(source,file):'D:/Users/San/Desktop/iCloud 照片/iCloud 照片/21.JPEG';
  await sharp(input).rotate().resize({width:960,height:960,fit:'inside',withoutEnlargement:true}).jpeg({quality:89}).toFile(path.join(out,id+'.jpg'));
  media.push({number:n,kind:'image',src:poster,poster,fallback:!file});
 }
 console.log('Prepared '+id+' '+media.at(-1).kind);
}
await fs.writeFile(path.join(__dirname,'dist/capture-media.js'),'window.CAPTURE_MEDIA = '+JSON.stringify(media,null,2)+';\n');
let seed=6021;const noise=Buffer.alloc(128*128*3);for(let i=0;i<noise.length;i++){seed=(seed*1664525+1013904223)>>>0;noise[i]=seed>>>24;}
await sharp(noise,{raw:{width:128,height:128,channels:3}}).png().toFile(path.join(__dirname,'dist/assets/device-grain.png'));
console.log(JSON.stringify({count:media.length,videos:media.filter(m=>m.kind==='video').length,fallback:media.filter(m=>m.fallback).map(m=>m.number)}));
})().catch(e=>{console.error(e);process.exitCode=1;});
