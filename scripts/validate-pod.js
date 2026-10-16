#!/usr/bin/env node
// Structural lint for SAP DM POD 2.0 configuration JSON (full export or clipboard fragment).
// Usage: node validate-pod.js <file.json> [--i18n <keys.txt>]   exit 1 on errors, 0 otherwise.
'use strict';
const fs = require('fs');

const file = process.argv[2];
if (!file) { console.error('usage: validate-pod.js <file.json>'); process.exit(2); }
let raw = fs.readFileSync(file, 'utf8');
const errors = [], warnings = [];
const err = (m) => errors.push(m), warn = (m) => warnings.push(m);

if (/^(<{7}|={7}|>{7})/m.test(raw)) err('git merge-conflict markers present (<<<<<<< / ======= / >>>>>>>)');
let doc;
try { doc = JSON.parse(raw); } catch (e) { err('invalid JSON: ' + e.message); report(); }

const KNOWN_NS = ['sap.dm.dme.pod2', 'sap.m.', 'sap.f.', 'sap.ui.', 'sap.uxap.'];
const AGG = new Set(['content', 'items', 'customHeader', 'heading', 'headerActions', 'headerContent', 'contentAreas', 'menuItems', 'buttons', 'sections', 'subSections', 'blocks', 'columns', 'header', 'menu', 'rootPaneContainer', 'panes', 'actions']);
const known = (s) => typeof s === 'string' && KNOWN_NS.some(n => s.startsWith(n) || s.includes('.pod2.'));

// ---- mode detection
const isNode = (o) => o && typeof o === 'object' && !Array.isArray(o) && typeof o.widget === 'string';
let mode, pages = [], dialogs = [], fragments = [];
if (doc && typeof doc === 'object' && Array.isArray(doc.pages)) {
  mode = 'full'; pages = doc.pages; dialogs = doc.dialogs || [];
  for (const k of ['_version', 'id', 'pages', 'dialogs', 'createdFromTemplate', 'contentDensity', 'target']) if (!(k in doc)) warn(`full export missing top-level "${k}"`);
  if (doc._version !== undefined && doc._version !== 1) warn(`_version is ${doc._version}, exports seen use 1`);
  if (doc.target && doc.target !== 'CLOUD') warn(`target "${doc.target}" (seen: CLOUD)`);
  if (!pages.length) err('pages[] is empty');
  pages.forEach((p, i) => { if (p.widget !== 'sap.m.Page') warn(`pages[${i}] widget is ${p.widget}, expected sap.m.Page`); });
  dialogs.forEach((d, i) => { if (d.widget !== 'sap.m.Dialog') warn(`dialogs[${i}] widget is ${d.widget}, expected sap.m.Dialog`); });
} else if (Array.isArray(doc)) { mode = 'fragment'; fragments = doc; }
else if (isNode(doc)) { mode = 'fragment'; fragments = [doc]; }
else { err('not a POD export (no "pages") and not a widget node/array (no "widget")'); report(); }

// ---- walk
const pageIds = new Set(pages.map(p => p.id)), dialogIds = new Set(dialogs.map(d => d.id));
const allWidgetIds = new Map(); // id -> count (global, for NavigateToWidget)
const refs = [];                // {kind, target, where}
const BIND_RE = /\{[^{}]*\}/g;

function checkBinding(val, where) {
  if (typeof val !== 'string') return;
  if (/REPLACE_WITH_/.test(val)) warn(`${where}: placeholder left: "${val.length > 80 ? val.slice(0, 77) + '...' : val}"`);
  if (!val.includes('{')) return;
  let depth = 0; for (const ch of val) { if (ch === '{') depth++; else if (ch === '}') depth--; if (depth < 0) break; }
  if (depth !== 0) { err(`${where}: unbalanced braces in "${val}"`); return; }
  if (/\{=\s/.test(val) && !/[%$]\{/.test(val)) warn(`${where}: expression without %{ or ${'$'}{ reference: "${val}"`);
}

function walkNode(n, scope, path) {
  if (!n || typeof n !== 'object' || Array.isArray(n)) { err(`${path}: node is not an object`); return; }
  const where = `${path}${n.id ? '#' + n.id : ''}`;
  if (typeof n.id !== 'string' || !n.id) err(`${where}: widget node without "id"`);
  if (typeof n.widget !== 'string' || !n.widget) err(`${where}: node without "widget"`);
  else if (!known(n.widget)) warn(`${where}: widget outside standard namespaces: ${n.widget}`);
  if (n.id) {
    scope.ids.set(n.id, (scope.ids.get(n.id) || 0) + 1);
    allWidgetIds.set(n.id, (allWidgetIds.get(n.id) || 0) + 1);
  }
  for (const k of Object.keys(n)) if (!['id', 'widget', 'properties', 'events', 'aggregations', 'layoutData'].includes(k)) warn(`${where}: unexpected node key "${k}"`);
  if (n.properties && typeof n.properties === 'object') {
    for (const [k, v] of Object.entries(n.properties)) {
      if (typeof v === 'string') checkBinding(v, `${where}.${k}`);
      if (k === 'columns' && Array.isArray(v)) v.forEach((c, i) => { if (!c || typeof c !== 'object' || !('field' in c)) err(`${where}.columns[${i}]: missing "field"`); if (c && typeof c.text === 'string') checkBinding(c.text, `${where}.columns[${i}].text`); });
    }
  }
  if (n.events !== undefined) {
    if (!n.events || typeof n.events !== 'object' || Array.isArray(n.events)) err(`${where}: "events" must be an object`);
    else for (const [ev, arr] of Object.entries(n.events)) {
      if (!Array.isArray(arr)) { err(`${where}.events.${ev}: must be an array of actions`); continue; }
      arr.forEach((a, i) => walkAction(a, `${where}.events.${ev}[${i}]`));
    }
  }
  if (n.aggregations !== undefined) {
    if (!n.aggregations || typeof n.aggregations !== 'object' || Array.isArray(n.aggregations)) err(`${where}: "aggregations" must be an object`);
    else for (const [ag, arr] of Object.entries(n.aggregations)) {
      if (!AGG.has(ag)) warn(`${where}: aggregation "${ag}" not seen in any export (known: ${[...AGG].join(', ')})`);
      if (!Array.isArray(arr)) { err(`${where}.aggregations.${ag}: must be an array of nodes`); continue; }
      arr.forEach((c, i) => walkNode(c, scope, `${where}.${ag}[${i}]`));
    }
  }
}

function walkAction(a, where) {
  if (!a || typeof a !== 'object' || Array.isArray(a)) { err(`${where}: action entry is not an object`); return; }
  if (typeof a.id !== 'string' || !a.id) err(`${where}: action without "id"`);
  if (typeof a.action !== 'string' || !a.action) { warn(`${where}: action entry without "action" (inert; seen in a customer export, remove it)`); return; }
  if (!known(a.action)) warn(`${where}: action outside standard namespaces: ${a.action}`);
  const p = a.properties || {};
  const short = a.action.split('.').pop();
  if (short === 'ShowDialog') refs.push({ kind: 'dialog', target: p.dialog, where });
  if (short === 'NavigateToPage') refs.push({ kind: 'page', target: p.page, where });
  if (short === 'NavigateToWidget') refs.push({ kind: 'widget', target: p.widgetId, where });
  if (short === 'ProductionProcess') {
    if (p.responseDataType && !p.outputVariable) warn(`${where}: ProductionProcess has responseDataType but no outputVariable (output discarded)`);
    if (Array.isArray(p.inputParameters)) p.inputParameters.forEach((ip, i) => {
      if (!ip || !ip.parameter) err(`${where}.inputParameters[${i}]: missing "parameter"`);
      else if (ip.value === undefined) warn(`${where}.inputParameters[${i}] (${ip.parameter}): no value`);
      if (ip && typeof ip.value === 'string') checkBinding(ip.value, `${where}.inputParameters[${i}]`);
    });
    const pp = p.productionProcess || {};
    if (!pp.id || !pp.name) warn(`${where}: productionProcess.id/name missing`);
  }
  (function deep(o, pre) { for (const [k, v] of Object.entries(o || {})) { if (typeof v === 'string') checkBinding(v, `${pre}.${k}`); else if (v && typeof v === 'object') deep(v, `${pre}.${k}`); } })(p, where);
}

function walkScope(n, label) {
  const scope = { ids: new Map() };
  walkNode(n, scope, label);
  for (const [id, c] of scope.ids) if (c > 1) err(`${label}: widget id "${id}" used ${c}x (must be unique within a page/dialog)`);
}

pages.forEach((p, i) => walkScope(p, `pages[${i}]`));
dialogs.forEach((d, i) => walkScope(d, `dialogs[${i}]`));
fragments.forEach((f, i) => walkScope(f, fragments.length > 1 ? `fragment[${i}]` : 'fragment'));

// ---- cross references
const soft = mode === 'fragment' ? warn : err;
for (const r of refs) {
  if (!r.target) { err(`${r.where}: ${r.kind} reference without target`); continue; }
  if (r.kind === 'dialog' && !dialogIds.has(r.target)) soft(`${r.where}: ShowDialog -> dialog "${r.target}" not found${mode === 'fragment' ? ' in fragment (must exist in target POD)' : ''}`);
  if (r.kind === 'page' && !pageIds.has(r.target)) soft(`${r.where}: NavigateToPage -> page "${r.target}" not found${mode === 'fragment' ? ' in fragment (must exist in target POD)' : ''}`);
  if (r.kind === 'widget' && !allWidgetIds.has(r.target) && !dialogIds.has(r.target)) soft(`${r.where}: NavigateToWidget -> widget/dialog "${r.target}" not found`);
}
if (mode === 'full') for (const [id, c] of allWidgetIds) if (c > 1 && refs.some(r => r.kind === 'widget' && r.target === id)) err(`widget id "${id}" exists ${c}x across pages and is a NavigateToWidget target (ambiguous)`);

// ---- i18n (optional key list)
const ki = process.argv.indexOf('--i18n');
if (ki > 0 && process.argv[ki + 1]) {
  const keys = new Set(fs.readFileSync(process.argv[ki + 1], 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean));
  const used = new Set((raw.match(/\{i18n[^>]*>[^}]+\}/g) || []).map(s => s.slice(1, -1)));
  for (const u of used) if (!keys.has(u)) warn(`i18n key not in known list: {${u}}`);
}

report();

function report() {
  const pad = (a) => a.map(s => '  - ' + s).join('\n');
  if (warnings.length) console.log(`WARNINGS (${warnings.length})\n${pad(warnings)}`);
  if (errors.length) { console.log(`ERRORS (${errors.length})\n${pad(errors)}`); console.log(`FAIL ${file}`); process.exit(1); }
  console.log(`OK ${file}${mode ? ' (' + mode + (mode === 'full' ? `: ${pages.length} pages, ${dialogs.length} dialogs` : '') + ')' : ''}`);
  process.exit(0);
}
