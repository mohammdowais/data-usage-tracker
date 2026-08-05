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

// Update domain when a tab navigates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    const domain = getSiteDomain(changeInfo.url);
    if (domain) tabDomainMap.set(tabId, domain);
  }
});

// Clean up when tab closes
chrome.tabs.onRemoved.addListener((tabId) => {
  tabDomainMap.delete(tabId);
});

// ---------- TRACK UPLOADS ----------
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
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
            uploadSize += val.reduce((acc, v) => acc + v.length, 0);
          } else {
            uploadSize += val.length;
          }
        }
      }
    }

    if (uploadSize > 0) {
      updateStorage(domain, 'uploaded', uploadSize);
    }
  },
  { urls: ["<all_urls>"] },
  ["requestBody"]   // <-- required to access requestBody
);

// ---------- TRACK DOWNLOADS ----------
chrome.webRequest.onCompleted.addListener(
  (details) => {
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
      downloadSize = parseInt(contentLength.value, 10);
    }
    // If no Content-Length (e.g., chunked), we skip – this is a known limitation.

    if (downloadSize > 0) {
      updateStorage(domain, 'downloaded', downloadSize);
    }
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

// ---------- HELPER: update storage ----------
function updateStorage(domain, type, bytes) {
  chrome.storage.local.get(['dataUsage'], (result) => {
    const usage = result.dataUsage || {};
    const entry = usage[domain] || { downloaded: 0, uploaded: 0, count: 0 };
    entry[type] = (entry[type] || 0) + bytes;
    entry.count += 1;
    usage[domain] = entry;
    chrome.storage.local.set({ dataUsage: usage });
  });
}