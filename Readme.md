# Data Usage Tracker Chrome Extension

A premium, lightweight Manifest V3 Google Chrome extension that monitors and logs uploaded and downloaded network data usage per website, allowing users to analyze their usage across predefined time intervals (10m, 30m, 1h, 24h, 1w, 1m, All Time) or custom date/time ranges.

---

## Features

- **Granular Time Filtering**: Query data usage dynamically for presets (last 10 minutes, 30 minutes, 1 hour, 24 hours, 1 week, 1 month, or All Time).
- **Custom Range Selector**: Filter data usage between any starting and ending date-time using standard localized date-time pickers.
- **Throttled Disk Writes**: Buffers network activity in-memory and flushes to disk in batches every 2 seconds, maintaining high browser performance even during intense browsing sessions.
- **Data Pruning**: Automatically purges log records older than 180 days (6 months) to keep storage footprint healthy.
- **Backward Compatibility**: Automatically migrates cumulative legacy data structures to time-based log arrays upon installation or update.
- **Favicon Integration**: Displays matching website brand icons directly in the domain list.
- **Responsive Dark UI**: Sleek, modern layout using Inter typography, glowing status cards, micro-interactions, and glassmorphism.

---

## File Architecture

```
data-usage-tracker/
├── manifest.json      # Extension metadata, configurations, and permissions
├── background.js     # Background Service Worker capturing and buffering network requests
├── popup.html        # HTML structure of the extension popup window
├── popup.css         # Custom stylesheet for the dark premium UI theme
├── popup.js          # Interactive popup controller: aggregates, filters, and renders stats
└── icon.png          # Fallback default extension logo icon
```

---

## How It Works Under the Hood

### 1. Request Interception & Identification
The extension runs a background Service Worker (`background.js`) that captures web traffic using Chrome's non-blocking `webRequest` API:
- **Tab Domain Tracking**: To assign network bytes to the correct website, a `tabDomainMap` (`Map`) is kept in memory. On service worker startup, it queries currently open tabs using `chrome.tabs.query` to register domain names. As tabs navigate, `chrome.tabs.onUpdated` updates the mapping.
- **Upload Measurements**: `chrome.webRequest.onBeforeRequest` reads request bodies (extracting size from raw multipart uploads or form field lengths) and logs upload bytes.
- **Download Measurements**: `chrome.webRequest.onCompleted` captures response headers, reading the `content-length` header for incoming bytes.

### 2. In-Memory Buffering & Throttling
Writing to Chrome storage on every request during a page load (which can involve dozens of subresources) degrades browser performance and triggers service worker delays.
- A `pendingUpdates` cache accumulates upload/download bytes grouped by a **1-minute epoch interval** (`Math.floor(Date.now() / 60000) * 60000`) and target domain.
- A throttled timer schedules `flushUpdates()` every 2 seconds. When it fires, updates are consolidated and merged into `chrome.storage.local.usageLogs`.
- `chrome.runtime.onSuspend` intercepts worker shutdown cycles to write any remaining cached data to storage immediately.

### 3. Data Querying & Aggregation
When the user clicks the extension icon, `popup.js` executes:
- **Retrieval**: It reads the `usageLogs` array from local storage.
- **Filtering**: Matches logs according to the selected tab. If a custom range is set, it converts input string datetimes to millisecond epochs (adjusted for local timezone offsets) and filters out logs outside the boundary.
- **Aggregation**: It sums downloads and uploads for each unique domain within the matching logs.
- **Rendering**: Sorts websites by overall usage descending, translates raw bytes into dynamically formatted sizes (e.g. `1.2 GB`, `340 KB`), displays site icons using Chrome's MV3 favicon helper (`chrome-extension://<id>/_favicon/`), and updates the summary cards.

---

## How to Load the Extension in Chrome

1. Open Google Chrome.
2. Navigate to `chrome://extensions/`.
3. Toggle on **Developer mode** in the top-right corner.
4. Click **Load unpacked** in the top-left corner.
5. Choose the `data-usage-tracker` folder.
6. Pin the extension for quick access. As you browse, open the popup to see your data usage metrics adjust in real-time.