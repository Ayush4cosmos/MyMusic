import React, { useEffect, useState } from "react";
import Modal from "../../components/Modal";
import Button from "../../components/Button";
import { useAuthStore } from "../../stores/authStore";

export default function AuthModal() {
  const authModalOpen = useAuthStore((state) => state.authModalOpen);
  const authTab = useAuthStore((state) => state.authTab);
  const authMessage = useAuthStore((state) => state.authMessage);
  const authError = useAuthStore((state) => state.authError);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);
  const closeAuthModal = useAuthStore((state) => state.closeAuthModal);
  const setAuthTab = useAuthStore((state) => state.setAuthTab);
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  useEffect(() => {
    if (!authModalOpen) {
      setLoginUsername("");
      setLoginPassword("");
      setRegUsername("");
      setRegPassword("");
      setRegConfirm("");
    }
  }, [authModalOpen]);

  const formBody = authTab === "login" ? (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-semibold text-slate-600">Username</label>
        <input
          value={loginUsername}
          onChange={(event) => setLoginUsername(event.target.value)}
          className="mt-1 w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-600">Password</label>
        <input
          type="password"
          value={loginPassword}
          onChange={(event) => setLoginPassword(event.target.value)}
          className="mt-1 w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300"
        />
      </div>
    </div>
  ) : (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-semibold text-slate-600">Username</label>
        <input
          value={regUsername}
          onChange={(event) => setRegUsername(event.target.value)}
          className="mt-1 w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-600">Password</label>
        <input
          type="password"
          value={regPassword}
          onChange={(event) => setRegPassword(event.target.value)}
          className="mt-1 w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-600">Confirm Password</label>
        <input
          type="password"
          value={regConfirm}
          onChange={(event) => setRegConfirm(event.target.value)}
          className="mt-1 w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300"
        />
      </div>
    </div>
  );

  return (
    <Modal
      open={authModalOpen}
      title={authTab === "login" ? "Welcome back" : "Create your account"}
      onClose={closeAuthModal}
      actions={
        <>
          <Button variant="ghost" onClick={closeAuthModal}>
            Cancel
          </Button>
          <Button
            disabled={isSubmitting}
            onClick={() => {
              if (authTab === "login") {
                void login(loginUsername.trim(), loginPassword.trim());
              } else {
                void register(regUsername.trim(), regPassword.trim(), regConfirm.trim());
              }
            }}
          >
            {isSubmitting ? "Loading..." : authTab === "login" ? "Login" : "Register"}
          </Button>
        </>
      }
    >
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setAuthTab("register")}
          className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
            authTab === "register"
              ? "bg-slate-900 text-white"
              : "bg-white/60 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Register
        </button>
        <button
          type="button"
          onClick={() => setAuthTab("login")}
          className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
            authTab === "login"
              ? "bg-slate-900 text-white"
              : "bg-white/60 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Login
        </button>
      </div>

      {authMessage ? (
        <div className="rounded-xl bg-blue-50/80 px-3 py-2 text-xs text-slate-700">{authMessage}</div>
      ) : null}

      {authError ? (
        <div className="rounded-xl bg-rose-50/80 px-3 py-2 text-xs text-rose-700">{authError}</div>
      ) : null}

      {formBody}
    </Modal>
  );
}
