use std::path::{Path, PathBuf};

pub const FIGURE_WIDTH_IN: f64 = 12.0;
pub const FIGURE_HEIGHT_IN: f64 = 8.0;

pub fn python_executable() -> Option<String> {
    if let Ok(from_env) = std::env::var("LISCA_PYTHON") {
        let trimmed = from_env.trim();
        if !trimmed.is_empty() {
            return Some(trimmed.to_string());
        }
    }

    bundled_python_executable().or_else(|| Some("python3".to_string()))
}

fn bundled_python_executable() -> Option<String> {
    let exe = std::env::current_exe().ok()?;
    let parent = exe.parent()?;
    for candidate in bundled_python_candidates(parent) {
        if candidate.is_file() {
            return candidate.canonicalize().ok().map(|path| path.display().to_string());
        }
    }
    None
}

fn bundled_python_candidates(base: &Path) -> Vec<PathBuf> {
    vec![
        base.join("../python/bin/python3"),
        base.join("../python/python.exe"),
        base.join("python/bin/python3"),
        base.join("python/python.exe"),
        base.join("../Resources/python/bin/python3"),
        base.join("../Resources/python/python.exe"),
    ]
}

pub fn configure_plot(plot: &mut plotpy::Plot) {
    plot.set_show_errors(true)
        .set_figure_size_inches(FIGURE_WIDTH_IN, FIGURE_HEIGHT_IN)
        .set_save_tight(true);
    if let Some(python) = python_executable() {
        plot.set_python_exe(&python);
    }
}

pub fn save_plot(plot: &plotpy::Plot, path: &Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    plot.save(path).map_err(|error| error.to_string())
}
