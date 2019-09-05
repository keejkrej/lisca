import abc


class Roi(abc.ABC):
    """Base class for ROIs

    ROI types must inherit from this class and implement at least `key`.
    """
    @classmethod
    @abc.abstractmethod
    def key(cls):
        """Return a tuple of two strings: (type, version)"""
        raise NotImplementedError

    @property
    def label(self):
        try:
            return self._label
        except AttributeError:
            return None

    @label.setter
    def label(self, l):
        self._label = l

    def serialize(self, *_, **__):
        raise NotImplementedError

    def deserialize(self, *_, **__):
        raise NotImplementedError
