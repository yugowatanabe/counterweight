'use strict';
try {
  let prev_percent = -1;
} catch (err) {
  let prev_percent = -1;
}
let diff = 5;

let tracker = document.getElementById('percent-scroll-tracker');
if (tracker === null) {
  try {
    tracker = document.createElement('div');
    tracker.setAttribute('id', 'percent-scroll-tracker');
    tracker.setPercentage = function() {
      let percent = Math.round(100 * (window.pageYOffset + window.innerHeight) / document.body.scrollHeight)
      tracker.innerHTML = percent;
      if (percent != prev_percent && percent % diff == 0) {
        chrome.runtime.sendMessage({msg: percent, url: window.location.href}, (response) => {});
        prev_percent = percent;
      }
    };
    tracker.setPercentage(tracker);
    document.body.appendChild(tracker);
    window.addEventListener('scroll', tracker.setPercentage, true);
    window.addEventListener('resize', tracker.setPercentage, true);
  } catch (err) {
    console.log('Failed to load percent-scroll widget:', err.message);
  }
}
else {
  if (tracker.hasOwnProperty('setPercentage')) {
    window.removeEventListener('scroll', tracker.setPercentage);
    window.removeEventListener('resize', tracker.setPercentage);
  }
  tracker.remove();
}
