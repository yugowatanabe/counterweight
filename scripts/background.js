var debug = false;

// function converting CSV text to JSON object
function csv_to_json(text){
  var lines = text.split("\n");

  var json_objs = {};
  for (var i = 1; i < lines.length; i++){
    var values = lines[i].split(",");
    json_objs[values[0]] = {"bias": parseFloat(values[2]),
                            "quality": values[3],
                            "url": values[1]};
  }

  return json_objs;
}

// function to obtain a json object mapping url to bias
function get_url_dict(text){
  var lines = text.split("\n");
  var headers = lines[0].split(",");

  var json_objs = {};
  for (var i=1; i < lines.length; i++){
    var values = lines[i].split(",");
    json_objs[values[1]] = {"bias": parseFloat(values[2]),
                            "quality": values[3]};
  }

  return json_objs;
}

chrome.runtime.onInstalled.addListener(function(details) {
  // Logging Set Up
  chrome.storage.local.set(
    { "events": [],
      "highlightedText": "",
      "open_news": {},
      "current_page_url": "",
      "toggle_value": false
    });

  var sources_json;

  // read in biases file, save as JSON
  fetch('csv/updated_sources.csv').then(response => response.text()).then(function(text){
    sources_json = csv_to_json(text);
    if (debug) {
      console.log(sources_json);
    }
    chrome.storage.local.set({source_biases: sources_json});
    chrome.storage.local.set({url_dict: get_url_dict(text)})
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

      // Add source urls from CSV file to the current list from the News API
      for (var key in sources_json) {
        var curr_url = sources_json[key].url;
        if (!sources.includes(curr_url)) {
          sources.push(curr_url);
        }
      }

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

  chrome.contextMenus.create({
    id: "export_button",
    title: "Export data",
    contexts: ["page_action"]
  });
});

chrome.contextMenus.onClicked.addListener(function(event) {
  if (event.menuItemId == "customTextInput") {
    // Gives an option for custom text search on 'right click'

    // Log the selected text
    bg = chrome.extension.getBackgroundPage();
    if (bg && debug) {
      bg.console.log("Selected Text: %s", event.selectionText);
    }

    // Keep the highlighted text and flag chrome storage
    chrome.storage.local.get(["highlightedText"], function(res) {
      chrome.storage.local.set({"highlightedText": event.selectionText});

      // Record Time of Icon Click
      chrome.storage.local.get(["events"], function(res) {
        e = res["events"];
        e.push([get_date_string(), "text_select", event.selectionText]);
        chrome.storage.local.set({"events": e});
      });
    });

  } else if (event.menuItemId == "export_button") {
    create_csv();
  }
});

// Add listener for when a tab is updated
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status == 'complete' && tab.active) {
    chrome.storage.local.get(["source_urls", "current_page_url"], function(res) {
      // Extract the website from the URL
      var old_url = res["current_page_url"];
      if (old_url && old_url.includes('://')) {
        old_url = old_url.split('://')[1];
        old_url = old_url.split('/')[0];
      }

      // Extract the website from the URL
      var new_url = tab.url;
      if (new_url && new_url.includes('://')) {
        new_url = new_url.split('://')[1];
        new_url = new_url.split('/')[0];
      }

      // Check if the current URL of the tab is a news source
      chrome.storage.local.get(["events"], function(result) {
        var changed = false;
        e = result["events"];
        if (res["source_urls"].includes(old_url)) {
            // Log that user is leaving old tab
            e.push([get_date_string(), "closed_news_site", res["current_page_url"]]);
            changed = true;
        }
        if (res["source_urls"].includes(new_url)) {
          e.push([get_date_string(), "entering_news_tab", tab.url]);  // new tab is news tab
          changed = true;
        }
        if (changed) {
          chrome.storage.local.set({"events": e, "current_page_url": tab.url});
        }
      });

    });
  }
});


// Add listener for when tab is closed
// May not work when: link on page clicked, browser quit, computer shut down...
chrome.tabs.onRemoved.addListener(function(tabId, info) {
  // Get the URL of the closed tab via open_news
  chrome.storage.local.get(['open_news'], function(res) {
    var closed_news = res['open_news'][tabId];

    // Log the closed URL
    chrome.storage.local.get(["events"], function(res) {
      e = res["events"];
      e.push([get_date_string(), "closed_news_site", closed_news]);
      chrome.storage.local.set({"events": e});
    });

    // Update open_news by deleting the closed tab's information
    delete res['open_news'][tabId];
    chrome.storage.local.set({"open_news": res['open_news']});
  })
});

// Leaving
chrome.tabs.onActivated.addListener(function(info) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.storage.local.get(["source_urls", "current_page_url"], function(res) {
      // Extract the website from the URL
      var old_url = res["current_page_url"];
      if (old_url && old_url.includes('://')) {
        old_url = old_url.split('://')[1];
        old_url = old_url.split('/')[0];
      }

      // Extract the website from the URL
      var new_url = tabs[0].url;
      if (new_url && new_url.includes('://')) {
        new_url = new_url.split('://')[1];
        new_url = new_url.split('/')[0];
      }

      // Check if the current URL of the tab is a news source
      chrome.storage.local.get(["events"], function(result) {
        var changed = false;
        e = result["events"];
        if (res["source_urls"].includes(old_url)) {
            // Log that user is leaving old tab
            e.push([get_date_string(), "leaving_news_tab", res["current_page_url"]]);
            changed = true;
        }
        if (res["source_urls"].includes(new_url)) {
          e.push([get_date_string(), "entering_news_tab", tabs[0].url]);  // new tab is news tab
          changed = true;
        }
        if (changed) {
          chrome.storage.local.set({"events": e, "current_page_url": tabs[0].url});
        }
      });
    });
  });
});

// A Function to create a csv containing all logged data in the 'events' in local storage
/*
  Events logged:
  - counterweight icon clicks -> 'click'
  - links clicked (in popup) -> 'clicked_link'
  - Ticks hovered (in popup) -> 'tick'
  - Selected text for searching -> 'text_select'
  - News site visited -> 'news_site'
  - News site tab closed -> 'closed_news_site'
*/
function create_csv() {
  chrome.storage.local.get(["events"], function(res) {
    var text = '';

    res["events"].forEach(function(item) {
      // Check if the string exists
      if (item[0] && item[1] && item[2]) {
        text += item[0].toString() + "," + item[1].toString() + "," + item[2].toString();
        // Print the source link if there is one
        if (item[3]) {
          text += "," + item[3].toString();
        }
        text += "\n";
      }
    });

    bg = chrome.extension.getBackgroundPage();
    if (bg && debug) {
      bg.console.log(text);
    }

    // Write data to file
    var b = new Blob([text], {type: "text/plain"});
    var u = URL.createObjectURL(b);
    chrome.downloads.download({url: u, filename: "data"});
  });
}


chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  chrome.tabs.executeScript({
    file: 'scripts/inject.js'
  });
  chrome.tabs.insertCSS({
    file: 'inject.css'
  });
});


chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (debug) {
    console.log("GOT FROM INJECTED: " + request.msg + "  URL: " + request.url);
  }
  // Logs even if scrolling non-active page, but will not be in data file
  // This is because the javascript has already been injected, but will
  // get the wrong url
  // TODO: Use window.location.href
  // https://www.tutorialrepublic.com/faq/how-to-get-the-current-url-with-javascript.php

  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    try {
      chrome.storage.local.get(["source_urls"], function(res) {
        // Extract the website from the URL
        var activeTab = request.url;
        var base_url = activeTab;
        if (base_url && base_url.includes('://')) {
          base_url = base_url.split('://')[1];
          base_url = base_url.split('/')[0];
        }

        // Check if the current URL of the tab is a news source
        chrome.storage.local.get(["events"], function(result) {
          if (res["source_urls"].includes(base_url)) {
            e = result["events"];
            e.push([get_date_string(), "scrolled", activeTab, request.msg]);
            chrome.storage.local.set({"events": e});
          }
        });
      });
    } catch (err) {
      console.log("No URL " + err)
    }
  });

  if (request.msg == "hello")
    sendResponse({farewell: "goodbye"});
});


// A utility function to obtain a formatted date
function get_date_string() {
  var d = new Date();
  var year = d.getFullYear();
  var month = d.getMonth() + 1; // Month is 0-11 but added 1 to make it 1-12
  var day = d.getDate();
  var hour = d.getHours();
  var minute = d.getMinutes();
  var second = d.getSeconds();

  var tz_offset = d.getTimezoneOffset();

  return `${year}/${month}/${day} ${hour}:${minute}:${second}`;
}
