const std = @import("std");

pub fn build(b: *std.Build) void {
    const z_desktop = b.lazyImport(@This(), "z_desktop") orelse return;
    z_desktop.buildApp(b, .{
        .exe_name = "lisca-annotator",
        .version = "0.1.0",
        .web_package = "@lisca/annotator-web",
        .web_dist = "../annotator-web/dist",
        .server_package = "annotator-server",
        .server_binary = "annotator-server",
    });
}
