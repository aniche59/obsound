# Web Technology Lab — Practical No. 3
## ReactJS Web Application with Client-Side Validation & Interactive Functionality

---

### **Project Information**
* **Project Title:** ObSound — Underground Micro-Genre & Sonic Discovery Platform
* **Course:** Web Technology Laboratory
* **Student GitHub Username:** `aniche59`
* **Assignment Rubric Focus:** ReactJS components, client-side input validation, error/success messaging, interactive state handling, and live deployment.

---

## 🌐 Live Deployment Links

| Resource | Link |
| :--- | :--- |
| 🚀 **Live GitHub Pages Deployment** | [https://aniche59.github.io/obsound/](https://aniche59.github.io/obsound/) |
| 📦 **GitHub Source Repository** | [https://github.com/aniche59/obsound](https://github.com/aniche59/obsound) |
| ⚛️ **Direct React Studio Route** | [https://aniche59.github.io/obsound/public/react-studio.html](https://aniche59.github.io/obsound/public/react-studio.html) |
| 🗺️ **Interactive 2D Physics Graph** | [https://aniche59.github.io/obsound/public/app.html](https://aniche59.github.io/obsound/public/app.html) |
| 📁 **Crate Digging Library (JSON CRUD)** | [https://aniche59.github.io/obsound/public/crate.html](https://aniche59.github.io/obsound/public/crate.html) |

---

## 1. Problem Statement & Real-World Concept

Commercial music streaming services (such as Spotify and Apple Music) rely on corporate engagement algorithms that repeatedly recycle the same mainstream Top-40 tracks into auto-play loops. Independent artists, niche DIY scenes, and underground micro-genres (*HexD*, *Mallsoft*, *Dungeon Synth*, *Shoegaze*, *Deconstructed Club*, *Chiptune*, *Darkwave*) are routinely obscured.

**ObSound** is a graph-based crate-digging ecosystem that replaces closed commercial algorithms with **an interactive 2D physics graph** connecting acoustic vectors, harmonic keys, and human crate curation. Built as an interactive web application powered by **ReactJS**, ObSound allows users to explore micro-genre relationships, catalog discoveries into a digital crate, listen to generated audio frequency previews, and submit newly discovered underground audio nodes using a **strict client-side validation engine** that immediately injects verified tracks into the live physics simulation.

---

## 2. Curriculum Synthesis (Integrating Practicals 1 through 7)

This project synthesizes the core competencies of the entire Web Technology laboratory curriculum:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                             ObSound Full-Stack Audio Platform                                    │
├──────────────────────────────┬──────────────────────────────┬────────────────────────────────────┤
│ Practical 1: HTML5 & CSS3    │ Practical 2: JS & JSON       │ Practical 3: ReactJS               │
├──────────────────────────────┼──────────────────────────────┼────────────────────────────────────┤
│ • Semantic HTML5 layout      │ • Array data structures      │ • React 18 component tree          │
│ • Custom CSS3 design tokens  │ • JSON serialization (CRUD)  │ • Controlled form state            │
│ • Responsive grid & flexbox  │ • Crate management table     │ • Client-side form validation      │
│ • Glassmorphism & animations │ • LocalStorage persistence   │ • Dynamic 2D graph node inject     │
├──────────────────────────────┼──────────────────────────────┼────────────────────────────────────┤
│ Practical 4: NodeJS Server   │ Practical 5: ExpressJS       │ Practical 6: RESTful API & Mongo   │
├──────────────────────────────┼──────────────────────────────┼────────────────────────────────────┤
│ • Pure NodeJS HTTP server    │ • Express web framework      │ • REST CRUD (/api/v1/tracks)       │
│ • Modular validator.js       │ • Middleware pipeline        │ • Status codes (200, 201, 400, 404)│
│ • Server-side validation     │ • Curator route handling     │ • Postman test suite collection    │
│ • HTTP 400/201 status codes  │ • Central error middleware   │ • MongoDB & Mongoose NoSQL store   │
└──────────────────────────────┴──────────────────────────────┴────────────────────────────────────┘
```

* **Practical No. 1 (Responsive Design & UI Structure):**
  * Responsive multi-section layout (`public/index.html`) featuring an app header, hero section, philosophy features grid, micro-genre gateway pills, and an accordion FAQ.
  * Modern custom CSS styling with dark/light themes, Outfit and Space Grotesk typography, glassmorphism, and responsive breakpoints.
* **Practical No. 2 (JavaScript Arrays & JSON Handling):**
  * Underground track catalog stored dynamically in JavaScript arrays and structured JSON objects.
  * Dedicated Crate Library view (`public/crate.html`) with live search, micro-genre folder filtering, and one-click JSON file export (`Blob` download).
* **Practical No. 3 (ReactJS & Client-Side Validation):**
  * Interactive **React Form Validator Modal** (`public/react-node-injector.js`) mounted into the live 2D graph explorer.
  * Standalone **React Studio** view (`public/react-studio.html`) with live state inspection, CRUD table, and raw JSON preview.
* **Practical No. 4 (Server-Side Validation using NodeJS):**
  * Native Node.js HTTP server (`assignment4/server.js`) with request body stream buffer, modular validator (`validator.js`), storage layer (`storage.js`), and strict HTTP 400/201 error reporting.
* **Practical No. 5 (Web Application Framework: ExpressJS):**
  * ExpressJS web application (`assignment5/server.js`) with custom validation middleware (`validateCuratorSubmission`), routing, request body parsing, and centralized error handling.
* **Practical No. 6 (RESTful API with Database & Postman):**
  * Complete RESTful API (`assignment6/server.js`) implementing all CRUD operations on `/api/v1/tracks` with query filtering, file database persistence, and Postman Collection suite (`ObSound_REST_API.postman_collection.json`).
* **Practical No. 7 (NoSQL Database: MongoDB & Mongoose):**
  * MongoDB document database application (`assignment7/server.js`) with Mongoose ODM modeling, strict schema validation, 24-character BSON ObjectIds, CRUD queries (`find`, `create`, `findByIdAndUpdate`, `findByIdAndDelete`), and Postman test verification.

---

## 3. Teacher's Evaluation & Testing Walkthrough

Follow these step-by-step instructions to test and grade every requirement of Practical No. 3:

### Step 1: Open the Application
* **Online:** Visit the live deployment URL at [https://aniche59.github.io/obsound/](https://aniche59.github.io/obsound/)
* **Offline / Local:** Open `public/index.html` or `public/app.html` directly in any web browser.

---

### Step 2: Test Client-Side Form Validation (Invalid Inputs & Error Messages)
1. Navigate to **Explore Graph** (`public/app.html`) or **React Studio** (`public/react-studio.html`).
2. Click the orange **`+ Submit Node (React)`** button in the header or the left panel.
3. Click the **"Test Error Validation"** helper button (or click *"Validate & Inject Track"* with empty inputs).
4. **Observe the evaluation outcomes:**
   * An **Error Alert Banner** appears at the top summarizing the failed validation criteria.
   * Every invalid input field receives a distinct red border (`.is-invalid`).
   * **Specific, meaningful error messages** are displayed directly below each invalid field:
     * **Track Title:** *"Track title is required (min 2, max 60 chars)."*
     * **Artist Alias:** *"Artist moniker or band alias is required (min 2, max 50 chars)."*
     * **Micro-Genre:** *"Please select a valid micro-genre from the list."*
     * **BPM (Tempo):** *"BPM must fall within the range 40 to 260."*
     * **Release Year:** *"Release year must be between 1970 and current calendar year (2026)."*
     * **Audio Stream URL:** *"Please enter a valid URL (e.g. https://artist.bandcamp.com)."*
     * **Sonic Tags:** *"Provide at least one sonic tag or keyword."*

---

### Step 3: Test Duplicate Detection Validation
1. In the modal, enter a track that already exists in the graph database (e.g., Title: `Resonance`, Artist: `HOME`).
2. Notice the real-time duplicate check triggers:
   * *"A track with this title and artist already exists in the graph database!"*
   * Form submission is blocked until unique metadata is provided.

---

### Step 4: Test Valid Input Submission & Dynamic Graph Node Injection
1. Click the **"Quick Fill Valid Data"** button to auto-populate the form with valid underground track data (e.g. *"Midnight City Glitch"* by *"Neon Phantom"*).
2. Observe all inputs immediately transition to valid state with green borders (`.is-valid`).
3. Click **"Validate & Inject Track"**.
4. **Observe the interactive confirmation & live simulation:**
   * A success alert confirms: *"Success! Midnight City Glitch by Neon Phantom validated and injected into the live graph!"*
   * The React modal closes and dispatches an `obsound:injectTrack` custom event.
   * **A brand-new glowing node appears live in the 2D Physics Canvas Graph!**
   * Physics spring connections automatically link the new track to its corresponding micro-genre cluster.
   * The camera smoothly pans to center the newly injected node, and synthetic audio tone playback begins automatically!

---

### Step 5: Test Interactive Features
1. **Interactive 2D Physics Graph (`public/graph.js`):**
   * **Pan:** Click and drag the background canvas to pan around the graph space.
   * **Zoom:** Scroll the mouse wheel up or down to zoom in and out.
   * **Inspect:** Click any track node to slide open the right details inspector showing artwork, BPM, tags, and bio.
   * **Physics Drag:** Click and hold any node to drag it around; observe Hooke's law spring physics pulling linked nodes along.
2. **Sticky Bottom Audio Player (`public/player.js`):**
   * Click Play/Pause on the bottom transport bar.
   * Observe the **real-time 16-bar frequency spectrum visualizer** reacting in canvas.
   * Drag the timeline scrubber slider and adjust volume controls.
3. **Crate Digging & JSON Export (`public/crate.html`):**
   * Click **"+ Add to Crate"** on any track node to bookmark it.
   * Click the crate icon 📁 in the header to open the crate drawer.
   * Navigate to the **Library** page (`public/crate.html`) to view the complete catalog table and click **"Export Crate (.JSON)"** to download the crate as a JSON file.

---

## 4. How to Run Locally

### Method A: Direct Browser Launch (Zero Installation)
No Node.js or build steps required. The application loads React 18, ReactDOM, and Babel Standalone via CDN:
1. Extract `obsound.zip` (or `assignment3.zip`).
2. Double-click `index.html` (or `public/index.html`) to launch in Google Chrome, Microsoft Edge, or Mozilla Firefox.

### Method B: VS Code Live Server
1. Open the project folder in **Visual Studio Code**.
2. Right-click `index.html` &rarr; click **"Open with Live Server"**.
3. Access the web app at `http://127.0.0.1:5500`.

### Method C: Node.js Express Gateway
1. Open terminal in the project directory:
   ```bash
   node server.js
   ```
2. Open your browser and navigate to `http://localhost:3000`.

---

## 5. GitHub Pages Deployment Instructions

This application is deployed and hosted using **GitHub Pages**. To replicate or verify the deployment:

1. **GitHub Repository Creation:**
   * Repository Name: `obsound`
   * Visibility: Public
   * Owner: `aniche59`
   * URL: `https://github.com/aniche59/obsound`

2. **Git Commands Executed:**
   ```bash
   cd obsound
   git init
   git add .
   git commit -m "Deploy ObSound ReactJS Web Application"
   git branch -M main
   git remote add origin https://github.com/aniche59/obsound.git
   git push -u origin main
   ```

3. **Configuring GitHub Pages:**
   * In GitHub, navigate to **Settings** &rarr; **Pages** (under Code and automation).
   * Under **Build and deployment** &rarr; **Source**: Select `Deploy from a branch`.
   * **Branch**: Select `main` &rarr; Folder: `/ (root)` &rarr; Click **Save**.
   * Root routing is handled by `index.html`, which redirects directly to `public/index.html`.

4. **Live URL:**
   ```
   https://aniche59.github.io/obsound/
   ```

---

## 6. Project File Directory

```
obsound/ (assignment3/)
│
├── index.html                   # Root entry point & GitHub Pages redirector
├── package.json                 # Project manifest & metadata
├── server.js                    # Node.js Express API & static gateway
├── README.md                    # Academic lab report & evaluation manual
│
└── public/                      # Client-side web application bundle
    ├── index.html               # Landing page (Assignment 1 layout & FAQ)
    ├── app.html                 # Main 2D physics graph exploration environment
    ├── react-studio.html        # Dedicated React 18 validation & CRUD studio
    ├── crate.html               # Digging library & JSON catalog management
    ├── react-node-injector.js   # React 18 client-side validation modal component
    ├── app.js                   # State manager & bridge between React and canvas
    ├── graph.js                 # Interactive 2D canvas physics simulation engine
    ├── player.js                # Web Audio API tone synthesizer & canvas visualizer
    ├── crate.js                 # In-memory array CRUD & JSON export/import handlers
    ├── cratePage.js             # Table filtering and sorting engine for crate.html
    ├── mockData.js              # Initial subterranean genre catalog dataset
    ├── api.js                   # Fallback data fetching service
    └── styles.css               # Design system, glassmorphism, & validation CSS
```

---

## 7. Compliance Checklist for Practical No. 3 Rubric

| Requirement | Implementation Detail | Status |
| :--- | :--- | :---: |
| **ReactJS Application** | Built with React 18, functional components, hooks (`useState`, `useEffect`) | ✅ Pass |
| **Accept User Input** | Form with 8 controlled inputs (Title, Artist, Genre, BPM, Year, Intensity, URL, Tags) | ✅ Pass |
| **Client-Side Validation** | Type checking, character length, numeric bounds, URL regex, duplicate detection | ✅ Pass |
| **Meaningful Error Messages** | Specific inline text under each invalid input + summary alert banner | ✅ Pass |
| **Success / Confirmation** | Green input states (`.is-valid`), confirmation alerts, and instant graph injection | ✅ Pass |
| **Interactive User Experience** | Force-directed 2D physics graph, audio spectrum visualizer, JSON export | ✅ Pass |
| **Live Deployment** | Deployed on GitHub Pages at `https://aniche59.github.io/obsound/` | ✅ Pass |
