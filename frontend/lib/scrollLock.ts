/**
 * Utility to lock and unlock background page scroll cleanly.
 * - Prevents background scrolling on desktop and iOS Safari.
 * - Uses position: fixed on body, preserving and restoring scrollY accurately.
 * - Supports nested overlays via reference counting (lockCount).
 */

let lockCount = 0;
let savedScrollY = 0;

export function lockScroll(): void {
  if (typeof window === 'undefined') return;
  lockCount++;
  if (lockCount === 1) {
    savedScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }
}

export function unlockScroll(): void {
  if (typeof window === 'undefined') return;
  if (lockCount > 0) lockCount--;
  if (lockCount === 0) {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    window.scrollTo(0, savedScrollY);
  }
}
