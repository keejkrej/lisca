"""
.. py:module:: modules
    :synopsis: The module management

.. moduleauthor:: Daniel Woschée <daniel.woschee@physik.lmu.de>

This is the docstring of the :py:mod:`modules` module.
"""
import importlib as imp
import os
import warnings


def _load_module(name, path):
    """
    Load and register a given module.

    :param name: the name of the module
    :type name: str
    :param path: the path to the module file
    :type path: str

    For loading a package, give the path of the package’s
    ``__init__.py`` file as path.

    :return: Metadata of the module, or ``None`` if module couldn’t be loaded.
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

        except Exception as e:
            print("Ignore module '{}' due to exception: {}".format(name, str(e)))
            meta = None

    else:
        warnings.warn("Ignoring invalid module {} at {}:\nNo 'register' function found.".format(name, path))
        meta = None

    return meta


def _search_modules(plugins_path):
    """Find modules to be loaded."""
    modules = {}

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
            modules[meta.id] = meta

    return modules


def _parse_version(ver, isComparison=False):
    """
    Parse a version string.

    The version string should consist of numbers
    separated by dots, e.g. "1.0.2", "2", or "3".
    Different versions of a module should have different version
    strings such that the version string of the newer version is
    the larger operand in version comparison.

    For version comparison, the string will be split at the dots,
    and the resulting substrings will be compared beginning with
    the first using python’s default comparison operators.
    Multiple consecutive dots are ignored.

    An empty version can also be specified by ``None``, and a version
    consisting of a single number can also be specified as a
    positive integer number.

    The version is returned as a tuple of strings, as an empty tuple
    for an unspecified version or as ``None`` for an invalid argument.

    :param ver: the version string
    :type ver: str
    :param isComparison: boolean flag whether ver is a comparison
    :type isComparison: bool

    :return: A tuple of subversion strings, obtained by splitting
        the version string at dots.

        If ``isComparison`` is ``True``, the comparison mode is returned
        before the tuple of subversion strings.
        The comparison mode is one of the following strings:

        ``>=``, ``<=``, ``!=``, ``>``, ``<``, ``=``
    """
    # Catch special cases
    if ver is None or ver is () or ver is '':
        return (None, ()) if isComparison else ()
    elif isinstance(ver, int) and ver >= 0:
        ver = str(ver)
        #return ((str(ver),)
    elif not isinstance(ver, str):
        return None

    # Parse version string
    # TODO: add optional dependency ('?')
    comp_flags = ('>=', '<=', '!=', '>', '<', '=')
    #starts_with_comparison = ver.startswith(comp_flags)
    if isComparison:
        if ver[:2] in comp_flags:
            comp_mode = ver[:2]
            ver = ver[2:]
        elif ver[0] in comp_flags:
            comp_mode = ver[0]
            ver = ver[1:]
        else:
            comp_mode = '='

    # Split version string into subversions
    ver = tuple([v for v in ver.split('.') if v])

    if isComparison:
        return comp_mode, ver
    else:
        return ver


def _check_versions(version_present, comp_mode, version_required):
    """
    Check if a version fulfills a version requirement.

    TODO: possibly wrong results for subversionstrings
    with different lengths

    :param version_present: The version of the module to be evaluated
    :param comp_mode: The comparison mode
    :param version_required: The required version

    :return: ``True`` if version fulfills requirement, else ``False``.
    """
    # TODO: correct for strings with different lengths
    # TODO: add optional dependency ('?')
    if not version_present and not version_required:
        return True

    elif comp_mode == '>=':
        for vp, vr in zip(version_present, version_required):
            if vp < vr:
                return False
        if len(version_present) < len(version_required):
            return False
        return True

    elif comp_mode == '<=':
        for vp, vr in zip(version_present, version_required):
            if vp > vr:
                return False
        if len(version_present) > len(version_required):
            return False
        return True

    elif comp_mode == '!=':
        for vp, vr in zip(version_present, version_required):
            if vp != vr:
                return True
        if len(version_present) == len(version_required):
            return False
        return True

    elif comp_mode == '>':
        for vp, vr in zip(version_present, version_required):
            if vp > vr:
                return True
            elif vp < vr:
                return False
        if len(version_present) > len(version_required):
            return True
        return False

    elif comp_mode == '<':
        for vp, vr in zip(version_present, version_required):
            if vp < vr:
                return True
            elif vp < vr:
                return False
        if len(version_present) < len(version_required):
            return True
        return False

    elif comp_mode == '=':
        if len(version_present) != len(version_required):
            return False
        for vp, vr in zip(version_present, version_required):
            if vp != vr:
                return False
        return True

    # This is never reached for a valid comp_mode
    return False


def _parse_dep(dep):
    """
    Parse the dependency data inserted by the module.
    
    :param dep: The dependency data provided by the module
    :return: A (possibly empty) tuple of dependencies,
        or ``None`` if dependency data is invalid

    The expected dependency data is::

        [tuple of] tuple of ("id", [tuple of] [(<, >) [=]] "version", [tuple of] ("conf_ret" | "run_ret") )
    """
    # Expects:
    # [tuple of] tuple of ("id", [tuple of] [(<, >) [=]] "version", [tuple of] ("conf_ret" | "run_ret") )
    # Returns:
    # tuple of (tuple of ("id", tuple of (<cmp_mode>, "version"), tuple of ("conf_ret" | "run_ret") ))
    # Returns None if input is invalid

    # No dependencies
    if not dep:
        return ()

    # Depending on only one module; convert to tuple
    if isinstance(dep[0], str):
        dep = (dep,)

    # Write all dependencies to standardized structure
    new = []
    isValid = True
    for d in dep:
        n = [None, None, None]
        try:
            # "id" is a string
            n[0] = d[0]

            # "version" is a string or a tuple of strings
            if isinstance(d[1], str):
                versions = (d[1],)
            else:
                versions = d[1]
            new_versions = []
            for ver in versions:
                cmp_mode, ver_nr = _parse_version(ver, True)
                if cmp_mode and ver_nr:
                    new_versions.append((cmp_mode, ver_nr))
            n[1] = tuple(new_versions)

            # "conf_ret" is a string or an iterable of strings
            if isinstance(d[2], str):
                n[2] = (d[2],)
            else:
                n[2] = d[2]

            # Finally, append the dependency to the list
            new.append(tuple(n))

        except Exception:
            return None

    return tuple(new)


class ModuleManager:
    """
    Provides means for managing plugins.


    """

    def __init__(self, plugins_path=None, register_builtins=True):
        """
        Set up a new ModuleManager instance.

        Plugins will be searched in the given path.
        By default, the builtin modules are also imported.

        :param plugins_path: The directory in which plugins are searched
        :param register_builtins: Boolean flag whether to import builtin modules
        """
        self.modules = {}
        self.data = {}

        # Register built-in modules
        if register_builtins:
            self.register_builtins()

        # Register custom plugin modules
        if plugins_path is not None:
            self.modules = _search_modules(plugins_path)
            # Prepare data and result dictionary
            for m in self.modules:
                self.data[m] = {}


    def show(self):
        """Print ``self.modules``. Only for debugging."""
        print(self.modules)


    def list_display(self, category=None):
        """Return a list of modules for displaying."""
        return [{'name': m.name, 'id': m.id, 'category': m.category} for _, m in self.modules.items() if m.name != '']


    def memorize_result(self, mod_id, result):
        """Add a result to the internal data memory."""
        # TODO: add test for consistency with metadata
        for name, value in result.items():
            self._add_data(mod_id, name, value)


    def acquire_dependencies(self, mod_id, isConfigure=False):
        """
        Acquire the dependencies for executing a plugin.

        :param mod_id: The id of the plugin to be executed
        :type mod_id: str
        :type isConfigure: bool
        :param isConfigure: Flag indicating whether the
            ``configure`` or the ``run`` function of the
            plugin is called.

            * ``True`` if ``configure`` is called
            * ``False`` if ``run`` is called

        :return:
            * Dictionary {DP: {DN: DV}}, where:

                * the keys DP are the identifiers of the plugins whose return values are required,
                * the sub-keys DN are the names of the required data values,
                * the sub-values DV are the actual data values, and
                * the empty string as a special sub-key DN has the present version of the corresponding plugin as sub-value DV.

            * ``None`` if a dependency requirement cannot be fulfilled
        """
        mod = self.modules[mod_id]
        mod_ver = mod.version

        if isConfigure:
            dep_list = mod.conf_dep
        else:
            dep_list = mod.run_dep
        print("[MouleManager.acquire_dependencies] dependency list: {}".format(str(dep_list)))

        if len(dep_list) == 0:
            return {}

        data = {}
        for dep_id, dep_ver_req, dep_names in dep_list:
            # Check if versions match
            if dep_id != "":
                dep_ver = _parse_version(self.modules[dep_id].version)
                cmp_mode, dep_ver_req = _parse_version(dep_ver_req, True)
                if not _check_versions(dep_ver_req, cmp_mode, dep_ver):
                    warnings.warn("Version mismatch for '{}' dependency of module '{}': found version {} of '{}', but require {}.".format("configure" if isConfigure else "run", mod_id, dep_ver, dep_id, dep_ver_req))
                    return None
            else:
                dep_ver = ()

            # Check if data is available
            dep_data = {'': dep_ver}
            try:
                for name in dep_names:
                    dep_data[name] = self.data[dep_id][name]
                data[dep_id] = dep_data
            except KeyError:
                warnings.warn("Missing '{}' dependency of module '{}': did not find required data '{}' of plugin '{}'.".format("configure" if isConfigure else "run", mod_id, name, dep_id))
                return None

        return data


    def configure_module(self, mod_id):
        """Configure the module with the selected id."""
        # Acquire dependencies for configuration
        dep_data = self.acquire_dependencies(mod_id, True)
        if dep_data is None:
            warnings.warn("Cannot configure plugin {}: dependencies not fulfilled.".format(mod_id))
            return

        # Invoke module’s configure function
        try:
            res = self.modules[mod_id].module.configure(**dep_data)
            if res is not None:
                self.memorize_result(mod_id, res)
        except Exception:
            pass


    def run_module(self, mod_id):
        """Run the module with the selected id."""
        # Acquire dependencies for running
        dep_data = self.acquire_dependencies(mod_id)
        if dep_data is None:
            warnings.warn("Cannot run plugin {}: dependencies not fulfilled.".format(mod_id))
            return

        # Invoke module’s run function
        try:
            res = self.modules[mod_id].module.run(**dep_data)
            if res is not None:
                self.memorize_result(mod_id, res)
        except Exception:
            pass


    def _add_data(self, d_id, name, value):
        """
        Add data to the internal data memory.

        :param d_id: The id of the plugin providing the data
        :param name: The name of the data
        :param value: The value of the data
        """
        if d_id not in self.data:
            self.data[d_id] = {}
        self.data[d_id][name] = value


    def register_builtin_data(self, name, value):
        """
        Register built-in data.

        :meth:`register_builtin_data` can be used to add data as built-in
        data. They will be available using an empty string as id.

        :param name: The name of the data
        :param value: The value of the data
        """
        self._add_data("", name, value)


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
    # [tuple of] tuple of ("id", [tuple of] [(<, >) [=]] "version", [tuple of] "conf_ret")
    # Dependencies of the module configuration function.
    @property
    def conf_dep(self):
        return self.__vals["conf_dep"]
    @conf_dep.setter
    def conf_dep(self, dep):
        dep = _parse_dep(dep)
        if dep is None:
            warnings.warn("Cannot set configuration dependencies of module '{}': bad dependency given.".format(self.id))
            return
        self.__vals["conf_dep"] = dep

    # "run_dep"
    # [tuple of] tuple of ("id", [tuple of] [(<, >) [=]] "version", [tuple of] ("conf_ret", "run_ret"))
    # Dependencies of the module run function.
    @property
    def run_dep(self):
        return self.__vals["run_dep"]
    @run_dep.setter
    def run_dep(self, dep):
        dep = _parse_dep(dep)
        if dep is None:
            warnings.warn("Cannot set run dependencies of module '{}': bad dependency given.".format(self.id))
            return
        self.__vals["run_dep"] = dep

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



