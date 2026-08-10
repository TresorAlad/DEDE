import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function AppShell({ children }) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-background text-on-background">
      <Sidebar />
      <TopBar />
      <main className="ml-64 mt-16 h-[calc(100vh-4rem)] overflow-y-auto overflow-x-hidden p-gutter">
        <div className="mx-auto grid max-w-[1600px] grid-cols-12 gap-gutter animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
