import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaChevronLeft } from "react-icons/fa"; // Changed to Chevron

interface BackButtonProps {
  to: string;
  initiallyExpandedDuration?: number; // Optional: duration in ms for initial expansion
}

const BackButton: React.FC<BackButtonProps> = ({
  to,
  initiallyExpandedDuration = 2000,
}) => {
  const [isExpanded, setIsExpanded] = useState(false); // Start shrunken
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    // Phase 1: Animate to expanded after a brief moment to allow initial render as shrunken
    const expandTimer = setTimeout(() => {
      setIsExpanded(true);

      // Phase 2: Hold expanded for the specified duration, then animate to shrunken
      const shrinkTimer = setTimeout(() => {
        setIsExpanded(false);
      }, initiallyExpandedDuration);

      // Cleanup for shrinkTimer if component unmounts during the "hold expanded" phase
      return () => clearTimeout(shrinkTimer);
    }, 50); // Small delay to ensure transition from shrunken to expanded is visible

    // Cleanup for expandTimer if component unmounts very quickly
    return () => clearTimeout(expandTimer);
  }, [initiallyExpandedDuration]);

  const BackChevronIcon = FaChevronLeft as React.FC<
    React.SVGProps<SVGSVGElement>
  >;
  const label = "Back to Tools"; // Hardcoded label

  return (
    <Link
      to={to}
      className={`fixed top-1/2 -translate-y-1/2 left-0 z-50 flex items-center p-3 rounded-r-lg shadow-lg cursor-pointer group transition-all duration-300 ease-in-out backdrop-blur-md bg-black/20 hover:bg-black/30 border border-l-0 border-white/10 hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-50 ${
        isExpanded || isHovered ? "w-auto" : "w-11"
      }`}
      aria-label={label}
      style={{ WebkitBackdropFilter: "blur(8px)", backdropFilter: "blur(8px)" }} // Ensure blur for all browsers
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <BackChevronIcon className="h-5 w-5 text-white/70 group-hover:text-white transition-colors duration-300" />
      <span
        className={`ml-0 overflow-hidden whitespace-nowrap transition-all duration-300 text-sm text-white/80 group-hover:text-white font-medium ${
          isExpanded || isHovered ? "max-w-xs ml-2" : "max-w-0"
        }`}
      >
        {label}
      </span>
    </Link>
  );
};

export default BackButton;
