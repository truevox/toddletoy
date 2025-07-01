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

    calculateResponsiveTextStyle(scaleFactor = null) {
        const screenWidth = this.scene.scale.width || window.innerWidth || 800;
        const screenHeight = this.scene.scale.height || window.innerHeight || 600;
        const minDimension = Math.min(screenWidth, screenHeight);
        const calculatedScaleFactor = scaleFactor || Math.max(0.4, Math.min(1.2, minDimension / 600));
        const labelFontSize = Math.floor(24 * calculatedScaleFactor);
        
        return {
            fontSize: `${labelFontSize}px`,
            fill: '#ffffff',
            fontFamily: 'Arial',
            align: 'center',
            stroke: '#000000',
            strokeThickness: Math.max(1, Math.floor(2 * calculatedScaleFactor)),
            scaleFactor: calculatedScaleFactor,
            labelOffset: Math.floor(60 * calculatedScaleFactor),
            lineSpacing: Math.floor(30 * calculatedScaleFactor)
        };
    }

    highlightWord(textObject, wordIndex, totalWords) {
        if (!textObject || wordIndex < 0) return;
        
        // Create sparkle effects during highlighting
        if (this.scene.currentSpeakingObject && this.scene.particleManager) {
            this.scene.particleManager.triggerWordSparkles(this.scene.currentSpeakingObject, wordIndex);
        }
    }

    destroy() {
        // No cleanup needed for this utility class
    }
}