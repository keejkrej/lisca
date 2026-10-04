# ADR-0004: Killing predict runs one position at a time and keeps one batch of frames

- **Status:** accepted
- **Date:** 2026-10-05

## Decision

We will decode at most one ROI stack and one inference batch (32 frames) for killing
predict, and give each predict step the scheduler's whole weight budget so a second
position stays queued, because retaining every frame for several positions at once
exhausted an 8 GB laptop.

## Why

A killing position on `jb4_nikon_portable` is about 100–240 ROIs by 75 frames of
~95×95 `f64` pixels: 0.5–1.2 GB if those frames are all kept. The scheduler's default
capacity is one step per core, so a 6-core machine started six of those at once, plus
a ResNet18 session per position. Batch 256 also builds activation tensors of hundreds
of megabytes per session.

The plate still predicts correctly in batches of 32 (same probabilities; batch norm is
inside the model). Transfection segment already defaults to 32. One session can use
the cores; another session per core oversubscribes them and multiplies the arena.

Rejected alternatives:

- Keep core-count parallelism and only shrink the batch. Several sessions would still
  be live, and each ONNX session defaults to one thread pool per core.
- Preload a position so inference can run as one big batch. That preload is the
  gigabyte, and this desktop build does not have a separate GPU budget to fill.

## Looks like a bug when

- "Only one position is running even though the machine has idle cores" — intended.
  The other positions stay queued until the running predict drops its session.
- "Predict is slower than a batch of 256 on a large workstation" — accepted. The
  bound is what keeps an 8 GB machine from swapping.
