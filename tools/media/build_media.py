from pathlib import Path
import subprocess, sys, wave, json
import numpy as np

ROOT=Path(__file__).resolve().parents[2]
WORK=ROOT/'tools/media'
OUT=ROOT/'assets/media'
OUT.mkdir(parents=True,exist_ok=True)
sys.path.insert(0,str(WORK/'python_lib'))
import imageio_ffmpeg
FF=imageio_ffmpeg.get_ffmpeg_exe()
def run(args):
    subprocess.run([FF,'-hide_banner','-loglevel','error','-y',*map(str,args)],check=True)

# Original, deterministic synthesized instrumental. No third party music samples.
sr=44100
t=np.arange(sr*31)/sr
music=np.zeros_like(t)
notes=[(261.63,329.63,392),(220,261.63,329.63),(174.61,220,261.63),(196,246.94,293.66)]
for i,start in enumerate(np.arange(0,31,.5)):
    local=t-start
    env=np.where(local>=0,np.exp(-np.maximum(local,0)*2.8),0)
    freq=notes[(i//8)%4][i%3]
    music+=.115*env*(np.sin(2*np.pi*freq*local)+.25*np.sin(4*np.pi*freq*local))
music*=np.minimum(t/1.5,1)*np.clip((31-t)/1.5,0,1)
with wave.open(str(WORK/'original-music.wav'),'wb') as wav:
    wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(sr)
    wav.writeframes((music.clip(-1,1)*32767).astype('<i2').tobytes())

run(['-i',WORK/'source-waves.mp3','-t','20','-c:a','pcm_s16le',WORK/'waves-real.wav'])
clips=[
  (1,'source-waves.mp4',2,3,'海边到了','wide'),
  (2,'source-friends2.mp4',0,3,'一起走向海边','wide'),
  (3,'source-waves.mp4',12,4,'浪花靠近','crop'),
  (4,'source-friends.mp4',2,6,'同行的这一刻','wide'),
  (5,'source-waves.mp4',28,4,'慢慢看海','wide'),
  (6,'source-friends2.mp4',3,4,'风里的我们','crop'),
  (7,'source-waves.mp4',43,3,'再看一次浪花','crop'),
  (8,'source-friends.mp4',7,3,'一起留下的回忆','wide')]
manifest=[]
for id,src,start,duration,title,mode in clips:
    dest=OUT/f'clip-{id}.mp4'
    # Wide shots retain all companions, with a softened full-frame background.
    filt=('[0:v]split=2[bg][fg];[bg]scale=540:960:force_original_aspect_ratio=increase,crop=540:960,boxblur=24:2,eq=brightness=-0.06[back];'
          '[fg]scale=540:-2[front];[back][front]overlay=(W-w)/2:(H-h)/2,setsar=1,fps=25[v]') if mode=='wide' else '[0:v]scale=-2:960,crop=540:960,setsar=1,fps=25[v]'
    if not dest.exists(): run(['-ss',start,'-i',WORK/src,'-t',duration,'-filter_complex',filt,'-map','[v]','-an','-c:v','libx264','-preset','fast','-crf','24','-pix_fmt','yuv420p','-movflags','+faststart',dest])
    run(['-ss',min(1,duration/2),'-i',dest,'-frames:v','1','-q:v','3',OUT/f'clip-{id}.jpg'])
    manifest.append(dict(id=id,title=title,duration=duration,source=src,sourceStart=start,video=f'clip-{id}.mp4',thumbnail=f'clip-{id}.jpg'))

def make(short,voice,name):
    seq=[]
    for clip in manifest:
        dur=1 if short and clip['id'] in (3,5) else clip['duration']
        seq.append((clip,dur))
    total=sum(d for c,d in seq)
    args=[]
    for clip,dur in seq: args+=['-i',OUT/clip['video']]
    args+=['-i',WORK/'original-music.wav','-stream_loop','-1','-i',WORK/'waves-real.wav']
    filters=[]
    for idx,(clip,dur) in enumerate(seq): filters.append(f'[{idx}:v]trim=duration={dur},setpts=PTS-STARTPTS[v{idx}]')
    filters.append(''.join(f'[v{i}]' for i in range(8))+'concat=n=8:v=1:a=0[video]')
    # All sound is illustrative: real licensed waves are added to silent footage.
    # The same environmental bed remains; voice variants duck the music.
    musicvol="if(between(t,7,16),0.12,0.9)" if voice else '0.9'
    wavevol="if(between(t,7,16),1.5,0.45)" if voice else '0.22'
    filters.append(f"[8:a]atrim=duration={total},asetpts=PTS-STARTPTS,volume='{musicvol}':eval=frame[music]")
    filters.append(f"[9:a]atrim=duration={total},asetpts=PTS-STARTPTS,volume='{wavevol}':eval=frame[waves]")
    filters.append('[music][waves]amix=inputs=2:duration=first:normalize=0,volume=2.3,alimiter=limit=0.90[audio]')
    args+=['-filter_complex',';'.join(filters),'-map','[video]','-map','[audio]','-t',total,'-c:v','libx264','-preset','fast','-crf','24','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart',OUT/f'{name}.mp4']
    run(args)
    return dict(file=f'{name}.mp4',duration=total,environmentHighlighted=voice,shortened=short,sequence=[dict(clipId=c['id'],duration=d) for c,d in seq])

versions=[make(False,False,'base'),make(False,True,'voice'),make(True,False,'short'),make(True,True,'both')]
(OUT/'manifest.json').write_text(json.dumps(dict(width=540,height=960,fps=25,clips=manifest,versions=versions,audioDisclosure='海浪为另行加入的 CC0 实录，配乐为原创合成；视频原素材无声，非现场原音。'),ensure_ascii=False,indent=2),encoding='utf8')
print('Rendered',[(v['file'],v['duration']) for v in versions])
