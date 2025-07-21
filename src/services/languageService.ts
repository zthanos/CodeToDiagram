import { Extension } from '@codemirror/state';
import { mermaid as mermaidLang } from 'codemirror-lang-mermaid';
import { markdown } from '@codemirror/lang-markdown';

export function getLanguageExtension(language: string): Extension {
  if (language === 'mermaid') return mermaidLang();
  if (language === 'markdown') return markdown();
  return [];
}
