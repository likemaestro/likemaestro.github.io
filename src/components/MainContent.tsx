import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AnimatedTextSection from "./AnimatedTextSection";
import BackToTopButton from "./common/BackToTopButton";
import { SocialLink } from "../App"; // Assuming SocialLink is exported from App.tsx

interface MainContentProps {
  researchAreas: string[];
  socialLinks: SocialLink[];
}

const MainContent: React.FC<MainContentProps> = ({
  researchAreas,
  socialLinks,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const state = location.state as { scrollToSection?: string } | null;
    const sectionToScrollTo = state?.scrollToSection;

    if (sectionToScrollTo) {
      const element = document.getElementById(sectionToScrollTo);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (sectionToScrollTo === "home") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      // Clear the state after scrolling to prevent re-scrolling
      navigate(location.pathname, {
        replace: true,
        state: { navigatedToSection: true }, // Flag that navigation to section occurred
      });
    } else if (
      location.pathname === "/" &&
      (!location.state || !(location.state as any).navigatedToSection)
    ) {
      // Only scroll to top if on main page AND we didn't just navigate to a section
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [location, navigate]);

  return (
    <>
      <BackToTopButton />
      <section
        id="home"
        className="scroll-snap-section text-left min-h-screen pt-20 flex flex-col justify-center"
      >
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 w-full">
          <div className="flex flex-col items-center md:flex-row md:justify-between md:items-center">
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
            <div className="md:w-1/2 flex justify-center items-center mt-10 md:mt-0 relative">
              <AnimatedTextSection />
            </div>
          </div>
        </div>
      </section>

      <section
        id="about"
        className="scroll-snap-section min-h-screen flex flex-col justify-center items-center pt-20 px-8 pb-8"
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
        className="scroll-snap-section min-h-screen flex flex-col justify-center items-center pt-20 px-8 pb-8"
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
        className="scroll-snap-section min-h-screen flex flex-col justify-center items-center pt-20 px-8 pb-8"
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
              const Icon = social.IconComponent as React.FC; // Ensure IconComponent is treated as a component
              return (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.ariaDetails || social.label}
                  className="text-4xl text-gray-400 hover:text-indigo-400 transition duration-300 ease-in-out transform hover:scale-110"
                >
                  <Icon />
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="text-center py-8 px-4 border-t border-gray-700 bg-gray-900 text-gray-500 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
          <p>
            &copy; {new Date().getFullYear()} Murat Güven. All rights reserved.
          </p>
          <p>Last Updated: {new Date().toLocaleDateString()}</p>
        </div>
      </footer>
    </>
  );
};

export default MainContent;
