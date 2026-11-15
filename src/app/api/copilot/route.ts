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
      .filter((w) => w.length > 2);
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

function buildSmartLocalAnswer(
  question: string,
  mode: AudienceMode,
  lang: AppLang,
  scenario: { targetO2Pct: number; targetPressurePsi: number; targetAirflowCmS?: number; name: string; name_en?: string }
) {
  const q = question.toLowerCase();
  const isEs = lang === "es";
  const list = rankInvestigations(
    rawList,
    {
      ...MISSION_PRESETS[0],
      targetO2Pct: scenario?.targetO2Pct ?? 34,
      targetPressurePsi: scenario?.targetPressurePsi ?? 10.2,
    },
    lang
  );
  const byId = Object.fromEntries(list.map((i) => [i.id, i]));
  const papers = loadNtrsSafe(question);
  const paperNote =
    papers.length > 0 && papers[0].hits > 0
      ? isEs
        ? `\n\nReporte NASA NTRS recomendado: "${papers[0].title}" (ID: ${papers[0].ntrs_id}).`
        : `\n\nRecommended NASA NTRS Report: "${papers[0].title}" (ID: ${papers[0].ntrs_id}).`
      : "";

  // 1. Perguntas sobre o que o assistente pode fazer (Meta / Help)
  if (
    q.includes("what kind") ||
    q.includes("what can you") ||
    q.includes("cand do") ||
    q.includes("can do") ||
    q.includes("que puedes") ||
    q.includes("qué puedes") ||
    q.includes("ayuda") ||
    q.includes("help")
  ) {
    return isEs
      ? `Puedo ayudarte a analizar los 746 ensayos reales de combustión en microgravedad de la NASA (PSI) y 28 reportes técnicos (NTRS):\n\n1. Comparar fases de combustible: Sólidos (BASS-II, SAFFIRE-II), Gotas Líquidas (FLEX-2), Gases (ACME CFI-G) y Humo (SAME-R).\n2. Evaluar brechas para la Base Lunar (≥30% O₂ y ≤10.2 psi), donde 0/144 pruebas de sólidos en BASS-II y SAFFIRE-II superan el 22.2% O₂.\n3. Explicar cómo acotar la gravedad parcial lunar (1/6g) usando los datos 0g vs. 1g de SAFFIRE-II.\n4. Conectar hallazgos espaciales con aplicaciones en la Tierra (minería, bomberos, sensores).`
      : `I can help you analyze all 746 real NASA microgravity combustion runs (PSI) and 28 technical reports (NTRS):\n\n1. Compare fuel phases: Solids (BASS-II, SAFFIRE-II), Liquid Droplets (FLEX-2), Gases (ACME CFI-G), and Smoke Aerosols (SAME-R).\n2. Evaluate Lunar Base gaps (≥30% O₂, ≤10.2 psi), showing why 0/144 solid runs in BASS-II & SAFFIRE-II exceed 22.2% O₂.\n3. Explain how to bound lunar partial gravity (1/6g) using SAFFIRE-II parallel 0g vs. 1g data.\n4. Connect space research to Earth applications (mining dust/smoke sensors, firefighter gear, fine-water-mist).`;
  }

  // 2. Comparação Gás vs. Líquido (ACME CFI-G vs FLEX-2)
  if (
    (q.includes("gas") && (q.includes("liquid") || q.includes("líquido") || q.includes("gota"))) ||
    q.includes("flex") ||
    q.includes("acme") ||
    q.includes("cool flame") ||
    q.includes("llama fría") ||
    q.includes("droplet")
  ) {
    const flex = byId["PSI-68"];
    const acme = byId["PSI-159"];
    return (
      (isEs
        ? `Comparación Fase Líquida (FLEX-2) vs. Fase Gaseosa (ACME CFI-G) en caída libre (0g):\n\n• Líquidos — FLEX-2 (PSI-68 | DOI: ${flex.doi} | N=160): Evalúa gotas de hidrocarburos (1.5–5 mm) en el rack CIR/MDCA entre 17–30% O₂ y 7.3–44.1 psi. En 0g las gotas forman esferas simétricas y exhiben extinción radiativa seguida de "llamas frías" invisibles de baja temperatura que pueden causar reignición.\n\n• Gases — ACME CFI-G (PSI-159 | DOI: ${acme.doi} | N=333): Evalúa llamas gaseosas esféricas (normales e inversas) con enriquecimiento extremo de oxígeno desde 12% hasta 85% O₂ (7.2–48.0 psi). Permite modelar fugas de oxígeno puro (trajes espaciales) y cinética química sin flotabilidad.`
        : `Comparison of Liquid Phase (FLEX-2) vs. Gas Phase (ACME CFI-G) in Freefall (0g):\n\n• Liquid Droplets — FLEX-2 (PSI-68 | DOI: ${flex.doi} | N=160): Tests 1.5–5 mm hydrocarbon droplets in the CIR/MDCA rack across 17–30% O₂ and 7.3–44.1 psi. In 0g, droplets burn symmetrically and exhibit radiative extinction followed by invisible low-temperature "cool flames" capable of re-ignition.\n\n• Gaseous Fuels — ACME CFI-G (PSI-159 | DOI: ${acme.doi} | N=333): Tests spherical porous-burner gas flames (normal and inverse) across extreme oxygen concentrations from 12% up to 85% O₂ (7.2–48.0 psi), bounding pure-O₂ spacesuit leak hazards and soot/thermal limits.`) + paperNote
    );
  }

  // 3. Fumaça, Poeira Lunar, Detecção e Mineração (SAME-R / DAFT)
  if (
    q.includes("smoke") ||
    q.includes("humo") ||
    q.includes("dust") ||
    q.includes("polvo") ||
    q.includes("same") ||
    q.includes("daft") ||
    q.includes("sensor") ||
    q.includes("detect") ||
    q.includes("minería") ||
    q.includes("mining") ||
    q.includes("rt/r0")
  ) {
    const same = byId["PSI-101"];
    return (
      (isEs
        ? `Detección de Humo vs. Polvo en Microgravedad (SAME-R | PSI-101 | DOI: ${same.doi} | N=109):\n\n• Física en 0g: Sin convección natural, el humo no sube al techo; permanece en la zona de pirólisis y sus partículas chocan y se coagulan, aumentando la relación de envejecimiento (Rt/R0). Esto cambia la respuesta entre detectores ópticos (dispersión de luz) y de ionización.\n\n• Riesgo Lunar y Terrestre: Cruzado con los estudios hermanos DAFT, permite calibrar sensores para que el polvo lunar abrasivo dentro de un rover (o el polvo en minas subterráneas en la Tierra) no dispare falsas alarmas de incendio.`
        : `Smoke vs. Dust Detection in Microgravity (SAME-R | PSI-101 | DOI: ${same.doi} | N=109):\n\n• 0g Physics: Without buoyant plumes, smoke does not rise to the ceiling; particles linger and coagulate into larger aggregates, increasing the aging ratio (Rt/R0). This shifts sensitivity between optical scatter (DustTrak) and ionization detectors.\n\n• Lunar & Earth Impact: Paired with sibling DAFT dust studies, this data calibrates discriminators so abrasive lunar regolith dust inside rovers—or dust in underground mines on Earth—does not trigger false alarms.`) + paperNote
    );
  }

  // 4. Gravidade Parcial (1/6g Lua / Marte) e SAFFIRE-II / BASS-II
  if (
    q.includes("1/6") ||
    q.includes("partial") ||
    q.includes("parcial") ||
    q.includes("bound") ||
    q.includes("acotar") ||
    q.includes("saffire") ||
    q.includes("bass") ||
    q.includes("solid") ||
    q.includes("sólido") ||
    q.includes("lunar") ||
    q.includes("luna") ||
    q.includes("moon")
  ) {
    const saf = byId["PSI-99"];
    const bass = byId["PSI-25"];
    return (
      (isEs
        ? `Análisis de Polímeros Sólidos y Acotamiento de Gravedad Lunar (1/6g):\n\n• Brecha de Oxígeno: En nuestra base de 746 ensayos, BASS-II (PSI-25, N=129, máx 22.2% O₂) y SAFFIRE-II (PSI-99, N=15, máx 22.1% O₂) operaron limitados a la atmósfera nominal de la ISS. Por ello, tienen 0 ensayos en el régimen lunar (≥30% O₂, ≤10.2 psi).\n\n• Cómo acotar 1/6g hoy: Mientras llegan los futuros experimentos lunares LUCI y FM2, SAFFIRE-II (DOI: ${saf.doi}) ofrece mediciones paralelas en 0g y 1g sobre las mismas muestras (29×5 cm), y BASS-II (DOI: ${bass.doi}) aporta el efecto de ventilación forzada (0–40 cm/s), acotando el límite inferior y superior de propagación.`
        : `Solid Polymer Analysis & Lunar Partial-Gravity (1/6g) Bounding:\n\n• Oxygen Gap: Across our 746-run dataset, BASS-II (PSI-25, N=129, max 22.2% O₂) and SAFFIRE-II (PSI-99, N=15, max 22.1% O₂) were constrained to nominal ISS cabin air, leaving 0 solid runs in the lunar target zone (≥30% O₂, ≤10.2 psi).\n\n• How to bound 1/6g today: Until future lunar experiments (LUCI & FM2) are added to PSI, SAFFIRE-II (DOI: ${saf.doi}) provides side-by-side 0g and 1g burn lengths on identical 29×5 cm samples, while BASS-II (DOI: ${bass.doi}) quantifies forced-flow sensitivity (0–40 cm/s) to bound intermediate gravity behavior.`) + paperNote
    );
  }

  // 5. Explicação da forma da chama / Terra vs Espaço
  if (
    q.includes("sphere") ||
    q.includes("esfera") ||
    q.includes("blue") ||
    q.includes("azul") ||
    q.includes("shape") ||
    q.includes("forma") ||
    q.includes("earth") ||
    q.includes("tierra")
  ) {
    return (
      (isEs
        ? `Física de la Llama en Microgravedad vs. Tierra y Transferencia Tecnológica:\n\n• ¿Por qué es una esfera azul en 0g?: En la Tierra (1g), el aire caliente pesa menos y sube por flotabilidad, estirando la llama en forma de lágrima amarilla. En caída libre (0g), no hay empuje ascendente: el oxígeno llega solo por difusión molecular lenta desde todas las direcciones, formando una esfera azul eficiente.\n\n• Efecto de la ventilación y uso en la Tierra: Al encender los ventiladores de la nave (BASS-II / SAFFIRE-II), el flujo de aire reemplaza a la gravedad y acelera el fuego. Estos estudios impulsaron trajes ignífugos para bomberos, extintores de niebla fina de agua (FLEX-2) y detectores industriales (SAME-R).`
        : `Microgravity vs. Earth Flame Physics & Terrestrial Spin-offs:\n\n• Why a blue sphere in 0g?: On Earth (1g), hot gases rise due to buoyancy, drawing fresh air from below and stretching the flame into a yellow teardrop. In freefall (0g), buoyancy vanishes: oxygen reaches the reaction zone only via slow molecular diffusion from all sides, creating a spherical blue flame.\n\n• Airflow effect & Earth Spin-offs: When spacecraft ventilation fans blow (BASS-II / SAFFIRE-II), forced convection replaces buoyancy and accelerates flame spread. These studies directly improved firefighter protective gear, fine-water-mist extinguishers (FLEX-2), and industrial dust/smoke detectors (SAME-R).`) + paperNote
    );
  }

  // 6. Resposta dinâmica geral para qualquer outra pergunta específica
  const top = list.slice(0, 2);
  return (
    (isEs
      ? `Análisis para "${question}" bajo el escenario actual (${scenario.targetO2Pct}% O₂, ${scenario.targetPressurePsi} psi):\n\n• #1 ${top[0].acronym} (${top[0].id} — DOI: ${top[0].doi}): ${mode === "student" ? top[0].student_summary : top[0].technical_insight}\n\n• #2 ${top[1].acronym} (${top[1].id} — DOI: ${top[1].doi}): ${mode === "student" ? top[1].student_summary : top[1].technical_insight}`
      : `Analysis for "${question}" under active scenario (${scenario.targetO2Pct}% O₂, ${scenario.targetPressurePsi} psi):\n\n• #1 ${top[0].acronym} (${top[0].id} — DOI: ${top[0].doi}): ${mode === "student" ? top[0].student_summary : top[0].technical_insight}\n\n• #2 ${top[1].acronym} (${top[1].id} — DOI: ${top[1].doi}): ${mode === "student" ? top[1].student_summary : top[1].technical_insight}`) + paperNote
  );
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
      const answer = buildSmartLocalAnswer(question, mode, lang, scenario);
      return NextResponse.json({ answer, source: "PSI-Analytical-Engine" });
    }

    const localizedStudies = rankInvestigations(rawList, scenario, lang);
    const topPapers = loadNtrsSafe(question);
    const compactStudies = localizedStudies.map((i) => ({
      id: i.id,
      acronym: i.acronym,
      doi: i.doi,
      score: i.score,
      phase: i.fuel_phase,
      o2_range: `${i.stats.o2_min_pct}-${i.stats.o2_max_pct}%`,
      pressure_psi: `${i.stats.pressure_psi_min}-${i.stats.pressure_psi_max}`,
      runs: i.stats.total_runs,
      insight: mode === "student" ? i.student_summary : i.technical_insight,
    }));

    const langRule =
      lang === "es"
        ? "Responde en ESPAÑOL claro, sin usar asteriscos de markdown (**) ni portugués."
        : "Respond in clear ENGLISH, without raw markdown asterisks (**) or Portuguese.";

    const systemInstruction = `${langRule} Eres el asistente científico del proyecto Flame in Freefall (NASA PSI + NTRS). Responde directamente a la pregunta del usuario citando cifras, IDs PSI y DOIs del contexto en máximo 3 párrafos breves.`;

    const prompt = `Scenario: ${JSON.stringify(scenario)}\nPSI Studies: ${JSON.stringify(compactStudies)}\nNTRS Papers: ${JSON.stringify(topPapers.map((p) => ({ id: p.ntrs_id, title: p.title })))}\nUser Question: ${question}`;

    const ai = new GoogleGenAI({ apiKey });
    for (const modelName of ["gemini-2.5-flash", "gemini-2.0-flash"]) {
      try {
        const result = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.3,
            maxOutputTokens: 600,
          },
        });
        const cleanText = result.text?.replace(/\*\*/g, "").trim();
        if (cleanText) {
          responseCache.set(cacheKey, { answer: cleanText, source: modelName });
          return NextResponse.json({ answer: cleanText, source: modelName });
        }
      } catch {
        continue;
      }
    }

    const answer = buildSmartLocalAnswer(question, mode, lang, scenario);
    return NextResponse.json({ answer, source: "PSI-Analytical-Engine" });
  } catch (err) {
    return NextResponse.json(
      { error: "Copilot error", details: String(err) },
      { status: 500 }
    );
  }
}