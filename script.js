const outputElementId = "gaugeOutput";
const FIXED_THICKNESS = 25;

// Define color gradient presets and make them globally accessible
window.colorGradients = {
  rdylgn: {
    name: "Green-Yellow-Red",
    colors: [
      "#006837", // Dark green (now first)
      "#1A9850",
      "#66BD63",
      "#A6D96A",
      "#D9EF8B",
      "#FFFFBF", // Yellow (middle)
      "#FEE08B",
      "#FDAE61",
      "#F46D43",
      "#D73027",
      "#A50026", // Dark red (now last)
    ],
    reversed: true,
  },
  blues: {
    name: "Purple to Blue",
    colors: [
      "#4A0374", // Deep purple
      "#5E02A3",
      "#7209B7",
      "#560BAD",
      "#480CA8",
      "#3A0CA3",
      "#3F37C9",
      "#4361EE",
      "#4895EF",
      "#4CC9F0", // Light blue
    ],
    reversed: false,
  },
};

// Use the global reference for our local code as well
const colorGradients = window.colorGradients;

// Current selected gradient
let currentGradient = "rdylgn";
let isGradientReversed = false;

function updateGauge() {
  let value = parseFloat(document.getElementById("value").value);
  value = Math.max(0, Math.min(100, value)); // Clamp value between 0 and 100
  document.getElementById("value").value = value;

  const title = document.getElementById("title").value;
  const unitLabel = document.getElementById("unitLabel").value;
  const gradientType = document.getElementById("gradientSelect").value;
  isGradientReversed = document.getElementById("reverseGradient").checked;

  // Get the selected gradient
  currentGradient = gradientType;

  createGauge(
    value,
    100,
    title,
    currentGradient,
    unitLabel,
    FIXED_THICKNESS,
    isGradientReversed,
    outputElementId
  );
  document.getElementById("downloadButton").style.display = "block";
}

// Listen for changes in inputs
["value", "title", "unitLabel", "gradientSelect", "reverseGradient"].forEach(
  (id) => {
    const el = document.getElementById(id);
    el.addEventListener("input", updateGauge);
    el.addEventListener("change", updateGauge);
  }
);

// Set default values
document.getElementById("value").value = 20;
document.getElementById("title").value = "Carbon\nFootprint";
document.getElementById("unitLabel").value = "(tonnes CO₂e)";
document.getElementById("gradientSelect").value = "rdylgn";
document.getElementById("reverseGradient").checked = false;
updateGauge();

// Add a window resize listener to update the gauge when screen size changes
window.addEventListener("resize", function () {
  // Add a small delay to prevent too many updates while resizing
  if (this.resizeTimer) clearTimeout(this.resizeTimer);
  this.resizeTimer = setTimeout(function () {
    updateGauge();
  }, 300);
});

// Download button functionality
document.getElementById("downloadButton").onclick = function () {
  const svgElement = document
    .getElementById(outputElementId)
    .querySelector("svg");
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);
  const blob = new Blob([svgString], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);

  // Get current values for the filename
  const currentValue = document.getElementById("value").value;
  const gradientName = colorGradients[currentGradient].name.replace(
    /\s+/g,
    "_"
  );
  const reversedText = isGradientReversed ? "_reversed" : "";

  // Get and sanitize the title for the filename
  const titleText = document
    .getElementById("title")
    .value.replace(/\r?\n/g, "_") // Replace newlines with underscores
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "_"); // Replace spaces with underscores

  // Create comprehensive filename: title + value + gradient
  const filename = `${titleText}_${currentValue}pct_${gradientName}${reversedText}.svg`;

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

// Fullscreen toggle functionality
const fullscreenToggleButton = document.getElementById("fullscreenToggle");
const containerElement = document.querySelector(".container");

if (fullscreenToggleButton && containerElement) {
  fullscreenToggleButton.addEventListener("click", function () {
    const isFullscreen =
      containerElement.classList.contains("output-fullscreen");

    if (isFullscreen) {
      // Currently fullscreen, exiting
      containerElement.classList.remove("output-fullscreen");
      this.title = "Fullscreen Preview";
      // Set icon for entering fullscreen (down arrow)
      this.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
      </svg>`;
    } else {
      // Not fullscreen, entering
      containerElement.classList.add("output-fullscreen");
      this.title = "Exit Fullscreen";
      // Set icon for exiting fullscreen (up arrow)
      this.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" />
      </svg>`;
    }
    // Force gauge redraw after layout change and transition
    setTimeout(updateGauge, 310); // Slightly longer than CSS transition
  });
} else {
  if (!fullscreenToggleButton)
    console.error("Fullscreen toggle button not found.");
  if (!containerElement) console.error("Container element not found.");
}

// Check window width on load and resize to set layout and toggle visibility
function handleLayoutOnResize() {
  const container = document.querySelector(".container");
  const fullscreenToggle = document.getElementById("fullscreenToggle");

  if (!container || !fullscreenToggle) return;

  if (window.innerWidth > 900) {
    // Large screen: Show fullscreen toggle. Layout handled by CSS.
    fullscreenToggle.style.display = "block";
    container.classList.remove("layout-vertical"); // Clean up just in case
    container.classList.add("layout-horizontal"); // Ensure horizontal for consistency if needed by other logic
  } else {
    // Small screen: Hide toggles and force vertical layout (handled by CSS !important)
    fullscreenToggle.style.display = "none";
    container.classList.remove("layout-horizontal"); // Clean up
    container.classList.add("layout-vertical"); // Ensure vertical for consistency
    container.classList.remove("output-fullscreen"); // Ensure fullscreen is off

    // Keep reset for fullscreen toggle
    fullscreenToggle.title = "Fullscreen Preview";
    fullscreenToggle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" /></svg>`;
  }
}

// Set initial layout and toggle visibility when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  handleLayoutOnResize(); // Set initial layout based on screen size
  updateGauge(); // Initial gauge draw
});

// Update layout and gauge on window resize
window.addEventListener("resize", function () {
  if (this.resizeTimer) clearTimeout(this.resizeTimer);
  this.resizeTimer = setTimeout(function () {
    handleLayoutOnResize(); // Adjust layout/toggles based on new size
    updateGauge(); // Redraw gauge for potentially new container size
  }, 300);
});
