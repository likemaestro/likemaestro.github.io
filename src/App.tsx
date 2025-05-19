import React from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { IconType } from "react-icons";
import { FaLinkedin, FaGithub, FaResearchgate } from "react-icons/fa";
import { SiOrcid } from "react-icons/si";
import ToolsPage from "./components/pages/ToolsPage";
import PublicationsPage from "./components/pages/PublicationsPage.tsx"; // Import PublicationsPage, added .tsx extension
import ParticleNetwork from "./components/ParticleNetwork";
import GaugeTool from "./components/tools/GaugeTool/GaugeTool";
import CUTTIA from "./components/tools/CUTT-IA/CUTT-IA"; // Updated import
import AnimatedTextSection from "./components/AnimatedTextSection";

interface SocialLink {
  href: string;
  IconComponent: IconType;
  label: string;
}

const App: React.FC = () => {
  const location = useLocation();

  const researchAreas = [
    "Laser Cutting",
    "Artificial Intelligence",
    "Optimization",
    "Computational Mechanics",
  ];

  const navLinks = [
    { id: "home", label: "Home", type: "mainSection", path: "/#home" },
    { id: "about", label: "About", type: "mainSection", path: "/#about" },
    {
      id: "research",
      label: "Research",
      type: "mainSection",
      path: "/#research",
    },
    { id: "contact", label: "Contact", type: "mainSection", path: "/#contact" },
    // Separators will be handled in JSX
    {
      id: "publications",
      label: "Publications",
      type: "page",
      path: "/publications",
    },
    { id: "cv", label: "CV", type: "external", path: "/GUVEN_THESIS.pdf" },
    { id: "tools", label: "Tools", type: "page", path: "/tools" },
  ];

  const socialLinks: SocialLink[] = [
    {
      href: "https://www.linkedin.com/in/muratguvenn",
      IconComponent: FaLinkedin,
      label: "LinkedIn",
    },
    {
      href: "https://github.com/likemaestro",
      IconComponent: FaGithub,
      label: "GitHub",
    },
    {
      href: "https://www.researchgate.net/profile/Murat-Gueven",
      IconComponent: FaResearchgate,
      label: "ResearchGate",
    },
    {
      href: "https://orcid.org/0000-0003-2712-0523",
      IconComponent: SiOrcid,
      label: "ORCID",
    },
  ];

  const handleNavLinkClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    linkType: string,
    linkPath: string
  ) => {
    if (linkType === "mainSection") {
      const mainPagePath = "/";
      const sectionId = linkPath.substring(linkPath.indexOf("#") + 1);

      if (location.pathname === mainPagePath) {
        event.preventDefault();
        const targetElement = document.getElementById(sectionId);
        if (targetElement) {
          targetElement.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }
    }
  };

  const isToolPage = location.pathname.startsWith("/tools/");

  return (
    <div className="scroll-snap-container bg-gradient-to-br from-custom-dark-blue to-custom-deep-ocean text-white font-manrope min-h-screen relative">
      {" "}
      {/* Added relative */}
      {/* ParticleNetwork as a global background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {" "}
        {/* Ensure it's behind everything and doesn't intercept mouse events */}
        <ParticleNetwork className="w-full h-full" interactive={true} />
      </div>
      {/* Main content container, needs to be above ParticleNetwork */}
      <div className="relative z-10">
        {" "}
        {/* Added relative and z-10 */}
        {!isToolPage && (
          <nav className="fixed top-0 left-0 right-0 z-40 bg-opacity-30 bg-custom-dark-blue backdrop-filter backdrop-blur-lg shadow-lg animate-fade-in-down">
            <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
              <div className="flex justify-between items-center h-20">
                <div className="flex items-center space-x-6 md:space-x-8">
                  {navLinks.map((link, index) => {
                    const linkElement =
                      link.type === "external" ? (
                        <a
                          key={link.id}
                          href={link.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="nav-link-interactive text-lg hover:text-indigo-300 transition duration-300 ease-in-out transform hover:-translate-y-0.5"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          key={link.id}
                          to={link.path}
                          onClick={(e) =>
                            handleNavLinkClick(e, link.type, link.path)
                          }
                          className="nav-link-interactive text-lg hover:text-indigo-300 transition duration-300 ease-in-out transform hover:-translate-y-0.5"
                        >
                          {link.label}
                        </Link>
                      );

                    // Add separator after 'Contact' link
                    if (link.id === "contact") {
                      return (
                        <React.Fragment key={link.id + "-fragment"}>
                          {linkElement}
                          <div
                            key="separator-after-contact"
                            className="h-6 w-px bg-gray-500 opacity-50"
                            aria-hidden="true"
                          />
                        </React.Fragment>
                      );
                    }
                    // Add separator after 'CV' link (which is before 'Tools')
                    if (link.id === "cv") {
                      return (
                        <React.Fragment key={link.id + "-fragment-after"}>
                          {linkElement}
                          <div
                            key="separator-after-cv"
                            className="h-6 w-px bg-gray-500 opacity-50"
                            aria-hidden="true"
                          />
                        </React.Fragment>
                      );
                    }
                    return linkElement;
                  })}
                </div>
                <div className="flex items-center space-x-5">
                  {socialLinks.map((social) => {
                    const Icon = social.IconComponent as React.FC;
                    return (
                      <a
                        key={social.label}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={social.label}
                        className="text-2xl hover:text-indigo-300 transition duration-300 ease-in-out transform hover:scale-110"
                      >
                        <Icon />
                      </a>
                    );
                  })}
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

const MainContent: React.FC<{
  researchAreas: string[];
  socialLinks: SocialLink[];
}> = ({ researchAreas, socialLinks }) => {
  const location = useLocation();

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (location.hash) {
        const id = location.hash.substring(1);
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [location]);

  return (
    <>
      <section
        id="home"
        className="scroll-snap-section text-left min-h-screen pt-20 flex flex-col justify-center" // Removed relative
      >
        {/* ParticleNetwork as a background for the entire section - REMOVED FROM HERE */}
        {/* <div className="absolute inset-0 z-0">
          <ParticleNetwork className="w-full h-full" interactive={true} />
        </div> */}

        {/* Content container, needs to be above ParticleNetwork */}
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 w-full">
          {" "}
          {/* Removed relative and z-10 */} {/* Added relative and z-10 */}
          <div className="flex flex-col md:flex-row md:justify-between items-center">
            <div className="md:w-1/2 max-w-2xl flex flex-col justify-center">
              <h1 className="text-6xl sm:text-7xl lg:text-8xl font-extrabold mb-6 text-white">
                Welcome
              </h1>
              <p className="text-xl sm:text-2xl font-light mb-2 text-gray-300">
                My name is Murat Güven.
              </p>
              <p className="text-lg sm:text-xl font-light mb-8 text-gray-400 leading-relaxed">
                I'm a PhD Candidate at Politecnico di Milano. My research areas
                include Laser Cutting, Artificial Intelligence, Optimization,
                and Computational Mechanics.
              </p>
            </div>
            {/* Right column - ParticleNetwork's original div wrapper is removed */}
            <div className="md:w-1/2 flex justify-center items-center mt-10 md:mt-0 relative">
              {/* Original ParticleNetwork wrapper div removed */}
              <AnimatedTextSection />
            </div>
          </div>
        </div>
      </section>

      <section
        id="about"
        className="scroll-snap-section min-h-screen flex flex-col justify-center items-center p-8"
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-extrabold mb-12 text-center">
            About Me
          </h2>
          <p className="text-xl md:text-2xl leading-relaxed mb-6 text-gray-300 text-justify">
            I am currently a PhD candidate in the Department of Architecture,
            Built Environment, and Construction Engineering at Politecnico di
            Milano, Italy.
          </p>
          <p className="text-xl md:text-2xl leading-relaxed text-gray-300 text-justify">
            My research focuses on novel applications of laser cutting within
            the construction industry, emphasizing the use of advanced
            techniques to enhance construction processes. My work also
            integrates artificial intelligence, topology optimization, and
            computational mechanics to address complex challenges in the field.
          </p>
        </div>
      </section>

      <section
        id="research"
        className="scroll-snap-section min-h-screen flex flex-col justify-center items-center p-8"
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-extrabold mb-12 text-center">
            Research Areas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {researchAreas.map((area, index) => (
              <div
                key={index}
                className="research-card-interactive bg-opacity-30 bg-indigo-900 p-8 rounded-xl shadow-2xl h-full"
              >
                <h3 className="text-3xl font-bold mb-4">{area}</h3>
                <p className="text-lg opacity-80">
                  Exploring the frontiers of {area.toLowerCase()} in structural
                  engineering.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="contact"
        className="scroll-snap-section min-h-screen flex flex-col justify-center items-center p-8" // Removed specific background
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-extrabold mb-12">
            Get in Touch
          </h2>
          <p className="text-xl md:text-2xl mb-10 text-gray-300 leading-relaxed">
            I'm always open to discussing new projects, research collaborations,
            or opportunities. Feel free to reach out!
          </p>
          <a
            href="mailto:murat.guven@polimi.it"
            className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-10 rounded-lg text-xl transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
          >
            Send me an Email
          </a>
          <div className="mt-16 flex justify-center space-x-8">
            {socialLinks.map((social) => {
              const Icon = social.IconComponent as React.FC;
              return (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="text-4xl text-gray-400 hover:text-indigo-400 transition duration-300 ease-in-out transform hover:scale-110"
                >
                  <Icon />
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="text-center p-10 bg-opacity-50 bg-custom-dark-blue">
        <p className="text-sm text-gray-400">
          &copy; {new Date().getFullYear()} Murat Güven. All rights reserved.
        </p>
      </footer>
    </>
  );
};

export default App;
