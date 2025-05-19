import React from "react";
import BackButton from "../../common/BackButton";

const CUTTIA: React.FC = () => {
  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white flex flex-col items-stretch">
      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <BackButton to="/tools" />
      </div>
      <div className="flex-grow relative p-5">
        <iframe
          src="https://cutt-ia.vercel.app/"
          title="CUTT-IA"
          className="flex inset-0 w-[calc(100vw-5rem)] h-[calc(100vh-5rem)] border-0 rounded-lg"
          allowFullScreen
        ></iframe>
      </div>
    </div>
  );
};

export default CUTTIA;
