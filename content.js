// Content script optimized to auto-apply corrections
console.log("GrammarHelper content script loaded");

// Keep track of active editable elements
let activeElement = null;
// Store the last analyzed text to avoid duplicate calls
let lastAnalyzedText = '';
// Store timer for typing pause detection
let typingTimer = null;
// Define typing pause delay (500ms)
const typingPauseDelay = 500;
// Minimum text length to trigger analysis
const MIN_TEXT_LENGTH = 5;
// Maximum text length to analyze (to save tokens)
const MAX_TEXT_LENGTH = 500;
// Store original text before correction
let originalText = '';
// Store corrected text
let correctedText = '';
// Flag to track if a correction is currently visible
let correctionPopupVisible = false;

// List of important elements to focus on
const IMPORTANT_SELECTORS = [
  'textarea',
  'input[type="text"]',
  '[contenteditable="true"]',
  '[role="textbox"]',
  '.editor-content',
  '.text-input',
  // Common form selectors
  'form textarea',
  'form input[type="text"]',
  // Common email selectors
  '.compose-message',
  '.email-body',
  // Common document editor selectors
  '.document-editor',
  // Social media post selectors
  '.post-composer',
  '.status-input',
  // Comment form selectors
  '.comment-form textarea',
  '.reply-input'
];

// List of ignored domains where we don't want to run
const IGNORED_DOMAINS = [
  'google.com/search',
  'youtube.com/watch',
  'maps.google',
  'translate.google',
  'drive.google',
  'docs.google.com/document',
  'facebook.com/messages',
  'messenger.com',
  'whatsapp.com',
  'web.whatsapp.com',
  'instagram.com/direct',
  'twitter.com/messages'
];

// Check if current domain should be ignored
function shouldIgnoreDomain() {
  const currentUrl = window.location.href;
  return IGNORED_DOMAINS.some(domain => currentUrl.includes(domain));
}

// Check if element is an important text input
function isImportantTextInput(element) {
  if (!isEditableElement(element)) return false;
  
  // Check if element matches any of our important selectors
  for (const selector of IMPORTANT_SELECTORS) {
    if (element.matches(selector)) return true;
  }
  
  // Check if element has specific classes or attributes that indicate it's important
  const classList = element.classList;
  if (classList.length > 0) {
    const classString = Array.from(classList).join(' ').toLowerCase();
    if (classString.includes('editor') || 
        classString.includes('compose') || 
        classString.includes('message') || 
        classString.includes('post') || 
        classString.includes('comment') || 
        classString.includes('text')) {
      return true;
    }
  }
  
  // Check if parent elements suggest this is part of a form or editor
  let parent = element.parentElement;
  let depth = 0;
  while (parent && depth < 3) {
    if (parent.tagName === 'FORM') return true;
    if (parent.classList.length > 0) {
      const parentClasses = Array.from(parent.classList).join(' ').toLowerCase();
      if (parentClasses.includes('editor') || 
          parentClasses.includes('compose') || 
          parentClasses.includes('form')) {
        return true;
      }
    }
    parent = parent.parentElement;
    depth++;
  }
  
  return false;
}

// Don't process if the domain is in our ignore list
if (!shouldIgnoreDomain()) {
  // Listen for focus events on editable elements
  document.addEventListener('focusin', (event) => {
    if (isImportantTextInput(event.target)) {
      console.log("GrammarHelper: Focused on important text input");
      activeElement = event.target;
      // Check existing content when focusing
      const text = getElementText(event.target);
      if (text.trim().length >= MIN_TEXT_LENGTH) {
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
    if (!isImportantTextInput(event.target)) return;
    
    // Remove any existing popup when user starts typing again
    if (correctionPopupVisible) {
      removeExistingPopups();
      correctionPopupVisible = false;
    }
    
    // Clear previous timer
    clearTimeout(typingTimer);
    
    // Start a new timer for this input
    startTypingTimer(event.target);
  });
}

// Function to start typing timer
function startTypingTimer(element) {
  // Clear any existing timer
  clearTimeout(typingTimer);
  
  // Set a new timer
  typingTimer = setTimeout(() => {
    const fullText = getElementText(element);
    
    // Only analyze text if it's within our desired length range
    if (fullText.trim().length >= MIN_TEXT_LENGTH) {
      console.log("GrammarHelper: Typing paused, analyzing text");
      
      // Prepare text for analysis - limit length to save tokens
      let textToAnalyze = fullText;
      if (fullText.length > MAX_TEXT_LENGTH) {
        // If text is too long, get the current paragraph or sentence the user is working on
        const cursorPosition = getCursorPosition(element);
        if (cursorPosition !== null) {
          textToAnalyze = getRelevantTextSegment(fullText, cursorPosition);
        } else {
          // Fallback: just take the last MAX_TEXT_LENGTH characters
          textToAnalyze = fullText.substring(fullText.length - MAX_TEXT_LENGTH);
        }
      }
      
      // Skip if text is unchanged from last analysis
      if (textToAnalyze === lastAnalyzedText) return;
      
      // Store original text for reference
      originalText = textToAnalyze;
      lastAnalyzedText = textToAnalyze;
      
      // Request grammar analysis
      requestGrammarAnalysis(textToAnalyze, element, fullText);
    }
  }, typingPauseDelay);
}

// Function to get cursor position in element
function getCursorPosition(element) {
  if (element.isContentEditable) {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (element.contains(range.commonAncestorContainer)) {
        return range.startOffset;
      }
    }
  } else if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
    return element.selectionStart;
  }
  return null;
}

// Function to get relevant text segment around cursor
function getRelevantTextSegment(text, cursorPosition) {
  // Try to get the current paragraph or sentence the user is working in
  
  // First, look for paragraphs
  const paragraphs = text.split(/\n\s*\n/);
  let charCount = 0;
  
  for (const paragraph of paragraphs) {
    const paragraphLength = paragraph.length + 2; // +2 for the newline chars
    if (charCount + paragraphLength >= cursorPosition) {
      // We found the paragraph containing the cursor
      if (paragraph.length <= MAX_TEXT_LENGTH) {
        return paragraph;
      } else {
        // Paragraph too long, look for sentences
        const sentences = paragraph.split(/[.!?]+\s+/);
        let sentenceCharCount = charCount;
        
        for (const sentence of sentences) {
          const sentenceLength = sentence.length + 2; // +2 for punctuation and space
          if (sentenceCharCount + sentenceLength >= cursorPosition) {
            // We found the sentence containing the cursor
            if (sentence.length <= MAX_TEXT_LENGTH) {
              return sentence;
            } else {
              // Even the sentence is too long, get a window around the cursor
              const start = Math.max(0, cursorPosition - (MAX_TEXT_LENGTH / 2));
              const end = Math.min(text.length, start + MAX_TEXT_LENGTH);
              return text.substring(start, end);
            }
          }
          sentenceCharCount += sentenceLength;
        }
      }
    }
    charCount += paragraphLength;
  }
  
  // Fallback: just take text around the cursor
  const start = Math.max(0, cursorPosition - (MAX_TEXT_LENGTH / 2));
  const end = Math.min(text.length, start + MAX_TEXT_LENGTH);
  return text.substring(start, end);
}

// Function to request grammar analysis from background script
function requestGrammarAnalysis(text, element, fullText) {
  chrome.runtime.sendMessage({
    action: "analyzeText",
    text: text
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("GrammarHelper: Error communicating with background", chrome.runtime.lastError);
      return;
    }
    
    if (response && response.success) {
      correctedText = response.correctedText;
      
      // Only show suggestion if there's an actual correction
      if (text !== correctedText) {
        // Show the suggestion popup without applying the correction automatically
        showCorrectionSuggestion(element, text, correctedText, fullText);
      }
    }
  });
}

// Function to show correction suggestion
function showCorrectionSuggestion(element, originalSegment, correctedSegment, fullText) {
  // Remove any existing popups
  removeExistingPopups();
  
  // Create popup element
  const popup = document.createElement('div');
  popup.id = 'grammar-helper-suggestion-popup';
  popup.className = 'grammar-helper-suggestion-popup';
  
  // Create popup content with insert button
  popup.innerHTML = `
    <div class="grammar-helper-header">
      <h3>Grammar Suggestion</h3>
      <button class="grammar-helper-close">×</button>
    </div>
    <div class="grammar-helper-content">
      <p>Suggested correction:</p>
      <div class="grammar-helper-comparison">
        <div class="grammar-helper-original-text">${originalSegment}</div>
        <div class="grammar-helper-arrow">→</div>
        <div class="grammar-helper-corrected-text">${correctedSegment}</div>
      </div>
    </div>
    <div class="grammar-helper-actions">
      <button class="grammar-helper-insert">Insert</button>
      <button class="grammar-helper-ignore">Ignore</button>
    </div>
  `;
  
  // Add popup to page
  document.body.appendChild(popup);
  
  // Position popup near the element
  positionPopupNearElement(popup, element);
  
  // Mark that correction popup is visible
  correctionPopupVisible = true;
  
  // Add event listeners
  popup.querySelector('.grammar-helper-close').addEventListener('click', () => {
    if (document.body.contains(popup)) {
      document.body.removeChild(popup);
      correctionPopupVisible = false;
    }
  });
  
  // Add event listener for the "Insert" button
  popup.querySelector('.grammar-helper-insert').addEventListener('click', () => {
    // Apply the correction
    if (fullText && fullText !== originalSegment) {
      const updatedFullText = fullText.replace(originalSegment, correctedSegment);
      setElementText(element, updatedFullText);
    } else {
      setElementText(element, correctedSegment);
    }
    
    // Remove popup
    if (document.body.contains(popup)) {
      document.body.removeChild(popup);
      correctionPopupVisible = false;
    }
    
    // Show brief notification
    showNotification('Correction applied');
  });
  
  // Add event listener for the "Ignore" button
  popup.querySelector('.grammar-helper-ignore').addEventListener('click', () => {
    // Simply remove the popup without making changes
    if (document.body.contains(popup)) {
      document.body.removeChild(popup);
      correctionPopupVisible = false;
    }
  });
  
  // Auto-hide popup after 10 seconds if no action is taken
  setTimeout(() => {
    if (document.body.contains(popup)) {
      // Fade out animation
      popup.style.opacity = '0';
      popup.style.transform = 'translateY(10px)';
      popup.style.transition = 'opacity 0.5s, transform 0.5s';
      
      // Remove after animation completes
      setTimeout(() => {
        if (document.body.contains(popup)) {
          document.body.removeChild(popup);
          correctionPopupVisible = false;
        }
      }, 500);
    }
  }, 10000);
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
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(10px)';
      notification.style.transition = 'opacity 0.5s, transform 0.5s';
      
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 500);
    }
  }, 2000);
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

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("GrammarHelper content: Message received", request.action);
  
  if (request.action === "correctGrammar") {
    // This is for the context menu correction
    sendResponse({success: true, status: "handled by background"});
  }
  
  // Always return true for async response
  return true;
});