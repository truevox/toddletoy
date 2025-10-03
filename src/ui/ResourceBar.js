/**
 * ResourceBar - Compact horizontal resource display
 * Shows apples, bags, crates, trucks in a single horizontal line
 */
export class ResourceBar extends Phaser.GameObjects.Container {
    constructor(scene, config = {}) {
        super(scene, config.x || 0, config.y || 0);

        this.scene = scene;
        this.cfg = {
            iconSize: config.iconSize || { w: 32, h: 32 },
            iconGapX: config.iconGapX || 4,
            groupGapX: config.groupGapX || 12,
            maxIconsPerType: config.maxIconsPerType || Infinity,
            wrap: config.wrap || false,
            width: config.width || 800,
            fontSize: config.fontSize || 16
        };

        // Icon mapping: resource type to emoji
        this.iconMap = {
            apples: '🍎',
            bags: '🛍️',
            crates: '📦',
            trucks: '🚛'
        };

        // Current counts
        this.counts = {
            apples: 0,
            bags: 0,
            crates: 0,
            trucks: 0
        };

        // Sprite pools for reuse (performance optimization)
        this.pool = {
            apples: [],
            bags: [],
            crates: [],
            trucks: []
        };

        // Active sprites currently displayed
        this.activeSprites = {
            apples: [],
            bags: [],
            crates: [],
            trucks: []
        };

        // Count labels for overflow (e.g., "×10")
        this.countLabels = {
            apples: null,
            bags: null,
            crates: null,
            trucks: null
        };

        // Add to scene
        scene.add.existing(this);
    }

    /**
     * Update resource counts and refresh display
     */
    setCounts(counts) {
        // Diff-check: only update if counts changed
        const changed = Object.keys(counts).some(key =>
            this.counts[key] !== counts[key]
        );

        if (!changed) return;

        // Update counts
        Object.assign(this.counts, counts);

        // Reflow layout
        this.layout();
    }

    /**
     * Layout all resources in horizontal rows stacked top-to-bottom
     * Like keyboard rows: apples (top/number row) down to trucks (bottom/ZXCVB row)
     * Each row is centered horizontally around X=0
     */
    layout() {
        // Hide all active sprites first
        this.hideAllSprites();

        const order = ['apples', 'bags', 'crates', 'trucks'];
        let cursorY = 0;

        for (const key of order) {
            const count = this.counts[key];
            if (count === 0) continue;

            const visible = Math.min(count, this.cfg.maxIconsPerType);

            // Calculate total row width to center it
            const totalWidth = (visible * this.cfg.iconSize.w) + ((visible - 1) * this.cfg.iconGapX);
            const startX = -totalWidth / 2;

            // Render icons horizontally in this row, centered
            let rowX = startX;
            for (let i = 0; i < visible; i++) {
                const sprite = this.getSprite(key);
                sprite.setPosition(rowX, cursorY);
                sprite.setVisible(true);
                sprite.setScale(this.cfg.iconSize.w / 32); // Normalize to 32px base size

                // Move right for next icon in this row
                rowX += this.cfg.iconSize.w + this.cfg.iconGapX;
            }

            // Render overflow label if count exceeds max (positioned at end of row)
            if (count > visible) {
                this.renderCountLabel(key, count, rowX, cursorY);
            }

            // Move down to next row
            cursorY += this.cfg.iconSize.h + 4;
        }
    }

    /**
     * Get a sprite from the pool or create a new one
     */
    getSprite(key) {
        // Try to reuse from pool
        const pooled = this.pool[key].find(s => !s.visible);
        if (pooled) {
            this.activeSprites[key].push(pooled);
            return pooled;
        }

        // Create new sprite
        const sprite = this.scene.add.text(0, 0, this.iconMap[key], {
            fontSize: `${this.cfg.iconSize.w}px`,
            fontFamily: 'Arial, "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif'
        }).setOrigin(0, 0.5);

        this.add(sprite);
        this.pool[key].push(sprite);
        this.activeSprites[key].push(sprite);

        return sprite;
    }

    /**
     * Render count overflow label (e.g., "×10")
     */
    renderCountLabel(key, count, x, y) {
        if (!this.countLabels[key]) {
            this.countLabels[key] = this.scene.add.text(0, 0, '', {
                fontSize: `${this.cfg.fontSize}px`,
                fontFamily: 'Arial, sans-serif',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0, 0.5);
            this.add(this.countLabels[key]);
        }

        const label = this.countLabels[key];
        label.setText(`×${count}`);
        label.setPosition(x, y);
        label.setVisible(true);
    }

    /**
     * Hide all active sprites (return to pool)
     */
    hideAllSprites() {
        Object.keys(this.activeSprites).forEach(key => {
            this.activeSprites[key].forEach(sprite => sprite.setVisible(false));
            this.activeSprites[key] = [];
        });

        Object.values(this.countLabels).forEach(label => {
            if (label) label.setVisible(false);
        });
    }

    /**
     * Get tooltip text for accessibility
     */
    getTooltip() {
        const parts = [];
        if (this.counts.apples > 0) parts.push(`Apples: ${this.counts.apples}`);
        if (this.counts.bags > 0) parts.push(`Bags: ${this.counts.bags}`);
        if (this.counts.crates > 0) parts.push(`Crates: ${this.counts.crates}`);
        if (this.counts.trucks > 0) parts.push(`Trucks: ${this.counts.trucks}`);
        return parts.join(', ');
    }

    /**
     * Get layout bounds for testing
     */
    getLayoutBounds() {
        const bounds = [];
        Object.keys(this.activeSprites).forEach(key => {
            this.activeSprites[key].forEach(sprite => {
                if (sprite.visible) {
                    bounds.push({
                        type: key,
                        x: sprite.x,
                        y: sprite.y,
                        width: this.cfg.iconSize.w,
                        height: this.cfg.iconSize.h
                    });
                }
            });
        });
        return bounds;
    }

    /**
     * Clean up resources
     */
    destroy(fromScene) {
        // Clean up pools
        Object.values(this.pool).forEach(pool => {
            pool.forEach(sprite => sprite.destroy());
        });

        // Clean up labels
        Object.values(this.countLabels).forEach(label => {
            if (label) label.destroy();
        });

        super.destroy(fromScene);
    }
}
