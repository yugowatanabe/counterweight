#!/usr/bin/env python3

import sys
import matplotlib.pyplot as plt

# Check for adequate number of args
if (len(sys.argv)) <= 1:
    print("USAGE: python3 bargraph_popup_usage.py inputData")
    sys.exit()

level_one = 0
level_two = 0
level_three = 0

x = ['Open Popup', 'Reached Hovered', 'Reached Suggestion']
prev = -1
# Open user data
data = open(sys.argv[1],"r")
for line in data:
    current = line.split(',')
    type = current[1]

    if type == "click":
        # Increment count of last operation
        if prev == 1:
            level_one += 1
        elif prev == 2:
            level_two += 1
        elif prev == 3:
            level_three += 1
        prev = 1
    elif type == "hovered_tick":
        if prev < 3:
            prev = 2
    elif type == "clicked_link":
        prev = 3

# Account for last one
if prev >= 1:
    if prev == 1:
        level_one += 1
    elif prev == 2:
        level_two += 1
    elif prev == 3:
        level_three += 1

y = [level_one, level_two, level_three]
plt.bar(x, y)
plt.title('User Engagement with Extension: {}'.format(sys.argv[1].split('/')[len(sys.argv[1].split('/')) - 1]))
plt.xlabel('Engagement Level')
plt.ylabel('Count')
plt.show()
