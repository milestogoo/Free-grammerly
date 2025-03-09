// Get DOM elements
const apiKeyInput = document.getElementById('apiKey');
const tokenSavingModeToggle = document.getElementById('tokenSavingMode');
const minTextLengthInput = document.getElementById('minTextLength');
const maxTextLengthInput = document.getElementById('maxTextLength');
const typingPauseDelayInput = document.getElementById('typingPauseDelay');
const saveButton = document.getElementById('saveSettings');
const statusDiv = document.getElementById('status');
const defaultApiKey = "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";

// Load saved settings when popup opens
document.addEventListener('DOMContentLoaded', loadSettings);

// Save settings when the save button is clicked
saveButton.addEventListener('click', saveSettings);

// Add input validation
minTextLengthInput.addEventListener('change', validateMinLength);
maxTextLengthInput.addEventListener('change', validateMaxLength);
typingPauseDelayInput.addEventListener('change', validatePauseDelay);

// Function to validate minimum text length
function validateMinLength() {
  const minValue = parseInt(minTextLengthInput.value);
  if (isNaN(minValue) || minValue < 5) {
    minTextLengthInput.value = 5;
  } else if (minValue > 50) {
    minTextLengthInput.value = 50;
  }
}

// Function to validate maximum text length
function validateMaxLength() {
  const maxValue = parseInt(maxTextLengthInput.value);
  if (isNaN(maxValue) || maxValue < 100) {
    maxTextLengthInput.value = 100;
  } else if (maxValue > 1000) {
    maxTextLengthInput.value = 1000;
  }
  
  // Ensure max is greater than min
  const minValue = parseInt(minTextLengthInput.value);
  if (maxValue <= minValue) {
    maxTextLengthInput.value = minValue + 50;
  }
}

// Function to validate typing pause delay
function validatePauseDelay() {
  const delayValue = parseInt(typingPauseDelayInput.value);
  if (isNaN(delayValue) || delayValue < 200) {
    typingPauseDelayInput.value = 200;
  } else if (delayValue > 2000) {
    typingPauseDelayInput.value = 2000;
  }
}

// Function to load settings from storage
function loadSettings() {
  chrome.storage.sync.get(
    {
      apiKey: defaultApiKey,
      tokenSavingMode: true,
      minTextLength: 15,
      maxTextLength: 500,
      typingPauseDelay: 500
    },
    (items) => {
      apiKeyInput.value = items.apiKey || defaultApiKey;
      tokenSavingModeToggle.checked = items.tokenSavingMode;
      minTextLengthInput.value = items.minTextLength;
      maxTextLengthInput.value = items.maxTextLength;
      typingPauseDelayInput.value = items.typingPauseDelay;
    }
  );
}

// Function to save settings to storage
function saveSettings() {
  // Validate input values before saving
  validateMinLength();
  validateMaxLength();
  validatePauseDelay();
  
  const settings = {
    apiKey: apiKeyInput.value.trim() || defaultApiKey,
    tokenSavingMode: tokenSavingModeToggle.checked,
    minTextLength: parseInt(minTextLengthInput.value),
    maxTextLength: parseInt(maxTextLengthInput.value),
    typingPauseDelay: parseInt(typingPauseDelayInput.value)
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