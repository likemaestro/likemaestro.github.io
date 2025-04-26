function createGauge(
  value,
  maxValue,
  title,
  gradientType,
  unitLabel,
  thickness,
  reverseGradient,
  outputElementId
) {
  const ns = "http://www.w3.org/2000/svg";
  const container = document.getElementById(outputElementId);

  // Calculate container width to create a responsive gauge
  const containerWidth = container.clientWidth;
  const size = Math.min(containerWidth, 300); // Cap at 300px but scale down as needed

  // Ensure SVG container exists
  let svg = container.querySelector("svg");
  if (!svg) {
    svg = document.createElementNS(ns, "svg");
    svg.setAttribute("width", "100%"); // Make width responsive
    svg.setAttribute("height", "auto"); // Maintain aspect ratio
    svg.setAttribute("viewBox", "0 0 300 300"); // Keep viewBox constant for scaling
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet"); // Ensure proper scaling

    // Embed font styles in SVG
    const defs = document.createElementNS(ns, "defs");
    const style = document.createElementNS(ns, "style");
    style.setAttribute("type", "text/css");
    style.textContent = `
      @font-face {
        font-family: 'Arial';
        src: local('Arial'), sans-serif;
      }
      text {
        font-family: 'Arial', sans-serif;
      }
    `;
    defs.appendChild(style);
    svg.appendChild(defs);
    container.appendChild(svg);
  }

  // Size calculations use viewBox coordinates (300x300)
  const cx = 150; // Center X
  const cy = 150; // Center Y
  const radius = (0.85 * 300) / 2 - thickness / 2;
  const n = 150; // Number of segments
  const theta1 = -60; // Start angle
  const theta2 = 240; // End angle

  // Helper functions
  const toRad = (deg) => (deg * Math.PI) / 180;
  const polarToCartesian = (cx, cy, r, ang) => {
    const a = toRad(ang);
    return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) };
  };
  const describeArc = (cx, cy, r, startAng, endAng) => {
    const p1 = polarToCartesian(cx, cy, r, endAng);
    const p2 = polarToCartesian(cx, cy, r, startAng);
    const laf = endAng - startAng <= 180 ? "0" : "1";
    return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${laf} 0 ${p2.x} ${p2.y}`;
  };

  // Get color for a position on the gauge
  const getColorForPosition = (pos) => {
    // Access the gradient definitions from the global window object
    const gradient = window.colorGradients[gradientType];
    if (!gradient) {
      console.error(`Gradient type '${gradientType}' not found`);
      return "#cccccc"; // Default gray if gradient not found
    }

    const colors = gradient.colors;

    // Determine if gradient should be reversed based on both the gradient config
    // and the user's reverse checkbox
    const defaultReverse = gradient.reversed || false;
    const shouldReverse = reverseGradient ? !defaultReverse : defaultReverse;

    // Apply reversal if needed
    const adjustedPos = shouldReverse ? 1 - pos : pos;

    // Calculate the index position in the color array
    const idx = Math.min(
      Math.floor(adjustedPos * (colors.length - 1)),
      colors.length - 2
    );
    const t = adjustedPos * (colors.length - 1) - idx; // Fractional part

    // Get the two colors to interpolate between
    const color1 = colors[idx];
    const color2 = colors[idx + 1];

    // Perform RGB interpolation between the two colors
    const c1 = parseInt(color1.slice(1), 16);
    const c2 = parseInt(color2.slice(1), 16);
    const r = Math.round((c1 >> 16) * (1 - t) + (c2 >> 16) * t);
    const g = Math.round(((c1 >> 8) & 0xff) * (1 - t) + ((c2 >> 8) & 0xff) * t);
    const b = Math.round((c1 & 0xff) * (1 - t) + (c2 & 0xff) * t);

    return `rgb(${r},${g},${b})`;
  };

  // Create or update arcs
  let arcsGroup = svg.querySelector("#arcsGroup");
  if (!arcsGroup) {
    arcsGroup = document.createElementNS(ns, "g");
    arcsGroup.setAttribute("id", "arcsGroup");
    svg.appendChild(arcsGroup);
  } else {
    arcsGroup.innerHTML = ""; // Clear existing arcs
  }

  for (let i = 0; i < n; i++) {
    const t1 = theta1 + (theta2 - theta1) * (i / (n - 1));
    const t2 = theta1 + (theta2 - theta1) * ((i + 1) / (n - 1));
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", describeArc(cx, cy, radius, t1, t2));

    // Use the selected gradient
    const position = i / (n - 1);
    path.setAttribute("stroke", getColorForPosition(position));

    path.setAttribute("stroke-width", thickness);
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("fill", "none");
    arcsGroup.appendChild(path);
  }

  // Create or update center circle
  let center = svg.querySelector("#centerCircle");
  if (!center) {
    center = document.createElementNS(ns, "circle");
    center.setAttribute("id", "centerCircle");
    svg.appendChild(center);
  }
  center.setAttribute("cx", cx);
  center.setAttribute("cy", cy);
  center.setAttribute("r", radius - thickness / 2 - 0.025 * 300);
  center.setAttribute("fill", "white");
  center.setAttribute("stroke", "gray");

  // Create or update needle
  const norm = Math.max(0, Math.min(1, value / maxValue));
  // Calculate needle angle using the same formula as Python implementation
  const needleStartOffset = 0.04;
  const angle = toRad(
    theta2 +
      needleStartOffset * (theta1 - theta2) +
      norm * (1 - 2 * needleStartOffset) * (theta1 - theta2)
  );

  const needleLength = 0.4 * 300;
  const dx = needleLength * Math.cos(angle);
  const dy = -needleLength * Math.sin(angle);

  // Match Python implementation's needle width calculation
  const needleWidth = 0.045 * 300;
  const perpAngle = angle + Math.PI / 2;
  // Divide by 2 to match Python's handling of perpendicular offset
  const dxp = (needleWidth / 2) * Math.cos(perpAngle);
  const dyp = -(needleWidth / 2) * Math.sin(perpAngle);

  // Create needle path
  const needlePath = [
    `M ${cx - dxp} ${cy - dyp}`,
    `L ${cx + dxp} ${cy + dyp}`,
    `L ${cx + dx} ${cy + dy}`,
    `Z`,
  ].join(" ");

  let needle = svg.querySelector("#needle");
  if (!needle) {
    needle = document.createElementNS(ns, "path");
    needle.setAttribute("id", "needle");
    svg.appendChild(needle);
  }
  needle.setAttribute("d", needlePath);
  needle.setAttribute("fill", "black");
  needle.setAttribute("stroke", "black"); // Add stroke to match Python implementation
  needle.setAttribute("stroke-width", "1");
  needle.setAttribute("stroke-linejoin", "round");
  needle.setAttribute("z-index", "3"); // Higher z-index to match Python's zorder

  // Create or update pivot circle with black edge like Python implementation
  let pivot = svg.querySelector("#pivotCircle");
  if (!pivot) {
    pivot = document.createElementNS(ns, "circle");
    pivot.setAttribute("id", "pivotCircle");
    svg.appendChild(pivot);
  }
  pivot.setAttribute("cx", cx);
  pivot.setAttribute("cy", cy);
  pivot.setAttribute("r", 0.02 * 300);
  pivot.setAttribute("fill", "gray");
  pivot.setAttribute("stroke", "black"); // Add black edge
  pivot.setAttribute("stroke-width", "1");
  pivot.setAttribute("z-index", "4"); // Higher z-index to match Python's zorder

  // Create or update title and unit label
  let textGroup = svg.querySelector("#textGroup");
  if (!textGroup) {
    textGroup = document.createElementNS(ns, "g");
    textGroup.setAttribute("id", "textGroup");
    svg.appendChild(textGroup);
  } else {
    textGroup.innerHTML = ""; // Clear existing text
  }

  // Split title by actual newlines instead of \n escape sequence
  const lines = title.split(/\r?\n/);
  const lineCount = lines.length;

  // Adjust vertical positions based on number of title lines
  const textY = 0.6 * 300; // Move title up slightly
  const lineHeight = textY / 15; // Height of each line in pixels
  const unitY = textY + lineCount * lineHeight + 10; // Dynamic spacing based on title length

  const text = document.createElementNS(ns, "text");
  text.setAttribute("x", cx);
  text.setAttribute("y", textY);
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("font-size", "18px"); // Increased from 16px
  text.setAttribute("font-weight", "800"); // Increased from "bold" to make it more prominent
  lines.forEach((line, i) => {
    const tspan = document.createElementNS(ns, "tspan");
    tspan.setAttribute("x", cx);
    tspan.setAttribute("dy", i === 0 ? "0" : "1em");
    tspan.textContent = line;
    text.appendChild(tspan);
  });
  textGroup.appendChild(text);

  const unit = document.createElementNS(ns, "text");
  unit.setAttribute("x", cx);
  unit.setAttribute("y", unitY);
  unit.setAttribute("text-anchor", "middle");
  unit.setAttribute("font-size", "14px");
  unit.textContent = unitLabel;
  textGroup.appendChild(unit);
}
