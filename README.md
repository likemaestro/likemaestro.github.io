# Murat Güven - Personal Portfolio & Project Showcase

This repository contains the source code for my personal website, showcasing my projects, publications, and tools. The site is built using modern web technologies to provide a clean, responsive, and engaging user experience.

**Live Site:** [https://likemaestro.github.io/](https://likemaestro.github.io/)

## About This Site

This website serves as a central hub for my work, including:

- **Interactive Tools:** Such as CUTT-IA (an expert cutting assistant for steel structures) and a Gauge Tool.
- **Publications:** A collection of my research papers and articles, including my thesis (`GUVEN_THESIS.pdf`).
- **Project Showcase:** Highlighting my skills and projects in web development and potentially other areas.

## Features

- **Responsive Design:** Adapts to various screen sizes for optimal viewing on desktops, tablets, and mobile devices.
- **Interactive Tools Showcase:**
  - **CUTT-IA:** An embedded expert system for steel structure cutting assistance, accessible via an iframe.
  - **Gauge Tool:** A versatile gauge for displaying various metrics.
- **Publications Section:** Provides access to my academic work and research.
- **Modern UI/UX:** Built with a focus on user experience, featuring smooth animations (like the particle network and animated text) and a clean aesthetic.
- **Easy Navigation:** Clear routing and back buttons for a seamless user journey.

## Technologies Used

- **React:** A JavaScript library for building user interfaces.
- **TypeScript:** A typed superset of JavaScript that compiles to plain JavaScript.
- **Tailwind CSS:** A utility-first CSS framework for rapid UI development.
- **React Router:** For declarative routing in the application.
- **GitHub Pages:** For deployment (as indicated by the repository name).

## Project Structure

Key components of the project include:

```
/public
    GUVEN_THESIS.pdf  # Example of a publication asset
/src
    App.tsx             # Main application component
    index.tsx           # Entry point of the application
    /components
        AnimatedTextSection.tsx # Component for animated text
        ParticleNetwork.tsx     # Component for particle background
        /common
            BackButton.tsx      # Reusable back button
        /pages
            PublicationsPage.tsx # Page for listing publications
            ToolsPage.tsx        # Page for showcasing tools
        /tools
            /CUTT-IA
                CUTT-IA.tsx     # Component for the CUTT-IA tool
            /GaugeTool
                GaugeTool.tsx   # Component for the Gauge tool
```

## Getting Started (Development)

To get a local copy up and running, follow these simple steps.

### Prerequisites

- Node.js (v16.x or later recommended)
- npm (comes with Node.js)

### Installation

1.  Clone the repo:
    ```powershell
    git clone https://github.com/likemaestro/likemaestro.github.io.git
    ```
2.  Navigate to the project directory:
    ```powershell
    cd likemaestro.github.io
    ```
3.  Install NPM packages:
    ```powershell
    npm install
    ```

### Available Scripts

In the project directory, you can run:

- `npm start`:
  Runs the app in development mode.
  Open [http://localhost:3000](http://localhost:3000) to view it in the browser.
  The page will reload if you make edits.

- `npm run build`:
  Builds the app for production to the `build` folder.
  It correctly bundles React in production mode and optimizes the build for the best performance.

- `npm test`:
  Launches the test runner in interactive watch mode.

- `npm run eject`:
  **Note: this is a one-way operation. Once you `eject`, you can’t go back!**
  This command will remove the single build dependency from your project and copy all configuration files and transitive dependencies into your project.

## Deployment

This site is deployed using GitHub Pages. The `npm run build` script creates a `build` folder, and GitHub Pages is typically configured to serve from this folder (or a `docs` folder, or the `gh-pages` branch).

## Author

**Murat Güven**

- GitHub: [@likemaestro](https://github.com/likemaestro)

## Acknowledgements

- Create React App
- Tailwind CSS
- React Router
