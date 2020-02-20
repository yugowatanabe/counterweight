var debug = false;

document.addEventListener("DOMContentLoaded", function(event) {
  document.getElementById('export_data').addEventListener('click', print_data);
});

function print_data() {
  chrome.storage.local.get(["click_times", "clicked_links", "hovered_ticks"], function(res) {
    var text = 'event,time,url\n';

    // click_times: Array of Times
    res["click_times"].forEach(function(item) {
      text += "click," + item.toString() + ",\n";
    })

    // clicked_links: Array of Arrays [time, url]
    res["clicked_links"].forEach(function(item) {
      text += "link," + item[0].toString() + "," + item[1].toString() + "\n";
    })

    // hovered_ticks: Array of Arrays [time, tick]
    res["hovered_ticks"].forEach(function(item) {
      text += "tick," + item[0].toString() + "," + item[1].toString() + "\n";
    })

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