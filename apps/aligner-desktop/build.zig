const std = @import("std");

pub fn build(b: *std.Build) void {
    const zon_desktop = b.lazyImport(@This(), "zon_desktop") orelse return;
    zon_desktop.buildApp(b, .{
        .exe_name = "lisca-aligner",
        .version = "0.1.0",
        .web_package = "@lisca/aligner-web",
        .web_dist = "../aligner-web/dist",
        .server_package = "aligner-server",
        .server_binary = "aligner-server",
    });
}
