import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,existsSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(join(root,'apps/web/package.json'));
const output=join(mkdtempSync(join(tmpdir(),'cv-history-')),'data.cjs');
await require('esbuild').build({stdin:{contents:"export * from './src/world/islandBackgrounds';export * from './src/world/encounters';export * from './src/world/voyageHistory';export * from './src/world/progression';export * from './src/world/stories';",resolveDir:join(root,'apps/web')},outfile:output,bundle:true,platform:'node',format:'cjs',logLevel:'silent'});
const game=require(output);
assert.equal(Object.keys(game.ISLAND_BACKGROUNDS).length,24);
assert.equal(Object.keys(game.HISTORY_ROUTES).length,8);
for(const [key,route] of Object.entries(game.HISTORY_ROUTES)){
 assert.equal(route.region,key.endsWith('near')?'中国':'世界');
 const scenes=[...route.islands,route.crisis],years=scenes.map(s=>s.year).filter(y=>y!==null);
 assert.deepEqual(years,[...years].sort((a,b)=>a-b),key);
 assert(route.ending.year>=years.at(-1),key);
 if(route.ending.deathYear)assert(route.ending.year<=route.ending.deathYear,key);
 const [era,lane]=key.split('-'),story=game.storyFor(era,lane);assert.equal(story.figure.name,route.ending.name);
 assert(!story.figure.quote,'创作独白不能伪装史料引文');
 for(const [index,scene] of scenes.entries()){
  assert(scene.source.url.startsWith('https://'));assert(scene.options.length===2);
  assert(scene.nature);if(scene.year===null)assert.equal(key,'A-near');
  const image=game.BACKGROUND_MEDIA[scene.image];assert(image?.license&&image.author,scene.id);assert(existsSync(join(root,'apps/web/public',image.src)),image.src);
  const enc=index<2?game.encounterFor(scene.id):story.crisis.enc;assert(enc.stage||index===2,scene.id);assert.equal(enc.who,scene.who);assert.equal(enc.historyId,scene.id);
  const care=game.historyOutcome(scene,1);assert(care.supply<0&&care.trust>0);
  if(index>0){const previous=scenes[index-1];const supported=game.supportedEncounter(enc,{[`history:${previous.id}`]:'care'});const before=enc.game.kind==='choice'?enc.game.options[0].out:enc.social.options[0].out;const after=supported.game.kind==='choice'?supported.game.options[0].out:supported.social.options[0].out;assert.equal(after.supply,before.supply+3);assert.equal(before.supply,scene.options[0].supply);}
 }
 const recap=story.figure.speak(Object.fromEntries(scenes.map(s=>[`history:${s.id}:text`,'已安排共同维护'])));assert.equal(recap.length,4);assert(recap.slice(0,3).every(line=>line.includes('已安排共同维护')));
}
let stats={...game.freshStats(),supply:100,trust:100};for(let i=1;i<=3;i++){stats=game.upgradeShip(stats);stats=game.upgradeCrew(stats);assert.equal(stats.shipLevel,i);assert.equal(stats.crewLevel,i);}assert.equal(stats.supply,22);assert.equal(stats.trust,100);assert.strictEqual(game.upgradeShip(stats),stats);assert.strictEqual(game.upgradeCrew(stats),stats);assert.strictEqual(game.upgradeShip({...stats,shipLevel:0,supply:32}).shipLevel,0);
const after=game.applyOutcome(stats,{supply:1,trust:-1,text:'沿途安排'},'test','A','test');assert.equal(after.shipLevel,3);assert.equal(after.crewLevel,3);
for(const file of ['world/FableStage.tsx','world/ShoreFigure.tsx','world/Sea.tsx','world/waterGame.ts'])assert(existsSync(join(root,'apps/web/src',file)));
const app=readFileSync(join(root,'apps/web/src/App.tsx'),'utf8');assert(!app.includes('HistoryEncounter'));assert(!app.includes('PresentationDemo'));assert(app.includes('!sealedHere'));
console.log('通过：8条中国/世界航线，24站年代、来源、素材、总结者年代边界及选择回顾；合作支援、三级外观、扣费保底、等级上限和结算保留。');
