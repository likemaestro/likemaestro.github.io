import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Home from "./components/Home";

// /tools/* stays reachable by URL for existing links but is not linked from the site; loaded on demand.
const ToolsPage = lazy(() => import("./components/pages/ToolsPage"));
const GaugeTool = lazy(() => import("./components/tools/GaugeTool/GaugeTool"));
const CUTTIA = lazy(() => import("./components/tools/CUTT-IA/CUTT-IA"));
const WorldMap = lazy(() => import("./components/tools/WorldMap/WorldMap"));

const App: React.FC = () => (
  <Suspense fallback={null}>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/publications" element={<Navigate to="/#publications" replace />} />
      <Route path="/tools" element={<ToolsPage />} />
      <Route path="/tools/WorldMap" element={<WorldMap />} />
      <Route path="/tools/gauge-tool" element={<GaugeTool />} />
      <Route path="/tools/cutt-ia" element={<CUTTIA />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
);

export default App;
