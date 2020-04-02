#!/usr/bin/env python3

import sys
import matplotlib.pyplot as plt

# Check for adequate number of args
if (len(sys.argv)) <= 1:
    print("USAGE: python3 histogram_ticks.py inputData")
    sys.exit()

# Populate a dictionary with the sources and their corresponding bias
sources = open("../csv/sources_histogram.csv","r")
sources_bias = {}
for line in sources:
    current = line.split(',')
    current_source = current[0]
    current_bias = float(current[1])
    sources_bias[current_source] = current_bias

x = []

# Open user data
data = open(sys.argv[1],"r")
for line in data:
    current = line.split(',')
    type = current[1]
    source = current[2].rstrip()
    # Remove '_bar' at the end of the string
    if source.endswith('_bar'):
        source = source[:-len('_bar')]

    # Check if the current line is a clicked_link line
    if type == "hovered_tick":
        print(source)
        if source in sources_bias:
            x.append(sources_bias[source])

print(x)
plt.hist(x, bins=15, range=(-30, 30))
plt.title('User Newsite Bias History Distribution of Tick Hovering: {}'.format(sys.argv[1].split('/')[len(sys.argv[1].split('/')) - 1]))
plt.xlabel('Bias')
plt.ylabel('Hover Count')
plt.show()
