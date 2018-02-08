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

    For loading a package, give the path of the package’s
    __init__.py file as path.

    Returns
    -------
    Metadata of the module, or None if module couldn’t be loaded.
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
            mod.register(meta)
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
        self.modules = []
        if plugins_path is not None:
            self.modules = _search_modules(plugins_path)

        if register_builtins:
            self.register_builtins()


    def show(self):
        """Only for DEBUG"""
        print(self.modules)


    def list_display(self, category=None):
        """Return a list of modules for displaying."""
        return [{'name': m.name, 'id': m.id, 'category': m.category} for m in self.modules if m.name != '']


    def configure_module(self, mod_id):
        """Configure the module with the selected id."""
        for m in self.modules:
            if m.id == mod_id:
                m.module.configure()
                return

    def run_module(self, mod_id):
        """Run the module with the selected id."""
        for m in self.modules:
            if m.id == mod_id:
                m.module.run()
                return

    def register_builtins(self):
        # TODO
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
        self.__module = module


    # "name"
    # str
    # A human-readable name. Used for
    # identifying the module in a list.
    @property
    def name(self):
        return self.__vals["name"]
    @name.setter
    def name(self, name):
        self.__vals["name"] = name

    # "id"
    # str
    # A unique module name. Only for internal identification
    # of the module. If several modules use the same id,
    # the latest defined module overwrites all others.
    @property
    def id(self):
        return self.__vals["id"]
    @id.setter
    def id(self, id_):
        self.__vals["id"] = id_

    # "version"
    # str
    # Version of the module. Arbitrarily many subversion
    # numbers may be appended after a dot. Comparison of
    # versions is done using python’s comparison operators,
    # wherein older versions are smaller than newer versions.
    @property
    def version_string(self):
        if self.version is None:
            return None
        return '.'.join(self.__vals["version"])
    @property
    def version(self):
        return self.__vals["version"]
    @version.setter
    def version(self, ver):
        self.__vals["version"] = _parse_version(ver)

    # "category"
    # [tuple of] str
    # One or more human-readable categories of the module.
    # Used in the module selection menu for grouping modules.
    @property
    def category(self):
        return self.__vals["category"]
    @category.setter
    def category(self, cat):
        self.__set_tuple_of_str("category", cat)

    # "group"
    # [tuple of] "id"
    # One or more "id"s of meta-modules the module belongs to.
    # A meta-module is a placeholder for any module belonging to it.
    # A meta-module must have its own name in "group".
    @property
    def group(self):
        return self.__vals["group"]
    @group.setter
    def group(self, grp):
        self.__set_tuple_of_str("group", grp)

    # "conf_ret"
    # [tuple of] str
    # Identifier for data generated by the configuration function of
    # the module. Used by other modules for defining dependencies on
    # specific data for their configuration functions.
    @property
    def conf_ret(self):
        return self.__vals["conf_ret"]
    @conf_ret.setter
    def conf_ret(self, ret):
        self.__set_tuple_of_str("conf_ret", ret)

    # "run_ret"
    # [tuple of] str
    # Identifier for data generated by the run function of
    # the module. Used by other modules for defining dependencies on
    # specific data for their run functions.
    @property
    def run_ret(self):
        return self.__vals["run_ret"]
    @run_ret.setter
    def run_ret(self, ret):
        self.__set_tuple_of_str("run_ret", ret)

    # "conf_dep"
    # [tuple of] tuple of ("id", [(<, >) [=]] "version", [tuple of] "conf_ret")
    # Dependencies of the module configuration function.
    @property
    def conf_dep(self):
        return self.__vals["conf_dep"]
    @conf_dep.setter
    def conf_dep(self, dep):
        pass

    # "run_dep"
    # [tuple of] tuple of ("id", [(<, >) [=]] "version", [tuple of] ("conf_ret", "run_ret"))
    # Dependencies of the module run function.
    @property
    def run_dep(self):
        return self.__vals["run_dep"]
    @run_dep.setter
    def run_dep(self, dep):
        pass

    # "module"
    # module
    # Reference to the actual module; usually set by the
    # module management system.
    @property
    def module(self):
        return self.__module
    @module.setter
    def module(self, mod):
        self.__module = mod


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

    def __set_tuple_of_str(self, name, x):
        """
        Assign string or tuple of strings to a value.

        The result will always be an empty tuple or a
        tuple of strings. In case of invalid x, a
        warning is emitted and the value is not changed.
        'None' always clears the value to an empty tuple.
        """
        if isinstance(x, str):
            self.__vals[name] = (x,)
        elif isinstance(x, tuple) and all([isinstance(i, str) for i in x]):
            self.__vals[name] = x
        elif cat is None:
            self.__vals[name] = ()
        else:
            warnings.warn('Invalid "{}": {}'.format(name, str(x)))



