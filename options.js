document.addEventListener('DOMContentLoaded', function() {
  // --- State ---
  let state = {
    profiles: [],
    autoSwitchRules: [],
    autoSwitchDefaultProfileId: null,
  };

  // --- Profile UI Elements ---
  const profilesList = document.getElementById('profiles-list');
  const addNewProfileBtn = document.getElementById('add-new-profile-btn');
  const editProfileFormContainer = document.getElementById('edit-profile-form-container');
  const profileFormTitle = document.getElementById('profile-form-title');
  const profileForm = document.getElementById('profile-form');
  const profileIdInput = document.getElementById('profile-id');
  const profileNameInput = document.getElementById('profile-name');
  const profileSchemeInput = document.getElementById('profile-scheme');
  const profileHostInput = document.getElementById('profile-host');
  const profilePortInput = document.getElementById('profile-port');
  const cancelEditProfileBtn = document.getElementById('cancel-edit-profile-btn');

  // --- Auto-Switch UI Elements ---
  const autoSwitchDefaultSelect = document.getElementById('auto-switch-default');
  const rulesList = document.getElementById('rules-list');
  const addNewRuleBtn = document.getElementById('add-new-rule-btn');
  const editRuleFormContainer = document.getElementById('edit-rule-form-container');
  const ruleFormTitle = document.getElementById('rule-form-title');
  const ruleForm = document.getElementById('rule-form');
  const ruleIdInput = document.getElementById('rule-id');
  const rulePatternInput = document.getElementById('rule-pattern');
  const ruleProfileSelect = document.getElementById('rule-profile');
  const cancelEditRuleBtn = document.getElementById('cancel-edit-rule-btn');

  // --- Data Access ---
  function loadData(callback) {
    const keys = ['profiles', 'autoSwitchRules', 'autoSwitchDefaultProfileId'];
    chrome.storage.local.get(keys, (data) => {
      state.profiles = data.profiles || [];
      state.autoSwitchRules = data.autoSwitchRules || [];
      state.autoSwitchDefaultProfileId = data.autoSwitchDefaultProfileId || null;
      if (callback) callback();
    });
  }

  function saveData(dataToSave, callback) {
    chrome.storage.local.set(dataToSave, callback);
  }

  // --- Profile UI Logic ---
  function renderProfiles() {
    profilesList.innerHTML = '';
    state.profiles.forEach(p => {
      const item = document.createElement('li');
      item.className = 'item-list-item';
      item.innerHTML = `
        <div class="item-details"><span class="item-name">${p.name}</span><div class="item-config">${p.scheme}://${p.host}:${p.port}</div></div>
        <div class="item-actions"><button class="edit-profile-btn" data-id="${p.id}">Edit</button><button class="delete-profile-btn" data-id="${p.id}">Delete</button></div>`;
      profilesList.appendChild(item);
    });
  }

  function showProfileForm(isEdit = false, profile = null) {
    profileForm.reset();
    profileFormTitle.textContent = isEdit ? 'Edit Profile' : 'Add New Profile';
    profileIdInput.value = isEdit ? profile.id : '';
    if (isEdit) {
      profileNameInput.value = profile.name;
      profileSchemeInput.value = profile.scheme;
      profileHostInput.value = profile.host;
      profilePortInput.value = profile.port;
    }
    editProfileFormContainer.style.display = 'block';
  }

  function hideProfileForm() {
    editProfileFormContainer.style.display = 'none';
  }

  function handleSaveProfile(e) {
    e.preventDefault();
    const id = profileIdInput.value ? Number(profileIdInput.value) : Date.now();
    const newProfile = { id, name: profileNameInput.value.trim(), scheme: profileSchemeInput.value, host: profileHostInput.value.trim(), port: parseInt(profilePortInput.value, 10) };
    if (!newProfile.name || !newProfile.host || !newProfile.port) return;

    const updatedProfiles = profileIdInput.value ? state.profiles.map(p => p.id === id ? newProfile : p) : [...state.profiles, newProfile];
    state.profiles = updatedProfiles;
    saveData({ profiles: updatedProfiles }, () => {
      renderAll();
      hideProfileForm();
    });
  }

  function handleDeleteProfile(id) {
    if (!confirm('Are you sure you want to delete this profile? This will also remove any auto-switch rules using it.')) return;
    state.profiles = state.profiles.filter(p => p.id !== id);
    state.autoSwitchRules = state.autoSwitchRules.filter(r => r.profileId !== id);
    if (state.autoSwitchDefaultProfileId === id) state.autoSwitchDefaultProfileId = null;
    if (state.activeMode === id) state.activeMode = 'direct';
    saveData(state, renderAll);
  }

  // --- Auto-Switch UI Logic ---
  function renderAutoSwitchSettings() {
    // Populate default profile dropdown
    autoSwitchDefaultSelect.innerHTML = '<option value="null">Use Direct Connection</option>';
    state.profiles.forEach(p => autoSwitchDefaultSelect.add(new Option(p.name, p.id)));
    autoSwitchDefaultSelect.value = state.autoSwitchDefaultProfileId || 'null';

    // Populate rule profile dropdown
    ruleProfileSelect.innerHTML = '';
    state.profiles.forEach(p => ruleProfileSelect.add(new Option(p.name, p.id)));

    // Render rules list
    rulesList.innerHTML = '';
    state.autoSwitchRules.forEach(r => {
      const profile = state.profiles.find(p => p.id === r.profileId);
      const profileName = profile ? profile.name : 'N/A';
      const item = document.createElement('li');
      item.className = 'item-list-item';
      item.innerHTML = `
        <div class="item-details"><span class="item-name">${r.pattern}</span><div class="item-config">→ ${profileName}</div></div>
        <div class="item-actions"><button class="edit-rule-btn" data-id="${r.id}">Edit</button><button class="delete-rule-btn" data-id="${r.id}">Delete</button></div>`;
      rulesList.appendChild(item);
    });
  }

  function showRuleForm(isEdit = false, rule = null) {
    ruleForm.reset();
    ruleFormTitle.textContent = isEdit ? 'Edit Rule' : 'Add New Rule';
    ruleIdInput.value = isEdit ? rule.id : '';
    if (isEdit) {
      rulePatternInput.value = rule.pattern;
      ruleProfileSelect.value = rule.profileId;
    }
    editRuleFormContainer.style.display = 'block';
  }

  function hideRuleForm() {
    editRuleFormContainer.style.display = 'none';
  }

  function handleSaveRule(e) {
    e.preventDefault();
    const id = ruleIdInput.value ? Number(ruleIdInput.value) : Date.now();
    const newRule = { id, pattern: rulePatternInput.value.trim(), profileId: Number(ruleProfileSelect.value) };
    if (!newRule.pattern || !newRule.profileId) return;

    const updatedRules = ruleIdInput.value ? state.autoSwitchRules.map(r => r.id === id ? newRule : r) : [...state.autoSwitchRules, newRule];
    state.autoSwitchRules = updatedRules;
    saveData({ autoSwitchRules: updatedRules }, () => {
      renderAutoSwitchSettings();
      hideRuleForm();
    });
  }

  function handleDeleteRule(id) {
    if (!confirm('Are you sure?')) return;
    state.autoSwitchRules = state.autoSwitchRules.filter(r => r.id !== id);
    saveData({ autoSwitchRules: state.autoSwitchRules }, renderAutoSwitchSettings);
  }

  function handleDefaultProfileChange() {
    const newDefaultId = autoSwitchDefaultSelect.value === 'null' ? null : Number(autoSwitchDefaultSelect.value);
    state.autoSwitchDefaultProfileId = newDefaultId;
    saveData({ autoSwitchDefaultProfileId: newDefaultId });
  }

  // --- Initialization & Event Listeners ---
  function renderAll() {
    renderProfiles();
    renderAutoSwitchSettings();
  }

  function init() {
    loadData(() => {
      renderAll();
      hideProfileForm();
      hideRuleForm();
    });

    // Profile listeners
    addNewProfileBtn.addEventListener('click', () => showProfileForm());
    cancelEditProfileBtn.addEventListener('click', hideProfileForm);
    profileForm.addEventListener('submit', handleSaveProfile);
    profilesList.addEventListener('click', (e) => {
      if (e.target.classList.contains('edit-profile-btn')) showProfileForm(true, state.profiles.find(p => p.id === Number(e.target.dataset.id)));
      if (e.target.classList.contains('delete-profile-btn')) handleDeleteProfile(Number(e.target.dataset.id));
    });

    // Auto-switch listeners
    addNewRuleBtn.addEventListener('click', () => showRuleForm());
    cancelEditRuleBtn.addEventListener('click', hideRuleForm);
    ruleForm.addEventListener('submit', handleSaveRule);
    rulesList.addEventListener('click', (e) => {
      if (e.target.classList.contains('edit-rule-btn')) showRuleForm(true, state.autoSwitchRules.find(r => r.id === Number(e.target.dataset.id)));
      if (e.target.classList.contains('delete-rule-btn')) handleDeleteRule(Number(e.target.dataset.id));
    });
    autoSwitchDefaultSelect.addEventListener('change', handleDefaultProfileChange);
  }

  init();
});
