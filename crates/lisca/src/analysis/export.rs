use std::path::{Path, PathBuf};

use rust_xlsxwriter::Workbook;

pub fn parallel_xlsx_path(csv_path: &Path) -> PathBuf {
    csv_path.with_extension("xlsx")
}

pub fn write_csv_and_xlsx(
    path: &Path,
    headers: &[&str],
    rows: &[Vec<String>],
) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let csv_path = path.to_path_buf();
    let xlsx_path = parallel_xlsx_path(path);
    let rows_owned = rows.to_vec();
    let headers_owned: Vec<String> = headers.iter().map(|header| (*header).to_string()).collect();

    let csv_result = std::thread::spawn(move || {
        let header_refs: Vec<&str> = headers_owned.iter().map(|header| header.as_str()).collect();
        super::csv_io::write_csv_only(&csv_path, &header_refs, &rows_owned)
    })
    .join()
    .map_err(|_| "csv writer thread panicked".to_string())?;
    let xlsx_result = write_xlsx(&xlsx_path, headers, rows);

    csv_result?;
    xlsx_result
}

fn write_xlsx(path: &Path, headers: &[&str], rows: &[Vec<String>]) -> Result<(), String> {
    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();
    for (col, header) in headers.iter().enumerate() {
        worksheet
            .write_string(0, col as u16, *header)
            .map_err(|error| error.to_string())?;
    }
    for (row_index, row) in rows.iter().enumerate() {
        let excel_row = (row_index + 1) as u32;
        for (col, value) in row.iter().enumerate() {
            let excel_col = col as u16;
            if value.is_empty() {
                continue;
            }
            if let Ok(number) = value.parse::<f64>() {
                if number.is_finite() {
                    worksheet
                        .write_number(excel_row, excel_col, number)
                        .map_err(|error| error.to_string())?;
                    continue;
                }
            }
            worksheet
                .write_string(excel_row, excel_col, value)
                .map_err(|error| error.to_string())?;
        }
    }
    workbook.save(path).map_err(|error| error.to_string())?;
    Ok(())
}
