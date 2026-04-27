use nd2_rs::{Nd2File, Result};
use std::path::PathBuf;

fn test_path() -> Option<PathBuf> {
    std::env::var("ND2_TEST_FILE").ok().map(|s| s.into())
}

fn require_fixture() -> Option<Nd2File> {
    let path = test_path()?;
    if !path.exists() {
        return None;
    }
    Nd2File::open(path).ok()
}

#[test]
fn test_summary() -> Result<()> {
    let mut nd2 = match require_fixture() {
        Some(x) => x,
        None => return Ok(()),
    };

    let summary = nd2.summary()?;
    assert!(summary.sizes["X"] > 0);
    assert!(summary.sizes["Y"] > 0);
    assert!(summary.logical_frame_count > 0);
    assert_eq!(
        summary.channels.len(),
        *summary.sizes.get("C").unwrap_or(&1)
    );
    Ok(())
}

#[test]
fn test_read_frame() -> Result<()> {
    let mut nd2 = match require_fixture() {
        Some(x) => x,
        None => return Ok(()),
    };

    let pixels = nd2.read_frame(0)?;
    assert!(!pixels.is_empty());
    Ok(())
}

#[test]
fn test_read_frame_2d() -> Result<()> {
    let mut nd2 = match require_fixture() {
        Some(x) => x,
        None => return Ok(()),
    };

    let summary = nd2.summary()?;
    let frame = nd2.read_frame_2d(0, 0, 0, 0)?;
    let expected = summary.sizes["Y"] * summary.sizes["X"];
    assert_eq!(frame.len(), expected);
    Ok(())
}
