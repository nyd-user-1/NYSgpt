// The twelve /viz charts by slug (2026-11-04): each chart's name, now that the chart pages are bare, for
// its data table's page (/viz/data/<slug>) — a click on any chart opens that table in the second panel.
// The rows themselves load in the browser from the committed snapshot (components/viz/DataTable.tsx).

export const VIZ_TABLES: Record<string, { title: string }> = {
  "bar-large": { title: "Every nuclide, ranked" },
  graph: { title: "The collaboration web" },
  heatmap: { title: "The nuclide heatmap" },
  matrix: { title: "The measure matrix" },
  nebula: { title: "The nuclide nebula" },
  rainfall: { title: "The rainfall and the river" },
  reactions: { title: "The reaction transit map" },
  "scatter3d-dataset": { title: "Ten thousand papers in three measures" },
  scatter3d: { title: "The nuclide field, lifted" },
  simplex: { title: "Literature smoke" },
  surface: { title: "The literature landscape" },
  weight: { title: "Two populations of papers" },
}
