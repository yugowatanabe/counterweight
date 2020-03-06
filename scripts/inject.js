'use strict';
var prev_percent = -1;
var diff = 1;

var tracker = document.getElementById('percent-scroll-tracker');
if (tracker === null) {
    try {
        tracker = document.createElement('div');
        tracker.setAttribute('id', 'percent-scroll-tracker');
        tracker.setPercentage = function() {
            var percent = Math.round(100 * (window.pageYOffset + window.innerHeight) / document.body.scrollHeight)
            tracker.innerHTML  = percent;
            if (percent != prev_percent) { //  && percent % diff
                chrome.runtime.sendMessage({msg: percent}, function(response) {});
                prev_percent = percent;
            }
        };
        tracker.setPercentage(tracker);
        document.body.appendChild(tracker);
        window.addEventListener('scroll', tracker.setPercentage, true);
        window.addEventListener('resize', tracker.setPercentage, true);
    }
    catch (err) {
        console.err('Failed to load percent-scroll widget:', err.message);
    }
}
else {
    if (tracker.hasOwnProperty('setPercentage')){
        window.removeEventListener('scroll', tracker.setPercentage);
        window.removeEventListener('resize', tracker.setPercentage);
    }
    tracker.remove();
}
