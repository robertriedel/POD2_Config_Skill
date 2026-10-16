# Sources (harvested 2026-09-14)

The raw harvest (help topic dumps, export mining, sanitized context dump, blog notes) is kept outside this repo. Re-harvest when SAP ships a new DM release (quarterly): the help portal SPA loads topic bodies from `https://help.sap.com/http.svc/pagecontent?deliverableInfo=1&deliverable_id=40676169&buildNo=<n>&file_path=<slug>` (same-origin fetch from an open help.sap.com tab; plain HTTP fetch is blocked). Catalog table rows are all in the DOM of the catalog page.

## SAP Help
- Catalog "POD 2.0 Plugins and Actions" (147 items, IDs PL02xx/PL03xx): https://help.sap.com/docs/sap-digital-manufacturing/service-catalog/pod-2-0
- Application Help for Manage PODs 2.0 (deliverable 40676169): https://help.sap.com/docs/sap-digital-manufacturing/application-help-for-manage-pods-2-0/
  - Configuring Plugins in Your POD (section root): …/configuring-plugins-in-your-pod
  - Add Widget Events / action reference: …/add-widget-events
  - Using POD Variables: slug f60e7ac2102a464fa84c4eb8683b792b.html
  - Common Manufacturing Plugin Properties: slug 85dd087c0fea44abacb2adbe33a6d5e7.html
  - Configure Actions in Your POD: slug cd01362b30ea421eb3bc2b6a77385397.html
  - Configure the Scan Data Action: slug 9c8ee75bf03f4f66b18b0fc6e926bf53.html
  - Electronic Batch Record POD Template: slug 8df1a14d34334563abe31f6bce0df890.html
  - Manage PODs 2.0 vs POD Designer 1.0: …/choosing-between-manage-pods-2-0-pod-2-0-and-pod-designer-pod-1-0
  - Per-plugin/action pages: slug column in sap-catalog.md
- UI5 Expression Binding (syntax reference the SAP docs point to): https://sapui5.hana.ondemand.com/#/topic/daf6852a04b44d118963968a1239d2c0

## SAP Community blog series "New POD 2.0 Framework" (Manoel Costa, 2026)
- Intro: …/ba-p/14324719
- Template-Based Design Instead of POD Types: …/ba-p/14324747
- Visual WYSIWYG Designer: …/ba-p/14324759
- Hands-on Flexible Layout Part 1: …/ba-p/14326306 · Part 2: …/ba-p/14327963
- Custom UI Dialogs and Calling Production Processes: …/ba-p/14332928
- Dynamic PODs (show/hide/enable/disable): …/ba-p/14338120
- Tips and Tricks: …/ba-p/14390720
- Designing Shopfloor Experiences Faster with POD 2.0 and AI-Assisted Creation (Stephan_DM, clipboard-JSON workflow): …/ba-p/14332186
- SAP Digital Manufacturing POD AI Skill (Kevin Hunter — plugin *development* skill, complementary): …/ba-p/14480961
(prefix: https://community.sap.com/t5/supply-chain-management-blog-posts-by-sap/)

## Real exports used for grammar/verification
- SAP templates (bundled): templates/OPERATIONPOD.json, WORKCENTERPOD.json, ORDER_POD.json (exported 2026-09 from a 26xx tenant, `_version: 1`).
- Customer PODs (not bundled): a BLANK-template resource cockpit (PP-driven), an ORDER-template bulk manufacturing POD (with oee.Downtime), and a test cockpit with custom widgets (OpenURL/Confirm/BusyIndicator examples).
- Runtime POD context dump: Order POD, see pod-context.md.

## Customer exports mined 2026-09-14 (not bundled; tenant data)
- Test OEE POD (BLANK template, LLM-authored + imported): ObjectPageLayout/Section/SubSection, plain sap.m.Table/Column, sap.m.Menu, `{/_out/x} %` texts.
- Dashboard POD (ORDER template + dashboard page): `pageEnter` chain, `model.SetProperty`, expression-bound `type`/`color`, `sap.ui.core.Icon`, dashboard page style (Toolbar in content + Splitter sidebar).

## Designer palette export 2026-09-14 (bundled: templates/PALETTE.json)
- `PLUGIN` (BLANK template, every palette widget dragged in once, no tenant data): confirms FQCNs for IFrame/ExpandableText/MaskInput/PaneContainer/SplitPane and all plain inputs, designer-default `properties` per widget, child-id patterns (`<id>-title`, `<id>-button<n>`, `<id>-Item<n>`), aggregations `rootPaneContainer`/`panes`/`actions`. Not proven: `podVariablePath` (inputs export with `properties: {}`).
