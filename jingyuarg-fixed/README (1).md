# 静愈心理医院

一个跑在浏览器里的中文网页解谜（ARG）作品。

你会打开一台陌生人的电脑：桌面、聊天记录、论坛热帖、一个心理医院的官网 ——
线索散落在这些地方，拼起来才是完整的故事。

> ⚠️ **内容提示**
> 本作是虚构的悬疑解谜作品，剧情涉及抑郁、失眠、自伤、家庭创伤等主题，
> 部分过场包含突然的音效与画面闪烁。如果这些内容会让你不适，请随时停止游玩。
> 如果你或身边的人正在被情绪困扰，请把它交给专业的人 —— 心理援助热线 **12356**，
> 或前往正规医院的精神心理科。

---

## 开始游玩

1. 部署到 **GitHub Pages**（或任意静态服务器）后打开站点首页。
2. 也可以本地起一个静态服务器预览：

   ```bash
   npx serve .
   # 或 VS Code 的 Live Server 插件
   ```

   **请不要直接双击 `index.html`**：`file://` 协议下浏览器会把 iframe 当成不透明来源，
   `localStorage`、摄像头权限和跨窗口样式注入都会受限。
3. 开机密码在故事里，不在代码里。

进不去的时候，桌面左下角 **开始菜单 → 游戏说明** 里有完整的操作说明；
被 **朱笔圈点** 标出来的词，就是可以拿去搜索的关键词。

---

## 目录结构

```
index.html          桌面（锁屏、图标、窗口管理、任务栏、开始菜单）
help.html           游戏说明（无剧透）

wechat.html         薇信（聊天记录 + 朋友圈）
tieba.html          贴吧
recycle.html        回收站（解压 jingyu.7z）

jingyu.html         静愈心理医院首页（带搜索框）
  jianjie / keshi / zhuanjia / jiuzhen / contact   医院常规页面
  jxin / yiyu / wugan / shen / zhiliao / idea     科普与文章
  wenjuan.html      心理状态自测问卷
  tel.html          医院内部紧急电话
  research.html     操作员身份认证
  wangyu.html       讣告
  linwan.html       病例（已损坏）

eye.html            过场：蒙眼与回忆
yanguang.html       过场：验光机
inside.html         里世界（带第二套搜索框）
  ji / self / other / shencongliang / kill
  xueyue / zhennian / wangnian / enian / wuguanshangshen / lushen

real.html           结局分支
  real1 / real2 / self_end1 / self_end2 / uuu / egg

—— 共用资源 ——
arg-ui.css / arg-ui.js        全站视觉与交互层（含关键词提示条、静音桥接）
keywords.css / keywords.js    把可搜索的关键词圈出来
zhongshi.css / zhongshi.js    里世界的中式恐怖主题
horror.css / horror.js        eye / yanguang 两段过场的恐怖氛围引擎
end-cinema.css / end-cinema.js  结局的电影化演出
desktop-app.js                应用页面侧的窗口适配
```

---

## 技术说明

- **纯静态**：没有构建步骤，没有依赖，`git push` 即可发布。
- **窗口化桌面**：`index.html` 用 iframe 承载各个应用页面，自己实现窗口拖动、
  最小化飞入任务栏、最大化、右键关闭、**拖进回收站删除**（带动画与碎片粒子）。
- **音效全部实时合成**：桌面、过场、里世界的声音都用 WebAudio 现场生成，
  仓库里只有剧情用的三个音频文件，不额外增加体积。
- **双保险的窗口适配**：应用页面自己通过 `desktop-app.js` 隐藏自带标题栏并接管
  最小化，不依赖父页面能否读取子文档，`file://` 与受限环境下同样成立。
- **无障碍与舒适度**：全站遵循系统的「减少动态效果」设置；
  托盘 `🔊` 可以一键静音（含所有应用内的音效）；
  阻塞式的 `alert` 全部换成了页内提示条。

---

## 反馈

发现 bug 或有改进建议，欢迎提 Issue。
如果这个故事让你想起了谁，去看看他吧。
