import type { ChatMessage } from './client';
import type { AskContext } from './context';
import type { AskLevel } from './models';

function formatNumberedSnippet(content: string): string {
  return content
    .split('\n')
    .map((line, index) => `${index + 1}: ${line}`)
    .join('\n');
}

const RESPONSE_FORMAT_INSTRUCTIONS = `Respond with a single JSON object and nothing else — no prose, no markdown fences:
{
  "explanation": "one or two sentences describing what you found or changed",
  "edits": [
    { "file": "<exact file name shown above>", "startLine": <int>, "endLine": <int>, "newText": "<replacement text, no line-number prefixes>" }
  ]
}
Line numbers in "edits" MUST match the numbered lines shown for that exact file above — they are relative to the snippet shown for that file, not the whole project. To insert new text before line N without deleting anything, use startLine: N, endLine: N - 1. Preserve the existing indentation and coding style. If no edit is needed or applicable, return an empty "edits" array.`;

function levelInstructions(level: AskLevel): string {
  switch (level) {
    case 'explain':
      return 'Explain in plain language what the selected HTML/CSS/JS does. Do not propose any edits — return an empty "edits" array.';
    case 'edit':
      return 'The user describes a change they want made to the selected code. Propose the minimal edit(s) that make it happen.';
    case 'fix':
      return 'A runtime error was reported for this page. Diagnose the cause from the context shown and propose the minimal fix.';
    case 'create':
      return 'The user wants a new fragment added (e.g. a section). Add it without rewriting the rest of the document — express it as an insertion edit (endLine = startLine - 1).';
    default:
      return level satisfies never;
  }
}

function buildSnippetsSection(context: AskContext): string {
  const parts = [`File: ${context.entryFile}\n${formatNumberedSnippet(context.html)}`];
  for (const css of context.cssSnippets) {
    parts.push(`File: ${css.file}\n${formatNumberedSnippet(css.content)}`);
  }
  return parts.join('\n\n');
}

/**
 * Builds the {system, user} messages for one of the 4 Ask Edith levels
 * (spec §41-48). `problemMessage` is used for Fix, `userText` for Edit/Create.
 */
export function buildPrompt(
  level: AskLevel,
  context: AskContext,
  userText?: string,
  problemMessage?: string,
): ChatMessage[] {
  const system = `You are Ask Edith, an assistant embedded in a small static-HTML page editor. ${RESPONSE_FORMAT_INSTRUCTIONS}`;

  const sections: string[] = [levelInstructions(level)];
  if (level === 'fix' && problemMessage) {
    sections.push(`Reported error: ${problemMessage}`);
  }
  if ((level === 'edit' || level === 'create') && userText) {
    sections.push(`User request: ${userText}`);
  }
  sections.push(buildSnippetsSection(context));

  return [
    { role: 'system', content: system },
    { role: 'user', content: sections.join('\n\n') },
  ];
}
