export type AskLevel = 'explain' | 'edit' | 'fix' | 'create';
export type ContextMode = 'selection' | 'section' | 'page';

// Single place to adjust if Groq/OpenRouter's actual catalog slugs differ.
export const GROQ_MODELS = {
  small: 'openai/gpt-oss-20b',
  large: 'openai/gpt-oss-120b',
} as const;

export const OPENROUTER_MODELS = {
  small: 'openai/gpt-oss-20b',
  large: 'openai/gpt-oss-120b',
} as const;

const COMPLEX_LEVELS: ReadonlySet<AskLevel> = new Set(['fix', 'create']);

/**
 * Explain/Edit default to the small model, Fix/Create to the large one; a
 * `page`-sized context always escalates to the large model regardless of
 * level, since reasoning over a whole document needs more capacity than a
 * single selected element does.
 */
export function selectModelSize(level: AskLevel, contextMode: ContextMode): 'small' | 'large' {
  if (contextMode === 'page') return 'large';
  return COMPLEX_LEVELS.has(level) ? 'large' : 'small';
}
