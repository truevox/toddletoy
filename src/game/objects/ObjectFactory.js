import { createShapeObject as createShapeObjectImpl } from './ShapeFactory.js'
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

        let style = actualType === 'emoji' ? this.scene.emojiStyle : this.scene.textStyle;
        if (actualType === 'letter') {
            // A letter is the star of its object: draw it as large as an emoji,
            // not at label size.
            style = { ...style, fontSize: this.scene.emojiStyle?.fontSize || '64px', fontStyle: 'bold' };
        }
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

        obj.text = displayText;
        return obj;
    }

    createShapeObject(itemData, x, y, labelText = '') {
        return createShapeObjectImpl(this.scene, itemData, x, y, labelText);
    }
}
