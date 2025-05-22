import React, { useEffect, useState, useRef } from "react";
import {
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { IconType } from "react-icons";
import { FaLinkedin, FaGithub, FaResearchgate } from "react-icons/fa";
import { SiOrcid } from "react-icons/si";
import ToolsPage from "./components/pages/ToolsPage";
import PublicationsPage from "./components/pages/PublicationsPage.tsx";
import ParticleNetwork from "./components/ParticleNetwork";
import GaugeTool from "./components/tools/GaugeTool/GaugeTool";
import CUTTIA from "./components/tools/CUTT-IA/CUTT-IA";
import BackToTopButton from "./components/common/BackToTopButton";
import MainContent from "./components/MainContent"; // Added import
import NavLink, { NavSeparator } from "./components/NavLink"; // Added import

export interface SocialLink {
  // Exporting SocialLink
  href: string;
  IconComponent: IconType;
  label: string;
  ariaDetails?: string;
}

const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>("home");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const sectionIds = ["home", "about", "research", "contact"];
  const observerRef = useRef<IntersectionObserver | null>(null);

  const researchAreas = [
    "Laser Cutting",
    "Artificial Intelligence",
    "Optimization",
    "Computational Mechanics",
  ];

  const navLinks = [
    { id: "home", label: "Home", type: "mainSection" },
    { id: "about", label: "About", type: "mainSection" },
    { id: "research", label: "Research", type: "mainSection" },
    { id: "contact", label: "Contact", type: "mainSection" },
    // Separators will be handled in JSX
    {
      id: "publications",
      label: "Publications",
      type: "page",
      path: "/publications",
    },
    {
      id: "cv",
      label: "CV",
      type: "external",
      path: "/GUVEN_THESIS.pdf",
      ariaLabel: "View Murat Güven's CV (opens in new tab)",
    }, // Added specific aria-label
    { id: "tools", label: "Tools", type: "page", path: "/tools" },
  ];

  const socialLinks: SocialLink[] = [
    {
      href: "https://www.linkedin.com/in/muratguvenn",
      IconComponent: FaLinkedin,
      label: "LinkedIn",
      ariaDetails: "Murat Güven's LinkedIn Profile (opens in new tab)",
    },
    {
      href: "https://github.com/likemaestro",
      IconComponent: FaGithub,
      label: "GitHub",
      ariaDetails: "Murat Güven's GitHub Profile (opens in new tab)",
    },
    {
      href: "https://www.researchgate.net/profile/Murat-Gueven",
      IconComponent: FaResearchgate,
      label: "ResearchGate",
      ariaDetails: "Murat Güven's ResearchGate Profile (opens in new tab)",
    },
    {
      href: "https://orcid.org/0000-0003-2712-0523",
      IconComponent: SiOrcid,
      label: "ORCID",
      ariaDetails: "Murat Güven's ORCID Profile (opens in new tab)",
    },
  ];

  const handleNavLinkClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    linkType: string,
    linkId: string
  ) => {
    if (linkType === "mainSection") {
      event.preventDefault(); // Prevent default only for mainSection links
      if (location.pathname !== "/") {
        // Navigate to main page, then scroll
        navigate("/", { state: { scrollToSection: linkId } });
      } else {
        // Already on main page, just scroll
        const section = document.getElementById(linkId);
        if (section) {
          section.scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (linkId === "home") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
      setActiveSection(linkId);
      setMobileNavOpen(false);
    } else if (linkType === "page") {
      // For 'page' types, navigation is handled by <Link>, we just set active section
      // and ensure mobile nav closes. The actual navigation to link.path is done by <Link>.
      // No event.preventDefault() here, so <Link> can navigate.
      setActiveSection(linkId || "");
      setMobileNavOpen(false);
    }
    // External links are handled by standard anchor tags with target="_blank",
    // so event.preventDefault() is not strictly needed here if they are rendered as <a href... target="_blank">.
    // If they were part of this handler and not using target="_blank" for some reason,
    // then conditional preventDefault would be needed.
  };

  const isToolPage = location.pathname.startsWith("/tools/");

  // Scroll spy effect for main sections
  useEffect(() => {
    // 1. Disconnect and clear any *previous* observer stored in the ref
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    let newObserverInstance: IntersectionObserver | null = null;

    if (location.pathname === "/") {
      const handleIntersections = (entries: IntersectionObserverEntry[]) => {
        let maxRatio = 0;
        // Initialize with the current activeSection from the closure.
        // This means if nothing is intersecting enough, it defaults to the current active one.
        let mostVisibleSectionId = activeSection;

        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Check if this entry's target is one of the sections we care about
            if (
              sectionIds.includes(entry.target.id) &&
              entry.intersectionRatio > maxRatio
            ) {
              maxRatio = entry.intersectionRatio;
              mostVisibleSectionId = entry.target.id;
            }
          }
        });

        // Only update if the mostVisibleSectionId is one of the main sections.
        if (sectionIds.includes(mostVisibleSectionId)) {
          setActiveSection(mostVisibleSectionId);
        }
      };

      const options = {
        root: null,
        rootMargin: "-80px 0px 0px 0px", // Offset for navbar (h-20 = 80px)
        threshold: [0.3, 0.5, 0.7, 1.0], // Fine-tune as needed
      };

      newObserverInstance = new window.IntersectionObserver(
        handleIntersections,
        options
      );
      observerRef.current = newObserverInstance; // Store this new observer in the ref

      sectionIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          newObserverInstance!.observe(el);
        }
      });
    }

    // 2. Cleanup function for *this* effect instance
    return () => {
      if (newObserverInstance) {
        newObserverInstance.disconnect();
      }
      // If the observer stored in the ref is the one created by this effect instance, clear the ref.
      if (observerRef.current === newObserverInstance) {
        observerRef.current = null;
      }
    };
  }, [location.pathname, activeSection, sectionIds]); // Updated dependencies

  // Listen for route changes to update activeSection for page links
  useEffect(() => {
    // If on a page route, set activeSection to the matching navLink id
    const pageLink = navLinks.find(
      (link) => link.type === "page" && location.pathname === link.path
    );
    if (pageLink) {
      setActiveSection(pageLink.id);
    }
    // If on main page, let scroll spy handle it
  }, [location.pathname]);

  return (
    <div className="scroll-snap-container bg-gradient-to-br from-gray-900 to-gray-800 text-white font-manrope min-h-screen relative">
      {/* ParticleNetwork as a global background */}
      <div className="fixed top-20 left-0 right-0 bottom-0 z-0 pointer-events-none">
        <ParticleNetwork className="w-full h-full" interactive={true} />
      </div>
      {/* Main content container, needs to be above ParticleNetwork */}
      <div className="relative z-10">
        {!isToolPage && <BackToTopButton />}
        {!isToolPage && (
          <nav
            aria-label="Main navigation"
            className="fixed top-0 left-0 right-0 z-40 bg-opacity-60 bg-gray-900 backdrop-blur-lg shadow-lg animate-fade-in-down border-b border-gray-800"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-20">
                {/* Hamburger for mobile */}
                <div className="flex items-center md:gap-8" role="menubar">
                  <button
                    className="md:hidden text-3xl focus:outline-none mr-2"
                    aria-label="Open navigation menu"
                    onClick={() => setMobileNavOpen((open) => !open)}
                  >
                    <span aria-hidden="true">{mobileNavOpen ? "✕" : "☰"}</span>
                  </button>
                  {/* Nav links: horizontal on md+, vertical overlay on mobile */}
                  <div className={`hidden md:flex flex-row gap-8`}>
                    {navLinks.map((link, idx) => {
                      const isActive =
                        link.type === "mainSection"
                          ? location.pathname === "/" &&
                            activeSection === link.id
                          : location.pathname === link.path;
                      const onClick = (e: any) =>
                        handleNavLinkClick(e, link.type, link.id);
                      const showSeparator =
                        link.id === "contact" || link.id === "cv";
                      return (
                        <React.Fragment key={link.id}>
                          <NavLink
                            link={link}
                            isActive={isActive}
                            onClick={onClick}
                          />
                          {showSeparator && <NavSeparator />}
                        </React.Fragment>
                      );
                    })}
                  </div>
                  {/* Mobile nav overlay */}
                  <div
                    className={`md:hidden fixed top-20 left-0 w-full bg-gray-900 bg-opacity-95 z-50 flex-col transition-all duration-300 ${
                      mobileNavOpen ? "flex" : "hidden"
                    }`}
                  >
                    {navLinks.map((link, idx) => {
                      const isActive =
                        link.type === "mainSection"
                          ? location.pathname === "/" &&
                            activeSection === link.id
                          : location.pathname === link.path;
                      const onClick = (e: any) => {
                        handleNavLinkClick(e, link.type, link.id);
                        setMobileNavOpen(false);
                      };
                      const showSeparator =
                        link.id === "contact" || link.id === "cv";
                      return (
                        <React.Fragment key={link.id}>
                          <NavLink
                            link={link}
                            isActive={isActive}
                            onClick={onClick}
                          />
                          {showSeparator && <NavSeparator />}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
                <div
                  className="flex items-center gap-6"
                  role="toolbar"
                  aria-label="Social media links"
                >
                  {socialLinks.map(
                    ({ href, IconComponent, label, ariaDetails }) => (
                      <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={ariaDetails || label}
                        className="text-2xl hover:text-indigo-300 transition duration-300 ease-in-out transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75 rounded-full"
                      >
                        <IconComponent />
                      </a>
                    )
                  )}
                </div>
              </div>
            </div>
          </nav>
        )}
        <Routes>
          <Route
            path="/"
            element={
              <MainContent
                researchAreas={researchAreas}
                socialLinks={socialLinks}
              />
            }
          />
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/tools/gauge-tool" element={<GaugeTool />} />
          <Route path="/tools/cutt-ia" element={<CUTTIA />} />{" "}
          <Route path="/publications" element={<PublicationsPage />} />{" "}
        </Routes>
      </div>
    </div>
  );
};

export default App;
