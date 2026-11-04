import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HistoryEncounter, HistoryArrival } from '../src/components/History';
import { ShipyardDialog } from '../src/components/Shipyard';
import { HISTORY_ROUTES, historyChoices } from '../src/world/history';
import { encounterFor, freshStats, applyOutcome } from '../src/world/encounters';
import type { FableState } from '../src/world/fable';
import '../src/styles/app.css';

function Fixture() {
  const query = new URLSearchParams(location.search);
  const route = HISTORY_ROUTES[query.get('route') ?? 'A-near'];
  const [yardOpen, setYardOpen] = useState(true);
  const [step, setStep] = useState(Number(query.get('step') ?? 0));
  const [state, setState] = useState<FableState>(query.has('care') ? Object.fromEntries(route.islands.map(island => [`history:${island.id}`, 'care'])) : {});
  const [stats, setStats] = useState({ ...freshStats(), trust: 80, supply: query.has('empty') ? 0 : 80 });
  if (query.has('yard')) return <><button id="outside" onClick={() => setYardOpen(true)}>打开船坞</button>{yardOpen && <ShipyardDialog stats={stats} onUpdate={fn => setStats(fn)} onClose={() => setYardOpen(false)} />}</>;
  if (step === 3) return <HistoryArrival route={route} state={state} onDone={() => setStep(4)} />;
  if (step > 3) return <p role="status">这一程已完成 · 补给 {stats.supply} · 人心 {stats.trust}</p>;
  const scene = [...route.islands, route.crisis][step];
  const template = encounterFor(route.islands[0].id)!;
  return <HistoryEncounter key={scene.id} state={state} supply={stats.supply} enc={{ ...template, history: scene, game: historyChoices(scene) }} onDone={(out, summary) => { setStats(previous => applyOutcome(previous, out, summary, 'test', scene.who)); setState(previous => ({ ...previous, ...out.set })); setStep(step + 1); }} />;
}

createRoot(document.getElementById('root')!).render(<Fixture />);
