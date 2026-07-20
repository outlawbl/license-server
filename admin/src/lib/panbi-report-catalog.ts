/**
 * Mirrors PanBI's report catalog (src/lib/nav-items.ts's REPORT_CATALOG)
 * and package tier presets (src/lib/package-presets.ts's PACKAGE_PRESETS)
 * — duplicated here because this admin app has no build-time access to the
 * PanBI repo. If PanBI's catalog changes, update this file to match.
 */

export interface PanbiReportEntry {
  id: string;
  label: string;
  groupLabel: string;
}

export const PANBI_REPORT_CATALOG: PanbiReportEntry[] = [
  // Prodaja
  { id: "reports-sales-by-customer", label: "Pregledi prodaje", groupLabel: "Prodaja" },
  { id: "reports-sales-daily-trend", label: "Trend prometa i RUC-a", groupLabel: "Prodaja" },
  { id: "reports-sales-atv", label: "ATV analiza", groupLabel: "Prodaja" },
  { id: "reports-sales-orders", label: "Narudžbe", groupLabel: "Prodaja" },
  { id: "reports-sales-discounts", label: "Popusti & Rabati", groupLabel: "Prodaja" },
  { id: "reports-sales-returns", label: "Povratnice", groupLabel: "Prodaja" },
  { id: "reports-sales-margin-erosion", label: "Erozija marže", groupLabel: "Prodaja" },
  // RUC analiza
  { id: "reports-ruc-period", label: "Pregled perioda", groupLabel: "RUC analiza" },
  { id: "reports-ruc-monthly-trend", label: "Mjesečni trend", groupLabel: "RUC analiza" },
  { id: "reports-ruc-pace", label: "Pace report", groupLabel: "RUC analiza" },
  // Kupci
  { id: "reports-customers", label: "Lista kupaca", groupLabel: "Kupci" },
  { id: "reports-customers-monthly", label: "Promet po mjesecima", groupLabel: "Kupci" },
  { id: "reports-customers-trend", label: "Trend prometa", groupLabel: "Kupci" },
  { id: "reports-customers-rfm", label: "RFM segmenti", groupLabel: "Kupci" },
  { id: "reports-customers-clv", label: "CLV analiza", groupLabel: "Kupci" },
  { id: "reports-customers-sleeping", label: "Uspavani kupci", groupLabel: "Kupci" },
  { id: "reports-customers-retention", label: "Zadržavanje & Odliv", groupLabel: "Kupci" },
  { id: "reports-customers-new-customers", label: "Novi kupci", groupLabel: "Kupci" },
  { id: "reports-customers-ar-balance", label: "Potraživanja", groupLabel: "Kupci" },
  { id: "reports-customers-category-matrix", label: "Kategorije po kupcu", groupLabel: "Kupci" },
  { id: "reports-customers-potential", label: "Potencijal kupaca", groupLabel: "Kupci" },
  // Artikli
  { id: "reports-items-catalog", label: "Šifarnik artikala", groupLabel: "Artikli" },
  { id: "reports-sales-by-item", label: "Po artiklima", groupLabel: "Artikli" },
  { id: "reports-items-abc", label: "ABC analiza", groupLabel: "Artikli" },
  { id: "reports-sales-cross-sell", label: "Cross-sell analiza", groupLabel: "Artikli" },
  { id: "reports-sales-seasonal", label: "Sezonalnost", groupLabel: "Artikli" },
  { id: "reports-items-margin-erosion", label: "Erozija marže po artiklu", groupLabel: "Artikli" },
  { id: "reports-items-discounts", label: "Popusti po artiklu", groupLabel: "Artikli" },
  // Zalihe
  { id: "reports-items-stock-analysis", label: "Analiza zaliha", groupLabel: "Zalihe" },
  { id: "reports-items-turnover", label: "Obrt zaliha", groupLabel: "Zalihe" },
  { id: "reports-items-aging", label: "Starost zaliha", groupLabel: "Zalihe" },
  { id: "reports-items-dead-stock", label: "Mrtve zalihe", groupLabel: "Zalihe" },
  { id: "reports-items-velocity", label: "Fast/Slow movers", groupLabel: "Zalihe" },
  { id: "reports-items-psi-matrix", label: "PSI matrica", groupLabel: "Zalihe" },
  { id: "reports-items-sell-through", label: "Sell-through", groupLabel: "Zalihe" },
  { id: "reports-items-aging-heatmap", label: "Heatmap brend × starost", groupLabel: "Zalihe" },
  { id: "reports-items-stock-structure", label: "Struktura lagera (UDIO%)", groupLabel: "Zalihe" },
  { id: "reports-items-stock-trend", label: "Trend lagera kroz vrijeme", groupLabel: "Zalihe" },
  { id: "reports-stock-alerts", label: "Upozorenja zaliha", groupLabel: "Zalihe" },
  // Finansije
  { id: "reports-finance-partners", label: "Partneri", groupLabel: "Finansije" },
  { id: "reports-finance-ar-ap", label: "AR / AP pregled", groupLabel: "Finansije" },
  { id: "reports-costs-ap", label: "Obaveze (AP)", groupLabel: "Finansije" },
  { id: "reports-finance-dso", label: "DSO analiza", groupLabel: "Finansije" },
  { id: "reports-finance-profitability", label: "Profitabilnost kupaca", groupLabel: "Finansije" },
  { id: "reports-costs-cashflow", label: "Cash flow", groupLabel: "Finansije" },
  { id: "reports-finance-purchasing", label: "Nabavna analitika", groupLabel: "Finansije" },
  { id: "reports-finance-contracts", label: "Ugovori o cijenama", groupLabel: "Finansije" },
  { id: "reports-finance-vat", label: "PDV izvještaj", groupLabel: "Finansije" },
  { id: "reports-finance-income-statement", label: "Bilans uspeha", groupLabel: "Finansije" },
  { id: "reports-finance-balance-sheet", label: "Bilans stanja", groupLabel: "Finansije" },
  { id: "reports-finance-budget", label: "Budžet plan-vs-STV", groupLabel: "Finansije" },
  // Tim / Prodavci
  { id: "reports-team-clerk-performance", label: "Performanse", groupLabel: "Tim / Prodavci" },
  { id: "reports-team-hit-rate", label: "Hit Rate", groupLabel: "Tim / Prodavci" },
  { id: "reports-team-activities", label: "Kalendar aktivnosti", groupLabel: "Tim / Prodavci" },
  { id: "reports-team-timeline", label: "Pregled aktivnosti", groupLabel: "Tim / Prodavci" },
  { id: "reports-team-meetings", label: "Dashboard sastanaka", groupLabel: "Tim / Prodavci" },
  { id: "reports-team-portfolio", label: "Portfolio kupaca", groupLabel: "Tim / Prodavci" },
  { id: "reports-team-targets", label: "Ostvarenje ciljeva", groupLabel: "Tim / Prodavci" },
  { id: "reports-bonus-statement", label: "Moj bonus", groupLabel: "Tim / Prodavci" },
  // Troškovi
  { id: "reports-costs-executive", label: "Executive dashboard", groupLabel: "Troškovi" },
  { id: "reports-costs", label: "Pregled", groupLabel: "Troškovi" },
  { id: "reports-costs-payroll", label: "Plate", groupLabel: "Troškovi" },
  { id: "reports-costs-employees", label: "Po radniku", groupLabel: "Troškovi" },
  { id: "reports-costs-operating", label: "Operativni", groupLabel: "Troškovi" },
  { id: "reports-costs-travel", label: "Putni", groupLabel: "Troškovi" },
  { id: "reports-costs-vehicle-fuel", label: "Gorivo po vozilu", groupLabel: "Troškovi" },
  { id: "reports-costs-amortization", label: "Amortizacija", groupLabel: "Troškovi" },
  { id: "reports-costs-fixed-assets", label: "Osnovna Sredstva", groupLabel: "Troškovi" },
  { id: "reports-costs-yoy", label: "YoY poređenje", groupLabel: "Troškovi" },
  { id: "reports-costs-profitability", label: "Profitabilnost sektora", groupLabel: "Troškovi" },
];

export type PanbiPackageTier = "osnovni" | "standard" | "premium" | "custom";

export const PANBI_PACKAGE_TIER_LABELS: Record<Exclude<PanbiPackageTier, "custom">, string> = {
  osnovni: "Osnovni",
  standard: "Standard",
  premium: "Premijum",
};

const OSNOVNI_IDS = [
  "reports-sales-by-customer", "reports-sales-daily-trend", "reports-ruc-period", "reports-ruc-monthly-trend",
  "reports-customers", "reports-customers-monthly", "reports-customers-trend", "reports-items-catalog",
  "reports-items-stock-analysis", "reports-items-turnover", "reports-finance-ar-ap",
  "reports-finance-income-statement", "reports-finance-balance-sheet", "reports-team-clerk-performance",
  "reports-costs-payroll", "reports-costs-operating",
];

const PREMIUM_ONLY_IDS = [
  "reports-costs-executive", "reports-costs", "reports-costs-employees", "reports-costs-travel",
  "reports-costs-vehicle-fuel", "reports-costs-amortization", "reports-costs-fixed-assets", "reports-costs-yoy",
  "reports-costs-profitability", "reports-costs-ap", "reports-costs-cashflow", "reports-finance-budget",
  "reports-finance-contracts", "reports-customers-rfm", "reports-customers-clv", "reports-customers-retention",
  "reports-customers-potential", "reports-customers-category-matrix", "reports-sales-margin-erosion",
  "reports-items-margin-erosion", "reports-items-psi-matrix", "reports-items-aging-heatmap",
  "reports-items-stock-structure", "reports-items-stock-trend", "reports-team-portfolio",
  "reports-team-meetings", "reports-finance-dso", "reports-finance-profitability",
];

const ALL_IDS = PANBI_REPORT_CATALOG.map((r) => r.id);

export const PANBI_PACKAGE_PRESETS: Record<PanbiPackageTier, string[]> = {
  osnovni: OSNOVNI_IDS,
  standard: ALL_IDS.filter((id) => !PREMIUM_ONLY_IDS.includes(id)),
  premium: ALL_IDS,
  custom: [],
};
