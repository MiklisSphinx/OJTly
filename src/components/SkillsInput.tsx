'use client';

// ============================================================================
// MOBILE-FRIENDLY SKILLS INPUT — for student_profile page
// ----------------------------------------------------------------------------
// PROBLEM: On mobile, the keyboard's "Enter" key doesn't always fire
//          reliably (especially on Android/iOS), so students can't commit
//          a skill they typed.
//
// SOLUTION: Show a visible "Add" button whenever there's text in the input,
//           so mobile users can tap it to commit the skill.
//           Also commit on: Enter key, comma, and onBlur (tapping away).
//
// This is the SAME pattern that works in company_createpost.
// ============================================================================

import { useState } from 'react';

interface SkillsInputProps {
  value: string;              // comma-separated skills string
  onChange: (value: string) => void;  // callback to update parent state
  placeholder?: string;
}

export default function SkillsInput({
  value,
  onChange,
  placeholder = 'Type a skill, then tap Add…'
}: SkillsInputProps) {
  const [currentInput, setCurrentInput] = useState('');

  // Add the current input as a new skill tag
  const addSkill = () => {
    const trimmed = currentInput.trim();
    if (!trimmed) return;

    // De-dupe (case-insensitive)
    const existing = value
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
    if (existing.includes(trimmed.toLowerCase())) {
      setCurrentInput('');
      return;
    }

    onChange(value ? `${value}, ${trimmed}` : trimmed);
    setCurrentInput('');
  };

  // Remove a skill tag by index
  const removeSkillAtIndex = (index: number) => {
    const arr = value.split(',').filter(s => s.trim());
    if (index < 0 || index >= arr.length) return;
    arr.splice(index, 1);
    onChange(arr.join(', '));
  };

  const skillsArray = value.split(',').filter(s => s.trim());

  return (
    <div className="relative">
      <div
        onClick={() => {
          // iOS Safari only opens keyboard on synchronous focus() inside user gesture
          const el = document.getElementById('student-skills-input') as HTMLInputElement | null;
          if (el) {
            el.focus();
            if (typeof el.click === 'function') el.click();
          }
        }}
        className={`min-h-[52px] w-full border-2 rounded-xl px-3 py-2.5 bg-white transition-all cursor-text flex flex-wrap items-center gap-2 ${
          value ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        {/* Render existing skill tags */}
        {skillsArray.map((skill, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 text-sm font-medium rounded-lg border border-blue-200 shadow-sm animate-fade-in"
          >
            <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {skill.trim()}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeSkillAtIndex(index);
              }}
              className="ml-0.5 p-0.5 rounded-full hover:bg-blue-200/50 transition-colors group"
              aria-label={`Remove ${skill}`}
            >
              <svg className="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} strokeLinecap="round">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}

        {/* The actual text input — mobile-friendly attributes */}
        <input
          id="student-skills-input"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="words"
          enterKeyHint="done"
          spellCheck={false}
          placeholder={value ? 'Add another skill…' : placeholder}
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          onKeyDown={(e) => {
            // Accept Enter, comma, Return, Go, Send, etc. as "commit skill"
            const isCommit =
              e.key === 'Enter' ||
              e.key === ',' ||
              e.key === 'Return' ||
              (e as any).keyCode === 13;
            if (isCommit) {
              e.preventDefault();
              addSkill();
              return;
            }
            // Backspace on empty input removes the last tag
            if (e.key === 'Backspace' && !currentInput && value) {
              removeSkillAtIndex(skillsArray.length - 1);
            }
          }}
          onBlur={() => {
            // Mobile-friendly: if user typed something and tapped away,
            // commit the skill so it's not lost
            if (currentInput.trim()) addSkill();
          }}
          className="flex-1 min-w-[120px] sm:min-w-[140px] outline-none bg-transparent text-sm text-slate-700 placeholder:text-slate-400 py-1"
        />

        {/* VISIBLE "Add" button — the actual mobile fix.
            Shows only when user has typed something, so phone users have
            a guaranteed tappable way to commit a skill without relying
            on the mobile Enter key. */}
        {currentInput.trim() && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              addSkill();
              // Re-focus so keyboard stays open for next skill
              setTimeout(() => {
                const el = document.getElementById('student-skills-input') as HTMLInputElement | null;
                el?.focus();
              }, 0);
            }}
            className="shrink-0 px-3 py-1 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600 active:bg-blue-700 transition-colors shadow-sm"
            aria-label="Add skill"
          >
            Add
          </button>
        )}
      </div>

      {/* Helper text + skill counter */}
      <div className="flex items-center justify-between mt-2 px-1">
        <p className="text-xs text-slate-400 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Type a skill, then tap <strong className="font-semibold text-blue-600">Add</strong> (or press Enter)
        </p>
        {value && (
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
            {skillsArray.length} skill{skillsArray.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
      `}</style>
    </div>
  );
}
