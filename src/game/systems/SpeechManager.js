/**
 * SpeechManager - Handles speech synthesis with multilingual support
 * Manages speech queue, highlighting animations, and language sequencing
 */
export class SpeechManager {
    constructor(scene) {
        this.scene = scene;
        this.currentSpeech = null;
        this.isSpeaking = false;
        this.currentSpeakingObject = null;
        this.currentLanguage = null;
        this.currentLanguageCodes = [];
        
        this.initSpeech();
    }

    initSpeech() {
        // Check if speech synthesis is available
        if (typeof speechSynthesis === 'undefined') {
            console.warn('Speech synthesis not supported in this browser');
            return;
        }
        
        console.log('Speech synthesis initialized');
    }

    speakText(obj, language = 'en') {
        if (!obj || !obj.itemData) {
            console.warn('Invalid object for speech');
            return;
        }

        // Check if speech is muted in config
        const speechConfig = this.scene.configManager ? this.scene.configManager.getSpeechConfig() : null;
        if (speechConfig && speechConfig.mute) {
            console.log('🔇 Speech is muted');
            return;
        }

        // Reset auto-cleanup timer when object is voiced
        if (this.scene.updateObjectTouchTime) {
            this.scene.updateObjectTouchTime(obj);
        }

        // Cancel any current speech
        if (this.currentSpeech) {
            speechSynthesis.cancel();
        }

        // Set speaking state
        this.isSpeaking = true;
        this.currentSpeakingObject = obj;

        const data = obj.itemData;
        let textsToSpeak = [];

        // Get enabled languages from config
        const config = this.scene.configManager ? this.scene.configManager.getConfig() : null;
        const enabledLanguages = config?.languages?.enabled || [{ code: 'en' }];

        console.log('🗣️ Speech debug - enabled languages:', enabledLanguages);
        console.log('🗣️ Speech debug - language parameter:', language);
        console.log('🗣️ Speech debug - object data:', data);

        // Determine what to speak based on language parameter
        if (language === 'both' || language === 'all') {
            // Use all enabled languages in order
            textsToSpeak = [];
            this.currentLanguageCodes = []; // Store corresponding language codes
            enabledLanguages.forEach(lang => {
                const text = data[lang.code] || data.en; // Fallback to English if translation missing
                if (text) {
                    textsToSpeak.push(text);
                    this.currentLanguageCodes.push(lang.code);
                }
            });
            console.log('🗣️ Speech debug - texts to speak:', textsToSpeak);
            console.log('🗣️ Speech debug - language codes:', this.currentLanguageCodes);
        } else {
            // Use specific language
            const text = data[language] || data.en;
            textsToSpeak = [text];
            this.currentLanguageCodes = [language];
        }

        // Store current language for speech synthesis
        this.currentLanguage = language === 'both' || language === 'all' ? 'multilingual' : language;

        // Speak each text in sequence
        this.speakTextSequence(textsToSpeak, 0);
    }

    speakTextSequence(texts, index) {
        if (index >= texts.length) {
            // Speech sequence complete - unlock the queue and cleanup sparkles
            if (this.currentSpeakingObject && this.scene.particleManager) {
                this.scene.particleManager.cleanupWordSparkles(this.currentSpeakingObject);
            }
            this.currentSpeech = null;
            this.isSpeaking = false;
            this.currentSpeakingObject = null;

            // Clear any pending timeout
            if (this.speechTimeoutId) {
                clearTimeout(this.speechTimeoutId);
                this.speechTimeoutId = null;
            }
            return;
        }

        const utterance = new SpeechSynthesisUtterance(texts[index]);

        // Map language codes to Web Speech API language tags
        const languageMap = {
            'en': 'en-US',
            'es': 'es-ES',
            'zh': 'zh-CN',
            'hi': 'hi-IN',
            'ar': 'ar-SA',
            'fr': 'fr-FR',
            'bn': 'bn-BD',
            'pt': 'pt-PT',
            'ru': 'ru-RU',
            'id': 'id-ID',
            'tlh': 'en-US', // Klingon falls back to English
            'jbo': 'en-US', // Lojban falls back to English  
            'eo': 'eo'      // Esperanto
        };

        // Use the language code for this specific text
        const currentLangCode = this.currentLanguageCodes && this.currentLanguageCodes[index]
            ? this.currentLanguageCodes[index]
            : (this.currentLanguage === 'multilingual' ? 'en' : this.currentLanguage);

        utterance.lang = languageMap[currentLangCode] || 'en-US';

        // Get speech config for volume and rate
        const speechConfig = this.scene.configManager ? this.scene.configManager.getSpeechConfig() : null;
        utterance.rate = speechConfig ? speechConfig.rate : 1.0;
        utterance.volume = speechConfig ? (speechConfig.volume / 100) : 0.7;

        // Trigger word highlighting animation
        if (this.currentSpeakingObject) {
            const obj = this.currentSpeakingObject;
            let wordObjects = null;

            // Get the appropriate word objects based on current language being spoken
            if (obj.allLanguageWords && this.currentLanguageCodes && this.currentLanguageCodes[index]) {
                // Find the language group that matches the current language being spoken
                const currentLangCode = this.currentLanguageCodes[index];
                const langGroup = obj.allLanguageWords.find(group => group.languageCode === currentLangCode);
                if (langGroup && langGroup.words) {
                    wordObjects = langGroup.words;
                }
            } else {
                // Fallback to old structure for backward compatibility
                if (index === 0 && obj.englishWords) {
                    wordObjects = obj.englishWords;
                } else if (index === 1 && obj.spanishWords) {
                    wordObjects = obj.spanishWords;
                }
            }

            // Estimate speech duration and animate words
            if (wordObjects && wordObjects.length > 0) {
                const estimatedDuration = (texts[index].length * 100) + 500; // Rough estimate
                this.animateWordsSequentially(wordObjects, estimatedDuration);
            }
        }

        // Mobile fallback: estimate speech duration and set timeout
        // This fixes Android bug where onend doesn't fire reliably
        const text = texts[index];
        const estimatedDuration = (text.length * 100) + 1000; // ~100ms per char + 1s buffer

        let speechCompleted = false;

        const completeAndNext = () => {
            if (speechCompleted) return; // Prevent double-firing
            speechCompleted = true;

            // Clear timeout if it exists
            if (this.speechTimeoutId) {
                clearTimeout(this.speechTimeoutId);
                this.speechTimeoutId = null;
            }

            console.log(`🗣️ Speech completed (${index + 1}/${texts.length})`);
            this.speakTextSequence(texts, index + 1);
        };

        utterance.onend = () => {
            console.log('🗣️ onend fired');
            completeAndNext();
        };

        utterance.onerror = (error) => {
            console.error('🗣️ Speech error:', error);
            completeAndNext(); // Continue even on error
        };

        // MOBILE FALLBACK: Set timeout in case onend never fires (Android bug)
        this.speechTimeoutId = setTimeout(() => {
            console.warn('🗣️ Speech timeout - onend did not fire (mobile bug)');
            completeAndNext();
        }, estimatedDuration);

        this.currentSpeech = utterance;

        console.log(`🗣️ Speaking text ${index + 1}/${texts.length}: "${text}" (${utterance.lang})`);
        speechSynthesis.speak(utterance);
    }

    animateWordsSequentially(wordObjects, totalDuration) {
        if (!wordObjects || wordObjects.length === 0) return;

        const wordDuration = totalDuration / wordObjects.length;

        wordObjects.forEach((wordObj, index) => {
            const delay = index * wordDuration;

            // Schedule word highlighting with sparkle effects
            this.scene.time.delayedCall(delay, () => {
                if (wordObj && wordObj.active) {
                    // Highlight word with yellow tint
                    wordObj.setTint(0xffff00);

                    // Create sparkle effect if available
                    if (this.scene.particleManager && this.scene.particleManager.createWordSparkleEffect) {
                        this.scene.particleManager.createWordSparkleEffect(wordObj, wordDuration);
                    }

                    // Reset tint after highlighting
                    this.scene.time.delayedCall(wordDuration * 0.8, () => {
                        if (wordObj && wordObj.active) {
                            wordObj.clearTint();
                        }
                    });
                }
            });
        });
    }

    // Check if currently speaking
    getIsSpeaking() {
        return this.isSpeaking;
    }

    // Get current speaking object
    getCurrentSpeakingObject() {
        return this.currentSpeakingObject;
    }

    // Get current language being spoken
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    // Cancel current speech
    cancelSpeech() {
        if (this.currentSpeech) {
            speechSynthesis.cancel();
            this.isSpeaking = false;
            this.currentSpeakingObject = null;
            this.currentSpeech = null;
        }

        // Clear any pending timeout
        if (this.speechTimeoutId) {
            clearTimeout(this.speechTimeoutId);
            this.speechTimeoutId = null;
        }
    }

    // Check if an object is currently being spoken
    isObjectSpeaking(obj) {
        return this.currentSpeakingObject === obj;
    }

    destroy() {
        // Cancel any active speech
        this.cancelSpeech();
        
        // Clear references
        this.currentSpeakingObject = null;
        this.currentLanguageCodes = [];
    }
}