'use strict';

const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(process.cwd(), 'temp');

function ensureTemp() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

function safeText(text = '') {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();
}

function safeFileName(text = '') {
  return String(text || 'galaxia')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 40) || 'galaxia';
}

function parseInput(args = []) {
  const raw = args.join(' ').trim();

  if (!raw) {
    return null;
  }

  const parts = raw.split('|').map(v => v.trim());

  return {
    nombre: safeText(parts[0] || 'Mi amor'),
    autor: safeText(parts[1] || ''),
    frase: safeText(parts[2] || 'Te Amo Muchote')
  };
}

function buildHtml({ nombre, autor, frase }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Galaxy of Love - ${nombre}</title>

  <link href="https://fonts.googleapis.com/css2?family=Pacifico&display=swap" rel="stylesheet">

  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html, body {
      overflow: hidden;
      height: 100%;
      background: #000;
      font-family: Georgia, serif;
    }

    .webgl {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      outline: none;
    }

    .heart {
      position: absolute;
      color: rgba(255, 100, 100, 0.15);
      font-size: 24px;
      animation: float 15s infinite ease-in-out;
      z-index: 0;
      pointer-events: none;
    }

    @keyframes float {
      0%, 100% {
        transform: translateY(0) rotate(0deg);
        opacity: 0.3;
      }

      50% {
        transform: translateY(-20px) rotate(10deg);
        opacity: 0.7;
      }
    }

    .credits {
      position: fixed;
      bottom: 15px;
      left: 50%;
      transform: translateX(-50%);
      color: #fff;
      font-family: 'Pacifico', cursive;
      font-size: 16px;
      text-align: center;
      text-shadow:
        0 0 3px #fff,
        0 0 6px #fff,
        0 0 10px #ff6030,
        0 0 15px #ff6030;
      z-index: 10;
      pointer-events: none;
    }

    .instructions {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      color: rgba(255, 255, 255, 0.85);
      font-family: Georgia, serif;
      font-size: 14px;
      text-align: center;
      background: rgba(0, 0, 0, 0.35);
      padding: 8px 16px;
      border-radius: 20px;
      backdrop-filter: blur(5px);
      z-index: 10;
    }

    .menu-button {
      position: fixed;
      top: 15px;
      left: 15px;
      width: 40px;
      height: 40px;
      background: rgba(0, 0, 0, 0.4);
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      z-index: 20;
      backdrop-filter: blur(5px);
    }

    .menu-button span {
      display: block;
      width: 20px;
      height: 2px;
      background: white;
      margin: 2px 0;
      border-radius: 1px;
    }

    .config-panel {
      position: fixed;
      top: 0;
      left: -320px;
      width: 300px;
      height: 100%;
      background: rgba(10, 10, 20, 0.95);
      backdrop-filter: blur(10px);
      z-index: 15;
      padding: 20px;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      transition: left 0.3s ease;
      border-right: 1px solid rgba(255, 96, 48, 0.3);
    }

    .config-panel.open {
      left: 0;
    }

    .config-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    }

    .config-title {
      color: white;
      font-family: 'Pacifico', cursive;
      font-size: 24px;
    }

    .close-button {
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      width: 30px;
      height: 30px;
      border-radius: 50%;
    }

    .config-section {
      margin-bottom: 25px;
      padding: 15px;
      background: rgba(30, 30, 40, 0.6);
      border-radius: 15px;
    }

    .config-section h3 {
      color: #ff6030;
      margin-bottom: 15px;
      font-family: 'Pacifico', cursive;
      font-size: 20px;
    }

    .config-option {
      margin-bottom: 12px;
    }

    .config-option label {
      display: block;
      color: white;
      margin-bottom: 5px;
      font-size: 14px;
    }

    .config-option input[type="range"] {
      width: 100%;
    }

    .color-options {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .color-option {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      cursor: pointer;
      border: 2px solid transparent;
    }

    .color-option.active {
      border-color: white;
      transform: scale(1.15);
    }

    .developer-info {
      margin-top: auto;
      padding: 20px;
      background: rgba(20, 20, 30, 0.8);
      border-radius: 15px;
      text-align: center;
      border: 1px solid rgba(255, 96, 48, 0.3);
    }

    .developer-info h3 {
      color: #ff6030;
      margin-bottom: 10px;
      font-family: 'Pacifico', cursive;
      font-size: 20px;
    }

    .developer-info p {
      color: rgba(255, 255, 255, 0.8);
      margin-bottom: 15px;
      font-size: 14px;
      line-height: 1.4;
    }

    .overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 14;
      display: none;
    }

    .overlay.active {
      display: block;
    }

    @media (max-width: 480px) {
      .config-panel {
        width: 100%;
        left: -100%;
      }

      .config-panel.open {
        left: 0;
      }
    }
  </style>
</head>

<body>
  <canvas class="webgl"></canvas>

  <div class="instructions">${frase}</div>
  <div class="credits">${autor}</div>

  <div class="menu-button" id="menuButton">
    <span></span>
    <span></span>
    <span></span>
  </div>

  <div class="overlay" id="overlay"></div>

  <div class="config-panel" id="configPanel">
    <div class="config-header">
      <div class="config-title">Configuración</div>
      <button class="close-button" id="closeButton">✕</button>
    </div>

    <div class="config-section">
      <h3>Corazones Orbitales</h3>

      <div class="config-option">
        <label for="heartSize">Tamaño</label>
        <input type="range" id="heartSize" min="0.3" max="1.2" step="0.1" value="0.8">
      </div>

      <div class="config-option">
        <label for="heartSpeed">Velocidad de rotación</label>
        <input type="range" id="heartSpeed" min="0" max="1" step="0.05" value="0.25">
      </div>

      <div class="config-option">
        <label>Color principal</label>
        <div class="color-options">
          <div class="color-option active" style="background-color: #FFD700;" data-color="#FFD700"></div>
          <div class="color-option" style="background-color: #C7B8EA;" data-color="#C7B8EA"></div>
          <div class="color-option" style="background-color: #800080;" data-color="#800080"></div>
          <div class="color-option" style="background-color: #0949f0;" data-color="#0949f0"></div>
          <div class="color-option" style="background-color: #8a2be2;" data-color="#8a2be2"></div>
          <div class="color-option" style="background-color: #01ffff;" data-color="#01ffff"></div>
        </div>
      </div>
    </div>

    <div class="config-section">
      <h3>Corazón Central</h3>
      <div class="config-option">
        <label for="centerHeartSize">Tamaño</label>
        <input type="range" id="centerHeartSize" min="2.0" max="5.0" step="0.2" value="3.2">
      </div>
    </div>

    <div class="config-section">
      <h3>Fondo Estelar</h3>
      <div class="config-option">
        <label for="starBrightness">Brillo de estrellas</label>
        <input type="range" id="starBrightness" min="0.3" max="1.0" step="0.1" value="0.85">
      </div>
    </div>

    <div class="developer-info">
      <h3>MR</h3>
      <p>${frase} Mi Niña Hermosa</p>
      <p style="margin-top: 12px; font-size: 12px; color: rgba(255, 255, 255, 0.6);">
        ${autor}
      </p>
    </div>
  </div>

  <audio id="bg-music" loop>
    <source src="https://raw.githubusercontent.com/Conejitobrr/sbot/main/media/cunumi.mp3" type="audio/mpeg">
  </audio>

  <script type="module">
    import * as THREE from "https://cdn.skypack.dev/three@0.132.2";
    import { OrbitControls } from "https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/OrbitControls.js";

    const CENTER_NAME = "👑${nombre}👑";
    const SMALL_TEXT = "💛Mi Niña💛";

    function createCSSHearts() {
      const heartSymbols = ['💛', '👸', '🌷', '💜', '😘', '❇', '👑'];
      const container = document.body;
      const heartCount = 30;

      for (let i = 0; i < heartCount; i++) {
        const heart = document.createElement('div');
        heart.className = 'heart';
        heart.textContent = heartSymbols[Math.floor(Math.random() * heartSymbols.length)];
        heart.style.left = \`\${Math.random() * 100}%\`;
        heart.style.top = \`\${Math.random() * 100}%\`;
        heart.style.fontSize = \`\${16 + Math.random() * 20}px\`;
        heart.style.animationDelay = \`\${Math.random() * 15}s\`;
        container.appendChild(heart);
      }
    }

    createCSSHearts();

    const canvas = document.querySelector('canvas.webgl');
    const scene = new THREE.Scene();

    const romanticPhrases = [
      "💛 Te amo 💛", "🌹 Mi amor 🌹", "👑 Mi reina 👑", "💜 And 💜", "🌌 Eres todo 🌌",
      "💫 Para siempre 💫", "🌟 Mi vida 🌟", "☀️ Mi cielo ☀️", "🌅 Mi sol 🌅", "🌸 Bella 🌸",
      "🌺 Hermosa 🌺", "🌷 Preciosa 🌷", "🍬 Dulzura 🍬", "🤗 Cariño 🤗", "💝 Amor mío 💝",
      "👸 Mi princesa 👸", "👼 Mi ángel 👼", "⭐ Mi estrella ⭐", "🌍 Mi mundo 🌍", "💎 Eres única 💎",
      "😍 Te adoro 😍", "🎁 Mi tesoro 🎁", "😊 Mi felicidad 😊", "🕊️ Mi paz 🕊️",
      "🎉 Mi alegría 🎉", "♾️ Por siempre ♾️", "💍 Amor de mi vida 💍"
    ];

    const parameters = {
      heartCount: 16,
      particlesPerHeart: 1000,
      heartSize: 0.8,
      heartSizeVariation: 0.2,
      insideColor: '#ff0055',
      outsideColor: '#ff3088',
      centerHeartSize: 3.2,
      centerHeartParticles: 3000,
      nucleusParticles: 800,
      heartCoreParticles: 100,
      autoRotateSpeed: 0.25,
      starOpacity: 0.85
    };

    let textSprites = [];
    let heartStructures = [];
    let centerHeart = null;
    let nucleusParticles = null;
    let starfield = null;
    let heartCoreSystems = [];
    let heartTexts = [];

    const createTextSprite = (text) => {
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d');

      c.width = 320;
      c.height = 80;

      ctx.font = 'Bold 32px Georgia';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const gradient = ctx.createLinearGradient(0, 0, c.width, 0);
      gradient.addColorStop(0, parameters.insideColor);
      gradient.addColorStop(0.5, '#ffffff');
      gradient.addColorStop(1, parameters.outsideColor);

      ctx.fillStyle = gradient;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 15;
      ctx.fillText(text, c.width / 2, c.height / 2);

      const texture = new THREE.CanvasTexture(c);
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.9
      });

      const sprite = new THREE.Sprite(material);
      sprite.scale.set(0.55, 0.14, 1);
      return sprite;
    };

    const createCenterHeartText = () => {
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d');

      c.width = 512;
      c.height = 128;

      ctx.font = 'Bold 60px Pacifico';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const gradient = ctx.createLinearGradient(0, 0, c.width, 0);
      gradient.addColorStop(0, '#ff6030');
      gradient.addColorStop(0.5, '#ffffff');
      gradient.addColorStop(1, '#0949f0');

      ctx.fillStyle = gradient;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 25;
      ctx.fillText(CENTER_NAME, c.width / 2, c.height / 2);

      const texture = new THREE.CanvasTexture(c);
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const sprite = new THREE.Sprite(material);
      sprite.scale.set(2.0, 0.5, 1);
      return sprite;
    };

    const createHeartText = () => {
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d');

      c.width = 256;
      c.height = 64;

      ctx.font = 'Bold 24px Pacifico';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const gradient = ctx.createLinearGradient(0, 0, c.width, 0);
      gradient.addColorStop(0, '#ff6030');
      gradient.addColorStop(0.5, '#ffffff');
      gradient.addColorStop(1, '#0949f0');

      ctx.fillStyle = gradient;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 12;
      ctx.fillText(SMALL_TEXT, c.width / 2, c.height / 2);

      const texture = new THREE.CanvasTexture(c);
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const sprite = new THREE.Sprite(material);
      sprite.scale.set(0.7, 0.17, 1);
      return sprite;
    };

    const createInvertedHeartGeometry = (size = 1.0, particleCount = 1500) => {
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);

      const colorInside = new THREE.Color(parameters.insideColor);
      const colorOutside = new THREE.Color(parameters.outsideColor);

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const t = Math.random() * Math.PI * 2;

        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        const z = (Math.random() - 0.5) * 3;

        positions[i3] = (x * size * 0.04) + (Math.random() - 0.5) * size * 0.08;
        positions[i3 + 1] = (y * size * 0.04) + (Math.random() - 0.5) * size * 0.08;
        positions[i3 + 2] = z * size * 0.08;

        const radius = Math.sqrt(x * x + y * y);
        const mixedColor = colorInside.clone();
        mixedColor.lerp(colorOutside, Math.min(radius / 20, 1));
        mixedColor.offsetHSL(0, 0.5, 0);

        colors[i3] = mixedColor.r;
        colors[i3 + 1] = mixedColor.g;
        colors[i3 + 2] = mixedColor.b;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      return geometry;
    };

    const createStarfield = () => {
      const starCount = 6000;
      const positions = new Float32Array(starCount * 3);
      const colors = new Float32Array(starCount * 3);

      for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;
        const radius = 50 + Math.random() * 150;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = radius * Math.cos(phi);

        colors[i3] = 1;
        colors[i3 + 1] = 1;
        colors[i3 + 2] = 1;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: 0.8,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: parameters.starOpacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      return new THREE.Points(geometry, material);
    };

    const createNucleusParticles = () => {
      const particleCount = parameters.nucleusParticles;
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);

      const color1 = new THREE.Color(0xff6030);
      const color2 = new THREE.Color(0x0949f0);

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const radius = Math.random() * 0.8;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = radius * Math.cos(phi);

        const mixedColor = color1.clone();
        mixedColor.lerp(color2, Math.random());

        colors[i3] = mixedColor.r;
        colors[i3 + 1] = mixedColor.g;
        colors[i3 + 2] = mixedColor.b;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: 0.03,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      return new THREE.Points(geometry, material);
    };

    const createHeartCoreParticles = (position) => {
      const particleCount = parameters.heartCoreParticles;
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);

      const baseColor = new THREE.Color(
        0.5 + Math.random() * 0.5,
        0.5 + Math.random() * 0.5,
        0.5 + Math.random() * 0.5
      );

      const accentColor = new THREE.Color(Math.random(), Math.random(), Math.random());

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const radius = Math.random() * 0.3;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = radius * Math.cos(phi);

        const mixedColor = baseColor.clone();
        mixedColor.lerp(accentColor, Math.random());

        colors[i3] = mixedColor.r;
        colors[i3 + 1] = mixedColor.g;
        colors[i3 + 2] = mixedColor.b;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: 0.02,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const particles = new THREE.Points(geometry, material);
      particles.position.copy(position);
      return particles;
    };

    const generateHearts = () => {
      textSprites.forEach(sprite => scene.remove(sprite));
      textSprites = [];

      heartTexts.forEach(text => scene.remove(text));
      heartTexts = [];

      heartStructures.forEach(heart => {
        heart.geometry.dispose();
        heart.material.dispose();
        scene.remove(heart);
      });
      heartStructures = [];

      heartCoreSystems.forEach(core => {
        core.geometry.dispose();
        core.material.dispose();
        scene.remove(core);
      });
      heartCoreSystems = [];

      if (centerHeart) {
        centerHeart.geometry.dispose();
        centerHeart.material.dispose();
        scene.remove(centerHeart);
      }

      if (nucleusParticles) {
        nucleusParticles.geometry.dispose();
        nucleusParticles.material.dispose();
        scene.remove(nucleusParticles);
      }

      for (let i = 0; i < parameters.heartCount; i++) {
        const heartSize = parameters.heartSize + Math.random() * parameters.heartSizeVariation;
        const heartGeometry = createInvertedHeartGeometry(heartSize, parameters.particlesPerHeart);

        const heartMaterial = new THREE.PointsMaterial({
          size: 0.025,
          sizeAttenuation: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          vertexColors: true,
          transparent: true,
          opacity: 0.98
        });

        const heart = new THREE.Points(heartGeometry, heartMaterial);
        const radius = 3.8;
        const angle = (i / parameters.heartCount) * Math.PI * 2;

        heart.position.set(
          Math.cos(angle) * radius,
          0,
          Math.sin(angle) * radius
        );

        scene.add(heart);
        heartStructures.push(heart);

        const coreParticles = createHeartCoreParticles(heart.position);
        scene.add(coreParticles);
        heartCoreSystems.push(coreParticles);

        const heartText = createHeartText();
        heartText.position.copy(heart.position);
        scene.add(heartText);
        heartTexts.push(heartText);
      }

      const centerHeartGeometry = createInvertedHeartGeometry(parameters.centerHeartSize, parameters.centerHeartParticles);

      const centerHeartMaterial = new THREE.PointsMaterial({
        size: 0.032,
        sizeAttenuation: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        transparent: true,
        opacity: 0.99
      });

      centerHeart = new THREE.Points(centerHeartGeometry, centerHeartMaterial);
      centerHeart.position.set(0, 0, 0);
      scene.add(centerHeart);

      nucleusParticles = createNucleusParticles();
      scene.add(nucleusParticles);

      const centerText = createCenterHeartText();
      centerText.position.set(0, 0.3, 0);
      scene.add(centerText);
      textSprites.push(centerText);

      for (let i = 0; i < 160; i++) {
        const phrase = romanticPhrases[i % romanticPhrases.length];
        const radius = 2.0 + Math.random() * 4.0;
        const angle = Math.random() * Math.PI * 2;
        const height = (Math.random() - 0.5) * 3.5;

        const sprite = createTextSprite(phrase);

        sprite.position.set(
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius
        );

        scene.add(sprite);
        textSprites.push(sprite);
      }
    };

    starfield = createStarfield();
    scene.add(starfield);
    generateHearts();

    const sizes = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 200);
    camera.position.set(9, 5, 9);
    scene.add(camera);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = parameters.autoRotateSpeed;
    controls.enableZoom = true;
    controls.enablePan = false;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true
    });

    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);

    window.addEventListener('resize', () => {
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;

      camera.aspect = sizes.width / sizes.height;
      camera.updateProjectionMatrix();

      renderer.setSize(sizes.width, sizes.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });

    const menuButton = document.getElementById('menuButton');
    const configPanel = document.getElementById('configPanel');
    const closeButton = document.getElementById('closeButton');
    const overlay = document.getElementById('overlay');

    menuButton.addEventListener('click', () => {
      configPanel.classList.add('open');
      overlay.classList.add('active');
    });

    [closeButton, overlay].forEach(el => {
      el.addEventListener('click', () => {
        configPanel.classList.remove('open');
        overlay.classList.remove('active');
      });
    });

    document.getElementById('heartSize').addEventListener('input', (e) => {
      parameters.heartSize = parseFloat(e.target.value);
      generateHearts();
    });

    document.getElementById('centerHeartSize').addEventListener('input', (e) => {
      parameters.centerHeartSize = parseFloat(e.target.value);
      generateHearts();
    });

    document.getElementById('heartSpeed').addEventListener('input', (e) => {
      parameters.autoRotateSpeed = parseFloat(e.target.value);
      controls.autoRotateSpeed = parameters.autoRotateSpeed;
    });

    document.getElementById('starBrightness').addEventListener('input', (e) => {
      parameters.starOpacity = parseFloat(e.target.value);
      starfield.material.opacity = parameters.starOpacity;
    });

    document.querySelectorAll('.color-option').forEach(option => {
      option.addEventListener('click', () => {
        document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');

        parameters.insideColor = option.dataset.color;
        parameters.outsideColor = option.dataset.color;

        generateHearts();
      });
    });

    const clock = new THREE.Clock();

    const tick = () => {
      controls.update();

      textSprites.forEach(sprite => sprite.lookAt(camera.position));
      heartStructures.forEach(heart => heart.lookAt(camera.position));

      if (centerHeart) centerHeart.lookAt(camera.position);
      if (nucleusParticles) nucleusParticles.lookAt(camera.position);

      heartCoreSystems.forEach((core, index) => {
        if (heartStructures[index]) {
          core.position.copy(heartStructures[index].position);
          core.lookAt(camera.position);
        }
      });

      heartTexts.forEach((text, index) => {
        if (heartStructures[index]) {
          text.position.copy(heartStructures[index].position);
          text.lookAt(camera.position);
        }
      });

      renderer.render(scene, camera);
      window.requestAnimationFrame(tick);
    };

    tick();
  </script>

  <script>
    document.addEventListener('DOMContentLoaded', function() {
      const audio = document.getElementById('bg-music');

      if (!audio) return;

      audio.volume = 0.4;

      document.addEventListener('click', function() {
        audio.play().catch(() => {});
      }, { once: true });
    });
  </script>
</body>
</html>`;
}

module.exports = {
  commands: ['galaxia', 'lovehtml', 'amorhtml'],

  async execute({ sock, remoteJid, msg, args }) {
    let filePath = null;

    try {
      const data = parseInput(args);

      if (!data) {
        return sock.sendMessage(remoteJid, {
          text:
`❌ Escribe el nombre.

Ejemplos:
.galaxia Marjorie
.galaxia Marjorie | Jose
.galaxia Marjorie | Jose | Te Amo Muchote`
        }, { quoted: msg });
      }

      ensureTemp();

      const fileName = `galaxia_${safeFileName(data.nombre)}_${Date.now()}.html`;
      filePath = path.join(TEMP_DIR, fileName);

      fs.writeFileSync(filePath, buildHtml(data), 'utf8');

      await sock.sendMessage(remoteJid, {
        document: fs.readFileSync(filePath),
        mimetype: 'text/html',
        fileName,
        caption:
`💛 *Galaxy of Love*

👑 Nombre: *${data.nombre}*${data.autor ? `\n✍️ De: *${data.autor}*` : ''}

Abre el archivo HTML en tu navegador.`
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en galaxia:', err?.message || err);

      await sock.sendMessage(remoteJid, {
        text: '❌ Error creando el HTML romántico.'
      }, { quoted: msg });

    } finally {
      try {
        if (filePath && fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch {}
    }
  }
};
