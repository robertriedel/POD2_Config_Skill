#!/usr/bin/env node
// Spec-driven panel generator for SAP DM POD 2.0 exports.
// Puts a KPI / info panel — tiles fed by Production Process outputs and/or POD-context paths —
// into a tab, page, dialog or container of a full POD export, wires the PP call
// (tabEnter / pageEnter + Refresh button), writes a NEW export and validates it against the baseline.
// Only verified widgets/props (VBox/HBox backgroundColor, Text fontColor, Icon color, ProgressIndicator state).
//
// Usage:
//   node build-panel.js <export.json> <spec.json> [-o <out.json>] [--preview]
//   node build-panel.js --self-test
// Spec format + worked example: references/patterns.md §18.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const COLOR = { bad: '#AA0808', warn: '#B44F00', good: '#256F3A', neutral: '#556B82', brand: '#0064D9' };
const STATE = { bad: 'Error', warn: 'Warning', good: 'Success', neutral: 'None' };
const ICON = { number: 'sap-icon://kpi-managing-my-area', string: 'sap-icon://hint', boolean: 'sap-icon://status-inactive' };
const PP_TYPE = { number: { type: 'number', format: 'double' }, integer: { type: 'integer' }, string: { type: 'string' }, boolean: { type: 'boolean' } };
const ITEMS_AGG = { 'sap.m.HBox': 'items', 'sap.m.VBox': 'items', 'sap.ui.layout.Splitter': 'contentAreas', 'sap.uxap.ObjectPageSubSection': 'blocks' };

const fail = (m) => { throw new Error(m); };
const ref = (p) => '${' + p + '}';
const lit = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"; // string literal inside {= }
const norm = (s) => String(s || '').replace(/^\{i18n[^>]*>/, '').replace(/\}$/, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
const tabNames = (text) => [norm(text), norm(String(text || '').replace(/\}$/, '').split('.').pop())]; // "{i18n>template.tab.phaseDetails}" ~ "Phase details"
const noBraces = (s, what) => { if (/[{}]/.test(String(s))) fail(`${what}: braces are not allowed in literal text ("${s}")`); return s; };
const pad = (size) => ({ paddingBegin: size, paddingEnd: size, paddingTop: size, paddingBottom: size });

function* nodes(n, inDialog) {
  if (!n || typeof n !== 'object') return;
  yield { n, inDialog };
  for (const kids of Object.values(n.aggregations || {})) if (Array.isArray(kids)) for (const k of kids) yield* nodes(k, inDialog);
}
const allNodes = (pod) => [...(pod.pages || []).flatMap((p) => [...nodes(p, false)]), ...(pod.dialogs || []).flatMap((d) => [...nodes(d, true)])];

// ---- target: where the panel goes, which node carries the load event
function findTarget(pod, t) {
  if (!t || typeof t !== 'object') fail('spec.target missing: { "tab": "<text|id>" } | { "page": id } | { "dialog": id } | { "node": id, "aggregation"? }');
  if (t.tab) {
    const tabs = allNodes(pod).filter((x) => x.n.widget === 'sap.m.IconTabFilter');
    const hit = tabs.filter((x) => x.n.id === t.tab || tabNames(x.n.properties && x.n.properties.text).includes(norm(t.tab)));
    if (hit.length !== 1) fail(`tab "${t.tab}" matched ${hit.length} tabs; available: ${tabs.map((x) => `${x.n.id} ("${(x.n.properties || {}).text}")`).join(', ')}`);
    return { holder: hit[0].n, agg: 'content', eventNode: hit[0].n, event: 'tabEnter', busy: hit[0].inDialog ? 'dialog' : 'page' };
  }
  if (t.page) {
    const p = (pod.pages || []).find((x) => x.id === t.page) || fail(`page "${t.page}" not found; pages: ${(pod.pages || []).map((x) => x.id).join(', ')}`);
    return { holder: p, agg: 'content', eventNode: p, event: 'pageEnter', busy: 'page' };
  }
  if (t.dialog) {
    const d = (pod.dialogs || []).find((x) => x.id === t.dialog) || fail(`dialog "${t.dialog}" not found; dialogs: ${(pod.dialogs || []).map((x) => x.id).join(', ')}`);
    return { holder: d, agg: 'content', eventNode: null, busy: 'dialog' };
  }
  if (t.node) {
    const hit = allNodes(pod).filter((x) => x.n.id === t.node);
    if (hit.length !== 1) fail(`node "${t.node}" matched ${hit.length} widgets (need exactly 1)`);
    return { holder: hit[0].n, agg: t.aggregation || ITEMS_AGG[hit[0].n.widget] || 'content', eventNode: null, busy: hit[0].inDialog ? 'dialog' : 'page' };
  }
  fail('spec.target needs one of: tab, page, dialog, node');
}

// ---- one field → one tile
function tile(f, key, P, outVar) {
  const id = `${P}_${key}`;
  const type = f.type || 'number';
  if (!['number', 'string', 'boolean'].includes(type)) fail(`field "${f.label}": type must be number|string|boolean`);
  if (typeof f.source !== 'string') fail(`field "${f.label}": missing "source" ("pp:<output>" or "/context/path")`);
  let p;
  if (f.source.startsWith('pp:')) {
    if (!outVar) fail(`field "${f.label}": source ${f.source} but spec has no "pp"`);
    if (!/^[A-Za-z_][\w]*$/.test(f.source.slice(3))) fail(`field "${f.label}": PP output must be a flat name, got "${f.source}"`);
    p = `/${outVar}/${f.source.slice(3)}`;
  } else if (f.source.startsWith('/')) p = f.source;
  else fail(`field "${f.label}": source must start with "pp:" or "/"`);

  const V = ref(p);
  const missing = `(${V} === undefined || ${V} === null || ${V} === '')`;
  const hero = !!f.hero;
  let color = lit(COLOR.neutral), state = lit(STATE.neutral), text, bar = null, iconSrc = f.icon || ICON[type];

  if (type === 'number') {
    if (f.scale && !['percent', 'fraction'].includes(f.scale)) fail(`field "${f.label}": scale must be percent|fraction`);
    const N = `(${V} * ${f.scale === 'fraction' ? 100 : 1})`; // display-scale value; "* 1" also coerces "2500.000" strings
    const d = f.decimals === undefined ? 1 : f.decimals, p10 = 10 ** d;
    const unit = f.unit === undefined ? (f.scale ? '%' : '') : f.unit;
    text = `{= ${missing} ? '–' : (${d ? `Math.round(${N} * ${p10}) / ${p10}` : `Math.round(${N})`}) + ${lit(unit ? ' ' + unit : '')} }`;
    if (f.thresholds) {
      const [a, b] = f.thresholds;
      if (!(typeof a === 'number' && typeof b === 'number' && a <= b)) fail(`field "${f.label}": thresholds must be [low, high] numbers on the display scale`);
      const [lo, hi] = f.lowerIsBetter ? ['good', 'bad'] : ['bad', 'good'];
      const pick = (m) => `{= ${missing} ? ${lit(m.neutral)} : (${N} < ${a} ? ${lit(m[lo])} : (${N} < ${b} ? ${lit(m.warn)} : ${lit(m[hi])})) }`;
      color = pick(COLOR); state = pick(STATE);
    } else color = lit(COLOR.brand);
    const max = f.max !== undefined ? f.max : (f.scale ? 100 : undefined);
    if (f.bar === true && max === undefined) fail(`field "${f.label}": bar needs "max" or a percent/fraction "scale"`);
    if (f.bar !== false && max !== undefined) {
      const pct = max === 100 ? N : `${N} * ${100 / max}`;
      bar = { id: `${id}_Bar`, widget: 'sap.m.ProgressIndicator',
        properties: { percentValue: `{= ${missing} ? 0 : Math.max(0, Math.min(100, ${pct})) }`, showValue: false, state, width: '100%' } };
    }
  } else if (type === 'string') {
    text = `{= ${missing} ? '–' : ${V} }`;
  } else {
    const [yes, no] = [f.trueText || 'Yes', f.falseText || 'No'];
    text = `{= ${missing} ? '–' : (${V} ? ${lit(yes)} : ${lit(no)}) }`;
    color = `{= ${missing} ? ${lit(COLOR.neutral)} : (${V} ? ${lit(f.trueIsBad ? COLOR.bad : COLOR.good)} : ${lit(f.trueIsBad ? COLOR.good : COLOR.bad)}) }`;
    if (!f.icon) iconSrc = `{= ${missing} ? ${lit(ICON.boolean)} : (${V} ? 'sap-icon://status-positive' : 'sap-icon://status-negative') }`;
  }
  const strip = (s) => (s.startsWith("'") ? s.slice(1, -1) : s); // literal colour/state → plain value
  const items = [
    { id: `${id}_Head`, widget: 'sap.m.HBox', properties: { alignItems: 'Center', gap: '0.5rem' }, aggregations: { items: [
      { id: `${id}_Icon`, widget: 'sap.ui.core.Icon', properties: { src: iconSrc, size: hero ? '1.5rem' : '1.25rem', color: strip(color) } },
      { id: `${id}_Label`, widget: 'sap.m.Label', properties: { text: noBraces(f.label, 'label'), design: 'Bold', wrapping: true } }] } },
    { id: `${id}_Value`, widget: 'sap.m.Text', properties: { text, fontSize: hero ? '3rem' : (type === 'number' ? '1.75rem' : '1.25rem'), fontWeight: 'bold', fontColor: strip(color) } },
  ];
  if (bar) { bar.properties.state = strip(bar.properties.state); items.push(bar); }
  if (f.caption) items.push({ id: `${id}_Caption`, widget: 'sap.m.Text', properties: { text: noBraces(f.caption, 'caption'), fontSize: '0.75rem', fontColor: COLOR.neutral } });
  return {
    node: { id: `${id}_Tile`, widget: 'sap.m.VBox',
      properties: { width: f.width || (hero ? '20rem' : '12rem'), gap: '0.5rem', ...pad('Medium'), backgroundColor: '#FFFFFF', justifyContent: hero ? 'Center' : 'Start' },
      aggregations: { items } },
    ppOut: f.source.startsWith('pp:') ? [f.source.slice(3), PP_TYPE[f.ppType || type] || fail(`field "${f.label}": ppType must be number|integer|string|boolean`)] : null,
  };
}

// ---- spec → mutated pod (pure apart from mutating the given object)
function build(pod, spec) {
  if (!pod || !Array.isArray(pod.pages)) fail('input is not a full POD export (no "pages")');
  const P = spec.prefix;
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(P || '')) fail('spec.prefix required: letters/digits, e.g. "OEE" (all new ids become <prefix>_…)');
  const ours = (id) => typeof id === 'string' && id.startsWith(P + '_');
  if (!Array.isArray(spec.fields) || !spec.fields.length) fail('spec.fields must be a non-empty array');
  const t = findTarget(pod, spec.target);
  const pp = spec.pp || null;
  if (pp && !pp.name) fail('spec.pp.name required (Production Process name)');
  const outVar = pp ? (pp.outputVariable || '_' + P.toLowerCase()) : null;

  const keys = new Set();
  const tiles = spec.fields.map((f, i) => {
    let k = String(f.id || f.label || '').replace(/[^A-Za-z0-9]/g, '') || 'F' + i;
    while (keys.has(k)) k += i;
    keys.add(k);
    return { f, ...tile(f, k, P, outVar) };
  });
  if (tiles.filter((x) => x.f.hero).length > 1) fail('only one field may be "hero"');

  // actions: Busy → PP (same objects on enter event and Refresh button)
  let chain = [];
  if (pp) {
    const NAME = pp.name.replace(/[^A-Za-z0-9]+/g, '_').toUpperCase();
    const ep = `/pe/api/v1/process/processDefinitions/start?key=${pp.key || 'REG_REPLACE_WITH_PP_KEY_' + NAME}`;
    const props = {};
    for (const x of tiles) if (x.ppOut) props[x.ppOut[0]] = x.ppOut[1];
    const inputs = (pp.inputs || []).map((ip) => {
      if (!ip.parameter) fail('spec.pp.inputs[]: "parameter" required');
      if (ip.variable) return { parameter: ip.parameter, type: ip.type || 'string', subType: null, valueType: 'variable', value: ip.variable };
      if (ip.value === undefined) fail(`spec.pp.inputs ${ip.parameter}: needs "value" (literal or {/binding}) or "variable" (PLANT, SFC, ORDER, …)`);
      return { parameter: ip.parameter, type: ip.type || 'string', subType: null, variable: null, value: ip.value };
    });
    chain = [
      { id: `${P}_Busy`, action: 'sap.dm.dme.pod2.action.core.BusyIndicator', properties: { widgetId: '', target: t.busy } },
      { id: `${P}_LoadData`, action: 'sap.dm.dme.pod2.action.pp.ProductionProcess', properties: {
        outputVariable: outVar,
        productionProcess: { id: pp.id || `REPLACE_WITH_PP_ID_${NAME}`, name: pp.name,
          trigger: { type: 'HTTP', protocol: 'REST', method: 'POST', endpoint: { url: (pp.tenant || 'REPLACE_WITH_TENANT') + ep, destinations: [], path: ep } },
          responseDataType: { type: 'object', properties: props } },
        inputParameters: inputs } },
    ];
  }

  // header strip: title + context pairs left, Refresh right
  const left = [];
  if (spec.title) left.push({ id: `${P}_Title`, widget: 'sap.m.Title', properties: { text: noBraces(spec.title, 'title'), titleStyle: 'H4' } });
  (spec.context || []).forEach((c, i) => {
    if (!c.path || !c.path.startsWith('/')) fail(`spec.context[${i}]: "path" must be a POD-context path like /workList/lastSelected/order`);
    left.push({ id: `${P}_Ctx${i}`, widget: 'sap.m.VBox', properties: { gap: '0.125rem' }, aggregations: { items: [
      { id: `${P}_Ctx${i}_Label`, widget: 'sap.m.Label', properties: { text: noBraces(c.label || c.path.split('/').pop(), 'context label'), showColon: true } },
      { id: `${P}_Ctx${i}_Value`, widget: 'sap.m.Text', properties: { text: `{${c.path}}`, fontWeight: 'bold' } }] } });
  });
  const refresh = pp && spec.refresh !== false;
  const panelItems = [];
  if (left.length || refresh) {
    const head = [{ id: `${P}_HeadLeft`, widget: 'sap.m.HBox', properties: { alignItems: 'Center', gap: '2rem', wrap: 'Wrap' }, aggregations: { items: left } }];
    if (refresh) head.push({ id: `${P}_Refresh`, widget: 'sap.m.Button',
      properties: { text: noBraces(spec.refreshText || 'Refresh', 'refreshText'), icon: 'sap-icon://refresh', type: 'Ghost' }, events: { press: chain } });
    panelItems.push({ id: `${P}_Head`, widget: 'sap.m.HBox',
      properties: { width: '100%', justifyContent: 'SpaceBetween', alignItems: 'Center', wrap: 'Wrap', gap: '1rem', ...pad('Small'), backgroundColor: '#FFFFFF' },
      aggregations: { items: head } });
  }
  const heroTile = tiles.find((x) => x.f.hero);
  const rest = tiles.filter((x) => !x.f.hero).map((x) => x.node);
  const restBox = { id: `${P}_Tiles`, widget: 'sap.m.HBox', properties: { wrap: 'Wrap', gap: '1rem' }, aggregations: { items: rest } };
  panelItems.push({ id: `${P}_Body`, widget: 'sap.m.HBox', properties: { wrap: 'Wrap', gap: '1rem' },
    aggregations: { items: heroTile ? [heroTile.node, ...(rest.length ? [restBox] : [])] : rest } });
  const panel = { id: `${P}_Panel`, widget: 'sap.m.VBox',
    properties: { width: '100%', gap: '1rem', ...pad('Small'), backgroundColor: spec.background || '#F5F6F7' },
    aggregations: { items: panelItems } };

  // insert (idempotent: drop our previous panel/actions first)
  const h = t.holder;
  h.aggregations = h.aggregations || {};
  const kept = (h.aggregations[t.agg] || []).filter((k) => !ours(k.id));
  h.aggregations[t.agg] = spec.replace ? [panel] : spec.position === 'start' ? [panel, ...kept] : [...kept, panel];
  const warnings = [];
  if (pp && spec.onEnter !== false) {
    if (t.eventNode) {
      t.eventNode.events = t.eventNode.events || {};
      t.eventNode.events[t.event] = [...(t.eventNode.events[t.event] || []).filter((a) => !ours(a.id)), ...chain];
    } else warnings.push(`target has no verified enter event — data loads via the Refresh button only${refresh ? '' : ' (and refresh is off!)'}`);
  }

  // ids must be globally unique (NavigateToWidget resolves globally)
  const count = new Map();
  for (const { n } of allNodes(pod)) count.set(n.id, (count.get(n.id) || 0) + 1);
  const clash = [...count].filter(([id, c]) => ours(id) && c > 1).map(([id]) => id);
  if (clash.length) fail(`id clash for ${clash.join(', ')} — another widget uses prefix "${P}_"; pick a different prefix`);
  return { pod, outVar, warnings };
}

// ---- validator (baseline vs result)
function errorCount(file) {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'validate-pod.js'), file], { encoding: 'utf8' });
  const m = /ERRORS \((\d+)\)/.exec(r.stdout || '');
  return { errors: m ? +m[1] : 0, out: r.stdout || r.stderr };
}

function selfTest() {
  const assert = require('assert');
  const mk = () => ({ _version: 1, id: 'T', contentDensity: 'Compact', createdFromTemplate: 'ORDER', target: 'CLOUD', dialogs: [],
    pages: [{ id: 'P1', widget: 'sap.m.Page', aggregations: { content: [{ id: 'Bar', widget: 'sap.m.IconTabBar', aggregations: { items: [
      { id: 'MisnamedTab', widget: 'sap.m.IconTabFilter', properties: { text: '{i18n>OEE}' }, aggregations: { content: [] },
        events: { tabEnter: [{ id: 'Keep', action: 'sap.dm.dme.pod2.action.datacollection.RefreshDataCollectionGroups' }] } }] } }] } }] });
  const spec = { prefix: 'KPI', target: { tab: 'oee' }, pp: { name: 'My_PP', inputs: [{ parameter: 'inPlant', variable: 'PLANT' }] },
    context: [{ label: 'Order', path: '/workList/lastSelected/order' }],
    fields: [
      { source: 'pp:outOEE', label: 'OEE', scale: 'percent', thresholds: [60, 85], hero: true },
      { source: 'pp:outQ', label: 'Quality', scale: 'fraction', thresholds: [60, 85] },
      { source: 'pp:outScrap', label: 'Scrap', unit: 'kg', thresholds: [5, 10], lowerIsBetter: true, max: 20 },
      { source: 'pp:outState', label: 'State', type: 'string' },
      { source: 'pp:outRunning', label: 'Running', type: 'boolean' },
      { source: '/workList/lastSelected/sfcQuantity', label: 'SFC qty', decimals: 0 }] };
  const pod = mk();
  build(pod, spec);
  build(pod, spec); // idempotent re-run
  const tab = pod.pages[0].aggregations.content[0].aggregations.items[0];
  assert.deepStrictEqual(tab.aggregations.content.map((n) => n.id), ['KPI_Panel']);
  assert.deepStrictEqual(tab.events.tabEnter.map((a) => a.id), ['Keep', 'KPI_Busy', 'KPI_LoadData']);
  const ppA = tab.events.tabEnter[2].properties;
  assert.deepStrictEqual(Object.keys(ppA.productionProcess.responseDataType.properties), ['outOEE', 'outQ', 'outScrap', 'outState', 'outRunning']);
  assert.strictEqual(ppA.productionProcess.responseDataType.properties.outRunning.type, 'boolean');
  assert.strictEqual(ppA.outputVariable, '_kpi');
  assert.strictEqual(ppA.inputParameters[0].valueType, 'variable');
  assert.ok(ppA.productionProcess.trigger.endpoint.path.endsWith('REG_REPLACE_WITH_PP_KEY_MY_PP'));
  const s = JSON.stringify(tab);
  assert.ok(s.includes('(${/_kpi/outQ} * 100)'), 'fraction scale multiplies by 100');
  assert.ok(s.includes("(${/_kpi/outScrap} * 1) < 5 ? '#256F3A'"), 'lowerIsBetter: below low is good');
  assert.ok(s.includes('Math.min(100, (${/_kpi/outScrap} * 1) * 5)'), 'bar scales by max');
  assert.ok(s.includes('Math.round((${/workList/lastSelected/sfcQuantity} * 1))'), 'context source, 0 decimals');
  assert.ok(!s.includes('"color":"\''), 'literal colours are unquoted');
  assert.ok(tabNames('{i18n>template.tab.phaseDetails}').includes(norm('Phase details')), 'tab matches i18n key last segment');
  assert.throws(() => build(mk(), { ...spec, target: { tab: 'nope' } }), /matched 0 tabs/);
  assert.throws(() => build(mk(), { ...spec, fields: [{ source: 'pp:x', label: 'X', thresholds: [9, 1] }] }), /thresholds/);
  assert.throws(() => build(mk(), { ...spec, pp: undefined }), /has no "pp"/);
  const page = mk();
  const r = build(page, { prefix: 'Info', target: { page: 'P1' }, fields: [{ source: '/workList/lastSelected/sfc', label: 'SFC', type: 'string' }] });
  assert.ok(!page.pages[0].events && !JSON.stringify(page).includes('Info_Refresh') && r.warnings.length === 0, 'context-only panel: no PP, no button');
  const tmp = path.join(os.tmpdir(), `build-panel-selftest-${process.pid}.json`);
  fs.writeFileSync(tmp, JSON.stringify(pod, null, 2));
  const v = errorCount(tmp);
  fs.unlinkSync(tmp);
  assert.strictEqual(v.errors, 0, v.out);
  console.log('self-test ok');
}

// ---- main
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args[0] === '--self-test') { selfTest(); process.exit(0); }
  const [input, specFile] = args.filter((a, i) => a[0] !== '-' && args[i - 1] !== '-o');
  if (!input || !specFile) { console.error('usage: build-panel.js <export.json> <spec.json> [-o <out.json>] [--preview]  |  --self-test'); process.exit(2); }
  try {
    const pod = JSON.parse(fs.readFileSync(input, 'utf8'));
    const spec = JSON.parse(fs.readFileSync(specFile, 'utf8').replace(/(^|\s)\/\/.*$/gm, '$1')); // allow // comments (patterns.md §18 style)
    const { warnings } = build(pod, spec);
    const oi = args.indexOf('-o');
    const out = oi > -1 ? args[oi + 1] : path.join(path.dirname(input), `${pod.id || 'POD'}.${spec.prefix.toLowerCase()}.json`);
    if (path.resolve(out) === path.resolve(input)) fail('refusing to overwrite the input export; pass -o <new file>');
    fs.writeFileSync(out, JSON.stringify(pod, null, 2) + '\n');
    warnings.forEach((w) => console.log('WARN ' + w));
    const base = errorCount(input), res = errorCount(out);
    console.log(`wrote ${out}\nvalidator errors: baseline ${base.errors} → result ${res.errors}`);
    if (res.errors > base.errors) { console.log(res.out); process.exit(1); }
    if (args.includes('--preview')) spawnSync(process.execPath, [path.join(__dirname, 'preview-pod.js'), out], { stdio: 'inherit' });
  } catch (e) { console.error('ERROR ' + e.message); process.exit(1); }
}
module.exports = { build };
