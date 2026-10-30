// Use exactly the B font preview, with local WOFF2 pieces for every message/date.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const preview=path.join(__dirname,'../font-previews/2026-10-30'),dist=path.join(__dirname,'dist');
const messages=JSON.parse(fs.readFileSync(path.join(preview,'messages.json'),'utf8')),context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(dist,'memories.js'),'utf8'),context);vm.runInNewContext(fs.readFileSync(path.join(dist,fs.existsSync(path.join(dist,'photo-dates.js'))?'photo-dates.js':'handwritten-date-data.js'),'utf8'),context);
const dates=context.window.PHOTO_DATES?Array.from(context.window.PHOTO_DATES):Array.from(context.window.HANDWRITTEN_DATES,d=>d.label),chars=[...new Set([...messages.join(''),...dates.join('')])],css=fs.readFileSync(path.join(preview,'yozai.css'),'utf8');
const target=path.join(dist,'assets/fonts/yozai');fs.mkdirSync(target,{recursive:true});const parts=[],downloads=[];
for(const match of css.matchAll(/@font-face\s*\{([^}]+)\}/g)){
 const body=match[1],filename=body.match(/url\(["']?\.\/([^"')]+)["']?\)/)?.[1],rangeText=body.match(/unicode-range:\s*([^;]+)/)?.[1];if(!filename||!rangeText)continue;
 const ranges=rangeText.split(',').map(x=>{const [a,b]=x.trim().replace(/^U\+/i,'').split('-').map(n=>parseInt(n,16));return[a,b??a];});
 if(!chars.some(c=>ranges.some(([a,b])=>c.codePointAt(0)>=a&&c.codePointAt(0)<=b)))continue;
 const file=path.join(target,filename),existing=path.join(preview,'fonts/yozai',filename);if(fs.existsSync(existing))fs.copyFileSync(existing,file);
 parts.push({filename,ranges});downloads.push({url:'https://cdn.jsdelivr.net/npm/@chinese-fonts/yozai@2.0.1/dist/Yozai-Regular/'+filename,file});
}
for(const c of chars)if(!parts.some(p=>p.ranges.some(([a,b])=>c.codePointAt(0)>=a&&c.codePointAt(0)<=b)))throw Error('Font has no range for '+c);
const cssOut='/* B: Yozai Regular. Original outlines; locally hosted unicode subsets. */\n'+parts.map(p=>'@font-face{font-family:"KeepsakeYozai";src:url("assets/fonts/yozai/'+p.filename+'") format("woff2");font-style:normal;font-weight:400;font-display:swap;unicode-range:'+p.ranges.map(([a,b])=>'U+'+a.toString(16)+(a!==b?'-'+b.toString(16):'')).join(',')+';}').join('\n')+'\n';
fs.writeFileSync(path.join(dist,'yozai.css'),cssOut);fs.copyFileSync(path.join(preview,'fonts/OFL-Yozai.txt'),path.join(target,'OFL.txt'));
fs.writeFileSync(path.join(target,'manifest.json'),JSON.stringify({family:'KeepsakeYozai',choice:'B',source:'https://github.com/lxgw/yozai-font',package:'@chinese-fonts/yozai@2.0.1',originalVersion:'0.85',characters:chars.join(''),parts},null,2));
fs.writeFileSync(path.join(__dirname,'yozai-downloads.json'),JSON.stringify(downloads,null,2));fs.writeFileSync(path.join(dist,'photo-dates.js'),'window.PHOTO_DATES = '+JSON.stringify(dates,null,2)+';\n');
context.window.MEMORIES.forEach((m,i)=>m.text=messages[i]);fs.writeFileSync(path.join(dist,'memories.js'),'window.MEMORIES = '+JSON.stringify(context.window.MEMORIES,null,2)+';\n');
console.log(JSON.stringify({messages:messages.length,dates:dates.length,glyphs:chars.length,fontPieces:parts.length,alreadyCopied:downloads.filter(d=>fs.existsSync(d.file)).length}));
