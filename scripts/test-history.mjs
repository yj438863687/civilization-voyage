import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const requireWeb = createRequire(join(root, 'apps/web/package.json'));
const { build } = requireWeb('esbuild');
const temp = mkdtempSync(join(tmpdir(), 'voyage-history-'));
const outfile = join(temp, 'history.cjs');
await build({ absWorkingDir: join(root, 'apps/web'), stdin: { contents: ['history', 'encounters', 'stories', 'world.config', 'progression', 'challenges', 'storyArcs', 'challengeOutcomes', 'storyAccess'].map(name => `export * from './src/world/${name}';`).join('\n'), resolveDir: join(root, 'apps/web') }, outfile, bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent' });
const require = createRequire(import.meta.url);
const game = require(outfile);
const media = JSON.parse(readFileSync(join(root, 'apps/web/src/world/historyMedia.json'), 'utf8'));
const memory = new Map();
global.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
assert.equal(Object.keys(game.HISTORY_ROUTES).length, 8);
for (const [id, route] of Object.entries(game.HISTORY_ROUTES)) {
  const [era, lane] = id.split('-');
  const moments = [...route.islands, route.crisis];
  assert.equal(route.region, lane === 'near' ? '中国' : '世界');
  assert(moments.every((scene, index) => !index || scene.order >= moments[index - 1].order), `${id}: 年代不能倒流`);
  assert(route.ending.order >= route.crisis.order, `${id}: 终点不能在事件之前`);
  assert.equal(game.storyFor(era, lane).figure.name, route.ending.name);
  const world = game.worldFor(era);
  assert.equal(world.lanes.find(item => item.id === lane).name, lane === 'near' ? '内海 · 中国' : '外海 · 世界');
  for (const scene of moments) {
    assert(scene.paragraphs.length >= 2);
    assert(media[scene.image], `${scene.id}: 没有图片资料`);
    assert(existsSync(join(root, 'apps/web/public', media[scene.image].src)), `${scene.id}: 缺失本地图片`);
    assert(media[scene.image].license);
    assert(scene.source.url.startsWith('https://'));
    assert.equal(scene.options.length, 2);
    if (route.islands.includes(scene)) {
      assert.equal(game.encounterFor(scene.id).history, scene);
      assert.equal(world.fragments.find(item => item.id === scene.id).title, scene.title);
    }
  }
  const first = moments[0], second = moments[1];
  const firstOut = game.historyOutcome(first, 1, {});
  const secondOut = game.historyOutcome(second, 1, firstOut.set);
  assert.equal(secondOut.supply, second.options[1].supply + 3, `${id}: 前站合作应改变后站结算`);
  assert.equal(game.historyOutcome(second, 1, {}).supply, second.options[1].supply);
  assert(game.previousDecision(second, firstOut.set).includes(first.options[1].label));
  const state = { ...firstOut.set, ...secondOut.set, ...game.historyOutcome(route.crisis, 0, {}).set };
  const recap = game.routeRecap(route, state).join(' ');
  assert(recap.includes(first.options[1].text) && recap.includes(second.options[1].text) && recap.includes(route.crisis.options[0].text));
}
const dispatch = game.HISTORY_ROUTES['C-far'].islands[0];
const mixed = game.historyOutcome(dispatch, 1, {}, [0, 2]);
assert(mixed.text.includes(dispatch.items[0]) && mixed.text.includes(dispatch.items[2]));
assert(!mixed.text.includes('两封急用电报'));
assert.equal(mixed.trust, 2);
assert.equal(game.cooperationBonus(dispatch, {}), 0);
assert.equal(game.cooperationBonus(game.HISTORY_ROUTES['C-far'].islands[1], { 'history:C-relay': 'care' }), 3);
assert(game.routeRecap(game.HISTORY_ROUTES['C-far'], mixed.set).join(' ').includes(mixed.text));
const fresh = game.freshStats();
assert.equal(fresh.shipLevel, 0);
assert.equal(fresh.crewLevel, 0);
const upgraded = game.upgradeShip(fresh);
assert.equal(upgraded.shipLevel, 1);
assert.equal(upgraded.supply, 62);
assert.equal(fresh.supply, 80, '升级不能原地修改旧状态');
assert.equal(game.upgradeShip({ ...fresh, supply: 32 }).shipLevel, 0, '必须留足 15 份口粮');
assert.equal(game.upgradeShip({ ...fresh, supply: 33 }).shipLevel, 1);
assert.equal(game.upgradeCrew(fresh), fresh, '人心不够不能换装');
assert.equal(game.upgradeCrew({ ...fresh, trust: 55 }).crewLevel, 1);
assert.equal(game.upgradeCrew({ ...fresh, trust: 55 }).trust, 55, '换装不消耗信任');
const applied = game.applyOutcome({ ...upgraded, crewLevel: 2 }, { supply: -4, trust: 3, text: 'test' }, 'test', 'A', 'test');
assert.equal(applied.shipLevel, 1);
assert.equal(applied.crewLevel, 2);
memory.set('cv.stats.v1', JSON.stringify({ supply: 55, trust: 65 }));
assert.equal(game.loadStats().shipLevel, 0, '旧存档应补齐新字段');
memory.set('cv.stats.v1', JSON.stringify({ supply: 55, trust: 65, shipLevel: 99, crewLevel: -1 }));
assert.equal(game.loadStats().shipLevel, 0);
assert.equal(game.loadStats().crewLevel, 0);

assert.equal(Object.keys(game.CHALLENGES).length,24);
assert.equal(new Set(Object.values(game.CHALLENGES).map(challenge=>challenge.kind)).size,12);
for(const [id,arc] of Object.entries(game.STORY_ARCS)) {
  const route=game.HISTORY_ROUTES[id];
  assert.deepEqual(arc.chapters.map(chapter=>chapter.scene),[...route.islands,route.crisis].map(scene=>scene.id));
  for(const chapter of arc.chapters) assert(game.CHALLENGES[chapter.scene]);
}
assert.equal(game.canalFlow(game.CANAL_SOLUTION).fields,2);
assert.equal(game.canalFlow({}).fields,0);
assert.deepEqual(game.packingCells([0,1],3,false),null,'装仓不能横跨边界');
assert.deepEqual(game.packingCells([0,4],3,false),[3,7]);
assert.deepEqual(game.routeStep([24],25),[24,25]);
assert.deepEqual(game.routeStep([24],23),[24],'不能从一行尾部跳到另一行');
assert.deepEqual(game.routeStep([24],30),[24],'路线不能越出地图');
const path=[24,25,26,20,14,15,9,3,4,5];
assert.deepEqual(game.routeScore(path,10),{reached:true,served:true,cost:11,within:false});
assert.equal(game.routeScore(path,13).within,true,'前章知识能使接入村庄的线路落在工料额度内');
let engine={pressure:0,coal:12,work:0,damage:0,turns:0};
while(engine.work<8) engine=game.engineStep(engine,engine.pressure<3?'coal':'work');
assert.equal(engine.work,8);assert.equal(engine.damage,0);assert.equal(engine.coal,6);
const exhausted={pressure:0,coal:0,work:0,damage:0,turns:0};assert.equal(game.engineStep(exhausted,'coal'),exhausted);
const balanced=[true,true,true,false,false,false,false,false,false,true,true,true,false,true,false,true,false,true,true,false,true,false,true,false];
assert.equal(game.shiftScore(balanced).quality,100);assert.equal(game.shiftScore(balanced).fatigue,0);
assert(game.shiftScore(Array(24).fill(true)).fatigue>0);
assert.equal(game.majority(game.NOISY),'1010');
const board=Array.from({length:25},(_,index)=>index===12?2:[7,11,13].includes(index)?1:0);
assert.equal(game.goMove(board,17).captured,1);assert.equal(game.goMove(board,12).legal,false);assert.equal(board[12],2,'试走不能修改原棋盘');
const chapter=game.HISTORY_ROUTES['A-near'].islands[0];
const work={quality:100,summary:'两岸通水',plan:JSON.stringify({kind:'canal',data:game.CANAL_SOLUTION}),strain:0};
const good=game.challengeOutcome(chapter,1,{},work);
assert.equal(good.set['work:A-water:quality'],'100');assert(good.text.includes('两岸通水'));
const poor=game.challengeOutcome(chapter,1,{}, {...work,quality:0,summary:'两岸均未接到水'});
assert(!poor.text.includes(chapter.options[1].text),'失败的操作不能写成成功的历史回顾');
assert.equal(good.supply-poor.supply,5,'操作成果应改变实际补给，而不只是文案');
assert.equal(game.challengeOutcome(chapter,1,{}, {...work,strain:4}).trust,good.trust-4);
assert(game.routeRecap(game.HISTORY_ROUTES['A-near'],good.set)[0].includes('两岸通水'));
const failedState=Object.fromEntries(game.STORY_ARCS['A-near'].chapters.flatMap(chapter=>[[`history:${chapter.scene}`,'fast'],[`work:${chapter.scene}:quality`,'0']]));
assert(!game.arcEnding(game.STORY_ARCS['A-near'],failedState).includes('变成两岸共同守护'));
assert(game.arcEnding(game.STORY_ARCS['A-near'],failedState).includes('尚未建立'));
const sharedState=Object.fromEntries(game.STORY_ARCS['A-near'].chapters.flatMap(chapter=>[[`history:${chapter.scene}`,'care'],[`work:${chapter.scene}:quality`,'100']]));
assert.equal(game.arcEnding(game.STORY_ARCS['A-near'],sharedState),game.STORY_ARCS['A-near'].ending);
for(const [id,route] of Object.entries(game.HISTORY_ROUTES)){
  const [era,lane]=id.split('-'),world=game.worldFor(era),story=game.storyFor(era,lane);
  for(const island of route.islands){
    const fragment=world.fragments.find(item=>item.id===island.id),target=game.fragmentAnchor(fragment);
    for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){
      const ship={x:target.x+dx*(game.storyReach(era)-0.5),z:target.z+dz*(game.storyReach(era)-0.5)};
      assert.equal(game.nearestFragment(world,lane,ship,era,[]),island.id,`${id}/${island.id}:船头靠近四面岸边均应出现入口`);
      assert.equal(game.nearestFragment(world,lane,ship,era,[island.id]),island.id,'已完成的历史岛仍能重读');
    }
    assert.equal(game.nearestFragment(world,lane==='near'?'far':'near',target,era,[]),null,'不可拾取另一航线的不可见岛屿');
  }
  const target=game.crisisAnchor(story);
  assert.deepEqual(target,{x:story.crisis.at.x+11.5,z:story.crisis.at.z-11});
  assert(game.inStoryReach({x:target.x-game.storyReach(era)+0.5,z:target.z},target,era),'第三章入口必须与可见标识对齐');
  assert(!game.inStoryReach({x:target.x+game.storyReach(era)+0.5,z:target.z},target,era));
}
console.log('通过：8条连续故事、24章、12种操作；渠网、装仓、线路、锅炉、疲劳、编码、提子；技术与安排分开结算并跨章保存。');
