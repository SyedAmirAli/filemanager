export const SECURITY_PIN_HEADER = 'x-security-pin';
export const DEFAULT_SECURITY_PIN = '123456';
export const PIN_LENGTH = 6;

export function normalizePin(value: string): string {
  return value.replace(/\D/g, '').slice(0, PIN_LENGTH);
}

export function getConfiguredSecurityPin(): string {
  return normalizePin((process.env.SECURITY_PIN ?? DEFAULT_SECURITY_PIN).trim());
}

export function isSecurityPinValid(pin: string): boolean {
  const normalized = normalizePin(pin);
  if (normalized.length !== PIN_LENGTH) {
    return false;
  }
  return normalized === getConfiguredSecurityPin();
}
