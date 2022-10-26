import sys
import numpy as np
import os
import json
from urllib import request
from cellpose import models
from cellpose.io import logger_setup 
from tqdm import tqdm
from src.img_op import background_correction, coarse_binarize_phc


class Segmentation:

    def __init__(self, gpu=True, model_type='cyto', channels=None, diameter=None, flow_threshold=0.4, mask_threshold=0, pretrained_model=None, nucleus_bottom_percentile=0.05, nucleus_top_percentile=99.95, cyto_bottom_percentile=0.1, cyto_top_percentile=99.9, check_preprocessing=False, verbose=True):

        self.diameter=diameter
        self.flow_treshold=flow_threshold
        self.mask_threshold=mask_threshold
        self.verbose=verbose

        if pretrained_model is None:
            self.model = models.Cellpose(gpu=gpu, model_type='cyto')
        
        else:
            path_to_models = os.path.join(os.path.dirname(__file__), 'models')
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
            
        
    def segment_image(self, image, diameter=None, flow_threshold=None, mask_threshold=None):

        diameter=self.diameter if diameter is None else diameter
        flow_threshold=self.flow_threshold if flow_threshold is None else flow_threshold
        mask_threshold=self.mask_threshold if mask_threshold is None else mask_threshold

        mask = self.model.eval(image, diameter=diameter, channels=None, flow_threshold=flow_threshold, cellprob_threshold=mask_threshold, normalize=True)[0].astype('uint8')


        return mask
