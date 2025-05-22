import React from "react";
import BackButton from "../../common/BackButton";

const CUTTIA: React.FC = () => {
  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white flex flex-col items-stretch">
      <div className="px-2 sm:px-4 pt-4 pb-2 flex-shrink-0">
        <BackButton to="/tools" />
      </div>
      <div className="flex-grow relative p-2 sm:p-5 flex justify-center items-center">
        <iframe
          src="https://cutt-ia.vercel.app/"
          title="CUTT-IA"
          className="w-full max-w-3xl h-[60vh] sm:w-[calc(100vw-5rem)] sm:h-[calc(100vh-5rem)] border-0 rounded-lg shadow-lg"
          allowFullScreen
        ></iframe>
      </div>
    </div>
  );
};

export default CUTTIA;
