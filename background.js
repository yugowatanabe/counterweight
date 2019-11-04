chrome.runtime.onInstalled.addListener(function(details) {
  // get available news sources
  var url = 'https://newsapi.org/v2/sources?' +
    'apiKey=afb1d15f19724f608492f69997c94820';
  var req = new Request(url);

  // handle the JSON object returned containing possible sources
  fetch(req).then(function(response) {
    response.json().then( function(obj) {
      // get array of sources (e.g. 'abcnews.com')
      sources = obj.sources.map(x => x.url);
      sources = sources.map(x => x.split('://')[1]);
      sources = sources.map(x => x.split('/')[0]);
      sources.push('www.cnn.com','www.bbc.com');
      // console.log(sources);

      // append to rule conditions that host must be news source
      conditions = [];
      sources.forEach(source => conditions.push(
        new chrome.declarativeContent.PageStateMatcher({
          pageUrl: { hostEquals: source }
        })
      ));

      // create rule from conditions (extension only active when visiting news)
      var rule = {
        conditions: conditions,
        actions: [ new chrome.declarativeContent.ShowPageAction() ]
      };
      // store the rule in storage
      chrome.storage.local.set({rule: rule});
    });
  });

  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    // read the rule from storage and apply it on page change
    chrome.storage.local.get(['rule'], function(result) {
      chrome.declarativeContent.onPageChanged.addRules([result.rule]);
    });
  });
});
