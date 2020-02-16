
document.addEventListener("DOMContentLoaded", function(event) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {    
    // get background page for logging
    bg = chrome.extension.getBackgroundPage();

    // Demonstrate getting email
    if (bg) {
      chrome.identity.getProfileUserInfo(function (info) {
        bg.console.log(info.email);
      });
    }

    // Record Time of Icon Click
    chrome.storage.local.get(["click_times"], function(res) {
      times = res["click_times"];
      times.push(Date());
      chrome.storage.local.set({"click_times": times});
    });

    // get tab title
    var title = tabs[0].title;
    if (bg) {
      bg.console.log("Tab title: " + title);
      bg.console.log("URL: " + tabs[0].url);  // Send to server to view article?
    }
    title = clean_title(title, bg);

    // search news for keywords in title
    var title_url = title.replace(/ /g, "%20OR%20"); // title formatted for a search powered by News API
    var url = 'https://newsapi.org/v2/everything?' +
      'q=' + title_url + '&' +
      // 'from=' + date + '&' +
      'sortBy=relevancy&' +
      'pageSize=100&' +
      'page=1&' +
      'apiKey=afb1d15f19724f608492f69997c94820';
    var req = new Request(url);

    // handle the JSON object returned containing articles
    var title_unique = format_title(title, bg);
    fetch(req).then(function(response) {
      response.json().then( function(obj) {
        // get array of articles
        articles = obj.articles;

        // count number of word matches in target title to each article result
        var counts = [];
        articles.forEach(function(article){

          // get text of article (its title and description)
          var text = article.title + " " + article.description;
          text = text.replace(/[^\w\s]/gi, '').toLowerCase();

          // for each unique word in the title, check if in article
          var count = 0;
          title_unique.forEach(function(title_word){
            if (text.includes(title_word)) {
              count = count + 1;
            }
          });

          // save number of words in article matching target title
          counts.push(count);
        });

        // sort articles according to number of matches (more matches, higher rank)
        const result = articles.map((item, index) => [counts[index], item]).sort(([count1], [count2]) => count2 - count1).map(([, item]) => item);
        counts = counts.sort(function(a, b){return b-a});  // sort counts
        if (bg) {
          bg.console.log(result);
          bg.console.log(counts);
        }

        chrome.storage.local.set({articles: result});

        // list results in popup.html, listed with bias
        chrome.storage.local.get(['source_biases'], function(get_result) {
          var biases_dict = get_result.source_biases;

          // div which holds the divs illustrating bar along spectrum per article
          var bar = document.getElementById('bar');
          var container = document.getElementById('container');
          var i = 0;

          // for all articles with 3 or more matching keywords
          while (counts[i] > 2) {
            // get source name and id
            var source    = result[i].source['name'];
            var source_id = result[i].source['id'];

            // if we know bias of source (is in keys of biases_dict), show article
            if (biases_dict[source] !== undefined) {

              // try to get div with source's id, if doesn't exist, create it
              var source_div = document.getElementById(source);
              if (source_div == null) {
                // if it doesn't exist, create it
                source_div = document.createElement("DIV");
                source_div.setAttribute("id", source);
                source_div.setAttribute("class", "src_results");
                source_div.style.display = "none";
                source_div.style.height = "inherit";
                source_div.style.overflowY = "auto";

                var source_h = document.createElement("H2");  // hold source name
                source_h.setAttribute("class", "src_name");
                source_h.innerHTML = source;
                var source_q = document.createElement("P");  // hold source quality
                source_q.setAttribute("class", "src_qual");
                source_q.innerHTML = "Quality:&nbsp;&nbsp;";
                let color = get_color(Math.round(biases_dict[source].quality)/64.);
                let r = color[0]; let g = color[1]; let b = color[2];
                source_q.innerHTML += parse("<span style='color:rgba(%s,%s,%s);'>", r, g, b) + Math.round(biases_dict[source].quality) + "</span>";

                source_div.appendChild(source_h);
                source_div.appendChild(source_q);
                container.appendChild(source_div);

                // also create tick for source on spectrum bar
                var bias = (biases_dict[source].bias*2 + 42)/84*100;  // map bias to a number between 0-84
                var tick = document.createElement("DIV");  // put icon along spectrum bar
                tick.setAttribute("id", source + "_bar");
                tick.setAttribute("class", "tick");
                tick.style =   "width: 3px;\
                                height: 15px;\
                                background-color: #8c8c8c;\
                                display: inline-flex;\
                                position: absolute;\
                                left: "+ bias + "\%;";
                bar.appendChild(tick);
              }

              // create list element for article
              var node = document.createElement("P");
              node.setAttribute("class", "article");
              // get image of article
              var text = "<img src='" + result[i].urlToImage + "'>";
              // get url to article
              text += "<a href='" + result[i].url + "' target='_blank'>";
              text += result[i].title + "</a>";

              // get published date/time
              var time = result[i].publishedAt.match(/(.*)-(.*)-(.*)T(.*):(.*):(.*)Z/);
              var event = new Date(Date.UTC(time[1], time[2], time[3], time[4], time[5], time[6]));
              time =  event.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
              text += "<p class='description'><i>" + time + "</i>&nbsp;&nbsp;-&nbsp;";
              text += result[i].description + "</p>";
              // text += "(Bias: "   + biases_dict[source].bias + ", ";
              // text += "Quality: " + biases_dict[source].quality + ")<br>";

              // Add Link to go to article
              node.innerHTML = text;

              function add_url(logged_url, bg) {
                chrome.tabs.create({active: false, url: logged_url});

                if (bg) {
                  bg.console.log(logged_url);
                }

                // Record Time of Icon Click
                chrome.storage.local.get(["clicked_links"], function(res) {
                  links = res["clicked_links"];
                  links.push([Date(), logged_url]);
                  chrome.storage.local.set({"clicked_links": links});
                });
              }
              node.addEventListener("click", add_url.bind(null, result[i].url, bg));
              source_div.appendChild(node);
            }
            i++;
          }

          // add event listeners to ticks
          var ticks = document.getElementsByClassName("tick");
          for (var i = 0; i < ticks.length; i++) {
            ticks[i].addEventListener('mouseover', tick_mouseover, false);
          }

          // manually trigger event on one of the divs to display on start
          var event; // The custom event that will be created
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

// function handling what happens on hover on tick
var tick_mouseover = function () {
  // get all ticks and reset their sizes
  var ticks = document.getElementsByClassName("tick");
  for (var i = 0; i < ticks.length; i++) {
    ticks[i].style.height = "15px";
    ticks[i].style.backgroundColor = "#8c8c8c";
  }
  // make only hovered tick large
  this.style.height = "20px";
  this.style.backgroundColor = "#248f24";

  // get all source results and hide all of them
  var src_results = document.getElementsByClassName("src_results");
  for (var i = 0; i < src_results.length; i++) {
    src_results[i].style.display = "none";
  }

  // get name of news source to show, and show only results for that news source
  var tick_id = this.getAttribute("id");
  var source = tick_id.substring(0, tick_id.length-4);
  var source_div = document.getElementById(source);
  source_div.style.display = "block";

  // Record Time of Icon Click
  chrome.storage.local.get(["hovered_ticks"], function(res) {
    hovers = res["hovered_ticks"];
    hovers.push([Date(), tick_id]);
    chrome.storage.local.set({"hovered_ticks": hovers});
  });
}

// function which returns color (red to green) based on weight
function get_color(weight) {
  var w1 = weight;
  var w2 = 1 - w1;
  var color1 = [0,   180, 0];
  var color2 = [200, 0,   0];
  var rgb = [Math.round(color1[0] * w1 + color2[0] * w2),
     Math.round(color1[1] * w1 + color2[1] * w2),
     Math.round(color1[2] * w1 + color2[2] * w2)];
  return rgb;
}

// function helping to format string
function parse(str) {
    var args = [].slice.call(arguments, 1),
        i = 0;

    return str.replace(/%s/g, () => args[i++]);
}


// Functions to handle title

function clean_title(title, bg) {
  title = title.split(' - ')[0];
  title = title.split(' | ')[0];
  var head = document.getElementById('head');
  head.innerHTML = "Related to '<i>" + title + "</i>'";
  chrome.storage.local.set({title: title});
  title = title.replace(/[^\w\s]/gi, '').toLowerCase();
  if (bg) {
    bg.console.log("Clean title: " + title);
  }
  
  return title;
}

function format_title(title, bg) {
  // only unique words in title with stopwords removed
  var stopwords = ["about", "a", "above", "above", "across", "after", "afterwards", "again", "against", "all", "almost", "alone", "along", "already", "also","although","always","am","among", "amongst", "amoungst", "amount",  "an", "and", "another", "any","anyhow","anyone","anything","anyway", "anywhere", "are", "around", "as",  "at", "back","be","became", "because","become","becomes", "becoming", "been", "before", "beforehand", "behind", "being", "below", "beside", "besides", "between", "beyond", "bill", "both", "bottom","but", "by", "call", "can", "cannot", "cant", "co", "con", "could", "couldnt", "cry", "de", "describe", "detail", "do", "done", "down", "due", "during", "each", "eg", "eight", "either", "eleven","else", "elsewhere", "empty", "enough", "etc", "even", "ever", "every", "everyone", "everything", "everywhere", "except", "few", "fifteen", "fify", "fill", "find", "fire", "first", "five", "for", "former", "formerly", "forty", "found", "four", "from", "front", "full", "further", "get", "give", "go", "had", "has", "hasnt", "have", "he", "hence", "her", "here", "hereafter", "hereby", "herein", "hereupon", "hers", "herself", "him", "himself", "his", "how", "however", "hundred", "ie", "if", "in", "inc", "indeed", "interest", "into", "is", "it", "its", "itself", "keep", "last", "latter", "latterly", "least", "less", "ltd", "made", "many", "may", "me", "meanwhile", "might", "mill", "mine", "more", "moreover", "most", "mostly", "move", "much", "must", "my", "myself", "name", "namely", "neither", "never", "nevertheless", "next", "nine", "no", "nobody", "none", "noone", "nor", "not", "nothing", "now", "nowhere", "of", "off", "often", "on", "once", "one", "only", "onto", "or", "other", "others", "otherwise", "our", "ours", "ourselves", "out", "over", "own","part", "per", "perhaps", "please", "put", "rather", "re", "same", "see", "seem", "seemed", "seeming", "seems", "serious", "several", "she", "should", "show", "side", "since", "sincere", "six", "sixty", "so", "some", "somehow", "someone", "something", "sometime", "sometimes", "somewhere", "still", "such", "system", "take", "ten", "than", "that", "the", "their", "them", "themselves", "then", "thence", "there", "thereafter", "thereby", "therefore", "therein", "thereupon", "these", "they", "thick", "thin", "third", "this", "those", "though", "three", "through", "throughout", "thru", "thus", "to", "together", "too", "top", "toward", "towards", "twelve", "twenty", "two", "un", "under", "until", "up", "upon", "us", "very", "via", "was", "we", "well", "were", "what", "whatever", "when", "whence", "whenever", "where", "whereafter", "whereas", "whereby", "wherein", "whereupon", "wherever", "whether", "which", "while", "whither", "who", "whoever", "whole", "whom", "whose", "why", "will", "with", "within", "without", "would", "yet", "you", "your", "yours", "yourself", "yourselves", "the"];
  stopwords = stopwords.join("[^a-z]|[^a-z]");

  var title_unique = title;
  var re = new RegExp(stopwords);
  while(title_unique !== title_unique.replace(re, ' ')) {  // do until no more words left to replace
    title_unique = title_unique.replace(re, ' ');
  }
  title_unique = [...new Set(title_unique.split(" "))];
  if (bg) {
    bg.console.log(title_unique);
  }

  return title_unique;
}
