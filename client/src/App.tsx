import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, ClipboardEvent, FormEvent, KeyboardEvent } from 'react';
import { verifySecurityPinApi } from '@/components/home/api';
import {
    clearPersistedSecurityPin,
    getPinRememberFlagKey,
    getRememberedPin,
    persistSecurityPin,
    setActiveSecurityPin,
} from '@/securityPin';
import { PinLockModal } from './components/PinLockModal';
import { HomePageSkeleton } from './components/home/HomePageSkeleton';
import HomePage from './components/home/HomePage';
import './App.css';

const PIN_LENGTH = 6;
const PIN_REMEMBER_KEY = getPinRememberFlagKey();
const ERR_PIN_NON_NUMERIC = 'Only numbers (0-9) are allowed.';

function hasRememberedPin(): boolean {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(PIN_REMEMBER_KEY) === 'true' && !!getRememberedPin();
}

export default function App() {
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [isBootstrappingPin, setIsBootstrappingPin] = useState(hasRememberedPin);
    const [rememberMe, setRememberMe] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        return window.localStorage.getItem(PIN_REMEMBER_KEY) === 'true';
    });
    const [pinDigits, setPinDigits] = useState<string[]>(() => Array.from({ length: PIN_LENGTH }, () => ''));
    const [pinError, setPinError] = useState('');
    const [isVerifyingPin, setIsVerifyingPin] = useState(false);
    const [showPinPlain, setShowPinPlain] = useState(() => Array.from({ length: PIN_LENGTH }, () => false));
    const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
    const pinDigitsRef = useRef(pinDigits);
    const maskTimersRef = useRef<(ReturnType<typeof setTimeout> | null)[]>(
        Array.from({ length: PIN_LENGTH }, () => null),
    );

    useEffect(() => {
        pinDigitsRef.current = pinDigits;
    }, [pinDigits]);

    useEffect(() => {
        const timers = maskTimersRef.current;
        return () => {
            timers.forEach((t) => {
                if (t) clearTimeout(t);
            });
        };
    }, []);

    useEffect(() => {
        if (!isBootstrappingPin) return;
        const rememberedPin = getRememberedPin();
        const hasRememberFlag =
            typeof window !== 'undefined' && window.localStorage.getItem(PIN_REMEMBER_KEY) === 'true';
        if (!hasRememberFlag || !rememberedPin) {
            return;
        }

        setActiveSecurityPin(rememberedPin);
        void verifySecurityPinApi(rememberedPin)
            .then((ok) => {
                if (ok) {
                    setIsUnlocked(true);
                    return;
                }
                clearPersistedSecurityPin();
                setActiveSecurityPin('');
                setRememberMe(false);
            })
            .catch(() => {
                clearPersistedSecurityPin();
                setActiveSecurityPin('');
                setRememberMe(false);
            })
            .finally(() => {
                setIsBootstrappingPin(false);
            });
    }, [isBootstrappingPin]);

    useEffect(() => {
        if (isUnlocked) return;
        if (isBootstrappingPin) return;
        const timer = window.setTimeout(() => {
            inputRefs.current[0]?.focus();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [isUnlocked, isBootstrappingPin]);

    const pinValue = useMemo(() => pinDigits.join(''), [pinDigits]);

    const attemptUnlock = useCallback(
        async (pinRaw: string) => {
            const pin = pinRaw.replace(/\D/g, '').slice(0, PIN_LENGTH);
            if (isVerifyingPin) return;
            if (pin.length !== PIN_LENGTH) {
                setPinError('Please enter all 6 digits.');
                return;
            }

            setIsVerifyingPin(true);
            let verified = false;
            try {
                verified = await verifySecurityPinApi(pin);
            } catch {
                setPinError('Could not verify PIN. Please try again.');
                setIsVerifyingPin(false);
                return;
            }

            if (!verified) {
                setPinError('Invalid security PIN.');
                setIsVerifyingPin(false);
                return;
            }

            setActiveSecurityPin(pin);
            if (rememberMe) {
                persistSecurityPin(pin);
            } else {
                clearPersistedSecurityPin();
            }
            setIsUnlocked(true);
            setIsVerifyingPin(false);
        },
        [isVerifyingPin, rememberMe],
    );

    const clearMaskTimer = useCallback((index: number) => {
        const t = maskTimersRef.current[index];
        if (t) {
            clearTimeout(t);
            maskTimersRef.current[index] = null;
        }
    }, []);

    const scheduleShowThenMask = useCallback(
        (index: number) => {
            clearMaskTimer(index);
            setShowPinPlain((p) => {
                const n = [...p];
                n[index] = true;
                return n;
            });
            maskTimersRef.current[index] = setTimeout(() => {
                if (pinDigitsRef.current[index]) {
                    setShowPinPlain((p) => {
                        const n = [...p];
                        n[index] = false;
                        return n;
                    });
                }
                maskTimersRef.current[index] = null;
            }, 200);
        },
        [clearMaskTimer],
    );

    const onPinDigitFocus = useCallback(
        (index: number) => {
            clearMaskTimer(index);
            setShowPinPlain((p) => {
                const n = [...p];
                n[index] = true;
                return n;
            });
        },
        [clearMaskTimer],
    );

    const onPinDigitBlur = useCallback(
        (index: number) => {
            clearMaskTimer(index);
            maskTimersRef.current[index] = setTimeout(() => {
                if (pinDigitsRef.current[index]) {
                    setShowPinPlain((p) => {
                        const n = [...p];
                        n[index] = false;
                        return n;
                    });
                }
                maskTimersRef.current[index] = null;
            }, 200);
        },
        [clearMaskTimer],
    );

    const writeDigitsFromIndex = (raw: string, startIndex: number) => {
        const digitsOnly = raw.replace(/\D/g, '');
        if (!digitsOnly) {
            clearMaskTimer(startIndex);
            setShowPinPlain((p) => {
                const n = [...p];
                n[startIndex] = false;
                return n;
            });
            setPinDigits((prev) => {
                const next = [...prev];
                next[startIndex] = '';
                return next;
            });
            return;
        }

        setPinDigits((prev) => {
            const next = [...prev];
            let idx = startIndex;
            for (const char of digitsOnly) {
                if (idx >= PIN_LENGTH) break;
                next[idx] = char;
                idx += 1;
            }
            for (let i = 0; i < PIN_LENGTH; i++) {
                if (next[i] && next[i] !== prev[i]) {
                    queueMicrotask(() => {
                        scheduleShowThenMask(i);
                    });
                }
            }
            const joined = next.join('');
            if (joined.length === PIN_LENGTH) {
                queueMicrotask(() => {
                    void attemptUnlock(joined);
                });
            }
            return next;
        });

        const lastIndex = Math.min(startIndex + digitsOnly.length - 1, PIN_LENGTH - 1);
        const nextIndex = Math.min(lastIndex + 1, PIN_LENGTH - 1);
        window.setTimeout(() => {
            inputRefs.current[nextIndex]?.focus();
            inputRefs.current[nextIndex]?.select();
        }, 0);
    };

    const handleDigitChange = (index: number, event: ChangeEvent<HTMLInputElement>) => {
        setPinError('');
        writeDigitsFromIndex(event.target.value, index);
    };

    const handleDigitKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Backspace' && pinDigits[index]) {
            event.preventDefault();
            clearMaskTimer(index);
            setShowPinPlain((p) => {
                const n = [...p];
                n[index] = false;
                return n;
            });
            setPinDigits((prev) => {
                const next = [...prev];
                next[index] = '';
                return next;
            });
            return;
        }

        if (event.key === 'Backspace' && !pinDigits[index] && index > 0) {
            event.preventDefault();
            clearMaskTimer(index - 1);
            setShowPinPlain((p) => {
                const n = [...p];
                n[index - 1] = false;
                return n;
            });
            setPinDigits((prev) => {
                const next = [...prev];
                next[index - 1] = '';
                return next;
            });
            window.setTimeout(() => {
                inputRefs.current[index - 1]?.focus();
            }, 0);
            return;
        }

        if (event.key === 'ArrowLeft' && index > 0) {
            event.preventDefault();
            inputRefs.current[index - 1]?.focus();
            return;
        }

        if (event.key === 'ArrowRight' && index < PIN_LENGTH - 1) {
            event.preventDefault();
            inputRefs.current[index + 1]?.focus();
            return;
        }

        if (event.key.length === 1 && !/^\d$/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
            event.preventDefault();
            setPinError(ERR_PIN_NON_NUMERIC);
        }
    };

    const handleDigitPaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
        event.preventDefault();
        setPinError('');
        writeDigitsFromIndex(event.clipboardData.getData('text'), index);
    };

    const unlock = (event: FormEvent) => {
        event.preventDefault();
        void attemptUnlock(pinValue);
    };

    return (
        <Fragment key={String(isUnlocked)}>
            {isUnlocked ? <HomePage /> : <HomePageSkeleton />}

            {!isUnlocked && (
                <PinLockModal
                    pinDigits={pinDigits}
                    showPinPlain={showPinPlain}
                    inputRefs={inputRefs}
                    rememberMe={rememberMe}
                    isVerifyingPin={isVerifyingPin}
                    pinError={pinError}
                    onRememberMeChange={setRememberMe}
                    onSubmit={unlock}
                    onDigitChange={handleDigitChange}
                    onDigitKeyDown={handleDigitKeyDown}
                    onDigitPaste={handleDigitPaste}
                    onPinDigitFocus={onPinDigitFocus}
                    onPinDigitBlur={onPinDigitBlur}
                />
            )}
        </Fragment>
    );
}
