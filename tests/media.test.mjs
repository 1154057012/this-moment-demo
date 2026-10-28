import test from 'node:test';
import assert from 'node:assert/strict';
import {locateTime,mixLevels,MemoryPlayer} from '../player.mjs';
import {createState} from '../core.mjs';
test('项目时间映射至片段，边界进入下一段',()=>{
 const t=[{start:0,end:3,duration:3},{start:3,end:9,duration:6}];
 assert.deepEqual(locateTime(t,-2),{index:0,offset:0,time:0});
 assert.deepEqual(locateTime(t,3),{index:1,offset:0,time:3});
 assert.deepEqual(locateTime(t,99),{index:1,offset:6,time:9});
 assert.deepEqual(locateTime(t,NaN),{index:0,offset:0,time:0});
 assert.equal(locateTime([],0),null);
});
function fixture(){
 globalThis.cancelAnimationFrame=()=>{};
 const video={addEventListener(){},removeEventListener(){},pause(){},play(){this.playCount=(this.playCount||0)+1;return Promise.resolve();},currentTime:0};
 const player=new MemoryPlayer(video);player.state={...createState(),selected:[1,2,4]};
 player.timeline=[{id:1,start:0,end:3,duration:3,src:'one'},{id:2,start:3,end:6,duration:3,src:'two'}];player._index=0;player.canonical=false;
 return {player,video};
}
test('跨片段定位期间暂停不会在加载结束后重新播放',async()=>{
 const {player,video}=fixture();let ready;player._playing=true;player._load=()=>new Promise(r=>ready=r);
 const pending=player.seek(4);player.pause();ready();await pending;
 assert.equal(video.playCount||0,0);assert.equal(player.playing,false);
});
test('旧片段切换完成时不能改变新项目切换状态',async()=>{
 const {player,video}=fixture();let ready;player._playing=true;player._load=()=>new Promise(r=>ready=r);
 const pending=player._next();
 // A newer project invalidates the old transition, and starts its own transition.
 player._projectToken++;player._transitionToken++;player._switching=true;ready();await pending;
 assert.equal(video.playCount||0,0);assert.equal(player._switching,true);
});
test('切换项目会释放旧切换状态并阻止旧定位恢复播放',async()=>{
 const {player,video}=fixture();let ready;player._playing=true;player._load=()=>new Promise(r=>ready=r);
 const pending=player.seek(4);const oldReady=ready;
 player._load=async()=>{};
 await player.setProject({...createState(),selected:[1,2,4]});
 assert.equal(player._switching,false);assert.equal(player.time,0);
 oldReady();await pending;assert.equal(video.playCount||0,0);assert.equal(player.time,0);
});
test('声音突出窗口覆盖重要片段前3秒至结束',()=>{
 const t=[{start:9,end:15,isAnchor:true}];
 assert.deepEqual(mixLevels(t,true,6),{music:.12,waves:1.5});
 assert.deepEqual(mixLevels(t,true,15),{music:.9,waves:.22});
 assert.deepEqual(mixLevels(t,false,10),{music:.9,waves:.22});
});
