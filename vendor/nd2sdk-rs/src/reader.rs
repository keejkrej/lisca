use std::collections::BTreeMap;
use std::ffi::{c_char, CStr, CString};
use std::fs::File;
use std::io::Read;
use std::path::Path;

use crate::error::{Nd2Error, Result};
use crate::ffi::{
    Lim_DestroyPicture, Lim_FileClose, Lim_FileFreeString, Lim_FileGetAttributes,
    Lim_FileGetCoordInfo, Lim_FileGetCoordSize, Lim_FileGetExperiment, Lim_FileGetImageData,
    Lim_FileGetMetadata, Lim_FileGetSeqCount, Lim_FileGetSeqIndexFromCoords,
    Lim_FileOpenForReadUtf8, LimPicture, LIM_OK,
};
use crate::types::{
    color_rgb_to_hex, Attributes, DatasetSummary, ExperimentLoop, Metadata, SummaryChannel,
    SummaryScaling,
};

const ND2_CHUNK_MAGIC: u32 = 0x0A0A_0A0A;
const JP2_MAGIC: u32 = 0x0C51_004A;
const ND2_FILE_SIGNATURE: &[u8; 32] = b"ND2 FILE SIGNATURE CHUNK NAME01!";

#[derive(Debug, Clone)]
struct CoordDim {
    axis: &'static str,
    size: usize,
}

/// Main reader for ND2 files.
pub struct Nd2File {
    handle: crate::ffi::LimFileHandle,
    version: (u32, u32),
    attributes: Option<Attributes>,
    metadata: Option<Metadata>,
    coords: Option<Vec<CoordDim>>,
}

impl Nd2File {
    /// Open an ND2 file for reading.
    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self> {
        let path = path.as_ref();
        let path_string = path
            .to_str()
            .ok_or_else(|| Nd2Error::input_argument("path", "path is not valid UTF-8"))?;
        let c_path = CString::new(path_string).map_err(|_| {
            Nd2Error::input_argument("path", "path contains an interior NUL byte")
        })?;
        let handle = unsafe { Lim_FileOpenForReadUtf8(c_path.as_ptr()) };
        if handle.is_null() {
            return Err(Nd2Error::sdk_null("Lim_FileOpenForReadUtf8"));
        }

        Ok(Self {
            handle,
            version: read_version(path).unwrap_or((0, 0)),
            attributes: None,
            metadata: None,
            coords: None,
        })
    }

    /// Get the file format version when it can be read from an ND2 header.
    pub fn version(&self) -> (u32, u32) {
        self.version
    }

    /// Return a lightweight dataset overview aligned with `nd2-rs`.
    pub fn summary(&mut self) -> Result<DatasetSummary> {
        let attrs = self.attributes()?.clone();
        let metadata = self.metadata().ok().cloned();
        let coords = self.coord_dims()?.to_vec();

        let width = attrs.width_px as usize;
        let height = attrs.height_px as usize;
        if attrs.width_bytes == Some(0) {
            return Err(Nd2Error::file_invalid_format("invalid zero row stride"));
        }
        let sdk_seq_count = unsafe { Lim_FileGetSeqCount(self.handle) as usize };
        let seq_count = metadata
            .as_ref()
            .and_then(|metadata| metadata.contents.as_ref())
            .and_then(|contents| contents.frame_count)
            .or(attrs.sequence_count)
            .map(|count| count as usize)
            .unwrap_or(sdk_seq_count);
        let channel_count = self.channel_count(&attrs, metadata.as_ref())?;

        let mut sizes = BTreeMap::new();
        for dim in coords {
            *sizes.entry(dim.axis.to_string()).or_insert(1) *= dim.size.max(1);
        }
        sizes.entry("P".to_string()).or_insert(1);
        sizes.entry("T".to_string()).or_insert(1);
        sizes.entry("Z".to_string()).or_insert(1);
        sizes.insert("C".to_string(), channel_count.max(1));
        sizes.insert("Y".to_string(), height);
        sizes.insert("X".to_string(), width);

        let pixel_type = pixel_type(&attrs, metadata.as_ref());
        let channels = summary_channels(channel_count, pixel_type.clone(), metadata.as_ref());
        let scaling = summary_scaling(metadata.as_ref());

        Ok(DatasetSummary {
            version_major: self.version.0,
            version_minor: self.version.1,
            sizes,
            logical_frame_count: seq_count,
            channels,
            pixel_type,
            scaling,
        })
    }

    /// Read one frame by SDK sequence index.
    ///
    /// Returns planar `(C, Y, X)` `u16` data for integer 8-16 bit images.
    pub fn read_frame(&mut self, index: usize) -> Result<Vec<u16>> {
        let seq_count = unsafe { Lim_FileGetSeqCount(self.handle) as usize };
        if index >= seq_count {
            return Err(Nd2Error::input_out_of_range(
                "sequence index",
                index,
                seq_count,
            ));
        }

        let mut picture = LimPicture::default();
        let result = unsafe {
            Lim_FileGetImageData(
                self.handle,
                u32::try_from(index)
                    .map_err(|_| Nd2Error::input_argument("sequence index", "does not fit u32"))?,
                &mut picture,
            )
        };
        if result != LIM_OK {
            return Err(Nd2Error::sdk_call("Lim_FileGetImageData", result));
        }

        let converted = convert_picture_to_planar_u16(&picture);
        unsafe {
            Lim_DestroyPicture(&mut picture);
        }
        converted
    }

    /// Read 2D YxX frame at `(p, t, c, z)`.
    pub fn read_frame_2d(&mut self, p: usize, t: usize, c: usize, z: usize) -> Result<Vec<u16>> {
        let summary = self.summary()?;
        validate_axis(&summary.sizes, "P", p)?;
        validate_axis(&summary.sizes, "T", t)?;
        validate_axis(&summary.sizes, "C", c)?;
        validate_axis(&summary.sizes, "Z", z)?;

        let coords = self.coord_dims()?.to_vec();
        let sdk_coords = coords
            .iter()
            .map(|dim| match dim.axis {
                "P" => p,
                "T" => t,
                "Z" => z,
                _ => 0,
            })
            .map(|value| {
                u32::try_from(value)
                    .map_err(|_| Nd2Error::input_argument("coordinate", "does not fit u32"))
            })
            .collect::<Result<Vec<_>>>()?;

        let seq_idx = if sdk_coords.is_empty() {
            0
        } else {
            let mut seq_idx = 0u32;
            let ok = unsafe {
                Lim_FileGetSeqIndexFromCoords(
                    self.handle,
                    sdk_coords.as_ptr(),
                    sdk_coords.len(),
                    &mut seq_idx,
                )
            };
            if ok == 0 {
                return Err(Nd2Error::input_argument(
                    "coordinates",
                    "SDK could not map coordinates to a sequence index",
                ));
            }
            seq_idx
        };

        let frame = self.read_frame(seq_idx as usize)?;
        let width = summary.sizes["X"];
        let height = summary.sizes["Y"];
        let plane_len = width
            .checked_mul(height)
            .ok_or_else(|| Nd2Error::internal_overflow("plane length"))?;
        let start = c
            .checked_mul(plane_len)
            .ok_or_else(|| Nd2Error::internal_overflow("channel plane offset"))?;
        let end = start
            .checked_add(plane_len)
            .ok_or_else(|| Nd2Error::internal_overflow("channel plane end"))?;
        if end > frame.len() {
            return Err(Nd2Error::file_invalid_format(format!(
                "frame has {} values, requested channel slice ends at {}",
                frame.len(),
                end
            )));
        }
        Ok(frame[start..end].to_vec())
    }

    fn attributes(&mut self) -> Result<&Attributes> {
        if self.attributes.is_none() {
            let json = self.sdk_string("Lim_FileGetAttributes", |handle| unsafe {
                Lim_FileGetAttributes(handle)
            })?;
            self.attributes = Some(
                serde_json::from_str(&json)
                    .map_err(|source| Nd2Error::file_json("attributes", source))?,
            );
        }
        Ok(self.attributes.as_ref().unwrap())
    }

    fn metadata(&mut self) -> Result<&Metadata> {
        if self.metadata.is_none() {
            let json = self.sdk_string("Lim_FileGetMetadata", |handle| unsafe {
                Lim_FileGetMetadata(handle)
            })?;
            self.metadata = Some(
                serde_json::from_str(&json)
                    .map_err(|source| Nd2Error::file_json("metadata", source))?,
            );
        }
        Ok(self.metadata.as_ref().unwrap())
    }

    fn coord_dims(&mut self) -> Result<&Vec<CoordDim>> {
        if self.coords.is_none() {
            let coord_size = unsafe { Lim_FileGetCoordSize(self.handle) };
            let mut dims = Vec::with_capacity(coord_size);
            for coord in 0..coord_size {
                let mut type_buf = vec![0 as c_char; 128];
                let size = unsafe {
                    Lim_FileGetCoordInfo(
                        self.handle,
                        u32::try_from(coord).map_err(|_| {
                            Nd2Error::input_argument("coordinate", "does not fit u32")
                        })?,
                        type_buf.as_mut_ptr(),
                        type_buf.len(),
                    )
                };
                let loop_type = c_buf_to_string(&type_buf)?;
                dims.push(CoordDim {
                    axis: axis_for_loop_type(&loop_type),
                    size: size as usize,
                });
            }

            if dims.is_empty() {
                if let Ok(experiment_json) = self.sdk_string("Lim_FileGetExperiment", |handle| {
                    unsafe { Lim_FileGetExperiment(handle) }
                }) {
                    if let Ok(experiment) =
                        serde_json::from_str::<Vec<ExperimentLoop>>(&experiment_json)
                    {
                        for loop_ in experiment {
                            if let (Some(type_), Some(count)) = (loop_.type_, loop_.count) {
                                dims.push(CoordDim {
                                    axis: axis_for_loop_type(&type_),
                                    size: count as usize,
                                });
                            }
                        }
                    }
                }
            }

            self.coords = Some(dims);
        }
        Ok(self.coords.as_ref().unwrap())
    }

    fn channel_count(&self, attrs: &Attributes, metadata: Option<&Metadata>) -> Result<usize> {
        let from_metadata = metadata
            .and_then(|metadata| metadata.contents.as_ref())
            .and_then(|contents| contents.channel_count);
        let from_channels_len = metadata
            .and_then(|metadata| metadata.channels.as_ref())
            .map(|channels| channels.len() as u32);
        let count = attrs
            .channel_count
            .or(from_metadata)
            .or(from_channels_len)
            .unwrap_or(attrs.component_count);
        Ok(count as usize)
    }

    fn sdk_string(
        &self,
        function: &'static str,
        call: impl FnOnce(crate::ffi::LimFileHandle) -> *mut std::ffi::c_char,
    ) -> Result<String> {
        let ptr = call(self.handle);
        if ptr.is_null() {
            return Err(Nd2Error::sdk_null(function));
        }
        let result = unsafe { CStr::from_ptr(ptr) }
            .to_str()
            .map_err(|source| Nd2Error::file_utf8(function, source))
            .map(str::to_owned);
        unsafe {
            Lim_FileFreeString(ptr);
        }
        result
    }
}

impl Drop for Nd2File {
    fn drop(&mut self) {
        if !self.handle.is_null() {
            unsafe {
                Lim_FileClose(self.handle);
            }
            self.handle = std::ptr::null_mut();
        }
    }
}

fn convert_picture_to_planar_u16(picture: &LimPicture) -> Result<Vec<u16>> {
    if picture.p_image_data.is_null() {
        return Err(Nd2Error::sdk_null("LIMPICTURE::pImageData"));
    }
    if picture.ui_bits_per_comp == 0 || picture.ui_bits_per_comp > 16 {
        return Err(Nd2Error::unsupported_pixel_format(format!(
            "{} bits per component is not supported as u16",
            picture.ui_bits_per_comp
        )));
    }

    let width = picture.ui_width as usize;
    let height = picture.ui_height as usize;
    let components = (picture.ui_components as usize).max(1);
    let bytes_per_component = if picture.ui_bits_per_comp <= 8 { 1 } else { 2 };
    let row_values = picture.ui_width_bytes / bytes_per_component;
    let required_row_values = width
        .checked_mul(components)
        .ok_or_else(|| Nd2Error::internal_overflow("row component count"))?;
    if row_values < required_row_values {
        return Err(Nd2Error::file_invalid_format(format!(
            "row stride {} values is smaller than required {}",
            row_values, required_row_values
        )));
    }
    let frame_area = width
        .checked_mul(height)
        .ok_or_else(|| Nd2Error::internal_overflow("frame area"))?;
    let out_len = frame_area
        .checked_mul(components)
        .ok_or_else(|| Nd2Error::internal_overflow("output frame length"))?;

    let raw = unsafe {
        std::slice::from_raw_parts(picture.p_image_data.cast::<u8>(), picture.ui_size)
    };
    let mut out = vec![0u16; out_len];
    for y in 0..height {
        let row_byte_offset = y
            .checked_mul(picture.ui_width_bytes)
            .ok_or_else(|| Nd2Error::internal_overflow("row byte offset"))?;
        for x in 0..width {
            for component in 0..components {
                let value_offset = x
                    .checked_mul(components)
                    .and_then(|value| value.checked_add(component))
                    .ok_or_else(|| Nd2Error::internal_overflow("pixel component offset"))?;
                let byte_offset = row_byte_offset
                    .checked_add(value_offset * bytes_per_component)
                    .ok_or_else(|| Nd2Error::internal_overflow("pixel byte offset"))?;
                let value = match bytes_per_component {
                    1 => *raw.get(byte_offset).ok_or_else(|| {
                        Nd2Error::file_invalid_format("picture data is shorter than expected")
                    })? as u16,
                    2 => {
                        let lo = *raw.get(byte_offset).ok_or_else(|| {
                            Nd2Error::file_invalid_format(
                                "picture data is shorter than expected",
                            )
                        })?;
                        let hi = *raw.get(byte_offset + 1).ok_or_else(|| {
                            Nd2Error::file_invalid_format(
                                "picture data is shorter than expected",
                            )
                        })?;
                        u16::from_le_bytes([lo, hi])
                    }
                    _ => unreachable!(),
                };
                let dst = component
                    .checked_mul(frame_area)
                    .and_then(|value| value.checked_add(y * width + x))
                    .ok_or_else(|| Nd2Error::internal_overflow("output pixel offset"))?;
                out[dst] = value;
            }
        }
    }

    Ok(out)
}

fn validate_axis(sizes: &BTreeMap<String, usize>, axis: &str, index: usize) -> Result<()> {
    let size = *sizes.get(axis).unwrap_or(&1);
    if index >= size {
        return Err(Nd2Error::input_out_of_range(
            format!("axis {axis}"),
            index,
            size,
        ));
    }
    Ok(())
}

fn axis_for_loop_type(loop_type: &str) -> &'static str {
    match loop_type {
        "XYPosLoop" => "P",
        "TimeLoop" | "NETimeLoop" => "T",
        "ZStackLoop" => "Z",
        _ => "U",
    }
}

fn c_buf_to_string(buf: &[c_char]) -> Result<String> {
    let bytes = buf
        .iter()
        .take_while(|value| **value != 0)
        .map(|value| *value as u8)
        .collect::<Vec<_>>();
    String::from_utf8(bytes).map_err(|err| {
        Nd2Error::file_invalid_format(format!("SDK returned non-UTF8 loop type: {err}"))
    })
}

fn pixel_type(attrs: &Attributes, metadata: Option<&Metadata>) -> Option<String> {
    let bits = metadata
        .and_then(|metadata| metadata.channels.as_ref())
        .and_then(|channels| channels.first())
        .and_then(|channel| channel.volume.as_ref())
        .and_then(|volume| volume.bits_per_component_in_memory)
        .unwrap_or(attrs.bits_per_component_significant.unwrap_or(
            attrs.bits_per_component_in_memory,
        ));
    let kind = metadata
        .and_then(|metadata| metadata.channels.as_ref())
        .and_then(|channels| channels.first())
        .and_then(|channel| channel.volume.as_ref())
        .and_then(|volume| volume.component_data_type.as_deref())
        .or(attrs.pixel_data_type.as_deref())
        .unwrap_or("unsigned");
    let prefix = if kind.eq_ignore_ascii_case("float") {
        "Float"
    } else {
        "Unsigned"
    };
    Some(format!("{prefix}{bits}"))
}

fn summary_channels(
    channel_count: usize,
    pixel_type: Option<String>,
    metadata: Option<&Metadata>,
) -> Vec<SummaryChannel> {
    (0..channel_count)
        .map(|index| {
            let channel = metadata
                .and_then(|metadata| metadata.channels.as_ref())
                .and_then(|channels| channels.get(index))
                .and_then(|channel| channel.channel.as_ref());
            SummaryChannel {
                index,
                name: channel.and_then(|channel| channel.name.clone()),
                color: channel
                    .and_then(|channel| channel.color_rgb)
                    .map(color_rgb_to_hex),
                pixel_type: pixel_type.clone(),
            }
        })
        .collect()
}

fn summary_scaling(metadata: Option<&Metadata>) -> Option<SummaryScaling> {
    let volume = metadata?
        .channels
        .as_ref()?
        .first()?
        .volume
        .as_ref()?;
    let calibration = volume.axes_calibration?;
    let calibrated = volume.axes_calibrated.unwrap_or([true, true, true]);
    Some(SummaryScaling {
        x: calibrated[0].then_some(calibration[0]),
        y: calibrated[1].then_some(calibration[1]),
        z: calibrated[2].then_some(calibration[2]),
        unit: Some("um".to_string()),
    })
}

fn read_version(path: &Path) -> Result<(u32, u32)> {
    let mut file = File::open(path)?;
    let mut header = [0u8; 112];
    file.read_exact(&mut header)?;
    let magic = u32::from_le_bytes([header[0], header[1], header[2], header[3]]);
    if magic == JP2_MAGIC {
        return Ok((1, 0));
    }
    if magic != ND2_CHUNK_MAGIC {
        return Err(Nd2Error::file_invalid_format(format!(
            "invalid ND2 magic 0x{magic:08X}"
        )));
    }
    let name = &header[16..48];
    if name != ND2_FILE_SIGNATURE {
        return Err(Nd2Error::file_invalid_format(
            "invalid ND2 file signature",
        ));
    }
    let data = &header[48..112];
    let major = (data[3] as char).to_digit(10).unwrap_or(0);
    let minor = (data[5] as char).to_digit(10).unwrap_or(0);
    Ok((major, minor))
}
