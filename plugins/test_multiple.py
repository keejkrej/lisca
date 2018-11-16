this_ids = "test:multiple_plugins"
__version__ = "0.1"


def register(meta, more_meta):
    meta.name = "First of multiple (1)"
    meta.id = this_ids + "1"
    meta.category = "Test"

    more_meta.meta.name = "Second of multiple (1)"
    more_meta.meta.id = this_ids + "2"
    more_meta.meta.category = "Test"
    more_meta.meta.set_fun("conf", conf2)
    more_meta.meta.set_fun("run", run2)


def conf(*_, **__):
    print(f"[{this_ids}1] conf")


def run(*_, **__):
    print(f"[{this_ids}1] run")


def conf2(*_, **__):
    print(f"[{this_ids}2] conf")


def run2(*_, **__):
    print(f"[{this_ids}2] run")
