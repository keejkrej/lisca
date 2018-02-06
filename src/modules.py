#! /usr/bin/env python3
import importlib as imp
import os
import warnings


def _load_module(name, path):
    """
    Load and register a given module.

    Arguments
    ---------
    name -- the name of the module
    path -- the path to the module file

    Returns
    -------
    Metadata of the module, or None if module couldn’t be loaded.

    For loading a package, give the path of the package’s
    __init__.py file as path.
    """
    # Load the module
    spec = imp.util.spec_from_file_location(name, path)
    if spec is None:
        return None
    mod = imp.util.module_from_spec(spec)
    spec.loader.exec_module(mod)

    # Register the module
    if hasattr(mod, 'register'):
        meta = ModuleMetadata(mod)
        try:
            mod.register(mod)
            meta_check_failed = meta.check()
            if meta_check_failed:
                warnings.warn("Ignoring invalid module {} at {}:\n{}".format(name, path, meta_check_failed))
                meta = None
        except Exception:
            meta = None
    else:
        meta = None

    return meta


def _search_modules(plugins_path):
    """Find modules to be loaded."""
    modules = []

    # Search plugins directory for plugins
    for f in os.listdir(plugins_path):
        # Ignore files starting with a dot
        if f.startswith(('.', '_')):
            continue

        # Get file parts and full path
        name, ext = os.path.splitext(f)
        fp = os.path.join(plugins_path, f)

        # Check for valid module (or package) name
        isValid = False
        if os.path.isdir(fp) and os.path.isfile(os.path.join(fp, '__init__.py')):
            # The path is a package
            fp = os.path.join(fp, '__init__.py')
            isValid = True

        elif ext.startswith('.py') and (len(ext) == 3 or (len(ext) == 4 and ext[-1] in 'co')):
            # The path is a module
            isValid = True

        # Skip invalid file names
        if not isValid:
            continue

        # Load and register the module
        meta = _load_module(name, fp)
        if meta is not None:
            modules.append(meta)

    return modules


def _parse_version(ver):
    """
    Parse a version string.

    The version string should preferably consist of numbers
    separated by dots, e.g. "1.0.2", "2", or "3".
    Different versions of a module should have different version
    strings such that the version string of the newer version is
    the larger operand in version comparison.

    For version comparison, the string will be split at the dots,
    and the resulting substrings will be compared beginning with
    the first using python’s default comparison operators.
    Multiple consecutive dots are ignored.

    An empty version can also be specified by None, and a version
    consisting of a single number can also be specified as a
    positive integer number.

    The version is returned as a tuple of strings, as an empty tuple
    for an unspecified version or as None for an invalid argument.
    """
    # Catch special cases
    if ver is None:
        return ()
    elif isinstance(ver, int) and ver >= 0:
        return (str(ver),)
    elif not isinstance(ver, str):
        return None

    # Parse version string
    # TODO: check for comparison flags (>=, <=, !=)
    return tuple([v for v in ver.split('.') if v != ''])


class ModuleManager:
    """
    Provides means for managing plugins.
    """

    def __init__(self, plugins_path=None, register_builtins=True):
        """Set up a new ModuleManager instance."""
        if plugins_path is not None:
            self.modules = _search_modules(plugins_path)
        else:
            self.modules = []

        if register_builtins:
            self.register_builtins()

    def show(self):
        print(self.modules)

    def register_builtins(self):
        pass


class ModuleMetadata:
    """
    Defines the metadata of a module.
    """
    def __init__(self, module=None):
        self.__vals = {}
        self.__vals["name"] = None
        self.__vals["id"] = None
        self.__vals["version"] = ()
        self.__vals["category"] = ()
        self.__vals["group"] = ()
        self.__vals["conf_dep"] = ()
        self.__vals["run_dep"] = ()
        self.__vals["conf_ret"] = ()
        self.__vals["run_ret"] = ()
        self.__vals["module"] = module


    # "name"
    @property
    def name(self):
        return self.__vals["name"]
    @name.setter
    def name(self, name):
        self.__vals["name"] = name

    # "id"
    @property
    def id(self):
        return self.__vals["id"]
    @id.setter
    def id(self, id_):
        self.__vals["id"] = id_

    # "version"
    @property
    def version_string(self):
        if self.version is None:
            return None
        return ''.join(self.__vals["version"])
    @property
    def version(self):
        return self.__vals["version"]
    @version.setter
    def version(self, ver):
        self.__vals["version"] = _parse_version(ver)


    def check(self):
        """
        Check all metadata values and return a string describing all
        errors in the metadata, or None if no errors found.
        """
        msg = []

        # Check values
        if not self.name or not isinstance(self.name, str):
            msg.append("The module name must be a non-empty string.")
        if not self.id or not isinstance(self.id, str):
            msg.append("The module id must be a non-empty string.")
        if not isinstance(self.version, tuple):
            msg.append("The module version must be a tuple of strings or an empty tuple.")

        # Assemble message string and return it
        if len(msg) > 0:
            msg = '\n'.join(msg)
        else:
            msg = None
        return msg



def altes_zeug():
        self.name = None
        if "name" in kw:
            self.name = kw["name"]

        self.id = None
        if "id" in kw:
            self.id = kw["id"]

        self.version = None
        if "version" in kw:
            self.version = kw["version"]

        self.category = None
        if "category" in kw:
            self.category = kw["category"]

        self.group = None
        if "group" in kw:
            self.group = kw["group"]

        self.conf_dep = None
        if "conf_dep" in kw:
            self.conf_dep = kw["conf_dep"]

        self.run_dep = None
        if "run_dep_" in kw:
            self.run_dep = kw["run_dep"]

        self.conf_ret = None
        if "conf_ret" in kw:
            self.conf_ret = kw["conf_ret"]

        self.run_ret = None
        if "run_ret" in kw:
            self.run_ret = kw["run_ret"]


