// Lightweight Confetti Effect
const Confetti = {
    canvas: null,
    ctx: null,
    particles: [],
    animationId: null,

    init() {
        if (this.canvas) return;
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'confetti-canvas';
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '9999';
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        
        window.addEventListener('resize', () => this.resize());
        this.resize();
    },

    resize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },

    createParticle(x, y) {
        const colors = ['#007AFF', '#FF2D55', '#FF9500', '#4CD964', '#5856D6', '#FFCC00'];
        return {
            x: x,
            y: y,
            color: colors[Math.floor(Math.random() * colors.length)],
            radius: Math.random() * 4 + 2,
            velocity: {
                x: (Math.random() - 0.5) * 10,
                y: (Math.random() - 0.5) * 10 - 5
            },
            gravity: 0.2,
            opacity: 1,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.2
        };
    },

    explode(x, y, count = 100) {
        this.init();
        for (let i = 0; i < count; i++) {
            this.particles.push(this.createParticle(x || window.innerWidth / 2, y || window.innerHeight / 2));
        }
        if (!this.animationId) {
            this.animate();
        }
    },

    celebrate() {
        // burst from left and right
        const count = 150;
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.explode(width * 0.2, height * 0.6, count);
        setTimeout(() => this.explode(width * 0.8, height * 0.6, count), 200);
        setTimeout(() => this.explode(width * 0.5, height * 0.4, count), 500);
    },

    animate() {
        if (!this.ctx || this.particles.length === 0) {
            this.animationId = null;
            if (this.ctx) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            return;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.particles.forEach((p, index) => {
            p.velocity.y += p.gravity;
            p.x += p.velocity.x;
            p.y += p.velocity.y;
            p.rotation += p.rotationSpeed;
            p.opacity -= 0.008;

            if (p.opacity <= 0 || p.y > this.canvas.height) {
                this.particles.splice(index, 1);
            } else {
                this.ctx.save();
                this.ctx.translate(p.x, p.y);
                this.ctx.rotate(p.rotation);
                this.ctx.globalAlpha = p.opacity;
                this.ctx.fillStyle = p.color;
                this.ctx.fillRect(-p.radius, -p.radius, p.radius * 2, p.radius * 2);
                this.ctx.restore();
            }
        });

        this.animationId = requestAnimationFrame(() => this.animate());
    }
};

window.Confetti = Confetti;
