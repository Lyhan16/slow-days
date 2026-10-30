// A static crop/deskew proof, not a browser screenshot.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const sharp=require('C:/Users/San/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
class Node{constructor(tag){this.tag=tag;this.attrs={};this.children=[];}setAttribute(k,v){this.attrs[k]=v;}append(...nodes){this.children.push(...nodes);}}
const sandbox={window:{},document:{createElementNS:(_,tag)=>new Node(tag),createElement:tag=>new Node(tag)}};
vm.runInNewContext(fs.readFileSync('dist/handwritten-date-data.js','utf8'),sandbox);vm.runInNewContext(fs.readFileSync('dist/handwritten-dates.js','utf8'),sandbox);
const escape=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
function xml(node){const a={...node.attrs};if(node.tag==='image')a.href='data:image/jpeg;base64,'+fs.readFileSync(path.join('dist',a.href)).toString('base64');return '<'+node.tag+Object.entries(a).map(([k,v])=>' '+k+'="'+escape(v)+'"').join('')+'>'+node.children.map(xml).join('')+'</'+node.tag+'>';}
(async()=>{let cells='';for(let i=0;i<21;i++){const node=sandbox.window.createPhotoDate(i);node.setAttribute('x',i%3*420+31.5);node.setAttribute('y',Math.floor(i/3)*180+42.5);node.setAttribute('width',357);node.setAttribute('height',119);cells+='<text x="'+(i%3*420+16)+'" y="'+(Math.floor(i/3)*180+24)+'" font-family="Arial" font-size="16" fill="#8b818b">'+String(i+1).padStart(2,'0')+'</text>'+xml(node);}
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1260" height="1260"><rect width="100%" height="100%" fill="#fffdf9"/>'+cells+'</svg>';fs.mkdirSync('qa',{recursive:true});await sharp(Buffer.from(svg)).png().toFile('qa/handwritten-dates-proof.png');
const {data,info}=await sharp('qa/handwritten-dates-proof.png').raw().toBuffer({resolveWithObject:true});
for(let i=0;i<21;i++){const x=i%3*420+2,y=Math.floor(i/3)*180+34,p=(y*info.width+x)*info.channels;assert.ok(data[p]>250&&data[p+1]>248&&data[p+2]>244,'Transparent area stays paper-colored, without a black filter rectangle');}
assert.deepEqual([1,2,3].map(n=>sandbox.window.HANDWRITTEN_DATES.filter(d=>d.sheet.endsWith('sheet-'+n+'.jpg')).length),[8,9,4]);
console.log('21 original date windows rendered; sheet order 8+9+4 and transparent backgrounds verified.');})();
