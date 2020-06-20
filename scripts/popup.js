var debug = false;

// Initialize Popup
document.addEventListener("DOMContentLoaded", (event) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {

    // get background page for logging
    var bg = chrome.extension.getBackgroundPage();

    // Record Time of Icon Click
    chrome.storage.local.get(["events"], (res) => {
      let e = res["events"];
      e.push([get_date_string(), "click", "popup"]);
      chrome.storage.local.set({"events": e});
    });

    // Get the input text for the article suggestions
    var title;
    chrome.storage.local.get(["highlightedText"], (res) => {
      // Check if the user had custom text input from a right click
      let textHighlight = res["highlightedText"];
      if (textHighlight) {
        title = clean_title(textHighlight, bg);
        chrome.storage.local.set({"highlightedText": ""});
      } else {
        // User did not have custom text input, so get the tab title
        title = clean_title(tabs[0].title, bg)

        // Append the text of the body
        fetch(get_body_text(tabs[0].url)).then((response) => {
          response.json().then((obj) => {
            let content = obj.response.content;
            title += ' ' + format_body(content);

            if (bg && debug) {
              bg.console.log('Title and body appended: ' + title);
            }
          });
        });
      }

      // search news for keywords in title
      // handle the JSON object returned containing articles
      fetch(get_request(title)).then((response) => {
        response.json().then((obj) => {

          // get array of articles
          let articles = obj.articles;
          // count number of word matches in target title to each article result
          let counts = [];
          articles.forEach((article) => {

            // get text of article (its title and description)
            let suggestion = article.title + " " + article.description;
            suggestion = suggestion.replace(/[^\w\s]/gi, '').toLowerCase();
            suggestion = format_body(suggestion);

            // for each unique word in the title, check if in article
            let count = 0;
            // Get the text of both the source and destination articles and append them
            title = format_title(title);
            suggestion = format_title(suggestion);
            var vocabulary = title + " " + suggestion;
            // Get the distance between the two articles
            count = ndistance(bow(title, vocabulary, bg), bow(suggestion, vocabulary, bg));

            // save number of words in article matching target title
            counts.push(count);
          });

          // sort articles according to number of matches (more matches, higher rank) in increasing order
          const result = articles.map((item, index) => [counts[index], item]).sort(([count1], [count2]) => count1 - count2).map(([, item]) => item);
          counts = counts.sort((a, b) => {return a - b});  // sort counts
          if (bg && debug) {
            bg.console.log(result);
            bg.console.log(counts);
          }

          // list results in popup.html, listed with bias
          chrome.storage.local.get(['source_biases', 'url_dict'], (get_result) => {
            let url_dict = get_result.url_dict;

            // div which holds the divs illustrating bar along spectrum per article
            let bar = document.getElementById('bar');
            let container = document.getElementById('container');
            var i = 0;

            // Tick for Current site
            let cur_src = strip_url(tabs[0].url);

            // Try to get current source's bias. If couldn't get, assume no bias (0)
            let cur_src_bias = 0;
            if (cur_src in url_dict) {
              cur_src_bias = url_dict[cur_src].bias;
              if (bg && debug) {
                bg.console.log("Found bias: " + cur_src + " " + url_dict[cur_src].bias);
              }

              let cur_tick = document.createElement("DIV");
              cur_tick.style = "width: 8px;\
                                height: 8px;\
                                border-radius: 8px;\
                                background-color: #52139c;\
                                display: inline-flex;\
                                position: absolute;\
                                margin-top: 18px;\
                                left: " + (position_from_bias(cur_src_bias) - 0.3) + "\%;";
              cur_tick.addEventListener("mouseover", () => {
                help_div = document.createElement("DIV");
                help_div.innerHTML = "Current Source's Bias (" + cur_src + ")";
                help_div.style = "left: 18px;\
                                  size: 12px;\
                                  position: absolute;\
                                  border-radius: 3px;\
                                  padding: 2px;\
                                  background-color: #9c77c7";
                cur_tick.appendChild(help_div);

                cur_tick.style.backgroundColor = "#bd8cf5";
              })
              cur_tick.addEventListener("mouseout", () => {
                cur_tick.removeChild(cur_tick.lastChild);
                cur_tick.style.backgroundColor = "#52139c";
              })
              bar.appendChild(cur_tick);
            } else {
              if (bg && debug) {
                bg.console.log("Could not find bias: " + cur_src)
              }
            }

            let found_match = false;
            // Get top X closest matches
            while (i < 30) { // TODO: We may want to change this number
              // get source name and id
              var source = result[i].source['name'];
              var source_id = result[i].source['id'];
              var source_url = result[i].url;

              // Do not include the current article in the suggestion
              if (tabs[0].url === source_url) {
                i++;
                continue;
              }

              source_url = strip_url(source_url)

              // if we know bias of source (is in keys of biases_dict), show article
              if (source_url in url_dict) {

                // Get div for all sources with this bias
                let bias_div = document.getElementById("div_" + url_dict[source_url].bias);
                if (bias_div == null) {
                  bias_div = document.createElement("DIV");
                  bias_div.setAttribute("id", "div_" + url_dict[source_url].bias);
                  bias_div.setAttribute("class", "src_results");
                  bias_div.style.display = "none";
                  bias_div.style.height = "inherit";
                  bias_div.style.overflowY = "auto";
                  container.appendChild(bias_div);
                }

                // try to get div with source's id, if doesn't exist, create it
                let source_div = document.getElementById(source);
                if (source_div == null) {
                  // If it doesn't exist, create it
                  source_div = document.createElement("DIV");
                  source_div.setAttribute("id", source);
                  source_div.style.overflowY = "auto"; // TODO: make overflowY hidden?
                  bias_div.appendChild(source_div);

                  // Add source name to source_div
                  let source_h = document.createElement("H2");
                  source_h.setAttribute("class", "src_name");
                  source_h.innerHTML = source;
                  source_div.appendChild(source_h);

                  // Add source quality (with font color) to source_div
                  let source_q = document.createElement("P");
                  source_q.setAttribute("class", "src_qual");
                  source_q.style.width = "50%"; // TODO: Adjust width
                  source_q.innerHTML = "Quality:&nbsp;&nbsp;";
                  let color = get_color(url_dict[source_url].quality);
                  let r = color[0];
                  let g = color[1];
                  let b = color[2];
                  source_q.innerHTML += parse("<span style='color:rgba(%s,%s,%s);'>", r, g, b) + url_dict[source_url].quality + "</span>";
                  source_q.innerHTML += "&nbsp;&nbsp;Bias:&nbsp;&nbsp;" + get_bias(url_dict[source_url].bias) + "&nbsp;";
                  let help_mark = document.createElement("SPAN");
                  help_mark.innerHTML = "<sup>(?)</sup>";
                  help_mark.addEventListener("click", () => {
                    alert("DEFINITIONS"); // TODO: Update Definition
                  })
                  help_mark.addEventListener("mouseover", () => {
                    help_mark.style.textDecoration = "underline";
                  })
                  help_mark.addEventListener("mouseout", () => {
                    help_mark.style.textDecoration = "none";
                  })
                  source_q.appendChild(help_mark);
                  source_div.appendChild(source_q);
                }

                // Create element for article, append to source_div
                let node = document.createElement("P");
                node.setAttribute("class", "article");
                let time = result[i].publishedAt.match(/(.*)-(.*)-(.*)T(.*):(.*):(.*)Z/);
                let event = new Date(Date.UTC(time[1], time[2] - 1, time[3], time[4], time[5], time[6]));
                time = event.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                let text = "<img src='" + result[i].urlToImage + "' style=\"cursor: pointer;\">"
                            + "<b style=\"cursor: pointer;\">" + result[i].title + "</b>"
                            + "<p class='description'><i>" + time + "</i>&nbsp;&nbsp;-&nbsp;"
                            + result[i].description.replace(/<\/?[^>]+(>|$)/g, "") + "</p>";
                node.innerHTML = text;
                function open_url(logged_url) {
                  // Record Time of Icon Click
                  chrome.storage.local.get(["events"], (res) => {
                    let e = res["events"];
                    e.push([get_date_string(), "clicked_link", logged_url, tabs[0].url]);
                    chrome.storage.local.set({"events": e});

                    // Open clicked link
                    chrome.tabs.create({active: false, url: logged_url});
                  });
                }
                node.addEventListener("click", open_url.bind(null, result[i].url));
                source_div.appendChild(node);

                // Get tick for bias on spectrum bar, or create it if doesn't exist
                let tick = document.getElementById("tick_" + url_dict[source_url].bias);
                if (tick == null) {
                  tick = document.createElement("DIV");  // put icon along spectrum bar
                  tick.setAttribute("id", "tick_" + url_dict[source_url].bias);
                  tick.setAttribute("class", "tick");
                  tick.style =  "width: 3px;\
                                height: 15px;\
                                background-color: #8c8c8c;\
                                display: inline-flex;\
                                position: absolute;\
                                left: " + position_from_bias(url_dict[source_url].bias) + "\%;";
                  bar.appendChild(tick);
                }
              }

              found_match = true;
              i++;
            }

            if (!found_match) {
              container.innerHTML = "<br /><b>No related articles found!</b>";
            }

            // add event listeners to ticks
            let ticks = document.getElementsByClassName("tick");
            for (let i = 0; i < ticks.length; i++) {
              ticks[i].addEventListener('mouseover', tick_mouseover, false);
            }

            // manually trigger event on one of the divs to display on start
            let event; // The custom event that will be created
            if(document.createEvent){
                event = document.createEvent("HTMLEvents");
                event.initEvent("mouseover", true, true);
                event.eventName = "mouseover";
                ticks[ticks.length-1].dispatchEvent(event);
            } else {
                event = document.createEventObject();
                event.eventName = "mouseover";
                event.eventType = "mouseover";
                ticks[ticks.length-1].fireEvent("on" + event.eventType, event);
            }
          });
        });
      });
    });
  });
});


// function handling what happens on hover on tick
var tick_mouseover = function () {
  // get all ticks and reset their sizes
  let ticks = document.getElementsByClassName("tick");
  for (let i = 0; i < ticks.length; i++) {
    ticks[i].style.height = "15px";
    ticks[i].style.backgroundColor = "#8c8c8c";
  }

  // make only hovered tick large
  this.style.height = "15px";
  this.style.backgroundColor = "#248f24";

  // get all source results and hide all of them
  let src_results = document.getElementsByClassName("src_results");
  for (let i = 0; i < src_results.length; i++) {
    src_results[i].style.display = "none";
  }

  // get name of news source to show, and show only results for that news source
  let tick_id = this.getAttribute("id");
  let selected_bias = tick_id.substring(5);
  let selected_bias_div = document.getElementById("div_" + selected_bias);
  selected_bias_div.style.display = "block";

  // Record Time of Hover Tick
  chrome.storage.local.get(["events"], (res) => {
    let e = res["events"];
    e.push([get_date_string(), "hovered_tick", tick_id]);
    chrome.storage.local.set({"events": e});
  });
}


// function which returns color (red to green) based on weight
function get_color(quality) {
  // Match quality string with corresponding weight
  let weight;
  if (quality === 'VERY HIGH') {
    weight = 1.5;
  } else if (quality === 'HIGH') {
    weight = 1.2;
  } else if (quality === 'MOSTLY FACTUAL') {
    weight = 0.9;
  } else if (quality === 'MIXED') {
    weight = 0.6;
  } else if (quality === 'LOW') {
    weight = 0.3;
  } else {
    weight = 0;
  }

  let w1 = weight;
  let w2 = 1 - w1;
  let color1 = [0,   180, 0];
  let color2 = [200, 0,   0];
  let rgb = [ Math.round(color1[0] * w1 + color2[0] * w2),
              Math.round(color1[1] * w1 + color2[1] * w2),
              Math.round(color1[2] * w1 + color2[2] * w2)
            ];
  return rgb;
}


// Get bias description corresponding to number
// https://gist.github.com/nsfyn55/848c305b2b593e0ea129caaffc6417cc
function get_bias(bias) {
  if (-35 <= bias && bias <= -30) {
    return "Extreme Left";
  } else if (-29 <= bias && bias <= -18) {
    return "Left";
  } else if (-17 <= bias && bias <= -6) {
    return "Left Center";
  } else if (-5 <= bias && bias <= 5) {
    return "Least Biased";
  } else if (6 <= bias && bias <= 17) {
    return "Right Center";
  } else if (18 <= bias && bias <= 30) {
    return "Right";
  } else if (31 <= bias && bias <= 35) {
    return "Extreme Right";
  } else {
    return "N/A";
  }
}


// function helping to format string
function parse(str) {
    var args = [].slice.call(arguments, 1),
        i = 0;

    return str.replace(/%s/g, () => args[i++]);
}


// Functions to clean title
function clean_title(title, bg) {
  title = title.split(' - ')[0];
  title = title.split(' | ')[0];
  let head = document.getElementById('head');
  head.innerHTML = "Related to '<i>" + title + "</i>'";
  title = title.replace(/[^\w\s]/gi, '').toLowerCase();
  if (bg && debug) {
    bg.console.log("Clean title: " + title);
  }

  return title;
}


// Create and return a request, given a title (formatted for a search powered by News API)
function get_request(title) {
  let title_url = title.replace(/ /g, "%20OR%20");
  let url = 'https://newsapi.org/v2/everything?'
    + 'q=' + title_url + '&'
    + 'sortBy=relevancy&'
    + 'pageSize=100&'
    + 'page=1&'
    + 'apiKey=afb1d15f19724f608492f69997c94820';

  return new Request(url);
}


// Get extracted text from the body of the article
function get_body_text(input_url) {
  let url = 'http://boilerpipe-web.appspot.com/extract?'
    + 'output=json&'
    + 'extractor=ArticleExtractor&'
    + 'url=' + input_url

  return new Request(url);
}

// Get title with only unique words
function format_title(title, bg) {
  // only unique words in title with stopwords removed
  let stopwords = [
    "about", "a", "above", "above", "across", "after", "afterwards", "again", "against", "all",
    "almost", "alone", "along", "already", "also","although","always","am","among", "amongst",
    "amoungst", "amount",  "an", "and", "another", "any","anyhow","anyone","anything","anyway",
    "anywhere", "are", "around", "as",  "at", "back","be","became", "because","become","becomes",
    "becoming", "been", "before", "beforehand", "behind", "being", "below", "beside", "besides",
    "between", "beyond", "bill", "both", "bottom","but", "by", "call", "can", "cannot", "cant",
    "co", "con", "could", "couldnt", "cry", "de", "describe", "detail", "do", "done", "down",
    "due", "during", "each", "eg", "eight", "either", "eleven","else", "elsewhere", "empty",
    "enough", "etc", "even", "ever", "every", "everyone", "everything", "everywhere", "except",
    "few", "fifteen", "fify", "fill", "find", "fire", "first", "five", "for", "former",
    "formerly", "forty", "found", "four", "from", "front", "full", "further", "get", "give", "go",
    "had", "has", "hasnt", "have", "he", "hence", "her", "here", "hereafter", "hereby", "herein",
    "hereupon", "hers", "herself", "him", "himself", "his", "how", "however", "hundred", "ie",
    "if", "in", "inc", "indeed", "interest", "into", "is", "it", "its", "itself", "keep", "last",
    "latter", "latterly", "least", "less", "ltd", "made", "many", "may", "me", "meanwhile",
    "might", "mill", "mine", "more", "moreover", "most", "mostly", "move", "much", "must", "my",
    "myself", "name", "namely", "neither", "never", "nevertheless", "next", "nine", "no",
    "nobody", "none", "noone", "nor", "not", "nothing", "now", "nowhere", "of", "off", "often",
    "on", "once", "one", "only", "onto", "or", "other", "others", "otherwise", "our", "ours",
    "ourselves", "out", "over", "own","part", "per", "perhaps", "please", "put", "rather", "re",
    "same", "see", "seem", "seemed", "seeming", "seems", "serious", "several", "she", "should",
    "show", "side", "since", "sincere", "six", "sixty", "so", "some", "somehow", "someone",
    "something", "sometime", "sometimes", "somewhere", "still", "such", "system", "take", "ten",
    "than", "that", "the", "their", "them", "themselves", "then", "thence", "there", "thereafter",
    "thereby", "therefore", "therein", "thereupon", "these", "they", "thick", "thin", "third",
    "this", "those", "though", "three", "through", "throughout", "thru", "thus", "to", "together",
    "too", "top", "toward", "towards", "twelve", "twenty", "two", "un", "under", "until", "up",
    "upon", "us", "very", "via", "was", "we", "well", "were", "what", "whatever", "when",
    "whence", "whenever", "where", "whereafter", "whereas", "whereby", "wherein", "whereupon",
    "wherever", "whether", "which", "while", "whither", "who", "whoever", "whole", "whom",
    "whose", "why", "will", "with", "within", "without", "would", "yet", "you", "your", "yours",
    "yourself", "yourselves", "the"
  ];
  stopwords = stopwords.join("[^a-z]|[^a-z]");

  let title_unique = title;
  let re = new RegExp(stopwords);
  while (title_unique !== title_unique.replace(re, ' ')) {  // do until no more words left to replace
    title_unique = title_unique.replace(re, ' ');
  }
  //title_unique = [...new Set(title_unique.split(" "))];

  if (bg && debug) {
    bg.console.log(title_unique);
  }

  return title_unique;
}


// Clean up the text of the body
function format_body(body) {
  // Clean the text content
  let clean_body = body.replace(/[^\w\s]/gi, '').toLowerCase();
  // Remove the newlines
  clean_body = clean_body.replace(/(\r\n|\n|\r)/gm," ");

  return clean_body;
}


// A utility function to obtain a formatted date
function get_date_string() {
  let d       = new Date();
  let year    = d.getFullYear();
  let month   = d.getMonth() + 1; // Month is 0-11 but added 1 to make it 1-12
  let day     = d.getDate();
  let hour    = d.getHours();
  let minute  = d.getMinutes();
  let second  = d.getSeconds();

  let tz_offset = d.getTimezoneOffset();

  return `${year}/${month}/${day} ${hour}:${minute}:${second}`;
}


// Gets the main part of the URL
function strip_url(u) {
  u = u.split('://')[1];
  u = u.split('/')[0];
  return u;
}


// Gets positioning info calculated from bias
// map bias to a number between 0-84
function position_from_bias(b) {
  return (b + 42) / 84 * 100;
}


// Bag of words
function bow(text, vocabulary, bg) {
  var vector = [];
  var arr = text.split(' ');

  var dict = {};
  var keys = [];
  var words;
  arr.forEach(function (word) {
    word = word.toLowerCase();
    if (!dict[word] && word !== '') {
      dict[word] = 1;
      keys.push(word);
    } else {
      dict[word] += 1;
    }
  });

  vocabulary.split(' ').forEach(function (word) {
    vector.push(dict[word] || 0);
  });
  if (debug) {
    bg.console.log(vector);
  }

  return vector;
}


// Euclidean distance between two n-dimensional points
function ndistance(src, dest) {
  var total = 0;
  var diff = 0;

  var arrayLength = src.length;
  for (var i = 0; i < arrayLength; i++) {
    diff = src[i] - dest[i];
    total += diff * diff;
  }

  return Math.sqrt(total);
}
