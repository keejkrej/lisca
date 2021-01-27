# Provides a background correction based on Schwarzfischer et al.:
# Efficient fluorescence image normalization for time lapse movies
# https://push-zb.helmholtz-muenchen.de/frontdoor.php?source_opus=6773
#
# Based on "background_correction.py"
# of commit f46236d89b18ec8833e54bbdfe748f3e5bce6924
# in repository https://gitlab.physik.uni-muenchen.de/lsr-pyama/schwarzfischer
import numpy as np
import numpy.ma as ma
import scipy.interpolate as scint
import scipy.stats as scst


def _make_tiles(n, div, name='center'):
    borders = np.rint(np.linspace(0, n, 2*div-1)).astype(np.uint16)
    tiles = np.empty(len(borders)-2, dtype=[(name, np.float), ('slice', object)])
    for i, (b1, b2) in enumerate(zip(borders[:-2], borders[2:])):
        tiles[i] = (b1 + b2) / 2, slice(b1, b2)
    return tiles

def background_schwarzfischer(fluor_chan, bin_chan, div_horiz=7, div_vert=5, memmap=None):
    """Perform background correction according to Schwarzfischer et al.

    Arguments:
        fluor_chan -- (frames x height x width) numpy array; the fluorescence channel to be corrected
        bin_chan -- boolean numpy array of same shape as `fluor_chan`; segmentation map (background=False, cell=True)
        div_horiz -- int; number of (non-overlapping) tiles in horizontal direction
        div_vert -- int; number of (non-overlapping) tiles in vertical direction
        mmemmap -- (NOT YET IMPLEMENTED) bool or str; flag (bool) or path (str) whether to use memmap

    Returns:
        Background-corrected fluorescence channel as numpy array (dtype single) of same shape as `fluor_chan`
    """
    n_frames, height, width = fluor_chan.shape
    if memmap:
        raise NotImplementedError("Memmapping is not implemented yet.")

    # Construct tiles for background interpolation
    # Each pair of neighboring tiles is overlapped by a third tile, resulting in a total tile number
    # of `2 * div_i - 1` tiles for each direction `i` in {`horiz`, `vert`}.
    # Due to integer rounding, the sizes may slightly vary between tiles.
    tiles_vert = _make_tiles(height, div_vert)
    tiles_horiz = _make_tiles(height, div_horiz)

    # Interplolate background as cubic spline with each tile’s median as support point at the tile center
    supp = np.empty((tiles_horiz.size, tiles_vert.size))
    if np.can_cast(fluor_chan, np.float32):
        dtype_interp = np.float32
    else:
        dtype_interp = np.float64
    bg_interp = np.empty_like(bin_chan, dtype=dtype_interp)
    for t in range(fluor_chan.shape[0]):
        print(f"Interpolate background in frame {t:3d} …")
        masked_frame = ma.masked_array(fluor_chan[t, ...], mask=bin_chan[t, ...])
        for iy, (y, sy) in enumerate(tiles_vert):
            for ix, (x, sx) in enumerate(tiles_horiz):
                supp[ix, iy] = ma.median(masked_frame[sy, sx])
        bg_spline = scint.RectBivariateSpline(x=tiles_horiz['center'], y=tiles_vert['center'], z=supp)
        bg_interp[t, ...] = bg_spline(x=range(width), y=range(height)).T

    # Calculated background using Schwarzfischer’s formula
    bg_mean = np.mean(bg_interp, axis=(1,2)).reshape((-1, 1, 1))
    gain = np.median(bg_interp / bg_mean, axis=0)
    stack_corr = (fluor_chan - bg_interp) / gain
    return stack_corr
