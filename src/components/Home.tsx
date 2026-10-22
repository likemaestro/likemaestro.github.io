import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import LiveCell from "./LiveCell";
import LaserBand from "./LaserBand";
import DatedList from "./DatedList";
import { activity, email, profiles, publications, timeline } from "../content/site";

const Wrap: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`mx-auto max-w-page px-4 sm:px-6 ${className}`}>{children}</div>
);

// Profile marks for the header (Simple Icons / GitHub Octicons paths, 24-unit viewBox); the full list is in Contact.
const MARKS: Record<string, string> = {
  GitHub: "M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.83 1.24 1.83 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.2.69.82.57A12 12 0 0 0 12 .3",
  LinkedIn: "M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zm1.78 13.02H3.56V9h3.56v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0h.01z",
  "Google Scholar": "M5.24 13.77 0 9.5 12 0l12 9.5-5.24 4.27C17.55 11.25 14.98 9.5 12 9.5c-2.98 0-5.55 1.75-6.76 4.27zM12 10a7 7 0 1 0 0 14 7 7 0 0 0 0-14z",
};

const Section: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => (
  <section id={id} aria-labelledby={`${id}-h`} className="py-16 md:py-28">
    <Wrap>
      <h2 id={`${id}-h`} className="t-h2 mb-8 md:mb-12">{title}</h2>
      {children}
    </Wrap>
  </section>
);

const FEAD_STATES = [
  { src: "/img/fead/initial.png", label: "Initial", w: 260 },
  { src: "/img/fead/iter010.png", label: "Iteration 10", w: 90 },
  { src: "/img/fead/iter050.png", label: "Iteration 50", w: 90 },
  { src: "/img/fead/final.png", label: "Final, iteration 250", w: 260 },
];

const WorkRow: React.FC<{ title: string; meta: string; children: React.ReactNode; figure?: React.ReactNode }> = ({ title, meta, children, figure }) => (
  <article className="grid gap-x-8 gap-y-6 border-t border-rule py-10 md:grid-cols-12">
    <div className={`min-w-0 ${figure ? "md:col-span-6" : "md:col-span-8"}`}>
      <p className="t-data text-ink-2">{meta}</p>
      <h3 className="t-h3 mt-2">{title}</h3>
      <div className="mt-3 max-w-[64ch] space-y-3 text-ink-2">{children}</div>
    </div>
    {figure && <div className="min-w-0 md:col-span-6">{figure}</div>}
  </article>
);

const Home: React.FC = () => {
  const { hash } = useLocation();
  useEffect(() => {
    // Jump, not smooth-scroll: this runs on deep links such as /publications -> /#publications.
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "instant" as ScrollBehavior });
  }, [hash]);

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-canvas focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header>
        <Wrap className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-6">
          <a href="/" className="t-name">Murat Güven</a>
          {/* Phones: name and profile marks on one row, the sections below. Wider: name … sections | marks. */}
          <nav aria-label="Sections" className="max-md:order-last max-md:w-full md:ml-auto">
            <ul className="t-data flex flex-wrap gap-x-6 gap-y-2">
              <li><a className="link" href="#research">Research</a></li>
              <li><a className="link" href="#publications">Publications</a></li>
              <li><a className="link" href="#about">About</a></li>
              <li><a className="link" href="/Murat_Guven_CV.pdf" aria-label="CV, PDF">CV</a></li>
            </ul>
          </nav>
          <ul aria-label="Profiles" className="-mr-1.5 flex items-center gap-x-1 md:border-l md:border-rule md:pl-4">
            {profiles.filter((p) => MARKS[p.label]).map((p) => (
              <li key={p.label}>
                <a href={p.href} rel="noopener noreferrer" aria-label={p.label} title={p.label} className="-my-1.5 block p-1.5 text-ink-2 transition-colors duration-150 hover:text-ink">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[1.125rem] w-[1.125rem]" fill="currentColor"><path d={MARKS[p.label]} /></svg>
                </a>
              </li>
            ))}
          </ul>
        </Wrap>
      </header>

      <main id="main">
        <Wrap className="grid gap-y-12 pb-16 pt-10 md:pt-12 lg:pb-20 xl:grid-cols-[minmax(0,1fr)_auto] xl:gap-x-16">
          <div className="min-w-0">
            {/* Side by side, the cap height (not the line box) starts level with the lab's buttons: Archivo sits 0.134em lower. */}
            <h1 className="t-display max-w-[22ch] xl:mt-[-0.134em]">I develop AI and computational methods for structural engineering and sustainable construction.</h1>
            <p className="mt-6 max-w-[46ch] text-ink-2">
              PhD candidate at Politecnico di Milano. My work spans optimization methods, BIM-integrated workflows and computational tools for steel fabrication.
            </p>
          </div>
          <LiveCell />
        </Wrap>

        <LaserBand />

        <Section id="research" title="Research">
          <WorkRow
            meta="MSc research, published 2026"
            title="Topology optimization of nonlinear elastic microstructures"
            figure={
              <figure>
                <ol className="grid grid-cols-4 gap-3">
                  {FEAD_STATES.map((s) => (
                    <li key={s.src} className="min-w-0">
                      <img src={s.src} width={s.w} height={s.w} alt={`Unit cell density, ${s.label.toLowerCase()}`} loading="lazy" className="aspect-square w-full border border-rule" />
                      <span className="t-data mt-1 block text-ink-2">{s.label}</span>
                    </li>
                  ))}
                </ol>
                <figcaption className="t-small mt-3 text-ink-2">
                  Recorded optimization states for a negative Poisson's ratio target. Source: MSc thesis, İzmir Institute of Technology, 2023
                </figcaption>
              </figure>
            }
          >
            <p>
              A domain reduction technique for topology optimization of periodic microstructures with nonlinear elastic material behaviour.
              Published with İ. Özdemir in <a className="link text-ink" href="https://doi.org/10.1016/j.finel.2026.104599">Finite Elements in Analysis and Design</a>.
            </p>
          </WorkRow>
          <WorkRow meta="2026, team project" title="Bridge health indicators from monitoring data">
            <p>
              Unsupervised anomaly detection on long-term bridge monitoring data: an attention-based multi-modal autoencoder with a statistical baseline,
              built for the EWSHM 2026 Students & Young Professionals Challenge.
            </p>
          </WorkRow>
          <WorkRow meta="2024, team project" title="concApp">
            <p>An early-stage structural design app that optimizes for cost and embodied carbon.</p>
          </WorkRow>
        </Section>

        <Section id="publications" title="Publications">
          <DatedList items={publications} />
        </Section>

        <Section id="teaching" title="Teaching and talks">
          <DatedList items={activity} />
        </Section>

        <Section id="about" title="About">
          <div className="grid gap-x-8 gap-y-10 md:grid-cols-12">
            <div className="max-w-[64ch] space-y-4 md:col-span-6">
              <p>
                I am a PhD candidate in the Department of Architecture, Built Environment and Construction Engineering at Politecnico di Milano.
                I develop AI and computational methods for structural engineering and sustainable construction.
              </p>
              <p>
                Before the PhD I was a research fellow at Politecnico di Milano, working on structural design and fabrication for steel.
                My MSc at İzmir Institute of Technology was on topology optimization of nonlinear elastic microstructures.
                I also run AI workshops and trainings for architects and engineers.
              </p>
            </div>
            <ol className="border-t border-rule md:col-span-5 md:col-start-8">
              {timeline.map((t) => (
                <li key={t.year + t.title} className="grid grid-cols-[5.5rem_1fr] gap-x-4 border-b border-rule py-4">
                  <span className="t-data text-ink-2">{t.year}</span>
                  <div className="min-w-0">
                    <p className="font-[520]">{t.title}</p>
                    <p className="t-data text-ink-2">{t.place}</p>
                    {t.note && <p className="t-small text-ink-2">{t.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Section>

        <Section id="contact" title="Contact">
          <p className="t-h3"><a className="link" href={`mailto:${email}`}>{email}</a></p>
          <ul className="t-data mt-6 flex flex-wrap gap-x-6 gap-y-2">
            {profiles.map((p) => (
              <li key={p.label}><a className="link" href={p.href} rel="noopener noreferrer">{p.label}</a></li>
            ))}
          </ul>
        </Section>
      </main>

      <footer className="border-t border-rule">
        <Wrap className="t-small py-8 text-ink-2">© {new Date().getFullYear()} Murat Güven</Wrap>
      </footer>
    </>
  );
};

export default Home;
