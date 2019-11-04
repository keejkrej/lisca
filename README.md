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
If the latter is not the case, you have to adjust the path of the `requirements.txt` file.

### Usage
#### Starting PyAMA
Open the program with by executing the file `__main__.py` in the base directory of
this repository.
For simplicity, you can simply call the directory containing the file, and python
will find the file for you. For example (if you are in the parent directory of this repository):

```
python pyama
```

Alternatively, if your current working directory is the base directory of this repository,
you can execute

```
python __main__.py
```

or simply:

```
python .
```

Upon starting PyAMA, an empty window opens.

#### Loading a stack
To open a stack, click on “Open stack…” (or, alternatively: “File/Open stack…”).
A stack selection dialog is displayed.
By clicking on “Open”, you can load a TIFF stack.
On the right side of the dialog, you can compose your analysis stack from the
channels of multiple files.
To add a channel to the analysis stack, select the corresponding file on the left
side of the dialog, then specify the channel, type and optional label of the channel
on the right side and finally, click on “Add”.

The channel is the number of the channel in the selected file.
This requires that you know in which order the channels are arranged in your file.

The type of the channel is one of the following:

* “Phase contrast”: The channel is a phase contrast image. It is only displayed for your  
  orientation.
* “Fluorescence”: The channel contains fluorescence images. This channel will be used  
  for fluorescence readout.
* “Segmentation”: The channel contains a binary image indicating the cells as  
  non-zero areas. This channel will be used to detect and track the cells and  
  integrate the fluorescence over the cells.  

  Technical note: Each cluster of 1-connected (4-neighborhood) non-zero pixels is treated  
  as one cell. To be trackable, the contours of a cell must overlap in subsequent frames.  
  Contours below a threshold are ignored.

The optional label is only used for documenting the stack and has no effect on the
fluorescence readout. For example, you can label a fluorescence channel as GFP to
distinguish it from other fluorescence channels.

When all channels are specified, click on “OK” to load the stack.
Depending on the stacks you specified, this may take some time, but the loading progress
is shown in the status line.

#### Viewing the stack
You can review the stack by selecting the channel to display, by scrolling through
the frames using the slider below the stack, and by highlighting single cells.

You can highlight a cell by clicking on the cell in the image or on a corresponding
trace in the plot axes.

To exclude or include a cell in the readout, select/deselect it by clicking on the
cell in the image with the shift key pressed.

You can also use the up/down arrow keys to scroll through the cells,
the left/right arrow keys to scroll through the frames,
and the number keys to change the displayed channel.
You can also (de)select cells with the enter key.

When all cells to be read out are specified, click on “File/Save” to save the measurements.
Note that highlighted cells will also be highlighted in the plot in the PDF file.

When saving the measurements, a file `session.zip` is generated.
You can reload the measurement by clicking on “File/Load session” and selecting this file.
Currently, this requires that the stack files are all located in the same directories
as during the session that created the file.
