#! /usr/bin/env python3
import gui_tk as gui
import sys
import tkinter as tk
from tkinter import ttk

class WorkflowGUI:
    def __init__(self, module_manager):
        # Module management setup
        self.modman = module_manager
        self.mod_list = sorted(self.modman.list_display(), key=lambda m: m["name"])

        # Basic GUI setup
        self.frame = gui.new_toplevel()
        self.frame.title("PyAMA Workflow (NEW)")

        self.root = gui.get_root()
        self.mod_list_frame = None

        # Menu bar
        menubar = tk.Menu(self.frame)
        self.frame.config(menu=menubar)

        filemenu = tk.Menu(menubar)
        menubar.add_cascade(label="File", menu=filemenu)
        filemenu.add_command(label="Quit", command=self.frame.quit)

        helpmenu = tk.Menu(menubar)
        menubar.add_cascade(label="Help", menu=helpmenu)

        # Module control buttons
        frame = tk.Frame(self.frame)
        frame.pack(side=tk.TOP, fill=tk.X)

        self.load_button = tk.Button(frame, text="Add…",
                command=self.prompt_new_module)
        self.load_button.pack(side=tk.LEFT)

        self.remove_button = tk.Button(frame, text="Remove",
                command=self.remove_mod,
                state=tk.DISABLED)
        self.remove_button.pack(side=tk.LEFT)

        self.down_button = tk.Button(frame, text="Down",
                command=lambda: self.move_mod("down"),
                state=tk.DISABLED)
        self.down_button.pack(side=tk.LEFT)

        self.up_button = tk.Button(frame, text="Up",
                command=lambda: self.move_mod("up"),
                state=tk.DISABLED)
        self.up_button.pack(side=tk.LEFT)

        self.refresh_button = tk.Button(frame, text="Refresh")
        self.refresh_button.pack(side=tk.LEFT)

        # Treeview with scrollbar
        frame = tk.Frame(self.frame)
        frame.pack(side=tk.TOP, fill=tk.BOTH, expand=True)

        self.tree_scroll = ttk.Scrollbar(frame)
        self.tree_scroll.pack(side=tk.RIGHT, fill=tk.Y)

        self.mod_tree = ttk.Treeview(frame,
                columns=("id",),
                displaycolumns=(),
                selectmode="browse",
                yscrollcommand=self.tree_scroll.set)
        self.mod_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        self.tree_scroll.config(command=self.mod_tree.yview)
        self.mod_tree.heading("#0", text="Workflow")
        #self.mod_tree.heading("id", text="ID")
        self.mod_tree.bind("<<TreeviewSelect>>", self.selection_changed)

        #self.test_populate_tree()
        self.build_mod_tree()


    def mainloop(self):
        """Start the Tk mainloop"""
        gui.mainloop()

    def build_mod_tree(self):
        """Populate the module list with modules; TODO"""
        mo = self.modman.module_order

        for item in mo:
            if type(item) == str:
                m = self.modman.modules[item]
                self.mod_tree.insert('', 'end', text=m.name, values=(m.id,))

    def prompt_new_module(self, *_):
        """Open dialog for selecting modules to insert"""
        if self.mod_list_frame is None:
            self.mod_list_frame = ModuleListFrame(self)
        else:
            self.mod_list_frame.to_front()

    def insert_mod(self, mod_name, mod_id):
        """Insert a module into the list after the current selection"""
        item_focus = self.mod_tree.focus()
        if item_focus:
            index = self.mod_tree.index(item_focus) + 1
        else:
            index = "end"
        self.mod_tree.insert("", index, values=(mod_id,), text=mod_name)

    def move_mod(self, direction):
        """Move a module in the list up or down"""
        iid = self.mod_tree.focus()
        if direction == "up":
            index = self.mod_tree.index(iid) - 1
        elif direction == "down":
            index = self.mod_tree.index(iid) + 1
        else:
            return
        self.mod_tree.move(iid, self.mod_tree.parent(iid), index)
        self.selection_changed()

    def remove_mod(self, *_, iid=None):
        """Remove a module from the list"""
        if not iid:
            iid = self.mod_tree.focus()
        if iid:
            self.mod_tree.delete(iid)
        self.selection_changed()

    def selection_changed(self, *_):
        """Update control button states upon selection change"""
        remove_button_state = tk.DISABLED
        up_button_state = tk.DISABLED
        down_button_state = tk.DISABLED

        iid = self.mod_tree.focus()
        if iid:
            remove_button_state = tk.NORMAL
            if self.mod_tree.prev(iid):
                up_button_state = tk.NORMAL
            if self.mod_tree.next(iid):
                down_button_state = tk.NORMAL

        self.remove_button.config(state=remove_button_state)
        self.up_button.config(state=up_button_state)
        self.down_button.config(state=down_button_state)


class ModuleListFrame:
    """
    An auxiliary class for selecting and inserting new modules.
    """
    def __init__(self, parent):
        """Create a new dialog.

        :param parent: the parent ``WorkflowGUI`` instance
        """
        # Basic setup of dialog window
        self.parent = parent
        self.root = tk.Toplevel(parent.frame)
        self.root.bind("<Destroy>", self._destroy)
        self.root.title("PyAMA Modules")

        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)

        # Create scrollbars
        self.scroll_y = ttk.Scrollbar(self.root, orient=tk.VERTICAL)
        self.scroll_y.grid(row=0, column=1, sticky=tk.N+tk.S)
        self.scroll_x = ttk.Scrollbar(self.root, orient=tk.HORIZONTAL)
        self.scroll_x.grid(row=1, column=0, sticky=tk.W+tk.E)

        # Set up list view
        self.list = ttk.Treeview(self.root,
                columns=("id", "version", "name"),
                displaycolumns=("id", "version"),
                selectmode="browse",
                yscrollcommand=self.scroll_y.set,
                xscrollcommand=self.scroll_x.set)
        self.list.grid(row=0, column=0, sticky=tk.N+tk.E+tk.S+tk.W)
        self.list.bind("<<TreeviewSelect>>", self.selection_changed)
        self.list.heading("#0", text="Name")
        self.list.heading("id", text="ID")
        self.list.heading("version", text="Version")

        self.scroll_y.config(command=self.list.yview)
        self.scroll_x.config(command=self.list.xview)

        # Set up addition button
        self.add_button = tk.Button(self.root, text="Add",
                state=tk.DISABLED, command=self.add_module)
        self.add_button.grid(row=2, column=0, columnspan=2,
                sticky=tk.N+tk.E+tk.S+tk.W)

        # Populate list with available modules
        self.populate()


    def populate(self):
        """Populate the list with available modules"""
        for m in self.parent.mod_list:
            self.list.insert('', 'end', text=m["name"],
                    values=(m["id"], m["version"], m["name"]))

    def to_front(self):
        """Bring the dialog window to front"""
        self.root.lift()

    def _destroy(self, *_):
        """Prevent dangling references upon destroying the dialog"""
        if self.parent is not None:
            self.parent.mod_list_frame = None
        self.parent = None

    def selection_changed(self, *_):
        """Toggle button state upon selection change"""
        if self.list.focus():
            self.add_button.config(state=tk.NORMAL)
        else:
            self.add_button.config(state=tk.DISABLED)

    def add_module(self,*_):
        """Insert selected module into parent list upon button click"""
        iid = self.list.focus()
        if not iid:
            return
        values = self.list.set(iid)
        self.parent.insert_mod(values["name"], values["id"])
