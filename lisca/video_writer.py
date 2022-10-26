import skvideo.io

class Mp4writer:

    def __init__(self, out, outputdict=None, rate=10, crf=0, vf=None):

        if outputdict is None:
            outputdict={
            '-vcodec': 'libx264',  #use the h.264 codec
            '-crf': str(crf),           #set the constant rate factor to 0, which is lossless
            #'-preset':'faster'   #the slower the better compression, in princple, try 
            '-r': str(rate)
            #other options see https://trac.ffmpeg.org/wiki/Encode/H.264
            }

        if vf is not None:
            outputdict['vf']=vf

        self.writer = skvideo.io.FFmpegWriter(out, 
            inputdict={
        '-r': str(rate)
        #other options see https://trac.ffmpeg.org/wiki/Encode/H.264
        },
            outputdict=outputdict)

    def write_frame(self, frame):
        
        self.writer.writeFrame(frame)
    
    def close(self):

        self.writer.close()

