import Phaser from 'phaser'

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
        const fallbackWidth = typeof window !== 'undefined' ? window.innerWidth : 800;
        const fallbackHeight = typeof window !== 'undefined' ? window.innerHeight : 600;
        const minDimension = Math.min(this.scene.scale.width || fallbackWidth, this.scene.scale.height || fallbackHeight);
        const dynamicSize = Math.round(minDimension * 0.04);
        const size = Math.max(28, Math.min(40, dynamicSize || 32));
        const container = this.scene.add.container(x, y);

        const colorHex = itemData?.color?.hex || '#ffffff';
        let fillColorInt = 0xffffff;
        try {
            fillColorInt = Phaser.Display.Color.HexStringToColor(colorHex).color;
        } catch (error) {
            console.warn('Failed to parse shape color hex:', colorHex, error);
        }

        const strokeColor = 0xffffff;
        const strokeAlpha = 0.85;
        const strokeWidth = Math.max(2, Math.round(size * 0.15));
        const normalizedValue = (itemData?.value || '').toLowerCase();
        let shape = null;

        const addShape = (gameObject, { skipStroke = false } = {}) => {
            if (!gameObject) return;
            gameObject.setPosition(0, 0);
            if (gameObject.setOrigin) {
                gameObject.setOrigin(0.5, 0.5);
            }
            if (!skipStroke && gameObject.setStrokeStyle) {
                gameObject.setStrokeStyle(strokeWidth, strokeColor, strokeAlpha);
            }
            container.add(gameObject);
            shape = gameObject;
        };

        switch (normalizedValue) {
            case 'circle':
                addShape(this.scene.add.circle(0, 0, size / 2, fillColorInt));
                break;
            case 'square':
                addShape(this.scene.add.rectangle(0, 0, size * 0.9, size * 0.9, fillColorInt));
                break;
            case 'triangle':
                addShape(this.scene.add.polygon(0, 0, [
                    0, -size / 2,
                    size / 2, size / 2,
                    -size / 2, size / 2
                ], fillColorInt));
                break;
            case 'star':
                addShape(this.scene.add.star(0, 0, 5, size * 0.5, size * 0.2, fillColorInt));
                break;
            case 'diamond':
                addShape(this.scene.add.polygon(0, 0, [
                    0, -size / 2,
                    size / 2, 0,
                    0, size / 2,
                    -size / 2, 0
                ], fillColorInt));
                break;
            case 'heart': {
                const graphics = this.scene.add.graphics({ x: 0, y: 0 });
                graphics.fillStyle(fillColorInt, 1);
                graphics.lineStyle(strokeWidth, strokeColor, strokeAlpha);
                const curveDepth = size * 0.35;
                graphics.beginPath();
                graphics.moveTo(0, size / 2);
                graphics.bezierCurveTo(size / 2, size / 2 - curveDepth, size / 2, -size / 6, 0, -size / 3);
                graphics.bezierCurveTo(-size / 2, -size / 6, -size / 2, size / 2 - curveDepth, 0, size / 2);
                graphics.closePath();
                graphics.fillPath();
                graphics.strokePath();
                addShape(graphics, { skipStroke: true });
                break;
            }
            default:
                addShape(this.scene.add.circle(0, 0, size / 2, fillColorInt));
                break;
        }

        container.mainShape = shape;
        container.shapeSize = size;
        container.text = labelText || itemData?.value || '';
        container.componentLayout = container.componentLayout || {};
        container.componentLayout.labelVerticalOffset = Math.round(size * 1.2);
        const hitSize = size + 12;
        container.setSize(hitSize, hitSize);
        container.setInteractive(new Phaser.Geom.Rectangle(-hitSize / 2, -hitSize / 2, hitSize, hitSize), Phaser.Geom.Rectangle.Contains);

        return container;
    }
}
