# Privacy Policy for Data Usage Tracker

**Last Updated:** September 26, 2026

**Data Usage Tracker** ("the Extension") is committed to protecting user privacy. This Privacy Policy explains our data collection, usage, and storage practices.

---

## 1. Zero Data Collection
- **No Personal Information:** The Extension does **not** collect, store, transmit, or share any personal identifiable information (PII), such as names, email addresses, IP addresses, browsing histories, or user identities.
- **No Remote Servers:** The Extension operates **100% locally** inside your Google Chrome browser. No data ever leaves your device or is transmitted to external servers, analytics providers, or third parties.

---

## 2. Information Handled Locally
The Extension intercepts local network headers solely to calculate bytes transferred:
- **Domain Metrics:** Aggregated network download and upload bytes grouped by website domain and timestamp (1-minute intervals).
- **Storage:** All metrics are stored locally on your device using `chrome.storage.local`.
- **Retention:** Logged data older than 180 days is automatically purged locally. Users can clear all stored data at any time via the "Reset Data" button inside the extension popup.

---

## 3. Extension Permissions Justification

| Permission | Purpose |
| :--- | :--- |
| `webRequest` | Reads request body lengths and `content-length` response headers to count byte usage per domain. |
| `<all_urls>` | Allows network byte measuring across websites visited by the user. |
| `storage` | Saves aggregated time-series data usage logs strictly on the user's local device (`chrome.storage.local`). |
| `activeTab` | Determines top-level website domain names during active browser navigation. |
| `favicon` | Displays website logos next to domain names in the user interface. |

---

## 4. Single-Purpose Compliance
Data Usage Tracker serves a single purpose: **Monitoring local network bandwidth usage per website with customizable time filters.** The extension does not perform any secondary functions, tracking, advertising, or data monetization.

---

## 5. Contact & Support
If you have questions regarding this Privacy Policy or the extension, please open an issue in the project repository.
