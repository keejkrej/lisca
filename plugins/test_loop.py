__version__ = "0.1"
my_id = "test:loop1"

def register(meta):
    meta.id = my_id
    meta.name = "Loop test 1"

    #meta.set_fun("loop_next", loop_next)
    #meta.set_fun("loop_end", loop_end)

    meta.set_dep("conf", (my_id, "registered"))
    meta.set_ret("conf", "configured")
    meta.set_dep("run", (my_id, ("registered", "configured")))
    meta.set_ret("run", "run")
    meta.set_dep("loop_next", (my_id, "run"))
    meta.set_ret("loop_next", "run")
    meta.set_dep("loop_end", (my_id, "run"))
    meta.set_ret("loop_end", "run")


    return {"registered": 0}

def configure(d, **_):
    ret_reg = d[my_id]["registered"]
    print("test_loop.configure received '{}' from register".format(ret_reg))
    return {"configured": 1}

def run(d, **_):
    ret_reg = d[my_id]["registered"]
    ret_conf = d[my_id]["configured"]
    print("test_loop.run: received registered({}) and configured({})".format(ret_reg, ret_conf))
    return {"run": 9}

def loop_next(d, **_):
    run = d[my_id]["run"]
    print("test_loop.loop_next: received run data ({})".format(run))
    run -= 1
    if run < 0:
        print("test_loop.loop_next: finishing loop")
        raise StopIteration("Loop finished.")
    return {"run": run}

def loop_end(d, **_):
    run = d[my_id]["run"]
    print("test_loop.loop_end: received run data ({})".format(run))
    return {"run": True}
