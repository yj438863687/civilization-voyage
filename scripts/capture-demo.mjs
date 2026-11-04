// Actual browser recordings with isolated prepared saves. No outcomes are injected.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(join(root,'apps/web/package.json'));
await require('esbuild').build({stdin:{contents:"export * from './src/world/encounters';export * from './src/world/world.config';export * from './src/world/stories';export * from './src/world/voyageHistory';",resolveDir:join(root,'apps/web')},outfile:'/tmp/cv-demo-game.cjs',bundle:true,platform:'node',format:'cjs',logLevel:'silent'});
const game=require('/tmp/cv-demo-game.cjs'),{chromium}=require(process.env.VOYAGE_PLAYWRIGHT_MODULE??'playwright');
const api=process.env.VOYAGE_TEST_API??'http://127.0.0.1:8015',base=process.env.VOYAGE_TEST_URL??'http://127.0.0.1:5175';
assert(new URL(api).hostname==='127.0.0.1'&&new URL(api).port==='8015','Capture must use the disposable test API');
const out=join(root,'.impeccable/demo-v3/raw-sync');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding'],...(process.env.VOYAGE_BROWSER_EXECUTABLE?{executablePath:process.env.VOYAGE_BROWSER_EXECUTABLE}:{})});
const manifestPath=join(out,'manifest.json'),manifest=existsSync(manifestPath)?JSON.parse(readFileSync(manifestPath,'utf8')):[];
// Keep the request body readable on error without consuming a successful JSON body.
async function call(path,body,method='POST'){const response=await fetch(api+path,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!response.ok)throw new Error(path+': '+response.status+' '+await response.text());return response.json();}
async function prepare(id,{era='A',lane='near',position,stage='world',stats={},completed=[],crisis=[],shore=[]}={}){
 const route=game.historyFor(era,lane),world=game.worldFor(era),story=game.storyFor(era,lane),state={};
 const candidate=JSON.parse(readFileSync(join(root,`content/scenes/candidates/${era}.json`),'utf8'));await call('/scenes/candidates',candidate,'PUT');
 const voyage=await call('/voyages',{title:'Demo capture: '+id,scene_id:era,scene_version:candidate.version,scene_track:'candidate',question:route.question});
 for(const item of completed){const scene=[...route.islands,route.crisis].find(scene=>scene.id===item.id);const index=item.choice??1;Object.assign(state,game.historyOutcome(scene,index).set);if(route.islands.some(s=>s.id===scene.id))await call(`/voyages/${voyage.id}/records`,{kind:'fragment',text:scene.title+'\n'+scene.options[index].text,classification:'creative',sources:[],material_ids:[scene.id],version:1,access:'private'});}
 await call(`/voyages/${voyage.id}`,{stage,question:route.question,shared_task:'',crew:[],route:null,world:{lane,ship:position??world.spawn}},'PUT');
 const context=await browser.newContext({viewport:{width:1600,height:900},recordVideo:{dir:out,size:{width:1600,height:900}}});
 await context.addInitScript(({voyage,stats,progress})=>{
  localStorage.setItem('cv.player.v1',JSON.stringify({id:'demo-capture',name:'Alex',salt:'demo',hash:'demo',createdAt:Date.now()}));sessionStorage.setItem('cv.session.v1','demo-capture');
  localStorage.setItem('cv.lastVoyageId',voyage);localStorage.setItem('cv.stats.v1',JSON.stringify(stats));localStorage.setItem('cv.story.v1',JSON.stringify({[voyage]:progress}));
  localStorage.setItem('cv.language.v1','en');localStorage.setItem('cv.largeText.v1','1');localStorage.setItem('cv.reduceMotion','1');localStorage.setItem('cv.music.v1',JSON.stringify({enabled:true,effects:true,volume:.4}));
  const originalConnect=AudioNode.prototype.connect,outputs=new Map();let capture=null;
  AudioNode.prototype.connect=function(destination,...args){
   const result=originalConnect.call(this,destination,...args);
   if(destination instanceof AudioDestinationNode&&this.context!==capture?.context){
    if(!capture){const context=new AudioContext(),sink=context.createMediaStreamDestination(),meter=context.createAnalyser();originalConnect.call(meter,sink);const recorder=new MediaRecorder(sink.stream,{mimeType:'audio/webm;codecs=opus'}),chunks=[];capture={context,sink,meter,recorder,chunks,started:Date.now()};window.__cvCapture=capture;recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};recorder.start(200);void context.resume();}
    let tap=outputs.get(this.context);if(!tap){tap=this.context.createMediaStreamDestination();outputs.set(this.context,tap);const source=capture.context.createMediaStreamSource(tap.stream);originalConnect.call(source,capture.meter);}
    originalConnect.call(this,tap);
   }
   return result;
  };
 },{voyage:voyage.id,stats:{...game.freshStats(),supply:80,trust:70,...stats},progress:{beats:story.beats.map(b=>b.id),crisis,shore,state}});
 const started=Date.now(),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/api/**',async route=>{const url=new URL(route.request().url());if(!url.pathname.startsWith('/api/'))return route.continue();const response=await route.fetch({url:api+url.pathname.slice(4)+url.search});await route.fulfill({response});});
 await page.goto(base);await page.waitForFunction(()=>!!window.__cv);if(await page.locator('.epoch-intro').count())await page.locator('.epoch-intro').click();
 await page.getByRole('button',{name:'English',exact:true}).click();await page.waitForFunction(()=>window.__cvCapture?.recorder.state==='recording');
 if(position&&stage==='world'){await page.getByRole('button',{name:'Shipyard & Outfits · B',exact:true}).click();await page.getByRole('dialog',{name:'Shipyard & Outfits',exact:true}).waitFor();}
 await page.waitForTimeout(4600);
 if(position&&stage==='world'){await page.keyboard.press('Escape');await page.locator('.shipyard-overlay').waitFor({state:'hidden'});}
 await page.waitForTimeout(350);
 const markerWall=await page.evaluate(()=>{
  const capture=window.__cvCapture,marker=document.createElement('div');marker.id='capture-sync';Object.assign(marker.style,{position:'fixed',left:'32px',top:'32px',width:'64px',height:'64px',background:'#ff00ff',zIndex:'99999'});document.body.append(marker);
  const osc=capture.context.createOscillator(),gain=capture.context.createGain();osc.frequency.value=5000;gain.gain.value=.28;osc.connect(gain);gain.connect(capture.meter);osc.start(capture.context.currentTime+.04);osc.stop(capture.context.currentTime+.24);return Date.now();
 });
 await page.waitForTimeout(400);await page.evaluate(()=>document.getElementById('capture-sync').remove());await page.waitForTimeout(450);
 const actionWall=Date.now(),trimStart=(actionWall-started)/1000;
 const held=new Set();async function keys(next){for(const key of [...held])if(!next.has(key)){await page.keyboard.up(key);held.delete(key);}for(const key of next)if(!held.has(key)){await page.keyboard.down(key);held.add(key);}}
 async function speak(){await page.locator('.interact-prompt').waitFor();await page.keyboard.press('e');await page.locator('.enc-name').waitFor();await page.waitForTimeout(900);await page.keyboard.press('Space');await page.waitForTimeout(1400);for(let i=0;i<20&&!await page.locator('.enc-water').count();i++){await page.keyboard.press('Space');await page.waitForTimeout(110);}await page.locator('.enc-water').waitFor();}
 async function drive({choice,seconds=45}={}){
  let explicit=null;
  if(choice!==undefined){const data=await page.evaluate(async()=>({ship:window.__cv,target:(await import('/src/world/waterGame.ts')).waterLive.target}));if(!data.target)await page.waitForTimeout(180);const current=await page.evaluate(async()=>({ship:window.__cv,target:(await import('/src/world/waterGame.ts')).waterLive.target}));assert(current.target,'Gate marker missing');const dx=current.target.x-current.ship.x,dz=current.target.z-current.ship.z,len=Math.hypot(dx,dz);explicit={x:current.target.x+(-dz/len)*(choice===0?-6.5:6.5),z:current.target.z+(dx/len)*(choice===0?-6.5:6.5)};}
  const until=Date.now()+seconds*1000;
  while(Date.now()<until){if(await page.locator('.enc-decision,.enc-result,.resource-ending').count())break;const data=await page.evaluate(async()=>({ship:window.__cv,target:(await import('/src/world/waterGame.ts')).waterLive.target}));const target=explicit??data.target;if(target){const dx=target.x-data.ship.x,dz=target.z-data.ship.z,dist=Math.hypot(dx,dz);let error=Math.atan2(dx,-dz)*180/Math.PI-data.ship.headingDeg;while(error>180)error-=360;while(error< -180)error+=360;const next=new Set();if(Math.abs(error)>6)next.add(error>0?'d':'a');if(dist>2.2&&Math.abs(error)<55)next.add('w');await keys(next);}await page.waitForTimeout(100);}
  await keys(new Set());
 }
 async function finish(extra={}){
  await keys(new Set());const trimEnd=(Date.now()-started)/1000;
  await page.screenshot({path:join(out,id+'-poster.png')});
  const audio=await page.evaluate(async()=>{const capture=window.__cvCapture;if(!capture)throw Error('Audio capture did not start');const data=new Float32Array(capture.meter.fftSize);capture.meter.getFloatTimeDomainData(data);const rms=Math.sqrt(data.reduce((sum,n)=>sum+n*n,0)/data.length);await new Promise(resolve=>{capture.recorder.onstop=resolve;capture.recorder.stop();});const blob=new Blob(capture.chunks,{type:'audio/webm'});const base64=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.readAsDataURL(blob);});return {base64,started:capture.started,rms};});
  writeFileSync(join(out,id+'-audio.webm'),Buffer.from(audio.base64,'base64'));assert.deepEqual(errors,[],id+' browser errors');
  const video=page.video();await context.close();await video.saveAs(join(out,id+'.webm'));
  const row={id,video:id+'.webm',audio:id+'-audio.webm',poster:id+'-poster.png',trimStart,trimEnd,audioOffset:(audio.started-started)/1000,preparedSave:true,sync:{markerWall:markerWall-started,actionAfterMarker:(actionWall-markerWall)/1000,beepDelay:.04},...extra};manifest.splice(0,manifest.length,...manifest.filter(item=>item.id!==id),row);writeFileSync(manifestPath,JSON.stringify(manifest,null,2));console.log('Recorded:',id,'seconds:',(trimEnd-trimStart).toFixed(1));
 }
 return {page,context,voyage,world,route,keys,speak,drive,finish};
}
async function doneResult(page){await page.locator('.enc-result').waitFor();await page.waitForTimeout(1000);await page.keyboard.press('Space');await page.locator('.enc').waitFor({state:'hidden'});}
const wanted=process.env.VOYAGE_CAPTURE_SHOTS?.split(',');const needed=id=>(!wanted||wanted.includes(id))&&!manifest.some(row=>row.id===id);
try{
 if(needed('opening')){const s=await prepare('opening');await s.keys(new Set(['w']));await s.page.waitForTimeout(5200);await s.keys(new Set(['w','a']));await s.page.waitForTimeout(900);await s.keys(new Set());await s.page.waitForTimeout(1600);await s.finish();}
 if(needed('routes')){const s=await prepare('routes',{stage:'cockpit'});await s.page.locator('.cine-cost').last().click();await s.page.waitForTimeout(1800);await s.page.getByRole('button',{name:'中文',exact:true}).click();await s.page.waitForTimeout(1800);await s.page.getByRole('button',{name:'English',exact:true}).click();await s.page.locator('.cine-cost').first().click();await s.page.waitForTimeout(1500);const seal=s.page.locator('.cine-depart .seal-btn');await seal.hover();await s.page.mouse.down();await s.page.waitForTimeout(800);await s.page.mouse.up();await s.page.locator('.hud-world-card').waitFor();if(await s.page.locator('.epoch-intro').count())await s.page.locator('.epoch-intro').click();await s.page.waitForTimeout(2000);await s.finish();}
 const first=game.worldFor('A').fragments.find(f=>f.id==='A-water'),firstPos={x:first.x+18.5,z:first.z-3.5,yaw:0};
 if(needed('interaction')){const s=await prepare('interaction',{position:firstPos});await s.page.getByRole('button',{name:'Image Notes · Gun',exact:true}).click();await s.page.locator('.island-background img').first().evaluate(img=>img.decode());await s.page.waitForTimeout(2800);await s.page.keyboard.press('Escape');await s.speak();await s.drive({choice:1});await doneResult(s.page);await s.page.waitForTimeout(1000);await s.finish();}
 if(needed('upgrades')){const s=await prepare('upgrades',{position:firstPos,stats:{supply:100,trust:80}});await s.page.getByRole('button',{name:'Shipyard & Outfits · B',exact:true}).click();const yard=s.page.getByRole('dialog',{name:'Shipyard & Outfits',exact:true});await yard.locator('.shipyard-catalog button').last().click();await s.page.waitForTimeout(1800);for(const name of ['Refit the Hull','Add Navigation Equipment','Raise the Fleet Flag','Everyday Uniform','Voyage Outfit','Fleet Insignia']){await yard.getByRole('button',{name,exact:true}).click();await s.page.waitForTimeout(400);}await yard.locator('.shipyard-preview').scrollIntoViewIfNeeded();await s.page.waitForTimeout(2600);await s.page.keyboard.press('Escape');await s.keys(new Set(['w']));await s.page.waitForTimeout(2400);await s.keys(new Set());await s.page.waitForTimeout(1000);await s.finish();}
 if(needed('supply_failure')){const second=game.worldFor('A').fragments.find(f=>f.id==='A-stake'),s=await prepare('supply_failure',{position:{x:second.x+18.5,z:second.z-3.5,yaw:0},stats:{supply:2,trust:70,shipLevel:3,crewLevel:2,score:700},completed:[{id:'A-water',choice:0}]});await s.speak();await s.drive();await s.page.locator('.enc-decision').waitFor();assert((await s.page.locator('.enc-decision').innerText()).includes('The task is complete'),'Hold task must succeed for the 2+4-6 example');await s.page.locator('.enc-decision button').last().click();await doneResult(s.page);const failure=s.page.getByRole('dialog',{name:'Voyage Interrupted',exact:true});await failure.waitFor();assert((await failure.innerText()).includes('An Empty Hold'));await s.page.waitForTimeout(4500);await failure.getByRole('button',{name:'Accept the Cost and Recover',exact:true}).click();await failure.waitFor({state:'hidden'});await s.page.waitForTimeout(2200);await s.finish({demonstration:'Prepared save: 2 supplies; actual successful task +4, cooperative choice -6; emergency recovery.'});}
 if(needed('trust_failure')){const s=await prepare('trust_failure',{position:firstPos,stats:{supply:60,trust:5,shipLevel:2,crewLevel:3,score:700}});await s.speak();await s.page.waitForTimeout(4000);await s.drive({choice:0});await doneResult(s.page);const failure=s.page.getByRole('dialog',{name:'Voyage Interrupted',exact:true});await failure.waitFor();assert((await failure.innerText()).includes('Orders Nobody Answers'));await s.page.waitForTimeout(4500);await failure.getByRole('button',{name:'End the Voyage with This Outcome',exact:true}).click();await s.page.locator('.cine-journal .voyage-verdict').waitFor();await s.page.waitForTimeout(2200);await s.finish({demonstration:'Prepared save: 5 trust; actual choice -5; recorded bad ending.'});}
 if(needed('outcomes')){const r=game.historyFor('D','far'),s=await prepare('outcomes',{era:'D',lane:'far',position:{x:22,z:-96,yaw:0},stats:{supply:40,trust:70,shipLevel:3,crewLevel:3},completed:[...r.islands,r.crisis].map(scene=>({id:scene.id,choice:1})),crisis:[r.crisis.id]});await s.page.waitForFunction(()=>!!window.__cv?.port);await s.page.keyboard.press('f');await s.page.locator('.shore').waitFor();for(let i=0;i<6&&await s.page.locator('.shore').count();i++){await s.page.keyboard.press('Space');await s.page.waitForTimeout(280);}if(await s.page.locator('.page').count())await s.page.getByRole('button',{name:'Close This Page',exact:true}).click();await s.page.locator('.cine-stop').nth(1).click();const seal=s.page.locator('.cine-panel .seal-btn');await seal.hover();await s.page.mouse.down();await s.page.waitForTimeout(800);await s.page.mouse.up();await s.page.locator('.page').waitFor();await s.page.waitForTimeout(1200);await s.page.getByRole('button',{name:'Close This Page',exact:true}).click();await s.page.locator('.finale .voyage-verdict').waitFor();assert((await s.page.locator('.finale .voyage-verdict').innerText()).includes('A Voyage We Can Share'));await s.page.waitForTimeout(4500);await s.finish({demonstration:'Prepared completed-route save; native shore reflection, sealing and balanced ending.'});}
 if(needed('closing')){const s=await prepare('closing',{era:'D',stats:{supply:60,trust:70,shipLevel:3,crewLevel:3}});await s.keys(new Set(['w']));await s.page.waitForTimeout(5500);await s.keys(new Set());await s.page.waitForTimeout(1800);await s.finish();}
}finally{await browser.close();}
