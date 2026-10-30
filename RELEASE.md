# 当前发布版本

发布目标是 https://lyhan16.github.io/slow-days/，仓库为 Lyhan16/slow-days。
向 main 推送后，现有 GitHub Pages 工作流发布 dist 目录。此网址公开访问。
.openai/hosting.json 仅记录历史 Sites 站点，本次不向该站点发布。

当前体验由淡入的 6 开场，滚轮、触摸或箭头进入白色相机工作台。
相机操作界面展示对应的照片／视频，以及 capture-copy.js 中的 20 条场景提示。
前 20 张出片后可以翻面、手动挂起；完成后单独揭晓第 21 张合照。
照片在出纸时就开始显影，放大时保留同一显影进度，出纸速度固定为 0.6 倍。

照片背面和日期采用选定的 B 悠哉字体，字体文件在 assets/fonts/yozai 本地托管。
21 条背面文字在 dist/memories.js；20 条拍摄前提示在 dist/capture-copy.js。
原始手写扫描和旧制作校验页保留供回溯，主页面已不再加载手写扫描渲染脚本。

本地浏览进度保存在当前域名的 localStorage 中。reset-progress.html 提供重置入口，
只清除 six-years-personal-v1 后回到首页，不修改照片、视频或文案。

验证命令：

- node qa-flow.cjs：20 张出片、翻面、手动收起、相册、结尾与第 21 张、焦点及显影衔接。
- node qa-yozai.cjs：最新原文、字体解码、字形覆盖及不同纸张尺寸的排版边界。
- node qa-audio.cjs：闪光和出纸音效生命周期、0.6 倍速同步及清理。
- node qa-release.cjs：页面资源、脚本、照片解码、视频 H.264/faststart 和字体文件完整性。

上述逻辑／原生字体和媒体检查不替代真实浏览器的视觉与试听检查。
浏览器自动化当前存在环境连接问题，发布记录需要保留这一验证边界。
