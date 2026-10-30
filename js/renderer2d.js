/**
 * 2D Wave Simulation Renderer
 * High-performance WebGL-based ripple tank with Canvas 2D fallback,
 * featuring analytical nodal/antinodal line overlays, wavefront rings,
 * draggable sources, and interactive measurement probe graphics.
 */

class WaveRenderer2D {
    constructor(canvas, physics) {
        this.canvas = canvas;
        this.physics = physics;
        this.gl = null;
        this.ctx = null;
        this.useWebGL = false;

        // Visual display toggles
        this.showWavefronts = true;
        this.showCrests = true;
        this.showTroughs = true;
        this.showNodalLines = true;
        this.showAntinodalLines = true;
        this.showResultant = true;
        this.showGrid = true;
        this.showRays = true;
        this.colorScheme = 'oceanic'; // 'oceanic', 'thermal', 'monochrome', 'neon'
        this.activeSourceDisplayMode = 'all'; // 'all', 1, 2 (show only source 1 or source 2 or all)

        // Probe state
        this.probePosition = { x: 0.0, y: 1.5 };
        this.onProbeMove = null;

        // Interaction state
        this.draggedSourceId = null;
        this.isDraggingProbe = false;
        this.hoveredItem = null;

        // Initialize graphics context
        this.initContext();
        this.setupEventListeners();
    }

    initContext() {
        const gl = this.canvas.getContext('webgl', { antialias: false, depth: false, preserveDrawingBuffer: true }) ||
                   this.canvas.getContext('experimental-webgl');
        if (gl) {
            this.gl = gl;
            this.useWebGL = true;
            this.initWebGLShaders();
        } else {
            console.warn('WebGL not available, falling back to Canvas 2D');
            this.ctx = this.canvas.getContext('2d');
            this.useWebGL = false;
        }

        // Overlay canvas for vector drawings (ruler, sources, probe, lines)
        this.overlayCanvas = document.createElement('canvas');
        this.overlayCanvas.className = 'vector-overlay';
        this.overlayCtx = this.overlayCanvas.getContext('2d');
        if (this.canvas.parentNode) {
            this.canvas.parentNode.appendChild(this.overlayCanvas);
            this.resizeOverlay();
        }
    }

    resizeOverlay() {
        if (!this.overlayCanvas) return;
        if (!this.overlayCanvas.parentNode && this.canvas.parentNode) {
            this.canvas.parentNode.appendChild(this.overlayCanvas);
        }
        this.overlayCanvas.width = this.canvas.width;
        this.overlayCanvas.height = this.canvas.height;
        this.overlayCanvas.style.position = 'absolute';
        this.overlayCanvas.style.left = '0';
        this.overlayCanvas.style.top = '0';
        this.overlayCanvas.style.pointerEvents = 'none';
        this.overlayCanvas.style.width = '100%';
        this.overlayCanvas.style.height = '100%';
    }

    initWebGLShaders() {
        const gl = this.gl;

        // Vertex shader: Fullscreen quad
        const vsSource = `
            attribute vec2 a_position;
            varying vec2 v_uv;
            void main() {
                v_uv = (a_position + 1.0) * 0.5;
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `;

        // Fragment shader: Physical wave superposition and color rendering
        const fsSource = `
            precision highp float;
            varying vec2 v_uv;

            const int MAX_SOURCES = 8;
            uniform int u_numSources;
            uniform vec2 u_sources[MAX_SOURCES];
            uniform float u_amplitudes[MAX_SOURCES];
            uniform float u_phases[MAX_SOURCES];
            uniform int u_enabled[MAX_SOURCES];

            uniform float u_k;
            uniform float u_omega;
            uniform float u_time;
            uniform float u_domainSize;
            uniform int u_showWavefronts;
            uniform int u_showCrests;
            uniform int u_showTroughs;
            uniform int u_showResultant;
            uniform int u_attenuation;
            uniform int u_activeSourceMode; // -1 for all, 0..N for individual source

            void main() {
                // Coordinate in physical space [-domainSize/2, domainSize/2]
                // In standard cartesian coordinates, bottom is -y, top is +y
                vec2 coord = (v_uv - 0.5) * u_domainSize;

                float totalDisp = 0.0;
                float maxPossibleAmp = 0.0;

                for (int i = 0; i < MAX_SOURCES; i++) {
                    if (i >= u_numSources) break;
                    if (u_enabled[i] == 0) continue;
                    if (u_activeSourceMode >= 0 && u_activeSourceMode != i) continue;

                    vec2 sPos = u_sources[i];
                    float r = distance(coord, sPos);
                    float amp = u_amplitudes[i];

                    if (u_attenuation == 1) {
                        amp = amp / sqrt(max(1.0, r));
                    }

                    float phase = u_k * r - u_omega * u_time + u_phases[i];
                    float disp = amp * sin(phase);

                    totalDisp += disp;
                    maxPossibleAmp += amp;
                }

                if (maxPossibleAmp < 0.001) {
                    gl_FragColor = vec4(0.04, 0.07, 0.12, 1.0);
                    return;
                }

                // Normalized displacement in [-1.0, 1.0]
                float normDisp = totalDisp / maxPossibleAmp;

                // Scientifically accurate color palette mapping:
                // Peak Crests (+A to +2A): Cyan to Pure White
                // Equilibrium (0): Calm oceanic navy
                // Deep Troughs (-A to -2A): Deep indigo to royal blue
                vec3 troughColor = vec3(0.04, 0.07, 0.28);   // Deep indigo blue
                vec3 zeroColor   = vec3(0.02, 0.04, 0.08);   // Calm dark navy
                vec3 crestColor  = vec3(0.0, 0.85, 0.95);    // Bright electric cyan
                vec3 peakColor   = vec3(0.95, 1.0, 1.0);     // Specular peak white

                vec3 col;
                if (normDisp >= 0.0) {
                    if (normDisp < 0.7) {
                        col = mix(zeroColor, crestColor, normDisp / 0.7);
                    } else {
                        col = mix(crestColor, peakColor, (normDisp - 0.7) / 0.3);
                    }
                    if (u_showCrests == 0) {
                        col = zeroColor;
                    }
                } else {
                    col = mix(zeroColor, troughColor, clamp(-normDisp, 0.0, 1.0));
                    if (u_showTroughs == 0) {
                        col = zeroColor;
                    }
                }

                // Physical Wavefront crest lines:
                // The physical crest of y = A*sin(phase) strictly occurs at peak sin(phase) == +1.0
                if (u_showWavefronts == 1) {
                    for (int i = 0; i < MAX_SOURCES; i++) {
                        if (i >= u_numSources) break;
                        if (u_enabled[i] == 0) continue;
                        if (u_activeSourceMode >= 0 && u_activeSourceMode != i) continue;

                        float r = distance(coord, u_sources[i]);
                        float ph = u_k * r - u_omega * u_time + u_phases[i];
                        float crestFactor = sin(ph);
                        if (crestFactor > 0.94) {
                            float ringIntensity = smoothstep(0.94, 0.999, crestFactor) * 0.55;
                            col += vec3(0.2, 0.85, 1.0) * ringIntensity;
                        }
                    }
                }

                gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
            }
        `;

        const vertShader = this.createShader(gl.VERTEX_SHADER, vsSource);
        const fragShader = this.createShader(gl.FRAGMENT_SHADER, fsSource);

        const program = gl.createProgram();
        gl.attachShader(program, vertShader);
        gl.attachShader(program, fragShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Shader link error:', gl.getProgramInfoLog(program));
            return;
        }

        this.program = program;

        // Full-screen quad buffer
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1.0, -1.0,
             1.0, -1.0,
            -1.0,  1.0,
            -1.0,  1.0,
             1.0, -1.0,
             1.0,  1.0
        ]), gl.STATIC_DRAW);

        this.positionAttr = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(this.positionAttr);
        gl.vertexAttribPointer(this.positionAttr, 2, gl.FLOAT, false, 0, 0);

        // Uniform locations
        this.uniforms = {
            numSources: gl.getUniformLocation(program, 'u_numSources'),
            sources: gl.getUniformLocation(program, 'u_sources'),
            amplitudes: gl.getUniformLocation(program, 'u_amplitudes'),
            phases: gl.getUniformLocation(program, 'u_phases'),
            enabled: gl.getUniformLocation(program, 'u_enabled'),
            k: gl.getUniformLocation(program, 'u_k'),
            omega: gl.getUniformLocation(program, 'u_omega'),
            time: gl.getUniformLocation(program, 'u_time'),
            domainSize: gl.getUniformLocation(program, 'u_domainSize'),
            showWavefronts: gl.getUniformLocation(program, 'u_showWavefronts'),
            showCrests: gl.getUniformLocation(program, 'u_showCrests'),
            showTroughs: gl.getUniformLocation(program, 'u_showTroughs'),
            showResultant: gl.getUniformLocation(program, 'u_showResultant'),
            attenuation: gl.getUniformLocation(program, 'u_attenuation'),
            activeSourceMode: gl.getUniformLocation(program, 'u_activeSourceMode')
        };
    }

    createShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    /**
     * Convert physical coordinates (m) to pixel coordinates on canvas
     */
    worldToScreen(wx, wy) {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const domain = this.physics.params.domainSize;
        const sx = ((wx + domain / 2) / domain) * w;
        const sy = ((-wy + domain / 2) / domain) * h;
        return { x: sx, y: sy };
    }

    /**
     * Convert screen pixel coordinates to physical coordinates (m)
     */
    screenToWorld(sx, sy) {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const domain = this.physics.params.domainSize;
        const wx = (sx / w) * domain - domain / 2;
        const wy = -((sy / h) * domain - domain / 2);
        return { x: wx, y: wy };
    }

    /**
     * Main 2D Render Loop
     */
    render() {
        if (this.canvas.width <= 0 || this.canvas.height <= 0) return;
        if (this.useWebGL && this.gl) {
            this.renderWebGL();
        } else {
            this.renderCanvas2D();
        }
        this.renderVectorOverlay();
    }

    renderWebGL() {
        const gl = this.gl;
        const p = this.physics.params;
        const sources = this.physics.sources;

        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.useProgram(this.program);

        // Upload uniforms
        gl.uniform1i(this.uniforms.numSources, Math.min(sources.length, 8));

        const sourcePosArray = [];
        const ampArray = [];
        const phaseArray = [];
        const enabledArray = [];

        for (let i = 0; i < 8; i++) {
            if (i < sources.length) {
                sourcePosArray.push(sources[i].x, sources[i].y);
                ampArray.push(sources[i].amplitude);
                phaseArray.push(sources[i].initialPhase);
                enabledArray.push(sources[i].enabled ? 1 : 0);
            } else {
                sourcePosArray.push(0, 0);
                ampArray.push(0);
                phaseArray.push(0);
                enabledArray.push(0);
            }
        }

        gl.uniform2fv(this.uniforms.sources, new Float32Array(sourcePosArray));
        gl.uniform1fv(this.uniforms.amplitudes, new Float32Array(ampArray));
        gl.uniform1fv(this.uniforms.phases, new Float32Array(phaseArray));
        gl.uniform1iv(this.uniforms.enabled, new Int32Array(enabledArray));

        gl.uniform1f(this.uniforms.k, p.waveNumber);
        gl.uniform1f(this.uniforms.omega, p.angularFrequency);
        gl.uniform1f(this.uniforms.time, this.physics.time);
        gl.uniform1f(this.uniforms.domainSize, p.domainSize);

        gl.uniform1i(this.uniforms.showWavefronts, this.showWavefronts ? 1 : 0);
        gl.uniform1i(this.uniforms.showCrests, this.showCrests ? 1 : 0);
        gl.uniform1i(this.uniforms.showTroughs, this.showTroughs ? 1 : 0);
        gl.uniform1i(this.uniforms.showResultant, this.showResultant ? 1 : 0);
        gl.uniform1i(this.uniforms.attenuation, p.attenuation ? 1 : 0);

        let activeModeVal = -1;
        if (this.activeSourceDisplayMode === 1) activeModeVal = 0;
        else if (this.activeSourceDisplayMode === 2) activeModeVal = 1;
        gl.uniform1i(this.uniforms.activeSourceMode, activeModeVal);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    renderCanvas2D() {
        // High-speed CPU fallback renderer
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const imgData = ctx.createImageData(w, h);
        const data = imgData.data;
        const p = this.physics.params;
        const domain = p.domainSize;
        const t = this.physics.time;

        const enabledSources = this.physics.sources.filter(s => s.enabled);
        const numActive = enabledSources.length;
        if (numActive === 0) {
            ctx.fillStyle = '#060a12';
            ctx.fillRect(0, 0, w, h);
            return;
        }

        let ptr = 0;
        for (let py = 0; py < h; py += 2) { // 2x fast sampling
            const wy = -((py / h) * domain - domain / 2);
            for (let px = 0; px < w; px += 2) {
                const wx = (px / w) * domain - domain / 2;

                let disp = 0;
                let maxA = 0;
                for (let s = 0; s < numActive; s++) {
                    const src = enabledSources[s];
                    const dx = wx - src.x;
                    const dy = wy - src.y;
                    const r = Math.sqrt(dx * dx + dy * dy);
                    disp += src.amplitude * Math.sin(p.waveNumber * r - p.angularFrequency * t + src.initialPhase);
                    maxA += src.amplitude;
                }

                const norm = maxA > 0 ? disp / maxA : 0;
                let rVal = 5, gVal = 10, bVal = 20;
                if (norm >= 0) {
                    rVal = Math.floor(norm * 240);
                    gVal = Math.floor(norm * 255);
                    bVal = Math.floor(50 + norm * 205);
                } else {
                    rVal = Math.floor(10 + (-norm) * 20);
                    gVal = Math.floor(15 + (-norm) * 30);
                    bVal = Math.floor(30 + (-norm) * 160);
                }

                // Fill 2x2 block
                for (let dy = 0; dy < 2 && py + dy < h; dy++) {
                    for (let dx = 0; dx < 2 && px + dx < w; dx++) {
                        const idx = ((py + dy) * w + (px + dx)) * 4;
                        data[idx] = rVal;
                        data[idx + 1] = gVal;
                        data[idx + 2] = bVal;
                        data[idx + 3] = 255;
                    }
                }
            }
        }
        ctx.putImageData(imgData, 0, 0);
    }

    /**
     * Render analytical overlays: Nodal lines, Antinodal lines, Sources, Probe, Coordinate axes
     */
    renderVectorOverlay() {
        if (!this.overlayCtx) return;
        const ctx = this.overlayCtx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        // 1. Grid & Axes
        if (this.showGrid) {
            this.drawGridAndAxes(ctx, w, h);
        }

        // 2. Analytical Interference Curves (Hyperbolas)
        const curves = this.physics.getInterferenceCurves(100);

        // Antinodal Lines (Solid Cyan with glow)
        if (this.showAntinodalLines && curves.antinodalCurves.length > 0) {
            ctx.save();
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 2.0;
            ctx.shadowColor = 'rgba(0, 240, 255, 0.6)';
            ctx.shadowBlur = 8;

            curves.antinodalCurves.forEach(curve => {
                this.drawCurve(ctx, curve.points, false);
                // Label m at ends
                if (curve.points.length > 0) {
                    const pt = curve.points[Math.floor(curve.points.length * 0.85)];
                    const screenPt = this.worldToScreen(pt.x, pt.y);
                    ctx.font = '10px monospace';
                    ctx.fillStyle = '#a5f3fc';
                    ctx.fillText(`m=${curve.m}`, screenPt.x + 4, screenPt.y - 4);
                }
            });
            ctx.restore();
        }

        // Nodal Lines (Dashed Golden Amber)
        if (this.showNodalLines && curves.nodalCurves.length > 0) {
            ctx.save();
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2.0;
            ctx.setLineDash([6, 6]);
            ctx.shadowColor = 'rgba(251, 191, 36, 0.6)';
            ctx.shadowBlur = 6;

            curves.nodalCurves.forEach(curve => {
                this.drawCurve(ctx, curve.points, true);
                if (curve.points.length > 0) {
                    const pt = curve.points[Math.floor(curve.points.length * 0.85)];
                    const screenPt = this.worldToScreen(pt.x, pt.y);
                    ctx.font = '10px monospace';
                    ctx.fillStyle = '#fef08a';
                    ctx.fillText(`Node`, screenPt.x + 4, screenPt.y + 12);
                }
            });
            ctx.restore();
        }

        // 3. Ray lines from active sources to probe position
        if (this.showRays) {
            const probeScreen = this.worldToScreen(this.probePosition.x, this.probePosition.y);
            this.physics.sources.forEach(src => {
                if (src.enabled) {
                    const srcScreen = this.worldToScreen(src.x, src.y);
                    ctx.save();
                    ctx.strokeStyle = src.color || '#38bdf8';
                    ctx.lineWidth = 1.5;
                    ctx.setLineDash([3, 4]);
                    ctx.beginPath();
                    ctx.moveTo(srcScreen.x, srcScreen.y);
                    ctx.lineTo(probeScreen.x, probeScreen.y);
                    ctx.stroke();

                    // Display distance along the ray
                    const midX = (srcScreen.x + probeScreen.x) / 2;
                    const midY = (srcScreen.y + probeScreen.y) / 2;
                    const dist = Math.hypot(this.probePosition.x - src.x, this.probePosition.y - src.y);
                    ctx.fillStyle = '#ffffff';
                    ctx.font = '11px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.shadowColor = '#000000';
                    ctx.shadowBlur = 4;
                    ctx.fillText(`r=${dist.toFixed(2)}m`, midX, midY - 8);
                    ctx.restore();
                }
            });
        }

        // 4. Source Markers (Draggable)
        this.physics.sources.forEach(src => {
            const screen = this.worldToScreen(src.x, src.y);
            this.drawSourceMarker(ctx, screen.x, screen.y, src);
        });

        // 5. Interactive Measurement Probe Marker
        const probeScreen = this.worldToScreen(this.probePosition.x, this.probePosition.y);
        this.drawProbeMarker(ctx, probeScreen.x, probeScreen.y);
    }

    drawCurve(ctx, points, isDashed) {
        if (!points || points.length === 0) return;
        ctx.beginPath();
        for (let i = 0; i < points.length; i++) {
            const sp = this.worldToScreen(points[i].x, points[i].y);
            if (i === 0) {
                ctx.moveTo(sp.x, sp.y);
            } else {
                ctx.lineTo(sp.x, sp.y);
            }
        }
        ctx.stroke();
    }

    drawGridAndAxes(ctx, w, h) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1.0;
        const domain = this.physics.params.domainSize;
        const step = 1.0; // 1 meter grid

        ctx.font = '10px monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';

        for (let m = -domain / 2; m <= domain / 2; m += step) {
            const pX = this.worldToScreen(m, 0);
            ctx.beginPath();
            ctx.moveTo(pX.x, 0);
            ctx.lineTo(pX.x, h);
            ctx.stroke();

            const pY = this.worldToScreen(0, m);
            ctx.beginPath();
            ctx.moveTo(0, pY.y);
            ctx.lineTo(w, pY.y);
            ctx.stroke();

            if (m !== 0) {
                ctx.fillText(`${m > 0 ? '+' : ''}${m}m`, pX.x + 2, h - 8);
            }
        }

        // Center origin cross
        const origin = this.worldToScreen(0, 0);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.moveTo(origin.x, 0);
        ctx.lineTo(origin.x, h);
        ctx.moveTo(0, origin.y);
        ctx.lineTo(w, origin.y);
        ctx.stroke();

        ctx.restore();
    }

    drawSourceMarker(ctx, x, y, source) {
        ctx.save();
        const pulse = 0.5 + 0.5 * Math.sin(this.physics.time * 6);
        const radius = 10;

        // Outer glow
        ctx.beginPath();
        ctx.arc(x, y, radius + 4 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = source.enabled ? 'rgba(0, 240, 255, 0.2)' : 'rgba(100, 100, 100, 0.2)';
        ctx.fill();

        // Pin body
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = source.enabled ? (source.color || '#00f0ff') : '#666666';
        ctx.shadowColor = source.enabled ? (source.color || '#00f0ff') : 'transparent';
        ctx.shadowBlur = 12;
        ctx.fill();

        // Pin center dot
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#060a12';
        ctx.fill();

        // Label
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.fillText(source.name.split(' ')[0], x, y - 16);
        ctx.font = '10px monospace';
        ctx.fillStyle = '#a5f3fc';
        ctx.fillText(`(${source.x.toFixed(1)}, ${source.y.toFixed(1)})`, x, y + 22);

        ctx.restore();
    }

    drawProbeMarker(ctx, x, y) {
        ctx.save();
        const radius = 9;

        // Reticle rings
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#39ff14'; // Neon lime
        ctx.lineWidth = 2.0;
        ctx.shadowColor = '#39ff14';
        ctx.shadowBlur = 10;
        ctx.stroke();

        // Crosshairs
        ctx.beginPath();
        ctx.moveTo(x - radius - 5, y);
        ctx.lineTo(x + radius + 5, y);
        ctx.moveTo(x, y - radius - 5);
        ctx.lineTo(x, y + radius + 5);
        ctx.strokeStyle = '#39ff14';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Label
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = '#39ff14';
        ctx.textAlign = 'left';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.fillText(`Probe (${this.probePosition.x.toFixed(2)}, ${this.probePosition.y.toFixed(2)})m`, x + 14, y - 6);

        ctx.restore();
    }

    /**
     * Mouse & Touch Gestures for moving sources & placing probe
     */
    setupEventListeners() {
        const target = this.canvas;

        const getEventCoords = (e) => {
            const rect = target.getBoundingClientRect();
            let clientX, clientY;
            if (e.touches && e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }
            const sx = (clientX - rect.left) * (target.width / rect.width);
            const sy = (clientY - rect.top) * (target.height / rect.height);
            return { sx, sy };
        };

        const onDown = (e) => {
            const { sx, sy } = getEventCoords(e);
            const world = this.screenToWorld(sx, sy);

            // Check if clicking near probe
            const probeScreen = this.worldToScreen(this.probePosition.x, this.probePosition.y);
            if (Math.hypot(sx - probeScreen.x, sy - probeScreen.y) < 18) {
                this.isDraggingProbe = true;
                e.preventDefault();
                return;
            }

            // Check if clicking near a source
            for (const s of this.physics.sources) {
                const sScreen = this.worldToScreen(s.x, s.y);
                if (Math.hypot(sx - sScreen.x, sy - sScreen.y) < 22) {
                    this.draggedSourceId = s.id;
                    e.preventDefault();
                    return;
                }
            }

            // Otherwise, place probe directly at clicked point
            this.setProbePosition(world.x, world.y);
            this.isDraggingProbe = true;
            e.preventDefault();
        };

        const onMove = (e) => {
            const { sx, sy } = getEventCoords(e);
            const world = this.screenToWorld(sx, sy);

            if (this.draggedSourceId !== null) {
                this.physics.setSourcePosition(this.draggedSourceId, world.x, world.y);
                e.preventDefault();
            } else if (this.isDraggingProbe) {
                this.setProbePosition(world.x, world.y);
                e.preventDefault();
            } else {
                // Update cursor style
                let hovering = false;
                for (const s of this.physics.sources) {
                    const sScreen = this.worldToScreen(s.x, s.y);
                    if (Math.hypot(sx - sScreen.x, sy - sScreen.y) < 20) {
                        hovering = true;
                        break;
                    }
                }
                const probeScreen = this.worldToScreen(this.probePosition.x, this.probePosition.y);
                if (Math.hypot(sx - probeScreen.x, sy - probeScreen.y) < 18) hovering = true;
                target.style.cursor = hovering ? 'grab' : 'crosshair';
            }
        };

        const onUp = () => {
            this.draggedSourceId = null;
            this.isDraggingProbe = false;
        };

        target.addEventListener('mousedown', onDown);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);

        target.addEventListener('touchstart', onDown, { passive: false });
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onUp);
    }

    setProbePosition(x, y) {
        const domain = this.physics.params.domainSize;
        const half = domain / 2;
        this.probePosition.x = Math.max(-half, Math.min(half, x));
        this.probePosition.y = Math.max(-half, Math.min(half, y));

        if (this.onProbeMove) {
            this.onProbeMove(this.probePosition.x, this.probePosition.y);
        }
    }

    resize(w, h) {
        this.canvas.width = w;
        this.canvas.height = h;
        this.resizeOverlay();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = WaveRenderer2D;
} else {
    window.WaveRenderer2D = WaveRenderer2D;
}
