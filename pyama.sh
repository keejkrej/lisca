#!/bin/bash
# Adjust the paths in this file according to your installation
# A python environment with CPython>=3.8 is required
# (support for -X pycache_prefix)
source /opt/pyama/env/bin/activate
python -X "pycache_prefix=${HOME}/.pyama/pycache" /opt/pyama
