import csv
import datetime as dt
import pandas as pd
import plotly.graph_objects as go
import sys

fname = sys.argv[1]


def get_scroll_fig(fname):
    '''
    Given the name of a data file, produce two go.Figure objects that can be
    viewed using fig.show()
    '''
    dates, urls, percents = [], [], []
    with open(fname) as f:
        reader = csv.reader(f)

        for row in reader:
            if row[1] != "scrolled":
                continue
            d = dt.datetime.strptime(row[0], "%Y/%m/%d %H:%M:%S")
            dates.append(d)
            urls.append(row[2])
            percents.append(float(row[3]))

    df = pd.DataFrame({"date": dates, "url": urls, "percent": percents})


    fig_a = go.Figure()
    fig_b = go.Figure()

    for u in pd.unique(df["url"]):
        selected_df = df.loc[df["url"] == u]
        selected_df["time_from_start"] = selected_df["date"].apply(lambda x: (x - selected_df.iloc[0]["date"]).total_seconds())

        s = go.Scatter(
            x=selected_df["date"],
            y=selected_df["percent"],
            mode="markers+lines",
            name=f"{u.lstrip('https://')[:10]}..."      # TODO: Update formatting of article name
        )
        fig_a.add_trace(s)

        s = go.Scatter(
            x=selected_df["time_from_start"],
            y=selected_df["percent"],
            mode="markers+lines",
            name=f"{u.lstrip('https://')[:10]}..."      # TODO: Update formatting of article name
        )
        fig_b.add_trace(s)

        # Add estimated upper bound - looks kind of bad
        # s = go.Scatter(
        #     x=selected_df["date"],
        #     y=selected_df["percent"].apply(lambda x: x - selected_df.iloc[0]["percent"]),
        #     mode="markers+lines",
        #     name=f"{u} (estimated upper bound)"
        # )
        # fig.add_trace(s)

    fig_a.update_layout(
        title="Article History",
        xaxis_title="Time",
        yaxis_title="Article Completion (%)"
    )
    fig_b.update_layout(
        title="Article History",
        xaxis_title="Time",
        yaxis_title="Article Completion (%)"
    )

    return fig_a, fig_b


if __name__ == "__main__":
    if (len(sys.argv)) <= 1:
        print("USAGE: python3 scroll_tracker.py inputData")
        sys.exit()

    fig_a, fig_b = get_scroll_fig(fname)
    fig_a.show()
    fig_b.show()
