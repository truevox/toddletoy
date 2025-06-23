# Toddler Toy Interactive System Design

## Overview

A multi-input, multilingual, Montessori-aligned toddler interaction toy in the form of a PWA web app. The child interacts with the screen using touch, mouse, keyboard, or gamepad. Interactions spawn visual elements such as colored shapes, emojis, colored letters, or colored numbers with accompanying spoken labels and dynamic sound/particle effects. The interface is responsive, non-violent, and focuses on sensorial learning.

## Input Support

### Touch / Mouse

* Taps/clicks spawn an object at the interaction point.
* Drags move the current object.
* Multi-touch averages all points to determine the drag location.

### Keyboard

* Key press spawns object at a pre-mapped screen location.
* Holding multiple keys causes object to interpolate between locations.
* Releasing keys removes those from the interpolation average.

### Gamepad

* Joystick direction (averaged between both sticks) moves the object.
* Button press spawns new object and toggles drag state.
* Button held = continuous drag.

## Languages

* English (default)
* Spanish (enabled)
* Architecture supports easy addition of other languages.

## Display Format (each line should be horizontally centered relative to the next one, not left or right justified)

```
🟦
Blue Square
Cuadro Azul
```

### Display Order (for numbers):

* Top: Cistercian numeral (canvas-rendered)
* Next: Kaktovik numeral (Unicode or custom font)
* Next: Binary (❤️ for 1, 🤍 for 0)
* Main: Colored number
* Below: \[Color] \[Number] in English
* Bottom: \[Color] \[Number] in Spanish

### Display Order (general):

* Main icon (emoji, shape, letter)
* Name in English
* Name in Spanish

### Letters

* Include upper and lowercase (e.g. Red A, Green a).
* Colored character shown.
* Word label matches color + letter.

## Speech Requirements

* Native Web Speech API `speechSynthesis`.
* Reads each word in selected languages.
* Highlights (animates) each word while reading.
* Queue locked until all words have been read.
* If interaction happens mid-read, object is moved rather than spawning a new one.

## Visual Effects

* Particle bursts when spawning.
* Trails or pulses during drag.
* Word-specific sparkle or highlight when read.

## Audio FX (Tone Generator)

* Use Web Audio API.
* Shape = blend of waveforms:

  * Top-left: Sine
  * Top-right: Square
  * Bottom-left: Sawtooth
  * Bottom-right: Triangle
* X/Y determines mix ratio.
* Pitch = vertical screen position.
* Volume = slightly lower than speech.
* Continuous background tone per interaction object.

## Object Types

### Emojis

* Carefully curated list of emojis a toddler would recognize.
* Animal, food, toy, vehicle, and face categories prioritized.

### Shapes

* Basic geometric shapes in bold primary/secondary colors.
* Label format: "Red Square", "Blue Triangle", etc.

### Letters

* A–Z (upper and lowercase).
* Colored letters with matching word label.

### Numbers

* 0–9999.
* Frequency weight:

  * 0–20: most frequent
  * 21–1000: less frequent
  * 1001–9999: least frequent
* Multimodal representation (Cistercian, Kaktovik, Binary, Base-10)

## Rendering Technologies

* **Canvas or WebGL** via Phaser 3.
* Particle systems: use Phaser's built-in or integrate `particles.js`.
* Cistercian: custom procedural canvas rendering.
* Kaktovik: Use Unicode font or custom fallback.
* Binary: Render above object with ❤️ and 🤍.

## Text & Labeling

* Rendered in Phaser text objects.
* Style: clear sans-serif, large, high contrast.
* Text highlights or pulses with each word spoken.
* Text animates in/out cleanly to reinforce the word.

## Layout

* Responsive to screen orientation and aspect ratio.
* Mobile and desktop friendly.
* PWA installable on Android, iOS, ChromeOS.

## Libraries

| Function     | Library                     |
| ------------ | --------------------------- |
| Game Engine  | Phaser 3                    |
| Audio        | Native Web Audio API        |
| Speech       | Web Speech API              |
| Particles    | Phaser or `particles.js`    |
| Input        | Native (Phaser handles all) |
| Font Loading | `webfontloader` if needed   |

## Accessibility

* Uses native APIs to allow screen readers if desired.
* Contrast and font sizing compliant with WCAG AA.

## Extensibility

* JSON or JS object format for each "thing":

```js
{
  emoji: "🐻",
  en: "Bear",
  es: "Oso",
  type: "emoji"
}
```

* Localized label mapping for shapes, letters, and numbers.
* Custom spawn frequency weights.
* Limit code files to 300 lines or less. If they grow more than that, please refactor.

