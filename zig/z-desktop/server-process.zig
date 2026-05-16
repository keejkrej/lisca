const std = @import("std");
const build_options = @import("build_options");

pub const ServerProcess = struct {
    child: ?std.process.Child = null,

    pub fn start(self: *ServerProcess, io: std.Io, env_map: *std.process.Environ.Map) !void {
        if (self.child != null) return;

        if (env_map.get("LISCA_SERVER_BINARY")) |path| {
            if (path.len > 0) {
                try self.spawn(io, path);
                return;
            }
        }

        self.spawn(io, build_options.default_server_binary) catch |err| switch (err) {
            error.FileNotFound => try self.spawnSidecar(io),
            else => return err,
        };
    }

    pub fn stop(self: *ServerProcess, io: std.Io) void {
        if (self.child) |*child| {
            child.kill(io);
            self.child = null;
        }
    }

    fn spawn(self: *ServerProcess, io: std.Io, path: []const u8) !void {
        self.child = try std.process.spawn(io, .{
            .argv = &.{path},
            .stdin = .ignore,
            .stdout = .inherit,
            .stderr = .inherit,
        });
    }

    fn spawnSidecar(self: *ServerProcess, io: std.Io) !void {
        var exe_dir_buffer: [std.fs.max_path_bytes]u8 = undefined;
        const exe_dir_len = try std.process.executableDirPath(io, &exe_dir_buffer);
        const exe_dir = exe_dir_buffer[0..exe_dir_len];
        const sidecar_path = try std.fs.path.join(std.heap.page_allocator, &.{ exe_dir, build_options.server_binary_name });
        defer std.heap.page_allocator.free(sidecar_path);
        try self.spawn(io, sidecar_path);
    }
};
