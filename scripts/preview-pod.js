#!/usr/bin/env node
// Fiori preview for a SAP DM POD 2.0 configuration export.
// Emits ONE self-contained HTML file that boots real SAPUI5 from the public CDN
// and instantiates the actual controls from the POD JSON, against a mock POD-context model.
// Rendering happens in the browser; this script only generates the HTML.
//
// Usage:
//   node preview-pod.js <export.json> [-o <out.html>]   -> writes <input>.preview.html by default
//   node preview-pod.js --self-test                     -> runnable sanity check, no args
'use strict';
const fs = require('fs');
const path = require('path');

const CDN = 'https://sapui5.hana.ondemand.com/resources/sap-ui-core.js';

// Mock POD runtime context — enough for the common roots in references/pod-context.md
// so {/…} bindings and {= …} expressions resolve to visible sample values.
const MOCK = {
  pod: { id: 'DEMO_POD', description: 'Demo POD (preview)' },
  user: { id: 'operator@example.com', language: 'en' },
  plant: { plant: '1710', industryType: 'PROCESS' },
  filter: { workCenters: [{ workCenter: 'WC-ASSY' }], resources: [{ resource: 'RES-1' }], materials: [] },
  sfc: { sfc: 'SFC-0001', material: 'MAT-100', materialVersion: 'A', qty: 1 },
  workList: {
    lastSelected: { sfc: 'SFC-0001', order: '1000234', material: 'MAT-100', materialVersion: 'A', materialDescription: 'Demo material',
      orderBatchNumber: 'B-0001', sfcBatchNumber: 'B-0001', sfcQuantity: 250, sfcStatusCode: '403', sfcStatusDescription: 'Active',
      orderExecutionStatus: 'ACTIVE', operation: 'OP-10', operationActivity: 'OP-10', resource: 'RES-1', workCenter: 'WC-ASSY' },
    selected: [{ sfc: 'SFC-0001', operation: 'OP-10' }],
    items: [
      { sfc: 'SFC-0001', operation: 'OP-10', status: 'IN_WORK', qty: 1 },
      { sfc: 'SFC-0002', operation: 'OP-10', status: 'NEW', qty: 2 },
      { sfc: 'SFC-0003', operation: 'OP-20', status: 'DONE', qty: 1 }
    ]
  },
  execution: { operationActivity: {
    lastSelected: { operationActivity: '0020', stepId: '0020', description: 'Filling', resource: 'FILLER_01', workCenter: 'WC-ASSY', statusInWork: true },
    selected: [{ operationActivity: '0020', resource: 'FILLER_01' }] } },
  workCenter: { workCenter: 'WC-ASSY', description: 'Assembly' },
  resource: { resource: 'RES-1', description: 'Station 1' },
  order: { order: 'ORD-9000', material: 'MAT-100', buildQty: 10, phases: [{ phase: 'PH-10', status: 'ACTIVE' }] }
};

// Sample values for every Production Process outputVariable, derived from its responseDataType,
// so tiles bound to {/<outputVariable>/…} render filled (tabEnter/pageEnter never run in the preview).
const SAMPLE = [72.4, 96.2, 81.3, 92.1, 58.7, 88.5];
function ppMocks(pod) {
  const raw = JSON.stringify(pod), out = {};
  let n = 0;
  (function walk(o) {
    if (Array.isArray(o)) return o.forEach(walk);
    if (!o || typeof o !== 'object') return;
    const p = o.properties;
    if (/\.ProductionProcess$/.test(o.action || '') && p && p.outputVariable) {
      const props = (((p.productionProcess || {}).responseDataType) || {}).properties || {};
      const v = out[p.outputVariable] = out[p.outputVariable] || {};
      for (const [k, t] of Object.entries(props)) {
        const ty = (t && t.type) || 'string';
        if (ty === 'number' || ty === 'integer') {
          // ponytail: fraction detection by build-panel's "* 100)" expression signature; other hand-written expressions get 0–100 values
          const frac = raw.includes('${/' + p.outputVariable + '/' + k + '} * 100)');
          const x = SAMPLE[n++ % SAMPLE.length];
          v[k] = ty === 'integer' ? Math.round(x) : frac ? Math.round(x * 10) / 1000 : x;
        } else if (ty === 'boolean') v[k] = n++ % 2 === 0;
        else if (ty === 'array') v[k] = [];
        else v[k] = k + ' (sample)';
      }
    }
    Object.values(o).forEach(walk);
  })(pod);
  return out;
}

// No i18n bundles in the preview: {i18n…>key} → humanised last key segment ("template.tab.phaseDetails" → "Phase details").
function humanize(key) {
  const w = String(key).split('.').pop().replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_'{}\\]/g, ' ').trim().toLowerCase();
  return w.charAt(0).toUpperCase() + w.slice(1);
}
function stripI18n(json) {
  return json
    .replace(/\$\{i18n[^>{}"]*>([^{}"]+)\}/g, (m, k) => "'" + humanize(k) + "'")   // inside {= … } expressions
    .replace(/\{i18n[^>{}"]*>([^{}"]+)\}/g, (m, k) => humanize(k));
}

function buildHtml(pod) {
  const podJson = stripI18n(JSON.stringify(pod));
  const mockJson = JSON.stringify(Object.assign({}, MOCK, ppMocks(pod)));
  const title = (pod && (pod.description || pod.id)) || 'POD preview';
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>${esc(title)} — POD 2.0 preview</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  html,body{margin:0;height:100%}
  body{display:flex;flex-direction:column}
  #root{flex:1;min-height:0}
  #banner{font:13px/1.4 Arial,sans-serif;background:#354a5f;color:#fff;padding:8px 14px}
  #banner b{font-size:14px}
  #banner span{opacity:.8}
  .ph{border:1px dashed #8a8a8a;border-radius:6px;background:#f4f4f4;color:#333;
      padding:10px 12px;margin:4px;font:12px/1.4 Arial,sans-serif;display:inline-block;min-width:120px}
  .ph .cls{font-weight:bold;color:#0a6ed1}
  .ph .id{color:#666}
</style>
<script id="sap-ui-bootstrap" src="${CDN}"
  data-sap-ui-theme="sap_horizon"
  data-sap-ui-libs="sap.m,sap.f,sap.ui.layout,sap.uxap,sap.ui.core,sap.ui.unified"
  data-sap-ui-compatVersion="edge"
  data-sap-ui-async="true"></script>
</head><body class="sapUiBody">
<div id="banner"><b>POD 2.0 preview — ${esc(title)}</b>
  &nbsp;<span>mock sample data · custom sap.dm.dme.pod2.* widgets shown as placeholders · needs internet (SAPUI5 CDN)</span></div>
<div id="root"></div>
<script>
var POD = ${podJson};
var MOCK = ${mockJson};
sap.ui.getCore().attachInit(function () {
  var JSONModel = sap.ui.require ? null : null; // libs loaded via bootstrap; resolve classes off window
  function klass(name){ try { return name.split('.').reduce(function(o,k){return o&&o[k];}, window); } catch(e){ return null; } }
  function shortName(n){ return String(n||'?').split('.').pop(); }
  var CSS = { backgroundColor: 'background-color', fontColor: 'color', fontSize: 'font-size', fontWeight: 'font-weight',
              borderColor: 'border-color', borderWidth: 'border-width', gap: 'gap', paddingBegin: 'padding-left',
              paddingEnd: 'padding-right', paddingTop: 'padding-top', paddingBottom: 'padding-bottom' };
  var PAD = { None: '0', Tiny: '0.5rem', Small: '1rem', Medium: '2rem', Large: '3rem' };

  // placeholder for custom / unresolvable widgets
  function placeholder(node){
    var p = node.properties || {};
    var label = p.text || p.title || p.icon || '';
    var html = '<div class="ph"><span class="cls">'+shortName(node.widget)+'</span>'
             + (node.id ? ' <span class="id">#'+node.id+'</span>' : '')
             + (label ? '<br>'+String(label).replace(/[<>]/g,'') : '') + '</div>';
    return new sap.ui.core.HTML({ content: html });
  }

  var model = new (klass('sap.ui.model.json.JSONModel') || sap.ui.model.json.JSONModel)(MOCK);
  var idSeq = 0;

  // flat layoutData ({size}/{growFactor}) depends on the parent; typed form carries its own class
  function layoutData(ld, parentWidget){
    try {
      if (!ld) return null;
      if (ld.widget) { var C = klass(ld.widget); return C ? new C(ld.properties || {}) : null; }
      if (/Splitter$/.test(parentWidget || '')) return new sap.ui.layout.SplitterLayoutData(ld);
      if (/Box$/.test(parentWidget || '')) return new sap.m.FlexItemData(ld);
    } catch (e) { /* unknown layout key */ }
    return null;
  }

  function build(node, parentWidget){
    if (!node || typeof node !== 'object' || !node.widget) return null;
    var ctrl = buildCtrl(node);
    var ld = ctrl && layoutData(node.layoutData, parentWidget);
    if (ld) try { ctrl.setLayoutData(ld); } catch (e) {}
    return ctrl;
  }

  function buildCtrl(node){
    if (node.widget.indexOf('sap.dm.dme.pod2.') === 0) return placeholder(node);
    var Ctor = klass(node.widget);
    if (typeof Ctor !== 'function') return placeholder(node);

    var ctrl;
    try { ctrl = new Ctor('prev-' + (idSeq++)); }      // unique id, avoid collisions with mock/other previews
    catch (e) { return placeholder(node); }

    // properties — one at a time so a single bad key can't nuke the control
    var props = node.properties || {};
    var styles = {};
    Object.keys(props).forEach(function(k){
      try {
        var settings = {}; settings[k] = props[k];
        if (ctrl.getMetadata().getAllProperties()[k]) ctrl.applySettings(settings); // applySettings parses {/…} and {= …}; plain setters do not
        else if (CSS[k]) { styles[k] = 1; ctrl.addCustomData(new sap.ui.core.CustomData({ key: 'pv_' + k, value: props[k] })); }
        else if (ctrl.bindProperty && typeof props[k] === 'string' && /\\{.*\\}/.test(props[k])) ctrl.bindProperty(k, props[k]);
      } catch (e) { /* ignore unknown/invalid prop */ }
    });

    // POD-2.0 style extensions (backgroundColor, fontColor, padding*, gap …) → inline CSS after rendering
    if (Object.keys(styles).length) ctrl.addEventDelegate({ onAfterRendering: function(){
      var el = ctrl.getDomRef(); if (!el) return;
      Object.keys(styles).forEach(function(k){
        var v = ctrl.data('pv_' + k);
        if (v === null || v === undefined || v === '') return;
        if (k.indexOf('padding') === 0) v = PAD[v] || v;
        var t = ((k === 'backgroundColor' || k === 'fontColor' || k.indexOf('border') === 0) && el.querySelector('.sapMBtnInner')) || el;
        t.style.setProperty(CSS[k], String(v));
        if (k === 'borderWidth') t.style.borderStyle = 'solid';
      });
    } });

    // aggregations — resolve the real mutator from UI5 metadata (addItem, addButton, setCustomHeader, …)
    var aggs = node.aggregations || {};
    Object.keys(aggs).forEach(function(aggName){
      var kids = aggs[aggName]; if (!Array.isArray(kids)) return;
      var meta = ctrl.getMetadata().getAggregation(aggName) || ctrl.getMetadata().getAllAggregations()[aggName];
      kids.forEach(function(childNode){
        var child = build(childNode, node.widget); if (!child) return;
        try {
          if (!meta) { if (ctrl.addDependent) ctrl.addDependent(child); return; }
          var m = meta._sMutator;
          if (m && typeof ctrl[m] === 'function') ctrl[m](child);
          else if (meta.multiple) ctrl.addAggregation(aggName, child); else ctrl.setAggregation(aggName, child);
        } catch (e) { /* aggregation not valid on this control */ }
      });
    });
    return ctrl;
  }

  var pages = Array.isArray(POD.pages) ? POD.pages : [];
  var dialogs = Array.isArray(POD.dialogs) ? POD.dialogs : [];

  var tabs = new sap.m.IconTabBar({ expandable: false, stretchContentHeight: true, applyContentPadding: false,
                                    layoutData: new sap.m.FlexItemData({ growFactor: 1, minHeight: '0' }) });
  pages.forEach(function(pg, i){
    var c = build(pg) || placeholder(pg);
    tabs.addItem(new sap.m.IconTabFilter({ text: (pg.id || ('page ' + (i+1))), content: [c] }));
  });

  var items = [tabs];
  if (dialogs.length){
    var bar = new sap.m.OverflowToolbar();
    bar.addContent(new sap.m.Label({ text: 'Dialogs:' }));
    dialogs.forEach(function(dg){
      var dlg = build(dg);
      bar.addContent(new sap.m.Button({
        text: dg.id || 'dialog',
        press: function(){ if (dlg && dlg.open) dlg.open(); else sap.m.MessageToast.show('not a dialog control'); }
      }));
    });
    items.unshift(bar);
  }

  var root = new sap.m.VBox({ items: items, height: '100%', renderType: 'Bare' });
  root.setModel(model);
  root.placeAt('root');
});
</script>
</body></html>`;
}

function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]; }); }

function outName(input, pod){
  var base = path.basename(input).replace(/\.json$/i, '');
  if (base) return path.join(path.dirname(input), base + '.preview.html');
  return path.join(path.dirname(input), (pod && pod.id || 'pod') + '.preview.html');
}

function selfTest(){
  var pod = { id: 'T', pages: [{ id: 'P', widget: 'sap.m.Page', aggregations: { content: [
    { id: 'B', widget: 'sap.m.Button', properties: { text: 'Hi' } },
    { id: 'C', widget: 'sap.dm.dme.pod2.widget.core.Clock' }
  ] } }] };
  pod.pages[0].events = { pageEnter: [{ id: 'L', action: 'sap.dm.dme.pod2.action.pp.ProductionProcess', properties: { outputVariable: '_k',
    productionProcess: { responseDataType: { type: 'object', properties: { outA: { type: 'number' }, outB: { type: 'number' }, outOn: { type: 'boolean' } } } } } }] };
  pod.pages[0].aggregations.content.push({ id: 'T', widget: 'sap.m.Text', properties: { text: '{= ${/_k/outB} * 100) }' } });
  var m = ppMocks(pod);
  if (stripI18n('"{i18n>template.tab.phaseDetails}" "{= ${i18n>change} }"') !== '"Phase details" "{= \'Change\' }"') { console.error('self-test FAILED (i18n)'); process.exit(1); }
  if (!(m._k && m._k.outA === 72.4 && m._k.outB === 0.962 && m._k.outOn === true)) { console.error('self-test FAILED (ppMocks)', JSON.stringify(m)); process.exit(1); }
  var html = buildHtml(pod);
  var ok = html.indexOf(CDN) > -1
        && html.indexOf('"sap.m.Button"') > -1
        && html.indexOf('sap.dm.dme.pod2.widget.core.Clock') > -1
        && html.indexOf("indexOf('sap.dm.dme.pod2.')") > -1   // placeholder branch present
        && html.indexOf('"outA":72.4') > -1;                     // PP mock injected
  if (!ok) { console.error('self-test FAILED'); process.exit(1); }
  console.log('self-test ok'); process.exit(0);
}

// ---- main
var args = process.argv.slice(2);
if (args[0] === '--self-test') selfTest();
var input = args.find(function(a){ return a[0] !== '-'; });
if (!input) { console.error('usage: preview-pod.js <export.json> [-o <out.html>]  |  --self-test'); process.exit(2); }
var oi = args.indexOf('-o');
var pod;
try { pod = JSON.parse(fs.readFileSync(input, 'utf8')); }
catch (e) { console.error('cannot read/parse ' + input + ': ' + e.message); process.exit(1); }
var out = oi > -1 ? args[oi + 1] : outName(input, pod);
fs.writeFileSync(out, buildHtml(pod));
console.log('wrote ' + out + '  — open in a browser (needs internet for the SAPUI5 CDN)');
