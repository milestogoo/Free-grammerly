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
    // New settings for token optimization
    maxTextLength: 500,
    minTextLength: 15,
    tokenSavingMode: true,
    typingPauseDelay: 500  // 500ms delay before showing suggestions
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
    
    // Check if text is within our processing limits
    chrome.storage.sync.get("maxTextLength", (data) => {
      let textToProcess = selectedText;
      
      if (data.tokenSavingMode && selectedText.length > data.maxTextLength) {
        // If text is too long and token saving is enabled, trim it
        textToProcess = selectedText.substring(0, data.maxTextLength);
        processGrammarCorrection(textToProcess, tab.id, true); // true = text was trimmed
      } else {
        processGrammarCorrection(selectedText, tab.id, false);
      }
    });
  }
});

// Function to process grammar correction
function processGrammarCorrection(text, tabId, wasTrimmed) {
  chrome.storage.sync.get("apiKey", async (data) => {
    if (!data.apiKey) {
      console.error("GrammarHelper: API key not set");
      showNotification(tabId, "Please set your OpenAI API key in the extension settings.");
      return;
    }
    
    try {
      console.log("GrammarHelper: Calling API for correction");
      // Call the API with token optimization
      const correctedText = await callChatGPTForCorrection(text, data.apiKey);
      console.log("GrammarHelper: Correction successful");
      
      // Only inject UI if there's an actual correction
      if (text !== correctedText) {
        // Inject a script to create and display the popup
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          function: showGrammarSuggestionInPage,
          args: [text, correctedText, wasTrimmed]
        }).catch(err => {
          console.error("GrammarHelper: Failed to inject popup script", err);
        });
      } else {
        // Text is already correct, just show a notification
        showNotification(tabId, "Text is already grammatically correct!");
      }
    } catch (error) {
      console.error("GrammarHelper: API request failed", error);
      
      // Handle different types of errors
      if (error.message && error.message.includes("quota")) {
        showNotification(tabId, "Error: You've exceeded your OpenAI API quota. Please check your billing.");
      } else if (error.message && error.message.includes("rate")) {
        showNotification(tabId, "Error: Too many requests. Please try again in a moment.");
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
          notification.style.opacity = '0';
          notification.style.transform = 'translateY(10px)';
          notification.style.transition = 'opacity 0.5s, transform 0.5s';
          
          setTimeout(() => {
            if (document.body.contains(notification)) {
              document.body.removeChild(notification);
            }
          }, 500);
        }
      }, 5000);
    },
    args: [message]
  }).catch(err => {
    console.error("GrammarHelper: Failed to show notification", err);
  });
}

// Function to be injected into the page to show correction suggestion
function showGrammarSuggestionInPage(originalText, correctedText, wasTrimmed) {
  console.log("GrammarHelper: Creating grammar suggestion in page");
  
  // Remove any existing popups
  const existingPopup = document.getElementById('grammar-helper-popup');
  if (existingPopup) {
    document.body.removeChild(existingPopup);
  }
  
  // Create popup element
  const popup = document.createElement('div');
  popup.id = 'grammar-helper-popup';
  popup.className = 'grammar-helper-popup';
  
  // Create popup content
  let warningNote = '';
  if (wasTrimmed) {
    warningNote = `<div class="grammar-helper-warning">Note: Only the first part of your selection was analyzed due to length.</div>`;
  }
  
  popup.innerHTML = `
    <div class="grammar-helper-header">
      <h3>Grammar Suggestion</h3>
      <button class="grammar-helper-close">×</button>
    </div>
    <div class="grammar-helper-content">
      ${warningNote}
      <div class="grammar-helper-comparison">
        <div class="grammar-helper-original-text">${originalText}</div>
        <div class="grammar-helper-arrow">→</div>
        <div class="grammar-helper-corrected-text">${correctedText}</div>
      </div>
    </div>
    <div class="grammar-helper-actions">
      <button class="grammar-helper-insert">Insert</button>
      <button class="grammar-helper-ignore">Ignore</button>
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
  
  popup.querySelector('.grammar-helper-insert').addEventListener('click', () => {
    // Insert corrected text by copying to clipboard
    navigator.clipboard.writeText(correctedText).then(() => {
      // Create a small notification
      const notification = document.createElement('div');
      notification.className = 'grammar-helper-notification';
      notification.textContent = 'Corrected text copied to clipboard! Paste to insert.';
      
      document.body.appendChild(notification);
      
      // Remove notification after 3 seconds
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
      }, 3000);
      
      // Close the popup
      document.body.removeChild(popup);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  });
  
  popup.querySelector('.grammar-helper-ignore').addEventListener('click', () => {
    // Just close the popup without doing anything
    document.body.removeChild(popup);
  });
}

// Listen for messages from content script for text analysis
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("GrammarHelper background: Message received", request.action);
  
  if (request.action === "analyzeText") {
    console.log("GrammarHelper: Analyzing text from content script");
    
    // Get API key and settings from storage
    chrome.storage.sync.get(["apiKey", "tokenSavingMode"], async (data) => {
      if (!data.apiKey) {
        console.error("GrammarHelper: API key not set");
        sendResponse({ success: false, error: "API key not set" });
        return;
      }
      
      try {
        // Apply token optimization strategies based on settings
        let textToAnalyze = request.text;
        let tokenOptimized = false;
        
        // Call the API with possible optimizations
        const correctedText = await callChatGPTForCorrection(textToAnalyze, data.apiKey);
        console.log("GrammarHelper: Analysis successful");
        sendResponse({ 
          success: true, 
          correctedText: correctedText,
          tokenOptimized: tokenOptimized
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

// Function to call ChatGPT API for simple correction with token optimization
async function callChatGPTForCorrection(text, apiKey) {
  // Optimize the system prompt based on text length to save tokens
  let systemPrompt = "";
  
  if (text.length < 50) {
    // Very short text - use minimal prompt
    systemPrompt = "Fix grammar and spelling errors. Return only the corrected text.";
  } else if (text.length < 200) {
    // Medium length text - standard prompt
    systemPrompt = "You are a grammar correction assistant. Correct grammar, spelling, and punctuation. Return only the corrected text.";
  } else {
    // Longer text - more detailed prompt
    systemPrompt = "You are a helpful grammar correction assistant. Correct the grammar, spelling, and punctuation in the text provided. Only return the corrected text without explanations.";
  }
  
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
          content: systemPrompt
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.3,
      // Request minimal tokens to save costs
      max_tokens: Math.min(4000, text.length * 1.5) // Estimate max tokens needed
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Error calling ChatGPT API");
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}