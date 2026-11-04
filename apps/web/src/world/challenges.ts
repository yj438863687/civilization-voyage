import type { FableState } from './fable';

export type ChallengeKind = 'canal' | 'granary' | 'printing' | 'route' | 'engine' | 'shifts' | 'signal' | 'correction' | 'privacy' | 'dialogue' | 'go' | 'audit';
export interface ChallengeSpec { kind: ChallengeKind; title: string; instruction: string; technology: string; society: string; words?: string[] }
export interface ChallengeReport { quality: number; summary: string; plan: string; strain: number }
const spec = (kind: ChallengeKind, title: string, instruction: string, technology: string, society: string, words?: string[]): ChallengeSpec => ({ kind, title, instruction, technology, society, words });
export const CHALLENGES: Record<string, ChallengeSpec> = {
  'A-water': spec('canal', '连渠试水', '点按渠段转向，再试放水。让入口的水同时流到两块田。', '从只挡水到为水开路', '有了通水的能力，还要决定维护由谁承担。'),
  'A-stake': spec('canal', '续修分水图', '沿用上一站的渠图，调整弯口。图上的两块田都需要接到水。', '继承并改进已有的水道', '分水的先后不能只由出粮最多的人决定。'),
  'A-n-flood': spec('granary', '汛前装船', '把木料、工具和粮食装进十六格船舱。每件都要有位置，不能重叠。', '工程还需要物资与维修能力', '船上的余地有限，留给河岸的物资就不能同时带走。'),
  'A-bone': spec('granary', '把粮存过下一季', '把粮袋、种子和通风箱装进十六格粮仓，不能重叠。', '储存让收成跨过季节', '能存下来以后，还要决定谁能打开仓门。'),
  'A-granary': spec('printing', '重排仓单', '依据提示，把实物记录排成可追查的仓单；点选条目装入，点仓单位置可撤回。', '记录让分配可以追查', '只记数量不记劳作者，仍可能漏掉人。', ['来粮地点', '交粮数量', '搬运者', '修渠家庭', '领粮日期']),
  'A-f-famine': spec('granary', '带着旧仓单过冬', '使用前两站留下的储粮经验重新装仓，保住种子和口粮。', '粮仓和账册共同应对欠收', '存储能力不会自动决定荒年先给谁吃。'),
  'B-coal': spec('printing', '拼回一页译稿', '原稿被打散了。按“观察、比照、译名、校核、交给工匠”的顺序重排。', '译稿把陌生器物变成可学习的知识', '知识流向少数买家，还是让工匠也能学习？', ['观察器物', '比照图样', '确定译名', '复核尺寸', '交给工匠']),
  'B-gauge': spec('printing', '排字与校样', '按工坊提示排出一份可用的学习流程，试印后核对。', '印刷使知识能被反复传递', '印得更多，也要考虑普通学徒能不能拿到。', ['识图', '辨件', '试装', '检修', '教给后来人']),
  'B-n-boiler': spec('route', '勘线铺轨', '从西南工地铺到东北车站，只能走相邻格；山地不能通过。村庄支线需要多走一段。', '技术把知识变成可通行的道路', '省下工程费和让沿线村庄用得上，需要一起考虑。'),
  'B-ticket': spec('engine', '让煤真正做功', '加煤升压，压力在 3—6 时带动机器；过高需泄压。累计做功 8 次，煤只有 12 份。', '把燃料转成稳定、可持续的动力', '节余可以增产，也可以支持维护和学习。'),
  'B-shift': spec('shifts', '给工厂排一张班表', '六个时段各需两人。点格子排班；同一人连续超过三班会疲劳。', '机器需要协同组织才能生产', '多排一班可能多出货，也可能消耗人的健康与学习时间。'),
  'B-f-strike': spec('engine', '交货前的锅炉', '上一站的工班安排会影响本次可用燃料。稳住压力，完成八次做功。', '效率取决于设备，也取决于使用方式', '交货期限不会让设备和人不再疲劳。'),
  'C-screen': spec('route', '把线接到人住的地方', '逐格铺设线路，从左下的接线站连到右上；经过中间村庄才能把它接入。', '架线使远距离联系成为可能', '最短线路可能正好绕过人少的地方。'),
  'C-dark': spec('signal', '值班员的第一封电报', '按提示拍出 SAFE。短点、长划组成一个字母；每拍完一个字母就校验。', '编码让消息经过电线仍能被辨认', '发得出来以后，还要为谁保留时段？'),
  'C-n-wire': spec('shifts', '把本领交给下一班', '每时段安排两人；每人连续工作不宜超过三班。学徒与熟手都要留出休息。', '通信网络依赖训练与接班', '只雇熟手解决眼前，带教学徒支撑以后。'),
  'C-relay': spec('signal', '亲手拍发 HELP', '查看编码表，依次拍出 HELP。错误可撤回，信件不设倒计时。', '消息开始摆脱信使的脚程', '传得更快以后，哪些等待值得优先结束？'),
  'C-tz': spec('route', '穿过大洋的线路', '从西岸铺到东岸，中途可接入小岛中继站；避开深色的海沟。', '工程把两岸接成可通信的网络', '绕行中继站有成本，也能给小岛留下联系。'),
  'C-f-wire': spec('correction', '在噪声里保住一句话', '同一组四位信号发了三次。逐位比较三份，填写多数一致的位，再译回原码。', '冗余编码能帮助抵抗传输错误', '容量用来提高可靠性后，就少一些位置传别的消息。'),
  'D-log': spec('shifts', '与调度表一起工作', '为六个时段安排人员。覆盖工作，也检查有人是否被连续排班。', '算法能整理更多安排，目标却由人设定', '总产量之外，谁有培训机会、谁承担夜班？'),
  'D-skip': spec('privacy', '给数据划一条边界', '给基本调度勾选数据：值班时段、设备负载、潮汐资料是必要项，其余不必提供。', '更多数据不等于每项任务都更可靠', '必要功能与人的可选择范围，需要同时保留。'),
  'D-n-grant': spec('audit', '审查一条最优航线', '先查看资料日期、航灯状态与港口来信，再决定对机器的建议保留、核查或改航。', '优化能比较路线，却受制于目标与资料', '被略过的港口没有因此失去被听见的权利。'),
  'D-weight': spec('dialogue', '试一试它是否理解', '向规则程序提问：试问心情、天气，再指出一次矛盾。比较它怎样回答。', '流畅回应可以由简单规则产生', '人会把理解和信任投向回应，需要知道它的边界。'),
  'D-star': spec('go', '棋盘上的证据', '这是本游戏的五路教学棋局，不是比赛棋谱，也不运行 AlphaGo。黑先，找出能提掉白子的那一点。', '在规则明确的任务里，能力可以被实际检验', '赢下棋局不能代替另一种工作的验证。'),
  'D-f-proposal': spec('audit', '把演示变成可验证的试航', '检查三项资料，并给方案写下保留、核查或改航的处理。', '能力要在新用途里重新验证', '委托技术执行，不等于把责任一同交出去。'),
};

export function previousWork(sceneId: string, routeIds: string[], state: FableState) {
  const index = routeIds.indexOf(sceneId);
  if (index < 1) return { quality: 0, summary: '', plan: '' };
  const prefix = `work:${routeIds[index - 1]}`;
  return { quality: Number(state[`${prefix}:quality`] ?? 0), summary: state[`${prefix}:summary`] ?? '', plan: state[`${prefix}:plan`] ?? '' };
}
export const rotateMask = (mask: number, turns: number): number => { let next = mask; for (let index = 0; index < turns % 4; index++) next = ((next << 1) & 15) | (next >> 3); return next; };
export const CANAL_BASE: Record<number, number> = { 7: 3, 8: 5, 9: 5, 10: 5, 11: 5, 12: 11, 17: 3, 18: 5, 19: 5 };
export const CANAL_SOLUTION: Record<number, number> = { 7: 1, 8: 1, 9: 1, 10: 1, 11: 1, 12: 3, 17: 0, 18: 1, 19: 1 };
export function canalFlow(turns: Record<number, number>) {
  const connected = new Set<number>();
  const mask = (cell: number) => rotateMask(CANAL_BASE[cell] ?? 0, turns[cell] ?? 0);
  if (!(mask(10) & 8)) return { connected, fields: 0 };
  const queue = [10];
  while (queue.length) {
    const cell = queue.shift()!; if (connected.has(cell)) continue; connected.add(cell);
    for (const [dx, dy, port, opposite] of [[0,-1,1,4],[1,0,2,8],[0,1,4,1],[-1,0,8,2]]) {
      const x = cell % 5 + dx, y = Math.floor(cell / 5) + dy, next = y * 5 + x;
      if (x >= 0 && x < 5 && y >= 0 && y < 5 && (mask(cell) & port) && (mask(next) & opposite)) queue.push(next);
    }
  }
  return { connected, fields: [9,19].filter(cell => connected.has(cell) && (mask(cell) & 2)).length };
}
export const LAND_BLOCKS = [7, 8, 16, 22];
export function routeStep(path: number[], cell: number): number[] {
  if (path.length > 1 && cell === path[path.length - 2]) return path.slice(0,-1);
  if (!Number.isInteger(cell) || cell < 0 || cell >= 30 || path.includes(cell) || LAND_BLOCKS.includes(cell)) return path;
  const last = path[path.length - 1];
  if (Math.abs(cell % 6 - last % 6) + Math.abs(Math.floor(cell / 6) - Math.floor(last / 6)) !== 1) return path;
  return [...path, cell];
}
export function routeScore(path: number[], budget: number) { const cost=path.length-1+(path.includes(14)?2:0);return { reached:path[path.length-1]===5, served:path.includes(14), cost, within:cost<=budget }; }
export interface EngineState { pressure: number; coal: number; work: number; damage: number; turns: number }
export function engineStep(state: EngineState, action: 'coal' | 'work' | 'vent'): EngineState {
  if (state.work >= 8 || state.turns >= 32 || (action === 'coal' && state.coal <= 0)) return state;
  if (action === 'coal') { const pressure = state.pressure + 2; return { ...state, pressure, coal: state.coal - 1, damage: state.damage + Number(pressure > 6), turns: state.turns + 1 }; }
  if (action === 'vent') return { ...state, pressure: Math.max(0,state.pressure - 2), turns: state.turns + 1 };
  if (state.pressure < 3) return { ...state, turns: state.turns + 1 };
  return { ...state, pressure: state.pressure - 3, work: state.work + 2, damage: state.damage + Number(state.pressure > 6), turns: state.turns + 1 };
}
export function shiftScore(slots: boolean[]) {
  const coverage = Array.from({length:6},(_,column) => slots.filter((on,index) => on && index % 6 === column).length);
  let fatigue = 0;
  for (let row = 0; row < 4; row++) { let run = 0; for (let column = 0; column < 6; column++) { run = slots[row*6+column] ? run + 1 : 0; if (run > 3) fatigue++; } }
  return { coverage, fatigue, quality: Math.max(0, Math.round(coverage.reduce((sum,n) => sum + Math.min(n,2),0) / 12 * 100) - fatigue * 12) };
}
export const MORSE: Record<string,string> = { H:'....', E:'.', L:'.-..', P:'.--.', S:'...', A:'.-', F:'..-.' };
export const NOISY = ['1010', '1110', '1000'];
export function majority(copies: string[]) { return copies[0].split('').map((_,i) => copies.filter(copy => copy[i] === '1').length > copies.length / 2 ? '1' : '0').join(''); }
export const PACK_SHAPES = [[0,1],[0,4,8],[0,1,4,5],[0,1,2],[0,4]];
export function packingCells(shape: number[], origin: number, turned: boolean): number[] | null {
  const offsets = shape.map(cell => turned ? [Math.floor(cell/4), cell%4] : [cell%4, Math.floor(cell/4)]);
  if (offsets.some(([x,y]) => origin%4+x >= 4 || Math.floor(origin/4)+y >= 4)) return null;
  return offsets.map(([x,y]) => origin + x + y*4);
}
export function goMove(board: number[], cell: number): { board: number[]; captured: number; legal: boolean } {
  if (board[cell]) return { board, captured:0, legal:false };
  const next = [...board]; next[cell]=1;
  const neighbors = (position:number) => [position-5,position+1,position+5,position-1].filter(other => other>=0 && other<25 && Math.abs(other%5-position%5)+Math.abs(Math.floor(other/5)-Math.floor(position/5))===1);
  const group = (start:number) => { const cells = new Set<number>(), liberties = new Set<number>(), queue=[start]; while(queue.length) { const current=queue.pop()!; if(cells.has(current))continue; cells.add(current); for(const adjacent of neighbors(current)) { if(!next[adjacent])liberties.add(adjacent); else if(next[adjacent]===next[start])queue.push(adjacent); } } return { cells, liberties }; };
  let captured=0;
  for(const adjacent of neighbors(cell)) if(next[adjacent]===2) { const white=group(adjacent); if(!white.liberties.size) for(const stone of white.cells){ next[stone]=0; captured++; } }
  if(!group(cell).liberties.size) return {board,captured:0,legal:false};
  return {board:next,captured,legal:true};
}
