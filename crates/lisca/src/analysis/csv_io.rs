use std::path::Path;

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
