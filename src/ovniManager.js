import * as THREE from 'three';

// Parâmetros de escala final
const FINAL_SCALE = { x: 1.5, y: 0.7, z: 1.5 };
const FADE_DURATION = 0.7; // segundos

/**
 * Cria um modelo procedural de OVNI (disco voador)
 * @returns {THREE.Group}
 */
export function createOvni() {
    const group = new THREE.Group();
    group.name = 'ovni';
    group.userData = { type: 'ovni' };

    // Corpo principal (disco)
    const bodyGeometry = new THREE.SphereGeometry(2, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0xaaaaaa,
        metalness: 0.7,
        roughness: 0.25
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI;
    group.add(body);

    // Cúpula superior
    const domeGeometry = new THREE.SphereGeometry(1.1, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.7);
    const domeMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x66ccff,
        metalness: 0.3,
        roughness: 0.1,
        transmission: 0.7,
        transparent: true,
        opacity: 0.7,
        clearcoat: 0.6
    });
    const dome = new THREE.Mesh(domeGeometry, domeMaterial);
    dome.position.y = 1.1;
    group.add(dome);

    // Luzes coloridas ao redor do disco
    const numLights = 8;
    for (let i = 0; i < numLights; i++) {
        const angle = (i / numLights) * Math.PI * 2;
        const x = Math.cos(angle) * 1.7;
        const z = Math.sin(angle) * 1.7;
        const lightGeometry = new THREE.SphereGeometry(0.18, 12, 12);
        const color = new THREE.Color().setHSL(i / numLights, 0.9, 0.6);
        const lightMaterial = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2 });
        const light = new THREE.Mesh(lightGeometry, lightMaterial);
        light.position.set(x, 0.15, z);
        group.add(light);
    }

    // Luz inferior (raio de abdução)
    const coneGeometry = new THREE.ConeGeometry(0.7, 3.5, 24, 1, true);
    const coneMaterial = new THREE.MeshStandardMaterial({
        color: 0x99ffff,
        transparent: true,
        opacity: 0.25,
        emissive: 0x99ffff,
        emissiveIntensity: 0.7
    });
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    cone.position.y = -1.7;
    cone.rotation.x = Math.PI;
    group.add(cone);

    group.castShadow = true;
    group.receiveShadow = true;
    group.scale.set(0, 0, 0); // Começa invisível
    return group;
}

/**
 * Controlador do OVNI: gere movimento lateral e vertical
 */
export class OvniController {
    /**
     * @param {THREE.Scene} scene
     */
    constructor(scene) {
        this.scene = scene;
        this.ovni = createOvni();
        this.scene.add(this.ovni);
        this.reset();
        this.timer = 0;
        this.active = false;
        this.fadingIn = false;
        this.fadingOut = false;
        this.fadeElapsed = 0;
    }

    reset() {
        this.ovni.position.set(-18, 15, -120); // Ainda mais alto e no fundo
        this.direction = 1; // 1 = esquerda para direita
        this.elapsed = 0;
        this.active = false;
        this.fadingIn = false;
        this.fadingOut = false;
        this.fadeElapsed = 0;
        this.setScale(0);
        this.ovni.visible = false;
    }

    setScale(f) {
        this.ovni.scale.set(
            FINAL_SCALE.x * f,
            FINAL_SCALE.y * f,
            FINAL_SCALE.z * f
        );
    }

    /**
     * Atualiza o OVNI (chamar a cada frame)
     * @param {number} deltaTime
     */
    update(deltaTime) {
        this.timer += deltaTime;
        if (!this.active && this.timer >= 15) {
            this.active = true;
            this.elapsed = 0;
            this.ovni.position.set(-18, 15, -120);
            this.direction = 1;
            this.fadingIn = true;
            this.fadingOut = false;
            this.fadeElapsed = 0;
            this.setScale(0);
            this.ovni.visible = true;
        }
        if (this.active) {
            this.elapsed += deltaTime;
            // Movimento lateral
            this.ovni.position.x += this.direction * 12 * deltaTime; // velocidade constante
            // Movimento vertical suave
            this.ovni.position.y = 15 + Math.sin(this.elapsed * 2.2) * 2.2;

            // Fade-in
            if (this.fadingIn) {
                this.fadeElapsed += deltaTime;
                let f = Math.min(1, this.fadeElapsed / FADE_DURATION);
                this.setScale(f);
                if (f >= 1) {
                    this.fadingIn = false;
                }
            }
            // Fade-out
            if (!this.fadingIn && !this.fadingOut && this.ovni.position.x > 17) {
                this.fadingOut = true;
                this.fadeElapsed = 0;
            }
            if (this.fadingOut) {
                this.fadeElapsed += deltaTime;
                let f = Math.max(0, 1 - this.fadeElapsed / FADE_DURATION);
                this.setScale(f);
                if (f <= 0.01) {
                    this.fadingOut = false;
                    this.active = false;
                    this.timer = 0;
                    this.setScale(0);
                    this.ovni.visible = false;
                    this.ovni.position.set(-18, 15, -120);
                }
            }
        } else {
            this.setScale(0);
            this.ovni.visible = false;
        }
    }
} 