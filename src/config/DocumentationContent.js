/**
 * DocumentationContent.js
 * Structured documentation content for the ConfigScreen Help section
 * Converted from CONFIG-GUIDE.md
 */

export const documentationSections = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: '🚀',
    content: `
      <h2>Getting Started</h2>
      <p>This section helps you install and set up ToddleToy for the safest and best experience.</p>

      <h3>Installing ToddleToy as an App</h3>
      <p><strong>Why you should do this:</strong></p>
      <ul>
        <li><strong>Safety:</strong> Prevents your child from accidentally leaving the app by tapping browser buttons</li>
        <li><strong>Offline Play:</strong> Works without an internet connection</li>
        <li><strong>Faster Loading:</strong> Opens instantly like any other app on your device</li>
        <li><strong>Full Screen:</strong> More space for your child to explore and learn</li>
      </ul>

      <p><strong>How to install:</strong></p>
      <ul>
        <li><strong>iPhone/iPad:</strong> Tap the Share button (⎙), scroll down, tap "Add to Home Screen"</li>
        <li><strong>Android:</strong> Tap the menu button (⋮), tap "Install app" or "Add to Home screen"</li>
        <li><strong>Desktop:</strong> Look for the install icon in your browser's address bar, or use the browser menu</li>
      </ul>

      <h3>Guided Access (iOS) / Screen Pinning (Android)</h3>
      <p><strong>What it does:</strong> Locks your device to only show ToddleToy, preventing your child from leaving the app or accessing other apps.</p>

      <p><strong>iOS (Guided Access):</strong></p>
      <ol>
        <li>Go to Settings → Accessibility → Guided Access</li>
        <li>Turn on Guided Access and set a Passcode</li>
        <li>Open ToddleToy and triple-click the side button</li>
        <li>Tap Start to begin Guided Access</li>
        <li>To exit: Triple-click the side button and enter your passcode</li>
      </ol>

      <p><strong>Android (Screen Pinning):</strong></p>
      <ol>
        <li>Go to Settings → Security → Advanced</li>
        <li>Turn on Screen Pinning</li>
        <li>Enable "Ask for PIN before unpinning"</li>
        <li>Open ToddleToy, tap Recent Apps button (□)</li>
        <li>Tap the app icon at the top and select Pin</li>
        <li>To exit: Hold Back + Overview buttons together</li>
      </ol>
    `
  },

  {
    id: 'playing-together',
    title: 'Tips for Playing Together',
    icon: '👨‍👩‍👧',
    content: `
      <h2>Tips for Playing Together</h2>
      <p><strong>Important:</strong> ToddleToy works best when a grown-up plays along! This is an interactive learning tool, not a babysitter.</p>

      <p><strong>How to play together:</strong></p>
      <ul>
        <li>Encourage your child to explore and ask questions</li>
        <li>Point at objects and say their names together</li>
        <li>Ask "What color is that?" or "What number is this?"</li>
        <li>Celebrate discoveries with excitement and praise</li>
        <li>Use the multilingual features to teach new languages together</li>
      </ul>
    `
  },

  {
    id: 'content-types',
    title: 'Content Types',
    icon: '📦',
    content: `
      <h2>Content Types</h2>
      <p>This section lets you choose what kinds of things appear in the toy. Each type can be turned on or off, and you can control how often each type appears using the weight sliders.</p>

      <h3>🔵🔺⭐ Shapes</h3>
      <p>Basic geometric shapes like circles, squares, triangles, and stars in different colors.</p>
      <p><strong>Educational value:</strong> Shape recognition, color names, vocabulary building</p>
      <p><strong>Recommended for:</strong> Ages 1-3 for shape and color recognition</p>

      <h3>🔢 Small Numbers</h3>
      <p>Numbers from 0-20 (you can adjust this range).</p>
      <p><strong>Educational value:</strong> Learning to count, number recognition, basic math concepts</p>
      <p><strong>Recommended ranges:</strong></p>
      <ul>
        <li><strong>Ages 1-2:</strong> 1-5 (just starting to count)</li>
        <li><strong>Ages 2-3:</strong> 1-10 (basic counting)</li>
        <li><strong>Ages 3-4:</strong> 0-20 (counting and zero concept)</li>
      </ul>

      <h3>🔢 Large Numbers</h3>
      <p>Numbers from 21-9999 (you can adjust this range).</p>
      <p><strong>Educational value:</strong> Place values, bigger number challenges</p>
      <p><strong>Recommended ranges:</strong></p>
      <ul>
        <li><strong>Ages 3-4:</strong> 21-50 (transitioning to larger numbers)</li>
        <li><strong>Ages 4-5:</strong> 21-100 (learning place values)</li>
        <li><strong>Advanced:</strong> 100-9999 (big number concepts)</li>
      </ul>

      <h3>📝 Letters</h3>
      <p><strong>UPPERCASE Letters:</strong> Capital letters A through Z in different colors.</p>
      <p><strong>lowercase letters:</strong> Small letters a through z in different colors.</p>
      <p><strong>Educational value:</strong> Letter recognition, alphabet learning, pre-reading skills</p>
      <p><strong>Pro tip:</strong> Enable both uppercase and lowercase together to help children learn that letters come in two forms!</p>

      <h3>😊 Emojis</h3>
      <p>Fun pictures like animals, foods, faces, and objects that toddlers recognize.</p>
      <p><strong>Educational value:</strong> Vocabulary building, visual recognition, making learning fun</p>
      <p><strong>Recommended for:</strong> All ages - emojis are universally engaging and educational</p>
    `
  },

  {
    id: 'emoji-categories',
    title: 'Emoji Categories',
    icon: '😊',
    content: `
      <h2>Emoji Categories</h2>
      <p>These settings let you choose which types of emojis appear. You can mix and match to create the perfect learning experience!</p>
      <p><strong>Note:</strong> These categories only work when "😊 Emojis" is enabled in the Content Types section.</p>

      <h3>🐶 Animals</h3>
      <p>Dogs, cats, lions, tigers, fish, birds, elephants, monkeys, and more.</p>
      <p><strong>Educational value:</strong> Learning animal names, animal sounds, developing empathy and interest in nature</p>

      <h3>🍎 Food</h3>
      <p>Fruits, vegetables, pizza, cookies, milk, and everyday foods.</p>
      <p><strong>Educational value:</strong> Food names, healthy eating concepts, mealtime vocabulary</p>

      <h3>🚗 Vehicles</h3>
      <p>Cars, trucks, trains, airplanes, boats, rockets, bicycles, and transportation.</p>
      <p><strong>Educational value:</strong> Transportation vocabulary, vehicle sounds and purposes</p>

      <h3>😀 Faces</h3>
      <p>Happy, sad, surprised, laughing, sleepy, and other emotional expressions.</p>
      <p><strong>Educational value:</strong> Emotional recognition, identifying feelings, building empathy</p>

      <h3>🌳 Nature</h3>
      <p>Trees, flowers, sun, rain, clouds, rainbows, and natural elements.</p>
      <p><strong>Educational value:</strong> Nature vocabulary, weather and seasons, environmental awareness</p>

      <h3>🎾 Objects</h3>
      <p>Balls, toys, books, musical instruments, and everyday objects.</p>
      <p><strong>Educational value:</strong> Everyday object recognition, building comprehensive vocabulary</p>
    `
  },

  {
    id: 'languages',
    title: 'Language Selection',
    icon: '🌍',
    content: `
      <h2>Language Selection</h2>
      <p>ToddleToy supports learning in multiple languages simultaneously! This is one of its most powerful features.</p>

      <h3>How It Works</h3>
      <p>When an object appears, your child hears it in all enabled languages:</p>
      <p>🐶 "Dog... Perro... Chien" (English → Spanish → French)</p>
      <p>This natural repetition helps children associate the same object with different words!</p>

      <h3>Language Order Matters</h3>
      <p>The <strong>first language</strong> in your enabled list is the <strong>primary language</strong>. When ToddleToy speaks, it says the primary language first.</p>

      <h3>Available Languages</h3>
      <ul>
        <li>🇺🇸 <strong>English:</strong> Default language, widely spoken globally</li>
        <li>🇪🇸 <strong>Spanish:</strong> Second most common native language worldwide</li>
        <li>🇨🇳 <strong>Mandarin Chinese:</strong> Most spoken language by native speakers</li>
        <li>🇮🇳 <strong>Hindi:</strong> Official language of India</li>
        <li>🇸🇦 <strong>Arabic:</strong> Spoken across Middle East and North Africa</li>
        <li>🇫🇷 <strong>French:</strong> Widely spoken in Europe, Africa, and Canada</li>
        <li>🇧🇩 <strong>Bengali:</strong> Language of Bangladesh and West Bengal</li>
        <li>🇵🇹 <strong>Portuguese:</strong> Language of Portugal, Brazil, and more</li>
        <li>🇷🇺 <strong>Russian:</strong> Largest native language in Europe</li>
        <li>🇮🇩 <strong>Indonesian:</strong> Official language of Indonesia</li>
        <li>⚔️ <strong>Klingon:</strong> Fun Star Trek language!</li>
        <li>🤖 <strong>Lojban:</strong> Constructed logical language</li>
        <li>⭐ <strong>Esperanto:</strong> International auxiliary language</li>
      </ul>

      <h3>Recommendations by Age</h3>
      <ul>
        <li><strong>Ages 1-2:</strong> Start with 1-2 languages (usually the languages spoken at home)</li>
        <li><strong>Ages 2-3:</strong> Can handle 2-3 languages comfortably</li>
        <li><strong>Ages 3-4:</strong> Ready for 3-4 languages with regular exposure</li>
        <li><strong>Ages 4+:</strong> Can manage multiple languages, especially with consistent practice</li>
      </ul>

      <p><strong>Important:</strong> The key is consistent exposure, not number of languages. Better to use 2 languages regularly than 5 languages rarely!</p>
    `
  },

  {
    id: 'number-displays',
    title: 'Special Number Displays',
    icon: '⚙️',
    content: `
      <h2>Special Number Displays</h2>
      <p>ToddleToy can show numbers in multiple ways at the same time! This helps children understand that the same quantity can be represented differently.</p>

      <h3>⚙️ Cistercian Numerals</h3>
      <p>An ancient number system used by medieval monks in monasteries (13th-15th centuries).</p>
      <p><strong>How it works:</strong> Uses geometric symbols that combine to form numbers 0-9999. One symbol can represent an entire 4-digit number!</p>
      <p><strong>Educational value:</strong> Shows different cultures invented different number systems, pattern recognition, historical awareness</p>
      <p><strong>Recommended for:</strong> Ages 4+ who are curious about how numbers work</p>

      <h3>❄️ Kaktovik Numerals</h3>
      <p>A base-20 number system created by Inuit people in Kaktovik, Alaska (1990s) for teaching math in Iñupiaq language.</p>
      <p><strong>How it works:</strong> Uses geometric symbols where each symbol represents 0-19. Visual representation shows groups of 5!</p>
      <p><strong>Educational value:</strong> Indigenous mathematical systems, cultural respect, alternative ways to think about counting</p>
      <p><strong>Cultural note:</strong> Using Kaktovik numerals honors Indigenous mathematical innovations</p>

      <h3>❤️ Binary Hearts</h3>
      <p>The number system computers use, displayed with hearts (❤️ = 1, 🤍 = 0).</p>
      <p><strong>How it works:</strong> Each position represents a power of 2 (1, 2, 4, 8, 16, 32...)</p>
      <p><strong>Examples:</strong></p>
      <ul>
        <li>5 = 🤍❤️🤍❤️ (4 + 0 + 1 = 5)</li>
        <li>7 = 🤍❤️❤️❤️ (4 + 2 + 1 = 7)</li>
      </ul>
      <p><strong>Educational value:</strong> Introduction to how computers think, pattern recognition, foundation for computer science</p>
      <p><strong>Recommended for:</strong> Ages 4+ who are curious about computers</p>

      <h3>🔢 Object Counting (Place Values)</h3>
      <p>Uses different objects to represent ones, tens, hundreds, and thousands:</p>
      <ul>
        <li>🍎 (Apple) = 1</li>
        <li>🛍️ (Shopping Bag) = 10</li>
        <li>📦 (Box) = 100</li>
        <li>🚛 (Truck) = 1000</li>
      </ul>
      <p><strong>How it works:</strong></p>
      <ul>
        <li>Number 5: Shows 5 apples</li>
        <li>Number 15: Shows 1 shopping bag + 5 apples</li>
        <li>Number 234: Shows 2 boxes + 3 shopping bags + 4 apples</li>
      </ul>
      <p><strong>Educational value:</strong> Place value concept, understanding grouping by 10s/100s/1000s</p>
      <p><strong>Recommended for:</strong> Ages 4+ learning place values</p>

      <h3>🍎 Only Apples Counting</h3>
      <p>Simple counting where each number shows that many apples.</p>
      <p><strong>Educational value:</strong> One-to-one correspondence, visual counting, subitizing</p>
      <p><strong>Recommended for:</strong> Ages 2-4 who are learning to count</p>
    `
  },

  {
    id: 'auto-cleanup',
    title: 'Auto-Cleanup Timer',
    icon: '🧹',
    content: `
      <h2>Auto-Cleanup Timer</h2>
      <p><strong>What it is:</strong> Objects automatically disappear if they haven't been touched for a while.</p>

      <h3>How It Works</h3>
      <ol>
        <li>Each object gets its own invisible timer</li>
        <li>When you touch, click, or interact with an object, its timer resets to zero</li>
        <li>If the timer reaches the set time without any interaction, the object disappears with fun effects!</li>
      </ol>

      <h3>When to Enable</h3>
      <ul>
        <li>Your child tends to spawn many objects and the screen gets crowded</li>
        <li>You want to encourage focus on current objects</li>
        <li>Teaching the concept of "paying attention" to active toys</li>
        <li>Preventing screen clutter during longer play sessions</li>
      </ul>

      <h3>When to Disable</h3>
      <ul>
        <li>Your child likes to look at all their creations together</li>
        <li>Learning sessions are short (under 5 minutes)</li>
        <li>Your child gets upset when things disappear</li>
      </ul>

      <h3>Recommended Timer Settings</h3>
      <ul>
        <li><strong>5-10 seconds:</strong> Active, fast-paced play; encourages quick interactions</li>
        <li><strong>15-30 seconds:</strong> Balanced; gives time to explore but prevents clutter</li>
        <li><strong>60-120 seconds:</strong> Relaxed play; plenty of time to look and think</li>
        <li><strong>180-300 seconds:</strong> Very relaxed; objects stay a long time</li>
      </ul>

      <p><strong>What happens when timer expires:</strong> Fun firework particle effects, cute "pop" sound, and smooth disappearance</p>
    `
  },

  {
    id: 'audio-voice',
    title: 'Audio and Voice Controls',
    icon: '🔊',
    content: `
      <h2>Audio and Voice Controls</h2>
      <p>ToddleToy has two separate audio systems. Understanding the difference helps you configure them perfectly!</p>

      <h3>🎵 Audio Tones (Position-Based Sounds)</h3>
      <p>Musical tones that play based on where objects are positioned on the screen.</p>
      <p><strong>How it works:</strong></p>
      <ul>
        <li><strong>Vertical position:</strong> Controls pitch (higher on screen = higher pitch)</li>
        <li><strong>Horizontal position:</strong> Controls stereo panning (left/right)</li>
        <li><strong>Corner positions:</strong> Control which waveform is used</li>
      </ul>

      <h3>Volume Control</h3>
      <p><strong>Recommended settings:</strong></p>
      <ul>
        <li><strong>0-10%:</strong> Very subtle, non-distracting</li>
        <li><strong>20-40%:</strong> Noticeable but not overwhelming</li>
        <li><strong>50-70%:</strong> Clear audio feedback</li>
        <li><strong>80-100%:</strong> Loud (may be overwhelming)</li>
      </ul>

      <h3>🗣️ Speech Voice (Words & Labels)</h3>
      <p>The spoken words that announce each object's name in enabled languages.</p>
      <p><strong>Educational value:</strong> Primary learning method, language acquisition through repetition, pronunciation modeling</p>

      <h3>Speech Speed Control</h3>
      <p><strong>Recommended settings by age:</strong></p>
      <ul>
        <li><strong>Ages 1-2:</strong> 0.5x-0.75x (slower helps them hear each sound)</li>
        <li><strong>Ages 2-3:</strong> 0.75x-1.0x (standard learning speed)</li>
        <li><strong>Ages 3-4:</strong> 1.0x (normal speed)</li>
        <li><strong>Ages 4+:</strong> 1.0x-1.5x (can process faster speech)</li>
      </ul>

      <p><strong>When to use slower speeds:</strong> Learning new languages, child is just beginning to speak, pronunciation practice</p>
    `
  },

  {
    id: 'grid-mode',
    title: 'Grid Mode',
    icon: '📐',
    content: `
      <h2>Grid Mode</h2>
      <p><strong>What it is:</strong> Changes ToddleToy from free-form placement to a structured grid layout.</p>

      <h3>Normal Mode vs Grid Mode</h3>
      <p><strong>Normal mode</strong> (Grid disabled):</p>
      <ul>
        <li>Objects appear wherever you click/tap</li>
        <li>Objects can be dragged anywhere</li>
        <li>Free exploration and movement</li>
        <li>Organic, unstructured play</li>
      </ul>

      <p><strong>Grid mode</strong> (Grid enabled):</p>
      <ul>
        <li>Screen divided into cells (like a checkerboard)</li>
        <li>Objects snap to grid cells</li>
        <li>Each cell can hold one object</li>
        <li>Structured, organized layout</li>
        <li>Can navigate between cells with keyboard/controller</li>
      </ul>

      <h3>Grid Size Options</h3>
      <ul>
        <li><strong>3×3:</strong> 9 large cells (great for very young children)</li>
        <li><strong>4×4:</strong> 16 medium-large cells (recommended for most users)</li>
        <li><strong>5×5:</strong> 25 medium cells (more variety, still easy to navigate)</li>
        <li><strong>6×6:</strong> 36 small cells (lots of objects, smaller touch targets)</li>
      </ul>

      <h3>Recommendations by Age</h3>
      <ul>
        <li><strong>Ages 1-2:</strong> 3×3 (fewer, larger targets)</li>
        <li><strong>Ages 2-3:</strong> 4×4 (balanced)</li>
        <li><strong>Ages 3-4:</strong> 4×4 or 5×5 (more complexity)</li>
        <li><strong>Ages 4+:</strong> 5×5 or 6×6 (many objects, more challenge)</li>
      </ul>

      <h3>Grid Features</h3>
      <p><strong>Show Grid Lines:</strong> Display visible lines showing grid cell boundaries (helpful when first learning)</p>
      <p><strong>Auto-Populate:</strong> Automatically fills the entire grid with random objects when starting</p>
      <p><strong>Wrap Navigation:</strong> Moving off one edge wraps to the opposite edge</p>
      <p><strong>Cell Spacing:</strong> Control the amount of empty space between grid cells</p>
    `
  },

  {
    id: 'settings-management',
    title: 'Settings Management',
    icon: '⚙️',
    content: `
      <h2>Settings Management</h2>

      <h3>⚡ Skip Config Screen</h3>
      <p><strong>What it does:</strong> On your next visit to ToddleToy, skips the configuration screen and goes directly to play.</p>
      <p><strong>When to enable:</strong> You've configured everything perfectly and don't need to change settings</p>
      <p><strong>Pro tip:</strong> Even with skip enabled, you can always access configuration by visiting <code>/admin</code> in your browser URL!</p>

      <h3>🔄 Reset to Defaults</h3>
      <p><strong>What it does:</strong> Resets ALL settings back to factory defaults.</p>
      <p><strong>When to use:</strong></p>
      <ul>
        <li>Current settings aren't working well</li>
        <li>You want to start fresh with a clean slate</li>
        <li>Settings got configured incorrectly</li>
        <li>Testing default recommendations</li>
      </ul>
      <p><strong>Important:</strong> This action can be undone immediately after clicking! The button changes to "Undo Reset" right after you click it.</p>

      <h3>Data Storage</h3>
      <p>All your settings are saved in your browser's local storage. This means:</p>
      <ul>
        <li>Settings persist across sessions (you don't need to reconfigure every time)</li>
        <li>Settings are device-specific (different devices can have different settings)</li>
        <li>Clearing browser data will reset settings to defaults</li>
        <li>Works offline once installed as PWA</li>
      </ul>
    `
  },

  {
    id: 'quick-reference',
    title: 'Quick Reference by Age',
    icon: '🎯',
    content: `
      <h2>Quick Reference: Recommended Settings by Age</h2>

      <h3>Ages 1-2 (Early Exploration)</h3>
      <p><strong>Content:</strong> Shapes (40%), Emojis (60%)</p>
      <p><strong>Emojis:</strong> Animals (50%), Food (30%), Faces (20%)</p>
      <p><strong>Languages:</strong> 1 language (native language)</p>
      <p><strong>Audio:</strong> Speech 70% at 0.5x-0.75x speed, Audio tones 10-20%</p>
      <p><strong>Advanced:</strong> All special number displays disabled, Grid mode off, Auto-cleanup 30-60s</p>

      <h3>Ages 2-3 (Active Learning)</h3>
      <p><strong>Content:</strong> Shapes (30%), Small Numbers 1-10 (20%), UPPERCASE Letters (20%), Emojis (30%)</p>
      <p><strong>Emojis:</strong> Animals (40%), Food (30%), Vehicles (15%), Faces (15%)</p>
      <p><strong>Languages:</strong> 1-2 languages</p>
      <p><strong>Audio:</strong> Speech 70% at 0.75x-1.0x speed, Audio tones 10-30%</p>
      <p><strong>Advanced:</strong> Binary Hearts enabled, Grid mode off or 4×4, Auto-cleanup 20-30s</p>

      <h3>Ages 3-4 (Expanding Horizons)</h3>
      <p><strong>Content:</strong> Shapes (20%), Small Numbers 0-20 (30%), Large Numbers 21-50 (10%), UPPERCASE (25%), lowercase (15%), Emojis (20%)</p>
      <p><strong>Emojis:</strong> All categories enabled with varied weights</p>
      <p><strong>Languages:</strong> 2-3 languages</p>
      <p><strong>Audio:</strong> Speech 70% at 1.0x speed, Audio tones 20-40%</p>
      <p><strong>Advanced:</strong> All special number displays enabled, Only Apples Counting, Grid 4×4 or 5×5, Auto-cleanup 15-30s</p>

      <h3>Ages 4+ (Advanced Learning)</h3>
      <p><strong>Content:</strong> Shapes (10%), Small Numbers 0-20 (20%), Large Numbers 21-1000 (30%), UPPERCASE (20%), lowercase (20%), Emojis (15%)</p>
      <p><strong>Emojis:</strong> All categories, weighted by interest</p>
      <p><strong>Languages:</strong> 3-4 languages (expand horizons!)</p>
      <p><strong>Audio:</strong> Speech 70% at 1.0x-1.5x speed, Audio tones 30-50%</p>
      <p><strong>Advanced:</strong> All special number displays, Object Counting (place values), Grid 5×5 or 6×6, Auto-cleanup 10-20s</p>
    `
  },

  {
    id: 'faq',
    title: 'FAQ',
    icon: '❓',
    content: `
      <h2>Frequently Asked Questions</h2>

      <h3>Can I use ToddleToy without internet?</h3>
      <p><strong>Yes!</strong> Once installed as a PWA, ToddleToy works completely offline. However, speech synthesis for new languages may require initial internet connection.</p>

      <h3>How do I update settings later?</h3>
      <p>Visit <code>/admin</code> in your browser URL, or if skip-config is disabled, you'll see settings automatically.</p>

      <h3>Can multiple children share one device?</h3>
      <p>Yes, but settings are global. You may want to adjust settings for each play session, or use different browser profiles for different configurations.</p>

      <h3>Is ToddleToy safe for toddlers?</h3>
      <p>Yes! It's designed with safety in mind:</p>
      <ul>
        <li>No ads or external links</li>
        <li>No data collection</li>
        <li>Age-appropriate content only</li>
        <li>Install as PWA + use Guided Access/Screen Pinning for maximum safety</li>
      </ul>

      <h3>Why can't I see some languages?</h3>
      <p>Some languages may not be available depending on your device's text-to-speech engine. iOS and Android have different language support.</p>

      <h3>How do I uninstall?</h3>
      <p>Like any app: long-press the icon → Remove/Uninstall. Or manage installed PWAs in your browser settings.</p>

      <h3>What if my child doesn't like it?</h3>
      <p>Try adjusting settings! Different children respond to different content. Experiment with what captures their attention.</p>
    `
  },

  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: '🔧',
    content: `
      <h2>Troubleshooting</h2>

      <h3>Too overwhelming, too much happening</h3>
      <p><strong>Solution:</strong></p>
      <ul>
        <li>Reduce number of enabled content types</li>
        <li>Lower weights on less important categories</li>
        <li>Use only 1 language</li>
        <li>Disable special number displays</li>
        <li>Increase auto-cleanup timer or disable it</li>
      </ul>

      <h3>Child loses interest quickly</h3>
      <p><strong>Solution:</strong></p>
      <ul>
        <li>Add more variety (enable more content types)</li>
        <li>Increase weights on favorite categories</li>
        <li>Add a second language for novelty</li>
        <li>Enable special number displays for older kids</li>
        <li>Shorter auto-cleanup timer for faster pace</li>
      </ul>

      <h3>Wrong difficulty level</h3>
      <p><strong>Too easy:</strong> Add letters, large numbers, multiple languages</p>
      <p><strong>Too hard:</strong> Focus on shapes and emojis, use only small numbers (1-10), stick to one language</p>

      <h3>Audio issues</h3>
      <p><strong>Solution:</strong></p>
      <ul>
        <li>Adjust speech volume separately from audio tones</li>
        <li>Try slower speech speed (0.5x or 0.75x)</li>
        <li>Mute audio tones if they're distracting</li>
        <li>Check device volume settings</li>
      </ul>
    `
  },

  {
    id: 'technical-notes',
    title: 'Technical Notes',
    icon: '📱',
    content: `
      <h2>Technical Notes</h2>

      <h3>Browser Compatibility</h3>
      <p>ToddleToy works best on:</p>
      <ul>
        <li><strong>Mobile:</strong> Modern iOS Safari (iOS 12+), Android Chrome (Chrome 80+)</li>
        <li><strong>Desktop:</strong> Chrome, Firefox, Safari, Edge (all current versions)</li>
        <li><strong>Features:</strong> Speech synthesis requires internet on first use per language</li>
      </ul>

      <h3>Privacy & Safety</h3>
      <ul>
        <li><strong>No data collection:</strong> ToddleToy doesn't send any data to servers</li>
        <li><strong>No accounts required:</strong> Everything works locally on your device</li>
        <li><strong>No ads:</strong> Clean, distraction-free experience</li>
        <li><strong>No external links:</strong> Child can't accidentally leave the app</li>
        <li><strong>COPPA compliant:</strong> No personal information collected</li>
      </ul>

      <h3>Data Storage</h3>
      <p>All your settings are saved in your browser's local storage. This means:</p>
      <ul>
        <li>Settings persist across sessions</li>
        <li>Settings are device-specific</li>
        <li>Clearing browser data will reset settings to defaults</li>
        <li>Works offline once installed as PWA</li>
      </ul>
    `
  }
];

/**
 * Search through documentation sections for matching content
 * @param {string} query - Search query string
 * @returns {Array} - Array of matching sections
 */
export const documentationSearch = (query) => {
  if (!query || query.trim().length === 0) {
    return documentationSections;
  }

  const lowerQuery = query.toLowerCase().trim();

  return documentationSections.filter(section => {
    const titleMatch = section.title.toLowerCase().includes(lowerQuery);
    const contentMatch = section.content.toLowerCase().includes(lowerQuery);
    return titleMatch || contentMatch;
  });
};

/**
 * Get a specific section by ID
 * @param {string} id - Section ID
 * @returns {Object|null} - Section object or null if not found
 */
export const getDocumentationSection = (id) => {
  return documentationSections.find(section => section.id === id) || null;
};

/**
 * Get all section IDs and titles for navigation
 * @returns {Array} - Array of {id, title, icon} objects
 */
export const getDocumentationTOC = () => {
  return documentationSections.map(section => ({
    id: section.id,
    title: section.title,
    icon: section.icon
  }));
};
