# Troubleshooting

- **Crop fails on one position with "access denied" (OS error 5).** This usually happens on network drives, which briefly lock files. Write the output folder to a local disk, then copy the results.
- **Positions don't match.** Pick positions from the detected list instead of typing numbers.
- **The pattern isn't recognised.** Check the file-name tokens in [Import](workflow.md#1-import-metadata).
- **Contrast resets between frames.** Use _Lock_. Contrast never affects results.
