import React, { useState, useRef } from 'react';
import { GripHorizontal, Power, EyeOff } from 'lucide-react';

interface FloatingBotPanelProps {
  isBotOn: boolean;
  isHidden: boolean;
  onToggleBot: () => void;
  onHidePanel: () => void;
}

export default function FloatingBotPanel({
  isBotOn,
  isHidden,
  onToggleBot,
  onHidePanel,
}: FloatingBotPanelProps) {
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 24, y: 90 });
  const [isExpanded, setIsExpanded] = useState(true);
  const draggingRef = useRef(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const movedRef = useRef(false);

  // When hidden (.f3), render nothing at all so no icon is detectable on screen.
  if (isHidden) {
    return null;
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    movedRef.current = false;
    dragOffsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const nextX = Math.max(8, Math.min(window.innerWidth - 220, e.clientX - dragOffsetRef.current.x));
    const nextY = Math.max(8, Math.min(window.innerHeight - 160, e.clientY - dragOffsetRef.current.y));
    if (Math.abs(nextX - position.x) > 4 || Math.abs(nextY - position.y) > 4) {
      movedRef.current = true;
    }
    setPosition({ x: nextX, y: nextY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      data-testid="floating-bot-panel"
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
      }}
      className="fixed top-0 left-0 z-40 w-56 bg-[#111827]/95 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl select-none"
    >
      {/* Drag Bar / Header */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={() => {
          if (!movedRef.current) {
            setIsExpanded((prev) => !prev);
          }
        }}
        className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800 cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold tracking-tight text-white">yamasy panel</span>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          {isBotOn ? 'ON' : 'OFF'}
        </span>
      </div>

      {/* Panel Body: Strictly 2 Features: 1. ON/OFF, 2. Hide */}
      {isExpanded && (
        <div className="p-3 space-y-2">
          <button
            type="button"
            onClick={onToggleBot}
            className={`w-full h-10 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              isBotOn
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>1. {isBotOn ? 'ON (Jawab Otomatis)' : 'OFF (Jawab Otomatis)'}</span>
          </button>

          <button
            type="button"
            onClick={onHidePanel}
            className="w-full h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <EyeOff className="w-4 h-4" />
            <span>2. Hide</span>
          </button>
        </div>
      )}
    </div>
  );
}
