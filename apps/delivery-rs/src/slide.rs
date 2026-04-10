use std::path::{Path, PathBuf};

use clap::Args;
use dialoguer::{theme::ColorfulTheme, Confirm, Input, Select};

use lisca::data::slide::{
    parse_position_spec, resolve_slide_path, write_slide_mapping, SlideMapping,
};

pub const HELP: &str = "Interactively create a slide.json mapping for delivery analysis.";

#[derive(Clone, Debug, Args)]
#[command(about = HELP)]
pub struct SlideArgs {
    #[arg(help = "Workspace used to choose the default output path.")]
    pub workspace: PathBuf,
    #[arg(long, help = "Optional output path. Default: <workspace>/slide.json")]
    pub output: Option<PathBuf>,
}

pub fn next_channel_id(mapping: &SlideMapping) -> u32 {
    let mut next_id = 0;
    while mapping.contains_key(&next_id) {
        next_id += 1;
    }
    next_id
}

pub fn format_positions(positions: &[u32]) -> String {
    positions
        .iter()
        .map(u32::to_string)
        .collect::<Vec<_>>()
        .join(", ")
}

fn render_mapping(mapping: &SlideMapping) {
    eprintln!("Current Slide Mapping");
    eprintln!("{:>14} | {:<40} | {:>5}", "Slide Channel", "Positions", "Count");
    for (channel, positions) in mapping {
        eprintln!(
            "{:>14} | {:<40} | {:>5}",
            channel,
            format_positions(positions),
            positions.len()
        );
    }
}

fn prompt_channel_id(theme: &ColorfulTheme, mapping: &SlideMapping) -> Result<u32, String> {
    loop {
        let channel = Input::<u32>::with_theme(theme)
            .with_prompt("Slide channel ID")
            .default(next_channel_id(mapping))
            .interact_text()
            .map_err(|err| err.to_string())?;
        if mapping.contains_key(&channel) {
            eprintln!("Slide channel {channel} already exists. Remove it first or choose another ID.");
            continue;
        }
        return Ok(channel);
    }
}

fn prompt_positions(theme: &ColorfulTheme) -> Result<Vec<u32>, String> {
    eprintln!(
        "Enter positions using comma-separated integers and Python-style slices, for example: 0,2,6:10,12:19:2"
    );
    loop {
        let spec = Input::<String>::with_theme(theme)
            .with_prompt("Positions")
            .interact_text()
            .map_err(|err| err.to_string())?;
        let positions = match parse_position_spec(&spec) {
            Ok(positions) => positions,
            Err(error) => {
                eprintln!("{error}");
                continue;
            }
        };
        eprintln!(
            "Expanded positions ({}): {}",
            positions.len(),
            format_positions(&positions)
        );
        let confirmed = Confirm::with_theme(theme)
            .with_prompt("Add this group?")
            .default(true)
            .interact()
            .map_err(|err| err.to_string())?;
        if confirmed {
            return Ok(positions);
        }
    }
}

fn prompt_remove_channel(theme: &ColorfulTheme, mapping: &mut SlideMapping) -> Result<(), String> {
    loop {
        let channel = Input::<u32>::with_theme(theme)
            .with_prompt("Remove slide channel ID")
            .interact_text()
            .map_err(|err| err.to_string())?;
        if mapping.remove(&channel).is_some() {
            eprintln!("Removed slide channel {channel}.");
            return Ok(());
        }
        eprintln!("Slide channel {channel} does not exist.");
    }
}

pub fn run_slide_wizard(workspace: &Path, output_path: &Path) -> Result<Option<SlideMapping>, String> {
    let theme = ColorfulTheme::default();
    eprintln!("Delivery Slide Wizard");
    eprintln!("Workspace: {}", workspace.display());
    eprintln!("Output path: {}", output_path.display());
    eprintln!();

    let mut mapping = SlideMapping::new();
    while mapping.is_empty() {
        let channel = prompt_channel_id(&theme, &mapping)?;
        let positions = prompt_positions(&theme)?;
        mapping.insert(channel, positions);
        render_mapping(&mapping);
    }

    loop {
        let actions = ["add", "remove", "save", "cancel"];
        let selected = Select::with_theme(&theme)
            .with_prompt("Next action")
            .items(actions)
            .default(0)
            .interact()
            .map_err(|err| err.to_string())?;
        match actions[selected] {
            "add" => {
                let channel = prompt_channel_id(&theme, &mapping)?;
                let positions = prompt_positions(&theme)?;
                mapping.insert(channel, positions);
                render_mapping(&mapping);
            }
            "remove" => {
                prompt_remove_channel(&theme, &mut mapping)?;
                if mapping.is_empty() {
                    eprintln!("No groups remain. Add a new group.");
                    let channel = prompt_channel_id(&theme, &mapping)?;
                    let positions = prompt_positions(&theme)?;
                    mapping.insert(channel, positions);
                }
                render_mapping(&mapping);
            }
            "save" => return Ok(Some(mapping)),
            "cancel" => return Ok(None),
            _ => unreachable!(),
        }
    }
}

pub fn execute(args: SlideArgs) -> Result<(), String> {
    let output_path = resolve_slide_path(&args.workspace, args.output.as_deref());
    let mapping = run_slide_wizard(&args.workspace, &output_path)?
        .ok_or_else(|| "Aborted without writing slide.json.".to_string())?;

    if output_path.exists() {
        let overwrite = Confirm::with_theme(&ColorfulTheme::default())
            .with_prompt(format!("{} already exists. Overwrite?", output_path.display()))
            .default(false)
            .interact()
            .map_err(|err| err.to_string())?;
        if !overwrite {
            return Err("Aborted without writing slide.json.".to_string());
        }
    }

    let written_path = write_slide_mapping(&mapping, &output_path)?;
    eprintln!("Wrote slide mapping: {}", written_path.display());
    render_mapping(&mapping);
    Ok(())
}
