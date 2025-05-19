import React from "react";

// Define a type for our publications
interface Publication {
  id: number | string;
  title: string;
  journal: string;
  year: number;
  link?: string; // Optional link to the publication
  // Add other relevant fields like authors, abstract, etc. if needed
}

const PublicationsPage: React.FC = () => {
  // Placeholder data - replace with your actual publications
  const publications: Publication[] = [
    {
      id: 1,
      title: "XXXXXXX",
      journal: "YYYYYYY",
      year: 0, // Changed from "XXXXXXX" as any to a number
      link: "https://example.com/publication1",
    },
    {
      id: 2,
      title: "XXXXXXX",
      journal: "YYYYYYY",
      year: 0, // Changed from "XXXXXXX" as any to a number
      link: "https://example.com/publication2",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-custom-dark-blue to-custom-deep-ocean text-white flex flex-col items-center pt-28 p-8">
      <h1 className="text-5xl font-extrabold mb-12 text-center animate-fade-in-down">
        My Publications
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl">
        {publications.map((pub, index) => {
          const CardContent = (
            <div
              // Apply animation delay if you want staggered appearance, similar to the old version
              // style={{ animationDelay: `${index * 100}ms` }}
              className="h-full bg-white rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col justify-between border border-transparent hover:border-indigo-400 group"
            >
              <div>
                <div className="flex items-center mb-4">
                  {/* Optional: Icon for publications - e.g., a document icon */}
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mr-4 group-hover:bg-indigo-200 transition-colors duration-300">
                    <svg
                      className="w-6 h-6 text-indigo-500 group-hover:text-indigo-600 transition-colors duration-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      ></path>
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors duration-300">
                    {pub.title}
                  </h2>
                </div>
                <p className="text-gray-700 text-sm mb-1 group-hover:text-gray-800 transition-colors duration-300">
                  {pub.journal}
                </p>
                <p className="text-gray-500 text-xs group-hover:text-gray-600 transition-colors duration-300">
                  Year: {pub.year}
                </p>
              </div>
              {pub.link && pub.link !== "#" && (
                <div className="mt-4 text-right">
                  <span className="text-xs font-semibold text-indigo-500 group-hover:text-indigo-600 transition-colors duration-300 opacity-0 group-hover:opacity-100 transform translate-y-1 group-hover:translate-y-0 duration-300 ease-in-out">
                    Read More &rarr;
                  </span>
                </div>
              )}
            </div>
          );

          if (pub.link && pub.link !== "#") {
            return (
              <a
                href={pub.link}
                target="_blank"
                rel="noopener noreferrer"
                key={pub.id}
                className="block transform transition-all duration-300 ease-in-out hover:-translate-y-1"
              >
                {CardContent}
              </a>
            );
          }

          return (
            <div
              key={pub.id}
              className="block transform transition-all duration-300 ease-in-out hover:-translate-y-1 cursor-default" // Added cursor-default for non-linked items
            >
              {CardContent}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PublicationsPage;
