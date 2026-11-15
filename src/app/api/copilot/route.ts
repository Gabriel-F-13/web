import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import investigationsRaw from "@/data/investigations.json";
import {
  Investigation,
  rankInvestigations,
  MISSION_PRESETS,
  AppLang,
  AudienceMode,
} from "@/lib/ranking";

const rawList = investigationsRaw as Investigation[];
const responseCache = new Map<string, { answer: string; source: string }>();

function loadNtrsSafe(query: string) {
  try {
    const filePath = path.join(process.cwd(), "src", "data", "ntrs_papers.json");
    if (!fs.existsSync(filePath)) return [];
    const papers = JSON.parse(fs.readFileSync(filePath, "utf-8")) as Array<{
      ntrs_id: string;
      title: string;
      abstract: string;
      url: string;
      topic_tag: string;
    }>;
    const words = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);
    return papers
      .map((p) => {
        const text = `${p.title} ${p.abstract} ${p.topic_tag}`.toLowerCase();
        const hits = words.reduce((acc, w) => acc + (text.includes(w) ? 1 : 0), 0);
        return { ...p, hits };
      })
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 3);
  } catch {
    return [];
  }
}

function buildFallbackAnswer(
  question: string,
  mode: AudienceMode,
  lang: AppLang,
  scenario: { targetO2Pct: number; targetPressurePsi: number; name: string; name_en?: string }
) {
  // Usa rankInvestigations para obtener los textos 100% traducidos en ES o EN
  const localizedList = rankInvestigations(
    rawList,
    {
      ...MISSION_PRESETS[0],
      targetO2Pct: scenario?.targetO2Pct ?? 34,
      targetPressurePsi: scenario?.targetPressurePsi ?? 10.2,
    },
    lang
  );
  const top = localizedList.slice(0, 3);
  const papers = loadNtrsSafe(question);
  const isEs = lang === "es";
  const scenName = isEs
    ? scenario?.name || "Escenario Actual"
    : scenario?.name_en || scenario?.name || "Current Scenario";

  if (mode === "student") {
    return [
      isEs
        ? `**Síntesis Educativa (Escenario: ${scenName} • ${scenario.targetO2Pct}% O₂ • ${scenario.targetPressurePsi} psi)**`
        : `**Educational Synthesis (Scenario: ${scenName} • ${scenario.targetO2Pct}% O₂ • ${scenario.targetPressurePsi} psi)**`,
      ...top.map((i) =>
        isEs
          ? `• **${i.acronym} (${i.id}):** ${i.student_summary}\n  *Aplicación en la Tierra:* ${i.earth_spinoff}`
          : `• **${i.acronym} (${i.id}):** ${i.student_summary}\n  *Application on Earth:* ${i.earth_spinoff}`
      ),
      scenario.targetO2Pct >= 30
        ? isEs
          ? `**Nota sobre la Base Lunar:** Con ${scenario.targetO2Pct}% de oxígeno, los materiales se encienden mucho más rápido que en la Tierra (21% O₂). Por eso la NASA usa los estudios de gases y gotas en cámaras selladas para diseñar futuros hábitats.`
          : `**Lunar Base Note:** At ${scenario.targetO2Pct}% oxygen, materials ignite much faster than on Earth (21% O₂). NASA uses sealed-chamber gas and droplet studies to design safer future habitats.`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  return [
    isEs
      ? `**Síntesis Técnica PSI (Escenario: ${scenName} | O₂: ${scenario.targetO2Pct}% | Presión: ${scenario.targetPressurePsi} psi)**`
      : `**PSI Technical Synthesis (Scenario: ${scenName} | O₂: ${scenario.targetO2Pct}% | Pressure: ${scenario.targetPressurePsi} psi)**`,
    ...top.map((i) =>
      isEs
        ? `• **${i.id} (${i.acronym} — DOI: ${i.doi}):** ${i.technical_insight} [Rango empírico: ${i.stats.o2_min_pct}–${i.stats.o2_max_pct}% O₂; ${i.stats.pressure_psi_min}–${i.stats.pressure_psi_max} psi; N=${i.stats.total_runs}].\n  *Gravedad Parcial:* ${i.lunar_partial_g_note}`
        : `• **${i.id} (${i.acronym} — DOI: ${i.doi}):** ${i.technical_insight} [Empirical range: ${i.stats.o2_min_pct}–${i.stats.o2_max_pct}% O₂; ${i.stats.pressure_psi_min}–${i.stats.pressure_psi_max} psi; N=${i.stats.total_runs}].\n  *Partial Gravity:* ${i.lunar_partial_g_note}`
    ),
    papers.length > 0
      ? isEs
        ? `**Literatura NASA NTRS relacionada:** ${papers.map((p) => `${p.title} (ID:${p.ntrs_id})`).join(" | ")}`
        : `**Related NASA NTRS Literature:** ${papers.map((p) => `${p.title} (ID:${p.ntrs_id})`).join(" | ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      question,
      mode = "engineer",
      lang = "es",
      scenario = MISSION_PRESETS[0],
    } = body;

    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "Invalid question" }, { status: 400 });
    }

    const localizedStudies = rankInvestigations(rawList, scenario, lang);
    const cacheKey = JSON.stringify({
      q: question.trim().toLowerCase(),
      mode,
      lang,
      o2: scenario.targetO2Pct,
      p: scenario.targetPressurePsi,
    });

    if (responseCache.has(cacheKey)) {
      return NextResponse.json({ ...responseCache.get(cacheKey), cached: true });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey || apiKey === "cole_sua_chave_aqui") {
      const fallback = buildFallbackAnswer(question, mode, lang, scenario);
      return NextResponse.json({ answer: fallback, source: "PSI-Local-Engine" });
    }

    const topPapers = loadNtrsSafe(question);
    const compactStudies = localizedStudies.map((i) => ({
      id: i.id,
      acronym: i.acronym,
      doi: i.doi,
      score: i.score,
      pillar: i.pillar,
      phase: i.fuel_phase,
      o2_range: `${i.stats.o2_min_pct}-${i.stats.o2_max_pct}%`,
      pressure_psi: `${i.stats.pressure_psi_min}-${i.stats.pressure_psi_max}`,
      runs: i.stats.total_runs,
      insight: mode === "student" ? i.student_summary : i.technical_insight,
      lunar_note: i.lunar_partial_g_note,
      earth_spinoff: i.earth_spinoff,
    }));

    const langRule =
      lang === "es"
        ? "Responde SIEMPRE en ESPAÑOL claro, sin usar ninguna palabra en portugués."
        : "Always respond in clear ENGLISH, never using Portuguese.";

    const systemInstruction =
      mode === "student"
        ? `${langRule} Eres un divulgador científico de la NASA explicando seguridad contra incendios en el espacio a estudiantes y público general. Usa analogías claras, menciona cifras reales del contexto y explica cómo ayuda en la Tierra. Máximo 3 párrafos.`
        : `${langRule} Eres un especialista en combustión en microgravedad de la NASA. Cita IDs PSI, DOIs, rangos de O₂/presión y brechas experimentales (ej. 0/144 ensayos en sólidos >22.2% O₂ en BASS-II y SAFFIRE-II, y acotamiento 0g/1g para gravedad parcial lunar). Sé conciso y riguroso.`;

    const prompt = `
Scenario: ${JSON.stringify(scenario)}
PSI Investigations Ranked: ${JSON.stringify(compactStudies)}
NTRS Papers: ${JSON.stringify(topPapers.map((p) => ({ id: p.ntrs_id, title: p.title })))}
Question: ${question}
    `.trim();

    try {
      const ai = new GoogleGenAI({ apiKey });
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.25,
          maxOutputTokens: 650,
        },
      });

      const answer =
        result.text?.trim() || buildFallbackAnswer(question, mode, lang, scenario);

      responseCache.set(cacheKey, { answer, source: "Gemini-2.5-Flash" });
      return NextResponse.json({ answer, source: "Gemini-2.5-Flash", cached: false });
    } catch {
      const fallback = buildFallbackAnswer(question, mode, lang, scenario);
      return NextResponse.json({ answer: fallback, source: "PSI-Deterministic-Engine" });
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Copilot error", details: String(err) },
      { status: 500 }
    );
  }
}