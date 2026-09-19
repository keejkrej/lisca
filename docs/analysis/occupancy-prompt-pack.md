# Occupancy prompt pack

Do **not** retrain Smart exclude per user or lab. Prompt it with examples from
the assay in front of you.

Product Smart exclude (`models/smart-exclusion-resnet18`) remains the **cold
start / fallback**. It cannot be fine-tuned per lab. The prompt pack is the
adaptation path: a few occupied vs empty micropattern crops, a frozen embedder,
distance-to-prototype scores for the rest.

## Assay-scoped only

The pack lives at `align/occupancy-pack.json` on **that workspace**. There is
no lab-wide memory and no carry-over between assays.

## Bootstrap, then accumulate

1. On a new assay, place the grid and do the first FOVs with **Var exclude**
   (variance) and/or **manual** include/exclude. Do not wait on Smart exclude
   before examples exist.
2. Each manual include (occupied) or exclude (empty) edit in Studio Align
   **appends** that crop + label to the pack. A later correction of the same
   `(pos, i, j)` replaces the earlier example. No weight training.
3. Promptable Smart exclude is **gated** until the pack has **≥2 occupied and
   ≥2 empty** examples. Until then the rail/CLI says the pack is not ready and
   Smart exclude stays on ResNet.
4. After the gate, further edits still grow the same assay pack. Click
   **Smart exclude** to re-score remaining sites against the updated
   prototypes.

## How scoring works

The v0 embedder (`lisca-occupancy-v0`) is a deterministic 16×16 min-max
descriptor plus a few intensity stats — not a contrastive model. Class
prototypes are L2-normalized means. Exclude score is
`cosine(empty) − cosine(occupied)` (equivalent for L2-normalized vectors).
Swap the embedder later without changing the JSON shape.

## CLI (runnable without Studio)

```sh
# One-shot pack from crop images (replaces the file)
lisca occupancy pack --workspace /data/run \
  --occupied occupied-a.png --occupied occupied-b.png \
  --empty empty-a.png --empty empty-b.png

# Append a correction (same accumulating path as Align edits)
lisca occupancy record --workspace /data/run --empty empty-c.png

# Ready? exit 0 when gated; exit 2 + message when not
lisca occupancy status --workspace /data/run

# Score one crop once the pack is ready
lisca occupancy score --workspace /data/run --crop query.png
```

`POST /align/smart-exclude` accepts `workspacePath`, `promptExamples`, and
`persistPromptPack`. With a workspace path, Smart exclude loads the pack, uses
it when ready, otherwise ResNet. Recording examples with empty `cells`
persists the pack without re-running classification.
