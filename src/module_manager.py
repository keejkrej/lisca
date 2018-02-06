#! /usr/bin/env python3
import importlib as imp
import os


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
        try:
            meta = mod.register()
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
