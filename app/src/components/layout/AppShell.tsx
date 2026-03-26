"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { Sidebar } from "./Sidebar";

interface AppShellContextValue {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const AppShellContext = createContext<AppShellContextValue>({
  darkMode: false,
  toggleDarkMode: () => {},
});

export function useAppShell() {
  return useContext(AppShellContext);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("homeserv-dark-mode");
    const prefersDark =
      stored === "true" ||
      (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDarkMode(prefersDark);
    if (prefersDark) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("homeserv-dark-mode", String(next));
  };

  return (
    <AppShellContext.Provider value={{ darkMode, toggleDarkMode }}>
      <div className="h-full flex warm-gradient">
        {/* Desktop sidebar */}
        <div
          className={`transition-all duration-500 ease-in-out ${
            isMobile ? "w-0 opacity-0 overflow-hidden" : "w-20 opacity-100"
          }`}
        >
          <Sidebar />
        </div>

        {/* Mobile bottom bar */}
        {isMobile && <Sidebar />}

        <main
          className={`flex-1 overflow-y-auto transition-all duration-500 ease-in-out ${
            isMobile ? "ml-0 pb-16" : "ml-20"
          }`}
        >
          {children}
        </main>
      </div>
    </AppShellContext.Provider>
  );
}
