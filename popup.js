document.addEventListener('DOMContentLoaded', () => {
  initFilters();
  loadStats();
  document.getElementById('resetBtn').addEventListener('click', resetData);
  document.getElementById('mockBtn').addEventListener('click', loadMockData);
  document.getElementById('applyCustomBtn').addEventListener('click', loadStats);
});

let currentFilter = 'all';

function initFilters() {
  const tabs = document.querySelectorAll('.tab-btn');
  const panel = document.getElementById('customRangePanel');

  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      tabs.forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.dataset.filter;

      console.log(`Filter changed to: ${currentFilter}`);

      if (currentFilter === 'custom') {
        panel.style.display = 'flex';
        // Set default dates if they aren't set
        const startInput = document.getElementById('customStart');
        const endInput = document.getElementById('customEnd');
        if (!startInput.value || !endInput.value) {
          const endDefault = new Date();
          const startDefault = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h ago
          startInput.value = formatDateTime(startDefault);
          endInput.value = formatDateTime(endDefault);
        }
      } else {
        panel.style.display = 'none';
        loadStats();
      }
    });
  });
}

function formatDateTime(date) {
  const tzoffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0.00 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function loadStats() {
  console.log("Loading stats from storage...");
  chrome.storage.local.get(['usageLogs'], (result) => {
    const logs = Array.isArray(result.usageLogs) ? result.usageLogs : [];
    console.log(`Total log entries in storage: ${logs.length}`, logs);

    let filteredLogs = [];
    const now = Date.now();

    if (currentFilter === 'all') {
      filteredLogs = logs;
    } else if (currentFilter === '10m') {
      filteredLogs = logs.filter(l => l.t >= now - 10 * 60 * 1000);
    } else if (currentFilter === '30m') {
      filteredLogs = logs.filter(l => l.t >= now - 30 * 60 * 1000);
    } else if (currentFilter === '1h') {
      filteredLogs = logs.filter(l => l.t >= now - 60 * 60 * 1000);
    } else if (currentFilter === '24h') {
      filteredLogs = logs.filter(l => l.t >= now - 24 * 60 * 60 * 1000);
    } else if (currentFilter === '1w') {
      filteredLogs = logs.filter(l => l.t >= now - 7 * 24 * 60 * 60 * 1000);
    } else if (currentFilter === '1m') {
      filteredLogs = logs.filter(l => l.t >= now - 30 * 24 * 60 * 60 * 1000);
    } else if (currentFilter === 'custom') {
      const startVal = document.getElementById('customStart').value;
      const endVal = document.getElementById('customEnd').value;
      
      if (!startVal || !endVal) {
        alert('Please select both start and end date/time.');
        return;
      }
      
      const startTime = new Date(startVal).getTime();
      const endTime = new Date(endVal).getTime();
      
      if (startTime > endTime) {
        alert('Start time cannot be after End time.');
        return;
      }
      
      filteredLogs = logs.filter(l => l.t >= startTime && l.t <= endTime);
      console.log(`Filtering custom range: ${startVal} (${startTime}) to ${endVal} (${endTime})`);
    }

    console.log(`Filtered log entries for "${currentFilter}": ${filteredLogs.length}`, filteredLogs);

    const tbody = document.getElementById('usageBody');
    tbody.innerHTML = '';
    
    let totalDown = 0, totalUp = 0;
    const aggregated = {};

    // Aggregate by domain
    for (const log of filteredLogs) {
      if (!aggregated[log.d]) {
        aggregated[log.d] = { downloaded: 0, uploaded: 0 };
      }
      aggregated[log.d].downloaded += log.down;
      aggregated[log.d].uploaded += log.up;
    }

    // Sort by total bytes descending
    const sorted = Object.keys(aggregated).sort((a, b) => {
      const totalA = aggregated[a].downloaded + aggregated[a].uploaded;
      const totalB = aggregated[b].downloaded + aggregated[b].uploaded;
      return totalB - totalA;
    });

    if (sorted.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="empty">No usage data found for this range.</td></tr>`;
    } else {
      for (const domain of sorted) {
        const data = aggregated[domain];
        const downFormatted = formatBytes(data.downloaded);
        const upFormatted = formatBytes(data.uploaded);
        const totalFormatted = formatBytes(data.downloaded + data.uploaded);
        
        totalDown += data.downloaded;
        totalUp += data.uploaded;

        // Try getting favicon using the new MV3 favicon API
        const faviconUrl = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent('https://' + domain)}&size=32`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>
            <div class="domain-cell">
              <img class="domain-icon" src="${faviconUrl}" onerror="this.onerror=null; this.src='icon.png';" alt="" width="16" height="16">
              <span>${domain}</span>
            </div>
          </td>
          <td class="num">${downFormatted}</td>
          <td class="num">${upFormatted}</td>
          <td class="num total-cell">${totalFormatted}</td>
        `;
        tbody.appendChild(tr);
      }
    }

    document.getElementById('totalDown').textContent = formatBytes(totalDown);
    document.getElementById('totalUp').textContent = formatBytes(totalUp);
    document.getElementById('totalUsage').textContent = formatBytes(totalDown + totalUp);
  });
}

function resetData() {
  if (confirm('Delete all stored usage data?')) {
    chrome.storage.local.remove('usageLogs', () => {
      loadStats();
    });
  }
}

function loadMockData() {
  if (confirm('Replace current logs with demo logs for testing?')) {
    const now = Date.now();
    const demoLogs = [
      // 5 mins ago (should show in 10m, 30m, 1h, 24h, 1w, 1m, all)
      { t: now - 5 * 60 * 1000, d: 'google.com', down: 5242880, up: 102400 },
      // 20 mins ago (should show in 30m, 1h, 24h, 1w, 1m, all - NOT 10m)
      { t: now - 20 * 60 * 1000, d: 'youtube.com', down: 26214400, up: 1048576 },
      // 2 hours ago (should show in 24h, 1w, 1m, all - NOT 10m, 30m, 1h)
      { t: now - 2 * 60 * 60 * 1000, d: 'github.com', down: 10485760, up: 512000 },
      // 3 days ago (should show in 1w, 1m, all - NOT 24h, etc.)
      { t: now - 3 * 24 * 60 * 60 * 1000, d: 'wikipedia.org', down: 2097152, up: 51200 },
      // 15 days ago (should show in 1m, all - NOT 1w, etc.)
      { t: now - 15 * 24 * 60 * 60 * 1000, d: 'instagram.com', down: 15728640, up: 2097152 },
      // 40 days ago (should show in all - NOT 1m, etc.)
      { t: now - 40 * 24 * 60 * 60 * 1000, d: 'netflix.com', down: 104857600, up: 4194304 }
    ];
    
    chrome.storage.local.set({ usageLogs: demoLogs }, () => {
      console.log("Loaded demo logs into storage.");
      loadStats();
    });
  }
}