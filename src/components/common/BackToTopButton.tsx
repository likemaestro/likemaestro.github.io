import React, { useState, useEffect } from "react";

const BackToTopButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  // Function to check scroll position and update button visibility
  const toggleVisibility = () => {
    // Show button after scrolling past the first section
    const homeSection = document.getElementById("home");
    if (homeSection) {
      const homeSectionBottom = homeSection.getBoundingClientRect().bottom;
      if (homeSectionBottom < 0) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    } else {
      // Fallback if no home section is found
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    }
  };

  // Function to scroll to top with scroll snap consideration
  const scrollToTop = () => {
    // For scroll snap, we need to target the first section directly
    const homeSection = document.getElementById("home");
    if (homeSection) {
      // Override scroll snap to ensure smooth scrolling
      const scrollContainer = document.querySelector(".scroll-snap-container");
      if (scrollContainer) {
        // Temporarily disable scroll snap
        scrollContainer.classList.remove("scroll-snap-container");
      }

      // Scroll to home section
      homeSection.scrollIntoView({ behavior: "smooth", block: "start" });

      // Re-enable scroll snap after animation completes
      setTimeout(() => {
        if (scrollContainer) {
          scrollContainer.classList.add("scroll-snap-container");
        }
      }, 1000); // Adjust timeout based on your scroll animation duration
    } else {
      // Fallback
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    // Add scroll event listener
    window.addEventListener("scroll", toggleVisibility);

    // Clean up the event listener on component unmount
    return () => {
      window.removeEventListener("scroll", toggleVisibility);
    };
  }, []);

  return (
    <button
      onClick={scrollToTop}
      className={`
        fixed bottom-6 right-6 z-50
        p-3 rounded-full 
        bg-indigo-600 hover:bg-indigo-700
        text-white shadow-lg
        transition-all duration-300 ease-in-out
        transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-indigo-400
        ${
          isVisible
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-10 pointer-events-none"
        }
      `}
      aria-label="Back to top"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"
        />
      </svg>
    </button>
  );
};

export default BackToTopButton;
