export const CREW_ART: Record<
  string,
  { bust: string; body: string; duty: string; voice: string }
> = {
  'first-mate': {
    bust: '/crew/first-mate.png',
    body: '/crew/first-mate-body.png',
    duty: '问有没有依据',
    voice: '求证',
  },
  'second-mate': {
    bust: '/crew/second-mate.png',
    body: '/crew/second-mate-body.png',
    duty: '问谁被看见',
    voice: '义利',
  },
};

export function crewArt(idOrRole: string) {
  if (idOrRole === '二副' || idOrRole === 'second-mate') return CREW_ART['second-mate'];
  return CREW_ART['first-mate'];
}

export const KERNEL_BEATS = [
  ['ask', '问', '提出一件要弄清的事'],
  ['seek', '查', '对照依据与谁被看见'],
  ['seal', '印', '由你落印，船员不代判'],
  ['act', '行', '拾取、靠港、做一件安排'],
  ['reflect', '省', '回看你信了什么'],
] as const;

export type KernelId = (typeof KERNEL_BEATS)[number][0];

export function kernelBeat(
  view: string,
  ctx: { hasQuestion: boolean; crewReplies: number; sealed: boolean },
): { current: KernelId; reached: KernelId[] } {
  const reached: KernelId[] = [];
  if (ctx.hasQuestion || ctx.sealed) reached.push('ask');
  if (ctx.crewReplies > 0 || ctx.sealed || view === 'route' || view === 'world' || view === 'port' || view === 'collaborate' || view === 'reflection') {
    reached.push('seek');
  }
  if (ctx.sealed) reached.push('seal');
  if (view === 'world' || view === 'port' || view === 'reflection') reached.push('act');
  if (view === 'reflection') reached.push('reflect');

  let current: KernelId = 'ask';
  if (view === 'reflection') current = 'reflect';
  else if (view === 'world' || view === 'port') current = 'act';
  else if (view === 'route' && ctx.sealed) current = 'act';
  else if (view === 'route' || view === 'collaborate') current = 'seek';
  else if (view === 'cockpit') {
    if (ctx.sealed) current = 'seal';
    else if (ctx.crewReplies > 0) current = 'seek';
    else current = 'ask';
  }
  if (!reached.includes(current)) reached.push(current);
  return { current, reached };
}
