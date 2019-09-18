## PyAMA
PyAMA is a desktop program for displaying TIFF stacks of single-cell microscopy images
and for reading out time courses of the cell area and the fluorescence intensity of
the single cells.

### Installation
Python 3.7 with `tkinter` is required.

Clone/pull/download this repository.
Then install the dependencies from the file `requirements.txt`.

With Anaconda, you can install the dependencies with this command:

```
conda install --file requirements.txt
```

With pip, you can use this command:

```
pip install -r requirements.txt
```

Of course, the above commands require that you have activated the corresponding
environment, and that your working directory is the base directory of this
repository.
If the latter is not the case, you have to adjust the path of the file.

### Usage
Open the program with by executing the file `__main__.py` in the base directory of
this repository.
For simplicity, you can simply call the directory containing the file, and python
will find the file for you. For example:

```
python pyama
```

Upon executing this command, an empty window opens.

To open a stack, click on “Open stack…” (or, alternatively: “File/Open stack…”).
A stack selection dialog is displayed.
By clicking on “Open”, you can load a TIFF stack.
On the right side of the dialog, you can compose your analysis stack from the
channels of multiple files.
To add a channel to the analysis stack, select the corresponding file on the left
side of the dialog, then specify the channel, type and optional label of the channel
on the right side and finally, click on “Add”.
When all channels are specified, click on “OK” to load the stack.

You can review the stack by selecting the channel to display, by scrolling through
the frames using the slider below the stack, and by highlighting single cells.

You can highlight a cell by clicking on the cell in the image or on a corresponding
trace in the plot axes.

To exclude or include a cell the the readout, click on the cell in the image with
the shift key pressed.

When all cells to be read out are specified, click on “File/Save” to save the measurements.
Note that highlighted cells will also be highlighted in the PDF file.

When saving the measurements, a file `session.zip` is generated.
You can reload the measurement by clicking on “File/Load session” and selecting this file.
Currently, this requires that the stack files are all located in the same directories
as during the session that created the file.
