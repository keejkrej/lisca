# Immune killing ResNet model

Studio immune killing analysis expects `model.onnx` in this directory (or `LISCA_KILL_MODEL` pointing elsewhere).

Export from the Hugging Face checkpoint:

```sh
uv run optimum-cli export onnx --model keejkrej/mupattern-resnet18 ./models/mupattern-resnet18
```

The classifier is a binary ResNet-18 (absent/present) trained in [mupattern](https://github.com/keejkrej/mupattern).
