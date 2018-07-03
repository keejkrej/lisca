PyAMA’s stack capabilities
==========================
Most of them are GUI components using the Tkinter toolkit.


The :py:class:`Stack` class
---------------------------
The :py:class:`Stack` class represents a stack.
It handles loading the stack from a TIFF file and holds all information
about the stack, including the ROIs.

The methods :py:meth:`Stack.get_image` and :py:meth:`Stack.get_image_copy`
provide images of specified stack positions as 2-dimensional numpy arrays.

.. autoclass:: stack.Stack
   :members:


The :py:class:`StackViewer` class
---------------------------------
The :py:class:`StackViewer` class implements a stack viewer for viewing
the stack of a :py:class:`Stack`.

It allows for scrolling through stack positions similar to ImageJ’s
user interface.

.. autoclass:: stackviewer_tk.StackViewer
   :members:


The :py:class:`RoiReader` class
-------------------------------
This is a deprecated class for manually defining a ROI grid on a stack.

.. autoclass:: roi_selection.RoiReader
   :members:


The :py:class:`RoiAdjuster` class
---------------------------------
The :py:class:`RoiAdjuster` class provides a more flexible way of
defining a ROI grid on a stack.

.. autoclass:: roi_adjuster.RoiAdjuster
   :members:
