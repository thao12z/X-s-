"use strict";
// Mini App Hub - Main Plugin Code
// This plugin provides a central dashboard with multiple mini-tools
figma.showUI(__html__, { width: 400, height: 500 });
// Message handler for UI communication
figma.ui.onmessage = async (msg) => {
    switch (msg.type) {
        case 'get-selection':
            handleGetSelection();
            break;
        case 'remove-background':
            await handleRemoveBackground(msg.apiKey, msg.imageData);
            break;
        case 'get-image-bytes':
            await handleGetImageBytes();
            break;
        case 'update-image':
            await handleUpdateImage(msg.imageData);
            break;
        case 'auto-update-content':
            await handleAutoUpdateContent(msg.apiKey, msg.prompt);
            break;
        case 'rename-layers':
            handleRenameLayers(msg.pattern, msg.layerType);
            break;
        case 'get-text-layers':
            handleGetTextLayers();
            break;
        case 'save-settings':
            await handleSaveSettings(msg.settings);
            break;
        case 'load-settings':
            await handleLoadSettings();
            break;
        case 'update-text-layers':
            await handleUpdateTextLayers(msg.updates);
            break;
        case 'get-image-preview':
            await handleGetImagePreview();
            break;
        case 'cancel':
            figma.closePlugin();
            break;
    }
};
// Listen for selection changes
figma.on('selectionchange', () => {
    var _a, _b;
    figma.ui.postMessage({
        type: 'selection-info',
        hasSelection: figma.currentPage.selection.length > 0,
        nodeName: ((_a = figma.currentPage.selection[0]) === null || _a === void 0 ? void 0 : _a.name) || '',
        nodeType: ((_b = figma.currentPage.selection[0]) === null || _b === void 0 ? void 0 : _b.type) || ''
    });
});
// Update text layers with AI-generated content
async function handleUpdateTextLayers(updates) {
    for (const update of updates) {
        const node = figma.getNodeById(update.id);
        if (node && node.type === 'TEXT') {
            // Load fonts before changing text
            await figma.loadFontAsync(node.fontName);
            node.characters = update.newText;
        }
    }
    figma.ui.postMessage({
        type: 'auto-update-result',
        success: true,
        message: `Updated ${updates.length} text layers`
    });
}
// Get current selection info
function handleGetSelection() {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
        figma.ui.postMessage({
            type: 'selection-info',
            hasSelection: false,
            message: 'No layers selected'
        });
        return;
    }
    const node = selection[0];
    const hasImageFill = node.type === 'RECTANGLE' || node.type === 'ELLIPSE' || node.type === 'FRAME';
    figma.ui.postMessage({
        type: 'selection-info',
        hasSelection: true,
        nodeType: node.type,
        nodeName: node.name,
        hasImageFill: hasImageFill
    });
}
// Get image bytes from selected node
async function handleGetImageBytes() {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
        figma.ui.postMessage({
            type: 'image-bytes',
            success: false,
            error: 'No image selected'
        });
        return;
    }
    const node = selection[0];
    // Check if node has fills
    if (!('fills' in node) || !Array.isArray(node.fills)) {
        figma.ui.postMessage({
            type: 'image-bytes',
            success: false,
            error: 'Selected layer has no fills'
        });
        return;
    }
    const fills = node.fills;
    const imageFill = fills.find((fill) => fill.type === 'IMAGE');
    if (!imageFill || !imageFill.imageHash) {
        figma.ui.postMessage({
            type: 'image-bytes',
            success: false,
            error: 'No image fill found in selected layer'
        });
        return;
    }
    try {
        const image = figma.getImageByHash(imageFill.imageHash);
        if (!image) {
            figma.ui.postMessage({
                type: 'image-bytes',
                success: false,
                error: 'Could not retrieve image'
            });
            return;
        }
        const bytes = await image.getBytesAsync();
        figma.ui.postMessage({
            type: 'image-bytes',
            success: true,
            bytes: Array.from(bytes)
        });
    }
    catch (error) {
        figma.ui.postMessage({
            type: 'image-bytes',
            success: false,
            error: 'Failed to get image bytes: ' + error.message
        });
    }
}
// Get image preview as data URL
async function handleGetImagePreview() {
    const selection = figma.currentPage.selection;
    if (selection.length !== 1) {
        figma.ui.postMessage({
            type: 'image-preview',
            success: false,
            error: 'Please select exactly one layer'
        });
        return;
    }
    const node = selection[0];
    if (!('fills' in node)) {
        figma.ui.postMessage({
            type: 'image-preview',
            success: false,
            error: 'Selected layer cannot have image fills'
        });
        return;
    }
    const fills = node.fills;
    // Check if fills is an array (not mixed)
    if (!Array.isArray(fills)) {
        figma.ui.postMessage({
            type: 'image-preview',
            success: false,
            error: 'Layer has mixed fills'
        });
        return;
    }
    const imageFill = fills.find((fill) => fill.type === 'IMAGE');
    if (!imageFill || !imageFill.imageHash) {
        figma.ui.postMessage({
            type: 'image-preview',
            success: false,
            error: 'No image fill found in layer'
        });
        return;
    }
    try {
        const image = figma.getImageByHash(imageFill.imageHash);
        if (!image) {
            figma.ui.postMessage({
                type: 'image-preview',
                success: false,
                error: 'Could not retrieve image from hash'
            });
            return;
        }
        const bytes = await image.getBytesAsync();
        // Convert to base64
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.slice(i, i + chunkSize);
            binary += String.fromCharCode.apply(null, Array.from(chunk));
        }
        const base64 = btoa(binary);
        figma.ui.postMessage({
            type: 'image-preview',
            success: true,
            base64: base64,
            bytes: Array.from(bytes)
        });
    }
    catch (error) {
        figma.ui.postMessage({
            type: 'image-preview',
            success: false,
            error: 'Failed to get preview: ' + error.message
        });
    }
}
// Handle remove background operation
async function handleRemoveBackground(apiKey, imageData) {
    try {
        figma.ui.postMessage({
            type: 'remove-background-progress',
            message: 'Processing with Gemini API...'
        });
        // The actual API call is made from the UI side due to CORS
        // This function receives the processed image data back
        figma.ui.postMessage({
            type: 'remove-background-result',
            success: true,
            message: 'Background removal initiated'
        });
    }
    catch (error) {
        figma.ui.postMessage({
            type: 'remove-background-result',
            success: false,
            error: error.message
        });
    }
}
// Update image with processed data
async function handleUpdateImage(imageData) {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
        figma.ui.postMessage({
            type: 'update-image-result',
            success: false,
            error: 'No layer selected'
        });
        return;
    }
    const node = selection[0];
    if (!('fills' in node)) {
        figma.ui.postMessage({
            type: 'update-image-result',
            success: false,
            error: 'Selected layer cannot have fills'
        });
        return;
    }
    try {
        // Convert base64 to Uint8Array
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        // Create new image
        const newImage = figma.createImage(bytes);
        // Update the node's fill
        const currentFills = node.fills;
        // Check if fills is an array (not mixed)
        if (!Array.isArray(currentFills)) {
            figma.ui.postMessage({
                type: 'update-image-result',
                success: false,
                error: 'Cannot update layer with mixed fills'
            });
            return;
        }
        const newFills = currentFills.map(fill => {
            if (fill.type === 'IMAGE') {
                return Object.assign(Object.assign({}, fill), { imageHash: newImage.hash });
            }
            return fill;
        });
        node.fills = newFills;
        figma.ui.postMessage({
            type: 'update-image-result',
            success: true,
            message: 'Image updated successfully'
        });
    }
    catch (error) {
        figma.ui.postMessage({
            type: 'update-image-result',
            success: false,
            error: 'Failed to update image: ' + error.message
        });
    }
}
// Get all text layers
function handleGetTextLayers() {
    const textNodes = figma.currentPage.findAll(node => node.type === 'TEXT');
    const textLayers = textNodes.map(node => ({
        id: node.id,
        name: node.name,
        characters: node.characters.substring(0, 100) + (node.characters.length > 100 ? '...' : '')
    }));
    figma.ui.postMessage({
        type: 'text-layers',
        layers: textLayers
    });
}
// Handle auto update content
async function handleAutoUpdateContent(apiKey, prompt) {
    const selection = figma.currentPage.selection;
    // Get text nodes from selection or all text nodes if nothing selected
    let textNodes;
    if (selection.length > 0) {
        textNodes = [];
        for (const node of selection) {
            if (node.type === 'TEXT') {
                textNodes.push(node);
            }
            else if ('findAll' in node) {
                const found = node.findAll(n => n.type === 'TEXT');
                textNodes.push(...found);
            }
        }
    }
    else {
        textNodes = figma.currentPage.findAll(node => node.type === 'TEXT');
    }
    if (textNodes.length === 0) {
        figma.ui.postMessage({
            type: 'auto-update-result',
            success: false,
            error: 'No text layers found'
        });
        return;
    }
    // Send text content to UI for API processing
    const textContent = textNodes.map(node => ({
        id: node.id,
        name: node.name,
        text: node.characters
    }));
    figma.ui.postMessage({
        type: 'process-text-content',
        textContent: textContent,
        prompt: prompt
    });
}
// Handle rename layers
function handleRenameLayers(pattern, layerType) {
    const selection = figma.currentPage.selection;
    let nodesToRename;
    if (selection.length > 0) {
        nodesToRename = [];
        for (const node of selection) {
            if (layerType === 'all' || node.type === layerType) {
                nodesToRename.push(node);
            }
            if ('findAll' in node) {
                const found = node.findAll(n => layerType === 'all' || n.type === layerType);
                nodesToRename.push(...found);
            }
        }
    }
    else {
        nodesToRename = figma.currentPage.findAll(node => layerType === 'all' || node.type === layerType);
    }
    if (nodesToRename.length === 0) {
        figma.ui.postMessage({
            type: 'rename-result',
            success: false,
            error: 'No matching layers found'
        });
        return;
    }
    // Apply renaming pattern
    let counter = 1;
    for (const node of nodesToRename) {
        let newName = pattern;
        // Replace placeholders
        newName = newName.replace(/#/g, String(counter));
        newName = newName.replace(/\{name\}/g, node.name);
        newName = newName.replace(/\{type\}/g, node.type.toLowerCase());
        newName = newName.replace(/\{index\}/g, String(counter - 1));
        node.name = newName;
        counter++;
    }
    figma.ui.postMessage({
        type: 'rename-result',
        success: true,
        message: `Renamed ${nodesToRename.length} layers`
    });
}
// Save settings to client storage
async function handleSaveSettings(settings) {
    try {
        await figma.clientStorage.setAsync('miniAppHubSettings', settings);
        figma.ui.postMessage({
            type: 'save-settings-result',
            success: true,
            message: 'Settings saved successfully'
        });
    }
    catch (error) {
        figma.ui.postMessage({
            type: 'save-settings-result',
            success: false,
            error: 'Failed to save settings: ' + error.message
        });
    }
}
// Load settings from client storage
async function handleLoadSettings() {
    try {
        const settings = await figma.clientStorage.getAsync('miniAppHubSettings');
        figma.ui.postMessage({
            type: 'load-settings-result',
            success: true,
            settings: settings || { geminiApiKey: '' }
        });
    }
    catch (error) {
        figma.ui.postMessage({
            type: 'load-settings-result',
            success: false,
            error: 'Failed to load settings: ' + error.message
        });
    }
}
// Notify UI that plugin is ready
figma.ui.postMessage({ type: 'plugin-ready' });
