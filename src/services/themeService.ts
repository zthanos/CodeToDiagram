import { Extension } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';

export function getThemeExtension(theme: string): Extension {
  return theme === 'dark' ? oneDark : [];
}
