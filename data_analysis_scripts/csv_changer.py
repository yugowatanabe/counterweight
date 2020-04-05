#!/usr/bin/env python3

# Populate a dictionary with the sources and their corresponding bias
sources = open("../csv/media-bias-scrubbed-results.csv","r")
count = 0
for line in sources:
    if count is 0:
        count = 1
        continue
    current = line.split(',')
    cut_url = current[1]
    cut_url = cut_url.split('://')[1]
    cut_url = cut_url.split('/')[0]

    print("{},{},{},{}".format(current[0], cut_url, current[2], current[3]), end='')
