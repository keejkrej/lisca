import tkinter as tk
import tkinter.filedialog as tkfd
from .stackviewer_tk import StackViewer
from .stack import Stack


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
        self.paned = tk.PanedWindow(self.root, orient=tk.HORIZONTAL)
        self.paned.grid(row=0, column=0, sticky='NESW')

        ## Stack frame
        self.stackframe = tk.Frame(self.paned)
        self.paned.add(self.stackframe, sticky='NESW', width=600)
        self.stackviewer = StackViewer(parent=self.stackframe, root=self.root, show_buttons=False)

        ## Options frame
        self.optframe = tk.Frame(self.paned)
        self.paned.add(self.optframe, sticky='NESW', width=600)


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


if __name__ == '__main__':
    Main_Tk(name="PyAMA", version="alpha")
