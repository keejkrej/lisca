use std::env;
use std::path::{Path, PathBuf};

fn main() {
    println!("cargo:rerun-if-env-changed=LIBCZI_INCLUDE_DIR");
    println!("cargo:rerun-if-env-changed=LIBCZI_LIB_DIR");
    println!("cargo:rerun-if-env-changed=LIBCZI_LIB_NAME");
    println!("cargo:rerun-if-env-changed=LIBCZI_STATIC");
    println!("cargo:rerun-if-env-changed=VCPKG_ROOT");
    println!("cargo:rerun-if-env-changed=VCPKGRS_TRIPLET");
    println!("cargo:rerun-if-changed=native/czisdk_rs.cpp");

    let mut include_dirs = Vec::new();
    let static_link;

    if let (Ok(include_dir), Ok(lib_dir)) =
        (env::var("LIBCZI_INCLUDE_DIR"), env::var("LIBCZI_LIB_DIR"))
    {
        include_dirs.push(PathBuf::from(include_dir));
        println!("cargo:rustc-link-search=native={lib_dir}");
        let lib_name = env::var("LIBCZI_LIB_NAME").unwrap_or_else(|_| "libCZI".to_owned());
        let kind = if env::var_os("LIBCZI_STATIC").is_some() {
            "static"
        } else {
            "dylib"
        };
        static_link = kind == "static";
        println!("cargo:rustc-link-lib={kind}={lib_name}");
    } else if let Ok(library) = vcpkg::Config::new()
        .cargo_metadata(false)
        .emit_includes(true)
        .find_package("libczi")
    {
        static_link = library.is_static;
        for link_path in &library.link_paths {
            println!("cargo:rustc-link-search=native={}", link_path.display());
        }
        for dll_path in &library.dll_paths {
            println!("cargo:rustc-link-search=native={}", dll_path.display());
        }
        for found_lib in &library.found_libs {
            let link_name = link_name_for_path(found_lib);
            let kind = if library.is_static { "static" } else { "dylib" };
            println!("cargo:rustc-link-lib={kind}={link_name}");
        }
        include_dirs.extend(library.include_paths);
    } else {
        panic!(
            "libCZI was not found. Install vcpkg package 'libczi' or set \
             LIBCZI_INCLUDE_DIR and LIBCZI_LIB_DIR to an installed libCZI package."
        );
    }

    let mut build = cc::Build::new();
    build
        .cpp(true)
        .std("c++17")
        .file("native/czisdk_rs.cpp")
        .warnings(false);

    if static_link {
        build.define("_LIBCZISTATICLIB", None);

        if cfg!(target_os = "windows") {
            println!("cargo:rustc-link-lib=dylib=windowscodecs");
        }
    }

    for include_dir in include_dirs {
        build.include(&include_dir);
        build.include(include_dir.join("libCZI"));
    }

    build.compile("czisdk_rs_bridge");
}

fn link_name_for_path(path: &Path) -> String {
    let stem = path
        .file_stem()
        .expect("vcpkg library path has no file stem")
        .to_string_lossy();

    if path.extension().and_then(|extension| extension.to_str()) == Some("a") {
        stem.strip_prefix("lib").unwrap_or(&stem).to_owned()
    } else {
        stem.into_owned()
    }
}
