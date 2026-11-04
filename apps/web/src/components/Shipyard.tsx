import { MusicControls } from './VoyageMusic';
import { ShipyardPreview } from './ShipyardPreview';
import { REFIT_NAMES } from '../world/ShipRefit';
import { STYLE_BY_SCENE } from '../world/hull';
import { useRef, useState } from 'react';
import { useModalFocus } from './useModalFocus';
import type { VoyageStats } from '../world/encounters';
import { CREW_UPGRADES, SHIP_UPGRADES, shipUpgradeReason, upgradeCrew, upgradeShip } from '../world/progression';
export function Shipyard({ stats, onUpdate, sceneId = 'A', allowPurchase = true }: { stats: VoyageStats; sceneId?: string; allowPurchase?: boolean; onUpdate: (update: (stats: VoyageStats) => VoyageStats) => void }) {
  const [compareBase,setCompareBase]=useState(false);
  const refitNames=REFIT_NAMES[STYLE_BY_SCENE[sceneId]??'junk'];
  const [tab,setTab]=useState<'ship'|'crew'>('ship');
  const [previewShip,setPreviewShip]=useState(stats.shipLevel),[previewCrew,setPreviewCrew]=useState(stats.crewLevel);
  const ship=SHIP_UPGRADES[stats.shipLevel],crew=CREW_UPGRADES[stats.crewLevel];
  const shipReason=allowPurchase?shipUpgradeReason(stats):'先选一个时代启航，之后可随时按B回来整修；现在可以先看外形。';
  const previews=tab==='ship'?[{name:'尚未整修',detail:'这条船现在的基础外形'},...SHIP_UPGRADES]:[{name:'原来的行装',detail:'船员初次登船时的衣服'},...CREW_UPGRADES];
  const shown=tab==='ship'?previewShip:previewCrew;
  return <section className="shipyard" aria-label="船坞与船员换装"><div className="shipyard-compare"><h3>船坞与船员</h3><MusicControls below/></div><p>先转动实物看一看，再决定把物资花在哪里。货舱、上层甲板、帆组与时代设备会真正出现在海上的船上；常服、护帽和船徽会穿到船员身上。</p>
    <div className="shipyard-workbench"><div><div className="shipyard-tabs" role="group" aria-label="选择预览对象"><button type="button" aria-pressed={tab==='ship'} onClick={()=>setTab('ship')}>船体整修</button><button type="button" aria-pressed={tab==='crew'} onClick={()=>setTab('crew')}>船员行装</button></div><ShipyardPreview sceneId={sceneId} shipLevel={compareBase?0:previewShip} crewLevel={previewCrew} closeUp={tab==='crew'}/>{tab==='ship'&&<div className="shipyard-compare"><strong>{refitNames[compareBase?0:previewShip]}</strong><button className="btn" type="button" aria-pressed={compareBase} onClick={()=>setCompareBase(value=>!value)}>{compareBase?'回到所选改造':'对照初始船型'}</button></div>}</div>
    <div className="shipyard-catalog"><h4>{tab==='ship'?'船体外观':'船员外貌'} · {tab==='ship'?stats.shipLevel:stats.crewLevel}/3</h4><ol>{previews.map((item,index)=><li key={item.name}><button type="button" aria-pressed={shown===index} onClick={()=>{setCompareBase(false);if(tab==='ship')setPreviewShip(index);else setPreviewCrew(index);}}><strong>{tab==='ship'?refitNames[index]:item.name}</strong><span>{item.detail}</span><small>{index<=(tab==='ship'?stats.shipLevel:stats.crewLevel)?'已拥有 · 点按预览':'未解锁 · 也可先试试看'}</small></button></li>)}</ol></div></div>
    <div className="shipyard-purchase"><article><h4>下一次船体整修</h4><p>补给 {stats.supply}{ship?` · 用去 ${ship.cost} 份，还要留下15份口粮`: ' · 已完成全部整修'}</p><button className="btn" type="button" disabled={!!shipReason} onClick={()=>{const next=stats.shipLevel+1;onUpdate(upgradeShip);setPreviewShip(next);setCompareBase(false);setTab('ship');}}>{ship?ship.name:'整修完成'}</button>{shipReason&&<p>{shipReason}</p>}</article><article><h4>下一套船员行装</h4><p>人心 {stats.trust}{crew?` · 需要 ${crew.trust}`:''} · 换装不扣人心</p><button className="btn" type="button" disabled={!allowPurchase||!crew||stats.trust<crew.trust} onClick={()=>{const next=stats.crewLevel+1;onUpdate(upgradeCrew);setPreviewCrew(next);setTab('crew');}}>{crew?crew.name:'换装完成'}</button></article></div><p>整修与行装跨时代保留。外观不替代故事里的本领；渠图、工班表、线路和试验记录会决定下一章能做什么。</p></section>;
}

export function ShipyardDialog({ stats, onUpdate, onClose, sceneId = 'A', allowPurchase = true }: { stats: VoyageStats; sceneId?: string; allowPurchase?: boolean; onUpdate: (update: (stats: VoyageStats) => VoyageStats) => void; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  useModalFocus(panel);
  return <div className="history-overlay" role="dialog" aria-modal="true" aria-label="船坞与换装" onKeyDown={event => { event.stopPropagation(); if (event.key === 'Escape') onClose(); }}><div ref={panel} tabIndex={-1} className="shipyard-panel"><button className="btn" type="button" onClick={onClose}>回到航程</button><Shipyard stats={stats} allowPurchase={allowPurchase} sceneId={sceneId} onUpdate={onUpdate} /></div></div>;
}
