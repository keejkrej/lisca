__version__ = "0.1"
my_id = "test:loop1"

def register(meta):
    meta.id = my_id
    meta.name = "Loop test 1"
    meta.category = "Test"

    #meta.set_fun("loop_next", loop_next)
    #meta.set_fun("loop_end", loop_end)

    meta.set_dep("conf", (my_id, "_registered"))
    meta.set_ret("conf", "_configured")
    meta.set_dep("run", (my_id, ("_registered", "_configured")))
    meta.set_ret("run", "run")
    meta.set_dep("loop_next", (my_id, "_run"))
    meta.set_ret("loop_next", "_run")
    meta.set_dep("loop_end", (my_id, "_run"))
    meta.set_ret("loop_end", "_run")


    return {"_registered": 0}

def conf(d, **_):
    ret_reg = d[my_id]["_registered"]
    print("test_loop.configure received '{}' from register".format(ret_reg))
    return {"_configured": 1}

def run(d, **_):
    ret_reg = d[my_id]["_registered"]
    ret_conf = d[my_id]["_configured"]
    print("test_loop.run: received registered({}) and configured({})".format(ret_reg, ret_conf))
    return {"_run": 9}

def loop_next(d, **_):
    run = d[my_id]["_run"]
    print("test_loop.loop_next: received run data ({})".format(run))
    run -= 1
    if run < 0:
        print("test_loop.loop_next: finishing loop")
        raise StopIteration("Loop finished.")
    return {"_run": run}

def loop_end(d, **_):
    run = d[my_id]["_run"]
    print("test_loop.loop_end: received run data ({})".format(run))
    return {"_run": True}
