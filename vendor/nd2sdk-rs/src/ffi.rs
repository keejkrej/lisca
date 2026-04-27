use std::ffi::{c_char, c_int, c_uint, c_void};

pub type LimBool = c_int;
pub type LimResult = c_int;
pub type LimSize = usize;
pub type LimUint = c_uint;
pub type LimFileHandle = *mut c_void;

pub const LIM_OK: LimResult = 0;

#[repr(C)]
#[derive(Debug)]
pub struct LimPicture {
    pub ui_width: LimUint,
    pub ui_height: LimUint,
    pub ui_bits_per_comp: LimUint,
    pub ui_components: LimUint,
    pub ui_width_bytes: LimSize,
    pub ui_size: LimSize,
    pub p_image_data: *mut c_void,
}

impl Default for LimPicture {
    fn default() -> Self {
        Self {
            ui_width: 0,
            ui_height: 0,
            ui_bits_per_comp: 0,
            ui_components: 0,
            ui_width_bytes: 0,
            ui_size: 0,
            p_image_data: std::ptr::null_mut(),
        }
    }
}

extern "C" {
    pub fn Lim_FileOpenForReadUtf8(file_name_utf8: *const c_char) -> LimFileHandle;
    pub fn Lim_FileClose(file: LimFileHandle);
    pub fn Lim_FileGetCoordSize(file: LimFileHandle) -> LimSize;
    pub fn Lim_FileGetCoordInfo(
        file: LimFileHandle,
        coord: LimUint,
        type_: *mut c_char,
        max_type_size: LimSize,
    ) -> LimUint;
    pub fn Lim_FileGetSeqCount(file: LimFileHandle) -> LimUint;
    pub fn Lim_FileGetSeqIndexFromCoords(
        file: LimFileHandle,
        coords: *const LimUint,
        coord_count: LimSize,
        seq_idx: *mut LimUint,
    ) -> LimBool;
    pub fn Lim_FileGetAttributes(file: LimFileHandle) -> *mut c_char;
    pub fn Lim_FileGetMetadata(file: LimFileHandle) -> *mut c_char;
    pub fn Lim_FileGetExperiment(file: LimFileHandle) -> *mut c_char;
    pub fn Lim_FileGetImageData(
        file: LimFileHandle,
        seq_index: LimUint,
        picture: *mut LimPicture,
    ) -> LimResult;
    pub fn Lim_FileFreeString(str_: *mut c_char);
    pub fn Lim_DestroyPicture(picture: *mut LimPicture);
}
