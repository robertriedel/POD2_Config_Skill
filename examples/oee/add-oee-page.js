// New POD from the SAP ORDER template + an empty "OEE" secondary page reachable from the order details header.
const fs = require('fs');
const pod = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
pod.id = 'OEE_DEMO';
pod.pages.push({ id: 'OEE', widget: 'sap.m.Page', properties: { showHeader: true, showFooter: false }, aggregations: {
  customHeader: [{ id: 'OEEToolbar', widget: 'sap.m.Toolbar', aggregations: { content: [
    { id: 'OEEBackButton', widget: 'sap.m.Button', properties: { type: 'Transparent', icon: 'sap-icon://nav-back', width: '2.5rem', height: '2.5rem' },
      events: { press: [{ id: 'NavigateBackAction', action: 'sap.dm.dme.pod2.action.page.NavigateBack' }] } },
    { id: 'OEETitle', widget: 'sap.m.Title', properties: { text: 'OEE', level: 'Auto', titleStyle: 'H3', wrapping: false } }] } }],
  content: [] } });
const od = pod.pages.find((p) => p.id === 'OrderDetails');
const bar = od.aggregations.customHeader[0].aggregations.content;
const i = bar.findIndex((n) => n.id === 'CreateGoodsReceiptButton');
bar.splice(i + 1, 0, { id: 'ShowOEEButton', widget: 'sap.m.Button', properties: { text: 'OEE', icon: 'sap-icon://performance', type: 'Transparent' },
  events: { press: [{ id: 'NavigateToPage', action: 'sap.dm.dme.pod2.action.page.NavigateToPage', properties: { page: 'OEE' } }] } });
fs.writeFileSync(process.argv[3], JSON.stringify(pod, null, 2));
