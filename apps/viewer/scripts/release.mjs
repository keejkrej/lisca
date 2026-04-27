import { spawnSync } from "node:child_process";
const args = ["@tauri-apps/cli", "build"];
const env = { ...process.env };

configurePlatform(env);

function configurePlatform(env) {
  switch (process.platform) {
    case "win32":
      configureStaticLibCzi(env, "x64-windows-static-md");
      break;
    case "darwin":
      configureStaticLibCzi(
        env,
        process.arch === "arm64" ? "arm64-osx" : "x64-osx",
      );
      break;
    case "linux":
      args.push("--no-bundle");
      configureStaticLibCzi(env, "x64-linux");
      break;
  }
}

function configureStaticLibCzi(env, triplet) {
  delete env.VCPKGRS_DYNAMIC;
  env.VCPKGRS_TRIPLET ??= triplet;
  env.LIBCZI_STATIC ??= "1";

  if ((env.LIBCZI_INCLUDE_DIR || env.LIBCZI_LIB_DIR) && !env.LIBCZI_LIB_NAME) {
    env.LIBCZI_LIB_NAME = process.platform === "win32" ? "libCZIStatic" : "libCZI";
  }
}

const result = spawnSync("bunx", args, {
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
