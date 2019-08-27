import os
import numpy as np
import tkinter as tk
import tkinter.ttk as ttk
import tkinter.filedialog as tkfd
from .roi import ContourRoi
from .stackviewer_tk import StackViewer
from .stack import Stack
from .stack import metastack as ms
from .tracking import Tracker


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
        self.display_stack = None
        self.channel_selection_widgets = {}
        self.track = True
        self.traces = None
        self.traces_selection = None
        self.regionprops = None

        # Build menu
        menubar = tk.Menu(self.root)
        self.root.config(menu=menubar)

        filemenu = tk.Menu(menubar)
        menubar.add_cascade(label="File", menu=filemenu)
        filemenu.add_command(label="Open stack…", command=self.open_stack)
        #filemenu.add_command(label="Open segmentation…", command=self.open_seg)
        filemenu.add_command(label="Quit", command=self.root.quit)

        modemenu = tk.Menu(menubar)
        menubar.add_cascade(label="Mode", menu=modemenu)

        settmenu = tk.Menu(menubar)
        menubar.add_cascade(label="Settings", menu=modemenu)

        helpmenu = tk.Menu(menubar)
        menubar.add_cascade(label="Help", menu=helpmenu)
        helpmenu.add_command(label="Breakpoint", command=self._breakpoint)


        # Window structure
        self.paned = tk.PanedWindow(self.root, orient=tk.HORIZONTAL, sashwidth=2, sashrelief=tk.RAISED)
        self.paned.grid(row=0, column=0, sticky='NESW')

        ## Channels frame
        self.chanframe = tk.Frame(self.paned)
        self.paned.add(self.chanframe, sticky='NESW', width=150)
        self.chanframe.grid_columnconfigure(0, weight=1)

        self.open_btn = tk.Button(self.chanframe, text="Open stack...", command=self.open_stack)
        #self.open_btn.pack(anchor=tk.N, expand=True, fill=tk.X, padx=10)
        self.open_btn.grid(row=0, column=0, sticky='NEW', padx=10, pady=5)
        self.chanselframe = tk.Frame(self.chanframe)
        self.chanselframe.grid(row=1, column=0, sticky='NEW')

        ## Stack frame
        self.stackframe = tk.Frame(self.paned)
        self.paned.add(self.stackframe, sticky='NESW', width=550)
        self.stackframe.bind('<Configure>', self._stacksize_changed)
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


    def _breakpoint(self):
        """Enter a breakpoint for DEBUGging"""
        breakpoint()

    def open_stack(self):
        """Ask user to open new stack"""
        StackOpener(self.root, callback=self.open_metastack)

    def open_metastack(self, data):
        if not data:
            return
        meta = ms.MetaStack()
        for d in data:
            if d['type'] == ms.TYPE_SEGMENTATION and self.track:
                stack = self.track_stack(d['stack'])
                name = 'segmented_stack'
                d['stack'].close()
            else:
                stack = d['stack']
                name = d['stack'].path
            meta.add_stack(stack, name=name)
            meta.add_channel(name=name,
                             channel=d['i_channel'],
                             label=d['label'],
                             type_=d['type'],
                            )
            #if self.regionprops:
            #    for fr, props in self.regionprops.items():
            #        meta.set_rois([ContourRoi(regionprop=p) for p in props.values()], frame=fr)
        self.load_metastack(meta)

    def track_stack(self, s):
        """Perform tracking of a given stack"""
        tracker = Tracker(segmented_stack=s)
        tracker.get_traces()
        l = tracker.stack_lbl
        self.rois = []
        self.traces = {}
        self.traces_selection = {}
        #breakpoint()#DEBUG
        for fr, props in tracker.props.items():
            #l.set_rois([ContourRoi(regionprop=p) for p in props.values()], frame=fr)
            self.rois.append({l: ContourRoi(regionprop=p, label=l, color='blue') for l, p in props.items()})
        for i, trace in enumerate(tracker.traces):
            name = str(i + 1)
            is_selected = tracker.traces_selection[i]
            self.traces[name] = trace
            self.traces_selection[name] = is_selected
            for fr, rois in enumerate(self.rois):
                roi = rois[trace[fr]]
                roi.name = name
                roi.color = 'green' if is_selected else 'red'
        return l


    def render_display(self, meta, frame, scale=None):
        #TODO adjust display
        # find channel to display
        channels = []
        for i in sorted(self.channel_selection_widgets.keys()):
            if self.channel_selection_widgets[i]['val']:
                channels.append(i)
        if not channels:
            channels.append(0)

        # Get image scale
        self.root.update_idletasks()
        display_width = self.stackframe.winfo_width()
        if self.display_stack.width != display_width:
            scale = display_width / self.stack.width
            #self.display_stack.set_properties(width=display_width, height=self.stack.height*scale)
        else:
            scale = self.display_stack.width / self.stack.width

        # Convert image to uint8
        imgs = []
        for i in channels:
            img = self.stack.get_image(channel=i, frame=frame, scale=scale)
            if self.stack.spec(i).type == ms.TYPE_SEGMENTATION:
                img2 = np.zeros_like(img, dtype=np.uint8)
                img2[img > 0] = 255
                img = img2
            imgs.append(img)
        if len(imgs) > 1:
            img = np.mean(imgs, axis=0)
        else:
            img = imgs[0]
        img_min, img_max = img.min(), img.max()
        img = ((img - img_min) * (255 / (img_max - img_min))).astype(np.uint8)

        return img


    def _build_chanselbtn_callback(self, x):
        def callback(val=None, notify=True):
            nonlocal self, x
            if val is None:
                val = not x['val']
            x['val'] = val
            if val:
                x['button'].config(relief=tk.SUNKEN)
            else:
                x['button'].config(relief=tk.RAISED)
            if notify:
                self.display_stack._listeners.notify('image')
        return callback

    def load_metastack(self, meta):
        self.stack = meta
        self.display_stack = ms.MetaStack()
        self.display_stack.set_properties(n_frames=meta.n_frames,
                                          width=meta.width,
                                          height=meta.height,
                                          mode=8,
                                         )
        if self.rois:
            for fr, rois in enumerate(self.rois):
                self.display_stack.set_rois(list(rois.values()), frame=fr)

        # Display buttons (new)
        for k, x in self.channel_selection_widgets.items():
            x['button'].destroy()
            del x['callback']
            del self.channel_selection_widgets[k]
        has_display = False
        idx_phasecontrast = None
        idx_fluorescence = []
        idx_segmentation = None
        for i, spec in enumerate(meta.channels):
            if spec.type == ms.TYPE_PHASECONTRAST and not idx_phasecontrast:
                idx_phasecontrast = i
            elif spec.type == ms.TYPE_FLUORESCENCE:
                idx_fluorescence.append(i)
            elif spec.type == ms.TYPE_SEGMENTATION and not idx_segmentation:
                idx_segmentation = i
            else:
                continue
            x = {}
            self.channel_selection_widgets[i] = x
            x['type'] = spec.type
            x['val'] = False
            btntxt = []
            if spec.label:
                btntxt.append(spec.label)
            if spec.type == ms.TYPE_FLUORESCENCE:
                btntxt.append("{} {}".format(spec.type, len(idx_fluorescence)))
            else:
                btntxt.append(spec.type)
            btntxt = "\n".join(btntxt)
            x['callback'] = self._build_chanselbtn_callback(x)
            x['button'] = tk.Button(self.chanselframe, justify=tk.LEFT,
                                    text=btntxt, command=x['callback'])

        # Initial channel selection
        if idx_phasecontrast is not None:
            self.channel_selection_widgets[idx_phasecontrast]['callback'](True, notify=False)
            self.channel_selection_widgets[idx_phasecontrast]['button'].pack(anchor=tk.N,
                    expand=True, fill=tk.X, padx=10, pady=5)
        elif idx_fluorescence:
            self.channel_selection_widgets[idx_fluorescence[0]]['callback'](True, notify=False)
            for i in idx_fluorescence:
                self.channel_selection_widgets[i]['button'].pack(anchor=tk.N,
                        expand=True, fill=tk.X, padx=10, pady=5)
        elif idx_segmentation is not None:
            self.channel_selection_widgets[idx_segmentation]['callback'](True, notify=False)
            self.channel_selection_widgets[idx_segmentation]['button'].pack(anchor=tk.N,
                    expand=True, fill=tk.X, padx=10, pady=5)

        # Display buttons
        if idx_phasecontrast is not None:
            self.channel_selection_widgets[idx_phasecontrast]['button'].pack(anchor=tk.N,
                    expand=True, fill=tk.X, padx=10, pady=5)
        for i in idx_fluorescence:
            self.channel_selection_widgets[i]['button'].pack(anchor=tk.N,
                    expand=True, fill=tk.X, padx=10, pady=5)
        if idx_segmentation is not None:
            self.channel_selection_widgets[idx_segmentation]['button'].pack(anchor=tk.N,
                    expand=True, fill=tk.X, padx=10, pady=5)

        self.display_stack.add_channel(fun=self.render_display, scales=True)
        self.stackviewer.set_stack(self.display_stack, wait=False)

    def _stacksize_changed(self, evt):
        self.stackviewer._change_stack_position(force=True)





class StackOpener:
    """Ask the user for stacks.

    Arguments:
        root - the parent tkinter.Tk object
        callback - call this function after finishing
    """
    # To test this class, run e.g.:
    # $ cd pyama
    # $ ipython
    # In [1]: %load_ext autoreload
    # In [2]: %autoreload 2
    # In [3]: from src.main_window import StackOpener
    # In [4]: import tkinter as tk
    # In [5]: root = tk.Tk(); StackOpener(root); root.mainloop()
    # Repeat In [5] for each test run

    def __init__(self, root, callback=None):
        self.root = root
        self.frame = tk.Toplevel(self.root)
        self.frame.title("Select stacks and channels")
        self.frame.geometry('600x300')
        self.frame.protocol('WM_DELETE_WINDOW', self.cancel)
        self.stacks = []
        self.channels = []
        self.callback = callback

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

        self.var_stack_list = tk.StringVar()
        self.stack_list = tk.Listbox(list_frame, selectmode=tk.SINGLE,
                listvariable=self.var_stack_list, highlightthickness=0, exportselection=False)
        self.stack_list.grid(row=0, column=0, sticky='NESW')
        self.stack_list.bind("<<ListboxSelect>>", self.stacklist_selection)
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
        paned.add(chan_frame, sticky='NESW', width=400)
        chan_frame.grid_rowconfigure(0, weight=1)
        chan_frame.grid_columnconfigure(0, weight=1)

        ## Channel display
        self.chan_disp_frame = tk.Frame(chan_frame)
        self.chan_disp_frame.grid(row=0, column=0, sticky='NESW')
        self.chan_disp_frame.grid_columnconfigure(1, weight=1, pad=5)
        self.chan_disp_frame.grid_columnconfigure(2, weight=0, pad=5)
        self.chan_disp_frame.grid_columnconfigure(3, weight=1, pad=5)

        tk.Label(self.chan_disp_frame, text="Channel", anchor=tk.W).grid(row=0, column=0, sticky='W')
        tk.Label(self.chan_disp_frame, text="Label", anchor=tk.W).grid(row=0, column=1, sticky='W')
        tk.Label(self.chan_disp_frame, text="Type", anchor=tk.W).grid(row=0, column=2, sticky='W')
        tk.Label(self.chan_disp_frame, text="Stack [Channel]", anchor=tk.W).grid(row=0, column=3, sticky='W')

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

        self.chan_opt = tk.OptionMenu(chan_add_frame, self.var_chan, 0, 1, 2, 3)
        self.chan_opt.grid(row=2, column=0, sticky='NESW')
        self.label_entry = tk.Entry(chan_add_frame, textvariable=self.var_label)
        self.label_entry.grid(row=2, column=1, sticky='NESW')
        self.type_opt = tk.OptionMenu(chan_add_frame, self.var_type,
            "None", ms.TYPE_PHASECONTRAST, ms.TYPE_FLUORESCENCE, ms.TYPE_SEGMENTATION)
        self.type_opt.grid(row=2, column=2, sticky='NESW')
        self.add_chan_btn = tk.Button(chan_add_frame, text="Add", command=self.add_chan)
        self.add_chan_btn.grid(row=2, column=3, sticky='EW')
        self.disable_channel_selection()

        # OK and Cancel buttons
        btn_frame = tk.Frame(self.frame)
        btn_frame.pack(expand=True, fill=tk.X)
        btn_frame.grid_columnconfigure(0, weight=1, pad=20)
        btn_frame.grid_columnconfigure(1, weight=1, pad=20)
        tk.Button(btn_frame, text="Cancel", width=10, command=self.cancel).grid(row=0, column=0)
        tk.Button(btn_frame, text="OK", width=10, command=self.finish).grid(row=0, column=1)


    def open_stack(self):
        """Open a new stack"""
        fn = tkfd.askopenfilename(title="Open stack", parent=self.root, initialdir='res', filetypes=(("TIFF", '*.tif *.tiff'), ("Numpy", '*.npy *.npz'), ("All files", '*')))
        if not fn:
            return
        stack = Stack(fn)
        stack_dir, stack_name = os.path.split(fn)
        n_channels = stack.n_channels
        self.stacks.append({'name': stack_name,
                            'dir': stack_dir,
                            'stack': stack,
                            'n_channels': n_channels,
                           })
        self.refresh_stacklist(select=tk.END)

    def remove_stack(self):
        """Remove a stack from the list"""
        sel = self.stack_list.curselection()
        if not sel:
            return
        try:
            sel = int(sel[-1])
            stack = self.stacks.pop(sel)
            self.del_chan(sel)
            stack['stack'].close()
        except Exception:
            return
        self.refresh_stacklist()

    def refresh_stacklist(self, select=None):
        """Refresh ListBox with loaded stacks.

        If `select` is a valid index, this item is selected.
        """
        self.var_stack_list.set(["{name} ({dir})".format(**s) for s in self.stacks])
        self.stack_list.selection_clear(0, tk.END)
        if select is not None:
            self.stack_list.selection_set(select)
        self.stacklist_selection()

    def stacklist_selection(self, event=None):
        sel = self.stack_list.curselection()
        try:
            sel = int(sel[-1])
            stack = self.stacks[sel]
            stack_name = stack['name']
            stack_n_chan = stack['n_channels']
            self.activate_channel_selection(stack)
        except Exception:
            sel = None
            stack_name = ""
            stack_n_chan = ""
            self.disable_channel_selection()
        self.var_stack.set(stack_name)
        self.var_n_chan.set(stack_n_chan)

    def activate_channel_selection(self, stack):
        self.chan_opt.config(state=tk.NORMAL)
        self.label_entry.config(state=tk.NORMAL)
        self.type_opt.config(state=tk.NORMAL)
        self.add_chan_btn.config(state=tk.NORMAL)

        self.chan_opt['menu'].delete(0, tk.END)
        for i in range(stack['n_channels']):
            self.chan_opt['menu'].add_command(label=i, command=tk._setit(self.var_chan, i))
        self.var_chan.set(0)
        self.var_label.set('')
        self.var_type.set("None")

    def disable_channel_selection(self):
        self.var_chan.set(())
        self.var_label.set('')
        self.var_type.set("None")
        self.chan_opt.config(state=tk.DISABLED)
        self.label_entry.config(state=tk.DISABLED)
        self.type_opt.config(state=tk.DISABLED)
        self.add_chan_btn.config(state=tk.DISABLED)

    def add_chan(self):
        try:
            i_stack = int(self.stack_list.curselection()[-1])
        except Exception:
            print("StackOpener.add_chan: cannot add channel")
            return
        self.channels.append({'stack': self.stacks[i_stack],
                              'i_channel': self.var_chan.get(),
                              'label': self.var_label.get(),
                              'type': self.var_type.get(),
                             })
        self.refresh_channels()
        
    def del_chan(self, i):
        """Remove a channel from the selection"""
        self.channels[i]['stack'] = None
        self.refresh_channels()

    def refresh_channels(self):
        """Redraw the channel selection"""
        i = 0
        idx_del = []
        for j, ch in enumerate(self.channels):
            # Remove widgets of channels marked for deletion
            if ch['stack'] is None:
                if 'widgets' in ch:
                    for w in ch['widgets'].values():
                        w.destroy()
                idx_del.append(j)
                continue

            # Check if channel is new
            wdg = None
            if 'widgets' not in ch:
                wdg = {}
                wdg['idx'] = tk.Label(self.chan_disp_frame, text=i,
                        anchor=tk.E, relief=tk.SUNKEN, bd=1)
                wdg['label'] = tk.Label(self.chan_disp_frame, text=ch['label'],
                        anchor=tk.W, relief=tk.SUNKEN, bd=1)
                wdg['type'] = tk.Label(self.chan_disp_frame, text=ch['type'],
                        anchor=tk.W, relief=tk.SUNKEN, bd=1)
                wdg['stack'] = tk.Label(self.chan_disp_frame,
                        text="{} [{}]".format(ch['stack']['name'], ch['i_channel']),
                        anchor=tk.W, relief=tk.SUNKEN, bd=1)
                wdg['button'] = tk.Button(self.chan_disp_frame, text="X")
                wdg['button'].config(command=lambda b=wdg['button']: self.del_chan(b.grid_info()['row']-1))
                ch['widgets'] = wdg

            # Check if previous widget has been deleted
            elif i != j:
                wdg = ch['widgets']
                wdg['idx'].grid_forget()
                wdg['label'].grid_forget()
                wdg['type'].grid_forget()
                wdg['stack'].grid_forget()
                wdg['button'].grid_forget()

            # Redraw widgets if necessary
            i += 1
            if wdg is not None:
                wdg['idx'].grid(row=i, column=0, sticky='NESW')
                wdg['label'].grid(row=i, column=1, sticky='NESW')
                wdg['type'].grid(row=i, column=2, sticky='NESW')
                wdg['stack'].grid(row=i, column=3, sticky='NESW')
                wdg['button'].grid(row=i, column=4, sticky='NESW')

        # Delete channels marked for deletion
        for i in sorted(idx_del, reverse=True):
            self.channels.pop(i)

    def cancel(self):
        """Close the window and call callback with `None`"""
        self.frame.destroy()
        for stack in self.stacks:
            try:
                stack['stack'].close()
            except Exception:
                print("StackOpener.cancel: Error while closing stack") #DEBUG
                pass
        if self.callback is not None:
            self.callback(None)

    def finish(self):
        """Close the window and call callback with channels"""
        ret = []
        self.frame.destroy()
        used_stacks = set()
        for ch in self.channels:
            x = {}
            x['stack'] = ch['stack']['stack']
            x['name'] = ch['stack']['name']
            x['dir'] = ch['stack']['dir']
            x['i_channel'] = ch['i_channel']
            x['label'] = ch['label']
            x['type'] = ch['type']
            ret.append(x)
            used_stacks.add(id(x['stack']))
        for stack in self.stacks:
            s = stack['stack']
            if id(s) not in used_stacks:
                try:
                    s.close()
                except Exception:
                    print("StackOpener.finish: Error while closing stack") #DEBUG
                    pass
        if self.callback is not None:
            self.callback(ret)


if __name__ == '__main__':
    Main_Tk(name="PyAMA", version="alpha")
