use lisca::viewer::profiler::{
    infer_viewer_source, profile_crop, render_text_report, CropProfileOptions,
};

#[derive(Clone, Debug, Eq, PartialEq)]
struct CliArgs {
    source: String,
    workspace: String,
    pos: u32,
    plane_offset: usize,
    batch: usize,
    output_root: String,
    json: bool,
}

fn main() {
    let args = match parse_args(std::env::args().skip(1)) {
        Ok(Some(args)) => args,
        Ok(None) => {
            println!("{}", usage());
            return;
        }
        Err(error) => {
            eprintln!("{error}");
            std::process::exit(2);
        }
    };

    let source = match infer_viewer_source(&args.source) {
        Ok(source) => source,
        Err(error) => {
            eprintln!("{error}");
            std::process::exit(2);
        }
    };

    let report = match profile_crop(CropProfileOptions {
        workspace_path: args.workspace,
        source,
        pos: args.pos,
        plane_offset: args.plane_offset,
        batch_planes: args.batch,
        output_root: args.output_root,
    }) {
        Ok(report) => report,
        Err(error) => {
            eprintln!("{error}");
            std::process::exit(1);
        }
    };

    if args.json {
        println!(
            "{}",
            serde_json::to_string_pretty(&report).expect("serialize crop profile")
        );
    } else {
        print!("{}", render_text_report(&report));
    }
}

fn parse_args<I>(args: I) -> Result<Option<CliArgs>, String>
where
    I: IntoIterator<Item = String>,
{
    let mut source = None;
    let mut workspace = None;
    let mut pos = None;
    let mut plane_offset = None;
    let mut batch = None;
    let mut output_root = None;
    let mut json = false;

    let mut args = args.into_iter();
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--source" => source = Some(next_value(&mut args, "--source")?),
            "--workspace" => workspace = Some(next_value(&mut args, "--workspace")?),
            "--pos" => {
                let value = next_value(&mut args, "--pos")?;
                pos = Some(
                    value
                        .parse()
                        .map_err(|_| format!("Invalid --pos '{value}'"))?,
                );
            }
            "--plane-offset" => {
                let value = next_value(&mut args, "--plane-offset")?;
                plane_offset = Some(
                    value
                        .parse()
                        .map_err(|_| format!("Invalid --plane-offset '{value}'"))?,
                );
            }
            "--batch" => {
                let value = next_value(&mut args, "--batch")?;
                batch = Some(
                    value
                        .parse()
                        .map_err(|_| format!("Invalid --batch '{value}'"))?,
                );
            }
            "--output-root" => output_root = Some(next_value(&mut args, "--output-root")?),
            "--json" => json = true,
            "--help" | "-h" => return Ok(None),
            _ => return Err(format!("Unknown argument '{arg}'\n\n{}", usage())),
        }
    }

    Ok(Some(CliArgs {
        source: source.ok_or_else(|| format!("Missing required --source\n\n{}", usage()))?,
        workspace: workspace
            .ok_or_else(|| format!("Missing required --workspace\n\n{}", usage()))?,
        pos: pos.ok_or_else(|| format!("Missing required --pos\n\n{}", usage()))?,
        plane_offset: plane_offset
            .ok_or_else(|| format!("Missing required --plane-offset\n\n{}", usage()))?,
        batch: batch.ok_or_else(|| format!("Missing required --batch\n\n{}", usage()))?,
        output_root: output_root
            .ok_or_else(|| format!("Missing required --output-root\n\n{}", usage()))?,
        json,
    }))
}

fn next_value<I>(args: &mut I, flag: &str) -> Result<String, String>
where
    I: Iterator<Item = String>,
{
    args.next()
        .ok_or_else(|| format!("Missing value for {flag}\n\n{}", usage()))
}

fn usage() -> String {
    [
        "Usage:",
        "  cargo run -p lisca --bin crop-profiler -- --source <PATH> --workspace <DIR> --pos <N> --plane-offset <N> --batch <N> --output-root <DIR> [--json]",
        "",
        "Examples:",
        "  cargo run -p lisca --bin crop-profiler -- --source C:\\data\\input.nd2 --workspace C:\\data\\ws --pos 7 --plane-offset 0 --batch 50 --output-root D:\\scratch\\crop-profile",
        "  cargo run -p lisca --bin crop-profiler -- --source C:\\data\\source_tifs --workspace C:\\data\\ws --pos 2 --plane-offset 10 --batch 12 --output-root D:\\scratch\\crop-profile --json",
    ]
    .join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_args_applies_defaults() {
        let args = parse_args([
            "--source".to_string(),
            "input.nd2".to_string(),
            "--workspace".to_string(),
            "ws".to_string(),
            "--pos".to_string(),
            "7".to_string(),
            "--plane-offset".to_string(),
            "0".to_string(),
            "--batch".to_string(),
            "12".to_string(),
            "--output-root".to_string(),
            "D:\\scratch\\crop-profile".to_string(),
        ])
        .expect("parse args");

        assert_eq!(
            args,
            Some(CliArgs {
                source: "input.nd2".to_string(),
                workspace: "ws".to_string(),
                pos: 7,
                plane_offset: 0,
                batch: 12,
                output_root: "D:\\scratch\\crop-profile".to_string(),
                json: false,
            })
        );
    }

    #[test]
    fn parse_args_accepts_json_flag() {
        let args = parse_args([
            "--source".to_string(),
            "input.nd2".to_string(),
            "--workspace".to_string(),
            "ws".to_string(),
            "--pos".to_string(),
            "7".to_string(),
            "--plane-offset".to_string(),
            "0".to_string(),
            "--batch".to_string(),
            "5".to_string(),
            "--output-root".to_string(),
            "D:\\scratch\\crop-profile".to_string(),
            "--json".to_string(),
        ])
        .expect("parse args");

        assert_eq!(
            args,
            Some(CliArgs {
                source: "input.nd2".to_string(),
                workspace: "ws".to_string(),
                pos: 7,
                plane_offset: 0,
                batch: 5,
                output_root: "D:\\scratch\\crop-profile".to_string(),
                json: true,
            })
        );
    }

    #[test]
    fn parse_args_requires_explicit_output_root() {
        let args = parse_args([
            "--source".to_string(),
            "input.nd2".to_string(),
            "--workspace".to_string(),
            "ws".to_string(),
            "--pos".to_string(),
            "7".to_string(),
            "--plane-offset".to_string(),
            "0".to_string(),
            "--batch".to_string(),
            "5".to_string(),
        ])
        .expect_err("missing output-root should fail");

        assert!(args.contains("Missing required --output-root"));
    }

    #[test]
    fn parse_args_requires_explicit_batch_size() {
        let args = parse_args([
            "--source".to_string(),
            "input.nd2".to_string(),
            "--workspace".to_string(),
            "ws".to_string(),
            "--pos".to_string(),
            "7".to_string(),
            "--plane-offset".to_string(),
            "0".to_string(),
            "--output-root".to_string(),
            "D:\\scratch\\crop-profile".to_string(),
        ])
        .expect_err("missing batch should fail");

        assert!(args.contains("Missing required --batch"));
    }

    #[test]
    fn parse_args_returns_none_for_help() {
        let args = parse_args(["--help".to_string()]).expect("parse help");

        assert_eq!(args, None);
    }

    #[test]
    fn parse_args_rejects_unknown_argument() {
        let error = parse_args([
            "--source".to_string(),
            "input.nd2".to_string(),
            "--workspace".to_string(),
            "ws".to_string(),
            "--pos".to_string(),
            "7".to_string(),
            "--bogus".to_string(),
        ])
        .expect_err("unknown argument should fail");

        assert!(error.contains("Unknown argument '--bogus'"));
    }
}
