use std::path::Path;

use rust_xlsxwriter::Workbook;

pub fn write_xlsx_only(path: &Path, headers: &[&str], rows: &[Vec<String>]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
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
