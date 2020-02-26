import time

import numpy as np
import tifffile as tiff

from ..session.status import DummyStatus
from ..img_op.coarse_binarize_phc import binarize_frame

def binarize_phasecontrast_stack(stack, i_channel, outfile, status=None):
    if status is None:
        status = DummyStatus()

    stack_bin = np.empty((stack.n_frames, 1, 1, stack.height, stack.width), dtype=np.uint8)
    with status("Binarizing …") as current_status:
        for i_frame in range(stack.n_frames):
            current_status.reset(msg="Binarizing frame", current=i_frame+1, total=stack.n_frames)
            stack_bin[i_frame, ...] = binarize_frame(stack.get_image(frame=i_frame, channel=i_channel))

        current_status.reset(f"Saving binarized stack to '{outfile}' …")
        tiff.imwrite(outfile, stack_bin, imagej=True)

        current_status.reset(f"Saved binarized stack to '{outfile}'.")
        time.sleep(2)

