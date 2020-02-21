// function converting CSV text to JSON object
function csv_to_json(text){
  var lines = text.split("\n");
  var headers = lines[0].split(",");

  var json_objs = {};
  for (var i=1; i < lines.length; i++){
    var values = lines[i].split(",");
    json_objs[values[0]] = {"bias":    parseFloat(values[1]),
                            "quality": parseFloat(values[2])};
  }

  return json_objs;
}

chrome.runtime.onInstalled.addListener(function(details) {
  // Logging Set Up
  chrome.storage.local.set(
    { "click_times": [],
      "clicked_links": [],
      "hovered_ticks": [],
      "text_selects": [],
      "highlightedText": "",
      "news_sites_visited": []
    });

  // read in biases file, save as JSON
  fetch('csv/sources.csv').then(response => response.text()).then(function(text){
    var sources_json = csv_to_json(text);
    console.log(sources_json);
    chrome.storage.local.set({source_biases: sources_json});
  });

  // get available news sources from API
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

      // Save the source URLs
      chrome.storage.local.set({"source_urls": sources});

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

  // Create the context menu for highlighting custom input text
  chrome.contextMenus.create({
    id: "customTextInput",
    title: "Search for articles related to \"%s\"",
    contexts: ["selection"]  // ContextType
  });

  chrome.contextMenus.onClicked.addListener(function(event) {
    // Gives an option for custom text search on 'right click'
    bg = chrome.extension.getBackgroundPage();
    // Log the selected text
    if (bg) {
      bg.console.log("Selected Text: %s", event.selectionText);
    }
    // Keep the highlighted text and flag chrome storage
    chrome.storage.local.get(["highlightedText"], function(res) {
      chrome.storage.local.set({"highlightedText": event.selectionText});

      // Record Time of Icon Click
      chrome.storage.local.get(["text_selects"], function(res) {
        texts = res["text_selects"];
        texts.push([Date(), event.selectionText]);
        chrome.storage.local.set({"text_selects": texts});
      });
    });
  });
});

// Add listener for when a tab is updated
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status == 'complete' && tab.active) {
    chrome.storage.local.get(["source_urls"], function(res) {
      var urls = res["source_urls"];
      var current_url = tab.url;
      // Extract the website from the URL
      current_url = current_url.split('://')[1];
      current_url = current_url.split('/')[0];

      // Check if the current URL of the tab is a news source
      if (urls.includes(current_url)) {
        // Keep track of visits to news sites
        chrome.storage.local.get(["news_sites_visited"], function(res) {
          texts = res["news_sites_visited"];
          texts.push([Date(), current_url]);
          chrome.storage.local.set({"news_sites_visited": texts});
        });
      }
    });
  }
});
