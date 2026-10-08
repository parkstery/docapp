import { useEffect } from 'react';

const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta']);

/**
 * 편집 범위(data-edit-scope) 안에서 Tab을 누르면 저장 버튼(data-edit-save)으로 포커스를 옮긴다.
 * 저장 버튼에 도착한 뒤의 Tab은 기본 순서를 따른다. 글자를 치거나 마우스로 칸을 고르면 다시 첫 Tab이 저장으로 간다.
 */
export function EditTabToSave() {
  useEffect(() => {
    let passThrough = false;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) {
        if (event.key !== 'Tab' && !MODIFIER_KEYS.has(event.key)) passThrough = false;
        return;
      }

      const origin = event.target instanceof Element
        ? event.target
        : event.target instanceof Node
          ? event.target.parentElement
          : null;
      if (!origin) return;

      const scope = origin.closest('[data-edit-scope]');
      if (!scope) return;

      const save = scope.querySelector<HTMLButtonElement>('button[data-edit-save]');
      if (!save || save.disabled) return;

      const active = document.activeElement;
      if (active === save || (active instanceof Node && save.contains(active))) {
        passThrough = true;
        return;
      }

      if (passThrough) return;

      event.preventDefault();
      event.stopPropagation();
      save.focus();
      passThrough = true;
    };

    const onPointerDown = () => {
      passThrough = false;
    };

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, []);

  return null;
}
