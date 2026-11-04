import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {readFileSync,existsSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(join(root,'apps/web/package.json'));
const output=join(mkdtempSync(join(tmpdir(),'cv-original-')),'data.cjs');
await require('esbuild').build({stdin:{contents:"export * from './src/world/islandBackgrounds';export * from './src/world/encounters';",resolveDir:join(root,'apps/web')},outfile:output,bundle:true,platform:'node',format:'cjs',logLevel:'silent'});
const game=require(output);
assert.equal(Object.keys(game.ISLAND_BACKGROUNDS).length,16);
for(const [id,note] of Object.entries(game.ISLAND_BACKGROUNDS)){
  assert(game.encounterFor(id)?.stage,id);
  const image=game.BACKGROUND_MEDIA[note.image];assert(image&&image.license&&image.author,id);
  assert(image.url.startsWith('https://'));assert(existsSync(join(root,'apps/web/public',image.src)),image.src);
}
for(const file of ['world/encounters.ts','world/stories.ts','world/FableStage.tsx','world/IslandStages.tsx','world/Figure.tsx','world/ShoreFigure.tsx','world/Sea.tsx','world/VoyageCanvas.tsx','world/world.config.ts','world/fable.ts','world/waterGame.ts','components/Encounter.tsx','components/Story.tsx','styles/app.css']){
  const path='apps/web/src/'+file;
  assert(readFileSync(join(root,path)).equals(execFileSync('git',['show',`c1a8fe8:${path}`],{cwd:root})),`${file}: 必须保持原版内容`);
}
console.log('通过：16座原版故事岛均有配图与来源；人物、场景、字幕、故事和玩法的14个核心文件与c1a8fe8逐字一致。');
