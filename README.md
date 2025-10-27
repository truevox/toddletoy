# 🎨 ToddleToy - Interactive Learning for Toddlers

ToddleToy is a Progressive Web App (PWA) designed to help toddlers learn through interactive, multi-sensory play. It combines visual elements, spoken words, musical tones, and particle effects to create an engaging learning environment.

## ✨ Features

- **🎯 Multi-Input Support**: Touch, mouse, keyboard, and gamepad controls
- **🌍 Multilingual**: 13 languages including English, Spanish, French, Mandarin, and more
- **🔢 Multiple Number Systems**: Binary, Cistercian, Kaktovik numerals, and visual counting
- **🎨 Rich Content**: Shapes, numbers, letters, and curated emojis
- **🎵 Audio Feedback**: Position-based tones and clear speech synthesis
- **📱 PWA Ready**: Install as an app for offline play and enhanced safety
- **🔧 Fully Configurable**: Customize everything for your child's learning style
- **❓ Built-In Help**: Comprehensive onboarding and inline help system

## 🚀 Quick Start

1. **Visit** ToddleToy at your deployment URL or open locally
2. **Configure** your preferences on the initial setup screen
3. **Install** as a PWA for the best experience (recommended)
4. **Play** together with your child!

### First Time Users

When you first open ToddleToy, you'll see:
- **Welcome Guide**: Step-by-step onboarding for new users
- **Configuration Screen**: Customize content, languages, and settings
- **Help Icons (ⓘ)**: Click for detailed explanations of any option
- **Quick Start**: Or jump right in with default settings!

## 📚 Documentation

- **[Complete Configuration Guide](./docs/CONFIG-GUIDE.md)**: Detailed explanations of every setting
- **[Technical Documentation](./docs/README.md)**: System architecture and implementation details
- **Built-In Help**: Click the "❓ Need Help?" button in the config screen

## 🎯 Recommended Settings by Age

### Ages 1-2 (Early Exploration)
- **Content**: Shapes (40%) + Emojis (60%)
- **Emojis**: Animals, Food, Faces
- **Languages**: 1 language (native)
- **Speech**: 0.5x-0.75x speed

### Ages 2-3 (Active Learning)
- **Content**: Shapes, Small Numbers (1-10), UPPERCASE Letters, Emojis
- **Languages**: 1-2 languages
- **Speech**: 0.75x-1.0x speed
- **Try**: Binary Hearts for fun!

### Ages 3-4 (Expanding Horizons)
- **Content**: All content types with balanced weights
- **Numbers**: 0-50 range
- **Languages**: 2-3 languages
- **Advanced**: Enable all number systems, try Grid Mode

### Ages 4+ (Advanced Learning)
- **Content**: All types, emphasize large numbers and letters
- **Numbers**: 0-1000+ range
- **Languages**: 3-4 languages
- **Advanced**: Object Counting (place values), all number systems

## 🔒 Safety Features

ToddleToy is designed with child safety in mind:

- **No ads or external links**: Children can't accidentally leave the app
- **No data collection**: Everything stays on your device
- **PWA Installation**: Install as an app to prevent accidental exits
- **Guided Access (iOS) / Screen Pinning (Android)**: Lock device to ToddleToy
- **Age-appropriate content**: Carefully curated emojis and vocabulary

### Setting Up Safety Features

**iOS - Guided Access:**
1. Settings → Accessibility → Guided Access
2. Enable and set a passcode
3. Open ToddleToy, triple-click side button
4. Tap Start to lock the app

**Android - Screen Pinning:**
1. Settings → Security → Advanced → Screen Pinning
2. Enable "Ask for PIN before unpinning"
3. Open ToddleToy, tap Recent Apps (□)
4. Tap app icon → Pin

## 🌍 Supported Languages

- 🇺🇸 English
- 🇪🇸 Spanish (Español)
- 🇨🇳 Mandarin Chinese (中文)
- 🇮🇳 Hindi (हिन्दी)
- 🇸🇦 Arabic (العربية)
- 🇫🇷 French (Français)
- 🇧🇩 Bengali (বাংলা)
- 🇵🇹 Portuguese (Português)
- 🇷🇺 Russian (Русский)
- 🇮🇩 Indonesian (Bahasa Indonesia)
- ⚔️ Klingon (tlhIngan Hol)
- 🤖 Lojban
- ⭐ Esperanto

## 🔢 Number Systems

ToddleToy teaches that numbers can be represented in multiple ways:

- **⚙️ Cistercian Numerals**: Medieval monastery number system
- **❄️ Kaktovik Numerals**: Inuit base-20 system from Alaska
- **❤️ Binary Hearts**: Computer binary with hearts and white hearts
- **🍎 Only Apples Counting**: Simple one-to-one correspondence
- **🔢 Object Counting**: Place values with apples (1s), bags (10s), boxes (100s), trucks (1000s)

## 💻 Technical Stack

- **Framework**: Phaser 3 game engine
- **Build Tool**: Vite
- **Audio**: Web Audio API for position-based tones
- **Speech**: Web Speech API for multilingual synthesis
- **Storage**: localStorage for configuration persistence
- **PWA**: Service Worker for offline capability

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## 📱 Installation as PWA

### Desktop (Chrome, Edge, Firefox)
1. Look for install icon in address bar
2. Click "Install ToddleToy"
3. App appears in applications menu

### iOS (Safari)
1. Tap Share button (⎙)
2. Scroll down and tap "Add to Home Screen"
3. Tap "Add" in top right

### Android (Chrome)
1. Tap menu button (⋮)
2. Tap "Install app" or "Add to Home screen"
3. Tap "Install" to confirm

## ❓ Getting Help

### In-App Help
- **Help Icons (ⓘ)**: Click icons next to any configuration option
- **"Need Help?" Button**: Floating button at bottom-right of config screen
- **Onboarding Guide**: Appears automatically for first-time users

### Documentation
- **[Configuration Guide](./docs/CONFIG-GUIDE.md)**: Complete explanations of all settings
- **[Technical Docs](./docs/README.md)**: Architecture and implementation details

### Troubleshooting

**Problem: Too overwhelming**
- Reduce number of content types
- Use only 1 language
- Disable special number displays
- Lower weights on less important categories

**Problem: Child loses interest**
- Add more variety (enable more types)
- Add a second language
- Enable special number displays
- Try Grid Mode for structure

**Problem: Wrong difficulty level**
- Too easy: Add letters, large numbers, multiple languages
- Too hard: Focus on shapes and emojis, small numbers (1-10), one language

**Problem: Audio issues**
- Adjust volumes separately (speech vs audio tones)
- Try slower speech speed (0.5x-0.75x)
- Mute audio tones if distracting

## 🤝 Contributing

ToddleToy is designed with TDD principles and modular architecture. See [CLAUDE.md](./CLAUDE.md) for development guidelines.

## 📄 License

This project is developed for educational purposes.

## 🙏 Acknowledgments

- Cistercian QWERTY font for medieval numeral rendering
- Kaktovik Unicode font for Inuit numerals
- Phaser 3 game framework
- All the toddlers who inspire better learning tools!

---

**Happy Learning! 🎉**

*ToddleToy is not a babysitter. It works best when a grown-up plays along with the child.*
