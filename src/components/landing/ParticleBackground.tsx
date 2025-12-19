import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ParticleBackgroundProps {
  className?: string;
}

const COLORS = {
  background: 0x000000,
  primary: 0x06b6d4,
  secondary: 0x10b981,
};

const CONFIG = {
  particleCount: 3500,
  morphSpeed: 0.03,
  shapeDuration: 5000,     // Tempo que fica em cada forma (ms) - 5 segundos
  rotationSpeed: 0.05,
  mouseInfluence: 0.05,
};

export default function ParticleBackground({ className }: ParticleBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Setup Básico
    const scene = new THREE.Scene();
    // Fundo transparente para não sobrepor a Hero

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.z = 10;  // Mais próximo = animação ~20% maior
    camera.position.x = -2;  // Deslocado para esquerda = animação aparece mais à direita
    camera.position.y = 0.5;   // Levemente acima = animação aparece mais centralizada

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); // Transparente
    container.appendChild(renderer.domElement);

    // 2. Geometrias (Os "Moldes" das formas)
    const particles = CONFIG.particleCount;
    const positions: number[][] = [[], [], [], [], []];
    // 0: Caos/Nuvem, 1: Laptop, 2: Gráfico, 3: Foguete, 4: Cérebro

    // --- Forma 0: Nuvem Aleatória (Estado inicial) ---
    for (let i = 0; i < particles; i++) {
      positions[0].push((Math.random() - 0.5) * 15);
      positions[0].push((Math.random() - 0.5) * 10);
      positions[0].push((Math.random() - 0.5) * 10);
    }

    // --- Forma 1: Laptop (CRM Dashboard) ---
    for (let i = 0; i < particles; i++) {
      const ratio = Math.random();
      if (ratio < 0.7) {
        // Tela
        positions[1].push((Math.random() - 0.5) * 6);
        positions[1].push(Math.random() * 3.5 - 0.5);
        positions[1].push(-1.5);
      } else {
        // Teclado
        positions[1].push((Math.random() - 0.5) * 6);
        positions[1].push(-0.5);
        positions[1].push((Math.random() * 3) - 1.5);
      }
    }

    // --- Forma 2: Gráfico de Barras ---
    for (let i = 0; i < particles; i++) {
      const bar = Math.floor(Math.random() * 4);
      const barWidth = 1.2;
      const gap = 0.5;
      const offsetX = -3;
      const heights = [1.5, 2.5, 4.0, 5.5];

      const x = offsetX + bar * (barWidth + gap) + (Math.random() - 0.5) * barWidth;
      const y = (Math.random() * heights[bar]) - 2;
      const z = (Math.random() - 0.5) * 1.2;

      positions[2].push(x, y, z);
    }

// --- Forma 3: Foguete (Aprimorado) ---

// Configurações do Foguete (Ajuste aqui para mudar o visual)
const rocketRadius = 0.7;
const rocketHeight = 3.0; // Altura do corpo cilíndrico
const coneHeight = 1.8;   // Altura do bico
const finSpan = 1.2;      // O quanto a aleta sai para fora
const finHeight = 1.5;    // Altura da aleta
const flameLen = 3.5;     // Comprimento da chama

const yBase = -1.0;       // Ponto onde começa o corpo (base)
const yCone = yBase + rocketHeight; // Onde começa o cone

for (let i = 0; i < particles; i++) {
  const part = Math.random();
  const angle = Math.random() * Math.PI * 2;

  let x, y, z;

  // 1. Corpo principal (Cilindro com leve variação de textura) - 40%
  if (part < 0.40) {
    const rBody = rocketRadius * (0.95 + Math.random() * 0.1); // Leve rugosidade
    const hPos = Math.random(); // 0 a 1 ao longo do corpo

    x = Math.cos(angle) * rBody;
    y = yBase + hPos * rocketHeight;
    z = Math.sin(angle) * rBody;
  }

  // 2. Ogiva / Bico (Curva Aerodinâmica) - 20%
  else if (part < 0.60) {
    const progress = Math.random(); // 0 (base do cone) a 1 (ponta)

    // Math.pow gera uma curva suave (ogiva) em vez de um cone reto
    // 0.5 arredonda, 1.0 é reto, >1.0 afunda
    const radiusFactor = Math.pow(1 - progress, 0.7);
    const rCone = rocketRadius * radiusFactor;

    x = Math.cos(angle) * rCone;
    y = yCone + progress * coneHeight;
    z = Math.sin(angle) * rCone;
  }

  // 3. Aletas (3 aletas sólidas) - 20%
  else if (part < 0.80) {
    // Escolhe uma das 3 aletas (0, 120, 240 graus)
    const finIndex = Math.floor(Math.random() * 3);
    const finBaseAngle = finIndex * (Math.PI * 2 / 3);

    // Matemática para criar um triângulo retângulo saindo do corpo
    const u = Math.random(); // Distância radial
    const v = Math.random(); // Altura na aleta

    // Garante que preencha a forma de triângulo (se u+v > 1, inverte)
    let distOut = u * finSpan;
    let hUp = v * finHeight;
    if (u + v > 1) {
       distOut = (1 - u) * finSpan;
       hUp = (1 - v) * finHeight;
    }

    // Espessura da aleta para dar volume 3D
    const thickness = (Math.random() - 0.5) * 0.15;

    // Rotacionar a aleta para a posição correta
    const rCurrent = rocketRadius + distOut;

    // Coordenadas locais (sem rotação)
    const xLocal = rCurrent;
    const yLocal = yBase + hUp * 0.8; // *0.8 para ficar levemente abaixo do corpo
    const zLocal = thickness;

    // Aplica rotação da aleta
    x = xLocal * Math.cos(finBaseAngle) - zLocal * Math.sin(finBaseAngle);
    y = yLocal;
    z = xLocal * Math.sin(finBaseAngle) + zLocal * Math.cos(finBaseAngle);
  }

  // 4. Propulsão / Chama (Núcleo denso e cauda dispersa) - 20%
  else {
    const progress = Math.random(); // 0 (perto do motor) a 1 (final da chama)

    // A chama afina conforme desce, mas com jitter (vibração)
    const narrowFactor = (1 - progress * 0.5);
    const rFlame = (Math.random() * 0.4) * narrowFactor;

    // Jitter aumenta quanto mais longe do motor (turbulência)
    const turbulence = progress * 0.3;
    const jitterX = (Math.random() - 0.5) * turbulence;
    const jitterZ = (Math.random() - 0.5) * turbulence;

    x = Math.cos(angle) * rFlame + jitterX;
    y = yBase - (progress * flameLen) - 0.2; // -0.2 para separar um pouco do corpo
    z = Math.sin(angle) * rFlame + jitterZ;
  }

  // Adiciona ao array de posições
  positions[3].push(x, y, z);
}

    // --- Forma 4: Cérebro/Globo ---
// --- Forma 4: Cérebro Humano ---
for (let i = 0; i < particles; i++) {
  // 1. Distribuição baseada em esfera, mas vamos trabalhar apenas com um hemisfério
  // e duplicar/espelhar logicamente para garantir a divisão central.
  const phi = Math.random() * Math.PI;      // Norte ao Sul
  const theta = Math.random() * Math.PI;    // Apenas 0 a 180 graus (metade)

  // Decidir se é hemisfério esquerdo ou direito (50% de chance)
  const isRight = Math.random() > 0.5;
  const sideSign = isRight ? 1 : -1;

  // 2. Criar a textura "enrugada" (Giro e Sulco)
  // Usamos senos e cossenos de alta frequência para variar o raio
  const baseR = 2.5;
  const wrinkleFrequency = 4.0;
  const wrinkleAmp = 0.2;

  // O "ruído" matemático que cria as rugas baseado na posição
  const noise = Math.sin(phi * wrinkleFrequency) * Math.cos(theta * wrinkleFrequency * 2);
  let r = baseR + noise * wrinkleAmp;

  // Adiciona um pouco de volume interno (aleatório) para não ser uma casca oca
  r -= Math.random() * 0.3;

  // 3. Converter para Cartesiano (X, Y, Z) inicial
  // Nota: Multiplicamos theta por sideSign para jogar para o lado certo
  let x = r * Math.sin(phi) * Math.cos(theta);
  let y = r * Math.cos(phi); // Y é altura aqui
  let z = r * Math.sin(phi) * Math.sin(theta);

  // 4. Modelagem Anatômica (Deformar a esfera para virar cérebro)

  // Achatamento inferior (Corte do tronco encefálico/cerebelo)
  // Se Y for muito baixo, encolhemos um pouco
  if (y < -1) {
     x *= 0.8;
     z *= 0.8;
  }

  // Alongamento (Cérebro é mais comprido que largo)
  z *= 1.4; // Estica no eixo Z (frente-trás)
  y *= 0.9; // Achata levemente a altura

  // Separação dos Hemisférios (A grande fenda central)
  // Empurramos o X para fora baseada na direção (sideSign)
  const gap = 0.2;
  x = Math.abs(x) * sideSign + (gap * sideSign);

  // Ajuste final: O cérebro é mais largo atrás do que na frente
  // Se Z for positivo (frente), estreita um pouco o X
  if (z > 0) {
      x *= 0.9;
  }

  // Adiciona ao array na posição 4 (conforme seu padrão)
  positions[4].push(x);
  positions[4].push(y);
  positions[4].push(z);
}

    // 3. Criar a Nuvens de Pontos (Geometry)
    const geometry = new THREE.BufferGeometry();
    const currentPositions = new Float32Array(particles * 3);
    const colors = new Float32Array(particles * 3);
    const sizes = new Float32Array(particles);

    for (let i = 0; i < particles; i++) {
      currentPositions[i * 3] = positions[0][i * 3];
      currentPositions[i * 3 + 1] = positions[0][i * 3 + 1];
      currentPositions[i * 3 + 2] = positions[0][i * 3 + 2];

      // Pontos brancos
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 1.0;
      colors[i * 3 + 2] = 1.0;

      // Tamanho aleatório sutil
      sizes[i] = 0.15 + Math.random() * 0.15;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // 4. Shader Material - PONTOS FINOS E BRANCOS
    const material = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0xffffff) },
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (30.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float r = distance(gl_PointCoord, vec2(0.5, 0.5));
          if (r > 0.5) discard;
          gl_FragColor = vec4(vColor, 1.0);
        }
      `,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      transparent: true,
      vertexColors: true
    });

    const pointCloud = new THREE.Points(geometry, material);
    scene.add(pointCloud);

    // 5. Animação
    let currentShapeIndex = 0;
    let nextShapeIndex = 1;
    let lastSwitchTime = Date.now();
    let mouseX = 0;
    let mouseY = 0;
    let animationId: number;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const time = Date.now();

      if (time - lastSwitchTime > CONFIG.shapeDuration) {
        currentShapeIndex = nextShapeIndex;
        nextShapeIndex = (nextShapeIndex + 1) % positions.length;
        lastSwitchTime = time;
      }

      const positionsAttribute = geometry.attributes.position;
      const array = positionsAttribute.array as Float32Array;

      for (let i = 0; i < particles; i++) {
        const i3 = i * 3;
        const tx = positions[nextShapeIndex][i3];
        const ty = positions[nextShapeIndex][i3 + 1];
        const tz = positions[nextShapeIndex][i3 + 2];

        // Noise reduzido para manter a forma mais "limpa"
        const noiseX = Math.sin(time * 0.001 + i) * 0.01;
        const noiseY = Math.cos(time * 0.002 + i) * 0.01;

        array[i3] += (tx + noiseX - array[i3]) * CONFIG.morphSpeed;
        array[i3 + 1] += (ty + noiseY - array[i3 + 1]) * CONFIG.morphSpeed;
        array[i3 + 2] += (tz - array[i3 + 2]) * CONFIG.morphSpeed;
      }

      positionsAttribute.needsUpdate = true;

      // Oscilação suave (balanço) ao invés de rotação contínua
      const oscillation = time * 0.0003;
      pointCloud.rotation.y = Math.sin(oscillation) * 0.3; // Oscila ±0.3 rad (~17°)
      pointCloud.rotation.x = Math.sin(oscillation * 0.7) * 0.15; // Oscila ±0.15 rad (~9°)
      pointCloud.rotation.z = Math.sin(oscillation * 0.5) * 0.05; // Oscila ±0.05 rad (~3°)

      // Influência do mouse (adicional)
      pointCloud.rotation.y += mouseX * 0.2;
      pointCloud.rotation.x += mouseY * 0.1;

      renderer.render(scene, camera);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / width) * 2 - 1;
      mouseY = -(e.clientY / height) * 2 + 1;
    };

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none ${className || ''}`}
      style={{ position: 'absolute', inset: 0, zIndex: 0 }}
    />
  );
}
