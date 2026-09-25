import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useEditorStore } from '../store/editorStore';
import styles from './UpdatePrompt.module.css';

// Как часто спрашивать сервер о новой сборке, пока вкладка открыта.
const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Плашка «Доступна новая версия Edith».
 *
 * Раньше service worker работал в режиме autoUpdate: новая сборка скачивалась
 * в фоне, но вкладка продолжала показывать старую из precache, и после деплоя
 * казалось, что «ничего не поменялось». Теперь новая версия ждёт, пока
 * пользователь нажмёт «Обновить» — без внезапной перезагрузки посреди правки.
 */
export function UpdatePrompt() {
  const dirty = useEditorStore((state) => state.dirty);
  const [checking, setChecking] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      const check = () => {
        // Не дёргаем сеть офлайн — Edith должна спокойно работать без неё.
        if (navigator.onLine) registration.update().catch(() => {});
      };
      window.setInterval(check, UPDATE_CHECK_INTERVAL_MS);
      // Вкладка вернулась из фона — хороший момент проверить обновление.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    },
  });

  useEffect(() => {
    if (!needRefresh) setChecking(false);
  }, [needRefresh]);

  if (!needRefresh) return null;

  async function handleReload() {
    setChecking(true);
    // Перезагрузка страницы после активации нового SW. Если есть
    // несохранённые правки, сработает обычный beforeunload-диалог.
    await updateServiceWorker(true);
  }

  return (
    <div className={styles.toast} role="status" aria-live="polite">
      <div className={styles.text}>
        <strong>Доступна новая версия Edith</strong>
        <span className={styles.hint}>
          {dirty
            ? 'Сначала сохраните изменения — перезагрузка сбросит несохранённое.'
            : 'Перезагрузите страницу, чтобы применить обновление.'}
        </span>
      </div>
      <div className={styles.actions}>
        <button type="button" className="edith-btn" onClick={() => setNeedRefresh(false)}>
          Позже
        </button>
        <button
          type="button"
          className="edith-btn-primary"
          onClick={handleReload}
          disabled={checking}
        >
          {checking ? 'Обновление…' : 'Обновить'}
        </button>
      </div>
    </div>
  );
}
