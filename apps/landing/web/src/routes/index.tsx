import { createFileRoute, Link } from "@tanstack/react-router";

import { GITHUB_REPO, GITHUB_URL } from "../lib/constants";
import { landingDemos } from "../lib/demos";
import { landingProducts } from "../lib/landing-content";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  const aligner = landingProducts.find((product) => product.id === "aligner");
  const annotator = landingProducts.find((product) => product.id === "annotator");
  const studio = landingProducts.find((product) => product.id === "studio");

  return (
    <>
      <header>
        <p>
          <Link to="/">LiSCA</Link>
        </p>
      </header>

      <main>
        <section>
          <p>micropatterned slides · live-cell imaging · single-cell arrays</p>
          <h1>
            Live-cell imaging on <span>single-cell arrays.</span>
          </h1>
          <p>
            LiSCA helps cell biologists and pharmacologists analyse micropatterned ibidi µ-Slides
            and custom photopatterns — whether you start from prepatterned labware or define
            adhesion sites with the Micro Illumination System. Align timelapse images to the grid,
            mark regions of interest on individual cells, and turn patterned-array experiments into
            quantitative assay readouts.
          </p>
          <p>
            <a href="#tools">Explore the tools</a>
          </p>
        </section>

        <section id="tools">
          <h2>Try the workflow on your microscopy data</h2>
          <p>
            Load an image from a fixed time point or a timelapse on patterned cultures. These
            browser-based previews use the same alignment and annotation steps you would run after
            an imaging session — no local installation required.
          </p>
          {landingDemos.map((demo) => (
            <article key={demo.id}>
              <h3>{demo.title}</h3>
              <p>{demo.description}</p>
              <p>
                <Link to={demo.href}>{demo.linkLabel}</Link>
              </p>
            </article>
          ))}
        </section>

        <section id="platform">
          <h2>From patterned surface to assay readout</h2>
          <p>
            Live-cell work on single-cell arrays begins with defined adhesion sites — on prepatterned
            ibidi labware or surfaces you pattern with a photomask and the Micro Illumination
            System. After seeding and timelapse imaging, LiSCA carries you from the first frame to
            summary tables and plots.
          </p>

          {aligner ? (
            <article>
              <h3>{aligner.title}</h3>
              <p>{aligner.description}</p>
            </article>
          ) : null}

          {annotator ? (
            <article>
              <h3>{annotator.title}</h3>
              <p>{annotator.description}</p>
            </article>
          ) : null}

          {studio ? (
            <article>
              <h3>{studio.title}</h3>
              <p>{studio.description}</p>
              {studio.assays.map((assay) => (
                <div key={assay.name}>
                  <h4>{assay.name}</h4>
                  <p>{assay.detail}</p>
                </div>
              ))}
            </article>
          ) : null}

          <article>
            <h3>Built for micropattern geometry</h3>
            <p>
              Every step assumes the regular layout of adhesive sites on µ-Slides and
              photopatterned surfaces — not unconstrained monolayers on plain plastic. That keeps
              site identity, occupancy, and timelapse quantification consistent across an entire
              array experiment.
            </p>
          </article>
        </section>
      </main>

      <footer>
        <p>LiSCA</p>
        <p>Live-cell imaging on single-cell arrays</p>
        <p>
          <a href={GITHUB_URL} rel="noopener noreferrer" target="_blank">
            Project repository (github.com/{GITHUB_REPO})
          </a>
        </p>
      </footer>
    </>
  );
}
