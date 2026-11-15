import { ResourceBar } from '../../ui/ResourceBar.js'
import { computeAboveStackOffsets, KAKTOVIK_LIFT, CISTERCIAN_LIFT, ROW_GAP } from './NumberModeLayout.js'
import { sizes } from './DisplayScale.js'

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
        const sz = sizes(this.scene);   // every row below scales from the same screen-relative unit
        const k = sz.k;

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
                ? Math.floor(20 * k)   // buffer for apples (20px at a 64px glyph)
                : Math.floor(10 * k);  // minimal buffer for the compact bar

            objectCountingYOffset = totalLabelArea + buffer;

        }

        // Rows above the numeral (binary hearts nearest, then Kaktovik, then Cistercian).
        // Create them first, then position by MEASURED height so rows never overlap
        // the numeral or each other (see NumberModeLayout).
        const rm = this.scene.renderManager;
        const aboveRows = [];
        if (numberModes.binary) {
            const binaryObj = rm.renderBinaryHearts(numberValue, centerX, centerY);
            if (binaryObj) aboveRows.push({ type: 'binary', object: binaryObj, lift: 0 });
        }
        if (numberModes.kaktovik) {
            const kaktovikObj = rm.renderKaktovikNumeral(numberValue, centerX, centerY);
            if (kaktovikObj) aboveRows.push({ type: 'kaktovik', object: kaktovikObj, lift: KAKTOVIK_LIFT * k });
        }
        if (numberModes.cistercian) {
            const cistercianObj = rm.renderCistercianNumeral(numberValue, centerX, centerY);
            if (cistercianObj) aboveRows.push({ type: 'cistercian', object: cistercianObj, lift: CISTERCIAN_LIFT * k });
        }

        if (aboveRows.length > 0) {
            const mainHalfHeight = (obj.displayHeight || obj.height || 32) / 2;
            const offsets = computeAboveStackOffsets(
                aboveRows.map(row => ({ type: row.type, lift: row.lift, height: row.object.displayHeight || row.object.height || 0 })),
                mainHalfHeight,
                Math.round(ROW_GAP * k)
            );
            aboveRows.forEach(row => {
                const offsetY = offsets[row.type];
                if (row.object.setPosition) row.object.setPosition(centerX, centerY + offsetY);
                components.push({ type: row.type, object: row.object, offsetX: 0, offsetY });
            });
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
                iconSize: { w: sz.countIcon, h: sz.countIcon },
                iconGapX: Math.round(4 * k),
                groupGapX: Math.round(12 * k),
                maxIconsPerType: Infinity,
                fontSize: sz.countFont
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

        }

        // Store component layout (no label offset needed - labels stay in normal position)
        if (!obj.componentLayout) {
            obj.componentLayout = {};
        }
        obj.componentLayout.numberModes = components;
        obj.componentLayout.labelVerticalOffset = 0; // Labels stay in normal position
    }
}
