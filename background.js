function applyProxySettings() {
  chrome.storage.local.get(['proxyMode', 'proxyScheme', 'proxyServer', 'proxyPort'], function (result) {
    let config = {
      mode: 'direct'
    };

    if (result.proxyMode === 'system') {
      config.mode = 'system';
    } else if (result.proxyMode === 'fixed' && result.proxyServer && result.proxyPort) {
      config = {
        mode: 'fixed_servers',
        rules: {
          singleProxy: {
            scheme: result.proxyScheme || 'http', // Use saved scheme, default to http
            host: result.proxyServer,
            port: result.proxyPort
          },
          bypassList: ['<local>']
        }
      };
    }

    chrome.proxy.settings.set({ value: config, scope: 'regular' }, function () {
      if (chrome.runtime.lastError) {
        console.error('Error setting proxy:', chrome.runtime.lastError);
      } else {
        console.log('Proxy settings applied:', config);
      }
    });
  });
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === 'applyProxySettings') {
    applyProxySettings();
    sendResponse({ status: 'Proxy settings applied' });
  }
  return true;
});

chrome.runtime.onStartup.addListener(function () {
  applyProxySettings();
});

// Apply settings on install/update as well
chrome.runtime.onInstalled.addListener(function() {
  applyProxySettings();
});
