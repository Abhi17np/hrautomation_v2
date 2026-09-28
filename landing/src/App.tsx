import Nav from './components/sections/Nav';
import Hero from './components/sections/Hero';
import Problem from './components/sections/Problem';
import Bento from './components/sections/Bento';
import Journey from './components/sections/Journey';
import Product from './components/sections/Product';
import Intelligence from './components/sections/Intelligence';
import Benefits from './components/sections/Benefits';
import Company from './components/sections/Company';
import Voices from './components/sections/Voices';
import FinalCta from './components/sections/FinalCta';
import Footer from './components/Footer';

export default function App() {
  return (
    <>
      <a href="#main"
         className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60]
                    focus:rounded-[8px] focus:bg-brand-700 focus:px-5 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <Hero />          {/* split + live console            */}
        <Problem />       {/* stepped diagonal ladder         */}
        <Bento />         {/* asymmetric bento                */}
        <Journey />       {/* vertical spine                  */}
        <Product />       {/* tab console, real screenshots   */}
        <Intelligence />  {/* dark analytics                  */}
        <Benefits />      {/* alternating storytelling        */}
        <Company />       {/* horizontal timeline             */}
        <Voices />        {/* auto-scrolling carousel         */}
        <FinalCta />      {/* full-bleed declaration          */}
      </main>
      <Footer />
    </>
  );
}
