import React from "react";

const AnimatedTextSection: React.FC = () => {
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-center items-end py-4 md:py-8 pointer-events-none">
      <h2
        className="
          text-4xl sm:text-5xl md:text-6xl lg:text-7xl
          font-extrabold uppercase text-right
          text-transparent bg-clip-text
          bg-gradient-to-r from-white via-white to-slate-500
          hover:to-white
          bg-[length:300%_100%] bg-[position:99%_0]
          hover:bg-[position:0%_0]
          transition-all duration-1000 ease-in-out
          mb-6 md:mb-8
          cursor-default
          tracking-tight
          pointer-events-auto
        "
      >
        ARTIFICIAL INTELLIGENCE
      </h2>
      <h2
        className="
          text-4xl sm:text-5xl md:text-6xl lg:text-7xl
          font-extrabold uppercase text-right
          text-transparent bg-clip-text
          bg-gradient-to-r from-white via-white to-slate-500
          hover:to-white
          bg-[length:300%_100%] bg-[position:99%_0]
          hover:bg-[position:0%_0]
          transition-all duration-1000 ease-in-out
          mb-6 md:mb-8
          cursor-default
          tracking-tight
          pointer-events-auto
        "
      >
        LASER CUTTING
      </h2>
      <h2
        className="
          text-4xl sm:text-5xl md:text-6xl lg:text-7xl
          font-extrabold uppercase text-right
          text-transparent bg-clip-text
          bg-gradient-to-r from-white via-white to-slate-500
          hover:to-white
          bg-[length:300%_100%] bg-[position:99%_0]
          hover:bg-[position:0%_0]
          transition-all duration-1000 ease-in-out
          mb-6 md:mb-8
          cursor-default
          tracking-tight
          pointer-events-auto
        "
      >
        OPTIMIZATION
      </h2>
      <h2
        className="
          text-4xl sm:text-5xl md:text-6xl lg:text-7xl
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
        "
      >
        COMPUTATIONAL MECHANICS
      </h2>
    </div>
  );
};

export default AnimatedTextSection;
