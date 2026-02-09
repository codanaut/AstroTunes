// src/lib/utils/deviceUtils.js
import { browser } from '$app/environment';

/**
 * Checks if the device has a coarse pointer (touch screen)
 * or if the window width is mobile-sized.
 */
export const isMobileDevice = () => {
    if (!browser) return false;

    // Check for touch capability (most accurate for "is it a phone/tablet")
    const hasTouch = window.matchMedia("(pointer: coarse)").matches;

    // Fallback: check screen width (standard mobile breakpoint)
    const isSmallScreen = window.innerWidth <= 768;

    return hasTouch || isSmallScreen;
};