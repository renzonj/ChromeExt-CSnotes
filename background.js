// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Set initial side panel state
chrome.sidePanel.setOptions({
  enabled: true,
  path: 'sidebar.html'
});
