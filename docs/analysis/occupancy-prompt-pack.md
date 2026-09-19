# Occupancy prompt pack

Do **not** retrain Smart exclude per user or lab. Prompt it with examples from
the assay in front of you. The pack is **accumulating**, not a one-shot
few-shot: each manual include/exclude makes the next inference better.

Product Smart exclude (`models/smart-exclusion-resnet18`) remains the **cold
start / fallback**. It cannot be fine-tuned per lab. Adaptation is frozen
embedder + distance-to-prototype against the workspace support pack. No
weight training.

## Assay-scoped only

The pack lives at `align/occupancy-pack.json` on **that workspace**. There is
no lab-wide memory and no carry-over between assays. Reopening the same
experiment already has the corrections.

## Intended UX

1. **Cold start.** On a new assay, place the grid and do the first FOVs with
   **Var exclude** (variance) and/or **manual** include/exclude. The pack may
   be empty. Smart exclude still runs the ResNet baseline. Do not wait on
   Smart exclude before examples exist.
2. **Record corrections.** When the user marks a site occupied (include) or
   empty (exclude) on the Align canvas, that crop + label is **appended** to
   the assay pack (debounced). A later correction of the same `(pos, i, j)`
   replaces the earlier example. Bulk Reset / Exclude all / Edge exclude do
   **not** dump into the pack.
3. **Re-score remaining sites.** Prototypes are the L2-normalized class
   means. After the pack is ready, remaining unchecked sites are re-scored
   **after each debounced edit** (`onRecord`, default). Set the hook to
   `onRequest` to wait for the **Smart exclude** button instead. Re-score
   adds empty predictions; it does not undo a manual exclude.
4. **Persist.** The pack is written on the workspace so the next session on
   that experiment starts from the accumulated examples.
5. **No fine-tune.** Labels never update ResNet weights.

Promptable Smart exclude (pack engine, not ResNet) is **gated** until the
pack has **≥2 occupied and ≥2 empty** examples. Until then the rail/CLI say
the pack is not ready and Smart exclude stays on ResNet. After the gate,
further edits still grow the same assay pack.

## How scoring works

The v0 embedder (`lisca-occupancy-v0`) is a deterministic 16×16 min-max
descriptor plus a few intensity stats — not a contrastive model. Exclude
score is `cosine(empty) − cosine(occupied)` (equivalent for L2-normalized
vectors). Swap the embedder later without changing the JSON shape.

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

`POST /align/smart-exclude` is the re-infer API. Send `workspacePath` plus
`promptExamples` with `persistPromptPack` / `appendPromptExamples` to record
corrections. Empty `cells` persists without classifying. Non-empty `cells`
classifies with the pack when ready, otherwise ResNet.
