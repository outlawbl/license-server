"use client";

import React from "react";

/* ── Pečat statusa ── */

const STAMP_COLORS: Record<string, string> = {
  active: "text-grant",
  suspended: "text-warn",
  expired: "text-void",
  revoked: "text-seal",
  denied: "text-seal",
  not_found: "text-void",
  error: "text-seal",
};

export const STAMP_LABELS: Record<string, string> = {
  active: "Aktivna",
  suspended: "Suspendovana",
  expired: "Istekla",
  revoked: "Opozvana",
  denied: "Odbijena",
  not_found: "Nepoznata",
  error: "Greška",
};

export function Stamp({
  status,
  large = false,
  animate = false,
}: {
  status: string;
  large?: boolean;
  animate?: boolean;
}) {
  return (
    <span
      className={[
        "stamp",
        STAMP_COLORS[status] ?? "text-void",
        large ? "stamp-lg" : "",
        animate ? "stamp-animate" : "",
      ].join(" ")}
    >
      {STAMP_LABELS[status] ?? status}
    </span>
  );
}

/* ── Dugmad ── */

type ButtonVariant = "seal" | "outline" | "ghost" | "danger";

export function Button({
  variant = "outline",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const styles: Record<ButtonVariant, string> = {
    seal: "bg-seal text-card hover:bg-seal-dark border border-seal-dark/40 shadow-[2px_2px_0_rgba(110,23,36,0.25)]",
    outline: "border border-line-strong text-ink hover:border-seal hover:text-seal bg-card",
    ghost: "text-ink-soft hover:text-seal",
    danger: "border border-seal/40 text-seal hover:bg-seal hover:text-card",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-sm font-medium rounded-[3px] transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${styles[variant]} ${className}`}
      {...props}
    />
  );
}

/* ── Forma ── */

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft mb-1.5">
        {label}
      </span>
      {children}
      {hint && <span className="block text-xs text-ink-soft mt-1">{hint}</span>}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-card border border-line-strong rounded-[3px] px-3 py-2 text-sm outline-none focus:border-seal focus:ring-2 focus:ring-seal/15 placeholder:text-ink-soft/50 ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full bg-card border border-line-strong rounded-[3px] px-3 py-2 text-sm outline-none focus:border-seal focus:ring-2 focus:ring-seal/15 placeholder:text-ink-soft/50 ${props.className ?? ""}`}
    />
  );
}

export function SelectNative(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`bg-card border border-line-strong rounded-[3px] px-3 py-2 text-sm outline-none focus:border-seal cursor-pointer ${props.className ?? ""}`}
    />
  );
}

/* ── Modal ── */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 backdrop-blur-[2px] p-4 py-10"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`certificate rounded-[3px] w-full ${wide ? "max-w-2xl" : "max-w-md"} p-6 rise`}>
        <div className="flex items-start justify-between mb-5">
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="text-ink-soft hover:text-seal text-xl leading-none cursor-pointer"
            aria-label="Zatvori"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmModal({
  open,
  onClose,
  title,
  description,
  confirmLabel = "Potvrdi",
  onConfirm,
  busy = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  busy?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-ink-soft mb-6">{description}</p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          Odustani
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={busy}>
          {busy ? "Sačekaj…" : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

/* ── Razno ── */

export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2 py-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton h-10" />
      ))}
    </div>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="py-16 text-center">
      <div className="font-display text-lg text-ink-soft">{title}</div>
      {hint && <p className="text-sm text-ink-soft/70 mt-1">{hint}</p>}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <p className="text-sm text-seal border border-seal/30 bg-seal-soft rounded-[3px] px-3 py-2">
      {message}
    </p>
  );
}
