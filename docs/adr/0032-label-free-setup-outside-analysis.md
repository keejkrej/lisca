# ADR-0032: Studio keeps label-free inference setup out of Analysis

- **Status:** accepted
- **Date:** 2026-11-20

## Decision

Studio keeps label-free inference setup in Settings → Inference. The Analysis
sidebar stays focused on assay results and their controls.

## Why

Studio currently offers no label-free assay. Even when one becomes available,
its results page is a place to inspect and export results. Provider setup belongs
in Settings, where Studio already manages embedding providers.

## Looks like a bug when

- The Analysis sidebar asks for an OpenRouter API key or an Ollama setup, including in Expert mode.
