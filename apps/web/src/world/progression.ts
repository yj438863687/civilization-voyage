import type { Look, VoyageStats } from './encounters';

export const SHIP_UPGRADES = [
  { name: '修整舷板', cost: 18, detail: '船舷加装铜色护条' },
  { name: '添置航灯', cost: 26, detail: '两侧加装成对的暖色航灯' },
  { name: '挂起船队旗', cost: 34, detail: '船尾升起靛蓝船旗与铜色饰条' },
];
export const CREW_UPGRADES = [
  { name: '整齐的常服', trust: 55, detail: '船员换上靛蓝常服，保留各自的工具' },
  { name: '齐备的行装', trust: 65, detail: '船员换上护帽与铜色衣饰' },
  { name: '共同的船徽', trust: 75, detail: '船员佩戴船队徽饰，服装加入暖金色细节' },
];
export function shipUpgradeReason(stats: VoyageStats): string | null {
  const upgrade = SHIP_UPGRADES[stats.shipLevel];
  if (!upgrade) return '船体外观已全部整修';
  if (stats.supply - upgrade.cost < 15) return `需要 ${upgrade.cost} 份补给，并至少留下 15 份口粮`;
  return null;
}
export function upgradeShip(stats: VoyageStats): VoyageStats {
  if (shipUpgradeReason(stats)) return stats;
  const upgrade = SHIP_UPGRADES[stats.shipLevel];
  return { ...stats, supply: stats.supply - upgrade.cost, shipLevel: stats.shipLevel + 1, log: [...stats.log, `整修船体：${upgrade.name}，用去 ${upgrade.cost} 份补给。`].slice(-40) };
}
export function upgradeCrew(stats: VoyageStats): VoyageStats {
  const upgrade = CREW_UPGRADES[stats.crewLevel];
  if (!upgrade || stats.trust < upgrade.trust) return stats;
  return { ...stats, crewLevel: stats.crewLevel + 1, log: [...stats.log, `船员换装：${upgrade.name}。大家愿意穿上同一条船的行装。`].slice(-40) };
}
export function crewAppearance(crew: [Look, Look], level: number): [Look, Look] {
  if (!level) return crew;
  return crew.map((look, index) => ({ ...look, coat: index ? '#345966' : '#2c3e50', trim: level >= 3 ? '#dcbd84' : level >= 2 ? '#ad8443' : look.trim, hat: level >= 2 ? index ? 'cap' : 'wrap' : look.hat, prop: level >= 3 && index ? 'ledger' : look.prop })) as [Look, Look];
}
