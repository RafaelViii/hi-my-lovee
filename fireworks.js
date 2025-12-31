
  /*
    main.html — Canvas fireworks show
    Changes: Runs endlessly (no 5-minute stop). Minimal edits from original:
      - Removed the timer that set stopSpawning after 5 minutes and the countdown logic.
      - Kept reset/replay behavior (page reload).
      - Status overlay updated to say "endless".
  */

  (function () {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d', { alpha: true });
    let W = canvas.width = innerWidth;
    let H = canvas.height = innerHeight;

    // Draw the same kind of dark gradient onto the canvas so it's always visible
    function drawCanvasBackground() {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#081029');
      g.addColorStop(0.35, '#101233');
      g.addColorStop(1, '#0a0510');
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // Resize handler
    window.addEventListener('resize', () => {
      W = canvas.width = innerWidth;
      H = canvas.height = innerHeight;
      createStars(); // reposition stars
      drawCanvasBackground();
    });

    // ---------- Stars: night dotted stars with subtle twinkle ----------
    const stars = [];
    function createStars() {
      stars.length = 0;
      const count = Math.max(120, Math.floor((W*H) / 7000));
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H * 0.7, // most stars in upper part
          r: Math.random() * 1.6 + 0.3,
          alphaBase: Math.random() * 0.7 + 0.25,
          twinkleSpeed: Math.random() * 0.006 + 0.002,
          twinklePhase: Math.random() * Math.PI * 2
        });
      }
    }
    createStars();
    drawCanvasBackground(); // initial canvas background

    // ---------- Fireworks system ----------
    const fireworks = [];
    const particles = [];
    let lastSpawn = 0;
    let stopSpawning = false; // now never set to true automatically
    let spawnIntervalMs = 600; // average spawn interval
    const MAX_PARTICLES = 1200;

    // Color palette (multiple variants)
    const palette = [
      ['#ff5d5d', '#ffb085', '#ffd9d9'],
      ['#7afcff', '#2be7ff', '#c6ffff'],
      ['#ffd84d', '#fff09a', '#fffbcc'],
      ['#b39eff', '#9bd0ff', '#e6e2ff'],
      ['#7cffb2', '#b6ffd6', '#dfffe6'],
      ['#ff6bd6', '#ff93e8', '#ffd7f5'],
      ['#ffffff', '#f0f8ff', '#ffeeff'],
      ['#ffa07a', '#ff7f50', '#ffd1c2'],
      ['#ff007f', '#ff66b2', '#ffb3d9'], // hot pink
    ['#00ffe1', '#66fff0', '#bffef7'], // aqua neon
    ['#fffb00', '#fff567', '#fffaa8'], // neon yellow
    ['#7d00ff', '#a64dff', '#d9b3ff'], // electric purple
    ['#00ff7f', '#66ffb2', '#bfffe0'],  // lime aqua
     ['#ff9aa2', '#ffd3b6', '#fffeea'],
    ['#b5ead7', '#c7f9cc', '#e8fff5'],
    ['#cbd3ff', '#e6e9ff', '#ffffff'],
    ['#f7c6ff', '#fbe5ff', '#fff6ff'],
    ['#ffd166', '#ffea9e', '#fff7e6'],
    ['#ffb84d', '#ffd99c', '#fff0d6'],
    ['#fff6e0', '#fff9ef', '#ffffff'],
    ['#3b82f6', '#6ea8ff', '#cfe6ff'],
    ['#7c3aed', '#a08bff', '#dfd7ff'],
    ['#00d1ff', '#7fe7ff', '#dffcff']
      
    ];

    function randPalette() {
      const p = palette[(Math.random() * palette.length) | 0];
      const idx = (Math.random() * p.length) | 0;
      return { base: p[idx], shades: p };
    }

    // Utility
    function rand(min, max) { return min + Math.random() * (max - min); }
    function choice(arr) { return arr[(Math.random() * arr.length) | 0]; }

    // Firework that shoots up then explodes into particles
    class Firework {
      constructor() {
        this.x = rand(W * 0.15, W * 0.85);
        this.y = H + 10;
        this.targetY = rand(H * 0.15, H * 0.5);
        this.vx = rand(-1, 1) * 0.4;
        this.vy = rand(-7, -11);
        this.size = 3;
        this.color = choice(choice(palette));
        this.trail = [];
        this.trailMax = 6;
        this.exploded = false;
        this.pattern = choice(['circle', 'ring', 'spiral', 'star', 'flower', 'fountain']);
      }
      update(dt) {
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.trailMax) this.trail.shift();

        this.vy += 0.04;
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.999;

        if (this.y <= this.targetY || this.vy >= -1) {
          this.explode();
          this.exploded = true;
        }
      }
      explode() {
        const colorGroup = randPalette().shades;
        createExplosion(this.x, this.y, this.pattern, colorGroup);
      }
      draw(ctx) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 20);
        g.addColorStop(0, 'rgba(255,255,255,0.95)');
        g.addColorStop(0.3, this.color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let i = 0; i < this.trail.length; i++) {
          const p = this.trail[i];
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        ctx.restore();
      }
    }

    // Particle for explosion
    class Particle {
      constructor(x, y, vx, vy, color, life = 1500, size = 1.6) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.size = size;
        this.life = life; // ms total
        this.age = 0;
        this.alpha = 1;
        this.trail = [];
      }
      update(dt) {
        this.age += dt;
        const t = dt / 16.67;
        this.vy += 0.04 * t;
        this.vx *= 0.999;
        this.vy *= 0.999;
        this.x += this.vx * t;
        this.y += this.vy * t;
        this.alpha = Math.max(0, 1 - (this.age / this.life));
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 5) this.trail.shift();
      }
      draw(ctx) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 8);
        g.addColorStop(0, hexToRgba(this.color, Math.min(0.9, this.alpha)));
        g.addColorStop(0.25, hexToRgba(this.color, Math.min(0.45, this.alpha * 0.8)));
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 6 * Math.min(1, this.alpha + 0.1), 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = hexToRgba(this.color, Math.min(1, this.alpha));
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * Math.max(0.6, this.alpha * 1.4), 0, Math.PI * 2);
        ctx.fill();

        if (this.trail.length >= 2) {
          ctx.lineWidth = Math.max(1, this.size/1.2);
          ctx.strokeStyle = hexToRgba(this.color, Math.min(0.7, this.alpha * 0.8));
          ctx.beginPath();
          const from = this.trail[0];
          ctx.moveTo(from.x, from.y);
          for (let i = 1; i < this.trail.length; i++) {
            ctx.lineTo(this.trail[i].x, this.trail[i].y);
          }
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // Helper to convert hex color to rgba string with given alpha
    function hexToRgba(hex, a = 1) {
      const c = hex.replace('#','');
      const bigint = parseInt(c, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r},${g},${b},${a})`;
    }

    // Create explosion patterns
    function createExplosion(x, y, pattern, colorShades) {
      const baseCount = Math.floor(rand(40, 140));
      const count = Math.min(220, Math.max(24, baseCount));
      if (particles.length > MAX_PARTICLES) return;

      if (pattern === 'circle') {
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = rand(1.8, 5.5) * (0.9 + Math.random()*0.8);
          const vx = Math.cos(angle) * speed;
          const vy = Math.sin(angle) * speed;
          const color = choice(colorShades);
          particles.push(new Particle(x, y, vx, vy, color, rand(900,1700), rand(1.6,3.2)));
        }
      } else if (pattern === 'ring') {
        const ringCount = Math.floor(count * 0.6);
        for (let i = 0; i < ringCount; i++) {
          const angle = (i / ringCount) * Math.PI * 2 + rand(-0.02, 0.02);
          const speed = rand(3.4, 6.2);
          const vx = Math.cos(angle) * speed;
          const vy = Math.sin(angle) * speed;
          particles.push(new Particle(x, y, vx, vy, choice(colorShades), rand(1100,1900), rand(2.0,3.4)));
        }
        for (let i = 0; i < Math.floor(count*0.35); i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = rand(0.5, 2.2);
          const vx = Math.cos(angle) * speed;
          const vy = Math.sin(angle) * speed;
          particles.push(new Particle(x, y, vx, vy, choice(colorShades), rand(700,1200), rand(1.2,2.2)));
        }
      } else if (pattern === 'spiral') {
        const turns = rand(2.5, 4.5);
        for (let i = 0; i < count; i++) {
          const frac = i / count;
          const angle = frac * turns * Math.PI * 2 + rand(-0.1,0.1);
          const speed = 1.6 + frac * rand(3.0,6.5);
          const vx = Math.cos(angle) * speed;
          const vy = Math.sin(angle) * speed;
          particles.push(new Particle(x, y, vx, vy, choice(colorShades), rand(1000,2200), rand(1.6,3.0)));
        }
      } else if (pattern === 'star') {
        const spikes = Math.floor(rand(5, 9));
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const mod = 1 + 0.7 * Math.sin(angle * spikes * 0.5 + rand(0,1));
          const speed = rand(2.6, 5.2) * mod;
          const vx = Math.cos(angle) * speed;
          const vy = Math.sin(angle) * speed;
          particles.push(new Particle(x, y, vx, vy, choice(colorShades), rand(1000,2000), rand(1.6,3.2)));
        }
      } else if (pattern === 'flower') {
        const petals = Math.floor(rand(4,8));
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          const petalStrength = 1 + Math.sin(petals * angle) * 0.6;
          const speed = rand(2.0, 5.2) * petalStrength;
          const vx = Math.cos(angle) * speed;
          const vy = Math.sin(angle) * speed;
          particles.push(new Particle(x, y, vx, vy, choice(colorShades), rand(900,2100), rand(1.6,3.2)));
        }
      } else if (pattern === 'fountain') {
        for (let i = 0; i < count; i++) {
          const angle = rand(-Math.PI*0.6, Math.PI*0.6);
          const speed = rand(1.8, 4.6);
          const vx = Math.cos(angle) * speed;
          const vy = Math.sin(angle) * speed - rand(1.4, 3.2);
          particles.push(new Particle(x, y, vx, vy, choice(colorShades), rand(1400,2600), rand(1.8,3.6)));
        }
      }

      if (Math.random() < 0.18) {
        setTimeout(() => {
          const miniCount = Math.floor(rand(12, 36));
          for (let i = 0; i < miniCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = rand(0.6, 2.4);
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            particles.push(new Particle(x + rand(-8,8), y + rand(-8,8), vx, vy, choice(choice(palette)), rand(700,1000), rand(1.2,2.4)));
          }
        }, rand(120, 520));
      }
    }

    // spawn fireworks at variable intervals
    function spawnFirework() {
      if (stopSpawning) return;
      fireworks.push(new Firework());
      const next = rand(spawnIntervalMs * 0.5, spawnIntervalMs * 1.6);
      lastSpawn = performance.now();
      setTimeout(spawnFirework, next);
    }

    for (let i = 0; i < 3; i++) {
      setTimeout(() => { if(!stopSpawning) fireworks.push(new Firework()); }, i * 250);
    }
    setTimeout(spawnFirework, 600);

    // Replay handlers (still available)
    const statusEl = document.getElementById('status');
    const overlay = document.getElementById('overlay');
    const endedDiv = document.getElementById('ended');
    const replayBtn = document.getElementById('replayBtn');
    const restartSmall = document.getElementById('restart');

    function resetShow() {
      fireworks.length = 0;
      particles.length = 0;
      stopSpawning = false;
      location.reload();
    }
    restartSmall.addEventListener('click', resetShow);
    replayBtn.addEventListener('click', resetShow);

    // Main animation loop
    let last = performance.now();
    function loop(now) {
      const dt = now - last || 16.67;
      last = now;

      // Clear canvas completely each frame and redraw the canvas background
      ctx.clearRect(0, 0, W, H);
      drawCanvasBackground();

      // Draw stars first (background)
      drawStars(ctx, now);

      // Update and draw fireworks
      for (let i = fireworks.length - 1; i >= 0; i--) {
        const fw = fireworks[i];
        fw.update(dt);
        fw.draw(ctx);
        if (fw.exploded) fireworks.splice(i, 1);
      }

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update(dt);
        p.draw(ctx);
        if (p.age >= p.life || p.alpha <= 0.03 || p.y > H + 80) {
          particles.splice(i, 1);
        }
      }

      // Decorative occasional big burst at top-center
      if (!stopSpawning && Math.random() < 0.0025) {
        createExplosion(rand(W*0.2, W*0.8), rand(H*0.12, H*0.28), choice(['star','flower','ring']), choice(choice(palette)));
      }

      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    // Draw stars with twinkling dots
    function drawStars(ctx, now) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const tw = Math.sin(s.twinklePhase + now * s.twinkleSpeed) * 0.5 + 0.5;
        const a = s.alphaBase * (0.6 + 0.8 * tw);
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * (0.6 + tw * 0.9), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Clean up old items periodically (defensive)
    setInterval(() => {
      if (particles.length > MAX_PARTICLES * 1.5) {
        particles.splice(0, particles.length - MAX_PARTICLES);
      }
    }, 3000);

    // small optimization: if window not focused, slow down spawns
    window.addEventListener('blur', () => { spawnIntervalMs = 1200; });
    window.addEventListener('focus', () => { spawnIntervalMs = 600; });

    // Accessibility: clicking anywhere triggers a big burst
    canvas.addEventListener('pointerdown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      createExplosion(x, y, choice(['star', 'ring', 'flower', 'circle']), choice(choice(palette)));
    });

    // Keyboard: press R to replay
    window.addEventListener('keydown', (e) => {
      if (e.key === 'r' || e.key === 'R') resetShow();
    });

  })();
