"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, formatDate, Stats, ValidationLogEntry } from "@/lib/api";
import { Masthead } from "@/components/header";
import { Stamp, SkeletonRows, Empty } from "@/components/ui";

function LedgerStat({
  label,
  value,
  accent = false,
  delay,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
  delay: number;
}) {
  return (
    <div className={`rise rise-${delay} border-l-2 ${accent ? "border-seal" : "border-line-strong"} pl-4 py-1`}>
      <div className={`font-display text-4xl font-semibold tabular-nums ${accent ? "text-seal" : ""}`}>
        {value}
      </div>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft mt-1">
        {label}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<ValidationLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Stats>("/api/v1/admin/stats").then(setStats).catch((e) => setError(String(e.message)));
    api<{ items: ValidationLogEntry[] }>("/api/v1/admin/logs?page_size=10")
      .then((d) => setLogs(d.items))
      .catch(() => setLogs([]));
  }, []);

  return (
    <>
      <Masthead />
      <main className="max-w-5xl mx-auto px-6 py-10 w-full">
        {error && <p className="text-seal text-sm mb-6">{error}</p>}

        {/* ── Stanje registra ── */}
        <section className="mb-12">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft mb-5">
            Stanje registra
          </h2>
          {stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6">
              <LedgerStat label="Ukupno licenci" value={stats.total_licenses} delay={1} />
              <LedgerStat label="Aktivne" value={stats.active_licenses} accent delay={2} />
              <LedgerStat label="Suspendovane" value={stats.suspended_licenses} delay={3} />
              <LedgerStat label="Istekle" value={stats.expired_licenses} delay={4} />
            </div>
          ) : (
            <SkeletonRows count={2} />
          )}
        </section>

        {/* ── Aktivnost ── */}
        <section className="mb-12">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft mb-5">
            Aktivnost klijenata
          </h2>
          {stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6">
              <LedgerStat label="Validacija danas" value={stats.validations_today} delay={1} />
              <LedgerStat label="Validacija ovaj mjesec" value={stats.validations_this_month} delay={2} />
              <LedgerStat label="Žive instalacije (24h)" value={stats.active_last_24h} accent delay={3} />
            </div>
          ) : (
            <SkeletonRows count={2} />
          )}
        </section>

        {/* ── Zadnje validacije ── */}
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
              Zadnje validacije
            </h2>
            <Link href="/logs" className="text-sm text-seal hover:underline">
              Sve validacije →
            </Link>
          </div>

          <div className="certificate rounded-[3px] px-5 py-1 rise rise-3">
            {logs === null ? (
              <SkeletonRows count={5} />
            ) : logs.length === 0 ? (
              <Empty title="Još nema validacija" hint="Klijenti se još nisu javljali registru." />
            ) : (
              logs.map((log) => (
                <div key={log.id} className="ledger-row last:border-0 flex items-center gap-4 py-2.5 text-sm">
                  <span className="font-mono text-xs text-ink-soft tabular-nums shrink-0 w-28">
                    {formatDate(log.timestamp, true)}
                  </span>
                  <span className="font-mono text-xs shrink-0 w-44 truncate">{log.license_key}</span>
                  <Stamp status={log.status} />
                  <span className="text-ink-soft text-xs truncate flex-1">
                    {log.reason}
                    {log.ip_address ? ` · ${log.ip_address}` : ""}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </>
  );
}
