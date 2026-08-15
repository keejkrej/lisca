# Studio analysis demo

Browser-only mock of Studio result visualization. It loads **fixture** analysis CSVs for transfection and killing so the team can iterate on plots without a workspace or real experiment.

The fixtures are synthetic and labeled as sample data. Column names match the Rust pipeline (`slide`, `roi,t,...`, `kill_curve.csv`, `death_times.csv`).

## Start

From the repo root:

```sh
vp run dev:studio-demo
```

Or:

```sh
vp run --filter @lisca/studio-demo dev
```

The app listens on [http://localhost:5177](http://localhost:5177).

Use the navbar to switch `transfection.fixture` and `killing.fixture`. Dock buttons switch Timeseries vs Parameters (transfection) or Survival (killing).

## What you should see

- **Transfection:** intensity traces (median overlay), then mRNA lifetime / AUC / expression rate / onset time boxplots. Expression rate uses a log y-scale.
- **Killing:** P(dead) traces, one overlaid N(alive) kill curve with a sample legend, and per-sample death-time histograms on a shared time axis.
