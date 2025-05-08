##File for tracking on lisca

import numpy as np
import sys
import trackpy as tp
from tqdm import tqdm
#from skimage.segmentation import find_boundaries
import pandas as pd


def get_centroids(masks):

    nframes = masks.shape[0]
    ids=np.unique(masks)
    ids = ids[ids!=0]
    
    dfs = []  # List to collect DataFrames
    print('Computing centroids')
    for frame in tqdm(range(nframes)):
        for identifier in ids:
            mask = masks[frame]
            count = np.sum(mask==identifier)
            if count==0:
                continue
            points =  np.argwhere(mask==identifier)
            y = points[:,0].sum()/count
            x = points[:, 1].sum()/count
            
            data = {
            'frame':[frame],
            'x':[x], 'y':[y], 'cyto_locator': identifier,
            'area': count}

            new_df = pd.DataFrame.from_dict(data)
            dfs.append(new_df)

    # Concatenate all DataFrames at once
    df = pd.concat(dfs, ignore_index=True) if dfs else pd.DataFrame(columns=['frame', 'x', 'y', 'cyto_locator', 'area'])
    return df

def track(masks, track_memory=15, max_travel=5, min_frames=10, pixel_to_um=1, verbose=False):

    """
    Parameters

    ----------

    track_memory : TYPE, optional

        Maximum number of time frames where nucleus position is interpolated if it is not detected. The default is 15.

    max_travel : TYPE, optional

        Maximum . The default is 5.

    min_frames : TYPE, optional

        DESCRIPTION. The default is 10.


    Returns

    -------

    t : TYPE

        DESCRIPTION.
    """

    max_travel = np.round(max_travel) #Maximum distance between nuclei in subsequent frames

    if not verbose:
        tp.quiet()

    if verbose:
        print('Getting centroids...')

    f = get_centroids(masks)
    print('Tracking')
    if verbose:
        print('Tracking')
    t = tp.link(f, max_travel, memory=track_memory)

    t = tp.filter_stubs(t, min_frames)

    if verbose:
        print('Tracking of nuclei completed.')

    return t

def read_fluorescence(df, fl_image, masks, label):

    ids=np.unique(df.particle)
    df[label]=np.zeros(len(df))
    
    for identifier in tqdm(ids):
        dfp = df[df.particle==identifier]
        frames = dfp.frame.values
        cyto_locator = dfp.cyto_locator.values
        bin_masks=masks[frames]==cyto_locator[:,np.newaxis, np.newaxis]
        fluorescence = (fl_image[frames]*bin_masks).sum(axis=(1,2))
        #print(fluorescence.shape, len(df.loc[(df.particle==identifier), label]))
        df.loc[(df.particle==identifier), label]=fluorescence
        
    return df

    

