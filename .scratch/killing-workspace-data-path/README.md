# Killing workspace data path

Product direction for eventual science lives outside this repo. This slice only
makes lisca ingest → align → crop → annotate produce ROI workspaces Tianyi can
hand to a workstation.

In scope: multi-channel crop provenance (`channelIndices` / `channelLabels`),
optional `analysis.channelRoles`, open annotation ids, reserved `sidecar/`
paths, killing fixture with an extra T-cell plane, workstation recipe.

Out of scope: promptable/foundation classifiers, Trackpy, engagement
multiplicity science, assay brains under `models/`, work in
`lisca-killing-assay`.
