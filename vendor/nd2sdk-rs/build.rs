use std::env;
use std::path::{Path, PathBuf};

fn main() {
    let sdk_dir = env::var_os("ND2READSDK_DIR")
        .map(PathBuf::from)
        .or_else(default_sdk_dir)
        .expect("set ND2READSDK_DIR to the Nd2ReadSdk root directory");

    println!("cargo:rerun-if-env-changed=ND2READSDK_DIR");
    println!("cargo:rerun-if-changed={}", sdk_dir.display());

    if cfg!(target_os = "windows") {
        link_windows(&sdk_dir);
    } else if cfg!(target_os = "macos") {
        link_macos(&sdk_dir);
    } else if cfg!(target_os = "linux") {
        link_linux(&sdk_dir);
    } else {
        panic!("unsupported target OS for Nd2ReadSdk");
    }
}

fn link_windows(sdk_dir: &Path) {
    let lib_dir = sdk_dir.join("lib");

    if !lib_dir.join("nd2readsdk-static.lib").exists() {
        panic!(
            "could not find Windows Nd2ReadSdk static libraries under {}",
            sdk_dir.display()
        );
    }

    println!("cargo:rustc-link-search=native={}", lib_dir.display());
    for lib in [
        "nd2readsdk-static",
        "limfile-static",
        "tiffxx",
        "tiff",
        "jpeg-static",
        "jbig",
        "lzma",
        "zlib",
        "turbojpeg-static",
    ] {
        println!("cargo:rustc-link-lib=static={lib}");
    }
}

fn link_macos(sdk_dir: &Path) {
    let lib_dir = sdk_dir.join("lib");
    let bin_dir = sdk_dir.join("bin");

    if link_unix_static(&lib_dir) {
        return;
    }

    if link_shared(&bin_dir, "dylib") || link_shared(&lib_dir, "dylib") {
        return;
    }

    panic!(
        "could not find macOS Nd2ReadSdk libraries under {}",
        sdk_dir.display()
    );
}

fn link_linux(sdk_dir: &Path) {
    let lib_dir = sdk_dir.join("lib");
    let bin_dir = sdk_dir.join("bin");

    if link_unix_static(&lib_dir) {
        return;
    }

    if link_shared(&bin_dir, "so") || link_shared(&lib_dir, "so") {
        return;
    }

    panic!(
        "could not find Linux Nd2ReadSdk libraries under {}",
        sdk_dir.display()
    );
}

fn link_unix_static(lib_dir: &Path) -> bool {
    if !lib_dir.join("libnd2readsdk-static.a").exists() {
        return false;
    }

    println!("cargo:rustc-link-search=native={}", lib_dir.display());
    for lib in [
        "nd2readsdk-static",
        "limfile-static",
        "tiffxx",
        "tiff",
        "jpeg",
        "jbig",
        "lzma",
        "z",
    ] {
        println!("cargo:rustc-link-lib=static={lib}");
    }
    link_cpp_runtime();
    true
}

fn link_shared(dir: &Path, extension: &str) -> bool {
    if !dir
        .join(format!("libnd2readsdk-shared.{extension}"))
        .exists()
    {
        return false;
    }

    println!("cargo:rustc-link-search=native={}", dir.display());
    println!("cargo:rustc-link-lib=dylib=nd2readsdk-shared");
    println!("cargo:rustc-link-arg=-Wl,-rpath,{}", dir.display());
    link_cpp_runtime();
    true
}

fn default_sdk_dir() -> Option<PathBuf> {
    let home = env::var_os("HOME").map(PathBuf::from)?;
    let docs = home.join("Documents");
    let static_dir = docs.join("nd2readsdk-static-1.7.6.0-Macos-armv8");
    if static_dir.exists() {
        return Some(static_dir);
    }
    let shared_dir = docs.join("nd2readsdk-shared-1.7.6.0-Macos-armv8");
    if shared_dir.exists() {
        return Some(shared_dir);
    }
    find_sdk_dir(&docs)
}

fn find_sdk_dir(root: &Path) -> Option<PathBuf> {
    let entries = std::fs::read_dir(root).ok()?;
    let mut candidates = entries
        .flatten()
        .map(|entry| entry.path())
        .filter(|path| {
            path.file_name()
                .and_then(|name| name.to_str())
                .map(|name| name.starts_with("nd2readsdk-"))
                .unwrap_or(false)
        })
        .collect::<Vec<_>>();
    candidates.sort();
    candidates.into_iter().next()
}

fn link_cpp_runtime() {
    if cfg!(target_os = "macos") {
        println!("cargo:rustc-link-lib=c++");
    } else if cfg!(target_os = "linux") {
        println!("cargo:rustc-link-lib=stdc++");
    }
}
