import { createShapeObject as createShapeObjectImpl } from './ShapeFactory.js'
import { sizes, calibrateTextHeight, fitTextWidth } from '../systems/DisplayScale.js'
import { outlineColorFor, outlineThicknessFor } from '../utils/colorOutline.js'

/**
 * ObjectFactory - Builds the primary display game object (text or shape container) for a spawn.
 * Calls go back through the scene so spies intercept.
 */
export class ObjectFactory {
    constructor(scene) {
        this.scene = scene;
    }

    createPrimaryDisplayObject(actualType, itemData, displayText, x, y) {
        if (actualType === 'shape') {
            return this.scene.createShapeObject(itemData, x, y, displayText);
        }

        // Every main glyph (emoji, letter, numeral) is as tall as the screen-relative unit
        const sz = sizes(this.scene);
        let style = { ...(actualType === 'emoji' ? this.scene.emojiStyle : this.scene.textStyle), fontSize: `${sz.glyphFont}px` };
        if (actualType === 'letter') style = { ...style, fontStyle: 'bold' };
        if ((actualType === 'number' || actualType === 'letter') && itemData?.color?.hex) {
            // Light outline keeps dark fills (e.g. pure blue) legible on the black background
            style = {
                ...style,
                fill: itemData.color.hex,
                stroke: outlineColorFor(itemData.color.hex),
                strokeThickness: outlineThicknessFor(style.fontSize)
            };
        }

        const obj = this.scene.add.text(x, y, displayText, style)
            .setOrigin(0.5, 0.5)
            .setInteractive();

        // The text box is taller than its font size: correct against the measured height,
        // then keep a multi-digit numeral within its share of the screen width
        calibrateTextHeight(obj, sz.glyph);
        if (actualType === 'number') fitTextWidth(obj, sz.numberMaxWidth, 14);

        obj.text = displayText;
        return obj;
    }

    createShapeObject(itemData, x, y, labelText = '') {
        return createShapeObjectImpl(this.scene, itemData, x, y, labelText);
    }
}
