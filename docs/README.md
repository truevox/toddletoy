# Toddler Toy Interactive System Design

## Overview

A multi-input, multilingual, Montessori-aligned toddler interaction toy in the form of a PWA web app. The child interacts with the screen using touch, mouse, keyboard, or gamepad. Interactions spawn visual elements such as colored shapes, emojis, colored letters, or colored numbers with accompanying spoken labels and dynamic sound/particle effects. The interface is responsive, non-violent, and focuses on sensorial learning.

**Supports liquid screen resolution and aspect ratio changes for desktop and mobile web.** The interface automatically adapts to different screen sizes and orientations, ensuring optimal readability and usability across all devices.

## Configuration System

The application now features a comprehensive configuration system that loads by default, allowing parents and educators to customize the learning experience for their specific needs.

### Accessing Configuration
- **Default Route**: Configuration screen loads automatically at `/` (root URL)
- **Admin Access**: Visit `/admin` to access configuration (bypasses skip setting)
- **Skip Option**: Users can choose to skip the config screen on subsequent visits

### 📚 Complete Configuration Guide

For detailed explanations of every configuration option, see the **[Complete Configuration Guide](./CONFIG-GUIDE.md)**.

### ❓ Built-In Help System

ToddleToy now includes a comprehensive help system with:

- **ⓘ Help Icons**: Click the info icons (ⓘ) next to any section for detailed explanations
- **First-Time Onboarding**: New users see a welcome guide explaining how to get started
- **Floating Help Button**: The "❓ Need Help?" button provides quick access to all help topics
- **Inline Tooltips**: Hover or tap help icons for context-specific guidance
- **Complete Documentation**: Full configuration guide with plain-language explanations for all settings

**Getting Help:**
1. Look for ⓘ icons throughout the configuration screen
2. Click the floating "❓ Need Help?" button at the bottom-right
3. Read the [Complete Configuration Guide](./CONFIG-GUIDE.md) for comprehensive documentation

### Configuration Categories

#### Content Types
- **Shapes**: Basic geometric shapes (circles, squares, triangles, etc.)
- **Small Numbers**: Configurable range (default 0-20) for counting practice
- **Large Numbers**: Configurable range (default 21-9999) for advanced learners
- **UPPERCASE Letters**: Classic letter learning (A-Z)
- **lowercase letters**: Reading readiness (a-z)
- **Emojis**: Fun, engaging visual elements

#### Emoji Categories
- **Animals**: Dogs, cats, lions, fish, etc.
- **Food**: Fruits, pizza, cookies, milk, etc.
- **Vehicles**: Cars, trains, airplanes, rockets, etc.
- **Faces**: Happy, surprised, laughing, sleepy expressions
- **Nature**: Trees, flowers, sun, rain elements
- **Objects**: Balls, toys, books, music items

#### Color Categories
- **Primary Colors**: Red, Blue, Yellow - basic color learning
- **Secondary Colors**: Green, Orange, Purple - expanded vocabulary
- **Neutral Colors**: Black, White, Brown, Gray - advanced concepts

#### Weight System
Each category has an adjustable weight (1-100) that determines how frequently items from that category appear. Higher weights = more frequent appearance.

#### Multi-Language Support
- **English Only**: All content in English
- **Spanish Only**: All content in Spanish  
- **Bilingual**: Content appears in both languages (default)
- **Future Languages**: Planned support for Mandarin Chinese, Hindi, Arabic, French, Bengali, Portuguese, Russian, Indonesian, and fun languages like Klingon, Lojban, and Esperanto

#### Advanced Options
- **Number Display Modes**: Toggle Cistercian numerals, Kaktovik numerals, and binary hearts
- **Skip Configuration**: Option to bypass config screen on future visits

### Technical Implementation
The configuration system uses:
- **localStorage**: Persistent settings across sessions
- **Smart Validation**: Auto-adjusts overlapping number ranges
- **Weighted Selection**: Probability-based content generation
- **Category Filtering**: Multi-dimensional content organization
- **Responsive Design**: Mobile-first, accessible interface

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

* Top: Cistercian numeral (drawn by ToddleToy, no font)
* Next: Kaktovik numeral (Unicode font)
* Next: Binary (❤️ for 1, 🤍 for 0)
* Main: Colored number
* Below: \[Color] \[Number] in English
* Bottom: \[Color] \[Number] in Spanish

#### Cistercian Numeral Implementation

Cistercian numerals are drawn by ToddleToy itself, with no font (`src/game/systems/CistercianGlyph.js` is the pure model, `CistercianNumeral.js` the Phaser drawing layer). One glyph holds any integer 0-9999:

- A vertical stave; the four corners carry the four decimal places: units upper-right, tens upper-left (mirror), hundreds lower-right (vertical flip), thousands lower-left (both).
- Units shapes: 1 top stroke, 2 bottom stroke, 3 diagonal down to the outer corner, 4 diagonal up to the outer corner, 5 = 1+4, 6 outer vertical, 7 = 1+6, 8 = 2+6, 9 = 1+2+6.
- Numbers of 10000 and above are drawn as one glyph per group of four decimal digits, most significant on the left, with a gap between.
- Strokes are vector shapes with round caps, so they stay sharp at any size.

**Worked example:** `1993` is one glyph: 1000 lower-left, 900 lower-right, 90 upper-left, 3 upper-right. `12345` is two glyphs, `1` then `2345`.

**Implementation Notes:**
- `layoutNumber()` returns line segments in cell units; the drawing layer fills a capsule per segment.
- The returned object exposes width/height/getBounds so the numeral stack layout and bounds clamping measure it like any other row.

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
* Cistercian: procedural vector rendering (one glyph per four decimal digits), no font.
* Kaktovik: Use Unicode font or custom fallback.
* Binary: Render above object with ❤️ and 🤍.

## Text & Labeling

* Rendered in Phaser text objects.
* Style: clear sans-serif, large, high contrast.
* Text highlights or pulses with each word spoken.
* Text animates in/out cleanly to reinforce the word.

## Layout

* **Liquid responsive design** adapts to any screen resolution and aspect ratio
* **Mobile-optimized** with touch-friendly interactions and safe area support
* **Desktop-optimized** with keyboard and mouse support
* **Cross-platform PWA** installable on Android, iOS, ChromeOS, and desktop
* **Automatic scaling** ensures readability on all devices from 320px to 1920px+
* **Orientation-aware** handles portrait/landscape changes smoothly
* **Anti-clipping protection** keeps all content visible within safe margins

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

