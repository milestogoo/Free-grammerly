// Initialize extension when installed
chrome.runtime.onInstalled.addListener(() => {
  console.log("GrammarHelper: Extension installed/updated");
  
  // Create context menu for grammar correction
  chrome.contextMenus.create({
    id: "correctGrammar",
    title: "Correct Grammar",
    contexts: ["selection"]
  });

  // Initialize settings with default values including API key and auto-correct enabled
  chrome.storage.sync.set({
    // Default API key - replace with your actual key
    apiKey: "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",
    autoCorrect: true, // Auto-correct enabled by default
    highlightErrors: true
  }, () => {
    console.log("GrammarHelper: Default settings initialized with API key");
  });
});

// Listen for context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log("GrammarHelper: Context menu clicked", info.menuItemId);
  
  if (info.menuItemId === "correctGrammar" && info.selectionText) {
    console.log("GrammarHelper: Processing text for correction:", info.selectionText.substring(0, 20) + "...");
    
    // Get the selected text
    const selectedText = info.selectionText;
    
    // Process directly in background script
    processGrammarCorrection(selectedText, tab.id);
  }
});

// Function to process grammar correction
function processGrammarCorrection(text, tabId) {
  chrome.storage.sync.get("apiKey", async (data) => {
    if (!data.apiKey) {
      console.error("GrammarHelper: API key not set");
      showNotification(tabId, "Please set your OpenAI API key in the extension settings.");
      return;
    }
    
    try {
      console.log("GrammarHelper: Calling API for correction");
      // Call the API
      const correctedText = await callChatGPTForCorrection(text, data.apiKey);
      console.log("GrammarHelper: Correction successful");
      
      // Inject a script to create and display the popup
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: showCorrectionPopupInPage,
        args: [text, correctedText]
      }).catch(err => {
        console.error("GrammarHelper: Failed to inject popup script", err);
      });
    } catch (error) {
      console.error("GrammarHelper: API request failed", error);
      
      // Check if it's a quota exceeded error
      if (error.message && error.message.includes("quota")) {
        showNotification(tabId, "Error: You've exceeded your OpenAI API quota. Please check your billing.");
      } else {
        showNotification(tabId, "Error: " + (error.message || "Failed to correct grammar"));
      }
    }
  });
}

// Function to show a notification in the page
function showNotification(tabId, message) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    function: (msg) => {
      // Create and show notification element
      const notification = document.createElement('div');
      notification.className = 'grammar-helper-notification error';
      notification.textContent = msg;
      
      document.body.appendChild(notification);
      
      // Remove after 5 seconds
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 5000);
    },
    args: [message]
  }).catch(err => {
    console.error("GrammarHelper: Failed to show notification", err);
  });
}

// Function to be injected into the page to show correction popup
function showCorrectionPopupInPage(originalText, correctedText) {
  console.log("GrammarHelper: Creating correction popup in page");
  
  // If texts are identical, just notify and return
  if (originalText === correctedText) {
    const notification = document.createElement('div');
    notification.className = 'grammar-helper-notification';
    notification.textContent = 'Text is already grammatically correct!';
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 3000);
    return;
  }
  
  // Create popup element
  const popup = document.createElement('div');
  popup.id = 'grammar-helper-popup';
  popup.className = 'grammar-helper-popup';
  
  // Create popup content
  popup.innerHTML = `
    <div class="grammar-helper-header">
      <h3>Grammar Suggestion</h3>
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
      <button class="grammar-helper-apply">Apply Correction</button>
    </div>
  `;
  
  // Add popup to page
  document.body.appendChild(popup);
  
  // Position popup in center of viewport
  popup.style.top = '50%';
  popup.style.left = '50%';
  popup.style.transform = 'translate(-50%, -50%)';
  
  // Add event listeners
  popup.querySelector('.grammar-helper-close').addEventListener('click', () => {
    document.body.removeChild(popup);
  });
  
  popup.querySelector('.grammar-helper-apply').addEventListener('click', () => {
    // Copy corrected text to clipboard
    navigator.clipboard.writeText(correctedText).then(() => {
      // Create a small notification
      const notification = document.createElement('div');
      notification.className = 'grammar-helper-notification';
      notification.textContent = 'Corrected text copied to clipboard!';
      
      document.body.appendChild(notification);
      
      // Remove notification after 3 seconds
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 3000);
      
      // Close the popup
      document.body.removeChild(popup);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  });
}

// Listen for messages from content script for text analysis
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("GrammarHelper background: Message received", request.action);
  
  if (request.action === "analyzeText") {
    console.log("GrammarHelper: Analyzing text from content script");
    
    // Get API key from storage
    chrome.storage.sync.get("apiKey", async (data) => {
      if (!data.apiKey) {
        console.error("GrammarHelper: API key not set");
        sendResponse({ success: false, error: "API key not set" });
        return;
      }
      
      try {
        // Call the API
        const correctedText = await callChatGPTForCorrection(request.text, data.apiKey);
        console.log("GrammarHelper: Analysis successful");
        sendResponse({ 
          success: true, 
          correctedText: correctedText
        });
      } catch (error) {
        console.error("GrammarHelper: API request failed", error);
        sendResponse({ 
          success: false, 
          error: error.message || "Failed to analyze text" 
        });
      }
    });
    
    // Return true to indicate we'll respond asynchronously
    return true;
  }
});

// Function to call ChatGPT API for simple correction
async function callChatGPTForCorrection(text, apiKey) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful grammar correction assistant. Correct the grammar, spelling, and punctuation in the text provided. Only return the corrected text without explanations."
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Error calling ChatGPT API");
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}