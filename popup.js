document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  document.getElementById('resetBtn').addEventListener('click', resetData);
});

function loadStats() {
  chrome.storage.local.get(['dataUsage'], (result) => {
    const usage = result.dataUsage || {};
    const tbody = document.getElementById('usageBody');
    tbody.innerHTML = '';
    let totalDown = 0, totalUp = 0;

    // Sort by total bytes (download + upload) descending
    const sorted = Object.keys(usage).sort((a, b) => {
      const totalA = usage[a].downloaded + usage[a].uploaded;
      const totalB = usage[b].downloaded + usage[b].uploaded;
      return totalB - totalA;
    });

    if (sorted.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="empty">No data yet. Browse some sites!</td></tr>`;
    } else {
      for (const domain of sorted) {
        const data = usage[domain];
        const downMB = (data.downloaded / (1024 * 1024)).toFixed(2);
        const upMB = (data.uploaded / (1024 * 1024)).toFixed(2);
        const totalMB = ((data.downloaded + data.uploaded) / (1024 * 1024)).toFixed(2);
        totalDown += data.downloaded;
        totalUp += data.uploaded;

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${domain}</td>
          <td class="num">${downMB}</td>
          <td class="num">${upMB}</td>
          <td class="num">${totalMB}</td>
        `;
        tbody.appendChild(tr);
      }
    }

    document.getElementById('total').innerHTML = `
      <span>${(totalDown / (1024 * 1024)).toFixed(2)} MB</span>
      <span>${(totalUp / (1024 * 1024)).toFixed(2)} MB</span>
      <span>${((totalDown + totalUp) / (1024 * 1024)).toFixed(2)} MB</span>
    `;
  });
}

function resetData() {
  if (confirm('Delete all stored usage data?')) {
    chrome.storage.local.remove('dataUsage', () => {
      loadStats();
    });
  }
}