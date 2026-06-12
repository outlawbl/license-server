"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getAuth, clearAuth, tryLogin } from "@/lib/api";
import { Button, Field, Input, ErrorNote } from "@/components/ui";

const AuthContext = createContext<{ logout: () => void } | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth van AuthGate-a");
  return ctx;
}

function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await tryLogin(username, password);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška pri prijavi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="rise rise-1 text-center mb-8">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-seal mb-3">
          ALF-OM · Izdavač licenci
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight">
          Registar licenci
        </h1>
        <div className="flex items-center justify-center gap-3 mt-3 text-line-strong">
          <span className="h-px w-12 bg-line-strong" />
          <span className="h-2 w-2 rounded-full bg-seal" />
          <span className="h-px w-12 bg-line-strong" />
        </div>
      </div>

      <form onSubmit={submit} className="certificate rise rise-2 rounded-[3px] w-full max-w-sm p-7">
        <div className="space-y-4">
          <Field label="Korisničko ime">
            <Input
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </Field>
          <Field label="Lozinka">
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          {error && <ErrorNote message={error} />}
          <Button variant="seal" type="submit" className="w-full py-2" disabled={busy}>
            {busy ? "Prijavljivanje…" : "Otvori registar"}
          </Button>
        </div>
      </form>

      <p className="rise rise-3 font-mono text-[10px] text-ink-soft/60 mt-8 tracking-wider">
        PANCONNECT LICENSE SERVER
      </p>
    </div>
  );
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(!!getAuth());
    setReady(true);
  }, []);

  if (!ready) return <div className="min-h-screen" />;
  if (!authed) return <LoginScreen onSuccess={() => setAuthed(true)} />;

  return (
    <AuthContext.Provider
      value={{
        logout: () => {
          clearAuth();
          setAuthed(false);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
