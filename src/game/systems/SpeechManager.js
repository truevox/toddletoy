/**
 * SpeechManager - Handles speech synthesis with multilingual support
 * Manages speech queue, highlighting animations, and language sequencing
 */
import { buildColorizedLabel } from '../utils/localization.js';

export class SpeechManager {
    constructor(scene) {
        this.scene = scene;
        this.currentSpeech = null;
        this.isSpeaking = false;
        this.currentSpeakingObject = null;
        this.currentLanguage = null;
        this.currentLanguageCodes = [];
        this.speechTimeoutId = null;
        this.sequenceId = 0; // Guards against stale timers/callbacks of cancelled sequences

        this.initSpeech();
    }

    initSpeech() {
        // Check if speech synthesis is available
        if (!this.isSpeechAvailable()) {
            console.warn('Speech synthesis not supported in this browser - toy will run silently');
            return;
        }

        console.log('Speech synthesis initialized');
    }

    /** True when both speechSynthesis and the utterance constructor exist. */
    isSpeechAvailable() {
        return typeof speechSynthesis !== 'undefined' && speechSynthesis !== null &&
            typeof SpeechSynthesisUtterance === 'function';
    }

    safeCancelSynthesis() {
        try {
            if (typeof speechSynthesis !== 'undefined' && speechSynthesis && speechSynthesis.cancel) {
                speechSynthesis.cancel();
            }
        } catch (error) {
            console.warn('speechSynthesis.cancel failed:', error);
        }
    }

    clearSpeechTimeout() {
        if (this.speechTimeoutId) {
            clearTimeout(this.speechTimeoutId);
            this.speechTimeoutId = null;
        }
    }

    releaseSpeechLock() {
        if (this.currentSpeakingObject && this.scene.particleManager) {
            try {
                this.scene.particleManager.cleanupWordSparkles(this.currentSpeakingObject);
            } catch (error) {
                console.warn('Failed to clean up word sparkles:', error);
            }
        }
        this.currentSpeech = null;
        this.isSpeaking = false;
        this.currentSpeakingObject = null;
        this.clearSpeechTimeout();
    }

    speakText(obj, language = 'en') {
        if (!obj || !obj.itemData) {
            console.warn('Invalid object for speech');
            return;
        }

        // Check if speech is muted in config
        const speechConfig = this.scene.configManager ? this.scene.configManager.getSpeechConfig() : null;
        if (speechConfig && speechConfig.mute) {
            return;
        }

        // Reset auto-cleanup timer when object is voiced
        if (this.scene.updateObjectTouchTime) {
            this.scene.updateObjectTouchTime(obj);
        }

        // Invalidate any in-flight sequence and cancel its speech
        this.sequenceId++;
        this.clearSpeechTimeout();
        if (this.currentSpeech) {
            this.safeCancelSynthesis();
        }

        try {
            const data = obj.itemData;
            let textsToSpeak = [];

            // Get enabled languages from config
            const config = this.scene.configManager ? this.scene.configManager.getConfig() : null;
            const enabledLanguages = config?.languages?.enabled || [{ code: 'en' }];

            // Determine what to speak based on language parameter
            const fallbackValue = data.value !== undefined && data.value !== null
                ? String(data.value)
                : '';

            const getTextForLanguage = (code) => {
                const composed = buildColorizedLabel(data, code) || buildColorizedLabel(data, 'en');
                if (composed && composed.trim()) {
                    return composed;
                }
                return fallbackValue;
            };

            if (language === 'both' || language === 'all') {
                // Use all enabled languages in order
                this.currentLanguageCodes = []; // Store corresponding language codes
                enabledLanguages.forEach(lang => {
                    const text = getTextForLanguage(lang.code);
                    if (text) {
                        textsToSpeak.push(text);
                        this.currentLanguageCodes.push(lang.code);
                    }
                });
            } else {
                // Use specific language
                textsToSpeak = [getTextForLanguage(language)];
                this.currentLanguageCodes = [language];
            }

            // Store current language for speech synthesis
            this.currentLanguage = language === 'both' || language === 'all' ? 'multilingual' : language;

            // Set speaking state only once we know the sequence can start
            this.isSpeaking = true;
            this.currentSpeakingObject = obj;

            // Speak each text in sequence
            this.speakTextSequence(textsToSpeak, 0, this.sequenceId);
        } catch (error) {
            // Never leave the toy locked because speech failed
            console.error('Speech failed, continuing silently:', error);
            this.releaseSpeechLock();
        }
    }

    speakTextSequence(texts, index, sequenceId = this.sequenceId) {
        if (sequenceId !== this.sequenceId) return; // Stale sequence (cancelled/replaced)

        if (index >= texts.length) {
            // Speech sequence complete - unlock the queue and cleanup sparkles
            this.releaseSpeechLock();
            return;
        }

        const text = texts[index];

        // Trigger word highlighting animation (runs even when speech is unavailable)
        this.startWordHighlight(texts, index);

        let speechCompleted = false;
        const completeAndNext = () => {
            if (speechCompleted || sequenceId !== this.sequenceId) return; // Prevent double-firing / stale
            speechCompleted = true;
            this.clearSpeechTimeout();
            this.speakTextSequence(texts, index + 1, sequenceId);
        };

        let utterance = null;
        try {
            if (this.isSpeechAvailable()) {
                utterance = this.buildUtterance(text, index);
                utterance.onend = completeAndNext;
                utterance.onerror = (error) => {
                    console.warn('Speech error:', error && error.error ? error.error : error);
                    completeAndNext(); // Continue even on error
                };
            }
        } catch (error) {
            console.warn('Could not create utterance, continuing silently:', error);
            utterance = null;
        }

        // Timeout fallback: Android sometimes never fires onend, and with no
        // speech API at all this paces the silent highlight animation.
        const estimatedDuration = (text.length * 100) + (utterance ? 1000 : 500);
        this.clearSpeechTimeout();
        this.speechTimeoutId = setTimeout(completeAndNext, estimatedDuration);

        if (!utterance) {
            this.currentSpeech = null;
            return;
        }

        this.currentSpeech = utterance;
        try {
            speechSynthesis.speak(utterance);
        } catch (error) {
            console.warn('speechSynthesis.speak failed, continuing silently:', error);
            this.currentSpeech = null; // timeout above still releases the lock
        }
    }

    buildUtterance(text, index) {
        const utterance = new SpeechSynthesisUtterance(text);

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

        // Ensure rate is a valid finite number (Android fix)
        let rate = 1.0;
        if (speechConfig && speechConfig.rate !== undefined && speechConfig.rate !== null) {
            const configRate = Number(speechConfig.rate);
            if (isFinite(configRate) && configRate > 0) {
                rate = configRate;
            } else {
                console.warn('Invalid speech rate in config:', speechConfig.rate, '- using default 1.0');
            }
        }
        utterance.rate = rate;

        // Ensure volume is a valid finite number
        let volume = 0.7;
        if (speechConfig && speechConfig.volume !== undefined && speechConfig.volume !== null) {
            const configVolume = Number(speechConfig.volume);
            if (isFinite(configVolume) && configVolume >= 0 && configVolume <= 100) {
                volume = configVolume / 100;
            } else {
                console.warn('Invalid speech volume in config:', speechConfig.volume, '- using default 70');
            }
        }
        utterance.volume = volume;

        return utterance;
    }

    startWordHighlight(texts, index) {
        const obj = this.currentSpeakingObject;
        if (!obj) return;

        let wordObjects = null;

        // Get the appropriate word objects based on current language being spoken
        if (obj.allLanguageWords && this.currentLanguageCodes && this.currentLanguageCodes[index]) {
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
        this.sequenceId++; // Invalidate pending callbacks
        if (this.currentSpeech) {
            this.safeCancelSynthesis();
        }
        this.isSpeaking = false;
        this.currentSpeakingObject = null;
        this.currentSpeech = null;
        this.clearSpeechTimeout();
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
