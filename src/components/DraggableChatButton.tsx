'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================
// DraggableChatButton — ALWAYS draggable, even when disabled.
// The `disabled` prop only blocks the CLICK action (opening chat),
// NOT the drag. Uses a <div> instead of <button disabled> because
// disabled buttons don't fire mouse/touch events in HTML.
// ============================================================

interface DraggableChatButtonProps {
  onClick: () => void;
  unreadCount?: number;
  disabled?: boolean;
  title?: string;
  reason?: string;
  storageKey?: string;
}

const DRAG_THRESHOLD = 5;
const EDGE_PADDING = 8;

export default function DraggableChatButton({
  onClick,
  unreadCount = 0,
  disabled = false,
  title = 'Messages',
  reason = '',
  storageKey = 'chat-btn-pos',
}: DraggableChatButtonProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);

  const btnRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Load saved position
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          setPos(parsed);
          return;
        }
      }
    } catch {}
    setPos({
      x: window.innerWidth - 56 - 24,
      y: window.innerHeight - 56 - 24,
    });
  }, [storageKey]);

  // Keep in viewport on resize
  useEffect(() => {
    const handleResize = () => {
      setPos(prev => {
        if (!prev) return prev;
        const btnSize = 56;
        const maxX = window.innerWidth - btnSize - EDGE_PADDING;
        const maxY = window.innerHeight - btnSize - EDGE_PADDING;
        return {
          x: Math.min(Math.max(prev.x, EDGE_PADDING), maxX),
          y: Math.min(Math.max(prev.y, EDGE_PADDING), maxY),
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Pointer down — ALWAYS works (no disabled check)
  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const point = 'touches' in e ? e.touches[0] : e;
    const btn = btnRef.current;
    if (!btn || !pos) return;

    startPosRef.current = { x: point.clientX, y: point.clientY };
    const rect = btn.getBoundingClientRect();
    dragOffsetRef.current = {
      x: point.clientX - rect.left,
      y: point.clientY - rect.top,
    };
    setHasMoved(false);
    setIsDragging(true);

    if ('touches' in e) e.preventDefault();
  }, [pos]);

  // Global move + up handlers
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (clientX: number, clientY: number) => {
      const btnSize = 56;
      const maxX = window.innerWidth - btnSize - EDGE_PADDING;
      const maxY = window.innerHeight - btnSize - EDGE_PADDING;

      const newX = Math.min(Math.max(clientX - dragOffsetRef.current.x, EDGE_PADDING), maxX);
      const newY = Math.min(Math.max(clientY - dragOffsetRef.current.y, EDGE_PADDING), maxY);

      setPos({ x: newX, y: newY });

      const dx = clientX - startPosRef.current.x;
      const dy = clientY - startPosRef.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
        setHasMoved(true);
      }
    };

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) handleMove(e.touches[0].clientX, e.touches[0].clientY);
      e.preventDefault();
    };

    const handleEnd = () => {
      setIsDragging(false);
      setTimeout(() => {
        setPos(currentPos => {
          if (currentPos) {
            try {
              localStorage.setItem(storageKey, JSON.stringify(currentPos));
            } catch {}
          }
          return currentPos;
        });
      }, 0);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, storageKey]);

  // Click — only fires if didn't drag AND not disabled
  const handleClick = () => {
    if (disabled) return;
    if (hasMoved) return;
    onClick();
  };

  if (!pos) return null;

  return (
    <div
      className="fixed z-[5000] select-none"
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        touchAction: 'none',
      }}
    >
      {/* Using a <div> instead of <button disabled> because disabled
          buttons don't fire mouse/touch events, which breaks dragging. */}
      <div
        ref={btnRef}
        onClick={handleClick}
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
        role="button"
        tabIndex={0}
        className={`
          relative w-14 h-14 rounded-full shadow-xl transition-all flex items-center justify-center cursor-grab active:cursor-grabbing
          ${disabled
            ? 'bg-slate-200 text-slate-400'
            : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white hover:shadow-2xl'
          }
          ${isDragging ? 'scale-110 shadow-2xl' : 'hover:scale-105 active:scale-95'}
        `}
        title={disabled ? reason : title}
        style={{ touchAction: 'none' }}
      >
        {/* Chat icon */}
        <svg className="w-7 h-7 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>

        {/* Lock icon overlay when disabled */}
        {disabled && (
          <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4" />
            </svg>
          </span>
        )}

        {/* Unread badge + pulsing ring (only when active) */}
        {!disabled && unreadCount > 0 && (
          <>
            <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-75"></span>
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1 ring-2 ring-white shadow-md z-10">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </>
        )}
      </div>

      {/* Reason text below button when disabled */}
      {disabled && reason && (
        <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-[9px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap pointer-events-none">
          {reason}
        </span>
      )}
    </div>
  );
}
