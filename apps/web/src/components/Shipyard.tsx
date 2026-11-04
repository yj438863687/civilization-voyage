import { useRef } from 'react';
import { useModalFocus } from './useModalFocus';
import type { VoyageStats } from '../world/encounters';
import { CREW_UPGRADES, SHIP_UPGRADES, shipUpgradeReason, upgradeCrew, upgradeShip } from '../world/progression';
export function Shipyard({ stats, onUpdate }: { stats: VoyageStats; onUpdate: (update: (stats: VoyageStats) => VoyageStats) => void }) {
  const ship = SHIP_UPGRADES[stats.shipLevel], crew = CREW_UPGRADES[stats.crewLevel];
  const shipReason = shipUpgradeReason(stats);
  return <section className="shipyard" aria-label="船坞与船员换装"><h3>船坞与船员</h3><p>补给能让船走下去，也能用来整修。人心来自沿途的相处，足够时船员愿意换上共同的行装。</p><div><article><h4>船体外观 · {stats.shipLevel}/3</h4><p>{ship?.detail ?? '舷板、航灯与船旗均已整修'}</p><p>现有补给 {stats.supply} · {ship ? `整修用去 ${ship.cost} 份` : '已完成'}</p><button className="btn" type="button" disabled={!!shipReason} onClick={() => onUpdate(upgradeShip)}>{ship ? ship.name : '整修完成'}</button>{shipReason && <p>{shipReason}</p>}</article><article><h4>船员外貌 · {stats.crewLevel}/3</h4><p>{crew?.detail ?? '船员已穿上完整的船队行装'}</p><p>现有人心 {stats.trust}{crew ? ` · 需要 ${crew.trust}` : ''} · 换装不扣人心</p><button className="btn" type="button" disabled={!crew || stats.trust < crew.trust} onClick={() => onUpdate(upgradeCrew)}>{crew ? crew.name : '换装完成'}</button></article></div><p>外观不增加航速或小游戏得分；跨时代保留整修与换装进度。</p></section>;
}

export function ShipyardDialog({ stats, onUpdate, onClose }: { stats: VoyageStats; onUpdate: (update: (stats: VoyageStats) => VoyageStats) => void; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  useModalFocus(panel);
  return <div className="history-overlay" role="dialog" aria-modal="true" aria-label="船坞与换装" onKeyDown={event => { event.stopPropagation(); if (event.key === 'Escape') onClose(); }}><div ref={panel} tabIndex={-1} className="shipyard-panel"><button className="btn" type="button" onClick={onClose}>回到航程</button><Shipyard stats={stats} onUpdate={onUpdate} /></div></div>;
}
