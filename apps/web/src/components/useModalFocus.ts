import { useEffect, type RefObject } from 'react';

/** Keep keyboard navigation inside an open story, and return to its entry control. */
export function useModalFocus(panel: RefObject<HTMLElement>) {
  useEffect(() => {
    const element = panel.current;
    if (!element) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const controls = () => [...element.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], summary, input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]')].filter(node => node.getClientRects().length > 0);
    const contain = (event: FocusEvent) => { if (event.target instanceof Node && !element.contains(event.target)) element.focus(); };
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const nodes = controls(), first = nodes[0], last = nodes[nodes.length - 1];
      if (!first) { event.preventDefault(); element.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === element)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === element)) { event.preventDefault(); first.focus(); }
    };
    element.focus();
    document.addEventListener('keydown', trap, true);
    document.addEventListener('focusin', contain);
    return () => {
      document.removeEventListener('keydown', trap, true);
      document.removeEventListener('focusin', contain);
      if (previous?.isConnected) previous.focus();
    };
  }, [panel]);
}
