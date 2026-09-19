# Killing workspace data path

Product direction for eventual science lives outside this repo. This slice
makes lisca ingest → align → crop → annotate produce ROI workspaces Tianyi can
hand to a workstation, and adapts **pattern occupancy** (Smart exclude) to a
promptable few-shot pack so labs do not retrain per user.

In scope: multi-channel crop provenance (`channelIndices` / `channelLabels`),
optional `analysis.channelRoles`, open annotation ids, reserved `sidecar/`
paths, killing fixture with an extra T-cell plane, workstation recipe,
assay-scoped occupancy prompt pack (`align/occupancy-pack.json`) with ResNet
fallback.

## Occupancy UX (Tianyi)

1. **Assay-scoped only.** Pack is `align/occupancy-pack.json` on that
   workspace. No lab-wide or user-global memory in v1.
2. **Bootstrap.** New assay: first FOVs with Var exclude and/or manual
   include/exclude. Do not force Smart exclude before examples exist.
3. **Gate.** Promptable engine after ≥2 occupied and ≥2 empty (CLI
   `--min-occupied` / `--min-empty`). Until then say “not ready yet” and stay
   on ResNet — never silently weak prototypes.
4. **Accumulate.** After the gate, each further canvas edit still grows that
   assay’s pack and can re-score remaining sites.

Recipe: `docs/analysis/occupancy-prompt-pack.md`.

Out of scope: killing-science foundation classifiers, Trackpy, engagement
multiplicity science, assay brains under `models/`, work in
`lisca-killing-assay`.
