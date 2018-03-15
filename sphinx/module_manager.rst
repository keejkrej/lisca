The module management
=====================

Overview
--------

The module management is provided by the module :py:mod:`modules`.
It contains two classes: :class:`modules.ModuleManager` and :class:`modules.ModuleMetadata`.

.. automodule:: modules
 

The :class:`ModuleManager` class
--------------------------------

The :class:`ModuleManager` class provides all functionality to manage
the plugins.

.. autoclass:: modules.ModuleManager
   :members:

   .. automethod:: __init__


The :class:`ModuleMetadata` class
---------------------------------

Each builtin module consists of metadata including name, version,
dependencies and functionality of the module.
These metadata are stored in the class :class:`ModuleMetadata`.

The metadata have to be set when writing an own plugin module.

The following metadata are currently supported:

* ``name`` – The human-readable name of the module.

    It is only used for displaying.
    Since users can distinguish modules only by their names, the name
    should be unique.

* ``id`` – A string used to identify the module.

    The id must be unique among all modules.
    It can contain any characters and should stay invariant across
    the versions of the module.

* ``version`` – The version string of the module.

    It consists of digits. Subversion numbers can be appended recursively,
    with dots as separators.

* ``category`` – A human-readable category to which the plugin belongs.

    The category is used for structured display of plugins in a GUI.

* ``group`` – Identifiers of metamodules the plugin belongs to

    Groups are needed to define alternatives that have the same
    functionality.

* ``conf_dep`` – Dependencies for configuration

* ``run_dep`` – Dependencies for running

* ``conf_ret`` – Return values of configuration

* ``run_ret`` – Return values of configuration

The dependencies of a plugin (``conf_dep`` and ``run_dep``) are defined as::

    [tuple of] tuple of ("id", [tuple of] [(<, >) [=]] "version", [tuple of] "conf_ret")

To define a dependency of built-in data, use an empty string as dependency id.


.. autoclass:: modules.ModuleMetadata
   :members:


Auxiliary functions in :mod:`modules`
-------------------------------------

:mod:`modules` also contains auxiliary functions that are not exported.
Their documentation is only included for developing.

.. autofunction:: modules._load_module

.. autofunction:: modules._parse_version

.. autofunction:: modules._check_versions

.. autofunction:: modules._parse_dep


Writing own plug-ins
--------------------

[to be written]
