//! AppImage launches and the host Wayland session.
//!
//! linuxdeploy's GTK hook forces `GDK_BACKEND=x11` because an older WebKit
//! build aborted on Wayland. This desktop then draws that X11 window at
//! scale 1 (`xwayland:force_zero_scaling`), so the UI ignores the monitor
//! scale. The image also bundles `libwayland` while `libEGL` comes from the
//! host. WebKit passes a `wl_display` from the bundled library into the host
//! EGL and aborts with `EGL_BAD_PARAMETER`.
//!
//! On a Wayland session, preload the host Wayland libraries and select the
//! Wayland backend before GTK starts. A pure X11 session keeps the hook's
//! X11 backend, where `GDK_SCALE` still applies.

use std::process::Command;

const HOST_WAYLAND_SONAMES: &[&str] = &[
    "libwayland-client.so.0",
    "libwayland-egl.so.1",
    "libwayland-cursor.so.0",
];

pub fn prepare_appimage_display() {
    let Some(appimage) = std::env::var_os("APPIMAGE") else {
        return;
    };
    if std::env::var_os("WAYLAND_DISPLAY").is_none() {
        return;
    }
    // The first start only arranges the environment. AppRun exports
    // `GDK_BACKEND=x11` before `main`, and `LD_PRELOAD` is only honored by
    // the dynamic linker at process start, so this restarts once.
    if std::env::var_os("LISCA_WAYLAND_READY").is_none() {
        let Some(preload) = host_wayland_preload(&ldconfig_listing()) else {
            return;
        };
        let merged = match std::env::var("LD_PRELOAD") {
            Ok(existing) if !existing.is_empty() => format!("{preload}:{existing}"),
            _ => preload,
        };
        std::env::set_var("LD_PRELOAD", merged);
        std::env::set_var("LISCA_WAYLAND_READY", "1");
        let mut command = Command::new(appimage);
        command.args(std::env::args_os().skip(1));
        // A failed restart stays on the X11 backend instead of looping.
        #[cfg(unix)]
        {
            use std::os::unix::process::CommandExt;
            let error = command.exec();
            eprintln!("Lisca could not re-exec the AppImage for Wayland: {error}");
        }
        return;
    }
    // GTK reads this when the display opens. This replaces the X11 backend
    // the AppImage hook exported on the restarted process.
    std::env::set_var("GDK_BACKEND", "wayland");
}

fn ldconfig_listing() -> String {
    Command::new("ldconfig")
        .arg("-p")
        .output()
        .ok()
        .filter(|output| output.status.success())
        .map(|output| String::from_utf8_lossy(&output.stdout).into_owned())
        .unwrap_or_default()
}

fn host_wayland_preload(listing: &str) -> Option<String> {
    let mut paths = Vec::new();
    for soname in HOST_WAYLAND_SONAMES {
        let path = ldconfig_path(listing, soname)?;
        if path.contains("/.mount_") {
            continue;
        }
        paths.push(path);
    }
    if paths.len() == HOST_WAYLAND_SONAMES.len() {
        Some(paths.join(":"))
    } else {
        None
    }
}

fn ldconfig_path(listing: &str, soname: &str) -> Option<String> {
    for line in listing.lines() {
        let line = line.trim();
        let name = line.split_whitespace().next()?;
        if name != soname {
            continue;
        }
        let path = line.rsplit("=>").next()?.trim();
        if path.starts_with('/') {
            return Some(path.to_string());
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ldconfig_path_picks_the_system_soname() {
        let listing = "\
\tlibwayland-client.so.0 (libc6,x86-64) => /usr/lib/libwayland-client.so.0
\tlibwayland-egl.so.1 (libc6,x86-64) => /usr/lib/libwayland-egl.so.1
\tlibwayland-cursor.so.0 (libc6,x86-64) => /usr/lib/libwayland-cursor.so.0
\tlibEGL.so.1 (libc6,x86-64) => /usr/lib/libEGL.so.1
";
        assert_eq!(
            ldconfig_path(listing, "libwayland-egl.so.1").as_deref(),
            Some("/usr/lib/libwayland-egl.so.1")
        );
        assert_eq!(
            host_wayland_preload(listing).as_deref(),
            Some(
                "/usr/lib/libwayland-client.so.0:/usr/lib/libwayland-egl.so.1:/usr/lib/libwayland-cursor.so.0"
            )
        );
    }

    #[test]
    fn a_bundled_or_missing_wayland_library_is_not_preloaded() {
        let bundled = "\
\tlibwayland-client.so.0 (libc6,x86-64) => /tmp/.mount_lisca-abc/usr/lib/libwayland-client.so.0
\tlibwayland-egl.so.1 (libc6,x86-64) => /usr/lib/libwayland-egl.so.1
\tlibwayland-cursor.so.0 (libc6,x86-64) => /usr/lib/libwayland-cursor.so.0
";
        assert_eq!(host_wayland_preload(bundled), None);
        assert_eq!(
            host_wayland_preload(
                "\tlibwayland-client.so.0 (libc6,x86-64) => /usr/lib/libwayland-client.so.0\n"
            ),
            None
        );
    }
}
