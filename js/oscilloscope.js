/**
 * Real-Time Waveform Oscilloscope
 * Plots displacement-versus-time y(t) for Wave 1, Wave 2, and Resultant Wave
 * at the currently selected measurement probe position.
 */

class WaveOscilloscope {
    constructor(canvas, physics, renderer2d) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.physics = physics;
        this.renderer2d = renderer2d;

        this.timeWindow = 4.0; // Seconds shown on horizontal axis (e.g. 4 seconds)
        this.historyLength = 300; // Number of samples in rolling buffer
        this.history = []; // Array of { time, y1, y2, yTotal }
        this.isFrozen = false;
        this.hoverTime = null;

        this.setupInteractivity();
    }

    setupInteractivity() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const w = this.canvas.width;
            const ratio = mouseX / w;
            const tEnd = this.physics.time;
            const tStart = Math.max(0, tEnd - this.timeWindow);
            this.hoverTime = tStart + ratio * this.timeWindow;
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.hoverTime = null;
        });
    }

    /**
     * Add current instantaneous measurement to the buffer
     */
    update() {
        if (!this.isFrozen) {
            const pos = this.renderer2d.probePosition;
            const t = this.physics.time;
            const sources = this.physics.sources;

            let y1 = 0, y2 = 0;
            if (sources.length > 0 && sources[0].enabled) {
                y1 = this.physics.computeDisplacementForSource(sources[0], pos.x, pos.y, t);
            }
            if (sources.length > 1 && sources[1].enabled) {
                y2 = this.physics.computeDisplacementForSource(sources[1], pos.x, pos.y, t);
            }
            const yTotal = this.physics.computeDisplacement(pos.x, pos.y, t);

            this.history.push({ time: t, y1, y2, yTotal });

            // Prune old samples
            const cutoffTime = t - this.timeWindow;
            while (this.history.length > 0 && this.history[0].time < cutoffTime) {
                this.history.shift();
            }
        }

        this.render();
    }

    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        if (w <= 0 || h <= 0) return;

        // Clear canvas
        ctx.fillStyle = '#060a14';
        ctx.fillRect(0, 0, w, h);

        const pos = this.renderer2d.probePosition;
        const p = this.physics.params;
        const tNow = this.physics.time;
        const tStart = Math.max(0, tNow - this.timeWindow);
        const tEnd = Math.max(this.timeWindow, tNow);

        const maxDisplayAmp = Math.max(2.5, p.amplitude * 2.4);

        // 1. Grid & Axes
        this.drawGrid(ctx, w, h, tStart, tEnd, maxDisplayAmp);

        // 2. Analytical Curve Rendering (Ultra smooth 60fps waveform)
        const numSteps = w;
        const dt = (tEnd - tStart) / numSteps;

        // Wave 1 Curve
        if (this.physics.sources.length > 0 && this.physics.sources[0].enabled) {
            ctx.save();
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 1.8;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            for (let i = 0; i <= numSteps; i++) {
                const t = tStart + i * dt;
                const y1 = this.physics.computeDisplacementForSource(this.physics.sources[0], pos.x, pos.y, t);
                const screenY = h / 2 - (y1 / maxDisplayAmp) * (h / 2 - 20);
                if (i === 0) ctx.moveTo(i, screenY);
                else ctx.lineTo(i, screenY);
            }
            ctx.stroke();
            ctx.restore();
        }

        // Wave 2 Curve
        if (this.physics.sources.length > 1 && this.physics.sources[1].enabled) {
            ctx.save();
            ctx.strokeStyle = '#ff9900';
            ctx.lineWidth = 1.8;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            for (let i = 0; i <= numSteps; i++) {
                const t = tStart + i * dt;
                const y2 = this.physics.computeDisplacementForSource(this.physics.sources[1], pos.x, pos.y, t);
                const screenY = h / 2 - (y2 / maxDisplayAmp) * (h / 2 - 20);
                if (i === 0) ctx.moveTo(i, screenY);
                else ctx.lineTo(i, screenY);
            }
            ctx.stroke();
            ctx.restore();
        }

        // Resultant Wave Curve (Bold Glowing Aqua-White)
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.8;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        for (let i = 0; i <= numSteps; i++) {
            const t = tStart + i * dt;
            const yTot = this.physics.computeDisplacement(pos.x, pos.y, t);
            const screenY = h / 2 - (yTot / maxDisplayAmp) * (h / 2 - 20);
            if (i === 0) ctx.moveTo(i, screenY);
            else ctx.lineTo(i, screenY);
        }
        ctx.stroke();
        ctx.restore();

        // 3. Current Time Indicator (Vertical glowing line)
        const currentScreenX = ((tNow - tStart) / (tEnd - tStart)) * w;
        ctx.save();
        ctx.strokeStyle = 'rgba(57, 255, 20, 0.7)'; // Neon lime
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(currentScreenX, 0);
        ctx.lineTo(currentScreenX, h);
        ctx.stroke();

        // Cursor Dot on Resultant Wave
        const currentYTot = this.physics.computeDisplacement(pos.x, pos.y, tNow);
        const currentScreenY = h / 2 - (currentYTot / maxDisplayAmp) * (h / 2 - 20);
        ctx.beginPath();
        ctx.arc(currentScreenX, currentScreenY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#39ff14';
        ctx.shadowColor = '#39ff14';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.restore();

        // 4. Hover Tooltip
        if (this.hoverTime !== null) {
            this.drawHoverInspection(ctx, w, h, this.hoverTime, tStart, tEnd, maxDisplayAmp, pos);
        }

        // 5. Physics Header Stats
        this.drawStatsOverlay(ctx, w, h, p, currentYTot);
    }

    drawGrid(ctx, w, h, tStart, tEnd, maxAmp) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
        ctx.lineWidth = 1.0;
        ctx.font = '10px monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';

        // Horizontal center axis y = 0
        const centerY = h / 2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(w, centerY);
        ctx.stroke();
        ctx.fillText('0.00 m', 8, centerY - 4);

        // Amplitude levels (+A, -A, +2A, -2A)
        const levels = [1.0, 2.0, -1.0, -2.0];
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        levels.forEach(val => {
            const yPos = centerY - (val / maxAmp) * (h / 2 - 20);
            if (yPos > 15 && yPos < h - 15) {
                ctx.beginPath();
                ctx.moveTo(0, yPos);
                ctx.lineTo(w, yPos);
                ctx.stroke();
                ctx.fillText(`${val > 0 ? '+' : ''}${val.toFixed(1)} m`, 8, yPos - 4);
            }
        });

        // Vertical time divisions (every 0.5 or 1.0s)
        const tSpan = tEnd - tStart;
        const step = tSpan > 6 ? 2.0 : 1.0;
        const firstTick = Math.ceil(tStart / step) * step;

        for (let t = firstTick; t <= tEnd; t += step) {
            const xPos = ((t - tStart) / tSpan) * w;
            ctx.beginPath();
            ctx.moveTo(xPos, 0);
            ctx.lineTo(xPos, h);
            ctx.stroke();
            ctx.fillText(`${t.toFixed(1)}s`, xPos + 4, h - 8);
        }

        ctx.restore();
    }

    drawHoverInspection(ctx, w, h, t, tStart, tEnd, maxAmp, pos) {
        const xPos = ((t - tStart) / (tEnd - tStart)) * w;
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(xPos, 0);
        ctx.lineTo(xPos, h);
        ctx.stroke();

        const yTot = this.physics.computeDisplacement(pos.x, pos.y, t);
        const yScreen = h / 2 - (yTot / maxAmp) * (h / 2 - 20);

        ctx.beginPath();
        ctx.arc(xPos, yScreen, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // Info box
        const boxX = xPos > w - 140 ? xPos - 130 : xPos + 10;
        const boxY = Math.max(10, Math.min(h - 65, yScreen - 30));

        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1;
        ctx.fillRect(boxX, boxY, 120, 50);
        ctx.strokeRect(boxX, boxY, 120, 50);

        ctx.fillStyle = '#a5f3fc';
        ctx.font = '10px monospace';
        ctx.fillText(`t = ${t.toFixed(2)} s`, boxX + 8, boxY + 16);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`y = ${yTot.toFixed(3)} m`, boxX + 8, boxY + 32);

        ctx.restore();
    }

    drawStatsOverlay(ctx, w, h, p, currentY) {
        ctx.save();
        ctx.font = '11px sans-serif';
        const period = 1 / p.frequency;

        const stats = [
            { label: 'f =', val: `${p.frequency.toFixed(2)} Hz`, col: '#a5f3fc' },
            { label: 'T =', val: `${period.toFixed(2)} s`, col: '#a5f3fc' },
            { label: 'λ =', val: `${p.wavelength.toFixed(2)} m`, col: '#a5f3fc' },
            { label: 'v =', val: `${p.waveSpeed.toFixed(2)} m/s`, col: '#a5f3fc' }
        ];

        let startX = w - 240;
        const boxY = 8;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(startX - 10, boxY, 240, 24);
        ctx.strokeRect(startX - 10, boxY, 240, 24);

        stats.forEach(st => {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fillText(st.label, startX, boxY + 16);
            ctx.fillStyle = st.col;
            ctx.fillText(st.val, startX + 22, boxY + 16);
            startX += 58;
        });

        ctx.restore();
    }

    setTimeWindow(sec) {
        this.timeWindow = Math.max(1.0, Math.min(10.0, sec));
    }

    toggleFreeze() {
        this.isFrozen = !this.isFrozen;
        return this.isFrozen;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = WaveOscilloscope;
} else {
    window.WaveOscilloscope = WaveOscilloscope;
}
