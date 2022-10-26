import ipywidgets as widgets
import matplotlib.pyplot as plt
#import mpl_interactions.ipyplot as iplt
from nd2reader import ND2Reader
import pandas as pd
from IPython.display import display
import sqlite3
import numpy as np
from skimage.segmentation import find_boundaries
try:    
    from cellpose import models
    from cellpose.io import logger_setup
except:
    print('Warning. Unable to load cellpose') 
import sys
sys.path.append('/home/m/Miguel.Atienza/celltracker')
from celltracker import functions
from celltracker import tracking
from tqdm import tqdm
from collections.abc import Iterable
import trackpy as tp
from skimage.segmentation import find_boundaries
import os
import json
from skimage.morphology import binary_erosion
from skimage.io import imread
from celltracker.classify import cp
import matplotlib.collections as collections

class StackViewer:
    
    def __init__(self, nd2file, manual=False):
        
               
        self.f = ND2Reader(nd2file)
        self.image = self.f.get_frame_2D()
        self.dtype= self.image.dtype
        self.h, self.w = self.image.shape
        self.pixelbits = 8*int(self.image.nbytes/(self.h*self.w))
  
        if not manual:
            self.nfov, self.nframes = self.f.sizes['v'], self.f.sizes['t']
        else:
            self.nfov, self.nframes = 288, 179
            self.f.sizes['v']=self.nfov
            self.f.sizes['t']=self.nframes
            self.f.metadata['fields_of_view']=list(range(self.nfov))
        
        #Widgets
        t_max = self.f.sizes['t']-1
        self.t = widgets.IntSlider(min=0,max=t_max, step=1, description="t", continuous_update=True)

        if 'c' in self.f.sizes:
            c_max = self.f.sizes['c']-1
        else:
            c_max=0
        self.c = widgets.IntSlider(min=0,max=c_max, step=1, description="c", continuous_update=True)

        v_max = self.f.sizes['v']-1
        self.v = widgets.IntSlider(min=0,max=v_max, step=1, description="v", continuous_update=False)
        
        clip_max=2**(self.pixelbits)*0.6
        
        self.clip = widgets.IntRangeSlider(min=0,max=int(2**16 -1), step=1, value=[0,clip_max], description="clip", continuous_update=True, width='200px')
        
        ##Initialize the figure
        plt.ioff()
        self.fig, self.ax = plt.subplots()
        self.fig.tight_layout()
        #self.fig.canvas.toolbar_visible = False
        self.fig.canvas.header_visible = False
        self.fig.canvas.footer_visible = True
        self.im = self.ax.imshow(self.image, cmap='gray', clim=self.clip.value)
                
        #Organize layout and display
        out = widgets.interactive_output(self.update, {'t': self.t, 'c': self.c, 'v': self.v, 'clip': self.clip})
        
        box = widgets.VBox([self.t, self.c, self.v, self.clip]) #, layout=widgets.Layout(width='400px'))
        box1 = widgets.VBox([out, box])
        grid = widgets.widgets.GridspecLayout(3, 3)
        
        grid[:, :2] = self.fig.canvas
        grid[1:,2] = box
        grid[0, 2] = out
        
        #display(self.fig.canvas)
        display(grid)
        plt.ion()
 
    def update(self, t, c, v, clip):

        vmin, vmax = clip
        image = self.f.get_frame_2D(v=v,c=c,t=t)
        self.image=image
        self.im.set_data(self.image)
        #lanes = g.get_frame_2D(v=v)
        self.im.set_clim([vmin, vmax])
        #self.fig.canvas.draw()


class LaneViewer:

    def __init__(self, nd2_file, df=None):

        self.v = 0
        f = ND2Reader(nd2_file)
        
        self.lanes = np.array([f.get_frame_2D(v=v) for v in range(f.sizes['v'])])
        axes = f.axes
        
        self.ld = widgets.IntSlider(min=10,max=60, step=1, description="lane_d", value=30, continuous_update=True)
        
        v_max = f.sizes['v']-1
        self.v = widgets.IntSlider(min=0,max=v_max, step=1, description="v", continuous_update=False)

        self.clip = widgets.IntRangeSlider(min=0,max=int(2**16 -1), step=1, description="clip", value=[0,5000], continuous_update=True, width='200px')
        
        self.kernel_width=5
        
        self.button = widgets.Button(
        description='Recompute',
        disabled=False,
        button_style='', # 'success', 'info', 'warning', 'danger' or ''
        tooltip='Click me',
        icon='check') # (FontAwesome names without the `fa-` prefix)
        
        self.button.on_click(self.recompute_v)
        
        fig = plt.figure()
        self.ax = fig.add_subplot(111)
        #plt.subplots()
        self.im = self.ax.imshow(self.lanes[0], cmap='gray', vmin=0, vmax=5000)
        
        self.min_coordinates = list(range(f.sizes['v']))
        self.max_coordinates = list(range(f.sizes['v']))

        self.recompute_v(self.v.value)
        #self.min_coordinates=[0,10]
        #self.max_coordinates=[0,20]
        self.ax.plot([], [], color='red')
        
        out = widgets.interactive_output(self.update, {'v': self.v, 'clip': self.clip})

        box = widgets.VBox([out, widgets.VBox([self.v, self.clip, self.ld, self.button],  layout=widgets.Layout(width='400px'))])

        display(box)

        
    def update(self, v, clip):
    
        vmin, vmax = self.clip.value
        image = self.lanes[self.v.value]
        self.im.set_data(image)
        self.im.set_clim([vmin, vmax])
        
        if isinstance(self.min_coordinates[v], Iterable):
           
            
            [self.ax.axes.lines[0].remove() for j in range(len(self.ax.axes.lines))]
            x = [0, image.shape[1]-1]
            for i in range(self.min_coordinates[v].shape[0]):
                self.ax.plot(x, [self.min_coordinates[v][i,1], sum(self.min_coordinates[v][i])], color='red')
            
            for i in range(self.max_coordinates[v].shape[0]):
                self.ax.plot(x, [self.max_coordinates[v][i,1], sum(self.max_coordinates[v][i])], color='red')
            
        
    def recompute(self):

        vmin, vmax = self.clip.value
        lanes_clipped = np.clip(self.lanes, vmin, vmax, dtype=self.lanes.dtype)
        

        self.min_coordinates = list(range(lanes_clipped.shape[0]))
        self.max_coordinates = list(range(lanes_clipped.shape[0]))

        for v in tqdm(range(lanes_clipped.shape[0])): 

            min_c, max_c = functions.get_lane_mask(lanes_clipped[v], kernel_width=self.kernel_width, line_distance=self.ld.value, debug=True)
            
            self.min_coordinates.append(min_c)
            self.max_coordinates.append(max_c)

        self.update(v, clip)

    def recompute_v(self, v):
        
        v = self.v.value
        vmin, vmax = self.clip.value
        #lanes_clipped = np.clip(self.lanes, vmin, vmax, dtype=self.lanes.dtype)
        lanes_clipped = np.clip((self.lanes-vmin)/(vmax-vmin), 0, 1, dtype='float32')
        print('recomputing')
        self.min_coordinates[v], self.max_coordinates[v] = functions.get_lane_mask(lanes_clipped[v], kernel_width=self.kernel_width, line_distance=self.ld.value, debug=True)
        print('updating')
        self.update(v, self.clip)


        
class TpViewer:
    
    def __init__(self, nd2file, manual=False):
        
        self.link_dfs = {}
        
        self.f = ND2Reader(nd2file)
        if not manual:
            self.nfov, self.nframes = self.f.sizes['v'], self.f.sizes['t']
        else:
            self.nfov, self.nframes = 288, 179
            self.f.sizes['v']=self.nfov
            self.f.sizes['t']=self.nframes
            self.f.metadata['fields_of_view']=list(range(self.nfov))
        
        #Widgets
        t_max = self.f.sizes['t']-1
        self.t = widgets.IntSlider(min=0,max=t_max, step=1, description="t", continuous_update=True)

        if 'c' in self.f.sizes:
            c_max = self.f.sizes['c']-1
        else:
            c_max=0
        self.c = widgets.IntSlider(min=0,max=c_max, step=1, description="c", continuous_update=True)

        v_max = self.f.sizes['v']-1
        self.v = widgets.IntSlider(min=0,max=v_max, step=1, description="v", continuous_update=False)
        
        self.clip = widgets.IntRangeSlider(min=0,max=int(2**16 -1), step=1, value=[0,1000], description="clip", continuous_update=True, width='200px')
        
        self.min_mass = widgets.FloatSlider(min=1e5, max=1e6, step=0.01e5, description="min_mass", value=2.65e5, continuous_update=True)
        
        self.diameter = widgets.IntSlider(min=9,max=31, step=2, description="diameter", value=15, continuous_update=True)
        
        self.min_frames = widgets.FloatSlider(min=0,max=50, step=1, value=10, description="min_frames", continuous_update=False)
        
        self.max_travel = widgets.IntSlider(min=3,max=50, step=1, value=5, description="max_travel", continuous_update=False)
        
        self.track_memory = widgets.IntSlider(min=0,max=20, step=1, value=5, description="max_travel", continuous_update=False)

        self.tp_method = widgets.Button(
        description='Track',
        disabled=False,
        button_style='', # 'success', 'info', 'warning', 'danger' or ''
        tooltip='Click me',
        icon='')
        
        self.tp_method.on_click(self.link_update)
        
        vmin, vmax = self.clip.value
        image = self.f.get_frame_2D(v=self.v.value,c=self.c.value,t=self.t.value)
        
        ##Initialize the figure
        plt.ioff()
        self.fig, self.ax = plt.subplots()
        self.fig.tight_layout()
        #self.fig.canvas.toolbar_visible = False
        self.fig.canvas.header_visible = False
        self.fig.canvas.footer_visible = True
        self.im = self.ax.imshow(image, cmap='gray')

        self.bscat = self.ax.scatter([0,0], [0,0], s=0.2*plt.rcParams['lines.markersize'] ** 2, color='blue', alpha=0.5)
        self.lscat = self.ax.scatter([0,0], [0,0], s=0.2*plt.rcParams['lines.markersize'] ** 2, color='red', alpha=0.5)
                
        #Organize layout and display
        out = widgets.interactive_output(self.update, {'t': self.t, 'c': self.c, 'v': self.v, 'clip': self.clip, 'min_mass': self.min_mass, 'diameter': self.diameter, 'min_frames': self.min_frames, 'max_travel': self.max_travel})
        
        box = widgets.VBox([self.t, self.c, self.v, self.clip, self.min_mass, self.diameter, self.min_frames, self.max_travel, self.tp_method]) #, layout=widgets.Layout(width='400px'))
        box1 = widgets.VBox([out, box])
        grid = widgets.widgets.GridspecLayout(3, 3)
        
        grid[:, :2] = self.fig.canvas
        grid[1:,2] = box
        grid[0, 2] = out
        
        #display(self.fig.canvas)
        display(grid)
        plt.ion()
 
    def update(self, t, c, v, clip, min_mass, diameter, min_frames, max_travel):

        vmin, vmax = clip
        image = self.f.get_frame_2D(v=v,c=c,t=t)
               
        self.im.set_data(image)
        #lanes = g.get_frame_2D(v=v)
        self.im.set_clim([vmin, vmax])
        #self.fig.canvas.draw()
        

        self.batch_update(v, t, min_mass, diameter)
        self.show_tracking(self.batch_df, self.bscat)

        if v in self.link_dfs.keys():
            df = self.link_dfs[v][self.link_df.frame==t]
            self.show_tracking(df, self.lscat)
        else:
            self.lscat.set_offsets([[0,0]]) 
    
    def show_tracking(self, df, scat):
        
        t, v= self.t.value, self.v.value
        
        #[plt.axes.lines[0].remove() for j in range(len(self.ax.axes.lines))]
        data = np.hstack((df.x.values[:,np.newaxis], df.y.values[:, np.newaxis]))
        scat.set_offsets(data)
    
    def batch_update(self, v, t, min_mass, diameter):
        nuclei = self.f.get_frame_2D(v=v, t=t, c=0)
        nuclei = functions.preprocess(nuclei, bottom_percentile=0.05, top_percentile=99.95, log=True, return_type='uint16')
        
        self.batch_df = tp.locate(nuclei, diameter=diameter, minmass=min_mass)
       
        
    def link_update(self, a):
        
        v, min_mass, max_travel, track_memory, diameter, min_frames = self.v.value, self.min_mass.value, self.max_travel.value, self.track_memory.value, self.diameter.value, self.min_frames.value
        if False:#(v in self.link_dfs.keys()):
            self.link_df = self.link_dfs[v]
        else:
            nuclei = np.array([self.f.get_frame_2D(v=v, t=t, c=0) for t in range(self.f.sizes['t'])])
            nuclei = functions.preprocess(nuclei, bottom_percentile=0.05, top_percentile=99.95, log=True, return_type='uint16')
            dft = tp.batch(nuclei, diameter=diameter, minmass=min_mass)
            dftp = tp.link(dft, max_travel, memory=track_memory)

            self.link_df = tp.filter_stubs(dftp, min_frames)
            self.link_dfs[v]=self.link_df
        
        self.update(self.t.value, self.c.value, self.v.value, self.clip.value, self.min_mass.value, self.diameter.value, self.min_frames.value, self.max_travel.value)
        

class CellposeViewer:
    
    def __init__(self, nd2file, manual=False):
        
        
        self.link_dfs = {}
        
        self.f = ND2Reader(nd2file)
        
        if not manual:
            self.nfov, self.nframes = self.f.sizes['v'], self.f.sizes['t']
        else:
            self.nfov, self.nframes = 288, 179
            self.f.sizes['v']=self.nfov
            self.f.sizes['t']=self.nframes
            self.f.metadata['fields_of_view']=list(range(self.nfov))
        
        channels = self.f.metadata['channels']

        if 'erry' in channels[0] or 'exas' in channels[0]:
            self.nucleus_channel=0
            self.cyto_channel=1
        elif 'erry' in channels[1] or 'exas' in channels[1]:
            self.nucleus_channel=1
            self.cyto_channel=0
        else:
            raise ValueError('The channels could not be automatically detected!')

        #Widgets
        
        t_max = self.f.sizes['t']-1
        self.t = widgets.IntSlider(min=0,max=t_max, step=1, description="t", continuous_update=False)

        v_max = self.f.sizes['v']-1
        self.v = widgets.IntSlider(min=0,max=v_max, step=1, description="v", continuous_update=False)
        
        self.nclip = widgets.FloatRangeSlider(min=0,max=2**16, step=1, value=[0,1000], description="clip nuclei", continuous_update=False, width='200px')
        
        self.cclip = widgets.FloatRangeSlider(min=0,max=2**16, step=1, value=[50,8000], description="clip cyto", continuous_update=False, width='200px')
        
        self.flow_threshold = widgets.FloatSlider(min=0, max=1.5, step=0.05, description="flow_threshold", value=1.25, continuous_update=False)
        
        self.diameter = widgets.IntSlider(min=15,max=100, step=2, description="diameter", value=29, continuous_update=False)
        
        self.mask_threshold = widgets.FloatSlider(min=-3,max=3, step=0.1, value=0, description="mask_threshold", continuous_update=False)
        
        self.max_travel = widgets.IntSlider(min=3,max=50, step=1, value=5, description="max_travel", continuous_update=False)
        
        self.track_memory = widgets.IntSlider(min=0,max=20, step=1, value=5, description="max_travel", continuous_update=False)

        self.tp_method = widgets.Button(
        description='Track',
        disabled=False,
        button_style='', # 'success', 'info', 'warning', 'danger' or ''
        tooltip='Click me',
        icon='')
        
        #self.tp_method.on_click(self.link_update)
        
        vmin, vmax = self.cclip.value
        cyto = (255*(np.clip(self.f.get_frame_2D(v=0,c=self.cyto_channel,t=0), vmin, vmax)/vmax)).astype('uint8')
        #cyto = np.clip(self.f.get_frame_2D(v=0,c=self.cyto_channel,t=0), vmin, vmax)
        #nucleus = self.f.get_frame_2D(v=0,c=self.nucleus_channel,t=0)
        #nucleus = functions.preprocess(nucleus, log=True, bottom_percentile=0.05, top_percentile=99.95, return_type='uint8')
        vmin, vmax = self.nclip.value
        nucleus = (255*(np.clip(self.f.get_frame_2D(v=0,c=self.nucleus_channel,t=0), vmin, vmax)/vmax)).astype('uint8')
        red = np.zeros_like(nucleus)
       
        image = np.stack((red, red, nucleus), axis=-1).astype('float32')
        image+=(cyto[:,:,np.newaxis]/3)
        image = np.clip(image, 0,255).astype('uint8')
        
        ##Initialize the figure
        plt.ioff()
        self.fig, self.ax = plt.subplots()
        self.fig.tight_layout()
        #self.fig.canvas.toolbar_visible = False
        self.fig.canvas.header_visible = False
        #self.fig.canvas.footer_visible = False
        self.im = self.ax.imshow(image)

        self.init_cellpose()
                
        #Organize layout and display
        out = widgets.interactive_output(self.update, {'t': self.t, 'v': self.v, 'cclip': self.cclip, 'nclip': self.nclip, 'flow_threshold': self.flow_threshold, 'diameter': self.diameter, 'mask_threshold': self.mask_threshold, 'max_travel': self.max_travel})
        
        box = widgets.VBox([self.t, self.v, self.cclip, self.nclip, self.flow_threshold, self.diameter, self.mask_threshold, self.tp_method]) #, layout=widgets.Layout(width='400px'))
        box1 = widgets.VBox([out, box])
        grid = widgets.widgets.GridspecLayout(3, 3)
        
        grid[:, :2] = self.fig.canvas
        grid[1:,2] = box
        grid[0, 2] = out
        
        #display(self.fig.canvas)
        display(grid)
        plt.ion()
    
    def init_cellpose(self, pretrained_model='mdamb231', model='cyto', gpu=True):
        
        if pretrained_model is None:
            self.model = models.Cellpose(gpu=gpu, model_type='cyto')

        else:
            path_to_models = os.path.join('/home/m/Miguel.Atienza/celltracker/celltracker/', 'models')
            with open(os.path.join(path_to_models, 'models.json'), 'r') as f:
                dic = json.load(f)

            if pretrained_model in dic.keys():
                path_to_model = os.path.join(path_to_models, dic[pretrained_model]['path'])
                if os.path.isfile(path_to_model):
                    pretrained_model = path_to_model
                else: 
                    url = dic[pretrained_model]['link']
                    print('Downloading model from Nextcloud...')
                    request.urlretrieve(url, os.path.join(path_to_models, path_to_model))
                    pretrained_model = os.path.join(path_to_models,dic[pretrained_model]['path'])

            self.model = models.CellposeModel(gpu=gpu, pretrained_model=pretrained_model)

    def update(self, t, v, cclip, nclip, flow_threshold, diameter, mask_threshold, max_travel):      
        
        
        #contours = get_outlines(image)
        self.segment(
        t, v, cclip, nclip, flow_threshold, mask_threshold, diameter)
        self.im.set_data(self.image)
        return
        #lanes = g.get_frame_2D(v=v)
        #self.im.set_clim([vmin, vmax])
        #self.fig.canvas.draw()
        

        self.batch_update(v, t, min_mass, diameter)
        self.show_tracking(self.batch_df, self.bscat)
        try:
            df = self.link_dfs[v][self.link_df.frame==t]
            self.show_tracking(df, self.lscat)
        except:
            self.lscat.set_offsets([]) 
    
    def show_tracking(self, df, scat):
        
        t, v= self.t.value, self.v.value
        
        #[plt.axes.lines[0].remove() for j in range(len(self.ax.axes.lines))]
        data = np.hstack((df.x.values[:,np.newaxis], df.y.values[:, np.newaxis]))
        scat.set_offsets(data)
    
    def segment(self,t, v, cclip, nclip, flow_threshold, mask_threshold, diameter, normalize=True, verbose=False,):
        
        #nucleus = self.f.get_frame_2D(v=v, t=t, c=self.nucleus_channel)
        #vmin, vmax = nclip
        #nucleus = functions.preprocess(nucleus, bottom_percentile=vmin, top_percentile=vmax, log=True, return_type='uint16')
        #vmin, vmax = cclip
        #cyto = self.f.get_frame_2D(v=v, t=t, c=self.cyto_channel)
        #cyto = functions.preprocess(cyto, bottom_percentile=vmin, top_percentile=vmax, return_type='uint16')
       
        nucleus = self.f.get_frame_2D(v=v, t=t, c=self.nucleus_channel)
        nucleus = functions.preprocess(nucleus, bottom_percentile=0, top_percentile=100, log=True, return_type='uint16')
        cyto = self.f.get_frame_2D(v=v, t=t, c=self.cyto_channel)
        
        image = np.stack((cyto, nucleus), axis=1)
        
        mask = self.model.eval(
            image, diameter=diameter, channels=[1,2], flow_threshold=flow_threshold, mask_threshold=mask_threshold, normalize=normalize, verbose=verbose)[0].astype('uint8')
        
        
        bin_mask = np.zeros(mask.shape, dtype='bool')
        cell_ids = np.unique(mask)
        cell_ids = cell_ids[cell_ids!=0]
        
        for cell_id in cell_ids:
            bin_mask+=binary_erosion(mask==cell_id)
        
        outlines = find_boundaries(bin_mask, mode='outer')
        try:
            print(f'{cell_ids.max()} Masks detected')
        except ValueError:
            print('No masks detected')
        self.outlines = outlines
        
        self.mask=mask
        self.image = self.get_8bit(outlines, cyto)
        
        return 
    
        self.image = np.stack((outlines, cyto.astype('uint8'), nucleus.astype('uint8')), axis=-1)
        self.outlines = outlines
        
    def get_8bit(self, outlines, cyto, nuclei=None):
               
        vmin, vmax = self.cclip.value
        cyto = np.clip(cyto, vmin, vmax)
        cyto = (255*(cyto-vmin)/(vmax-vmin)).astype('uint8')
        
        image = np.stack((cyto, cyto, cyto), axis=-1)
        
        image[(outlines>0)]=[255,0,0]
        
        #outlines[:,:,np.newaxis]>0
        
        return image
        

class ResultsViewer:
    
    def __init__(self, nd2file, outpath, db_path = '/project/ag-moonraedler/MAtienza/database/onedcellmigration.db', path_to_patterns=None, manual=False):
        
        self.link_dfs = {}
        self.cyto_locator=None
        self.path_to_patterns=path_to_patterns
        self.nd2file=nd2file
        self.f = ND2Reader(nd2file)

        if not manual:
            self.nfov, self.nframes = self.f.sizes['v'], self.f.sizes['t']
        else:
            self.nfov, self.nframes = 288, 179
            self.f.sizes['v']=self.nfov
            self.f.sizes['t']=self.nframes
            self.f.metadata['fields_of_view']=list(range(self.nfov))

        self.nfov, self.nframes = self.f.sizes['v'], self.f.sizes['t']
        
        self.outpath=outpath
        self.db_path=db_path
        
        t_max = self.f.sizes['t']-1
        self.t = widgets.IntSlider(min=0,max=t_max, step=1, description="t", continuous_update=True)

        if 'c' in self.f.sizes:
            c_max = self.f.sizes['c']-1
        else:
            c_max=0
        
        self.c = widgets.IntSlider(min=0,max=c_max, step=1, description="c", value=1, continuous_update=True)

        v_max = self.f.sizes['v']-1
        self.v = widgets.IntSlider(min=0,max=v_max, step=1, description="v", continuous_update=False)
        
        self.clip = widgets.IntRangeSlider(min=0,max=int(2**16 -1), step=1, value=[0,12000], description="clip", continuous_update=True, width='200px')
        
        self.view_nuclei = widgets.Checkbox(
        value=False,
        description='Nuclei',
        disabled=False,
        button_style='', # 'success', 'info', 'warning', 'danger' or ''
        tooltip='Click me',
        icon='')
        
        self.view_cellpose = widgets.Checkbox(
        value=False,
        description='Contours',
        disabled=False,
        button_style='', # 'success', 'info', 'warning', 'danger' or ''
        tooltip='Click me',
        icon='')
        
        vmin, vmax = self.clip.value
        cyto = self.f.get_frame_2D(v=self.v.value,c=self.c.value,t=self.t.value)
        cyto = np.clip(cyto, vmin, vmax).astype('float32')
        cyto = (255*(cyto-vmin)/(vmax-vmin)).astype('uint8')

        image = np.stack((cyto, cyto, cyto), axis=-1)
        self.image=image
        self.load_masks(outpath, self.v.value)
        self.load_df(self.db_path, self.v.value)
        self.oldv=0
        self.update_lanes()
        
        ##Initialize the figure
        plt.ioff()
        self.fig, self.ax = plt.subplots()
        self.fig.tight_layout()
        #self.fig.canvas.toolbar_visible = False
        self.fig.canvas.header_visible = False
        self.fig.canvas.footer_visible = True
        self.im = self.ax.imshow(image, cmap='gray')
        
        self.cid = self.fig.canvas.mpl_connect('button_press_event', self.onclick)

        self.bscat = self.ax.scatter([0,0], [0,0], s=0.4*plt.rcParams['lines.markersize'] ** 2, color='blue', alpha=0.5)
        self.lscat = self.ax.scatter([0,0], [0,0], s=0.2*plt.rcParams['lines.markersize'] ** 2, color='red', alpha=0.5)
        self.fig2, self.ax2 = plt.subplots()
        self.fig2.tight_layout()
        self.fig2.canvas.header_visible = False
        self.fig2.canvas.footer_visible = True
        
        self.cid2 = self.fig2.canvas.mpl_connect('button_press_event', self.onclick_plot)
        
        self.ax2.plot(np.arange(100), np.ones(100), color='blue')
        self.tmarker=self.ax2.axvline(self.t.value, color='black', lw=1)
        
        #Organize layout and display
        out = widgets.interactive_output(self.update, {'t': self.t, 'c': self.c, 'v': self.v, 'clip': self.clip, 'min_mass': self.min_mass, 'diameter': self.diameter, 'min_frames': self.min_frames, 'max_travel': self.max_travel})
        
        box = widgets.VBox([self.t, self.c, self.v, self.clip, self.min_mass, self.diameter, self.min_frames, self.max_travel, self.view_nuclei, self.view_cellpose]) #, layout=widgets.Layout(width='400px'))
        box1 = widgets.VBox([out, box])
        grid = widgets.widgets.GridspecLayout(10, 12)
        print('hiiiii')
        grid[:, :5] = self.fig.canvas
        grid[:,10:] = box
        #grid[0, 5] = out
        grid[:, 5:]= self.fig2.canvas
        #display(self.fig.canvas)
        display(grid)
        plt.ion()
        

    def update(self, t, c, v, clip, min_mass, diameter, min_frames, max_travel):

        #vmin, vmax = clip
        #image = self.f.get_frame_2D(v=v,c=c,t=t)
               
        #self.im.set_data(image)
        #lanes = g.get_frame_2D(v=v)
        #self.im.set_clim([vmin, vmax])
        #self.fig.canvas.draw()
        
        if v!=self.oldv:
            self.cyto_locator=None
            self.update_lanes()
        
        if self.view_nuclei.value:
            if v!=self.oldv:
                self.load_df(self.db_path, v)
            self.update_tracks()
            
            
        if self.view_cellpose.value:
            if v!=self.oldv:
                self.load_masks(self.outpath, v)
    
        self.update_image(t, v, clip)
        
        self.im.set_data(self.image)
        self.tmarker.set_xdata(t)
        
        self.oldv=v
        
    def update_tracks(self):
        
        t, v= self.t.value, self.v.value
        scat=self.bscat
        df = self.df[self.df.frame==self.t.value]
        
        data = np.hstack((df.x.values[:,np.newaxis], df.y.values[:, np.newaxis]))
        scat.set_offsets(data)
        
        scat=self.lscat
        df = self.clean_df[self.clean_df.frame==self.t.value]
        
        data = np.hstack((df.x.values[:,np.newaxis], df.y.values[:, np.newaxis]))
        scat.set_offsets(data)
        
        
        return
    
    def update_lanes(self):
        
        fov = self.v.value
        path_to_lane = os.path.join(self.outpath, f'XY{fov}/lanes/lanes_mask.tif')

        if not os.path.isfile(path_to_lane):
            print('No lanes available')
            self.lanes = self.image[:,:,0]*0
            return

        self.lanes = imread(path_to_lane)>0

        return  

    def update_image(self, t, v, clip):
        
        vmin, vmax = clip
        cyto = self.f.get_frame_2D(v=self.v.value,c=self.c.value,t=self.t.value)
        cyto = np.clip(cyto, vmin, vmax).astype('float32')
        cyto = (255*(cyto-vmin)/(vmax-vmin)).astype('uint8')

        image = np.stack((cyto, cyto, cyto), axis=-1)
        image[:,:,0]= np.clip((self.lanes*10).astype('uint16')+image[:,:,0].astype('uint16'), 0, 255).astype('uint8')
        
        if self.view_cellpose.value:       
        
            mask = self.masks[t]

            bin_mask = np.zeros(mask.shape, dtype='bool')
            cell_ids = np.unique(mask)
            cell_ids = cell_ids[cell_ids!=0]

            for cell_id in cell_ids:
                bin_mask+=binary_erosion(mask==cell_id)

            outlines = find_boundaries(bin_mask, mode='outer')
            try:
                print(f'{cell_ids.max()} Masks detected')
            except ValueError:
                print('No masks detected')

            self.outlines = outlines
            image[(outlines>0)]=[255,0,0]
            
            if (self.cyto_locator is not None):

                mask_id=self.cyto_locator[t]

                if mask_id!=0:
                    g_outline = find_boundaries(mask==mask_id)
                    image[g_outline]=[0,255,0]

        self.image=image

    def load_df(self, db_path, fov, from_db=False):
        
        if from_db:
            conn = sqlite3.connect(db_path)
            experiment_id=5

            query = f"""
            SELECT * from Raw_tracks
            where Lane_id in
            (SELECT Lane_id From Lanes where lanes.Experiment_id={experiment_id})
            and valid=1
            order by Lane_id"""

            #path_to_df = os.path.join(self.outpath, f'XY{fov}/tracking_data.csv')
            #self.df = pd.read_csv(path_to_df)
            #return

            #df = pd.read_sql(query, conn)
            self.experiment_df = pd.read_sql("""
            Select * from Experiments""", conn)

            self.lanes_df = pd.read_sql(
                f"""Select * from Lanes 
                Where (Experiment_id={experiment_id} and fov={fov})""",
                 conn)

            self.df = pd.read_sql(
                f"""Select * from Raw_tracks 
                Where Lane_id in \
                (Select Lane_id FROM Lanes WHERE
                (Experiment_id={experiment_id} and fov={fov}))""",
                 conn)

            self.metadata = self.experiment_df[self.experiment_df.Experiment_id==experiment_id]
            self.pixelperum = self.metadata['pixels/um'].values
            self.fpm = self.metadata['fpm'].values

            self.lane_ids = np.unique(self.df.Lane_id.values)
            self.lane_ids.sort()

            self.df['particle']=self.df.particle_id  
            self.df = tracking.get_single_cells(self.df)
            self.df = tracking.remove_close_cells(self.df)
            
            self.clean_df = tracking.get_clean_tracks(self.df)

            conn.close()
        
        elif not os.path.isfile(os.path.join(self.outpath, f'XY{fov}/cyto_masks.mp4')):

            print('No data available for this fov')
        else:

            self.df = pd.read_csv(f'{self.outpath}/XY{fov}/tracking_data.csv')
            self.df['particle_id']=self.df.particle

            if self.masks_available:
            
                self.df = tracking.get_single_cells(self.df)
                self.df = tracking.remove_close_cells(self.df)
                
                self.clean_df = tracking.get_clean_tracks(self.df)
                #self.clean_df = pd.read_csv('/project/ag-moonraedler/MAtienza/UNikon_gradients_27_05_22/extraction/XY0/clean_tracking_data.csv')
            else:
                self.clean_df = self.df

    def load_masks(self, outpath, fov):
        
        path_to_mask = os.path.join(outpath, f'XY{fov}/cyto_masks.mp4')
        
        if os.path.isfile(path_to_mask):
            self.masks = functions.mp4_to_np(path_to_mask)
            self.masks_available=True
        else:
            print('No masks available')
            self.masks_available=False
        return      
        
    def onclick(self, event):
        
        ix, iy = event.xdata, event.ydata

        self.coords = (ix, iy)
        
        mask_id = self.masks[self.t.value, np.round(iy).astype(int), np.round(ix).astype(int)]
        
        if mask_id==0:
            #No mask was clicked on
            return
        
        self.particle_id = self.df.loc[(self.df.frame==self.t.value) & (self.df.cyto_locator==mask_id)].particle_id.values[0]
        
        self.dfp=self.df[self.df.particle_id==self.particle_id]
        my_bool = ~((self.dfp.valid==1) & (self.dfp.too_close==0) & (self.dfp.single_nucleus==1) & (self.dfp.front!=0)).values
        #self.dfp = self.dfp[my_bool]

        self.ax2.clear()
        self.ax2.plot(self.dfp.frame, self.dfp.nucleus, color='blue')
        self.ax2.plot(self.dfp.frame, self.dfp.front, color='red')
        self.ax2.plot(self.dfp.frame, self.dfp.rear, color='red')
        
        tres = 30
        def t_to_frame(t):
            return t/(tres/60)
        def frame_to_t(frame):
            return frame*tres/60

        tax = self.ax2.secondary_xaxis('top', functions=(frame_to_t, t_to_frame))
        tax.set_xlabel('Time in minutes')
        self.tmarker=self.ax2.axvline(self.t.value, color='black', lw=1)


        #self.ax2.fill_between(my_bool, 0,1, where=my_bool, transform=self.ax2.get_xaxis_transform(), color='gray')
        #print('hi')
        my_bool = ~((self.dfp.valid==1) & (self.dfp.too_close==0) & (self.dfp.single_nucleus==1) & (self.dfp.front!=0)).values

        collection = collections.BrokenBarHCollection.span_where(
            self.dfp.frame.values, ymin=self.dfp.rear.min(), ymax=self.dfp.front.max(), where=my_bool, facecolor='gray', alpha=0.5)

        self.ax2.add_collection(collection)

        self.dfp, cp_indices, valid_boundaries, segments = cp.classify_movement(self.dfp)

        MO_bool =self.dfp.state=='MO'
        MS_bool =self.dfp.state=='MS'
        SO_bool =self.dfp.state=='SO'
        SS_bool =self.dfp.state=='SS'
        
        #self.ax2.plot(self.dfp.frame, S_bool.values*150, color='green')

        x_collection = self.dfp.frame.values

        print('hi')
        MO_collection = collections.BrokenBarHCollection.span_where(
                    x_collection, ymin=self.dfp.rear.min(), ymax=self.dfp.front.max(), where=MO_bool, facecolor=[1,0,1], alpha=0.2)

        MS_collection = collections.BrokenBarHCollection.span_where(
                    x_collection, ymin=self.dfp.rear.min(), ymax=self.dfp.front.max(), where=MS_bool, facecolor=[1,0,0], alpha=0.2)

        SO_collection = collections.BrokenBarHCollection.span_where(
                    x_collection, ymin=self.dfp.rear.min(), ymax=self.dfp.front.max(), where=SO_bool, facecolor=[0,0,1], alpha=0.2)

        SS_collection = collections.BrokenBarHCollection.span_where(
                    x_collection, ymin=self.dfp.rear.min(), ymax=self.dfp.front.max(), where=SS_bool, facecolor=[0,1,0], alpha=0.2)

        self.ax2.add_collection(MO_collection)
        self.ax2.add_collection(MS_collection) 
        self.ax2.add_collection(SO_collection)
        self.ax2.add_collection(SS_collection)  

        t_ = self.dfp.frame.values
        cps = t_[np.clip(cp_indices.astype(int), 0, t_.size-1)]
        for cp_index in cps:
            self.ax2.axvline(cp_index, color='red')
            
        for boundary in t_[np.clip(np.array(segments).flatten().astype(int), 0, t_.size-1)]:
            self.ax2.axvline(boundary, color='green')

        self.cyto_locator = np.zeros(self.masks.shape[0], dtype='uint8')
        
        self.cyto_locator[self.dfp.frame]=self.masks[self.dfp.frame, np.round(self.dfp.y).astype(int), np.round(self.dfp.x).astype(int)]
        
        self.update_image(self.t.value, self.v.value, self.clip.value)
        
        self.im.set_data(self.image)
        return
    
    def onclick_plot(self, event):
    
        t = event.xdata
        self.t.value=t
        print('updating')
        self.update(self.t.value, self.c.value, self.v.value, self.clip.value, self.min_mass.value, self.diameter.value, self.min_frames.value, self.max_travel.value)
        
        return