"""
.. py:module:: modules
    :synopsis: The module management

.. moduleauthor:: Daniel Woschée <daniel.woschee@physik.lmu.de>

This is the docstring of the :py:mod:`modules` module.
"""
import importlib.util as imputil
import os
import sys
import traceback
import warnings


PERFORM_KINDS = {"conf", "run", "loop_next", "loop_finished"}
RETURN_KINDS = {"init", *PERFORM_KINDS}


def _load_module(name, path, return_init_ret=True):
    """
    Load and register a given module.

    :param name: the name of the module
    :type name: str
    :param path: the path to the module file
    :type path: str
    :param return_init_ret: flag whether to return also the return value of the ``register`` function
    :type return_init_ret: bool

    For loading a package, give the path of the package’s
    ``__init__.py`` file as path.

    :return: Metadata of the module, or ``None`` if module couldn’t be loaded. If ``return_init_ret`` is ``True``, a tuple of module metadata and ``register`` return value is returned.
    """
    if return_init_ret:
        RETURN_BAD = (None, None)
    else:
        RETURN_BAD = None

    # Load the module
    spec = imputil.spec_from_file_location(name, path)
    if spec is None:
        return RETURN_BAD
    mod = imputil.module_from_spec(spec)
    try:
        spec.loader.exec_module(mod)
    except Exception as e:
        print("Cannot load module '{}' from '{}':\n{}: {}".format(name, path, e.__class__.__name__, e), file=sys.stderr)
        return RETURN_BAD

    # Check if module is valid (has `register` function)
    if not hasattr(mod, 'register'):
        print("Ignoring invalid plugin {} at {}:\nNo 'register' function found.".format(name, path), file=sys.stderr)
        return RETURN_BAD

    # Register the module
    meta = ModuleMetadata(mod)

    # First, pre-fill auto-detected version and `conf` and `run` function
    if hasattr(mod, '__version__'):
        meta.version = mod.__version__
    if hasattr(mod, 'configure'):
        meta.set_fun("conf", mod.configure)
    if hasattr(mod, 'run'):
        meta.set_fun("run", mod.run)
    
    # Second, let module fill in its own properties
    try:
        init_ret = mod.register(meta)
    except Exception as e:
        print("\nIgnore module '{}' due to exception:".format(name),
                file=sys.stderr, end='')
        _print_exception_string(e)
        return RETURN_BAD

    # Check meta data
    meta_check_failed = meta.check()
    if meta_check_failed:
        print("Ignoring invalid plugin {} at {}:\n{}".format(name, path, meta_check_failed), file=sys.stderr)
        return RETURN_BAD

    # Memorize return data of kind "init"
    if init_ret is not None:
        meta.set_ret("init", tuple(init_ret.keys()))

    # Return
    if return_init_ret:
        return meta, init_ret
    return meta


def _search_modules(plugins_path):
    """Find modules to be loaded."""
    modules = set()

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

        # Add file to list of potential modules
        modules.add((name, fp))
    return modules


def _parse_version(ver, isComparison=False):
    """
    Parse a version string.

    The version string should consist of numbers
    separated by dots, e.g. "1.0.2", "2", or "3".
    Different versions of a plugin should have different version
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

    :param version_present: The version of the plugin to be evaluated
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
    Parse the dependency data inserted by the plugin.
    
    :param dep: The dependency data provided by the plugin
    :return: A (possibly empty) tuple of dependencies,
        or ``None`` if dependency data is invalid

    The expected dependency data is::

        [tuple of] tuple of ("id", [tuple of] ("conf_ret" | "run_ret"), [tuple of] [(<, >) [=]] "version" )
    """
    # Expects:
    # [tuple of] tuple of ("id", [tuple of] ("conf_ret" | "run_ret"), [tuple of] [(<, >) [=]] "version" )
    # Returns:
    # tuple of (tuple of ("id", tuple of ("conf_ret" | "run_ret"), tuple of (<cmp_mode>, "version") ))
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

            # "conf_ret" is a string or an iterable of strings
            if isinstance(d[1], str):
                n[1] = (d[1],)
            else:
                n[1] = d[1]

            # "version" is a string or a tuple of strings
            if len(d) > 2:
                if isinstance(d[2], str):
                    versions = (d[2],)
                else:
                    versions = d[2]
                new_versions = []
                for ver in versions:
                    cmp_mode, ver_nr = _parse_version(ver, True)
                    if cmp_mode and ver_nr:
                        new_versions.append((cmp_mode, ver_nr))
                n[2] = tuple(new_versions)
            else:
                n[2] = ()

            # Finally, append the dependency to the list
            new.append(tuple(n))

        except Exception:
            return None

    return tuple(new)


def _print_exception_string(exc, first=0):
    """
    Obtain and print a stacktrace and exception info.

    :param exc: The exception that has been raised
    :type exc: :py:class:`Exception`
    :param first: The first index of the exception traceback to show
    :type first: uint
    """
    stack = traceback.extract_tb(exc.__traceback__)[first:]
    stack_formatted = traceback.format_list(stack)
    msg = "\nTraceback (most recent call last):\n{}{}: {}".format(
            ''.join(stack_formatted), exc.__class__.__name__, exc)
    print(msg, file=sys.stderr)


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
        self.data = [{}]
        self.module_order = []

        # Register built-in modules
        if register_builtins:
            self.register_builtins()

        # Register custom plugin modules
        if plugins_path is not None:
            modules_found = _search_modules(plugins_path)
            for name, path in modules_found:
                meta, init_ret = _load_module(name, path)
                if meta is not None:
                    mod_id = meta.id
                    self.modules[mod_id] = meta
                    self.data[0][mod_id] = {}
                    self.memorize_result(mod_id, init_ret)


    def show(self):
        """Print ``self.modules``. Only for debugging."""
        print(self.modules)


    def set_module_order(self, order):
        """Set the execution order of the modules."""
        new_order = []
        for o in order:
            i = self._parse_module_insertion(o)
            if i is None:
                return
            new_order.append(i)
        self.module_order = new_order


    def module_order_insert(self, mod, index=-1):
        """Insert one module or a loop into the order."""
        # Get index and array to insert module
        order = self.module_order
        if type(index) != int:
            while len(index) > 1:
                order = order[index[0]]
                index = index[1:]
            index = index[0]

        # Insert module at given index
        ins = self._parse_module_insertion(mod)
        if ins is not None:
            order.insert(index, ins)


    def _parse_module_insertion(self, ins):
        # If `ins` is a string, return it
        if type(ins) == str:
            return ins

        # If `ins` is None, return None, because None indicates an
        # error during parsing `ins` in a higher parsing instance.
        # Do not print a message, because the message is printed
        # by the instance that encountered the error.
        if ins is None:
            return None

        # If `ins` is not a string, it must be a list representing a loop
        pins = []

        # Check if first loop entry is the “embracing member”
        if type(ins[0]) != str:
            print("Cannot insert new module: embracing member missing in loop", file=sys.stderr)
            return None

        # Check for empty list
        if not ins:
            print("Cannot insert new module: illegal empty list encountered.", file=sys.stderr)
            return None

        # Add all remaining items to the list
        for i in ins:
            if type(i) == str:
                pins.append(i)
            else:
                i = self.parse_module_insertion(i)
                if i is None:
                    return None

        # Return parsed insertion item
        return pins


    def module_order_remove(self, index, name=None):
        """
        Remove the module or loop at the given index from the module order.
        
        :param index: Index of item to be removed.
        :type index: int or list of int
        :param name: If not ``None``, the name of the item to be deleted for double-checking against deletion of wrong item. Specify the module ID of the module when deleting a single module, or surround the module ID with square brackets if it holds a loop.
        :type name: str
        """
        order = self.module_order

        # Index into module order if index is an iterable
        if type(index) != int:
            while len(index) > 1:
                i = index.pop(0)
                if -1 <= i < len(order):
                    order = order[i]
                else:
                    print("Cannot remove item from module order: bad index given.", file=sys.stderr)
            index = index.pop()

        # Check if index is in valid range
        if not -1 <= i < len(order):
            print("Cannot remove item from module order: bad index given.", file=sys.stderr)

        # If ``name`` is given, check if correct element is deleted
        elif name is not None:
            # Check if a single module or a loop is deleted
            if type(order[i]) != str:
                # Check if ``name`` indicates a loop
                if not name.startswith('['):
                    print("Cannot remove item from module order: bad safety check given: expected '[' due to loop, but not found.", file=sys.stderr)
                    return

                # Add optional trailing ']' if not present
                if not name.endswith(']'):
                    name = "".join(name, ']')

                # Get correct name representation of found item
                order_i = order[i][0]
                while type(order_i) != str:
                    order_i = order_i[0]
                order_i = "".join('[', order_i, ']')

            # Get ID of single module a position ``index``
            else:
                order_i = order[i]

            # Check if correct item is addressed for deleting
            if order_i != name:
                print("Cannot remove item from module order: found item", file=sys.stderr)
                return

        # Delete item
        del order[i]


    def list_display(self, category=None):
        """Return a list of modules for displaying."""
        return [{'name': m.name, 'id': m.id, 'category': m.category, 'version': '.'.join(m.version)} for _, m in self.modules.items() if m.name != '']


    def memorize_result(self, mod_id, result):
        """Add a result to the internal data memory."""
        # TODO: add test for consistency with metadata
        if result is None:
            return
        for name, value in result.items():
            self._add_data(mod_id, name, value)


    def acquire_dependencies(self, mod_id, kind):
        """
        Acquire the dependencies for executing a plugin.

        :param mod_id: The id of the plugin to be executed
        :type mod_id: str
        :param kind: Indicator what dependency is needed; one of: "conf", "run", "loop_next", "loop_end".
        :type kind: str
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
        dep_list = mod.get_dep(kind)

        # DEBUG message
        #print("[MouleManager.acquire_dependencies] dependency list: {}".format(str(dep_list)))

        if len(dep_list) == 0:
            return {}

        data = {}
        for dep_id, dep_names, dep_ver_req in dep_list:
            # Check if versions match
            if dep_id != "":
                dep_ver = _parse_version(self.modules[dep_id].version)
                cmp_mode, dep_ver_req = _parse_version(dep_ver_req, True)
                if not _check_versions(dep_ver_req, cmp_mode, dep_ver):
                    print("Version mismatch for dependency '{}' of module '{}': found version {} of '{}', but require {}.".format(kind, mod_id, dep_ver, dep_id, dep_ver_req), file=sys.stderr)
                    return None
            else:
                dep_ver = ()

            # Check if data is available
            if dep_id not in data:
                dep_data = {'': dep_ver}
                data[dep_id] = dep_data
            else:
                dep_data = data[dep_id]

            for name in dep_names:
                for d in reversed(self.data):
                    dm = d.get(dep_id)
                    if dm is None:
                        continue

                    dmn = dm.get(name)
                    if dmn is None:
                        continue
                    else:
                        dep_data[name] = dmn
                        break
                else:
                    print("Missing dependency '{}' of plugin '{}': did not find required data '{}' of plugin '{}'.".format(kind, mod_id, name, dep_id), file=sys.stderr)
                    return None

        return data


    def module_perform(self, mod_id, kind):
        """
        Call a function of the module.

        :param mod_id: The ID of the module to be called
        :type mod_id: str
        :param kind: The kind of function to be called; eiter "conf" or "run"
        , "loop_next", "loop_end".
        :type kind: str
        """
        # Check if function kind is legal
        if kind != "conf" and kind != "run":
            print("Cannot call function '{}': only 'conf' and 'run' functions can be called directly.".format(kind), file=sys.stderr)
            return

        # Check if function exists
        m = self.modules[mod_id]
        if not m.has_fun(kind):
            print("Cannot call function '{}' of module '{}': function not found.".format(kind, mod_id), file=sys.stderr)
            return

        # Get dependencies of function
        dep_data = self.acquire_dependencies(mod_id, kind)
        if dep_data is None:
            print("Cannot call function '{}' of module '{}': dependencies not fulfilled.".format(kind, mod_id), file=sys.stderr)
            return

        # Call the function
        try:
            res = m.call_fun(kind, dep_data)
        except Exception as e:
            _print_exception_string(e, 1)
            return

        # If module is configured, memorize its result and return
        if kind == "conf":
            self.memorize_result(mod_id, res)
            return

        # If this is reached, we have performed the "run" function.
        # Check if the module contains a loop.
        # If not, memorize result and return.
        if m.has_fun("loop_next"):
            self.data.append({})
            self.memorize_result(mod_id, res)
        else:
            self.memorize_result(mod_id, res)
            return

        # Run the loop body
        try:
            while True:
               # TODO: insert loop body calls here
               dep_data = self.acquire_dependencies(mod_id, "loop_next")
               res = m.call_fun("loop_next", dep_data)
               self.memorize_result(mod_id, res)
        except StopIteration:
            pass
        except Exception as e:
            _print_exception_string(e, 1)
            del self.data[-1]
            return
        
        # Call the loop clean-up function, if given
        if m.has_fun("loop_end"):
            dep_data = self.acquire_dependencies(mod_id, "loop_end")
            try:
                res = m.call_fun("loop_end", dep_data)
            except Exception as e:
                _print_exception_string(e, 1)
                return

            del self.data[-1]
            self.memorize_result(mod_id, res)
        else:
            del self.data[-1]


    def _add_data(self, d_id, name, value, index=-1):
        """
        Add data to the internal data memory.

        :param d_id: The id of the plugin providing the data
        :param name: The name of the data
        :param value: The value of the data
        :param index: The index of `self.data` to which to write the data
        """
        if d_id not in self.data[index]:
            self.data[index][d_id] = {}
        self.data[index][d_id][name] = value


    def register_builtin_data(self, name, value):
        """
        Register built-in data.

        :meth:`register_builtin_data` can be used to add data as built-in
        data. They will be available using an empty string as id.

        :param name: The name of the data
        :param value: The value of the data
        """
        self._add_data("", name, value, index=0)


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
        self.__vals["dep"] = {}
        self.__vals["ret"] = {}
        self.__vals["fun"] = {}
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
        self.__set_tuple_of_str(cat, "category")


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
        self.__set_tuple_of_str(grp, "group")


    # "conf_dep"
    # [tuple of] tuple of ("id", [tuple of] "conf_ret", [tuple of] [(<, >) [=]] "version")
    # Dependencies of the module configuration function.
    @property
    def conf_dep(self):
        return self.get_dep("conf")
    @conf_dep.setter
    def conf_dep(self, dep):
        self.set_dep("conf", dep)


    # "run_dep"
    # [tuple of] tuple of ("id", [tuple of] "ret", [tuple of] [(<, >) [=]] "version")
    # Dependencies of the module run function.
    @property
    def run_dep(self):
        return self.get_dep("run")
    @run_dep.setter
    def run_dep(self, dep):
        self.set_dep("run", dep)


    # "dep"
    # [tuple of] tuple of ("id", [tuple of] "ret", [tuple of] [(<, >) [=]] "version")
    # Dependencies of the module function indicated by `kind`.
    def set_dep(self, kind, dep):
        # Check for bad kind
        if kind not in PERFORM_KINDS:
            print("Cannot set dependency: bad kind: {}".format(kind), file=sys.stderr)
            return

        # Parse dependency
        dep = _parse_dep(dep)

        # Check for bad dependency
        if dep is None:
            print("Cannot set dependency '{}' of plugin '{}': bad dependency given.".format(kind, self.id), file=sys.stderr)
            return

        # Check if overwriting (print warning)
        if kind in self.__vals["dep"]:
            print("Warning: overwriting dependency '{}' of plugin '{}'".format(kind, self.id), file=sys.stderr)

        # Set dependency
        self.__vals["dep"][kind] = dep

    def get_dep(self, kind):
        if kind not in PERFORM_KINDS:
            return None
        return self.__vals["dep"].get(kind, ())


    # "conf_ret"
    # [tuple of] str
    # Identifier for data generated by the configuration function of
    # the module. Used by other modules for defining dependencies on
    # specific data for their configuration functions.
    @property
    def conf_ret(self):
        self.get_ret("conf")
    @conf_ret.setter
    def conf_ret(self, ret):
        self.set_ret("conf", ret)


    # "run_ret"
    # [tuple of] str
    # Identifier for data generated by the run function of
    # the module. Used by other modules for defining dependencies on
    # specific data for their run functions.
    @property
    def run_ret(self):
        return self.get_ret("run")
    @run_ret.setter
    def run_ret(self, ret):
        self.set_ret("run", ret)


    # "ret"
    # [tuple of] str
    # Identifier for data generated by a function of the module.
    # Used by other modules for defining dependencies on
    # specific data for their functions.
    def set_ret(self, kind, ret):
        if kind not in RETURN_KINDS:
            print("Cannot set return data: bad kind: {}".format(kind), file=sys.stderr)
            return
        self.__set_tuple_of_str(ret, "ret", kind)

    def get_ret(self, kind):
        if kind not in RETURN_KINDS:
            return None
        return self.__vals["ret"].get(kind, ())


    # "fun"
    # dict of functions
    # The functions that can be performed by this module.
    # The key must be an entry of `PERFORM_KINDS`.
    def set_fun(self, kind, fun):
        if kind not in PERFORM_KINDS:
            print("Cannot set function: bad kind: {}".format(kind, file=sys.stderr))
            return
        self.__vals["fun"][kind] = fun

    def get_fun(self, kind):
        if kind not in PERFORM_KINDS:
            return None
        return self.__vals["fun"].get(kind)

    def has_fun(self, kind):
        return kind in self.__vals["fun"]

    def call_fun(self, kind, *args, **kwargs):
        fun = self.__vals["fun"].get(kind)
        if fun is None:
            return None
        return fun(*args, **kwargs)


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
            msg.append("The plugin name must be a non-empty string.")
        if not self.id or not isinstance(self.id, str):
            msg.append("The plugin id must be a non-empty string.")
        if not isinstance(self.version, tuple):
            msg.append("The plugin version must be a tuple of strings or an empty tuple.")


        # Assemble message string and return it
        if len(msg) > 0:
            msg = '\n'.join(msg)
        else:
            msg = None
        return msg


    def __set_tuple_of_str(self, x, *names):
        """
        Write string or tuple of strings in return data dict.

        The result will always be an empty tuple or a
        tuple of strings. In case of invalid `x`, a
        warning is emitted and the value is not changed.
        'None' always clears the value to an empty tuple.

        `names` is a list of keys for recursively indexing
        into `self.__vals`.
        """
        if isinstance(x, str):
            x = (x,)
        elif isinstance(x, tuple) and all([isinstance(i, str) for i in x]):
            pass
        elif cat is None:
            x = ()
        else:
            warnings.warn('Invalid "{}": {}'.format(names, str(x)))
            return

        if len(names) == 1:
            self.__vals[names[0]] = x
        elif len(names) == 2:
            self.__vals[names[0]][names[1]] = x



