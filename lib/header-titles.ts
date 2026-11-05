/** A page's name in AppLayout's header, by path (2026-11-04). AppLayout now lives in app/(site)/layout.tsx and
 *  mounts once, so it reads the title from the path instead of each chart page passing it in. */
export const HEADER_TITLES: Record<string, string> = {
  "/viz/bar-large": "Nuclides | Bar Run",
  "/viz/graph": "Authors | Force Graph",
  "/viz/heatmap": "Nuclides | Heatmap",
  "/viz/matrix": "Measures | Correlation Matrix",
  "/viz/nebula": "Nuclides | Scatter Field",
  "/viz/rainfall": "Papers | Stacked Area",
  "/viz/reactions": "Reactions | Flow Lines",
  "/viz/scatter3d-dataset": "Papers | 3D Dataset Scatter",
  "/viz/scatter3d": "Nuclides | 3D Scatter",
  "/viz/simplex": "Nuclides | Noise Field",
  "/viz/surface": "Nuclides | 3D Surface",
  "/viz/weight": "Papers | Two-Series Scatter",
  "/viz/decay": "Nuclides | Decay Simulation",
}
