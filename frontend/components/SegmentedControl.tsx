'use client';

import React, { KeyboardEvent, useRef } from 'react';
import './SegmentedControl.css';

export type SegmentedControlOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  label: string;
  value: T;
  options: readonly SegmentedControlOption<T>[];
  size?: 'sm' | 'md';
  onChange: (value: T) => void;
};

export default function SegmentedControl<T extends string>({
  label,
  value,
  options,
  size = 'md',
  onChange,
}: SegmentedControlProps<T>) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | undefined;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % options.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + options.length) % options.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = options.length - 1;
    if (nextIndex === undefined) return;

    event.preventDefault();
    buttons.current[nextIndex]?.focus();
    onChange(options[nextIndex].value);
  };

  return (
    <div className={`segmented-control segmented-control--${size}`} role="group" aria-label={label}>
      {options.map((option, index) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            ref={element => { buttons.current[index] = element; }}
            type="button"
            aria-pressed={selected}
            tabIndex={selected ? 0 : -1}
            className={selected ? 'is-active' : undefined}
            onClick={() => onChange(option.value)}
            onKeyDown={event => handleKeyDown(event, index)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
