import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import LiveCell from "./LiveCell";
import LaserBand from "./LaserBand";
import DatedList from "./DatedList";
import { activity, email, profiles, publications, timeline } from "../content/site";

const Wrap: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`mx-auto max-w-page px-4 sm:px-6 ${className}`}>{children}</div>
);

const Section: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => (
  <section id={id} aria-labelledby={`${id}-h`} className="py-16 md:py-28">
    <Wrap>
      <h2 id={`${id}-h`} className="t-h2 mb-8 md:mb-12">{title}</h2>
      {children}
    </Wrap>
  </section>
);

const FEAD_STATES = [
  { src: "/img/fead/initial.png", label: "Initial", w: 499 },
  { src: "/img/fead/iter010.png", label: "Iteration 10", w: 90 },
  { src: "/img/fead/iter050.png", label: "Iteration 50", w: 90 },
  { src: "/img/fead/final.png", label: "Final, iteration 250", w: 499 },
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
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-canvas focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header>
        <Wrap className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 py-6">
          <a href="/" className="t-name">Murat Güven</a>
          <nav aria-label="Sections">
            <ul className="t-data flex flex-wrap gap-x-6 gap-y-2">
              <li><a className="link" href="#research">Research</a></li>
              <li><a className="link" href="#publications">Publications</a></li>
              <li><a className="link" href="#about">About</a></li>
              <li><a className="link" href="/Murat_Guven_CV.pdf">CV (PDF)</a></li>
            </ul>
          </nav>
        </Wrap>
      </header>

      <main id="main">
        <Wrap className="grid gap-x-8 gap-y-12 pb-20 pt-10 md:pt-16 lg:grid-cols-12 lg:pb-28">
          <div className="lg:col-span-5">
            <h1 className="t-display">I develop AI and optimization methods for structural engineering and steel construction.</h1>
            <p className="mt-6 max-w-[46ch] text-ink-2">
              PhD candidate at Politecnico di Milano. My current work is decision support for choosing how steel parts are cut, built on BIM models.
            </p>
          </div>
          <div className="min-w-0 lg:col-span-7">
            <LiveCell />
          </div>
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
                I work on computational and AI-based decision support for structural engineering and sustainable construction.
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
