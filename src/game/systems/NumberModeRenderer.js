import { ResourceBar } from '../../ui/ResourceBar.js'

/**
 * NumberModeRenderer - Renders the alternate numeral systems (binary, Kaktovik, Cistercian, object counting)
 * for a spawned number object. Calls go back through the scene so spies intercept.
 */
export class NumberModeRenderer {
    constructor(scene) {
        this.scene = scene;
    }

    renderAllNumberModes(obj, numberValue, centerX, centerY) {
        if (!obj || typeof numberValue !== 'number') return;

        const numberModes = this.scene.configManager ? this.scene.configManager.getNumberModes() : {};
        const components = [];

        // VERTICAL LAYOUT STACK (from top to bottom):
        // 1. Cistercian numerals (top, above main object)
        // 2. Kaktovik numerals (above main object)
        // 3. Binary hearts (above main object)
        // 4. Main emoji/number (at centerY)
        // 5. Text labels (below main object, ~60px down)
        // 6. Object counting (BELOW labels, with proper spacing)

        // Calculate counting mode position BELOW text labels (for both objectCounting and onlyApples)
        let objectCountingYOffset = 0;
        if (numberModes.objectCounting || numberModes.onlyApples) {
            // Get ACTUAL responsive text style (not hardcoded!) to match real label positioning
            const styleInfo = this.scene.renderManager.textLayoutManager.calculateResponsiveTextStyle();

            // Get language count
            const languagesConfig = this.scene.configManager ? this.scene.configManager.getLanguages() : null;
            const enabledLanguages = languagesConfig?.enabled || [{ code: 'en' }, { code: 'es' }];
            const languageCount = enabledLanguages.length;

            // Use ACTUAL responsive values from TextLayoutManager (scales with screen size!)
            const actualLabelOffset = styleInfo.labelOffset;   // Math.floor(60 * scaleFactor)
            const actualLineSpacing = styleInfo.lineSpacing;   // Math.floor(30 * scaleFactor)

            // Calculate total label area:
            // - First label at: actualLabelOffset
            // - Each additional label adds: actualLineSpacing
            // - lineSpacing includes both text height and gap, so no need to add fontSize separately
            const totalLabelArea = actualLabelOffset + (languageCount * actualLineSpacing);

            // Mode-specific buffer (also responsive to screen size)
            const buffer = numberModes.onlyApples
                ? Math.floor(20 * styleInfo.scaleFactor)  // Smaller buffer for apples (scaled 20px)
                : Math.floor(10 * styleInfo.scaleFactor); // Minimal buffer for compact bar (scaled 10px)

            objectCountingYOffset = totalLabelArea + buffer;

            const modeName = numberModes.objectCounting ? 'place values' : 'only apples';
            console.log(`📐 Responsive layout (scale=${styleInfo.scaleFactor.toFixed(2)}): ${numberValue}, ${languageCount} langs, labelOffset=${actualLabelOffset}px, lineSpacing=${actualLineSpacing}px, ${modeName} at Y+${objectCountingYOffset}px`);
        }

        // Render Cistercian numerals (furthest from center, above labels)
        if (numberModes.cistercian) {
            const cistercianYOffset = -107;
            const cistercianObj = this.scene.renderManager.renderCistercianNumeral(numberValue, centerX, centerY + cistercianYOffset);
            if (cistercianObj) {
                components.push({ type: 'cistercian', object: cistercianObj, offsetX: 0, offsetY: cistercianYOffset });
            }
        }

        // Render Kaktovik numerals (middle distance, above labels)
        if (numberModes.kaktovik) {
            const baseOffset = numberModes.cistercian ? -60 : -80;
            const kaktovikYOffset = baseOffset - 4;
            const kaktovikObj = this.scene.renderManager.renderKaktovikNumeral(numberValue, centerX, centerY + kaktovikYOffset);
            if (kaktovikObj) {
                components.push({ type: 'kaktovik', object: kaktovikObj, offsetX: 0, offsetY: kaktovikYOffset });
            }
        }

        // Render binary hearts (above labels)
        if (numberModes.binary) {
            let yOffset = -40;
            if (numberModes.cistercian) yOffset = -20;
            if (numberModes.kaktovik) yOffset = -20;

            const binaryObj = this.scene.renderManager.renderBinaryHearts(numberValue, centerX, centerY + yOffset);
            if (binaryObj) {
                components.push({ type: 'binary', object: binaryObj, offsetX: 0, offsetY: yOffset });
            }
        }

        // Render object counting modes BELOW labels
        if (numberModes.objectCounting) {
            // Place values mode: 🚛📦🛍️🍎 (using ResourceBar for compact horizontal layout)
            const placeValues = {
                thousands: Math.floor(numberValue / 1000),
                hundreds: Math.floor((numberValue % 1000) / 100),
                tens: Math.floor((numberValue % 100) / 10),
                ones: numberValue % 10
            };

            const resourceBar = new ResourceBar(this.scene, {
                x: centerX,
                y: centerY + objectCountingYOffset,
                iconSize: { w: 32, h: 32 },
                iconGapX: 4,
                groupGapX: 12,
                maxIconsPerType: Infinity,
                fontSize: 16
            });

            resourceBar.setCounts({
                apples: placeValues.ones,
                bags: placeValues.tens,
                crates: placeValues.hundreds,
                trucks: placeValues.thousands
            });

            components.push({
                type: 'objectCounting',
                object: resourceBar,
                offsetX: 0,
                offsetY: objectCountingYOffset
            });

            console.log(`🔢 Rendered place values for ${numberValue} using ResourceBar`);
        } else if (numberModes.onlyApples) {
            // Only apples mode: 🍎🍎🍎 (simple counting with educational layouts)
            const appleComponents = this.scene.objectCountingRenderer.renderStackedApples(
                numberValue,
                centerX,
                centerY + objectCountingYOffset
            );

            // Add each apple component with proper offset tracking
            appleComponents.forEach(comp => {
                components.push({
                    type: 'onlyApples',
                    object: comp,
                    offsetX: comp.x - centerX, // Calculate offset from center
                    offsetY: comp.y - centerY  // Calculate offset from center
                });
            });

            console.log(`🍎 Rendered only apples for ${numberValue}: ${appleComponents.length} apples`);
        }

        // Store component layout (no label offset needed - labels stay in normal position)
        if (!obj.componentLayout) {
            obj.componentLayout = {};
        }
        obj.componentLayout.numberModes = components;
        obj.componentLayout.labelVerticalOffset = 0; // Labels stay in normal position
    }
}
