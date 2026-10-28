"""Render only after all 12 real browser screenshots exist.

This is a captioned screenshot walkthrough with dynamic sample-video inserts,
explicitly labelled as screenshot demonstration, not a continuous screen recording.
Usage: python tools/media/build_walkthrough.py
"""
from pathlib import Path
import subprocess,sys,json

ROOT=Path(__file__).resolve().parents[2]
WORK=ROOT/'tools/media'
SHOTS=ROOT/'tmp/screens'
BUILD=WORK/'walkthrough-build'
OUT=ROOT/'downloads/walkthrough.mp4'
sys.path.insert(0,str(WORK/'python_lib'))
import imageio_ffmpeg
FF=imageio_ffmpeg.get_ffmpeg_exe()
FONT='C:/Windows/Fonts/msyh.ttc'
def esc(p): return str(p).replace('\\','/').replace(':','\\:')
def run(args):
    subprocess.run([FF,'-hide_banner','-loglevel','error','-y',*map(str,args)],check=True)

# Durations sum to 150 seconds. All screenshots are captured from the actual app.
scenes=[
 dict(shot='01-home',duration=10,title='01 / 从一个想留下的瞬间开始',caption='旅行结束，手机里有零散视频。\n「这一刻」帮助用户围绕重要片段，组织自己的回忆。'),
 dict(shot='02-select',duration=12,title='02 / 先选择素材，再告诉 AI 哪段重要',caption='载入示例，预览并选择想用的片段。\n标记「必须保留」，让用户的个人意义先于画面评分。'),
 dict(shot='03-intent',duration=12,title='03 / 一句话，表达这条视频想留下什么',caption='输入想表达的内容，并确认节奏与画幅。\n本 Demo 使用预设内容模拟 AI 理解，输入与素材选择会被保留。'),
 dict(shot='04-generating',duration=8,title='04 / 看得见进度，也能随时返回',caption='展示生成中的处理步骤，支持取消。\n返回后保留选择与输入，避免从头再来。'),
 dict(shot='05-result',duration=10,title='05 / 一条可播放、可继续修改的草稿',caption='预览成片，并查看使用的片段结构。\n以下插播展示实际可播放的 30 秒示例结果。'),
 dict(video='base',start=0,duration=12,title='实际样片 / 标准版本',caption='朋友同行，是这条视频的记忆重点。\n视频来自已许可素材；海浪为后期加入的实录示例音。'),
 dict(shot='06-edits',duration=12,title='06 / 局部修改，保留满意的部分',caption='选择「突出海浪声」或「缩短海景」。\n修改有明确范围，并能撤销，不必重新抽取整条结果。'),
 dict(video='voice',start=6,duration=12,title='实际样片 / 突出海浪声',caption='7—16 秒降低配乐，突出海浪实录。\n请听修改前后的差异；它不是素材拍摄现场原音。'),
 dict(shot='07-compare',duration=10,title='07 / 比较两个版本，再决定是否保留',caption='回看原版与修改版，确认自己的表达是否更清楚。\n缩短海景后总时长从 30 秒变为 24 秒，必留片段继续保留。'),
 dict(shot='08-failure',duration=10,title='08 / 生成失败，也不丢失前面的选择',caption='演示失败状态与明确的恢复入口。\n说明当前结果没有完成，保留素材和输入，允许重试。'),
 dict(shot='09-retry',duration=8,title='09 / 从失败中恢复',caption='重试沿用已保存的创作设置。\n等待过程中仍可返回，成功后重新进入结果预览。'),
 dict(shot='10-done',duration=10,title='10 / 下载完成，还能继续编辑',caption='下载可播放的视频文件，完成核心任务。\n用户仍可继续调整、重新创作，或查看作品说明。'),
 dict(shot='11-thinking',duration=12,title='产品判断 / 帮用户表达，而不只是自动剪辑',caption='第一版只验证重要片段、意图输入与局部修改。\n最大风险：多表达一步，却没有让结果明显更合心意。'),
 dict(shot='12-ai',duration=12,title='制作记录 / 让 AI 的作用与边界可检查',caption='AI 协助策划、页面实现、素材处理与检查。\n网站公开展示模拟边界、素材来源和实际修改记录。'),
]

TEXTS={}
def textfile(name,text):
    p=BUILD/name;p.write_text(text,encoding='utf8');TEXTS[esc(p)]=(p,text);return esc(p)
def draw(file,size,x,y,color='white',spacing=8):
    # Microsoft YaHei font collection has oversized multiline metrics in FFmpeg.
    # Draw separate lines with explicit coordinates to keep captions inside frame.
    path,content=TEXTS[file]
    lines=content.split('\n')
    filters=[]
    for index,line in enumerate(lines):
        if not line:continue
        linepath=path.with_name(path.stem+f'-line{index}.txt')
        linepath.write_text(line,encoding='utf8')
        line_y=y+index*(size+spacing)
        filters.append(f"drawtext=fontfile='{esc(FONT)}':textfile='{esc(linepath)}':fontsize={size}:fontcolor={color}:x={x}:y={line_y}")
    return ','.join(filters)

def main():
    expected=[SHOTS/(s['shot']+'.png') for s in scenes if 'shot'in s]
    missing=[str(p.relative_to(ROOT)) for p in expected if not p.is_file()]
    if missing: raise SystemExit('Screenshots incomplete; no video rendered. Missing: '+', '.join(missing))
    if sum(s['duration'] for s in scenes)!=150:raise SystemExit('Duration must be 150 seconds')
    BUILD.mkdir(parents=True,exist_ok=True);OUT.parent.mkdir(parents=True,exist_ok=True)
    label=textfile('label.txt','实际页面截图操作演示 · 非连续录屏')
    parts=[]
    for index,s in enumerate(scenes):
        title=textfile(f'{index:02}-title.txt',s['title'])
        caption=textfile(f'{index:02}-caption.txt',s['caption'])
        dest=BUILD/f'{index:02}.mp4'
        dur=s['duration']
        if 'shot'in s:
            args=['-loop','1','-i',SHOTS/(s['shot']+'.png'),'-stream_loop','-1','-i',WORK/'original-music.wav']
            filt=('[0:v]scale=1024:640:force_original_aspect_ratio=decrease,pad=1024:640:(ow-iw)/2:(oh-ih)/2:color=0xf8f7f4,'
                  'pad=1280:720:128:0:color=0x172b25,'
                  'drawbox=x=0:y=0:w=1280:h=46:color=0x172b25@0.96:t=fill,'+
                  draw(title,21,24,10)+','+draw(label,15,'w-tw-24',15,'0xd4e9df')+','+
                  'drawbox=x=0:y=638:w=1280:h=82:color=0x172b25:t=fill,'+draw(caption,21,30,645,spacing=9)+
                  f',setsar=1,fade=t=in:st=0:d=0.35,fade=t=out:st={dur-.35}:d=0.35[v];[1:a]volume=0.35,atrim=duration={dur},afade=t=in:d=0.2,afade=t=out:st={dur-.3}:d=0.3[a]')
        else:
            args=['-ss',s['start'],'-i',ROOT/'assets/media'/(s['video']+'.mp4')]
            samplelabel=textfile(f'{index:02}-sample.txt','动态样片插播\n\n预制示例成片\n非实时 AI 生成\n\n画面：Pexels 许可素材\n海浪：straget / CC0\n配乐：原创程序合成')
            filt=('[0:v]scale=338:600,pad=1280:720:125:56:color=0x172b25,'+draw(title,27,525,100)+','+
                  draw(samplelabel,23,525,170,'0xd4e9df',12)+','+draw(caption,20,30,645,spacing=9)+
                  f',setsar=1,fade=t=in:st=0:d=0.35,fade=t=out:st={dur-.35}:d=0.35[v];[0:a]atrim=duration={dur},afade=t=in:d=0.2,afade=t=out:st={dur-.3}:d=0.3[a]')
        run([*args,'-filter_complex',filt,'-map','[v]','-map','[a]','-t',dur,'-r','25','-c:v','libx264','-preset','fast','-crf','23','-pix_fmt','yuv420p','-c:a','aac','-ar','44100','-ac','2','-b:a','112k','-movflags','+faststart',dest])
        parts.append(dest)
    listing=BUILD/'concat.txt';listing.write_text('\n'.join("file '"+str(p).replace('\\','/')+"'" for p in parts),encoding='utf8')
    run(['-f','concat','-safe','0','-i',listing,'-c','copy','-movflags','+faststart',OUT])
    check=subprocess.run([FF,'-v','error','-i',str(OUT),'-f','null','NUL'],capture_output=True,text=True)
    if check.returncode:raise RuntimeError(check.stderr)
    (BUILD/'scenes.json').write_text(json.dumps(scenes,ensure_ascii=False,indent=2),encoding='utf8')
    print('Rendered and decoded:',OUT,'150 seconds',OUT.stat().st_size,'bytes')

if __name__=='__main__':main()
