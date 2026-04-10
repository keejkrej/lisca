pub mod analyze;
pub mod expression;
pub mod slide;

use clap::{Command, CommandFactory, Parser, Subcommand};

#[derive(Debug, Parser)]
#[command(
    name = "delivery",
    disable_help_subcommand = true,
    arg_required_else_help = true
)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Debug, Subcommand)]
pub enum Commands {
    Analyze(analyze::AnalyzeArgs),
    Slide(slide::SlideArgs),
    Expression(expression::ExpressionArgs),
}

impl Cli {
    pub fn run(self) -> Result<(), String> {
        match self.command {
            Commands::Analyze(args) => analyze::execute(args),
            Commands::Slide(args) => slide::execute(args),
            Commands::Expression(args) => expression::execute(args),
        }
    }
}

pub fn build_cli() -> Command {
    Cli::command()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn analyze_help_is_exposed() {
        let output = build_cli().render_long_help().to_string();
        assert!(output.contains("delivery"));
    }
}
