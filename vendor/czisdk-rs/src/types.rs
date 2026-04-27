use std::collections::{BTreeMap, HashMap};

use crate::error::{CziError, Result};

#[derive(Copy, Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub(crate) enum Dimension {
    Z = 1,
    C = 2,
    T = 3,
    R = 4,
    S = 5,
    I = 6,
    H = 7,
    V = 8,
    B = 9,
    X = 10,
    Y = 11,
}

impl Dimension {
    pub(crate) const FRAME_ORDER: [Dimension; 9] = [
        Dimension::S,
        Dimension::T,
        Dimension::C,
        Dimension::Z,
        Dimension::R,
        Dimension::I,
        Dimension::H,
        Dimension::V,
        Dimension::B,
    ];

    pub(crate) fn as_str(self) -> &'static str {
        match self {
            Self::Z => "Z",
            Self::C => "C",
            Self::T => "T",
            Self::R => "R",
            Self::S => "S",
            Self::I => "I",
            Self::H => "H",
            Self::V => "V",
            Self::B => "B",
            Self::X => "X",
            Self::Y => "Y",
        }
    }

    pub(crate) fn from_code(code: &str) -> Option<Self> {
        match code.trim().to_ascii_uppercase().as_str() {
            "Z" => Some(Self::Z),
            "C" => Some(Self::C),
            "T" => Some(Self::T),
            "R" => Some(Self::R),
            "S" => Some(Self::S),
            "I" => Some(Self::I),
            "H" => Some(Self::H),
            "V" => Some(Self::V),
            "B" => Some(Self::B),
            "X" => Some(Self::X),
            "Y" => Some(Self::Y),
            _ => None,
        }
    }

    pub(crate) fn raw(self) -> usize {
        self as usize
    }
}

#[derive(Copy, Clone, Debug, PartialEq, Eq)]
pub(crate) struct Interval {
    pub start: i32,
    pub size: usize,
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub(crate) struct DimBounds {
    intervals: BTreeMap<Dimension, Interval>,
}

impl DimBounds {
    pub(crate) fn get(&self, dimension: Dimension) -> Option<Interval> {
        self.intervals.get(&dimension).copied()
    }

    pub(crate) fn set(&mut self, dimension: Dimension, interval: Interval) {
        self.intervals.insert(dimension, interval);
    }
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub(crate) struct Coordinate {
    values: BTreeMap<Dimension, i32>,
}

impl Coordinate {
    pub(crate) fn new() -> Self {
        Self::default()
    }

    pub(crate) fn set(&mut self, dimension: Dimension, value: i32) {
        self.values.insert(dimension, value);
    }

    pub(crate) fn get(&self, dimension: Dimension) -> Option<i32> {
        self.values.get(&dimension).copied()
    }

    pub(crate) fn iter(&self) -> impl Iterator<Item = (Dimension, i32)> + '_ {
        self.values
            .iter()
            .map(|(dimension, value)| (*dimension, *value))
    }
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub(crate) struct PlaneIndex {
    values: BTreeMap<Dimension, usize>,
}

impl PlaneIndex {
    pub(crate) fn new() -> Self {
        Self::default()
    }

    pub(crate) fn with(mut self, dimension: Dimension, value: usize) -> Self {
        self.values.insert(dimension, value);
        self
    }

    pub(crate) fn get(&self, dimension: Dimension) -> Option<usize> {
        self.values.get(&dimension).copied()
    }
}

#[derive(Copy, Clone, Debug, Default, PartialEq, Eq)]
pub(crate) struct IntRect {
    pub x: i32,
    pub y: i32,
    pub w: i32,
    pub h: i32,
}

impl IntRect {
    pub(crate) fn is_valid(self) -> bool {
        self.w >= 0 && self.h >= 0
    }
}

#[derive(Copy, Clone, Debug, PartialEq, Eq)]
pub(crate) enum PixelType {
    Gray8,
    Gray16,
    Gray32Float,
    Bgr24,
    Bgr48,
    Bgr96Float,
    Bgra32,
    Gray64ComplexFloat,
    Bgr192ComplexFloat,
    Gray32,
    Gray64Float,
}

impl PixelType {
    pub(crate) fn from_raw(value: i32) -> Option<Self> {
        match value {
            0 => Some(Self::Gray8),
            1 => Some(Self::Gray16),
            2 => Some(Self::Gray32Float),
            3 => Some(Self::Bgr24),
            4 => Some(Self::Bgr48),
            8 => Some(Self::Bgr96Float),
            9 => Some(Self::Bgra32),
            10 => Some(Self::Gray64ComplexFloat),
            11 => Some(Self::Bgr192ComplexFloat),
            12 => Some(Self::Gray32),
            13 => Some(Self::Gray64Float),
            _ => None,
        }
    }

    pub(crate) fn from_name(name: &str) -> Option<Self> {
        match name.trim() {
            "Gray8" => Some(Self::Gray8),
            "Gray16" => Some(Self::Gray16),
            "Gray32Float" => Some(Self::Gray32Float),
            "Bgr24" => Some(Self::Bgr24),
            "Bgr48" => Some(Self::Bgr48),
            "Bgr96Float" => Some(Self::Bgr96Float),
            "Bgra32" => Some(Self::Bgra32),
            "Gray64ComplexFloat" => Some(Self::Gray64ComplexFloat),
            "Bgr192ComplexFloat" => Some(Self::Bgr192ComplexFloat),
            "Gray32" => Some(Self::Gray32),
            "Gray64Float" => Some(Self::Gray64Float),
            _ => None,
        }
    }

    pub(crate) fn as_str(self) -> &'static str {
        match self {
            Self::Gray8 => "Gray8",
            Self::Gray16 => "Gray16",
            Self::Gray32Float => "Gray32Float",
            Self::Bgr24 => "Bgr24",
            Self::Bgr48 => "Bgr48",
            Self::Bgr96Float => "Bgr96Float",
            Self::Bgra32 => "Bgra32",
            Self::Gray64ComplexFloat => "Gray64ComplexFloat",
            Self::Bgr192ComplexFloat => "Bgr192ComplexFloat",
            Self::Gray32 => "Gray32",
            Self::Gray64Float => "Gray64Float",
        }
    }

    pub(crate) fn bytes_per_pixel(self) -> usize {
        match self {
            Self::Gray8 => 1,
            Self::Gray16 => 2,
            Self::Gray32Float => 4,
            Self::Bgr24 => 3,
            Self::Bgr48 => 6,
            Self::Bgr96Float => 12,
            Self::Bgra32 => 4,
            Self::Gray64ComplexFloat => 16,
            Self::Bgr192ComplexFloat => 24,
            Self::Gray32 => 4,
            Self::Gray64Float => 8,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct DirectorySubBlockInfo {
    pub pixel_type: PixelType,
    pub coordinate: Coordinate,
}

#[derive(Copy, Clone, Debug, PartialEq, Eq)]
pub(crate) struct BoundingBoxes {
    pub all: IntRect,
    pub layer0: IntRect,
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub(crate) struct SubBlockStatistics {
    pub subblock_count: usize,
    pub dim_bounds: DimBounds,
    pub bounding_box: Option<IntRect>,
    pub bounding_box_layer0: Option<IntRect>,
    pub scene_bounding_boxes: BTreeMap<i32, BoundingBoxes>,
}

#[derive(Clone, Debug, Default, PartialEq)]
pub(crate) struct ScalingInfo {
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub z: Option<f64>,
    pub unit: Option<String>,
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub(crate) struct ChannelInfo {
    pub index: usize,
    pub name: Option<String>,
    pub pixel_type: Option<PixelType>,
    pub color: Option<String>,
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub(crate) struct ImageInfo {
    pub pixel_type: Option<PixelType>,
}

#[derive(Clone, Debug, Default, PartialEq)]
pub(crate) struct MetadataSummary {
    pub image: ImageInfo,
    pub scaling: ScalingInfo,
    pub channels: Vec<ChannelInfo>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SummaryChannel {
    pub index: usize,
    pub name: Option<String>,
    pub color: Option<String>,
    pub pixel_type: Option<String>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct SummaryScaling {
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub z: Option<f64>,
    pub unit: Option<String>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct DatasetSummary {
    pub version_major: u32,
    pub version_minor: u32,
    pub sizes: BTreeMap<String, usize>,
    pub logical_frame_count: usize,
    pub channels: Vec<SummaryChannel>,
    pub pixel_type: Option<String>,
    pub scaling: Option<SummaryScaling>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct Bitmap {
    pub pixel_type: PixelType,
    pub width: u32,
    pub height: u32,
    pub data: Vec<u8>,
}

impl Bitmap {
    pub(crate) fn into_gray_u16(self) -> Result<Vec<u16>> {
        let expected_len = self.width as usize * self.height as usize;
        match self.pixel_type {
            PixelType::Gray8 => Ok(self.data.into_iter().map(u16::from).collect()),
            PixelType::Bgr24 | PixelType::Bgra32 => {
                let channels = self.pixel_type.bytes_per_pixel();
                let mut collapsed = Vec::with_capacity(expected_len);
                for chunk in self.data.chunks_exact(channels) {
                    let sum: u32 = chunk.iter().map(|value| u32::from(*value)).sum();
                    collapsed.push((sum / channels as u32) as u16);
                }
                Ok(collapsed)
            }
            PixelType::Gray16 => self.to_u16_vec(),
            PixelType::Bgr48 => {
                let values = self.to_u16_vec()?;
                let mut collapsed = Vec::with_capacity(expected_len);
                for chunk in values.chunks_exact(3) {
                    let sum: u32 = chunk.iter().map(|value| u32::from(*value)).sum();
                    collapsed.push((sum / 3) as u16);
                }
                Ok(collapsed)
            }
            _ => Err(CziError::unsupported_pixel_type(self.pixel_type.as_str())),
        }
    }

    fn to_u16_vec(&self) -> Result<Vec<u16>> {
        if self.pixel_type.bytes_per_pixel() % 2 != 0 {
            return Err(CziError::unsupported_pixel_type(self.pixel_type.as_str()));
        }

        let mut values = Vec::with_capacity(self.data.len() / 2);
        for chunk in self.data.chunks_exact(2) {
            values.push(u16::from_le_bytes([chunk[0], chunk[1]]));
        }
        Ok(values)
    }
}

pub(crate) fn sizes_from_stats(statistics: &SubBlockStatistics) -> HashMap<String, usize> {
    let mut sizes = HashMap::new();
    for dimension in Dimension::FRAME_ORDER {
        sizes.insert(
            dimension.as_str().to_owned(),
            statistics
                .dim_bounds
                .get(dimension)
                .map(|interval| interval.size)
                .unwrap_or(1),
        );
    }

    let rect = statistics
        .bounding_box_layer0
        .or(statistics.bounding_box)
        .unwrap_or_default();
    sizes.insert(Dimension::X.as_str().to_owned(), rect.w.max(0) as usize);
    sizes.insert(Dimension::Y.as_str().to_owned(), rect.h.max(0) as usize);
    sizes
}
