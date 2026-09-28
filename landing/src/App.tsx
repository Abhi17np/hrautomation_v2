import Nav from './components/Nav';
import Hero from './components/Hero';
import Statement from './components/Statement';
import Walkthrough from './components/Walkthrough';
import Bento from './components/Bento';
import PhotoBand from './components/PhotoBand';
import Faq from './components/Faq';
import FinalCta from './components/FinalCta';
import Footer from './components/Footer';

export default function App() {
  return (
    <>
      <a href="#main"
         className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60]
                    focus:rounded-full focus:bg-accent focus:px-5 focus:py-2 focus:text-accent-on">
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <Hero />
        <Statement />
        <Walkthrough />
        <Bento />
        <PhotoBand />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
