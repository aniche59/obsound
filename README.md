# ObSound — Underground Micro-Genre Discovery Platform
## Web Technology — Practical No. 3 Submission (ReactJS, Client-Side Validation & Graph Interactivity)

---

## 1. Problem Statement
Commercial streaming algorithms (Spotify, Apple Music) push the same repetitive top-40 hits into auto-play loops based on corporate pay-for-placement. Independent artists, niche scenes, and obscure micro-genres (*HexD*, *Mallsoft*, *Dungeon Synth*, *Shoegaze*, *Deconstructed Club*, *Chiptune*) are routinely obscured.

**ObSound** is a graph-based music discovery platform and crate-digging ecosystem. It replaces closed commercial algorithms with **interactive 2D physics graphs**, connecting acoustic vectors, harmonic keys, and human crate digging.

---

## 2. Integrated Assignment Capabilities

### From Assignment 1 (HTML/CSS & Responsive Design):
* Responsive landing page (`public/index.html`) with header, hero section, philosophy features grid, micro-genre gateways, and collapsible FAQ section.
* Authentic custom CSS design system with Outfit and Space Grotesk typography, glassmorphism, and responsive layout.

### From Assignment 2 (JSON & Array Data Handling):
* Data is stored dynamically using JavaScript Arrays and JSON objects.
* One-click Crate export to `.json` file (`Blob` download) and file import with `JSON.parse()` error handling.
* Crate library table view (`public/crate.html`) with live search, sorting, and track management.

### For Assignment 3 (ReactJS Component & Client-Side Validation):
* **React 18 Component Integration**:
  * An interactive **React Form Validator Modal** (`public/react-node-injector.js`) mounted in `public/app.html` via `+ Submit Node (React)`.
  * A dedicated **React Studio** page (`public/react-studio.html`).
* **Client-Side Form Validation**:
  * Controlled inputs: Track Title, Artist, Micro-Genre, BPM, Release Year, Audio Stream URL, and Tags.
  * Granular validation: Checks length boundaries (2-60 chars for title), numeric ranges (40-260 BPM, 1970-2026 for year), URL regex pattern, and duplicate track detection.
  * Displays specific, meaningful error messages below invalid fields with red borders (`.is-invalid`) and green borders on valid fields (`.is-valid`).
  * Master alert banner summarizing failed validation rules.
  * On valid submission: Commits to React state, updates the Crate Array, and **immediately injects the newly created node into the live 2D force-directed physics graph canvas**!
  * Helper buttons: "Quick Fill Valid Data" and "Test Error Validation" for instant evaluation.

### Core ObSound Interactive Features:
* **2D Physics Graph Canvas (`public/graph.js`)**: Interactive force-directed graph with drag-to-pan, scroll-to-zoom, node drag, and clickable nodes.
* **Sticky Bottom Audio Player (`public/player.js`)**: Real-time canvas frequency visualizer, timeline scrub slider, volume controls, and Web Audio API tone synthesis.
* **My Crate Drawer (`public/crate.js`)**: Real-time bookmarking and JSON export.

---

## 3. How to Run Locally

1. **Directly in Browser:**
   - Double-click `public/index.html` (Landing Page) or `public/app.html` (Graph Explorer) or `public/react-studio.html` (React Studio).
2. **Using VS Code Live Server:**
   - Right-click `public/index.html` &rarr; **"Open with Live Server"**.
3. **Using Node Gateway Server:**
   - Run `node server.js` in terminal &rarr; Open `http://localhost:3000`.

---

## 4. GitHub Pages Deployment Instructions

To deploy this project to **GitHub Pages** and get your public submission link:

1. **Initialize Git & Commit:**
   ```bash
   cd obsound
   git init
   git add .
   git commit -m "Deploy ObSound ReactJS Web Application"
   ```

2. **Push to Your GitHub Account:**
   - Go to [https://github.com/new](https://github.com/new) and create a new repository named `obsound`.
   - Run the commands shown on GitHub:
     ```bash
     git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/obsound.git
     git branch -M main
     git push -u origin main
     ```

3. **Enable GitHub Pages:**
   - In your GitHub repository, click **Settings** &rarr; **Pages** (on the left menu).
   - Under **Build and deployment** &rarr; **Branch**, select `main` and folder `/ (root)`.
   - Click **Save**.

4. **Your Live Deployment Link:**
   Within 1 to 2 minutes, your live site will be available at:
   ```
   https://<YOUR_GITHUB_USERNAME>.github.io/obsound/
   ```
   Submit this URL for Assignment 3!
