/**
 * Physics Engine for Water Wave Interference Simulation
 * 
 * Mathematical Models:
 * - Single point source: y_i(r, t) = A_i * sin(k * r_i - omega * t + phi_i)
 * - Resultant wave: y(x, y, t) = sum_i y_i(x, y, t)
 * - Wave speed relation: v = f * lambda
 * - Angular frequency: omega = 2 * pi * f
 * - Wave number: k = 2 * pi / lambda
 * - Path difference: Delta r = r1 - r2
 * - Phase difference: Delta phi = k * Delta r + (phi1 - phi2)
 * - Constructive condition: Delta phi = 2 * m * pi  =>  Delta r = (m - Delta phi0 / 2pi) * lambda
 * - Destructive condition: Delta phi = (2m + 1) * pi => Delta r = (m + 0.5 - Delta phi0 / 2pi) * lambda
 */

class WavePhysics {
    constructor() {
        // Physical parameters (SI units: meters, seconds, Hz)
        this.params = {
            waveSpeed: 2.0,      // v in m/s
            frequency: 1.0,      // f in Hz
            wavelength: 2.0,     // lambda in m (calculated from v / f)
            amplitude: 1.0,      // A in arbitrary displacement units / meters
            angularFrequency: 2 * Math.PI * 1.0, // omega in rad/s
            waveNumber: 2 * Math.PI / 2.0,       // k in rad/m
            simulationSpeed: 1.0, // Time scale multiplier
            attenuation: false,   // Optional 1/sqrt(r) geometric spreading
            attenuationFactor: 0.5,
            domainSize: 10.0      // Simulation window: [-5m, +5m] in x and y
        };

        // Source list: array of point sources
        // Default: Two sources symmetrically placed along the x-axis
        this.sources = [
            {
                id: 1,
                name: 'Source 1 (S₁)',
                x: -1.5,
                y: 0.0,
                amplitude: 1.0,
                initialPhase: 0.0, // radians
                enabled: true,
                color: '#00f0ff'
            },
            {
                id: 2,
                name: 'Source 2 (S₂)',
                x: 1.5,
                y: 0.0,
                amplitude: 1.0,
                initialPhase: 0.0, // radians
                enabled: true,
                color: '#ff9900'
            }
        ];

        this.time = 0.0;
        this.isRunning = true;
        this.sourceSeparation = 3.0; // Distance between S1 and S2
        
        // Listeners for parameter changes
        this.listeners = [];

        // Synchronize initial physics relationships
        this.updateDerivedParameters('v_and_f');
    }

    /**
     * Subscribe to parameter update events
     */
    onChange(callback) {
        this.listeners.push(callback);
    }

    notify() {
        this.listeners.forEach(cb => cb(this));
    }

    /**
     * Update physical parameters while preserving v = f * lambda, omega = 2*pi*f, k = 2*pi/lambda
     * @param {string} changedField Field that was directly changed by user
     */
    updateDerivedParameters(changedField) {
        const p = this.params;

        if (changedField === 'frequency') {
            // Frequency changed: update wavelength based on constant wave speed
            p.wavelength = p.waveSpeed / p.frequency;
        } else if (changedField === 'wavelength') {
            // Wavelength changed: update frequency based on constant wave speed
            p.frequency = p.waveSpeed / p.wavelength;
        } else if (changedField === 'waveSpeed') {
            // Speed changed: keep frequency constant, update wavelength
            p.wavelength = p.waveSpeed / p.frequency;
        } else if (changedField === 'v_and_f') {
            p.wavelength = p.waveSpeed / p.frequency;
        }

        // Calculate angular frequency and wave number
        p.angularFrequency = 2 * Math.PI * p.frequency;
        p.waveNumber = (2 * Math.PI) / p.wavelength;

        // Update default amplitudes for sources
        this.updateSeparationFromPositions();
        this.notify();
    }

    setWaveSpeed(v) {
        if (v <= 0) return;
        this.params.waveSpeed = v;
        this.updateDerivedParameters('waveSpeed');
    }

    setFrequency(f) {
        if (f <= 0) return;
        this.params.frequency = f;
        this.updateDerivedParameters('frequency');
    }

    setWavelength(lambda) {
        if (lambda <= 0) return;
        this.params.wavelength = lambda;
        this.updateDerivedParameters('wavelength');
    }

    setAmplitude(A) {
        this.params.amplitude = Math.max(0.1, A);
        this.sources.forEach(s => s.amplitude = this.params.amplitude);
        this.notify();
    }

    setSimulationSpeed(speed) {
        this.params.simulationSpeed = Math.max(0.05, Math.min(speed, 5.0));
        this.notify();
    }

    setAttenuation(enabled) {
        this.params.attenuation = enabled;
        this.notify();
    }

    /**
     * Set the distance between Source 1 and Source 2 symmetrically centered at (0,0)
     */
    setSourceSeparation(d) {
        if (this.sources.length >= 2) {
            this.sourceSeparation = Math.max(0.2, d);
            const halfD = this.sourceSeparation / 2;
            this.sources[0].x = -halfD;
            this.sources[0].y = 0;
            this.sources[1].x = halfD;
            this.sources[1].y = 0;
            this.notify();
        }
    }

    updateSeparationFromPositions() {
        if (this.sources.length >= 2) {
            const dx = this.sources[1].x - this.sources[0].x;
            const dy = this.sources[1].y - this.sources[0].y;
            this.sourceSeparation = Math.sqrt(dx * dx + dy * dy);
        }
    }

    /**
     * Phase difference delta_phi0 = phi1 - phi2
     */
    setPhaseDifference(deltaPhi) {
        if (this.sources.length >= 2) {
            // Keep source 1 at 0 and set source 2 phase to -deltaPhi (or phi1 = deltaPhi)
            this.sources[0].initialPhase = 0;
            this.sources[1].initialPhase = -deltaPhi;
            this.notify();
        }
    }

    getPhaseDifference() {
        if (this.sources.length >= 2) {
            return (this.sources[0].initialPhase - this.sources[1].initialPhase);
        }
        return 0;
    }

    /**
     * Add a new point source
     */
    addSource(x = 0, y = 2, phase = 0, amplitude = this.params.amplitude) {
        const id = this.sources.length > 0 ? Math.max(...this.sources.map(s => s.id)) + 1 : 1;
        const colors = ['#00f0ff', '#ff9900', '#39ff14', '#ff007f', '#a855f7', '#fbbf24'];
        const color = colors[(id - 1) % colors.length];

        this.sources.push({
            id,
            name: `Source ${id} (S${id})`,
            x,
            y,
            amplitude,
            initialPhase: phase,
            enabled: true,
            color
        });
        this.updateSeparationFromPositions();
        this.notify();
        return id;
    }

    removeSource(id) {
        if (this.sources.length <= 1) return; // Keep at least 1 source
        this.sources = this.sources.filter(s => s.id !== id);
        this.updateSeparationFromPositions();
        this.notify();
    }

    setSourcePosition(id, x, y) {
        const source = this.sources.find(s => s.id === id);
        if (source) {
            source.x = Math.max(-5.0, Math.min(5.0, x));
            source.y = Math.max(-5.0, Math.min(5.0, y));
            this.updateSeparationFromPositions();
            this.notify();
        }
    }

    setSourcePhase(id, phase) {
        const source = this.sources.find(s => s.id === id);
        if (source) {
            source.initialPhase = phase;
            this.notify();
        }
    }

    setSourceEnabled(id, enabled) {
        const source = this.sources.find(s => s.id === id);
        if (source) {
            source.enabled = enabled;
            this.notify();
        }
    }

    setSourceAmplitude(id, amp) {
        const source = this.sources.find(s => s.id === id);
        if (source) {
            source.amplitude = amp;
            this.notify();
        }
    }

    /**
     * Advance simulation time
     */
    step(dt) {
        this.time += dt * this.params.simulationSpeed;
    }

    resetTime() {
        this.time = 0.0;
        this.notify();
    }

    /**
     * Compute individual wave displacement y_i(x, y, t)
     */
    computeDisplacementForSource(source, x, y, t = this.time) {
        if (!source.enabled) return 0.0;
        const dx = x - source.x;
        const dy = y - source.y;
        const r = Math.sqrt(dx * dx + dy * dy);

        let amp = source.amplitude;
        if (this.params.attenuation) {
            // Physical geometric damping for 2D circular wave: 1 / sqrt(r)
            amp = source.amplitude / Math.sqrt(Math.max(1.0, r));
        }

        const phase = this.params.waveNumber * r - this.params.angularFrequency * t + source.initialPhase;
        return amp * Math.sin(phase);
    }

    /**
     * Compute resultant wave displacement y(x, y, t) = sum_i y_i(x, y, t)
     */
    computeDisplacement(x, y, t = this.time) {
        let totalDisplacement = 0.0;
        for (let i = 0; i < this.sources.length; i++) {
            totalDisplacement += this.computeDisplacementForSource(this.sources[i], x, y, t);
        }
        return totalDisplacement;
    }

    /**
     * Comprehensive physical measurement for any point (x, y)
     */
    measurePoint(x, y, t = this.time) {
        const p = this.params;
        const result = {
            x,
            y,
            time: t,
            sources: [],
            resultantDisplacement: 0.0,
            resultantAmplitude: 0.0,
            interferenceType: 'Indeterminate',
            interferenceRatio: 0.0,
            pathDifference: 0.0,
            signedPathDifference: 0.0,
            phaseDifference: 0.0,
            initialPhaseDiff: 0.0,
            formulaDetails: {}
        };

        let activeCount = 0;
        for (let i = 0; i < this.sources.length; i++) {
            const s = this.sources[i];
            const dx = x - s.x;
            const dy = y - s.y;
            const r = Math.sqrt(dx * dx + dy * dy);
            const y_disp = this.computeDisplacementForSource(s, x, y, t);
            
            // Total phase at this point: kr - omega*t + phi
            const totalPhase = p.waveNumber * r - p.angularFrequency * t + s.initialPhase;

            result.sources.push({
                id: s.id,
                name: s.name,
                x: s.x,
                y: s.y,
                distance: r,
                displacement: y_disp,
                amplitude: s.amplitude,
                initialPhase: s.initialPhase,
                totalPhase: totalPhase,
                enabled: s.enabled
            });

            if (s.enabled) {
                activeCount++;
                result.resultantDisplacement += y_disp;
            }
        }

        // Two-source interference specifics
        const enabledSources = result.sources.filter(s => s.enabled);
        if (enabledSources.length === 2) {
            const s1 = enabledSources[0];
            const s2 = enabledSources[1];
            
            const r1 = s1.distance;
            const r2 = s2.distance;
            const deltaR = r1 - r2;
            const absDeltaR = Math.abs(deltaR);
            const deltaPhi0 = s1.initialPhase - s2.initialPhase;
            
            // Phase difference: Delta Phi = k * Delta r + Delta Phi0
            let deltaPhi = p.waveNumber * deltaR + deltaPhi0;
            
            // Normalize deltaPhi into [-pi, pi] for intuitive reading
            let normalizedDeltaPhi = ((deltaPhi + Math.PI) % (2 * Math.PI)) - Math.PI;
            if (normalizedDeltaPhi < -Math.PI) normalizedDeltaPhi += 2 * Math.PI;

            // Theoretical resultant amplitude: A_res = sqrt(A1^2 + A2^2 + 2 A1 A2 cos(Delta Phi))
            const A1 = s1.amplitude;
            const A2 = s2.amplitude;
            const A_res = Math.sqrt(Math.max(0, A1 * A1 + A2 * A2 + 2 * A1 * A2 * Math.cos(deltaPhi)));

            result.pathDifference = absDeltaR;
            result.signedPathDifference = deltaR;
            result.phaseDifference = deltaPhi;
            result.normalizedPhaseDifference = normalizedDeltaPhi;
            result.initialPhaseDiff = deltaPhi0;
            result.resultantAmplitude = A_res;

            // Interference classification
            const maxAmp = A1 + A2;
            const minAmp = Math.abs(A1 - A2);
            const ampSpan = maxAmp - minAmp;
            const ratio = ampSpan > 1e-6 ? (A_res - minAmp) / ampSpan : 1.0;
            result.interferenceRatio = ratio;

            // Order m calculation:
            // Delta r / lambda = m - deltaPhi0 / (2*pi)
            const mEffective = (deltaR / p.wavelength) + (deltaPhi0 / (2 * Math.PI));
            const nearestInteger = Math.round(mEffective);
            const deviationFromInt = Math.abs(mEffective - nearestInteger);

            // Half-integer check: m + 0.5
            const nearestHalfInt = Math.floor(mEffective) + 0.5;
            const deviationFromHalf = Math.abs(mEffective - nearestHalfInt);

            if (deviationFromInt < 0.08) {
                result.interferenceType = `Constructive (Antinodal Line m = ${nearestInteger})`;
            } else if (deviationFromHalf < 0.08) {
                const halfOrder = nearestHalfInt > 0 ? Math.floor(nearestHalfInt) : Math.ceil(nearestHalfInt) - 1;
                result.interferenceType = `Destructive (Nodal Line m = ${halfOrder})`;
            } else if (ratio > 0.75) {
                result.interferenceType = 'Predominantly Constructive';
            } else if (ratio < 0.25) {
                result.interferenceType = 'Predominantly Destructive';
            } else {
                result.interferenceType = 'Intermediate Superposition';
            }

            result.formulaDetails = {
                r1,
                r2,
                deltaR,
                lambda: p.wavelength,
                k: p.waveNumber,
                omega: p.angularFrequency,
                deltaPhi0,
                deltaPhi,
                normalizedDeltaPhi,
                A1,
                A2,
                A_res,
                mEffective
            };
        } else if (enabledSources.length === 1) {
            result.resultantAmplitude = enabledSources[0].amplitude;
            result.interferenceType = 'Single Source (No Interference)';
        } else if (enabledSources.length > 2) {
            result.interferenceType = `Multi-Source Superposition (${enabledSources.length} sources)`;
            // Calculate numerical peak amplitude
            let maxAmpApprox = 0;
            for (let ph = 0; ph < 2 * Math.PI; ph += Math.PI / 16) {
                let inst = 0;
                for (const s of enabledSources) {
                    inst += s.amplitude * Math.sin(p.waveNumber * s.distance - ph + s.initialPhase);
                }
                maxAmpApprox = Math.max(maxAmpApprox, Math.abs(inst));
            }
            result.resultantAmplitude = maxAmpApprox;
        }

        return result;
    }

    /**
     * Compute analytical hyperbolic curves for Nodal and Antinodal lines for 2 sources
     * Hyperbola: |r1 - r2| = C
     */
    getInterferenceCurves(numPointsPerBranch = 80) {
        if (this.sources.length < 2 || !this.sources[0].enabled || !this.sources[1].enabled) {
            return { nodalCurves: [], antinodalCurves: [] };
        }

        const s1 = this.sources[0];
        const s2 = this.sources[1];
        const lambda = this.params.wavelength;
        const deltaPhi0 = s1.initialPhase - s2.initialPhase;

        const dx = s2.x - s1.x;
        const dy = s2.y - s1.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 1e-4) return { nodalCurves: [], antinodalCurves: [] };

        const midX = (s1.x + s2.x) / 2;
        const midY = (s1.y + s2.y) / 2;
        const angle = Math.atan2(dy, dx);
        const cosAngle = Math.cos(angle);
        const sinAngle = Math.sin(angle);

        // Maximum possible path difference between the two sources is d
        const nodalCurves = [];
        const antinodalCurves = [];

        // Range of integer m
        const maxM = Math.ceil(d / lambda) + 2;

        // Antinodal condition: Delta r = (m - deltaPhi0 / (2pi)) * lambda
        for (let m = -maxM; m <= maxM; m++) {
            const targetDeltaR = (m - deltaPhi0 / (2 * Math.PI)) * lambda;
            if (Math.abs(targetDeltaR) < d && Math.abs(targetDeltaR) > 1e-5) {
                const curve = this.generateHyperbolaBranch(targetDeltaR, d, midX, midY, cosAngle, sinAngle, numPointsPerBranch);
                if (curve.length > 0) {
                    antinodalCurves.push({ m, deltaR: targetDeltaR, points: curve });
                }
            } else if (Math.abs(targetDeltaR) <= 1e-5) {
                // Perpendicular bisector (straight line)
                const straightLine = this.generatePerpendicularBisector(midX, midY, cosAngle, sinAngle);
                antinodalCurves.push({ m, deltaR: 0, points: straightLine });
            }
        }

        // Nodal condition: Delta r = (m + 0.5 - deltaPhi0 / (2pi)) * lambda
        for (let m = -maxM; m <= maxM; m++) {
            const targetDeltaR = (m + 0.5 - deltaPhi0 / (2 * Math.PI)) * lambda;
            if (Math.abs(targetDeltaR) < d && Math.abs(targetDeltaR) > 1e-5) {
                const curve = this.generateHyperbolaBranch(targetDeltaR, d, midX, midY, cosAngle, sinAngle, numPointsPerBranch);
                if (curve.length > 0) {
                    nodalCurves.push({ m, deltaR: targetDeltaR, points: curve });
                }
            } else if (Math.abs(targetDeltaR) <= 1e-5) {
                const straightLine = this.generatePerpendicularBisector(midX, midY, cosAngle, sinAngle);
                nodalCurves.push({ m, deltaR: 0, points: straightLine });
            }
        }

        return { nodalCurves, antinodalCurves };
    }

    /**
     * Generate 2D coordinates along a hyperbolic branch: r1 - r2 = Delta r
     */
    generateHyperbolaBranch(deltaR, d, midX, midY, cosAngle, sinAngle, numPoints) {
        // In local coordinates where foci are at (-c, 0) and (c, 0)
        // c = d / 2
        // Path diff: r1 - r2 = 2 * a  =>  a = deltaR / 2
        // Equation of hyperbola: x_local^2 / a^2 - y_local^2 / b^2 = 1, where b^2 = c^2 - a^2
        const c = d / 2;
        const a = Math.abs(deltaR) / 2;
        if (a >= c) return [];

        const b = Math.sqrt(c * c - a * a);
        const sign = Math.sign(deltaR); // If deltaR > 0, r1 > r2, so closer to S2 (x_local > 0)

        const points = [];
        const domainLimit = this.params.domainSize;
        const maxT = Math.asinh(domainLimit / b);

        for (let i = 0; i <= numPoints; i++) {
            const t = -maxT + (2 * maxT * i) / numPoints;
            // Hyperbolic parameterization: x = sign * a * cosh(t), y = b * sinh(t)
            // When deltaR > 0, r1 > r2, so the point is closer to S2 (x_loc > 0)
            const x_loc = sign * a * Math.cosh(t);
            const y_loc = b * Math.sinh(t);

            // Rotate and translate to global coordinates
            const x_glob = midX + (x_loc * cosAngle - y_loc * sinAngle);
            const y_glob = midY + (x_loc * sinAngle + y_loc * cosAngle);

            points.push({ x: x_glob, y: y_glob });
        }
        return points;
    }

    generatePerpendicularBisector(midX, midY, cosAngle, sinAngle) {
        const span = this.params.domainSize;
        // Direction perpendicular to source axis is (-sinAngle, cosAngle)
        return [
            { x: midX - span * (-sinAngle), y: midY - span * cosAngle },
            { x: midX + span * (-sinAngle), y: midY + span * cosAngle }
        ];
    }
}

// Export for module or global use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WavePhysics;
} else {
    window.WavePhysics = WavePhysics;
}
