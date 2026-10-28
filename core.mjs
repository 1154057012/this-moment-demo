// Pure demo rules. Intent and mood are editorial text, not model inference or style generation.
export const CLIPS = Object.freeze([
 [1,'海边到了',3,'海景'],[2,'一起走向海边',3,'同行'],[3,'浪花靠近',4,'海景'],[4,'同行的这一刻',6,'重要瞬间'],
 [5,'慢慢看海',4,'海景'],[6,'风里的我们',4,'同行'],[7,'再看一次浪花',3,'海景'],[8,'一起留下的回忆',3,'同行'],
].map(([id,title,duration,tag])=>Object.freeze({id,title,duration,tag,src:`assets/media/clip-${id}.mp4`,poster:`assets/media/clip-${id}.jpg`})));

export function createState(){return {step:'welcome',selected:CLIPS.map(c=>c.id),anchor:4,intent:'想记住和朋友一起看海的下午',mood:'自然记录',voice:false,short:false,history:[]};}
const validId = id => Number.isInteger(id)&&id>=1&&id<=8;
const flags = value => ({voice:value.voice===true,short:value.short===true});

export function normalizeState(input){
 const defaults=createState();
 if(!input||typeof input!=='object'||Array.isArray(input))return defaults;
 const selected=Array.isArray(input.selected)?[...new Set(input.selected.filter(validId))]:defaults.selected;
 const requestedAnchor=Object.hasOwn(input,'anchor')?input.anchor:defaults.anchor;
 const anchor=selected.includes(requestedAnchor)?requestedAnchor:(selected[0]??null);
 const steps=['welcome','select','intent','generating','result','export','complete'];
 return {step:steps.includes(input.step)?input.step:defaults.step,selected,anchor,
  intent:typeof input.intent==='string'?input.intent:defaults.intent,
  mood:typeof input.mood==='string'?input.mood:defaults.mood,...flags(input),
  history:Array.isArray(input.history)?input.history.filter(v=>v&&typeof v==='object'&&typeof v.voice==='boolean'&&typeof v.short==='boolean').map(flags):[]};
}

export function validateSelection(state){
 const ids=Array.isArray(state?.selected)?[...new Set(state.selected.filter(validId))]:[];
 if(ids.length<3)return {ok:false,message:'请至少选择 3 段素材，再生成回忆短片。'};
 if(!ids.includes(state.anchor))return {ok:false,message:'请在已选素材中标记一个一定要保留的片段。'};
 return {ok:true,message:''};
}

export function buildTimeline(state){
 let cursor=0;
 return CLIPS.filter(c=>state.selected.includes(c.id)).map(c=>{
  const duration=state.short&&c.id!==state.anchor&&(c.id===3||c.id===5)?Math.max(1,c.duration-3):c.duration;
  const start=cursor;cursor+=duration;
  return {...c,start,end:cursor,duration,isAnchor:c.id===state.anchor};
 });
}
export function getDuration(state){return buildTimeline(state).reduce((sum,c)=>sum+c.duration,0);}
export function getVariant(state){return state.voice?(state.short?'both':'voice'):(state.short?'short':'base');}
export function isCanonical(state){return state.anchor===4&&CLIPS.every(c=>state.selected.includes(c.id));}

export function applyEdit(state,type){
 if(!['voice','short'].includes(type)||state[type])return {...state,history:[...state.history]};
 return {...state,[type]:true,history:[...state.history,flags(state)]};
}
export function undoEdit(state){
 if(!state.history.length)return {...state,history:[]};
 return {...state,...flags(state.history.at(-1)),history:state.history.slice(0,-1)};
}
export function resetEdits(state){return {...state,voice:false,short:false,history:[]};}

export function getIntentSupport(text){
 if(typeof text!=='string'||!text.trim())return {supported:false,message:'写一句你想留下的回忆，或选择示例描述。'};
 if(/婚礼|生日|下雪|做饭|火星/.test(text))return {supported:false,message:'当前示例支持朋友、海边和旅行回忆；请更换描述，或使用海边示例。'};
 if(/海|朋友|旅行|自然|记录|同行|回忆|下午|风|浪|我们/.test(text))return {supported:true,message:'这句话会用于短片标题和故事说明；当前示例按预设规则组织素材。'};
 return {supported:false,message:'当前示例支持朋友、海边和旅行回忆，请试试“和朋友一起看海的下午”。'};
}
