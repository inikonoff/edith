import { getGroqKey, getOpenRouterKey, setGroqKey, setOpenRouterKey, type AskLevel, type ContextMode } from '@edith/ai';
import { useState } from 'react';
import { useAskEdithStore } from '../store/askEdithStore';
import { DiffView } from './DiffView';
import styles from './AskEdithPanel.module.css';

const LEVELS: { value: AskLevel; label: string }[] = [
  { value: 'explain', label: 'Explain' },
  { value: 'edit', label: 'Edit' },
  { value: 'fix', label: 'Fix' },
  { value: 'create', label: 'Create' },
];

const CONTEXT_MODES: { value: ContextMode; label: string }[] = [
  { value: 'selection', label: 'Selection' },
  { value: 'section', label: 'Section' },
  { value: 'page', label: 'Page' },
];

// Spec §41-48: AI never changes the project silently — every level ends in a
// diff the user must explicitly Approve, and only the minimal necessary
// context goes out unless Page is picked deliberately.
export function AskEdithPanel() {
  const open = useAskEdithStore((state) => state.open);
  const level = useAskEdithStore((state) => state.level);
  const contextMode = useAskEdithStore((state) => state.contextMode);
  const requestText = useAskEdithStore((state) => state.requestText);
  const problemMessage = useAskEdithStore((state) => state.problemMessage);
  const status = useAskEdithStore((state) => state.status);
  const explanation = useAskEdithStore((state) => state.explanation);
  const edits = useAskEdithStore((state) => state.edits);
  const error = useAskEdithStore((state) => state.error);
  const closePanel = useAskEdithStore((state) => state.closePanel);
  const setLevel = useAskEdithStore((state) => state.setLevel);
  const setContextMode = useAskEdithStore((state) => state.setContextMode);
  const setRequestText = useAskEdithStore((state) => state.setRequestText);
  const submit = useAskEdithStore((state) => state.submit);
  const approve = useAskEdithStore((state) => state.approve);
  const reject = useAskEdithStore((state) => state.reject);

  const [showKeys, setShowKeys] = useState(false);
  const [groqKeyInput, setGroqKeyInput] = useState(() => getGroqKey() ?? '');
  const [openRouterKeyInput, setOpenRouterKeyInput] = useState(() => getOpenRouterKey() ?? '');

  if (!open) return null;

  const busy = status === 'loading' || status === 'applying';
  const reviewing = status === 'reviewing';

  async function handleSubmit() {
    if (groqKeyInput.trim()) setGroqKey(groqKeyInput.trim());
    if (openRouterKeyInput.trim()) setOpenRouterKey(openRouterKeyInput.trim());
    await submit();
  }

  return (
    <div className={styles.backdrop} onClick={closePanel}>
      <div className={styles.panel} onClick={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          <h2>Ask Edith</h2>
          <button type="button" className={styles.closeButton} onClick={closePanel} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.contextRow}>
          {CONTEXT_MODES.map((mode) => (
            <button
              type="button"
              key={mode.value}
              className={contextMode === mode.value ? styles.contextActive : styles.context}
              onClick={() => setContextMode(mode.value)}
              disabled={busy || reviewing}
            >
              {contextMode === mode.value ? '●' : '○'} {mode.label}
            </button>
          ))}
        </div>

        <div className={styles.levelTabs}>
          {LEVELS.map((entry) => (
            <button
              type="button"
              key={entry.value}
              className={level === entry.value ? styles.tabActive : styles.tab}
              onClick={() => setLevel(entry.value)}
              disabled={busy || reviewing}
            >
              {entry.label}
            </button>
          ))}
        </div>

        {level === 'fix' && (
          <p className={styles.hint}>
            {problemMessage ? `Reported error: ${problemMessage}` : 'No error selected — open this from a problem in the Preview.'}
          </p>
        )}

        {(level === 'edit' || level === 'create') && (
          <label className={styles.field}>
            {level === 'create' ? 'What should be added?' : 'What should change?'}
            <textarea
              rows={3}
              value={requestText}
              onChange={(event) => setRequestText(event.target.value)}
              disabled={busy || reviewing}
            />
          </label>
        )}

        <button type="button" className={styles.keysToggle} onClick={() => setShowKeys((value) => !value)}>
          {showKeys ? '▾' : '▸'} API keys
        </button>
        {showKeys && (
          <div className={styles.keysForm}>
            <label className={styles.field}>
              Groq API key
              <input
                type="password"
                value={groqKeyInput}
                onChange={(event) => setGroqKeyInput(event.target.value)}
              />
            </label>
            <label className={styles.field}>
              OpenRouter API key (fallback)
              <input
                type="password"
                value={openRouterKeyInput}
                onChange={(event) => setOpenRouterKeyInput(event.target.value)}
              />
            </label>
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        {!reviewing && (
          <div className={styles.actions}>
            <button type="button" onClick={handleSubmit} disabled={busy}>
              {status === 'loading' ? 'Thinking…' : 'Ask'}
            </button>
          </div>
        )}

        {reviewing && (
          <>
            {explanation && <p className={styles.explanation}>{explanation}</p>}
            <DiffView edits={edits} />
            <div className={styles.actions}>
              {edits.length > 0 && (
                <button type="button" onClick={approve}>
                  Approve
                </button>
              )}
              <button type="button" onClick={edits.length > 0 ? reject : closePanel}>
                {edits.length > 0 ? 'Reject' : 'Close'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
