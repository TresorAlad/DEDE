import Sidebar from "./Sidebar";

export default function AppShell({ children, wide = false }) {
  return (
    <div className="relative min-h-screen bg-surface">
      {/* Bandeau fixe pour éviter tout trou blanc sous la sidebar */}
      <div className="pointer-events-none fixed top-0 left-0 z-30 h-screen w-64 bg-primary" aria-hidden="true" />
      <Sidebar />
      <main
        className={`relative z-10 ml-64 min-h-screen overflow-x-hidden px-6 py-7 md:px-8 animate-fade-in ${
          wide ? "max-w-none" : ""
        }`}
      >
        {children}
      </main>
    </div>
  );
}
