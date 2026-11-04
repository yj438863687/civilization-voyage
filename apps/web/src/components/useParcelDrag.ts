import { useRef, type PointerEvent } from 'react';

// Pointer capture gives mouse, touch and pen the same drop targets.
// A tap keeps the existing click action, including keyboard activation.
export function useParcelDrag(onDrop: (value: number, target: Element | null) => void, onHover?: (target: Element | null) => void) {
  const drag = useRef<{ value: number; x: number; y: number; moved: boolean } | null>(null);
  const suppress = useRef(false);
  return {
    consumeClick: () => { const result = suppress.current; suppress.current = false; return result; },
    bind: (value: number) => ({
      style: { touchAction: 'none' } as const,
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        suppress.current = false;
        if (event.button !== 0) return;
        drag.current = { value, x: event.clientX, y: event.clientY, moved: false };
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        if (!drag.current) return;
        if (Math.hypot(event.clientX - drag.current.x, event.clientY - drag.current.y) > 8) drag.current.moved = true;
        if (drag.current.moved) onHover?.(document.elementFromPoint(event.clientX, event.clientY));
      },
      onPointerUp: (event: PointerEvent<HTMLElement>) => {
        if (!drag.current) return;
        if (drag.current.moved) {
          suppress.current = true; event.preventDefault();
          onDrop(drag.current.value, document.elementFromPoint(event.clientX, event.clientY));
        }
        drag.current = null; onHover?.(null);
      },
      onPointerCancel: () => { drag.current = null; onHover?.(null); },
    }),
  };
}
