#!/usr/bin/env python3

import sys
import matplotlib.pyplot as plt

# Check for adequate number of args
if (len(sys.argv)) <= 1:
    print("USAGE: python3 histogram.py inputData")
    sys.exit()

# Populate a dictionary with the sources and their corresponding bias
sources = open("../csv/sources_histogram.csv","r")
sources_bias = {}
for line in sources:
    current = line.split(',')
    current_source = current[3].rstrip()
    current_bias = float(current[1])
    sources_bias[current_source] = current_bias

x = []

# Open user data
data = open(sys.argv[1],"r")
for line in data:
    current = line.split(',')
    type = current[1]
    url = current[2]

    # Check if the current line is a clicked_link line
    if type == "entering_news_tab":
        url = url.split('://')[1]
        url = url.split('/')[0]
        if url in sources_bias:
            x.append(sources_bias[url])

print(x)
plt.hist(x, bins=15, range=(-30, 30))
plt.title('User Newsite Bias History Distribution')
plt.xlabel('Bias')
plt.ylabel('Visit Count')
plt.show()
