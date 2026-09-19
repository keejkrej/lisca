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

Out of scope: killing-science foundation classifiers, Trackpy, engagement
multiplicity science, assay brains under `models/`, work in
`lisca-killing-assay`.
