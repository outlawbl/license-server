"use client";

import { useCallback, useEffect, useState } from "react";
import { api, formatDate, ValidationLogEntry } from "@/lib/api";
import { Masthead } from "@/components/header";
import { Button, Empty, Input, SelectNative, SkeletonRows, Stamp } from "@/components/ui";

const PAGE_SIZE = 50;

export default function LogsPage() {
  const [data, setData] = useState<{ items: ValidationLogEntry[]; total: number } | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [keyFilter, setKeyFilter] = useState("");
  const [keyInput, setKeyInput] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
    if (status) params.set("status", status);
    if (keyFilter) params.set("license_key", keyFilter);
    setData(await api(`/api/v1/admin/logs?${params}`));
  }, [page, status, keyFilter]);

  useEffect(() => {
    load().catch(() => setData({ items: [], total: 0 }));
  }, [load]);

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  return (
    <>
      <Masthead />
      <main className="max-w-5xl mx-auto px-6 py-10 w-full">
        {/* ── Filteri ── */}
        <form
          className="rise rise-1 flex flex-wrap items-center gap-3 mb-6"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setKeyFilter(keyInput.trim());
          }}
        >
          <Input
            placeholder="Filtriraj po ključu (PC-…)"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            className="max-w-xs font-mono text-xs"
          />
          <SelectNative
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Svi ishodi</option>
            <option value="active">Odobrene</option>
            <option value="denied">Odbijene</option>
            <option value="suspended">Suspendovane</option>
            <option value="expired">Istekle</option>
            <option value="not_found">Nepoznat ključ</option>
          </SelectNative>
          <div className="flex-1" />
          <span className="font-mono text-xs text-ink-soft tabular-nums">
            {data ? `${data.total} zapisa` : ""}
          </span>
        </form>

        {/* ── Knjiga validacija ── */}
        <div className="certificate rounded-[3px] px-5 py-1 rise rise-2">
          {data === null ? (
            <SkeletonRows count={10} />
          ) : data.items.length === 0 ? (
            <Empty title="Nema zapisa" hint="Promijeni filtere ili sačekaj klijente." />
          ) : (
            data.items.map((log) => (
              <div key={log.id} className="ledger-row last:border-0 flex items-center gap-4 py-2.5 text-sm">
                <span className="font-mono text-xs text-ink-soft tabular-nums shrink-0 w-28">
                  {formatDate(log.timestamp, true)}
                </span>
                <span className="font-mono text-xs shrink-0 w-44 truncate">{log.license_key}</span>
                <span className="shrink-0"><Stamp status={log.status} /></span>
                <span className="font-mono text-xs text-ink-soft shrink-0 w-28 truncate">
                  {log.ip_address ?? "—"}
                </span>
                <span className="text-xs text-ink-soft truncate flex-1">{log.reason}</span>
                <span className="font-mono text-[10px] text-ink-soft/70 shrink-0">
                  {log.panconnect_version ?? ""}
                </span>
              </div>
            ))
          )}
        </div>

        {/* ── Paginacija ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ← Novije
            </Button>
            <span className="font-mono text-xs text-ink-soft tabular-nums">
              {page} / {totalPages}
            </span>
            <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Starije →
            </Button>
          </div>
        )}
      </main>
    </>
  );
}
