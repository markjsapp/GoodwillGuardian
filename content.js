chrome.runtime.sendMessage({ action: "contentScriptReady" });

// Define the XPath
const timeLeftXPath = '/html/body/app-root/app-layout/main/div/app-detail/div/div[2]/div[2]/div/div[1]/div[1]/span[1]/span';
const itemNameXPath = '/html/body/app-root/app-layout/main/div/app-detail/div/div[2]/div[2]/div/h1';

// Add a listener for the 'initiateAddAuction' message
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "initiateAddAuction") {
    // Handle the addAuction action here
  }
});

// Function to extract time left from the XPath
function getTimeLeft() {
  const iterator = document.evaluate(timeLeftXPath, document, null, XPathResult.ANY_TYPE, null);
  const node = iterator.iterateNext();
  return node ? node.textContent.trim() : null;
}

function getTimeLeftAndName() {
  const timeLeftIterator = document.evaluate(timeLeftXPath, document, null, XPathResult.ANY_TYPE, null);
  const timeLeftNode = timeLeftIterator.iterateNext();
  const itemNameIterator = document.evaluate(itemNameXPath, document, null, XPathResult.ANY_TYPE, null);
  const itemNameNode = itemNameIterator.iterateNext();
  
  return {
    timeLeft: timeLeftNode ? timeLeftNode.textContent.trim() : null,
    itemName: itemNameNode ? itemNameNode.textContent.trim() : null
  };
}

// Listen for a message from the popup script to add an auction
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'addAuction') {
    const { timeLeft, itemName } = getTimeLeftAndName();
    if (timeLeft && itemName) {
      sendResponse({ success: true, timeLeft, itemName });
    } else {
      sendResponse({ success: false });
    }
  }
});