/**
 * FontManager - Handles font preloading for special numeral systems
 * Manages Kaktovik and Cistercian font loading with fallback methods
 */
export class FontManager {
    constructor(scene) {
        this.scene = scene;
        this.fontPreloaded = {
            kaktovik: false,
            cistercian: false
        };
        
        this.initFontSystem();
    }

    initFontSystem() {
        // Preload special fonts
        this.preloadKaktovikFont();
        this.preloadCistercianFont();
    }

    preloadKaktovikFont() {
        // Try to use the Font Loading API if available
        if (document.fonts && document.fonts.load) {
            document.fonts.load('32px Kaktovik').then(() => {
                console.log('Kaktovik font loaded via Font Loading API');
                this.fontPreloaded.kaktovik = true;
            }).catch(() => {
                console.log('Font Loading API failed, using fallback method');
            });
        }
        
        // Fallback: Create invisible text objects with various Kaktovik characters to trigger font loading
        const kaktovikSamples = [
            String.fromCodePoint(0x1D2C0), // 0
            String.fromCodePoint(0x1D2C1), // 1
            String.fromCodePoint(0x1D2C5), // 5
            String.fromCodePoint(0x1D2CA), // 10
            String.fromCodePoint(0x1D2D3)  // 19
        ];
        
        const preloadTexts = [];
        
        for (const sample of kaktovikSamples) {
            const preloadText = this.scene.add.text(-1000, -1000, sample, {
                fontSize: '32px',
                fontFamily: 'Kaktovik, monospace',
                fill: '#ffffff',
                alpha: 0 // Make completely invisible
            });
            preloadTexts.push(preloadText);
        }
        
        // Clean up preload texts after a short delay
        setTimeout(() => {
            for (const text of preloadTexts) {
                if (text && text.destroy) {
                    text.destroy();
                }
            }
            this.fontPreloaded.kaktovik = true;
        }, 100);
        
        console.log('Kaktovik font preloaded with sample characters');
    }
    
    preloadCistercianFont() {
        // Try to use the Font Loading API if available
        if (document.fonts && document.fonts.load) {
            document.fonts.load('32px Cistercian').then(() => {
                console.log('Cistercian font loaded via Font Loading API');
                this.fontPreloaded.cistercian = true;
            }).catch(() => {
                console.log('Cistercian Font Loading API failed, using fallback method');
            });
        }
        
        // Fallback: Create invisible text objects with sample Cistercian characters
        const cistercianSamples = ['1', '2', '5', '9', '0']; // Sample keyboard chars for font
        const preloadTexts = [];
        
        for (const sample of cistercianSamples) {
            const preloadText = this.scene.add.text(-1000, -1000, sample, {
                fontSize: '32px',
                fontFamily: 'Cistercian, monospace',
                fill: '#ffffff',
                alpha: 0 // Make completely invisible
            });
            preloadTexts.push(preloadText);
        }
        
        // Clean up preload texts after a short delay
        setTimeout(() => {
            for (const text of preloadTexts) {
                if (text && text.destroy) {
                    text.destroy();
                }
            }
            this.fontPreloaded.cistercian = true;
        }, 100);
        
        console.log('Cistercian font preloaded with sample characters');
    }

    // Helper method to check if fonts are loaded
    areFontsLoaded() {
        return this.fontPreloaded.kaktovik && this.fontPreloaded.cistercian;
    }

    isKaktovikLoaded() {
        return this.fontPreloaded.kaktovik;
    }

    isCistercianLoaded() {
        return this.fontPreloaded.cistercian;
    }

    destroy() {
        // Clean up any remaining resources
        this.fontPreloaded = { kaktovik: false, cistercian: false };
    }
}