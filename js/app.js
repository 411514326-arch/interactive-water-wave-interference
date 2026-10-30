/**
 * Main Application Controller for Water Wave Interference Simulation Laboratory
 * Coordinates physics engine, 2D/3D renderers, measurement probe, oscilloscope,
 * virtual laboratory, and educational modules.
 */

class SimulationApp {
    constructor() {
        // Instantiate Physics Engine
        this.physics = new WavePhysics();

        // Canvas & DOM elements
        this.canvas2d = document.getElementById('waveCanvas2D');
        this.canvas3dContainer = document.getElementById('container3D');
        this.oscilloscopeCanvas = document.getElementById('oscilloscopeCanvas');

        // Mode: '2d' or '3d'
        this.viewMode = '2d';

        // Renderers & Subsystems
        this.renderer2d = new WaveRenderer2D(this.canvas2d, this.physics);
        this.renderer3d = new WaveRenderer3D(this.canvas3dContainer, this.physics);
        this.probe = new MeasurementProbe('probePanel', this.physics, this.renderer2d);
        this.oscilloscope = new WaveOscilloscope(this.oscilloscopeCanvas, this.physics, this.renderer2d);
        this.laboratory = new PhysicsLaboratory('labTableBody', this.physics, this.probe);
        this.education = new EducationModule('educationContainer', this.physics);
        this.audio = new WaveAudio(this.physics, this.renderer2d);

        // Animation loop state
        this.lastFrameTime = performance.now();
        this.isRunning = true;
        this.fpsCounter = document.getElementById('fpsDisplay');
        this.frameCount = 0;
        this.lastFpsUpdate = performance.now();

        // Initialize UI bindings
        this.initUI();
        this.syncControlsFromPhysics();

        // Listen for physics changes
        this.physics.onChange(() => {
            this.syncControlsFromPhysics();
            this.probe.update();
        });

        // Start animation loop
        this.startLoop();
    }

    initUI() {
        // View Mode Toggle (2D / 3D)
        const btn2D = document.getElementById('btnView2D');
        const btn3D = document.getElementById('btnView3D');
        if (btn2D && btn3D) {
            btn2D.addEventListener('click', () => this.switchViewMode('2d'));
            btn3D.addEventListener('click', () => this.switchViewMode('3d'));
        }

        // Top Navigation Tabs
        document.querySelectorAll('.nav-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = btn.getAttribute('data-tab');
                this.switchMainTab(tab);
            });
        });

        // Transport Controls
        document.getElementById('btnPlayPause')?.addEventListener('click', () => this.togglePlayPause());
        document.getElementById('btnReset')?.addEventListener('click', () => this.resetSimulation());
        document.getElementById('btnStepForward')?.addEventListener('click', () => this.stepForward());
        document.getElementById('btnSpeedDown')?.addEventListener('click', () => this.adjustSpeed(-0.25));
        document.getElementById('btnSpeedUp')?.addEventListener('click', () => this.adjustSpeed(+0.25));

        // Display Feature Checkboxes
        this.bindCheckbox('chkWavefronts', (checked) => { this.renderer2d.showWavefronts = checked; });
        this.bindCheckbox('chkCrests', (checked) => { this.renderer2d.showCrests = checked; });
        this.bindCheckbox('chkTroughs', (checked) => { this.renderer2d.showTroughs = checked; });
        this.bindCheckbox('chkNodalLines', (checked) => { this.renderer2d.showNodalLines = checked; });
        this.bindCheckbox('chkAntinodalLines', (checked) => { this.renderer2d.showAntinodalLines = checked; });
        this.bindCheckbox('chkGrid', (checked) => { this.renderer2d.showGrid = checked; });
        this.bindCheckbox('chkRays', (checked) => { this.renderer2d.showRays = checked; });
        this.bindCheckbox('chkAttenuation', (checked) => { this.physics.setAttenuation(checked); });
        this.bindCheckbox('chkWireframe3D', (checked) => { this.renderer3d.setWireframe(checked); });

        // Wave Mode: Single vs Double vs All
        document.getElementById('selectInterferenceMode')?.addEventListener('change', (e) => {
            const mode = e.target.value;
            if (mode === 'single') {
                this.physics.setSourceEnabled(1, true);
                if (this.physics.sources.length > 1) this.physics.setSourceEnabled(2, false);
            } else if (mode === 'double') {
                this.physics.setSourceEnabled(1, true);
                if (this.physics.sources.length > 1) this.physics.setSourceEnabled(2, true);
            } else if (mode === 'multi') {
                this.physics.sources.forEach(s => s.enabled = true);
            }
        });

        // Sliders & Number inputs
        this.bindSliderAndNumber('sliderWaveSpeed', 'inputWaveSpeed', (v) => this.physics.setWaveSpeed(v));
        this.bindSliderAndNumber('sliderFrequency', 'inputFrequency', (f) => this.physics.setFrequency(f));
        this.bindSliderAndNumber('sliderWavelength', 'inputWavelength', (l) => this.physics.setWavelength(l));
        this.bindSliderAndNumber('sliderAmplitude', 'inputAmplitude', (a) => this.physics.setAmplitude(a));
        this.bindSliderAndNumber('sliderSeparation', 'inputSeparation', (d) => this.physics.setSourceSeparation(d));
        this.bindSliderAndNumber('sliderPhaseDiff', 'inputPhaseDiff', (deg) => this.physics.setPhaseDifference(deg * Math.PI / 180));
        this.bindSliderAndNumber('sliderSimSpeed', 'inputSimSpeed', (s) => this.physics.setSimulationSpeed(s));

        // Source Management Buttons
        document.getElementById('btnAddSource')?.addEventListener('click', () => {
            this.physics.addSource(0, 2.0);
            this.renderSourceCards();
        });

        // Oscilloscope Controls
        document.getElementById('btnFreezeOsc')?.addEventListener('click', (e) => {
            const frozen = this.oscilloscope.toggleFreeze();
            e.currentTarget.classList.toggle('active', frozen);
            e.currentTarget.innerHTML = frozen ? '<i class="fas fa-play"></i> Resume' : '<i class="fas fa-pause"></i> Freeze';
        });

        document.getElementById('selectTimeWindow')?.addEventListener('change', (e) => {
            this.oscilloscope.setTimeWindow(parseFloat(e.target.value));
        });

        // Virtual Lab Controls
        document.getElementById('btnRecordPoint')?.addEventListener('click', () => {
            this.laboratory.recordCurrentMeasurement();
        });

        document.getElementById('btnClearTable')?.addEventListener('click', () => {
            if (confirm('Clear all recorded observation points?')) {
                this.laboratory.clearRecords();
            }
        });

        document.getElementById('btnExportCSV')?.addEventListener('click', () => {
            this.laboratory.exportCSV();
        });

        document.getElementById('selectExperimentPreset')?.addEventListener('change', (e) => {
            if (e.target.value) {
                this.laboratory.loadExperimentPreset(e.target.value);
            }
        });

        // Audio toggle
        document.getElementById('btnAudioToggle')?.addEventListener('click', (e) => {
            const active = this.audio.toggle();
            e.currentTarget.classList.toggle('active', active);
            e.currentTarget.innerHTML = active ? 
                '<i class="fas fa-volume-up"></i> Sound Active' : 
                '<i class="fas fa-volume-mute"></i> Sound Muted';
        });

        // 3D Reset View Button
        document.getElementById('btnResetCamera3D')?.addEventListener('click', () => {
            this.renderer3d.resetCamera();
        });

        // URL Parameters for Direct View & Tab Selection
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('mode') === '3d') {
            this.switchViewMode('3d');
        }
        const initialTab = urlParams.get('tab');
        if (initialTab) {
            this.switchMainTab(initialTab);
        }

        // Resize handler
        window.addEventListener('resize', () => this.handleResize());
        this.handleResize();
    }

    bindCheckbox(id, onChange) {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', (e) => onChange(e.target.checked));
        }
    }

    bindSliderAndNumber(sliderId, numberId, onChange) {
        const slider = document.getElementById(sliderId);
        const number = document.getElementById(numberId);

        if (slider && number) {
            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                number.value = val;
                onChange(val);
            });

            number.addEventListener('change', (e) => {
                const val = parseFloat(e.target.value);
                slider.value = val;
                onChange(val);
            });
        }
    }

    syncControlsFromPhysics() {
        const p = this.physics.params;

        this.setVal('sliderWaveSpeed', 'inputWaveSpeed', p.waveSpeed);
        this.setVal('sliderFrequency', 'inputFrequency', p.frequency);
        this.setVal('sliderWavelength', 'inputWavelength', p.wavelength);
        this.setVal('sliderAmplitude', 'inputAmplitude', p.amplitude);
        this.setVal('sliderSeparation', 'inputSeparation', this.physics.sourceSeparation);
        this.setVal('sliderSimSpeed', 'inputSimSpeed', p.simulationSpeed);

        const phaseDeg = (this.physics.getPhaseDifference() * 180 / Math.PI);
        this.setVal('sliderPhaseDiff', 'inputPhaseDiff', phaseDeg);

        // Display readouts for derived formulas
        const elOmega = document.getElementById('valOmega');
        if (elOmega) elOmega.textContent = `${p.angularFrequency.toFixed(3)} rad/s`;

        const elK = document.getElementById('valK');
        if (elK) elK.textContent = `${p.waveNumber.toFixed(3)} rad/m`;

        const elPeriod = document.getElementById('valPeriod');
        if (elPeriod) elPeriod.textContent = `${(1 / p.frequency).toFixed(3)} s`;

        const elSimTime = document.getElementById('simTimeDisplay');
        if (elSimTime) elSimTime.textContent = `${this.physics.time.toFixed(2)} s`;

        this.renderSourceCards();
    }

    setVal(sliderId, numberId, val) {
        const s = document.getElementById(sliderId);
        const n = document.getElementById(numberId);
        if (s && document.activeElement !== s) s.value = val.toFixed(2);
        if (n && document.activeElement !== n) n.value = val.toFixed(2);
    }

    renderSourceCards() {
        const container = document.getElementById('sourcesList');
        if (!container) return;

        let html = '';
        this.physics.sources.forEach(src => {
            html += `
                <div class="source-card ${src.enabled ? '' : 'disabled'}" style="border-left: 4px solid ${src.color}">
                    <div class="source-card-header">
                        <label class="source-toggle-label">
                            <input type="checkbox" ${src.enabled ? 'checked' : ''} onchange="window.app.toggleSource(${src.id}, this.checked)">
                            <strong>${src.name}</strong>
                        </label>
                        ${this.physics.sources.length > 1 ? `
                            <button class="btn-icon text-danger" title="Remove Source" onclick="window.app.removeSource(${src.id})">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        ` : ''}
                    </div>
                    <div class="source-card-body">
                        <div class="source-row">
                            <span>Position (x, y):</span>
                            <span class="mono">(${src.x.toFixed(2)}, ${src.y.toFixed(2)}) m</span>
                        </div>
                        <div class="source-row">
                            <span>Initial Phase (φ):</span>
                            <div class="phase-stepper">
                                <button class="btn-step" onclick="window.app.adjustSourcePhase(${src.id}, -45)">-45°</button>
                                <span class="mono">${(src.initialPhase * 180 / Math.PI).toFixed(0)}°</span>
                                <button class="btn-step" onclick="window.app.adjustSourcePhase(${src.id}, +45)">+45°</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    toggleSource(id, enabled) {
        this.physics.setSourceEnabled(id, enabled);
    }

    removeSource(id) {
        this.physics.removeSource(id);
    }

    adjustSourcePhase(id, deltaDeg) {
        const src = this.physics.sources.find(s => s.id === id);
        if (src) {
            let deg = (src.initialPhase * 180 / Math.PI) + deltaDeg;
            deg = ((deg % 360) + 360) % 360;
            this.physics.setSourcePhase(id, deg * Math.PI / 180);
        }
    }

    togglePlayPause() {
        this.isRunning = !this.isRunning;
        const btn = document.getElementById('btnPlayPause');
        if (btn) {
            btn.innerHTML = this.isRunning ? 
                '<i class="fas fa-pause"></i> Pause' : 
                '<i class="fas fa-play"></i> Play';
            btn.classList.toggle('btn-warning', !this.isRunning);
            btn.classList.toggle('btn-primary', this.isRunning);
        }
    }

    resetSimulation() {
        this.physics.resetTime();
        this.oscilloscope.history = [];
        this.syncControlsFromPhysics();
        this.probe.update();
    }

    stepForward(dt = 0.05) {
        this.physics.step(dt);
        this.syncControlsFromPhysics();
        this.probe.update();
        this.oscilloscope.update();
    }

    adjustSpeed(delta) {
        const newSpeed = Math.max(0.1, Math.min(3.0, this.physics.params.simulationSpeed + delta));
        this.physics.setSimulationSpeed(newSpeed);
    }

    switchViewMode(mode) {
        this.viewMode = mode;
        const canvas2dWrapper = document.getElementById('canvas2dWrapper');
        const container3dWrapper = document.getElementById('container3dWrapper');
        const btn2D = document.getElementById('btnView2D');
        const btn3D = document.getElementById('btnView3D');
        const labelWireframe = document.getElementById('labelWireframe3D');
        const btnResetCam = document.getElementById('btnResetCamera3D');

        if (mode === '2d') {
            canvas2dWrapper.style.display = 'block';
            container3dWrapper.style.display = 'none';
            btn2D.classList.add('active');
            btn3D.classList.remove('active');
            if (labelWireframe) labelWireframe.style.display = 'none';
            if (btnResetCam) btnResetCam.style.display = 'none';
            this.renderer3d.isEnabled = false;
        } else {
            canvas2dWrapper.style.display = 'none';
            container3dWrapper.style.display = 'block';
            btn2D.classList.remove('active');
            btn3D.classList.add('active');
            if (labelWireframe) labelWireframe.style.display = 'flex';
            if (btnResetCam) btnResetCam.style.display = 'inline-flex';
            this.renderer3d.isEnabled = true;
            this.renderer3d.onWindowResize();
        }
    }

    switchMainTab(tab) {
        document.querySelectorAll('.nav-tab-btn').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-tab') === tab);
        });

        document.querySelectorAll('.tab-page').forEach(page => {
            page.classList.toggle('active', page.id === `tab-${tab}`);
        });

        if (tab === 'simulation') {
            this.handleResize();
        }
    }

    handleResize() {
        const simArea = document.querySelector('.simulation-stage');
        if (!simArea) return;

        const w = simArea.clientWidth;
        const h = simArea.clientHeight;

        if (w > 0 && h > 0) {
            this.renderer2d.resize(w, h);
            this.renderer3d.onWindowResize();
        }

        // Resize oscilloscope canvas
        const oscContainer = document.getElementById('oscWrapper');
        if (oscContainer && this.oscilloscopeCanvas) {
            this.oscilloscopeCanvas.width = oscContainer.clientWidth;
            this.oscilloscopeCanvas.height = oscContainer.clientHeight || 180;
        }
    }

    /**
     * Main Animation Frame Loop
     */
    startLoop() {
        const loop = (currentTime) => {
            const dt = (currentTime - this.lastFrameTime) / 1000;
            this.lastFrameTime = currentTime;

            // Advance simulation physics
            if (this.isRunning) {
                // Limit maximum dt step to avoid instability when switching tabs
                const safeDt = Math.min(dt, 0.1);
                this.physics.step(safeDt);
            }

            // Render active view
            if (this.viewMode === '2d') {
                this.renderer2d.render();
            } else {
                this.renderer3d.update();
            }

            // Update live oscilloscope & probe
            this.oscilloscope.update();
            this.probe.update();
            this.audio.update();

            // FPS Counter
            this.frameCount++;
            if (currentTime - this.lastFpsUpdate >= 1000) {
                if (this.fpsCounter) {
                    this.fpsCounter.textContent = `${this.frameCount} FPS`;
                }
                this.frameCount = 0;
                this.lastFpsUpdate = currentTime;
            }

            // Sync clock
            const simTimeEl = document.getElementById('simTimeDisplay');
            if (simTimeEl) {
                simTimeEl.textContent = `${this.physics.time.toFixed(2)} s`;
            }

            requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
    }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
    window.app = new SimulationApp();
});
