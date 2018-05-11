class RecursiveComparer:
    def __init__(self, tree, mo):
        self.tree = tree
        self.mo = mo
        self.moi = ModuleOrderIterator(mo.order)

        self.i_tree = []
        self.i_mo = []

        self.moi.print_order() #DEBUG

    @classmethod
    def go(cls, tree, mo):
        comparer = cls(tree, mo)
        comparer.compare()


    def id_of(self, iid):
        """Return module ID of item at ``iid``"""
        return self.tree.set(iid, column="id")


    def insert(self, mod_id, prev=None, parent=None):
        # Get name and ID of module to be inserted
        if not mod_id:
            # Dummy item for empty loops
            mod_name = ""
            mod_id = ""
        else:
            mod_name = self.mo.modules[mod_id].name

        # Get index where to insert the item
        if prev is None:
            index = "end"
        else:
            index = self.tree.index(prev)
        
        # Get parent of the item to be inserted
        if parent is None:
            if prev is None:
                raise ValueError("Either parent or prev must be given.")
            parent = self.tree.parent(prev)

        # Insert the item into the tree
        iid = self.tree.insert(parent, index, text=mod_name, values=(mod_id,))

        # Return the iid of the newly inserted item
        return iid


    def compare(self, parent=""):
        """Compare tree view and module order content."""
        # Get first child of current parent
        children = self.tree.get_children(parent)
        if children:
            iid = children[0]
        else:
            iid = ""

        # Iterate over items of ModuleOrder in current level
        while self.moi.has_next():
            self.moi.goto_next()

            # Compare module IDs
            m_id = self.moi.get_id()
            t_id = self.id_of(iid)

            # DEBUG
            #print("index={}, m_id={:20s}, t_id={:20s}".format(self.moi.index, m_id, t_id))

            if m_id != t_id:
                next_iid = self.tree.next(iid)
                next_t_id = self.id_of(next_iid)
                if m_id == next_t_id:
                    # Module ID is found one step further, swap items
                    self.tree.move(next_iid, parent, self.tree.index(iid))
                    iid = next_iid
                else:
                    # Module ID is not found in tree, insert it
                    if iid:
                        iid = self.insert(m_id, prev=iid)
                    else:
                        iid = self.insert(m_id, parent=parent)
                if not next_iid or t_id == self.moi.get_next_id():
                    # TODO: continue here: inherit focus on deletion of first item in list if first item has focus
                    sel = self.tree.selection()
                    if sel and sel[0] == self.tree.prev(iid):
                        self.tree.focus(iid)
                        self.tree.selection_set(iid)

            # Compare children of current parent
            children = self.tree.get_children(iid)
            if self.moi.is_loop():
                if self.moi.has_children():
                    self.moi.step_into_children()
                    self.compare(parent=iid)
                else:
                    if not (len(children) == 1 and self.id_of(children[0]) == ""):
                        self.tree.delete(*children)
                        self.insert("", parent=iid)
            elif children:
                self.tree.delete(*children)

            # Proceed to next item in tree view
            iid = self.tree.next(iid)

        # Delete all additional items in tree view
        while iid:
            if self.tree.focus() == iid:
                prev = self.tree.prev(iid)
                if prev:
                    self.tree.selection_set(prev)
                    self.tree.focus(prev)
            old = iid
            iid = self.tree.next(iid)
            self.tree.delete(old)

        # Return iterator to parent
        if self.moi.has_parent():
            self.moi.goto_parent()


class ModuleOrderIterator:
    """
    ModuleOrderIterator provides an API for navigating through a
    ModuleOrder instance in a similar way to a ttk.Treeview.
    """
    def __init__(self, order):
        self.stack = [order]
        self.index = None
        self.next_into_children = False

    def has_next(self):
        if self.index is None and self.stack[0]:
            return True
        elif not self.index:
            return False
        elif self.next_into_children:
            return self.has_children()
        elif self.index[-1] < len(self.stack[-2]) - 1:
            return True
        else:
            return False

    def goto_next(self):
        if self.next_into_children:
            self.goto_first_child()
        elif self.index is None and self.stack[-1]:
            self.index = [0]
            self.stack.append(self.stack[-1][0])
        elif self.index and (self.index[-1] < len(self.stack[-2]) - 1):
            self.index[-1] += 1
            self.stack[-1] = self.stack[-2][self.index[-1]]
        else:
            raise IndexError("Cannot go to next item.")

    def is_loop(self):
        return len(self.stack) > 1 and type(self.stack[-1]) != str

    def has_children(self):
        if not self.is_loop():
            return False
        return len(self.stack[-1]) > 1

    def step_into_children(self):
        """Mark down that next call to ``goto_next`` will to to first child"""
        if not self.has_children():
            raise IndexError("Cannot step into children when there are no children.")
        self.next_into_children = True

    def goto_first_child(self):
        self.next_into_children = False
        if not self.has_children():
            raise IndexError("Cannot index into children when there are no children.")
        self.index.append(1)
        self.stack.append(self.stack[-1][1])

    def has_parent(self):
        if self.index:
            return True
        return False

    def goto_parent(self):
        if not self.has_parent():
            raise IndexError("Cannot go to parent when there is no parent.")
        self.next_into_children = False
        self.stack.pop()
        self.index.pop()

    def get_id(self):
        if self.is_loop():
            return self.stack[-1][0]
        return self.stack[-1]

    def get_next_id(self):
        if not self.has_next():
            return ""
        elif self.next_into_children:
            return self.stack[-1][1]
        elif self.index is None:
            s = self.stack[-1][0]
            if type(s) == list:
                s = s[0]
            return s
        else:
            self.stack[-1] = self.stack[-2][self.index[-1] + 1]

    def print_index(self):
        # DEBUG
        print("ModuleOrderIterator.index = {}".format(str(self.index)))

    def print_order(self):
        # DEBUG
        print("ModuleOrder = {}".format(str(self.stack[0])))
