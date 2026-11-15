"use client";

import React, { useState, useMemo } from "react";
import investigationsRaw from "@/data/investigations.json";
import runsRaw from "@/data/experimental_runs.json";
import ntrsRaw from "@/data/ntrs_papers.json";
import {
  rankInvestigations,
  MISSION_PRESETS,
  MissionScenario,
  Investigation,
  AudienceMode,
  AppLang,
} from "@/lib/ranking";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
  ReferenceDot,
} from "recharts";
import {
  AlertTriangle,
  Download,
  BookOpen,
  CheckSquare,
  Globe2,
  GraduationCap,
  Wrench,
  ExternalLink,
  Send,
  Sliders,
  Layers,
  ShieldCheck,
} from "lucide-react";

interface ExperimentalRun {
  run_id: string;
  investigation_id: string;
  investigation_acronym: string;
  pillar: string;
  fuel: string;
  fuel_phase: string;
  o2_pct: number;
  o2_is_nominal: boolean;
  pressure_psi: number;
  pressure_is_nominal: boolean;
  airflow_cm_s: number | null;
  airflow_raw: string;
  outcome: string;
  burn_time_s: number | null;
  peak_temp_c: number | null;
  co_delta_ppm: number | null;
  data_kind: string;
}

interface NtrsPaper {
  ntrs_id: string | number;
  topic_tag: string;
  title: string;
  abstract: string;
  publication_date: string;
  center: string;
  url: string;
  pdf_url: string | null;
}

// Paleta de alto contraste sobre fondo claro (accesible en proyectores y pantallas)
const COLORS: Record<string, string> = {
  "PSI-25": "#0284c7", // Azul Cobalto
  "PSI-99": "#7c3aed", // Violeta Profundo
  "PSI-101": "#059669", // Verde Esmeralda
  "PSI-68": "#d97706", // Ámbar Oscuro
  "PSI-159": "#dc2626", // Rojo Carmesí
};

const TOPIC_MAP: Record<string, string[]> = {
  "PSI-25": ["BASS", "LUNAR_SAFETY"],
  "PSI-99": ["SAFFIRE", "LUNAR_SAFETY"],
  "PSI-101": ["SAME_DAFT", "LUNAR_SAFETY"],
  "PSI-68": ["FLEX", "LUNAR_SAFETY"],
  "PSI-159": ["ACME", "LUNAR_SAFETY"],
};

export default function FlameInFreefallDashboard() {
  const investigations = investigationsRaw as Investigation[];
  const allRuns = runsRaw as ExperimentalRun[];
  const ntrsPapers = ntrsRaw as NtrsPaper[];

  const [lang, setLang] = useState<AppLang>("es");
  const [mode, setMode] = useState<AudienceMode>("engineer");
  const [scenario, setScenario] = useState<MissionScenario>(MISSION_PRESETS[0]);
  const [selectedIds, setSelectedIds] = useState<string[]>(["PSI-25", "PSI-99", "PSI-68"]);
  const [yAxisMetric, setYAxisMetric] = useState<"pressure" | "burntime">("pressure");

  const [question, setQuestion] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<
    Array<{ role: "user" | "si"; text: string; source?: string }>
  >([]);

  const t = (es: string, en: string) => (lang === "es" ? es : en);

  const ranked = useMemo(
    () => rankInvestigations(investigations, scenario, lang),
    [investigations, scenario, lang]
  );

  const chartGroups = useMemo(() => {
    const groups: Record<
      string,
      Array<ExperimentalRun & { plotO2: number; plotY: number }>
    > = {};
    allRuns.forEach((r, idx) => {
      if (scenario.fuelPhase !== "All" && r.fuel_phase !== scenario.fuelPhase) return;
      const jitterO2 = r.o2_is_nominal ? Math.sin(idx * 1.7) * 0.4 : 0;

      let yVal = r.pressure_psi;
      if (yAxisMetric === "burntime") {
        if (r.burn_time_s === null) return;
        yVal = r.burn_time_s;
      } else {
        const jitterP = r.pressure_is_nominal ? Math.cos(idx * 1.3) * 0.4 : 0;
        yVal = Number((r.pressure_psi + jitterP).toFixed(2));
      }

      const item = {
        ...r,
        plotO2: Number((r.o2_pct + jitterO2).toFixed(2)),
        plotY: yVal,
      };
      if (!groups[r.investigation_id]) groups[r.investigation_id] = [];
      groups[r.investigation_id].push(item);
    });
    return groups;
  }, [allRuns, scenario.fuelPhase, yAxisMetric]);

  const telemetry = useMemo(() => {
    const inO2Band = allRuns.filter(
      (r) => Math.abs(r.o2_pct - scenario.targetO2Pct) <= 4.0
    ).length;
    const solidAbove30 = allRuns.filter(
      (r) => r.fuel_phase === "Solid" && r.o2_pct >= 30
    ).length;
    const totalSolid = allRuns.filter((r) => r.fuel_phase === "Solid").length;
    return { inO2Band, solidAbove30, totalSolid };
  }, [allRuns, scenario.targetO2Pct]);

  const comparedStudies = useMemo(
    () => ranked.filter((inv) => selectedIds.includes(inv.id)),
    [ranked, selectedIds]
  );

  const contextualPapers = useMemo(() => {
    const topId = ranked[0]?.id || "PSI-25";
    const preferredTags = TOPIC_MAP[topId] || ["BASS"];
    const prioritized = [...ntrsPapers].sort((a, b) => {
      const aMatch = preferredTags.includes(a.topic_tag) ? 1 : 0;
      const bMatch = preferredTags.includes(b.topic_tag) ? 1 : 0;
      return bMatch - aMatch;
    });
    return prioritized.slice(0, 6);
  }, [ntrsPapers, ranked]);

  const toggleCompare = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const exportFilteredCsv = () => {
    const filtered = allRuns.filter((r) => selectedIds.includes(r.investigation_id));
    const headers = [
      "run_id",
      "investigation_id",
      "investigation_acronym",
      "doi",
      "pillar",
      "fuel",
      "fuel_phase",
      "o2_pct",
      "pressure_psi",
      "airflow_cm_s",
      "airflow_raw",
      "burn_time_s",
      "peak_temp_c",
      "co_delta_ppm",
      "outcome",
    ];
    const doiMap = Object.fromEntries(investigations.map((i) => [i.id, i.doi]));
    const rows = filtered.map((r) =>
      [
        r.run_id,
        r.investigation_id,
        r.investigation_acronym,
        doiMap[r.investigation_id] || "",
        `"${r.pillar}"`,
        `"${r.fuel.replace(/"/g, '""')}"`,
        r.fuel_phase,
        r.o2_pct,
        r.pressure_psi,
        r.airflow_cm_s ?? "",
        `"${r.airflow_raw.replace(/"/g, '""')}"`,
        r.burn_time_s ?? "",
        r.peak_temp_c ?? "",
        r.co_delta_ppm ?? "",
        `"${r.outcome.replace(/"/g, '""')}"`,
      ].join(",")
    );
    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `nasa_psi_fire_safety_${filtered.length}_runs.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const askCopilot = async (customPrompt?: string) => {
    const q = (customPrompt ?? question).trim();
    if (!q || chatLoading) return;
    setQuestion("");
    setChatHistory((prev) => [...prev, { role: "user", text: q }]);
    setChatLoading(true);

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          mode,
          lang,
          scenario,
        }),
      });
      const data = await res.json();
      setChatHistory((prev) => [
        ...prev,
        {
          role: "si",
          text: data.answer || data.error || "No response.",
          source: data.source,
        },
      ]);
    } catch {
      setChatHistory((prev) => [
        ...prev,
        {
          role: "si",
          text: t(
            "Error de comunicación con /api/copilot.",
            "Communication error with /api/copilot."
          ),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const quickPrompts =
    mode === "student"
      ? [
          t(
            "¿Por qué una llama en la Estación Espacial forma una esfera azul en lugar de subir?",
            "Why does a flame on the Space Station form a blue sphere instead of rising?"
          ),
          t(
            "¿Cómo se usan los estudios de humo espacial (SAME-R) en la minería en la Tierra?",
            "How are space smoke studies (SAME-R) used in mining on Earth?"
          ),
          t(
            "¿Por qué una Base Lunar con 34% de oxígeno es mucho más peligrosa ante un incendio?",
            "Why is a Lunar Base with 34% oxygen much more dangerous in a fire?"
          ),
        ]
      : [
          t(
            "Evalúa la brecha de inflamabilidad en polímeros sólidos para atmósferas lunares (>=30% O2, <=10.2 psi).",
            "Evaluate the solid polymer flammability gap for lunar atmospheres (>=30% O2, <=10.2 psi)."
          ),
          t(
            "¿Cómo acotar tasas de propagación en 1/6g combinando SAFFIRE-II (0g/1g) y BASS-II?",
            "How can we bound 1/6g spread rates by combining SAFFIRE-II (0g/1g) and BASS-II?"
          ),
          t(
            "Compara la respuesta óptica/ionización en SAME-R (Rt/R0) frente a contaminación por polvo lunar.",
            "Compare optical/ionization response in SAME-R (Rt/R0) against lunar dust contamination."
          ),
        ];

  const xDomain: [number, number] = [10, 88];
  const yDomain: [number, number] | ["auto", "auto"] =
    yAxisMetric === "pressure" ? [3, 50] : ["auto", "auto"];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      {/* ENCABEZADO LIMPIO Y CLARO (SIN LOGO AMARILLO NI SIGLAS CONFUSAS) */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                NASA Space Apps Challenge • Flame in Freefall
              </span>
              <h1 className="text-base md:text-lg font-extrabold text-slate-900">
                {t(
                  "Explorador de Seguridad contra Incendios en Microgravedad",
                  "Microgravity Fire Safety & Combustion Explorer"
                )}
              </h1>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              {t(
                "Base de Datos de Ciencias Físicas de la NASA (PSI: 746 ensayos reales) + Servidor de Reportes Técnicos (NTRS: 28 estudios)",
                "NASA Physical Sciences Informatics (PSI: 746 real runs) + NASA Technical Reports Server (NTRS: 28 studies)"
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* SELECTOR DE MODO (INGENIERO vs ESTUDIANTE/PÚBLICO) */}
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setMode("engineer")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  mode === "engineer"
                    ? "bg-blue-700 text-white shadow-xs"
                    : "text-slate-700 hover:text-slate-900"
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                {t("Modo Ingeniero / Investigador", "Engineer / Researcher Mode")}
              </button>
              <button
                onClick={() => setMode("student")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  mode === "student"
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "text-slate-700 hover:text-slate-900"
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                {t("Modo Estudiante / Público", "Student / Public Lab")}
              </button>
            </div>

            <button
              onClick={() => setLang(lang === "es" ? "en" : "es")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-800"
            >
              <Globe2 className="w-3.5 h-3.5 text-blue-700" />
              {lang === "es" ? "🇲🇽 ES → 🇺🇸 EN" : "🇺🇸 EN → 🇲🇽 ES"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-5 space-y-5">
        {/* PANEL DE CONTROL DE ESCENARIO Y ATMÓSFERA */}
        <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-700" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                {mode === "engineer"
                  ? t(
                      "1. Condiciones de Contorno de la Misión (Simulador de Atmósfera)",
                      "1. Mission Boundary Conditions (Atmosphere Simulator)"
                    )
                  : t(
                      "1. Elige una Misión Espacial o Ajusta el Oxígeno y la Ventilación",
                      "1. Choose a Space Mission or Adjust Oxygen & Airflow"
                    )}
              </h2>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MISSION_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setScenario(preset)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                    scenario.id === preset.id
                      ? "bg-blue-700 border-blue-700 text-white"
                      : "bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {lang === "es" ? preset.name : preset.name_en}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-xs font-medium text-slate-700">
                  {t("Oxígeno (O₂)", "Oxygen (O₂)")}
                </span>
                <span className="font-mono text-sm font-extrabold text-blue-800">
                  {scenario.targetO2Pct}% vol
                </span>
              </div>
              <input
                type="range"
                min={12}
                max={85}
                value={scenario.targetO2Pct}
                onChange={(e) =>
                  setScenario({
                    ...scenario,
                    id: "custom",
                    name: "Personalizado",
                    name_en: "Custom",
                    targetO2Pct: Number(e.target.value),
                  })
                }
                className="w-full accent-blue-700 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-medium text-slate-500 mt-1">
                <span>12%</span>
                <span>21% (Tierra/ISS)</span>
                <span>34% (Luna)</span>
                <span>85%</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-xs font-medium text-slate-700">
                  {t("Presión de Cabina", "Cabin Pressure")}
                </span>
                <span className="font-mono text-sm font-extrabold text-slate-900">
                  {scenario.targetPressurePsi} psi{" "}
                  <span className="text-[10px] font-normal text-slate-500">
                    ({(scenario.targetPressurePsi / 14.696).toFixed(2)} atm)
                  </span>
                </span>
              </div>
              <input
                type="range"
                min={4.3}
                max={30}
                step={0.5}
                value={scenario.targetPressurePsi}
                onChange={(e) =>
                  setScenario({
                    ...scenario,
                    id: "custom",
                    name: "Personalizado",
                    name_en: "Custom",
                    targetPressurePsi: Number(e.target.value),
                  })
                }
                className="w-full accent-blue-700 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-medium text-slate-500 mt-1">
                <span>4.3 (Traje)</span>
                <span>10.2 (Luna)</span>
                <span>14.7 (Tierra)</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-xs font-medium text-slate-700">
                  {t("Flujo de Aire", "Airflow Speed")}
                </span>
                <span className="font-mono text-sm font-extrabold text-emerald-800">
                  {scenario.targetAirflowCmS} cm/s
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={40}
                value={scenario.targetAirflowCmS}
                onChange={(e) =>
                  setScenario({
                    ...scenario,
                    id: "custom",
                    name: "Personalizado",
                    name_en: "Custom",
                    targetAirflowCmS: Number(e.target.value),
                  })
                }
                className="w-full accent-emerald-700 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-medium text-slate-500 mt-1">
                <span>0 (Sin viento)</span>
                <span>20 cm/s</span>
                <span>40 cm/s</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {t("Objetivo de Seguridad", "Safety Pillar")}
              </label>
              <select
                value={scenario.pillar}
                onChange={(e) =>
                  setScenario({
                    ...scenario,
                    pillar: e.target.value as MissionScenario["pillar"],
                  })
                }
                className="w-full bg-white border border-slate-300 rounded-md px-2 py-1.5 text-xs font-medium text-slate-900"
              >
                <option value="All">{t("Todos (Prev/Det/Sup)", "All Pillars")}</option>
                <option value="Prevention">{t("Prevención / Inflamabilidad", "Prevention")}</option>
                <option value="Detection">{t("Detección de Humo/Polvo", "Detection")}</option>
                <option value="Suppression">{t("Supresión / Extinción", "Suppression")}</option>
              </select>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {t("Tipo de Material / Fase", "Fuel Phase")}
              </label>
              <select
                value={scenario.fuelPhase}
                onChange={(e) =>
                  setScenario({
                    ...scenario,
                    fuelPhase: e.target.value as MissionScenario["fuelPhase"],
                  })
                }
                className="w-full bg-white border border-slate-300 rounded-md px-2 py-1.5 text-xs font-medium text-slate-900"
              >
                <option value="All">{t("Todas las Fases", "All Phases")}</option>
                <option value="Solid">{t("Sólido (Telas / Plásticos)", "Solid")}</option>
                <option value="Liquid">{t("Líquido (Gotas)", "Liquid")}</option>
                <option value="Gas">{t("Gaseoso", "Gas")}</option>
                <option value="Aerosol/Smoke">{t("Humo / Aerosol", "Aerosol/Smoke")}</option>
              </select>
            </div>
          </div>
        </section>

        {/* =====================================================================
            VISTA EXCLUSIVA 1: MODO ESTUDIANTE / PÚBLICO GENERAL
           ===================================================================== */}
        {mode === "student" && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5 bg-white border border-emerald-200 rounded-xl p-4 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {t("Simulador Visual Interactivo", "Interactive Visual Simulator")}
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-2">
                  {t(
                    "¿Cómo se comporta una llama en el espacio frente a la Tierra?",
                    "How does a flame behave in space compared to Earth?"
                  )}
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  {t(
                    "Mueve los controles de Oxígeno y Flujo de Aire arriba para ver cómo cambia la física del fuego.",
                    "Move the Oxygen and Airflow sliders above to see how fire physics changes."
                  )}
                </p>
              </div>

              {/* DIAGRAMA VISUAL CON FONDO OSCURO INTERNO PARA QUE LA LLAMA DESTAQUE CON NITIDEZ */}
              <div className="my-4 bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-around h-52">
                <div className="flex flex-col items-center">
                  <svg width="90" height="115" viewBox="0 0 90 115">
                    <rect x="38" y="82" width="14" height="26" fill="#94a3b8" />
                    <line x1="45" y1="75" x2="45" y2="82" stroke="#f8fafc" strokeWidth="2" />
                    <path
                      d="M45 18 C58 43, 62 70, 45 76 C28 70, 32 43, 45 18 Z"
                      fill="#f59e0b"
                    />
                    <path
                      d="M45 40 C52 53, 53 68, 45 74 C37 68, 38 53, 45 40 Z"
                      fill="#fef08a"
                    />
                  </svg>
                  <span className="text-xs text-white font-bold">
                    {t("Tierra (1g • 21% O₂)", "Earth (1g • 21% O₂)")}
                  </span>
                  <span className="text-[11px] text-slate-300">
                    {t("El aire caliente sube", "Hot air rises")}
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <svg width="130" height="115" viewBox="0 0 130 115">
                    {scenario.targetAirflowCmS > 0 && (
                      <g stroke="#38bdf8" strokeWidth="2" opacity="0.8">
                        <line x1="8" y1="45" x2="32" y2="45" />
                        <line x1="8" y1="65" x2="28" y2="65" />
                      </g>
                    )}
                    <rect x="48" y="82" width="14" height="26" fill="#94a3b8" />
                    <line x1="55" y1="74" x2="55" y2="82" stroke="#f8fafc" strokeWidth="2" />

                    {scenario.targetAirflowCmS <= 3 ? (
                      <circle
                        cx="55"
                        cy="58"
                        r={scenario.targetO2Pct >= 30 ? 27 : 21}
                        fill={scenario.targetO2Pct >= 30 ? "#60a5fa" : "#3b82f6"}
                        fillOpacity="0.8"
                        stroke="#bae6fd"
                        strokeWidth="2"
                      />
                    ) : (
                      <ellipse
                        cx={55 + Math.min(22, scenario.targetAirflowCmS * 0.5)}
                        cy="58"
                        rx={18 + Math.min(25, scenario.targetAirflowCmS * 0.6)}
                        ry={scenario.targetO2Pct >= 30 ? 22 : 16}
                        fill={scenario.targetO2Pct >= 30 ? "#f97316" : "#38bdf8"}
                        fillOpacity="0.85"
                        stroke={scenario.targetO2Pct >= 30 ? "#fef08a" : "#bae6fd"}
                        strokeWidth="2"
                      />
                    )}
                  </svg>
                  <span className="text-xs text-emerald-300 font-bold">
                    {t("Tu Escenario Espacial", "Your Space Scenario")} ({scenario.targetO2Pct}% O₂)
                  </span>
                  <span className="text-[11px] text-slate-300">
                    {scenario.targetAirflowCmS <= 3
                      ? t("Esfera azul por difusión", "Blue diffusion sphere")
                      : scenario.targetO2Pct >= 30
                      ? t("¡Llama rápida enriquecida en O₂!", "Fast O₂-enriched flame!")
                      : t("Impulsada por ventilación", "Driven by cabin airflow")}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-slate-800 leading-relaxed">
                <strong>{t("¿Qué está pasando aquí?", "What is happening here?")}</strong>{" "}
                {scenario.targetO2Pct >= 30
                  ? t(
                      `Con ${scenario.targetO2Pct}% de oxígeno (como se planea en la Base Lunar para facilitar el uso de trajes espaciales), el fuego prende mucho más fácil que en la Tierra y la ventilación (${scenario.targetAirflowCmS} cm/s) lo alimenta.`,
                      `At ${scenario.targetO2Pct}% oxygen (planned for the Lunar Base to reduce spacesuit pre-breathing time), materials ignite much faster than on Earth and airflow (${scenario.targetAirflowCmS} cm/s) feeds the flame.`
                    )
                  : t(
                      `En gravedad cero el aire caliente no sube. Sin ventilación (0 cm/s), la llama es una esfera azul lenta; pero al encender los ventiladores (${scenario.targetAirflowCmS} cm/s), el viento empuja oxígeno hacia el fuego.`,
                      `In zero gravity hot air does not rise. Without fans (0 cm/s), the flame forms a slow blue sphere; when fans blow (${scenario.targetAirflowCmS} cm/s), airflow pushes fresh oxygen into the fire.`
                    )}
              </div>
            </div>

            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
              <div className="border-b border-slate-200 pb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  {t("Ciencia Accesible para Todos", "Accessible Science for Everyone")}
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  {t(
                    "¿Qué descubrió la NASA en cada experimento y cómo nos sirve en la Tierra?",
                    "What did NASA discover in each study and how does it help us on Earth?"
                  )}
                </h3>
              </div>

              <div className="space-y-2.5 max-h-[390px] overflow-y-auto pr-1">
                {ranked.map((inv, idx) => (
                  <div
                    key={inv.id}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[inv.id] }}
                        />
                        <span className="text-xs font-extrabold text-slate-900">
                          #{idx + 1} • {inv.acronym} ({inv.title})
                        </span>
                      </div>
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        {t("Afinidad:", "Match:")} {inv.score}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{inv.student_summary}</p>
                    <div className="p-2 rounded-md bg-white border border-emerald-200 text-xs text-slate-800 flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-emerald-900">
                          {t("Beneficio en la Tierra:", "Benefit on Earth:")}
                        </strong>{" "}
                        {inv.earth_spinoff}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* =====================================================================
            VISTA EXCLUSIVA 2: MODO INGENIERO / INVESTIGADOR (TELEMETRÍA)
           ===================================================================== */}
        {mode === "engineer" && (
          <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">
                {t("Ensayos en Banda O₂ (±4%)", "Runs in Target O₂ Band (±4%)")}
              </span>
              <div className="font-mono text-2xl font-extrabold text-slate-900 mt-1">
                {telemetry.inO2Band}{" "}
                <span className="text-xs font-normal text-slate-500">/ 746 ensayos</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {t(
                  `Densidad experimental cerca de ${scenario.targetO2Pct}% O₂`,
                  `Experimental density near ${scenario.targetO2Pct}% O₂`
                )}
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">
                {t("Sólidos Probados ≥30% O₂", "Solids Tested ≥30% O₂")}
              </span>
              <div className="font-mono text-2xl font-extrabold text-red-700 mt-1">
                {telemetry.solidAbove30} / {telemetry.totalSolid}{" "}
                <span className="text-xs font-semibold text-red-600">(0.0%)</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {t(
                  "En BASS-II y SAFFIRE-II (máx 22.2% O₂ en ISS/MSG)",
                  "Across BASS-II & SAFFIRE-II (max 22.2% O₂ in ISS/MSG)"
                )}
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">
                {t("Acotamiento Gravedad Parcial", "Partial-Gravity Bounding")}
              </span>
              <div className="font-mono text-2xl font-extrabold text-blue-800 mt-1">
                0g ↔ 1g Bound
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {t(
                  "Límites vía SAFFIRE-II (previo a LUCI / FM2)",
                  "Bounded via SAFFIRE-II (pre-LUCI / FM2)"
                )}
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase">
                {t("Extracción para Modelado", "Predictive Modeling Export")}
              </span>
              <button
                onClick={exportFilteredCsv}
                className="mt-2 w-full py-2.5 px-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-xs"
              >
                <Download className="w-4 h-4" />
                {t("Descargar CSV Estandarizado", "Download Normalized CSV")}
              </button>
            </div>
          </section>
        )}

        {/* ALERTA DE ALTO OXÍGENO (>=30% O2) */}
        {scenario.targetO2Pct >= 30 && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
            <div className="text-xs text-red-950 leading-relaxed">
              <strong className="font-bold uppercase text-red-800 mr-1.5">
                {t(
                  `[Alerta de Atmósfera Lunar / Exploración — O₂ = ${scenario.targetO2Pct}%]:`,
                  `[Lunar / Exploration Atmosphere Alert — O₂ = ${scenario.targetO2Pct}%]:`
                )}
              </strong>
              {t(
                `En los 746 ensayos normalizados de las 5 bases analizadas, 0 de las 144 pruebas de sólidos (BASS-II en el MSG y SAFFIRE-II en Cygnus) superan el 22.2% de O₂ debido a los límites de atmósfera nominal de la ISS. En esta muestra, solo los experimentos en la cámara sellada CIR (FLEX-2 en gotas líquidas hasta 30% O₂ y ACME CFI-G en gases hasta 85% O₂) cubren este régimen oxidante.`,
                `Across the 746 normalized runs from the 5 analyzed PSI datasets, 0 of the 144 solid fuel tests (BASS-II in MSG and SAFFIRE-II in Cygnus) exceed 22.2% O₂ due to nominal ISS cabin constraints. Only sealed CIR chamber studies (FLEX-2 in liquids up to 30% O₂ and ACME CFI-G in gases up to 85% O₂) cover this oxidizing regime.`
              )}
            </div>
          </div>
        )}

        {/* SECCIÓN CENTRAL: RANKING + GRÁFICO & COPILOTO */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* COLUMNA IZQUIERDA: RANKING MULTICRITERIO */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-700" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  {t(
                    "2. Ranking de Investigaciones PSI (Clic para Comparar)",
                    "2. PSI Investigation Ranking (Click to Compare)"
                  )}
                </h2>
              </div>
              <span className="text-xs font-semibold text-slate-600">
                {selectedIds.length} / 5 {t("seleccionadas", "selected")}
              </span>
            </div>

            {ranked.map((inv, index) => {
              const isSelected = selectedIds.includes(inv.id);
              return (
                <div
                  key={inv.id}
                  onClick={() => toggleCompare(inv.id)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer shadow-2xs ${
                    isSelected
                      ? "bg-blue-50/50 border-blue-600 ring-1 ring-blue-600/30"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[inv.id] }}
                      />
                      <span className="font-mono text-xs font-extrabold text-blue-800">
                        #{index + 1}
                      </span>
                      <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-800">
                        {inv.id}
                      </span>
                      <h3 className="font-extrabold text-slate-900 text-sm">{inv.acronym}</h3>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {inv.fuel_phase}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-extrabold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                        {inv.score}/100
                      </span>
                      <CheckSquare
                        className={`w-4 h-4 ${
                          isSelected ? "text-blue-700" : "text-slate-400"
                        }`}
                      />
                    </div>
                  </div>

                  {/* Desglose transparente de puntos */}
                  <div className="grid grid-cols-5 gap-1 mt-2 font-mono text-[10px] font-semibold text-slate-600 bg-slate-100 p-1.5 rounded-md border border-slate-200">
                    <div>Pilar:{inv.breakdown.pillar}/30</div>
                    <div>Fase:{inv.breakdown.phase}/25</div>
                    <div>O₂:{inv.breakdown.o2}/25</div>
                    <div>Pres:{inv.breakdown.pressure}/10</div>
                    <div>Flujo:{inv.breakdown.flowAndGravity}/10</div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed mt-2">
                    {mode === "student" ? inv.student_summary : inv.technical_insight}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-1 mt-2 pt-2 border-t border-slate-200 font-mono text-[10px] text-slate-600">
                    <span className="font-semibold">DOI: {inv.doi}</span>
                    <span>
                      O₂: {inv.stats.o2_min_pct}–{inv.stats.o2_max_pct}% | P:{" "}
                      {inv.stats.pressure_psi_min}–{inv.stats.pressure_psi_max} psi (N=
                      {inv.stats.total_runs})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* COLUMNA DERECHA: GRÁFICO + COPILOTO */}
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    {t(
                      "3. Mapa de Cobertura Experimental (746 Ensayos Reales del PSI)",
                      "3. Experimental Coverage Map (746 Real PSI Runs)"
                    )}
                  </h2>
                  <p className="text-xs text-slate-600">
                    {yAxisMetric === "pressure"
                      ? t(
                          "Oxígeno (% O₂) vs. Presión (psi) • Recuadro Rojo = Atmósfera Base Lunar / Rover (≥30% O₂, ≤10.2 psi)",
                          "Oxygen (% O₂) vs. Pressure (psi) • Red Box = Lunar Base / Rover Atmosphere (≥30% O₂, ≤10.2 psi)"
                        )
                      : t(
                          "Oxígeno (% O₂) vs. Tiempo de Quemado / Duración de Prueba (segundos)",
                          "Oxygen (% O₂) vs. Burn / Test Duration (seconds)"
                        )}
                  </p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
                  <button
                    onClick={() => setYAxisMetric("pressure")}
                    className={`px-2.5 py-1 rounded-md transition ${
                      yAxisMetric === "pressure"
                        ? "bg-white text-blue-800 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {t("Eje Y: Presión (psi)", "Y-Axis: Pressure (psi)")}
                  </button>
                  <button
                    onClick={() => setYAxisMetric("burntime")}
                    className={`px-2.5 py-1 rounded-md transition ${
                      yAxisMetric === "burntime"
                        ? "bg-white text-blue-800 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {t("Eje Y: Tiempo Quemado (s)", "Y-Axis: Burn Time (s)")}
                  </button>
                </div>
              </div>

              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 28, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      type="number"
                      dataKey="plotO2"
                      name="O₂"
                      unit="%"
                      domain={xDomain}
                      stroke="#334155"
                      tick={{ fontSize: 11, fill: "#334155" }}
                      label={{
                        value: t(
                          "Concentración de Oxígeno (% vol O₂)",
                          "Oxygen Concentration (% vol O₂)"
                        ),
                        position: "insideBottom",
                        offset: -18,
                        fill: "#1e293b",
                        fontSize: 11,
                      }}
                    />
                    <YAxis
                      type="number"
                      dataKey="plotY"
                      name={yAxisMetric === "pressure" ? "Pressure" : "Burn Time"}
                      unit={yAxisMetric === "pressure" ? " psi" : " s"}
                      domain={yDomain}
                      stroke="#334155"
                      tick={{ fontSize: 11, fill: "#334155" }}
                      label={{
                        value:
                          yAxisMetric === "pressure"
                            ? t("Presión (psi)", "Pressure (psi)")
                            : t("Tiempo de Quemado (s)", "Burn Time (s)"),
                        angle: -90,
                        position: "insideLeft",
                        fill: "#1e293b",
                        fontSize: 11,
                      }}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      content={(props) => {
                        const d = props?.payload?.[0]?.payload as ExperimentalRun | undefined;
                        if (!props?.active || !d) return null;
                        return (
                          <div className="bg-white border border-slate-300 p-2.5 rounded-lg text-xs shadow-lg text-slate-900">
                            <p className="font-bold text-blue-800">
                              {d.investigation_acronym} ({d.run_id})
                            </p>
                            <p className="text-slate-700">
                              {t("Muestra:", "Sample:")} {d.fuel} [{d.fuel_phase}]
                            </p>
                            <p className="font-mono font-semibold text-slate-900">
                              O₂: {d.o2_pct}% | P: {d.pressure_psi} psi
                              {d.burn_time_s !== null ? ` | t: ${d.burn_time_s}s` : ""}
                            </p>
                            <p className="text-slate-600">
                              {t("Flujo:", "Flow:")} {d.airflow_raw} | {d.outcome}
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={28}
                      wrapperStyle={{ fontSize: "11px" }}
                    />

                    {yAxisMetric === "pressure" && (
                      <>
                        <ReferenceArea
                          x1={30}
                          x2={86}
                          y1={4.3}
                          y2={10.5}
                          fill="#dc2626"
                          fillOpacity={0.12}
                          stroke="#dc2626"
                          strokeDasharray="4 4"
                        />
                        <ReferenceDot
                          x={scenario.targetO2Pct}
                          y={scenario.targetPressurePsi}
                          r={7}
                          fill="#eab308"
                          stroke="#0f172a"
                          strokeWidth={2}
                        />
                      </>
                    )}

                    {investigations.map((inv) => (
                      <Scatter
                        key={inv.id}
                        name={`${inv.acronym} (${inv.fuel_phase})`}
                        data={chartGroups[inv.id] || []}
                        fill={COLORS[inv.id]}
                      />
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ASISTENTE CIENTÍFICO SI */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  {t(
                    "4. Asistente de Interpretación Científica (Basado en Datos PSI + NTRS)",
                    "4. Scientific Interpretation Assistant (Grounded in PSI + NTRS Data)"
                  )}
                </h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {mode === "student"
                    ? t("Respuesta: Didáctica", "Mode: Educational")
                    : t("Respuesta: Técnica", "Mode: Technical")}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {quickPrompts.map((qp, idx) => (
                  <button
                    key={idx}
                    onClick={() => askCopilot(qp)}
                    className="text-left text-xs px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 font-medium transition"
                  >
                    → {qp}
                  </button>
                ))}
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 max-h-60 overflow-y-auto space-y-2.5 mb-3">
                {chatHistory.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    {t(
                      "Haz clic en una de las preguntas sugeridas arriba o escribe tu consulta sobre los experimentos de la NASA.",
                      "Click one of the suggested questions above or type your query about the NASA experiments."
                    )}
                  </p>
                ) : (
                  chatHistory.map((msg, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg text-xs whitespace-pre-line leading-relaxed ${
                        msg.role === "user"
                          ? "bg-blue-700 text-white ml-8 font-medium"
                          : "bg-white border border-slate-200 text-slate-800 mr-2 shadow-2xs"
                      }`}
                    >
                      <div
                        className={`font-bold text-[10px] uppercase mb-1 ${
                          msg.role === "user" ? "text-blue-100" : "text-slate-500"
                        }`}
                      >
                        {msg.role === "user"
                          ? t("Tu Consulta", "Your Query")
                          : `${t("Síntesis Científica", "Scientific Synthesis")} (${
                              msg.source || "PSI"
                            })`}
                      </div>
                      {msg.text}
                    </div>
                  ))
                )}
                {chatLoading && (
                  <p className="text-xs font-semibold text-blue-700 animate-pulse">
                    {t(
                      "Consultando datos experimentales PSI y reportes NTRS...",
                      "Querying PSI experimental data & NTRS reports..."
                    )}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && askCopilot()}
                  placeholder={t(
                    "Escribe tu pregunta sobre materiales, oxígeno, humo o gravedad lunar...",
                    "Ask about materials, oxygen, smoke detection, or lunar gravity..."
                  )}
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                />
                <button
                  onClick={() => askCopilot()}
                  disabled={chatLoading}
                  className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  {t("Consultar", "Ask")}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* MATRIZ DE COMPARACIÓN LADO A LADO */}
        <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs overflow-x-auto">
          <div className="flex flex-wrap items-center justify-between mb-3 pb-2 border-b border-slate-200">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              {t(
                "5. Matriz Comparativa Estandarizada (Objetivos, Variables, Sensores y Aplicaciones)",
                "5. Standardized Comparison Matrix (Objectives, Variables, Sensors & Spin-offs)"
              )}
            </h2>
            <span className="text-xs text-slate-500">
              {t(
                "Haz clic en las tarjetas del ranking para activar o desactivar columnas",
                "Click ranking cards to toggle columns"
              )}
            </span>
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                <th className="py-2.5 px-3 w-44 font-bold">{t("Atributo", "Attribute")}</th>
                {comparedStudies.map((inv) => (
                  <th key={inv.id} className="py-2.5 px-3 min-w-[230px] text-slate-900 font-extrabold">
                    {inv.acronym} ({inv.id}) — DOI: {inv.doi}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              <tr>
                <td className="py-2.5 px-3 font-bold text-slate-900 bg-slate-50/60">
                  {t("Objetivo Experimental", "Experimental Objective")}
                </td>
                {comparedStudies.map((inv) => (
                  <td key={inv.id} className="py-2.5 px-3 leading-relaxed">
                    {inv.objectives}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-slate-900 bg-slate-50/60">
                  {t("Rango Real (O₂ / Presión)", "Real Envelope (O₂ / Pressure)")}
                </td>
                {comparedStudies.map((inv) => (
                  <td key={inv.id} className="py-2.5 px-3 font-mono font-bold text-blue-800">
                    O₂: {inv.stats.o2_min_pct}–{inv.stats.o2_max_pct}% | P:{" "}
                    {inv.stats.pressure_psi_min}–{inv.stats.pressure_psi_max} psi (N=
                    {inv.stats.total_runs})
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-slate-900 bg-slate-50/60">
                  {t("Hardware en la ISS / Nave", "ISS / Spacecraft Hardware")}
                </td>
                {comparedStudies.map((inv) => (
                  <td key={inv.id} className="py-2.5 px-3">
                    {inv.hardware}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-slate-900 bg-slate-50/60">
                  {t("Variables Modificadas", "Variables Changed")}
                </td>
                {comparedStudies.map((inv) => (
                  <td key={inv.id} className="py-2.5 px-3">
                    {inv.variables_changed.join(" • ")}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-slate-900 bg-slate-50/60">
                  {t("Variables Constantes", "Variables Held Constant")}
                </td>
                {comparedStudies.map((inv) => (
                  <td key={inv.id} className="py-2.5 px-3">
                    {inv.variables_constant.join(" • ")}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-slate-900 bg-slate-50/60">
                  {t("Sensores y Mediciones", "Sensors & Measurements")}
                </td>
                {comparedStudies.map((inv) => (
                  <td key={inv.id} className="py-2.5 px-3">
                    {inv.sensors.join(", ")}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-slate-900 bg-slate-50/60">
                  {t("Gravedad Parcial (Luna/Marte)", "Partial-Gravity Bounding")}
                </td>
                {comparedStudies.map((inv) => (
                  <td key={inv.id} className="py-2.5 px-3 text-blue-900 bg-blue-50/40 leading-relaxed">
                    {inv.lunar_partial_g_note}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-slate-900 bg-slate-50/60">
                  {t("Aplicación en la Tierra", "Application on Earth")}
                </td>
                {comparedStudies.map((inv) => (
                  <td key={inv.id} className="py-2.5 px-3 text-emerald-900 bg-emerald-50/40 leading-relaxed">
                    {inv.earth_spinoff}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </section>

        {/* LITERATURA CIENTÍFICA NTRS */}
        <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between mb-3 pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-700" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                {t(
                  `6. Reportes Técnicos Oficiales de la NASA Vinculados a #1 (${ranked[0]?.acronym})`,
                  `6. Official NASA Technical Reports Linked to #1 (${ranked[0]?.acronym})`
                )}
              </h2>
            </div>
            <span className="text-xs text-slate-500">
              Fuente: NASA Technical Reports Server (ntrs.nasa.gov)
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {contextualPapers.map((p) => (
              <div
                key={p.ntrs_id}
                className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900">
                    {p.topic_tag} • {p.center || "NASA"}
                  </span>
                  <h3 className="text-xs font-bold text-slate-900 mt-2 line-clamp-2">
                    {p.title}
                  </h3>
                  <p className="text-[11px] text-slate-600 mt-1 line-clamp-3">
                    {p.abstract}
                  </p>
                </div>
                <div className="flex items-center gap-3 mt-3 pt-2 border-t border-slate-200 text-xs font-semibold">
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-700 hover:underline flex items-center gap-1"
                  >
                    Cita NTRS <ExternalLink className="w-3 h-3" />
                  </a>
                  {p.pdf_url && (
                    <a
                      href={p.pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      PDF Oficial <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}