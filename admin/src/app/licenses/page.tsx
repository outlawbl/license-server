"use client";

import { useCallback, useEffect, useState } from "react";
import { api, formatDate, License, ValidationLogEntry } from "@/lib/api";
import { Masthead } from "@/components/header";
import {
  Button, ConfirmModal, Empty, ErrorNote, Field, Input, Modal,
  SelectNative, SkeletonRows, Stamp, Textarea,
} from "@/components/ui";
import {
  PANBI_REPORT_CATALOG,
  PANBI_PACKAGE_PRESETS,
  PANBI_PACKAGE_TIER_LABELS,
  type PanbiPackageTier,
} from "@/lib/panbi-report-catalog";

const MODULES = [
  // PanConnect capabilities
  "pantheon", "wms", "invoicing", "catalog",
  // PanBI cross-cutting capabilities
  "panbi_core", "panbi_pro", "panbi_ai", "panbi_alerts", "panbi_scheduling",
  "panbi_export", "panbi_dashboards", "panbi_crm", "panbi_telegram",
  // PanBI report modules (module:* strings gate individual report groups)
  "module:sales", "module:ruc", "module:customers",
  "module:inventory", "module:finance", "module:costs",
  "module:team", "module:bonus", "module:rebates",
];

// Brzi tier presetovi za PanBI — jednim klikom popunjavaju ispravnu
// kombinaciju feature-a, postavljaju rok na 1 godinu i uključuju cloud mod.
const CORE_MODULES = [
  "pantheon", "panbi_core",
  "module:sales", "module:ruc", "module:inventory",
  "module:finance", "module:costs", "module:team",
];
const PRO_MODULES = [
  ...CORE_MODULES,
  "panbi_pro", "panbi_ai", "panbi_alerts", "panbi_scheduling",
  "panbi_export", "panbi_dashboards", "module:customers", "module:bonus",
  // panbi_crm i panbi_telegram namjerno NISU u Pro presetu — po originalnom
  // cjenovnom prijedlogu to su Premijum-only, uključuju se ručno po klijentu.
  // module:rebates isto tako: taj modul PIŠE u Pantheon (ugovorne cijene i
  // rabate), pa se uključuje svjesno po klijentu, ne kroz tier preset.
];

const TIER_PRESETS = [
  {
    label: "PanBI Core",
    features: CORE_MODULES,
    description: "Osnovni moduli: Prodaja, RUC, Zalihe, Finansije, Troškovi, Tim",
  },
  {
    label: "PanBI Pro",
    features: PRO_MODULES,
    description: "Pro: Core + AI chat, alert engine, Kupci analitika, Bonus",
  },
];

// Report-package tier (Osnovni/Standard/Premijum/Prilagođeno) — a SEPARATE axis
// from the module/capability FeaturePicker above. The chosen tier is stored as a
// single "package:<tier>" entry inside the same features[] array PanBI already
// reads module:* from, while the exact per-report selection is diffed against the
// tier preset into a separate package_overrides {add, remove} payload.

/** Resets checked_report_ids to a named tier's preset. No-op for "custom"/"". */
function applyPanbiTierPreset(tier: PanbiPackageTier | ""): string[] {
  return tier && tier !== "custom" ? [...PANBI_PACKAGE_PRESETS[tier]] : [];
}

/** Diffs a checked-id set against a tier's preset to compute {add, remove}. */
function computePanbiOverrides(
  tier: PanbiPackageTier | "",
  checkedIds: string[]
): { add: string[]; remove: string[] } {
  const preset = new Set(tier && tier !== "custom" ? PANBI_PACKAGE_PRESETS[tier] : []);
  const checked = new Set(checkedIds);
  const add: string[] = [];
  const remove: string[] = [];
  for (const entry of PANBI_REPORT_CATALOG) {
    const isChecked = checked.has(entry.id);
    const inPreset = preset.has(entry.id);
    if (isChecked && !inPreset) add.push(entry.id);
    if (!isChecked && inPreset) remove.push(entry.id);
  }
  return { add, remove };
}

// Redoslijed grupa u checkbox mreži — izveden iz kataloga uz očuvanje pojave.
const PANBI_REPORT_GROUPS: { label: string; entries: typeof PANBI_REPORT_CATALOG }[] =
  PANBI_REPORT_CATALOG.reduce<{ label: string; entries: typeof PANBI_REPORT_CATALOG }[]>(
    (groups, entry) => {
      const existing = groups.find((g) => g.label === entry.groupLabel);
      if (existing) existing.entries.push(entry);
      else groups.push({ label: entry.groupLabel, entries: [entry] });
      return groups;
    },
    []
  );

interface FormState {
  client_name: string;
  client_email: string;
  expires_at: string;
  features: string[];
  cloud_mode: boolean;
  notes: string;
  panbi_url: string;
  package_tier: PanbiPackageTier | "";
  checked_report_ids: string[];
}

const EMPTY_FORM: FormState = {
  client_name: "",
  client_email: "",
  expires_at: "",
  features: ["pantheon"],
  cloud_mode: false,
  notes: "",
  panbi_url: "",
  package_tier: "" as PanbiPackageTier | "",
  checked_report_ids: [],
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

  // Primjenjuje tier preset na formu: feature-i, rok (1 god. od danas) i cloud mod.
  // Ostala polja (naziv, email, napomena) ostaju netaknuta da se mogu ručno dopuniti.
  const applyTierPreset = (preset: (typeof TIER_PRESETS)[number]) => {
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    const expiresAt = oneYearFromNow.toISOString().split("T")[0]; // "YYYY-MM-DD"

    setForm((prev) => ({
      ...prev,
      features: [...preset.features],
      expires_at: expiresAt,
      cloud_mode: true,
    }));
  };

  const submitCreate = async () => {
    setFormError(null);
    setBusy(true);
    try {
      const packageFeatures = form.features.filter((f) => !f.startsWith("package:"));
      const featuresToSend = form.package_tier
        ? [...packageFeatures, `package:${form.package_tier}`]
        : packageFeatures;
      const overridesToSend = form.package_tier
        ? computePanbiOverrides(form.package_tier, form.checked_report_ids)
        : null;
      const created = await api<License>("/api/v1/admin/licenses", {
        method: "POST",
        body: JSON.stringify({
          client_name: form.client_name,
          client_email: form.client_email || null,
          expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
          features: featuresToSend,
          cloud_mode: form.cloud_mode,
          notes: form.notes || null,
          panbi_url: form.panbi_url || null,
          package_overrides: overridesToSend,
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
      const packageFeatures = form.features.filter((f) => !f.startsWith("package:"));
      const featuresToSend = form.package_tier
        ? [...packageFeatures, `package:${form.package_tier}`]
        : packageFeatures;
      const overridesToSend = form.package_tier
        ? computePanbiOverrides(form.package_tier, form.checked_report_ids)
        : null;
      await api<License>(`/api/v1/admin/licenses/${selected.id}`, {
        method: "PUT",
        body: JSON.stringify({
          client_name: form.client_name,
          client_email: form.client_email || null,
          expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
          features: featuresToSend,
          cloud_mode: form.cloud_mode,
          notes: form.notes || null,
          panbi_url: form.panbi_url || null,
          package_overrides: overridesToSend,
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
                  {selected.cloud_mode
                    ? <span className="text-seal">cloud mod</span>
                    : selected.hardware_id
                      ? `${selected.hardware_id.slice(0, 12)}…`
                      : "nije vezana"}
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
                  const currentTier = (selected.features
                    .find((f) => f.startsWith("package:"))
                    ?.slice("package:".length) ?? "") as PanbiPackageTier | "";
                  const currentOverrides = selected.package_overrides ?? { add: [], remove: [] };
                  const presetIds =
                    currentTier && currentTier !== "custom"
                      ? PANBI_PACKAGE_PRESETS[currentTier]
                      : [];
                  const checkedSet = new Set(presetIds);
                  for (const id of currentOverrides.add) checkedSet.add(id);
                  for (const id of currentOverrides.remove) checkedSet.delete(id);
                  setForm({
                    client_name: selected.client_name,
                    client_email: selected.client_email ?? "",
                    expires_at: selected.expires_at ? selected.expires_at.slice(0, 10) : "",
                    features: selected.features,
                    cloud_mode: selected.cloud_mode,
                    notes: selected.notes ?? "",
                    panbi_url: selected.panbi_url ?? "",
                    package_tier: currentTier,
                    checked_report_ids: Array.from(checkedSet),
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
          <Field label="PanBI URL" hint="Bazni URL klijentove PanBI instalacije — omogućava trenutno osvježavanje licence umjesto čekanja na keš ciklus (~75 min). Ostavi prazno ako nije poznat.">
            <Input
              value={form.panbi_url}
              onChange={(e) => setForm((f) => ({ ...f, panbi_url: e.target.value }))}
              placeholder="https://klijent.panbi.app"
            />
          </Field>
          <Field label="Ističe" hint="Prazno = doživotna licenca">
            <Input
              type="date"
              value={form.expires_at}
              onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
            />
          </Field>
          <Field label="Brzi preset" hint="Popunjava module, rok (1 god.) i cloud mod">
            <div className="flex flex-wrap gap-2">
              {TIER_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyTierPreset(preset)}
                  title={preset.description}
                  className="font-mono text-[11px] px-2.5 py-1 rounded-[3px] border border-line-strong text-ink-soft hover:border-seal/50 transition-colors cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Moduli">
            <FeaturePicker
              value={form.features}
              onChange={(features) => setForm((f) => ({ ...f, features }))}
            />
          </Field>
          <Field label="PanBI paket izvještaja" hint="Postavlja package:<tier> u features[] i package_overrides na licenci — oba se pushaju direktno klijentovoj PanBI instalaciji ako je PanBI URL postavljen.">
            <div className="space-y-3">
              {/* Tier izbor — reset mreže na preset odabranog tier-a */}
              <div className="flex flex-wrap gap-2">
                {([
                  { tier: "" as PanbiPackageTier | "", label: "Bez dodjele" },
                  { tier: "osnovni" as const, label: PANBI_PACKAGE_TIER_LABELS.osnovni },
                  { tier: "standard" as const, label: PANBI_PACKAGE_TIER_LABELS.standard },
                  { tier: "premium" as const, label: PANBI_PACKAGE_TIER_LABELS.premium },
                ]).map(({ tier, label }) => {
                  const on = form.package_tier === tier;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          package_tier: tier,
                          checked_report_ids: applyPanbiTierPreset(tier),
                        }))
                      }
                      className={`font-mono text-[11px] px-2.5 py-1 rounded-[3px] border transition-colors cursor-pointer ${
                        on
                          ? "border-seal bg-seal-soft text-seal"
                          : "border-line-strong text-ink-soft hover:border-seal/50"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
                {form.package_tier === "custom" && (
                  <span className="font-mono text-[11px] px-2.5 py-1 rounded-[3px] border border-seal bg-seal-soft text-seal">
                    Prilagođeno
                  </span>
                )}
              </div>

              {/* Checkbox mreža — vidljiva tek kad je dodijeljen paket */}
              {form.package_tier !== "" && (
                <div className="max-h-72 overflow-y-auto border border-line rounded-[3px] p-3 space-y-3">
                  {PANBI_REPORT_GROUPS.map((group) => (
                    <div key={group.label}>
                      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft mb-1.5">
                        {group.label}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {group.entries.map((entry) => {
                          const on = form.checked_report_ids.includes(entry.id);
                          return (
                            <button
                              key={entry.id}
                              type="button"
                              onClick={() =>
                                setForm((f) => {
                                  const next = on
                                    ? f.checked_report_ids.filter((id) => id !== entry.id)
                                    : [...f.checked_report_ids, entry.id];
                                  return {
                                    ...f,
                                    package_tier: "custom",
                                    checked_report_ids: next,
                                  };
                                })
                              }
                              title={entry.id}
                              className={`text-[11px] px-2 py-0.5 rounded-[3px] border transition-colors cursor-pointer ${
                                on
                                  ? "border-seal bg-seal-soft text-seal"
                                  : "border-line-strong text-ink-soft hover:border-seal/50"
                              }`}
                            >
                              {entry.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Field>
          <Field label="Cloud mod" hint="Isključuje hardware binding — za Railway, Docker i slične deploymente">
            <button
              type="button"
              role="switch"
              aria-checked={form.cloud_mode}
              onClick={() => setForm((f) => ({ ...f, cloud_mode: !f.cloud_mode }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                form.cloud_mode ? "bg-seal" : "bg-line-strong"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  form.cloud_mode ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
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
