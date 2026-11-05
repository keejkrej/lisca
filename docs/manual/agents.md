# Drive Studio with Claude Code

The desktop app includes its own MCP server. You do **not** need Node.js, the LiSCA source code, or a separate server.

## Connect once

1. Open **Settings → Agents** in Studio.
2. Click **Enable MCP**.
3. Copy the displayed `claude mcp add ...` command and run it in a terminal.
4. Restart or reconnect Claude Code if it was already running.

The command registers a local HTTP endpoint and its bearer token. The listener binds only to `127.0.0.1`, is off by default, and stops when Studio closes. Aligner and Annotator expose the same setting on their own ports.

You can now ask, for example:

> Use LiSCA to detect the grid on Pos41, save the alignment, crop the ROIs, and show me the task progress.

## What the agent can do

The agent uses the same backend as the running app. It can scan sources, detect and save pattern grids, crop ROIs, read and write annotations, build label-free reference sets, classify cells, start analysis, and inspect task progress. Work started by the agent appears in the app's task center rather than in a second server.

MCP performs backend actions; it does not move your mouse or click through the UI. Open the relevant Align, Annotate, or Analysis view to inspect the result. Some views need a reload to show files changed by the agent.

## Pause, take over, and hand back

When an agent starts changing a workspace, Studio shows an activity indicator in the top bar with the current operation and progress. It stays visible across workflows.

- **Pause** safely cancels the active long operation and prevents further agent writes. The operation does not resume from a partial crop; a later operation starts a new task.
- **Take over** gives you write control. Workflow controls are inert while the agent is running or paused; taking over re-enables them. Agent writes are refused while you edit.
- **Stop** cancels the active operation and ends the agent's ownership of the workspace.
- **Hand back** explicitly returns control after your edits. The agent can query the new workspace revision with `control_status` instead of assuming its earlier state is unchanged.

Only one workspace mutation runs at a time. Reads remain available during agent work. If you try to edit while the agent has control, Studio asks you to take over first rather than silently overwriting either side's work.

## Local label-free inference

For label-free assays without OpenRouter:

1. Install and start [Ollama](https://ollama.com/).
2. Run `ollama pull embeddinggemma-2`.
3. In Studio, open **Settings → Inference → Local Ollama**.

Reference frames and trajectory probes then stay on your machine. Studio uses `http://127.0.0.1:11434` by default; `LISCA_OLLAMA_URL` can point at another local server. Reference sets are tied to the embedding provider, so rebuild them after switching between Ollama and OpenRouter.

To return to cloud inference, choose **OpenRouter** in Settings and save your API key.
