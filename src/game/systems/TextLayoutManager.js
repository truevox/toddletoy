import { sizes, MIN_CAPTION } from './DisplayScale.js';
/**
 * TextLayoutManager - Handles text layout and word object creation
 * Manages responsive text sizing and multi-language word positioning
 */
export class TextLayoutManager {
    constructor(scene) {
        this.scene = scene;
    }

    createWordObjects(text, x, y, labelStyle) {
        if (!text || text.trim() === '') return [];
        
        const words = text.split(' ');
        const wordObjects = [];
        
        // Create all word objects first to measure actual layout
        const spaceWidth = labelStyle.fontSize ? parseInt(labelStyle.fontSize) * 0.3 : 8;
        let totalActualWidth = 0;
        
        // Create word objects and calculate actual total width
        words.forEach((word, index) => {
            const wordText = this.scene.add.text(0, y, word, labelStyle)
                .setOrigin(0, 0.5);
            wordObjects.push(wordText);
            
            totalActualWidth += wordText.width;
            if (index < words.length - 1) {
                totalActualWidth += spaceWidth;
            }
        });
        
        // Position words to be centered at x
        let currentX = x - (totalActualWidth / 2);
        
        wordObjects.forEach((wordObj, index) => {
            wordObj.setPosition(currentX, y);
            currentX += wordObj.width + (index < words.length - 1 ? spaceWidth : 0);
        });
        
        // Store layout metadata for spacing calculations
        if (wordObjects.length > 0) {
            wordObjects._layoutInfo = {
                originalText: text,
                totalWidth: totalActualWidth,
                spaceWidth: spaceWidth,
                style: { ...labelStyle }
            };
        }
        
        return wordObjects;
    }

    /**
     * Caption style and offsets, all derived from the screen-relative size unit
     * (DisplayScale): captions are clearly secondary to the glyph, never below 15px.
     * @param {number} [scaleFactor] - optional multiplier on the caption size
     */
    calculateResponsiveTextStyle(scaleFactor = null) {
        const sz = sizes(this.scene);
        const m = scaleFactor || 1;
        const font = Math.max(MIN_CAPTION, Math.round(sz.captionFont * m));

        return {
            fontSize: `${font}px`,
            fill: '#ffffff',
            fontFamily: 'Arial',
            align: 'center',
            stroke: '#000000',
            strokeThickness: Math.max(1, Math.round(font / 10)),
            scaleFactor: sz.k * m,
            labelOffset: Math.round(sz.glyph / 2 + font * 0.85),
            lineSpacing: Math.round(font * 1.3),
            glyph: sz.glyph
        };
    }

    destroy() {
        // No cleanup needed for this utility class
    }
}