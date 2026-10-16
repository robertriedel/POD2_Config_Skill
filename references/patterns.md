# Patterns (paste-ready recipes)

All snippets are fragments (widget nodes). Re-id if the target page already has these ids. Placeholders `REPLACE_WITH_*` must be resolved in the designer.

## 1. Custom dialog → Production Process → show output (SAP blog "Custom UI Dialogs")

Dialog (goes into `dialogs[]` / Pages tab → Add Dialog → paste):
```json
{ "id": "ConsumeUnplannedDialog", "widget": "sap.m.Dialog",
  "properties": { "title": "Consume Unplanned Component", "contentWidth": "40rem", "draggable": true, "resizable": true },
  "aggregations": {
    "content": [
      { "id": "ConsumeUnplannedForm", "widget": "sap.m.VBox", "properties": { "gap": "0.5rem", "paddingBegin": "Small", "paddingEnd": "Small", "paddingTop": "Small" },
        "aggregations": { "items": [
          { "id": "UnplannedMaterialLabel", "widget": "sap.m.Label", "properties": { "text": "{i18n>material}", "showColon": true } },
          { "id": "UnplannedMaterialInput", "widget": "sap.m.Input", "properties": { "value": "{/nomBOMAssy/input/material}", "width": "100%" } },
          { "id": "UnplannedQtyLabel", "widget": "sap.m.Label", "properties": { "text": "{i18n>quantity}", "showColon": true } },
          { "id": "UnplannedQtyInput", "widget": "sap.m.Input", "properties": { "value": "{/nomBOMAssy/input/qty}", "type": "Number", "width": "8rem" } },
          { "id": "UnplannedResultText", "widget": "sap.m.Text", "properties": { "text": "{/nomBOMAssyOutput/output}" } }
        ] } }
    ],
    "buttons": [
      { "id": "UnplannedAssembleButton", "widget": "sap.m.Button", "properties": { "text": "Assemble", "type": "Emphasized", "enabled": "{= !!%{/nomBOMAssy/input/material} && !!%{/nomBOMAssy/input/qty} }" },
        "events": { "press": [
          { "id": "BusyOn", "action": "sap.dm.dme.pod2.action.core.BusyIndicator", "properties": { "widgetId": "", "target": "dialog" } },
          { "id": "AssembleUnplanned", "action": "sap.dm.dme.pod2.action.pp.ProductionProcess",
            "properties": {
              "outputVariable": "nomBOMAssyOutput",
              "productionProcess": { "id": "REPLACE_WITH_PP_ID_ASSEMBLE_UNPLANNED", "name": "REPLACE_WITH_PP_NAME",
                "trigger": { "type": "HTTP", "protocol": "REST", "method": "POST", "endpoint": { "url": "REPLACE_WITH_TENANT/pe/api/v1/process/processDefinitions/start?key=REG_REPLACE_WITH_PP_KEY_ASSEMBLE_UNPLANNED", "destinations": [], "path": "/pe/api/v1/process/processDefinitions/start?key=REG_REPLACE_WITH_PP_KEY_ASSEMBLE_UNPLANNED" } },
                "responseDataType": { "type": "object", "properties": { "output": { "type": "string" } } } },
              "inputParameters": [
                { "parameter": "inPlant", "type": "string", "subType": null, "valueType": "variable", "value": "PLANT" },
                { "parameter": "inSfc", "type": "string", "subType": null, "variable": null, "value": "{/workList/lastSelected/sfc}" },
                { "parameter": "inOperationActivity", "type": "string", "subType": null, "variable": null, "value": "{/execution/operationActivity/lastSelected/operationActivity}" },
                { "parameter": "inResource", "type": "string", "subType": null, "variable": null, "value": "{/execution/operationActivity/lastSelected/resource}" },
                { "parameter": "inComponent", "type": "string", "subType": null, "variable": null, "value": "{/nomBOMAssy/input/material}" },
                { "parameter": "inQty", "type": "string", "subType": null, "variable": null, "value": "{/nomBOMAssy/input/qty}" }
              ] } }
        ] } },
      { "id": "UnplannedCloseButton", "widget": "sap.m.Button", "properties": { "text": "{i18n>close}" },
        "events": { "press": [ { "id": "CloseDialog", "action": "sap.dm.dme.pod2.action.dialog.CloseDialog" } ] } }
    ] } }
```
Notes: no `CloseDialog` after the PP so the result text stays visible; `sap.m.Input.value` binding is the *inferred* JSON key for the designer's Value/"POD Variable Path" (verify once by copying an Input from the designer). Trigger button below. After the PP, tell the user to re-select the operation to refresh the component list (no refresh action yet).

Trigger (paste into the Component Consumption tab content, before the list):
```json
{ "id": "ConsumeUnplannedButton", "widget": "sap.m.Button",
  "properties": { "text": "Consume Unplanned Components", "icon": "sap-icon://add", "type": "Ghost", "enabled": "{= %{/workList/selected/length} === 1 }" },
  "events": { "press": [ { "id": "ShowConsumeUnplanned", "action": "sap.dm.dme.pod2.action.dialog.ShowDialog", "properties": { "dialog": "ConsumeUnplannedDialog" } } ] } }
```

## 2. Dynamic visibility / enablement (SAP blog "Dynamic PODs")
```json
[
 { "id": "InspectionOnlyButton", "widget": "sap.m.Button", "properties": { "text": "Inspection step", "visible": "{= %{/execution/operationActivity/selected/0/operationActivity} === 'INSPECTION' }" } },
 { "id": "EnabledOnInspectionButton", "widget": "sap.m.Button", "properties": { "text": "Needs inspection", "enabled": "{= %{/execution/operationActivity/selected/0/operationActivity} === 'INSPECTION' }" } },
 { "id": "InWorkOnlyBox", "widget": "sap.m.VBox", "properties": { "visible": "{= ${/execution/operationActivity/lastSelected/statusInWork} }" }, "aggregations": { "items": [] } }
]
```
Other useful conditions: `%{/workList/selected/length} > 0`, `%{/workList/lastSelected/sfcStatusCode} === '403'` (Active), `!!%{/myPpOut/outField}` (PP output present), `%{/plant/industryType} === 'PROCESS'`, `%{/user/id} === 'x@y.com'`.

## 3. Execution toolbar (Start / Signoff / Complete) — from WORK_CENTER template
```json
{ "id": "ExecToolbar", "widget": "sap.m.Toolbar", "properties": { "design": "Solid", "style": "Standard", "height": "4.5rem", "backgroundColor": "rgb(53, 74, 95)" },
  "aggregations": { "content": [
    { "id": "StartButton", "widget": "sap.m.Button", "properties": { "text": "{i18n>start}", "icon": "sap-icon://fob-watch", "width": "8.75rem", "height": "2.75rem", "iconColor": "rgb(255, 255, 255)", "backgroundColor": "rgb(16, 126, 62)", "borderColor": "rgb(16, 126, 62)", "borderWidth": "2px", "fontColor": "rgb(255, 255, 255)" },
      "events": { "press": [ { "id": "StartAction", "action": "sap.dm.dme.pod2.action.sfc.Start" } ] } },
    { "id": "SignoffButton", "widget": "sap.m.Button", "properties": { "text": "{i18n>signoff}", "icon": "sap-icon://past", "width": "8.75rem", "height": "2.75rem", "iconColor": "rgb(255, 255, 255)", "backgroundColor": "rgb(233, 115, 12)", "borderColor": "rgb(233, 115, 12)", "borderWidth": "2px", "fontColor": "rgb(255, 255, 255)" },
      "events": { "press": [ { "id": "SignoffAction", "action": "sap.dm.dme.pod2.action.sfc.Signoff" } ] } },
    { "id": "CompleteButton", "widget": "sap.m.Button", "properties": { "text": "{i18n>complete}", "icon": "sap-icon://flag", "width": "8.75rem", "height": "2.75rem", "iconColor": "rgb(255, 255, 255)", "backgroundColor": "rgb(10, 110, 209)", "borderColor": "rgb(10, 110, 209)", "borderWidth": "2px", "fontColor": "rgb(255, 255, 255)" },
      "events": { "press": [ { "id": "CompleteAction", "action": "sap.dm.dme.pod2.action.sfc.Complete" } ] } }
  ] } }
```
Order/phase PODs use `phase.StartPhase` / `phase.CompletePhase {allowConfirmation:true}` from the PhaseTable events instead.

## 4. New tab with a table inside an IconTabBar
```json
{ "id": "MyTab", "widget": "sap.m.IconTabFilter", "properties": { "icon": "sap-icon://list", "iconColor": "Default", "text": "My tab", "design": "Horizontal" },
  "aggregations": { "content": [
    { "id": "MyTabScroll", "widget": "sap.m.ScrollContainer", "properties": { "vertical": true, "horizontal": false, "height": "100%" },
      "aggregations": { "content": [ { "id": "MyTabTable", "widget": "sap.dm.dme.pod2.widget.workinstruction.WorkInstructionTable", "properties": { "mode": "SingleSelectMaster", "listType": "Navigation", "columns": [ { "field": "workInstructionVersion", "text": "{i18n>WorkInstructionTableWidget.column.workInstructionWithVersion}", "importance": "High" }, { "field": "description", "text": "{i18n>description}" } ] },
        "events": { "itemPress": [ { "id": "ShowWI", "action": "sap.dm.dme.pod2.action.dialog.ShowDialog", "properties": { "dialog": "WorkInstructionDialog" } } ] } } ] } }
  ] },
  "events": { "tabEnter": [] } }
```
Paste into `SFCDetailsContentTabBar.items` (WC/OA) or `OrderDetailsContentTabBar.items` (ORDER). Tabs that need fresh data wire `tabEnter` → a Refresh action (DC tab uses `RefreshDataCollectionGroups`).

## 5. Confirm → BusyIndicator → Production Process chain (customer pattern)
```json
"events": { "press": [
  { "id": "Confirm", "action": "sap.dm.dme.pod2.action.core.Confirm", "properties": { "title": "Send to PLC", "message": "Send order {/workList/lastSelected/order} to the line PLC?", "confirmButton": "YES", "cancelButton": "NO" } },
  { "id": "BusyIndicator", "action": "sap.dm.dme.pod2.action.core.BusyIndicator", "properties": { "widgetId": "", "target": "page" } },
  { "id": "SendToPlc", "action": "sap.dm.dme.pod2.action.pp.ProductionProcess", "properties": { "productionProcess": { "id": "REPLACE_WITH_PP_ID_SEND_PLC", "name": "REPLACE_WITH_PP_NAME", "trigger": { "type": "HTTP", "protocol": "REST", "method": "POST", "endpoint": { "url": "REPLACE_WITH_TENANT/pe/api/v1/process/processDefinitions/start?key=REG_REPLACE_WITH_PP_KEY_SEND_PLC", "destinations": [], "path": "/pe/api/v1/process/processDefinitions/start?key=REG_REPLACE_WITH_PP_KEY_SEND_PLC" } } }, "inputParameters": [ { "parameter": "inOrder", "type": "string", "subType": null, "variable": null, "value": "{/workList/lastSelected/order}" } ] } }
] }
```
Cancel in Confirm skips everything after it. BusyIndicator `target`: `page` or `dialog` (`widgetId` to scope to one control). Turning the indicator off after the PP is handled by the framework in customer exports (no explicit "off" entry observed).

## 6. Cross-POD / cross-app link with context (OpenURL, customer pattern)
```json
{ "id": "OpenOrderPodButton", "widget": "sap.m.Button", "properties": { "text": "Order POD", "icon": "sap-icon://sales-order", "type": "Transparent" },
  "events": { "press": [ { "id": "OpenOrderPod", "action": "sap.dm.dme.pod2.action.core.OpenURL", "properties": { "url": "/cp.portal/site#DMEOrderPOD-Display?POD_ID=REPLACE_WITH_POD_ID&/DETAILS?=&ORDERSELECTION={/workList/lastSelected/order}" } } ] } }
```
Relative URLs stay on the tenant. Parameter names other than `POD_ID` are app specific — copy from a working link.

## 7. Detail-page header block (label above value), template style
```json
{ "id": "MyFieldBox", "widget": "sap.m.VBox", "properties": { "gap": "0.425rem" },
  "aggregations": { "items": [
    { "id": "MyFieldLabel", "widget": "sap.m.Label", "properties": { "text": "{i18n>order}", "showColon": true, "fontSize": "1rem", "fontWeight": "bold" } },
    { "id": "MyFieldText", "widget": "sap.m.Text", "properties": { "text": "{/workList/lastSelected/order}", "fontSize": "1rem" } } ] } }
```
Paste into the header HBox (`SFCDetailsHeader.items` on WC, `SFCDetailsHeaderBox.items` on OA, `OrderDetailsHeader.items` on ORDER). Dates: use `sap.dm.dme.pod2.widget.core.DateTimeText {date1, date2?, displayFormat: "DateTime"|"DateRange", emptyIndicatorMode: "On"}` instead of Text.

## 8. Back button (detail page header, first toolbar item)
```json
{ "id": "BackButton", "widget": "sap.m.Button", "properties": { "type": "Transparent", "icon": "sap-icon://nav-back", "tooltip": "{i18n>back}", "width": "2rem", "height": "2rem" },
  "events": { "press": [
    { "id": "NavigateBackAction", "action": "sap.dm.dme.pod2.action.page.NavigateBack" },
    { "id": "ClearWorkListSelection", "action": "sap.dm.dme.pod2.action.worklist.ClearWorkListSelection" },
    { "id": "ClearSFCExecutionQuantity", "action": "sap.dm.dme.pod2.action.sfc.ClearSFCExecutionQuantity" } ] } }
```
Template convention: WC detail page clears selection + execution qty; OA nonconformance page clears execution qty only; ORDER detail clears selection only. Secondary pages (GoodsReceipt, UpdateBatchCharacteristics) just `NavigateBack`.

## 9. New secondary page (toolbar style)
```json
{ "id": "MyPage", "widget": "sap.m.Page", "properties": { "showHeader": true, "showFooter": false },
  "aggregations": {
    "customHeader": [ { "id": "MyPageToolbar", "widget": "sap.m.Toolbar", "aggregations": { "content": [
        { "id": "MyPageBackButton", "widget": "sap.m.Button", "properties": { "type": "Transparent", "icon": "sap-icon://nav-back", "width": "2.5rem", "height": "2.5rem" }, "events": { "press": [ { "id": "NavigateBackAction", "action": "sap.dm.dme.pod2.action.page.NavigateBack" } ] } },
        { "id": "MyPageTitle", "widget": "sap.m.Title", "properties": { "text": "My page", "level": "Auto", "titleStyle": "H3", "wrapping": false } },
        { "id": "MyPageSpacer", "widget": "sap.m.ToolbarSpacer" },
        { "id": "MyPageClock", "widget": "sap.dm.dme.pod2.widget.core.Clock" },
        { "id": "MyPageMessageHistory", "widget": "sap.dm.dme.pod2.widget.core.MessageHistory", "properties": {} },
        { "id": "MyPageNotificationState", "widget": "sap.dm.dme.pod2.widget.notification.NotificationStateIcon", "properties": { "size": "2rem" } } ] } } ],
    "content": [] } }
```
Navigate to it with `NavigateToPage {page:"MyPage"}` from a Button/MenuItem; `enabled: "{= %{/workList/selected/length} === 1 }"` when the page needs a selected SFC.

## 10. Actions menu (MenuButton)
```json
{ "id": "ActionsMenuButton", "widget": "sap.m.MenuButton", "properties": { "text": "{i18n>template.button.actions}", "icon": "sap-icon://menu", "type": "Default" },
  "aggregations": { "menuItems": [
    { "id": "SplitMenuItem", "widget": "sap.m.MenuItem", "properties": { "text": "{i18n>SplitAction.ui.menuButton.name}" }, "events": { "select": [ { "id": "Split", "action": "sap.dm.dme.pod2.action.sfc.Split" } ] } },
    { "id": "ClockInMenuItem", "widget": "sap.m.MenuItem", "properties": { "text": "{i18n>template.button.clockIn}" }, "events": { "select": [ { "id": "ClockIn", "action": "sap.dm.dme.pod2.timetracking.action.ClockIn", "properties": { "confirm": true, "addComment": true, "userIdOption": "Default" } } ] } } ] } }
```

## 11. Data Collection dialog Save chain (template) — keep this order
`LogDataCollectionGroup` → `RefreshDataCollectionGroups` → `CloseDialog`; Save button `enabled: "{= !%{/dataCollection/params/inputHasError} }"`; Next button → `NextDataCollectionGroup` only.

## 12. HTML/SVG status lamp (SAP Tips & Tricks)
HTML plugin (class *unverified*; configure once in designer) with *Sanitize Content* off and content
`<svg width="40" height="40"><circle cx="20" cy="20" r="16" fill="{=${/execution/operationActivity/lastSelected/statusComplete} ? 'green' : 'red'}"/></svg>`.

## 13. KPI tile with threshold colour (customer dashboard)
Value comes from a PP output variable; colour flips at thresholds. Paste as an `items` child of an HBox.
```json
{ "id": "OeeTile", "widget": "sap.m.VBox", "properties": { "alignItems": "Center", "justifyContent": "Center", "width": "12rem" },
  "aggregations": { "items": [
    { "id": "OeeIcon",  "widget": "sap.ui.core.Icon", "properties": { "src": "sap-icon://manufacturing", "size": "1.5rem", "color": "#1B7EC2" } },
    { "id": "OeeValue", "widget": "sap.m.Text", "properties": { "text": "{/_oeeOutput/outOEE} %", "fontSize": "2rem", "fontWeight": "bold",
        "fontColor": "{= ${/_oeeOutput/outOEE} < 50 ? '#BB0000' : (${/_oeeOutput/outOEE} < 70 ? '#E78C07' : '#2B7D2B')}" } },
    { "id": "OeeLabel", "widget": "sap.m.Label", "properties": { "text": "OEE", "design": "Bold" } } ] } }
```

## 14. Load data when a page opens (`pageEnter` → PP → output variable)
Put on the **page node** (sibling of `aggregations`), not on a widget. Texts bound to `{/_oeeOutput/...}` fill after the call.
```json
"events": { "pageEnter": [
  { "id": "Busy", "action": "sap.dm.dme.pod2.action.core.BusyIndicator", "properties": { "widgetId": "", "target": "page" } },
  { "id": "LoadKpis", "action": "sap.dm.dme.pod2.action.pp.ProductionProcess", "properties": {
      "productionProcess": { "id": "REPLACE_WITH_PP_ID_GET_KPIS", "name": "REPLACE_WITH_PP_NAME",
        "trigger": { "type": "HTTP", "protocol": "REST", "method": "POST", "endpoint": { "url": "REPLACE_WITH_TENANT/pe/api/v1/process/processDefinitions/start?key=REG_REPLACE_WITH_PP_KEY_GET_KPIS", "destinations": [], "path": "/pe/api/v1/process/processDefinitions/start?key=REG_REPLACE_WITH_PP_KEY_GET_KPIS" } },
        "responseDataType": { "type": "object", "properties": { "outOEE": { "type": "number", "format": "double" } } } },
      "inputParameters": [ { "parameter": "workCenter", "type": "string", "subType": null, "variable": null, "value": "{/execution/operationActivity/lastSelected/workCenter}" } ],
      "outputVariable": "_oeeOutput" } } ] }
```
A Refresh button re-runs the same PP action (same `outputVariable`) — texts update in place.

## 15. Sidebar selector: button writes a POD variable, others react (SetProperty)
One button per choice. Pressed one is `Emphasized`, the rest `Ghost`; detail-page buttons show only for the chosen value.
```json
{ "id": "NavBtnLine1", "widget": "sap.m.Button",
  "properties": { "text": "Line 1", "width": "100%", "height": "70px",
    "type": "{= ${/customdata/selectedWorkCenter} === 'LINE1' ? 'Emphasized' : 'Ghost'}" },
  "events": { "press": [
    { "id": "SetWC", "action": "sap.dm.dme.pod2.action.model.SetProperty", "properties": { "path": "/customdata/selectedWorkCenter", "value": "LINE1" } },
    { "id": "Go",    "action": "sap.dm.dme.pod2.action.page.NavigateToPage", "properties": { "page": "MainPage" } } ] } }
```
Elsewhere: `"visible": "{= %{/customdata/selectedWorkCenter} === 'LINE1'}"`. Note: `SetProperty` only changes the context variable; it does **not** change the work-list filter (customer export used a custom plugin action for that — out of scope).

## 16. Config-only status card (badge, progress bar, phase chip) with overridable colours
Verified in Run mode 2026-09 (ORDER-template POD, data from a custom plugin's context path). Colours: literal defaults inside every expression, optionally overridden by a `pageEnter` SetProperty palette on the page node. Replace `R`/`O` with your context roots.
```json
{ "id": "OT_Tile", "widget": "sap.m.VBox",
  "properties": { "width": "22rem", "gap": "0.5rem", "paddingBegin": "Medium", "paddingEnd": "Medium", "paddingTop": "Medium", "paddingBottom": "Medium",
    "backgroundColor": "{= (${/customer/orderTile/colors/cardBg} || '#FFFFFF') }",
    "visible": "{= !${R} || !!${O/order} }" },
  "aggregations": { "items": [
    { "id": "OT_OrderRow", "widget": "sap.m.HBox", "properties": { "alignItems": "Center", "gap": "0.5rem" }, "aggregations": { "items": [
      { "id": "OT_OrderNo", "widget": "sap.m.Title", "properties": { "text": "{O/order}", "titleStyle": "H4" } },
      { "id": "OT_Badge", "widget": "sap.m.HBox", "properties": { "paddingBegin": "Small", "paddingEnd": "Small", "alignItems": "Center", "height": "1.5rem",
          "backgroundColor": "{= %{O/executionStatus} === 'ACTIVE' ? (${/customer/orderTile/colors/activeBg} || '#D1E8FF') : ((%{O/executionStatus} === 'COMPLETED' || %{O/executionStatus} === 'CLOSED') ? (${/customer/orderTile/colors/doneBg} || '#E5F5E5') : (${/customer/orderTile/colors/otherBg} || '#EDEDED')) }" },
        "aggregations": { "items": [ { "id": "OT_BadgeText", "widget": "sap.m.Text", "properties": { "text": "{O/executionStatus}", "fontWeight": "bold", "fontSize": "0.75rem",
          "fontColor": "{= %{O/executionStatus} === 'ACTIVE' ? (${/customer/orderTile/colors/activeText} || '#0057D2') : '#525252' }" } } ] } } ] } },
    { "id": "OT_Progress", "widget": "sap.m.ProgressIndicator", "properties": { "showValue": true, "width": "100%",
        "percentValue": "{= %{O/quantityToBuild} > 0 ? Math.min(100, %{O/quantityGr} / %{O/quantityToBuild} * 100) : 0 }",
        "displayValue": "{= (${O/quantityGr} * 1 || 0) + ' / ' + (${O/quantityToBuild} * 1) + ' ' + ${O/uom} }",
        "state": "{= %{O/executionStatus} === 'ACTIVE' ? 'Information' : 'None' }" } },
    { "id": "OT_PhaseBox", "widget": "sap.m.VBox", "properties": { "visible": "{= !!%{R/operationActivity} }" }, "aggregations": { "items": [
      { "id": "OT_PhaseLbl", "widget": "sap.m.Label", "properties": { "text": "Active Phases", "design": "Bold" } },
      { "id": "OT_PhaseChip", "widget": "sap.m.Text", "properties": { "text": "{R/operationActivity}" } } ] } },
    { "id": "OT_SchedStart", "widget": "sap.dm.dme.pod2.widget.core.DateTimeText", "properties": { "date1": "{O/scheduledStart}", "displayFormat": "DateTime", "emptyIndicatorMode": "On" } } ] } }
```
Optional palette on the page node (overrides the literals when it runs): `"events": { "pageEnter": [ { "id": "OT_Color_cardBg", "action": "sap.dm.dme.pod2.action.model.SetProperty", "properties": { "path": "/customer/orderTile/colors/cardBg", "value": "#FFFFFF" } } ] }`.
Notes: `qty * 1` strips `"2500.000000"` to `2500`; keep `visible` true when the root object is absent (`!${R}`) or the designer canvas shows nothing; no border-radius exists, badges are square. Full generator: `customer-equipment-overview/tools/build-ordertile-config.js`.

## 17. Fixed-slot list from a context array + "+N" overflow (config-only, verified 2026-09-21)
There is no list templating: bind N fixed slots to `/root/<list>/<i>/…`, each slot root `visible: "{= !!%{/root/<list>/<i>/order} }"` so empty slots collapse. `%{/root/<list>/length}` is bindable (count in headings, overflow badge). Generate slots programmatically: deep-clone slot 0, replace `/<list>/0/` → `/<list>/<i>/` in every string value (incl. custom action props such as `orderSource`), re-id nodes `PREFIX_<i>_<origId>`.
```json
{ "id": "OV_Cur_MoreRow", "widget": "sap.m.HBox", "properties": { "justifyContent": "End", "width": "100%",
    "visible": "{= %{/customer/equipmentOverview/selectedEquipment/currentOrders/length} > 2 }" },
  "aggregations": { "items": [ { "id": "OV_Cur_MoreButton", "widget": "sap.m.Button",
    "properties": { "type": "Transparent", "text": "{= '+' + (%{/customer/equipmentOverview/selectedEquipment/currentOrders/length} - 2) }" },
    "events": { "press": [ { "id": "OV_Cur_ShowMore", "action": "sap.dm.dme.pod2.action.dialog.ShowDialog", "properties": { "dialog": "OV_Cur_MoreDialog" } } ] } } ] } }
```
Dialog: `sap.m.Dialog` title `{= ${i18nX>timeline.head.current} + ' (' + (%{…/currentOrders/length} || 0) + ')' }`, `contentWidth 36rem`, `contentHeight 40rem`, content = `ScrollContainer(vertical) → VBox → 10 slot clones`, buttons = Close → `CloseDialog`. Same recipe builds a full detail page (`sap.m.Page`, header cloned from the source page, `ScrollContainer` vertical+horizontal, 3 columns × 10 slots, entry via a title-row Button → `NavigateToPage`). Cap the producing widget's `max*` properties to the slot count so the badge/count never exceeds what the slots can show. Custom plugin actions on cloned cards (e.g. `OpenResourcePodAction {orderSource:"currentOrders/7"}`) resolve globally, so they work from dialogs and other pages. Prefer direct slot binding over `SetProperty` with an object value (unverified). Generator: `customer-equipment-overview` session 2026-09-21 (`/tmp/eo_detail_page.js`, not committed); leading POD `docs/pod-config/GLOBAL_RESOURCE_COCKPIT.json`.

## 18. Panel / KPI dashboard from PP outputs and POD context (generator, verified in preview 2026-10)
Don't hand-compose tiles. Write a spec, run `scripts/build-panel.js <export> <spec> [--preview]`; it patches a copy of the export, re-runs on the same prefix idempotently, and compares validator errors with the baseline.
Output filename gotcha (verified 2026-10): the generator writes `<POD_ID>.<prefix>.json` (double dot, e.g. `POD_SKILL_DEMO.oee.json`). The Manage PODs 2.0 Import / file-picker rejects filenames with extra dots — always hand over a clean-named copy `<POD_ID>_<PREFIX>.json` (single `.json`, underscore separator), content identical. Same applies to the patch-script path (workflow step 1 writes `<POD_ID>.<feature>.json`).
```json
{
  "prefix": "OEE",                                   // all new ids: OEE_… ; outputVariable defaults to "_oee"
  "target": { "tab": "OEE" },                        // tab text (i18n key or last key segment, case/space-insensitive) or id
                                                     // | { "page": "OrderDetails" } | { "dialog": "Id" } | { "node": "Id", "aggregation": "items" }
  "position": "end",                                 // or "start"; "replace": true empties the target first
  "title": "Line KPIs",                              // optional, left of the context strip
  "pp": { "name": "Create_Random_Indicators_OEE",    // omit "pp" for a context-only panel (no PP call, no Refresh)
          "inputs": [ { "parameter": "inPlant", "variable": "PLANT" },
                      { "parameter": "inResource", "value": "{/execution/operationActivity/lastSelected/resource}" } ] },
                                                     // optional "id"/"key"/"tenant" only if the user gave real ones (else placeholders)
  "context": [ { "label": "Order", "path": "/workList/lastSelected/order" },
               { "label": "SFC", "path": "/workList/lastSelected/sfc" },
               { "label": "Phase", "path": "/execution/operationActivity/lastSelected/operationActivity" },
               { "label": "Resource", "path": "/execution/operationActivity/lastSelected/resource" } ],
  "fields": [
    { "source": "pp:outOEE", "label": "OEE", "scale": "percent", "thresholds": [60, 85], "hero": true,
      "icon": "sap-icon://performance", "caption": "= Availability × Performance × Quality" },
    { "source": "pp:outAvailability", "label": "Availability", "scale": "percent", "thresholds": [60, 85], "icon": "sap-icon://time-entry-request" },
    { "source": "pp:outPerformance",  "label": "Performance",  "scale": "percent", "thresholds": [60, 85], "icon": "sap-icon://process" },
    { "source": "pp:outQuality",      "label": "Quality",      "scale": "percent", "thresholds": [60, 85], "icon": "sap-icon://quality-issue" }
  ]
}
```
Field keys: `source` `pp:<flat output>` or any `/context/path` · `type` number (default) | string | boolean · number: `scale` percent (0–100) | fraction (0–1, shown ×100), `unit` (default `%` when scaled), `decimals` (1), `thresholds [low, high]` on the display scale (red < low ≤ orange < high ≤ green), `lowerIsBetter`, `max` (bar for unscaled numbers), `bar:false` · boolean: `trueText`/`falseText`, `trueIsBad` · any: `icon`, `caption`, `hero` (one, large, left), `width`, `ppType` (`integer` to declare an Integer PP output). Literal text must not contain `{}`.
What it generates: panel `VBox` (bg `#F5F6F7`) → header `HBox` (title, context Label/Text pairs, Refresh `Button`) → body `HBox` (hero tile + wrapping `HBox` of tiles). Tile = white `VBox` → `HBox`[`Icon` color-expr, `Label` Bold] + `Text` value (`fontColor` expr, missing → `–`) + `ProgressIndicator` (`state` Error/Warning/Success) + caption. Load chain `BusyIndicator → ProductionProcess` (synchronous, `outputVariable`, `responseDataType` from the `pp:` fields, Double = `{type:number, format:double}`) runs on `tabEnter` (tab) / `pageEnter` (page), appended after existing actions, and on Refresh. Dialog/node targets have no verified enter event → Refresh only (tool warns).
Before running, ask only what the spec can't default: value scale per PP output (percent vs fraction) and PP input parameters. Thresholds default to the user's or 60/85.
