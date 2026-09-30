use std::collections::BTreeMap;
use std::path::Path;

use crate::analysis::csv_io::{column_index, parse_f64, read_csv, write_csv};
use crate::analysis::sample::SampleMapping;

pub const CLEAN_THRESHOLD: f64 = 0.8;

#[derive(Debug, Clone)]
struct PredictionRow {
    t: u32,
    crop: u32,
    label: bool,
    pos: u32,
    sample: String,
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
struct CropKey {
    pos: u32,
    sample: String,
    crop: u32,
}

fn parse_label(raw: &str) -> bool {
    matches!(raw.trim().to_lowercase().as_str(), "true" | "1" | "yes")
}

fn load_predictions(path: &Path) -> Result<Vec<PredictionRow>, String> {
    let (headers, rows) = read_csv(path)?;
    let t_index = column_index(&headers, "t").ok_or("missing t column in predictions.csv")?;
    let crop_index =
        column_index(&headers, "crop").ok_or("missing crop column in predictions.csv")?;
    let label_index =
        column_index(&headers, "label").ok_or("missing label column in predictions.csv")?;
    let pos_index = column_index(&headers, "pos").unwrap_or(usize::MAX);
    let sample_index =
        column_index(&headers, "sample").ok_or("missing sample column in predictions.csv")?;

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
        parsed.push(PredictionRow {
            t,
            crop,
            label: parse_label(&row[label_index]),
            pos,
            sample: row[sample_index].clone(),
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
                sample: row.sample.clone(),
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
            .then_with(|| left.sample.cmp(&right.sample))
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
                sample: row.sample.clone(),
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

fn build_kill_curve(death_times: &BTreeMap<CropKey, u32>, sample: &str) -> Vec<(u32, u32)> {
    let sample_deaths: Vec<u32> = death_times
        .iter()
        .filter(|(key, death_time)| key.sample == sample && **death_time > 0)
        .map(|(_, death_time)| *death_time)
        .collect();
    if sample_deaths.is_empty() {
        return Vec::new();
    }

    let max_t = death_times
        .keys()
        .filter(|key| key.sample == sample)
        .flat_map(|key| death_times.get(key).copied())
        .chain(sample_deaths.iter().copied())
        .max()
        .unwrap_or(0);

    (0..=max_t)
        .map(|t| {
            let alive = sample_deaths
                .iter()
                .filter(|death_time| **death_time >= t)
                .count() as u32;
            (t, alive)
        })
        .collect()
}

pub fn run_clean(workspace: &Path, mapping: &SampleMapping) -> Result<(), String> {
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
                row.sample.clone(),
            ]
        })
        .collect::<Vec<_>>();
    write_csv(
        &workspace.join("results/predictions_cleaned.csv"),
        &["t", "crop", "label", "pos", "sample"],
        &cleaned_rows,
    )?;

    let death_rows = death_times
        .iter()
        .map(|(key, death_time)| {
            vec![
                key.crop.to_string(),
                death_time.to_string(),
                key.pos.to_string(),
                key.sample.clone(),
            ]
        })
        .collect::<Vec<_>>();
    write_csv(
        &workspace.join("results/death_times.csv"),
        &["crop", "death_time", "pos", "sample"],
        &death_rows,
    )?;

    let mut curve_rows = Vec::new();
    for sample in mapping {
        for (t, n_alive) in build_kill_curve(&death_times, &sample.name) {
            curve_rows.push(vec![
                t.to_string(),
                n_alive.to_string(),
                sample.name.clone(),
            ]);
        }
    }
    write_csv(
        &workspace.join("results/kill_curve.csv"),
        &["t", "n_alive", "sample"],
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
            sample: "A".to_string(),
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
        assert!(!cleaned[2].label);
        assert!(!cleaned[3].label);
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
            sample: "A".to_string(),
            crop: 1,
        };
        assert_eq!(death_times.get(&key).copied(), Some(2));
    }

    fn crop_traces(crops: &[(u32, u32)]) -> Vec<PredictionRow> {
        let mut rows = Vec::new();
        for &(crop, last_alive_t) in crops {
            for t in 0..=10 {
                rows.push(row(t, crop, t <= last_alive_t));
            }
        }
        rows
    }

    #[test]
    fn polarity_correct_convention_yields_decreasing_kill_curve() {
        let rows = crop_traces(&[(1, 10), (2, 5), (3, 3)]);
        let cleaned = clean_predictions(&rows);
        let death_times = compute_death_times(&cleaned);
        let curve = build_kill_curve(&death_times, "A");
        assert_eq!(
            curve,
            vec![
                (0, 3),
                (1, 3),
                (2, 3),
                (3, 3),
                (4, 2),
                (5, 2),
                (6, 1),
                (7, 1),
                (8, 1),
                (9, 1),
                (10, 1),
            ]
        );
    }

    #[test]
    fn polarity_inverted_convention_all_alive_at_t0_yields_empty_curve() {
        let rows = crop_traces(&[(1, 10), (2, 5), (3, 3)])
            .into_iter()
            .map(|row| PredictionRow {
                label: !row.label,
                ..row
            })
            .collect::<Vec<_>>();
        let cleaned = clean_predictions(&rows);
        let death_times = compute_death_times(&cleaned);
        let curve = build_kill_curve(&death_times, "A");
        assert!(curve.is_empty());
    }

    #[test]
    fn polarity_inverted_convention_with_always_dead_crop_is_silently_wrong() {
        let mut rows = crop_traces(&[(1, 10), (2, 5), (3, 3)])
            .into_iter()
            .map(|row| PredictionRow {
                label: !row.label,
                ..row
            })
            .collect::<Vec<_>>();
        for t in 0..=10 {
            rows.push(row(t, 4, true));
        }
        let cleaned = clean_predictions(&rows);
        let death_times = compute_death_times(&cleaned);
        let curve = build_kill_curve(&death_times, "A");
        let expected: Vec<(u32, u32)> = (0..=10).map(|t| (t, 1)).collect();
        assert_eq!(curve, expected);
    }
}
