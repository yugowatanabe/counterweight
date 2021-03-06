#!/usr/bin/env python3

import sys
from datetime import datetime
from statistics import mean, median, stdev

# Check for adequate number of args
if (len(sys.argv)) <= 1:
    print("USAGE: python3 read_time_stats.py inputData")
    sys.exit()

# Populate a dictionary with the sources and their corresponding bias
sources = open("../csv/sources_histogram.csv","r")
sources_bias = {}
for line in sources:
    current = line.split(',')
    current_source = current[3].rstrip()
    current_bias = float(current[1])
    sources_bias[current_source] = current_bias

visited_pages = {}
# Open user data
data = open(sys.argv[1],"r")
for line in data:
    current = line.split(',')
    time_stamp = current[0]
    type = current[1]
    url = current[2].rstrip()

    # Check for entering an article
    if type == "entering_news_tab":
        if url not in visited_pages:
            visited_pages[url] = (0, datetime.strptime(time_stamp, '%Y/%m/%d %H:%M:%S'))
        else:
            visited_pages[url] = (visited_pages[url][0], datetime.strptime(time_stamp, '%Y/%m/%d %H:%M:%S'))

    # Check for leaving an article
    if type == "closed_news_site" or type == 'leaving_news_tab':
        if url in visited_pages:
            if visited_pages[url][1] is not None:
                visited_pages[url] = (visited_pages[url][0] + (datetime.strptime(time_stamp, '%Y/%m/%d %H:%M:%S') - visited_pages[url][1]).total_seconds(), None)

min = float('inf')
max = float('-inf')

x = []
# Get stats from all the pages read
for key, value in visited_pages.items():
    time_spent = int(value[0])
    if time_spent < min:
        min = time_spent
    if time_spent > max:
        max = time_spent
    x.append(time_spent)

print('mean time: {}'.format(mean(x)))
print('minimum time: {}'.format(min))
print('median time: {}'.format(median(x)))
print('maximum time: {}'.format(max))
print('stdev time: {}'.format(stdev(x)))
