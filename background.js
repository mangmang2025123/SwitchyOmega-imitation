// On installation or update, migrate old settings or initialize new ones.
chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === 'install' || details.reason === 'update') {
    initializeSettings();
  }
});

// On browser startup, apply the saved proxy settings.
chrome.runtime.onStartup.addListener(function() {
  applyProxySettings();
});

// Listen for messages from the popup to apply settings immediately.
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'applyProxySettings') {
    applyProxySettings();
    sendResponse({ status: 'Proxy settings applied' });
  }
  return true;
});

/**
 * Initializes settings on first install or migrates them on update.
 */
function initializeSettings() {
  chrome.storage.local.get(null, function(data) {
    let needsUpdate = false;
    let newSettings = { ...data };

    if (data.profiles === undefined) {
      needsUpdate = true;
      if (data.proxyMode) {
        const defaultProfile = { id: Date.now(), name: 'Default Profile', scheme: data.proxyScheme || 'http', host: data.proxyServer || '', port: data.proxyPort || 80 };
        newSettings.profiles = [defaultProfile];
        newSettings.activeMode = data.proxyMode === 'fixed' ? defaultProfile.id : data.proxyMode;
      } else {
        newSettings.profiles = [];
        newSettings.activeMode = 'direct';
      }
    }
    if (data.autoSwitchRules === undefined) {
      needsUpdate = true;
      newSettings.autoSwitchRules = [];
    }
    if (data.autoSwitchDefaultProfileId === undefined) {
      needsUpdate = true;
      newSettings.autoSwitchDefaultProfileId = null;
    }

    if (needsUpdate) {
      chrome.storage.local.set(newSettings, function() {
        chrome.storage.local.remove(['proxyMode', 'proxyScheme', 'proxyServer', 'proxyPort']);
        applyProxySettings();
      });
    } else {
      applyProxySettings();
    }
  });
}

/**
 * Converts a profile scheme to the correct PAC script proxy type.
 * @param {string} scheme - The scheme from the profile (e.g., 'http', 'socks5').
 * @returns {string} The corresponding PAC script proxy type (e.g., 'PROXY', 'SOCKS5').
 */
function getPacProxyType(scheme) {
  switch (scheme.toLowerCase()) {
    case 'http':
    case 'https':
      return 'PROXY';
    case 'socks4':
      return 'SOCKS4';
    case 'socks5':
      return 'SOCKS5';
    default:
      return 'PROXY'; // Default to PROXY for unknown types
  }
}

/**
 * Generates a PAC script string from the stored rules and profiles.
 */
function generatePacScript(rules, profiles, defaultProfileId) {
  let script = `function FindProxyForURL(url, host) {\n`;
  rules.forEach(rule => {
    const profile = profiles.find(p => p.id === rule.profileId);
    if (profile && rule.pattern) {
      const sanitizedPattern = rule.pattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const proxyType = getPacProxyType(profile.scheme);
      const proxyString = `${proxyType} ${profile.host}:${profile.port}`;
      script += `  if (shExpMatch(host, "${sanitizedPattern}")) { return "${proxyString}"; }\n`;
    }
  });
  const defaultProfile = profiles.find(p => p.id === defaultProfileId);
  if (defaultProfile) {
    const proxyType = getPacProxyType(defaultProfile.scheme);
    const proxyString = `${proxyType} ${defaultProfile.host}:${defaultProfile.port}`;
    script += `  return "${proxyString}";\n`;
  } else {
    script += `  return "DIRECT";\n`;
  }
  script += `}\n`;
  return script;
}

/**
 * Reads the current settings from storage and applies the proxy configuration.
 */
function applyProxySettings() {
  const keys = ['profiles', 'activeMode', 'autoSwitchRules', 'autoSwitchDefaultProfileId'];
  chrome.storage.local.get(keys, function(data) {
    let config = { mode: 'direct' }; // Default to direct
    const { profiles, activeMode, autoSwitchRules, autoSwitchDefaultProfileId } = data;

    if (!activeMode) {
      chrome.proxy.settings.set({ value: config, scope: 'regular' });
      return;
    }

    if (activeMode === 'system') {
      config.mode = 'system';
    } else if (activeMode === 'auto-switch') {
      const pacScript = generatePacScript(autoSwitchRules, profiles, autoSwitchDefaultProfileId);
      config = {
        mode: 'pac_script',
        pacScript: {
          data: pacScript
        }
      };
    } else if (typeof activeMode === 'number') {
      const activeProfile = profiles.find(p => p.id === activeMode);
      if (activeProfile) {
        config = {
          mode: 'fixed_servers',
          rules: {
            singleProxy: {
              scheme: activeProfile.scheme,
              host: activeProfile.host,
              port: activeProfile.port
            },
            bypassList: ['<local>']
          }
        };
      }
    }

    chrome.proxy.settings.set({ value: config, scope: 'regular' }, function() {
      if (chrome.runtime.lastError) {
        console.error('Error setting proxy:', chrome.runtime.lastError);
      } else {
        console.log('Proxy settings applied:', config);
      }
    });
  });
}
