import { FontManager } from './FontManager.js';
import { createCistercianNumeral, CELL_SIZE } from './CistercianNumeral.js';
import { TextLayoutManager } from './TextLayoutManager.js';
import { buildColorizedLabel } from '../utils/localization.js';

/**
 * RenderManager - Handles all rendering operations including text labels, numerals, and display systems
 * Manages responsive text sizing, word object creation, and multiple numeral systems
 */
export class RenderManager {
    constructor(scene) {
        this.scene = scene;
        this.fontManager = new FontManager(scene);
        this.textLayoutManager = new TextLayoutManager(scene);
        
        this.initRenderSystem();
    }

    initRenderSystem() {
        // Font management is handled by FontManager
        // Text layout is handled by TextLayoutManager
        console.log('RenderManager initialized');
    }

    getDisplayText(item, type) {
        if (type === 'emoji') {
            return item.emoji;
        } else if (type === 'number') {
            return String(item.value);
        } else {
            // For letters, shapes, etc. - use value property
            return item.value;
        }
    }

    displayTextLabels(obj, verticalOffset = 0) {
        if (!obj || !obj.itemData) return;

        const data = obj.itemData;
        const x = obj.x;
        const y = obj.y;

        // Get enabled languages from configuration
        const languagesConfig = this.scene.configManager ? this.scene.configManager.getLanguages() : null;
        const enabledLanguages = languagesConfig?.enabled || [{ code: 'en' }, { code: 'es' }];

        // Get responsive text style from TextLayoutManager
        const styleInfo = this.textLayoutManager.calculateResponsiveTextStyle();
        const labelStyle = {
            fontSize: styleInfo.fontSize,
            fill: styleInfo.fill,
            fontFamily: styleInfo.fontFamily,
            align: styleInfo.align,
            stroke: styleInfo.stroke,
            strokeThickness: styleInfo.strokeThickness
        };

        // Apply dynamic vertical offset for object counting layout adjustment
        const labelOffset = styleInfo.labelOffset + verticalOffset;
        const lineSpacing = styleInfo.lineSpacing;
        
        // Store word objects for all enabled languages
        const allLanguageWords = [];
        let englishWords = [];
        let spanishWords = [];
        
        // Create text labels for all enabled languages
        enabledLanguages.forEach((language, index) => {
            const text = buildColorizedLabel(data, language.code);
            if (!text) {
                return;
            }

            const yPosition = y + labelOffset + (index * lineSpacing);
            const wordObjects = this.textLayoutManager.createWordObjects(text, x, yPosition, labelStyle);
            
            // Store in language-specific arrays for backward compatibility
            if (language.code === 'en') {
                englishWords = wordObjects;
            } else if (language.code === 'es') {
                spanishWords = wordObjects;
            }
            
            // Store all language words for comprehensive layout management
            allLanguageWords.push({
                languageCode: language.code,
                words: wordObjects
            });
        });
        
        // Store references to word objects for cleanup and animation
        obj.englishWords = englishWords;
        obj.spanishWords = spanishWords;
        obj.allLanguageWords = allLanguageWords; // Store all language words
        
        // Keep legacy single text references for compatibility
        obj.englishLabel = englishWords.length > 0 ? englishWords[0] : null;
        obj.spanishLabel = spanishWords.length > 0 ? spanishWords[0] : null;
        
        // CRITICAL: Store component layout for locked relative positioning
        // This prevents word overlap when objects are moved after spawn
        if (!obj.componentLayout) {
            obj.componentLayout = {};
        }
        
        // Store all language words relative positions FROM WORD CENTER, not left edge
        obj.componentLayout.allLanguageWords = allLanguageWords.map(langGroup => ({
            languageCode: langGroup.languageCode,
            words: langGroup.words.map((wordObj) => {
                // Calculate offset from word center to object center
                const wordCenterX = wordObj.x + (wordObj.width / 2);
                const offsetX = wordCenterX - x;
                const offsetY = wordObj.y - y;
                return { offsetX, offsetY };
            })
        }));
        
        // Keep backward compatibility with old structure
        obj.componentLayout.englishWords = englishWords.map((wordObj) => {
            const wordCenterX = wordObj.x + (wordObj.width / 2);
            const offsetX = wordCenterX - x;
            const offsetY = wordObj.y - y;
            return { offsetX, offsetY };
        });
        
        obj.componentLayout.spanishWords = spanishWords.map((wordObj) => {
            const wordCenterX = wordObj.x + (wordObj.width / 2);
            const offsetX = wordCenterX - x;
            const offsetY = wordObj.y - y;
            return { offsetX, offsetY };
        });
        
        return {
            englishWords: englishWords,
            spanishWords: spanishWords,
            english: obj.englishLabel,
            spanish: obj.spanishLabel
        };
    }

    /**
     * Cistercian numeral drawn procedurally by ToddleToy (vector strokes, no font).
     * Sized with the same responsive factor as the other numeral rows.
     */
    renderCistercianNumeral(number, x, y) {
        if (!Number.isFinite(number) || number < 0) return null;

        const screenWidth = this.scene.scale.width || window.innerWidth || 800;
        const screenHeight = this.scene.scale.height || window.innerHeight || 600;
        const minDimension = Math.min(screenWidth, screenHeight);
        const scaleFactor = Math.max(0.5, Math.min(1.2, minDimension / 600));

        return createCistercianNumeral(this.scene, x, y, Math.floor(number), {
            cell: Math.max(8, Math.round(CELL_SIZE * scaleFactor))
        });
    }

    renderKaktovikNumeral(number, x, y) {
        if (number < 0) return null;
        
        // Convert number to base-20 representation
        const base20Digits = this.convertToBase20(number);
        
        // Create Unicode string for Kaktovik numerals
        let kaktovikString = '';
        for (const digit of base20Digits) {
            // Kaktovik Unicode range: U+1D2C0 (0) to U+1D2D3 (19)
            const unicodeCodePoint = 0x1D2C0 + digit;
            kaktovikString += String.fromCodePoint(unicodeCodePoint);
        }
        
        // Create text object with Kaktovik font and responsive sizing
        const screenWidth = this.scene.scale.width || window.innerWidth || 800;
        const screenHeight = this.scene.scale.height || window.innerHeight || 600;
        const minDimension = Math.min(screenWidth, screenHeight);
        const scaleFactor = Math.max(0.4, Math.min(1.2, minDimension / 600));
        const fontSize = Math.floor(32 * scaleFactor);
        
        const textObj = this.scene.add.text(x, y, kaktovikString, {
            fontSize: `${fontSize}px`,
            fontFamily: 'Kaktovik, monospace',
            fill: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        
        return textObj;
    }
    
    convertToBase20(number) {
        if (number === 0) return [0];
        
        const digits = [];
        let remaining = number;
        
        while (remaining > 0) {
            digits.unshift(remaining % 20);
            remaining = Math.floor(remaining / 20);
        }
        
        return digits;
    }

    renderBinaryHearts(number, x, y) {
        if (number < 0) return null;
        
        // Convert number to binary string
        const binaryString = this.convertToBinary(number);
        
        // Convert binary to hearts: 1 = ❤️, 0 = 🤍
        let heartString = '';
        for (const bit of binaryString) {
            heartString += bit === '1' ? '❤️' : '🤍';
        }
        
        // Create text object with heart emojis and responsive sizing
        const screenWidth = this.scene.scale.width || window.innerWidth || 800;
        const screenHeight = this.scene.scale.height || window.innerHeight || 600;
        const minDimension = Math.min(screenWidth, screenHeight);
        const scaleFactor = Math.max(0.4, Math.min(1.2, minDimension / 600));
        const fontSize = Math.floor(16 * scaleFactor);
        
        const textObj = this.scene.add.text(x, y, heartString, {
            fontSize: `${fontSize}px`,
            fontFamily: 'Arial, sans-serif',
            fill: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        
        return textObj;
    }

    convertToBinary(number) {
        if (number === 0) return '0';
        return number.toString(2);
    }

    // Font management delegated to FontManager
    areFontsLoaded() {
        return this.fontManager.areFontsLoaded();
    }

    destroy() {
        // Clean up managers
        if (this.fontManager) {
            this.fontManager.destroy();
        }
        if (this.textLayoutManager) {
            this.textLayoutManager.destroy();
        }
    }
}
