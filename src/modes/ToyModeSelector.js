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

        const header = document.createElement('div');
        header.style.cssText = 'text-align:center; margin-bottom: 32px;';
        header.innerHTML = `
            <h1 style="
                color: #fff; margin: 0 0 10px;
                font-size: clamp(1.8rem, 5vw, 3.2rem);
                text-shadow: 0 0 40px rgba(100,180,255,0.5);
                letter-spacing: -0.5px;
            ">🧸 Choose Your Toy</h1>
            <p style="color: rgba(255,255,255,0.6); margin: 0; font-size: clamp(0.9rem,2.5vw,1.15rem);">
                Pick a world to explore!
            </p>
        `;
        el.appendChild(header);

        const grid = document.createElement('div');
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 20px; max-width: 860px; width: 100%;
        `;

        const cards = [
            { mode: 'sandbox', emoji: '🧸', title: 'Toddler Sandbox',
              desc: 'Tap to create shapes, letters, numbers & emojis with sounds and colors!',
              borderColor: '#4CAF50', bgColor: '#1b4a22' },
            { mode: 'orrery',  emoji: '🌞', title: 'Solar System',
              desc: 'Watch all eight planets orbit the Sun. Tap a planet to hear its name!',
              borderColor: '#FF9800', bgColor: '#4a2d00' },
            { mode: 'globe',   emoji: '🌍', title: 'World Globe',
              desc: 'Swipe to spin the Earth. Tap any country to hear its name and see its flag!',
              borderColor: '#2196F3', bgColor: '#0a2444' },
        ];

        cards.forEach(({ mode, emoji, title, desc, borderColor, bgColor }) => {
            const card = this._buildCard(emoji, title, desc, borderColor, bgColor);
            card.addEventListener('click', () => this._selectMode(mode));
            card.addEventListener('touchend', (e) => {
                e.preventDefault();
                this._selectMode(mode);
            });
            grid.appendChild(card);
        });

        el.appendChild(grid);

        const version = document.createElement('p');
        version.textContent = `v${typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.71'}`;
        version.style.cssText = 'color:rgba(255,255,255,0.25); margin-top:40px; font-size:0.75rem;';
        el.appendChild(version);

        return el;
    }

    _buildCard(emoji, title, desc, borderColor, bgColor) {
        const card = document.createElement('div');
        card.style.cssText = `
            background: linear-gradient(145deg, ${bgColor} 0%, ${bgColor}cc 100%);
            border: 2px solid ${borderColor};
            border-radius: 20px; padding: 32px 24px;
            cursor: pointer; text-align: center;
            transition: transform 0.18s ease, box-shadow 0.18s ease;
            user-select: none; -webkit-tap-highlight-color: transparent;
            box-shadow: 0 4px 20px rgba(0,0,0,0.4);
        `;

        const emojiEl = document.createElement('div');
        emojiEl.style.cssText = 'font-size: clamp(2.5rem,8vw,4rem); margin-bottom: 14px; line-height:1;';
        emojiEl.textContent = emoji;

        const titleEl = document.createElement('div');
        titleEl.style.cssText = 'color:#fff; font-size:clamp(1.1rem,3vw,1.4rem); font-weight:700; margin-bottom:10px;';
        titleEl.textContent = title;

        const descEl = document.createElement('div');
        descEl.style.cssText = 'color:rgba(255,255,255,0.68); font-size:clamp(0.8rem,2vw,0.95rem); line-height:1.55;';
        descEl.textContent = desc;

        card.appendChild(emojiEl);
        card.appendChild(titleEl);
        card.appendChild(descEl);

        // Hover / press effects via addEventListener (no inline handlers)
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-4px) scale(1.03)';
            card.style.boxShadow = `0 12px 40px ${borderColor}55`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
            card.style.boxShadow = '0 4px 20px rgba(0,0,0,0.4)';
        });
        card.addEventListener('mousedown', () => {
            card.style.transform = 'scale(0.97)';
        });
        card.addEventListener('mouseup', () => {
            card.style.transform = 'translateY(-4px) scale(1.03)';
        });

        return card;
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
