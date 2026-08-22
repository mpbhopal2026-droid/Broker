'use client';

import React, { useRef, useEffect } from 'react';

interface DigitOtpInputProps {
  value: string;
  onChange: (code: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  length?: number;
  autoFocus?: boolean;
}

export const DigitOtpInput: React.FC<DigitOtpInputProps> = ({
  value,
  onChange,
  onComplete,
  disabled = false,
  length = 6,
  autoFocus = true,
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const digits = value.split('').concat(Array(Math.max(0, length - value.length)).fill(''));

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) {
      // Clear current digit
      const newDigits = [...digits];
      newDigits[index] = '';
      const newCode = newDigits.join('');
      onChange(newCode);
      return;
    }

    // Handle multiple digits (e.g. pasted into single box)
    if (val.length > 1) {
      handlePaste(val);
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = val;
    const newCode = newDigits.slice(0, length).join('');
    onChange(newCode);

    // Auto-advance focus to next box
    if (index < length - 1 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-complete trigger if all digits are entered
    if (newCode.length === length && onComplete) {
      onComplete(newCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Move back and clear previous
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        onChange(newDigits.join(''));
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        onChange(newDigits.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (pastedText: string) => {
    const cleanDigits = pastedText.replace(/\D/g, '').slice(0, length);
    if (!cleanDigits) return;

    onChange(cleanDigits);
    const focusIndex = Math.min(cleanDigits.length, length - 1);
    inputRefs.current[focusIndex]?.focus();

    if (cleanDigits.length === length && onComplete) {
      onComplete(cleanDigits);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 w-full">
      {Array.from({ length }).map((_, index) => {
        const digit = digits[index] || '';
        const isFilled = Boolean(digit);

        return (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            disabled={disabled}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={(e) => {
              e.preventDefault();
              handlePaste(e.clipboardData.getData('text'));
            }}
            className={`w-11 h-13 sm:w-13 sm:h-15 text-center font-mono text-xl sm:text-2xl font-black rounded-2xl border transition-all outline-none select-none ${
              isFilled
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                : 'bg-slate-50 dark:bg-[#0d121c] border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          />
        );
      })}
    </div>
  );
};
