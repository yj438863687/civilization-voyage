import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.VOYAGE_PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({headless:true,...(process.env.VOYAGE_BROWSER_EXECUTABLE?{executablePath:process.env.VOYAGE_BROWSER_EXECUTABLE}:{})});
const context=await browser.newContext({viewport:{width:2560,height:1440}});
await context.addInitScript(()=>{localStorage.setItem('cv.player.v1',JSON.stringify({id:'cover-capture',name:'Alex',salt:'demo',hash:'demo',createdAt:Date.now()}));sessionStorage.setItem('cv.session.v1','cover-capture');localStorage.setItem('cv.language.v1','en');localStorage.setItem('cv.reduceMotion','1');});
const page=await context.newPage();page.on('pageerror',error=>console.log('PAGE ERROR:',error.message));page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE:',m.text().slice(0,500));});await page.route('**/api/**',async route=>{const url=new URL(route.request().url());if(!url.pathname.startsWith('/api/'))return route.continue();const response=await route.fetch({url:'http://127.0.0.1:8015'+url.pathname.slice(4)+url.search});await route.fulfill({response});});
await page.goto('http://127.0.0.1:5180',{waitUntil:'domcontentloaded'});await page.waitForTimeout(5000);console.log((await page.locator('body').innerText()).slice(0,1800));mkdirSync('.impeccable/harbour-talk',{recursive:true});await page.screenshot({path:'.impeccable/harbour-talk/temple-debug.png'});if(!await page.locator('.cine-embark').count())await page.getByRole('button',{name:'Set Sail',exact:true}).click();await page.locator('.cine-embark').waitFor();await page.waitForTimeout(6500);
mkdirSync('.impeccable/harbour-talk',{recursive:true});await page.screenshot({path:'.impeccable/harbour-talk/temple-original.png'});
await page.addStyleTag({content:'body * {visibility:hidden!important} .voyage-canvas,.voyage-canvas *,.world-canvas,.world-canvas *,canvas {visibility:visible!important}'});
// Keep the actual WebGL canvas; remove only HTML presentation controls for the cover photograph.
await page.locator('canvas').first().screenshot({path:'.impeccable/harbour-talk/temple-cover.png'});
console.log('Captured original embark temple, 2560 × 1440');await context.close();await browser.close();
