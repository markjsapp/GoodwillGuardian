// Elements
const trackedAuctions = document.getElementById('trackedAuctions');
const alertTime = document.getElementById('alertTime');
const timeUnit = document.getElementById('timeUnit');
const alertSound = document.getElementById('alertSound');

// Add auction to list
function addAuctionToList(timeLeft, url, itemName = '') {
  // Check if the auction with the same URL already exists
  const existingAuction = document.querySelector(`.auction[data-url="${url}"]`);
  if (existingAuction) {
    return;
  }

  const auctionDiv = document.createElement('div');
  auctionDiv.className = 'auction';
  auctionDiv.dataset.url = url;

  const itemNameElement = document.createElement('p');
  itemNameElement.textContent = itemName.slice(0, 35);
  auctionDiv.appendChild(itemNameElement);

  const timeLeftSpan = document.createElement('span');
  timeLeftSpan.textContent = `Time left: ${timeLeft}`;
  auctionDiv.appendChild(timeLeftSpan);

  const alertTimeValue = parseInt(alertTime.value, 10);
  const alertTimeDisplay = alertTimeValue * (timeUnit.value === 'minutes' ? 1 : 60);
  const alertTimerSpan = document.createElement('span');
  alertTimerSpan.textContent = `Alert in: ${alertTimeDisplay} ${timeUnit.value}`;
  alertTimerSpan.style.color = 'red';
  auctionDiv.appendChild(alertTimerSpan);

  // Create an anchor element to display the link
  const auctionLink = document.createElement('a');
  auctionLink.href = url;
  auctionLink.textContent = 'View Auction';
  auctionLink.target = '_blank';
  auctionLink.rel = 'noopener noreferrer';
  auctionDiv.appendChild(auctionLink);

  const removeButton = document.createElement('button');
  removeButton.textContent = 'Remove';
  removeButton.addEventListener('click', () => {
    auctionDiv.remove();
    removeSavedAuction(url);
  });
  auctionDiv.appendChild(removeButton);

  trackedAuctions.appendChild(auctionDiv);

  // Save the auction and its details
  saveAuction({ timeLeft, url, itemName });
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
    chrome.storage.sync.set({ auctions: updatedAuctions }); // Fix the key here
  });
}

// Load saved auctions and settings
function loadSavedData() {
  chrome.storage.sync.get(['auctions', 'alertTime', 'timeUnit', 'alertSound'], (data) => {
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

function loadSavedAuctions() {
  chrome.storage.sync.get('auctions', (data) => {
    const auctions = data.auctions || [];
    auctions.forEach((auction) => {
      addAuctionToList(auction.timeLeft, auction.url, auction.itemName);
    });
  });
}

document.getElementById('addAuction').addEventListener('click', () => {
  // Get the alertTime input element
  const alertTime = document.getElementById('alertTime');

  // Check if the alert time is set
  if (alertTime.value === '' || isNaN(alertTime.value)) {
    alert('Please set a valid alert time.');
    return;
  }

  console.log('addAuction clicked');
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    chrome.tabs.sendMessage(tab.id, { action: 'addAuction' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
        return;
      }

      if (response && response.success) {
        addAuctionToList(response.timeLeft, tab.url, response.itemName);

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
loadSavedAuctions();