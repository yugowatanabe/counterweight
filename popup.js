
document.addEventListener("DOMContentLoaded", function(event) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {

    // get background page for logging
    bg = chrome.extension.getBackgroundPage();

    // get tab title
    var title = tabs[0].title;
    bg.console.log("Tab title: " + title);

    // clean tab title
    title = title.split(' - ')[0];
    title = title.split(' | ')[0];
    chrome.storage.local.set({title: title});
    title = title.replace(/[^\w\s]/gi, '').toLowerCase();
    bg.console.log("Clean title: " + title);

    // title formatted for a search powered by News API
    var title_url = title.replace(/ /g, "%20OR%20");

    // only unique words in title with stopwords removed
    var stopwords = ["a", "about", "above", "above", "across", "after", "afterwards", "again", "against", "all", "almost", "alone", "along", "already", "also","although","always","am","among", "amongst", "amoungst", "amount",  "an", "and", "another", "any","anyhow","anyone","anything","anyway", "anywhere", "are", "around", "as",  "at", "back","be","became", "because","become","becomes", "becoming", "been", "before", "beforehand", "behind", "being", "below", "beside", "besides", "between", "beyond", "bill", "both", "bottom","but", "by", "call", "can", "cannot", "cant", "co", "con", "could", "couldnt", "cry", "de", "describe", "detail", "do", "done", "down", "due", "during", "each", "eg", "eight", "either", "eleven","else", "elsewhere", "empty", "enough", "etc", "even", "ever", "every", "everyone", "everything", "everywhere", "except", "few", "fifteen", "fify", "fill", "find", "fire", "first", "five", "for", "former", "formerly", "forty", "found", "four", "from", "front", "full", "further", "get", "give", "go", "had", "has", "hasnt", "have", "he", "hence", "her", "here", "hereafter", "hereby", "herein", "hereupon", "hers", "herself", "him", "himself", "his", "how", "however", "hundred", "ie", "if", "in", "inc", "indeed", "interest", "into", "is", "it", "its", "itself", "keep", "last", "latter", "latterly", "least", "less", "ltd", "made", "many", "may", "me", "meanwhile", "might", "mill", "mine", "more", "moreover", "most", "mostly", "move", "much", "must", "my", "myself", "name", "namely", "neither", "never", "nevertheless", "next", "nine", "no", "nobody", "none", "noone", "nor", "not", "nothing", "now", "nowhere", "of", "off", "often", "on", "once", "one", "only", "onto", "or", "other", "others", "otherwise", "our", "ours", "ourselves", "out", "over", "own","part", "per", "perhaps", "please", "put", "rather", "re", "same", "see", "seem", "seemed", "seeming", "seems", "serious", "several", "she", "should", "show", "side", "since", "sincere", "six", "sixty", "so", "some", "somehow", "someone", "something", "sometime", "sometimes", "somewhere", "still", "such", "system", "take", "ten", "than", "that", "the", "their", "them", "themselves", "then", "thence", "there", "thereafter", "thereby", "therefore", "therein", "thereupon", "these", "they", "thick", "thin", "third", "this", "those", "though", "three", "through", "throughout", "thru", "thus", "to", "together", "too", "top", "toward", "towards", "twelve", "twenty", "two", "un", "under", "until", "up", "upon", "us", "very", "via", "was", "we", "well", "were", "what", "whatever", "when", "whence", "whenever", "where", "whereafter", "whereas", "whereby", "wherein", "whereupon", "wherever", "whether", "which", "while", "whither", "who", "whoever", "whole", "whom", "whose", "why", "will", "with", "within", "without", "would", "yet", "you", "your", "yours", "yourself", "yourselves", "the"];
    stopwords = stopwords.join("[^a-z]|[^a-z]");

    var title_unique = title;
    var re = new RegExp(stopwords);
    while(title_unique !== title_unique.replace(re, ' ')) {  // do until no more words left to replace
      title_unique = title_unique.replace(re, ' ');
    }
    title_unique = [...new Set(title_unique.split(" "))];
    bg.console.log(title_unique);

    // search news for keywords in title
    var url = 'https://newsapi.org/v2/everything?' +
      'q=' + title_url + '&' +
      // 'from=' + date + '&' +
      'sortBy=relevancy&' +
      'pageSize=100&' +
      'page=1&' +
      'apiKey=afb1d15f19724f608492f69997c94820';
    var req = new Request(url);

    // handle the JSON object returned containing articles
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
        bg.console.log(result);
        chrome.storage.local.set({articles: result});

        // list results in popup.html, listed with bias
        chrome.storage.local.get(['source_biases'], function(get_result) {
          var biases_dict = get_result.source_biases;
          var resultsList = document.getElementById('results');
          var i;
          for (i = 0; i < 5; i++) {
            // create list element
            var node = document.createElement("LI");
            // get image of article
            var text = "<img src='" + result[i].urlToImage + "' style='height:30px;'><br>";
            // get url to article
            text += "<a href='" + result[i].url + "'>";
            // get source name
            var source = result[i].source['name'];
            text += source + "</a>";
            text += ": " + result[i].title + "<br>";
            // if we know bias of source (is in keys of biases_dict), print it
            if (biases_dict[source] !== undefined) {
              text += "(Bias: "   + biases_dict[source].bias + ", ";
              text += "Quality: " + biases_dict[source].quality + ")<br>";
            }
            node.innerHTML = text;
            resultsList.appendChild(node);
          }
        });
      });
    });
  });
});
