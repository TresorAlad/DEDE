import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import OnboardingTour, {
  OnboardingTourLauncher,
  useTourDismissed,
} from "./OnboardingTour";
import Reveal from "./Reveal";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function AppShell({ children }) {
  const { pathname } = useLocation();
  const { dismissed, setDismissed } = useTourDismissed();
  const [tourOpen, setTourOpen] = useState(false);

  // Le tour s'ouvre automatiquement au premier passage sur le tableau de bord
  // (là où il a du sens de pointer les éléments). Sur /welcome, le parcours
  // en trois étapes fait déjà office de guide.
  const isDashboard = pathname === "/dashboard";
  useEffect(() => {
    if (isDashboard && !dismissed) {
      setTourOpen(true);
    }
  }, [isDashboard, dismissed]);

  // Synchronise l'état après fermeture du tour : ne jamais le rouvrir
  // automatiquement dans la même session.
  function closeTour() {
    setTourOpen(false);
    setDismissed(true);
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-background text-on-background">
      <Sidebar />
      <TopBar tourLauncher={<OnboardingTourLauncher onOpen={() => setTourOpen(true)} />} />
      <main className="ml-64 mt-16 h-[calc(100vh-4rem)] overflow-y-auto overflow-x-hidden p-gutter">
        {/* Les pages composent librement leur grille : la cascade porte sur les
            blocs de premier niveau, y compris ceux montés apres le chargement. */}
        <Reveal
          selector=":scope > *"
          className="mx-auto grid max-w-[1600px] grid-cols-12 gap-gutter"
        >
          {children}
        </Reveal>
      </main>

      <OnboardingTour open={tourOpen} onClose={closeTour} />
    </div>
  );
}
