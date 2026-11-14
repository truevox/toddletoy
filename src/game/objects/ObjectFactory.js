import { createShapeObject as createShapeObjectImpl } from './ShapeFactory.js'

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
        if ((actualType === 'number' || actualType === 'letter') && itemData?.color?.hex) {
            style = { ...style, fill: itemData.color.hex };
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
