use std::fs::File;
use std::path::Path;

use csv::WriterBuilder;

pub fn write_csv(path: &Path, headers: &[&str], rows: &[Vec<String>]) -> Result<(), String> {
    super::export::write_csv_and_xlsx(path, headers, rows)
}

pub fn write_csv_only(path: &Path, headers: &[&str], rows: &[Vec<String>]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let file = File::create(path).map_err(|error| error.to_string())?;
    let mut writer = WriterBuilder::new()
        .has_headers(true)
        .from_writer(file);
    writer
        .write_record(headers)
        .map_err(|error| error.to_string())?;
    for row in rows {
        writer
            .write_record(row)
            .map_err(|error| error.to_string())?;
    }
    writer.flush().map_err(|error| error.to_string())?;
    Ok(())
}

pub fn read_csv(path: &Path) -> Result<(Vec<String>, Vec<Vec<String>>), String> {
    let mut reader = csv::Reader::from_path(path).map_err(|error| error.to_string())?;
    let headers = reader
        .headers()
        .map_err(|error| error.to_string())?
        .iter()
        .map(str::to_string)
        .collect::<Vec<_>>();
    let rows = reader
        .records()
        .map(|record| {
            record
                .map_err(|error| error.to_string())
                .map(|row| row.iter().map(str::to_string).collect())
        })
        .collect::<Result<Vec<_>, _>>()?;
    Ok((headers, rows))
}

pub fn column_index(headers: &[String], name: &str) -> Option<usize> {
    headers.iter().position(|header| header == name)
}

pub fn parse_f64(raw: &str) -> Option<f64> {
    raw.trim().parse::<f64>().ok()
}
