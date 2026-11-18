"use client";
/**
 * YEM360 — global client store (zustand):
 * session, navigation, language, theme helpers, badges, socket state.
 */
import { create } from "zustand";
import type { Lang } from "./i18n";
import type { ViewRoute, PublicUser, SettingsDTO, PrivacyDTO } from "./types";

interface SessionState {
  user: PublicUser | null;
  settings: SettingsDTO | null;
  privacy: PrivacyDTO | null;
  counts: { unreadNotifications: number; unreadMessages: number };
  loaded: boolean;
}

interface AppStore extends SessionState {
  lang: Lang;
  route: ViewRoute;
  routeHistory: ViewRoute[];
  sidebarOpen: boolean;
  socketReady: boolean;
  setLang: (l: Lang) => void;
  navigate: (r: ViewRoute) => void;
  goBack: () => void;
  setSession: (s: Partial<SessionState>) => void;
  setCounts: (c: Partial<{ unreadNotifications: number; unreadMessages: number }>) => void;
  setSidebar: (v: boolean) => void;
  setSocketReady: (v: boolean) => void;
  reset: () => void;
}

export const useApp = create<AppStore>((set, get) => ({
  user: null,
  settings: null,
  privacy: null,
  counts: { unreadNotifications: 0, unreadMessages: 0 },
  loaded: false,
  lang: "ar",
  route: { name: "home" },
  routeHistory: [],
  sidebarOpen: false,
  socketReady: false,
  setLang: (lang) => {
    set({ lang });
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
      try {
        localStorage.setItem("yem360_lang", lang);
      } catch {}
    }
  },
  navigate: (route) =>
    set({ route, routeHistory: [...get().routeHistory.slice(-20), get().route], sidebarOpen: false }),
  goBack: () => {
    const hist = [...get().routeHistory];
    const prev = hist.pop();
    set({ route: prev ?? { name: "home" }, routeHistory: hist });
  },
  setSession: (s) => set({ ...s, loaded: true }),
  setCounts: (c) => set({ counts: { ...get().counts, ...c } }),
  setSidebar: (sidebarOpen) => set({ sidebarOpen }),
  setSocketReady: (socketReady) => set({ socketReady }),
  reset: () =>
    set({
      user: null,
      settings: null,
      privacy: null,
      counts: { unreadNotifications: 0, unreadMessages: 0 },
      loaded: true,
      route: { name: "home" },
      routeHistory: [],
    }),
}));
