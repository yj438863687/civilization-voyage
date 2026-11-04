import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(join(root,'apps/web/package.json'));
const {chromium}=require(process.env.VOYAGE_PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({headless:true,...(process.env.VOYAGE_BROWSER_EXECUTABLE?{executablePath:process.env.VOYAGE_BROWSER_EXECUTABLE}:{})});
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
const base=(process.env.VOYAGE_TEST_URL??'http://127.0.0.1:5175')+'/tests/history.html',review=join(root,'.impeccable/review');mkdirSync(review,{recursive:true});
async function start(route,step=0){await page.goto(`${base}?route=${route}&step=${step}`);await page.getByRole('button',{name:/进入故事/}).click();}
async function imageDifference(first,second){return page.evaluate(async([first,second])=>{
  const load=async value=>createImageBitmap(new Blob([Uint8Array.from(atob(value),char=>char.charCodeAt(0))],{type:'image/png'}));
  const a=await load(first),b=await load(second),canvas=document.createElement('canvas');canvas.width=a.width;canvas.height=a.height;const ctx=canvas.getContext('2d');ctx.drawImage(a,0,0);const left=ctx.getImageData(0,0,a.width,a.height).data;ctx.clearRect(0,0,a.width,a.height);ctx.drawImage(b,0,0);const right=ctx.getImageData(0,0,a.width,a.height).data;
  let different=0;for(let i=0;i<left.length;i+=4)if(Math.abs(left[i]-right[i])+Math.abs(left[i+1]-right[i+1])+Math.abs(left[i+2]-right[i+2])>45)different++;return different/(a.width*a.height);
},[first.toString('base64'),second.toString('base64')]);}
try{
  if(!process.argv.includes('--interaction')){
  // Music is a continuing polyphonic score, with real waveform and independent controls.
  await page.addInitScript(()=>{
    window.__musicProbe={starts:[],buses:[]};const Native=window.AudioContext;
    window.AudioContext=class extends Native{constructor(options){super(options);const createGain=this.createGain.bind(this),createOscillator=this.createOscillator.bind(this);this.createGain=()=>{const node=createGain(),connect=node.connect.bind(node);node.connect=(...args)=>{if(args[0]===this.destination){const analyser=this.createAnalyser();analyser.connect(this.destination);window.__musicProbe.buses.push({gain:node,analyser,context:this});return connect(analyser);}return connect(...args);};return node;};this.createOscillator=()=>{const node=createOscillator(),start=node.start.bind(node);node.start=time=>{window.__musicProbe.starts.push({time,frequency:node.frequency.value});start(time);};return node;};}};
  });
  await page.goto(base+'?music');assert.equal(await page.evaluate(()=>window.__musicProbe.starts.length),0);
  await page.getByRole('button',{name:'切换时代 A'}).click();await page.locator('.voyage-music[data-playing="true"]').waitFor();
  await page.waitForFunction(()=>{const bus=window.__musicProbe.buses.at(-1),samples=new Float32Array(bus.analyser.fftSize);bus.analyser.getFloatTimeDomainData(samples);return samples.some(value=>Math.abs(value)>.0001);});
  const initial=await page.evaluate(()=>window.__musicProbe.starts.length);await page.waitForTimeout(1100);assert(await page.evaluate(()=>window.__musicProbe.starts.length)>initial,'Score must continue scheduling notes');
  assert(await page.evaluate(()=>new Set(window.__musicProbe.starts.map(note=>Math.round(note.frequency))).size)>4,'Melody, harmony and bass need different pitches');
  for(const era of ['B','C','D']){await page.getByRole('button',{name:`切换时代 ${era}`}).click();await page.locator(`.voyage-music[data-era="${era}"][data-playing="true"]`).waitFor();}
  await page.getByRole('button',{name:'操作音效避让'}).click();await page.waitForTimeout(100);const duck=await page.evaluate(()=>window.__musicProbe.buses.at(-1).gain.gain.value);await page.waitForTimeout(1300);assert(await page.evaluate(()=>window.__musicProbe.buses.at(-1).gain.gain.value)>duck,'Music must recover after ducking');
  await page.locator('.voyage-music summary').click();await page.getByRole('slider',{name:'配乐音量'}).fill('63');await page.getByRole('button',{name:'关闭背景音乐'}).click();const muted=await page.evaluate(()=>window.__musicProbe.starts.length);await page.waitForTimeout(600);assert.equal(await page.evaluate(()=>window.__musicProbe.starts.length),muted);await page.reload();await page.getByRole('button',{name:'切换时代 A'}).click();assert.equal(await page.locator('.voyage-music').getAttribute('data-playing'),'false');await page.locator('.voyage-music summary').click();assert.equal(await page.getByRole('slider',{name:'配乐音量'}).inputValue(),'63');await page.getByRole('button',{name:'开启背景音乐'}).click();await page.locator('.voyage-music[data-playing="true"]').waitFor();
  console.log('配乐通过：持续多声部波形、四时代切换、音效避让、静音和音量记忆。');

  const differences=[];
  for(const era of ['A','B','C','D']){
    await page.goto(base+`?yard&era=${era}`);await page.locator('.shipyard-preview canvas').waitFor();await page.waitForTimeout(700);
    const canvas=page.locator('.shipyard-preview canvas'),original=await canvas.screenshot({path:join(review,`refit-${era}-0.png`)});
    for(let level=1;level<=3;level++){
      await page.locator('.shipyard-catalog button').nth(level).click();await page.waitForTimeout(250);assert.equal(await page.locator('.shipyard-preview').getAttribute('data-ship-level'),String(level));
      const upgraded=await canvas.screenshot({path:join(review,`refit-${era}-${level}.png`)}),fraction=await imageDifference(original,upgraded);differences.push({era,level,fraction});assert(fraction>.018,`${era} stage ${level} only changed ${(fraction*100).toFixed(1)}% of preview`);
    }
    await page.getByRole('button',{name:'对照初始船型'}).click();assert.equal(await page.locator('.shipyard-preview').getAttribute('data-ship-level'),'0');await page.getByRole('button',{name:'回到所选改造'}).click();assert.equal(await page.locator('.shipyard-preview').getAttribute('data-ship-level'),'3');assert((await page.locator('.shipyard-purchase').innerText()).includes('补给 80'));
  }
  console.log('船型通过：四时代×四阶段实物预览、每次改造明显改变画面，对照不扣费。',differences.map(value=>`${value.era}${value.level}:${(value.fraction*100).toFixed(1)}%`).join(' '));

  for(const route of ['A-near','A-far','B-near','B-far','C-near','C-far','D-near','D-far'])for(let step=0;step<3;step++){
    await page.goto(`${base}?route=${route}&step=${step}`);const stage=page.getByRole('region',{name:'可互动的故事现场'});await stage.waitFor();for(let index=0;index<3;index++)await stage.locator('.story-stage-spots button').nth(index).click();assert((await stage.locator('.story-stage-heading').innerText()).includes('3/3'));assert((await stage.locator('.story-stage-voice').innerText()).length>25);
  }
  }
  await start('A-near',2);
  for(const[piece,origin]of[[0,0],[1,3],[2,4],[3,12],[4,2]])await page.locator('.cargo-pieces button').nth(piece).dragTo(page.locator('.cargo-grid button').nth(origin));
  await page.getByRole('button',{name:'检查装载'}).click();assert((await page.locator('.challenge-trial').innerText()).includes('100%'));
  await start('B-near');for(const[index,word]of['观察器物','比照图样','确定译名','复核尺寸','交给工匠'].entries())await page.locator('.type-pieces').getByRole('button',{name:word,exact:true}).dragTo(page.locator('.print-slots li').nth(index));
  await page.locator('.print-slots button').nth(4).dragTo(page.locator('.print-slots li').nth(0));await page.locator('.print-slots button').nth(0).dragTo(page.locator('.print-slots li').nth(4));await page.getByRole('button',{name:'试印校样'}).click();assert((await page.locator('.challenge-trial').innerText()).includes('100%'));
  await start('B-near',2);await page.locator('.route-board').scrollIntoViewIfNeeded();
  const positions=[];for(const cell of[24,18,12,6,0,1,2,3,4,5]){const box=await page.locator('.route-board button').nth(cell).boundingBox();positions.push({x:box.x+box.width/2,y:box.y+box.height/2});}
  await page.mouse.move(positions[0].x,positions[0].y);await page.mouse.down();for(const position of positions.slice(1))await page.mouse.move(position.x,position.y,{steps:4});await page.mouse.up();assert.equal(await page.locator('.route-board button[aria-pressed="true"]').count(),10);
  await page.getByRole('button',{name:'验收线路'}).click();await page.getByRole('button',{name:'带着这个结果做决定'}).click();assert.equal(await page.locator('.history-decision button').first().evaluate(element=>getComputedStyle(element).transitionProperty),'border-color');const first=await page.locator('.theatre-delivery > path').first().getAttribute('d');await page.locator('.history-decision button').nth(1).click();assert.notEqual(await page.locator('.theatre-delivery > path').first().getAttribute('d'),first);
  await page.screenshot({path:join(review,'interactive-story-desktop.png')});
  await start('B-far');for(const name of['加煤','加煤','带动机器'])await page.getByRole('button',{name,exact:true}).click();await page.waitForFunction(()=>document.querySelector('.story-theatre')?.getAttribute('data-progress')==='0.25');assert((await page.locator('.story-stage-consequence').innerText()).includes('产出功 2/8'));
  await page.setViewportSize({width:390,height:844});await page.locator('.engine-machine').scrollIntoViewIfNeeded();await page.screenshot({path:join(review,'interactive-story-mobile.png')});assert(await page.locator('.history-island').evaluate(element=>element.scrollWidth<=element.clientWidth+1));
  console.log('互动通过：拖拽装满船仓、排字与重排、连续铺线、安排改变物资去向、操作同步改变现场、手机布局。');
  const touchContext=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),touchPage=await touchContext.newPage();touchPage.on('pageerror',error=>errors.push(error.message));const cdp=await touchContext.newCDPSession(touchPage);
  const touchStart=async(route,step)=>{await touchPage.goto(`${base}?route=${route}&step=${step}`);await touchPage.getByRole('button',{name:/进入故事/}).tap();};
  const point=async locator=>{const box=await locator.boundingBox();return{x:box.x+box.width/2,y:box.y+box.height/2};};
  const drag=async points=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...points[0],id:0}]});for(const value of points.slice(1))await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...value,id:0}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
  await touchStart('A-near',2);await touchPage.locator('.cargo-pieces').scrollIntoViewIfNeeded();await drag([await point(touchPage.locator('.cargo-pieces button').first()),await point(touchPage.locator('.cargo-grid button').first())]);assert.equal(await touchPage.locator('.cargo-grid button[data-cargo="0"]').count(),2);
  await touchStart('B-near',0);await touchPage.locator('.type-pieces').scrollIntoViewIfNeeded();await drag([await point(touchPage.locator('.type-pieces button').nth(1)),await point(touchPage.locator('.print-slots li').first())]);assert.equal(await touchPage.locator('.print-slots button').first().innerText(),'观察器物');
  await touchStart('B-near',2);await touchPage.locator('.route-board').scrollIntoViewIfNeeded();const points=[];for(const cell of[24,18,12,6,0,1,2,3,4,5])points.push(await point(touchPage.locator('.route-board button').nth(cell)));await drag(points);assert.equal(await touchPage.locator('.route-board button[aria-pressed="true"]').count(),10);await touchContext.close();console.log('手机触控通过：真实触控装仓、排字与连续铺线。');
  assert.deepEqual(errors,[]);
}finally{await browser.close();}
