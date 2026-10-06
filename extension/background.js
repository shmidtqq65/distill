// DISTILL extension: inject the engine into the current tab on click (or Alt+Shift+D).
// Running it a second time on the same tab closes the summary and puts the page back.
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || tab.id === undefined) return;
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['distill.js'], world: 'MAIN' });
  } catch (err) {
    // chrome:// pages, the Web Store and the PDF viewer can't be scripted
    console.warn('DISTILL cannot run on this page:', err && err.message);
    chrome.action.setBadgeBackgroundColor({ color: '#1f4fd1', tabId: tab.id });
    chrome.action.setBadgeText({ text: '×', tabId: tab.id });
    setTimeout(() => chrome.action.setBadgeText({ text: '', tabId: tab.id }), 2500);
  }
});
