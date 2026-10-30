// Analyze/copy the original scans. Rendering clips their original pixels in SVG.
const fs=require('node:fs/promises'),path=require('node:path');
const sharp=require('C:/Users/San/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const base='D:/Users/San/xwechat_files/liuyuhan1340368025_55ec/temp/RWTemp/2026-10/7626e6e68070faa91a9c572ff3bc5bad';
// Vertical windows are paragraph boundaries, in normalized source coordinates.
const sheets=[
 ['90eeceecee265441584ab59bdc9a5cd7.jpg',.56,.96,[0,.16,.32,.455,.585,.7,.89,1]],
 ['fb31e651099b7977598fc0c5ebfc127c.jpg',.12,.78,[0,.16,.30,.445,.58,.76,.88,1]],
 ['5154e1e382eb3f1edd43d35ea68afee3.jpg',.06,.97,[0,.18,.285,.42,.56,.7,.87,1]]
];
const texts=[
 '咱们的第一张合照，当然要放上来啦！ps：虽然咱们拍得都不好看哈哈哈。',
 '记下你在北方的第一次看雪，你踩在雪里咯吱咯吱地响。',
 '这张好像是去大同之前拍的，还记得当时一起兴奋地做计划。',
 '两周年的视频，不知道你还记不记得咱们疫情时的样子。',
 '那个时候随便找个镜面都能随地大小拍。',
 '还记得那天大半夜爬起来当志愿者吗？你困得脑袋一点一点往下垂，就这样趴着也能睡着。',
 '你很喜欢的一张我的照片，那就放在这里吧！',
 '说真的，你戴发卡挺好看的，以后可以多试试嘛。',
 '咦，发现了你想要养鱼的端倪，原来这个时候就喜欢上了呀哈哈哈。',
 '你下班的那天，径直走过都没发现我，于是就有了这张偷拍。',
 '啦啦啦～你那个时候特别喜欢用 ipad 画画。',
 '在雪山上吸了氧，你就开始高反了，后来的照片全都是你坐着喘气的样子。',
 '以后也要像这样，一起并肩完成各种的作业呀！',
 '开往春天的巴士，我喜欢春天和秋天，以及有你的每个季节。',
 '备考最忙的时候，也要过个六一，偶尔抽出时间做一些有仪式感的事情，还真的挺有趣诶。',
 '哈哈哈哈，有一种淡淡的幸福感。',
 '毕业啦！以后人生的每个阶段，也都想和你一起走过。',
 '就这样晚上在江边随意走走，看看夜景吹吹风，也很惬意了。',
 '希望你有机会能再来成都，一起走走你没去过的地方。',
 '每次一个人出去玩看到好看的风景，第一反应是，要是你也在就好了。',
 '拍立得没有拍好，那就用最后这一张来收尾吧！和小鱼一起的合照。'
];
const lineCounts=[3,3,3,3,2,5,3,3,3,3,2,4,3,3,4,2,3,3,3,4,3];
(async()=>{
 const dates=[];await fs.mkdir('dist/assets/note-sheets',{recursive:true});
 for(let s=0;s<sheets.length;s++){
  const [filename,xf,xt,bounds]=sheets[s],input=path.join(base,filename),{data,info}=await sharp(input).greyscale().raw().toBuffer({resolveWithObject:true}),{width:w,height:h}=info;
  const sheet='assets/note-sheets/sheet-'+(s+1)+'.jpg';await fs.copyFile(input,'dist/'+sheet);
  for(let p=0;p<7;p++){
   const points=[];let left=w,right=0,top=h,bottom=0;
   for(let y=Math.floor(h*bounds[p]);y<Math.floor(h*bounds[p+1]);y++)for(let x=Math.floor(w*xf);x<Math.ceil(w*xt);x++)if(data[y*w+x]<145){points.push([x,y]);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
   if(points.length<100)throw Error('Missing paragraph '+(dates.length+1));
   let rotation=0,best=-Infinity;
   for(let deg=-5;deg<=5;deg+=.2){const r=deg*Math.PI/180,projection=new Map();for(const [x,y] of points){const row=Math.round((x-left)*Math.sin(r)+(y-top)*Math.cos(r));projection.set(row,(projection.get(row)||0)+1);}const score=[...projection.values()].reduce((a,n)=>a+n*n,0);if(score>best){best=score;rotation=Math.round(deg*10)/10;}}
   // Nearby rows sometimes touch through long pen strokes. Use the observed
   // number of source lines, then measure ink height within each line window.
   const number=dates.length+1,lineCount=lineCounts[number-1],heights=[];
   for(let row=0;row<lineCount;row++){const ys=points.filter(([,y])=>y>=top+(bottom-top+1)*row/lineCount&&y<top+(bottom-top+1)*(row+1)/lineCount).map(([,y])=>y).sort((a,b)=>a-b);heights.push(ys[Math.floor(ys.length*.98)]-ys[Math.floor(ys.length*.02)]+1);}
   heights.sort((a,b)=>a-b);let lineHeight=heights[Math.floor(heights.length/2)];
   // Paragraph 20 has overlapping tall strokes across line windows. Match its
   // optical letter height to the adjacent note written on the same sheet.
   if(number===20)lineHeight=72;
   dates.push({number,text:texts[number-1],sheet,sheetWidth:w,sheetHeight:h,x:Math.max(0,left-16),y:Math.max(0,top-16),width:right-left+33,height:bottom-top+33,lineHeight,lineCount,rotation});
  }
 }
 await fs.writeFile('dist/handwritten-back-data.js','window.HANDWRITTEN_BACKS = '+JSON.stringify(dates,null,2)+';\n');
 await fs.writeFile('handwritten-back-manifest.json',JSON.stringify(dates,null,2));
 // Archived scan preparation never overwrites the active typed messages.
 // Use prepare-yozai.cjs and the user's latest messages.json for active copy.
 console.log(JSON.stringify(dates.map(d=>({number:d.number,dimensions:[d.sheetWidth,d.sheetHeight],crop:[d.x,d.y,d.width,d.height],lines:d.lineCount,lineHeight:d.lineHeight,rotation:d.rotation}))));
})().catch(e=>{console.error(e);process.exitCode=1;});
