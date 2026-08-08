/**
 * Mirrors PanBI's AI chat tool catalog (src/app/api/ai/chat/route.ts's
 * `chatTools` object — one entry per tool name) and the AI tier presets
 * — duplicated here because this admin app has no build-time access to the
 * PanBI repo. If PanBI's tool list changes (tool added / removed / renamed),
 * update this file to match.
 *
 * Two independent classifications per tool:
 *   - `groupLabel` — functional category, used only to group the checkbox grid
 *     (read-only Q&A tool / in-app action / sensitive admin write).
 *   - tier bucket — which preset array below the tool id lives in. NOT the same
 *     partition as `groupLabel`: the finance/cost tools are functionally
 *     read-only but sit in higher tier buckets by business decision (a client
 *     on Osnovni should not see payroll or cost data by default).
 */

export interface PanbiAiToolEntry {
  id: string;
  label: string;
  groupLabel: string;
}

export const PANBI_AI_TOOL_CATALOG: PanbiAiToolEntry[] = [
  // Čitanje podataka — read-only Q&A tools (Osnovni tier bucket)
  { id: "get_sales_summary", label: "Pregled prodaje", groupLabel: "Čitanje podataka" },
  { id: "get_top_customers", label: "Top kupci", groupLabel: "Čitanje podataka" },
  { id: "get_top_items", label: "Top artikli", groupLabel: "Čitanje podataka" },
  { id: "search_item_sales", label: "Pretraga prodaje artikla", groupLabel: "Čitanje podataka" },
  { id: "get_sleeping_customers", label: "Uspavani kupci", groupLabel: "Čitanje podataka" },
  { id: "get_ar_balance", label: "Potraživanja (AR)", groupLabel: "Čitanje podataka" },
  { id: "get_rfm_segments", label: "RFM segmenti", groupLabel: "Čitanje podataka" },
  { id: "get_clerk_performance", label: "Performanse prodavaca", groupLabel: "Čitanje podataka" },
  { id: "get_stock_alerts", label: "Upozorenja zaliha", groupLabel: "Čitanje podataka" },
  { id: "get_monthly_trend", label: "Mjesečni trend", groupLabel: "Čitanje podataka" },
  { id: "get_abc_analysis", label: "ABC analiza", groupLabel: "Čitanje podataka" },
  { id: "get_customers_by_item", label: "Kupci po artiklu", groupLabel: "Čitanje podataka" },
  { id: "get_document", label: "Dokument", groupLabel: "Čitanje podataka" },
  { id: "get_document_list", label: "Lista dokumenata", groupLabel: "Čitanje podataka" },
  { id: "show_options", label: "Prikaz opcija za izbor", groupLabel: "Čitanje podataka" },
  { id: "get_clerk_top_items", label: "Top artikli prodavca", groupLabel: "Čitanje podataka" },
  { id: "get_clerk_top_customers", label: "Kupci prodavca", groupLabel: "Čitanje podataka" },
  { id: "get_sales_by_dimension", label: "Prodaja po dimenziji (klasifikacija/proizvođač/mjesto)", groupLabel: "Čitanje podataka" },
  { id: "get_sales_analytics", label: "Prodajna analitika (trend/ATV/cross-sell/narudžbe)", groupLabel: "Čitanje podataka" },
  { id: "get_customer_analytics", label: "Analitika kupaca (potencijal/trend)", groupLabel: "Čitanje podataka" },
  { id: "get_stock_analytics", label: "Analitika zaliha (velocity/PSI/struktura)", groupLabel: "Čitanje podataka" },
  { id: "get_finance_overview", label: "Finansijski pregled (bilans/profitabilnost/nabavka)", groupLabel: "Čitanje podataka" },
  { id: "get_team_analytics", label: "Analitika tima (aktivnosti/sastanci/portfolio)", groupLabel: "Čitanje podataka" },
  { id: "get_entity_detail", label: "Kartica entiteta (prodavač/proizvođač/regija/artikal)", groupLabel: "Čitanje podataka" },
  { id: "get_top_items_by_supplier", label: "Top artikli po dobavljaču", groupLabel: "Čitanje podataka" },
  { id: "daily_briefing", label: "Dnevni briefing", groupLabel: "Čitanje podataka" },
  { id: "compare_periods", label: "Poređenje perioda", groupLabel: "Čitanje podataka" },
  { id: "search_customer", label: "Pretraga kupaca", groupLabel: "Čitanje podataka" },
  { id: "get_customer_overview", label: "Pregled kupca", groupLabel: "Čitanje podataka" },
  { id: "get_customer_trend", label: "Trend kupca", groupLabel: "Čitanje podataka" },
  { id: "get_item_stock", label: "Zaliha artikla", groupLabel: "Čitanje podataka" },
  { id: "ruc_calculator", label: "RUC kalkulator", groupLabel: "Čitanje podataka" },
  { id: "get_new_customers", label: "Novi kupci", groupLabel: "Čitanje podataka" },
  { id: "get_customer_contacts", label: "Kontakti kupca", groupLabel: "Čitanje podataka" },
  { id: "get_team_targets", label: "Ciljevi tima", groupLabel: "Čitanje podataka" },
  { id: "get_bonus_statement", label: "Obračun bonusa", groupLabel: "Čitanje podataka" },
  { id: "get_hit_rate", label: "Hit rate", groupLabel: "Čitanje podataka" },
  { id: "get_cashflow", label: "Cash flow", groupLabel: "Čitanje podataka" },
  { id: "get_dso", label: "DSO analiza", groupLabel: "Čitanje podataka" },
  { id: "get_income_statement", label: "Bilans uspjeha", groupLabel: "Čitanje podataka" },
  { id: "get_vat_summary", label: "PDV pregled", groupLabel: "Čitanje podataka" },
  { id: "get_budget_status", label: "Status budžeta", groupLabel: "Čitanje podataka" },
  { id: "get_dead_stock", label: "Mrtve zalihe", groupLabel: "Čitanje podataka" },
  { id: "get_stock_aging", label: "Starost zaliha", groupLabel: "Čitanje podataka" },
  { id: "get_inventory_turnover", label: "Obrt zaliha", groupLabel: "Čitanje podataka" },
  { id: "get_returns", label: "Povratnice", groupLabel: "Čitanje podataka" },
  { id: "get_margin_erosion", label: "Erozija marže", groupLabel: "Čitanje podataka" },
  { id: "get_discounts", label: "Popusti i rabati", groupLabel: "Čitanje podataka" },
  { id: "get_customer_retention", label: "Zadržavanje kupaca", groupLabel: "Čitanje podataka" },
  { id: "get_clv", label: "CLV analiza", groupLabel: "Čitanje podataka" },
  { id: "get_sales_by_region", label: "Prodaja po regijama", groupLabel: "Čitanje podataka" },
  { id: "get_my_notes", label: "Moje bilješke", groupLabel: "Čitanje podataka" },
  { id: "get_my_agenda", label: "Moja agenda", groupLabel: "Čitanje podataka" },
  { id: "get_my_crm_link", label: "Moj CRM nalog", groupLabel: "Čitanje podataka" },
  // Čitanje podataka — funkcionalno read-only, ali podignuti u viši tier (troškovi/finansije)
  { id: "get_operating_costs", label: "Operativni troškovi", groupLabel: "Čitanje podataka" },
  { id: "get_travel_costs", label: "Putni troškovi", groupLabel: "Čitanje podataka" },
  { id: "get_profitability", label: "Profitabilnost", groupLabel: "Čitanje podataka" },
  { id: "get_ap_vendors", label: "Obaveze prema dobavljačima", groupLabel: "Čitanje podataka" },
  { id: "get_amortization", label: "Amortizacija", groupLabel: "Čitanje podataka" },
  { id: "get_cost_analytics", label: "Analitika troškova (izvršni/zaposleni/vozila/YoY)", groupLabel: "Čitanje podataka" },
  { id: "get_payroll", label: "Plate", groupLabel: "Čitanje podataka" },
  // Akcije — radnje unutar aplikacije
  { id: "open_report", label: "Otvori izvještaj", groupLabel: "Akcije" },
  { id: "send_telegram", label: "Slanje Telegram poruke", groupLabel: "Akcije" },
  { id: "schedule_report", label: "Zakaži izvještaj", groupLabel: "Akcije" },
  { id: "export_report", label: "Izvoz izvještaja", groupLabel: "Akcije" },
  { id: "remember_note", label: "Zapamti bilješku", groupLabel: "Akcije" },
  { id: "complete_note", label: "Označi bilješku završenom", groupLabel: "Akcije" },
  { id: "enable_morning_briefing", label: "Uključi jutarnji briefing", groupLabel: "Akcije" },
  { id: "send_email", label: "Slanje emaila", groupLabel: "Akcije" },
  { id: "notify_user", label: "Obavijesti korisnika", groupLabel: "Akcije" },
  { id: "open_customer", label: "Otvori kupca", groupLabel: "Akcije" },
  { id: "open_item", label: "Otvori artikal", groupLabel: "Akcije" },
  { id: "add_dashboard_widget", label: "Dodaj dashboard widget", groupLabel: "Akcije" },
  { id: "create_crm_activity", label: "Kreiraj CRM aktivnost", groupLabel: "Akcije" },
  // Premium / osjetljivo — administrativni upisi
  { id: "create_alert", label: "Kreiraj alert pravilo", groupLabel: "Premium / osjetljivo" },
  { id: "set_monthly_target", label: "Postavi mjesečni cilj", groupLabel: "Premium / osjetljivo" },
  { id: "update_budget", label: "Ažuriraj budžet", groupLabel: "Premium / osjetljivo" },
];

export type PanbiAiTier = "osnovni" | "standard" | "premium" | "custom";

export const PANBI_AI_TIER_LABELS: Record<Exclude<PanbiAiTier, "custom">, string> = {
  osnovni: "Osnovni",
  standard: "Standard",
  premium: "Premijum",
};

const OSNOVNI_TOOL_IDS = [
  "get_sales_summary", "get_top_customers", "get_top_items", "search_item_sales",
  "get_sleeping_customers", "get_ar_balance", "get_rfm_segments", "get_clerk_performance",
  "get_stock_alerts", "get_monthly_trend", "get_abc_analysis", "get_customers_by_item",
  "get_document", "get_document_list", "show_options",
  "get_clerk_top_items", "get_clerk_top_customers", "get_top_items_by_supplier",
  "daily_briefing", "compare_periods",
  "search_customer", "get_customer_overview", "get_customer_trend", "get_item_stock",
  "ruc_calculator", "get_new_customers", "get_customer_contacts", "get_team_targets",
  "get_bonus_statement", "get_hit_rate", "get_cashflow", "get_dso", "get_income_statement",
  "get_vat_summary", "get_budget_status", "get_dead_stock", "get_stock_aging",
  "get_inventory_turnover", "get_returns", "get_margin_erosion", "get_discounts",
  "get_customer_retention", "get_clv", "get_sales_by_region", "get_sales_by_dimension",
  "get_sales_analytics", "get_customer_analytics", "get_stock_analytics",
  "get_finance_overview", "get_team_analytics", "get_entity_detail",
  "get_my_notes", "get_my_agenda",
  "get_my_crm_link",
];

// Akcije unutar aplikacije + finansije/troškovi koji su read-only, ali ne spadaju u Osnovni
const STANDARD_ADD_TOOL_IDS = [
  "open_report", "send_telegram", "schedule_report", "export_report", "remember_note",
  "complete_note", "enable_morning_briefing", "send_email", "notify_user", "open_customer",
  "open_item", "add_dashboard_widget", "create_crm_activity",
  "get_cost_analytics",
  "get_operating_costs", "get_travel_costs", "get_profitability", "get_ap_vendors",
  "get_amortization",
];

// Premium dodaje osjetljive admin upise + get_payroll (i glasovni realtime, koji se
// gejta u PanBI repou, ne ovdje).
const ALL_TOOL_IDS = PANBI_AI_TOOL_CATALOG.map((t) => t.id);

export const PANBI_AI_TIER_PRESETS: Record<PanbiAiTier, string[]> = {
  osnovni: OSNOVNI_TOOL_IDS,
  standard: [...OSNOVNI_TOOL_IDS, ...STANDARD_ADD_TOOL_IDS],
  premium: ALL_TOOL_IDS,
  custom: [],
};
