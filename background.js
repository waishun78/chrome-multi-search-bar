chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE' }, () => {
    if (!chrome.runtime.lastError) return;

    // Content script not yet running (tab was open before extension installed).
    // Inject it programmatically, then send the toggle.
    chrome.scripting.executeScript(
      { target: { tabId: tab.id }, files: ['content.js'] },
      () => {
        if (chrome.runtime.lastError) return; // restricted page (chrome://…)
        chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE' });
      }
    );
  });
});
