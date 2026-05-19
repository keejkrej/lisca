# Zig

Shared Zig build support for Lisca desktop shells lives here.

`zero-native/` owns the shared zero-native build, run, package, and sidecar-server wiring used by `apps/*-desktop`. Individual desktop packages keep product assets, manifests, app entrypoints, and thin `build.zig` files that import these helpers.
