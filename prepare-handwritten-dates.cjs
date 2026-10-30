// Segment the document scans into 21 read-only pixel windows. Actual date
// rendering uses SVG clipping/color filters; no handwriting is regenerated.
const fs=require('node:fs/promises'),path=require('node:path');
const sharp=require('C:/Users/San/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const base='D:/Users/San/xwechat_files/liuyuhan1340368025_55ec/temp/RWTemp/2026-10/7626e6e68070faa91a9c572ff3bc5bad';
const sheets=[['6fbc99c97a2fb97d911ac7ed2b8ce155.jpg',8,.98],['b608d9115522ae75f07c9661fb4e8004.jpg',9,.85],['ce508ad507c7d125b46523e8e94c83eb.jpg',4,.7]];
const labels=['2020.10.23','2020.12.5','2021.4.21','2022.10.21','2023.5.27','2023.7.9','2023.7.20','2023.10.22','2023.10.29','2023.11.21','2023.11.22','2024.1.8','2024.4.13','2024.5.1','2024.6.1','2024.11.2','2025.6.6','2025.9.20','2025.10.24','2026.8.2','2026.10.24'];
(async()=>{const result=[];await fs.mkdir('dist/assets/date-sheets',{recursive:true});
for(let s=0;s<sheets.length;s++){
 const [filename,expected,endFraction]=sheets[s],input=path.join(base,filename),{data,info}=await sharp(input).greyscale().raw().toBuffer({resolveWithObject:true});
 const {width:w,height:h}=info,x0=Math.floor(w*.2),x1=Math.ceil(w*.8),rows=[];
 for(let y=0;y<Math.floor(h*endFraction);y++){let count=0;for(let x=x0;x<x1;x++)if(data[y*w+x]<100)count++;if(count>=4)rows.push(y);}
 const bands=[];for(const y of rows){const last=bands.at(-1);if(!last||y-last[1]>24)bands.push([y,y]);else last[1]=y;}
 if(bands.length!==expected)throw Error('Sheet '+(s+1)+' has '+bands.length+' rows, expected '+expected);
 const asset='assets/date-sheets/sheet-'+(s+1)+'.jpg';await fs.copyFile(input,'dist/'+asset);
 for(const [top,bottom] of bands){const points=[];let left=w,right=0;for(let y=top;y<=bottom;y++)for(let x=x0;x<x1;x++)if(data[y*w+x]<100){points.push([x,y]);left=Math.min(left,x);right=Math.max(right,x);}
  let best=0,score=-Infinity;
  for(let deg=-4;deg<=4;deg+=.25){const r=deg*Math.PI/180,projection=new Map();for(const [x,y] of points){const row=Math.round((x-left)*Math.sin(r)+(y-top)*Math.cos(r));projection.set(row,(projection.get(row)||0)+1);}const v=[...projection.values()].reduce((sum,n)=>sum+n*n,0);if(v>score){score=v;best=deg;}}
  const yearYs=points.filter(([x])=>x<left+(right-left)*.42).map(([,y])=>y).sort((a,b)=>a-b),yearHeight=yearYs[Math.floor(yearYs.length*.98)]-yearYs[Math.floor(yearYs.length*.02)]+1;
  const n=result.length;result.push({number:n+1,label:labels[n],sheet:asset,sheetWidth:w,sheetHeight:h,x:Math.max(0,left-10),y:Math.max(0,top-9),width:right-left+21,height:bottom-top+19,yearHeight,rotation:best});
 }
}
await fs.writeFile('dist/handwritten-date-data.js','window.HANDWRITTEN_DATES = '+JSON.stringify(result,null,2)+';\n');
await fs.writeFile('handwritten-date-manifest.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result.map(d=>({number:d.number,date:d.label,crop:[d.x,d.y,d.width,d.height],rotation:d.rotation}))));
})().catch(e=>{console.error(e);process.exitCode=1;});
