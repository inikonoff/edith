export interface AiEdit {
  file: string;
  /** 1-based, inclusive. `endLine === startLine - 1` encodes a pure insertion before startLine. */
  startLine: number;
  endLine: number;
  newText: string;
}

export interface AiResult {
  explanation: string;
  edits: AiEdit[];
}

export class AiResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiResponseError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Strict validation of the model's JSON response — spec §41-48: "AI никогда
 * не меняет проект молча", so a malformed response must fail loudly here
 * rather than being guessed at or silently dropped downstream.
 */
export function parseAiResponse(raw: string): AiResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AiResponseError('Model response was not valid JSON');
  }
  if (!isRecord(parsed)) {
    throw new AiResponseError('Model response was not a JSON object');
  }

  const { explanation, edits } = parsed;
  if (typeof explanation !== 'string') {
    throw new AiResponseError('Model response is missing a string "explanation"');
  }
  if (edits === undefined) {
    return { explanation, edits: [] };
  }
  if (!Array.isArray(edits)) {
    throw new AiResponseError('Model response "edits" must be an array');
  }

  const validated: AiEdit[] = edits.map((edit, index) => {
    if (!isRecord(edit)) throw new AiResponseError(`edits[${index}] is not an object`);
    const { file, startLine, endLine, newText } = edit;
    if (typeof file !== 'string' || !file) {
      throw new AiResponseError(`edits[${index}].file must be a non-empty string`);
    }
    if (typeof startLine !== 'number' || !Number.isInteger(startLine) || startLine < 1) {
      throw new AiResponseError(`edits[${index}].startLine must be a positive integer`);
    }
    if (typeof endLine !== 'number' || !Number.isInteger(endLine)) {
      throw new AiResponseError(`edits[${index}].endLine must be an integer`);
    }
    if (endLine < startLine - 1) {
      throw new AiResponseError(`edits[${index}] has endLine before startLine - 1`);
    }
    if (typeof newText !== 'string') {
      throw new AiResponseError(`edits[${index}].newText must be a string`);
    }
    return { file, startLine, endLine, newText };
  });

  return { explanation, edits: validated };
}

export function groupEditsByFile(edits: AiEdit[]): Map<string, AiEdit[]> {
  const byFile = new Map<string, AiEdit[]>();
  for (const edit of edits) {
    const existing = byFile.get(edit.file);
    if (existing) existing.push(edit);
    else byFile.set(edit.file, [edit]);
  }
  return byFile;
}

/**
 * Applies range-replacement edits to one file's content. Edits are expected
 * to already be scoped to this file (see groupEditsByFile) and are applied
 * bottom-up (highest startLine first) so an earlier edit's line numbers
 * never get shifted by a later one. Overlapping edits aren't merged or
 * detected — the diff review step is what catches a nonsensical patch
 * before it's applied.
 */
export function applyEdits(content: string, edits: AiEdit[]): string {
  const lines = content.split('\n');
  const sorted = [...edits].sort((a, b) => b.startLine - a.startLine);
  for (const edit of sorted) {
    const newLines = edit.newText.length === 0 ? [] : edit.newText.split('\n');
    const spliceStart = edit.startLine - 1;
    const deleteCount = Math.max(0, edit.endLine - edit.startLine + 1);
    lines.splice(spliceStart, deleteCount, ...newLines);
  }
  return lines.join('\n');
}
