// Define the XPath
const timeLeftXPath = '/html/body/app-root/app-layout/main/div/app-detail/div/div[2]/div[2]/div/div[1]/div[1]/span[1]/span';

// Function to extract time left from the XPath
function getTimeLeft() {
  const iterator = document.evaluate(timeLeftXPath, document, null, XPathResult.ANY_TYPE, null);
  const node = iterator.iterateNext();
  return node ? node.textContent.trim() : null;
}

// Listen for a message from the popup script to add an auction
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'addAuction') {
    const timeLeft = getTimeLeft();
    if (timeLeft) {
      sendResponse({ success: true, timeLeft });
    } else {
      sendResponse({ success: false });
    }
  }
});
