const std = @import("std");
const build_options = @import("build_options");

pub const ServerProcess = struct {
    child: ?std.process.Child = null,

    pub fn start(self: *ServerProcess, env_map: *std.process.Environ.Map) !void {
        if (self.child != null) return;

        if (env_map.get("LISCA_SERVER_BINARY")) |path| {
            if (path.len > 0) {
                try self.spawn(path);
                return;
            }
        }

        self.spawn(build_options.default_server_binary) catch |err| switch (err) {
            error.FileNotFound => try self.spawnSidecar(),
            else => return err,
        };
    }

    pub fn stop(self: *ServerProcess) void {
        if (self.child) |*child| {
            _ = child.kill() catch {};
            self.child = null;
        }
    }

    fn spawn(self: *ServerProcess, path: []const u8) !void {
        var child = std.process.Child.init(&.{path}, std.heap.page_allocator);
        child.stdin_behavior = .Ignore;
        child.stdout_behavior = .Inherit;
        child.stderr_behavior = .Inherit;
        try child.spawn();
        self.child = child;
    }

    fn spawnSidecar(self: *ServerProcess) !void {
        var exe_dir_buffer: [std.fs.max_path_bytes]u8 = undefined;
        const exe_dir = try std.process.executableDirPath(&exe_dir_buffer);
        const sidecar_path = try std.fs.path.join(std.heap.page_allocator, &.{ exe_dir, build_options.server_binary_name });
        defer std.heap.page_allocator.free(sidecar_path);
        try self.spawn(sidecar_path);
    }
};
