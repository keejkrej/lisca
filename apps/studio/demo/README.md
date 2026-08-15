# Studio analysis demo

Browser-only mock of Studio result visualization. It loads **fixture** PNG plot
files for transfection and killing — the same filenames the Rust pipeline writes
via mplot-rs — so the team can iterate on the result gallery without a workspace
or real experiment.

The images are tiny placeholder PNGs labeled as sample data. They are not drawn
in the browser.

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

Use the navbar to switch `transfection.fixture` and `killing.fixture`. Dock
buttons switch Timeseries vs Parameters (transfection) or Survival (killing).

## What you should see

- **Transfection:** `traces.png`, `traces_summary.png`, `area.png`, `traces_fit.png`,
  then `mrna_lifetime.png`, `auc.png`, `expression_rate.png`, `onset_time.png`.
- **Killing:** `traces.png`, then `kill_curve.png` and `death_times.png`.
