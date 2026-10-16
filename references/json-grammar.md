# POD 2.0 configuration JSON grammar

Verified against 5 real exports (3 SAP templates + 2 customer PODs). Anything marked *(unverified)* was not observed in an export.

## Full export (what Export/Import and "Copy configuration" use)

```json
{
  "_version": 1,
  "id": "MY_POD",
  "description": "Human readable name",
  "favicon": "",
  "contentDensity": "Compact",
  "config": {},
  "pages": [ <page node>, ... ],
  "dialogs": [ <dialog node>, ... ],
  "createdFromTemplate": "WORK_CENTER",
  "target": "CLOUD"
}
```

- `createdFromTemplate` values seen: `WORK_CENTER`, `OPERATION_ACTIVITY`, `ORDER`, `BLANK`. EBR template exists (name in JSON *unverified*).
- `contentDensity`: `Compact` in every export (designer offers Cozy too). `target`: always `CLOUD`.
- `config` was `{}` in every export. Leave it.
- The **first page** in `pages[]` is the entry page (`MainPage` in all templates).
- Fragments (clipboard paste) omit all of the above and are just node(s) — see "Fragments".

## Node (widget instance)

```json
{
  "id": "StartButton",
  "widget": "sap.m.Button",
  "properties": { "text": "{i18n>start}", "icon": "sap-icon://fob-watch" },
  "events": { "press": [ <action entry>, ... ] },
  "aggregations": { "<aggregationName>": [ <node>, ... ] },
  "layoutData": { "size": "25%" }
}
```

- `id`: string, unique **among widget nodes within the page (or dialog)**. The designer generates `<Type><n>` (`HBox2`, `Clock1`) and derives child ids from the parent (`DynamicPage1-title`, `RadioButtonGroup1-button1`, `MenuButton1-Item1`); SAP templates use descriptive PascalCase. Action entries also carry an `id` but those are *not* unique (SAP reuses `NavigateToPage`, `CloseDialog` freely).
- `widget`: fully qualified class. Namespaces: `sap.m.*`, `sap.f.DynamicPage`, `sap.ui.layout.Splitter` (plain UI5 containers/elements) and `sap.dm.dme.pod2.*` (manufacturing plugins). Custom plugins appear as `<vendor>.<...>.widget.<Name>` — out of scope for this skill.
- `properties`: flat map. Values are literals (`true`, `"2rem"`, `100`, arrays such as `sticky`, `columns`) or binding strings (see binding-and-context.md). Omit a property to get the plugin default; `{}` and absent behave the same.
- `events`: map `eventName → ordered array of action entries`. Event names are plugin specific (`press`, `select`, `itemPress`, `tabEnter`, `collect`, `consume`, `remove`, `detailPress`, `startPhase`, `completePhase`, `reportQuantity`). Empty `events: {}` is fine.
- `aggregations`: map `aggregationName → array of nodes`. Names seen in SAP templates: `content`, `items`, `customHeader`, `heading`, `headerActions`, `headerContent`, `contentAreas`, `menuItems`, `buttons`. Seen only in customer exports (designer-accepted): `sections`/`subSections`/`blocks` (ObjectPage), `columns`/`header` (plain `sap.m.Table`/`sap.m.Column`), `menu` (a `sap.m.Menu` under MenuButton; the designer emitted it *next to* `menuItems` — keep `menuItems`, it is what templates use). Seen in the designer palette export (`templates/PALETTE.json`): `rootPaneContainer`/`panes` (ResponsiveSplitter chain) and `actions` (ObjectPageSubSection header strip — designer accepts any widget there, but the body is `blocks`). Children are **never** placed anywhere else.
- `events` may also sit on a **page**: `pages[].events.pageEnter` runs a chain when the page is shown (customer export: `BusyIndicator` → `ProductionProcess` with `outputVariable`, i.e. load data on open). Dialog Open/Close events exist per SAP; JSON names *unverified*.
- `layoutData`: only for children of certain containers. Two forms exist: **flat** (SAP templates) `{size:"25%", minSize:50}` for Splitter children, `{growFactor:1}` / `{alignSelf:"Center"}` for HBox/VBox children, `{size:"75%"}` for an IconTabBar inside a Splitter; and **typed** (designer-generated in newer exports) `{"widget":"sap.m.FlexItemData","properties":{"growFactor":1,"baseSize":"0%"}}`. Either is accepted; keep the form already used on that page.

## Action entry (inside `events.<event>[]`)

```json
{ "id": "ShowOrderScheduleDialog", "action": "sap.dm.dme.pod2.action.dialog.ShowDialog", "properties": { "dialog": "OrderScheduleDialog" } }
```

- `properties` is optional (most execution actions take none). Values may contain bindings (`OpenURL.url`).
- The array is executed in order. A failing action aborts the rest; `Confirm` cancel aborts the rest. See actions.md.
- Designer's per-action *Enable* toggle: JSON key *(unverified, likely `"enabled": false` on the entry)*.

## Container → aggregation map

| Container widget | Aggregation(s) | Typical children |
|---|---|---|
| `sap.m.Page` | `customHeader` (one `sap.m.Toolbar`), `content` | page body |
| `sap.f.DynamicPage` | `heading`, `headerActions`, `headerContent`, `content` | logo/title, Clock/MessageHistory/Notification, filter bar, body |
| `sap.m.Toolbar` | `content` | Image, Title/Text, ToolbarSpacer, Buttons, Clock… |
| `sap.m.HBox` / `sap.m.VBox` | `items` | anything |
| `sap.m.ScrollContainer` | `content` | one table widget |
| `sap.m.IconTabBar` | `items` (only `sap.m.IconTabFilter`) | |
| `sap.m.IconTabFilter` | `content` | tab body |
| `sap.ui.layout.Splitter` | `contentAreas` (children need `layoutData.size`) | tables, VBox wrappers, nested Splitter |
| `sap.m.Panel` | `content` | |
| `sap.m.MenuButton` | `menuItems` (only `sap.m.MenuItem`, event `select`) | |
| `sap.m.Dialog` | `content`, `buttons` (only `sap.m.Button`) | |
| `sap.uxap.ObjectPageLayout` | `sections` → `sap.uxap.ObjectPageSection` → `subSections` → `sap.uxap.ObjectPageSubSection` → `blocks` (body) or `actions` (header strip) | any (customer + palette exports) |
| `sap.ui.layout.ResponsiveSplitter` | `rootPaneContainer` → one `sap.ui.layout.PaneContainer` → `panes` → `sap.ui.layout.SplitPane` | palette export: two empty SplitPanes; put content under each SplitPane's `content` (UI5 default aggregation, *unverified* in JSON) |
| `sap.ui.layout.form.SimpleForm` | `content` | `sap.m.Label` (`showColon:true`) followed by its input, repeated |
| `sap.m.RadioButtonGroup` | `buttons` (only `sap.m.RadioButton`, ids `<group>-button<n>`) | |
| `sap.m.Table` | `columns` (only `sap.m.Column`, each with `header` → one `sap.m.Label`) | static headers only; no row binding seen — use the SAP table widgets for data |

## Page node

```json
{ "id": "SFCDetails", "widget": "sap.m.Page",
  "properties": { "showHeader": true, "showFooter": false, "title": "SFC Details" },
  "aggregations": {
    "customHeader": [ { "id": "DetailsToolbar", "widget": "sap.m.Toolbar", "aggregations": { "content": [ ... ] } } ],
    "content": [ ... ] } }
```

Two page styles occur in SAP templates:
1. **Toolbar header** (WORK_CENTER, ORDER): `showHeader: true`, header content lives in `customHeader[0].content`, body directly in `content`.
2. **DynamicPage** (OPERATION_ACTIVITY): `showHeader: false`, `customHeader` toolbar empty, `content[0]` is `sap.f.DynamicPage` carrying `heading`/`headerActions`/`headerContent`/`content`.
3. **Dashboard** (customer exports): `customHeader: []` and a `sap.m.Toolbar` (`height:"80px", design:"Solid"`) as the first `content` item, followed by a `sap.ui.layout.Splitter` (sidebar VBox `size:"15%"` + content `size:"85%"`).
Keep the style of the page you are editing; do not mix.

## Dialog node

```json
{ "id": "WorkInstructionDialog", "widget": "sap.m.Dialog",
  "properties": { "title": "{i18n>workInstruction}", "contentWidth": "1000px", "contentHeight": "750px", "draggable": true, "resizable": true, "showHeader": true },
  "aggregations": { "content": [ ... ], "buttons": [ { "id": "CloseBtn", "widget": "sap.m.Button", "properties": { "text": "{i18n>ok}", "type": "Emphasized" }, "events": { "press": [ { "id": "CloseDialog", "action": "sap.dm.dme.pod2.action.dialog.CloseDialog" } ] } } ] } }
```

- Dialogs live in top-level `dialogs[]`, never inside a page. Opened by `ShowDialog {dialog:<id>}` or `NavigateToWidget {widgetId:<id>}` (both used by SAP; templates use NavigateToWidget for consumption/batch dialogs).
- Dialog has *Open* and *Close* events per SAP (blog "Flexible Layout 2"); JSON event names *(unverified)*.
- Dialog properties seen: `title`, `contentWidth`, `contentHeight`, `draggable`, `resizable`, `showHeader`, `showCloseButton`, `icon`.

## Column object (table widgets)

```json
{ "field": "sfc", "text": "{i18n>sfc}", "width": "150px", "importance": "High", "hAlign": "Begin", "vAlign": "Middle", "sortable": true }
```

Keys seen: `field` (plugin-defined, see widgets.md), `text`, `width` (px or %), `importance` (`High` keeps column out of pop-in), `hAlign` (`Begin|Center|End|Right`), `vAlign`, `sortable`, `headerText`, `id`. Button-like columns (`collectButton`, `consumeButton`, `removeButton`, `post`, `postings`, `detail`, `reportQuantity`) use `"text": ""`.

## Fragments (clipboard)

The designer copies/pastes at three granularities; the JSON is the node itself:
- **Plugin**: one node (with its subtree). Paste onto a page/dialog or into a container.
- **Dialog**: one dialog node. Paste into the Pages tab as a new dialog.
- **Page**: one page node.
An array of sibling nodes is also a valid fragment for `aggregations.<name>` — say where it goes.

When copying a subtree to another page, **re-id every widget node** (suffix `2`, or rename). `NavigateToWidget` resolves ids globally, so duplicates misroute silently. Action `id`s may stay.

## Sizes, colours, icons

- Lengths: `rem`, `px`, `%` strings. SAP uses `2.5rem`/`2.75rem` button heights, `8.75rem` widths in execution toolbars, `1rem` label font, `1.5rem` page titles.
- Colours: `rgb(r, g, b)` strings, hex (`#BB0000`) or names; `fontColor` on `sap.m.Text` (NOT `color`) and `color` on `sap.ui.core.Icon` may be an expression (see binding-and-context.md → value-based styling); `fontColor`, `iconColor`, `backgroundColor`, `borderColor`, `borderWidth` on Buttons/Toolbar/HBox are POD-2.0 extensions of the UI5 controls.
- Icons: `sap-icon://<name>` (fob-watch, past, flag, quality-issue, menu, nav-back, gantt-bars, measuring-point, org-chart, work-history, activity-individual, measurement-document, hint, activities).
