import React, { useState, useEffect, useRef } from "react";
import { Search, Layers, User, Calendar, Landmark, X, Command } from "lucide-react";
import { api } from "../api";

interface CommandPaletteProps {
  onNavigateToTab: (tab: string) => void;
  onViewAssetDetails: (asset: any) => void;
  theme: "dark" | "light";
}

export default function CommandPalette({ onNavigateToTab, onViewAssetDetails, theme }: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    departments: any[];
    users: any[];
    assets: any[];
    bookings: any[];
  }>({
    departments: [],
    users: [],
    assets: [],
    bookings: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isDark = theme === "dark";

  // Listen to Cmd+K or Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Set focus when open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery("");
      setResults({ departments: [], users: [], assets: [], bookings: [] });
    }
  }, [isOpen]);

  // Debounced search query
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults({ departments: [], users: [], assets: [], bookings: [] });
      return;
    }

    const delay = setTimeout(async () => {
      setIsLoading(true);
      try {
        const searchResults = await api.globalSearch(query);
        setResults(searchResults);
      } catch (err) {
        console.error("Global search error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(delay);
  }, [query]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-[11px] font-sans transition-all border shadow-sm cursor-pointer ${
          isDark 
            ? "bg-slate-900/60 hover:bg-slate-900 border-slate-800/80 text-slate-400 hover:text-slate-200" 
            : "bg-white hover:bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800"
        }`}
        title="Open command palette"
      >
        <Command className="w-3.5 h-3.5 text-slate-400" />
        <span>Search workspace...</span>
        <kbd className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
          isDark ? "bg-slate-950 border-slate-800 text-slate-500" : "bg-slate-100 border-slate-200 text-slate-400"
        }`}>⌘K</kbd>
      </button>
    );
  }

  const hasResults =
    results.assets.length > 0 ||
    results.users.length > 0 ||
    results.bookings.length > 0 ||
    results.departments.length > 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-20 p-4 font-sans text-xs">
      <div className={`border rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col ${
        isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
      }`}>
        
        {/* Input area */}
        <div className={`p-4 border-b flex items-center justify-between gap-3 relative ${
          isDark ? "bg-slate-950 border-slate-900" : "bg-white border-slate-100"
        }`}>
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search assets, employees, corporate divisions, resource bookings..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`w-full text-xs bg-transparent outline-none ${
              isDark ? "text-white placeholder-slate-500" : "text-slate-800 placeholder-slate-400"
            }`}
          />
          {isLoading && (
            <span className="text-[10px] font-mono text-indigo-500 animate-pulse shrink-0">Searching...</span>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 p-1 rounded-lg transition shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results directory scroll area */}
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-900">
          
          {!hasResults && query.trim().length >= 2 && !isLoading && (
            <div className="text-center py-8 text-slate-400">
              No matching records found for "{query}"
            </div>
          )}

          {!hasResults && query.trim().length < 2 && (
            <div className={`p-4 space-y-2 font-mono text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              <span className={`text-[11px] font-bold block mb-1 font-sans ${isDark ? "text-slate-400" : "text-slate-600"}`}>Quick Navigation Links:</span>
              <div 
                className={`flex justify-between p-2 rounded-xl transition cursor-pointer ${
                  isDark ? "hover:bg-slate-900 hover:text-slate-200" : "hover:bg-slate-50 hover:text-slate-800"
                }`} 
                onClick={() => { onNavigateToTab("dashboard"); setIsOpen(false); }}
              >
                <span>Jump to Dashboard</span>
                <span>[dashboard]</span>
              </div>
              <div 
                className={`flex justify-between p-2 rounded-xl transition cursor-pointer ${
                  isDark ? "hover:bg-slate-900 hover:text-slate-200" : "hover:bg-slate-50 hover:text-slate-800"
                }`} 
                onClick={() => { onNavigateToTab("assets"); setIsOpen(false); }}
              >
                <span>Jump to Hardware Assets</span>
                <span>[assets]</span>
              </div>
              <div 
                className={`flex justify-between p-2 rounded-xl transition cursor-pointer ${
                  isDark ? "hover:bg-slate-900 hover:text-slate-200" : "hover:bg-slate-50 hover:text-slate-800"
                }`} 
                onClick={() => { onNavigateToTab("bookings"); setIsOpen(false); }}
              >
                <span>Jump to Resource Scheduling</span>
                <span>[bookings]</span>
              </div>
            </div>
          )}

          {/* Categorized lists */}
          {results.assets.length > 0 && (
            <div className="p-3 space-y-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-500 block mb-1">Hardware & Assets</span>
              {results.assets.map((asset: any) => (
                <div
                  key={asset.id}
                  onClick={() => {
                    onViewAssetDetails(asset);
                    setIsOpen(false);
                  }}
                  className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition border ${
                    isDark 
                      ? "bg-slate-900/40 hover:bg-slate-900 border-slate-800/40 hover:border-slate-800 text-slate-300" 
                      : "bg-slate-50/60 hover:bg-slate-100 border-slate-150 hover:border-slate-200 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-4 h-4 text-indigo-500 shrink-0" />
                    <div>
                      <h4 className={`font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>{asset.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">Tag: {asset.tag} • {asset.location}</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded-lg border ${
                    isDark ? "bg-slate-950 border-slate-800 text-indigo-300" : "bg-slate-100 border-slate-200 text-indigo-600"
                  }`}>{asset.status}</span>
                </div>
              ))}
            </div>
          )}

          {results.users.length > 0 && (
            <div className="p-3 space-y-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-500 block mb-1">Employee Directory</span>
              {results.users.map((u: any) => (
                <div
                  key={u.id}
                  onClick={() => {
                    onNavigateToTab("org");
                    setIsOpen(false);
                  }}
                  className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition border ${
                    isDark 
                      ? "bg-slate-900/40 hover:bg-slate-900 border-slate-800/40 hover:border-slate-800 text-slate-300" 
                      : "bg-slate-50/60 hover:bg-slate-100 border-slate-150 hover:border-slate-200 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <User className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <h4 className={`font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>{u.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">{u.email}</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded-lg border ${
                    isDark ? "bg-slate-950 border-slate-800 text-emerald-300" : "bg-slate-100 border-slate-200 text-emerald-600"
                  }`}>{u.role}</span>
                </div>
              ))}
            </div>
          )}

          {results.bookings.length > 0 && (
            <div className="p-3 space-y-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-pink-500 block mb-1">Bookings & Reservations</span>
              {results.bookings.map((b: any) => (
                <div
                  key={b.id}
                  onClick={() => {
                    onNavigateToTab("bookings");
                    setIsOpen(false);
                  }}
                  className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition border ${
                    isDark 
                      ? "bg-slate-900/40 hover:bg-slate-900 border-slate-800/40 hover:border-slate-800 text-slate-300" 
                      : "bg-slate-50/60 hover:bg-slate-100 border-slate-150 hover:border-slate-200 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-pink-500 shrink-0" />
                    <div>
                      <h4 className={`font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>"{b.title}"</h4>
                      <p className="text-[10px] text-slate-400 font-mono">Resource: {b.assetName} • By: {b.userName}</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded-lg border ${
                    isDark ? "bg-slate-950 border-slate-800 text-pink-300" : "bg-slate-100 border-slate-200 text-pink-600"
                  }`}>{b.status}</span>
                </div>
              ))}
            </div>
          )}

          {results.departments.length > 0 && (
            <div className="p-3 space-y-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-500 block mb-1">Departments</span>
              {results.departments.map((dept: any) => (
                <div
                  key={dept.id}
                  onClick={() => {
                    onNavigateToTab("org");
                    setIsOpen(false);
                  }}
                  className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition border ${
                    isDark 
                      ? "bg-slate-900/40 hover:bg-slate-900 border-slate-800/40 hover:border-slate-800 text-slate-300" 
                      : "bg-slate-50/60 hover:bg-slate-100 border-slate-150 hover:border-slate-200 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Landmark className="w-4 h-4 text-blue-500 shrink-0" />
                    <div>
                      <h4 className={`font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>{dept.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">Code: {dept.id}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
