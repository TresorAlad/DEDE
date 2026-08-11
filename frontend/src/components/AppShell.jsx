import Reveal from "./Reveal";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function AppShell({ children }) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-background text-on-background">
      <Sidebar />
      <TopBar />
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
    </div>
  );
}
