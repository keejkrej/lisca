const std = @import("std");

pub fn build(b: *std.Build) void {
    const zero_native = b.lazyImport(@This(), "zero_native") orelse return;
    zero_native.buildApp(b, .{
        .exe_name = "lisca-aligner",
        .version = "0.1.0",
        .web_package = "@lisca/aligner-web",
        .web_dist = "../aligner-web/dist",
        .server_package = "aligner-server",
        .server_binary = "aligner-server",
    });
}
