#!/usr/bin/env python3

import matplotlib.pyplot as plt
from tldextract import extract

# Populate a dictionary with the sources and their corresponding bias
sources = open("../csv/sources_histogram.csv","r")
sources_bias = {}
highest = 0
lowest = 999
for line in sources:
    current = line.split(',')
    current_source = current[0].replace(" ", "").lower()
    current_bias = float(current[1])
    if current_bias < lowest:
        lowest = current_bias
    if current_bias > highest:
        highest = current_bias

print("highest: " + str(highest) + "\n")
print("lowest: " + str(lowest) + "\n")
