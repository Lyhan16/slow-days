/* One typed Yozai face for dates and photo-back messages. */
(()=>{
'use strict';
window.createPhotoDate=function(index){
 const label=document.createElement('span');label.className='photo-date-label';label.textContent=window.PHOTO_DATES[index];label.setAttribute('data-date-number',String(index+1));return label;
};
window.createPhotoBack=function(index){
 const text=window.MEMORIES[index].text,writing=document.createElement('span');writing.className='photo-back-copy';writing.textContent=text;writing.setAttribute('aria-label',text);writing.setAttribute('data-back-number',String(index+1));return writing;
};
})();
