#print("Modul 'hallo' geladen.")

__version__ = "1.0"

def sag_hallo(s=''):
    if len(s) > 0:
        s = ''.join((', ', s))
    print("Hallo{}!".format(s))

def register(meta):
    meta.name = "Hallo"
    meta.id = "hallo"
    meta.conf_dep = ("", "__version__")
    #print("Modul 'hallo' registriert.")

def configure(*_, **__):
    v = _['']['__version__']
    print("Modul 'hallo' konfiguriert in pyAMA {}.".format(v))

def run(*_, **__):
    print("Modul 'hallo' ausgeführt.")
