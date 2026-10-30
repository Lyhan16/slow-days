/* Original scanned pen marks, displayed through individual SVG pixel windows.
   No replacement font, OCR reconstruction, or regenerated handwriting. */
(()=>{
'use strict';let serial=0;const ns='http://www.w3.org/2000/svg';
function el(tag,attrs={}){const node=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))node.setAttribute(k,String(v));return node;}
window.createPhotoDate=function(index){
 const d=window.HANDWRITTEN_DATES[index];if(!d)return document.createElement('span');
 const svg=el('svg',{viewBox:'0 0 420 140',class:'handwritten-date',role:'img','aria-label':d.label,'data-date-number':index+1,focusable:'false'});
 const id='date-ink-'+(++serial),defs=el('defs'),filter=el('filter',{id,x:0,y:0,width:420,height:140,filterUnits:'userSpaceOnUse','color-interpolation-filters':'sRGB'});
 filter.append(el('feColorMatrix',{type:'matrix',values:'0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -.299 -.587 -.114 1 0'}));
 const transfer=el('feComponentTransfer');transfer.append(el('feFuncA',{type:'linear',slope:1.2,intercept:-.08}));filter.append(transfer);defs.append(filter);svg.append(defs);
 const radians=d.rotation*Math.PI/180,rotW=d.width*Math.abs(Math.cos(radians))+d.height*Math.abs(Math.sin(radians)),rotH=d.height*Math.abs(Math.cos(radians))+d.width*Math.abs(Math.sin(radians));
 const scale=Math.min(58/d.yearHeight,396/rotW,128/rotH),ink=el('g',{filter:`url(#${id})`}),pose=el('g',{transform:`translate(210 70) rotate(${d.rotation}) scale(${scale})`});
 const crop=el('svg',{x:-d.width/2,y:-d.height/2,width:d.width,height:d.height,viewBox:`0 0 ${d.width} ${d.height}`,overflow:'hidden'});
 crop.append(el('image',{href:d.sheet,x:-d.x,y:-d.y,width:d.sheetWidth,height:d.sheetHeight,preserveAspectRatio:'none'}));pose.append(crop);ink.append(pose);svg.append(ink);return svg;
};
})();
