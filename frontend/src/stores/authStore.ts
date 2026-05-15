import { create } from "zustand";
import { apiFetch, ApiError, getOrCreateGuestId } from "../services/api";

const AUTH_TOKEN_KEY = "authToken";
const USERNAME_KEY = "username";

type AuthTab = "login" | "register";

type AuthState = {
  token: string | null;
  username: string | null;
  guestId: string;
  authModalOpen: boolean;
  authTab: AuthTab;
  authMessage: string;
  authError: string | null;
  isSubmitting: boolean;
  init: () => void;
  openAuthModal: (tab?: AuthTab, message?: string) => void;
  closeAuthModal: () => void;
  setAuthTab: (tab: AuthTab) => void;
  setAuthError: (message: string | null) => void;
  clearAuthError: () => void;
  setAuthMessage: (message?: string) => void;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, confirm: string) => Promise<void>;
  logout: () => void;
  requireAuth: (featureText?: string) => boolean;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  username: null,
  guestId: getOrCreateGuestId(),
  authModalOpen: false,
  authTab: "register",
  authMessage: "",
  authError: null,
  isSubmitting: false,
  init: () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const username = localStorage.getItem(USERNAME_KEY);
    set({ token, username, guestId: getOrCreateGuestId() });
  },
  openAuthModal: (tab = "register", message = "") => {
    set({ authModalOpen: true, authTab: tab, authMessage: message, authError: null });
  },
  closeAuthModal: () => {
    set({ authModalOpen: false, authMessage: "", authError: null });
  },
  setAuthTab: (tab) => {
    set({ authTab: tab, authError: null });
  },
  setAuthError: (message) => {
    set({ authError: message });
  },
  clearAuthError: () => {
    set({ authError: null });
  },
  setAuthMessage: (message = "") => {
    set({ authMessage: message });
  },
  login: async (username, password) => {
    if (!username || !password) {
      set({ authError: "Please enter username and password" });
      return;
    }

    set({ isSubmitting: true, authError: null });

    try {
      const data = await apiFetch<{ access_token: string }>("/auth/login", {
        method: "POST",
        json: { username, password }
      });

      localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
      localStorage.setItem(USERNAME_KEY, username);

      set({
        token: data.access_token,
        username,
        authModalOpen: false,
        authMessage: "",
        authError: null
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : "Login failed";
      set({ authError: message });
    } finally {
      set({ isSubmitting: false });
    }
  },
  register: async (username, password, confirm) => {
    if (!username || !password || !confirm) {
      set({ authError: "Please fill all fields" });
      return;
    }

    if (password !== confirm) {
      set({ authError: "Passwords do not match" });
      return;
    }

    if (password.length < 6) {
      set({ authError: "Password must be at least 6 characters" });
      return;
    }

    set({ isSubmitting: true, authError: null });

    try {
      const data = await apiFetch<{ access_token: string }>("/auth/register", {
        method: "POST",
        json: { username, password }
      });

      localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
      localStorage.setItem(USERNAME_KEY, username);

      set({
        token: data.access_token,
        username,
        authModalOpen: false,
        authMessage: "",
        authError: null
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : "Registration failed";
      set({ authError: message });
    } finally {
      set({ isSubmitting: false });
    }
  },
  logout: () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
    set({ token: null, username: null, authModalOpen: false, authMessage: "", authError: null });
  },
  requireAuth: (featureText) => {
    if (get().token) return true;
    const message = featureText
      ? `Sign up for free to ${featureText}.`
      : "Sign up for free to use this feature.";
    get().openAuthModal("register", message);
    return false;
  }
}));
