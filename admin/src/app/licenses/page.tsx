"use client";

import { useCallback, useEffect, useState } from "react";
import { api, formatDate, License, ValidationLogEntry } from "@/lib/api";
import { Masthead } from "@/components/header";
import {
  Button, ConfirmModal, Empty, ErrorNote, Field, Input, Modal,
  SelectNative, SkeletonRows, Stamp, Textarea,
} from "@/components/ui";

const MODULES = ["pantheon", "wms", "invoicing", "catalog"];

interface FormState {
  client_name: string;
  client_email: string;
  expires_at: string;
  features: string[];
  notes: string;
}

const EMPTY_FORM: FormState = {
  client_name: "",
  client_email: "",
  expires_at: "",
  features: ["pantheon"],
  notes: "",
};

function FeaturePicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {MODULES.map((m) => {
        const on = value.includes(m);
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(on ? value.filter((x) => x !== m) : [...value, m])}
            className={`font-mono text-[11px] px-2.5 py-1 rounded-[3px] border transition-colors cursor-pointer ${
              on
                ? "border-seal bg-seal-soft text-seal"
                : "border-line-strong text-ink-soft hover:border-seal/50"
            }`}
          >
            {m}
          </button>
        );
      })}
    </div>
  );
}

export default function LicensesPage() {
  const [licenses, setLicenses] = useState<License[] | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<License | null>(null);
  const [selectedLogs, setSelectedLogs] = useState<ValidationLogEntry[] | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    label: string;
    action: () => Promise<void>;
  } | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page_size: "100" });
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    const data = await api<{ licenses: License[] }>(`/api/v1/admin/licenses?${params}`);
    setLicenses(data.licenses);
  }, [search, statusFilter]);

  useEffect(() => {
    load().catch(() => setLicenses([]));
  }, [load]);

  // detalji + validacije za izabranu licencu
  const openDetail = async (lic: License) => {
    setSelected(lic);
    setSelectedLogs(null);
    try {
      const d = await api<{ items: ValidationLogEntry[] }>(
        `/api/v1/admin/logs?license_key=${encodeURIComponent(lic.license_key)}&page_size=8`
      );
      setSelectedLogs(d.items);
    } catch {
      setSelectedLogs([]);
    }
  };

  const refreshSelected = async (id: number) => {
    const fresh = await api<License>(`/api/v1/admin/licenses/${id}`);
    setSelected(fresh);
    await load();
  };

  const submitCreate = async () => {
    setFormError(null);
    setBusy(true);
    try {
      const created = await api<License>("/api/v1/admin/licenses", {
        method: "POST",
        body: JSON.stringify({
          client_name: form.client_name,
          client_email: form.client_email || null,
          expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
          features: form.features,
          notes: form.notes || null,
        }),
      });
      setCreateOpen(false);
      await load();
      openDetail(created);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const submitEdit = async () => {
    if (!selected) return;
    setFormError(null);
    setBusy(true);
    try {
      await api<License>(`/api/v1/admin/licenses/${selected.id}`, {
        method: "PUT",
        body: JSON.stringify({
          client_name: form.client_name,
          client_email: form.client_email || null,
          expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
          features: form.features,
          notes: form.notes || null,
        }),
      });
      setEditOpen(false);
      await refreshSelected(selected.id);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const quickAction = (lic: License, kind: "suspend" | "activate" | "reset-hardware" | "delete") => {
    const texts = {
      suspend: {
        title: `Suspenduj licencu ${lic.client_name}?`,
        description: "Instalacija klijenta prestaje raditi pri sljedećoj provjeri (najkasnije za 1h).",
        label: "Suspenduj",
      },
      activate: {
        title: `Aktiviraj licencu ${lic.client_name}?`,
        description: "Licenca ponovo postaje važeća pri sljedećoj provjeri klijenta.",
        label: "Aktiviraj",
      },
      "reset-hardware": {
        title: "Skini hardware binding?",
        description:
          "Koristi se pri selidbi klijenta na novi server — licenca se veže za prvi server koji se javi.",
        label: "Skini binding",
      },
      delete: {
        title: `Trajno obriši licencu ${lic.client_name}?`,
        description: "Zapis nestaje iz registra. Za gašenje klijenta koristi suspenziju, ne brisanje.",
        label: "Obriši",
      },
    } as const;

    setConfirm({
      ...texts[kind],
      action: async () => {
        if (kind === "delete") {
          await api(`/api/v1/admin/licenses/${lic.id}`, { method: "DELETE" });
          setSelected(null);
          await load();
        } else {
          await api(`/api/v1/admin/licenses/${lic.id}/${kind}`, { method: "POST" });
          await refreshSelected(lic.id);
        }
      },
    });
  };

  const runConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      await confirm.action();
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Masthead />
      <main className="max-w-5xl mx-auto px-6 py-10 w-full">
        {/* ── Alatna traka ── */}
        <div className="rise rise-1 flex flex-wrap items-center gap-3 mb-6">
          <Input
            placeholder="Pretraga: klijent, ključ, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <SelectNative value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Svi statusi</option>
            <option value="active">Aktivne</option>
            <option value="suspended">Suspendovane</option>
            <option value="revoked">Opozvane</option>
          </SelectNative>
          <div className="flex-1" />
          <Button
            variant="seal"
            onClick={() => {
              setForm(EMPTY_FORM);
              setFormError(null);
              setCreateOpen(true);
            }}
          >
            + Izdaj novu licencu
          </Button>
        </div>

        {/* ── Knjiga licenci ── */}
        <div className="certificate rounded-[3px] rise rise-2">
          {licenses === null ? (
            <div className="px-5"><SkeletonRows count={6} /></div>
          ) : licenses.length === 0 ? (
            <Empty title="Registar je prazan" hint="Izdaj prvu licencu dugmetom iznad." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-ink/70 text-left">
                  <th className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft font-medium px-5 py-3">Klijent</th>
                  <th className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft font-medium px-3 py-3">Ključ</th>
                  <th className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft font-medium px-3 py-3">Status</th>
                  <th className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft font-medium px-3 py-3">Ističe</th>
                  <th className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft font-medium px-3 py-3">Viđena</th>
                  <th className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft font-medium px-3 py-3 text-right pr-5">Verzija</th>
                </tr>
              </thead>
              <tbody>
                {licenses.map((lic) => (
                  <tr
                    key={lic.id}
                    className="ledger-row cursor-pointer"
                    onClick={() => openDetail(lic)}
                  >
                    <td className="px-5 py-3 font-medium">{lic.client_name}</td>
                    <td className="px-3 py-3 font-mono text-xs text-ink-soft">{lic.license_key}</td>
                    <td className="px-3 py-3"><Stamp status={lic.status} /></td>
                    <td className="px-3 py-3 font-mono text-xs tabular-nums">
                      {lic.expires_at ? formatDate(lic.expires_at) : "doživotna"}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs tabular-nums text-ink-soft">
                      {formatDate(lic.last_seen_at, true)}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-right pr-5 text-ink-soft">
                      {lic.panconnect_version ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* ── Detalj licence: certifikat ── */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title=""
        wide
      >
        {selected && (
          <div className="-mt-8">
            <div className="flex items-start justify-between gap-4 border-b-2 border-ink/70 pb-4 mb-5">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-seal mb-1">
                  Licenca № {selected.id}
                </div>
                <h2 className="font-display text-2xl font-bold">{selected.client_name}</h2>
                {selected.client_email && (
                  <div className="text-sm text-ink-soft">{selected.client_email}</div>
                )}
              </div>
              <Stamp status={selected.status} large animate />
            </div>

            <div className="font-mono text-sm bg-paper-2 border border-line rounded-[3px] px-4 py-3 mb-5 tracking-wider select-all">
              {selected.license_key}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-5">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">Izdata</div>
                <div className="mt-0.5">{formatDate(selected.issued_at)}</div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">Ističe</div>
                <div className="mt-0.5">{selected.expires_at ? formatDate(selected.expires_at) : "doživotna"}</div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">Validacija</div>
                <div className="mt-0.5 tabular-nums">{selected.validation_count}</div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">Zadnja provjera</div>
                <div className="mt-0.5">{formatDate(selected.last_validated_at, true)}</div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">Verzija</div>
                <div className="mt-0.5 font-mono text-xs">{selected.panconnect_version ?? "—"}</div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">Hardware</div>
                <div className="mt-0.5 font-mono text-xs truncate" title={selected.hardware_id ?? ""}>
                  {selected.hardware_id ? `${selected.hardware_id.slice(0, 12)}…` : "nije vezana"}
                </div>
              </div>
            </div>

            <div className="mb-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft mb-1.5">Moduli</div>
              <div className="flex flex-wrap gap-1.5">
                {selected.features.length ? (
                  selected.features.map((f) => (
                    <span key={f} className="font-mono text-[11px] px-2 py-0.5 border border-line-strong rounded-[3px]">
                      {f}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-ink-soft">—</span>
                )}
              </div>
            </div>

            {selected.notes && (
              <p className="text-sm text-ink-soft border-l-2 border-line-strong pl-3 mb-5 whitespace-pre-wrap">
                {selected.notes}
              </p>
            )}

            {/* zadnje validacije ove licence */}
            <div className="mb-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft mb-2">
                Zadnje validacije
              </div>
              {selectedLogs === null ? (
                <div className="skeleton h-16" />
              ) : selectedLogs.length === 0 ? (
                <p className="text-sm text-ink-soft">Klijent se još nije javljao.</p>
              ) : (
                <div className="border border-line rounded-[3px] px-3 py-0.5 max-h-36 overflow-y-auto">
                  {selectedLogs.map((log) => (
                    <div key={log.id} className="ledger-row last:border-0 flex items-center gap-3 py-1.5 text-xs font-mono">
                      <span className="text-ink-soft tabular-nums shrink-0">{formatDate(log.timestamp, true)}</span>
                      <span className={log.status === "active" ? "text-grant" : "text-seal"}>{log.status}</span>
                      <span className="text-ink-soft truncate">{log.ip_address ?? ""} {log.reason ?? ""}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* akcije */}
            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              {selected.status === "active" ? (
                <Button variant="outline" onClick={() => quickAction(selected, "suspend")}>
                  Suspenduj
                </Button>
              ) : (
                <Button variant="seal" onClick={() => quickAction(selected, "activate")}>
                  Aktiviraj
                </Button>
              )}
              <Button variant="outline" onClick={() => quickAction(selected, "reset-hardware")}>
                Skini hardware binding
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setForm({
                    client_name: selected.client_name,
                    client_email: selected.client_email ?? "",
                    expires_at: selected.expires_at ? selected.expires_at.slice(0, 10) : "",
                    features: selected.features,
                    notes: selected.notes ?? "",
                  });
                  setFormError(null);
                  setEditOpen(true);
                }}
              >
                Izmijeni
              </Button>
              <div className="flex-1" />
              <Button variant="danger" onClick={() => quickAction(selected, "delete")}>
                Obriši
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Nova licenca / izmjena ── */}
      <Modal
        open={createOpen || editOpen}
        onClose={() => {
          setCreateOpen(false);
          setEditOpen(false);
        }}
        title={editOpen ? "Izmjena licence" : "Izdavanje nove licence"}
      >
        <div className="space-y-4">
          <Field label="Klijent (naziv firme)">
            <Input
              value={form.client_name}
              onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
              placeholder="Firma d.o.o."
              autoFocus
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.client_email}
              onChange={(e) => setForm((f) => ({ ...f, client_email: e.target.value }))}
              placeholder="opciono"
            />
          </Field>
          <Field label="Ističe" hint="Prazno = doživotna licenca">
            <Input
              type="date"
              value={form.expires_at}
              onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
            />
          </Field>
          <Field label="Moduli">
            <FeaturePicker
              value={form.features}
              onChange={(features) => setForm((f) => ({ ...f, features }))}
            />
          </Field>
          <Field label="Napomena">
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </Field>

          {formError && <ErrorNote message={formError} />}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="seal"
              disabled={busy || !form.client_name}
              onClick={editOpen ? submitEdit : submitCreate}
            >
              {busy ? "Sačekaj…" : editOpen ? "Snimi izmjene" : "Izdaj licencu"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.title ?? ""}
        description={confirm?.description ?? ""}
        confirmLabel={confirm?.label}
        onConfirm={runConfirm}
        busy={busy}
      />
    </>
  );
}
