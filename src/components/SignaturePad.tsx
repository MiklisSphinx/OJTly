'use client';

// components/SignaturePad.tsx
// Reusable E-Signature pad with two modes:
//   - Draw : hand-draw with mouse OR finger (pointer events, touch-friendly)
//   - Type : type a name, rendered live in a script font
// The parent receives a base64 PNG data URL through onChange (null when empty).

import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';

type Props = {
  onChange: (dataUrl: string | null) => void;
};

const W = 500;
const H = 180;
const INK = '#1e3a8a'; // navy ink

export default function SignaturePad({ onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const typeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  const [typed, setTyped] = useState('');
  const [hasInk, setHasInk] = useState(false);

  const paintWhite = (c: HTMLCanvasElement) => {
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
  };

  // paint the draw canvas white once on mount
  useEffect(() => {
    if (canvasRef.current) paintWhite(canvasRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // render the typed signature preview and export it
  useEffect(() => {
    if (mode !== 'type') return;
    const c = typeCanvasRef.current;
    if (!c) return;
    paintWhite(c);
    const name = typed.trim();
    if (name) {
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = INK;
        ctx.font = 'italic 36px "Brush Script MT", "Segoe Script", "Lucida Handwriting", cursive';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name, c.width / 2, c.height / 2);
      }
    }
    onChange(name ? c.toDataURL('image/png') : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed, mode]);

  const pos = (e: RPointerEvent<HTMLCanvasElement>) => {
    const c = e.currentTarget;
    const rect = c.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * c.width,
      y: ((e.clientY - rect.top) / rect.height) * c.height,
    };
  };

  const strokeTo = (e: RPointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const p = pos(e);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };

  const endStroke = () => {
    if (!drawing.current) return;
    drawing.current = false;
    setHasInk(true);
    const c = canvasRef.current;
    if (c) onChange(c.toDataURL('image/png'));
  };

  const clear = () => {
    setTyped('');
    if (canvasRef.current) paintWhite(canvasRef.current);
    setHasInk(false);
    onChange(null);
  };

  const tabCls = (active: boolean) =>
    `px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
      active
        ? 'bg-indigo-600 text-white border-indigo-600'
        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
    }`;

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center gap-2">
        <button type="button" onClick={() => setMode('draw')} className={tabCls(mode === 'draw')}>
          Draw
        </button>
        <button type="button" onClick={() => setMode('type')} className={tabCls(mode === 'type')}>
          Type
        </button>
        <span className="flex-1" />
        <button
          type="button"
          onClick={clear}
          className="text-xs font-semibold text-slate-500 hover:text-red-600"
        >
          Clear
        </button>
      </div>

      {mode === 'draw' ? (
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="w-full cursor-crosshair touch-none select-none rounded-xl border-2 border-dashed border-slate-300 bg-white"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              drawing.current = true;
              last.current = pos(e);
            }}
            onPointerMove={(e) => {
              if (!drawing.current) return;
              strokeTo(e);
            }}
            onPointerUp={endStroke}
            onPointerCancel={() => {
              drawing.current = false;
            }}
          />
          {!hasInk && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-medium text-slate-300">
                Draw your signature here (mouse or finger)
              </span>
            </div>
          )}
        </div>
      ) : (
        <div>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Type your full name"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <canvas
            ref={typeCanvasRef}
            width={W}
            height={H}
            className="mt-2 w-full rounded-xl border-2 border-dashed border-slate-300 bg-white"
          />
        </div>
      )}

      <p className="mt-1 text-[11px] text-slate-400">
        Saved as an electronic signature (E-Signature) attached to this MOA. Wrong stroke? You can
        clear and redo here, or re-sign later anytime.
      </p>
    </div>
  );
}
