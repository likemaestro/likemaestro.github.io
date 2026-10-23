import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Home from "./components/Home";

// Tool pages load on demand. scripts/postbuild.js writes a copy of index.html for every page in src/tools/pages.json,
// with that page's title and description, so GitHub Pages answers those URLs with 200 and links preview correctly:
// list a new tool there too.
const ToolsIndex = lazy(() => import("./tools/ToolsIndex"));
const UnitCellDesigner = lazy(() => import("./tools/unit-cell/UnitCellDesigner"));
const Sketchpad = lazy(() => import("./tools/sketchpad/Sketchpad"));
const PropertyMap = lazy(() => import("./tools/property-map/PropertyMap"));
const Vibrometer = lazy(() => import("./tools/vibrometer/Vibrometer"));
const GaugeTool = lazy(() => import("./components/tools/GaugeTool/GaugeTool"));
const CUTTIA = lazy(() => import("./components/tools/CUTT-IA/CUTT-IA"));
const WorldMap = lazy(() => import("./components/tools/WorldMap/WorldMap"));

const App: React.FC = () => (
  <Suspense fallback={null}>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/publications" element={<Navigate to="/#publications" replace />} />
      <Route path="/tools" element={<ToolsIndex />} />
      <Route path="/tools/unit-cell" element={<UnitCellDesigner />} />
      <Route path="/tools/sketchpad" element={<Sketchpad />} />
      <Route path="/tools/property-map" element={<PropertyMap />} />
      <Route path="/tools/vibrometer" element={<Vibrometer />} />
      <Route path="/tools/WorldMap" element={<WorldMap />} />
      <Route path="/tools/gauge-tool" element={<GaugeTool />} />
      <Route path="/tools/cutt-ia" element={<CUTTIA />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
);

export default App;
