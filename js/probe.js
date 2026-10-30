/**
 * Measurement Probe and Real-Time Mathematical Analysis Component
 * Continuously evaluates path difference, phase difference, individual displacements,
 * resultant amplitude, and interference conditions at the user's selected point.
 */

class MeasurementProbe {
    constructor(containerId, physics, renderer2d) {
        this.container = document.getElementById(containerId);
        this.physics = physics;
        this.renderer2d = renderer2d;
        this.lastMeasurement = null;
        this.lastRenderKey = '';

        // Auto update callback
        if (this.renderer2d) {
            this.renderer2d.onProbeMove = (x, y) => this.update(x, y, true);
        }
    }

    update(x = null, y = null, forceFull = false) {
        if (!this.container) return;

        const posX = x !== null ? x : (this.renderer2d ? this.renderer2d.probePosition.x : 0);
        const posY = y !== null ? y : (this.renderer2d ? this.renderer2d.probePosition.y : 1.5);

        const m = this.physics.measurePoint(posX, posY);
        this.lastMeasurement = m;

        // Render key depends on static geometry & wave params (excluding time)
        const p = this.physics.params;
        const renderKey = `${posX.toFixed(3)}_${posY.toFixed(3)}_${p.waveSpeed}_${p.frequency}_${p.wavelength}_${p.amplitude}_${this.physics.sources.map(s => `${s.id}:${s.x.toFixed(2)},${s.y.toFixed(2)},${s.initialPhase.toFixed(2)},${s.enabled}`).join(';')}`;

        if (forceFull || renderKey !== this.lastRenderKey || !this.container.querySelector('.probe-metrics-grid')) {
            this.lastRenderKey = renderKey;
            this.renderUI(m);
        } else {
            // Fast instantaneous value update (60 FPS without re-parsing KaTeX)
            this.updateLiveDisplacements(m);
        }
    }

    updateLiveDisplacements(m) {
        const elDisp = document.getElementById('liveInstantaneousDisp');
        if (elDisp) {
            elDisp.className = `metric-val ${m.resultantDisplacement >= 0 ? 'text-cyan' : 'text-indigo'}`;
            elDisp.innerHTML = `${m.resultantDisplacement >= 0 ? '+' : ''}${m.resultantDisplacement.toFixed(3)} <span class="unit">m</span>`;
        }
        const elTime = document.getElementById('liveInstantaneousTime');
        if (elTime) {
            elTime.textContent = `at t = ${this.physics.time.toFixed(2)} s`;
        }

        // Update table row displacements
        m.sources.forEach(s => {
            const rowDisp = document.getElementById(`liveSourceDisp_${s.id}`);
            if (rowDisp) {
                rowDisp.className = `mono ${s.displacement >= 0 ? 'text-cyan' : 'text-indigo'}`;
                rowDisp.textContent = `${s.displacement >= 0 ? '+' : ''}${s.displacement.toFixed(3)} m`;
            }
        });
    }

    renderUI(m) {
        const p = this.physics.params;
        const s1 = m.sources[0];
        const s2 = m.sources[1];

        // Status badge color
        let badgeClass = 'badge-intermediate';
        if (m.interferenceType.includes('Constructive')) badgeClass = 'badge-constructive';
        else if (m.interferenceType.includes('Destructive')) badgeClass = 'badge-destructive';

        // Format degrees
        const phaseDeg = (m.phaseDifference * 180 / Math.PI) % 360;
        const normPhaseDeg = (m.normalizedPhaseDifference * 180 / Math.PI);

        let sourcesTableHTML = '';
        m.sources.forEach(s => {
            sourcesTableHTML += `
                <tr class="${s.enabled ? '' : 'text-muted'}">
                    <td><span class="source-dot" style="background:${s.enabled ? (s.id === 1 ? '#00f0ff' : '#ff9900') : '#666'}"></span> ${s.name}</td>
                    <td>(${s.x.toFixed(2)}, ${s.y.toFixed(2)}) m</td>
                    <td><strong>${s.distance.toFixed(3)} m</strong></td>
                    <td id="liveSourceDisp_${s.id}" class="mono ${s.displacement >= 0 ? 'text-cyan' : 'text-indigo'}">${s.displacement >= 0 ? '+' : ''}${s.displacement.toFixed(3)} m</td>
                    <td>${(s.initialPhase * 180 / Math.PI).toFixed(1)}°</td>
                </tr>
            `;
        });

        let mathBreakdownHTML = '';
        if (m.formulaDetails && m.formulaDetails.r1 !== undefined) {
            const fd = m.formulaDetails;
            const deltaR = fd.deltaR;
            const absDeltaR = Math.abs(deltaR);
            const mEffective = fd.mEffective;
            const lambdaRatio = (absDeltaR / fd.lambda).toFixed(3);

            mathBreakdownHTML = `
                <div class="math-derivation-box">
                    <div class="math-title"><i class="fas fa-calculator"></i> Step-by-Step Physics & Math Derivation</div>
                    
                    <div class="math-step">
                        <div class="step-label">1. Path Difference Calculation (\(\\Delta r\)):</div>
                        <div class="step-equation">
                            \\[ \\Delta r = |r_1 - r_2| = |${fd.r1.toFixed(3)} - ${fd.r2.toFixed(3)}| = \\mathbf{${absDeltaR.toFixed(3)}\\text{ m}} \\]
                        </div>
                        <div class="step-note">In units of wavelength: \\( \\Delta r = ${lambdaRatio} \\lambda \\) (where \\(\\lambda = ${fd.lambda.toFixed(2)}\\text{ m}\\))</div>
                    </div>

                    <div class="math-step">
                        <div class="step-label">2. Phase Difference Calculation (\(\\Delta \\Phi\)):</div>
                        <div class="step-equation">
                            \\[ \\Delta \\Phi = k \\Delta r + \\Delta \\phi_0 = \\left(\\frac{2\\pi}{${fd.lambda.toFixed(2)}}\\right)(${absDeltaR.toFixed(3)}) + (${(fd.deltaPhi0 * 180 / Math.PI).toFixed(1)}^\\circ) = \\mathbf{${m.normalizedPhaseDifference.toFixed(3)}\\text{ rad}} \\; (${normPhaseDeg.toFixed(1)}^\\circ) \\]
                        </div>
                    </div>

                    <div class="math-step">
                        <div class="step-label">3. Resultant Theoretical Amplitude (\(A_{\\text{res}}\)):</div>
                        <div class="step-equation">
                            \\[ A_{\\text{res}} = \\sqrt{A_1^2 + A_2^2 + 2 A_1 A_2 \\cos(\\Delta \\Phi)} = \\mathbf{${m.resultantAmplitude.toFixed(3)}\\text{ m}} \\]
                        </div>
                        <div class="step-note">Theoretical maximum = ${(fd.A1 + fd.A2).toFixed(2)} m, Theoretical minimum = ${Math.abs(fd.A1 - fd.A2).toFixed(2)} m</div>
                    </div>

                    <div class="math-step">
                        <div class="step-label">4. Interference Condition Evaluation:</div>
                        <div class="step-result">
                            <span class="badge ${badgeClass}">${m.interferenceType}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        this.container.innerHTML = `
            <div class="probe-header">
                <div class="probe-title">
                    <span class="probe-icon"><i class="fas fa-crosshairs"></i></span>
                    <span class="probe-name">Interactive Measurement Point</span>
                    <span class="probe-coords">(\(x = ${m.x.toFixed(2)}\\text{ m},\\; y = ${m.y.toFixed(2)}\\text{ m}\))</span>
                </div>
                <div class="probe-tag ${badgeClass}">${m.interferenceType}</div>
            </div>

            <div class="probe-metrics-grid">
                <div class="metric-card">
                    <div class="metric-label">Path Difference (\(\\Delta r\))</div>
                    <div class="metric-val text-cyan">${m.pathDifference.toFixed(3)} <span class="unit">m</span></div>
                    <div class="metric-sub">\(${ (m.pathDifference / p.wavelength).toFixed(2) } \\lambda\)</div>
                </div>

                <div class="metric-card">
                    <div class="metric-label">Phase Difference (\(\\Delta \\Phi\))</div>
                    <div class="metric-val text-amber">${normPhaseDeg.toFixed(1)}°</div>
                    <div class="metric-sub">${m.normalizedPhaseDifference.toFixed(3)} rad</div>
                </div>

                <div class="metric-card">
                    <div class="metric-label">Resultant Amplitude (\(A_{\\text{res}}\))</div>
                    <div class="metric-val text-white">${m.resultantAmplitude.toFixed(3)} <span class="unit">m</span></div>
                    <div class="metric-sub">Amp Ratio: ${(m.interferenceRatio * 100).toFixed(0)}%</div>
                </div>

                <div class="metric-card">
                    <div class="metric-label">Instantaneous Displacement (\(y\))</div>
                    <div id="liveInstantaneousDisp" class="metric-val ${m.resultantDisplacement >= 0 ? 'text-cyan' : 'text-indigo'}">
                        ${m.resultantDisplacement >= 0 ? '+' : ''}${m.resultantDisplacement.toFixed(3)} <span class="unit">m</span>
                    </div>
                    <div id="liveInstantaneousTime" class="metric-sub">at \(t = ${this.physics.time.toFixed(2)}\\text{ s}\)</div>
                </div>
            </div>

            <div class="probe-table-wrapper">
                <table class="probe-table">
                    <thead>
                        <tr>
                            <th>Wave Source</th>
                            <th>Coordinates</th>
                            <th>Distance (\(r_i\))</th>
                            <th>Current \(y_i(t)\)</th>
                            <th>Phase (\(\\phi_i\))</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sourcesTableHTML}
                    </tbody>
                </table>
            </div>

            ${mathBreakdownHTML}
        `;

        // Render KaTeX math in probe container if KaTeX is loaded
        if (window.renderMathInElement) {
            window.renderMathInElement(this.container, {
                delimiters: [
                    { left: '\\[', right: '\\]', display: true },
                    { left: '\\(', right: '\\)', display: false }
                ],
                throwOnError: false
            });
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MeasurementProbe;
} else {
    window.MeasurementProbe = MeasurementProbe;
}
