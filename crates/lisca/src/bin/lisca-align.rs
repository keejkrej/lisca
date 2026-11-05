//! Automatic micropattern-grid detection ("auto-align") for the Aligner.
//!
//! The Aligner UI derives the pattern lattice from pointer gestures. Agents and
//! scripted runs cannot drive a canvas, so this CLI recovers the same grid from a
//! single frame and optionally persists it exactly like the *Save bbox* action.
//!
//! ```sh
//! lisca-align --workspace WORKSPACE --pos 1
//! lisca-align --workspace WORKSPACE --pos 1 --apply
//! ```
//!
//! Prints JSON: `{ grid, count, confidence, residualPx, islands, csv, saved }`.

use std::env;
use std::path::Path;

use lisca::aligner::{detect_grid_from_source, save_bbox, DetectOptions};
use lisca::protocol::{AlignerSource, AssayData, AssayJsonFile, FrameRequest, SavedAlignState};

fn usage() -> &'static str {
    "usage: lisca-align --workspace DIR --pos N [options]\n\
     \n\
     options:\n\
     --source PATH|DIR   frame source (default: assay.json, else WORKSPACE)\n\
     --channel N         channel index (default 0)\n\
     --time N            timepoint index (default 0)\n\
     --z N               z index (default 0)\n\
     --shape rect|square|hex   force lattice geometry\n\
     --pattern N         pattern box size in pixels (default 0.8 x pitch)\n\
     --min-spacing N     shortest accepted pitch in pixels\n\
     --max-spacing N     longest accepted pitch in pixels\n\
     --apply             write bbox/Pos{N}.csv and align/Pos{N}.json\n\
     -h, --help          show this message"
}

struct Args {
    workspace: String,
    pos: u32,
    source: Option<String>,
    channel: u32,
    time: u32,
    z: u32,
    shape: Option<String>,
    pattern: Option<f64>,
    min_spacing: Option<f64>,
    max_spacing: Option<f64>,
    apply: bool,
}

fn main() {
    if let Err(message) = run(env::args().skip(1).collect()) {
        eprintln!("{message}");
        eprintln!("{}", usage());
        std::process::exit(2);
    }
}

fn run(argv: Vec<String>) -> Result<(), String> {
    if argv.iter().any(|arg| arg == "-h" || arg == "--help") {
        println!("{}", usage());
        return Ok(());
    }
    let args = parse_args(&argv)?;
    let source = resolve_source(&args)?;
    let options = DetectOptions {
        shape: match args.shape.as_deref() {
            None => None,
            Some("rect") => Some(lisca::protocol::AlignGridShape::Rect),
            Some("square") => Some(lisca::protocol::AlignGridShape::Square),
            Some("hex") => Some(lisca::protocol::AlignGridShape::Hex),
            Some(other) => {
                return Err(format!(
                    "--shape must be rect, square, or hex (got {other})"
                ))
            }
        },
        pattern_width: args.pattern,
        pattern_height: args.pattern,
        min_spacing: args.min_spacing,
        max_spacing: args.max_spacing,
    };

    let request = FrameRequest {
        pos: args.pos,
        channel: args.channel,
        time: args.time,
        z: args.z,
    };
    let detection = detect_grid_from_source(source, request, options)?;

    let mut saved = false;
    if args.apply {
        let state = SavedAlignState {
            grid: detection.grid.clone(),
            excluded_patterns: Vec::new(),
            drift: None,
        };
        save_bbox(&args.workspace, args.pos, &detection.csv, &state)?;
        saved = true;
    }

    let report = serde_json::json!({
        "pos": args.pos,
        "grid": detection.grid,
        "count": detection.patterns.len(),
        "islands": detection.islands,
        "confidence": detection.confidence,
        "residualPx": detection.residual_px,
        "saved": saved,
        "csv": detection.csv,
    });
    println!(
        "{}",
        serde_json::to_string_pretty(&report).map_err(|error| error.to_string())?
    );
    Ok(())
}

fn parse_args(argv: &[String]) -> Result<Args, String> {
    let mut workspace = None;
    let mut pos = None;
    let mut args = Args {
        workspace: String::new(),
        pos: 0,
        source: None,
        channel: 0,
        time: 0,
        z: 0,
        shape: None,
        pattern: None,
        min_spacing: None,
        max_spacing: None,
        apply: false,
    };
    let mut index = 0;
    while index < argv.len() {
        let flag = argv[index].as_str();
        let next = |flag: &str| -> Result<String, String> {
            argv.get(index + 1)
                .cloned()
                .ok_or_else(|| format!("{flag} needs a value"))
        };
        match flag {
            "--apply" => args.apply = true,
            "--workspace" => workspace = Some(next(flag)?),
            "--pos" => pos = Some(parse_u32(&next(flag)?, flag)?),
            "--source" => args.source = Some(next(flag)?),
            "--channel" => args.channel = parse_u32(&next(flag)?, flag)?,
            "--time" => args.time = parse_u32(&next(flag)?, flag)?,
            "--z" => args.z = parse_u32(&next(flag)?, flag)?,
            "--shape" => args.shape = Some(next(flag)?),
            "--pattern" => args.pattern = Some(parse_f64(&next(flag)?, flag)?),
            "--min-spacing" => args.min_spacing = Some(parse_f64(&next(flag)?, flag)?),
            "--max-spacing" => args.max_spacing = Some(parse_f64(&next(flag)?, flag)?),
            other => return Err(format!("unknown argument {other}")),
        }
        index += if matches!(flag, "--apply") { 1 } else { 2 };
    }
    args.workspace = workspace.ok_or_else(|| "--workspace is required".to_string())?;
    args.pos = pos.ok_or_else(|| "--pos is required".to_string())?;
    Ok(args)
}

fn parse_u32(value: &str, flag: &str) -> Result<u32, String> {
    value
        .parse()
        .map_err(|_| format!("{flag} expects a non-negative integer (got {value})"))
}

fn parse_f64(value: &str, flag: &str) -> Result<f64, String> {
    value
        .parse()
        .map_err(|_| format!("{flag} expects a number (got {value})"))
}

/// Resolve the frame source: explicit path, else assay.json (falling back to the
/// workspace folder when the recorded path was moved to another machine).
fn resolve_source(args: &Args) -> Result<AlignerSource, String> {
    if let Some(source) = &args.source {
        return source_from_path(source);
    }
    let assay_path = Path::new(&args.workspace).join("assay.json");
    if let Ok(contents) = std::fs::read_to_string(&assay_path) {
        // Older workspaces can carry an assay type this build no longer knows
        // (e.g. `killing`); the frames still sit next to assay.json, so fall back.
        let assay: AssayJsonFile = match serde_json::from_str(&contents) {
            Ok(assay) => assay,
            Err(_) => {
                return folder_source(
                    args.workspace.clone(),
                    "Pos{p}".to_string(),
                    "img_channel{c}_position{p}_time{t}_z{z}.tif".to_string(),
                )
            }
        };
        let data_path_exists = match &assay.data {
            AssayData::Folder { path, .. } | AssayData::Nd2 { path } | AssayData::Czi { path } => {
                Path::new(path).exists()
            }
        };
        if data_path_exists {
            return match assay.data {
                AssayData::Folder { path, template } => Ok(AlignerSource::Folder {
                    path,
                    subfolder_template: template.subfolder,
                    filename_template: template.filename,
                }),
                AssayData::Nd2 { path } => Ok(AlignerSource::Nd2 { path }),
                AssayData::Czi { path } => Ok(AlignerSource::Czi { path }),
            };
        }
        // The workspace was copied or moved: the frames sit next to assay.json.
        if let AssayData::Folder { template, .. } = assay.data {
            return folder_source(
                args.workspace.clone(),
                template.subfolder,
                template.filename,
            );
        }
    }
    err(
        Path::new(&args.workspace).is_dir(),
        "--workspace is not a directory",
    )?;
    folder_source(
        args.workspace.clone(),
        "Pos{p}".to_string(),
        "img_channel{c}_position{p}_time{t}_z{z}.tif".to_string(),
    )
}

fn source_from_path(source: &str) -> Result<AlignerSource, String> {
    let path = Path::new(source);
    let meta = std::fs::metadata(path)
        .map_err(|error| format!("cannot access --source {source}: {error}"))?;
    if meta.is_dir() {
        return folder_source(
            source.to_string(),
            "Pos{p}".to_string(),
            "img_channel{c}_position{p}_time{t}_z{z}.tif".to_string(),
        );
    }
    let lower = source.to_ascii_lowercase();
    if lower.ends_with(".nd2") {
        Ok(AlignerSource::Nd2 {
            path: source.to_string(),
        })
    } else if lower.ends_with(".czi") {
        Ok(AlignerSource::Czi {
            path: source.to_string(),
        })
    } else {
        Err(format!(
            "unsupported --source (use .nd2, .czi, or a folder of frames): {source}"
        ))
    }
}

fn folder_source(
    path: String,
    subfolder_template: String,
    filename_template: String,
) -> Result<AlignerSource, String> {
    err(
        Path::new(&path).is_dir(),
        &format!("folder source is not a directory: {path}"),
    )?;
    Ok(AlignerSource::Folder {
        path,
        subfolder_template,
        filename_template,
    })
}

fn err(condition: bool, message: &str) -> Result<(), String> {
    if condition {
        Ok(())
    } else {
        Err(message.to_string())
    }
}
