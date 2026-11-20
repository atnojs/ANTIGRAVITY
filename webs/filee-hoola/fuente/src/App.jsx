import Nav from './components/Nav.jsx';
import Hero from './components/Hero.jsx';
import Footer from './components/Footer.jsx';
import { Automation, Download, Faq, Features, Formats, Gallery, How, Hwp, Showcase, Specs, VideoSection, WhatsNew } from './components/Sections.jsx';
import { useJsClass, useReveal } from './hooks.js';

export default function App() {
  useJsClass();
  useReveal();

  return (
    <>
      <a className="skip" href="#main">
        Saltar al contenido
      </a>
      <div className="backdrop" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>

      <Nav />

      <main id="main">
        <Hero />
        <VideoSection />
        <How />
        <Showcase />
        <WhatsNew />
        <Features />
        <Formats />
        <Hwp />
        <Automation />
        <Gallery />
        <Faq />
        <Specs />
        <Download />
      </main>

      <Footer />
    </>
  );
}
