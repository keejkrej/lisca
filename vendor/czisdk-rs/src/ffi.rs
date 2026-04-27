use std::ffi::{c_char, c_void};

#[repr(C)]
#[derive(Copy, Clone, Debug, Default)]
pub(crate) struct Rect {
    pub x: i32,
    pub y: i32,
    pub w: i32,
    pub h: i32,
}

#[repr(C)]
#[derive(Copy, Clone, Debug, Default)]
pub(crate) struct Size {
    pub w: u32,
    pub h: u32,
}

#[repr(C)]
#[derive(Copy, Clone, Debug, Default)]
pub(crate) struct Interval {
    pub valid: u8,
    pub start: i32,
    pub size: i32,
}

#[repr(C)]
#[derive(Copy, Clone, Debug, Default)]
pub(crate) struct Stats {
    pub subblock_count: i32,
    pub min_m_index: i32,
    pub max_m_index: i32,
    pub bounding_box: Rect,
    pub bounding_box_layer0: Rect,
    pub dims: [Interval; 10],
    pub scene_count: i32,
}

#[repr(C)]
#[derive(Copy, Clone, Debug, Default)]
pub(crate) struct SceneBoundingBox {
    pub scene: i32,
    pub bounding_box: Rect,
    pub bounding_box_layer0: Rect,
}

#[repr(C)]
#[derive(Copy, Clone, Debug, Default)]
pub(crate) struct Coordinate {
    pub valid_bits: u32,
    pub values: [i32; 10],
}

#[repr(C)]
#[derive(Copy, Clone, Debug, Default)]
pub(crate) struct SubBlockInfo {
    pub compression_mode_raw: i32,
    pub pixel_type: i32,
    pub coordinate: Coordinate,
    pub logical_rect: Rect,
    pub physical_size: Size,
    pub m_index: i32,
    pub pyramid_type: i32,
}

#[repr(C)]
#[derive(Copy, Clone, Debug, Default)]
pub(crate) struct Bitmap {
    pub width: u32,
    pub height: u32,
    pub stride: u32,
    pub pixel_type: i32,
    pub size: u64,
    pub data: *mut c_void,
}

#[repr(C)]
#[derive(Copy, Clone, Debug, Default)]
pub(crate) struct Blob {
    pub size: u64,
    pub data: *mut c_void,
}

pub(crate) enum Reader {}

extern "C" {
    pub(crate) fn czisdk_open(
        path: *const c_char,
        out_reader: *mut *mut Reader,
        error: *mut c_char,
        error_len: usize,
    ) -> i32;
    pub(crate) fn czisdk_close(reader: *mut Reader);
    pub(crate) fn czisdk_version(
        reader: *mut Reader,
        major: *mut i32,
        minor: *mut i32,
        error: *mut c_char,
        error_len: usize,
    ) -> i32;
    pub(crate) fn czisdk_stats(
        reader: *mut Reader,
        out: *mut Stats,
        error: *mut c_char,
        error_len: usize,
    ) -> i32;
    pub(crate) fn czisdk_scene_bbox(
        reader: *mut Reader,
        ordinal: i32,
        out: *mut SceneBoundingBox,
        error: *mut c_char,
        error_len: usize,
    ) -> i32;
    pub(crate) fn czisdk_subblock_info(
        reader: *mut Reader,
        index: i32,
        out: *mut SubBlockInfo,
        error: *mut c_char,
        error_len: usize,
    ) -> i32;
    pub(crate) fn czisdk_read_plane(
        reader: *mut Reader,
        coordinate: *const Coordinate,
        roi: *const Rect,
        out: *mut Bitmap,
        error: *mut c_char,
        error_len: usize,
    ) -> i32;
    pub(crate) fn czisdk_metadata_xml(
        reader: *mut Reader,
        out: *mut Blob,
        error: *mut c_char,
        error_len: usize,
    ) -> i32;
    pub(crate) fn czisdk_free(ptr: *mut c_void);
}
