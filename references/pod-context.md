# POD context schema

The runtime JSON model behind every `{/…}` binding. Captured from a running **Order POD** (ORDER template, process order, plant 1710) on 2026-09-14; Work Center / Operation Activity specifics are inferred from template bindings and marked *(inferred)*. Keys are exact; values illustrative. How to get your own: there is no built-in viewer known; dump it from a custom plugin (`PodContext` model `getData()`) or return it via a Production Process. Ask the user for a dump when a binding target is uncertain.

## Top-level roots

`workList, user, plant, messageHistory, batch, batchCharacteristics, componentConsumption, dataCollection, pod, filter, workInstruction, execution, activityConfirmation, inspectionCharacteristic, quantityConfirmation, qualityInspection, reportButtonEnabled, selectedCharacteristics, characteristicsResult, characteristics` plus any `outputVariable` roots created by Production Process actions and any `POD Variable Path` roots (`/custom/…`).

## `/pod`, `/user`, `/plant`
```
pod:   { id: "MY_POD", description: "…", dirty: false }
user:  { id: "<email>", language: "en" }
plant: { plant: "1710", description, timeZone: "Europe/Berlin", erpTimeZone, isLocal, integrationMode: "S4HANA_OP_W_CPI",
         erpLanguage: "E", erpDestination, meSystem: "DME", industryType: "PROCESS"|"DISCRETE", materialUpversion: false, … }
```

## `/filter`
```
filter: { workCenters: [ { plant, workCenter, description, category: "NONE", status: "ENABLED", maxPeople, minPeople, isErp, createdAtDate, modifiedAtDate } ],
          resources:   [ { plant, resource, description?, … } ],   // WC/OA PODs: resources[0].resource is the selected resource (inferred)
          materials:   [] }
```

## `/workList`
```
workList: { count, loading, pageSize: 100, type: "ProcessOrder"|…, sorting: [ { sortBy, descending } ],
            list: [ <row> ], selected: [ <row> ], lastSelected: <row> }
row (ORDER template): {
  sfc, material, materialDescription, materialVersion, routing, routingVersion, routingType: "I",
  order, orderBatchNumber, sfcBatchNumber, sfcStatusCode: "403", sfcStatusDescription: "Active", sfcQuantity,
  orderPlannedStartDate, orderScheduledStartDate, orderPlannedCompleteDate,
  orderExecutionStatus: "ACTIVE"|"NOT_IN_EXECUTION"|…, orderReleaseStatus: "RELEASED",
  orderQuantityPlanned, orderQuantityPlannedInProductionUom, orderQuantityCompleted, orderQuantityCompletedInProductionUom,
  sfcQuantityInProductionUom, sfcQuantityCompleted, sfcQuantityCompletedInProductionUom,
  baseCommercialUom: "KG", productionCommercialUom, erpAutoGRStatus: false, coAndByProductsIndicator, customFields: {},
  bom, bomType: "H", bomVersion }
```
WORK_CENTER / OPERATION_ACTIVITY rows additionally expose `operationActivity`, `workCenter`, `orderScheduledCompletionDate` (used as table columns) *(inferred from WorkListTable columns and bindings)*.
SFC status codes: 401 New, 402 In Queue, 403 Active, 404 Hold, 405 Completed (standard DM codes; 403/405 verified in dump).

## `/execution/operationActivity`
```
execution.operationActivity: { loading, list: [ <op> ], selected: [ <op> ], lastSelected: <op> }
op: { operationActivity: "2001391-0-0310", operationActivityGroup: "2001391-0-0300", stepId: "0310", description,
      workCenter, resource, quantity, quantityComplete, quantityInQueue, quantityInWork,
      scheduleStartDate, scheduleEndDate, actualStartDate, actualEndDate, userAuthorizedForWorkCenter,
      statusNew, statusBypassed, statusInQueue, statusInQueueReject, statusInQueueRework,
      statusInWork, statusInWorkReject, statusInWorkRework,
      statusComplete, statusCompletePending, statusCompletePendingRework, statusCompletePendingReject, statusEmpty }
```
The boolean `status*` flags are the cheapest way to drive `visible`/`enabled`/colours: e.g. `{= ${/execution/operationActivity/lastSelected/statusInWork} }`.

## `/workInstruction`
```
workInstruction: { loading, list: [ { id, workInstruction, description, version, currentVersion, status: "RELEASABLE", sequence,
                                       operationActivity, stepId, url, instructionData, types: [], workInstructionElements: [] } ],
                   selected: <item> }
```

## `/dataCollection`
```
dataCollection: { groups: { loading, list: [ { plant, group, description, version, status, current,
                     parameters: [ { name, description, sequence, prompt, status, type: "BOOLEAN"|"NUMBER"|"TEXT"|…, unitOfMeasure,
                                     requiredDataEntries, trueValueName, falseValueName, overrideMinMax, autoLogNonConformance } ],
                     allDataCollected, hasDataCollected, timesProcessed, measuredCount, allowMultipleCollection, passFailGroup,
                     sfc, order, resource, workCenter, operationActivity, operationActivityVersion, stepId, routing, routingVersion } ] },
                  params: { inputHasError?: boolean, … } }     // params filled while a DC dialog is open
```

## `/componentConsumption`
```
componentConsumption: { headerMaterial: { material, materialVersion, isAutocompleteAndConfirmed },
                        list: { showRemoveComponentButton, items: [], count, loading, selectedItems: [], selectedItemIndex: -1 },
                        form: {} }
```

## `/batch`, `/batchCharacteristics`
```
batch: { list: [], loading, selected: null }
batchCharacteristics: { payload: null, details: [], validationResult: null }
```

## `/quantityConfirmation`, `/activityConfirmation`
```
quantityConfirmation: { loading, count, list: [] }
activityConfirmation: { summaries: { list: [ { activityId: "SAPC04", activityText, sequence, actualQuantity,
                        actualQuantityUom: { uom, internalUom, shortText, longText, isPrimary }, targetQuantity, targetQuantityUom } ] } }
```

## `/qualityInspection` and friends
```
inspectionCharacteristic: { authorization: true }
reportButtonEnabled: true
qualityInspection: {
  inspectionPointLot: { id, ref: "ShopOrderBO:1710,2001391", plant, shopOrder, releaseStatus, executionStatus, orderCategory: "PROCESS_ORDER",
      shopOrderType: { orderType, description, … }, erpOrder, erpUnitOfMeasure, productionUnitOfMeasure,
      routing: { routing, routingType: "SHOPORDER_SPECIFIC_RECIPE", version }, routingGroup, groupCounter,
      material: { material, version }, bom: { bom, version, bomType }, erpBomId, bomUsage, alternativeBomId,
      buildQuantity, orderedQuantity, releasedQuantity, goodsReceiptQuantity, doneQuantity, scrappedQuantity, productionQuantity,
      toleranceUnder, toleranceOver, overDeliveryIsAllowed, minDeliveryQuantity, maxDeliveryQuantity,
      releasedDate, plannedStartDate, plannedCompletionDate, scheduledStartDate, scheduledCompletionDate,
      shopFloorScheduledStartDate, shopFloorScheduledCompletionDate, actualStartDate, actualCompletionDate,
      customer, customerOrder, customerOrderItem, batchNumber, productionVersion, erpPutawayStorageLocation, inspectionLot,
      warehouseNumber, schedulingType, priority, customValues: [], shopOrderSchedules: [ … per operation group … ], shopOrderSfcPlans: [] },
  isEnablePoint: false,
  inspectionCharacteristics: [ { id, inspPlanOperationExternalId, inspectionLot, inspectionCharacteristic: "0010",
      inspSpecFrmtdUpperLimit, inspSpecHasUpperLimit: "X", inspSpecFrmtdLowerLimit, inspSpecHasLowerLimit, inspSpecHasTargetValue, inspSpecFrmtdTargetValue,
      inspSpecCommercialCode, inspectionSpecificationText, inspCharacteristicSampleSize, inspSpecRecordingType, inspSpecCharcCategory,
      inspSpecIsQuantitative, inspSpecDecimalPlaces, originResultsData, commentRequired, comment: {},
      summarizedResultDTOList: [ { sfc, plant, inspectionLot, inspectionCharacteristic, inspResultFrmtdMeanValue, inspectedCount, inspectionValuationResult, sampleSize } ],
      isResultConfirmed, uom } ],
  inspectionCharacteristicsResults: [ { inspResultFrmtdMeasuredValue, inspectionResultText, inspectionValuationResult, characteristicAttributeCodeGrp, characteristicAttributeCode, characteristicAttributeCodeTxt } ] }
selectedCharacteristics: <one inspectionCharacteristics item>
characteristicsResult: { bIsEnableRecording, is1stRange, lowerLimit, upperLimit, insp1stSpecFrmtdLowerLimit, insp1stSpecFrmtdUpperLimit, uom, bIsQuantitative, isShowOriginalValue }
characteristics: { index: 0 }
```
`inspectionPointLot` is effectively the full shop order object: use it for order-level fields not in `/workList` (e.g. `{/qualityInspection/inspectionPointLot/inspectionLot}`, `/…/erpPutawayStorageLocation`, `/…/productionVersion`). Only populated when the Quality Inspection widget is on the POD.

## `/messageHistory`
Array of toast messages shown by MessageHistory (`[]` when empty).

## Custom roots
- PP outputs: `/<outputVariable>` = the PP response object (`{ outResource, outShift, … }`), or arrays (`/_orderOut/orders/0/order`).
- Input plugins: whatever *POD Variable Path* you set, e.g. `/nomBOMAssy/input/material`, `/custom/switch` (boolean), `/custom/checkbox` (boolean), `/custom/input` (string).
