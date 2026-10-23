import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import LiveCell from "./LiveCell";
import LaserBand from "./LaserBand";
import DatedList from "./DatedList";
import SiteHeader, { SiteFooter, Wrap } from "./SiteHeader";
import { activity, email, profiles, publications, timeline } from "../content/site";

const Section: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => (
  <section id={id} aria-labelledby={`${id}-h`} className="-scroll-mt-6 py-16 md:-scroll-mt-[4.5rem] md:py-28">
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
      <SiteHeader />

      <main id="main">
        {/* Side by side, the hero fills the first screen (less the 4.375rem header) with its content centred in it. */}
        <Wrap className="grid gap-y-12 pb-16 pt-10 md:pt-12 lg:pb-20 xl:min-h-[calc(100svh-4.375rem)] xl:grid-cols-[minmax(0,1fr)_auto] xl:content-center xl:gap-x-16 xl:py-10">
          <div className="min-w-0 [container-type:inline-size]">
            {/* Side by side, the cap height (not the line box) starts level with the lattice: Archivo sits 0.134em lower.
                The size follows the column, so "computational", the longest word, just fits, and the window height, so
                seven lines and the sub-line stay within the lattice's height. */}
            <h1 className="t-display max-w-[22ch] xl:mt-[-0.134em] xl:text-[clamp(2.5rem,min(12.4cqi,calc((100svh-20rem)/7)),6rem)]">I develop AI and computational methods for structural engineering and sustainable construction.</h1>
            <p className="mt-6 max-w-[46ch] text-ink-2 xl:text-[1.1875rem]">
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
                  Recorded optimization states for a negative Poisson’s ratio target. Source: MSc thesis, İzmir Institute of Technology, 2023
                </figcaption>
              </figure>
            }
          >
            <p>
              A domain reduction technique for topology optimization of periodic microstructures with nonlinear elastic material behaviour.
              Published with İ. Özdemir in <a className="link text-ink" href="https://doi.org/10.1016/j.finel.2026.104599">Finite Elements in Analysis and Design</a>.
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

      <SiteFooter />
    </>
  );
};

export default Home;
