import { DemoShowcase } from "./components/demo-showcase";
import { HeroSection } from "./components/hero-section";
import { PlatformSection } from "./components/platform-section";
import { SiteFooter } from "./components/site-footer";
import { SiteNavbar } from "./components/site-navbar";

export function App() {
  return (
    <div className="min-h-dvh">
      <SiteNavbar />
      <main>
        <HeroSection />
        <DemoShowcase />
        <PlatformSection />
      </main>
      <SiteFooter />
    </div>
  );
}
