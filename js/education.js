/**
 * Educational Guide and Physics Lecture Module
 * Provides university-level physics explanations, mathematical derivations,
 * and one-click interactive live demonstrations.
 */

class EducationModule {
    constructor(containerId, physics) {
        this.container = document.getElementById(containerId);
        this.physics = physics;
        this.activeTopicId = 'superposition';

        this.topics = [
            {
                id: 'waves_intro',
                title: '1. Mechanical Waves & Propagation',
                badge: 'Fundamental',
                content: `
                    <h4>1.1 Nature of Mechanical Surface Waves</h4>
                    <p>
                        A water wave is an oscillation of matter that transfers energy, momentum, and information through a medium without a net displacement of mass. 
                        In deep water, surface particles execute orbital (circular or elliptical) trajectories combining transverse (vertical) and longitudinal (horizontal) motions.
                    </p>

                    <h4>1.2 The Two-Dimensional Classical Wave Equation</h4>
                    <p>
                        In an isotropic, non-dispersive fluid medium, the small-amplitude displacement scalar field \\(y(\\mathbf{r}, t)\\) satisfies the 2D linear wave equation:
                    </p>
                    \\[
                    \\nabla^2 y = \\frac{\\partial^2 y}{\\partial x^2} + \\frac{\\partial^2 y}{\\partial y^2} = \\frac{1}{v^2} \\frac{\\partial^2 y}{\\partial t^2}
                    \\]
                    <p>
                        where \\(v\\) is the phase velocity of the wave. For an idealized isotropic point source located at the origin, the outgoing solution in cylindrical coordinates takes the form:
                    </p>
                    \\[
                    y(r, t) = \\frac{A}{\\sqrt{r}} \\sin(kr - \\omega t + \\phi)
                    \\]
                    <p>
                        where the factor \\(1/\\sqrt{r}\\) arises from energy conservation across expanding cylindrical wavefront surfaces \\(2\\pi r\\). In the absence of attenuation or over localized regions, this simplifies to the standard monochromatic circular wave model \\(y(r, t) = A \\sin(kr - \\omega t + \\phi)\\).
                    </p>
                `,
                demoAction: () => {
                    this.physics.sources = [];
                    this.physics.addSource(0, 0, 0, 1.0);
                    this.physics.setWaveSpeed(2.0);
                    this.physics.setFrequency(1.0);
                    if (window.app) window.app.syncControlsFromPhysics();
                }
            },
            {
                id: 'dispersion_relation',
                title: '2. Frequency, Wavelength, and Wave Speed',
                badge: 'Kinematics',
                content: `
                    <h4>2.1 Fundamental Kinematic Relations</h4>
                    <p>
                        Periodic harmonic waves are characterized by temporal frequency \\(f\\) (in Hertz) and spatial wavelength \\(\\lambda\\) (in meters). The time required for one full oscillation is the period \\(T = 1/f\\).
                    </p>
                    <p>
                        The wave travels a distance of one wavelength \\(\\lambda\\) during one period \\(T\\). Consequently, the fundamental wave relation is:
                    </p>
                    \\[
                    v = \\frac{\\lambda}{T} = f \\lambda
                    \\]
                    <h4>2.2 Angular Variables: Angular Frequency and Wave Number</h4>
                    <p>
                        To formulate harmonic waves compactly in sinusoidal form, we define:
                    </p>
                    <ul>
                        <li><strong>Angular Frequency (\\(\\omega\\)):</strong> Temporal rate of phase rotation:
                            \\[ \\omega = 2\\pi f = \\frac{2\\pi}{T} \\quad (\\text{rad/s}) \\]
                        </li>
                        <li><strong>Wave Number (\\(k\\)):</strong> Spatial rate of phase change per unit length:
                            \\[ k = \\frac{2\\pi}{\\lambda} \\quad (\\text{rad/m}) \\]
                        </li>
                    </ul>
                    <p>
                        The phase speed can equivalently be expressed as the ratio:
                    </p>
                    \\[
                    v = \\frac{\\omega}{k}
                    \\]
                `,
                demoAction: () => {
                    this.physics.setWaveSpeed(2.0);
                    this.physics.setFrequency(2.0); // Halves lambda to 1.0m
                    if (window.app) window.app.syncControlsFromPhysics();
                }
            },
            {
                id: 'superposition',
                title: '3. The Principle of Wave Superposition',
                badge: 'Core Principle',
                content: `
                    <h4>3.1 Linear Differential Superposition</h4>
                    <p>
                        Because the wave equation is a <strong>linear partial differential equation</strong>, any linear combination of valid solutions is itself an exact solution.
                    </p>
                    <p>
                        When two or more waves travel simultaneously through the same medium, the net displacement \\(y(\\mathbf{r}, t)\\) at any point is simply the algebraic sum of the individual displacements:
                    </p>
                    \\[
                    y(\\mathbf{r}, t) = y_1(\\mathbf{r}, t) + y_2(\\mathbf{r}, t) = \\sum_{i=1}^N y_i(\\mathbf{r}, t)
                    \\]
                    <h4>3.2 Non-Interacting Wave Trains</h4>
                    <p>
                        Crucially, waves pass through one another without modifying each other's amplitudes, frequencies, or trajectories. Once the wave packets traverse past the interference region, they continue unchanged.
                    </p>
                `,
                demoAction: () => {
                    this.physics.setSourceSeparation(3.0);
                    this.physics.setPhaseDifference(0.0);
                    if (window.app) window.app.syncControlsFromPhysics();
                }
            },
            {
                id: 'interference_theory',
                title: '4. Path Difference & Phase Difference',
                badge: 'Interference',
                content: `
                    <h4>4.1 Derivation of Total Phase Difference</h4>
                    <p>
                        Consider two point sources \\(S_1\\) and \\(S_2\\) separated by distance \\(d\\), with initial phases \\(\\phi_1\\) and \\(\\phi_2\\). At an arbitrary observation point \\(P(x,y)\\), the distances are:
                    </p>
                    \\[
                    r_1 = \\sqrt{(x - x_1)^2 + (y - y_1)^2}, \\qquad r_2 = \\sqrt{(x - x_2)^2 + (y - y_2)^2}
                    \\]
                    <p>
                        The individual wave phases at point \\(P\\) are \\(\\Phi_1 = k r_1 - \\omega t + \\phi_1\\) and \\(\\Phi_2 = k r_2 - \\omega t + \\phi_2\\). The phase difference \\(\\Delta \\Phi = \\Phi_1 - \\Phi_2\\) is independent of time \\(t\\):
                    </p>
                    \\[
                    \\Delta \\Phi = k(r_1 - r_2) + (\\phi_1 - \\phi_2) = \\frac{2\\pi}{\\lambda}\\Delta r + \\Delta \\phi_0
                    \\]
                    <p>
                        where \\(\\Delta r = r_1 - r_2\\) is the <strong>optical / acoustic path difference</strong>, and \\(\\Delta \\phi_0 = \\phi_1 - \\phi_2\\) is the source initial phase difference.
                    </p>
                    <h4>4.2 Resultant Amplitude Formula</h4>
                    <p>
                        Using trigonometric identities or phasor addition, the resultant displacement for equal amplitudes \\(A_1 = A_2 = A\\) is:
                    </p>
                    \\[
                    y(t) = 2A \\cos\\left(\\frac{\\Delta \\Phi}{2}\\right) \\sin\\left(k\\frac{r_1 + r_2}{2} - \\omega t + \\frac{\\phi_1 + \\phi_2}{2}\\right)
                    \\]
                    <p>
                        The resultant amplitude \\(A_{\\text{res}}\\) is strictly governed by the spatial phase difference:
                    </p>
                    \\[
                    A_{\\text{res}} = 2A \\left| \\cos\\left( \\frac{\\Delta \\Phi}{2} \\right) \\right| = \\sqrt{A_1^2 + A_2^2 + 2 A_1 A_2 \\cos(\\Delta \\Phi)}
                    \\]
                `,
                demoAction: () => {
                    this.physics.setSourceSeparation(3.0);
                    this.physics.setPhaseDifference(0.0);
                    if (window.app && window.app.renderer2d) {
                        window.app.renderer2d.setProbePosition(1.0, 2.0);
                    }
                }
            },
            {
                id: 'constructive_destructive',
                title: '5. Constructive & Destructive Interference',
                badge: 'Conditions',
                content: `
                    <h4>5.1 Constructive Interference (Antinodal Regions)</h4>
                    <p>
                        Occurs when waves arrive in phase, crest-on-crest and trough-on-trough, reinforcing each other to produce maximum amplitude:
                    </p>
                    \\[
                    \\Delta \\Phi = 2m\\pi \\quad (m = 0, \\pm 1, \\pm 2, \\dots)
                    \\]
                    <p>
                        Substituting \\(\\Delta \\Phi = \\frac{2\\pi}{\\lambda}\\Delta r + \\Delta \\phi_0\\):
                    </p>
                    \\[
                    \\Delta r = \\left( m - \\frac{\\Delta \\phi_0}{2\\pi} \\right) \\lambda
                    \\]
                    <p>
                        For in-phase sources (\\(\\Delta \\phi_0 = 0\\)), constructive interference requires the path difference to be an exact integer multiple of the wavelength:
                    </p>
                    \\[
                    \\Delta r = m \\lambda \\implies A_{\\text{res}} = A_1 + A_2 = 2A
                    \\]

                    <h4>5.2 Destructive Interference (Nodal Regions)</h4>
                    <p>
                        Occurs when waves arrive exactly out of phase (in anti-phase), where a wave crest cancels a wave trough:
                    </p>
                    \\[
                    \\Delta \\Phi = (2m + 1)\\pi \\quad (m = 0, \\pm 1, \\pm 2, \\dots)
                    \\]
                    \\[
                    \\Delta r = \\left( m + \\frac{1}{2} - \\frac{\\Delta \\phi_0}{2\\pi} \\right) \\lambda
                    \\]
                    <p>
                        For in-phase sources (\\(\\Delta \\phi_0 = 0\\)), the path difference is a half-integer multiple of the wavelength:
                    </p>
                    \\[
                    \\Delta r = \\left(m + \\frac{1}{2}\\right) \\lambda \\implies A_{\\text{res}} = |A_1 - A_2| = 0
                    \\]
                    <p>
                        At these nodal points, the water surface remains completely motionless despite large incoming waves from both sources!
                    </p>
                `,
                demoAction: () => {
                    this.physics.setSourceSeparation(3.0);
                    this.physics.setPhaseDifference(0.0);
                    if (window.app && window.app.renderer2d) {
                        // Place probe at central antinode (x=0)
                        window.app.renderer2d.setProbePosition(0.0, 3.0);
                    }
                }
            },
            {
                id: 'nodal_antinodal_lines',
                title: '6. Nodal and Antinodal Hyperbolic Lines',
                badge: 'Geometry',
                content: `
                    <h4>6.1 Confocal Hyperbolas in 2D Space</h4>
                    <p>
                        In analytical geometry, the locus of all points \\(P(x,y)\\) such that the absolute difference between distances to two fixed focal points \\(S_1\\) and \\(S_2\\) is constant,
                        \\(|r_1 - r_2| = 2a\\), is by definition a <strong>hyperbola</strong>.
                    </p>
                    <p>
                        Because the interference conditions specify constant path differences \\(\\Delta r = \\text{const}\\), all nodal lines (regions of zero motion) and antinodal lines (regions of maximum oscillation) form a family of <strong>confocal hyperbolas</strong> with the two wave sources at their foci!
                    </p>
                    \\[
                    \\frac{x^2}{a^2} - \\frac{y^2}{b^2} = 1, \\quad \\text{where } c = \\frac{d}{2}, \\; a = \\frac{\\Delta r}{2}, \\; b = \\sqrt{c^2 - a^2}
                    \\]
                    <h4>6.2 Maximum Number of Observable Lines</h4>
                    <p>
                        Since the path difference cannot exceed the physical separation between sources (\\(|\\Delta r| \\le d\\)), the maximum interference order \\(m_{\\text{max}}\\) is bounded by:
                    </p>
                    \\[
                    |m| \\le \\frac{d}{\\lambda}
                    \\]
                    <p>
                        If \\(d < \\lambda/2\\), no destructive nodal hyperbolas can form in the basin!
                    </p>
                `,
                demoAction: () => {
                    this.physics.setSourceSeparation(4.0);
                    this.physics.setWavelength(1.0);
                    this.physics.setPhaseDifference(0.0);
                    if (window.app) {
                        window.app.renderer2d.showNodalLines = true;
                        window.app.renderer2d.showAntinodalLines = true;
                        window.app.syncControlsFromPhysics();
                    }
                }
            },
            {
                id: 'coherence',
                title: '7. Coherence and Phase Stability',
                badge: 'Optics & Waves',
                content: `
                    <h4>7.1 The Coherence Condition</h4>
                    <p>
                        Stationary, observable interference patterns require the wave sources to be <strong>coherent</strong>:
                    </p>
                    <ol>
                        <li><strong>Identical Frequency (\\(\\omega_1 = \\omega_2\\)):</strong> If frequencies differ, the phase difference \\(\\Delta \\Phi(t) = (\\omega_2 - \\omega_1)t + \\dots\\) becomes time-dependent, causing interference fringes to wash out in rapid temporal beats.</li>
                        <li><strong>Constant Phase Difference (\\(\\Delta \\phi_0 = \\text{const}\\)):</strong> Random phase jumps destroy stationary nodal structures.</li>
                        <li><strong>Same Polarization / Wave Mode:</strong> Displacements must be along the same physical dimension for scalar superposition.</li>
                    </ol>
                `,
                demoAction: () => {
                    this.physics.setPhaseDifference(0.0);
                    if (window.app) window.app.syncControlsFromPhysics();
                }
            }
        ];

        this.render();
    }

    render() {
        if (!this.container) return;

        let navHTML = '<div class="edu-nav">';
        this.topics.forEach(t => {
            const active = t.id === this.activeTopicId ? 'active' : '';
            navHTML += `
                <button class="edu-nav-btn ${active}" onclick="window.app.education.selectTopic('${t.id}')">
                    <span>${t.title}</span>
                    <span class="edu-badge">${t.badge}</span>
                </button>
            `;
        });
        navHTML += '</div>';

        const currentTopic = this.topics.find(t => t.id === this.activeTopicId) || this.topics[0];

        const contentHTML = `
            <div class="edu-content-card">
                <div class="edu-card-header">
                    <h3>${currentTopic.title}</h3>
                    <button class="btn btn-primary btn-sm" onclick="window.app.education.runTopicDemo('${currentTopic.id}')">
                        <i class="fas fa-play"></i> Load Live Demonstration
                    </button>
                </div>
                <div class="edu-body">
                    ${currentTopic.content}
                </div>
            </div>
        `;

        this.container.innerHTML = `
            <div class="edu-layout">
                ${navHTML}
                <div class="edu-main-pane">
                    ${contentHTML}
                </div>
            </div>
        `;

        // Typeset math with KaTeX
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

    selectTopic(id) {
        this.activeTopicId = id;
        this.render();
    }

    runTopicDemo(id) {
        const topic = this.topics.find(t => t.id === id);
        if (topic && topic.demoAction) {
            topic.demoAction();
            // Switch view back to simulation
            if (window.app) {
                window.app.switchMainTab('simulation');
            }
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = EducationModule;
} else {
    window.EducationModule = EducationModule;
}
