"""Jupyter notebook viewer stacks viewer"""

import ipywidgets as widgets
import matplotlib.pyplot as plt
from lisca.segmentation import Segmentation
import numpy as np
from nd2reader import ND2Reader
import pandas as pd
from IPython.display import display
import os
from lisca import functions
import sqlite3
from skimage.morphology import binary_erosion
from skimage.segmentation import find_boundaries

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
               
        self.im.set_data(image)
        #lanes = g.get_frame_2D(v=v)
        self.im.set_clim([vmin, vmax])
        #self.fig.canvas.draw()


class CellposeViewer:
    
    def __init__(self, nd2file, channel, manual=False):
        
        self.f = ND2Reader(nd2file)
        
        if not manual:
            self.nfov, self.nframes = self.f.sizes['v'], self.f.sizes['t']
        else:
            self.nfov, self.nframes = 288, 179
            self.f.sizes['v']=self.nfov
            self.f.sizes['t']=self.nframes
            self.f.metadata['fields_of_view']=list(range(self.nfov))
        
        self.channel=channel
        #Widgets
        
        t_max = self.f.sizes['t']-1
        self.t = widgets.IntSlider(min=0,max=t_max, step=1, description="t", continuous_update=False)

        v_max = self.f.sizes['v']-1
        self.v = widgets.IntSlider(min=0,max=v_max, step=1, description="v", continuous_update=False)
        
        self.cclip = widgets.FloatRangeSlider(min=0,max=2**16, step=1, value=[50,8000], description="clip cyto", continuous_update=False, width='200px')
        
        self.flow_threshold = widgets.FloatSlider(min=0, max=1.5, step=0.05, description="flow_threshold", value=1.25, continuous_update=False)
        
        self.diameter = widgets.IntSlider(min=15,max=100, step=2, description="diameter", value=29, continuous_update=False)
        
        self.mask_threshold = widgets.FloatSlider(min=-3,max=3, step=0.1, value=0, description="mask_threshold", continuous_update=False)
        
    
        image = self.f.get_frame_2D(v=0,c=self.channel,t=0)
        
        ##Initialize the figure
        plt.ioff()
        self.fig, self.ax = plt.subplots()
        self.fig.tight_layout()
        #self.fig.canvas.toolbar_visible = False
        self.fig.canvas.header_visible = False
        #self.fig.canvas.footer_visible = False
        self.im = self.ax.imshow(image, clim=self.cclip.value)

        self.segmenter = Segmentation(pretrained_model='mdamb231')
        #self.segmenter = Segmentation(pretrained_model=None)
        self.mask = self.segmenter.segment_image(image, self.diameter.value, self.flow_threshold.value, self.mask_threshold.value)

        self.flow_threshold_value = self.flow_threshold.value
        self.diameter_value = self.diameter.value
        self.mask_threshold_value = self.mask_threshold.value
        self.t_value=0

        #Organize layout and display
        out = widgets.interactive_output(self.update, {'t': self.t, 'v': self.v, 'cclip': self.cclip, 'flow_threshold': self.flow_threshold, 'diameter': self.diameter, 'mask_threshold': self.mask_threshold})
        
        box = widgets.VBox([self.t, self.v, self.cclip, self.flow_threshold, self.diameter, self.mask_threshold]) #, layout=widgets.Layout(width='400px'))
        box1 = widgets.VBox([out, box])
        grid = widgets.widgets.GridspecLayout(3, 3)
        
        grid[:, :2] = self.fig.canvas
        grid[1:,2] = box
        grid[0, 2] = out
        
        #display(self.fig.canvas)
        display(grid)
        plt.ion()
    

    def update(self, t, v, cclip, flow_threshold, diameter, mask_threshold):      
        
        bf = self.f.get_frame_2D(v=v, t=t, c=self.channel)

        recompute = (flow_threshold!=self.flow_threshold_value) or (
        diameter!=self.diameter_value) or (
        mask_threshold!= self.mask_threshold_value) or(
        t!=self.t_value)

        if recompute:
            print('recomputing')
            self.mask = self.segmenter.segment_image(bf, diameter, flow_threshold, mask_threshold)
            
        image = self.get_contours_image(bf, self.mask, cclip)

        self.im.set_data(image)

        self.flow_threshold_value = flow_threshold
        self.diameter_value = diameter
        self.mask_threshold_value = mask_threshold
        self.t_value=t

        return
   
        
    def get_contours_image(self, bf, mask, clip):
        
        vmin, vmax = clip

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
        
        
        bf = np.clip(bf, vmin, vmax)
        bf = (255*(bf-vmin)/(vmax-vmin)).astype('uint8')
        
        image = np.stack((bf, bf, bf), axis=-1)
        
        image[(outlines>0)]=[255,0,0]
        
        return image


class ResultsViewer:
    
    def __init__(self, nd2file, outpath, db_path = '/project/ag-moonraedler/MAtienza/database/onedcellmigration.db', manual=False, method='th'):
        
        self.link_dfs = {}
        self.cyto_locator=None
        self.nd2file=nd2file
        self.f = ND2Reader(nd2file)
        self.method='th'
        if method=='th':
            self.masks_file = 'cyto_masks_th.mp4'
        else:
            self.masks_file = 'cyto_masks.mp4'

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
        
        self.c = widgets.IntSlider(min=0,max=c_max, step=1, description="c", value=0, continuous_update=True)

        v_max = self.f.sizes['v']-1
        self.v = widgets.IntSlider(min=0,max=v_max, step=1, description="v", continuous_update=False)
        
        self.clip = widgets.IntRangeSlider(min=0,max=int(2**16 -1), step=1, value=[0,50000], description="clip", continuous_update=True, width='200px')
        
        self.view_nuclei = widgets.Checkbox(
        value=True,
        description='Nuclei',
        disabled=False,
        button_style='', # 'success', 'info', 'warning', 'danger' or ''
        tooltip='Click me',
        icon='')
        
        self.view_cellpose = widgets.Checkbox(
        value=True,
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
        self.ax2.set_xlabel('Frame')
        
        self.cid2 = self.fig2.canvas.mpl_connect('button_press_event', self.onclick_plot)
        
        self.ax2.plot(np.arange(100), np.ones(100), color='blue')
        self.tmarker=self.ax2.axvline(self.t.value, color='black', lw=1)
        
        #Organize layout and display
        out = widgets.interactive_output(self.update, {'t': self.t, 'c': self.c, 'v': self.v, 'clip': self.clip})
        
        box = widgets.VBox([self.t, self.c, self.v, self.clip, self.view_nuclei, self.view_cellpose], layout=widgets.Layout(width='400px'))
        box1 = widgets.VBox([out, box])
        grid = widgets.widgets.GridspecLayout(16, 12)
        
        grid[:, :5] = self.fig.canvas
        grid[:,10:] = box
        #grid[0, 5] = out
        grid[:, 5:10]= self.fig2.canvas
        #display(self.fig.canvas)
        display(grid)
        plt.ion()
        

    def update(self, t, c, v, clip):

        #vmin, vmax = clip
        #image = self.f.get_frame_2D(v=v,c=c,t=t)
               
        #self.im.set_data(image)
        #lanes = g.get_frame_2D(v=v)
        #self.im.set_clim([vmin, vmax])
        #self.fig.canvas.draw()
        
        if v!=self.oldv:
            self.cyto_locator=None
        
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
    
    def update_image(self, t, v, clip):
        
        vmin, vmax = clip
        cyto = self.f.get_frame_2D(v=self.v.value,c=self.c.value,t=self.t.value)
        cyto = np.clip(cyto, vmin, vmax).astype('float32')
        cyto = (255*(cyto-vmin)/(vmax-vmin)).astype('uint8')

        image = np.stack((cyto, cyto, cyto), axis=-1)
        
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
  
            self.df = tracking.get_single_cells(self.df)
            self.df = tracking.remove_close_cells(self.df)
            
            self.clean_df = tracking.get_clean_tracks(self.df)

            conn.close()
        
        elif not os.path.isfile(os.path.join(self.outpath, f'XY{fov}/{self.masks_file}')):

            print('No data available for this fov')
        
        else:

            self.df = pd.read_csv(f'{self.outpath}/XY{fov}/tracking_data.csv')

            if self.masks_available:
                
                self.clean_df = self.df
                #self.clean_df = pd.read_csv('/project/ag-moonraedler/MAtienza/UNikon_gradients_27_05_22/extraction/XY0/clean_tracking_data.csv')
            else:
                self.clean_df = self.df

    def load_masks(self, outpath, fov):
        
        path_to_mask = os.path.join(outpath, f'XY{fov}/{self.masks_file}')
        print(path_to_mask)
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
        particle_id = self.df.loc[(self.df.frame==self.t.value) & (self.df.cyto_locator==mask_id)].particle.values
        
        if len(particle_id)>0:
            self.particle_id = particle_id[0]
        else:
            print('No mask here')
            return
        
        self.dfp=self.df[self.df.particle==self.particle_id]
        fl_channels = self.dfp.columns[np.argwhere(self.dfp.columns=='particle')[0,0]+1:]

        self.ax2.clear()
        for fl_channel in fl_channels:
            fluorescence = self.dfp[fl_channel]
            self.ax2.plot(self.dfp.frame, fluorescence, label=fl_channel)
        self.ax2.legend()
        self.ax2.set_title(self.f.metadata['channels'][self.c.value])
        self.ax2.set_xlabel('Frame')
        #self.ax2.plot(self.dfp.frame, self.dfp.front, color='red')
        #self.ax2.plot(self.dfp.frame, self.dfp.rear, color='red')
        
        tres = 30
        def t_to_frame(t):
            return t/(tres/60)
        def frame_to_t(frame):
            return frame*tres/60

        tax = self.ax2.secondary_xaxis('top', functions=(frame_to_t, t_to_frame))
        tax.set_xlabel('Time in minutes')
        self.tmarker=self.ax2.axvline(self.t.value, color='black', lw=1)

        self.cyto_locator = np.zeros(self.masks.shape[0], dtype='uint8')
        
        self.cyto_locator[self.dfp.frame]=self.masks[self.dfp.frame, np.round(self.dfp.y).astype(int), np.round(self.dfp.x).astype(int)]
        
        self.update_image(self.t.value, self.v.value, self.clip.value)
        
        self.im.set_data(self.image)
        return
    
    def onclick_plot(self, event):
    
        t = event.xdata
        self.t.value=t
        print('updating')
        self.update(self.t.value, self.c.value, self.v.value, self.clip.value)
        
        return
    