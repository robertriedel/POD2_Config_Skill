# POD 2.0 Action Reference

Actions live under `events.<event>` (e.g. a Button's `press`) as an **ordered array**; each entry is `{ "id", "action", "properties"? }`. **Verified** = class seen in a real export (`mined.json`). **`unverified`** = in the catalog/help but not in any export — do NOT invent a class; configure it once in the designer, copy the element to clipboard, and reuse that JSON. Catalog IDs/slugs: see `sap-catalog.md`.

## Action-chain semantics
- Multiple actions on one event run **in configured sequence** (reorderable, deletable, individually disable-able via an Enable toggle — JSON key `enabled:false` *(unverified)*).
- **If one action fails, the subsequent actions are NOT triggered** — the chain stops.
- **Confirm** shows a dialog and is placed *before* the actions it guards; if the user cancels, every action after it is **skipped**.
- **Busy Indicator** goes *before* a long-running action to block double-presses; pair with something that clears it (chain end / dialog close).
- **CloseDialog** goes last in a dialog's confirm chain.
- **Production Process** output can only be stored (`outputVariable`) when the Call Type is **Synchronous**.
- Most SFC/operation/time actions take **no properties** — they act on the current POD execution context (selected SFC, operation activity, resource) set by the work list / filter bar.

Example guarded chain:
```json
"press": [
  { "id": "Busy",  "action": "sap.dm.dme.pod2.action.core.BusyIndicator" },
  { "id": "Ask",   "action": "sap.dm.dme.pod2.action.core.Confirm", "properties": { "title": "Complete", "message": "Complete SFC {/workList/lastSelected/sfc}?", "confirmButton": "YES", "cancelButton": "NO" } },
  { "id": "Done",  "action": "sap.dm.dme.pod2.action.sfc.Complete" },
  { "id": "Close", "action": "sap.dm.dme.pod2.action.dialog.CloseDialog" }
]
```

---

## Page events
- `pages[].events.pageEnter` — verified in a customer export: chain runs when the page becomes visible. Seen: `BusyIndicator` → `ProductionProcess` (`inputParameters: []`, `outputVariable: "_oeeOutput"`) so KPI texts bound to `{/_oeeOutput/...}` are filled on open. Other page/dialog event names *unverified* (SAP mentions dialog Open/Close).

## Navigation & dialogs
- **Navigate To Page** — verified · `sap.dm.dme.pod2.action.page.NavigateToPage` · props `{ "page": "SFCDetails" }`
- **Navigate Back** — verified · `sap.dm.dme.pod2.action.page.NavigateBack` · no props
- **Navigate To Plugin/Widget** — verified · `sap.dm.dme.pod2.action.page.NavigateToWidget` · props `{ "widgetId": "BatchCharacteristicsDetailDialog" }`
- **Show Dialog** — verified · `sap.dm.dme.pod2.action.dialog.ShowDialog` · props `{ "dialog": "OrderScheduleDialog" }` (id of an entry in top-level `dialogs: []`)
- **Close Dialog** — verified · `sap.dm.dme.pod2.action.dialog.CloseDialog` · no props (closes current dialog)

## Core UX
- **Open URL** — verified · `sap.dm.dme.pod2.action.core.OpenURL` · props `{ "url": "https://…" }` (opens new tab)
- **Confirm** — verified · `sap.dm.dme.pod2.action.core.Confirm` · props `{ "title": "Create samples", "message": "Create the samples for order {/workList/lastSelected/order}?", "confirmButton": "YES", "cancelButton": "NO" }` (message may embed context bindings). Cancel skips every following action in the chain.
- **Busy Indicator** — verified · `sap.dm.dme.pod2.action.core.BusyIndicator` · props `{ "widgetId": "", "target": "page" }` (`target`: `page` | `dialog` | `widget` — `widget` with empty `widgetId` also seen; set `widgetId` to scope to one control).
- **Set Property (POD variable)** — verified in a customer export (2026-09), **not in the SAP catalog** · `sap.dm.dme.pod2.action.model.SetProperty` · props `{ "path": "/customdata/selectedWorkCenter", "value": "WC_0001" }`. Writes any path of the POD context; use it to drive `visible`/`type`/`text` expressions elsewhere (sidebar selection, mode toggles). `value` was a literal string in every occurrence; a binding as value is *unverified*. Place before a long-running action; customer exports have no explicit "off" entry. On `pageEnter` (designer-accepted, 2026-09) do not rely on the value being present at first render — bindings that read it need a literal fallback (`|| '#FFF'`).
- **Message Box** — `(likely, unverified)` `sap.dm.dme.pod2.action.core.MessageBox` · display: Message (may embed POD Context vars). Configure in designer, copy JSON.
- **Focus Plugin** — `(likely, unverified)` `sap.dm.dme.pod2.action.core.FocusPlugin` · display: target element (for scanner/forms). Configure in designer, copy JSON.
- **Scan Data** — `unverified` · display: Scan Option (single/multiple barcodes), Data Scanning Configuration. Prereq: a data-scanning configuration exists. Configure in designer, copy JSON.
- **Change Language** — `unverified` · no config beyond assigning to an event. Configure in designer, copy JSON.
- **Logout** — `unverified` · logs current user out. Configure in designer, copy JSON.

## SFC execution
All verified, all no-props (act on the selected SFC / current operation activity):
- **Start SFC** — `sap.dm.dme.pod2.action.sfc.Start`
- **Complete SFC** — `sap.dm.dme.pod2.action.sfc.Complete`
- **Sign Off SFC** — `sap.dm.dme.pod2.action.sfc.Signoff`
- **Serialize** — `sap.dm.dme.pod2.action.sfc.Serialize`
- **Split** — `sap.dm.dme.pod2.action.sfc.Split`
- **Relabel** — `sap.dm.dme.pod2.action.sfc.Relabel`
- **Clear SFC Execution Quantity** — `sap.dm.dme.pod2.action.sfc.ClearSFCExecutionQuantity`
- **Update SFC Default Batch** — `sap.dm.dme.pod2.action.sfc.UpdateSfcDefaultBatch`
- **Clear Work List Selection** — `sap.dm.dme.pod2.action.worklist.ClearWorkListSelection`
- **Merge** — `unverified` (likely `sap.dm.dme.pod2.action.sfc.Merge`) · Configure in designer, copy JSON.

## Operation / Phase
Verified, no props:
- **Start Operation/Phase** — `sap.dm.dme.pod2.action.phase.StartPhase`
- **Complete Operation/Phase** — `sap.dm.dme.pod2.action.phase.CompletePhase` · optional prop `{ "allowConfirmation": true }`

## Data collection
Verified:
- **Log Data Collection Group** — `sap.dm.dme.pod2.action.datacollection.LogDataCollectionGroup`
- **Next Data Collection Group** — `sap.dm.dme.pod2.action.datacollection.NextDataCollectionGroup`
- **Refresh Data Collection Groups** — `sap.dm.dme.pod2.action.datacollection.RefreshDataCollectionGroups`

## Component consumption
Verified, no props (act on selected component in the consumption list):
- **Consume Component** — `sap.dm.dme.pod2.sfccomponents.consumption.action.Consume`
- **Remove Component** — `sap.dm.dme.pod2.sfccomponents.consumption.action.ComponentConsumptionRemoval`
- **Next Component** — `sap.dm.dme.pod2.sfccomponents.consumption.action.NextComponent`

## Batch / Goods Receipt
- **Create Batch** — verified · `sap.dm.dme.pod2.action.batch.CreateBatch`
- **Update Batch Characteristic Value** — verified · `sap.dm.dme.pod2.batch.action.UpdateBatchCharacteristic`
- Goods receipt posting is driven by the **Goods Receipt** widget's `post` column, not a standalone verified action.

## Quantity confirmation
- **Report Quantity** — verified · `sap.dm.dme.pod2.action.quantityconfirmation.ReportQuantity`

## Order
- **Update Alternate Resource** — verified · `sap.dm.dme.pod2.action.order.UpdateAlternateResourceAction`

## Time tracking & labor
Verified:
- **Clock In** — `sap.dm.dme.pod2.timetracking.action.ClockIn` · props `{ "confirm": true, "addComment": true, "userIdOption": "Default" }`
- **Clock Out** — `sap.dm.dme.pod2.timetracking.action.ClockOut` · same props
`unverified` (configure in designer, copy JSON — likely `sap.dm.dme.pod2.timetracking.action.<Name>`): **Labor On / Labor Off, Indirect Labor On / Off, Production Time On / Off, Resource Usage On / Off, Change Resource Status**.

## Alerts
- **Raise Alert** — verified · `sap.dm.dme.pod2.action.alert.RaiseAlert`

## Quality / NC / EBR
`unverified` — none seen in exports. Configure in designer, copy JSON:
- **Log Buyoff** actions, **Submit Electronic Signature**, **EBR Document Upload**, **EBR Signature**, and NC disposition actions. NC logging is mostly driven by the Nonconformance Data Entry widget.

## Refresh actions
Verified: `RefreshDataCollectionGroups` (above).
`unverified` (configure in designer, copy JSON): **Refresh Work List, Refresh Operation Activities, Refresh Resources**.

---

## Production Process — verified
Class: `sap.dm.dme.pod2.action.pp.ProductionProcess`. Triggers a PP (routing/rules) synchronously or asynchronously and (sync only) stores the response into `outputVariable`, readable elsewhere as `{/<var>/…}`.

Verified property shape (from a resource cockpit POD / ORDER exports):
```json
{
  "id": "FetchInitContext",
  "action": "sap.dm.dme.pod2.action.pp.ProductionProcess",
  "properties": {
    "outputVariable": "_ctx",
    "productionProcess": {
      "id": "REPLACE_WITH_PP_ID_INIT_CONTEXT",
      "name": "P_EQ_INIT_CONTEXT",
      "trigger": {
        "type": "HTTP", "protocol": "REST", "method": "POST",
        "endpoint": {
          "url": "REPLACE_WITH_TENANT/pe/api/v1/process/processDefinitions/start?key=REG_REPLACE_WITH_PP_KEY_INIT_CONTEXT",
          "destinations": [],
          "path": "/pe/api/v1/process/processDefinitions/start?key=REG_REPLACE_WITH_PP_KEY_INIT_CONTEXT"
        }
      },
      "responseDataType": {
        "type": "object",
        "properties": { "outWorkCenter": { "type": "string" }, "outShift": { "type": "string" } }
      }
    },
    "inputParameters": [
      { "parameter": "inResource", "type": "string", "subType": null, "variable": null, "value": "{/execution/operationActivity/lastSelected/resource}" },
      { "parameter": "inPlant", "type": "string", "subType": null, "valueType": "variable", "value": "PLANT" }
    ]
  }
}
```

- **Two input-value mechanisms**: (a) **expression/binding** — `"value": "{/binding/path}"` with `variable:null, subType:null`; (b) **context variable** — `"valueType": "variable", "value": "PLANT"` (value = a variable name from the table below).
- `responseDataType.properties` can nest `{ "type":"array", "items": { "type":"object", "properties": {…} } }` (see `orders[]` in ORDER_POD).
- **Placeholder convention** (fill at deploy): PP definition id → `REPLACE_WITH_PP_ID_<NAME>`; PP key inside `url`/`path` → `REG_REPLACE_WITH_PP_KEY_<NAME>`. Keep `<NAME>` consistent between id and key.
- **Store Output** requires **Synchronous** Call Type. You may reuse an `outputVariable` name across PPs only if they return the same shape (the system assumes the first format).

### Input Parameter Variables (Value Type = Variable)
| Variable | Sends to the PP |
|---|---|
| Material | Material of the most recently selected work-list / order-list item |
| Material Version | Material version of that item |
| Operation | Selected operation-activity IDs (array → all; scalar → most recent); falls back to filter-bar / filter values |
| Order | Selected order IDs (array → all; scalar → most recent) |
| Plant | The plant ID |
| Quantity | The execution quantity entered by the user |
| Resource | Resource of the selected phase, else the selected resource filter value |
| Routing | Routing of the currently selected item |
| SFC | Selected SFCs (array → all; scalar → most recent) |
| Step ID | Step ID of the selected operation activity |
| User ID | The logged-on user |
| Work Center | The selected / context work center |

Trigger a PP via `ApiClient.internal.processengine.start` from plugin code; from POD config use this action (do not hardcode a `dmi/pe` endpoint by hand — use the placeholder shape above).
