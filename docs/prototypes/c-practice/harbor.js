// Original side elevation of the teaching port. History can show two charts in the same document.
let chartNumber = 0;
export function harbor(e = null) {
  const chart = "port-chart-" + ++chartNumber;
  const berth = e ? (e.deliveryDelay ? 35 : 155) : 102;
  const count = e?.reserveAfterPlan ?? 3;
  const original = e?.originalCrewExtraDuty ? 350 : 393;
  const relief = Boolean(e?.reliefCrewCalled);
  const workers = (x, y) => `<g transform="translate(${x} ${y})" fill="#efce92" stroke="#efce92" stroke-width="2.4" stroke-linecap="round"><circle cy="-9" r="2.3"/><path d="M0-5v5m0-4-3 4m3-4 3 3M0 0l-3 5m3-5 3 5" fill="none"/></g>`;
  const crate = (x, full) => `<g transform="translate(${x} 152)" stroke="${full ? "#edc27a" : "#84a4a3"}" fill="${full ? "#785f39" : "none"}" stroke-dasharray="${full ? "none" : "2 3"}"><rect width="14" height="13"/>${full ? '<path d="m1 1 12 11m0-11L1 12"/>' : ""}</g>`;
  const roofWindows = Array.from({length: 10}, (_, i) => `<path d="M${460+i*9} 143v7" stroke="#e4c48e" stroke-width="3" opacity="${i%3 ? ".85" : ".3"}"/>`).join("");
  return `<svg class="harbor-svg" viewBox="0 0 600 228" aria-hidden="true" focusable="false" data-berth="${berth}" data-extra-duty="${e?.originalCrewExtraDuty ?? 0}" data-relief="${relief}" data-crates="${count}">
  <defs>
    <pattern id="${chart}-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0v24" fill="none" stroke="#88b7ae" stroke-opacity=".13" stroke-width=".65"/></pattern>
    <pattern id="${chart}-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(28)"><path d="M0 0v4" stroke="#e6c184" stroke-width="1.2"/></pattern>
    <pattern id="${chart}-tide" width="52" height="13" patternUnits="userSpaceOnUse"><path d="M2 5q8-2 18 0m9 5h11" stroke="#659697" stroke-width="1" fill="none" opacity=".65"/></pattern>
  </defs>
  <rect width="600" height="228" fill="#18343b"/><rect width="600" height="228" fill="url(#${chart}-grid)"/>
  <g opacity=".75"><circle cx="169" cy="88" r="36" fill="url(#${chart}-hatch)" stroke="#d7b77c" stroke-width=".7"/><circle cx="169" cy="88" r="41" fill="none" stroke="#c3a473" stroke-opacity=".28" stroke-dasharray="3 5"/></g>
  <g fill="none" stroke="#729997" stroke-width=".85"><path d="m0 133 40-11 25 2 41-20 27 8 28-9 34 17 45 1 23-9 37 4 39-21 32 2 40-15 31 5 24-17 32 8 34-11 69 2"/><path d="m0 141 55-9 34 2 43-12 43 5 41-2 31 2 51-7 63-9 32 2 36-5 38-15 32 5 38-4 62-13" opacity=".6"/></g>
  <path d="M0 164h600v64H0z" fill="#24474c"/><path d="M0 165h600v63H0z" fill="url(#${chart}-tide)"/>
  <g fill="#28474a" stroke="#83a39d" stroke-width="1.15"><path d="M3 165v-16l10-2 9-13 7 9 17-3 14 8 28 2 13 15z"/><path d="m24 137 4-36h7l5 37zm1-36v-5h13v5zm0-5 7-7 7 7" fill="#a3a793"/><path d="M29 119h6m-6 4h6" stroke="#254247"/><path d="M29 98h6" stroke="#efc276"/></g>
  <g fill="#203a3e" stroke="#aab6a5" stroke-width="1.4">
    <path d="M350 166v-44l13-8 1-11 18 0 0 13 19 1 8-12 13 11v50z"/>
    <path d="M376 102v-32h5v32m-6-33h8m10 46V84h4v31"/>
    <path d="M448 166v-27l17-10v10l18-10v9l18-10v9l14-10h8v39z"/>
  </g>${roofWindows}
  <g stroke="#d8b77e" fill="none" stroke-linejoin="round">
    <path d="M297 166h51m-43-2 5-67h12l14 67m-27-6 18-11-17-12 14-11-12-12 10-10m-21-7 73-59 6 4-58 65z" stroke-width="2.6"/>
    <path d="m316 92 2-13 12 0 0-10 12 0 0-10 12 0 0-9 10-1m13-11 17 26-16-6-3-19m-65 62-33 29m23-34 7 8h18l4-8z" stroke-width="1.3"/>
    <path d="M276 119v22q1 5 5 1m96-100-64 54" stroke-width="1.25"/>
    <path d="M558 165v-58h6l5 58m-10-45 7 9-7 8 8 9-7 9m-7-47 36-38 4 3-29 42zM586 76v33q1 4 4 0" stroke-width="1.5"/>
  </g>
  <path d="M286 168H600v11H286z" fill="#b5aa8f" stroke="#c2ba9d"/><path d="M286 174h314" stroke="#324b49"/><path d="M296 181v19m37-19v20m39-20v19m47-19v20m44-20v20m43-20v19m43-19v21m38-21v20" stroke="#91998a" stroke-width="5"/>
  ${[0,1,2].map(i=>crate(468+i*18,i<count)).join("")}
  ${workers(original,159)}${workers(original+10,159)}${relief ? workers(326,159)+workers(336,159) : ""}
  <g transform="translate(${berth} 133)" stroke-linejoin="round">
    <g fill="none" stroke="#a7b7a9" stroke-width="1" opacity=".72"><path d="M80-25q-7-7-19-6t-17-7q-9 2-13-3m49 14q-2-10-19-11t-23-8m32 12q-6-8-16-7"/></g>
    <g stroke="#d7c6a5" stroke-width="1.3"><path d="M20 18V-8m0 1 37 24m-37-11-9 10m104 2v-31m0 1 22 24m-22-16L95 12" fill="none"/>
    <path d="M15 13h33l8-8h41l9 8h26l12-7-11 20-12 4H28L14 22 7 13z" fill="#12292f"/>
    <path d="M29 20h99l8-6" fill="none" stroke="#d87950" stroke-width="3"/>
    <path d="M51 9V-1h42l7 10z" fill="#b7b29d"/><path d="M60-1v-10h22v10z" fill="#c5bda5"/>
    <path d="M56-11h29m-8-1-2-12h8l2 19" fill="#a95c40"/><path d="M75-24h8" stroke="#1f3336" stroke-width="4"/>
    <path d="M53 10v6h45v-6m-72 1 3-7 8-1 4 8m60 0V7h13l3 4" fill="#516c67"/></g>
    <g stroke="#244048" stroke-width="3.2"><path d="M64-8v5m6-5v5m6-5v5M56 3v4m8-4v4m8-4v4m8-4v4m8-4v4"/></g>
    <g fill="none" stroke="#9cbdb3" stroke-width="1"><path d="M5 33q37 3 69 2t60-2m-77 7q16 1 37 0m-56-2-16 1"/></g>
  </g>
  <g fill="none" stroke="#dbc393" opacity=".78"><path d="M12 22v-9h10m566 9v-9h-10M12 207v8h10m566-8v8h-10"/></g>
  </svg>`;
}
