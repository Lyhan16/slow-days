(()=>{
'use strict';
const button=document.getElementById('reset-progress');
button.addEventListener('click',()=>{
 try{
  // Match the site's progress key; preserve unrelated browser data/settings.
  localStorage.removeItem('six-years-personal-v1');
  button.disabled=true;
  document.getElementById('reset-status').textContent='已经重置，正在回到首页。';
  location.replace('anniversary.html');
 }catch{
  document.getElementById('reset-status').textContent='暂时无法重置，请在浏览器允许保存网站数据后重试。';
 }
});
})();
