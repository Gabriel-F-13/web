# 🔥 Flame in Freefall — Microgravity Fire Safety & Combustion Explorer

> **2026 NASA Space Apps Challenge** | Challenge: *Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data*  
> **Edition:** Monterrey Local Judging (🇲🇽 ES) & NASA Global Judging (🇺🇸 EN)

🔗 **Live Web Application (No installation required):** [https://fireonflamenasa.vercel.app/]

---

## 🌎 Overview (English) | Resumen (Español)

**EN:** **Flame in Freefall Explorer** is an interactive, Super-Intelligence (SI) powered analytical platform that unifies, ranks, compares, and interprets microgravity combustion experiments from **NASA's Physical Sciences Informatics (PSI)** repository (`N = 746 normalized experimental runs`) and **NASA's Technical Reports Server (NTRS)** (`N = 28 official research papers`). It features a **Dual-Lens Architecture**:
1. **Engineer / Researcher Workbench:** Deterministic multi-criteria ranking, thermodynamic coverage mapping (`% O₂` vs. `Pressure psi` & `Burn Time s`), partial-gravity (`1/6g` Moon / `3/8g` Mars) bounding, grounded SI Copilot, and 1-click normalized CSV export for predictive CFD/ML modeling.
2. **Student & Public Interactive Lab:** Real-time SVG flame physics simulator (comparing Earth `1g` buoyant teardrop flames against `0g` spherical diffusion flames and high-O₂ lunar cabin flames), scroll-reactive cosmic canvas, and Space-to-Earth spin-off gallery.

**ES:** **Flame in Freefall Explorer** es una plataforma analítica impulsada por Superinteligencia (SI) que estandariza, clasifica, compara e interpreta **746 ensayos experimentales reales** del repositorio **PSI de la NASA** junto con **28 reportes técnicos oficiales de NASA NTRS**. Cuenta con dos experiencias diseñadas a medida: **Modo Ingeniero / Investigador** (telemetría, brechas experimentales lunares y exportación CSV para modelado predictivo) y **Modo Estudiante / Público General** (simulador visual interactivo de la física de la llama y aplicaciones directas en la Tierra, como minería y bomberos).

---

## ⚡ Quick Start for Judges (Run Locally in 60 Seconds)

> **💡 Works With OR Without an API Key!**  
> If you run this project locally **without** a `GEMINI_API_KEY`, the application **will still work 100% out-of-the-box**! The `/api/copilot` route automatically falls back to our built-in **Deterministic PSI/NTRS Synthesis Engine (`PSI-Analytical-Engine`)**, while all rankings, 746-point charts, and CSV exports run natively.

```bash
# 1. Clone the repository
git clone https://github.com/Gabriel-F-13/web.git
cd web

# 2. Install dependencies
npm install

# 3. (Optional) Enable live Gemini 2.5 Flash LLM synthesis
# Create a .env.local file in the root folder and add your free Google AI Studio key:
# GEMINI_API_KEY=your_api_key_here

# 4. Start the development server
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🏆 Alignment with NASA Space Apps Judging Criteria

| Criterion | How Our Solution Delivers |
| :--- | :--- |
| **1. Validity (Validez Científica)** | Built on **746 real experimental runs** standardized into canonical physical units (`% vol O₂`, `psi`, `cm/s`, `s`, `ΔCO ppm`). Ranking is **100% deterministic (0 hallucination)**: a transparent 100-point weighted mathematical model over real experimental envelopes. |
| **2. Relevance (Relevancia)** | Directly addresses the **Artemis Lunar Base & Pressurized Rover dilemma (`≥30% O₂, ≤10.2 psi`)**, the **lack of partial-gravity (`1/6g`) data in PSI**, the 3 NASA fire safety pillars (*Prevention, Detection, Suppression*), and **Earth spin-offs**. |
| **3. Impact (Impacto)** | Serves both **Aerospace Engineers / Researchers** (accelerating literature/data synthesis from weeks to seconds + exporting clean modeling CSVs) and **Students / General Public** (bilingual ES/EN interactive physics lab). |
| **4. Creativity (Creatividad)** | Combines quantitative PSI tables with semantic NASA NTRS literature, features a **Dual-Lens UX** (Aerospace Blueprint vs. Interactive Cosmic Flame Lab), and uses `SAFFIRE-II` parallel `0g/1g` columns to bound lunar partial gravity. |
| **5. Presentation (Presentación)** | High-contrast daylight-ready instrumentation for engineering projection and interactive visual storytelling for public outreach, with instant `🇲🇽 ES` / `🇺🇸 EN` switching. |

---

## 🔬 Key Scientific Findings Uncovered by Our Pipeline

1. **The Lunar Solid-Flammability Gap (`≥30% O₂, ≤10.2 psi`):**
   * Across the 746 normalized runs from the 5 foundational PSI datasets analyzed, **0 out of 144 solid-material tests** (`BASS-II` inside the ISS Microgravity Science Glovebox and `SAFFIRE-II` aboard Cygnus) exceeded **22.2% O₂**, as they operated at or below nominal ISS cabin oxygen via `N₂` dilution.
   * Within this core sample, only experiments conducted inside the sealed **Combustion Integrated Rack (CIR)**—specifically **`FLEX-2`** (liquid droplets up to **30% O₂** and down to **7.3 psi**) and **`ACME CFI-G`** (gaseous fuels up to **85% O₂**)—penetrate the high-oxygen lunar exploration regime.
2. **Empirical Partial-Gravity Bounding (`0g ↔ 1/6g ↔ 1g`):**
   * Because PSI currently lacks direct lunar (`1/6g`) combustion datasets (awaiting future *LUCI* and *FM2* experiments), our engine highlights **`SAFFIRE-II` (`PSI-99`)**, which contains parallel `0g` and `1g` burn-length measurements on identical polymer geometries, providing empirical lower and upper bounds.

---

## 📚 Official NASA Open Data Sources & DOIs Used

All datasets are pre-processed via our Python ETL pipeline (`pandas`) and stored in `src/data/` with full DOI traceability:

| PSI ID | Investigation | Official NASA DOI | Pillar | Fuel Phase | Hardware | Runs Analyzed | Empirical O₂ & Pressure Envelope |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **PSI-25** | **BASS-II** (*Burning and Suppression of Solids - II*) | `10.60555/4qc4-de67` | Prevention & Suppression | Solid (PMMA, Sibal, Nomex) | ISS MSG + SPICE Flow Duct | 129 | `13.6% – 22.2% O₂` \| `14.7 psi` |
| **PSI-99** | **SAFFIRE-II** (*Spacecraft Fire Experiment - II*) | `10.60555/2chp-m469` | Prevention (Vehicle-Scale) | Solid (Silicone, Sibal, PMMA) | Cygnus Cargo Spacecraft | 15 | `21.5% – 22.1% O₂` \| `14.7 psi` (with `0g` vs `1g` baselines) |
| **PSI-101** | **SAME-R** (*Smoke Aerosol Measurement Experiment - Reflight*) | `10.60555/2np7-jv14` | Detection | Aerosol / Smoke (Kapton, Pyrell, Teflon) | ISS Express Rack / M-pass & DustTrak | 109 | `21.0% O₂` \| `14.7 psi` (`Rt/R0` particle aging) |
| **PSI-68** | **FLEX-2** (*Flame Extinguishment Experiment - 2*) | `10.60555/byp8-h018` | Suppression & Cool Flames | Liquid Droplets (Alkanes) | ISS CIR / MDCA | 160 | `17.0% – 30.0% O₂` \| `7.3 – 44.1 psi` |
| **PSI-159** | **ACME CFI-G** (*Cool Flames Investigation with Gases*) | `10.60555/cyt1-kh64` | Prevention & Extreme O₂ | Gas (Ethane, Propane, Butane) | ISS CIR / ACME Spherical Burner | 333 | `12.0% – 85.0% O₂` \| `7.2 – 48.0 psi` |

* **Additional NASA API Used:** **NASA Technical Reports Server (NTRS) Public API** (`https://ntrs.nasa.gov/api/citations/search`) — 28 peer-reviewed NASA Glenn Research Center reports dynamically linked to each investigation.

---

## 🤖 AI / SI Usage & Transparency Disclosure
In compliance with NASA Space Apps Challenge guidelines:
* **In-App SI Engine:** Uses **Google Gemini (`gemini-2.5-flash` / `gemini-2.0-flash` via `@google/genai`)** strictly grounded in the normalized JSON statistics of the 5 PSI datasets and 28 NTRS abstracts, paired with a deterministic local synthesis fallback (`PSI-Analytical-Engine`) to guarantee zero hallucination and 100% uptime.
* **Development Assistance:** AI coding and analytical assistants were used during the hackathon to accelerate ETL schema normalization, bilingual translation (`ES/EN`), and UI component scaffolding.

