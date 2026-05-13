const std = @import("std");

pub fn build(b: *std.Build) void {
    const zon_desktop = b.lazyImport(@This(), "zon_desktop") orelse return;
    zon_desktop.buildApp(b, .{
        .exe_name = "lisca-studio",
        .version = "0.1.0",
        .web_package = "@lisca/studio-web",
        .web_dist = "../studio-web/dist",
        .server_package = "studio-server",
        .server_binary = "studio-server",
    });
}
