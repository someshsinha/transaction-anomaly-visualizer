# Transaction Anomaly Visualizer - UI Fixes & Feature Additions

### 1. Light Mode Typography Fixes
- **Problem**: Node labels generated a thick, messy black text outline that rendered strings unreadable in light mode.
- **Solution**: Dynamically shifted the `text-outline-color` parameter inside the Cytoscape stylesheet to push a crisp white border (`#ffffff`) when light mode is active. Thinned the outline stroke exclusively for light mode to prevent blobby anti-aliasing artifacts entirely.

### 2. Legend Context Addition
- **Problem**: Users possessed no visual cue regarding the significance of the yellow ring outline around nodes/edges natively.
- **Solution**: Appended a explicit definition mapping `Selected Anomaly` to a hollow yellow circular indicator inside the master Graph Legend pane rendering at the bottom right.

### 3. Overlap & Connection Hover Visualization
- **Problem**: In dense layouts, visually extracting which edges belonged to which nodes underneath heavy clusters was functionally difficult. 
- **Solution**: Re-engineered the interactive `cy.on('mouseover', 'node')` listener. Whenever a cursor hits a node circle, Cytoscape securely and recursively crawls to inject the `.hovered` opacity class onto **all specifically connected edges**. Moving the cursor away dynamically removes it. This generates extremely deep, intuitive spatial recognition of connections.
- **Feature Add**: Generated a localized dynamic Tooltip popup on node-hover specifically quantifying how many connections fall physically beneath the point of interest (e.g., `M197... (15 connections)`).

### 4. Severity Context inside Anomaly Row Selection
- **Problem**: Clicking a detected anomaly list item in the side panel highlighted it with a generic blue/indigo active state line, discarding the risk urgency context.
- **Solution**: Mapped the `active` border highlight strictly to the generated CSS logic of the anomaly itself:
  - Cycle (Red) mapped to `var(--badge-cycle-bg)`
  - High Velocity (Yellow) mapped to `var(--badge-velocity-bg)`
  - Structuring (Violet) mapped to `var(--badge-struct-bg)`
  - Rapid Succession (Orange) mapped to `var(--badge-rapid-bg)`
  
### 5. CSV Export Engine
- **Problem**: Users lacked the capacity to dump detected backend metrics dynamically from the UI for external reporting or offline verification structures.
- **Solution**: Bootstrapped a native `Download` routine inside `Dashboard.jsx`. Attached to an ergonomic "Export" button located directly inside the Anomaly panel header. When clicked, maps all anomaly arrays into pure CSV string blocks and securely triggers a local browser-level file download event named `tav_anomalies_{jobId}.csv`.

### 6. Job ID Field Uncluttering & Flex Expansion
- **Problem**: High-entropy auto-generated Jobs IDs (e.g. `batch-1775876187629-0`) exceeded the hard-clamped viewport constraints applied logically to standard short `ACCOUNT` strings, burying characters behind text-clipping ellipses.
- **Solution**: Re-engineered the `<ControlBar />` structural CSS payload to grant the Job ID field pure liquid `flex: 1` constraints relative to the main spacer elements, allowing it to natively expand safely to display the complete timestamp identifier structurally without inflating the bar overhead.

### 7. Filter Slider Bounds Scaling
- **Problem**: Setting `Min Amount` range limits to an arbitrarily hardcoded `$10,000` upper bound crippled functionality when edge values routinely aggregated structurally past $40,000+, masking operations as broken components.
- **Solution**: Decoupled the `<GraphCanvas />` DOM widget from static values entirely. Evaluated `useMemo` hooks against the `graphData` topology payload logically determining absolute `Math.max()` parameters in real-time, binding the `type="range"` maximum to the absolute true heaviest pipeline edge to normalize slider utility seamlessly!

### 8. Physical Node Stack Disambiguation
- **Problem**: Because `fcose` mathematically plots absolute rendering constraints, highly-correlated leaf accounts were structurally given perfectly identical `{x,y}` 2D coordinate payloads, visually stacking them perfectly on top of each other. Native degree tooltips reading " (1 connections) " inadvertently implied singular node isolation instead of identifying the stack depth visually.
- **Solution**: Re-architected the node-mouseover tooltip payload. Using `evt.originalEvent`, the rendering engine specifically filters and isolates all rendered nodes situated mathematically within a hyper-tight `5px` bounding radius. If multiple accounts physically breach this overlap constraint organically, the tooltip abandons absolute single-degree strings and dynamically alerts the investigator regarding the stack directly (e.g., `4 Overlapping Nodes`).

### 9. Anomaly Z-Index Foreground Prioritization
- **Problem**: When dense subnets clustered identically near threat hubs in the center axis, colored anomaly nodes would routinely be hidden structurally beneath clean grey transaction nodes visually, destroying direct line-of-sight visual feedback entirely. 
- **Solution**: Penetrated the core Cytoscape stylesheet to hard lock the absolute `z-index` rendering properties algorithmically. Standard nodes now natively bind to a background frame (`z-index: 10`), while anomalies structurally bind to higher atmospheric bounds based on severity (`z-index: 50/60`), and deeply-tied focal traces bypass limits entirely (`z-index: 100`). Anomalies will now perpetually overlay non-active components cleanly inside overlaps.
