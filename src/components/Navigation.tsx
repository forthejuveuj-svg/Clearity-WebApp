import { Search } from "lucide-react";

export const Navigation = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent via-secondary to-primary flex items-center justify-center shadow-lg shadow-primary/20">
          <span className="text-white font-bold text-xl">C</span>
        </div>
        <span className="text-xl font-medium gradient-text">Clearity</span>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-4">
        <button 
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 transition-all duration-300 hover:scale-110"
          aria-label="Search"
        >
          <Search className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
    </nav>
  );
};
