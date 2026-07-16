# 10 — Unsupported assay ids must error, not silently run gene-expression

**What to build:** `crates/lisca/src/analysis/assays.rs` dispatches `GeneExpression | LnpBinding | CustomAssay` into `gene_expression::run`. `lnp-binding` and `custom-assay` do not lack a pipeline — they silently inherit gene-expression's. The file's own doc comment says to add a submodule per assay id and register it; the match arm does the opposite. `ENABLED_STUDIO_ASSAY_IDS` disables both tiles in the wizard, but `assay.json` is a hand-editable file in an unvalidated workspace, so the gate is a UI default and not a safety boundary. A user who hand-writes `"assayId": "lnp-binding"` gets gene-expression analysis under an LNP-binding label, with no error.

Make the dispatch exhaustive so an unsupported id fails loudly.

**Blocked by:** None — can start immediately.

**Status:** ready-for-human

- [ ] An analysis run for an assay id with no pipeline of its own fails with an explicit, typed error naming the unsupported id — it does not run another assay's pipeline.
- [ ] The error surfaces to the user through the same path as other analysis failures, rather than only appearing in logs.
- [ ] `gene-expression` and `immune-killing` behavior is unchanged.
- [ ] The dispatch is exhaustive over `AssayType`, so adding an id to the enum forces a decision at compile time rather than silently aliasing.
- [ ] A test covers an unsupported id producing the error.

**Why `ready-for-human`, not `ready-for-agent`:** this changes product behavior. Today a hand-written `lnp-binding` assay silently produces gene-expression results; afterwards it fails. That is almost certainly right, but it is the owner's call whether any workspace in the wild relies on the current aliasing, and whether `custom-assay` was intended as a deliberate alias to gene-expression rather than a placeholder.

Found during the product-shape interview, not by an audit lens. See `PRODUCT.md` "Assays are a closed enum, not an extension point".
