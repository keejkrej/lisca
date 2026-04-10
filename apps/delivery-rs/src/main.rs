use clap::Parser;

fn main() {
    let cli = delivery_rs::Cli::parse();
    if let Err(error) = cli.run() {
        eprintln!("{error}");
        std::process::exit(1);
    }
}
