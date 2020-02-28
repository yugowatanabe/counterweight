#!/usr/bin/env python3

import matplotlib.pyplot as plt
from tldextract import extract

# Populate a dictionary with the sources and their corresponding bias
sources = open("csv/sources_histogram.csv","r")
sources_bias = {}
for line in sources:
    current = line.split(',')
    current_source = current[0].replace(" ", "").lower()
    current_bias = round(float(current[2]))
    sources_bias[current_source] = current_bias

x = []

# Open user data
data = open("data","r")
for line in data:
    current = line.split(',')
    type = current[1]
    url = current[2]

    # Check if the current line is a clicked_link line
    if type == "clicked_link":
        # Extract the url
        tsd, td, tsu = extract(url)
        if td in sources_bias:
            x.append(sources_bias[td])

print(x)
plt.hist(x, bins=10)
plt.title('User Newsite Bias History Distribution')
plt.xlabel('Bias')
plt.show()
