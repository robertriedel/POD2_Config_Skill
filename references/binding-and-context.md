# Bindings, POD variables, i18n

Property values are SAPUI5 binding strings evaluated against the **POD context** (one JSON model, paths start with `/`). Full context schema: pod-context.md.

## Binding forms

| Form | Example | Use |
|---|---|---|
| Literal | `"Consume Unplanned Components"` | custom labels (shown as-is, not translated) |
| i18n text | `"{i18n>sfc}"` | SAP-translated label; only keys that exist (list below) |
| Property binding | `"{/workList/lastSelected/order}"` | show a context value |
| Composite | `"{i18n>sfc}: {/workList/lastSelected/sfc}"` | label + value in one string |
| Expression | `"{= %{/workList/selected/length} === 1 }"` | booleans for `enabled`/`visible`, computed text/colour |

Expression binding rules (UI5 "Expression Binding"):
- Inside `{= … }` reference paths as `${/path}` or `%{/path}` (both seen; `%{}` skips type formatting and is what the designer inserts). Use `%{}` for comparisons, `${}` fine for text.
- JS subset: `=== !== < > && || ! ?: + - * /`, string literals in single quotes, `typeof`, `Array.prototype` basics, `Math`. No functions/lambdas.
- **String methods on bound values DO work** (verified Run mode, customer tenant, 2026-10-14): `${/path}.indexOf('x')`, two-arg `.indexOf('x', fromIndex)`, `.substring(a,b)`, `.trim()`. Lets you parse a packed string into fields entirely in config (e.g. split a `<text> ⟨by:…|ed:…@ISO⟩` comment into Comment/CreatedBy/ChangedBy/Timestamp across N Text widgets, each re-parsing the same path). `.substring` swaps args when start>end (JS semantics) — guard the index order. Format a timestamp with no Date object by positional-slicing the ISO string (`.substring(p+9,p+11)+'.'+…`).
- **`lastIndexOf` does NOT work** — DM's parser returns the *first* match (behaves like `indexOf`), silently producing wrong output. To reach the *last* occurrence, chain forward: `${p}.indexOf('@', ${p}.indexOf('@', start)+1)`. Only `indexOf`/`substring`/`trim` are verified; treat any other method as a bet to confirm on import.
- **`indexOf` returning -1 poisons the next search:** `${p}.indexOf('@', ${p}.indexOf('ed:')+3)` with no `@` after `ed:` returns -1, and a later `indexOf('@', -1+1)` restarts at 0 and matches an earlier field (real bug: an empty `ed:⟩` showed the creator's email domain as editor). Anchor on the full delimiters (`'⟨by:'`, `'|ed:'`, `'⟩'`, using the 2-arg form from the opening bracket), and gate every field on its hits lying inside the bracket: `a >= 0 && a > start && a < end ? ${p}.substring(…) : ''`. Wrap the path as `(${p} || '')` so a missing value renders empty instead of erroring. Before shipping, evaluate the expression as plain JS (`C` = sample string) against: full value, each optional part empty, plain text, `''`, `null`.
- Truthiness of possibly-missing variables: `{= !!%{/nomBOMAssyOutput/output} }` (works; `!== ''`/`!== null` alone do not, per community). `{= ${/x} !== undefined }` also works.
- Array access: `/selected/0/field`, `/selected/length`, `/list/length`.
- Colour/text from state: `{= ${/execution/operationActivity/lastSelected/statusComplete} ? 'green' : 'red' }`.
- Fallback: `{= ${/pod/description} || ${/pod/id} }`.
- Property that expects a boolean may hold literal `true`/`false` or an expression string.

Verified snippets from SAP templates / blogs:
```
enabled: "{= %{/workList/selected/length} === 1 }"                      (single-selection actions)
enabled: "{= !%{/dataCollection/params/inputHasError} }"               (DC Save button)
text:    "{= ${/pod/description} || ${/pod/id} }"                       (POD title)
text:    "{= ${/workList/lastSelected/sfcBatchNumber} ? ${i18n>change} : ${i18n>assign} }"
text:    "{= ${/execution/operationActivity/lastSelected/description} ? ${/execution/operationActivity/lastSelected/operationActivity} + ' - ' + ${/execution/operationActivity/lastSelected/description} : ${/execution/operationActivity/lastSelected/operationActivity} }"
visible: "{= %{/execution/operationActivity/selected/0/operationActivity} === 'INSPECTION' }"
```

**Value-based styling** (customer exports, designer-accepted) — any string/enum property can be an expression, not just `visible`/`enabled`:
```
fontColor: "{= ${/_oeeOutput/outOEE} < 50 ? '#BB0000' : (${/_oeeOutput/outOEE} < 70 ? '#E78C07' : '#2B7D2B')}"   (sap.m.Text threshold colour, nested ternary — Text uses `fontColor`, Icon uses `color`)
type:    "{= ${/customdata/selectedWorkCenter} === 'WC_0001' ? 'Emphasized' : 'Ghost'}"                           (Button style toggles with a POD variable)
visible: "{= %{/customdata/selectedWorkCenter} === 'WC_0001'}"                                                       (hide unless variable matches)
enabled: "{= !%{/dataCollection/params/inputHasError} }"                                                              (negation)
text:    "{/_oeeOutput/outOEE} %"                                                                                     (binding + literal suffix, no expression needed)
text:    "Availability: {/_oeeOutput/outAvailability}%  x  Performance: {/_oeeOutput/outPerformance}%"                (several bindings in one string)
```
Same idea for `icon` (`{= %{/x} ? 'sap-icon://accept' : 'sap-icon://decline' }`), `iconColor`, `backgroundColor`, `state` (None/Success/Warning/Error), `fontWeight`. Verified in Run mode (2026-09): expression-bound `backgroundColor` on HBox/VBox, `fontColor` on Text, `color` on Icon, `state`/`percentValue`/`displayValue` on ProgressIndicator, `visible` on VBox. Palette values set by `pageEnter` SetProperty may be absent at first render → always `${/palette/key} || '#literal'`. Hiding a whole block = put `visible` on the wrapping HBox/VBox, not on each child.

## Where the data comes from (roots, by template)

| Root | Filled by | WORK_CENTER / OPERATION_ACTIVITY | ORDER |
|---|---|---|---|
| `/pod/{id,description,dirty}` | framework | yes | yes |
| `/user/{id,language}`, `/plant/{plant,timeZone,industryType,…}` | framework | yes | yes |
| `/filter/{workCenters[],resources[],materials[]}` | WorkListFilterBar / OrderFilterBar | `resources[0].resource` = selected resource | workCenters list; resources usually `[]` |
| `/workList/{list[],selected[],lastSelected,count,type,sorting}` | WorkListTable / OrderListTable | rows = SFC@operation | rows = order/SFC (`type: ProcessOrder`) |
| `/execution/operationActivity/{list[],selected[],lastSelected}` | OperationActivityTable / PhaseTable (`autoSelect`) | after opening SFC details | phases of the order |
| `/workInstruction/{list[],selected}` | WorkInstructionTable | yes | yes |
| `/dataCollection/{groups.list[],params}` | DC tables; `params.inputHasError` | yes | yes |
| `/componentConsumption/{headerMaterial,list,form}` | Component Consumption widgets | yes | yes |
| `/batch`, `/batchCharacteristics` | Batch widgets | yes | yes |
| `/quantityConfirmation`, `/activityConfirmation.summaries.list[]` | Quantity/Activity confirmation | — | yes |
| `/qualityInspection.{inspectionPointLot,inspectionCharacteristics[]}`, `/selectedCharacteristics`, `/characteristicsResult` | Quality Inspection table | yes | yes |
| `/messageHistory[]` | MessageHistory | yes | yes |
| `/<outputVariable>/…` | Production Process action (`outputVariable`) | any | any |
| `/custom/<name>` (any path you choose) | Input/Select/CheckBox/Switch "POD Variable Path" | any | any |

Most-used paths in SAP templates (counts across 5 exports): `/workList/lastSelected/{sfc,order,material,materialVersion,materialDescription,workCenter,sfcBatchNumber,orderBatchNumber,orderPlannedStartDate,orderPlannedCompleteDate,sfcStatusCode}`, `/execution/operationActivity/lastSelected/{operationActivity,description,resource,workCenter,scheduleStartDate,scheduleEndDate}`, `/execution/operationActivity/selected/0`, `/execution/operationActivity/list/length`, `/workList/selected/length`, `/filter/resources/0/resource`, `/workInstruction/list/length`, `/workInstruction/selected/{workInstruction,version}`, `/dataCollection/groups/list/length`, `/dataCollection/params/inputHasError`, `/pod/{id,description}`.

## Custom POD variables

1. **From a Production Process**: action property `outputVariable: "myVar"` stores the PP output object at `/myVar`. Bind `{/myVar/outField}`. Only works when Call Type is synchronous; a later action in the same chain can already read it. Variable names may be reused by several PPs if the response shape is identical.
2. **From input plugins**: Input, Mask Input, Text Area, Select, Check Box, Switch, Radio Button Group expose a *POD Variable Path* property (designer name). Set e.g. `/nomBOMAssy/input/material`; the entered value lives there and can be mapped into a PP `inputParameters[].value` as `"{/nomBOMAssy/input/material}"`. JSON key of that property *(unverified; copy from designer once)*.
3. **From an action** — verified in a customer export: `sap.dm.dme.pod2.action.model.SetProperty` with `{ "path": "/customdata/selectedWorkCenter", "value": "WC_0001" }` writes a POD variable when a button is pressed (no input plugin needed). Other widgets react through `visible`/`type`/`text` expressions on that path. Not in the SAP catalog; see actions.md.
4. Blog convention: group dialog inputs under one root (`/nomBOMAssy/input/*`) and store the PP output under a sibling (`/nomBOMAssyOutput`). Customer exports use `/customdata/*` for button-set variables and `_oeeOutput`-style names for PP outputs (leading underscore is just a convention).

## Production Process input mapping

`inputParameters[]` entry forms (both verified):
```json
{ "parameter": "inResource", "type": "string", "subType": null, "variable": null, "value": "{/execution/operationActivity/lastSelected/resource}" }
{ "parameter": "inPlant",    "type": "string", "subType": null, "valueType": "variable", "value": "PLANT" }
```
Designer value types: **Constant** (literal), **Variable** (dropdown: Material, Material Version, Operation, Order, Plant, Quantity, Resource, Routing, SFC, Step ID, User ID, Work Center — semantics in actions.md), **Expression** (any binding string). For string-array parameters the Variable type sends *all* selected SFCs/orders/operations; for scalars only the most recent selection.

## i18n

Bundles: `{i18n>key}` (POD framework + templates), `{i18n<Component>>key}` for a custom plugin's own bundle (component name from its `plugin.json`, keys from `i18n/i18n.properties`; e.g. `{i18nEquipmentOverview>timeline.overview}`), `{i18n-component>…}` (component consumption), `{i18n-batch>…}` (batch), `{i18n-goodsReceipt>…}` (goods receipt). Keys verified in exports:

`sfc, order, material, materialDescription, materialVersion?, status, workCenter, resource, operationActivity, batch, quantity, sfcQuantity, sfcQty, goodsReceipt, workInstruction, workInstructions, dataCollection, dataCollectionGroups, dataCollectionParameters, componentConsumption, component, version, description, currentVersion, unitOfMeasure, type, collectData, consume, consumeAndNext, consumeComponent, skip, next, save, close, cancel, ok, back, create, change, assign, start, signoff, complete, nonconformance, orderSchedule, orderQuantity, orderStatus, sfcStatus, sfcDefaultBatch, plannedDate, plannedDateRange, headerInstructions, quantityConfirmation, batchHandling, updateBatchCharacteristics, batchCharacteristicsTitle, orderPlannedStartDate, orderPlannedCompletionDate`

Template/plugin-scoped keys: `template.button.{actions,sfcDetails,clockIn,clockOut}`, `template.label.{resourceInformation,quantityToExecute}`, `template.label.phaseDetails.{phaseId,phaseDescription,workCenter,resource,scheduledStartDate,scheduledEndDate,status}`, `template.tab.{qualityInspection,activityConfirmation,phaseDetails}`, `template.title.orderScheduleInformation`, `WorkInstructionTableWidget.{headerText,column.workInstructionWithVersion,column.operationActivityWithStep}`, `DataCollectionGroupTableWidget.column.{groupAndVersion,parameters}`, `DataCollectionParamTableWidget.column.{parameterName,parameterValue,minValue,maxValue,comment,attachments}`, `OperationActivityTableWidget.{header,column.step}`, `OrderListTableWidget.column.sfcDefaultBatch`, `PhaseTableWidget.column.{phaseId,phaseStatus,phaseAction}`, `ReportedQuantitySummaryWidget.table.{title,column.totalYield,column.totalScrap,column.reportQuantityButton}`, `ReportedQuantityTableWidget.table.column.{resource,yield,scrap,reasonCode,postedBy,postingDate,createdOn,status}`, `ActivityConfirmationTableWidget.columns.{parameter,standardValue,reported,posting}`, `RaiseAlertAction.menuItem`, `RelabelAction.ui.menuButton.name`, `SplitAction.ui.menuButton.name`, `SerializeAction.ui.menuButton.name`, `UpdateAlternateResourceAction.ui.buttons.changeResource`; `i18n-component>consumption.ConsumptionList.column.{sequence,plannedBatch,postedQuantity}`; `i18n-batch>BatchListWidget.columns.{batchNumber,material,productionDate,shelfLifeExpirationDate,detailLabel}`; `i18n-goodsReceipt>GoodsReceiptGroupTableWidget.columns.{sequence,materialNumber,description,plannedBatch,storageLocation,postedQuantity,postButtonLabel,postingsButtonLabel}`.

Rule: use an i18n key only if it is in this list (or you saw it in the user's export); otherwise write the literal text. The designer's *Insert Text* dialog lists more keys; if the user needs a specific translated label, tell them to pick it there and paste back.

## URL parameters

Filter bars with `useUrlParameters: true` read initial filter values from the POD URL. Cross-POD links (OpenURL/IFrame) use the launchpad hash, e.g. `/cp.portal/site#DMEOrderPOD-Display?POD_ID=<POD>&/DETAILS?=&ORDERSELECTION={/…/order}` (customer example) or `…#ManageOrders-Display?…{/workList/lastSelected/material}` (SAP blog). Parameter names beyond `POD_ID` are tenant/app specific — copy from a working URL.
