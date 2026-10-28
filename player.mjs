import {buildTimeline,getVariant,isCanonical} from './core.mjs';

export function locateTime(timeline,seconds){
 if(!timeline.length)return null;
 const duration=timeline.at(-1).end;
 const time=Math.max(0,Math.min(duration,Number.isFinite(seconds)?seconds:0));
 let index=timeline.findIndex(c=>time<c.end);if(index<0)index=timeline.length-1;
 return {index,offset:time-timeline[index].start,time};
}
export function mixLevels(timeline,voice,time){
 const anchor=timeline.find(c=>c.isAnchor);
 return voice&&anchor&&time>=Math.max(0,anchor.start-3)&&time<anchor.end?{music:.12,waves:1.5}:{music:.9,waves:.22};
}
const abortError=()=>new DOMException('操作已取消','AbortError');
function mediaError(video){return new Error(video.error?.code===4?'浏览器无法播放此视频格式，请使用新版 Chrome 或 Edge。':'视频读取失败，请检查网络后重试。');}

export class MemoryPlayer{
 constructor(video,{onTime=()=>{},onState=()=>{},onError=()=>{}}={}){
  this.video=video;this.callbacks={onTime,onState,onError};this.timeline=[];this._time=0;this._playing=false;this._generation=0;this._index=-1;this._muted=false;this._switching=false;this._playToken=0;this._projectToken=0;this._transitionToken=0;
  video.playsInline=true;video.controls=false;video.preload='auto';
  this._ended=()=>{if(this.canonical)this._finish();else this._next();};
  this._error=()=>{if(!this._cancelLoad){this.pause();this.callbacks.onError(mediaError(video));}};
  video.addEventListener('ended',this._ended);
  video.addEventListener('error',this._error);
 }
 get duration(){return this.timeline.at(-1)?.end||0;}
 get time(){return this._time;}
 get playing(){return this._playing;}
 _notify(){this.callbacks.onTime({time:this.time,duration:this.duration,playing:this.playing});}
 _state(value){this._playing=value;this.callbacks.onState({playing:value});this._notify();}
 async _load(src,offset=0){
  const generation=++this._generation;
  this._cancelLoad?.();
  await new Promise((resolve,reject)=>{
   let timeout;
   const cleanup=()=>{clearTimeout(timeout);this.video.removeEventListener('loadedmetadata',ready);this.video.removeEventListener('error',fail);if(this._cancelLoad===cancel)this._cancelLoad=null;};
   const cancel=()=>{cleanup();reject(abortError());};
   const ready=()=>{cleanup();if(generation!==this._generation)return reject(abortError());this.video.currentTime=Math.min(offset,Number.isFinite(this.video.duration)?this.video.duration:offset);resolve();};
   const fail=()=>{cleanup();reject(mediaError(this.video));};
   this._cancelLoad=cancel;this.video.addEventListener('loadedmetadata',ready);this.video.addEventListener('error',fail);
   timeout=setTimeout(()=>{cleanup();reject(new Error('视频加载超时，请检查网络后重试。'));},25000);
   this.video.src=src;this.video.load();
  });
 }
 async setProject(state,{original=false}={}){
  const project=++this._projectToken;this._transitionToken++;this._switching=false;
  this.pause();this.state={...state,voice:original?false:state.voice,short:original?false:state.short};
  this.timeline=buildTimeline(this.state);this.canonical=isCanonical(this.state);this._time=0;this._index=0;
  this.video.muted=this.canonical?this._muted:true;
  this._audio?.music.pause();this._audio?.waves.pause();
  try{if(this.timeline.length)await this._load(this.canonical?`assets/media/${getVariant(this.state)}.mp4`:this.timeline[0].src);if(project===this._projectToken)this._notify();}
  catch(e){if(e.name!=='AbortError'){this.callbacks.onError(e);throw e;}}
 }
 _ensureAudio(){
  if(this._audio)return this._audio;
  const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)throw new Error('此浏览器不支持音频混合，请使用新版 Chrome 或 Edge。');
  const context=new C(),master=context.createGain();master.gain.value=this._muted?0:2.3;master.connect(context.destination);
  const music=new Audio('assets/media/music.m4a'),waves=new Audio('assets/media/waves.m4a');
  const musicGain=context.createGain(),wavesGain=context.createGain();
  for(const [element,gain] of [[music,musicGain],[waves,wavesGain]]){element.loop=true;element.preload='auto';context.createMediaElementSource(element).connect(gain);gain.connect(master);}
  return this._audio={context,master,music,waves,musicGain,wavesGain};
 }
 _mix(){if(!this._audio)return;const levels=mixLevels(this.timeline,this.state.voice,this.time);this._audio.musicGain.gain.value=levels.music;this._audio.wavesGain.gain.value=levels.waves;}
 async play(){
  if(!this.timeline.length||this._playing)return;
  const token=++this._playToken;
  try{
   // Create and resume in the original click stack, before awaiting video metadata.
   if(!this.canonical){const a=this._ensureAudio();await a.context.resume();this._mix();await Promise.all([a.music.play(),a.waves.play()]);}
   if(token!==this._playToken){this._audio?.music.pause();this._audio?.waves.pause();return;}
   if(this.time>=this.duration)await this.seek(0);
   if(token!==this._playToken)return;
   this._state(true);await this.video.play();this._tick();
  }catch(e){if(e.name!=='AbortError'){this.pause();this.callbacks.onError(new Error(e.name==='NotAllowedError'?'请点击播放按钮，允许浏览器播放声音。':e.message));}}
 }
 pause(){this._playToken++;this.video.pause();this._audio?.music.pause();this._audio?.waves.pause();cancelAnimationFrame(this._raf);this._state(false);}
 toggle(){return this.playing?this.pause():this.play();}
 setMuted(value){this._muted=!!value;this.video.muted=this.canonical?this._muted:true;if(this._audio)this._audio.master.gain.value=this._muted?0:2.3;}
 async seek(seconds){
  const target=locateTime(this.timeline,seconds);if(!target)return;
  const playing=this.playing,token=this._playToken,project=this._projectToken,transition=++this._transitionToken;this._switching=false;this._time=target.time;
  const current=()=>project===this._projectToken&&transition===this._transitionToken;
  try{
   if(this.canonical)this.video.currentTime=target.time;
   else if(this._index!==target.index){this._index=target.index;this._switching=true;await this._load(this.timeline[this._index].src,target.offset);if(!current())return;this._switching=false;if(playing&&this.playing&&token===this._playToken)await this.video.play();}
   else this.video.currentTime=target.offset;
   if(!current())return;
   if(this._audio)for(const a of [this._audio.music,this._audio.waves])if(Number.isFinite(a.duration)&&a.duration>0)a.currentTime=target.time%a.duration;
   this._mix();this._notify();
  }catch(e){if(e.name!=='AbortError'&&current()){this.pause();this.callbacks.onError(e);}}
  finally{if(current())this._switching=false;}
 }
 _tick(){
  cancelAnimationFrame(this._raf);if(!this.playing)return;
  if(!this._switching){this._time=this.canonical?Math.min(this.duration,this.video.currentTime):Math.min(this.timeline[this._index].end,this.timeline[this._index].start+this.video.currentTime);this._mix();this._notify();
   if(!this.canonical&&this.video.currentTime>=this.timeline[this._index].duration-.015)this._next();
  }
  this._raf=requestAnimationFrame(()=>this._tick());
 }
 async _next(){
  if(this._switching||!this.playing)return;
  if(this._index>=this.timeline.length-1){this._finish();return;}
  this._switching=true;const token=this._playToken,project=this._projectToken,transition=++this._transitionToken;
  const current=()=>project===this._projectToken&&transition===this._transitionToken;
  this._index++;this._time=this.timeline[this._index].start;
  this._audio?.music.pause();this._audio?.waves.pause();
  try{await this._load(this.timeline[this._index].src);if(current()&&token===this._playToken&&this.playing){
   if(this._audio){for(const a of [this._audio.music,this._audio.waves])if(Number.isFinite(a.duration)&&a.duration>0)a.currentTime=this.time%a.duration;this._mix();await Promise.all([this._audio.music.play(),this._audio.waves.play()]);}
   if(current()&&token===this._playToken&&this.playing)await this.video.play();
  }}
  catch(e){if(e.name!=='AbortError'&&current()){this.pause();this.callbacks.onError(e);}}
  finally{if(current())this._switching=false;}
 }
 _finish(){this._time=this.duration;this.pause();this._notify();}
 destroy(){this.pause();this._generation++;this._cancelLoad?.();this.video.removeEventListener('ended',this._ended);this.video.removeEventListener('error',this._error);this.video.removeAttribute('src');this.video.load();if(this._audio){this._audio.music.src='';this._audio.waves.src='';this._audio.context.close();}}
}

export async function exportCustom(state,{onProgress=()=>{},signal}={}){
 if(signal?.aborted)throw abortError();
 if(!globalThis.MediaRecorder||!HTMLCanvasElement.prototype.captureStream)throw new Error('此浏览器不支持视频导出，请使用新版 Chrome 或 Edge。');
 const mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));
 if(!mime)throw new Error('此浏览器不支持 WebM 录制，请使用新版 Chrome 或 Edge。');
 const video=document.createElement('video'),canvas=document.createElement('canvas');canvas.width=540;canvas.height=960;
 video.style.cssText='position:fixed;left:-10000px;width:1px;height:1px';document.body.append(video);
 const ctx=canvas.getContext('2d'),chunks=[];let frame,recorder,stream,abortListener,recording;
 const player=new MemoryPlayer(video,{onTime:({time,duration})=>onProgress(duration?time/duration:0)});
 const loadingAbort=()=>{player.pause();player._generation++;player._cancelLoad?.();};
 signal?.addEventListener('abort',loadingAbort,{once:true});
 // Always use clip-based playback and the same mixer as custom preview.
 try{
  const audio=player._ensureAudio();const resume=audio.context.resume();
  const destination=audio.context.createMediaStreamDestination();audio.master.disconnect();audio.master.connect(destination);
  await resume;if(signal?.aborted)throw abortError();
  await player.setProject(state);if(signal?.aborted)throw abortError();player.canonical=false;video.muted=true;player._index=0;await player._load(player.timeline[0].src);if(signal?.aborted)throw abortError();
  signal?.removeEventListener('abort',loadingAbort);
  stream=canvas.captureStream(24);destination.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
  recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:2500000});
  recording=new Promise((resolve,reject)=>{
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=resolve;recorder.onerror=()=>reject(new Error('视频录制失败，请重试。'));
  });
  const done=new Promise((resolve,reject)=>{
   abortListener=()=>reject(abortError());signal?.addEventListener('abort',abortListener,{once:true});
   player.callbacks.onError=reject;
   player.callbacks.onTime=({time,duration})=>{onProgress(duration?time/duration:0);if(time>=duration&&duration>0)resolve();};
   const draw=()=>{if(video.readyState>=2)ctx.drawImage(video,0,0,540,960);frame=requestAnimationFrame(draw);};draw();
   recorder.start(250);player.play().catch(reject);
  });
  await done;if(recorder.state!=='inactive')recorder.stop();await recording;
  const blob=new Blob(chunks,{type:mime});if(!blob.size)throw new Error('导出结果为空，请重试。');onProgress(1);return {blob,extension:'webm'};
 }finally{
  signal?.removeEventListener('abort',abortListener);signal?.removeEventListener('abort',loadingAbort);cancelAnimationFrame(frame);
  if(recorder&&recorder.state!=='inactive')recorder.stop();stream?.getTracks().forEach(t=>t.stop());player.destroy();video.remove();
 }
}
