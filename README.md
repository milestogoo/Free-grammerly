# GrammarHelper Chrome Extension

GrammarHelper is a Chrome extension that uses ChatGPT to provide real-time grammar, spelling, and punctuation corrections as you type in any text field on the web.

## Features

- **Real-time Grammar Suggestions:** Automatically detects grammar issues as you type
- **Context Menu Correction:** Right-click on any selected text to check and correct grammar
- **Live Suggestions:** Popups appear after 2 seconds of pause in typing
- **Auto-correction:** Apply suggestions with a single click
- **Works Everywhere:** Functions in emails, social media posts, documents, and any text input on the web

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

1. Start typing in any text input field
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

## Technical Details

This extension uses:

- OpenAI's ChatGPT API (gpt-3.5-turbo model) for grammar correction
- Chrome Extension Manifest V3
- Content scripts to interact with web pages
- Context menus for right-click functionality
- Storage sync to save settings across devices

## Privacy

- Text is sent to OpenAI's API for analysis
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

### Building and Testing

1. Make your changes to the extension code
2. Test locally by loading the unpacked extension
3. For distribution, zip the entire folder

## License

[MIT License](LICENSE)

## Acknowledgements

- This extension uses OpenAI's ChatGPT API for grammar checking
- Inspired by tools like Grammarly but with the power of AI language models

## Support

For issues, feature requests, or questions, please [open an issue](https://github.com/YOUR_USERNAME/grammar-helper/issues) on GitHub.
