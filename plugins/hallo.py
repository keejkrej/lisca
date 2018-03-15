print("Modul 'hallo' geladen.")

def sag_hallo(s=''):
    if len(s) > 0:
        s = ''.join((', ', s))
    print("Hallo{}!".format(s))

def register(meta):
    meta.name = "Hallo"
    meta.id = "hallo"
    meta.conf_dep = ("", "", "__version__")
    print("Modul 'hallo' registriert.")

def configure(**_):
    v = _['']['__version__']
    print("Modul 'hallo' konfiguriert in pyAMA {}.".format(v))

def run(**_):
    print("Modul 'hallo' ausgeführt.")
