import scipy.ndimage as smg
import numpy as np
import numba as nb

STRUCT3 = np.ones((3,3), dtype=np.bool_)
STRUCT7 = np.ones((7,7), dtype=np.bool_)

@nb.njit
def window_std(img):
    """Calculate unnormed variance of 'img'"""
    return np.sum((img - np.mean(img))**2)


@nb.njit
def generic_filter(img, fun, size=3, reflect=False):
    """Apply filter to image.

    img -- the image to be filtered
    fun -- the filter function to be applied, must accept subimage of 'img' as only argument and return a scalar
    size -- the size (side length) of the mask; msut be an odd integer
    reflect -- switch for border mode: True for 'reflect', False for 'mirror'

    Returns a np.float64 array with same shape as 'img'.

    This function is intended to be a numba-capable version of scipy.ndimage.generic_filter.
    """
    if size % 2 != 1:
        raise ValueError("'size' must be an odd integer")
    height, width = img.shape
    filtered_img = np.empty_like(img, dtype=np.float64)
    size_2 = size // 2

    # Create x- and y-coordinate array
    idx_y = np.empty((height + 2 * size_2, 1), dtype=np.intp)
    idx_y[size_2:-size_2, 0] = np.arange(height)
    if reflect:
        idx_y[:size_2, 0] = idx_y[2*size_2-1:size_2-1:-1, 0]
        idx_y[-size_2:, 0] = idx_y[-size_2-1:-2*size_2-1:-1, 0]
    else:
        idx_y[:size_2, 0] = idx_y[2*size_2:size_2:-1, 0]
        idx_y[-size_2:, 0] = idx_y[-size_2-2:-2*size_2-2:-1, 0]

    idx_x = np.empty((1, width + 2 * size_2), dtype=np.intp)
    idx_x[0, size_2:-size_2] = np.arange(width)
    if reflect:
        idx_x[0, :size_2] = idx_x[0, 2*size_2-1:size_2-1:-1]
        idx_x[0, -size_2:] = idx_x[0, -size_2-1:-2*size_2-1:-1]
    else:
        idx_x[0, :size_2] = idx_x[0, 2*size_2:size_2:-1]
        idx_x[0, -size_2:] = idx_x[0, -size_2-2:-2*size_2-2:-1]

    # Compute filtered image
    for y in range(height):
        for x in range(width):
            filtered_img[y, x] = fun(img[y:y+2*size_2+1, x:x+2*size_2+1])
    
    return filtered_img


def binarize_frame(img, mask_size=3):
    """Coarse segmentation of phase-contrast image frame

    Returns binarized image of frame
    """
    # Get logarithmic standard deviation at each pixel
    #std_log = smg.generic_filter(img, window_std, size=mask_size, mode='reflect', output=np.float_)
    std_log = generic_filter(img, window_std, size=mask_size)
    std_log[std_log>0] = (np.log(std_log[std_log>0]) - np.log(mask_size**2 - 1)) / 2

    # Get width of histogram modulus
    counts, edges = np.histogram(std_log, bins=200)
    bins = (edges[:-1] + edges[1:]) / 2
    hist_max = bins[np.argmax(counts)]
    sigma = np.std(std_log[std_log <= hist_max])

    # Apply histogram-based threshold
    img_bin = std_log >= hist_max + 3 * sigma

    # Remove noise
    img_bin = smg.binary_dilation(img_bin, structure=STRUCT3)
    img_bin = smg.binary_fill_holes(img_bin)
    img_bin &= smg.binary_opening(img_bin, iterations=2, structure=STRUCT7)
    img_bin = smg.binary_erosion(img_bin, border_value=1)

    return img_bin
