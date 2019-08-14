import tkinter as tk
import tkinter.ttk as ttk
import tkinter.filedialog as tkfd
from .stackviewer_tk import StackViewer
from .stack import Stack
from .stack import metastack as ms


class Main_Tk:
    def __init__(self, *, name=None, version=None):
        # Initialize Window
        self.root = tk.Tk()

        if name is not None:
            title = name
        else:
            title = "Main Window"
        if version is not None:
            title = " ".join((title, version))
        self.root.title(title)

        self.root.geometry('1200x500')
        self.root.grid_rowconfigure(0, weight=1)
        self.root.grid_columnconfigure(0, weight=1)

        # Initialize variables
        self.stack = None
        self.segmented = None

        # Build menu
        menubar = tk.Menu(self.root)
        self.root.config(menu=menubar)

        filemenu = tk.Menu(menubar)
        menubar.add_cascade(label="File", menu=filemenu)
        filemenu.add_command(label="Open stack…", command=self.open_stack)
        filemenu.add_command(label="Open segmentation…", command=self.open_seg)
        filemenu.add_command(label="Quit", command=self.root.quit)

        modemenu = tk.Menu(menubar)
        menubar.add_cascade(label="Mode", menu=modemenu)

        settmenu = tk.Menu(menubar)
        menubar.add_cascade(label="Settings", menu=modemenu)

        helpmenu = tk.Menu(menubar)
        menubar.add_cascade(label="Help", menu=helpmenu)


        # Window structure
        self.paned = tk.PanedWindow(self.root, orient=tk.HORIZONTAL, sashwidth=2, sashrelief=tk.RAISED)
        self.paned.grid(row=0, column=0, sticky='NESW')

        ## Channels frame
        self.chanframe = tk.Frame(self.paned)
        self.paned.add(self.chanframe, sticky='NESW', width=150)

        self.open_btn = tk.Button(self.chanframe, text="Open stack...", command=self.open_stack)
        self.open_btn.pack(anchor=tk.N, expand=True, fill=tk.X, padx=10)

        ## Stack frame
        self.stackframe = tk.Frame(self.paned)
        self.paned.add(self.stackframe, sticky='NESW', width=550)
        self.stackviewer = StackViewer(parent=self.stackframe, root=self.root, show_buttons=False)

        ## Options frame
        self.optframe = tk.Frame(self.paned)
        self.paned.add(self.optframe, sticky='NESW', width=450)

        ## Statusbar
        self.statusbar = tk.Frame(self.root, padx=2, pady=2, bd=1, relief=tk.SUNKEN)
        self.statusbar.grid(row=1, column=0, sticky='NESW')
        tk.Label(self.statusbar, text="Status").pack()












        # Run mainloop
        self.root.mainloop()


    def open_stack(self):
        fn = tkfd.askopenfilename(title="Open stack", parent=self.root, initialdir='res', filetypes=(("TIFF", '*.tif *.tiff'), ("All files", '*')))
        print(fn)
        self.stack = Stack(fn)
        self.stackviewer.set_stack(self.stack, wait=False)

    def open_seg(self):
        print("Main_Tk.open_seg: not implemented")


class StackOpener:
    # To test this class, run e.g.:
    # $ cd pyama
    # $ ipython
    # In [1]: %load_ext autoreload
    # In [2]: %autoreload 2
    # In [3]: from src.main_window import StackOpener
    # In [4]: import tkinter as tk
    # In [5]: root = tk.Tk(); StackOpener(root); root.mainloop()
    # Repeat In [5] for each test run
    def __init__(self, root):
        self.root = root
        self.frame = tk.Toplevel(self.root)
        self.frame.title("Select stacks and channels")
        self.frame.geometry('1000x500')

        # PanedWindow
        paned = tk.PanedWindow(self.frame)
        paned = tk.PanedWindow(self.frame, orient=tk.HORIZONTAL, sashwidth=2, sashrelief=tk.RAISED)
        paned.pack(expand=True, fill=tk.BOTH)

        # Stack selection
        stack_frame = tk.Frame(paned)
        paned.add(stack_frame, sticky='NESW', width=200)
        stack_frame.grid_columnconfigure(1, weight=1)
        stack_frame.grid_rowconfigure(0, weight=1)

        ## Listbox
        list_frame = tk.Frame(stack_frame)
        list_frame.grid(row=0, column=0, columnspan=2, sticky='NESW')
        list_frame.grid_rowconfigure(0, weight=1)
        list_frame.grid_columnconfigure(0, weight=1)

        self.stack_list = tk.Listbox(list_frame, selectmode=tk.SINGLE)
        self.stack_list.grid(row=0, column=0, sticky='NESW')
        list_y_scroll = tk.Scrollbar(list_frame, orient=tk.VERTICAL, command=self.stack_list.yview)
        list_x_scroll = tk.Scrollbar(list_frame, orient=tk.HORIZONTAL, command=self.stack_list.xview)
        self.stack_list.config(yscrollcommand=list_y_scroll.set)
        self.stack_list.config(xscrollcommand=list_x_scroll.set)
        list_y_scroll.grid(row=0, column=1, sticky='NESW')
        list_x_scroll.grid(row=1, column=0, sticky='NESW')

        ## Buttons
        btn_frame = tk.Frame(stack_frame)
        btn_frame.grid(row=1, column=0, columnspan=2, sticky='NESW')
        btn_frame.grid_columnconfigure(0, weight=1)
        btn_frame.grid_columnconfigure(1, weight=1)

        btn_open = tk.Button(btn_frame, text="Open...", command=self.open_stack)
        #btn_open.pack(side=tk.LEFT)
        btn_open.grid(row=0, column=0, sticky='WE', padx=5)
        btn_remove = tk.Button(btn_frame, text="Remove", command=self.remove_stack)
        #btn_remove.pack(side=tk.LEFT)
        btn_remove.grid(row=0, column=1, sticky='WE', padx=5)

        ## Display
        self.var_stack = tk.StringVar(self.frame)
        self.var_n_chan = tk.StringVar(self.frame)
        tk.Label(stack_frame, text="Stack:", anchor=tk.W).grid(row=2, column=0, sticky='NESW', padx=5)
        tk.Label(stack_frame, text="Channels:", anchor=tk.W).grid(row=3, column=0, sticky='NESW', padx=5)
        tk.Label(stack_frame, textvariable=self.var_stack, anchor=tk.W).grid(row=2, column=1, sticky='NESW')
        tk.Label(stack_frame, textvariable=self.var_n_chan, anchor=tk.W).grid(row=3, column=1, sticky='NESW')

        # Channel selection
        chan_frame = tk.Frame(paned)
        paned.add(chan_frame, sticky='NESW', width=800)
        chan_frame.grid_rowconfigure(0, weight=1)
        chan_frame.grid_columnconfigure(0, weight=1)

        ## Channel display
        self.chan_disp_frame = tk.Frame(chan_frame)
        self.chan_disp_frame.grid(row=0, column=0, sticky='NESW')

        ## Separator
        ttk.Separator(chan_frame, orient=tk.HORIZONTAL).grid(row=1, column=0, sticky='ESW')

        ## Channel configuration
        chan_add_frame = tk.Frame(chan_frame)
        chan_add_frame.grid(row=2, column=0, sticky='ESW')
        chan_add_frame.grid_columnconfigure(0, weight=1, pad=5)
        chan_add_frame.grid_columnconfigure(1, weight=1, pad=5)
        chan_add_frame.grid_columnconfigure(2, weight=1, pad=5)

        tk.Label(chan_add_frame, text="Add new channel", anchor=tk.W).grid(row=0, column=0, columnspan=4, sticky='EW')
        tk.Label(chan_add_frame, text="Channel", anchor=tk.W).grid(row=1, column=0, sticky='EW')
        tk.Label(chan_add_frame, text="Label", anchor=tk.W).grid(row=1, column=1, sticky='EW')
        tk.Label(chan_add_frame, text="Type", anchor=tk.W).grid(row=1, column=2, sticky='EW')

        self.var_chan = tk.IntVar(self.frame)
        self.var_label = tk.StringVar(self.frame)
        self.var_type = tk.StringVar(self.frame)

        self.chan_opt = tk.OptionMenu(chan_add_frame, self.var_chan, 0, 1, 2, 3).grid(row=2, column=0, sticky='NESW')
        label_entry = tk.Entry(chan_add_frame, textvariable=self.var_label).grid(row=2, column=1, sticky='NESW')
        type_opt = tk.OptionMenu(chan_add_frame, self.var_type,
            "None", ms.TYPE_PHASECONTRAST, ms.TYPE_FLUORESCENCE, ms.TYPE_SEGMENTATION).grid(row=2, column=2, sticky='NESW')
        tk.Button(chan_add_frame, text="Add", command=self.add_chan).grid(row=2, column=3, sticky='EW')


    def open_stack(self):
        #TODO
        print("StackOpener.open_stack")

    def remove_stack(self):
        #TODO
        print("StackOpener.remove_stack")

    def add_chan(self):
        #TODO
        print("StackOpener.add_chan")

















if __name__ == '__main__':
    Main_Tk(name="PyAMA", version="alpha")
