import React, { Suspense, lazy, useLayoutEffect, useRef } from "react";
import { Navigate, Route, Routes, useLocation, useNavigationType } from "react-router-dom";
import Home from "./components/Home";

// Tool pages load on demand. scripts/postbuild.js writes a copy of index.html for every page in src/tools/pages.json,
// with that page's title and description, so GitHub Pages answers those URLs with 200 and links preview correctly:
// list a new tool there too.
const ToolsIndex = lazy(() => import("./tools/ToolsIndex"));
const UnitCellDesigner = lazy(() => import("./tools/unit-cell/UnitCellDesigner"));
const Sketchpad = lazy(() => import("./tools/sketchpad/Sketchpad"));
const PropertyMap = lazy(() => import("./tools/property-map/PropertyMap"));
const Vibrometer = lazy(() => import("./tools/vibrometer/Vibrometer"));
const TrussSizing = lazy(() => import("./tools/truss-sizing/TrussSizing"));
const BeamTwist = lazy(() => import("./tools/beam-twist/BeamTwist"));
const SurrogateFrame = lazy(() => import("./tools/surrogate-frame/SurrogateFrame"));
const BuildingChord = lazy(() => import("./tools/building-chord/BuildingChord"));
const EmbodiedCarbon = lazy(() => import("./tools/embodied-carbon/EmbodiedCarbon"));
const Decision = lazy(() => import("./tools/decision/Decision"));
const Gauge = lazy(() => import("./tools/gauge/Gauge"));
const CUTTIA = lazy(() => import("./components/tools/CUTT-IA/CUTT-IA"));
const WorldMap = lazy(() => import("./tools/world-map/WorldMap"));

/** A new page opens at its top; back and forward keep the browser's scroll, and /#section links scroll themselves.
 *  Only a new path counts: the tools rewrite their query string whenever a setting moves. */
const ScrollToTop: React.FC = () => {
  const { pathname, hash } = useLocation(), type = useNavigationType(), last = useRef(pathname);
  useLayoutEffect(() => {
    if (pathname === last.current) return;
    last.current = pathname;
    if (type !== "POP" && !hash) window.scrollTo(0, 0);
  }, [pathname, hash, type]);
  return null;
};

const App: React.FC = () => (
  <Suspense fallback={null}>
    <ScrollToTop />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/publications" element={<Navigate to="/#publications" replace />} />
      <Route path="/tools" element={<ToolsIndex />} />
      <Route path="/tools/unit-cell" element={<UnitCellDesigner />} />
      <Route path="/tools/sketchpad" element={<Sketchpad />} />
      <Route path="/tools/property-map" element={<PropertyMap />} />
      <Route path="/tools/truss-sizing" element={<TrussSizing />} />
      <Route path="/tools/beam-twist" element={<BeamTwist />} />
      <Route path="/tools/surrogate-frame" element={<SurrogateFrame />} />
      <Route path="/tools/building-chord" element={<BuildingChord />} />
      <Route path="/tools/embodied-carbon" element={<EmbodiedCarbon />} />
      <Route path="/tools/decision" element={<Decision />} />
      <Route path="/tools/vibrometer" element={<Vibrometer />} />
      <Route path="/tools/world-map" element={<WorldMap />} />
      <Route path="/tools/gauge" element={<Gauge />} />
      <Route path="/tools/cutt-ia" element={<CUTTIA />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
);

export default App;
