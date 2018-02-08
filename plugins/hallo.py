print("Modul 'hallo' geladen.")

def sag_hallo(s=''):
    if len(s) > 0:
        s = ''.join((', ', s))
    print("Hallo{}!".format(s))

def register(meta):
    meta.name = "Hallo"
    meta.id = "hallo"
    print("Modul 'hallo' registriert.")

def configure(**_):
    print("Modul 'hallo' konfiguriert.")

def run(**_):
    print("Modul 'hallo' ausgeführt.")
