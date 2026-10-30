# Interactive Water Wave Interference Simulation Laboratory

A university-level, interactive educational physics simulation laboratory for exploring water wave mechanics, wave superposition, phase relationships, path differences, and hyperbolic nodal/antinodal lines in real time across 2D ripple tank and 3D surface visualizations.

---

## 1. Project Overview & Features

### 🔬 Accurate Physics & Mathematical Engine
- **Continuous Wave Superposition**: Computes real-time scalar displacements using the linear wave superposition principle:
  $$y(\mathbf{r}, t) = \sum_{i} y_i(\mathbf{r}, t) = \sum_{i} A_i \sin(k r_i - \omega t + \phi_i)$$
- **Rigorous Kinematic Relationships**: Dynamically preserves:
  $$v = f \lambda, \quad \omega = 2\pi f, \quad k = \frac{2\pi}{\lambda}, \quad T = \frac{1}{f}$$
- **Analytical Interference Conditions**:
  - **Constructive Interference (Antinodal lines)**:
    $$\Delta \Phi = 2m\pi \iff \Delta r = \left(m - \frac{\Delta\phi_0}{2\pi}\right)\lambda$$
  - **Destructive Interference (Nodal lines)**:
    $$\Delta \Phi = (2m+1)\pi \iff \Delta r = \left(m + \frac{1}{2} - \frac{\Delta\phi_0}{2\pi}\right)\lambda$$
  - **Theoretical Resultant Amplitude**:
    $$A_{\text{res}} = \sqrt{A_1^2 + A_2^2 + 2 A_1 A_2 \cos(\Delta\Phi)}$$
- **Analytical Confocal Hyperbolas**: Generates real-time hyperbolic branches $\frac{x^2}{a^2} - \frac{y^2}{b^2} = 1$ dynamically matching the exact source positions and wavelength.

---

### 🌊 2D Ripple Tank Visualization
- High-performance GPU WebGL fragment shader simulation rendering up to thousands of spatial points at 60 FPS with automatic Canvas 2D fallback.
- Draggable wave source pins ($S_1$, $S_2$, $\dots$) with coordinates and phase tags.
- Circular wavefront rings, crest highlights, and trough visualization.
- Toggleable golden dashed nodal curves and cyan antinodal curves.
- Path length rays connecting sources directly to the interactive measurement probe.

### 🌐 3D Water Surface Visualization (Three.js)
- 3D horizontal water surface mesh ($120 \times 120$ vertices) dynamically deformed according to instantaneous surface displacement $y(x, y, t)$.
- Three.js `OrbitControls` for orbital rotation, pitch, tilt, and zoom.
- Dipping mechanical plungers oscillating in real time at the source coordinates in sync with phase and frequency.
- Dynamic floating sensor buoy riding the surface at the user's probe position.
- Wireframe toggle and camera reset controls.

### 📊 Real-Time Waveform Oscilloscope
- Live displacement-versus-time graph $y(t)$ tracking:
  - Wave 1 component ($y_1(t)$ in neon cyan)
  - Wave 2 component ($y_2(t)$ in neon amber)
  - Resultant superposition ($y(t)$ in bold aqua-white)
- Time cursor tracking with hover point inspection tooltip.
- Time window selector (2s, 4s, 8s) and freeze/resume buffer control.

### 🎯 Interactive Measurement Probe & Math Solver
- Click or tap anywhere in the 2D basin to place the probe.
- Live readouts of:
  1. Distance from Source 1 ($r_1$)
  2. Distance from Source 2 ($r_2$)
  3. Path Difference ($\Delta r$)
  4. Phase Difference ($\Delta\Phi$) in radians and degrees
  5. Individual Displacements ($y_1, y_2$)
  6. Resultant Displacement ($y$)
  7. Theoretical Amplitude ($A_{\text{res}}$)
  8. Quantitative interference classification (Antinode $m$, Node $m$, intermediate)
- KaTeX-formatted step-by-step mathematical substitution cards showing live calculations.

### 🧪 Virtual Physics Laboratory
- Predefined experimental protocols:
  1. *Experiment 1: Constructive vs Destructive Path Difference*
  2. *Experiment 2: Source Separation & Nodal Hyperbolas ($d / \lambda$)*
  3. *Experiment 3: Anti-Phase Sources ($\Delta\phi_0 = 180^\circ$ central cancellation)*
  4. *Experiment 4: Dispersion Relation Verification ($v = f\lambda$)*
  5. *Experiment 5: Multi-Source Linear Array (Phased Array)*
- "Record Current Point" logging button into a scientific data table.
- One-click CSV export (`.csv`) for student laboratory report submission.

### 🔊 Acoustic Sonification (Web Audio API)
- Real-time auditory synthesis using Web Audio API: volume automatically tracks the interference amplitude $A_{\text{res}}$ at the probe, allowing students to *hear* constructive reinforcement and destructive silence!

### 📚 University Educational Guide
- Comprehensive interactive lecture series with KaTeX formulas, physical derivations, and one-click "Load Live Demonstration" buttons.

---

## 2. Project Folder Structure

```
water-wave-lab/
├── index.html               # Main laboratory application entry point
├── README.md                # Comprehensive documentation & deployment guide
├── test_simulation.py       # Python unit tests for physical math models
├── css/
│   └── style.css            # Dark scientific UI theme, responsive layout
└── js/
    ├── physics.js           # Wave mathematics, superposition & hyperbola engine
    ├── renderer2d.js        # WebGL / Canvas 2D ripple tank renderer
    ├── renderer3d.js        # Three.js 3D water surface, plungers & buoy
    ├── probe.js             # Interactive probe measurement & math solver
    ├── oscilloscope.js      # Real-time displacement-time oscilloscope graph
    ├── laboratory.js        # Virtual experiment protocols, table & CSV export
    ├── education.js         # University-level educational modules & demos
    ├── audio.js             # Web Audio API interference sonification
    └── app.js               # Main orchestrator, UI binding & 60 FPS loop
```

---

## 3. Installation & Local Development

### System Requirements
- Any modern web browser supporting WebGL (Chrome, Edge, Firefox, Safari, Opera).
- Python 3.x (optional, for local HTTP serving).
- No Node.js or build compilation required; pure modern standards-compliant ES architecture!

### Running Locally with Python
Navigate to the project directory and start a local HTTP server:

```powershell
cd "c:\Users\LEE68\OneDrive\line bot\water-wave-lab"
python -m http.server 8080
```

Now open your web browser and visit:
```
http://localhost:8080/
```

### Direct Browser Opening
You can also directly double-click or drag `index.html` into any web browser.

---

## 4. Running the Automated Physics Unit Tests

To verify all physical equations, dispersion relation, interference conditions, and superposition linearity:

```powershell
python "water-wave-lab\test_simulation.py"
```

Expected output:
```
.....
----------------------------------------------------------------------
Ran 5 tests in 0.000s

OK
```

---

## 5. Online Deployment Instructions

### Deploying to GitHub Pages
1. Push the `water-wave-lab` folder (or the repository containing it) to GitHub:
   ```bash
   git add water-wave-lab/
   git commit -m "Add Interactive Water Wave Interference Simulation Laboratory"
   git push origin main
   ```
2. In your GitHub repository, navigate to **Settings** > **Pages**.
3. Under **Build and deployment**, select **Source: Deploy from a branch**.
4. Select `main` branch and `/ (root)` or `/water-wave-lab` folder.
5. Click **Save**. Your laboratory will be live worldwide in seconds at `https://<username>.github.io/<repo>/`.

### Deploying to Vercel / Netlify
1. Connect your repository to Vercel or Netlify.
2. Set Root Directory to `water-wave-lab`.
3. Set Build Command to empty (static site).
4. Deploy!

---

## 6. Mathematical Equations Reference

| Physical Concept | Formula | Description |
| :--- | :--- | :--- |
| **Dispersion Relation** | $v = f \lambda = \frac{\omega}{k}$ | Phase velocity relating frequency and wavelength |
| **Angular Frequency** | $\omega = 2\pi f$ | Temporal oscillation rate in rad/s |
| **Wave Number** | $k = \frac{2\pi}{\lambda}$ | Spatial phase variation rate in rad/m |
| **Harmonic Wave** | $y_i = A_i \sin(k r_i - \omega t + \phi_i)$ | Circular wave from source $i$ |
| **Wave Superposition** | $y = \sum_{i} y_i$ | Linear addition of field displacements |
| **Path Difference** | $\Delta r = \vert r_1 - r_2 \vert$ | Geometric distance difference from two sources |
| **Total Phase Difference** | $\Delta\Phi = k \Delta r + \Delta\phi_0$ | Combined spatial and temporal phase difference |
| **Constructive Condition** | $\Delta r = \left(m - \frac{\Delta\phi_0}{2\pi}\right)\lambda$ | Antinodal points of maximum oscillation ($2A$) |
| **Destructive Condition** | $\Delta r = \left(m + \frac{1}{2} - \frac{\Delta\phi_0}{2\pi}\right)\lambda$ | Nodal points of complete wave cancellation ($0$) |
| **Hyperbolic Geometry** | $\frac{x^2}{a^2} - \frac{y^2}{b^2} = 1$ | Analytical locus of constant path difference curves |
