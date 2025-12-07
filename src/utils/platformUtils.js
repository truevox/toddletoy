/**
 * Utility functions for detecting platform and environment.
 */
import { PLATFORMS } from '../config/constants.js';

/**
 * Detect user's platform for platform-specific instructions.
 * @returns {string} one of PLATFORMS values
 */
export function detectPlatform() {
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) return PLATFORMS.IOS;
    if (/Android/.test(ua)) return PLATFORMS.ANDROID;
    if (/Mac/.test(ua)) return PLATFORMS.MAC;
    if (/Win/.test(ua)) return PLATFORMS.WINDOWS;
    return PLATFORMS.DESKTOP;
}

/**
 * Detect if app is installed as a PWA.
 * @returns {boolean}
 */
export function detectPWAInstalled() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone === true;
    return isStandalone;
}
