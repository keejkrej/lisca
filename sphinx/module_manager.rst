PyAMA’s module concept
======================

Overview
--------

The module workflow can be changed manually with a
:ref:`workflow GUI <workflow_gui>`, or programatically via the
:ref:`module management classes <module_management_classes>`.


.. _workflow_gui:

The workflow GUI
----------------

.. autoclass:: workflow_tk.WorkflowGUI
   :members:


.. _module_management_classes:

The module management classes
-----------------------------
The module management is provided by the module :py:mod:`modules`.
It contains two classes: :class:`modules.ModuleManager` and :class:`modules.ModuleMetadata`.

.. automodule:: modules
 

The :class:`ModuleManager` class
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The :class:`ModuleManager` class provides all functionality to manage
the plugins.

.. autoclass:: modules.ModuleManager
   :members:

   .. automethod:: __init__


The :class:`ModuleMetadata` class
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. autoclass:: modules.ModuleMetadata
   :members:


The :py:class:`ModuleOrder` class
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. autoclass:: modules.ModuleOrder
   :members:
   :special-members:


Auxiliary functions in :mod:`modules`
-------------------------------------

:mod:`modules` also contains auxiliary functions that are not exported.
Their documentation is only included for developing.

.. autofunction:: modules._load_module

.. autofunction:: modules._parse_version

.. autofunction:: modules._check_versions

.. autofunction:: modules._parse_dep

.. autofunction:: modules._print_exception_string


Writing own plug-ins
--------------------

[to be written]
