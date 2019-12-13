from threading import RLock

from .events import Event

class Status:
    """Status message handler for propagating status messages beyond threads.

    Status message viewers are registered with the method 'register_viewer'.
    Call the method 'set' as a context manager to set a status.
    All registered viewers receive an Event for calling the registered function.
    """
    def __init__(self):
        self.msg_order = []
        self.msg_dict = {}
        self.viewers = {}
        self.lock = RLock()

    def register_viewer(self, cmd, queue):
        """Register a new status message viewer.

        The viewer must be a callable that takes the keyword arguments
        'msg', 'current' and 'total'.
        While 'msg' is a string that will always be set (but may be empty),
        'current' and 'total' may be None. If the message is a progress,
        'current' is a numeric value indicating the current progress,
        and 'total' is either a numeric value indicating the maximum value
        or None if no maximum value is known.

        This method returns a viewer ID that can be used to unregister
        the viewer with the 'unregister_viewer' method.
        """
        with self.lock:
            viewer_id = Event.now()
            self.viewers[viewer_id] = StatusViewer(cmd, queue)
        return viewer_id

    def unregister_viewer(self, viewer_id):
        """Unregister a status message viewer.

        The 'viewer_id' is the ID returned by 'register_viewer'.
        """
        with self.lock:
            try:
                del self.viewers[viewer_id]
            except KeyError:
                pass

    def set(self, msg, current=None, total=None):
        """Set a status message.

        Arguments:
            msg -- str with the message; may be an empty string
            current -- None or numeric value indicating current progress
            total -- None or numeric value indicating maximum progress

        'current' and 'total' are intended for calculating a position
        of a progress bar.

        Use the return value of this method as a context manager; e.g.:
            status = Status()
            # Share 'status' with other threads
            for x in range(10):
                with status.set(f"Processing items", current=x+1, total=10):
                    # do something with 'x'
        """
        return StatusMessage(msg, current=current, total=total,
                enter_cb=self._enter_status, exit_cb=self._exit_status)

    def _enter_status(self, message):
        with self.lock:
            msg_id = Event.now()
            message.msg_id = msg_id
            self.msg_order.append(msg_id)
            self.msg_dict[msg_id] = message
            self._update_status()

    def _exit_status(self, msg_id):
        with self.lock:
            try:
                del self.msg_dict[msg_id]
            except KeyError:
                return
            self._update_status()

    def _update_status(self):
        with self.lock:
            while self.msg_order:
                msg_id = self.msg_order[-1]
                try:
                    msg = self.msg_dict[msg_id]
                except KeyError:
                    self.msg_order.pop()
                    continue
                break
            else:
                # No messages in queue left; create empty message
                msg = StatusMessage("")
            for k, v in self.viewers.items():
                try:
                    Event.fire(v.queue, v.cmd, kwargs=msg.asdict)
                except Exception:
                    del self.viewers[k]


class StatusViewer:
    def __init__(self, cmd, queue):
        self.cmd = cmd
        self.queue = queue


class StatusMessage:
    def __init__(self, msg, current=None, total=None, enter_cb=None, exit_cb=None):
        self.msg_id = None
        self.msg = msg
        self.current = current
        self.total = total
        self.__enter_cb = enter_cb
        self.__exit_cb = exit_cb

    def __enter__(self):
        if self.__enter_cb is None:
            return
        self.__enter_cb(self)

    def __exit__(self, *_):
        if self.__exit_cb is None:
            return
        self.__exit_cb(self.msg_id)

    @property
    def asdict(self):
        """Return message as dictionary use for use as keyword arguments"""
        return dict(msg=self.msg, current=self.current, total=self.total)
