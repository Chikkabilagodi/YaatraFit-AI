# YaatraFit AI — ಕರ್ನಾಟಕ ಯಾತ್ರೆ

> **An intelligent, budget-guarded Karnataka travel companion powered by Google Gemini, real-time Google Maps routing, and an adaptive recovery engine.**

**Live Application:** https://yaatra-fit-ai.ai.studio

---

## 📌 Problem Statement: Tourism and Travel

Regional tourism across Karnataka's 31 districts is rich and diverse—spanning UNESCO heritage circuits, the Western Ghats biodiversity hotspot, pristine Karavali coastlines, and historic northern forts. However, travelers routinely face critical planning failures:

1. **Fragmented Information:** Travelers are forced to switch between multiple disconnected tools: search engines, static travel blogs, Google Maps, weather apps, expense spreadsheets, and government transport portals.
2. **Hallucinated & Unfeasible Itineraries:** Generic AI chatbots frequently produce physically impossible schedules (e.g., suggesting 6 distant stops in 4 hours, ignoring winding Ghat road speeds, monsoon traffic, and temple/monument curfews).
3. **Mid-Trip Financial Overruns:** Travelers often spend excessively early in a trip on impulse dining and shopping, inadvertently dipping into funds required for vehicle fuel, return KSRTC bus tickets, or unexpected emergencies.
4. **Neglect of Lesser-Known Districts:** Tourism remains heavily clustered in a few saturated hubs (Mysuru, Hampi, Coorg), leaving extraordinary heritage circuits (Bidar, Vijayapura, Badami, Gadag, Uttara Kannada) under-visited.
5. **Linguistic & Accessibility Barriers:** Over 65% of domestic travelers in Karnataka prefer regional language interfaces. Existing planning tools either lack Kannada entirely or rely on garbled auto-translate overlays.

### 💡 The YaatraFit AI Solution
YaatraFit AI solves this by uniting **tourism discovery, deterministic feasibility guardrails, Google Maps navigation, dynamic 3-day weather forecasting, and 5-pillar expense tracking** into a single, cohesive, bilingual web platform.

---

## 🌟 Key Features

### 1. 🗺️ 31-District Interactive Google Maps Explorer
- Full interactive mapping via Google Maps JavaScript API (`@vis.gl/react-google-maps`).
- Real-time multi-stop routing across all 31 districts of Karnataka with live traffic-aware travel times, waypoint reordering, and distance telemetry.
- Curated database of verified monuments, wildlife sanctuaries, beaches, and temples with opening hours and entry fee schedules.

### 2. 🧠 AI Planning with Deterministic Feasibility Guardrails
- Context-aware itinerary generation powered by **Google Gemini 2.5 Flash** based on group type (family, solo, backpackers), pace, and interests.
- Grounded candidate selection: Gemini picks strictly from verified attractions via structured JSON (`responseSchema`). Any hallucinated IDs are eliminated at the API boundary.
- **Physical Feasibility Checking:** Road distances, transit durations, and sunset curfews are mathematically validated before itineraries render.

### 3. 💳 5-Pillar Financial Ledger & Simulated Travel Wallet
- Strictly separates **Planned Trip Budget**, **Simulated Wallet Cash**, **Discretionary Spending Pool**, **Locked Emergency Reserve**, and **Return Transit Guarantee**.
- Adding demo money to the wallet never artificially inflates the planned trip budget.
- Complete transaction ledger with expense categorization, real-time remaining balance, and single-click undo.

### 4. ⛽ Real-World Fuel Math & Public Transit Fare Ceilings
- **Personal Vehicles (Car/Bike):** Calculates fuel consumption using actual road distance, real-world mileage ($16\text{ km/L}$ for cars, $42\text{ km/L}$ for bikes), and fuel rates (₹103/L).
- **Public Transit & Cabs:** Automatically zeroes vehicle mileage assumptions and applies distance-based maximum fare caps (₹2.20/km/person for KSRTC; ₹16/km for cabs), with support for user-defined custom caps.

### 5. ⛅ Hyper-Local 3-Day Climate Forecast & Packing Advisor
- Live 3-day daily weather forecasts powered by the free Open-Meteo API (temperature highs/lows, WMO condition classifications, precipitation probability, peak UV index).
- Generates regional packing checklists tailored to Karnataka microclimates (e.g., leech protection and rain ponchos for Western Ghats; hydration packs for northern Deccan heat; UV protection for Karavali beaches).
- Offline seasonal climate fallback guarantees zero broken UI during network drops.

### 6. 🔄 Adaptive Trip Recovery & "What-If" Simulator
- When delays occur (monsoon rain, Ghat blockages, or overspending), the recovery engine recalculates remaining stops to ensure the traveler returns home before their deadline.
- **Non-Destructive:** Completed stops and recorded wallet expenses are immutable and never erased.
- **What-If Sandbox:** Lets travelers compare scenarios (*"Switch to KSRTC Bus"*, *"Add ₹1,000 spend"*, *"Shave 2 hours"*) side-by-side before committing changes.

### 7. 💬 Ytrika AI Cultural Guide (ಯಾತ್ರಿಕಾ)
- Multi-turn conversational companion equipped with authentic Karnataka cultural, geographical, and culinary knowledge.
- Provides real-time guidance on Ghat road conditions (Charmadi, Agumbe, Shiradi), temple dress codes, and local delicacies (Mylari Dosa, Jolada Rotti, Mangalore Buns).

### 8. 🇮🇳 100% Native Bilingual Parity (English & ಕನ್ನಡ)
- Instant one-tap language switching between English and authentic Kannada across all views, metrics, badges, and alerts.
- Symmetrical i18n dictionaries verified by automated tests.

---

## 🏆 Why YaatraFit AI Stands Out

- **Hybrid Architecture (Deterministic Math + Generative AI):** Uses Gemini for personalization and reasoning, backed by deterministic TypeScript algorithms for distance math, curfews, and budget safety.
- **Protected Return Guarantee:** Ensures travelers never get stranded by locking return travel funds and emergency reserves away from discretionary spending.
- **Resilient Offline Architecture:** Listens for browser online/offline events, maintaining full functionality through local cached state and seasonal weather backups.
- **Verified Engineering Rigor:** Backed by **16 automated unit tests** running natively in ~200ms with 0 TypeScript compiler warnings.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|:---|:---|
| **Frontend Framework** | React 19.0.1, TypeScript 5.7, Vite 8.3 |
| **Styling & UI** | Tailwind CSS v4.3, Motion 12.23 (Framer Motion), Lucide Icons |
| **Smooth Scrolling** | Lenis 1.3.27 |
| **Geospatial & Mapping** | Google Maps Platform (`@vis.gl/react-google-maps` 1.10.1) |
| **AI Engine** | Google Gen AI SDK (`@google/genai` 2.4.0) — Gemini 2.5 Flash |
| **Weather Engine** | Open-Meteo Free Forecast API (WMO Weather Code Mapper) |
| **Backend Proxy** | Node.js Express 4.21.2 + TSX (Port 3000) |
| **State & Persistence** | Browser LocalStorage Engine (Version 1 Schema) |
| **Test Runner** | Node.js Native Test Runner (`node --test`) |

---

## 🚀 Setup & Run Instructions

### Prerequisites
- **Node.js:** `v20.x` or higher
- **npm:** `v10.x` or higher (or `bun`)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/yaatra-fit-ai.git
cd yaatra-fit-ai
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a local `.env` file based on `.env.example`:
```bash
cp .env.example .env
```
Open `.env` and add your Google Gemini API key:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```
*(Note: Google Maps Platform operates out-of-the-box with public demo credentials; you can optionally supply `VITE_GOOGLE_MAPS_API_KEY` for custom production quotas).*

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Run Automated Tests
Execute the 16 automated unit tests validating financial math, wallet transactions, i18n parity, and feasibility guardrails:
```bash
npm test
```

### 6. Type Check & Lint
```bash
npm run lint
```

### 7. Production Build
```bash
npm run build
npm start
```

---

## 🌐 Live Demo & Support

- **Live Application:** https://yaatra-fit-ai.ai.studio
- **24x7 Karnataka Tourism Helpline:** `1800-425-00100`
- **Project Support:** `chikkabilagodu@gmail.com`
