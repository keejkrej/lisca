#! /usr/bin/env python3
import gui_tk as gui
import sys
import tkinter as tk
import tkinter.font as tkfont
import tkinter.ttk as ttk


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

        self.refresh_button = tk.Button(frame, text="Refresh",
                command=self.refresh_mod_tree)
        self.refresh_button.pack(side=tk.LEFT)

        # Treeview with scrollbar
        frame = tk.Frame(self.frame)
        frame.pack(side=tk.TOP, fill=tk.BOTH, expand=True)

        tree_scroll = ttk.Scrollbar(frame)
        tree_scroll.pack(side=tk.RIGHT, fill=tk.Y)

        self.mod_tree = ttk.Treeview(frame,
                columns=("id",),
                displaycolumns=(),
                selectmode="browse",
                yscrollcommand=tree_scroll.set)
        self.mod_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        tree_scroll.config(command=self.mod_tree.yview)
        self.mod_tree.heading("#0", text="Workflow")
        #self.mod_tree.heading("id", text="ID")
        self.mod_tree.bind("<<TreeviewSelect>>", self.selection_changed)

        # Info frame
        self.info_frame = tk.Frame(self.frame)
        self.info_frame.pack(side=tk.TOP, fill=tk.BOTH, expand=True)

        # Populate module tree
        #self.build_mod_tree()
        self.refresh_mod_tree()
        self.update_info()
        self.modman.register_listener(lambda: self.frame.after_idle(self.refresh_mod_tree), kind="order")


    def mainloop(self):
        """Start the Tk mainloop"""
        gui.mainloop()

    def build_mod_tree(self):
        """Populate the module list with modules; TODO"""
        # Clear module tree
        self.mod_tree.delete(*self.mod_tree.get_children())

        # Write into Treeview
        mo = self.modman.module_order
        for mod in mo:
            if type(mod) == str:
                m = self.modman.modules[mod]
                self.mod_tree.insert('', 'end', text=m.name, values=(m.id,))

    def get_id(self, iid):
        """Return module ID of module at Treeview position ``iid``"""
        return self.mod_tree.set(iid, column="id")

    def _insert_item(self, mod_id, parent='', index='end'):
        name = self.modman.modules[mod_id].name
        iid = self.mod_tree.insert(parent, index, text=name, values=(mod_id,))
        return iid


    def _swap_items(self, iid1, iid2):
        """Interchange two neighboring items in the Treeview."""
        if self.mod_tree.next(iid2) == iid1:
            iid1, iid2 = iid2, iid1
        if self.mod_tree.next(iid1) != iid2:
            return False

        self.mod_tree.move(iid2,
                self.mod_tree.parent(iid2),
                self.mod_tree.index(iid1))
        return True


    def refresh_mod_tree(self):
        """Step through module list and synchronize it"""
        mo = self.modman.module_order

        items = self.mod_tree.get_children()
        if items:
            iid = items[0]
        else:
            iid = ''
        i = 0

        while True:
            if i >= len(mo):
                if iid:
                    iid_old = iid
                    iid = self.mod_tree.next(iid_old)
                    self.mod_tree.delete(iid_old)
                else:
                    break

            elif not iid:
                self._insert_item(mo[i])
                i += 1

            elif mo[i] != self.get_id(iid):
                next_iid = self.mod_tree.next(iid)
                if not next_iid:
                    self.mod_tree.delete(iid)
                    iid = ''
                    continue
                elif mo[i] == self.get_id(next_iid):
                    self._swap_items(iid, next_iid)
                else:
                    iid_new = self._insert_item(mo[i],
                            index=self.mod_tree.index(iid))
                    if i >= len(mo) + 1 or mo[i+1] != self.get_id(iid):
                        self.mod_tree.delete(iid)
                        iid = self.mod_tree.next(iid_new)
                i += 1

            else:
                i += 1
                iid = self.mod_tree.next(iid)

        self.selection_changed()


    def prompt_new_module(self, *_):
        """Open dialog for selecting modules to insert"""
        if self.mod_list_frame is None:
            self.mod_list_frame = ModuleListFrame(self)
        else:
            self.mod_list_frame.to_front()

    def insert_mod(self, mod_name, mod_id):
        """Insert a module into the list after the current selection"""
        iid = self.mod_tree.focus()
        if iid:
            index = self.mod_tree.index(iid) + 1
        else:
            index = -1
        self.modman.module_order_insert(mod_id, index)

    def move_mod(self, direction):
        """Move a module in the list up or down"""
        iid = self.mod_tree.focus()
        if not iid:
            return
        index_old = self.mod_tree.index(iid)
        if direction == "up":
            index_new = index_old - 1
        elif direction == "down":
            index_new = index_old + 1
        else:
            print("bad direction: '{}'".format(direction))
            return
        self.modman.module_order_move(index_old, index_new)
        self.mod_tree.see(iid)
        self.selection_changed()

    def remove_mod(self, *_, iid=None):
        """Remove a module from the list"""
        if not iid:
            iid = self.mod_tree.focus()
        if iid:
            index = self.mod_tree.index(iid)
            self.modman.module_order_remove(index)
        self.selection_changed()

    def get_module(self, iid=None, mod_id=None):
        """
        Get a reference to the module instance.
        
        Specify either iid (module ID of ``self.mod_tree``)
        or module ID.
        When specifying both, iid overrides module ID.
        Returns module instance or, on error, None.
        """
        if iid is None and mod_id is None:
            return None
        elif iid is not None:
            mod_id = self.mod_tree.set(iid, column='id')
        return self.modman.modules.get(mod_id)

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
        self.update_info()

    def update_info(self):
        iid = self.mod_tree.focus()
        if not iid:
            self.clear_info(True)
        else:
            self.show_module_info(iid)

    def clear_info(self, showNote=False):
        for c in self.info_frame.winfo_children():
            c.destroy()
        if showNote:
            tk.Label(self.info_frame, text="No module selected").pack(side=tk.TOP)

    def show_module_info(self, iid):
        # Prepare info frame
        self.clear_info()
        #self.info_frame.rowconfigure(0, weight=1)
        self.info_frame.columnconfigure(1, weight=1)
        mod = self.get_module(iid)

        fmt = {"font": tkfont.Font(family="TkDefaultFont", weight="bold")}
        tk.Label(self.info_frame,
                anchor=tk.E,
                **fmt,
                text="Name:"
                ).grid(row=0, column=0, sticky=tk.E)
        tk.Label(self.info_frame,
                anchor=tk.E,
                **fmt,
                text="ID:"
                ).grid(row=1, column=0, sticky=tk.E)
        tk.Label(self.info_frame,
                anchor=tk.W,
                text=mod.name
                ).grid(row=0, column=1, sticky=tk.W)
        tk.Label(self.info_frame,
                anchor=tk.W,
                text=mod.id
                ).grid(row=1, column=1, sticky=tk.W)

        btn_conf = tk.Button(self.info_frame, text="Configure")
        btn_conf.grid(row=0, column=2, sticky=tk.N+tk.E+tk.S+tk.W)
        if mod.has_fun('conf'):
            btn_conf.config(command=lambda: self.modman.module_perform(mod.id, "conf"))
        else:
            btn_conf.config(state=tk.DISABLED)

        btn_run = tk.Button(self.info_frame, text="Run")
        btn_run.grid(row=1, column=2, sticky=tk.N+tk.E+tk.S+tk.W)
        if mod.has_fun('run'):
            btn_run.config(command=lambda: self.modman.module_perform(mod.id, "run"))
        else:
            btn_run.config(state=tk.DISABLED)


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
        scroll_y = ttk.Scrollbar(self.root, orient=tk.VERTICAL)
        scroll_y.grid(row=0, column=1, sticky=tk.N+tk.S)
        scroll_x = ttk.Scrollbar(self.root, orient=tk.HORIZONTAL)
        scroll_x.grid(row=1, column=0, sticky=tk.W+tk.E)

        # Set up list view
        self.list = ttk.Treeview(self.root,
                columns=("id", "version", "name"),
                displaycolumns=("id", "version"),
                selectmode="browse",
                yscrollcommand=scroll_y.set,
                xscrollcommand=scroll_x.set)
        self.list.grid(row=0, column=0, sticky=tk.N+tk.E+tk.S+tk.W)
        self.list.bind("<<TreeviewSelect>>", self.selection_changed)
        self.list.heading("#0", text="Name")
        self.list.heading("id", text="ID")
        self.list.heading("version", text="Version")

        scroll_y.config(command=self.list.yview)
        scroll_x.config(command=self.list.xview)

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
