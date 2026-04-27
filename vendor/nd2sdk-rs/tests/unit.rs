use nd2_rs::Nd2File;
use std::io::Write;

#[test]
fn test_open_nonexistent_fails() {
    let res = Nd2File::open("nonexistent_file_xyz.nd2");
    assert!(res.is_err());
}
#[test]
fn test_open_invalid_file_fails() {
    let tmp = std::env::temp_dir().join("nd2sdk_rs_test_garbage.nd2");
    let mut f = std::fs::File::create(&tmp).unwrap();
    f.write_all(&[0u8; 200]).unwrap();
    drop(f);
    let err = match Nd2File::open(&tmp) {
        Ok(_) => unreachable!("garbage file should not open successfully"),
        Err(err) => err,
    };
    assert!(
        err.is_file(),
        "invalid file should be classified as file error"
    );
    let _ = std::fs::remove_file(&tmp);
}
