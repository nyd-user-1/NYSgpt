// The twelve /viz charts by slug (2026-11-04): each chart's name, now that the chart pages are bare, for
// its data table's page (/viz/data/<slug>) — a click on any chart opens that table in the second panel.
// The rows themselves load in the browser from the committed snapshot (components/viz/DataTable.tsx).

export const VIZ_TABLES: Record<string, { title: string }> = {
  "bar-large": { title: "Half-lives, longest first" },
  graph: { title: "Decay links" },
  heatmap: { title: "Half-lives by N and Z" },
  matrix: { title: "Correlations across nine nuclide measures" },
  nebula: { title: "Binding energy per nucleon" },
  "nuclide-card": { title: "Nuclide properties" },
  rainfall: { title: "Nuclides per mass number, by decay mode" },
  reactions: { title: "Decay series steps" },
  separation: { title: "Neutron separation energies" },
  "scatter3d-dataset": { title: "EXFOR measurements" },
  scatter3d: { title: "E(2⁺), B(E2) and Z" },
  simplex: { title: "Capture γ lines" },
  spectra: { title: "Capture γ lines" },
  "gamma-atlas": { title: "Capture γ atlas" },
  "gamma-punchcard": { title: "Capture γ by element" },
  decay2: { title: "Ground-state decays" },
  surface: { title: "Binding energy per nucleon" },
  weight: { title: "E(2⁺) and B(E2), even-even nuclides" },
  "first-excited": { title: "First 2⁺ energies, even-even nuclides" },
  "level-spans": { title: "Level spans per nuclide" },
  "level-candles": { title: "Level energies per nuclide" },
}
