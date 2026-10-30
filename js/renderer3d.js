/**
 * 3D Wave Simulation Renderer using Three.js
 * Visualizes 3D water surface deformation, physical oscillations,
 * vibrating source plungers, and a dynamic floating probe buoy.
 */

class WaveRenderer3D {
    constructor(container, physics) {
        this.container = container;
        this.physics = physics;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;

        // Mesh and geometry
        this.waterMesh = null;
        this.waterGeometry = null;
        this.gridSegments = 120; // 120x120 vertices = 14,400 vertices
        this.sourceObjects = [];
        this.probeObject = null;

        // Display options
        this.showWireframe = false;
        this.surfaceColorMode = 'realistic'; // 'realistic', 'elevation', 'cyber'
        this.verticalExaggeration = 0.8; // Scaling factor for clear visual height
        this.isEnabled = false;

        this.init();
    }

    init() {
        if (typeof THREE === 'undefined') {
            console.error('Three.js is not loaded');
            return;
        }

        const width = this.container.clientWidth || 800;
        const height = this.container.clientHeight || 600;

        // 1. Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x060913);
        this.scene.fog = new THREE.FogExp2(0x060913, 0.035);

        // 2. Camera
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        this.camera.position.set(0, 8, 12);
        this.camera.lookAt(0, 0, 0);

        // 3. Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // 4. Orbit Controls
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.maxPolarAngle = Math.PI / 2 - 0.02; // Don't go below water
            this.controls.minDistance = 3;
            this.controls.maxDistance = 25;
        }

        // 5. Lighting
        const ambientLight = new THREE.AmbientLight(0x1a2e4a, 1.2);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
        sunLight.position.set(8, 15, 8);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 1024;
        sunLight.shadow.mapSize.height = 1024;
        this.scene.add(sunLight);

        const rimLight = new THREE.DirectionalLight(0x00f0ff, 1.0);
        rimLight.position.set(-8, 5, -8);
        this.scene.add(rimLight);

        // 6. Tank Base / Basin Frame
        this.buildTankBasin();

        // 7. Water Surface Mesh
        this.buildWaterSurface();

        // 8. Probe 3D Buoy
        this.buildProbeObject();

        // 9. Resize Listener
        window.addEventListener('resize', () => this.onWindowResize());
    }

    buildTankBasin() {
        const domain = this.physics.params.domainSize;
        const wallThickness = 0.3;
        const wallHeight = 1.6;

        const basinMat = new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            roughness: 0.8,
            metalness: 0.2
        });

        // Floor of the tank
        const floorGeo = new THREE.BoxGeometry(domain + wallThickness * 2, 0.4, domain + wallThickness * 2);
        const floor = new THREE.Mesh(floorGeo, basinMat);
        floor.position.set(0, -wallHeight - 0.2, 0);
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Grid on tank floor
        const gridHelper = new THREE.GridHelper(domain, 10, 0x00f0ff, 0x1e293b);
        gridHelper.position.y = -wallHeight;
        this.scene.add(gridHelper);

        // Acrylic glass walls
        const wallMat = new THREE.MeshPhysicalMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.25,
            roughness: 0.1,
            metalness: 0.1,
            transmission: 0.6,
            ior: 1.33
        });

        const wallNorth = new THREE.Mesh(new THREE.BoxGeometry(domain, wallHeight, wallThickness), wallMat);
        wallNorth.position.set(0, -wallHeight / 2 + 0.3, -domain / 2 - wallThickness / 2);
        this.scene.add(wallNorth);

        const wallSouth = new THREE.Mesh(new THREE.BoxGeometry(domain, wallHeight, wallThickness), wallMat);
        wallSouth.position.set(0, -wallHeight / 2 + 0.3, domain / 2 + wallThickness / 2);
        this.scene.add(wallSouth);

        const wallWest = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, domain), wallMat);
        wallWest.position.set(-domain / 2 - wallThickness / 2, -wallHeight / 2 + 0.3, 0);
        this.scene.add(wallWest);

        const wallEast = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, domain), wallMat);
        wallEast.position.set(domain / 2 + wallThickness / 2, -wallHeight / 2 + 0.3, 0);
        this.scene.add(wallEast);
    }

    buildWaterSurface() {
        const domain = this.physics.params.domainSize;
        const segs = this.gridSegments;

        // PlaneGeometry along X and Y; we will rotate it so Y becomes normal (horizontal surface)
        this.waterGeometry = new THREE.PlaneGeometry(domain, domain, segs, segs);
        this.waterGeometry.rotateX(-Math.PI / 2); // Now flat on X-Z plane, displacement along Y

        // Vertex colors for elevation visualization
        const count = this.waterGeometry.attributes.position.count;
        const colors = new Float32Array(count * 3);
        this.waterGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        this.waterMaterial = new THREE.MeshStandardMaterial({
            color: 0x0284c7,
            roughness: 0.15,
            metalness: 0.85,
            vertexColors: true,
            wireframe: this.showWireframe,
            flatShading: false,
            side: THREE.DoubleSide
        });

        this.waterMesh = new THREE.Mesh(this.waterGeometry, this.waterMaterial);
        this.waterMesh.castShadow = true;
        this.waterMesh.receiveShadow = true;
        this.scene.add(this.waterMesh);
    }

    buildProbeObject() {
        // Buoy consisting of a floating sphere and a vertical sensor mast
        this.probeGroup = new THREE.Group();

        // Float ring
        const torusGeo = new THREE.TorusGeometry(0.25, 0.08, 16, 32);
        const floatMat = new THREE.MeshStandardMaterial({ color: 0x39ff14, roughness: 0.3, metalness: 0.5 });
        const floatMesh = new THREE.Mesh(torusGeo, floatMat);
        floatMesh.rotation.x = Math.PI / 2;
        this.probeGroup.add(floatMesh);

        // Mast pole
        const mastGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.9, 16);
        const mastMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
        const mast = new THREE.Mesh(mastGeo, mastMat);
        mast.position.y = 0.45;
        this.probeGroup.add(mast);

        // Top blinking beacon
        const beaconGeo = new THREE.SphereGeometry(0.08, 16, 16);
        const beaconMat = new THREE.MeshBasicMaterial({ color: 0x39ff14 });
        this.probeBeacon = new THREE.Mesh(beaconGeo, beaconMat);
        this.probeBeacon.position.y = 0.9;
        this.probeGroup.add(this.probeBeacon);

        this.scene.add(this.probeGroup);
    }

    /**
     * Synchronize 3D vibrating source pistons with physics sources
     */
    updateSourceObjects() {
        // Remove excess objects
        while (this.sourceObjects.length > this.physics.sources.length) {
            const obj = this.sourceObjects.pop();
            this.scene.remove(obj.group);
        }

        // Add missing objects
        while (this.sourceObjects.length < this.physics.sources.length) {
            const group = new THREE.Group();

            // Vertical plunger rod
            const rodGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.8, 16);
            const rodMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
            const rod = new THREE.Mesh(rodGeo, rodMat);
            rod.position.y = 0.9;
            group.add(rod);

            // Spherical dipper tip
            const tipGeo = new THREE.SphereGeometry(0.16, 24, 24);
            const tipMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, roughness: 0.2, metalness: 0.8 });
            const tip = new THREE.Mesh(tipGeo, tipMat);
            tip.position.y = 0;
            group.add(tip);

            // Ring stand at the top
            const topGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.1, 16);
            const topMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
            const top = new THREE.Mesh(topGeo, topMat);
            top.position.y = 1.8;
            group.add(top);

            this.scene.add(group);
            this.sourceObjects.push({ group, tip, rod, tipMat });
        }

        // Position and animate plungers
        const t = this.physics.time;
        for (let i = 0; i < this.physics.sources.length; i++) {
            const src = this.physics.sources[i];
            const obj = this.sourceObjects[i];

            // In our 3D space: X = src.x, Z = -src.y
            obj.group.position.x = src.x;
            obj.group.position.z = -src.y;

            // Dipping vertical oscillation
            if (src.enabled) {
                const dipPhase = -this.physics.params.angularFrequency * t + src.initialPhase;
                const dipOffset = src.amplitude * 0.3 * Math.sin(dipPhase);
                obj.group.position.y = dipOffset;
                obj.tipMat.color.set(src.color || 0x00f0ff);
                obj.tipMat.emissive.set(src.color || 0x00f0ff);
                obj.tipMat.emissiveIntensity = 0.4;
                obj.group.visible = true;
            } else {
                obj.group.position.y = 0.5; // Lifted out of water when disabled
                obj.tipMat.color.set(0x475569);
                obj.tipMat.emissive.set(0x000000);
                obj.group.visible = false;
            }
        }
    }

    /**
     * Main 3D Animation & Mesh Displacement Update
     */
    update() {
        if (!this.waterGeometry) return;

        const positions = this.waterGeometry.attributes.position.array;
        const colors = this.waterGeometry.attributes.color.array;
        const t = this.physics.time;
        const p = this.physics.params;
        const totalAmp = Math.max(0.1, p.amplitude * 2);

        // Update every vertex elevation
        const count = positions.length / 3;
        for (let i = 0; i < count; i++) {
            const vx = positions[i * 3];     // X
            const vz = positions[i * 3 + 2]; // Z (maps to physical -y)
            const physicalY = -vz;

            // Physical displacement
            const disp = this.physics.computeDisplacement(vx, physicalY, t);
            const elevatedY = disp * this.verticalExaggeration;
            positions[i * 3 + 1] = elevatedY;

            // Color gradient based on displacement
            const norm = Math.max(-1.0, Math.min(1.0, disp / totalAmp));
            let r = 0, g = 0, b = 0;

            if (norm >= 0) {
                // Crest: cyan to bright white
                r = 0.05 + norm * 0.85;
                g = 0.45 + norm * 0.55;
                b = 0.75 + norm * 0.25;
            } else {
                // Trough: oceanic navy to deep indigo
                const absNorm = -norm;
                r = 0.02 * (1 - absNorm);
                g = 0.15 * (1 - absNorm);
                b = 0.45 * (1 - absNorm * 0.6);
            }

            colors[i * 3] = r;
            colors[i * 3 + 1] = g;
            colors[i * 3 + 2] = b;
        }

        this.waterGeometry.attributes.position.needsUpdate = true;
        this.waterGeometry.attributes.color.needsUpdate = true;
        this.waterGeometry.computeVertexNormals();

        // Update Source Plungers
        this.updateSourceObjects();

        // Update Probe Buoy Position and Height
        if (this.probeGroup && window.app && window.app.renderer2d) {
            const probePos = window.app.renderer2d.probePosition;
            const probeDisp = this.physics.computeDisplacement(probePos.x, probePos.y, t);
            this.probeGroup.position.set(probePos.x, probeDisp * this.verticalExaggeration, -probePos.y);

            // Beacon flash
            if (this.probeBeacon) {
                const flash = 0.5 + 0.5 * Math.sin(t * 8);
                this.probeBeacon.scale.setScalar(0.8 + 0.3 * flash);
            }
        }

        // Update OrbitControls
        if (this.controls) {
            this.controls.update();
        }

        // Render scene
        this.renderer.render(this.scene, this.camera);
    }

    setWireframe(enabled) {
        this.showWireframe = enabled;
        if (this.waterMaterial) {
            this.waterMaterial.wireframe = enabled;
        }
    }

    setVerticalExaggeration(val) {
        this.verticalExaggeration = val;
    }

    resetCamera() {
        if (this.camera && this.controls) {
            this.camera.position.set(0, 8, 12);
            this.camera.lookAt(0, 0, 0);
            this.controls.target.set(0, 0, 0);
            this.controls.update();
        }
    }

    onWindowResize() {
        if (!this.container || !this.renderer || !this.camera) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (width === 0 || height === 0) return;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = WaveRenderer3D;
} else {
    window.WaveRenderer3D = WaveRenderer3D;
}
