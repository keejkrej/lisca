use crate::error::{CziError, Result};
use crate::types::{ChannelInfo, ImageInfo, MetadataSummary, PixelType, ScalingInfo};

pub(crate) fn parse_metadata_xml(xml: &str) -> Result<MetadataSummary> {
    let doc = roxmltree::Document::parse(xml).map_err(|err| CziError::file_metadata(err.to_string()))?;
    Ok(MetadataSummary {
        image: parse_image_info(&doc),
        scaling: parse_scaling(&doc),
        channels: parse_channels(&doc),
    })
}

fn parse_image_info(doc: &roxmltree::Document<'_>) -> ImageInfo {
    let pixel_type = first_descendant_text(doc, "PixelType").and_then(PixelType::from_name);
    ImageInfo { pixel_type }
}

fn parse_scaling(doc: &roxmltree::Document<'_>) -> ScalingInfo {
    let mut scaling = ScalingInfo::default();
    for distance in doc.descendants().filter(|node| node.has_tag_name("Distance")) {
        let id = distance.attribute("Id").or_else(|| distance.attribute("id"));
        let value = distance
            .descendants()
            .find(|node| node.has_tag_name("Value"))
            .and_then(|node| node.text())
            .and_then(|text| text.trim().parse::<f64>().ok());
        let unit = distance
            .descendants()
            .find(|node| node.has_tag_name("DefaultUnitFormat"))
            .and_then(|node| node.text())
            .or_else(|| {
                distance
                    .descendants()
                    .find(|node| node.has_tag_name("Unit"))
                    .and_then(|node| node.text())
            })
            .map(|text| text.trim().to_owned())
            .filter(|text| !text.is_empty());

        match id.map(|value| value.trim().to_ascii_uppercase()).as_deref() {
            Some("X") => scaling.x = value,
            Some("Y") => scaling.y = value,
            Some("Z") => scaling.z = value,
            _ => {}
        }
        if scaling.unit.is_none() {
            scaling.unit = unit;
        }
    }
    scaling
}

fn parse_channels(doc: &roxmltree::Document<'_>) -> Vec<ChannelInfo> {
    let mut channels = Vec::new();
    for (fallback_index, node) in doc
        .descendants()
        .filter(|node| node.has_tag_name("Channel"))
        .enumerate()
    {
        let index = node
            .attribute("Id")
            .or_else(|| node.attribute("id"))
            .and_then(parse_channel_index)
            .unwrap_or(fallback_index);
        let name = child_text(node, "Name")
            .or_else(|| node.attribute("Name"))
            .map(str::to_owned);
        let color = child_text(node, "Color")
            .or_else(|| child_text(node, "ColorMode"))
            .map(str::to_owned);
        let pixel_type = child_text(node, "PixelType").and_then(PixelType::from_name);

        channels.push(ChannelInfo {
            index,
            name,
            pixel_type,
            color,
        });
    }
    channels.sort_by_key(|channel| channel.index);
    channels
}

fn first_descendant_text<'a>(doc: &'a roxmltree::Document<'a>, tag_name: &str) -> Option<&'a str> {
    doc.descendants()
        .find(|node| node.has_tag_name(tag_name))
        .and_then(|node| node.text())
        .map(str::trim)
        .filter(|text| !text.is_empty())
}

fn child_text<'a>(node: roxmltree::Node<'a, 'a>, tag_name: &str) -> Option<&'a str> {
    node.children()
        .find(|child| child.has_tag_name(tag_name))
        .and_then(|child| child.text())
        .map(str::trim)
        .filter(|text| !text.is_empty())
}

fn parse_channel_index(value: &str) -> Option<usize> {
    value
        .trim()
        .trim_start_matches("Channel:")
        .trim_start_matches("Channel")
        .parse()
        .ok()
}
