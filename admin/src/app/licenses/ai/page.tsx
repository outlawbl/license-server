"use client";

/**
 * Dedicated per-license AI settings page.
 *
 * The AI tier (Osnovni/Standard/Premijum) is a SEPARATE axis from both the
 * module/capability picker and the report-package tier on /licenses. It is
 * stored as a single "ai_tier:<tier>" entry inside the same features[] array
 * (exactly like "package:<tier>"), while the precise per-tool selection is
 * diffed against the tier preset into `ai_tool_overrides` {add, remove}.
 *
 * Deliberately a full page instead of another block in the license edit modal —
 * that modal already carries the report-package grid and is dense enough.
 *
 * The license id travels as a query param (/licenses/ai/?id=42) instead of a
 * path segment: this admin app builds with `output: "export"` and is served as
 * plain files by FastAPI's StaticFiles mount, so a dynamic /licenses/[id]/ai
 * segment can neither be built (generateStaticParams() cannot enumerate ids
 * that only exist at runtime) nor served.
 */

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, License } from "@/lib/api";
import { Masthead } from "@/components/header";
import { Button, Empty, ErrorNote, SkeletonRows } from "@/components/ui";
import {
  PANBI_AI_TOOL_CATALOG,
  PANBI_AI_TIER_PRESETS,
  PANBI_AI_TIER_LABELS,
  type PanbiAiTier,
} from "@/lib/panbi-ai-tool-catalog";

const AI_TIER_PREFIX = "ai_tier:";

/**
 * Tier vrijednosti koje smiju završiti u features[]. "custom" NIJE jedna od njih:
 * PanBI-jev `AiTier` tip poznaje samo osnovni/standard/premium, a getAiTier() svaku
 * neprepoznatu vrijednost hvata back-compat fallbackom na "premium" (puni pristup).
 * Upisati "ai_tier:custom" zato znači dati SVE alate umjesto ograničenog izbora —
 * odstupanje od preseta je isključivo prikaz, nikad četvrti tier.
 *
 * Lista se izvodi iz PANBI_AI_TIER_LABELS (tipiziran kao Exclude<PanbiAiTier, "custom">)
 * pa ostaje u koraku s katalogom bez ručnog održavanja.
 */
type NamedAiTier = Exclude<PanbiAiTier, "custom">;
const NAMED_AI_TIERS = Object.keys(PANBI_AI_TIER_LABELS) as NamedAiTier[];

/** "" = licenca nema ai_tier oznaku — PanBI to tretira kao puni pristup. */
type AiTierSelection = NamedAiTier | "";

function isNamedAiTier(value: string): value is NamedAiTier {
  return (NAMED_AI_TIERS as readonly string[]).includes(value);
}

/** Resets the checked tool ids to a named tier's preset. Empty for "". */
function applyAiTierPreset(tier: AiTierSelection): string[] {
  return tier ? [...PANBI_AI_TIER_PRESETS[tier]] : [];
}

/** Diffs a checked-id set against a tier's preset to compute {add, remove}. */
function computeAiOverrides(
  tier: AiTierSelection,
  checkedIds: string[]
): { add: string[]; remove: string[] } {
  const preset = new Set(tier ? PANBI_AI_TIER_PRESETS[tier] : []);
  const checked = new Set(checkedIds);
  const add: string[] = [];
  const remove: string[] = [];
  for (const entry of PANBI_AI_TOOL_CATALOG) {
    const isChecked = checked.has(entry.id);
    const inPreset = preset.has(entry.id);
    if (isChecked && !inPreset) add.push(entry.id);
    if (!isChecked && inPreset) remove.push(entry.id);
  }
  return { add, remove };
}

// Redoslijed grupa u checkbox mreži — izveden iz kataloga uz očuvanje pojave.
const PANBI_AI_TOOL_GROUPS: { label: string; entries: typeof PANBI_AI_TOOL_CATALOG }[] =
  PANBI_AI_TOOL_CATALOG.reduce<{ label: string; entries: typeof PANBI_AI_TOOL_CATALOG }[]>(
    (groups, entry) => {
      const existing = groups.find((g) => g.label === entry.groupLabel);
      if (existing) existing.entries.push(entry);
      else groups.push({ label: entry.groupLabel, entries: [entry] });
      return groups;
    },
    []
  );

/**
 * Reads the single "ai_tier:<tier>" entry out of a license's features[].
 * Neprepoznata vrijednost (npr. zatečeni "custom" iz ranije verzije) tretira se
 * kao "bez oznake" — tako se pokvarena vrijednost nikad ne vrati u features[].
 */
function extractAiTier(features: string[]): AiTierSelection {
  const entry = features.find((f) => f.startsWith(AI_TIER_PREFIX));
  const raw = entry?.slice(AI_TIER_PREFIX.length) ?? "";
  return isNamedAiTier(raw) ? raw : "";
}

/** Tier preset + stored overrides.add − stored overrides.remove = checked grid state. */
function deriveCheckedAiToolIds(lic: License): string[] {
  const tier = extractAiTier(lic.features);
  // Bez imenovanog tier-a mreža se ni ne prikazuje — zatečeni overrides bi bili
  // samo vizuelni šum, pa je prazan izbor jedino tačno polazno stanje.
  if (!tier) return [];
  const overrides = lic.ai_tool_overrides ?? { add: [], remove: [] };
  const checked = new Set(PANBI_AI_TIER_PRESETS[tier]);
  for (const id of overrides.add ?? []) checked.add(id);
  for (const id of overrides.remove ?? []) checked.delete(id);
  return Array.from(checked);
}

/**
 * Replaces the single "ai_tier:*" entry in place, preserving every other entry
 * (panbi_ai, module:*, package:<tier>…) and its position. Appends when the
 * license had no tier yet, drops the entry entirely when tier is "".
 */
function withAiTier(features: string[], tier: AiTierSelection): string[] {
  const next: string[] = [];
  let replaced = false;
  for (const feature of features) {
    if (feature.startsWith(AI_TIER_PREFIX)) {
      // Prvi pogodak nosi novi tier; eventualni duplikati se ispuštaju.
      if (tier && !replaced) {
        next.push(`${AI_TIER_PREFIX}${tier}`);
        replaced = true;
      }
      continue;
    }
    next.push(feature);
  }
  if (tier && !replaced) next.push(`${AI_TIER_PREFIX}${tier}`);
  return next;
}

const TIER_CHOICES: { tier: AiTierSelection; label: string }[] = [
  { tier: "", label: "Bez oznake (puni pristup)" },
  ...NAMED_AI_TIERS.map((tier) => ({ tier, label: PANBI_AI_TIER_LABELS[tier] })),
];

function LicenseAiSettings() {
  const searchParams = useSearchParams();
  const licenseId = Number(searchParams.get("id"));
  // Ulaz iz adrese — prihvatamo samo pozitivan cijeli broj prije bilo kakvog fetch-a.
  const validId = Number.isInteger(licenseId) && licenseId > 0;

  const [license, setLicense] = useState<License | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tier, setTier] = useState<AiTierSelection>("");
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const hydrate = useCallback((lic: License) => {
    setLicense(lic);
    setTier(extractAiTier(lic.features));
    setCheckedIds(deriveCheckedAiToolIds(lic));
  }, []);

  // Neispravan id je izveden iz adrese, ne iz stanja — nema fetch-a ni skeletona.
  const shownError = validId ? loadError : "Neispravan ID licence u adresi.";

  useEffect(() => {
    if (!validId) return;
    let cancelled = false;
    api<License>(`/api/v1/admin/licenses/${licenseId}`)
      .then((lic) => {
        if (!cancelled) hydrate(lic);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [licenseId, validId, hydrate]);

  // Odstupanje od preseta — prikazuje "Prilagođeno" značku i objašnjava šta se šalje.
  // Isključivo izvedeno iz diff-a; tier ostaje imenovan i onda kad je mreža ručno mijenjana.
  const overrides = useMemo(() => computeAiOverrides(tier, checkedIds), [tier, checkedIds]);
  const diverged = overrides.add.length > 0 || overrides.remove.length > 0;

  const toggleTool = (toolId: string) => {
    setSaved(false);
    setCheckedIds((prev) =>
      prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId]
    );
    // Tier se namjerno NE mijenja: ručna izmjena završava u ai_tool_overrides,
    // a features[] zadržava posljednji imenovani tier (vidi NamedAiTier gore).
  };

  const selectTier = (next: AiTierSelection) => {
    setSaved(false);
    setTier(next);
    setCheckedIds(applyAiTierPreset(next));
  };

  const save = async () => {
    if (!license) return;
    setSaveError(null);
    setSaved(false);
    setBusy(true);
    try {
      const updated = await api<License>(`/api/v1/admin/licenses/${license.id}`, {
        method: "PUT",
        body: JSON.stringify({
          features: withAiTier(license.features, tier),
          // Nikad null: backend tretira null kao "ne diraj postojeću vrijednost",
          // pa je {add: [], remove: []} jedini način da se overrides zaista očiste.
          ai_tool_overrides: computeAiOverrides(tier, checkedIds),
        }),
      });
      hydrate(updated);
      setSaved(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Masthead />
      <main className="max-w-5xl mx-auto px-6 py-10 w-full">
        <div className="rise rise-1 mb-5">
          <Link
            href="/licenses"
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft hover:text-seal"
          >
            ← Nazad na licence
          </Link>
        </div>

        {shownError ? (
          <div className="rise rise-2">
            <ErrorNote message={shownError} />
          </div>
        ) : license === null ? (
          <div className="certificate rounded-[3px] rise rise-2 px-5">
            <SkeletonRows count={5} />
          </div>
        ) : (
          <div className="certificate rounded-[3px] rise rise-2 p-6">
            {/* ── Zaglavlje: čija je ovo licenca ── */}
            <div className="border-b-2 border-ink/70 pb-4 mb-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-seal mb-1">
                AI podešavanja · Licenca № {license.id}
              </div>
              <h2 className="font-display text-2xl font-bold">{license.client_name}</h2>
              <div className="font-mono text-xs text-ink-soft mt-1 tracking-wider select-all">
                {license.license_key}
              </div>
            </div>

            <p className="text-sm text-ink-soft mb-5">
              Tier postavlja <span className="font-mono text-xs">ai_tier:&lt;tier&gt;</span> u{" "}
              <span className="font-mono text-xs">features[]</span>, a ručne izmjene mreže idu u{" "}
              <span className="font-mono text-xs">ai_tool_overrides</span> — oba se pushaju
              klijentovoj PanBI instalaciji ako je PanBI URL postavljen. Ne dira paket izvještaja
              ni module.
            </p>

            {/* ── Izbor tier-a ── */}
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft mb-1.5">
              AI paket
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {TIER_CHOICES.map(({ tier: choice, label }) => {
                const on = tier === choice;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => selectTier(choice)}
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
              {diverged && (
                <span className="font-mono text-[11px] px-2.5 py-1 rounded-[3px] border border-seal bg-seal-soft text-seal">
                  Prilagođeno
                </span>
              )}
            </div>

            {/* ── Mreža alata — vidljiva tek kad je dodijeljen paket ── */}
            {tier === "" ? (
              <Empty
                title="Bez ai_tier oznake — licenca nasljeđuje puni pristup"
                hint="Licence bez ai_tier oznake PanBI zbog kompatibilnosti unazad tretira kao Premijum (svi alati). Odaberi nivo iznad da ograničiš pristup i otključaš izbor pojedinačnih alata; za potpuno isključenje AI-ja ukloni panbi_ai capability u glavnom modalu."
              />
            ) : (
              <>
                <div className="flex items-baseline justify-between mb-1.5">
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
                    Alati
                  </div>
                  <div className="font-mono text-[10px] text-ink-soft tabular-nums">
                    {checkedIds.length} / {PANBI_AI_TOOL_CATALOG.length}
                  </div>
                </div>
                <div className="border border-line rounded-[3px] p-3 space-y-3">
                  {PANBI_AI_TOOL_GROUPS.map((group) => (
                    <div key={group.label}>
                      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft mb-1.5">
                        {group.label}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {group.entries.map((entry) => {
                          const on = checkedIds.includes(entry.id);
                          return (
                            <button
                              key={entry.id}
                              type="button"
                              onClick={() => toggleTool(entry.id)}
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
              </>
            )}

            {saveError && (
              <div className="mt-4">
                <ErrorNote message={saveError} />
              </div>
            )}

            <div className="flex items-center justify-end gap-3 border-t border-line mt-5 pt-4">
              {saved && !busy && (
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-grant">
                  Sačuvano
                </span>
              )}
              <Button variant="seal" disabled={busy} onClick={save}>
                {busy ? "Sačekaj…" : "Sačuvaj"}
              </Button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

/**
 * useSearchParams() zahtijeva Suspense granicu kad se stranica prerenderuje —
 * bez nje `next build` pada na "missing suspense boundary with useSearchParams".
 */
export default function LicenseAiSettingsPage() {
  return (
    <Suspense
      fallback={
        <>
          <Masthead />
          <main className="max-w-5xl mx-auto px-6 py-10 w-full">
            <div className="certificate rounded-[3px] px-5">
              <SkeletonRows count={5} />
            </div>
          </main>
        </>
      }
    >
      <LicenseAiSettings />
    </Suspense>
  );
}
