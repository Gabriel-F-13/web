export type AudienceMode = "engineer" | "student";
export type AppLang = "es" | "en";

export interface MissionScenario {
  id: string;
  name: string;
  name_en: string;
  targetO2Pct: number;
  targetPressurePsi: number;
  targetAirflowCmS: number;
  gravityRegime: "0g" | "1/6g" | "1g";
  pillar: "All" | "Prevention" | "Detection" | "Suppression";
  fuelPhase: "All" | "Solid" | "Liquid" | "Gas" | "Aerosol/Smoke";
  partialGravityNeed: boolean;
}

export interface InvestigationStats {
  total_runs: number;
  unique_fuels: number;
  o2_min_pct: number;
  o2_max_pct: number;
  pressure_psi_min: number;
  pressure_psi_max: number;
  airflow_cm_s_min: number | null;
  airflow_cm_s_max: number | null;
  covers_lunar_zone: boolean;
  covers_high_o2: boolean;
}

export interface Investigation {
  id: string;
  acronym: string;
  title: string;
  doi: string;
  pillar: string[];
  fuel_phase: string;
  hardware: string;
  sensors: string[];
  variables_changed: string[];
  variables_constant: string[];
  objectives: string;
  technical_insight: string;
  technical_insight_en?: string;
  student_summary: string;
  student_summary_en?: string;
  lunar_partial_g_note: string;
  lunar_partial_g_note_en?: string;
  earth_spinoff: string;
  earth_spinoff_en?: string;
  stats: InvestigationStats;
}

export interface RankedInvestigation extends Investigation {
  score: number;
  breakdown: {
    pillar: number;
    phase: number;
    o2: number;
    pressure: number;
    flowAndGravity: number;
  };
  reasons: string[];
  highO2Gap: boolean;
}

// Diccionario canónico ES/EN para sobrescribir cualquier texto antiguo en investigations.json
const LOCALIZED_TEXTS: Record<
  string,
  {
    objectives_es: string;
    objectives_en: string;
    tech_es: string;
    tech_en: string;
    student_es: string;
    student_en: string;
    lunar_es: string;
    lunar_en: string;
    earth_es: string;
    earth_en: string;
    vars_changed_es: string[];
    vars_const_es: string[];
  }
> = {
  "PSI-25": {
    objectives_es:
      "Cuantificar límites de inflamabilidad de polímeros sólidos, generación de CO/CO₂ y extinción bajo flujos ventilados en microgravedad.",
    objectives_en:
      "Quantify solid polymer flammability limits, CO/CO₂ emissions, and extinction under low-speed forced flows in microgravity.",
    tech_es:
      "La ventilación forzada (hasta 40 cm/s) sostiene la propagación en sólidos en 0g y eleva el ΔCO poscombustión; invalida extrapolar pruebas estáticas 1g (NASA-STD-6001) sin flujo.",
    tech_en:
      "Forced ventilation (up to 40 cm/s) sustains solid flame spread in 0g and elevates post-burn ΔCO; challenges static 1g NASA-STD-6001 assumptions.",
    student_es:
      "En el espacio el aire caliente no sube. Sin embargo, cuando los ventiladores de aire acondicionado de la nave soplan sobre telas o plásticos, alimentan el fuego con oxígeno y liberan monóxido de carbono.",
    student_en:
      "In space, hot air does not rise. However, when cabin ventilation fans blow across fabrics or plastics, they feed fresh oxygen to the flame and release carbon monoxide.",
    lunar_es:
      "Cobertura máxima probada: 22.2% O₂ en 0g. No cubre ≥30% O₂ lunar; debe combinarse con ensayos 1g para acotar la inflamabilidad en 1/6g hasta contar con datos de FM2/LUCI.",
    lunar_en:
      "Max tested O₂: 22.2% in 0g. Does not cover ≥30% lunar O₂; must be paired with 1g upward tests to bound 1/6g flammability until FM2/LUCI data is available.",
    earth_es:
      "Certificación de textiles ignífugos para trajes de bomberos y modelado de incendios ventilados en túneles y minas.",
    earth_en:
      "Certification of flame-resistant textiles for firefighter gear and modeling of ventilated tunnel fires.",
    vars_changed_es: [
      "Velocidad de flujo (Fan/Restrictor)",
      "Espesor y geometría del polímero (PMMA, Sibal, Nomex)",
      "Concentración de O₂ (13.6% a 22.2% vía dilución N₂)",
    ],
    vars_const_es: ["Microgravedad orbital (0g ISS)", "Sección transversal del ducto (76×76 mm)"],
  },
  "PSI-99": {
    objectives_es:
      "Medir el crecimiento de incendios a escala real de vehículo (29×5 cm) y comparar directamente longitudes de quemado en 0g contra 1g en Tierra.",
    objectives_en:
      "Measure vehicle-scale flame spread (29×5 cm samples) inside Cygnus and directly compare 0g burn lengths against 1g Earth baselines.",
    tech_es:
      "Única base con matriz paralela 0g vs. 1g en muestras idénticas: la silicona de 0.27 mm se autoextinguió (~0 cm) en 0g a 20 cm/s, pero presentó quemado completo acelerado en 1g.",
    tech_en:
      "Only dataset with parallel 0g vs. 1g columns on identical samples: 0.27 mm silicone self-extinguished (~0 cm) in 0g at 20 cm/s, yet burned completely in 1g.",
    student_es:
      "Para probar un incendio grande sin arriesgar astronautas, la NASA encendió muestras reales dentro de una nave de carga Cygnus antes de destruirla en la reentrada, comparando el fuego espacial contra el terrestre.",
    student_en:
      "To test a large fire safely, NASA ignited large material panels inside an uncrewed Cygnus cargo ship before atmospheric re-entry, comparing space fire growth to Earth.",
    lunar_es:
      "Ancla empírica primaria para gravedad parcial: sus columnas simultáneas 0g y 1g acotan el límite inferior y superior de propagación para la Luna (1/6g) y Marte (3/8g).",
    lunar_en:
      "Primary empirical anchor for partial gravity: simultaneous 0g and 1g columns bound the lower and upper flame spread limits for the Moon (1/6g) and Mars (3/8g).",
    earth_es:
      "Validación de simuladores computacionales (CFD) para seguridad contra incendios en cabinas de aviones comerciales.",
    earth_en:
      "Validation of Computational Fluid Dynamics (CFD) simulators for commercial aircraft cabin fire safety.",
    vars_changed_es: [
      "Material y espesor (Silicona 0.27–1.03 mm, Sibal, PMMA)",
      "Dirección de flujo (Concurrente vs. Opuesto)",
      "Velocidad de aire (20 vs. 30 cm/s)",
    ],
    vars_const_es: ["Dimensiones de muestra (29×5 cm)", "Potencia de ignición (80 W por 9.2 s)"],
  },
  "PSI-101": {
    objectives_es:
      "Caracterizar la cinética de envejecimiento y coagulación de aerosoles de humo (Rt/R0) en 0g para calibrar detectores espaciales.",
    objectives_en:
      "Characterize smoke aerosol aging and coagulation kinetics (Rt/R0) in 0g to calibrate spacecraft fire detectors.",
    tech_es:
      "En ausencia de empuje convectivo, el humo permanece más tiempo en la zona de pirólisis, incrementando el diámetro medio de partícula (Rt/R0) y alterando la sensibilidad óptica vs. ionización.",
    tech_en:
      "Without buoyant plume transport, smoke lingers in the pyrolysis zone, increasing particle size ratio (Rt/R0) and shifting optical vs. ionization sensitivity.",
    student_es:
      "En la Tierra el humo sube rápido al techo donde está la alarma. En el espacio el humo flota lento y sus partículas chocan y crecen; este estudio enseñó a diseñar alarmas que distingan humo real de polvo.",
    student_en:
      "On Earth smoke rises quickly to ceiling alarms. In space smoke floats slowly and particles clump together; this study taught engineers how to build alarms that tell smoke apart from dust.",
    lunar_es:
      "Cruzado con los estudios hermanos DAFT/DAFT-2, permite configurar umbrales ópticos para que el polvo lunar abrasivo dentro del rover no dispare falsas alarmas de incendio.",
    lunar_en:
      "Paired with sibling DAFT/DAFT-2 dust studies, enables optical thresholds so abrasive lunar regolith dust inside rovers does not trigger false fire alarms.",
    earth_es:
      "Sensores industriales anti-falsas alarmas para minería subterránea, plantas cementeras y túneles con polvo en suspensión.",
    earth_en:
      "False-alarm-proof industrial smoke detectors for underground mining, cement plants, and dusty environments.",
    vars_changed_es: [
      "Polímero pirolizado (Kapton, Teflon, espuma Pyrell, Silicona)",
      "Tiempo de envejecimiento primario y mezcla (s)",
      "Velocidad de entrada (cm/s)",
    ],
    vars_const_es: ["Atmósfera nominal ISS (21% O₂, 14.7 psi)", "Cámara de envejecimiento en 0g"],
  },
  "PSI-68": {
    objectives_es:
      "Determinar constantes de velocidad de quemado, extinción radiativa y régimen de 'llamas frías' en gotas líquidas bajo presiones de 0.5 a 3.0 atm.",
    objectives_en:
      "Determine burning rate constants, radiative extinction, and cool-flame regimes in liquid droplets across 0.5–3.0 atm.",
    tech_es:
      "Cubre directamente el régimen de baja presión (0.5 atm = 7.3 psi) y enriquecimiento de O₂ (30%) proyectado para hábitats lunares, documentando reignición por llamas frías.",
    tech_en:
      "Directly covers the reduced-pressure (0.5 atm = 7.3 psi) and elevated-O₂ (30%) regime planned for lunar habitats, documenting cool-flame re-ignition.",
    student_es:
      "Al quemar gotas de combustible en gravedad cero descubrieron algo sorprendente: cuando la llama visible se apaga, el combustible puede seguir quemándose de forma invisible a menor temperatura ('llama fría').",
    student_en:
      "Burning fuel droplets in zero gravity revealed a surprise: after the visible flame goes out, fuel can keep burning invisibly at lower temperature ('cool flame').",
    lunar_es:
      "Única base de fase líquida y supresión que intersecta directamente el sobre operativo de Base Lunar / Rover (30% O₂ y 7.3–10.2 psi).",
    lunar_en:
      "Only liquid-phase & suppression dataset that directly intersects the Lunar Base / Rover operating envelope (30% O₂ and 7.3–10.2 psi).",
    earth_es:
      "Diseño de extintores de niebla fina de agua (fine-water-mist) sin gases tóxicos y motores de combustión más eficientes.",
    earth_en:
      "Design of non-toxic fine-water-mist fire extinguishers and cleaner, high-efficiency combustion engines.",
    vars_changed_es: [
      "Fracción molar de O₂ (17%, 21%, 25%, 30%)",
      "Presión ambiente (0.5 a 3.0 atm / 7.3 a 44.1 psi)",
      "Gas diluyente (N₂ vs. He) y tipo de hidrocarburo",
    ],
    vars_const_es: ["Diámetro inicial de gota (1.5–5 mm)", "Temperatura inicial (25 °C)"],
  },
  "PSI-159": {
    objectives_es:
      "Evaluar ignición caliente, llamas frías y extinción en llamas gaseosas esféricas (normales e inversas) con O₂ desde 12% hasta 85%.",
    objectives_en:
      "Evaluate hot ignition, cool flames, and extinction in spherical gas flames (normal and inverse) across 12%–85% O₂.",
    tech_es:
      "Aporta 333 corridas cuantitativas alcanzando 85% O₂ y temperaturas de quemador registradas, modelando escenarios extremos de enriquecimiento de oxígeno y fugas de trajes EVA.",
    tech_en:
      "Provides 333 quantitative runs reaching 85% O₂ with burner peak temperatures, modeling extreme oxygen-enrichment and EVA spacesuit leak scenarios.",
    student_es:
      "Los trajes espaciales usan 100% de oxígeno puro. Para entender el peligro de una fuga de oxígeno dentro de un módulo lunar, la NASA probó gases con hasta 85% de oxígeno en quemadores esféricos.",
    student_en:
      "Spacesuits use 100% pure oxygen. To understand the hazard of an oxygen leak inside a lunar module, NASA tested gases with up to 85% oxygen on spherical burners.",
    lunar_es:
      "Cubre toda la banda hiper-oxidante (30%–85% O₂) y bajas presiones (desde 7.2 psi); se vincula con ACME E-FIELD Flames (simulación de gravedad parcial mediante campo eléctrico).",
    lunar_en:
      "Covers the full hyper-oxidizing band (30%–85% O₂) and low pressures (from 7.2 psi); pairs with ACME E-FIELD Flames (electric-field partial-gravity simulation).",
    earth_es:
      "Modelos cinéticos para reducir formación de hollín y contaminantes en turbinas industriales y calderas.",
    earth_en:
      "Chemical kinetic models to reduce soot formation and emissions in industrial turbines and boilers.",
    vars_changed_es: [
      "Fracción de O₂ extrema (12% a 85% O₂)",
      "Configuración de llama (Normal vs. Inversa)",
      "Presión de cámara (0.5 a 3.3 bar / 7.2 a 48.0 psi)",
    ],
    vars_const_es: ["Quemador poroso esférico ACME", "Microgravedad en rack CIR"],
  },
};

export const MISSION_PRESETS: MissionScenario[] = [
  {
    id: "lunar",
    name: "Base Lunar / Rover Artemis",
    name_en: "Lunar Base / Artemis Rover",
    targetO2Pct: 34,
    targetPressurePsi: 10.2,
    targetAirflowCmS: 20,
    gravityRegime: "1/6g",
    pillar: "All",
    fuelPhase: "All",
    partialGravityNeed: true,
  },
  {
    id: "iss",
    name: "Estación Espacial (ISS Nominal)",
    name_en: "Space Station (ISS Nominal)",
    targetO2Pct: 21,
    targetPressurePsi: 14.7,
    targetAirflowCmS: 20,
    gravityRegime: "0g",
    pillar: "All",
    fuelPhase: "All",
    partialGravityNeed: false,
  },
  {
    id: "suit",
    name: "Fuga Traje Espacial (Alto O₂)",
    name_en: "Spacesuit Leak (High O₂)",
    targetO2Pct: 85,
    targetPressurePsi: 4.3,
    targetAirflowCmS: 10,
    gravityRegime: "1/6g",
    pillar: "Prevention",
    fuelPhase: "All",
    partialGravityNeed: false,
  },
  {
    id: "dust",
    name: "Detección Humo vs. Polvo (Luna / Minería)",
    name_en: "Smoke vs. Dust Detection (Moon / Mining)",
    targetO2Pct: 21,
    targetPressurePsi: 14.7,
    targetAirflowCmS: 8,
    gravityRegime: "1/6g",
    pillar: "Detection",
    fuelPhase: "All",
    partialGravityNeed: true,
  },
];

export function rankInvestigations(
  list: Investigation[],
  s: MissionScenario,
  lang: AppLang = "es"
): RankedInvestigation[] {
  const isEs = lang === "es";

  return list
    .map((rawInv) => {
      const loc = LOCALIZED_TEXTS[rawInv.id];
      const inv: Investigation = loc
        ? {
            ...rawInv,
            objectives: isEs ? loc.objectives_es : loc.objectives_en,
            technical_insight: isEs ? loc.tech_es : loc.tech_en,
            technical_insight_en: loc.tech_en,
            student_summary: isEs ? loc.student_es : loc.student_en,
            student_summary_en: loc.student_en,
            lunar_partial_g_note: isEs ? loc.lunar_es : loc.lunar_en,
            lunar_partial_g_note_en: loc.lunar_en,
            earth_spinoff: isEs ? loc.earth_es : loc.earth_en,
            earth_spinoff_en: loc.earth_en,
            variables_changed: isEs ? loc.vars_changed_es : rawInv.variables_changed,
            variables_constant: isEs ? loc.vars_const_es : rawInv.variables_constant,
          }
        : rawInv;

      const reasons: string[] = [];
      const st = inv.stats;

      // 1. Pilar (30 pts)
      let pillarPts = 0;
      if (s.pillar === "All" || inv.pillar.includes(s.pillar)) {
        pillarPts = 30;
        reasons.push(
          isEs ? `Pilar: ${inv.pillar.join("/")}` : `Pillar: ${inv.pillar.join("/")}`
        );
      }

      // 2. Fase (25 pts)
      let phasePts = 0;
      if (s.fuelPhase === "All" || inv.fuel_phase === s.fuelPhase) {
        phasePts = 25;
        reasons.push(isEs ? `Fase: ${inv.fuel_phase}` : `Phase: ${inv.fuel_phase}`);
      }

      // 3. O2 (25 pts)
      let o2Pts = 0;
      if (s.targetO2Pct >= st.o2_min_pct && s.targetO2Pct <= st.o2_max_pct) {
        o2Pts = 25;
        reasons.push(
          isEs
            ? `Cubre ${s.targetO2Pct}% O₂ [${st.o2_min_pct}–${st.o2_max_pct}%]`
            : `Covers ${s.targetO2Pct}% O₂ [${st.o2_min_pct}–${st.o2_max_pct}%]`
        );
      } else {
        const dist = Math.min(
          Math.abs(s.targetO2Pct - st.o2_min_pct),
          Math.abs(s.targetO2Pct - st.o2_max_pct)
        );
        o2Pts = Math.max(0, Math.round(25 - dist * 0.55));
        if (s.targetO2Pct >= 30 && st.o2_max_pct < 30) {
          reasons.push(
            isEs
              ? `Brecha O₂: máx probado ${st.o2_max_pct}%`
              : `O₂ Gap: max tested ${st.o2_max_pct}%`
          );
        }
      }

      // 4. Presión (10 pts)
      let pressPts = 0;
      if (
        s.targetPressurePsi >= st.pressure_psi_min &&
        s.targetPressurePsi <= st.pressure_psi_max
      ) {
        pressPts = 10;
        reasons.push(
          isEs
            ? `P cubierta [${st.pressure_psi_min}–${st.pressure_psi_max} psi]`
            : `P covered [${st.pressure_psi_min}–${st.pressure_psi_max} psi]`
        );
      } else {
        const pDist = Math.min(
          Math.abs(s.targetPressurePsi - st.pressure_psi_min),
          Math.abs(s.targetPressurePsi - st.pressure_psi_max)
        );
        pressPts = Math.max(0, Math.round(10 - pDist * 0.8));
      }

      // 5. Flujo + Gravedad Parcial (10 pts)
      let flowG = 0;
      if (
        st.airflow_cm_s_min !== null &&
        st.airflow_cm_s_max !== null &&
        s.targetAirflowCmS >= st.airflow_cm_s_min &&
        s.targetAirflowCmS <= st.airflow_cm_s_max
      ) {
        flowG += 5;
      }
      if (s.partialGravityNeed && inv.id === "PSI-99") {
        flowG += 5;
        reasons.push(isEs ? "Ancla 0g vs. 1g" : "0g vs. 1g Anchor");
      } else if (s.partialGravityNeed) {
        flowG += 2;
      }

      const total = Math.min(100, pillarPts + phasePts + o2Pts + pressPts + flowG);

      return {
        ...inv,
        score: total,
        breakdown: {
          pillar: pillarPts,
          phase: phasePts,
          o2: o2Pts,
          pressure: pressPts,
          flowAndGravity: flowG,
        },
        reasons,
        highO2Gap: s.targetO2Pct >= 30 && st.o2_max_pct < 30,
      };
    })
    .sort((a, b) => b.score - a.score);
}