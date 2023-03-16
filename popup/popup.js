// Elements
const trackedAuctions = document.getElementById('trackedAuctions');
const alertTime = document.getElementById('alertTime');
const timeUnit = document.getElementById('timeUnit');
const alertSound = document.getElementById('alertSound');

// Add auction to list
function addAuctionToList(timeLeft, url) {
    const auctionDiv = document.createElement('div');
    auctionDiv.className = 'auction';
    auctionDiv.dataset.url = url;
  
    const timeLeftSpan = document.createElement('span');
    timeLeftSpan.textContent = timeLeft;
    auctionDiv.appendChild(timeLeftSpan);
  
    const removeButton = document.createElement('button');
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', () => {
      auctionDiv.remove();
      removeSavedAuction(url);
    });
    auctionDiv.appendChild(removeButton);
  
    trackedAuctions.appendChild(auctionDiv);
  
    // Save the auction and its details
    saveAuction({ timeLeft, url });
  }

// Save auction to storage
function saveAuction(auction) {
    chrome.storage.sync.get('auctions', (data) => {
      const auctions = data.auctions || [];
      auctions.push(auction);
      chrome.storage.sync.set({ auctions });
    });
  }

// Remove saved auction
function removeSavedAuction(url) {
    chrome.storage.sync.get('auctions', (data) => {
      const auctions = data.auctions || [];
      const updatedAuctions = auctions.filter((auction) => auction.url !== url);
      chrome.storage.sync.set({ updatedAuctions });
    });
  }

// Load saved auctions and settings
function loadSavedData() {
    chrome.storage.sync.get(['auctions', 'alertTime', 'timeUnit', 'alertSound'], (data) => {
      if (data.auctions) {
        data.auctions.forEach((auction) => addAuctionToList(auction.timeLeft, auction.url));
      }
  
      if (data.alertTime) {
        alertTime.value = data.alertTime;
      }
  
      if (data.timeUnit) {
        timeUnit.value = data.timeUnit;
      }
  
      if (data.alertSound) {
        alertSound.value = data.alertSound;
      }
    });
  }

// Save settings
alertTime.addEventListener('change', () => {
    chrome.storage.sync.set({ alertTime: alertTime.value });
  });
  
  timeUnit.addEventListener('change', () => {
    chrome.storage.sync.set({ timeUnit: timeUnit.value });
  });
  
  alertSound.addEventListener('change', () => {
    chrome.storage.sync.set({ alertSound: alertSound.value });
  });

// Function to convert time left string to seconds
function timeLeftToSeconds(timeLeft) {
    const timeUnits = {
      'd': 86400, // days to seconds
      'h': 3600, // hours to seconds
      'm': 60, // minutes to seconds
      's': 1 // seconds
    };
  
    const timePattern = /(\d+)([dhms])/g;
    let match;
    let seconds = 0;
  
    while ((match = timePattern.exec(timeLeft)) !== null) {
      const value = parseInt(match[1], 10);
      const unit = match[2];
      seconds += value * timeUnits[unit];
    }
  
    return seconds;
  }

document.getElementById('addAuction').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      chrome.tabs.sendMessage(tab.id, { action: 'addAuction' }, (response) => {
        if (response.success) {
          addAuctionToList(response.timeLeft, tab.url);
  
          const timeLeftSeconds = timeLeftToSeconds(response.timeLeft);
          const alertInSeconds = parseInt(alertTime.value, 10) * (timeUnit.value === 'minutes' ? 60 : 1);
          const alarmName = `auction_${Date.now()}`;
  
          chrome.alarms.create(alarmName, { delayInMinutes: (timeLeftSeconds - alertInSeconds) / 60 });
  
          // Save the alarm's details and the auction's URL to be used when the alarm fires
          chrome.storage.sync.get('alarms', (data) => {
            const alarms = data.alarms || [];
            alarms.push({ name: alarmName, url: tab.url });
            chrome.storage.sync.set({ alarms });
          });
        } else {
            // Show an error message
            const errorMessage = document.getElementById('errorMessage');
            errorMessage.textContent = 'Failed to add auction. Please make sure you are on a valid auction page.';
          }
      });
    });
  });

// Set up a listener for alarms
chrome.alarms.onAlarm.addListener((alarm) => {
    // Load the alarm's details from storage
    chrome.storage.sync.get('alarms', (data) => {
      const alarms = data.alarms || [];
      const alarmDetails = alarms.find(a => a.name === alarm.name);
  
      if (alarmDetails) {
        // Play the alert sound
        const audio = new Audio(alertSound.value);
        audio.play();
  
        // Show a notification with the auction URL
        const notificationOptions = {
          type: 'basic',
          iconUrl: '/icons/icon.png',
          title: 'Goodwill Guardian Alert',
          message: `An auction is about to end. Click here to view the auction.`
        };
  
        chrome.notifications.create(alarmDetails.url, notificationOptions, () => {
          // Remove the alarm details from storage
          const updatedAlarms = alarms.filter(a => a.name !== alarm.name);
          chrome.storage.sync.set({ alarms: updatedAlarms });
        });
      }
    });
  });

// Initialize the popup
loadSavedData();