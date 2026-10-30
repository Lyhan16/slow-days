// Static proofs of the native SVG composition, not browser screenshots.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const sharp=require('C:/Users/San/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
class Node{constructor(tag){this.tag=tag;this.attrs={};this.children=[];}setAttribute(k,v){this.attrs[k]=v;}append(...nodes){this.children.push(...nodes);}}
const sandbox={window:{},document:{createElementNS:(_,tag)=>new Node(tag),createElement:tag=>new Node(tag)}};
for(const file of ['memories.js','handwritten-back-data.js','handwritten-backs.js'])vm.runInNewContext(fs.readFileSync(path.join('dist',file),'utf8'),sandbox);
const escape=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
function xml(node){const a={...node.attrs};if(node.tag==='image')a.href='data:image/jpeg;base64,'+fs.readFileSync(path.join('dist',a.href)).toString('base64');return '<'+node.tag+Object.entries(a).map(([k,v])=>' '+k+'="'+escape(v)+'"').join('')+'>'+node.children.map(xml).join('')+'</'+node.tag+'>';}
(async()=>{fs.mkdirSync('qa',{recursive:true});const data=sandbox.window.HANDWRITTEN_BACKS;assert.equal(data.length,21);const sources=['90eeceecee265441584ab59bdc9a5cd7.jpg','fb31e651099b7977598fc0c5ebfc127c.jpg','5154e1e382eb3f1edd43d35ea68afee3.jpg'],base='D:/Users/San/xwechat_files/liuyuhan1340368025_55ec/temp/RWTemp/2026-10/7626e6e68070faa91a9c572ff3bc5bad';
 for(let sheet=0;sheet<3;sheet++){
  assert.ok(fs.readFileSync(path.join(base,sources[sheet])).equals(fs.readFileSync('dist/assets/note-sheets/sheet-'+(sheet+1)+'.jpg')),'Original scan is unchanged');let cells='';
  for(let p=0;p<7;p++){const i=sheet*7+p,d=data[i];assert.equal(d.number,i+1);assert.equal(d.text,sandbox.window.MEMORIES[i].text);assert.ok(d.x>=0&&d.y>=0&&d.x+d.width<=d.sheetWidth&&d.y+d.height<=d.sheetHeight,'Crop stays within source');const x=p%4*320+10,y=Math.floor(p/4)*520+28,node=sandbox.window.createPhotoBack(i);node.setAttribute('x',x);node.setAttribute('y',y);node.setAttribute('width',300);node.setAttribute('height',300*86/54);cells+=`<text x="${x+4}" y="${y-9}" font-family="Arial" font-size="14" fill="#777">${String(i+1).padStart(2,'0')}</text><rect x="${x}" y="${y}" width="300" height="${300*86/54}" fill="#fff" stroke="#dedede"/>`+xml(node);}
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="1040"><rect width="100%" height="100%" fill="#f4f4f4"/>'+cells+'</svg>',out='qa/handwritten-backs-proof-'+(sheet+1)+'.png';await sharp(Buffer.from(svg)).png().toFile(out);const {data:pixels,info}=await sharp(out).raw().toBuffer({resolveWithObject:true});
  for(let p=0;p<7;p++){const x=p%4*320+16,y=Math.floor(p/4)*520+34,offset=(y*info.width+x)*info.channels;assert.ok(pixels[offset]===255&&pixels[offset+1]===255&&pixels[offset+2]===255,'Back stays pure white without a scan edge');}
 }
 console.log('21 handwritten backs: source bytes, 7+7+7 order, crop bounds, white backgrounds and accessible transcripts passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
