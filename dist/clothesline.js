/* A pegged photo is an angular spring: mass .35, frequency 1.35 Hz,
   damping ratio .30. Its pivot is the rope/peg intersection. A passing pointer
   supplies a small impulse; the oscillation decays instead of looping.
   Native horizontal scrolling contains all 21 photographs without shrinking
   their physical frame into slivers. No window scroll listener is used. */
(function(global){
  'use strict';
  global.createMemoryLine=function({memories,onOpen}){
    const $=id=>document.getElementById(id);
    const viewport=$('line-viewport'),track=$('line-track'),host=$('hanging-photos');
    const items=[];let width=0,cardWidth=100,step=140,busy=false,paging=false,windHeld=false,releaseDistance=0;
    // A shared wind bends each print about its own peg. Negative angles move
    // the bottom edge right; left paging therefore requests negative wind.
    const wind=new Feel.Body({mass:1,freq:2.8,zeta:.82,x:0,target:0,restX:.03,restV:.1,onFrame:()=>{for(const item of items)Feel.paint(styles(item,item.body));}});
    const page=new Feel.Body({mass:1,freq:1.8,zeta:1,x:0,target:0,min:0,max:0,restX:.5,restV:1.5,onFrame:b=>{viewport.scrollLeft=b.x;if(paging&&windHeld&&Math.abs(b.target-b.x)<=releaseDistance){windHeld=false;wind.to(0);}navigation();},onSettle:()=>{paging=false;windHeld=false;wind.to(0);}});
    function styles(item,b){return [[item.wrapper,{transform:`rotateZ(${item.tilt+b.x+wind.x}deg) rotateY(${(b.x+wind.x)*.35}deg)`}]];}
    function stopPage(){page.interrupt();Feel.loop.remove(page);page.x=viewport.scrollLeft;page.v=0;page.target=page.x;paging=false;windHeld=false;wind.to(0);}
    function turnPage(direction){
      if(busy)return;const max=Math.max(0,width-viewport.clientWidth),origin=paging?page.target:viewport.scrollLeft,target=Math.max(0,Math.min(max,origin+direction*step*3));if(Math.abs(target-origin)<1)return;
      page.interrupt();page.x=viewport.scrollLeft;page.min=0;page.max=max;paging=true;windHeld=true;releaseDistance=Math.max(3,Math.abs(target-page.x)*.2);wind.to(direction*6);page.to(target);
    }
    function make(index){
      const memory=memories[index],wrapper=document.createElement('div');wrapper.className='hanging-item';wrapper.id=`hanging-${index}`;
      const clip=document.createElement('span');clip.className='wood-clip';clip.setAttribute('aria-hidden','true');clip.append(document.createElement('i'));
      const card=document.createElement('button');card.className='hanging-card';card.setAttribute('data-memory-index',String(index));card.setAttribute('aria-label',`查看第 ${index+1} 张，${memory.title}`);
      const image=new Image();image.className='hanging-image';image.dataset.photo=String(index+1);image.src=memory.image;image.alt=memory.alt;image.draggable=false;
      const caption=document.createElement('span');caption.className='hanging-caption';caption.append(window.createPhotoDate(index));
      card.append(image,caption);wrapper.append(clip,card);host.append(wrapper);
      const item={index,wrapper,card,tilt:[-1.8,1.4,-.7,1.9,-1.2,.6][index%6],body:null};
      item.body=new Feel.Body({mass:.35,freq:1.35,zeta:.30,x:0,target:0,restX:.02,restV:.04,onFrame:b=>Feel.paint(styles(item,b))});
      // Render the sum of local swing and shared wind in one physical loop.
      Feel.paint(styles(item,item.body));
      card.addEventListener('click',()=>{if(!busy)onOpen(index,card);});
      card.addEventListener('pointerenter',e=>{
        if(busy||Feel.reducedMotion)return;const rect=card.getBoundingClientRect();const sign=e.clientX<rect.x+rect.width/2?-1:1;item.body.kick(sign*13);
      });
      card.addEventListener('pointermove',e=>{
        if(busy||Feel.reducedMotion||e.pointerType==='touch')return;const rect=card.getBoundingClientRect();const p=Math.max(-1,Math.min(1,((e.clientX-rect.x)/rect.width-.5)*2));item.body.to(p*.9);
      });
      card.addEventListener('pointerleave',()=>item.body.to(0));
      card.addEventListener('focus',()=>{if(!busy&&!Feel.reducedMotion)item.body.kick(7);});
      card.addEventListener('blur',()=>item.body.to(0));
      return item;
    }
    function resize(){
      const available=viewport.clientWidth||innerWidth,height=(viewport.clientHeight||260)-52;
      cardWidth=Math.max(68,Math.min(innerWidth<768?108:136,(height-57)*54/86));step=cardWidth+(innerWidth<768?29:44);
      const padding=innerWidth<768?30:70;
      width=Math.max(available,items.length?items.length*step-(step-cardWidth)+padding*2:available);
      track.style.width=`${width}px`;
      const start=items.length?(width-(items.length-1)*step-cardWidth)/2:0;
      for(const item of items){const x=start+item.index*step;item.wrapper.style.left=`${x}px`;item.wrapper.style.top=`${KeepsakeGeometry.ropeY(x+cardWidth/2,width)-9}px`;item.wrapper.style.width=`${cardWidth}px`;}
      const sag=Math.min(18,width*.012);const curve=`M -24 23 Q ${width/2} ${23+2*sag} ${width+24} 23`;
      $('rope').setAttribute('viewBox',`0 0 ${width} ${height}`);for(const p of $('rope').querySelectorAll('path'))p.setAttribute('d',curve);
      $('line-empty').hidden=items.length>0;navigation();
    }
    function navigation(){
      const overflow=width>viewport.clientWidth+4;$('line-navigation').hidden=!overflow;
      const offset=viewport.scrollLeft||0;$('line-previous').disabled=offset<=2;$('line-next').disabled=offset+viewport.clientWidth>=width-2;
      const visible=items.filter(item=>{const left=parseFloat(item.wrapper.style.left)||0;return left+cardWidth>offset&&left<offset+viewport.clientWidth;});
      const first=visible.length?visible[0].index+1:0,last=visible.length?visible[visible.length-1].index+1:0;
      $('line-range').textContent=`${first}-${last} / ${items.length}`;
    }
    function sync(count){
      while(items.length>count){const item=items.pop();item.body.interrupt();Feel.loop.remove(item.body);item.wrapper.remove();}
      while(items.length<count)items.push(make(items.length));resize();setBusy(busy);
    }
    function reveal(index){
      const item=items[index];if(!item)return;const center=parseFloat(item.wrapper.style.left)+cardWidth/2;
      stopPage();
      viewport.scrollLeft=Math.max(0,Math.min(width-viewport.clientWidth,center-viewport.clientWidth/2));navigation();
    }
    function rect(index){return items[index].card.getBoundingClientRect();}
    function pending(index,on){items[index].card.style.visibility=on?'hidden':'visible';}
    function swing(index,impulse=10){if(!Feel.reducedMotion)items[index]?.body.kick(impulse);}
    function setBusy(on){busy=on;if(on)stopPage();for(const item of items)item.card.disabled=on;viewport.inert=on;$('line-previous').disabled=on||viewport.scrollLeft<=2;$('line-next').disabled=on||viewport.scrollLeft+viewport.clientWidth>=width-2;}
    $('line-previous').addEventListener('click',()=>turnPage(-1));
    $('line-next').addEventListener('click',()=>turnPage(1));
    viewport.addEventListener('pointerdown',stopPage,{passive:true});viewport.addEventListener('wheel',stopPage,{passive:true});
    viewport.addEventListener('scroll',navigation,{passive:true});
    return{sync,resize,reveal,rect,pending,swing,setBusy,card:index=>items[index]?.card,get count(){return items.length;}};
  };
})(window);
