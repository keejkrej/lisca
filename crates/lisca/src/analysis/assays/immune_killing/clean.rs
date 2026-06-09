use std::collections::BTreeMap;
use std::path::Path;

use crate::analysis::csv_io::{column_index, parse_f64, read_csv, write_csv};
use crate::analysis::slide::SlideMapping;

pub const CLEAN_THRESHOLD: f64 = 0.8;

#[derive(Debug, Clone)]
struct PredictionRow {
    t: u32,
    crop: u32,
    label: bool,
    pos: u32,
    slide_channel: u32,
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
struct CropKey {
    pos: u32,
    slide_channel: u32,
    crop: u32,
}

fn parse_label(raw: &str) -> bool {
    matches!(raw.trim().to_lowercase().as_str(), "true" | "1" | "yes")
}

fn load_predictions(path: &Path) -> Result<Vec<PredictionRow>, String> {
    let (headers, rows) = read_csv(path)?;
    let t_index = column_index(&headers, "t").ok_or("missing t column in predictions.csv")?;
    let crop_index = column_index(&headers, "crop").ok_or("missing crop column in predictions.csv")?;
    let label_index =
        column_index(&headers, "label").ok_or("missing label column in predictions.csv")?;
    let pos_index = column_index(&headers, "pos").unwrap_or(usize::MAX);
    let slide_channel_index = column_index(&headers, "slide_channel").unwrap_or(usize::MAX);

    let mut parsed = Vec::with_capacity(rows.len());
    for row in rows {
        let t = parse_f64(&row[t_index])
            .and_then(|value| u32::try_from(value as u64).ok())
            .ok_or_else(|| format!("invalid t value: {}", row[t_index]))?;
        let crop = parse_f64(&row[crop_index])
            .and_then(|value| u32::try_from(value as u64).ok())
            .ok_or_else(|| format!("invalid crop value: {}", row[crop_index]))?;
        let pos = if pos_index == usize::MAX {
            0
        } else {
            parse_f64(&row[pos_index])
                .and_then(|value| u32::try_from(value as u64).ok())
                .unwrap_or(0)
        };
        let slide_channel = if slide_channel_index == usize::MAX {
            0
        } else {
            parse_f64(&row[slide_channel_index])
                .and_then(|value| u32::try_from(value as u64).ok())
                .unwrap_or(0)
        };
        parsed.push(PredictionRow {
            t,
            crop,
            label: parse_label(&row[label_index]),
            pos,
            slide_channel,
        });
    }
    Ok(parsed)
}

fn clean_predictions(rows: &[PredictionRow]) -> Vec<PredictionRow> {
    let mut grouped: BTreeMap<CropKey, Vec<PredictionRow>> = BTreeMap::new();
    for row in rows {
        grouped
            .entry(CropKey {
                pos: row.pos,
                slide_channel: row.slide_channel,
                crop: row.crop,
            })
            .or_default()
            .push(row.clone());
    }

    let mut cleaned = Vec::with_capacity(rows.len());
    for mut group in grouped.into_values() {
        group.sort_by_key(|row| row.t);
        let mut seen_false = false;
        for row in group {
            if !row.label {
                seen_false = true;
                cleaned.push(row);
            } else if seen_false {
                cleaned.push(PredictionRow {
                    label: false,
                    ..row
                });
            } else {
                cleaned.push(row);
            }
        }
    }
    cleaned.sort_by(|left, right| {
        left.pos
            .cmp(&right.pos)
            .then_with(|| left.slide_channel.cmp(&right.slide_channel))
            .then_with(|| left.crop.cmp(&right.crop))
            .then_with(|| left.t.cmp(&right.t))
    });
    cleaned
}

fn compute_death_times(rows: &[PredictionRow]) -> BTreeMap<CropKey, u32> {
    let mut grouped: BTreeMap<CropKey, Vec<PredictionRow>> = BTreeMap::new();
    for row in rows {
        grouped
            .entry(CropKey {
                pos: row.pos,
                slide_channel: row.slide_channel,
                crop: row.crop,
            })
            .or_default()
            .push(row.clone());
    }

    let mut death_times = BTreeMap::new();
    for (key, mut group) in grouped {
        group.sort_by_key(|row| row.t);
        let t_min = group.first().map(|row| row.t).unwrap_or(0);
        let true_ts = group
            .iter()
            .filter(|row| row.label)
            .map(|row| row.t)
            .collect::<Vec<_>>();
        if true_ts.is_empty() {
            death_times.insert(key, 0);
            continue;
        }

        let mut chosen_end = None;
        for end in true_ts.iter().rev() {
            let span: Vec<_> = group
                .iter()
                .filter(|row| row.t >= t_min && row.t <= *end)
                .collect();
            let n_true = span.iter().filter(|row| row.label).count();
            if !span.is_empty() && (n_true as f64 / span.len() as f64) >= CLEAN_THRESHOLD {
                chosen_end = Some(*end);
                break;
            }
        }
        let chosen_end = chosen_end.unwrap_or(true_ts[0]);
        let span_duration = chosen_end.saturating_sub(t_min) + 1;
        death_times.insert(key, if span_duration == 1 { 0 } else { chosen_end });
    }
    death_times
}

fn build_kill_curve(
    death_times: &BTreeMap<CropKey, u32>,
    slide_channel: u32,
) -> Vec<(u32, u32)> {
    let channel_deaths: Vec<u32> = death_times
        .iter()
        .filter(|(key, death_time)| key.slide_channel == slide_channel && **death_time > 0)
        .map(|(_, death_time)| *death_time)
        .collect();
    if channel_deaths.is_empty() {
        return Vec::new();
    }

    let max_t = death_times
        .keys()
        .filter(|key| key.slide_channel == slide_channel)
        .flat_map(|key| death_times.get(key).copied())
        .chain(channel_deaths.iter().copied())
        .max()
        .unwrap_or(0);

    (0..=max_t)
        .map(|t| {
            let alive = channel_deaths.iter().filter(|death_time| **death_time >= t).count() as u32;
            (t, alive)
        })
        .collect()
}

pub fn run_clean(workspace: &Path, mapping: &SlideMapping) -> Result<(), String> {
    let predictions_path = workspace.join("results/predictions.csv");
    let rows = load_predictions(&predictions_path)?;
    let cleaned = clean_predictions(&rows);
    let death_times = compute_death_times(&cleaned);

    let cleaned_rows = cleaned
        .iter()
        .map(|row| {
            vec![
                row.t.to_string(),
                row.crop.to_string(),
                row.label.to_string().to_lowercase(),
                row.pos.to_string(),
                row.slide_channel.to_string(),
            ]
        })
        .collect::<Vec<_>>();
    write_csv(
        &workspace.join("results/predictions_cleaned.csv"),
        &["t", "crop", "label", "pos", "slide_channel"],
        &cleaned_rows,
    )?;

    let death_rows = death_times
        .iter()
        .map(|(key, death_time)| {
            vec![
                key.crop.to_string(),
                death_time.to_string(),
                key.pos.to_string(),
                key.slide_channel.to_string(),
            ]
        })
        .collect::<Vec<_>>();
    write_csv(
        &workspace.join("results/death_times.csv"),
        &["crop", "death_time", "pos", "slide_channel"],
        &death_rows,
    )?;

    let mut curve_rows = Vec::new();
    for slide_channel in mapping.keys() {
        for (t, n_alive) in build_kill_curve(&death_times, *slide_channel) {
            curve_rows.push(vec![
                t.to_string(),
                n_alive.to_string(),
                slide_channel.to_string(),
            ]);
        }
    }
    write_csv(
        &workspace.join("results/kill_curve.csv"),
        &["t", "n_alive", "slide_channel"],
        &curve_rows,
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn row(t: u32, crop: u32, label: bool) -> PredictionRow {
        PredictionRow {
            t,
            crop,
            label,
            pos: 1,
            slide_channel: 0,
        }
    }

    #[test]
    fn clean_enforces_monotonicity() {
        let rows = vec![
            row(0, 1, true),
            row(1, 1, true),
            row(2, 1, false),
            row(3, 1, true),
        ];
        let cleaned = clean_predictions(&rows);
        assert_eq!(cleaned[2].label, false);
        assert_eq!(cleaned[3].label, false);
    }

    #[test]
    fn death_time_uses_clean_threshold() {
        let rows = clean_predictions(&[
            row(0, 1, true),
            row(1, 1, true),
            row(2, 1, true),
            row(3, 1, false),
            row(4, 1, false),
        ]);
        let death_times = compute_death_times(&rows);
        let key = CropKey {
            pos: 1,
            slide_channel: 0,
            crop: 1,
        };
        assert_eq!(death_times.get(&key).copied(), Some(2));
    }
}
