import scipy.ndimage as smg
import numpy as np
import numba as nb

@nb.njit
def window_std(i):
    return np.sum((i - np.mean(i))**2)

def binarize_frame(img, mask_size=3):
    """Coarse segmentation of phase-contrast image frame

    Returns binarized image of frame
    """
    # Get logarithmic standard deviation at each pixel
    std_log = smg.generic_filter(img, window_std, size=mask_size, mode='reflect', output=np.float_)
    std_log[std_log>0] = (np.log(std_log[std_log>0]) - np.log(mask_size**2 - 1)) / 2

    # Get width of histogram modulus
    counts, edges = np.histogram(std_log, bins=200)
    bins = (edges[:-1] + edges[1:]) / 2
    hist_max = bins[np.argmax(counts)]
    sigma = np.std(std_log[std_log <= hist_max])

    # Apply histogram-based threshold
    img_bin = std_log >= hist_max + sigma

    # Remove noise
    struct = np.ones((5,5), dtype=np.bool_)
    struct[[0,0,-1,-1], [0,-1,0,-1]] = False
    img_bin = smg.binary_opening(img_bin, structure=struct)
    img_bin = smg.binary_dilation(img_bin, structure=struct)

    return img_bin
