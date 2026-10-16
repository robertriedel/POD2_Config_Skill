# POD 2.0 Widget Reference

The `widget` string is the only thing that matters in the JSON. **Verified** = seen in a real POD export (`mined.json`) or in the designer palette export `templates/PALETTE.json` (every palette widget dropped once, BLANK template); JSON property keys are listed verbatim with one real example value. **Designer default** = what the designer writes into `properties` on drop; omitting a key still yields the plugin default (json-grammar.md), so copy defaults only to change them. **`unverified`** = present in the SAP catalog/help but not in any export — do NOT invent a class or keys; configure it once in the designer, copy the element to clipboard, and reuse that JSON. A `(likely, unverified)` class follows the observed namespace pattern (plain UI5 → `sap.m.<Control>`).

- Catalog IDs / slugs / display names: see `sap-catalog.md` (not duplicated here).
- Common table/list & appearance props (display→JSON key): `alternateRowColors`, `backgroundDesign` (Transparent/Translucent/Solid), `popinLayout` (Block/GridSmall/GridLarge), `sticky` (ColumnHeaders/HeaderToolbar/InfoToolbar/GroupHeaders), `visible`, `fontColor`, `fontSize`, `fontWeight`, `textAlign`, `width`, `height`, `growing`, `growingScrollToLoad` ("Scroll to Load Items"), `pageSize` ("Growing Threshold"), `importance` (column "Hidden in Pop-in": None/Low/Medium/High), `mode` (None/SingleSelect/SingleSelectLeft/SingleSelectMaster/MultiSelect/Delete), `multiSelectMode` (Default/ClearAll/SelectAll), `fixedLayout` ("Layout" Fixed/Auto/Strict), `autoPopinMode`, `editable`, `enabled`, `required`, `displayOnly`, `headerText`, `showNoData`, `wrappingType` (Normal/Hyphenated), `emptyIndicatorMode` (On/Off), `maxCharacters`, `overflowMode` (Popover/InPlace), `showValue`, `state` (None/Information/Success/Warning/Error).
- **Column object keys** (table widgets): `field`, `text`, `width`, `importance`, `hAlign`, `vAlign`, `sortable`, `headerText`, `id`.
- Structure: top-level `pages: []` and `dialogs: []`. Each node = `{id, widget, properties{}, events{}, aggregations{}}`. Aggregation names seen: `content, items, buttons, menuItems, contentAreas, customHeader, heading, headerActions, headerContent` (templates) + `sections, subSections, blocks, columns, header, menu` (customer exports) + `rootPaneContainer, panes` (ResponsiveSplitter) and `actions` (ObjectPageSubSection header strip) (palette export).

---

## Layout & containers

### Page — verified
Root of a page. Class: `sap.m.Page`
Props: `title, showHeader, showFooter, enableScrolling` · Designer default: `{showHeader:true, showFooter:false}` + empty `customHeader` Toolbar
Aggregations: `content, customHeader`
```json
{ "id": "MainPage", "widget": "sap.m.Page",
  "properties": { "showHeader": true, "showFooter": false },
  "aggregations": { "customHeader": [ /* Toolbar */ ], "content": [ /* widgets */ ] } }
```

### Dynamic Page Layout — verified
Class: `sap.f.DynamicPage`
Props: `headerPinnable`
Aggregations: `heading, headerContent, headerActions, content` · Designer default: `{headerPinnable:true}` and `heading: [ sap.m.Title id "<id>-title" ]`

### Toolbar / Spacer / Separator — verified
Class: `sap.m.Toolbar` · `sap.m.ToolbarSpacer` · `sap.m.ToolbarSeparator`
Toolbar props: `design` (Solid), `style` (Standard), `height`, `backgroundColor`; Aggregation: `content`. Spacer/Separator take no props (designer default `{}`).
```json
{ "id": "MainToolbar", "widget": "sap.m.Toolbar",
  "properties": { "design": "Solid", "height": "4.5rem", "backgroundColor": "rgb(53, 74, 95)" },
  "aggregations": { "content": [ { "id": "Sp", "widget": "sap.m.ToolbarSpacer" } ] } }
```

### Horizontal Box / Vertical Box — verified
Class: `sap.m.HBox` · `sap.m.VBox`
Props: `alignItems, alignContent, justifyContent, gap, rowGap, wrap, width, height, backgroundColor, backgroundDesign, fitContainer, displayInline, renderType, minHeight, paddingBegin, paddingTop, paddingBottom, paddingEnd, visible`
Aggregations: `items` · VBox layoutData: `growFactor` · Designer default: `{renderType:"Bare"}` · `backgroundColor` may be an expression (verified 2026-09: status badge = HBox with expression bg + Text with expression `fontColor`).
```json
{ "id": "Row", "widget": "sap.m.HBox",
  "properties": { "alignItems": "Center", "justifyContent": "Center", "gap": "0.25rem", "width": "100%" },
  "aggregations": { "items": [] } }
```

### Scroll Container — verified
Class: `sap.m.ScrollContainer`
Props: `horizontal, vertical, focusable, height` · Aggregation: `content` · Designer default: `{vertical:true, height:"100%"}`

### Splitter — verified
Class: `sap.ui.layout.Splitter`
Props: `orientation` (Horizontal/Vertical), `height` · Aggregation: `contentAreas` · child layoutData: `size` · Designer default: `{}`

### Icon Tab Bar / Icon Tab Filter — verified
Class: `sap.m.IconTabBar` · `sap.m.IconTabFilter`
Bar props: `expandable, headerMode` (Inline), `height`; Aggregation `items`; layoutData `size` · Designer default: `{headerMode:"Inline", expandable:false, height:"100%"}`
Filter props: `text, icon, iconColor` (Critical/…), `design` (Horizontal), `showAll`; event `tabEnter`; Aggregation `content` · Designer default: `{text:"Icon Tab Filter", icon:"sap-icon://folder-blank"}`
```json
{ "id": "Tabs", "widget": "sap.m.IconTabBar", "properties": { "headerMode": "Inline" },
  "aggregations": { "items": [ { "id": "T1", "widget": "sap.m.IconTabFilter",
    "properties": { "text": "{i18n>componentConsumption}", "icon": "sap-icon://measuring-point" },
    "aggregations": { "content": [] } } ] } }
```

### Panel — verified
Class: `sap.m.Panel` · Props: `headerText, width` · Aggregation: `content` · Designer default: `{headerText:"Panel"}`

### Dialog — verified
Class: `sap.m.Dialog` (define under top-level `dialogs: []`; open via ShowDialog `{dialog:"<id>"}`)
Props: `title, contentWidth, contentHeight, resizable, draggable, showHeader, showCloseButton, icon`
Aggregations: `buttons, content`
```json
{ "id": "DataCollectionDialog", "widget": "sap.m.Dialog",
  "properties": { "title": "{i18n>collectData}", "contentWidth": "1000px", "resizable": true },
  "aggregations": { "content": [], "buttons": [] } }
```

### Simple Form — verified (palette export)
Class: `sap.ui.layout.form.SimpleForm` · Props: `editable` · Aggregation: `content` (Label then its input, repeated) · Designer default: `{editable:true}` with one Label/Input pair
```json
{ "id": "SimpleForm1", "widget": "sap.ui.layout.form.SimpleForm", "properties": { "editable": true },
  "aggregations": { "content": [
    { "id": "Label2", "widget": "sap.m.Label", "properties": { "text": "Label", "showColon": true } },
    { "id": "Input2", "widget": "sap.m.Input" } ] } }
```

### Object Page Layout / Section / Subsection — verified (customer export, BLANK template)
Classes: `sap.uxap.ObjectPageLayout` (agg `sections`) → `sap.uxap.ObjectPageSection` (agg `subSections`) → `sap.uxap.ObjectPageSubSection` (agg `blocks` = body, any widgets; `actions` = header strip, designer-accepted).
Layout props: `headerText, showTitleInHeaderContent, showHeaderContent, upperCaseAnchorBar`. Section/SubSection props: `title, titleUppercase`.
Designer defaults: Layout `{headerText:"<id>", showTitleInHeaderContent:true, showHeaderContent:true, upperCaseAnchorBar:false}`; Section/SubSection `{title:"<id>", titleUppercase:false}`.
```json
{ "id": "Kpis", "widget": "sap.uxap.ObjectPageLayout", "properties": { "headerText": "OEE", "upperCaseAnchorBar": false },
  "aggregations": { "sections": [ { "id": "KpiSection", "widget": "sap.uxap.ObjectPageSection", "properties": { "title": "KPI Overview", "titleUppercase": false },
    "aggregations": { "subSections": [ { "id": "KpiSub", "widget": "sap.uxap.ObjectPageSubSection", "properties": { "title": "Key Performance Indicators" },
      "aggregations": { "blocks": [ { "id": "KpiRow", "widget": "sap.m.HBox", "properties": { "justifyContent": "SpaceAround" }, "aggregations": { "items": [] } } ] } } ] } } ] } }
```

### Table / Column (plain UI5) — verified (customer export), static only
Classes: `sap.m.Table` (props `headerText, mode, alternateRowColors`; agg `columns`) → `sap.m.Column` (props `hAlign`; agg `header` → one `sap.m.Label`). No `items` binding was present, so it renders headers with no rows; use the SAP table widgets for data or feed rows from a custom plugin.

### Responsive Splitter / Pane Container / Split Pane — verified (palette export)
Classes: `sap.ui.layout.ResponsiveSplitter` (agg `rootPaneContainer`, exactly one) → `sap.ui.layout.PaneContainer` (agg `panes`) → `sap.ui.layout.SplitPane`. Designer default: all `{}`, two empty SplitPanes. Content goes under each SplitPane's `content` (UI5 default aggregation; key *unverified* in JSON — fill one pane in the designer and copy).
```json
{ "id": "ResponsiveSplitter1", "widget": "sap.ui.layout.ResponsiveSplitter",
  "aggregations": { "rootPaneContainer": [ { "id": "PaneContainer1", "widget": "sap.ui.layout.PaneContainer",
    "aggregations": { "panes": [ { "id": "SplitPane1", "widget": "sap.ui.layout.SplitPane" },
                                 { "id": "SplitPane2", "widget": "sap.ui.layout.SplitPane" } ] } } ] } }
```

---

## Elements

### Button — verified
Class: `sap.m.Button`
Props: `text, icon, iconColor, type` (Default/Emphasized/…), `width, height, enabled, visible, tooltip, hotkey, backgroundColor, backgroundHoverColor, backgroundPressColor, borderColor, borderWidth, fontColor, activeIcon`
Events: `press` (action chain) · Designer default: `{text:"Button", type:"Ghost"}`
```json
{ "id": "StartButton", "widget": "sap.m.Button",
  "properties": { "text": "{i18n>start}", "icon": "sap-icon://begin", "type": "Emphasized" },
  "events": { "press": [ { "id": "StartAction", "action": "sap.dm.dme.pod2.action.sfc.Start" } ] } }
```

### Menu Button / Menu Item — verified
Class: `sap.m.MenuButton` (Aggregation `menuItems`) · `sap.m.MenuItem` (event `select`)
MenuButton props: `text, icon, iconColor, buttonMode` (Regular), `menuPosition` (BeginBottom), `type, height, backgroundColor, borderColor, borderWidth, fontColor`
MenuItem props: `text, enabled, icon`. Designer default: MenuButton `{text:"Menu Button"}` with two MenuItems `{text:"Menu Item"}` (ids `<id>-Item1`, `<id>-Item2`). A customer export also carried `aggregations.menu: [ { "widget": "sap.m.Menu", "aggregations": { "items": [MenuItems] } } ]` in parallel — redundant and it duplicates every MenuItem id (validator error); delete the `menu` block and keep `menuItems`.

### Label — verified
Class: `sap.m.Label` · Props: `text, fontSize, fontWeight, required, showColon, wrapping, design` (`Bold`) · Designer default: `{text:"Label", showColon:true}`

### Text — verified
Class: `sap.m.Text` · Props: `text, fontSize, fontWeight, fontFamily, height, wrapping, renderWhitespace, fontColor, backgroundColor` (hex/rgb/name or expression — KPI colouring, see binding-and-context.md). **Not `color`** — that key is silently ignored on Text (jsdoc `$CustomTextSettings`); `color` exists only on `sap.ui.core.Icon`.
```json
{ "id": "ResText", "widget": "sap.m.Text", "properties": { "text": "{/filter/resources/0/resource}", "fontWeight": "bold" } }
```

### Title — verified
Class: `sap.m.Title` · Props: `text, level` (Auto), `titleStyle` (H1–H6), `wrapping` · Designer default: `{text:"Title"}`

### Image — verified
Class: `sap.m.Image` · Props: `src, width, height` · Designer default: `{}`

### Object Status — verified
Class: `sap.m.ObjectStatus` · Props: `text, state` (bind to `…/statusSemantic`)
```json
{ "id": "OrderStatus", "widget": "sap.m.ObjectStatus",
  "properties": { "text": "{/_orderOut/orders/0/status}", "state": "{/_orderOut/orders/0/statusSemantic}" } }
```

### Progress Indicator — verified
Class: `sap.m.ProgressIndicator` · Props: `percentValue, displayValue, showValue`

### Date Time Text — verified
Class: `sap.dm.dme.pod2.widget.core.DateTimeText`
Props: `date1, date2, displayFormat` (Date/DateRange/…), `emptyIndicatorMode, fontSize` · Designer default: `{date1:null, date2:null, displayFormat:"Date", emptyIndicatorMode:"On"}`
```json
{ "id": "PlannedRange", "widget": "sap.dm.dme.pod2.widget.core.DateTimeText",
  "properties": { "date1": "{/workList/lastSelected/orderPlannedStartDate}",
    "date2": "{/workList/lastSelected/orderPlannedCompleteDate}", "displayFormat": "DateRange" } }
```

### Notification State Icon — verified
Class: `sap.dm.dme.pod2.widget.notification.NotificationStateIcon` · Props: `size`

### Icon — verified (customer export)
Class: `sap.ui.core.Icon` · Props: `src` (`sap-icon://manufacturing`), `size` (`1.5rem`), `color` (hex or expression); display also lists Width, Height. Designer default: `{src:"sap-icon://question-mark"}`
### Link — verified (palette export)
Class: `sap.m.Link` · Props: `text, target, rel` (+ display Href/URL, Enabled — JSON keys likely `href`, `enabled`, *unverified*) · Designer default: `{text:"Link", target:"_blank", rel:"noopener noreferrer"}`
### HTML — verified (palette export)
Class: `sap.ui.core.HTML` · Props: `content, sanitizeContent` (set `false` to draw inline SVG) · Designer default: `{content:"<h1>HTML</h1>", sanitizeContent:true}`
### IFrame — verified (palette export)
Class: `sap.dm.dme.pod2.widget.core.IFrame` · Designer default: `{}`; display props Source URL (dynamic with context, e.g. `…{/workList/lastSelected/material}`), Width, Height — JSON keys *unverified* (likely `src`/`url`, `width`, `height`): set the URL in the designer once and copy.
### Expandable Text — verified (palette export)
Class: `sap.m.ExpandableText` · Props: `text, maxCharacters, overflowMode` (Popover/InPlace) · Designer default: `{text:"Expandable Text", maxCharacters:100, overflowMode:"Popover"}`
### Message History — verified
Class: `sap.dm.dme.pod2.widget.core.MessageHistory` · Props: `text, type` (button-like; templates use `{}`) · Designer default: `{text:"Message History", type:"Ghost"}` · Placed in every page header next to Clock and Notification State Icon; shows the toast-message history (`/messageHistory`).

---

## Inputs
> Classes verified by the palette export; the designer drops them with `properties: {}`, so the JSON keys below are display names only. Each stores its value at a custom context path via the **"POD Variable Path"** designer property (JSON key `podVariablePath` *(inferred, still unproven)* — configure one input in the designer and copy it). Read it back with `{/custom/<path>}`.

### Input — verified · `sap.m.Input` · display: Input Type, Value, Editable, Maximum Length, POD Variable Path, event Change→Edit Actions.
### Mask Input — verified · `sap.m.MaskInput` · display: Mask, Placeholder Symbol, POD Variable Path.
### Text Area — verified · `sap.m.TextArea` · display: Value, Rows, Max Length, POD Variable Path.
### Select — verified · `sap.m.Select` · Designer default: `{forceSelection:false}` · display: Items (Key/Text), Selected Key, POD Variable Path, event Change.
### Check Box — verified · `sap.m.CheckBox` · display: Text, Selected (default), POD Variable Path.
### Switch — verified · `sap.m.Switch` · display: State (default), Custom Text On/Off, POD Variable Path.
### Radio Button Group / Radio Button — verified · `sap.m.RadioButtonGroup` (agg `buttons`, Designer default `{selectedIndex:-1}`) → `sap.m.RadioButton` (ids `<group>-button<n>`, props `selected, text`; standalone RadioButton default `{}`). Group holds POD Variable Path; child button holds Key.
```json
{ "id": "RadioButtonGroup1", "widget": "sap.m.RadioButtonGroup", "properties": { "selectedIndex": -1 },
  "aggregations": { "buttons": [
    { "id": "RadioButtonGroup1-button1", "widget": "sap.m.RadioButton", "properties": { "selected": false, "text": "Radio Button 1" } },
    { "id": "RadioButtonGroup1-button2", "widget": "sap.m.RadioButton", "properties": { "selected": false, "text": "Radio Button 2" } } ] } }
```

---

## Work list & filters

### Work List Filter Bar — verified
Class: `sap.dm.dme.pod2.widget.worklist.WorkListFilterBar`
Props: `useUrlParameters, sfcVisible, resourceVisible, resourceRequired, operationActivityVisible, operationActivityRequired, workCenterVisible, workCenterRequired`
```json
{ "id": "WorkListFilterBar", "widget": "sap.dm.dme.pod2.widget.worklist.WorkListFilterBar",
  "properties": { "useUrlParameters": true, "resourceVisible": true, "resourceRequired": true,
    "operationActivityVisible": true, "operationActivityRequired": true } }
```

### Work List Table — verified
Class: `sap.dm.dme.pod2.widget.worklist.WorkListTable`
Props: `mode, pageSize, growingScrollToLoad, alternateRowColors, autoPopinMode, popinLayout, sticky, vAlign, busyIndicatorDelay, defaultSorting, columns`
Events: `itemPress`
Columns: `sfc, operationActivity, order, materialDescription, orderPlannedStartDate, orderScheduledCompletionDate, sfcQuantity, sfcStatusCode`
```json
{ "id": "WorkListTable", "widget": "sap.dm.dme.pod2.widget.worklist.WorkListTable",
  "properties": { "mode": "SingleSelectMaster", "pageSize": 100, "growingScrollToLoad": true,
    "sticky": ["ColumnHeaders","HeaderToolbar"],
    "columns": [ { "field": "sfc", "importance": "High", "text": "{i18n>sfc}", "width": "150px", "sortable": true } ] },
  "events": { "itemPress": [] } }
```

### Order Filter Bar — verified
Class: `sap.dm.dme.pod2.widget.worklist.OrderFilterBar`
Props: `applyDefaultFiltersOnStartup, executionStatusesVisible, orderIdsVisible, orderSelectionRange, orderSelectionType, sfcStatusCodesVisible, useUrlParameters, workCentersDefault`

### Order List Table — verified
Class: `sap.dm.dme.pod2.widget.worklist.OrderListTable`
Props: `mode, pageSize, growingScrollToLoad, alternateRowColors, autoPopinMode, popinLayout, sticky, vAlign, busyIndicatorDelay, defaultSorting, printButtonVisible, columns`
Events: `itemPress`
Columns: `material, materialDescription, order, orderBatchNumber, orderExecutionStatus, orderPlannedDateRange, orderQuantityPlanned, sfc, sfcBatchNumber, sfcQuantity, sfcStatusDescription`

### Operation Activity Table — verified
Class: `sap.dm.dme.pod2.widget.worklist.OperationActivityTable`
Props: `mode, autoSelect, autoPopinMode, alternateRowColors, fixedLayout, headerText, popinLayout, columns` · layoutData: `minSize, size`
Columns: `operationActivityStepId, statusIcon, stepDescription`

### Operation/Phase Table (Operation/Phase List) — verified
Class: `sap.dm.dme.pod2.widget.worklist.PhaseTable`
Props: `mode, autoSelect, autoPopinMode, popinLayout, columns` · Events: `startPhase, completePhase` · Columns: `PhaseID, Status, Action`

### Operation Activity Status — verified
Class: `sap.dm.dme.pod2.widget.worklist.OperationActivityStatus` · Props: `bindPath, showIcon, showText`

### Resource Status Icon — verified
Class: `sap.dm.dme.pod2.widget.worklist.ResourceStatusIcon` · Props: `showIcon, showText`

### SFC Status Icon — verified
Class: `sap.dm.dme.pod2.widget.worklist.SFCStatusIcon` · Props: `bindPath, size, width`

### Order Schedule — verified
Class: `sap.dm.dme.pod2.widget.sfc.OrderSchedule` · Props: `{}` · Used inside `OrderScheduleDialog` (OPERATION_ACTIVITY template): `contentWidth 70rem / contentHeight 30rem`, opened via ShowDialog from a button with `enabled: "{= %{/workList/selected/length} === 1 }"`.
### Select Resource — verified · Select Operation Activity / Select Work Center — `(likely, unverified)`
Class: `sap.dm.dme.pod2.widget.filter.SelectResource` (props `{}`; BLANK-template cockpit uses it in a toolbar, selection lands in `/execution/operationActivity/lastSelected/resource`). Siblings likely `sap.dm.dme.pod2.widget.filter.SelectOperationActivity` / `…filter.SelectWorkCenter` — configure once in designer and copy.
### Resource Status Form — `unverified` · change resource status + reason code. Configure in designer, copy JSON.
### Downtime Filter Bar — `unverified` · pairs with Downtime widget; own DatePicker drives its queries. Configure in designer, copy JSON.

---

## SFC / Order header widgets

### SFC Execution Quantity — verified
Class: `sap.dm.dme.pod2.widget.sfc.SFCExecutionQuantity` · Props: `defaultValue, editable, textAlign, width`

### Order Header Text — verified
Class: `sap.dm.dme.pod2.widget.order.OrderHeaderText` · Props: `emptyIndicatorMode, maxCharacters, overflowMode`

### Material Image — verified
Class: `sap.dm.dme.pod2.widget.order.MaterialImage` · Props: `height` · layoutData: `alignSelf`

### SFC Quantity Progress — verified
Class: `sap.dm.dme.pod2.widget.order.SFCQuantityProgress` · Props: `{}` · Header widget in all three templates (under an `{i18n>sfcQuantity}` label). No bindings needed; reads the selected SFC.
### Goods Receipt Quantity Progress — verified
Class: `sap.dm.dme.pod2.widget.order.GoodsReceiptQuantityProgress` · Props: `displayOnly, showValue, state`

---

## Execution tabs

### Work Instruction Viewer — verified
Class: `sap.dm.dme.pod2.widget.workinstruction.WorkInstructionViewer` · Props: `autoSelectOperation, independentMode, noneNavigationIndependentMode`
### Work Instruction Table — verified
Class: `sap.dm.dme.pod2.widget.workinstruction.WorkInstructionTable` · Event `itemPress` · Columns: `currentVersion, description, operationActivityStepId, status, workInstructionVersion`
### Work Instruction Header Text — verified
Class: `sap.dm.dme.pod2.widget.workinstruction.WorkInstructionHeaderText` · Props: `text, maxCharacters, overflowMode, emptyIndicatorMode, wrappingType`

### Data Collection Group Table — verified
Class: `sap.dm.dme.pod2.widget.datacollection.DataCollectionGroupTable`
Props: `mode, multiSelectMode, headerText, alternateRowColors, autoPopinMode, fixedLayout, popinLayout, sticky, showNoData, columns` · Events: `itemPress, collect` · Columns: `description, version, progressIndicator, collectButton`
### Data Collection Parameter Table — verified
Class: `sap.dm.dme.pod2.widget.datacollection.DataCollectionParamTable`
Columns: `name, type, value, unitOfMeasure, minValue, maxValue, comment, attachments`

### Component Consumption List — verified
Class: `sap.dm.dme.pod2.sfccomponents.consumption.widget.ComponentConsumptionListWidget`
Props: `allowComponentRemoval, mode, alternateRowColors, fixedLayout, listType, defaultSorting, showNoData, columns` · Events: `consume, remove`
Columns: `sequence, component, componentVersion, version, plannedBatch, postedQuantity, consumeButton, removeButton`
### Component Consumption Form — verified
Class: `sap.dm.dme.pod2.sfccomponents.consumption.widget.ComponentConsumptionFormWidget` · Props: `{}` · Lives in `ComponentConsumptionDialog` (all templates); dialog buttons run `…consumption.action.Consume` (+`CloseDialog`), `Consume`+`NextComponent`, `NextComponent` (skip), `CloseDialog`. Opened by the list's `consume` event via `NavigateToWidget {widgetId:"ComponentConsumptionDialog"}`.

### Quality Inspection Characteristics Table — verified
Class: `sap.dm.dme.pod2.qualityinspection.widget.QualityInspectionCharacteristicTable` · Props: `mode, listType, dialogResizable, isShowOriginalValue, isShowSubmitButton`

### Activity Confirmation Table — verified
Class: `sap.dm.dme.pod2.widget.activityconfirmation.ActivityConfirmationTable`
Props: `mode, alternateRowColors, autoPopinMode, fixedLayout, listType, popinLayout, showNoData, columns` · Columns: `parameter, standardValue, reported, posting`

### Reported Quantity Table — verified
Class: `sap.dm.dme.pod2.widget.quantityconfirmation.ReportedQuantityTable`
Columns: `createdDate, postingDate, resource, yieldQuantity, scrapQuantity, scrapReasonCode, status, userId`
### Reported Quantity Summary — verified
Class: `sap.dm.dme.pod2.widget.quantityconfirmation.ReportedQuantitySummary` · Props: `headerText, busyIndicatorDelay, columns` · Event `reportQuantity` · Columns: `reportQuantity, totalYieldQuantity, totalScrapQuantity`

### Goods Receipt — verified
Class: `sap.dm.dme.pod2.widget.goodsreceipt.GoodsReceiptTableWidget`
Props: `mode, alternateRowColors, autoPopinMode, fixedLayout, popinLayout, sticky, vAlign, showNoData, busyIndicatorDelay, customField1, huPPName, huPPTriggerEndPoint, printLabelConfiguration, columns`
Columns: `sequence, materialNo, description, plannedBatch, storageLocation, postedQuantity, post, postings`

### Batch List — verified
Class: `sap.dm.dme.pod2.batch.widget.BatchList` · Props: `mode, listType, alternateRowColors, fixedLayout, growingScrollToLoad, pageSize, showNoData, columns` · Event `detailPress` · Columns: `batchNumber, material, productionDate, shelfLifeExpirationDate, detail`
### Update Batch Characteristics — verified
Class: `sap.dm.dme.pod2.batch.widget.UpdateBatchCharacteristics` · Props: `{}` · Lives in `BatchCharacteristicsDetailDialog` (WORK_CENTER/ORDER templates); Save button runs `sap.dm.dme.pod2.batch.action.UpdateBatchCharacteristic` then `CloseDialog`. Opened from BatchList `detailPress` via `NavigateToWidget`.

### Nonconformance Data Entry — verified
Class: `sap.dm.dme.pod2.nc.widget.NonconformanceDataEntry`
Props: `autoSplit, disableSfcStart, doDisposition, enableAttachments, incidentNumber, displayAddButton, displayAddDoneButton, displayDoneButton`
### Nonconformance Group List / Code List — verified · Activity Log / Data Tree — `unverified`
Class: `sap.dm.dme.pod2.nc.widget.NonconformanceGroupList`, `sap.dm.dme.pod2.nc.widget.NonconformanceCodeList` · Props: `{}` · Template layout: vertical `sap.ui.layout.Splitter` → top area = horizontal Splitter [GroupList `layoutData.size 40%`, CodeList], bottom = NonconformanceDataEntry. Activity Log / Data Tree (Review by Exception) not seen in exports — configure in designer, copy JSON.

### Downtime — verified
Class: `sap.dm.dme.pod2.widget.oee.Downtime`
Props: `growing, autoPopinMode, popinLayout, sticky, vAlign, busyIndicatorDelay, columns`
Columns: `startDate, endDate, duration, resource, reasonCodeDescription, timeElementType, markParentDown`

### Time Tracking Strip — `unverified` · Configure in designer, copy JSON.
### Signature / Signature Log — `unverified` · verification/approval step; log of prior e-signatures. Configure in designer, copy JSON.
### Clock — verified · Stopwatch — `unverified`
Class: `sap.dm.dme.pod2.widget.core.Clock` · Props: none (`{}` or omitted) · Header widget on every main/detail page. Stopwatch not seen in exports — configure in designer, copy JSON.
### Log Buyoff — `unverified` · Configure in designer, copy JSON.

### EBR (all) — `unverified`
EBR Table, EBR SFC Table, EBR Detail Header, EBR Document Table, EBR Document Upload, EBR Activity Log, EBR Filter Bar, EBR Signature — none seen in exports. Use the **Electronic Batch Record POD Template** as a starting point; configure in designer, copy JSON.

---
## Verified custom-plugin classes (customer namespaces, reference only)
customer namespaces such as `<customer>.custom.plugins.<plugin>.widget.<Widget>` or `customer.custom.extensions.<…>` (KPI plugins, Order List Table extensions with extra custom fields and status colours, Downtime/Data Collection extensions, consumption dialogs, quality sample views). These are bespoke plugin builds, not standard SAP — do not reuse the class unless that plugin is deployed.
