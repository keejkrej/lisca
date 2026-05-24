export const ReactivityKeys = {
  scanSource: (key: string) => ["scan-source", key] as const,
  roiWorkspace: (path: string) => ["roi-workspace", path] as const,
  annotationLabels: (path: string) => ["annotation-labels", path] as const,
  savedBboxPositions: (path: string) => ["saved-bbox-positions", path] as const,
  analysisResults: (path: string) => ["analysis-results", path] as const,
  analysisCsv: (path: string, filePath: string) => ["analysis-csv", path, filePath] as const,
  analysisPanels: (path: string, filePath: string, scale: number, labelsKey: string) =>
    ["analysis-panels", path, filePath, scale, labelsKey] as const,
} as const;
