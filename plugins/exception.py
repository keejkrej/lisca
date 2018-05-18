"""
This is a test plug-in that raises exceptions.
"""

def raise_exc(caller='unknown function'):
    raise ValueError("Arbitrary exception occured during {}".format(caller))

def register(meta):
    meta.name = "Exceptions"
    meta.id = "test:exception_raiser"
    #raise_exc("register")

def conf(*_, **__):
    raise ValueError("Test exception raised in 'configure' method")

def run(*_, **__):
    raise ValueError("Test exception raised in 'run' method")
