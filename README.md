# LISCA Monorepo

This repository contains the shared `lisca` libraries plus the current LISCA applications:

- `packages/lisca/python`: shared Python IO and analysis helpers
- `packages/lisca/typescript`: shared TypeScript viewer package
- `packages/lisca/rust`: shared Rust desktop backend crate
- `apps/viewer`: standalone Tauri viewer shell
- `apps/delivery`: delivery-specific Python workflows
- `apps/apoptosis`: apoptosis-specific Python workflows
- `apps/studio`: reserved for the integrated desktop app

The repository root is workspace-only. Python, TypeScript, and Rust packages live at their language-specific package roots.
