// Content script to handle real-time typing and suggestions
console.log("GrammarHelper content script loaded");

// Keep track of active editable elements
let activeElement = null;
// Store the last analyzed text to avoid duplicate calls
let lastAnalyzedText = '';
// Store timer for typing pause detection
let typingTimer = null;
// Define typing pause delay (2 seconds)
const typingPauseDelay = 2000;

// Listen for focus events on editable elements
document.addEventListener('focusin', (event) => {
  if (isEditableElement(event.target)) {
    console.log("GrammarHelper: Focused on editable element");
    activeElement = event.target;
    // Check existing content when focusing
    if (getElementText(event.target).trim().length > 10) {
      startTypingTimer(event.target);
    }
  }
});

// Listen for blur events
document.addEventListener('blur', (event) => {
  if (event.target === activeElement) {
    clearTimeout(typingTimer);
    activeElement = null;
  }
});

// Listen for input events for live suggestions
document.addEventListener('input', (event) => {
  if (!isEditableElement(event.target)) return;
  
  // Always analyze text after typing pauses - auto-correct is enabled by default
  // Clear previous timer
  clearTimeout(typingTimer);
  
  // Start a new timer for this input
  startTypingTimer(event.target);
});

// Function to start typing timer
function startTypingTimer(element) {
  // Clear any existing timer
  clearTimeout(typingTimer);
  
  // Set a new timer
  typingTimer = setTimeout(() => {
    const text = getElementText(element);
    
    // Only analyze text if it's substantial and different from last analysis
    if (text.trim().length > 10 && text !== lastAnalyzedText) {
      console.log("GrammarHelper: Typing paused, analyzing text");
      lastAnalyzedText = text;
      
      // Always check grammar - auto-correct is enabled by default
      requestGrammarAnalysis(text, element);
    }
  }, typingPauseDelay);
}

// Function to request grammar analysis from background script
function requestGrammarAnalysis(text, element) {
  chrome.runtime.sendMessage({
    action: "analyzeText",
    text: text
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("GrammarHelper: Error communicating with background", chrome.runtime.lastError);
      return;
    }
    
    if (response && response.success) {
      // Show suggestion popup
      if (text !== response.correctedText) {
        showSuggestionPopup(element, text, response.correctedText);
      }
    }
  });
}

// Function to show suggestion popup near the current element
function showSuggestionPopup(element, originalText, correctedText) {
  // Don't show popup if texts are identical
  if (originalText === correctedText) return;
  
  // Remove any existing popups
  removeExistingPopups();
  
  // Create popup element
  const popup = document.createElement('div');
  popup.id = 'grammar-helper-suggestion-popup';
  popup.className = 'grammar-helper-suggestion-popup';
  
  // Determine if we should show detailed comparison or simple suggestion
  if (originalText.length > 100 || countDifferences(originalText, correctedText) > 3) {
    // For longer text or multiple corrections, show full comparison
    popup.innerHTML = `
      <div class="grammar-helper-header">
        <h3>Grammar Suggestions</h3>
        <button class="grammar-helper-close">×</button>
      </div>
      <div class="grammar-helper-content">
        <div class="grammar-helper-original">
          <h4>Original Text:</h4>
          <p>${originalText}</p>
        </div>
        <div class="grammar-helper-corrected">
          <h4>Corrected Text:</h4>
          <p>${correctedText}</p>
        </div>
      </div>
      <div class="grammar-helper-actions">
        <button class="grammar-helper-apply">Apply Corrections</button>
      </div>
    `;
  } else {
    // For simpler corrections, show a compact suggestion
    popup.innerHTML = `
      <div class="grammar-helper-header">
        <h3>Suggestion</h3>
        <button class="grammar-helper-close">×</button>
      </div>
      <div class="grammar-helper-content">
        <p>Did you mean: <strong>${correctedText}</strong></p>
      </div>
      <div class="grammar-helper-actions">
        <button class="grammar-helper-apply">Apply</button>
        <button class="grammar-helper-ignore">Ignore</button>
      </div>
    `;
  }
  
  // Add popup to page
  document.body.appendChild(popup);
  
  // Position popup near the element
  positionPopupNearElement(popup, element);
  
  // Add event listeners
  popup.querySelector('.grammar-helper-close').addEventListener('click', () => {
    document.body.removeChild(popup);
  });
  
  popup.querySelector('.grammar-helper-apply').addEventListener('click', () => {
    // Apply correction to element
    setElementText(element, correctedText);
    
    // Show brief notification
    showNotification('Correction applied!');
    
    // Remove popup
    document.body.removeChild(popup);
  });
  
  const ignoreButton = popup.querySelector('.grammar-helper-ignore');
  if (ignoreButton) {
    ignoreButton.addEventListener('click', () => {
      document.body.removeChild(popup);
    });
  }
  
  // Automatically remove popup if user continues typing
  element.addEventListener('input', function removePopupOnType() {
    if (document.body.contains(popup)) {
      document.body.removeChild(popup);
    }
    element.removeEventListener('input', removePopupOnType);
  });
}

// Helper function to position popup near element
function positionPopupNearElement(popup, element) {
  const rect = element.getBoundingClientRect();
  
  // Default position below the element
  let top = rect.bottom + window.scrollY + 10;
  let left = rect.left + window.scrollX;
  
  // Check if the popup would go off-screen to the right
  if (left + popup.offsetWidth > window.innerWidth) {
    left = window.innerWidth - popup.offsetWidth - 20;
  }
  
  // Check if popup would go off-screen at the bottom
  if (top + popup.offsetHeight > window.innerHeight + window.scrollY) {
    // Position it above the element instead
    top = rect.top + window.scrollY - popup.offsetHeight - 10;
  }
  
  // Set final position
  popup.style.top = `${top}px`;
  popup.style.left = `${left}px`;
}

// Remove any existing suggestion popups
function removeExistingPopups() {
  const existingPopup = document.getElementById('grammar-helper-suggestion-popup');
  if (existingPopup) {
    document.body.removeChild(existingPopup);
  }
}

// Show notification message
function showNotification(message, isError = false) {
  const notification = document.createElement('div');
  notification.className = `grammar-helper-notification ${isError ? 'error' : ''}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Remove after 2 seconds
  setTimeout(() => {
    if (document.body.contains(notification)) {
      document.body.removeChild(notification);
    }
  }, 2000);
}

// Helper function to count differences between original and corrected text
function countDifferences(original, corrected) {
  // Simple implementation - just count word differences
  const originalWords = original.toLowerCase().split(/\s+/);
  const correctedWords = corrected.toLowerCase().split(/\s+/);
  
  let differences = 0;
  const maxLength = Math.max(originalWords.length, correctedWords.length);
  
  for (let i = 0; i < maxLength; i++) {
    if (i >= originalWords.length || i >= correctedWords.length || originalWords[i] !== correctedWords[i]) {
      differences++;
    }
  }
  
  return differences;
}

// Function to check if an element is editable
function isEditableElement(element) {
  return element.isContentEditable || 
         (element.tagName === 'INPUT' && element.type !== 'checkbox' && element.type !== 'radio') || 
         element.tagName === 'TEXTAREA';
}

// Function to get text from an element
function getElementText(element) {
  if (element.isContentEditable) {
    return element.innerText;
  } else {
    return element.value;
  }
}

// Function to set text in an element
function setElementText(element, text) {
  if (element.isContentEditable) {
    element.innerText = text;
  } else {
    element.value = text;
  }
}

// Listen for messages from background script for direct actions
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("GrammarHelper content: Message received", request.action);
  
  if (request.action === "correctGrammar") {
    // This is for the context menu correction
    // No longer handling this here - letting the background script handle it
    sendResponse({success: true, status: "handled by background"});
  }
  
  // Always return true for async response
  return true;
});