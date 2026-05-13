const std = @import("std");

const PlatformOption = enum {
    auto,
    @"null",
    macos,
    linux,
};

const TraceOption = enum {
    off,
    events,
    runtime,
    all,
};

const WebEngineOption = enum {
    system,
};

const PackageTarget = enum {
    macos,
    linux,
};

pub const AppConfig = struct {
    exe_name: []const u8,
    version: []const u8,
    web_package: []const u8,
    web_dist: []const u8,
    server_package: []const u8,
    server_binary: []const u8,
};

pub fn build(_: *std.Build) void {}

pub fn buildApp(b: *std.Build, config: AppConfig) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});
    const helper_dep = b.dependency("zon_desktop", .{});
    const platform_option = b.option(PlatformOption, "platform", "Desktop backend: auto, null, macos, linux") orelse .auto;
    const trace_option = b.option(TraceOption, "trace", "Trace output: off, events, runtime, all") orelse .events;
    const debug_overlay = b.option(bool, "debug-overlay", "Enable debug overlay output") orelse false;
    const automation_enabled = b.option(bool, "automation", "Enable zero-native automation artifacts") orelse false;
    const package_target = b.option(PackageTarget, "package-target", "Package target: macos, linux") orelse selectedPackageTarget(target);
    const zero_native_path = b.option([]const u8, "zero-native-path", "Path to the zero-native package") orelse "node_modules/zero-native";
    const web_engine = WebEngineOption.system;
    const optimize_name = @tagName(optimize);
    const selected_platform: PlatformOption = switch (platform_option) {
        .auto => if (target.result.os.tag == .macos) .macos else if (target.result.os.tag == .linux) .linux else .@"null",
        else => platform_option,
    };

    if (selected_platform == .macos and target.result.os.tag != .macos) {
        @panic("-Dplatform=macos requires a macOS target");
    }
    if (selected_platform == .linux and target.result.os.tag != .linux) {
        @panic("-Dplatform=linux requires a Linux target");
    }

    const server_binary_name = if (target.result.os.tag == .windows)
        b.fmt("{s}.exe", .{config.server_binary})
    else
        config.server_binary;
    const release_server_binary = b.pathJoin(&.{ "..", "..", "target", "release", server_binary_name });
    const cargo_profile_dir = if (optimize == .Debug) "debug" else "release";
    const default_server_binary = b.pathJoin(&.{ "..", "..", "target", cargo_profile_dir, server_binary_name });

    const zero_native_mod = zeroNativeModule(b, target, optimize, zero_native_path);
    const options = b.addOptions();
    options.addOption([]const u8, "platform", switch (selected_platform) {
        .auto => unreachable,
        .@"null" => "null",
        .macos => "macos",
        .linux => "linux",
    });
    options.addOption([]const u8, "trace", @tagName(trace_option));
    options.addOption([]const u8, "web_engine", @tagName(web_engine));
    options.addOption(bool, "debug_overlay", debug_overlay);
    options.addOption(bool, "automation", automation_enabled);
    options.addOption([]const u8, "default_server_binary", default_server_binary);
    options.addOption([]const u8, "server_binary_name", server_binary_name);
    const options_mod = options.createModule();

    const runner_mod = moduleFromPath(b, target, optimize, helper_dep.path("runner.zig"));
    runner_mod.addImport("zero-native", zero_native_mod);
    runner_mod.addImport("build_options", options_mod);

    const server_mod = moduleFromPath(b, target, optimize, helper_dep.path("server-process.zig"));
    server_mod.addImport("build_options", options_mod);

    const app_mod = localModule(b, target, optimize, "src/main.zig");
    app_mod.addImport("zero-native", zero_native_mod);
    app_mod.addImport("runner", runner_mod);
    app_mod.addImport("lisca-server-process", server_mod);
    app_mod.addImport("build_options", options_mod);
    const exe = b.addExecutable(.{
        .name = config.exe_name,
        .root_module = app_mod,
    });
    linkPlatform(b, app_mod, selected_platform, web_engine, zero_native_path);
    b.installArtifact(exe);

    const server_build = cargoBuild(b, config.server_package, optimize != .Debug);
    const frontend_build = b.addSystemCommand(&.{ "pnpm", "--filter", config.web_package, "build" });
    const frontend_assets = syncFrontendAssets(b, config.web_dist);
    frontend_assets.step.dependOn(&frontend_build.step);

    const run = b.addRunArtifact(exe);
    run.step.dependOn(&frontend_assets.step);
    run.step.dependOn(&server_build.step);
    const run_step = b.step("run", "Build and run the desktop app");
    run_step.dependOn(&run.step);

    const dev = b.addSystemCommand(&.{ "zero-native", "dev", "--manifest", "app.zon", "--binary" });
    dev.addFileArg(exe.getEmittedBin());
    dev.step.dependOn(&exe.step);
    dev.step.dependOn(&server_build.step);
    const dev_step = b.step("dev", "Run the frontend dev server and native shell");
    dev_step.dependOn(&dev.step);

    const release_server_build = cargoBuild(b, config.server_package, true);
    const package_output = b.fmt("zig-out/package/{s}-{s}-{s}{s}", .{ config.exe_name, config.version, @tagName(package_target), packageSuffix(package_target) });
    const package = b.addSystemCommand(&.{
        "zero-native",
        "package",
        "--target",
        @tagName(package_target),
        "--manifest",
        "app.zon",
        "--assets",
        "frontend/dist",
        "--optimize",
        optimize_name,
        "--output",
        package_output,
        "--binary",
    });
    package.addFileArg(exe.getEmittedBin());
    package.addArgs(&.{ "--web-engine", @tagName(web_engine) });
    package.step.dependOn(&exe.step);
    package.step.dependOn(&frontend_assets.step);
    package.step.dependOn(&release_server_build.step);
    const package_sidecar = copyPackageSidecar(b, package_target, package_output, release_server_binary, server_binary_name);
    package_sidecar.step.dependOn(&package.step);
    const package_step = b.step("package", "Create a local package artifact");
    package_step.dependOn(&package_sidecar.step);

    const tests = b.addTest(.{ .root_module = app_mod });
    const test_step = b.step("test", "Run desktop shell tests");
    test_step.dependOn(&b.addRunArtifact(tests).step);
}

fn syncFrontendAssets(b: *std.Build, source_dist: []const u8) *std.Build.Step.Run {
    return b.addSystemCommand(&.{ "node", "../../scripts/sync-frontend-dist.mjs", source_dist, "frontend/dist" });
}

fn copyPackageSidecar(b: *std.Build, package_target: PackageTarget, package_output: []const u8, source_binary: []const u8, server_binary_name: []const u8) *std.Build.Step.Run {
    return b.addSystemCommand(&.{ "node", "../../scripts/copy-desktop-sidecar.mjs", @tagName(package_target), package_output, source_binary, server_binary_name });
}

fn cargoBuild(b: *std.Build, package: []const u8, release: bool) *std.Build.Step.Run {
    const command = b.addSystemCommand(&.{ "cargo", "build", "-p", package });
    if (release) command.addArg("--release");
    return command;
}

fn localModule(b: *std.Build, target: std.Build.ResolvedTarget, optimize: std.builtin.OptimizeMode, path: []const u8) *std.Build.Module {
    return b.createModule(.{
        .root_source_file = b.path(path),
        .target = target,
        .optimize = optimize,
    });
}

fn moduleFromPath(b: *std.Build, target: std.Build.ResolvedTarget, optimize: std.builtin.OptimizeMode, path: std.Build.LazyPath) *std.Build.Module {
    return b.createModule(.{
        .root_source_file = path,
        .target = target,
        .optimize = optimize,
    });
}

fn zeroNativePath(b: *std.Build, zero_native_path: []const u8, sub_path: []const u8) std.Build.LazyPath {
    return .{ .cwd_relative = b.pathJoin(&.{ zero_native_path, sub_path }) };
}

fn zeroNativeModule(b: *std.Build, target: std.Build.ResolvedTarget, optimize: std.builtin.OptimizeMode, zero_native_path: []const u8) *std.Build.Module {
    const geometry_mod = externalModule(b, target, optimize, zero_native_path, "src/primitives/geometry/root.zig");
    const assets_mod = externalModule(b, target, optimize, zero_native_path, "src/primitives/assets/root.zig");
    const app_dirs_mod = externalModule(b, target, optimize, zero_native_path, "src/primitives/app_dirs/root.zig");
    const trace_mod = externalModule(b, target, optimize, zero_native_path, "src/primitives/trace/root.zig");
    const app_manifest_mod = externalModule(b, target, optimize, zero_native_path, "src/primitives/app_manifest/root.zig");
    const diagnostics_mod = externalModule(b, target, optimize, zero_native_path, "src/primitives/diagnostics/root.zig");
    const platform_info_mod = externalModule(b, target, optimize, zero_native_path, "src/primitives/platform_info/root.zig");
    const json_mod = externalModule(b, target, optimize, zero_native_path, "src/primitives/json/root.zig");
    const debug_mod = externalModule(b, target, optimize, zero_native_path, "src/debug/root.zig");
    debug_mod.addImport("app_dirs", app_dirs_mod);
    debug_mod.addImport("trace", trace_mod);

    const zero_native_mod = externalModule(b, target, optimize, zero_native_path, "src/root.zig");
    zero_native_mod.addImport("geometry", geometry_mod);
    zero_native_mod.addImport("assets", assets_mod);
    zero_native_mod.addImport("app_dirs", app_dirs_mod);
    zero_native_mod.addImport("trace", trace_mod);
    zero_native_mod.addImport("app_manifest", app_manifest_mod);
    zero_native_mod.addImport("diagnostics", diagnostics_mod);
    zero_native_mod.addImport("platform_info", platform_info_mod);
    zero_native_mod.addImport("json", json_mod);
    return zero_native_mod;
}

fn externalModule(b: *std.Build, target: std.Build.ResolvedTarget, optimize: std.builtin.OptimizeMode, zero_native_path: []const u8, path: []const u8) *std.Build.Module {
    return b.createModule(.{
        .root_source_file = zeroNativePath(b, zero_native_path, path),
        .target = target,
        .optimize = optimize,
    });
}

fn linkPlatform(
    b: *std.Build,
    app_mod: *std.Build.Module,
    platform: PlatformOption,
    web_engine: WebEngineOption,
    zero_native_path: []const u8,
) void {
    if (platform == .macos) {
        switch (web_engine) {
            .system => {
                app_mod.addCSourceFile(.{ .file = zeroNativePath(b, zero_native_path, "src/platform/macos/appkit_host.m"), .flags = &.{ "-fobjc-arc", "-ObjC" } });
                app_mod.linkFramework("WebKit", .{});
            },
        }
        app_mod.linkFramework("AppKit", .{});
        app_mod.linkFramework("Foundation", .{});
        app_mod.linkFramework("UniformTypeIdentifiers", .{});
        app_mod.linkSystemLibrary("c", .{});
    } else if (platform == .linux) {
        switch (web_engine) {
            .system => {
                app_mod.addCSourceFile(.{ .file = zeroNativePath(b, zero_native_path, "src/platform/linux/gtk_host.c"), .flags = &.{} });
                app_mod.linkSystemLibrary("gtk4", .{});
                app_mod.linkSystemLibrary("webkitgtk-6.0", .{});
            },
        }
        app_mod.linkSystemLibrary("c", .{});
    }
}

fn selectedPackageTarget(target: std.Build.ResolvedTarget) PackageTarget {
    return switch (target.result.os.tag) {
        .macos => .macos,
        .linux => .linux,
        else => .linux,
    };
}

fn packageSuffix(target: PackageTarget) []const u8 {
    return switch (target) {
        .macos => ".app",
        .linux => "",
    };
}
