/**
 * ConfigManager default configuration.
 * Functions take the owning ConfigManager instance as first argument and call
 * back through it (manager.method) so instance-level spies still intercept.
 */

/**
 * Get default configuration for new users
 */
export function getDefaults() {
    return {
        // Bumped when a default changes in a way that needs a one-off migration (see ConfigMigration.js)
        schemaVersion: 2,
        content: {
            shapes: { enabled: true, weight: 25 },
            smallNumbers: { enabled: true, min: 0, max: 20, weight: 30 },
            largeNumbers: { enabled: true, min: 21, max: 9999, weight: 10 },
            uppercaseLetters: { enabled: true, weight: 25 },
            lowercaseLetters: { enabled: false, weight: 15 },
            emojis: { enabled: true, weight: 20 }
        },
        emojiCategories: {
            animals: { enabled: true, weight: 40 },
            food: { enabled: true, weight: 30 },
            vehicles: { enabled: true, weight: 15 },
            faces: { enabled: true, weight: 10 },
            nature: { enabled: false, weight: 3 },
            objects: { enabled: false, weight: 2 }
        },
        colorCategories: {
            primary: { enabled: true, weight: 50 },    // Red, Blue, Yellow
            secondary: { enabled: true, weight: 35 },  // Green, Orange, Purple  
            neutral: { enabled: false, weight: 15 }    // Black, White, Brown, Gray
        },
        languages: {
            enabled: [
                { code: 'en', name: 'English', nativeName: 'English', difficultyRank: 6, learningHours: '700-900h', colors: ['#B22234', '#FFFFFF', '#3C3B6E'] }, // American Red, White, Blue 🇺🇸
                { code: 'es', name: 'Spanish', nativeName: 'Español', difficultyRank: 3, learningHours: '600-750h', colors: ['#AA151B', '#F1BF00'] } // Spanish Red & Yellow 🇪🇸
            ],
            available: [
                { code: 'eo', name: 'Esperanto', nativeName: 'Esperanto', difficultyRank: 1, learningHours: '150-200h', colors: ['#009900', '#FFFFFF'] }, // Esperanto Green & White ⭐
                { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', difficultyRank: 2, learningHours: '900h', colors: ['#FF0000', '#FFFFFF'] }, // Indonesian Red & White 🇮🇩
                { code: 'pt', name: 'Portuguese', nativeName: 'Português', difficultyRank: 4, learningHours: '600-750h', colors: ['#006600', '#FF0000'] }, // Portuguese Green & Red 🇵🇹
                { code: 'fr', name: 'French', nativeName: 'Français', difficultyRank: 5, learningHours: '600-750h', colors: ['#0055A4', '#FFFFFF', '#EF4135'] }, // French Blue, White, Red 🇫🇷
                { code: 'jbo', name: 'Lojban', nativeName: 'la .lojban.', difficultyRank: 7, learningHours: '1000h±', colors: ['#00FF00', '#0000FF'] }, // Lojban Logical Green & Blue 🤖
                { code: 'ru', name: 'Russian', nativeName: 'Русский', difficultyRank: 8, learningHours: '1100h', colors: ['#FFFFFF', '#0039A6', '#D52B1E'] }, // Russian White, Blue, Red 🇷🇺
                { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', difficultyRank: 9, learningHours: '1100h', colors: ['#006A4E', '#F42A41'] }, // Bangladesh Green & Red 🇧🇩
                { code: 'hi', name: 'Hindi', nativeName: 'हिन্দী', difficultyRank: 10, learningHours: '1100h', colors: ['#FF9933', '#FFFFFF', '#138808'] }, // Indian Saffron, White, Green 🇮🇳
                { code: 'tlh', name: 'Klingon', nativeName: 'tlhIngan Hol', difficultyRank: 11, learningHours: '1400h±', colors: ['#8B0000', '#000000', '#FFD700'] }, // Klingon Dark Red, Black, Gold ⚔️
                { code: 'ar', name: 'Modern Standard Arabic', nativeName: 'العربية', difficultyRank: 12, learningHours: '2200h', colors: ['#000000', '#FFFFFF', '#007A3D'] }, // Pan-Arab Black, White, Green
                { code: 'zh', name: 'Mandarin Chinese', nativeName: '中文', difficultyRank: 13, learningHours: '2200h+', colors: ['#DE2910', '#FFDE00'] } // Chinese Red & Yellow 🇨🇳
            ]
        },
        audio: {
            volume: 10,      // 0-100, matches current 0.1 gain (10%)
            mute: false,
            toneDuration: -1 // -1 = play until destroyed, 100-20000 = milliseconds
        },
        speech: {
            volume: 70,      // 0-100, matches current 0.7 volume
            mute: false,
            rate: 1.0        // 0.25-2.0, changing from hardcoded 0.8 to standard 1.0
        },
        advanced: {
            skipConfig: false,
            // Calm by default: a number shows its numeral and caption. The other
            // ways of showing it are opt-in (Advanced settings).
            numberModes: {
                cistercian: false,
                kaktovik: false,
                binary: false,
                objectCounting: false,
                onlyApples: false
            },
            autoCleanup: {
                enabled: true,
                timeoutSeconds: 10
            }
        },
        // Grid Mode: Optional structured layout mode (EXTRA FEATURE)
        // When disabled (default), ToddleToy works in free-form mode where objects can be placed anywhere
        // When enabled, objects are constrained to a fixed grid for more structured learning
        gridMode: {
            enabled: false,          // Toggle: false = free-form mode (default), true = grid mode
            rows: 4,                 // Grid rows (3-6)
            cols: 4,                 // Grid columns (3-6)
            showGrid: true,          // Show grid overlay lines
            autoPopulate: false,     // Pre-fill grid with random objects on load
            cellPadding: 10,         // Padding between cells in pixels
            wrapNavigation: false,   // Wrap navigation at grid boundaries
            highlightStyle: 'default', // Cell highlight style
            theme: 'default'         // Grid theme
        }
    };
}
