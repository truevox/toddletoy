/**
 * ToyModeSelector - Entry screen for choosing a toy mode
 * Shown before the configuration page
 */
export class ToyModeSelector {
    constructor(router, configManager) {
        this.router = router;
        this.configManager = configManager;
        this.container = null;
    }

    show() {
        if (!this.container) {
            this.container = this._buildContainer();
            document.body.appendChild(this.container);
        }
        this.container.style.display = 'flex';
    }

    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
            this.container = null;
        }
    }

    _buildContainer() {
        const el = document.createElement('div');
        el.id = 'toy-mode-selector';
        el.style.cssText = `
            position: fixed; inset: 0;
            background: radial-gradient(ellipse at 30% 20%, #0d2137 0%, #000510 70%);
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            z-index: 1000; overflow-y: auto;
            padding: 20px; box-sizing: border-box;
            font-family: Arial, sans-serif;
        `;

        el.innerHTML = `
            <div style="text-align:center; margin-bottom: 32px;">
                <h1 style="
                    color: #fff; margin: 0 0 10px;
                    font-size: clamp(1.8rem, 5vw, 3.2rem);
                    text-shadow: 0 0 40px rgba(100,180,255,0.5);
                    letter-spacing: -0.5px;
                ">🧸 Choose Your Toy</h1>
                <p style="color: rgba(255,255,255,0.6); margin: 0; font-size: clamp(0.9rem,2.5vw,1.15rem);">
                    Pick a world to explore!
                </p>
            </div>
            <div id="mode-grid" style="
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 20px; max-width: 860px; width: 100%;
            ">
                ${this._card('sandbox', '🧸', 'Toddler Sandbox',
                    'Tap to create shapes, letters, numbers &amp; emojis with sounds and colors!',
                    '#4CAF50', '#1b4a22')}
                ${this._card('orrery', '🌞', 'Solar System',
                    'Watch all eight planets orbit the Sun. Tap a planet to hear its name!',
                    '#FF9800', '#4a2d00')}
                ${this._card('globe', '🌍', 'World Globe',
                    'Swipe to spin the Earth. Tap any country to hear its name and see its flag!',
                    '#2196F3', '#0a2444')}
            </div>
            <p style="color:rgba(255,255,255,0.25); margin-top:40px; font-size:0.75rem;">
                v${typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.71'}
            </p>
        `;

        el.querySelectorAll('.mode-card').forEach(card => {
            card.addEventListener('click', () => this._selectMode(card.dataset.mode));
            card.addEventListener('touchend', (e) => {
                e.preventDefault();
                this._selectMode(card.dataset.mode);
            });
        });

        return el;
    }

    _card(mode, emoji, title, desc, borderColor, bgColor) {
        return `
        <div class="mode-card" data-mode="${mode}" style="
            background: linear-gradient(145deg, ${bgColor} 0%, ${bgColor}cc 100%);
            border: 2px solid ${borderColor};
            border-radius: 20px; padding: 32px 24px;
            cursor: pointer; text-align: center;
            transition: transform 0.18s ease, box-shadow 0.18s ease;
            user-select: none; -webkit-tap-highlight-color: transparent;
            box-shadow: 0 4px 20px rgba(0,0,0,0.4);
        "
        onmouseenter="this.style.transform='translateY(-4px) scale(1.03)';this.style.boxShadow='0 12px 40px ${borderColor}55'"
        onmouseleave="this.style.transform='';this.style.boxShadow='0 4px 20px rgba(0,0,0,0.4)'"
        onmousedown="this.style.transform='scale(0.97)'"
        onmouseup="this.style.transform='translateY(-4px) scale(1.03)'"
        >
            <div style="font-size: clamp(2.5rem,8vw,4rem); margin-bottom: 14px; line-height:1;">${emoji}</div>
            <div style="color:#fff; font-size:clamp(1.1rem,3vw,1.4rem); font-weight:700; margin-bottom:10px;">${title}</div>
            <div style="color:rgba(255,255,255,0.68); font-size:clamp(0.8rem,2vw,0.95rem); line-height:1.55;">${desc}</div>
        </div>`;
    }

    _selectMode(mode) {
        switch (mode) {
            case 'sandbox':
                if (this.configManager && this.configManager.shouldSkipConfig()) {
                    this.router.allowToyAccess();
                    this.router.navigate('/toy');
                } else {
                    this.router.navigate('/config');
                }
                break;
            case 'orrery':
                this.router.navigate('/orrery');
                break;
            case 'globe':
                this.router.navigate('/globe');
                break;
        }
    }
}
