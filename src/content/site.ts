// Site content. Titles keep their published casing. Verified entries only (CV, Oct 2026). Drafts awaiting Murat's wording are marked DRAFT.

export const SELF = "M. Güven";

export interface DatedEntry {
  /** ISO date used for ordering; "forthcoming" sorts first. */
  sort: string;
  forthcoming?: boolean;
  date: string;
  title: string;
  url?: string;
  authors?: string[];
  detail: string;
}

export const publications: DatedEntry[] = [
  {
    sort: "2027-07-07",
    forthcoming: true,
    date: "Forthcoming",
    title: "Metals Driving Sustainable Construction",
    url: "https://isbnsearch.org/isbn/9781394351657",
    authors: ["A. Kanyilmaz", SELF],
    detail: "Book, Wiley. ISBN 9781394351657",
  },
  {
    sort: "2026-01-01",
    date: "2026",
    title: "Topology Optimization of Nonlinear Elastic Micro-structures by a Domain Reduction Technique",
    url: "https://doi.org/10.1016/j.finel.2026.104599",
    authors: [SELF, "İ. Özdemir"],
    detail: "Finite Elements in Analysis and Design 260, 104599",
  },
  {
    sort: "2025-01-01",
    date: "2025",
    title: "Laser Cutting of Key Metals in the Construction Industry",
    authors: ["A. Kanyilmaz", SELF, "B. Previtali"],
    detail: "Extended abstract, ESTAD 2025, Verona",
  },
  {
    sort: "2023-01-01",
    date: "2023",
    title: "Topology Optimization of Nonlinear Elastic Microstructures",
    url: "/GUVEN_THESIS.pdf",
    authors: [SELF],
    detail: "MSc thesis, İzmir Institute of Technology (PDF)",
  },
];

export const activity: DatedEntry[] = [
  {
    sort: "2025-11-26",
    date: "Nov 2025",
    title: "Digital Innovation of Construction: How can digital innovation make construction processes more efficient?",
    detail: "Speaker, PropTech Day 2025, Politecnico di Milano",
  },
  {
    sort: "2025-11-12",
    date: "Nov 2025",
    title: "AI Workshop",
    detail: "Guest lecturer, Life Cycle Driven Design, Sustainable Architecture and Landscape Design, Politecnico di Milano (Piacenza)",
  },
  {
    sort: "2025-10-13",
    date: "Oct 2025",
    title: "AI for Architecture",
    detail: "Co-instructor, MaBa.DESIGN, Politecnico di Milano",
  },
  {
    sort: "2025-09-21",
    date: "Sep 2025",
    title: "ChatGPT as an Engineering Assistant",
    detail: "Speaker, Festival Internazionale dell'Ingegneria, Politecnico di Milano",
  },
  {
    sort: "2025-09-01",
    date: "2024–25",
    title: "Sensitivity Analysis in Steel Cutting Method Selection for the Construction Industry",
    detail: "MSc thesis co-supervision, Politecnico di Milano. Two more ongoing",
  },
  {
    sort: "2024-11-01",
    date: "2024–25",
    title: "Life-Cycle Driven Structures: from Concept to Construction",
    detail: "Teaching assistant, Politecnico di Milano",
  },
  {
    sort: "2024-08-08",
    date: "Aug 2024",
    title: "Executive AI strategy training",
    detail: "Co-instructor, Braun Engineering Group, Munich",
  },
];

export const timeline = [
  { year: "2024–", title: "PhD candidate", place: "Politecnico di Milano, ABC", note: "PNRR-funded. Advisor: Assoc. Prof. Alper Kanyilmaz" },
  { year: "2024", title: "Research fellow", place: "Politecnico di Milano, DABC", note: "Structural design and fabrication for steel" },
  { year: "2020–23", title: "MSc", place: "İzmir Institute of Technology", note: "Topology Optimization of Nonlinear Elastic Microstructures" },
  { year: "2016–20", title: "BSc, Civil Engineering", place: "Kocaeli University", note: "" },
];

// Research statement chosen by Murat (2026-10-22), close to his CV thesis title. Method only: no case, partner or
// machine names, no numbers.
export const phdParagraph =
  "In my PhD I develop BIM-integrated decision support for choosing between laser and plasma cutting in steel construction, balancing cost, time and carbon across a whole project.";

export const email = "murat.guven@polimi.it";

export const profiles = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/muratguvenn" },
  { label: "GitHub", href: "https://github.com/likemaestro" },
  { label: "ResearchGate", href: "https://www.researchgate.net/profile/Murat-Gueven" },
  { label: "ORCID", href: "https://orcid.org/0000-0003-2712-0523" },
  { label: "Google Scholar", href: "https://scholar.google.com/citations?user=Jt-dDrcAAAAJ" },
];
