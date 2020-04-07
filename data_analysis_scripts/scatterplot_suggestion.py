#!/usr/bin/env python3

import sys
import matplotlib.pyplot as plt

# Check for adequate number of args
if (len(sys.argv)) <= 1:
    print("USAGE: python3 scatterplot_suggestion.py inputData")
    sys.exit()

# Populate a dictionary with the sources and their corresponding bias
sources = open("../csv/updated_sources_histogram.csv","r")
sources_bias = {}
for line in sources:
    current = line.split(',')
    current_source = current[1]
    current_bias = float(current[2])
    sources_bias[current_source] = current_bias

x = []
y = []

# Open user data
data = open(sys.argv[1],"r")
for line in data:
    current = line.split(',')
    type = current[1]
    if type == 'clicked_link':
        url_dest = current[2]
        url_dest = url_dest.split('://')[1]
        url_dest = url_dest.split('/')[0]
        url_source = current[3].rstrip()
        url_source = url_source.split('://')[1]
        url_source = url_source.split('/')[0]
        if url_source in sources_bias and url_dest in sources_bias:
            x.append(sources_bias[url_source])
            y.append(sources_bias[url_dest])

plt.scatter(x, y)
plt.title('Relationship Between Source Article and Suggestion Article Clicks: {}'.format(sys.argv[1].split('/')[len(sys.argv[1].split('/')) - 1]))
plt.xlabel('Source Article Bias')
plt.ylabel('Destination Article Bias')
plt.show()
