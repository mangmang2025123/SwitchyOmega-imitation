// On installation or update, migrate old settings to the new profile-based structure.
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
    // Check if the new 'profiles' structure already exists.
    if (data.profiles !== undefined) {
      console.log('Profile structure already exists. No migration needed.');
      applyProxySettings();
      return;
    }

    // If old settings exist, migrate them.
    if (data.proxyMode) {
      console.log('Old settings found. Migrating to new profile structure.');
      const defaultProfile = {
        id: Date.now(), // Unique ID for the profile
        name: 'Default Profile',
        scheme: data.proxyScheme || 'http',
        host: data.proxyServer || '',
        port: data.proxyPort || 80
      };

      const newSettings = {
        profiles: [defaultProfile],
        // If the old mode was 'fixed', the new activeMode is the ID of the created profile.
        // Otherwise, it's 'direct' or 'system'.
        activeMode: data.proxyMode === 'fixed' ? defaultProfile.id : data.proxyMode
      };

      chrome.storage.local.set(newSettings, function() {
        // Remove old, redundant keys.
        chrome.storage.local.remove(['proxyMode', 'proxyScheme', 'proxyServer', 'proxyPort']);
        console.log('Migration complete. New settings:', newSettings);
        applyProxySettings();
      });
    } else {
      // If no settings exist at all (fresh install), create a default structure.
      console.log('No settings found. Initializing with default structure.');
      const initialSettings = {
        profiles: [],
        activeMode: 'direct' // Default to 'direct' mode
      };
      chrome.storage.local.set(initialSettings, function() {
        console.log('Initial settings saved:', initialSettings);
        applyProxySettings();
      });
    }
  });
}

/**
 * Reads the current settings from storage and applies the proxy configuration.
 */
function applyProxySettings() {
  chrome.storage.local.get(['profiles', 'activeMode'], function(data) {
    let config = { mode: 'direct' }; // Default to direct
    const { profiles, activeMode } = data;

    if (!activeMode) {
      // If settings haven't been initialized, do nothing or default to direct.
      chrome.proxy.settings.set({ value: config, scope: 'regular' });
      return;
    }

    if (activeMode === 'system') {
      config.mode = 'system';
    } else if (typeof activeMode === 'number') {
      // If activeMode is a number, it's a profile ID.
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
    // If activeMode is 'direct' or an unknown profile, the default 'direct' config is used.

    chrome.proxy.settings.set({ value: config, scope: 'regular' }, function() {
      if (chrome.runtime.lastError) {
        console.error('Error setting proxy:', chrome.runtime.lastError);
      } else {
        console.log('Proxy settings applied:', config);
      }
    });
  });
}
