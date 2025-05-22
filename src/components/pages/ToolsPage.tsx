import React from "react";
import { Link } from "react-router-dom";

interface Tool {
  id: string;
  title: string;
  description: string;
  path: string;
  restricted?: boolean;
}

const tools: Tool[] = [
  {
    id: "cutt-ia",
    title: "CUTT-IA",
    description: "Expert cutting assistant for steel structures.",
    path: "/tools/cutt-ia",
    restricted: true,
  },
  {
    id: "gauge-tool",
    title: "Gauge Tool",
    description: "A gauge for displaying various metrics.",
    path: "/tools/gauge-tool",
  },
];

const ToolsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white flex flex-col items-center pt-28 p-8">
      <h1 className="text-5xl font-extrabold mb-12 text-center animate-fade-in-down">
        Explore My Tools
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl">
        {tools.map((tool) => (
          <Link
            to={tool.path}
            key={tool.id}
            className="group block transform transition-all duration-300 ease-in-out hover:-translate-y-1"
          >
            <div className="h-full bg-white rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col justify-between border border-transparent hover:border-teal-400">
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center mr-4 group-hover:bg-teal-200 transition-colors duration-300">
                    <svg
                      className="w-6 h-6 text-teal-500 group-hover:text-teal-600 transition-colors duration-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      ></path>
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800 group-hover:text-teal-600 transition-colors duration-300 flex items-center">
                    {tool.title}
                    {tool.restricted && (
                      <div className="relative ml-2 group">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors duration-300"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2v-7a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-max px-2 py-1 text-xs text-white bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                          Authorized access only
                        </span>
                      </div>
                    )}
                  </h2>
                </div>
                <p className="text-gray-600 text-sm group-hover:text-gray-700 transition-colors duration-300">
                  {tool.description}
                </p>
              </div>
              <div className="mt-4 text-right">
                <span className="text-xs font-semibold text-teal-500 group-hover:text-teal-600 transition-colors duration-300 opacity-0 group-hover:opacity-100 transform translate-y-1 group-hover:translate-y-0 duration-300 ease-in-out">
                  Learn More &rarr;
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ToolsPage;
