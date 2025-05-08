from genericpath import isfile
from skimage import io
import sys
from tifffile import TiffFile, imread
from tqdm import tqdm
sys.path.append('..')
from . import functions
from .segmentation import Segmentation
#from celltracker.omero import Omero
import numpy as np
import os
import pandas as pd
import skvideo.io
import json
from nd2reader import ND2Reader
from .segmentation import Segmentation
from .video_writer import Mp4writer
from lisca import tracking
from .img_op.background_correction import background_schwarzfischer


class Track:
    
    def __init__(self, path_out, data_path, bf_channel, fl_channels, fov, bf_file=None, nucleus_file=None, nd2_file=None, lanes_file=None, frame_indices=None, max_memory=None, dataset_id=None, image_id=None, ome_host='omero.physik.uni-muenchen.de', ome_user_name=None, ome_password=None, manual=False):
        """
        A class to run full tracking part of the pipeline on one field of view. The class should contain the methods for the bf segmentation, nucleus tracking, and the rearranging of the nuclei with the bf contours. The final output should be a set of 3darrays (frame_number, nuclear_position, front, rear) each for one particle.

        Parameters
        ----------
        data_path : string
            Path were data is read. Regular path file or dataset id if from omero
        bf_file : string
            File containing bf image. Either tif, nd2 or omero image id.
        nucleus_file : string
            File containing nucleus image.  Either tif, nd2 or omero image id.
        path_out : TYPE
            Path to write all generated data.
        image_indices : list, optional
            Indices of image to be  read  as list [first  index, last index]. The default is None.
        max_memory : TYPE, optional
            The maximum memory that should be used during computations. At the moment just uses the  maximum stack. The default is None.
        nd2_file : string, optional
            ND2file
        fov : int, field of view to read from nd2 file.
            

        Returns
        -------
        None.

        """
        self.data_path = data_path
        self.path_out = path_out
        self.metadata = {}
        self.df_path = os.path.join(self.path_out, 'tracking_data.csv')
        self.clean_df_path = os.path.join(self.path_out, 'clean_tracking_data.csv')
        self.meta_path = os.path.join(self.path_out, 'metadata.json')
        self.max_memory=max_memory
        self.frame_indices = frame_indices
        self.dataset_id = dataset_id
        self.image_id = image_id
        self.nd2_file = nd2_file
        self.fov = fov
        self.manual=manual
        self.bf_channel=bf_channel
        self.fl_channels=[*fl_channels]

        if dataset_id is not None:

            self.omero=True
            # #Assume this is an omero image id
            # self.dataset_id = dataset_id
            # self.image_id = image_id
            # self.conn = Omero(ome_host , ome_user_name)
            # shape = self.conn.get_image_shape(image_id)
            # self.height, self.width = shape[1:3]

            # if self.frame_indices is not None:
            #     self.n_images = len(frame_indices)
            # else: 
            #     self.n_images = shape[0]
            #     self.frame_indices = np.arange(shape[0])
        

        elif nd2_file is not None:

            self.omero=False
            #Read from full nd2 file
            f = ND2Reader(os.path.join(data_path, nd2_file))
            if manual:
                self.nfov, self.nframes = 288, 179
                f.sizes['v']=self.nfov
                f.sizes['t']=self.nframes
                self.n_images=self.nframes
                f.metadata['fields_of_view']=list(range(self.nfov))
            else:
                self.nfov = f.sizes['v']
                self.n_images = f.sizes['t']
            
            self.height, self.width = f.sizes['y'], f.sizes['x']
            self.frame_indices = np.arange(0, self.n_images)
            self.channel_labels = f.metadata['channels']
            

        elif bf_file.endswith('.mp4'):

            self.omero=False

            video = skvideo.io.FFmpegReader(os.path.join(data_path, bf_file))

            self.n_images, self.height, self.width = video.getShape()[:3]

        elif bf_file.endswith('.tif'):

            self.omero=False

            tif = TiffFile(os.path.join(data_path, bf_file))
            self.height, self.width = tif.pages[0].shape
            if frame_indices is None:
                self.n_images = len(tif.pages)
                self.height, self.width = tif.pages[0].shape
                self.frame_indices = np.arange(0, self.n_images)
            else:
                self.n_images = len(frame_indices)
                self.height, self.width = tif.pages[0].shape
                self.frame_indices=frame_indices

        if max_memory is None:
            self.max_stack = self.n_images
        self.max_stack = max_memory

 
    
    def read_image(self, c, frames=None):

        manual=self.manual

        if self.omero:

            if channel==0 or channel=='bf' or channel=='bf':
                channel=1
                return self.conn.get_np(self.image_id, frames, channel)
            elif channel==1 or channel=='nucleus':
                channel=0
                return self.conn.get_np(self.image_id, frames, channel)

        if self.nd2_file is not None:

            return functions.read_nd2(os.path.join(self.data_path, self.nd2_file), self.fov, frames, c=c, manual=self.manual)
            

        if self.bf_file.endswith('.mp4'):

            if channel==0 or channel=='bf' or channel=='bf':
                return functions.mp4_to_np(os.path.join(self.data_path, self.bf_file), frames=frames)
            elif channel==1 or channel=='nucleus':
                return functions.mp4_to_np(os.path.join(self.data_path, self.nucleus_file), frames=frames)
        
        if self.nucleus_file.endswith('.tif'):

            if channel==0 or channel=='bf' or channel=='bf':
                    return imread(os.path.join(self.data_path, self.bf_file), key=frames)
            if channel==1 or channel=='nucleus':
                    return imread(os.path.join(self.data_path, self.nucleus_file), key=frames)

    def segment(self, pretrained_model=None, flow_threshold=0.8, mask_threshold=-2, gpu=True, model_type='bf', diameter=29, verbose=False, method='th'):

        
        self.metadata.update(locals())
        self.metadata.pop('self')
        with open(self.meta_path, "w") as outfile:
            json.dump(dict(self.metadata), outfile)
        
        
        
        if method=='th':
            return self.th_segment()

        file=os.path.join(self.path_out, 'cyto_masks.mp4')
        if os.path.isfile(file):
            os.remove(file)

        writer = Mp4writer(file)
        
        segmenter = Segmentation(gpu=gpu, pretrained_model=pretrained_model, model_type=model_type, diameter=diameter, flow_threshold=flow_threshold, mask_threshold=mask_threshold)

        print('Running segmentation with cellpose...')
        for frame in tqdm(range(self.n_images)):
            
            image = self.read_image(self.bf_channel, frame)
            mask = segmenter.segment_image(image, diameter=diameter, flow_threshold=flow_threshold, mask_threshold=mask_threshold)
            writer.write_frame(mask)
        
        writer.close()

        return
    
    def th_segment(self):

        from .img_op import background_correction, coarse_binarize_phc
        from skimage.measure import label

        file = os.path.join(self.path_out, 'cyto_masks_th.mp4')
        
        if os.path.isfile(file):
            os.remove(file)

        writer = Mp4writer(os.path.join(self.path_out, 'cyto_masks_th.mp4'))
        
        print('Running segmentation with thresholding...')
        for frame in tqdm(range(self.n_images)):
            
            image = self.read_image(self.bf_channel, frame)
            mask = coarse_binarize_phc.binarize_frame(image)
            if mask.max()>255:
                print('overflow in threshold segmentation')
            mask = np.clip(label(mask, connectivity=1), a_max=255, a_min=0).astype('uint8')
            #print(np.unique(mask))
            #import matplotlib.pyplot as plt
            #plt.imshow(mask)
            #plt.show()
            #sys.exit()
            writer.write_frame(mask)
        
        writer.close()

        return

    def track(self, track_memory=15, max_travel=30, min_frames=10, pixel_to_um=1, verbose=False, method='th'):

        ##Calculate centroids of each mask, then save dataframe with particle_id, positions with trackpy. Then link and obtain tracks. Then calculate fluorescence
        
        if method=='th':
            file=os.path.join(self.path_out, 'cyto_masks_th.mp4')
        else:
            file=os.path.join(self.path_out, 'cyto_masks.mp4')
    
        masks = skvideo.io.vread(file, as_grey=False)[:,:,:,0].copy()

        df = tracking.track(masks, track_memory=track_memory, max_travel=max_travel, min_frames=min_frames, pixel_to_um=1, verbose=False)
        df.to_csv(self.df_path)
        #df = pd.read_csv(self.df_path)
    
        for fl_channel in self.fl_channels:
            label= self.channel_labels[fl_channel]
            fl_image = self.read_image(c=fl_channel, frames=np.arange(self.n_images))
            print(f'Reading channel {label}..')
            df = tracking.read_fluorescence(df, fl_image, masks, label)
            
            del fl_image

        df.to_csv(self.df_path)

        return
    
    
    def save_to_pyama(self, fl_channel, method='th'):

        from tifffile import imwrite
        
        if method=='th':
            file=os.path.join(self.path_out, 'cyto_masks_th.mp4')
        else:
            file=os.path.join(self.path_out, 'cyto_masks_th.mp4')

        segmentation = (functions.mp4_to_np(file)>0).astype('uint8')
        fl_image = self.read_image(c=fl_channel, frames=self.frame_indices)
        bf = self.read_image(c=self.bf_channel, frames=self.frame_indices)

        bg = background_schwarzfischer(fl_image, segmentation>0, mem_lim=1e9, memmap_dir=os.path.join(self.path_out, 'tmp'))
        del fl_image

        ##Save background corrected image
        n_frames, height, width = bg.shape
        tiff_shape = (n_frames, 1, 1, height, width, 1)
        outfile = os.path.join(self.path_out, f'XY{self.fov}-bg_corr.tif')
        imwrite(outfile, bg.reshape(tiff_shape), shape=tiff_shape, imagej=True)
        
        ##Save bright field channel tif
        n_frames, height, width = bf.shape
        tiff_shape = (n_frames, 1, 1, height, width, 1)
        outfile = os.path.join(self.path_out, f'XY{self.fov}-bf.tif')
        imwrite(outfile, bf.reshape(tiff_shape), shape=tiff_shape, imagej=True)
        
        ##Save segmentation
        np.savez_compressed(os.path.join(self.path_out, f'XY{self.fov}-bgcorr_segmented.npz'), segmentation)

        # if os.path.isdir(os.path.join(self.path_out, 'tmp')):
        #     os.rmdir(os.path.join(self.path_out, 'tmp'))
        
        return

