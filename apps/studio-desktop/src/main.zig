const std = @import("std");
const runner = @import("runner");
const server = @import("lisca-server-process");
const zero_native = @import("zero-native");

pub const panic = std.debug.FullPanic(zero_native.debug.capturePanic);

const App = struct {
    env_map: *std.process.Environ.Map,
    server_process: server.ServerProcess = .{},

    fn app(self: *@This()) zero_native.App {
        return .{
            .context = self,
            .name = "lisca-studio",
            .source = zero_native.frontend.productionSource(.{ .dist = "frontend/dist" }),
            .source_fn = source,
            .start_fn = start,
            .stop_fn = stop,
        };
    }

    fn source(context: *anyopaque) anyerror!zero_native.WebViewSource {
        const self: *@This() = @ptrCast(@alignCast(context));
        return zero_native.frontend.sourceFromEnv(self.env_map, .{
            .dist = "frontend/dist",
            .entry = "index.html",
        });
    }

    fn start(context: *anyopaque, runtime: *zero_native.Runtime) anyerror!void {
        _ = runtime;
        const self: *@This() = @ptrCast(@alignCast(context));
        try self.server_process.start(self.env_map);
    }

    fn stop(context: *anyopaque, runtime: *zero_native.Runtime) anyerror!void {
        _ = runtime;
        const self: *@This() = @ptrCast(@alignCast(context));
        self.server_process.stop();
    }
};

const dev_origins = [_][]const u8{ "zero://app", "zero://inline", "http://127.0.0.1:5175" };

pub fn main(init: std.process.Init) !void {
    var app = App{ .env_map = init.environ_map };
    try runner.runWithOptions(app.app(), .{
        .app_name = "Studio",
        .window_title = "Studio",
        .bundle_id = "com.lisca.studio.desktop",
        .icon_path = "assets/icon.ico",
        .security = .{
            .navigation = .{ .allowed_origins = &dev_origins },
        },
        .width = 1280,
        .height = 800,
    }, init);
}

test "app name is configured" {
    try std.testing.expectEqualStrings("lisca-studio", "lisca-studio");
}
