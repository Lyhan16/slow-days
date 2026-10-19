const fs = require('node:fs/promises');
const path = require('node:path');
const ids = [1015,1016,1018,1020,1022,1035,1036,1037,1038,1039,1040,1043,1044,1050,1051,1053,1054,1056,1061,1067,1074];
const names = ['山间的风','路过一片海','去远一点的地方','偶然遇见','在路上','沿着光走','山外还有山','慢一点也很好','一起看风景','天色刚刚好','普通的一天','把时间放慢','云停了一会儿','风吹过的时候','不赶路的下午','一些小小的发现','远方来信','沿途的颜色','留一张给今天','还想再看一眼','下一张，留给以后'];
const out=path.join(__dirname,'dist','assets');
const results=[];
async function download(i){
  const url=`https://picsum.photos/id/${ids[i]}/640/860`;
  for(let attempt=0;attempt<3;attempt++){
    try{
      const r=await fetch(url,{signal:AbortSignal.timeout(30000)});
      if(!r.ok)throw Error(String(r.status));
      await fs.writeFile(path.join(out,`memory-${String(i+1).padStart(2,'0')}.jpg`),Buffer.from(await r.arrayBuffer()));
      const info=await fetch(`https://picsum.photos/id/${ids[i]}/info`,{signal:AbortSignal.timeout(15000)}).then(r=>r.json());
      results[i]={index:i+1,title:names[i],source:url,photographer:info.author,original:info.url};
      console.log(`Photo ${String(i+1).padStart(2,'0')} saved`);return;
    }catch(e){if(attempt===2)throw Error(`Photo ${i+1}: ${e.message}`);}
  }
}
(async()=>{await fs.mkdir(out,{recursive:true});for(let i=0;i<ids.length;i+=5)await Promise.all(ids.slice(i,i+5).map((_,j)=>download(i+j)));await fs.writeFile(path.join(__dirname,'photo-sources.json'),JSON.stringify(results,null,2));console.log('21 photographs ready');})().catch(e=>{console.error(e.message);process.exitCode=1});
