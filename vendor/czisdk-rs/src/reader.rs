use std::collections::HashMap;
use std::ffi::{CStr, CString};
use std::path::{Path, PathBuf};
use std::ptr::NonNull;
use std::slice;

use crate::error::{CziError, Result};
use crate::ffi;
use crate::metadata::parse_metadata_xml;
use crate::types::{
    sizes_from_stats, Bitmap, BoundingBoxes, Coordinate, DatasetSummary, DimBounds, Dimension,
    DirectorySubBlockInfo, IntRect, Interval, MetadataSummary, PixelType, PlaneIndex,
    SubBlockStatistics, SummaryChannel, SummaryScaling,
};

const ERROR_LEN: usize = 4096;

pub struct CziFile {
    path: PathBuf,
    reader: NonNull<ffi::Reader>,
    version: (i32, i32),
    statistics: SubBlockStatistics,
    subblocks: Vec<DirectorySubBlockInfo>,
    metadata_xml: Option<String>,
    metadata: Option<MetadataSummary>,
}

impl CziFile {
    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self> {
        let path = path.as_ref().to_path_buf();
        let native_path = CString::new(path.as_os_str().to_string_lossy().as_bytes())
            .map_err(|_| CziError::input_argument("path", "path contains an interior NUL byte"))?;
        let mut error = ErrorBuffer::default();
        let mut raw = std::ptr::null_mut();
        let status = unsafe {
            ffi::czisdk_open(
                native_path.as_ptr(),
                &mut raw,
                error.as_mut_ptr(),
                ERROR_LEN,
            )
        };
        if status != 0 {
            return Err(CziError::file_native(error.message()));
        }
        let reader = NonNull::new(raw).ok_or_else(|| CziError::file_native("libCZI returned a null reader"))?;

        let version = native_version(reader)?;
        let statistics = native_statistics(reader)?;
        let subblocks = native_subblocks(reader, statistics.subblock_count)?;

        Ok(Self {
            path,
            reader,
            version,
            statistics,
            subblocks,
            metadata_xml: None,
            metadata: None,
        })
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    pub fn version(&self) -> (i32, i32) {
        self.version
    }

    pub fn summary(&mut self) -> Result<DatasetSummary> {
        let sizes = sizes_from_stats(&self.statistics);
        let metadata = self.metadata()?.clone();
        let logical_frame_count = self.loop_indices()?.len();
        let channel_pixel_types = self.channel_pixel_types();
        let max_channel_count = metadata.channels.len().max(
            channel_pixel_types
                .keys()
                .max()
                .map(|index| index + 1)
                .unwrap_or(0),
        );
        let channels = (0..max_channel_count)
            .map(|index| {
                let metadata_channel = metadata
                    .channels
                    .iter()
                    .find(|channel| channel.index == index);
                SummaryChannel {
                    index,
                    name: metadata_channel.and_then(|channel| channel.name.clone()),
                    color: metadata_channel.and_then(|channel| channel.color.clone()),
                    pixel_type: metadata_channel
                        .and_then(|channel| {
                            channel
                                .pixel_type
                                .map(|pixel_type| pixel_type.as_str().to_owned())
                        })
                        .or_else(|| {
                            channel_pixel_types
                                .get(&index)
                                .map(|pixel_type| pixel_type.as_str().to_owned())
                        }),
                }
            })
            .collect();
        let scaling = if metadata.scaling.x.is_some()
            || metadata.scaling.y.is_some()
            || metadata.scaling.z.is_some()
            || metadata.scaling.unit.is_some()
        {
            Some(SummaryScaling {
                x: metadata.scaling.x,
                y: metadata.scaling.y,
                z: metadata.scaling.z,
                unit: metadata.scaling.unit.clone(),
            })
        } else {
            None
        };

        Ok(DatasetSummary {
            version_major: self.version.0.max(0) as u32,
            version_minor: self.version.1.max(0) as u32,
            sizes: sizes.into_iter().collect(),
            logical_frame_count,
            channels,
            pixel_type: metadata
                .image
                .pixel_type
                .map(|pixel_type| pixel_type.as_str().to_owned()),
            scaling,
        })
    }

    pub fn read_frame(&mut self, index: usize) -> Result<Vec<u16>> {
        let indices = self.loop_indices()?;
        if index >= indices.len() {
            return Err(CziError::input_out_of_range(
                "frame index",
                index,
                indices.len(),
            ));
        }

        let mut plane = PlaneIndex::new();
        for (name, value) in &indices[index] {
            let dimension = Dimension::from_code(name).ok_or_else(|| {
                CziError::input_argument("frame index", format!("unknown dimension '{name}'"))
            })?;
            plane = plane.with(dimension, *value);
        }
        self.read_plane(&plane)?.into_gray_u16()
    }

    pub fn read_frame_2d(&mut self, s: usize, t: usize, c: usize, z: usize) -> Result<Vec<u16>> {
        let plane = PlaneIndex::new()
            .with(Dimension::S, s)
            .with(Dimension::T, t)
            .with(Dimension::C, c)
            .with(Dimension::Z, z);
        self.read_plane(&plane)?.into_gray_u16()
    }

    fn metadata(&mut self) -> Result<&MetadataSummary> {
        if self.metadata.is_none() {
            if self.metadata_xml.is_none() {
                self.metadata_xml = Some(native_metadata_xml(self.reader)?);
            }
            let parsed = parse_metadata_xml(self.metadata_xml.as_deref().unwrap_or_default())?;
            self.metadata = Some(parsed);
        }
        Ok(self.metadata.as_ref().unwrap())
    }

    fn loop_indices(&self) -> Result<Vec<HashMap<String, usize>>> {
        let mut varying_dims = Vec::new();
        for dimension in Dimension::FRAME_ORDER {
            let size = self
                .statistics
                .dim_bounds
                .get(dimension)
                .map(|interval| interval.size)
                .unwrap_or(1);
            if size > 1 {
                varying_dims.push((dimension, size));
            }
        }

        if varying_dims.is_empty() {
            return Ok(vec![HashMap::new()]);
        }

        let total = varying_dims.iter().map(|(_, size)| *size).product();
        let mut out = Vec::with_capacity(total);
        let mut current = HashMap::new();
        build_loop_indices(&varying_dims, 0, &mut current, &mut out);
        Ok(out)
    }

    fn channel_pixel_types(&self) -> HashMap<usize, PixelType> {
        let channel_start = self
            .statistics
            .dim_bounds
            .get(Dimension::C)
            .map(|interval| interval.start)
            .unwrap_or(0);

        let mut pixel_types = HashMap::new();
        for subblock in &self.subblocks {
            let actual_channel = subblock
                .coordinate
                .get(Dimension::C)
                .unwrap_or(channel_start);
            let relative_channel = actual_channel.saturating_sub(channel_start) as usize;
            pixel_types
                .entry(relative_channel)
                .or_insert(subblock.pixel_type);
        }
        pixel_types
    }

    fn read_plane(&mut self, index: &PlaneIndex) -> Result<Bitmap> {
        let actual = self.resolve_plane_index(index)?;
        let plane_rect = self
            .select_plane_rect(actual.get(Dimension::S))
            .ok_or_else(|| CziError::file_invalid_format("no plane bounding box available"))?;
        if plane_rect.w <= 0 || plane_rect.h <= 0 {
            return Err(CziError::file_invalid_format(
                "plane bounding box has non-positive size",
            ));
        }
        native_read_plane(self.reader, &actual, plane_rect)
    }

    fn resolve_plane_index(&self, index: &PlaneIndex) -> Result<Coordinate> {
        let mut actual = Coordinate::new();

        for dimension in Dimension::FRAME_ORDER {
            let requested = index.get(dimension);
            match self.statistics.dim_bounds.get(dimension) {
                Some(interval) => {
                    let relative = match requested {
                        Some(value) => value,
                        None if interval.size <= 1 => 0,
                        None => return Err(CziError::input_missing_dim(dimension.as_str())),
                    };
                    if relative >= interval.size {
                        return Err(CziError::input_out_of_range(
                            format!("dimension {}", dimension.as_str()),
                            relative,
                            interval.size,
                        ));
                    }
                    actual.set(dimension, interval.start + relative as i32);
                }
                None => {
                    if requested.unwrap_or(0) != 0 {
                        return Err(CziError::input_argument(
                            dimension.as_str(),
                            "dimension is not present in this file",
                        ));
                    }
                }
            }
        }

        Ok(actual)
    }

    fn select_plane_rect(&self, scene: Option<i32>) -> Option<IntRect> {
        if let Some(scene) = scene {
            if let Some(bounding_boxes) = self.statistics.scene_bounding_boxes.get(&scene) {
                if bounding_boxes.layer0.is_valid() {
                    return Some(bounding_boxes.layer0);
                }
                if bounding_boxes.all.is_valid() {
                    return Some(bounding_boxes.all);
                }
            }
        }

        self.statistics
            .bounding_box_layer0
            .or(self.statistics.bounding_box)
    }
}

impl Drop for CziFile {
    fn drop(&mut self) {
        unsafe {
            ffi::czisdk_close(self.reader.as_ptr());
        }
    }
}

fn native_version(reader: NonNull<ffi::Reader>) -> Result<(i32, i32)> {
    let mut major = 0;
    let mut minor = 0;
    let mut error = ErrorBuffer::default();
    let status = unsafe {
        ffi::czisdk_version(
            reader.as_ptr(),
            &mut major,
            &mut minor,
            error.as_mut_ptr(),
            ERROR_LEN,
        )
    };
    check_status(status, error)?;
    Ok((major, minor))
}

fn native_statistics(reader: NonNull<ffi::Reader>) -> Result<SubBlockStatistics> {
    let mut raw = ffi::Stats::default();
    let mut error = ErrorBuffer::default();
    let status = unsafe {
        ffi::czisdk_stats(reader.as_ptr(), &mut raw, error.as_mut_ptr(), ERROR_LEN)
    };
    check_status(status, error)?;

    let mut dim_bounds = DimBounds::default();
    for dimension in Dimension::FRAME_ORDER {
        let interval = raw.dims[dimension.raw()];
        if interval.valid != 0 {
            dim_bounds.set(
                dimension,
                Interval {
                    start: interval.start,
                    size: usize::try_from(interval.size.max(0)).map_err(|err| {
                        CziError::file_invalid_format(format!("invalid dimension size: {err}"))
                    })?,
                },
            );
        }
    }

    let mut scene_bounding_boxes = std::collections::BTreeMap::new();
    for ordinal in 0..raw.scene_count {
        let mut scene = ffi::SceneBoundingBox::default();
        let mut error = ErrorBuffer::default();
        let status = unsafe {
            ffi::czisdk_scene_bbox(
                reader.as_ptr(),
                ordinal,
                &mut scene,
                error.as_mut_ptr(),
                ERROR_LEN,
            )
        };
        check_status(status, error)?;
        scene_bounding_boxes.insert(
            scene.scene,
            BoundingBoxes {
                all: convert_rect(scene.bounding_box),
                layer0: convert_rect(scene.bounding_box_layer0),
            },
        );
    }

    Ok(SubBlockStatistics {
        subblock_count: usize::try_from(raw.subblock_count.max(0))
            .map_err(|err| CziError::file_invalid_format(format!("invalid subblock count: {err}")))?,
        dim_bounds,
        bounding_box: convert_optional_rect(raw.bounding_box),
        bounding_box_layer0: convert_optional_rect(raw.bounding_box_layer0),
        scene_bounding_boxes,
    })
}

fn native_subblocks(
    reader: NonNull<ffi::Reader>,
    subblock_count: usize,
) -> Result<Vec<DirectorySubBlockInfo>> {
    let mut out = Vec::with_capacity(subblock_count);
    for index in 0..subblock_count {
        let mut raw = ffi::SubBlockInfo::default();
        let mut error = ErrorBuffer::default();
        let status = unsafe {
            ffi::czisdk_subblock_info(
                reader.as_ptr(),
                i32::try_from(index).map_err(|err| {
                    CziError::file_invalid_format(format!("too many subblocks: {err}"))
                })?,
                &mut raw,
                error.as_mut_ptr(),
                ERROR_LEN,
            )
        };
        check_status(status, error)?;
        let pixel_type = PixelType::from_raw(raw.pixel_type)
            .ok_or_else(|| CziError::unsupported_pixel_type(raw.pixel_type.to_string()))?;
        out.push(DirectorySubBlockInfo {
            pixel_type,
            coordinate: convert_coordinate(raw.coordinate),
        });
    }
    Ok(out)
}

fn native_read_plane(
    reader: NonNull<ffi::Reader>,
    coordinate: &Coordinate,
    roi: IntRect,
) -> Result<Bitmap> {
    let raw_coordinate = convert_ffi_coordinate(coordinate);
    let raw_roi = ffi::Rect {
        x: roi.x,
        y: roi.y,
        w: roi.w,
        h: roi.h,
    };
    let mut raw = ffi::Bitmap::default();
    let mut error = ErrorBuffer::default();
    let status = unsafe {
        ffi::czisdk_read_plane(
            reader.as_ptr(),
            &raw_coordinate,
            &raw_roi,
            &mut raw,
            error.as_mut_ptr(),
            ERROR_LEN,
        )
    };
    check_status(status, error)?;

    let pixel_type = PixelType::from_raw(raw.pixel_type)
        .ok_or_else(|| CziError::unsupported_pixel_type(raw.pixel_type.to_string()))?;
    let len = usize::try_from(raw.size)
        .map_err(|err| CziError::file_invalid_format(format!("bitmap too large: {err}")))?;
    let data = if raw.data.is_null() || len == 0 {
        Vec::new()
    } else {
        let bytes = unsafe { slice::from_raw_parts(raw.data.cast::<u8>(), len) }.to_vec();
        unsafe {
            ffi::czisdk_free(raw.data);
        }
        bytes
    };
    Ok(Bitmap {
        pixel_type,
        width: raw.width,
        height: raw.height,
        data,
    })
}

fn native_metadata_xml(reader: NonNull<ffi::Reader>) -> Result<String> {
    let mut raw = ffi::Blob::default();
    let mut error = ErrorBuffer::default();
    let status = unsafe {
        ffi::czisdk_metadata_xml(reader.as_ptr(), &mut raw, error.as_mut_ptr(), ERROR_LEN)
    };
    check_status(status, error)?;
    let len = usize::try_from(raw.size)
        .map_err(|err| CziError::file_invalid_format(format!("metadata too large: {err}")))?;
    if raw.data.is_null() || len == 0 {
        return Ok(String::new());
    }
    let bytes = unsafe { slice::from_raw_parts(raw.data.cast::<u8>(), len) }.to_vec();
    unsafe {
        ffi::czisdk_free(raw.data);
    }
    String::from_utf8(bytes).map_err(|err| CziError::file_invalid_utf8(err.to_string()))
}

fn build_loop_indices(
    dims: &[(Dimension, usize)],
    depth: usize,
    current: &mut HashMap<String, usize>,
    out: &mut Vec<HashMap<String, usize>>,
) {
    if depth == dims.len() {
        out.push(current.clone());
        return;
    }

    let (dimension, size) = dims[depth];
    for value in 0..size {
        current.insert(dimension.as_str().to_owned(), value);
        build_loop_indices(dims, depth + 1, current, out);
    }
    current.remove(dimension.as_str());
}

fn convert_rect(raw: ffi::Rect) -> IntRect {
    IntRect {
        x: raw.x,
        y: raw.y,
        w: raw.w,
        h: raw.h,
    }
}

fn convert_optional_rect(raw: ffi::Rect) -> Option<IntRect> {
    let rect = convert_rect(raw);
    rect.is_valid().then_some(rect)
}

fn convert_coordinate(raw: ffi::Coordinate) -> Coordinate {
    let mut coordinate = Coordinate::new();
    for dimension in Dimension::FRAME_ORDER {
        if (raw.valid_bits & (1u32 << dimension.raw())) != 0 {
            coordinate.set(dimension, raw.values[dimension.raw()]);
        }
    }
    coordinate
}

fn convert_ffi_coordinate(coordinate: &Coordinate) -> ffi::Coordinate {
    let mut raw = ffi::Coordinate::default();
    for (dimension, value) in coordinate.iter() {
        raw.valid_bits |= 1u32 << dimension.raw();
        raw.values[dimension.raw()] = value;
    }
    raw
}

fn check_status(status: i32, error: ErrorBuffer) -> Result<()> {
    if status == 0 {
        Ok(())
    } else {
        Err(CziError::file_native(error.message()))
    }
}

struct ErrorBuffer {
    data: [std::ffi::c_char; ERROR_LEN],
}

impl Default for ErrorBuffer {
    fn default() -> Self {
        Self {
            data: [0; ERROR_LEN],
        }
    }
}

impl ErrorBuffer {
    fn as_mut_ptr(&mut self) -> *mut std::ffi::c_char {
        self.data.as_mut_ptr()
    }

    fn message(&self) -> String {
        unsafe { CStr::from_ptr(self.data.as_ptr()) }
            .to_string_lossy()
            .into_owned()
    }
}
