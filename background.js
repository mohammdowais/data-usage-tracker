// Map tabId -> current top-level domain
const tabDomainMap = new Map();

// Helper: extract hostname from a URL
function getSiteDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return null;
  }
}

// Initialize domains of already open tabs on startup
function initOpenTabs() {
  chrome.tabs.query({}, (tabs) => {
    if (chrome.runtime.lastError) {
      console.warn("Could not query tabs on startup:", chrome.runtime.lastError.message);
      return;
    }
    for (const tab of tabs) {
      if (tab.id && tab.url) {
        const domain = getSiteDomain(tab.url);
        if (domain) {
          tabDomainMap.set(tab.id, domain);
        }
      }
    }
    console.log("Initialized open tabs domain map:", Array.from(tabDomainMap.entries()));
  });
}

// Run on startup
initOpenTabs();

// Update domain when a tab navigates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    const domain = getSiteDomain(changeInfo.url);
    if (domain) {
      tabDomainMap.set(tabId, domain);
      console.log(`Tab ${tabId} navigated to: ${domain}`);
    }
  }
});

// Clean up when tab closes
chrome.tabs.onRemoved.addListener((tabId) => {
  tabDomainMap.delete(tabId);
});

// ---------- TRACK UPLOADS ----------
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    try {
      const tabId = details.tabId;
      if (tabId < 0) return;

      let domain = tabDomainMap.get(tabId);
      if (!domain) {
        domain = getSiteDomain(details.url);
        if (!domain) return;
      }

      let uploadSize = 0;
      if (details.requestBody) {
        // Raw bytes (for file uploads, JSON, etc.)
        if (details.requestBody.raw) {
          for (const part of details.requestBody.raw) {
            if (part.bytes) {
              uploadSize += part.bytes.byteLength;
            }
          }
        }
        // Form data (URL-encoded or multipart) – approximate size
        if (details.requestBody.formData) {
          const formData = details.requestBody.formData;
          for (const key in formData) {
            const val = formData[key];
            if (Array.isArray(val)) {
              uploadSize += val.reduce((acc, v) => acc + (v && typeof v.length === 'number' ? v.length : 0), 0);
            } else if (val && typeof val.length === 'number') {
              uploadSize += val.length;
            }
          }
        }
      }

      if (uploadSize > 0) {
        console.log(`Detected upload of ${uploadSize} bytes to ${domain}`);
        updateStorage(domain, 'uploaded', uploadSize);
      }
    } catch (err) {
      console.error("Error in onBeforeRequest tracker:", err);
    }
  },
  { urls: ["<all_urls>"] },
  ["requestBody"]   // <-- required to access requestBody
);

// ---------- TRACK DOWNLOADS ----------
chrome.webRequest.onCompleted.addListener(
  (details) => {
    try {
      const tabId = details.tabId;
      if (tabId < 0) return;

      let domain = tabDomainMap.get(tabId);
      if (!domain) {
        domain = getSiteDomain(details.url);
        if (!domain) return;
      }

      let downloadSize = 0;
      const contentLength = details.responseHeaders?.find(
        h => h.name.toLowerCase() === 'content-length'
      );
      if (contentLength) {
        downloadSize = parseInt(contentLength.value, 10) || 0;
      }

      if (downloadSize > 0) {
        console.log(`Detected download of ${downloadSize} bytes from ${domain}`);
        updateStorage(domain, 'downloaded', downloadSize);
      }
    } catch (err) {
      console.error("Error in onCompleted tracker:", err);
    }
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

// ---------- BUFFERED STORAGE UPDATES ----------
let writeTimeout = null;
let pendingUpdates = {}; // Key: "timestampMinutes:domain", Value: { t, d, down, up }

function updateStorage(domain, type, bytes) {
  const minTimestamp = Math.floor(Date.now() / 60000) * 60000;
  const key = `${minTimestamp}:${domain}`;

  if (!pendingUpdates[key]) {
    pendingUpdates[key] = { t: minTimestamp, d: domain, down: 0, up: 0 };
  }

  if (type === 'downloaded') {
    pendingUpdates[key].down += bytes;
  } else if (type === 'uploaded') {
    pendingUpdates[key].up += bytes;
  }

  scheduleWrite();
}

function scheduleWrite() {
  if (writeTimeout) return;
  writeTimeout = setTimeout(flushUpdates, 2000);
}

function flushUpdates() {
  writeTimeout = null;
  const updatesToFlush = pendingUpdates;
  pendingUpdates = {};

  chrome.storage.local.get(['usageLogs'], (result) => {
    let logs = Array.isArray(result.usageLogs) ? result.usageLogs : [];

    // Merge updates into logs
    let mergedCount = 0;
    for (const key in updatesToFlush) {
      const update = updatesToFlush[key];
      const existing = logs.find(l => l.t === update.t && l.d === update.d);
      if (existing) {
        existing.down += update.down;
        existing.up += update.up;
      } else {
        logs.push({
          t: update.t,
          d: update.d,
          down: update.down,
          up: update.up
        });
      }
      mergedCount++;
    }

    // Keep data for the last 6 months (180 days)
    const sixMonthsAgo = Date.now() - 180 * 24 * 60 * 60 * 1000;
    logs = logs.filter(l => l.t >= sixMonthsAgo);

    chrome.storage.local.set({ usageLogs: logs }, () => {
      console.log(`Flushed ${mergedCount} domain updates to storage. Total log entries: ${logs.length}`);
    });
  });
}

// Flush when extension is suspended
chrome.runtime.onSuspend.addListener(() => {
  if (writeTimeout) {
    clearTimeout(writeTimeout);
    flushUpdates();
  }
});

// ---------- MIGRATION & INSTALLATION ----------
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed / updated.");
  initOpenTabs();
  
  chrome.storage.local.get(['dataUsage', 'usageLogs'], (result) => {
    // If legacy dataUsage exists and we don't have usageLogs yet
    if (result.dataUsage && !result.usageLogs) {
      console.log("Migrating legacy dataUsage storage to time logs...");
      const logs = [];
      const timestamp = Math.floor(Date.now() / 60000) * 60000;
      for (const domain in result.dataUsage) {
        const entry = result.dataUsage[domain];
        logs.push({
          t: timestamp,
          d: domain,
          down: entry.downloaded || 0,
          up: entry.uploaded || 0
        });
      }
      chrome.storage.local.set({ usageLogs: logs }, () => {
        chrome.storage.local.remove('dataUsage');
        console.log("Migration complete!");
      });
    }
  });
});