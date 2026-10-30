/**
 * Audio Sonification of Wave Interference using Web Audio API
 * Allows students to hear acoustic interference: maximum loudness at antinodes,
 * complete silence at destructive nodal lines.
 */

class WaveAudio {
    constructor(physics, renderer2d) {
        this.physics = physics;
        this.renderer2d = renderer2d;
        this.audioCtx = null;
        this.osc1 = null;
        this.osc2 = null;
        this.gain1 = null;
        this.gain2 = null;
        this.masterGain = null;
        this.isEnabled = false;
        this.baseFreq = 220; // 220 Hz (A3)
    }

    init() {
        if (this.audioCtx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContext();

        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.setValueAtTime(0.0, this.audioCtx.currentTime);
        this.masterGain.connect(this.audioCtx.destination);

        // Oscillator 1
        this.osc1 = this.audioCtx.createOscillator();
        this.osc1.type = 'sine';
        this.osc1.frequency.setValueAtTime(this.baseFreq, this.audioCtx.currentTime);
        this.gain1 = this.audioCtx.createGain();
        this.gain1.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
        this.osc1.connect(this.gain1);
        this.gain1.connect(this.masterGain);
        this.osc1.start();

        // Oscillator 2
        this.osc2 = this.audioCtx.createOscillator();
        this.osc2.type = 'sine';
        this.osc2.frequency.setValueAtTime(this.baseFreq, this.audioCtx.currentTime);
        this.gain2 = this.audioCtx.createGain();
        this.gain2.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
        this.osc2.connect(this.gain2);
        this.gain2.connect(this.masterGain);
        this.osc2.start();
    }

    toggle() {
        if (!this.audioCtx) {
            this.init();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        this.isEnabled = !this.isEnabled;
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(this.isEnabled ? 0.35 : 0.0, this.audioCtx.currentTime, 0.05);
        }
        return this.isEnabled;
    }

    update() {
        if (!this.isEnabled || !this.audioCtx) return;

        const pos = this.renderer2d.probePosition;
        const m = this.physics.measurePoint(pos.x, pos.y);

        // Adjust acoustic phase delay based on path difference
        // Acoustic wavelength: lambda_sound = c / f_audio
        // Instead of ultrasonic real time delays, we modulate the relative sound volume
        // based on the resultant theoretical interference amplitude A_res
        const maxAmp = (this.physics.sources[0]?.amplitude || 1) + (this.physics.sources[1]?.amplitude || 1);
        const normVol = maxAmp > 0 ? (m.resultantAmplitude / maxAmp) : 0;

        // Smooth volume modulation
        const targetVol = this.isEnabled ? Math.pow(normVol, 1.2) * 0.35 : 0;
        this.masterGain.gain.setTargetAtTime(targetVol, this.audioCtx.currentTime, 0.04);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = WaveAudio;
} else {
    window.WaveAudio = WaveAudio;
}
