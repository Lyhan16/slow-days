/* Measured on the unchanged 1316 x 1195 photographic asset. Object-fit
   contain adds vertical padding in the square scene. Both camera layers and
   the paper use this square, so the mouth remains aligned at every size. */
(function(global){
  'use strict';
  const camera={width:1316,height:1195,slot:{left:452,right:929,y:117},paperInset:5};
  function slotLayout(sceneSize){
    const ratio=sceneSize/camera.width;
    const imageTop=(sceneSize-camera.height*ratio)/2;
    const width=(camera.slot.right-camera.slot.left-camera.paperInset*2)*ratio;
    const x=(camera.slot.left+camera.paperInset)*ratio;
    const mouthY=imageTop+camera.slot.y*ratio;
    const height=width*86/54;
    return{x,y:mouthY-height,width,height,mouthY,centerX:x+width/2};
  }
  function ropeY(x,width){const f=Math.max(0,Math.min(1,x/width));return 23+4*Math.min(18,width*.012)*f*(1-f);}
  global.KeepsakeGeometry={camera,slotLayout,ropeY};
})(typeof window!=='undefined'?window:globalThis);
