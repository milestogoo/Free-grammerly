# GrammarHelper Chrome Extension

GrammarHelper is a Chrome extension that uses ChatGPT to provide real-time grammar, spelling, and punctuation corrections as you type in any text field on the web. It's optimized to focus on important text inputs and uses token-saving strategies to minimize API usage.

## Features

- **Focused Real-time Grammar Suggestions:** Automatically detects grammar issues in important text fields like forms, emails, and documents
- **Context Menu Correction:** Right-click on any selected text to check and correct grammar
- **Live Suggestions:** Popups appear after 2 seconds of pause in typing
- **Smart Text Selection:** For longer content, analyzes only the paragraph or sentence you're currently editing
- **Auto-correction:** Apply suggestions with a single click
- **Token Optimization:** Saves API tokens by focusing only on important inputs and limiting text length

## Installation

### From Source

1. Clone this repository:
   ```
   git clone https://github.com/YOUR_USERNAME/grammar-helper.git
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" using the toggle in the top-right corner

4. Click "Load unpacked" and select the extension folder

5. The extension should now be installed and ready to use

## Usage

### Auto-Correction Mode

1. Start typing in a significant text input field (like email compose, comment form, etc.)
2. Pause typing for 2 seconds
3. If grammar issues are detected, a suggestion popup will appear
4. Click "Apply" to use the correction or "Ignore" to dismiss

### Manual Correction Mode

1. Select any text you want to check
2. Right-click and choose "Correct Grammar" from the context menu
3. Review the suggested corrections in the popup
4. Click "Apply Correction" to copy the corrected text to your clipboard

## Configuration

Click the extension icon in the browser toolbar to access settings:

- **API Key:** Pre-configured with a default key (you can provide your own OpenAI API key)
- **Auto-correct:** Enable/disable automatic grammar checking as you type
- **Highlight errors:** Enable/disable visual highlighting of detected errors
- **Token saving mode:** Enable/disable optimizations to save API tokens
- **Min/Max text length:** Configure the text length thresholds for analysis

## Token Optimization

GrammarHelper uses several strategies to minimize API token usage:

1. **Selective Activation:** Only monitors important text fields like forms, editors, and comment sections
2. **Smart Text Selection:** For longer content, only analyzes the paragraph or sentence being edited
3. **Length Thresholds:** Configurable minimum and maximum text lengths for analysis
4. **Optimized Prompts:** Uses shorter system prompts for shorter text
5. **Domain Filtering:** Skips analysis on certain websites where grammar checking is less valuable
6. **Token Estimation:** Estimates and limits the maximum tokens requested from the API

## Technical Details

This extension uses:

- OpenAI's ChatGPT API (gpt-3.5-turbo model) for grammar correction
- Chrome Extension Manifest V3
- Content scripts to interact with web pages
- Context menus for right-click functionality
- Storage sync to save settings across devices

## Privacy

- Text is sent to OpenAI's API for analysis
- The extension focuses on important text fields to minimize unnecessary data transmission
- No data is stored on our servers
- Your API usage is subject to [OpenAI's privacy policy](https://openai.com/privacy/)

## Development

### File Structure

```
grammar-helper/
├── manifest.json      # Extension configuration
├── background.js      # Background script for API calls
├── content.js         # Content script for page interaction
├── popup.html         # Settings popup HTML
├── popup.js           # Settings popup logic
├── styles.css         # Styles for popups and highlights
├── images/            # Extension icons
└── README.md          # This file
```

## License

[MIT License](LICENSE)

## Acknowledgements

- This extension uses OpenAI's ChatGPT API for grammar checking
- Inspired by tools like Grammarly but with the power of AI language models and optimized for token efficiency