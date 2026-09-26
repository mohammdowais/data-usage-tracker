# Data Usage Tracker — Chrome Web Store Ready Extension

[![Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-brightgreen.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Privacy](https://img.shields.io/badge/Privacy-100%25_Local-purple.svg)](#privacy--security)

A premium, lightweight **Manifest V3 Google Chrome Extension** that monitors and logs uploaded and downloaded network data usage per website in real-time. It enables users to analyze bandwidth consumption across preset intervals (*10m, 30m, 1h, 24h, 1w, 1m, All Time*) or custom date/time ranges.

---

## 🌟 Key Features

- **Real-Time Data Monitoring**: Measures accurate upload and download byte traffic per website using Chrome's non-blocking network API.
- **Granular Time Filters**: Query bandwidth stats by presets (10 mins, 30 mins, 1 hour, 24 hours, 1 week, 1 month, or All Time).
- **Custom Date & Time Picker**: Inspect data usage between any starting and ending date/time with localized picker controls.
- **High-Performance In-Memory Buffering**: Buffers network activity in RAM and flushes to storage in batches every 2 seconds, eliminating browser lag.
- **Automatic Storage Pruning**: Automatically purges log data older than 180 days (6 months) to maintain minimal storage footprint.
- **Favicon Integration**: Displays website brand logos alongside domain names using Chrome's MV3 favicon service.
- **Modern Glassmorphic Dark UI**: Built with custom CSS CSS-variables, Inter typography, glowing status cards, and responsive tables.
- **100% Local & Private**: Zero external telemetry, zero tracking scripts, no remote servers. All data stays strictly on your device.

---

## 📁 Directory Structure

```
data-usage-tracker/
├── manifest.json              # Extension MV3 configuration & permissions
├── background.js             # Service Worker: captures network requests & buffers data
├── popup.html                # Extension popup markup
├── popup.css                 # Premium dark-theme glassmorphism stylesheet
├── popup.js                  # Controller: filters, aggregates, and renders usage stats
├── icons/                    # Web Store compliant icon bundle
│   ├── icon16.png            # 16x16 icon (favicon / toolbar)
│   ├── icon32.png            # 32x32 icon (Windows taskbar / high-DPI)
│   ├── icon48.png            # 48x48 icon (Chrome extensions manager)
│   └── icon128.png           # 128x128 icon (Web Store listing)
├── icon.png                  # Master 512x512 PNG source icon
├── PRIVACY_POLICY.md         # Chrome Web Store Privacy Policy reference
├── README.md                 # Project & publishing documentation
└── data-usage-tracker-v1.0.0.zip  # Production package for Chrome Web Store upload
```

---

## 🚀 How to Install & Load Locally (Developer Mode)

1. Open **Google Chrome** and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle in the top-right corner.
3. Click **Load unpacked** in the top-left toolbar.
4. Select the `data-usage-tracker` project directory.
5. Pin **Data Usage Tracker** to your Chrome toolbar. Browse any website to start tracking network bandwidth consumption in real-time!

---

## 🛒 Chrome Web Store Publishing Guide

Follow these step-by-step instructions to publish **Data Usage Tracker** on the Google Chrome Web Store:

### Step 1: Create a Developer Account
1. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/).
2. Sign in with your Google Account and pay the one-time **$5 registration fee** (if not already registered).

### Step 2: Prepare the Production Zip Package
A pre-built submission zip file `data-usage-tracker-v1.0.0.zip` is included in this repository. If you make code updates, re-generate the package using:
```bash
zip -r data-usage-tracker-v1.0.0.zip manifest.json background.js popup.html popup.css popup.js icon.png icons/
```

### Step 3: Upload Package to Developer Dashboard
1. Click **Add new item** in the top-right corner of the Developer Dashboard.
2. Upload the `data-usage-tracker-v1.0.0.zip` file.
3. Once processed, you will be redirected to the **Store Listing** edit page.

### Step 4: Store Listing Information
Fill in the following fields:

- **Item Name**: `Data Usage Tracker - Website Network Monitor`
- **Short Description** *(max 132 chars)*:  
  `Track total downloaded and uploaded bytes per website across custom time ranges with real-time analytics.`
- **Detailed Description**:
  ```text
  Data Usage Tracker is a lightweight, privacy-focused Chrome Extension that gives you complete visibility into your internet bandwidth consumption per website.

  FEATURES:
  • Real-time Upload & Download Tracking: Monitor bytes transferred per domain.
  • Flexible Time Intervals: View usage for the last 10m, 30m, 1h, 24h, 1w, 1m, or All Time.
  • Custom Range Filter: Pick exact start and end dates/times to audit bandwidth spikes.
  • High-Performance Engine: Low-overhead background worker buffers writes efficiently.
  • Clean Dark Dashboard: Beautiful glassmorphic UI with website favicons.
  • 100% Private: All data is stored locally on your machine. No tracking or remote servers.
  ```
- **Category**: `Productivity` or `Developer Tools`
- **Language**: `English`

### Step 5: Upload Visual Assets
- **Extension Icon**: Upload `icons/icon128.png` (128x128 PNG).
- **Screenshots**: Upload at least 1 screenshot (1280x800 or 640x400 PNG/JPEG) of the popup window showing sample website metrics.
- **Small Promotional Tile** *(optional)*: 440x280 PNG.

### Step 6: Privacy Tab & Permissions Justification
Navigate to the **Privacy Practices** tab in the console:

1. **Single-Purpose Justification**:  
   `Monitoring local network bandwidth usage per website with customizable time filters.`
2. **Permission Justifications** (Copy-paste these exact responses):
   - `webRequest`: *Required to inspect network request body sizes and Content-Length response headers to calculate upload and download bandwidth per website domain.*
   - `<all_urls>`: *Required to capture background network traffic across all web domains visited by the user.*
   - `storage`: *Required to save aggregated time-series data usage metrics locally on the user's device via chrome.storage.local.*
   - `activeTab`: *Required to identify current tab domain names during active navigation.*
   - `favicon`: *Required to render site brand logos alongside website domains in the popup interface.*
3. **Data Usage Disclosure**:
   - Check **No** for collecting personal data (or check "No personal data collected").
   - Confirm that data is **not sold to third parties** and **not used for credit/lending**.
4. **Privacy Policy URL**: Link to your hosted `PRIVACY_POLICY.md` (e.g. GitHub raw file URL or GitHub Pages link).

### Step 7: Submit for Review
1. Click **Submit for Review**.
2. Automated review typically takes between 2 hours and 2 business days.

---

## ⚙️ Technical Architecture

### 1. Network Interception
- **Service Worker (`background.js`)**: Listens to `chrome.webRequest.onBeforeRequest` (for upload bytes) and `chrome.webRequest.onCompleted` (for download bytes via `Content-Length`).
- **Tab Mapping**: Maintains an in-memory `tabDomainMap` (`Map<tabId, domain>`) updated via `chrome.tabs.onUpdated` and `chrome.tabs.onRemoved`.

### 2. Batching & Performance
- Requests are aggregated in RAM (`pendingUpdates`) grouped by 1-minute epoch timestamps.
- Flushes data to `chrome.storage.local.usageLogs` in batches every 2 seconds to reduce disk write cycles.
- Includes emergency flush handlers on `chrome.runtime.onSuspend`.

### 3. Analytics & Filtering (`popup.js`)
- Time ranges convert input dates to epoch boundaries.
- Aggregates uploads and downloads per domain, dynamically formats sizes (`KB`, `MB`, `GB`), and renders sorted domain tables.

---

## 🔒 Privacy & Security

- **No Remote Calls**: The extension operates entirely offline.
- **No Third-Party Analytics**: No Google Analytics, Mixpanel, or telemetry scripts.
- **Local Data Control**: Users can inspect or permanently wipe storage with the **Reset Data** button.

---

## 📄 License

This project is open-source under the **MIT License**.