/* Per-photo windows into the original handwritten scans. No replacement font. */
(()=>{
'use strict';let serial=0;const ns='http://www.w3.org/2000/svg';
function el(tag,attrs={}){const node=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))node.setAttribute(k,String(v));return node;}
window.createPhotoBack=function(index){
 const d=window.HANDWRITTEN_BACKS[index];if(!d)return document.createElement('span');
 const svg=el('svg',{viewBox:'0 0 540 860',class:'handwritten-back',role:'img','aria-label':d.text,'data-back-number':index+1,focusable:'false'});
 const id='back-ink-'+(++serial),defs=el('defs'),filter=el('filter',{id,x:0,y:0,width:540,height:860,filterUnits:'userSpaceOnUse','color-interpolation-filters':'sRGB'});
 filter.append(el('feColorMatrix',{type:'matrix',values:'0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -.299 -.587 -.114 1 0'}));
 const transfer=el('feComponentTransfer');transfer.append(el('feFuncA',{type:'linear',slope:1.2,intercept:-.08}));filter.append(transfer);defs.append(filter);svg.append(defs);
 const r=d.rotation*Math.PI/180,rotW=d.width*Math.abs(Math.cos(r))+d.height*Math.abs(Math.sin(r)),rotH=d.height*Math.abs(Math.cos(r))+d.width*Math.abs(Math.sin(r));
 const scale=Math.min(40/d.lineHeight,436/rotW,650/rotH),ink=el('g',{filter:`url(#${id})`}),pose=el('g',{transform:`translate(270 430) rotate(${d.rotation}) scale(${scale})`});
 const crop=el('svg',{x:-d.width/2,y:-d.height/2,width:d.width,height:d.height,viewBox:`0 0 ${d.width} ${d.height}`,overflow:'hidden'});
 crop.append(el('image',{href:d.sheet,x:-d.x,y:-d.y,width:d.sheetWidth,height:d.sheetHeight,preserveAspectRatio:'none'}));pose.append(crop);ink.append(pose);svg.append(ink);return svg;
};
})();
