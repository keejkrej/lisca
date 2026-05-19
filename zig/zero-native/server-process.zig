const std = @import("std");
const build_options = @import("build_options");

pub const ServerProcess = struct {
    child: ?std.process.Child = null,

    pub fn start(self: *ServerProcess, io: std.Io, env_map: *std.process.Environ.Map) !void {
        if (self.child != null) return;

        if (envTruthy(env_map.get("LISCA_SKIP_SERVER"))) return;

        if (env_map.get("LISCA_SERVER_BINARY")) |path| {
            if (path.len > 0) {
                try self.spawn(io, path);
                return;
            }
        }

        // Bundled sidecar (next to the desktop executable) wins over repo target paths.
        if (self.spawnSidecar(io)) return;

        try self.spawn(io, build_options.default_server_binary);
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

    fn spawnSidecar(self: *ServerProcess, io: std.Io) bool {
        var exe_dir_buffer: [std.fs.max_path_bytes]u8 = undefined;
        const exe_dir_len = std.process.executableDirPath(io, &exe_dir_buffer) catch return false;
        const exe_dir = exe_dir_buffer[0..exe_dir_len];
        const sidecar_path = std.fs.path.join(std.heap.page_allocator, &.{ exe_dir, build_options.server_binary_name }) catch return false;
        defer std.heap.page_allocator.free(sidecar_path);
        self.spawn(io, sidecar_path) catch return false;
        return true;
    }
};

fn envTruthy(value: ?[]const u8) bool {
    const trimmed = std.mem.trim(u8, value orelse "", &std.ascii.whitespace);
    if (trimmed.len == 0) return false;
    return std.ascii.eqlIgnoreCase(trimmed, "1") or
        std.ascii.eqlIgnoreCase(trimmed, "true") or
        std.ascii.eqlIgnoreCase(trimmed, "yes");
}

test "envTruthy recognizes skip-server values" {
    try std.testing.expect(envTruthy("1"));
    try std.testing.expect(envTruthy("true"));
    try std.testing.expect(!envTruthy("0"));
    try std.testing.expect(!envTruthy(null));
}
