#!/usr/bin/env python3

import sys
import matplotlib.pyplot as plt
from datetime import datetime

# Check for adequate number of args
if (len(sys.argv)) <= 2:
    print("USAGE: python3 histogram_min_time.py inputData timeThreshhold")
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

x = []

# Traverse through each website where it met the minimum
for key, value in visited_pages.items():
    #print(item)
    #print(value)
    url = key
    time_spent = float(value[0])
    if time_spent > float(sys.argv[2]) and value[1] is None:
        url = url.split('://')[1]
        url = url.split('/')[0]
        if url in sources_bias:
            x.append(sources_bias[url])

print(x)
plt.hist(x, bins=15, range=(-30, 30))
plt.title('User Newsite Bias History Distribution Where Time Spent Was at Least {} seconds: {}'.format(sys.argv[2], sys.argv[1].split('/')[len(sys.argv[1].split('/')) - 1]))
plt.xlabel('Bias')
plt.ylabel('Visit Count')
plt.show()
