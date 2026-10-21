import React from "react";
import { phdParagraph } from "../content/site";

const LaserBand: React.FC = () => (
  <section aria-labelledby="phd-h" className="bg-bay text-canvas">
    <div className="mx-auto max-w-page px-4 py-20 sm:px-6">
      <h2 id="phd-h" className="t-h2">Current work</h2>
      <p className="mt-6 max-w-[60ch] text-[#C9D1D5]">{phdParagraph}</p>
    </div>
  </section>
);

export default LaserBand;
