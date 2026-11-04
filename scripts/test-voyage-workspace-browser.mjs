import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {dirname,join,resolve} from 'node:path';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(join(root,'apps/web/package.json'));
const {chromium}=require(process.env.VOYAGE_PLAYWRIGHT_MODULE??'playwright');
const base=process.env.VOYAGE_TEST_URL??'http://127.0.0.1:5175',api=process.env.VOYAGE_TEST_API??'http://127.0.0.1:8015';
const out=join(root,'.impeccable/presentation');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.VOYAGE_BROWSER_EXECUTABLE?{executablePath:process.env.VOYAGE_BROWSER_EXECUTABLE}:{})});
const context=await browser.newContext({viewport:{width:1600,height:1000},...(process.argv.includes('--record')?{recordVideo:{dir:out,size:{width:1280,height:800}}}:{})});
await context.addInitScript(()=>{localStorage.setItem('cv.player.v1',JSON.stringify({id:'presentation-captain',name:'演示船长',salt:'test',hash:'test',createdAt:Date.now()}));sessionStorage.setItem('cv.session.v1','presentation-captain');localStorage.setItem('cv.reduceMotion','1');});
const page=await context.newPage(),errors=[],marks=[],started=Date.now();page.on('pageerror',error=>errors.push(error.message));
await page.route('**/api/**',async route=>{const url=new URL(route.request().url());if(!url.pathname.startsWith('/api/'))return route.continue();const response=await route.fetch({url:api+url.pathname.slice(4)+url.search});await route.fulfill({response});});
const mark=async(name,file)=>{marks.push({name,seconds:(Date.now()-started)/1000});if(file){await page.screenshot({path:join(out,file+'.png')});if(file==='06-city')await page.locator('.demo-city-panel').screenshot({path:join(out,'06-city-panel.png')});if(file==='02-route')await page.locator('.demo-route-options').screenshot({path:join(out,'02-route-cards.png')});if(file==='07-reflection')await page.locator('.demo-retrieval-answer').screenshot({path:join(out,'07-retrieval-answer.png')});}console.log(name);if(process.argv.includes('--record'))await page.waitForTimeout(/agents|city|reflection/.test(file??'')?7000:2000);};
const workspace=()=>page.getByRole('dialog',{name:'文化驾驶舱与文明工作台'});
async function openWorkspace(){await page.getByRole('button',{name:'船上书房 · 资料与模型',exact:true}).click();await workspace().waitFor();}
async function closeWorkspace(){await workspace().getByRole('button',{name:'回到航程',exact:true}).click();await workspace().waitFor({state:'hidden'});}
const keys=new Set();
async function control(wanted){for(const key of [...keys])if(!wanted.includes(key)){await page.keyboard.up(key);keys.delete(key);}for(const key of wanted)if(!keys.has(key)){await page.keyboard.down(key);keys.add(key);}}
const wrap=angle=>Math.atan2(Math.sin(angle),Math.cos(angle));
async function sailTo(target,reach=12.5){
  const deadline=Date.now()+55000;let last=Date.now(),prior=null;
  while(Date.now()<deadline){const ship=await page.evaluate(()=>window.__cv);assert(ship,'Ship snapshot missing');const dx=target.x-ship.x,dz=target.z-ship.z,d=Math.hypot(dx,dz);if(d<reach){await control([]);await page.waitForTimeout(450);return;}
    const desired=Math.atan2(-dx,-dz),error=wrap(desired-ship.yaw),wanted=[];if(Math.abs(error)>.055)wanted.push(error>0?'a':'d');if(Math.abs(error)<.45)wanted.push('w');await control(wanted);await page.waitForTimeout(180);
    if(Date.now()-last>10000){console.log('航行',JSON.stringify({target,x:Math.round(ship.x),z:Math.round(ship.z),distance:Math.round(d)}));if(prior&&Math.hypot(ship.x-prior.x,ship.z-prior.z)<.7){await control(['s']);await page.waitForTimeout(650);}prior=ship;last=Date.now();}
  }
  await control([]);throw new Error('真实键盘航行未抵达 '+JSON.stringify(target));
}
async function pipes(repair=false){const solution={7:1,8:1,9:1,10:1,11:1,12:3,17:0,18:1,19:1};for(const[cell,turns]of Object.entries(solution)){const current=repair?(Number(cell)===7?2:turns):0;for(let index=0;index<(turns-current+4)%4;index++)await page.getByRole('button',{name:new RegExp(`^渠段 ${Number(cell)+1}，`)}).click();}await page.getByRole('button',{name:'试放水',exact:true}).click();await page.getByRole('button',{name:'记下渠图',exact:true}).click();}
async function finishChapter(){await page.getByRole('button',{name:'带着这个结果做决定'}).click();await page.locator('.history-decision button').nth(1).click();await page.getByRole('button',{name:'照这个安排做'}).click();await page.getByRole('button',{name:'记下这一站，回到船上'}).click();await page.locator('.history-overlay').waitFor({state:'hidden'});}
try{
  await page.goto(base);await page.locator('.cine-scene').filter({hasText:'农业时代'}).click();const seal=page.getByRole('button',{name:'启航',exact:true});await seal.focus();await page.keyboard.down('Enter');await page.waitForTimeout(750);await page.keyboard.up('Enter');await page.getByRole('button',{name:'船上书房 · 可选资料与模型设置',exact:true}).click();await workspace().waitFor({timeout:20000});
  await workspace().getByRole('button',{name:'听取资料核对建议'}).click();await workspace().getByRole('button',{name:'听取方案比较建议'}).click();assert((await page.locator('.demo-conversation').innerText()).includes('预设演示台词'));await mark('可选书房：真实游戏航程、资料工具与问题','01-cockpit');
  await workspace().getByRole('button',{name:'确认问题，查看整理方式'}).click();await page.locator('.demo-route-options button').filter({hasText:'考察线'}).click();await mark('线路：内海中国、考察线、12份真实准备补给','02-route');
  await workspace().getByRole('button',{name:'确认任务与线路，进入现有海图'}).click();await workspace().waitFor({state:'hidden'});await page.waitForFunction(()=>!!window.__cv);if(await page.locator('.epoch-intro').count())await page.locator('.epoch-intro').click();
  const voyageId=await page.evaluate(()=>localStorage.getItem('cv.lastVoyageId'));
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('cv.stats.v1')).supply),68);
  await openWorkspace();assert(await workspace().getByRole('button',{name:'执行资料员任务'}).isDisabled());await workspace().getByRole('button',{name:'回到海图，继续实际航程'}).click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('cv.stats.v1')).supply),68,'Reopening must not charge preparation again');
  await sailTo({x:43.5,z:-5.5});await page.keyboard.press('e');await page.getByRole('button',{name:/进入故事/}).click();await pipes();await mark('第一岛：实际连渠、试水与共同生活的安排','03-first-island');await finishChapter();
  await openWorkspace();await workspace().getByRole('button',{name:'执行资料员任务'}).click();assert((await page.locator('.demo-agent-output').innerText()).includes('1份'));assert(await workspace().getByRole('button',{name:'执行复核员任务'}).isDisabled());await closeWorkspace();
  await sailTo({x:83.5,z:-17.5});await page.keyboard.press('e');await page.getByRole('button',{name:/进入故事/}).click();await pipes(true);await finishChapter();
  await sailTo({x:95.5,z:-61});await page.keyboard.press('e');await page.getByRole('button',{name:/进入故事/}).click();for(const[piece,origin]of[[0,0],[1,3],[2,4],[3,12],[4,2]]){await page.locator('.cargo-pieces button').nth(piece).click();await page.locator('.cargo-grid button').nth(origin).click();}await page.getByRole('button',{name:'检查装载'}).click();await finishChapter();await mark('三章完成：来源、操作、补给与人心均留在原航程','04-three-chapters');
  await openWorkspace();await workspace().getByRole('button',{name:'整理新收入的碎片'}).click();await workspace().getByRole('button',{name:'执行复核员任务'}).click();await workspace().getByRole('button',{name:'执行建造员任务'}).click();await mark('Agents：只使用已完成的三章材料，产出可复核方案','05-agents');
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('cv.stats.v1')));await workspace().getByRole('button',{name:'批准方案，建成港城'}).click();await page.locator('.demo-city[data-built="true"]').waitFor();await page.waitForTimeout(600);await mark('文明成果：玩家批准，港城与原航程日志连通','06-city');const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('cv.stats.v1')));assert.equal(after.supply,before.supply);assert.equal(after.trust,before.trust,'City must not duplicate chapter rewards');
  await workspace().getByRole('button',{name:'进入航程反思'}).click();await page.getByRole('button',{name:'检索文化材料'}).click();assert(await page.locator('.demo-evidence li').count()>0);await mark('反思与检索：真实取回来源，提取式摘要明确标注','07-reflection');
  const downloadEvent=page.waitForEvent('download');await workspace().getByRole('button',{name:'导出航程成果与用量'}).click();const download=await downloadEvent;await download.saveAs(join(out,'actual-voyage-record.json'));
  const records=await(await fetch(`${api}/voyages/${voyageId}/records`)).json();assert.equal(records.filter(item=>item.text.startsWith('线路准备记录\n')).length,1);assert.equal(records.filter(item=>item.text.startsWith('文明共建成果\n')).length,1);assert(records.some(item=>item.kind==='reflection'));assert(records.filter(item=>item.kind==='fragment').length>=2);
  await closeWorkspace();await sailTo({x:22,z:-96},14);await mark('海图上的原港口已变成玩家批准的文明成果','08-world-city');
  await page.reload();await page.waitForFunction(()=>!!window.__cv);await openWorkspace();assert.equal(await workspace().getAttribute('data-step'),'3');assert((await page.locator('.demo-status').innerText()).includes('考察线'));await closeWorkspace();
  assert.deepEqual(errors,[]);writeFileSync(join(out,'verification.json'),JSON.stringify({voyageId,base,api,marks,records:records.map(({kind,text,material_ids})=>({kind,title:text.split('\n')[0],material_ids})),pageErrors:errors,verifiedAt:new Date().toISOString()},null,2));
  console.log('通过：原游戏驾驶舱→线路→真实键盘航行→三章操作→真实碎片Agent→建城→反思检索；筹备只扣一次、建城不重复奖励、成果存入同一后端、刷新恢复，无页面错误。');
}catch(error){await control([]);console.error((await page.locator('body').innerText()).slice(-5000));await page.screenshot({path:join(out,'failure.png')});throw error;}
finally{await context.close();if(page.video())writeFileSync(join(out,'video-path.txt'),await page.video().path());await browser.close();}
