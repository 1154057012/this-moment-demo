import {CLIPS,createState,normalizeState,validateSelection,buildTimeline,getDuration,getVariant,isCanonical,applyEdit,undoEdit,resetEdits,getIntentSupport} from './core.mjs';
import {MemoryPlayer,exportCustom} from './player.mjs';

const $=s=>document.querySelector(s);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>`${String(Math.floor(Math.max(0,n)/60)).padStart(2,'0')}:${String(Math.floor(Math.max(0,n)%60)).padStart(2,'0')}`;
const storageKey='this-moment-draft-v1';
let storageOK=true,state=load(),page='home',generationTimer,toastTimer,comparison=false,generationFailure=false,mediaFailure=false,generationIndex=0,generationRun=0,downloadBusy=false,exportAbort,lastDownload=null;
const workspace=$('#workspace'),movie=$('#movie');
const player=new MemoryPlayer(movie,{
 onTime:({time,duration,playing})=>{
  $('#currentTime').textContent=fmt(time);$('#totalTime').textContent=fmt(duration);$('#seek').max=String(duration);$('#seek').value=String(time);
  $('#playToggle').textContent=playing?'Ⅱ':'▶';$('#playToggle').setAttribute('aria-label',playing?'暂停':'播放');$('#bigPlay').hidden=playing||!['result','complete'].includes(state.step);
  const current=buildTimeline(comparison?{...state,voice:false,short:false}:state).find(c=>time>=c.start&&time<c.end);
  workspace.querySelectorAll('.story-row').forEach(el=>el.classList.toggle('playing-row',Number(el.dataset.clip)===current?.id));
 },
 onState:({playing})=>{$('#bigPlay').hidden=playing||!['result','complete'].includes(state.step);$('#playToggle').textContent=playing?'Ⅱ':'▶';$('#playToggle').setAttribute('aria-label',playing?'暂停':'播放');},
 onError:error=>toast(`视频未能播放：${error?.message||'请检查资源后重试'}`)
});

function load(){try{const raw=localStorage.getItem(storageKey);let value=raw?normalizeState(JSON.parse(raw)):createState();if(['generating','export'].includes(value.step))value.step='intent';if(value.step==='welcome')value.step='select';if(['result','complete'].includes(value.step)&&!validateSelection(value).ok)value.step='select';value.intent=value.intent.slice(0,120);return value;}catch{storageOK=false;return {...createState(),step:'select'};}}
function save(){try{localStorage.setItem(storageKey,JSON.stringify(state));storageOK=true;}catch{storageOK=false;}$('#draftStatus').textContent=storageOK?'草稿已保存在当前浏览器':'当前浏览器无法保存草稿；请勿刷新页面';}
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),4200);}
function route(){const requested=location.hash.slice(1).split('?')[0];showPage(['home','demo'].includes(requested)?requested:'home');}
function showPage(next,scroll=true){
 if(page==='demo'&&next!=='demo'){player.pause();if(state.step==='generating'){cancelGeneration();}}
 page=next;document.querySelectorAll('[data-page]').forEach(el=>el.hidden=el.dataset.page!==page);
 document.querySelectorAll('[data-nav]').forEach(el=>{el.classList.toggle('active',el.dataset.nav===page);if(el.dataset.nav===page)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
 if(page==='demo')renderStage();if(scroll)window.scrollTo({top:0,behavior:'instant'});
 document.title=`${({home:'让回忆有自己的主角',demo:'海边一日 · 创作',thinking:'产品思考',favorite:'喜欢的功能',ai:'AI协作记录',materials:'提交材料'})[page]} · 这一刻`;
}
function go(step){state.step=step;comparison=false;save();renderStage();if(innerWidth<600)$('#workspace').scrollIntoView({behavior:'smooth',block:'start'});}
function renderSteps(){const n=state.step==='select'?1:state.step==='intent'?2:3;$('#steps').innerHTML=['选好素材','说说这一刻','看看成片'].map((label,i)=>`<li class="${i+1===n?'current':i+1<n?'complete':''}"${i+1===n?' aria-current="step"':''}><b>${i+1<n?'✓':i+1}</b>${label}</li>`).join('');}
function renderStage(){
 renderSteps();save();
 const stage=state.step;
 if(stage==='select')renderSelect();else if(stage==='intent')renderIntent();else if(stage==='generating')renderGenerating();else if(stage==='complete')renderComplete();else renderResult();
 const hasResult=['result','complete'].includes(stage);$('#playerControls').hidden=!hasResult;$('#previewCaption').hidden=hasResult;$('#bigPlay').hidden=!hasResult;
 $('#previewLabel').textContent=hasResult?'你的回忆短片':'这一刻的预览';
 if(hasResult){player.setProject(comparison?{...state,voice:false,short:false}:state).catch(error=>toast(error.message));updateVersion();}
 else{player.pause();movie.removeAttribute('src');movie.load();movie.poster=CLIPS.find(c=>c.id===state.anchor)?.poster||CLIPS[3].poster;$('#previewCaption span').textContent='想把这一天\n留得久一点。';}
}
function renderSelect(){
 const validation=validateSelection(state);
 workspace.innerHTML=`<div class="workspace-card"><span class="section-eyebrow">01 / CHOOSE YOUR MOMENTS</span><h2>哪些片段，值得再看一次？</h2><p class="helper">海边一日游 · 8 段素材。选择至少 3 段，再标记一段“一定要保留”的瞬间。</p>${mediaFailure?'<div class="inline-error" role="alert">第 6 段暂时无法读取。你的选择已保留。<div class="chips"><button class="chip" data-action="retry-media">重新读取</button><button class="chip" data-action="skip-media">跳过这一段</button></div></div>':''}<div class="inline-heading"><span>已选 ${state.selected.length} 段 · 原素材 ${CLIPS.filter(c=>state.selected.includes(c.id)).reduce((s,c)=>s+c.duration,0)} 秒</span><button data-action="toggle-all">${state.selected.length===8?'取消全选':'选择全部'}</button></div><div class="clip-grid">${CLIPS.map(c=>`<article class="clip-card ${state.selected.includes(c.id)?'selected':''}"><button class="clip-image-button" data-action="toggle-clip" data-id="${c.id}" aria-label="${state.selected.includes(c.id)?'取消选择':'选择'}${c.title}" aria-pressed="${state.selected.includes(c.id)}"><img src="${c.poster}" alt="${c.title}" loading="lazy"><span class="clip-checkbox">✓</span><span class="clip-duration">${fmt(c.duration)}</span></button><button class="clip-preview" data-action="preview-clip" data-id="${c.id}" aria-label="预览${c.title}">▶</button><p class="clip-title">${String(c.id).padStart(2,'0')} / ${c.title}</p><button class="anchor-button ${state.anchor===c.id?'is-anchor':''}" data-action="anchor" data-id="${c.id}" ${state.selected.includes(c.id)?'':'disabled'} aria-pressed="${state.anchor===c.id}">${state.anchor===c.id?'♥ 这段一定要留下':'♡ 设为必留'}</button></article>`).join('')}</div><div class="anchor-note"><b>♡</b><span>${state.anchor?`已标记「${escape(CLIPS.find(c=>c.id===state.anchor)?.title)}」。这段会完整保留。`:'选一段最有意义的片段，让它成为这条回忆的重点。'}</span></div>${!validation.ok?`<p class="helper" role="status">${escape(validation.message)}</p>`:''}<div class="workspace-bottom"><small>你的选择仅在本机保存</small><button class="button primary" data-action="next" ${!validation.ok||mediaFailure?'disabled':''}>下一步，说说这一刻 →</button></div></div>`;
}
function renderIntent(error=''){
 const anchor=CLIPS.find(c=>c.id===state.anchor);
 workspace.innerHTML=`<div class="workspace-card"><span class="section-eyebrow">02 / GIVE YOUR STORY A DIRECTION</span><h2>这一天，你最想记住什么？</h2><p class="helper">不用写提示词，就像给朋友发一句话，说说你想留下什么。</p><div class="intent-anchor"><img src="${anchor.poster}" alt="${anchor.title}"><div><small>♥ 这段一定要留下</small><h3>${anchor.title}</h3><p>${anchor.duration} 秒 · 完整保留你的重要瞬间</p></div></div><label class="form-label" for="intentInput">写给这段回忆的一句话</label><textarea class="intent-input" id="intentInput" maxlength="120" placeholder="比如：想记住和朋友一起看海的下午">${escape(state.intent)}</textarea><div class="input-meta"><span>写下这次旅行想记住的事</span><span id="intentCount">${state.intent.length}/120</span></div><div class="chips"><button class="chip" data-action="intent-preset" data-text="想记住和朋友一起看海的下午">和朋友一起看海的下午</button><button class="chip" data-action="intent-preset" data-text="想留下海浪的声音">想留下海浪的声音</button><button class="chip" data-action="intent-preset" data-text="简单记录这一天的旅行">简单记录这一天</button></div>${error?`<div class="inline-error" role="alert">${escape(error)}</div>`:''}<div class="anchor-note"><b>✦</b><span>按旅行顺序串起 ${state.selected.length} 段素材，保留重要片段。先看初稿，再一点点调整。</span></div><div class="workspace-bottom"><button class="button subtle" data-action="back-select">← 调整素材</button><button class="button primary" data-action="generate">生成这段回忆 ✦</button></div></div>`;
}
function renderGenerating(){workspace.innerHTML=`<div class="workspace-card"><div class="generation-wrap"><div class="loading-orbit">此</div><span class="section-eyebrow">A LITTLE STORY IS TAKING SHAPE</span><h2>正在串起这一天的回忆</h2><p class="helper">你的重要片段会完整留下。</p><ol class="loading-list">${['读取已选素材','标记必须保留的瞬间','按旅行顺序组织故事','准备可修改的短片草稿'].map((t,i)=>`<li class="${i<=generationIndex?'active':''}"><span>${i<generationIndex?'✓':i===generationIndex?'◉':'○'}</span>${t}</li>`).join('')}</ol><button class="button subtle" data-action="cancel-generation">取消，回去调整</button></div></div>`;}
function renderFailure(){workspace.innerHTML=`<div class="workspace-card"><div class="failure-wrap"><span class="failure-symbol">↻</span><span class="section-eyebrow">LET'S TRY AGAIN</span><h2>这次没能生成成功</h2><p class="helper">本次生成已中断。素材、必留标记和描述都已保留。<br>可以重试，也可以回去调整。</p><div class="intent-anchor"><div><small>你的创作意图</small><p>${escape(state.intent)}</p></div></div><div class="failure-actions"><button class="button secondary" data-action="back-intent">回去调整</button><button class="button primary" data-action="retry-generation">保留内容，重新生成 ↻</button></div></div></div>`;}
function renderResult(){
 if(!validateSelection(state).ok){state.step='select';renderStage();return;}
 const displayState=comparison?{...state,voice:false,short:false}:state; const timeline=buildTimeline(displayState),duration=getDuration(displayState),canShort=state.selected.some(id=>(id===3||id===5)&&id!==state.anchor);
 workspace.innerHTML=`<div class="workspace-card"><span class="section-eyebrow">03 / MAKE IT FEEL LIKE YOU</span><div class="result-title"><h2>这一刻，有了自己的故事。</h2><span class="small-pill">${duration} 秒 · ${timeline.length} 段</span></div><p class="intent-quote">“${escape(state.intent)}”</p><p class="result-summary">按旅行顺序串起你的素材，完整保留「${escape(CLIPS.find(c=>c.id===state.anchor)?.title)}」。点片段卡，可跳到对应位置。</p><div class="story-list">${timeline.map(c=>`<button class="story-row ${c.isAnchor?'anchor-row':''}" data-action="seek-clip" data-id="${c.id}" data-clip="${c.id}" aria-label="跳到${c.title}"><img src="${c.poster}" alt=""><span class="story-info"><b>${c.title}${c.isAnchor?'<span class="anchor-tag">♥ 必留</span>':''}</b><small>${c.duration} 秒${displayState.short&&[3,5].includes(c.id)&&!c.isAnchor?' · 已缩短海景':''}</small></span><span>${fmt(c.start)} — ${fmt(c.end)}</span></button>`).join('')}</div><h3 class="edit-heading">差一点点感觉？只改这一处。</h3><div class="edit-grid"><button class="edit-button ${state.voice?'applied':''}" data-action="edit-voice" aria-pressed="${state.voice}" ${state.voice?'disabled':''}><b>${state.voice?'✓ 已突出海浪声':'≈ 突出海浪声'}</b><span>重要片段附近压低配乐，让海的声音近一点。</span></button><button class="edit-button ${state.short?'applied':''}" data-action="edit-short" aria-pressed="${state.short}" ${state.short||!canShort?'disabled':''}><b>${state.short?'✓ 海景已缩短':'↦ 海景短一点'}</b><span>${canShort?'缩短非必留的第 3、5 段海景，重要片段完整保留。':'已选素材中没有可缩短的非必留海景。'}</span></button></div><div class="result-actions"><button class="minor-button" data-action="undo" ${state.history.length?'':'disabled'}>↶ 撤销上次修改</button><button class="minor-button" data-action="compare" ${!state.voice&&!state.short?'disabled':''}>${comparison?'返回修改版 →':'对比初稿 ↗'}</button><button class="minor-button" data-action="back-intent">修改创作意图</button></div><div class="workspace-bottom"><small>修改可撤销<br>满意后，再保存这段回忆</small><button class="button primary" data-action="export" ${downloadBusy?'disabled':''}>${downloadBusy?'正在准备…':'保存我的回忆 ↓'}</button></div></div>`;
}
function renderComplete(){const info=lastDownload||{name:`这一刻-海边一日-${getVariant(state)}.${isCanonical(state)?'mp4':'webm'}`,extension:isCanonical(state)?'mp4':'webm'};workspace.innerHTML=`<div class="workspace-card"><div class="success-symbol">✓</div><span class="section-eyebrow">A MOMENT, NOW YOURS TO KEEP</span><h2>这一天，可以慢慢回看了。</h2><p class="helper">视频下载已发起，请在浏览器的下载列表查看。<br>你也可以继续修改，或者用这些素材再讲一个故事。</p><div class="done-file"><span>▤</span><div><h3>${escape(info.name)}</h3><p>${getDuration(state)} 秒 · 540 × 960 · ${info.extension.toUpperCase()}</p></div></div><div class="done-actions"><button class="button primary" data-action="export">再次下载 ↓</button><button class="button secondary" data-action="continue-edit">继续编辑</button></div><div class="done-suggestion"><p>还有别的表达方式？</p><button class="text-link minor-button" data-action="new-story">用这些素材，再做一条 →</button></div></div>`;}
function updateVersion(){const v=comparison?'对比中：初稿':state.voice&&state.short?'海浪更近 · 海景更短':state.voice?'突出海浪声':state.short?'海景短一点':'初稿';$('#versionLabel').textContent=`${v} · ${comparison?getDuration({...state,short:false}):getDuration(state)} 秒`;$('#previewLabel').textContent=comparison?'正在对比初稿':'你的回忆短片';}
function cancelGeneration(){clearTimeout(generationTimer);generationRun++;if(state.step==='generating')state.step='intent';save();}
function beginGeneration(){const validation=validateSelection(state),support=getIntentSupport(state.intent);if(!validation.ok){toast(validation.message);go('select');return;}if(!support.supported){state.step='intent';renderIntent(support.message);return;}state=resetEdits(state);state.step='generating';comparison=false;generationIndex=0;const run=++generationRun;save();renderStage();function tick(){if(run!==generationRun||state.step!=='generating')return;if(generationIndex<3){generationIndex++;renderGenerating();generationTimer=setTimeout(tick,650);}else if(generationFailure){generationFailure=false;state.step='intent';save();renderFailure();}else{go('result');toast('草稿已准备好。先看看，再调整一点点。');}}generationTimer=setTimeout(tick,650);}
async function doExport(){
 if(downloadBusy)return;downloadBusy=true;comparison=false;player.pause();let result;
 try{
  if(isCanonical(state)){toast('正在准备 MP4 文件…');const response=await fetch(`assets/media/${getVariant(state)}.mp4`);if(!response.ok)throw new Error('下载资源暂不可用，请稍后重试。');const blob=await response.blob();if(blob.size<10000)throw new Error('下载文件不完整，请重试。');result={blob,extension:'mp4'};}
  else {exportAbort=new AbortController();$('#exportDialog').showModal();$('#exportProgress').value=0;$('#exportStatus').textContent='准备自定义片段…';result=await exportCustom(state,{signal:exportAbort.signal,onProgress:fraction=>{const percent=fraction*100;$('#exportProgress').value=percent;$('#exportStatus').textContent=`正在合成 ${Math.round(percent)}% · 约 ${getDuration(state)} 秒`;}});}
  const name=`这一刻-海边一日-${getVariant(state)}.${result.extension}`;const url=URL.createObjectURL(result.blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);lastDownload={name,extension:result.extension};state.step='complete';save();renderStage();toast('下载已发起，可在浏览器下载列表查看。');
 }catch(error){if(error.name==='AbortError')toast('已取消导出，你的修改仍然保留。');else toast(error.message||'未能导出，请重试。');}
 finally{downloadBusy=false;exportAbort=null;if($('#exportDialog').open)$('#exportDialog').close();}
}
document.addEventListener('click',async event=>{
 const target=event.target.closest('[data-action]');if(!target||target.disabled)return;const action=target.dataset.action,id=Number(target.dataset.id);
 if(action==='start'){if(location.hash==='#demo')showPage('demo');else location.hash='demo';return;}
 if(action==='toggle-clip'){state=resetEdits(state);if(state.selected.includes(id)){state.selected=state.selected.filter(x=>x!==id);if(state.anchor===id)state.anchor=state.selected[0]??null;}else{state.selected=[...state.selected,id].sort((a,b)=>a-b);if(!state.anchor)state.anchor=id;}renderStage();}
 else if(action==='toggle-all'){state=resetEdits(state);state.selected=state.selected.length===8?[]:CLIPS.map(c=>c.id);state.anchor=state.selected.length?4:null;renderStage();}
 else if(action==='anchor'){state.anchor=id;state=resetEdits(state);renderStage();toast(`已标记「${CLIPS.find(c=>c.id===id).title}」为必留片段。`);}
 else if(action==='preview-clip'){const c=CLIPS.find(c=>c.id===id);$('#clipDialogTitle').textContent=c.title;$('#clipVideo').src=c.src;$('#clipDialog').showModal();$('#clipVideo').play().catch(()=>{});}
 else if(action==='next')go('intent');
 else if(action==='back-select')go('select');
 else if(action==='intent-preset'){state.intent=target.dataset.text;save();renderIntent();}
 else if(action==='generate'||action==='retry-generation')beginGeneration();
 else if(action==='cancel-generation'){cancelGeneration();renderStage();toast('已取消，刚才的内容都还在。');}
 else if(action==='back-intent'){player.pause();go('intent');}
 else if(action==='edit-voice'||action==='edit-short'){state=applyEdit(state,action==='edit-voice'?'voice':'short');comparison=false;save();renderStage();toast(action==='edit-voice'?'已压低重要片段附近的配乐，试着听听海浪。':`海景已缩短，短片现在 ${getDuration(state)} 秒。`);}
 else if(action==='undo'){state=undoEdit(state);comparison=false;save();renderStage();toast('已撤销上次修改。');}
 else if(action==='compare'){comparison=!comparison;renderResult();await player.setProject(comparison?{...state,voice:false,short:false}:state);updateVersion();toast(comparison?'正在查看初稿，修改仍然保留。':'已返回修改后的版本。');}
 else if(action==='seek-clip'){const timeline=buildTimeline(comparison?{...state,voice:false,short:false}:state),clip=timeline.find(c=>c.id===id);if(clip){await player.seek(clip.start);await player.play();}}
 else if(action==='export')await doExport();
 else if(action==='continue-edit')go('result');
 else if(action==='new-story'){state=resetEdits(state);go('intent');}
 else if(action==='restart'){cancelGeneration();state={...createState(),step:'select'};comparison=false;mediaFailure=false;generationFailure=false;save();renderStage();toast('已重新载入海边一日游素材。');}
 else if(action==='media-failure'){cancelGeneration();state.step='select';mediaFailure=true;renderStage();toast('已进入素材读取失败演示。');}
 else if(action==='retry-media'){mediaFailure=false;renderStage();toast('素材已恢复，选择和标记仍然保留。');}
 else if(action==='skip-media'){mediaFailure=false;state.selected=state.selected.filter(x=>x!==6);if(state.anchor===6)state.anchor=state.selected[0]??null;renderStage();toast('已跳过第 6 段，其他素材保留。');}
 else if(action==='generation-failure'){generationFailure=true;toast('已开启一次失败演示。下一次生成会中断，随后可正常重试。');}
});
document.addEventListener('input',event=>{if(event.target.id==='intentInput'){state.intent=event.target.value;$('#intentCount').textContent=`${state.intent.length}/120`;save();}});
$('#closeClip').addEventListener('click',()=>$('#clipDialog').close());$('#clipDialog').addEventListener('close',()=>{$('#clipVideo').pause();$('#clipVideo').removeAttribute('src');$('#clipVideo').load();});
$('#bigPlay').addEventListener('click',()=>Promise.resolve(player.toggle()).catch(e=>toast(e.message)));$('#playToggle').addEventListener('click',()=>Promise.resolve(player.toggle()).catch(e=>toast(e.message)));
$('#movie').addEventListener('click',()=>{if(['result','complete'].includes(state.step))Promise.resolve(player.toggle()).catch(e=>toast(e.message));});
$('#seek').addEventListener('input',event=>player.seek(Number(event.target.value)).catch(e=>toast(e.message)));
let muted=false;$('#muteToggle').addEventListener('click',()=>{muted=!muted;player.setMuted(muted);$('#muteToggle').textContent=muted?'静':'声';$('#muteToggle').setAttribute('aria-label',muted?'取消静音':'静音');});
$('#cancelExport').addEventListener('click',()=>exportAbort?.abort());$('#exportDialog').addEventListener('cancel',event=>{event.preventDefault();exportAbort?.abort();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&!downloadBusy)player.pause();});
window.addEventListener('hashchange',route);window.addEventListener('pagehide',()=>{cancelGeneration();player.pause();});
route();
