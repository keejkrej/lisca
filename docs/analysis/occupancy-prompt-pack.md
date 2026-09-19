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
no lab-wide memory, no user-global pack, and no carry-over between assays.
Reopening the same experiment already has the corrections. v1 does not merge
packs across workspaces.

## Intended UX

1. **Bootstrap.** On a new assay, place the grid and do the first FOVs with
   **Var exclude** (variance) and/or **manual** include/exclude. Do not force
   Smart exclude before examples exist. The rail and CLI say the pack is not
   ready; Smart exclude still *can* run ResNet if the user clicks it.
2. **Record corrections.** When the user marks a site occupied (include) or
   empty (exclude) on the Align canvas, that crop + label is **appended** to
   **this assay’s** pack (debounced). A later correction of the same
   `(pos, i, j)` replaces the earlier example. Bulk Reset / Exclude all /
   Edge exclude do **not** dump into the pack.
3. **Gate.** Promptable Smart exclude (pack engine, not ResNet) is available
   only after **≥2 occupied and ≥2 empty** examples
   (`OCCUPANCY_MIN_OCCUPIED_EXAMPLES` / `OCCUPANCY_MIN_EMPTY_EXAMPLES`).
   Until then predictions stay on ResNet — never a silently weak one-example
   prototype. CLI `lisca occupancy status|score` accepts `--min-occupied` /
   `--min-empty` if a workstation wants a stricter gate.
4. **Re-score remaining sites.** After the gate, remaining unchecked sites
   re-score **after each debounced edit** (`onRecord`, default). Set the hook
   to `onRequest` to wait for the **Smart exclude** button. Further edits
   still grow that same assay pack. Re-score adds empty predictions; it does
   not undo a manual exclude.
5. **Persist.** The pack is written on the workspace so the next session on
   that experiment starts from the accumulated examples.
6. **No fine-tune.** Labels never update ResNet weights.

Opening Align with a workspace selected shows the gate message immediately
(cold start: not ready / 0+0; after load: actual counts). After the gate the
rail reads “Prompt pack ready … Further edits still grow this assay's pack.”

## How scoring works

The v0 embedder (`lisca-occupancy-v0`) is a deterministic 16×16 min-max
descriptor plus a few intensity stats — not a contrastive model. Exclude
score is `cosine(empty) − cosine(occupied)` (equivalent for L2-normalized
vectors). Swap the embedder later without changing the JSON shape.

## CLI (runnable without Studio)

```sh
# One-shot pack from crop images (replaces the file on this workspace)
lisca occupancy pack --workspace /data/run \
  --occupied occupied-a.png --occupied occupied-b.png \
  --empty empty-a.png --empty empty-b.png

# Append a correction (same accumulating path as Align edits)
lisca occupancy record --workspace /data/run --empty empty-c.png

# Ready? exit 0 when gated; exit 2 + "Not ready yet" when not
lisca occupancy status --workspace /data/run
lisca occupancy status --workspace /data/run --min-occupied 3 --min-empty 3

# Score one crop once the pack is ready (refuses with the gate message if not)
lisca occupancy score --workspace /data/run --crop query.png
```

`POST /align/smart-exclude` is the re-infer API. Send `workspacePath` plus
`promptExamples` with `persistPromptPack` / `appendPromptExamples` to record
corrections. Empty `cells` and no examples returns pack status without
loading a frame or running ResNet. Non-empty `cells` classifies with the pack
when ready, otherwise ResNet.
