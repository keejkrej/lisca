# mupattern ResNet model (legacy)

**Ownership:** this lisca monorepo, **legacy reference only**. Do not train or
ship new killing weights from this directory.

Killing analysis now uses [`killing-assay-resnet18`](../killing-assay-resnet18/README.md) (`keejkrej/killing-assay-resnet18`). That classifier is owned by the killing assay / Hugging Face, not as a long-term in-tree analysis brain — see [`../README.md`](../README.md).

This directory remains for reference. The classifier is a binary ResNet-18 (absent/present) from [mupattern](https://github.com/keejkrej/mupattern).

```sh
uv run optimum-cli export onnx --model keejkrej/mupattern-resnet18 ./models/mupattern-resnet18
```
