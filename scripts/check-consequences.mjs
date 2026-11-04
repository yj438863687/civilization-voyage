import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(join(root,'apps/web/package.json'));
const file=join(mkdtempSync(join(tmpdir(),'cv-consequences-')),'game.cjs');
await require('esbuild').build({stdin:{contents:"export * from './src/world/consequences';export * from './src/world/encounters';export * from './src/world/voyageHistory';",resolveDir:join(root,'apps/web')},outfile:file,bundle:true,platform:'node',format:'cjs',logLevel:'silent'});
const game=require(file),base={...game.freshStats(),shipLevel:3,crewLevel:3,score:700,combo:4};
assert.equal(game.resourceFailure(base),null);
for(const [kind,supply,trust]of [['supplies',0,70],['trust',60,0],['both',0,0]]){
 const before={...base,supply,trust},next=game.recoverVoyage(before,kind);
 assert.equal(game.resourceFailure(before),kind);assert.equal(game.resourceFailure(next),null);assert.equal(next.score,500);assert.equal(next.combo,0);assert.equal(next.setbacks,1);
 assert.equal(next.shipLevel,kind==='trust'?3:2);assert.equal(next.crewLevel,kind==='supplies'?3:2);
 assert.equal(next.hull,kind==='trust'?100:80);assert.equal(next.supply,kind==='trust'?60:35);assert.equal(next.trust,kind==='supplies'?70:30);
 assert.strictEqual(game.recoverVoyage(next,kind),next,'Recovery must not charge twice');assert.equal(before.setbacks,0);
}
const poor=game.recoverVoyage({...base,supply:0,trust:0,score:50,hull:5,shipLevel:0,crewLevel:0},'both');assert.equal(poor.score,0);assert.equal(poor.hull,0);assert.equal(poor.shipLevel,0);assert.equal(poor.crewLevel,0);
const encounter=game.encounterFor('A-stake'),state={'history:A-water':'care'};
assert.equal(game.supportedEncounter(encounter,state,20).social.options[0].out.supply,encounter.social.options[0].out.supply);
assert.equal(game.supportedEncounter(encounter,state,21).social.options[0].out.supply,encounter.social.options[0].out.supply+3);
assert.equal(game.voyageVerdict({...base,supply:70,trust:20}).title,'满舱而独行');assert.equal(game.voyageVerdict({...base,supply:10,trust:70}).title,'同行，却难以为继');assert.equal(game.voyageVerdict({...base,supply:40,trust:70}).title,'共同远行');assert.equal(game.voyageVerdict({...base,supply:40,trust:70,setbacks:1}).title,'重整后的共同远行');
const outcome=game.applyOutcome({...base,supply:6,trust:70},{supply:-6,trust:8,text:'choice'},'test','A','test');assert.equal(outcome.supply,0);assert.equal(game.resourceFailure(outcome),'supplies');assert.equal(outcome.setbacks,0);
console.log('Passed: resource failure kinds, bounded losses, one-charge recovery, trust-gated cooperation, saved setback counts and distinct endings.');
