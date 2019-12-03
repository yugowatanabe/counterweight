from flask import Flask, request, jsonify
from flask_restful import Resource, Api
from newspaper import Article
import nltk
import re
from collections import defaultdict
from gensim import corpora
import json

# import logging
# logging.basicConfig(format='%(asctime)s  %(levelname)s  %(message)s', level=logging.INFO)
nltk.download('punkt')

app = Flask(__name__)
api = Api(app)

@app.route('article-summary',methods=['GET'])

def article_summary():
    source_url = request.args.get('url')
    list_of_urls = request.args.getlist('list_url')
    summary_source = get_summary(source_url)
    summaries_target = []
    for item in list_of_urls:
        item_summary = get_summary(item)
        summaries_target.append(item_summary)

    documents = summaries_target

    stoplist = set('about a above above across after afterwards again against all almost alone along already also although always am among amongst amoungst amount an and another any anyhow anyone anything anyway anywhere are around as at back be became because become becomes becoming been before beforehand behind being below beside besides between beyond bill both bottom but by call can cannot cant co con could couldnt cry de describe detail do done down due during each eg eight either eleven else elsewhere empty enough etc even ever every everyone everything everywhere except few fifteen fify fill find fire first five for former formerly forty found four from front full further get give go had has hasnt have he hence her here hereafter hereby herein hereupon hers herself him himself his how however hundred ie if in inc indeed interest into is it its itself keep last latter latterly least less ltd made many may me meanwhile might mill mine more moreover most mostly move much must my myself name namely neither never nevertheless next nine no nobody none noone nor not nothing now nowhere of off often on once one only onto or other others otherwise our ours ourselves out over own part per perhaps please put rather re same see seem seemed seeming seems serious several she should show side since sincere six sixty so some somehow someone something sometime sometimes somewhere still such system take ten than that the their them themselves then thence there thereafter thereby therefore therein thereupon these they thick thin third this those though three through throughout thru thus to together too top toward towards twelve twenty two un under until up upon us very via was we well were what whatever when whence whenever where whereafter whereas whereby wherein whereupon wherever whether which while whither who whoever whole whom whose why will with within without would yet you your yours yourself yourselves the for a of the and to in'.split())
    texts = [
        [word for word in document.lower().split() if word not in stoplist]
        for document in documents
    ]

    # remove words that appear only once
    frequency = defaultdict(int)
    for text in texts:
        for token in text:
            frequency[token] += 1

    texts = [
        [token for token in text if frequency[token]> 1]
        for text in texts
    ]

    dictionary = corpora.Dictionary(texts)
    corpus = [dictionary.doc2bow(text) for text in texts]
    
    from gensim import models
    lsi = models.LsiModel(corpus, id2word=dictionary, num_topics=2)
    
    doc=summary_source
    vec_bow = dictionary.doc2bow(doc.lower().split())
    vec_lsi = lsi[vec_bow] 
    from gensim import similarities
    index = similarities.MatrixSimilarity(lsi[corpus])
    sims = index[vec_lsi]  # perform a similarity query against the corpus
    sims = sorted(enumerate(sims), key=lambda item: -item[1])
    list_of_indices = []
    for i, s in enumerate(sims):
        list_of_indices.append(str(s[0]))
  
    response = jsonify(list_of_indices)
    response.headers.add('Access-Control-Allow-Origin', '')
    return response
  
class result:
    def __init__(self, idx, score):
        self.idx = idx
        self.score = score
    

def get_summary(url):
    article = Article(url)
    article.download()
    article.parse()
    article.nlp()
    summary = article.summary
    regex = re.compile(r'[nrt]')
    summary = regex.sub("", summary)
    return summary

if __name__ == __main__:
	app.run()