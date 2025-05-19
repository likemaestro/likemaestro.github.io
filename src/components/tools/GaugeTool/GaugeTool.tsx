import React, { useEffect, useRef, useState, useCallback } from "react";
import BackButton from "../../common/BackButton"; // Adjusted import path

// All the existing colorGradients code and other utility functions remain unchanged

const colorGradients = {
  rdylgn: {
    name: "Green-Yellow-Red",
    colors: [
      "#006837",
      "#1A9850",
      "#66BD63",
      "#A6D96A",
      "#D9EF8B",
      "#FFFFBF",
      "#FEE08B",
      "#FDAE61",
      "#F46D43",
      "#D73027",
      "#A50026",
    ],
    reversed: true,
  },
  blues: {
    name: "Purple to Blue",
    colors: [
      "#4A0374",
      "#5E02A3",
      "#7209B7",
      "#560BAD",
      "#480CA8",
      "#3A0CA3",
      "#3F37C9",
      "#4361EE",
      "#4895EF",
      "#4CC9F0",
    ],
    reversed: false,
  },
};

const toRad = (deg: number) => (deg * Math.PI) / 180;
const polarToCartesian = (cx: number, cy: number, r: number, ang: number) => {
  const a = toRad(ang);
  return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) };
};

const describeArcPath = (
  cx: number,
  cy: number,
  r: number,
  startAng: number,
  endAng: number
) => {
  const p1 = polarToCartesian(cx, cy, r, endAng);
  const p2 = polarToCartesian(cx, cy, r, startAng);
  const laf = endAng - startAng <= 180 ? "0" : "1";
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${laf} 0 ${p2.x} ${p2.y}`;
};

interface GaugeArcProps {
  cx: number;
  cy: number;
  radius: number;
  startAngle: number;
  endAngle: number;
  stroke: string;
  strokeWidth: number;
}

const GaugeArc: React.FC<GaugeArcProps> = React.memo(
  ({ cx, cy, radius, startAngle, endAngle, stroke, strokeWidth }) => {
    const d = describeArcPath(cx, cy, radius, startAngle, endAngle);
    return (
      <path
        d={d}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
      />
    );
  }
);

interface GaugeNeedleProps {
  cx: number;
  cy: number;
  value: number;
  maxValue: number;
  theta1: number;
  theta2: number;
  needleLength: number;
  needleWidth: number;
  gaugeSize: number; // Added gaugeSize prop
}

const GaugeNeedle: React.FC<GaugeNeedleProps> = React.memo(
  ({
    cx,
    cy,
    value,
    maxValue,
    theta1,
    theta2,
    needleLength,
    needleWidth,
    gaugeSize,
  }) => {
    // Added gaugeSize to destructuring
    const norm = Math.max(0, Math.min(1, value / maxValue));
    const needleStartOffset = 0.04;
    const angle = toRad(
      theta2 +
        needleStartOffset * (theta1 - theta2) +
        norm * (1 - 2 * needleStartOffset) * (theta1 - theta2)
    );
    const dx = needleLength * Math.cos(angle);
    const dy = -needleLength * Math.sin(angle);
    const perpAngle = angle + Math.PI / 2;
    const dxp = (needleWidth / 2) * Math.cos(perpAngle);
    const dyp = -(needleWidth / 2) * Math.sin(perpAngle);
    const needlePath = [
      `M ${cx - dxp} ${cy - dyp}`,
      `L ${cx + dxp} ${cy + dyp}`,
      `L ${cx + dx} ${cy + dy}`,
      `Z`,
    ].join(" ");

    return (
      <>
        <path
          d={needlePath}
          fill="black"
          stroke="black"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <circle
          cx={cx}
          cy={cy}
          r={0.02 * gaugeSize} // Changed from 0.02 * 300 to use gaugeSize
          fill="gray"
          stroke="black"
          strokeWidth="1"
        />
      </>
    );
  }
);

interface GaugeTextProps {
  cx: number;
  title: string;
  unitLabel: string;
  size: number;
}

const GaugeText: React.FC<GaugeTextProps> = React.memo(
  ({ cx, title, unitLabel, size }) => {
    const lines = title.split(/\r?\n/);
    const lineCount = lines.length;
    const textYBase = 0.6 * size;
    const unitY = textYBase + lineCount * (textYBase / 15) + 10;

    return (
      <>
        <text
          x={cx}
          y={textYBase}
          textAnchor="middle"
          fontSize="18px"
          fontWeight="800"
        >
          {lines.map((line, i) => (
            <tspan key={i} x={cx} dy={i === 0 ? "0" : "1.2em"}>
              {line}
            </tspan>
          ))}
        </text>
        <text x={cx} y={unitY} textAnchor="middle" fontSize="14px">
          {unitLabel}
        </text>
      </>
    );
  }
);

function GaugeTool() {
  const [value, setValue] = useState(20);
  const [title, setTitle] = useState("Carbon\nFootprint");
  const [unitLabel, setUnitLabel] = useState("(tonnes CO₂e)");
  const [gradientType, setGradientType] =
    useState<keyof typeof colorGradients>("rdylgn");
  const [reverseGradient, setReverseGradient] = useState(false);
  const thickness = 25; // Consider making this proportional to gaugeSize if desired
  const maxValue = 100;
  const gaugeSize = 320; // Changed from 450 to 320 to match max-w-xs
  const cx = gaugeSize / 2;
  const cy = gaugeSize / 2;
  const radius = (0.85 * gaugeSize) / 2 - thickness / 2;
  const numSegments = 150;
  const theta1 = -60;
  const theta2 = 240;

  const getColorForPosition = useCallback(
    (pos: number) => {
      const gradient = colorGradients[gradientType];
      if (!gradient) return "#cccccc";
      const colors = gradient.colors;
      const defaultReverse = gradient.reversed || false;
      const shouldReverse = reverseGradient ? !defaultReverse : defaultReverse;
      const adjustedPos = shouldReverse ? 1 - pos : pos;
      const idx = Math.min(
        Math.floor(adjustedPos * (colors.length - 1)),
        colors.length - 2
      );
      const t = adjustedPos * (colors.length - 1) - idx;
      const color1 = colors[idx];
      const color2 = colors[idx + 1];
      const c1 = parseInt(color1.slice(1), 16);
      const c2 = parseInt(color2.slice(1), 16);
      const r = Math.round((c1 >> 16) * (1 - t) + (c2 >> 16) * t);
      const g = Math.round(
        ((c1 >> 8) & 0xff) * (1 - t) + ((c2 >> 8) & 0xff) * t
      );
      const b = Math.round((c1 & 0xff) * (1 - t) + (c2 & 0xff) * t);
      return `rgb(${r},${g},${b})`;
    },
    [gradientType, reverseGradient]
  );

  const gaugeArcs = Array.from({ length: numSegments }).map((_, i) => {
    const t1 = theta1 + (theta2 - theta1) * (i / (numSegments - 1));
    const t2 = theta1 + (theta2 - theta1) * ((i + 1) / (numSegments - 1));
    const position = i / (numSegments - 1);
    return (
      <GaugeArc
        key={i}
        cx={cx}
        cy={cy}
        radius={radius}
        startAngle={t1}
        endAngle={t2}
        stroke={getColorForPosition(position)}
        strokeWidth={thickness}
      />
    );
  });

  const svgRef = useRef<SVGSVGElement | null>(null);

  const handleDownloadSVG = () => {
    const svgElement = svgRef.current;
    if (!svgElement) return;

    const tempSvg = svgElement.cloneNode(true) as SVGSVGElement;
    const styleEl = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "style"
    );
    tempSvg.insertBefore(styleEl, tempSvg.firstChild);

    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(tempSvg);
    if (!svgString.match(/^<\?xml/)) {
      svgString =
        `<?xml version='1.0' encoding='UTF-8' standalone=\'no'?>\n` + svgString;
    }
    if (!svgString.match(/xmlns=".*?"/)) {
      svgString = svgString.replace(
        "<svg",
        '<svg xmlns="http://www.w3.org/2000/svg"'
      );
    }

    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const gradientName = colorGradients[gradientType].name.replace(/\s+/g, "_");
    const reversedText = reverseGradient ? "_reversed" : "";
    const titleText = title
      .replace(/\r?\n/g, "_")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "_");
    const filename = `${titleText}_${value}pct_${gradientName}${reversedText}.svg`;
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const styles = {
    container: {
      fontFamily: "Arial, sans-serif",
      margin: 0,
      maxWidth: 950,
      width: "100%",
      boxSizing: "border-box" as "border-box",
      display: "flex",
      flexDirection: "column" as "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 24,
      minHeight: 500,
      padding: 24,
    },
    panel: {
      width: "100%",
      maxWidth: 700,
      background: "#fff",
      borderRadius: 12,
      boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
      padding: 32,
      display: "flex",
      flexDirection: "row" as "row",
      alignItems: "flex-start",
      justifyContent: "center",
      gap: 32,
    },
    settingsSection: {
      flex: 1,
      minWidth: 260,
      display: "flex",
      flexDirection: "column" as "column",
      alignItems: "flex-start",
      justifyContent: "flex-start",
    },
    previewSection: {
      flex: 1,
      minWidth: 260,
      display: "flex",
      flexDirection: "column" as "column",
      alignItems: "center",
      justifyContent: "flex-start",
    },
    heading: {
      fontSize: 20,
      fontWeight: 600,
      color: "#222",
      marginBottom: 18,
      borderBottom: "1px solid #eee",
      paddingBottom: 6,
      letterSpacing: 0.5,
      width: "100%",
    },
    form: {
      width: "100%",
      display: "flex",
      flexDirection: "column" as "column",
      gap: 14,
    },
    label: { fontWeight: 600, color: "#333", fontSize: 15 },
    input: {
      padding: 9,
      fontSize: 15,
      border: "1px solid #d9d9d9",
      borderRadius: 6,
      width: "100%",
      boxSizing: "border-box" as "border-box",
      marginTop: 6,
    },
    textarea: {
      padding: 9,
      fontSize: 15,
      border: "1px solid #d9d9d9",
      borderRadius: 6,
      width: "100%",
      boxSizing: "border-box" as "border-box",
      resize: "none" as "none",
      fontFamily: "Arial, sans-serif",
      marginTop: 6,
    },
    select: {
      padding: 9,
      fontSize: 15,
      border: "1px solid #d9d9d9",
      borderRadius: 6,
      width: "100%",
      boxSizing: "border-box" as "border-box",
      background: "#f8f9fb",
      marginTop: 6,
    },
    checkboxContainer: { display: "flex", alignItems: "center", marginTop: 2 },
    checkbox: { marginRight: 8, width: 16, height: 16 },
    checkboxLabel: { fontSize: 14, color: "#333", cursor: "pointer" },
    downloadButton: {
      padding: "8px 16px",
      fontSize: 14,
      fontWeight: 600,
      border: "none",
      borderRadius: 6,
      backgroundColor: "#007bff",
      color: "white",
      cursor: "pointer",
      boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      transition: "background-color 0.3s",
      marginTop: 8,
      alignSelf: "center" as "center",
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-custom-dark-blue to-custom-deep-ocean text-white flex flex-col items-center justify-center p-8">
      {/* Changed p-4 pt-20 to p-8 */}
      <BackButton to="/tools" />
      {/* Main content panel: made to fit content by default (w-auto), with a max-width for larger screens, centered by parent's items-center. */}
      <div className="w-auto max-w-6xl flex flex-col items-center bg-white p-8 rounded-xl shadow-2xl text-gray-800">
        {/* Main title: changed to dark color */}
        <h1 className="text-4xl font-extrabold text-center text-gray-900">
          Interactive Gauge
        </h1>
        {/* Container for settings and preview: items-start for vertical alignment on lg screens, reduced gap */}
        <div className="w-full flex flex-col lg:flex-row items-start justify-center gap-8">
          {" "}
          {/* Reduced gap from 12 to 8 */}
          {/* Controls Container: padding p-7 kept for internal spacing */}
          <div className="w-full lg:w-[420px] flex flex-col space-y-5 p-7">
            {/* Gauge Settings Header: border color updated, text color will inherit from parent or be set explicitly if needed */}
            <h2 className="text-2xl font-semibold pb-3 border-b border-gray-300 text-gray-800">
              Gauge Settings
            </h2>

            {/* Basic Controls - Original control groups follow */}
            <div className="control-group">
              {/* Label text color will inherit from panel (text-gray-800) or can be made more specific e.g. text-gray-700 */}
              <label
                htmlFor="value"
                className="block text-sm font-medium mb-1 text-gray-700"
              >
                Value ({0}-{maxValue})
              </label>
              <input
                type="number"
                id="value"
                min={0}
                max={maxValue}
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className="block w-full p-2 text-sm rounded-md border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900" // Added text-gray-900
              />
            </div>
            <div className="control-group">
              <label
                htmlFor="title"
                className="block text-sm font-medium mb-1 text-gray-700"
              >
                Title
              </label>
              <textarea
                id="title"
                rows={2}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="block w-full p-2 text-sm rounded-md border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900" // Added text-gray-900
              />
            </div>
            <div className="control-group">
              <label
                htmlFor="unitLabel"
                className="block text-sm font-medium mb-1 text-gray-700"
              >
                Unit Label
              </label>
              <input
                type="text"
                id="unitLabel"
                value={unitLabel}
                onChange={(e) => setUnitLabel(e.target.value)}
                className="block w-full p-2 text-sm rounded-md border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900" // Added text-gray-900
              />
            </div>
            <div className="control-group">
              <label
                htmlFor="gradientSelect"
                className="block text-sm font-medium mb-1 text-gray-700"
              >
                Color Gradient
              </label>
              <select
                id="gradientSelect"
                value={gradientType}
                onChange={(e) =>
                  setGradientType(e.target.value as keyof typeof colorGradients)
                }
                className="block w-full p-2 text-sm rounded-md border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900" // Added text-gray-900
              >
                {Object.entries(colorGradients).map(([key, { name }]) => (
                  <option key={key} value={key}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="reverseGradient"
                checked={reverseGradient}
                onChange={(e) => setReverseGradient(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 focus:ring-offset-gray-100"
              />
              <label
                htmlFor="reverseGradient"
                className="ml-2 text-sm font-medium text-gray-700" // Changed from text-gray-300
              >
                Reverse Gradient
              </label>
            </div>
          </div>
          {/* Gauge Preview Section - Added pt-7 for vertical alignment with settings header */}
          <div className="w-full lg:w-auto flex flex-col items-center lg:items-start space-y-5 pt-7">
            {" "}
            {/* Added pt-7 */}
            {/* Gauge Preview Header: text color updated, border color updated */}
            <h2 className="text-2xl font-semibold text-gray-800 pb-3 border-b border-gray-300 self-center lg:self-start">
              Gauge Preview
            </h2>
            {/* Gauge Canvas Container - Original content */}
            <div className="flex-shrink-0 w-full flex flex-col items-center justify-center">
              <svg
                ref={svgRef}
                width={gaugeSize}
                height={gaugeSize}
                viewBox={`0 0 ${gaugeSize} ${gaugeSize}`}
                style={{ display: "block" }}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius - thickness / 2 - 0.025 * gaugeSize}
                  fill="white"
                  stroke="gray"
                />
                {gaugeArcs} {/* Added gaugeArcs back here */}
                <GaugeNeedle
                  cx={cx}
                  cy={cy}
                  value={value}
                  maxValue={maxValue}
                  theta1={theta1}
                  theta2={theta2}
                  needleLength={0.4 * gaugeSize}
                  needleWidth={0.045 * gaugeSize}
                  gaugeSize={gaugeSize} // Pass gaugeSize to GaugeNeedle
                />
                <GaugeText
                  cx={cx}
                  title={title}
                  unitLabel={unitLabel}
                  size={gaugeSize}
                />
              </svg>
              <button
                onClick={handleDownloadSVG}
                // style={styles.downloadButton} // Using Tailwind classes primarily now
                className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75"
              >
                Download SVG
              </button>
            </div>
          </div>
        </div>
        {/* Button moved under the gauge visual 
        <button
          onClick={handleDownloadSVG}
          style={styles.downloadButton}
          className="mt-8 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75"
        >
          Download SVG
        </button>
        */}
      </div>
    </div>
  );
}

export default GaugeTool;
