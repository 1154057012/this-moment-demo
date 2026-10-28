import test from 'node:test';
import assert from 'node:assert/strict';
import { CLIPS,createState,validateSelection,buildTimeline,getDuration,getVariant,isCanonical,applyEdit,undoEdit,resetEdits,normalizeState,getIntentSupport } from '../core.mjs';

test('默认示例素材与初始状态',()=>{
 const s=createState(); assert.equal(CLIPS.length,8); assert.equal(s.anchor,4); assert.equal(s.step,'welcome');
 assert.deepEqual(s.selected,[1,2,3,4,5,6,7,8]); assert.equal(s.intent,'想记住和朋友一起看海的下午');
 assert.equal(s.mood,'自然记录'); assert.equal(validateSelection(s).ok,true); assert.equal(isCanonical(s),true);
 assert.equal(getDuration(s),30); assert.equal(getVariant(s),'base');
 assert.equal(isCanonical({...s,anchor:8}),false);
 assert.ok(CLIPS.every(c=>c.src===`assets/media/clip-${c.id}.mp4`&&c.poster.endsWith('.jpg')));
});
test('选片至少三段且重要片段必须在内',()=>{
 assert.equal(validateSelection({...createState(),selected:[1,2]}).ok,false);
 assert.equal(validateSelection({...createState(),selected:[1,2,3]}).ok,false);
 assert.equal(validateSelection({...createState(),selected:[1,2,4]}).ok,true);
});
test('自定义选择按时间排序且仅保留选择与标记',()=>{
 const s={...createState(),selected:[8,3,4],anchor:8}; const list=buildTimeline(s);
 assert.deepEqual(list.map(c=>c.id),[3,4,8]); assert.deepEqual(list.map(c=>[c.start,c.end]),[[0,4],[4,10],[10,13]]);
 assert.deepEqual(list.filter(c=>c.isAnchor).map(c=>c.id),[8]); assert.equal(isCanonical(s),false);
});
test('缩短海景只减少片段3与5的长度',()=>{
 const s=applyEdit(createState(),'short'); assert.equal(getDuration(s),24); assert.equal(getVariant(s),'short');
 assert.deepEqual(buildTimeline(s).map(c=>c.duration),[3,3,1,6,1,4,3,3]);
 assert.equal(getDuration({...s,selected:[1,4,8]}),12);
});
test('缩短海景时必留片段始终完整，另一个海景仍可缩短',()=>{
 for(const anchor of [3,5]){
  const s={...createState(),anchor,short:true};
  assert.equal(buildTimeline(s).find(c=>c.isAnchor).duration,4);
  assert.equal(getDuration(s),27);
 }
});
test('纯函数修改、幂等、历史、撤销与重置',()=>{
 const a=createState(),b=applyEdit(a,'voice'),c=applyEdit(b,'short');
 assert.equal(a.voice,false); assert.equal(a.history.length,0); assert.equal(b.history.length,1);
 assert.equal(getVariant(b),'voice'); assert.equal(getVariant(c),'both'); assert.equal(c.history.length,2);
 assert.equal(applyEdit(c,'voice').history.length,2); assert.equal(applyEdit(c,'unknown').history.length,2);
 const d=undoEdit(c); assert.equal(getVariant(d),'voice'); assert.equal(d.history.length,1);
 assert.equal(getVariant(undoEdit(d)),'base'); assert.equal(getVariant(resetEdits(c)),'base'); assert.deepEqual(resetEdits(c).history,[]);
 assert.deepEqual(undoEdit(a),a);
});
test('损坏的持久化数据安全回退与去重',()=>{
 for(const v of [null,undefined,'broken',42,[]]) assert.deepEqual(normalizeState(v),createState());
 const s=normalizeState({selected:[8,8,99,'4',2,null],anchor:4,voice:'yes',short:true,history:[null,{voice:true,short:false},{voice:1,short:0}],step:'hack',intent:34,mood:[]});
 assert.deepEqual(s.selected,[8,2]); assert.equal(s.anchor,8); assert.equal(s.voice,false); assert.equal(s.short,true);
 assert.equal(s.step,'welcome'); assert.equal(s.intent,createState().intent); assert.deepEqual(s.history,[{voice:true,short:false}]);
 assert.equal(validateSelection(s).ok,false); assert.deepEqual(normalizeState({selected:[]}).selected,[]);
 assert.equal(normalizeState({selected:[]}).anchor,null);
 assert.equal(normalizeState({selected:[8,4,2],anchor:99}).anchor,8);
});
test('输入只是文本且支持范围明确',()=>{
 const text='<img src=x onerror=alert(1)>和朋友看海'; assert.equal(normalizeState({intent:text}).intent,text);
 assert.equal(getIntentSupport('和朋友一起去海边，自然记录旅行').supported,true);
 for(const text of ['婚礼','生日','下雪','做饭','火星']) {const r=getIntentSupport(text); assert.equal(r.supported,false);assert.ok(r.message.includes('示例'));}
 assert.equal(getIntentSupport('').supported,false);
});
