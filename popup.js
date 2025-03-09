// Get DOM elements
const apiKeyInput = document.getElementById('apiKey');
const autoCorrectToggle = document.getElementById('autoCorrect');
const highlightErrorsToggle = document.getElementById('highlightErrors');
const saveButton = document.getElementById('saveSettings');
const statusDiv = document.getElementById('status');
const defaultApiKey = "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";

// Load saved settings when popup opens
document.addEventListener('DOMContentLoaded', loadSettings);

// Save settings when the save button is clicked
saveButton.addEventListener('click', saveSettings);

// Function to load settings from storage
function loadSettings() {
  chrome.storage.sync.get(
    {
      apiKey: defaultApiKey,
      autoCorrect: true,
      highlightErrors: true
    },
    (items) => {
      apiKeyInput.value = items.apiKey || defaultApiKey;
      autoCorrectToggle.checked = items.autoCorrect;
      highlightErrorsToggle.checked = items.highlightErrors;
    }
  );
}

// Function to save settings to storage
function saveSettings() {
  const settings = {
    apiKey: apiKeyInput.value.trim() || defaultApiKey,
    autoCorrect: autoCorrectToggle.checked,
    highlightErrors: highlightErrorsToggle.checked
  };
  
  chrome.storage.sync.set(settings, () => {
    if (chrome.runtime.lastError) {
      showStatus('Error saving settings: ' + chrome.runtime.lastError.message, 'error');
    } else {
      showStatus('Settings saved successfully!', 'success');
    }
  });
}

// Function to show status message
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = 'status ' + type;
  
  // Hide the status message after 5 seconds if it's a success message
  if (type === 'success') {
    setTimeout(() => {
      statusDiv.className = 'status';
    }, 5000);
  }
}