"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
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
  Table2,
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

// Cores sóbrias usadas apenas nos pontos do gráfico científico
const CHART_COLORS: Record<string, string> = {
  "PSI-25": "#0284c7",
  "PSI-99": "#7c3aed",
  "PSI-101": "#059669",
  "PSI-68": "#d97706",
  "PSI-159": "#dc2626",
};

const TOPIC_MAP: Record<string, string[]> = {
  "PSI-25": ["BASS", "LUNAR_SAFETY"],
  "PSI-99": ["SAFFIRE", "LUNAR_SAFETY"],
  "PSI-101": ["SAME_DAFT", "LUNAR_SAFETY"],
  "PSI-68": ["FLEX", "LUNAR_SAFETY"],
  "PSI-159": ["ACME", "LUNAR_SAFETY"],
};

/**
 * Fundo Espacial Sutil:
 * Estrelas delicadas e pequenas chamas que mudam de brilho suavemente com o scroll,
 * sem ofuscar nem competir com o texto dos cards.
 */
function CosmicFlamesCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let scrollY = window.scrollY;
    let scrollBoost = 0;
    let lastScrollY = window.scrollY;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleScroll = () => {
      scrollY = window.scrollY;
      const delta = Math.abs(scrollY - lastScrollY);
      scrollBoost = Math.min(1.0, scrollBoost + delta * 0.015);
      lastScrollY = scrollY;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, { passive: true });

    const stars = Array.from({ length: 110 }, (_, i) => ({
      x: ((i * 197) % 1000) / 1000,
      y: ((i * 353) % 1000) / 1000,
      r: 0.6 + (i % 3) * 0.45,
      phase: i * 0.9,
      speed: 0.012 + (i % 5) * 0.004,
    }));

    const flames = Array.from({ length: 24 }, (_, i) => ({
      x: ((i * 263 + 47) % 1000) / 1000,
      y: ((i * 419 + 83) % 1000) / 1000,
      size: 3.0 + (i % 3) * 1.4,
      isBlue: i % 3 === 0,
      phase: i * 1.3,
      drift: 0.12 + (i % 4) * 0.05,
    }));

    let tick = 0;
    const render = () => {
      tick += 1;
      scrollBoost *= 0.92;

      ctx.fillStyle = "#080b12";
      ctx.fillRect(0, 0, width, height);

      const scrollRatio = Math.min(1, scrollY / 1000);

      for (const s of stars) {
        const sx = s.x * width;
        const sy = (s.y * height - scrollY * 0.08 + height * 10) % height;
        const wave = Math.sin(tick * s.speed + s.phase + scrollY * 0.01);
        const alpha = Math.min(
          0.75,
          Math.max(0.12, 0.3 + wave * 0.2 + scrollBoost * 0.25 + scrollRatio * 0.1)
        );

        ctx.beginPath();
        ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226, 232, 240, ${alpha})`;
        ctx.fill();
      }

      for (const f of flames) {
        const fx =
          f.x * width + Math.sin(tick * 0.015 + f.phase + scrollY * 0.003) * 8;
        const fy =
          (f.y * height - scrollY * (0.18 + f.drift) - tick * 0.18 + height * 20) %
          height;

        const pulse =
          0.65 +
          Math.sin(tick * 0.04 + f.phase + scrollY * 0.015) * 0.2 +
          scrollBoost * 0.45 +
          scrollRatio * 0.2;
        const radius = f.size * pulse;

        const glow = ctx.createRadialGradient(fx, fy, 0.5, fx, fy, radius * 2.4);
        if (f.isBlue) {
          glow.addColorStop(0, `rgba(125, 211, 252, ${Math.min(0.55, 0.28 * pulse)})`);
          glow.addColorStop(0.5, `rgba(56, 189, 248, ${Math.min(0.25, 0.12 * pulse)})`);
          glow.addColorStop(1, "rgba(14, 165, 233, 0)");
        } else {
          glow.addColorStop(0, `rgba(253, 224, 71, ${Math.min(0.6, 0.32 * pulse)})`);
          glow.addColorStop(0.5, `rgba(245, 158, 11, ${Math.min(0.28, 0.14 * pulse)})`);
          glow.addColorStop(1, "rgba(245, 158, 11, 0)");
        }
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(fx, fy, radius * 2.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(fx, fy);
        ctx.beginPath();
        ctx.moveTo(0, -radius * 1.3);
        ctx.quadraticCurveTo(radius * 0.8, 0, 0, radius * 0.8);
        ctx.quadraticCurveTo(-radius * 0.8, 0, 0, -radius * 1.3);
        ctx.fillStyle = f.isBlue
          ? `rgba(186, 230, 253, ${Math.min(0.7, 0.45 * pulse)})`
          : `rgba(254, 215, 170, ${Math.min(0.75, 0.5 * pulse)})`;
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
    />
  );
}

export default function FlameInFreefallDashboard() {
  const investigations = investigationsRaw as Investigation[];
  const allRuns = runsRaw as ExperimentalRun[];
  const ntrsPapers = ntrsRaw as NtrsPaper[];

  const [lang, setLang] = useState<AppLang>("es");
  const [mode, setMode] = useState<AudienceMode>("engineer");
  const [scenario, setScenario] = useState<MissionScenario>(MISSION_PRESETS[0]);
  const [selectedIds, setSelectedIds] = useState<string[]>(["PSI-25", "PSI-99", "PSI-68"]);
  const [yAxisMetric, setYAxisMetric] = useState<"pressure" | "burntime">("pressure");
  const [bottomTab, setBottomTab] = useState<"matrix" | "ntrs">("matrix");

  const [question, setQuestion] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<
    Array<{ role: "user" | "si"; text: string; source?: string }>
  >([]);

  const t = (es: string, en: string) => (lang === "es" ? es : en);
  const isStudent = mode === "student";

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
    return prioritized;
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

  const quickPrompts = isStudent
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

  // Classes utilitárias para manter consistência limpa e sem poluição
  const surfaceClass = isStudent
    ? "bg-[#0d121f]/95 border border-slate-800 text-slate-100"
    : "bg-white border border-slate-200 text-slate-900";

  return (
    <div
      className={`min-h-screen font-sans pb-20 relative ${
        isStudent ? "bg-[#080b12] text-slate-100" : "bg-[#f8fafc] text-slate-900"
      }`}
    >
      {/* FUNDO SUTIL DE ESTRELAS E CHAMITAS QUE REAGEM AO SCROLL */}
      {isStudent && <CosmicFlamesCanvas />}

      {/* HEADER LIMPO E EDITORIAL (SEM CAIXAS COLORIDAS BERRANTES) */}
      <header
        className={`sticky top-0 z-30 border-b ${
          isStudent
            ? "bg-[#080b12]/95 backdrop-blur border-slate-800"
            : "bg-white/95 backdrop-blur border-slate-200"
        }`}
      >
        <div className="max-w-[1380px] mx-auto px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-baseline gap-2.5">
              <h1 className="text-base md:text-lg font-semibold tracking-tight">
                {t(
                  "Flame in Freefall — Seguridad contra Incendios en Microgravedad",
                  "Flame in Freefall — Microgravity Fire Safety Explorer"
                )}
              </h1>
              <span
                className={`text-xs ${
                  isStudent ? "text-slate-400" : "text-slate-500"
                }`}
              >
                NASA PSI (746 runs) & NTRS (28 studies)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`flex border ${
                isStudent ? "border-slate-800 bg-[#0d121f]" : "border-slate-200 bg-slate-100"
              }`}
            >
              <button
                onClick={() => setMode("engineer")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium transition rounded-none ${
                  !isStudent
                    ? "bg-slate-900 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                {t("Vista Ingeniero", "Engineer View")}
              </button>
              <button
                onClick={() => setMode("student")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium transition rounded-none ${
                  isStudent
                    ? "bg-slate-800 text-amber-300 border-l border-slate-700"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                {t("Vista Estudiante / Público", "Student / Public View")}
              </button>
            </div>

            <button
              onClick={() => setLang(lang === "es" ? "en" : "es")}
              className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-medium rounded-none transition ${
                isStudent
                  ? "border-slate-800 bg-[#0d121f] text-slate-300 hover:bg-slate-800"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Globe2 className="w-3.5 h-3.5" />
              {lang === "es" ? "ES 🇲🇽 / EN 🇺🇸" : "EN 🇺🇸 / ES 🇲🇽"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1380px] mx-auto px-5 pt-5 space-y-5 relative z-10">
        {/* =====================================================================
            FAIXA 1: CONTROLES DO CENÁRIO (DESIGN LIMPO E MONOCROMÁTICO)
           ===================================================================== */}
        <section className={`${surfaceClass} rounded-none`}>
          <div
            className={`flex flex-wrap items-center justify-between border-b px-4 py-2.5 gap-2 ${
              isStudent ? "border-slate-800/80" : "border-slate-200"
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-medium">
              <Sliders className="w-3.5 h-3.5 opacity-70" />
              <span>
                {t("Escenario de Misión:", "Mission Scenario:")}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MISSION_PRESETS.map((preset) => {
                const active = scenario.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => setScenario(preset)}
                    className={`px-3 py-1 text-xs font-medium border rounded-none transition ${
                      active
                        ? isStudent
                          ? "bg-slate-800 text-amber-300 border-slate-600"
                          : "bg-slate-900 text-white border-slate-900"
                        : isStudent
                        ? "bg-transparent text-slate-400 border-slate-800 hover:text-slate-200"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {lang === "es" ? preset.name : preset.name_en}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className={`grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x ${
              isStudent ? "divide-slate-800/80" : "divide-slate-200"
            }`}
          >
            <div className="p-3.5">
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-xs opacity-75">
                  {t("Oxígeno (O₂)", "Oxygen (O₂)")}
                </span>
                <span className="font-mono text-sm font-semibold">
                  {scenario.targetO2Pct}%
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
                className="w-full cursor-pointer accent-amber-500 h-1"
              />
              <div className="flex justify-between text-[10px] opacity-50 mt-1">
                <span>12%</span>
                <span>21% ISS</span>
                <span>34% Luna</span>
                <span>85%</span>
              </div>
            </div>

            <div className="p-3.5">
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-xs opacity-75">
                  {t("Presión de Cabina", "Cabin Pressure")}
                </span>
                <span className="font-mono text-sm font-semibold">
                  {scenario.targetPressurePsi} psi
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
                className="w-full cursor-pointer accent-amber-500 h-1"
              />
              <div className="flex justify-between text-[10px] opacity-50 mt-1">
                <span>4.3 EVA</span>
                <span>10.2 Luna</span>
                <span>14.7 Tierra</span>
              </div>
            </div>

            <div className="p-3.5">
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-xs opacity-75">
                  {t("Flujo de Aire", "Airflow Speed")}
                </span>
                <span className="font-mono text-sm font-semibold">
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
                className="w-full cursor-pointer accent-amber-500 h-1"
              />
              <div className="flex justify-between text-[10px] opacity-50 mt-1">
                <span>0 cm/s</span>
                <span>20 cm/s</span>
                <span>40 cm/s</span>
              </div>
            </div>

            <div className="p-3.5">
              <label className="block text-xs opacity-75 mb-1.5">
                {t("Objetivo de Seguridad", "Safety Objective")}
              </label>
              <select
                value={scenario.pillar}
                onChange={(e) =>
                  setScenario({
                    ...scenario,
                    pillar: e.target.value as MissionScenario["pillar"],
                  })
                }
                className={`w-full border px-2.5 py-1 text-xs rounded-none ${
                  isStudent
                    ? "bg-[#080b12] border-slate-700 text-slate-200"
                    : "bg-slate-50 border-slate-300 text-slate-800"
                }`}
              >
                <option value="All">{t("Todos los pilares", "All pillars")}</option>
                <option value="Prevention">{t("Prevención", "Prevention")}</option>
                <option value="Detection">{t("Detección", "Detection")}</option>
                <option value="Suppression">{t("Supresión", "Suppression")}</option>
              </select>
            </div>

            <div className="p-3.5">
              <label className="block text-xs opacity-75 mb-1.5">
                {t("Fase del Material", "Fuel Phase")}
              </label>
              <select
                value={scenario.fuelPhase}
                onChange={(e) =>
                  setScenario({
                    ...scenario,
                    fuelPhase: e.target.value as MissionScenario["fuelPhase"],
                  })
                }
                className={`w-full border px-2.5 py-1 text-xs rounded-none ${
                  isStudent
                    ? "bg-[#080b12] border-slate-700 text-slate-200"
                    : "bg-slate-50 border-slate-300 text-slate-800"
                }`}
              >
                <option value="All">{t("Todas las fases", "All phases")}</option>
                <option value="Solid">{t("Sólido (Telas/Plásticos)", "Solid")}</option>
                <option value="Liquid">{t("Líquido (Gotas)", "Liquid")}</option>
                <option value="Gas">{t("Gaseoso", "Gas")}</option>
                <option value="Aerosol/Smoke">{t("Humo / Aerosol", "Aerosol/Smoke")}</option>
              </select>
            </div>
          </div>
        </section>

        {/* ALERTA DISCRETO E LEGÍVEL DE ATMOSFERA LUNAR */}
        {scenario.targetO2Pct >= 30 && (
          <div
            className={`border-l-2 border-amber-500 p-3.5 flex items-start gap-3 rounded-none ${
              isStudent
                ? "bg-[#0d121f]/95 border border-slate-800 text-slate-200"
                : "bg-amber-50/70 border border-amber-200 text-slate-800"
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <strong className="font-semibold mr-1.5">
                {t(
                  `Nota de Atmósfera Lunar (${scenario.targetO2Pct}% O₂):`,
                  `Lunar Atmosphere Note (${scenario.targetO2Pct}% O₂):`
                )}
              </strong>
              {t(
                `En los 746 ensayos analizados, 0 de las 144 pruebas de sólidos (BASS-II y SAFFIRE-II) superan el 22.2% de O₂ por límites de la ISS. Solo los estudios en cámara sellada CIR (FLEX-2 en gotas hasta 30% O₂ y ACME CFI-G en gases hasta 85% O₂) cubren este régimen.`,
                `Across the 746 analyzed runs, 0 of the 144 solid fuel tests (BASS-II and SAFFIRE-II) exceed 22.2% O₂ due to ISS cabin limits. Only sealed CIR chamber studies (FLEX-2 in liquids up to 30% O₂ and ACME CFI-G in gases up to 85% O₂) cover this regime.`
              )}
            </div>
          </div>
        )}

        {/* =====================================================================
            MODO ESTUDIANTE: VISUAL LIMPO E FOCADO NO CONTEÚDO
           ===================================================================== */}
        {isStudent ? (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* SIMULADOR DA CHAMA */}
            <div className={`lg:col-span-6 ${surfaceClass} p-5 rounded-none flex flex-col justify-between`}>
              <div>
                <span className="text-[11px] font-medium text-amber-300/90">
                  {t("Laboratorio Visual de Física", "Visual Physics Lab")}
                </span>
                <h2 className="text-base font-semibold text-white mt-1">
                  {t(
                    "¿Por qué el fuego en el espacio no tiene forma de gota?",
                    "Why doesn't fire in space have a teardrop shape?"
                  )}
                </h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {t(
                    "Compara una llama en la Tierra (1g) frente a tu escenario espacial. Ajusta el oxígeno y el flujo de aire arriba.",
                    "Compare a flame on Earth (1g) against your active space scenario. Adjust oxygen and airflow above."
                  )}
                </p>
              </div>

              <div className="my-4 bg-[#080b12] border border-slate-800/90 p-4 grid grid-cols-2 divide-x divide-slate-800/80 h-52 items-center">
                <div className="flex flex-col items-center">
                  <svg width="90" height="115" viewBox="0 0 90 115">
                    <rect x="38" y="82" width="14" height="26" fill="#475569" />
                    <line x1="45" y1="74" x2="45" y2="82" stroke="#e2e8f0" strokeWidth="2" />
                    <path
                      d="M45 18 C58 43, 62 70, 45 76 C28 70, 32 43, 45 18 Z"
                      fill="#f59e0b"
                    />
                    <path
                      d="M45 40 C52 53, 53 68, 45 74 C37 68, 38 53, 45 40 Z"
                      fill="#fef08a"
                    />
                  </svg>
                  <span className="text-xs text-slate-200 font-medium">
                    {t("Tierra (1g • 21% O₂)", "Earth (1g • 21% O₂)")}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {t("El aire caliente sube", "Hot air rises upward")}
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <svg width="130" height="115" viewBox="0 0 130 115">
                    {scenario.targetAirflowCmS > 0 && (
                      <g stroke="#94a3b8" strokeWidth="1.5" opacity="0.6">
                        <line x1="8" y1="45" x2="32" y2="45" />
                        <line x1="8" y1="65" x2="28" y2="65" />
                      </g>
                    )}
                    <rect x="48" y="82" width="14" height="26" fill="#475569" />
                    <line x1="55" y1="74" x2="55" y2="82" stroke="#e2e8f0" strokeWidth="2" />

                    {scenario.targetAirflowCmS <= 3 ? (
                      <circle
                        cx="55"
                        cy="58"
                        r={scenario.targetO2Pct >= 30 ? 26 : 21}
                        fill={scenario.targetO2Pct >= 30 ? "#60a5fa" : "#3b82f6"}
                        fillOpacity="0.8"
                        stroke="#93c5fd"
                        strokeWidth="1.5"
                      />
                    ) : (
                      <ellipse
                        cx={55 + Math.min(20, scenario.targetAirflowCmS * 0.45)}
                        cy="58"
                        rx={17 + Math.min(22, scenario.targetAirflowCmS * 0.55)}
                        ry={scenario.targetO2Pct >= 30 ? 20 : 15}
                        fill={scenario.targetO2Pct >= 30 ? "#f59e0b" : "#38bdf8"}
                        fillOpacity="0.82"
                        stroke={scenario.targetO2Pct >= 30 ? "#fde68a" : "#bae6fd"}
                        strokeWidth="1.5"
                      />
                    )}
                  </svg>
                  <span className="text-xs text-slate-200 font-medium">
                    {t("Espacio", "Space")} ({scenario.targetO2Pct}% O₂ •{" "}
                    {scenario.targetAirflowCmS} cm/s)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {scenario.targetAirflowCmS <= 3
                      ? t("Esfera azul por difusión", "Blue diffusion sphere")
                      : scenario.targetO2Pct >= 30
                      ? t("Llama rápida rica en O₂", "Fast O₂-enriched flame")
                      : t("Alimentada por ventilación", "Fed by cabin airflow")}
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-[#080b12] border border-slate-800 text-xs text-slate-300 leading-relaxed">
                <strong className="text-white">
                  {t("Explicación física:", "Physical explanation:")}
                </strong>{" "}
                {scenario.targetO2Pct >= 30
                  ? t(
                      `Con ${scenario.targetO2Pct}% de oxígeno (como en la Base Lunar), los materiales prenden mucho más rápido y el flujo de aire (${scenario.targetAirflowCmS} cm/s) estira la llama.`,
                      `At ${scenario.targetO2Pct}% oxygen (like the Lunar Base), materials ignite much faster and airflow (${scenario.targetAirflowCmS} cm/s) stretches the flame.`
                    )
                  : t(
                      `En microgravedad el aire caliente no sube. Sin ventilación (0 cm/s), el fuego forma una esfera azul silenciosa que recibe oxígeno solo por difusión lenta.`,
                      `In microgravity hot air does not rise. Without ventilation (0 cm/s), fire forms a silent blue sphere fed only by slow diffusion.`
                    )}
              </div>
            </div>

            {/* TUTOR CIENTÍFICO LIMPO */}
            <div className={`lg:col-span-6 ${surfaceClass} p-5 rounded-none flex flex-col justify-between`}>
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                  <div>
                    <span className="text-[11px] font-medium text-amber-300/90">
                      {t("Asistente Educativo", "Educational Assistant")}
                    </span>
                    <h2 className="text-base font-semibold text-white">
                      {t("Pregúntale a los datos de la NASA", "Ask the NASA Data")}
                    </h2>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 mb-3">
                  {quickPrompts.map((qp, idx) => (
                    <button
                      key={idx}
                      onClick={() => askCopilot(qp)}
                      className="text-left text-xs px-3 py-2 bg-[#080b12] hover:bg-slate-800/70 border border-slate-800 text-slate-300 transition rounded-none"
                    >
                      {qp}
                    </button>
                  ))}
                </div>

                <div className="bg-[#080b12] border border-slate-800 p-3.5 h-44 overflow-y-auto space-y-2.5 mb-3">
                  {chatHistory.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      {t(
                        "Selecciona una pregunta arriba o escribe tu duda sobre el fuego en el espacio.",
                        "Select a question above or type your question about fire in space."
                      )}
                    </p>
                  ) : (
                    chatHistory.map((msg, i) => (
                      <div
                        key={i}
                        className={`p-3 text-xs whitespace-pre-line leading-relaxed rounded-none ${
                          msg.role === "user"
                            ? "bg-slate-800 text-slate-100 ml-6"
                            : "bg-[#0d121f] border border-slate-800 text-slate-200 mr-2"
                        }`}
                      >
                        {msg.text}
                      </div>
                    ))
                  )}
                  {chatLoading && (
                    <p className="text-xs text-slate-400 animate-pulse">
                      {t("Consultando estudios de la NASA...", "Consulting NASA studies...")}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && askCopilot()}
                  placeholder={t(
                    "Escribe tu pregunta aquí...",
                    "Type your question here..."
                  )}
                  className="flex-1 bg-[#080b12] border border-slate-800 px-3 py-2 text-xs text-white rounded-none focus:outline-none focus:border-slate-600"
                />
                <button
                  onClick={() => askCopilot()}
                  disabled={chatLoading}
                  className="px-4 py-2 bg-slate-100 hover:bg-white text-slate-900 font-medium text-xs flex items-center gap-1.5 rounded-none transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  {t("Preguntar", "Ask")}
                </button>
              </div>
            </div>
          </section>
        ) : (
          /* =====================================================================
             MODO INGENIERO: TELEMETRÍA + GRÁFICO & COPILOTO LIMPOS
             ===================================================================== */
          <>
            <section className="bg-white border border-slate-200 grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200 rounded-none">
              <div className="p-4">
                <span className="text-xs text-slate-500">
                  {t("Ensayos en banda O₂ (±4%)", "Runs in target O₂ band (±4%)")}
                </span>
                <div className="font-mono text-2xl font-semibold text-slate-900 mt-1">
                  {telemetry.inO2Band}{" "}
                  <span className="text-xs font-normal text-slate-400">/ 746</span>
                </div>
              </div>

              <div className="p-4">
                <span className="text-xs text-slate-500">
                  {t("Sólidos probados ≥30% O₂", "Solids tested ≥30% O₂")}
                </span>
                <div className="font-mono text-2xl font-semibold text-red-700 mt-1">
                  {telemetry.solidAbove30} / {telemetry.totalSolid}{" "}
                  <span className="text-xs font-normal text-slate-500">(0.0%)</span>
                </div>
              </div>

              <div className="p-4">
                <span className="text-xs text-slate-500">
                  {t("Acotamiento gravedad parcial", "Partial-gravity bounding")}
                </span>
                <div className="font-mono text-2xl font-semibold text-slate-900 mt-1">
                  0g ↔ 1g
                </div>
              </div>

              <div className="p-4 flex flex-col justify-between">
                <span className="text-xs text-slate-500">
                  {t("Datos para modelado predictivo", "Predictive modeling dataset")}
                </span>
                <button
                  onClick={exportFilteredCsv}
                  className="mt-2 w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center justify-center gap-2 transition rounded-none"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t("Descargar CSV normalizado", "Download normalized CSV")}
                </button>
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-7 bg-white border border-slate-200 p-4 rounded-none">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      {t(
                        "Mapa de Cobertura Experimental (746 ensayos PSI)",
                        "Experimental Coverage Map (746 PSI runs)"
                      )}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {yAxisMetric === "pressure"
                        ? t(
                            "Oxígeno (% O₂) vs. Presión (psi) • Recuadro rojo: Base Lunar / Rover (≥30% O₂, ≤10.2 psi)",
                            "Oxygen (% O₂) vs. Pressure (psi) • Red box: Lunar Base / Rover (≥30% O₂, ≤10.2 psi)"
                          )
                        : t(
                            "Oxígeno (% O₂) vs. Tiempo de quemado (segundos)",
                            "Oxygen (% O₂) vs. Burn time (seconds)"
                          )}
                    </p>
                  </div>

                  <div className="flex border border-slate-200 bg-slate-50 text-xs">
                    <button
                      onClick={() => setYAxisMetric("pressure")}
                      className={`px-3 py-1 rounded-none transition ${
                        yAxisMetric === "pressure"
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {t("Y: Presión (psi)", "Y: Pressure (psi)")}
                    </button>
                    <button
                      onClick={() => setYAxisMetric("burntime")}
                      className={`px-3 py-1 rounded-none transition ${
                        yAxisMetric === "burntime"
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {t("Y: Tiempo (s)", "Y: Burn time (s)")}
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
                        stroke="#475569"
                        tick={{ fontSize: 11, fill: "#475569" }}
                        label={{
                          value: t("Oxígeno (% vol O₂)", "Oxygen (% vol O₂)"),
                          position: "insideBottom",
                          offset: -18,
                          fill: "#475569",
                          fontSize: 11,
                        }}
                      />
                      <YAxis
                        type="number"
                        dataKey="plotY"
                        name={yAxisMetric === "pressure" ? "Pressure" : "Burn Time"}
                        unit={yAxisMetric === "pressure" ? " psi" : " s"}
                        domain={yDomain}
                        stroke="#475569"
                        tick={{ fontSize: 11, fill: "#475569" }}
                        label={{
                          value:
                            yAxisMetric === "pressure"
                              ? t("Presión (psi)", "Pressure (psi)")
                              : t("Tiempo (s)", "Time (s)"),
                          angle: -90,
                          position: "insideLeft",
                          fill: "#475569",
                          fontSize: 11,
                        }}
                      />
                      <Tooltip
                        cursor={{ strokeDasharray: "3 3" }}
                        content={(props) => {
                          const d = props?.payload?.[0]?.payload as ExperimentalRun | undefined;
                          if (!props?.active || !d) return null;
                          return (
                            <div className="bg-slate-900 text-white p-2.5 rounded-none text-xs shadow-md">
                              <p className="font-semibold">
                                {d.investigation_acronym} ({d.run_id})
                              </p>
                              <p className="text-slate-300">
                                {d.fuel} [{d.fuel_phase}]
                              </p>
                              <p className="font-mono text-amber-300 mt-0.5">
                                O₂: {d.o2_pct}% | P: {d.pressure_psi} psi
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
                            fillOpacity={0.1}
                            stroke="#dc2626"
                            strokeDasharray="4 4"
                          />
                          <ReferenceDot
                            x={scenario.targetO2Pct}
                            y={scenario.targetPressurePsi}
                            r={6}
                            fill="#f59e0b"
                            stroke="#0f172a"
                            strokeWidth={1.5}
                          />
                        </>
                      )}

                      {investigations.map((inv) => (
                        <Scatter
                          key={inv.id}
                          name={`${inv.acronym} (${inv.fuel_phase})`}
                          data={chartGroups[inv.id] || []}
                          fill={CHART_COLORS[inv.id]}
                        />
                      ))}
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="lg:col-span-5 bg-white border border-slate-200 p-4 rounded-none flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                    <h2 className="text-sm font-semibold text-slate-900">
                      {t(
                        "Asistente de Interpretación Científica",
                        "Scientific Interpretation Assistant"
                      )}
                    </h2>
                    <span className="text-[11px] text-slate-500">PSI + NTRS</span>
                  </div>

                  <div className="flex flex-col gap-1.5 mb-3">
                    {quickPrompts.map((qp, idx) => (
                      <button
                        key={idx}
                        onClick={() => askCopilot(qp)}
                        className="text-left text-xs px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition rounded-none"
                      >
                        {qp}
                      </button>
                    ))}
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-3 h-48 overflow-y-auto space-y-2.5 mb-3">
                    {chatHistory.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        {t(
                          "Selecciona una consulta arriba o escribe una pregunta sobre las 5 investigaciones.",
                          "Select a prompt above or type a question about the 5 investigations."
                        )}
                      </p>
                    ) : (
                      chatHistory.map((msg, i) => (
                        <div
                          key={i}
                          className={`p-2.5 text-xs whitespace-pre-line leading-relaxed rounded-none ${
                            msg.role === "user"
                              ? "bg-slate-900 text-white ml-6"
                              : "bg-white border border-slate-200 text-slate-800 mr-2"
                          }`}
                        >
                          {msg.text}
                        </div>
                      ))
                    )}
                    {chatLoading && (
                      <p className="text-xs text-slate-500 animate-pulse">
                        {t("Procesando datos...", "Processing data...")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && askCopilot()}
                    placeholder={t(
                      "Escribe tu consulta técnica...",
                      "Type your technical query..."
                    )}
                    className="flex-1 bg-white border border-slate-300 px-3 py-2 text-xs text-slate-900 rounded-none focus:outline-none focus:border-slate-600"
                  />
                  <button
                    onClick={() => askCopilot()}
                    disabled={chatLoading}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs flex items-center gap-1.5 rounded-none transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {t("Consultar", "Ask")}
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {/* =====================================================================
            FAIXA 3: OS 5 CARDS EM GRADE HORIZONTAL LIMPA (SEM CAIXAS COLORIDAS)
           ===================================================================== */}
        <section>
          <div
            className={`flex flex-wrap items-center justify-between pb-2.5 mb-3 border-b ${
              isStudent ? "border-slate-800" : "border-slate-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 opacity-70" />
              <h2 className="text-sm font-semibold">
                {t(
                  " Investigaciones PSI Clasificadas por Relevancia (Clic para comparar)",
                  " PSI Investigations Ranked by Relevance (Click to compare)"
                )}
              </h2>
            </div>
            <span className="text-xs opacity-60">
              {selectedIds.length} / 5 {t("seleccionadas", "selected")}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
            {ranked.map((inv, index) => {
              const isSelected = selectedIds.includes(inv.id);
              return (
                <div
                  key={inv.id}
                  onClick={() => toggleCompare(inv.id)}
                  className={`border p-4 flex flex-col justify-between cursor-pointer transition rounded-none ${
                    isStudent
                      ? isSelected
                        ? "bg-[#0d121f]/95 border-slate-500"
                        : "bg-[#0d121f]/90 border-slate-800/90 hover:border-slate-700"
                      : isSelected
                      ? "bg-white border-slate-900 shadow-2xs"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="text-sm font-semibold">
                        #{index + 1} • {inv.acronym}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs opacity-75">
                          {inv.score}/100
                        </span>
                        <CheckSquare
                          className={`w-3.5 h-3.5 ${
                            isSelected ? "opacity-100" : "opacity-25"
                          }`}
                        />
                      </div>
                    </div>

                    <div
                      className={`text-[11px] mb-3 pb-2 border-b ${
                        isStudent
                          ? "text-slate-400 border-slate-800/80"
                          : "text-slate-500 border-slate-100"
                      }`}
                    >
                      {inv.id} • {inv.fuel_phase} • {inv.stats.total_runs} runs
                    </div>

                    <p
                      className={`text-xs leading-relaxed mb-4 ${
                        isStudent ? "text-slate-300" : "text-slate-600"
                      }`}
                    >
                      {isStudent ? inv.student_summary : inv.technical_insight}
                    </p>
                  </div>

                  <div
                    className={`border-t pt-2.5 text-[11px] leading-relaxed ${
                      isStudent
                        ? "border-slate-800/80 text-slate-400"
                        : "border-slate-100 text-slate-500"
                    }`}
                  >
                    {isStudent ? (
                      <div>
                        <strong
                          className={`block mb-0.5 ${
                            isStudent ? "text-slate-200" : "text-slate-700"
                          }`}
                        >
                          {t("Aplicación en la Tierra:", "On Earth:")}
                        </strong>
                        {inv.earth_spinoff}
                      </div>
                    ) : (
                      <div className="font-mono text-[10px] space-y-0.5">
                        <div>
                          O₂: {inv.stats.o2_min_pct}–{inv.stats.o2_max_pct}% | P:{" "}
                          {inv.stats.pressure_psi_min}–{inv.stats.pressure_psi_max} psi
                        </div>
                        <div className="truncate">DOI: {inv.doi}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* =====================================================================
            FAIXA 4: MATRIZ COMPARATIVA E LITERATURA NTRS (DESIGN LIMPO)
           ===================================================================== */}
        <section className={`${surfaceClass} rounded-none`}>
          <div
            className={`flex border-b ${
              isStudent ? "border-slate-800" : "border-slate-200"
            }`}
          >
            <button
              onClick={() => setBottomTab("matrix")}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-medium rounded-none border-b-2 transition ${
                bottomTab === "matrix"
                  ? isStudent
                    ? "border-amber-400 text-white"
                    : "border-slate-900 text-slate-900"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              {t(
                `Matriz Comparativa (${comparedStudies.length})`,
                `Comparison Matrix (${comparedStudies.length})`
              )}
            </button>
            <button
              onClick={() => setBottomTab("ntrs")}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-medium rounded-none border-b-2 transition ${
                bottomTab === "ntrs"
                  ? isStudent
                    ? "border-amber-400 text-white"
                    : "border-slate-900 text-slate-900"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              {t(
                `Reportes Oficiales NASA NTRS (${ntrsPapers.length})`,
                `Official NASA NTRS Reports (${ntrsPapers.length})`
              )}
            </button>
          </div>

          {bottomTab === "matrix" ? (
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr
                    className={`border-b ${
                      isStudent
                        ? "border-slate-800 text-slate-300"
                        : "border-slate-200 text-slate-700"
                    }`}
                  >
                    <th className="py-2.5 px-3 w-44 font-semibold">
                      {t("Atributo", "Attribute")}
                    </th>
                    {comparedStudies.map((inv) => (
                      <th key={inv.id} className="py-2.5 px-3 min-w-[230px] font-semibold">
                        {inv.acronym} ({inv.id})
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody
                  className={`divide-y ${
                    isStudent
                      ? "divide-slate-800/70 text-slate-300"
                      : "divide-slate-200 text-slate-600"
                  }`}
                >
                  <tr>
                    <td className="py-2.5 px-3 font-medium">
                      {t("Objetivo", "Objective")}
                    </td>
                    {comparedStudies.map((inv) => (
                      <td key={inv.id} className="py-2.5 px-3 leading-relaxed">
                        {inv.objectives}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium">
                      {t("Rango O₂ / Presión", "O₂ / Pressure")}
                    </td>
                    {comparedStudies.map((inv) => (
                      <td key={inv.id} className="py-2.5 px-3 font-mono">
                        O₂: {inv.stats.o2_min_pct}–{inv.stats.o2_max_pct}% | P:{" "}
                        {inv.stats.pressure_psi_min}–{inv.stats.pressure_psi_max} psi
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium">
                      {t("Hardware", "Hardware")}
                    </td>
                    {comparedStudies.map((inv) => (
                      <td key={inv.id} className="py-2.5 px-3">
                        {inv.hardware}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium">
                      {t("Variables modificadas", "Variables changed")}
                    </td>
                    {comparedStudies.map((inv) => (
                      <td key={inv.id} className="py-2.5 px-3">
                        {inv.variables_changed.join(" • ")}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium">
                      {t("Gravedad parcial (Luna)", "Partial gravity (Moon)")}
                    </td>
                    {comparedStudies.map((inv) => (
                      <td key={inv.id} className="py-2.5 px-3 leading-relaxed">
                        {inv.lunar_partial_g_note}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium">
                      {t("Aplicación en la Tierra", "On Earth")}
                    </td>
                    {comparedStudies.map((inv) => (
                      <td key={inv.id} className="py-2.5 px-3 leading-relaxed">
                        {inv.earth_spinoff}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {contextualPapers.map((p) => (
                <div
                  key={p.ntrs_id}
                  className={`p-4 border flex flex-col justify-between rounded-none ${
                    isStudent
                      ? "bg-[#080b12] border-slate-800 text-slate-300"
                      : "bg-slate-50 border-slate-200 text-slate-700"
                  }`}
                >
                  <div>
                    <span className="text-[11px] opacity-60">
                      {p.topic_tag} • {p.center || "NASA"}
                    </span>
                    <h3
                      className={`text-xs font-semibold mt-1 line-clamp-2 ${
                        isStudent ? "text-slate-100" : "text-slate-900"
                      }`}
                    >
                      {p.title}
                    </h3>
                    <p className="text-[11px] opacity-75 mt-1.5 line-clamp-3 leading-relaxed">
                      {p.abstract}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-2.5 border-t border-slate-500/20 text-xs font-medium">
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline flex items-center gap-1 opacity-80 hover:opacity-100"
                    >
                      NTRS:{p.ntrs_id} <ExternalLink className="w-3 h-3" />
                    </a>
                    {p.pdf_url && (
                      <a
                        href={p.pdf_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400 hover:underline flex items-center gap-1"
                      >
                        PDF <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}