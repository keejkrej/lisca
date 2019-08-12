class MetaStack:
    def __init__(self):
        self._stacks = {}
        self._channels = []

    def get_image(self, channel, frame):
        """Get a numpy array of a stack position."""
        #TODO
        pass

    def get_image_copy(self, channel, frame):
        """Get a copy of a numpy array of a stack position."""
        #TODO
        pass

    def get_frame_tk(self, channel, frame, convert_fcn=None):
        """
        Get a frame of the stack as :py:class:`tkinter.PhotoImage`.

        :param channel: The channel of the requested stack position
        :type channel: int
        :param frame: The frame of the requested stack position
        :type frame: int
        :param convert_fcn: Custom conversion function
        :type convert_fcn: None or function

        If a custom conversion function is given, the function must take
        one argument, which is a (n_rows, n_columns)-shaped numpy array
        of the current stack position with the bit-depth of the original
        image (typically 8 or 16 bit per pixel), and must return
        a (n_rows, n_columns)-shaped numpy array of ``uint8`` type.

        :return: the image at the requested stack position
        :rtype: :py:class:`tkinter.PhotoImage`
        """
        #TODO
        with self.image_lock:
            if convert_fcn:
                a8 = convert_fcn(self.get_image(channel, frame))
            elif self._mode == 8:
                a8 = self.get_image(channel, frame)
            elif self._mode == 16:
                a16 = self.get_image(channel, frame)
                a8 = np.empty(a16.shape, dtype=np.uint8)
                np.floor_divide(a16, 256, out=a8)
            else:
                raise ValueError(f"Illegal image mode: {self._mode}")
            return piltk.PhotoImage(pilimg.fromarray(a8, mode='L'))
