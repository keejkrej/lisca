# Architecture Decision Records

Why a shipped choice looks the way it does. Agents write these during the change. The procedure is the `decision-record` skill.

| Status       | Meaning                                                    |
| ------------ | ---------------------------------------------------------- |
| `accepted`   | Current choice. Matching behavior is intended.             |
| `proposed`   | Not yet confirmed. Matching behavior is not protected.     |
| `superseded` | Replaced. The old file stays, and it links to the new ADR. |

## Index

| ID                                               | Status   | Title                                                                     |
| ------------------------------------------------ | -------- | ------------------------------------------------------------------------- |
| [0001](0001-app-shapes.md)                       | accepted | Aligner and Annotator are single-page apps; only Studio and Landing route |
| [0002](0002-hosted-http-desktop-ipc.md)          | accepted | Hosted builds use HTTP; desktop builds use in-process Tauri IPC           |
| [0003](0003-same-origin-web-no-remote-server.md) | accepted | Web builds are same-origin only; there is no remote-server mode           |
| [0004](0004-killing-predict-memory.md)           | accepted | Killing predict runs one position at a time and keeps one batch of frames |
| [0005](0005-transfection-control-bridge.md)      | accepted | Transfection batch comparison is an offline script                        |
