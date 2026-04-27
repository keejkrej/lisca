# czisdk-rs

Rust wrapper for ZEISS `libCZI`, exposed as the small `czi-rs` reader API used by
`lisca`.

The crate builds a thin C++ shim over `libCZI` and exports:

- `CziFile::open`
- `CziFile::path`
- `CziFile::version`
- `CziFile::summary`
- `CziFile::read_frame`
- `CziFile::read_frame_2d`

## Using vcpkg

Install `libczi` and set `VCPKG_ROOT` if needed:

```sh
vcpkg install libczi
export VCPKG_ROOT=/path/to/vcpkg
```

Then build normally with Cargo.

## Manual installation

If `libCZI` is already installed somewhere else:

```sh
LIBCZI_INCLUDE_DIR=/prefix/include LIBCZI_LIB_DIR=/prefix/lib cargo build
```

If the library name is not `libCZI`, set `LIBCZI_LIB_NAME`.

## License note

This crate's Rust/C++ shim code is MIT licensed. ZEISS `libCZI` is distributed
under its own dual LGPL/commercial license; applications linking it must comply
with the selected `libCZI` license.
