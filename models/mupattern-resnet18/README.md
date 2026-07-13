# mupattern ResNet model (legacy)

Immune killing analysis now uses [`immune-killing-resnet18`](../immune-killing-resnet18/README.md) (`keejkrej/immune-killing-resnet18`).

This directory remains for reference. The classifier is a binary ResNet-18 (absent/present) from [mupattern](https://github.com/keejkrej/mupattern).

```sh
uv run optimum-cli export onnx --model keejkrej/mupattern-resnet18 ./models/mupattern-resnet18
```
