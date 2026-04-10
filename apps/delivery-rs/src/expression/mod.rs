use crate::analyze;

pub mod auc;
pub mod plot_auc;
pub mod plot_timeseries;
pub mod timeseries;

use clap::{Args, Subcommand};

#[derive(Clone, Debug, Args)]
#[command(arg_required_else_help = true)]
pub struct ExpressionArgs {
    #[command(subcommand)]
    pub command: ExpressionCommands,
}

#[derive(Clone, Debug, Subcommand)]
pub enum ExpressionCommands {
    Analyze(analyze::AnalyzeArgs),
    Auc(auc::AucArgs),
    #[command(name = "plot-auc")]
    PlotAuc(plot_auc::PlotAucArgs),
    #[command(name = "plot-timeseries")]
    PlotTimeseries(plot_timeseries::PlotTimeseriesArgs),
    Timeseries(timeseries::TimeseriesArgs),
}

pub fn execute(args: ExpressionArgs) -> Result<(), String> {
    match args.command {
        ExpressionCommands::Analyze(args) => analyze::execute(args),
        ExpressionCommands::Auc(args) => auc::execute(args),
        ExpressionCommands::PlotAuc(args) => plot_auc::execute(args),
        ExpressionCommands::PlotTimeseries(args) => plot_timeseries::execute(args),
        ExpressionCommands::Timeseries(args) => timeseries::execute(args),
    }
}
