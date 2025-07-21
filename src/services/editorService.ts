import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Extension } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
import { getLanguageExtension } from './languageService';
import { getThemeExtension } from './themeService';

interface InitEditorOptions {
  onChange: (value: string) => void;
  onSave: (value: string) => void;
}

export function initEditor(
  container: HTMLElement,
  language: string,
  value: string,
  theme: string,
  options: InitEditorOptions
): EditorView {
  const editor = new EditorView({
    state: EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        getLanguageExtension(language),
        getThemeExtension(theme),
        keymap.of([
          indentWithTab,
          {
            key: 'Ctrl-s',
            mac: 'Cmd-s',
            run: () => {
              options.onSave(editor.state.doc.toString());
              return true;
            },
          },
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            options.onChange(update.state.doc.toString());
          }
        }),
      ],
    }),
    parent: container,
  });

  return editor;
}

export function destroyEditor(editor: EditorView | null): void {
  if (editor) editor.destroy();
}
