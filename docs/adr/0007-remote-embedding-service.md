# ADR-0007: Studio calls label-free viability on a separate service

- **Status:** accepted
- **Date:** 2026-10-06

## Decision

Studio's Analysis page opens an explicit connection to the label-free viability
service in `lisca-killing-assay`, because that assay owns the frozen encoder and
the edge device should not run it.

## Why

ADR-0003 keeps the workspace API same-origin or desktop IPC. This panel is a
second connection: the user enters a private Tailscale HTTPS origin and a token.
The URL is remembered in local storage. The token stays in page memory and is
not sent to the workspace backend.

The in-tree killing ONNX pipeline and the Smart tools keep their own model
contracts. This panel does not replace Analyze. The service, reference sets, and
Fig. 6 embedding comparison live in
[keejkrej/lisca-killing-assay](https://github.com/keejkrej/lisca-killing-assay)
(ADR-0002 there).

## Looks like a bug when

- The viability panel sends movies through the workspace API.
- The token is written to disk or included in the remembered URL.
- Connecting to the inference host requires turning the workspace API into a remote server.
