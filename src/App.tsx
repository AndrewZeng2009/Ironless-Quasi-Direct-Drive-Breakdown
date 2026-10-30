import { Header } from './sections/Header';
import { Hero } from './sections/Hero';
import { Explorer } from './sections/Explorer';
import { Assembly } from './sections/Assembly';
import { Motor } from './sections/Motor';
import { Gearbox } from './sections/Gearbox';
import { Torque } from './sections/Torque';
import { Performance } from './sections/Performance';
import { Build } from './sections/Build';
import { Source } from './sections/Source';

export function App() {
  return (
    <div id="top">
      <a className="skip" href="#explorer">Skip to the 3D explorer</a>
      <Header />
      <main>
        <Hero />
        <Explorer />
        <Assembly />
        <Motor />
        <Gearbox />
        <Torque />
        <Performance />
        <Build />
        <Source />
      </main>
    </div>
  );
}
