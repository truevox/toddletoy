/**
 * HelpSystem help topic content (data).
 * Functions take the owning HelpSystem instance as first argument and call
 * back through it (help.method) so instance-level spies still intercept.
 */

/**
 * Initialize all help topics with detailed explanations
 */
export function initializeHelpTopics() {
    return {
        'install-app': {
            title: '📱 Installing ToddleToy',
            content: `
                <p><strong>Installing ToddleToy as an app gives you the safest and best experience!</strong></p>
                <h4>Benefits:</h4>
                <ul>
                    <li>✅ <strong>Safety:</strong> Prevents accidental exits - no browser buttons to worry about</li>
                    <li>✅ <strong>Offline Play:</strong> Works without internet connection</li>
                    <li>✅ <strong>Faster:</strong> Opens instantly like any other app</li>
                    <li>✅ <strong>Full Screen:</strong> More space for your child to explore</li>
                </ul>
                <p><a href="/docs/CONFIG-GUIDE.md#installing-toddletoy-as-an-app" target="_blank">Read full installation guide →</a></p>
            `
        },
        'guided-access': {
            title: '🔒 Keeping Your Child Safe',
            content: `
                <p><strong>Use your device's built-in safety features to lock ToddleToy in place!</strong></p>
                <h4>iOS - Guided Access:</h4>
                <p>Locks your iPhone/iPad to show only ToddleToy. Triple-click side button to start/stop.</p>
                <h4>Android - Screen Pinning:</h4>
                <p>Keeps ToddleToy on screen and prevents leaving the app. Use Recent Apps → Pin.</p>
                <p><a href="/docs/CONFIG-GUIDE.md#guided-access-ios--screen-pinning-android" target="_blank">Read detailed setup instructions →</a></p>
            `
        },
        'content-types': {
            title: '📦 Content Types - What Should Appear?',
            content: `
                <p><strong>Choose what your child will see and interact with.</strong></p>
                <h4>Available Content:</h4>
                <ul>
                    <li><strong>Shapes:</strong> Circles, squares, triangles - great for toddlers (ages 1-3)</li>
                    <li><strong>Small Numbers:</strong> 0-20 range, perfect for counting practice (ages 2-4)</li>
                    <li><strong>Large Numbers:</strong> 21-9999 range, for advanced learners (ages 4+)</li>
                    <li><strong>UPPERCASE Letters:</strong> A-Z, classic alphabet learning (ages 2-4)</li>
                    <li><strong>lowercase letters:</strong> a-z, reading readiness (ages 3-5)</li>
                    <li><strong>Emojis:</strong> Animals, foods, faces - fun and engaging (all ages)</li>
                </ul>
                <h4>Weight Sliders:</h4>
                <p>Higher numbers = appears more often. Set to 100 for maximum frequency, 10 for rare appearances.</p>
                <p><a href="/docs/CONFIG-GUIDE.md#content-types-section" target="_blank">Read complete content guide →</a></p>
            `
        },
        'emoji-categories': {
            title: '😊 Emoji Categories',
            content: `
                <p><strong>Fine-tune which types of emojis appear.</strong></p>
                <p><em>Note: These only work when "😊 Emojis" is enabled above.</em></p>
                <h4>Categories:</h4>
                <ul>
                    <li><strong>🐶 Animals:</strong> Dogs, cats, lions - most popular with toddlers!</li>
                    <li><strong>🍎 Food:</strong> Fruits, vegetables, meals - connects to everyday life</li>
                    <li><strong>🚗 Vehicles:</strong> Cars, trains, planes - great for vehicle enthusiasts</li>
                    <li><strong>😀 Faces:</strong> Happy, sad, surprised - teaches emotions</li>
                    <li><strong>🌳 Nature:</strong> Trees, flowers, weather - outdoor connections</li>
                    <li><strong>🎾 Objects:</strong> Balls, toys, books - familiar items</li>
                </ul>
                <p>Use weight sliders to make favorites appear more often!</p>
                <p><a href="/docs/CONFIG-GUIDE.md#emoji-categories-section" target="_blank">Read detailed emoji guide →</a></p>
            `
        },
        'languages': {
            title: '🌍 Multi-Language Learning',
            content: `
                <p><strong>ToddleToy can teach multiple languages at once!</strong></p>
                <h4>How It Works:</h4>
                <ul>
                    <li>Drag languages between "Available" and "Enabled" columns</li>
                    <li><strong>Order matters!</strong> First language = primary speech</li>
                    <li>Objects are announced in all enabled languages</li>
                </ul>
                <h4>Why Multiple Languages?</h4>
                <ul>
                    <li>✅ Early language exposure boosts cognitive development</li>
                    <li>✅ Young children learn languages more easily</li>
                    <li>✅ Builds cultural awareness and appreciation</li>
                    <li>✅ Creates lifelong learning advantages</li>
                </ul>
                <h4>Recommendations:</h4>
                <ul>
                    <li><strong>Ages 1-2:</strong> Start with 1-2 languages (home languages)</li>
                    <li><strong>Ages 2-3:</strong> Can handle 2-3 languages comfortably</li>
                    <li><strong>Ages 3-4:</strong> Ready for 3-4 languages with exposure</li>
                    <li><strong>Ages 4+:</strong> Can manage multiple languages with practice</li>
                </ul>
                <p><a href="/docs/CONFIG-GUIDE.md#language-selection" target="_blank">Read complete language guide →</a></p>
            `
        },
        'special-numbers': {
            title: '⚙️ Special Number Displays',
            content: `
                <p><strong>Show numbers in different ways to teach math concepts!</strong></p>
                <h4>Available Systems:</h4>
                <ul>
                    <li><strong>⚙️ Cistercian:</strong> Ancient monastery number system (13th century)</li>
                    <li><strong>❄️ Kaktovik:</strong> Inuit base-20 system from Alaska</li>
                    <li><strong>❤️ Binary Hearts:</strong> Computer binary with hearts (1) and white hearts (0)</li>
                    <li><strong>🍎 Counting:</strong> Visual counting with apples and place-value objects</li>
                </ul>
                <h4>Educational Value:</h4>
                <p>Shows that the same number can be written differently - a foundational math concept!</p>
                <p><strong>Recommended for ages 4+</strong> who are curious about how numbers work.</p>
                <p><a href="/docs/CONFIG-GUIDE.md#special-number-displays" target="_blank">Read detailed number systems guide →</a></p>
            `
        },
        'auto-cleanup': {
            title: '🧹 Auto-Cleanup Timer',
            content: `
                <p><strong>Objects automatically disappear if not touched!</strong></p>
                <h4>How It Works:</h4>
                <ol>
                    <li>Each object gets its own timer</li>
                    <li>Touching/clicking resets the timer</li>
                    <li>When time expires: fun pop sound + fireworks! 🎆</li>
                </ol>
                <h4>Recommended Settings:</h4>
                <ul>
                    <li><strong>5-10 seconds:</strong> Fast-paced, active play</li>
                    <li><strong>15-30 seconds:</strong> Balanced (recommended)</li>
                    <li><strong>60+ seconds:</strong> Relaxed, contemplative play</li>
                </ul>
                <h4>Benefits:</h4>
                <ul>
                    <li>Prevents screen clutter</li>
                    <li>Teaches cause and effect</li>
                    <li>Encourages interaction and attention</li>
                </ul>
                <p><a href="/docs/CONFIG-GUIDE.md#auto-cleanup-timer" target="_blank">Read complete cleanup guide →</a></p>
            `
        },
        'audio-controls': {
            title: '🔊 Audio & Voice Settings',
            content: `
                <p><strong>ToddleToy has two separate audio systems:</strong></p>
                <h4>🎵 Audio Tones (Position Sounds):</h4>
                <ul>
                    <li>Musical tones based on where objects are positioned</li>
                    <li>Higher on screen = higher pitch</li>
                    <li>Different corners = different waveforms</li>
                    <li>Usually set to 10-30% volume</li>
                </ul>
                <h4>🗣️ Speech Voice (Words):</h4>
                <ul>
                    <li>Spoken words announcing each object</li>
                    <li>Primary learning mechanism</li>
                    <li>Adjustable speed: 0.25x to 2x</li>
                    <li>Usually set to 60-80% volume</li>
                </ul>
                <h4>Speed Recommendations:</h4>
                <ul>
                    <li><strong>Ages 1-2:</strong> 0.5x-0.75x (slower helps hearing)</li>
                    <li><strong>Ages 2-3:</strong> 0.75x-1.0x (standard learning)</li>
                    <li><strong>Ages 3+:</strong> 1.0x (normal speed)</li>
                </ul>
                <p><a href="/docs/CONFIG-GUIDE.md#audio-and-voice-controls" target="_blank">Read complete audio guide →</a></p>
            `
        },
        'grid-mode': {
            title: '📐 Grid Mode',
            content: `
                <p><strong>Switch from free-form to structured grid layout!</strong></p>
                <h4>Normal Mode (Grid Off):</h4>
                <ul>
                    <li>Objects appear anywhere you click/tap</li>
                    <li>Free exploration and movement</li>
                    <li>Best for touch-screen play</li>
                </ul>
                <h4>Grid Mode (Grid On):</h4>
                <ul>
                    <li>Screen divided into cells (like checkerboard)</li>
                    <li>Objects snap to grid positions</li>
                    <li>Great for keyboard/controller navigation</li>
                    <li>More structured and organized</li>
                </ul>
                <h4>Grid Size Recommendations:</h4>
                <ul>
                    <li><strong>3×3:</strong> Ages 1-2 (large targets)</li>
                    <li><strong>4×4:</strong> Ages 2-3 (recommended)</li>
                    <li><strong>5×5 or 6×6:</strong> Ages 3+ (more objects)</li>
                </ul>
                <p><a href="/docs/CONFIG-GUIDE.md#grid-mode" target="_blank">Read complete grid mode guide →</a></p>
            `
        }
    };
}
