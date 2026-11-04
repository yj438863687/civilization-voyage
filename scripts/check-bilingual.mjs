import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,readdirSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(join(root,'apps/web/package.json')),ts=require('typescript');
const memory=new Map();Object.defineProperty(globalThis,'localStorage',{value:{getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value))},configurable:true});
const output=join(mkdtempSync(join(tmpdir(),'cv-bilingual-')),'game.cjs');
await require('esbuild').build({stdin:{contents:"export * from './src/i18n';export * from './src/world/voyageHistory';export * from './src/world/encounters';export * from './src/world/stories';export * from './src/world/progression';export * from './src/world/world.config';export * from './src/world/taoyuan';export * from './src/world/laneSeals';",resolveDir:join(root,'apps/web')},outfile:output,bundle:true,platform:'node',format:'cjs',logLevel:'silent'});
const game=require(output),english=JSON.parse(readFileSync(join(root,'apps/web/src/i18n/history.en.json'),'utf8')),han=/[\u3400-\u9fff]/;
const snapshot=JSON.stringify(game.HISTORY_ROUTES);game.setLanguage('en');assert.equal(memory.get('cv.language.v1'),'en');
const pending=[];let strings=0;
function text(value,label){if(typeof value==='string'&&han.test(value)){strings++;assert(!han.test(game.localize(value)),label+': '+value);}}
function renderFields(value,label){if(typeof value==='string')text(value,label);else if(value&&typeof value==='object')for(const [key,v]of Object.entries(value))if(!['source','sources','set','id','author','url','license','licenseUrl'].includes(key))renderFields(v,label+'.'+key);}
for(const [key,route]of Object.entries(game.HISTORY_ROUTES)){
 const translated=english[key];assert(translated,key);assert.equal(translated.region,key.endsWith('near')?'China':'World');
 for(const [index,scene]of [...route.islands,route.crisis].entries()){
  const en=index<2?translated.islands[index]:translated.crisis;assert.equal(en.id,scene.id);assert.equal(en.year,scene.year);assert.deepEqual(en.source,scene.source);
  for(let choice=0;choice<2;choice++){assert.equal(en.options[choice].supply,scene.options[choice].supply);assert.equal(en.options[choice].trust,scene.options[choice].trust);}
  renderFields(scene,scene.id);
  const [era,lane]=key.split('-');renderFields(index<2?game.encounterFor(scene.id):game.storyFor(era,lane).crisis.enc,scene.id);
 }
 assert.equal(translated.ending.year,route.ending.year);assert.equal(translated.ending.deathYear,route.ending.deathYear);renderFields(route.ending,key+'.ending');
}
for(const era of ['A','B','C','D','test']){renderFields(game.worldFor(era),era);renderFields(game.laneSealFor(era,'near'),era);renderFields(game.laneSealFor(era,'far'),era);}
renderFields(game.TAOYUAN_ENC,'side-story');renderFields(game.TAOYUAN_HINT,'side-story');renderFields(game.TAOYUAN_ECHO,'side-story');renderFields(game.TAOYUAN_FINALE,'side-story');
function scan(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())scan(path);else if(path.endsWith('.tsx')){const ast=ts.createSourceFile(path,readFileSync(path,'utf8'),99,true);function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(ast)==='localize')for(const arg of node.arguments){function check(part){if(ts.isStringLiteralLike(part)&&han.test(part.text)){strings++;if(han.test(game.localize(part.text)))pending.push(part.text);}ts.forEachChild(part,check);}check(arg);}ts.forEachChild(node,visit);}visit(ast);}}}
scan(join(root,'apps/web/src'));assert.deepEqual([...new Set(pending)],[],'Missing UI translations');
assert.equal(JSON.stringify(game.HISTORY_ROUTES),snapshot,'Changing display language must not rewrite the story');
const object={id:'A-water',supply:80};assert.strictEqual(game.localize(object),object);assert.equal(game.localize(0),0);game.setLanguage('zh');assert.equal(game.localize('补给'),'补给');assert.equal(memory.get('cv.language.v1'),'zh');
const people=readFileSync(join(root,'apps/web/src/world/People.tsx'),'utf8');assert(people.includes('crew-tailored-uniform'));assert(people.includes('crew-fitted-cap'));assert(people.includes('crew-fleet-insignia'));
const water=readFileSync(join(root,'apps/web/src/world/WaterGameScene.tsx'),'utf8');assert(!water.includes('text.slice('));assert(!water.includes('sub.slice('));
console.log(`Passed: ${strings} localized text checks; 24 English scenes preserve IDs, dates, resources and sources; preferences persist, data stays unchanged, water labels are not truncated.`);
