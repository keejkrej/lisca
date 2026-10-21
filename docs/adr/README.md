# Architecture Decision Records

Why a shipped choice looks the way it does. Agents write these during the change. The procedure is the `decision-record` skill.

| Status       | Meaning                                                    |
| ------------ | ---------------------------------------------------------- |
| `accepted`   | Current choice. Matching behavior is intended.             |
| `proposed`   | Not yet confirmed. Matching behavior is not protected.     |
| `superseded` | Replaced. The old file stays, and it links to the new ADR. |

## Index

| ID                                                 | Status     | Title                                                                        |
| -------------------------------------------------- | ---------- | ---------------------------------------------------------------------------- |
| [0001](0001-app-shapes.md)                         | accepted   | Aligner and Annotator are single-page apps; only Studio routes               |
| [0002](0002-hosted-http-desktop-ipc.md)            | accepted   | Hosted builds use HTTP; desktop builds use in-process Tauri IPC              |
| [0003](0003-same-origin-web-no-remote-server.md)   | accepted   | Web builds are same-origin only; there is no remote-server mode              |
| [0004](0004-killing-predict-memory.md)             | superseded | Killing predict runs one position at a time and keeps one batch of frames    |
| [0005](0005-transfection-control-bridge.md)        | accepted   | Transfection batch comparison is an offline script                           |
| [0007](0007-remote-embedding-service.md)           | superseded | Studio calls label-free viability on the killing-assay service               |
| [0008](0008-inference-host-loads-assay-models.md)  | accepted   | The inference host loads assay models, starting with EmbeddingGemma          |
| [0009](0009-shared-killing-workspace.md)           | accepted   | One workspace holds every killing kind                                       |
| [0010](0010-studio-browser-mock.md)                | accepted   | Studio browser mock opens the real web app on a fixture workspace            |
| [0011](0011-standard-rail-contrast.md)             | accepted   | Studio Contrast stays on the standard Align and Annotate rails               |
| [0012](0012-two-studio-builds.md)                  | superseded | Two Studio builds share one inference protocol                               |
| [0013](0013-openrouter-label-free-single-build.md) | accepted   | Single Studio build with OpenRouter Gemini Embedding 2 for label-free assays |
| [0014](0014-label-free-killing-inference-host.md)  | accepted   | Label-free killing classification uses the inference host                    |
