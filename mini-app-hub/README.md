# Mini App Hub - Figma Plugin

A central dashboard Figma plugin that provides access to multiple mini-tools in one place.

## Features

### 1. Remove Background
Remove backgrounds from images using Google Gemini AI.
- Select an image layer (Rectangle, Ellipse, or Frame with image fill)
- Enter your Gemini API key
- Click "Remove Background"

### 2. Auto Update Content
Update text layers with AI-generated content based on your instructions.
- Select layers or leave empty to process all text layers
- Enter your instructions (e.g., "Translate to Spanish", "Make more professional")
- Click "Update Content"

### 3. Rename Layers
Batch rename layers using pattern-based rules.
- Select layer type to rename
- Enter pattern using placeholders:
  - `#` - Sequential number (1, 2, 3...)
  - `{name}` - Original layer name
  - `{type}` - Layer type (text, frame...)
  - `{index}` - Zero-based index
- Click "Rename Layers"

### 4. Settings
Configure and save your API keys securely using Figma's client storage.

## Installation

### Development Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   cd mini-app-hub
   npm install
   ```
3. Build the TypeScript:
   ```bash
   npm run build
   ```
4. In Figma Desktop:
   - Go to Plugins > Development > Import plugin from manifest
   - Select the `manifest.json` file

### For Production Use

1. Build the plugin:
   ```bash
   npm run build
   ```
2. Upload to Figma Community or use as a private plugin

## API Key Setup

This plugin uses Google Gemini API for AI features.

1. Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Open the plugin and go to Settings
3. Enter your API key and click "Save Settings"

Your API key is stored locally in Figma's client storage and is never sent to external servers (except Google's API).

## Technical Details

- Built with TypeScript
- Uses Figma Plugin API
- Stores settings using `figma.clientStorage`
- Makes API calls to Google Gemini for AI features

## File Structure

```
mini-app-hub/
  manifest.json    - Figma plugin manifest
  code.ts          - Main plugin logic (TypeScript)
  code.js          - Compiled JavaScript (generated)
  ui.html          - Plugin UI (HTML/CSS/JS)
  package.json     - Node.js dependencies
  tsconfig.json    - TypeScript configuration
```

## Requirements

- Figma Desktop App
- Node.js (for development)
- Google Gemini API key (for AI features)

## License

MIT
