document.addEventListener('DOMContentLoaded', function() {
  const profilesList = document.getElementById('profiles-list');
  const addNewProfileBtn = document.getElementById('add-new-profile-btn');
  const editFormContainer = document.getElementById('edit-form-container');
  const formTitle = document.getElementById('form-title');
  const profileForm = document.getElementById('profile-form');
  const profileIdInput = document.getElementById('profile-id');
  const profileNameInput = document.getElementById('profile-name');
  const profileSchemeInput = document.getElementById('profile-scheme');
  const profileHostInput = document.getElementById('profile-host');
  const profilePortInput = document.getElementById('profile-port');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');

  let profiles = [];

  // --- Data Access ---
  function getProfiles(callback) {
    chrome.storage.local.get('profiles', function(data) {
      profiles = data.profiles || [];
      callback(profiles);
    });
  }

  function saveProfiles(newProfiles, callback) {
    chrome.storage.local.set({ profiles: newProfiles }, function() {
      profiles = newProfiles;
      if (callback) callback();
    });
  }

  // --- UI Rendering ---
  function renderProfiles() {
    profilesList.innerHTML = '';
    if (profiles.length === 0) {
      profilesList.innerHTML = '<p>No profiles created yet.</p>';
      return;
    }

    profiles.forEach(profile => {
      const item = document.createElement('li');
      item.className = 'profile-item';
      item.innerHTML = `
        <div class="profile-details">
          <span class="profile-name">${profile.name}</span>
          <div class="profile-config">${profile.scheme}://${profile.host}:${profile.port}</div>
        </div>
        <div class="profile-actions">
          <button class="edit-btn" data-id="${profile.id}">Edit</button>
          <button class="delete-btn" data-id="${profile.id}">Delete</button>
        </div>
      `;
      profilesList.appendChild(item);
    });
  }

  function showForm(isEdit = false, profile = null) {
    profileForm.reset();
    if (isEdit && profile) {
      formTitle.textContent = 'Edit Profile';
      profileIdInput.value = profile.id;
      profileNameInput.value = profile.name;
      profileSchemeInput.value = profile.scheme;
      profileHostInput.value = profile.host;
      profilePortInput.value = profile.port;
    } else {
      formTitle.textContent = 'Add New Profile';
      profileIdInput.value = '';
    }
    editFormContainer.style.display = 'block';
  }

  function hideForm() {
    editFormContainer.style.display = 'none';
  }

  // --- Event Handlers ---
  function handleSave(event) {
    event.preventDefault();
    const id = profileIdInput.value ? Number(profileIdInput.value) : Date.now();
    const newProfileData = {
      id: id,
      name: profileNameInput.value.trim(),
      scheme: profileSchemeInput.value,
      host: profileHostInput.value.trim(),
      port: parseInt(profilePortInput.value, 10)
    };

    if (!newProfileData.name || !newProfileData.host || !newProfileData.port) {
      alert('Please fill out all fields.');
      return;
    }

    let updatedProfiles;
    if (profileIdInput.value) { // Editing existing
      updatedProfiles = profiles.map(p => p.id === id ? newProfileData : p);
    } else { // Adding new
      updatedProfiles = [...profiles, newProfileData];
    }

    saveProfiles(updatedProfiles, () => {
      renderProfiles();
      hideForm();
    });
  }

  function handleEdit(event) {
    if (event.target.classList.contains('edit-btn')) {
      const id = Number(event.target.dataset.id);
      const profileToEdit = profiles.find(p => p.id === id);
      if (profileToEdit) {
        showForm(true, profileToEdit);
      }
    }
  }

  function handleDelete(event) {
    if (event.target.classList.contains('delete-btn')) {
      if (!confirm('Are you sure you want to delete this profile?')) {
        return;
      }
      const id = Number(event.target.dataset.id);
      const updatedProfiles = profiles.filter(p => p.id !== id);

      // Also need to check if the deleted profile was the active one.
      chrome.storage.local.get('activeMode', function(data) {
        if (data.activeMode === id) {
          // If it was, reset activeMode to 'direct'.
          chrome.storage.local.set({ activeMode: 'direct' });
        }
      });

      saveProfiles(updatedProfiles, renderProfiles);
    }
  }


  // --- Initialization ---
  function init() {
    getProfiles(renderProfiles);
    hideForm();

    addNewProfileBtn.addEventListener('click', () => showForm());
    cancelEditBtn.addEventListener('click', hideForm);
    profileForm.addEventListener('submit', handleSave);
    profilesList.addEventListener('click', handleEdit);
    profilesList.addEventListener('click', handleDelete);
  }

  init();
});
