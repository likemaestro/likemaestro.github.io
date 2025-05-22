import React from "react";

const animatedTextFontSize = "text-2xl sm:text-4xl md:text-5xl lg:text-7xl";

const commonHeadingClasses = `
  ${animatedTextFontSize}
  font-extrabold uppercase text-right
  text-transparent bg-clip-text
  bg-gradient-to-r from-white via-white to-slate-500
  hover:to-white
  bg-[length:300%_100%] bg-[position:99%_0]
  hover:bg-[position:0%_0]
  transition-all duration-1000 ease-in-out
  cursor-default
  tracking-tight
  pointer-events-auto
  break-words
  whitespace-normal
`;

const keywordSpacing = "mb-6"; // Define the spacing variable

const keywords = [
  "ARTIFICIAL INTELLIGENCE",
  "LASER CUTTING",
  "OPTIMIZATION",
  "COMPUTATIONAL MECHANICS",
];

const AnimatedTextSection: React.FC = () => {
  return (
    <div className="flex flex-col justify-center items-end w-full max-w-full sm:max-w-[700px] md:max-w-[700px] lg:max-w-[700px] text-right px-2 sm:px-0">
      <div className="flex flex-col w-full text-right break-words whitespace-normal">
        {keywords.map((keyword, index) => (
          <h2
            key={keyword}
            className={`${commonHeadingClasses} ${
              index < keywords.length - 1 ? keywordSpacing : ""
            }`}
          >
            {keyword}
          </h2>
        ))}
      </div>
    </div>
  );
};

export default AnimatedTextSection;
