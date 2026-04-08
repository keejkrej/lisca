from pathlib import Path


spec_root = Path(SPECPATH)
workspace_root = spec_root.parent.parent
delivery_src = spec_root / "src"
lisca_src = workspace_root / "packages" / "lisca" / "python" / "src"
app_icon = workspace_root / "apps" / "viewer" / "public" / "favicon.ico"


a = Analysis(
    [str(spec_root / "pyinstaller_entry.py")],
    pathex=[str(delivery_src), str(lisca_src)],
    binaries=[],
    datas=[],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="delivery",
    icon=str(app_icon),
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
