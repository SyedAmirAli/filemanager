import type { ChangeEvent, ClipboardEvent, FormEvent, KeyboardEvent, MutableRefObject } from 'react';

type PinLockModalProps = {
    pinDigits: string[];
    /** When false for a filled cell, digit is shown as mask (type password). When true, digit is visible briefly or while focused. */
    showPinPlain: boolean[];
    inputRefs: MutableRefObject<(HTMLInputElement | null)[]>;
    rememberMe: boolean;
    isVerifyingPin: boolean;
    pinError: string;
    onRememberMeChange: (checked: boolean) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onDigitChange: (index: number, event: ChangeEvent<HTMLInputElement>) => void;
    onDigitKeyDown: (index: number, event: KeyboardEvent<HTMLInputElement>) => void;
    onDigitPaste: (index: number, event: ClipboardEvent<HTMLInputElement>) => void;
    onPinDigitFocus: (index: number) => void;
    onPinDigitBlur: (index: number) => void;
};

export function PinLockModal({
    pinDigits,
    showPinPlain,
    inputRefs,
    rememberMe,
    isVerifyingPin,
    pinError,
    onRememberMeChange,
    onSubmit,
    onDigitChange,
    onDigitKeyDown,
    onDigitPaste,
    onPinDigitFocus,
    onPinDigitBlur,
}: PinLockModalProps) {
    return (
        <div className="pin-lock-backdrop" role="presentation">
            <div className="pin-lock-modal" role="dialog" aria-modal="true" aria-labelledby="pin-lock-title">
                <h2 id="pin-lock-title" className="pin-lock-title">
                    Security PIN Required
                </h2>
                <p className="pin-lock-subtitle">Enter your 6-digit PIN to access the client.</p>

                <form onSubmit={onSubmit} className="pin-lock-form" autoComplete="off">
                    <div className="pin-input-row">
                        {pinDigits.map((digit, index) => {
                            const masked = Boolean(digit) && !showPinPlain[index];
                            return (
                            <input
                                key={index}
                                ref={(el) => {
                                    inputRefs.current[index] = el;
                                }}
                                className="pin-digit-input"
                                type={masked ? 'password' : 'text'}
                                name={`pin${index + 1}`}
                                inputMode="numeric"
                                autoComplete="off"
                                autoCapitalize="off"
                                autoCorrect="off"
                                spellCheck={false}
                                pattern="\d*"
                                maxLength={1}
                                value={digit}
                                onChange={(event) => onDigitChange(index, event)}
                                onKeyDown={(event) => onDigitKeyDown(index, event)}
                                onPaste={(event) => onDigitPaste(index, event)}
                                onFocus={(event) => {
                                    onPinDigitFocus(index);
                                    event.currentTarget.select();
                                }}
                                onBlur={() => onPinDigitBlur(index)}
                                aria-label={`PIN digit ${index + 1}`}
                            />
                        );
                        })}
                    </div>

                    <label className="pin-remember-me">
                        <input
                            type="checkbox"
                            checked={rememberMe}
                            disabled={isVerifyingPin}
                            onChange={(event) => onRememberMeChange(event.target.checked)}
                        />
                        Remember me on this device
                    </label>

                    {pinError && <p className="pin-lock-error">{pinError}</p>}

                    <button type="submit" className="btn primary pin-lock-submit" disabled={isVerifyingPin}>
                        {isVerifyingPin ? 'Verifying...' : 'Unlock'}
                    </button>
                </form>
            </div>
        </div>
    );
}
