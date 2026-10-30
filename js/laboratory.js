/**
 * Virtual Physics Laboratory Component
 * Manages experiment presets, hypothesis testing, student observation logs,
 * data table management, and CSV data export.
 */

class PhysicsLaboratory {
    constructor(tableBodyId, physics, probe) {
        this.tableBody = document.getElementById(tableBodyId);
        this.physics = physics;
        this.probe = probe;
        this.records = [];
        this.recordCounter = 1;

        this.experiments = [
            {
                id: 'exp1',
                title: 'Exp 1: Constructive vs Destructive Path Difference',
                description: 'Verify that constructive interference occurs when Δr = mλ and destructive interference occurs when Δr = (m + 0.5)λ for two in-phase coherent sources.',
                setup: () => {
                    this.physics.setWaveSpeed(2.0);
                    this.physics.setFrequency(1.0); // lambda = 2.0m
                    this.physics.setAmplitude(1.0);
                    this.physics.setSourceSeparation(3.0);
                    this.physics.setPhaseDifference(0.0);
                    if (window.app && window.app.renderer2d) {
                        window.app.renderer2d.setProbePosition(0.0, 2.0);
                    }
                }
            },
            {
                id: 'exp2',
                title: 'Exp 2: Source Separation & Hyperbolic Nodal Lines',
                description: 'Investigate how the number and angular spread of nodal lines depend on the ratio of source separation to wavelength (d / λ).',
                setup: () => {
                    this.physics.setWaveSpeed(2.0);
                    this.physics.setFrequency(2.0); // lambda = 1.0m
                    this.physics.setSourceSeparation(4.5); // d / lambda = 4.5 -> many nodal lines
                    this.physics.setPhaseDifference(0.0);
                    if (window.app && window.app.renderer2d) {
                        window.app.renderer2d.setProbePosition(1.5, 2.5);
                    }
                }
            },
            {
                id: 'exp3',
                title: 'Exp 3: Phase Shift & Pattern Asymmetry (Δφ₀ = π)',
                description: 'Demonstrate anti-phase sources (Δφ₀ = 180° = π rad). Observe how the central bisector becomes a destructive nodal line instead of an antinode!',
                setup: () => {
                    this.physics.setWaveSpeed(2.0);
                    this.physics.setFrequency(1.0);
                    this.physics.setSourceSeparation(3.0);
                    this.physics.setPhaseDifference(Math.PI); // 180 degrees
                    if (window.app && window.app.renderer2d) {
                        window.app.renderer2d.setProbePosition(0.0, 2.0); // At x=0, r1=r2, so Delta r=0 => Delta Phi = pi => COMPLETE CANCELLATION
                    }
                }
            },
            {
                id: 'exp4',
                title: 'Exp 4: Dispersion Relation Verification (v = f · λ)',
                description: 'Double the frequency from 1.0 Hz to 2.0 Hz at constant wave speed v = 2.0 m/s and record the halved wavelength λ = 1.0 m.',
                setup: () => {
                    this.physics.setWaveSpeed(2.0);
                    this.physics.setFrequency(2.0);
                    this.physics.setSourceSeparation(3.0);
                    this.physics.setPhaseDifference(0.0);
                }
            },
            {
                id: 'exp5',
                title: 'Exp 5: Multi-Source Linear Array (Phased Array)',
                description: 'Add a 3rd and 4th source in a line to observe directional wave beaming (wave interference constructive lobe).',
                setup: () => {
                    // Reset to 3 sources
                    this.physics.sources = [];
                    this.physics.addSource(-2.0, 0, 0);
                    this.physics.addSource(0.0, 0, 0);
                    this.physics.addSource(2.0, 0, 0);
                    this.physics.setWaveSpeed(2.0);
                    this.physics.setFrequency(1.0);
                }
            }
        ];
    }

    /**
     * Record current measurement at the probe position into data table
     */
    recordCurrentMeasurement(customLabel = '') {
        const m = this.probe.lastMeasurement || this.physics.measurePoint(
            window.app.renderer2d.probePosition.x,
            window.app.renderer2d.probePosition.y
        );

        const record = {
            id: this.recordCounter++,
            label: customLabel || `Trial #${this.recordCounter - 1}`,
            x: m.x,
            y: m.y,
            r1: m.sources[0] ? m.sources[0].distance : 0,
            r2: m.sources[1] ? m.sources[1].distance : 0,
            deltaR: m.pathDifference,
            wavelength: this.physics.params.wavelength,
            deltaROverLambda: m.pathDifference / this.physics.params.wavelength,
            phaseDiffDeg: (m.normalizedPhaseDifference * 180 / Math.PI),
            amplitude: m.resultantAmplitude,
            interferenceType: m.interferenceType,
            timestamp: new Date().toLocaleTimeString()
        };

        this.records.push(record);
        this.renderTable();
        return record;
    }

    deleteRecord(id) {
        this.records = this.records.filter(r => r.id !== id);
        this.renderTable();
    }

    clearRecords() {
        this.records = [];
        this.recordCounter = 1;
        this.renderTable();
    }

    renderTable() {
        if (!this.tableBody) return;

        if (this.records.length === 0) {
            this.tableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center text-muted" style="padding: 24px;">
                        No experimental data recorded yet. Click <strong>"Record Current Point"</strong> to capture observations.
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        this.records.forEach(r => {
            let badgeClass = 'badge-intermediate';
            if (r.interferenceType.includes('Constructive')) badgeClass = 'badge-constructive';
            else if (r.interferenceType.includes('Destructive')) badgeClass = 'badge-destructive';

            html += `
                <tr>
                    <td><strong>#${r.id}</strong></td>
                    <td>(${r.x.toFixed(2)}, ${r.y.toFixed(2)}) m</td>
                    <td>${r.r1.toFixed(3)} m</td>
                    <td>${r.r2.toFixed(3)} m</td>
                    <td class="mono font-semibold">${r.deltaR.toFixed(3)} m</td>
                    <td class="mono text-cyan">${r.deltaROverLambda.toFixed(2)} λ</td>
                    <td class="mono text-amber">${r.phaseDiffDeg.toFixed(1)}°</td>
                    <td class="mono text-white">${r.amplitude.toFixed(3)} m</td>
                    <td><span class="badge ${badgeClass}" style="font-size:0.75rem;">${r.interferenceType}</span></td>
                    <td>
                        <button class="btn-icon text-danger" title="Delete" onclick="window.app.laboratory.deleteRecord(${r.id})">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        this.tableBody.innerHTML = html;
    }

    /**
     * Export all recorded table data as a standardized CSV file
     */
    exportCSV() {
        if (this.records.length === 0) {
            alert('No data points have been recorded to export.');
            return;
        }

        const p = this.physics.params;
        let csv = `# WATER WAVE INTERFERENCE SIMULATION LABORATORY DATA EXPORT\n`;
        csv += `# Date: ${new Date().toISOString()}\n`;
        csv += `# Physical Parameters: WaveSpeed(v)=${p.waveSpeed}m/s, Frequency(f)=${p.frequency}Hz, Wavelength(lambda)=${p.wavelength}m, BaseAmplitude(A)=${p.amplitude}m\n\n`;

        // Column headers
        csv += `Trial_ID,Pos_X_m,Pos_Y_m,Distance_r1_m,Distance_r2_m,Path_Difference_Delta_r_m,Delta_r_over_Lambda,Phase_Difference_deg,Resultant_Amplitude_m,Interference_Type,Timestamp\n`;

        this.records.forEach(r => {
            const row = [
                r.id,
                r.x.toFixed(3),
                r.y.toFixed(3),
                r.r1.toFixed(3),
                r.r2.toFixed(3),
                r.deltaR.toFixed(3),
                r.deltaROverLambda.toFixed(3),
                r.phaseDiffDeg.toFixed(2),
                r.amplitude.toFixed(3),
                `"${r.interferenceType}"`,
                `"${r.timestamp}"`
            ];
            csv += row.join(',') + '\n';
        });

        // Trigger browser file download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `wave_interference_lab_data_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    loadExperimentPreset(expId) {
        const exp = this.experiments.find(e => e.id === expId);
        if (exp && exp.setup) {
            exp.setup();
            if (window.app) {
                window.app.syncControlsFromPhysics();
                window.app.oscilloscope.history = [];
            }
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PhysicsLaboratory;
} else {
    window.PhysicsLaboratory = PhysicsLaboratory;
}
