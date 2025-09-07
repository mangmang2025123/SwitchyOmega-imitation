document.addEventListener('DOMContentLoaded', function() {
  const modeSelection = document.getElementById('mode-selection');
  const applyBtn = document.getElementById('apply-btn');
  const manageProfilesBtn = document.getElementById('manage-profiles-btn');

  /**
   * Fetches profiles and activeMode from storage and populates the dropdown.
   */
  function loadAndRenderModes() {
    chrome.storage.local.get(['profiles', 'activeMode'], function(data) {
      const profiles = data.profiles || [];
      const activeMode = data.activeMode || 'direct';

      // Clear previous options
      modeSelection.innerHTML = '';

      // Add static options
      modeSelection.add(new Option('Direct Connection', 'direct'));
      modeSelection.add(new Option('System Proxy', 'system'));

      // Add Auto Switch Mode
      const autoSwitchOption = new Option('Auto Switch', 'auto-switch');
      modeSelection.add(autoSwitchOption);


      // Add a separator if there are profiles
      if (profiles.length > 0) {
        const separator = new Option('--- Profiles ---', '');
        separator.disabled = true;
        modeSelection.add(separator);
      }

      // Add options for each profile
      profiles.forEach(profile => {
        const profileOption = new Option(profile.name, profile.id);
        modeSelection.add(profileOption);
      });

      // Set the selected option
      modeSelection.value = activeMode;
    });
  }

  /**
   * Saves the selected mode to storage and tells the background script to apply it.
   */
  function handleApply() {
    let selectedValue = modeSelection.value;

    // The value from the <select> is a string, but profile IDs are numbers.
    if (!isNaN(selectedValue) && selectedValue !== '') {
      selectedValue = Number(selectedValue);
    }

    chrome.storage.local.set({ activeMode: selectedValue }, function() {
      chrome.runtime.sendMessage({ action: 'applyProxySettings' }, function(response) {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
        } else {
          console.log(response.status);
        }
        window.close();
      });
    });
  }

  /**
   * Opens the options page in a new tab.
   */
  function openOptionsPage() {
    chrome.runtime.openOptionsPage();
  }

  // --- Initialization ---
  loadAndRenderModes();
  applyBtn.addEventListener('click', handleApply);
  manageProfilesBtn.addEventListener('click', openOptionsPage);
});
