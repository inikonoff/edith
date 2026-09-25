import { type RefObject, useEffect } from 'react';

/**
 * Закрывает всплывашку (меню экспорта, список проблем) по клику вне её
 * и по Esc. Раньше они закрывались только повторным кликом по кнопке.
 */
export function useDismiss(ref: RefObject<HTMLElement>, open: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    // Клик внутри iframe превью не доходит до document — ловим уход фокуса.
    function onBlur() {
      onClose();
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [ref, open, onClose]);
}
