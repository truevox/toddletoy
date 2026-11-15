import { viewWidth, sizes } from './DisplayScale.js'

/**
 * ObjectCountingRenderer - Smart dynamic stacking for place value visualization
 * Handles intelligent layout of counting objects (apples, bags, boxes, trucks)
 */
export class ObjectCountingRenderer {
    constructor(scene) {
        this.scene = scene;

        // Sizing and spacing configuration
        this.emojiSize = 32;
        this.spacing = {
            vertical: 36     // Space between stacked items
        };
    }


    /** Icon size and row spacing follow the screen-relative unit (about 35% of the glyph). */
    refreshSizes() {
        this.emojiSize = sizes(this.scene).countIcon;
        this.spacing.vertical = Math.round(this.emojiSize * 1.125);
    }

    renderStackedApples(count, centerX, centerY) {
        this.refreshSizes();
        // Cap at educationally meaningful maximum (100 apples)
        // Toddlers can't count 1000s of objects - this keeps it useful
        const MAX_APPLES = 100;
        const displayCount = Math.min(count, MAX_APPLES);
        const showOverflow = count > MAX_APPLES;

        const layout = this.calculateOptimalStackingLayout(displayCount);
        const components = [];

        // Calculate starting position for centered layout
        const totalWidth = layout.columns * this.emojiSize;
        const totalHeight = layout.rows * this.spacing.vertical;
        const startX = centerX - (totalWidth / 2) + (this.emojiSize / 2);
        const startY = centerY - (totalHeight / 2) + (this.emojiSize / 2);

        let appleIndex = 0;

        // Fill the grid pattern
        for (let row = 0; row < layout.rows && appleIndex < displayCount; row++) {
            for (let col = 0; col < layout.columns && appleIndex < displayCount; col++) {
                const x = startX + (col * this.emojiSize);
                const y = startY + (row * this.spacing.vertical);

                const apple = this.scene.add.text(x, y, '🍎', {
                    fontSize: `${this.emojiSize}px`,
                    fontFamily: 'Arial, "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif'
                }).setOrigin(0.5, 0.5);

                components.push(apple);
                appleIndex++;
            }
        }

        // Add overflow indicator for numbers > 100
        if (showOverflow) {
            const overflowY = startY + (layout.rows * this.spacing.vertical) + 10;
            const overflowText = this.scene.add.text(centerX, overflowY, `(${count} total)`, {
                fontSize: `${Math.floor(this.emojiSize * 0.6)}px`,
                fontFamily: 'Arial, sans-serif',
                color: '#666666'
            }).setOrigin(0.5, 0);

            components.push(overflowText);
        }

        return components;
    }

    calculateOptimalStackingLayout(count) {
        if (count <= 0) return { rows: 0, columns: 0 };
        
        // Educational best practices based on research:
        // 1-5: Single horizontal row (supports subitizing)
        // 6-10: Ten-frame (2x5 grid - proven educational tool)
        // 11+: Multiple ten-frames or "squarish" grid algorithm
        
        if (count <= 5) {
            // Single row for easy counting and subitizing
            return { rows: 1, columns: count };
        }
        
        if (count <= 10) {
            // Ten-frame: 2 rows of 5 (educational best practice)
            return { rows: 2, columns: 5 };
        }
        
        if (count <= 20) {
            // Two ten-frames stacked vertically
            return { rows: 4, columns: 5 };
        }
        
        // For larger numbers: Use "squarish" grid algorithm
        // This creates visually stable layouts that avoid being too tall or wide
        const sqrt = Math.sqrt(count);
        let columns = Math.ceil(sqrt);
        let rows = Math.ceil(count / columns);
        
        // Adjust to prefer slightly wider than tall (more stable appearance)
        // and stay within reasonable screen bounds
        const screenWidth = viewWidth(this.scene);
        const maxColumns = Math.floor(screenWidth * 0.5 / this.emojiSize); // Max 50% of screen width
        
        if (columns > maxColumns) {
            columns = maxColumns;
            rows = Math.ceil(count / columns);
        }
        
        // Fine-tune for better visual balance
        // Prefer arrangements that look stable and organized
        if (rows > columns * 1.5) {
            // Too tall - redistribute
            columns = Math.min(maxColumns, Math.ceil(Math.sqrt(count * 1.3)));
            rows = Math.ceil(count / columns);
        }
        
        return { rows, columns, aspectRatio: rows / columns };
    }

    // Test different layouts for development/debugging
    getLayoutExamples() {
        const examples = [];
        const testCounts = [1, 3, 5, 6, 8, 10, 12, 15, 20, 24, 30, 40, 50];
        
        testCounts.forEach(count => {
            const layout = this.calculateOptimalStackingLayout(count);
            let educationalNote = '';
            
            if (count <= 5) educationalNote = 'Subitizing - instant recognition';
            else if (count <= 10) educationalNote = 'Ten-frame - foundational math tool';
            else if (count <= 20) educationalNote = 'Double ten-frame - building on fundamentals';
            else educationalNote = 'Squarish grid - visual stability';
            
            examples.push({
                count,
                layout: `${layout.rows}x${layout.columns}`,
                aspectRatio: layout.aspectRatio?.toFixed(2) || (layout.rows / layout.columns).toFixed(2),
                educationalApproach: educationalNote
            });
        });
        
        return examples;
    }

    destroy() {
        // Clean up any resources if needed
    }
}
