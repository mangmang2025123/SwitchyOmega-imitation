document.addEventListener('DOMContentLoaded', function () {
  const directRadio = document.getElementById('direct');
  const systemRadio = document.getElementById('system');
  const fixedRadio = document.getElementById('fixed');
  const fixedServerSettings = document.getElementById('fixed-server-settings');
  const serverInput = document.getElementById('server');
  const portInput = document.getElementById('port');
  const saveButton = document.getElementById('save-button');

  // Show/hide fixed server settings based on selected mode
  function updateFixedServerSettingsVisibility() {
    if (fixedRadio.checked) {
      fixedServerSettings.style.display = 'block';
    } else {
      fixedServerSettings.style.display = 'none';
    }
  }

  directRadio.addEventListener('change', updateFixedServerSettingsVisibility);
  systemRadio.addEventListener('change', updateFixedServerSettingsVisibility);
  fixedRadio.addEventListener('change', updateFixedServerSettingsVisibility);

  // Load saved settings and update UI
  chrome.storage.local.get(['proxyMode', 'proxyServer', 'proxyPort'], function (result) {
    if (result.proxyMode) {
      document.querySelector(`input[name="mode"][value="${result.proxyMode}"]`).checked = true;
    }
    if (result.proxyServer) {
      serverInput.value = result.proxyServer;
    }
    if (result.proxyPort) {
      portInput.value = result.proxyPort;
    }
    updateFixedServerSettingsVisibility();
  });

  // Save settings and notify background script
  saveButton.addEventListener('click', function () {
    const mode = document.querySelector('input[name="mode"]:checked').value;
    const server = serverInput.value;
    const port = parseInt(portInput.value, 10);

    const settings = {
      proxyMode: mode,
      proxyServer: server,
      proxyPort: port
    };

    chrome.storage.local.set(settings, function () {
      chrome.runtime.sendMessage({ action: 'applyProxySettings' }, function(response) {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
        } else {
          console.log(response.status);
        }
        window.close();
      });
    });
  });
});
