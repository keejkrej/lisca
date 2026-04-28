import { spawnSync } from "node:child_process";
const args = ["@tauri-apps/cli", "build"];
const env = { ...process.env };

configurePlatform(env);

function configurePlatform(env) {
  switch (process.platform) {
    case "win32":
      configureStaticNd2ReadSdk(env);
      configureStaticLibCzi(env, "x64-windows-static-md");
      break;
    case "darwin":
      configureStaticNd2ReadSdk(env);
      configureStaticLibCzi(
        env,
        process.arch === "arm64" ? "arm64-osx" : "x64-osx",
      );
      break;
    case "linux":
      args.push("--no-bundle");
      configureStaticNd2ReadSdk(env);
      configureStaticLibCzi(
        env,
        process.arch === "arm64" ? "arm64-linux" : "x64-linux",
      );
      break;
  }
}

function configureStaticNd2ReadSdk(env) {
  env.ND2READSDK_STATIC ??= "1";
}

function configureStaticLibCzi(env, triplet) {
  delete env.VCPKGRS_DYNAMIC;
  env.VCPKGRS_TRIPLET ??= triplet;
  env.LIBCZI_STATIC ??= "1";

  if ((env.LIBCZI_INCLUDE_DIR || env.LIBCZI_LIB_DIR) && !env.LIBCZI_LIB_NAME) {
    env.LIBCZI_LIB_NAME = process.platform === "win32" ? "libCZIStatic" : "CZI";
  }
}

const result = spawnSync("bunx", args, {
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
