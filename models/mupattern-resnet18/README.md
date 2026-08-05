# mupattern ResNet model (legacy)

Killing analysis now uses [`killing-assay-resnet18`](../killing-assay-resnet18/README.md) (`keejkrej/killing-assay-resnet18`).

This directory remains for reference. The classifier is a binary ResNet-18 (absent/present) from [mupattern](https://github.com/keejkrej/mupattern).

```sh
uv run optimum-cli export onnx --model keejkrej/mupattern-resnet18 ./models/mupattern-resnet18
```
