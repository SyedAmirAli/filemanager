const PIN_REMEMBER_FLAG_KEY = 'client.pin.remembered';
const PIN_VALUE_KEY = 'client.pin.value';

let activePin = '';

export function getPinRememberFlagKey(): string {
    return PIN_REMEMBER_FLAG_KEY;
}

export function getRememberedPin(): string {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(PIN_VALUE_KEY) ?? '';
}

export function getActiveSecurityPin(): string {
    if (activePin) return activePin;
    const remembered = getRememberedPin();
    if (remembered) {
        activePin = remembered;
    }
    return activePin;
}

export function setActiveSecurityPin(pin: string): void {
    activePin = pin.replace(/\D/g, '').slice(0, 6);
}

export function persistSecurityPin(pin: string): void {
    if (typeof window === 'undefined') return;
    const normalized = pin.replace(/\D/g, '').slice(0, 6);
    window.localStorage.setItem(PIN_REMEMBER_FLAG_KEY, 'true');
    window.localStorage.setItem(PIN_VALUE_KEY, normalized);
}

export function clearPersistedSecurityPin(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(PIN_REMEMBER_FLAG_KEY);
    window.localStorage.removeItem(PIN_VALUE_KEY);
}
