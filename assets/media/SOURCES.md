# 示例媒体来源与使用说明

核对日期：2026-10-28。人物均为素材中的模特，不代表本产品使用者，也不表示其认可本产品。片段为概念演示素材，不是求职者本人旅行记录。

## 视频

1. **Friends Walking In The Beach — Kampus Production**  
   原页面：https://www.pexels.com/video/friends-walking-in-the-beach-7566339/  
   下载：https://videos.pexels.com/video-files/7566339/7566339-hd_1920_1080_25fps.mp4  
   用于 clip-4、clip-8；分别截取 2–8 秒、7–10 秒。
2. **Friends Walking Around the Beach — Kampus Production**  
   原页面：https://www.pexels.com/video/friends-walking-around-the-beach-7566338/  
   下载：https://videos.pexels.com/video-files/7566338/7566338-hd_1920_1080_25fps.mp4  
   用于 clip-2、clip-6；分别截取 0–3 秒、3–7 秒。
3. **Peaceful Ocean Waves on Sandy Beach — Engin Akyurt**  
   原页面：https://www.pexels.com/video/peaceful-ocean-waves-on-sandy-beach-32190868/  
   下载：https://videos.pexels.com/video-files/32190868/13727955_2048_1080_30fps.mp4  
   用于 clip-1、clip-3、clip-5、clip-7；分别截取 2–5、12–16、28–32、43–46 秒。

以上三段依 **Pexels License** 使用：https://www.pexels.com/license/ 。许可允许免费使用及修改照片与视频，并明确列举网站、应用用途。禁止暗示人物或品牌背书、将未修改素材作为库存素材转售/再分发等。本站只以剪裁、压缩后的片段和编辑成片展示原型，不经营素材库。

处理：截取、裁切/保留横幅画面并添加模糊背景、转为 540×960、25fps、H.264。缩略图为对应视频帧，由 FFmpeg 提取。

首页 hero.jpg：从 Kampus Production 的 7566339 号视频第 2.6 秒抽帧，裁切原画面 x=760、y=0、864×1080 区域，缩放为800×1000。没有生成或补画人物，许可同上。

## 海浪实录

**Big waves hit land.wav — straget**  
原页面：https://freesound.org/people/straget/sounds/412308/  
试听下载：https://cdn.freesound.org/previews/412/412308_7707368-hq.mp3  
许可：CC0 1.0 https://creativecommons.org/publicdomain/zero/1.0/ 。原页面明确允许复制、修改、分发及商业用途，无需另行征求许可。

处理：取试听文件中的短段，调节音量，与音乐混合。三段 Pexels 视频本身没有音轨；**海浪是后期加入的示例环境音，不是画面拍摄现场原音，更不是人物真实笑声。** “突出海浪声”版本用于展示用户通过局部指令调节混音的产品机制。

## 配乐

原创程序合成的简短器乐音型（正弦波及泛音、四组和弦、衰减包络），由本项目制作，无第三方音乐采样。制作代码：tools/media/build_media.py。音色为合成器，不声称是真实乐器录音。

## 版本

| 文件 | 时长 | 区别 |
|---|---:|---|
| base.mp4 | 30 秒 | 标准配乐与海浪混音 |
| voice.mp4 | 30 秒 | 7–16 秒压低配乐，突出海浪示例音 |
| short.mp4 | 24 秒 | clip-3、clip-5 各由4秒缩为1秒 |
| both.mp4 | 24 秒 | 同时应用缩短与突出海浪声 |

完整片段映射见 manifest.json。所有成片均为预先渲染，用于演示产品概念，不代表真实模型实时生成。
