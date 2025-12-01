chrome.runtime.onInstalled.addListener((details) => {
    console.log('Scribe Notetaker installed; reason:', details.reason);
})