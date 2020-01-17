import queue
import threading

from . import const
from .events import Event
from .model import SessionModel
from .status import Status

class SessionController:
    def __init__(self, session_type='tk', name=None, version=None):
        self.session_type = session_type
        self.name = name
        self.version = version
        if self.name is not None:
            self.title = self.name
        else:
            self.title = "Session"
        if self.version is not None:
            self.title = " ".join((self.title, self.version))
        self.control_queue = queue.Queue()
        self.lock = threading.RLock()
        self.continue_control = True
        self.view = None
        self.sessions = {}
        self.current_session = None
        self.status = Status()
        self.cmd_map = {
            const.CMD_INIT_SESSION: self.initialize_session,
            const.CMD_NEW_STACK: self.open_new_stack,
            const.CMD_DISCARD_SESSION: self.discard_session,
            const.CMD_CLOSE_STACK: self.close_stack,
            const.CMD_CONFIG_SESSION: self.config_session,
            }

    def control_loop(self):
        """Consume events from control queue.

        This method is intended to be run in the control thread,
        preferably as thread target.
        """
        while self.continue_control:
            try:
                evt = self.control_queue.get(timeout=.5)
            except queue.Empty:
                continue
            if evt.fun is not None:
                evt()
            else:
                try:
                    cmd = self.cmd_map[evt.cmd]
                except KeyError:
                    print(f"Unknown command: {evt.cmd}")
                    raise
                evt(cmd)

    def start(self):
        """Start control thread and run GUI mainloop.

        This method must be run in the main thread.
        """
        # Set up control queue and control loop
        control_thread = threading.Thread(target=self.control_loop)
        control_thread.start()

        # Start the GUI
        # Some GUI libs (like tkinter) must be run in the main thread!
        if self.session_type == 'tk':
            from .view_tk import SessionView_Tk as SessionView
        else:
            raise ValueError(f"Unknown session type '{self.session_type}'")
        self.view = SessionView.create(title=self.title, control_queue=self.control_queue, status=self.status)
        self.view.mainloop()

        # Cleanup
        #self.control_queue.put_nowait(Event(print, "Quit")) #DEBUG
        Event.fire(self.control_queue, print, "Quit") #DEBUG
        self.continue_control = False
        control_thread.join()

    def initialize_session(self):
        """Create a new, empty SessionModel instance.

        This method must be called from the control thread.
        """
        with self.lock:
            sess_id = Event.now()
            self.sessions[sess_id] = SessionModel()
            Event.fire(self.view.queue, const.RESP_NEW_SESSION_ID, sess_id)

    def discard_session(self, session_id):
        """Close a session.

        This method must be called from the control thread.
        """
        with self.lock:
            session = self.sessions[session_id]
            session.close_stacks(keep_open=self.get_stack_ids(session_id))
            del self.sessions[session_id]

    def open_new_stack(self, fn, session_id):
        """Open a new stack in a SessionModel.

        This method must be called from the control thread.
        """
        with self.lock:
            session = self.sessions[session_id]
            session.open_stack(fn, status=self.status)
            Event.fire(self.view.queue, const.CMD_UPDATE_STACK_LIST, kwargs=dict(stack_getter=session.get_stack_info, select=True))

    def close_stack(self, session_id, stack_id):
        """Close a stack.

        This method must be called from the control thread.
        """
        with self.lock:
            session = self.sessions[session_id]
            session.close_stacks(stack_id, keep_open=self.get_stack_ids(session_id))
            Event.fire(self.view.queue, const.CMD_UPDATE_STACK_LIST, kwargs=dict(stacks=session.stacks))

    def get_stack_ids(self, *exclude_sessions):
        """Get stack IDs of all open sessions.

        Sessions whose session ID is in 'exclude_sessions' are ignored.
        This method must be called from the control thread.
        """
        stack_ids = set()
        with self.lock:
            stack_ids.update(s.stack_ids for sid, s in self.sessions.items() if sid not in exclude_sessions)
        return stack_ids
            

    def config_session(self, session_id, stacks):
        """Prepare session for display

        This method must be called from the control thread.
        """
        with self.lock:
            try:
                session = self.sessions[session_id]
            except KeyError:
                return
            Event.fire(self.view.queue, self.view.set_session)
            try:
                session.config(stacks, status=self.status, render_factory=self.view.make_display_render_function)
            except Exception:
                self.discard_session(session_id)
                raise
            else:
                Event.fire(self.view.queue, self.view.set_session, session)
                Event.fire(self.view.queue, const.CMD_UPDATE_TRACES)#, kwargs=dict(traces=session.traces))

