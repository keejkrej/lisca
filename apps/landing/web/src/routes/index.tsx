import { createFileRoute, Link } from "@tanstack/react-router";

import { GITHUB_REPO, GITHUB_URL } from "../lib/constants";
import { landingDemos } from "../lib/demos";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <>
      <header>
        <p>
          <Link to="/">LiSCA</Link>
        </p>
        <p>
          <a href={GITHUB_URL} rel="noopener noreferrer" target="_blank">
            GitHub
          </a>
        </p>
      </header>

      <main>
        <section>
          <p>micropatterned slides · live-cell imaging · single-cell arrays</p>
          <h1>
            Live-cell imaging on <span>single-cell arrays.</span>
          </h1>
          <p>
            LiSCA is analysis software for micropatterned ibidi µ-Slides and custom
            photopatterns — whether you start from prepatterned labware or pattern surfaces with
            the Micro Illumination System. Align images to the grid, annotate regions of interest,
            and read out assays from timelapse data on your array.
          </p>
          <p>
            <a href="#demos">Try with your images</a>
          </p>
        </section>

        <section id="demos">
          <h2>Try it with your microscopy files</h2>
          <p>
            Open a PNG or TIFF from a fixed endpoint or timelapse on patterned cultures. These
            interactive previews show the alignment and annotation steps you would run after
            imaging — no account or lab server required.
          </p>
          {landingDemos.map((demo) => (
            <article key={demo.id}>
              <h3>{demo.title}</h3>
              <p>{demo.description}</p>
              <p>
                <Link to={demo.href}>Open full workspace</Link>
              </p>
            </article>
          ))}
        </section>

        <section id="platform">
          <h2>From patterned surface to readout</h2>
          <p>
            Live-cell imaging on single-cell arrays starts with patterned adhesion sites — on
            prepatterned ibidi labware or surfaces you define with a photomask and the Micro
            Illumination System. Seed cells, image over time, then quantify in LiSCA from the
            first frame to the final assay table.
          </p>

          <article>
            <h3>Aligner</h3>
            <p>
              Map each imaging field to the adhesive-site grid on your slide. Score occupancy,
              exclude empty patterns, and keep site identities consistent across wells and time
              points.
            </p>
          </article>

          <article>
            <h3>Annotator</h3>
            <p>
              Draw masks and labels on cells within patterned regions — for segmentation models,
              phenotype classes, or spot-checking automated calls on live-cell data.
            </p>
          </article>

          <article>
            <h3>Studio</h3>
            <p>
              Carry a full experiment from well selection through alignment, annotation, and assay
              analysis — built around multi-site arrays rather than one field of view.
            </p>
          </article>

          <article>
            <h3>Pattern-first by design</h3>
            <p>
              Every step assumes the regular geometry you get from micropatterned µ-Slides and UV
              photopatterning — not unconstrained monolayers on plain plastic.
            </p>
          </article>
        </section>
      </main>

      <footer>
        <p>LiSCA</p>
        <p>Live-cell imaging on single-cell arrays</p>
        <p>
          <a href={GITHUB_URL} rel="noopener noreferrer" target="_blank">
            github.com/{GITHUB_REPO}
          </a>
        </p>
      </footer>
    </>
  );
}
