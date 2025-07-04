<template>
  <div class="mermaid-editor">
    <div class="split-pane" :style="{height: '100%'}">
      <div class="pane editor-pane" :style="{width: leftWidth + '%'}">
        <div ref="editor" class="mermaid-codemirror"></div>
      </div>
      <div class="split-bar" @mousedown="startDrag"></div>
      <div class="pane diagram-pane" :style="{width: (100 - leftWidth) + '%'}">
        <div class="diagram-container" :class="themeClass">
          <div class="mermaid" ref="diagramContainer"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch, onMounted, defineComponent } from 'vue';
import mermaid from 'mermaid';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';

export default defineComponent({
  name: 'MermaidEditor',
  props: {
    theme: {
      type: String,
      default: 'default'
    }
  },
  data() {
    return {
      mermaidText: '',
      debounceTimer: null,
      leftWidth: 30, // percent
      dragging: false,
      dragStartX: 0,
      dragStartWidth: 30,
      editorView: null
    }
  },
  computed: {
    themeClass() {
      return `mermaid-theme-${this.theme || 'default'}`;
    }
  },
  watch: {
    theme: {
      immediate: true,
      handler(newTheme) {
        this.$nextTick(() => {
          if (window.mermaid) {
            window.mermaid.initialize({
              startOnLoad: false,
              theme: newTheme || 'default',
              securityLevel: 'loose'
            });
            this.renderDiagram();
          }
        });
      }
    }
  },
  mounted() {
    mermaid.initialize({
      startOnLoad: false,
      theme: this.theme || 'default',
      securityLevel: 'loose'
    });
    this.initCodeMirror();
    window.addEventListener('mousemove', this.onDrag);
    window.addEventListener('mouseup', this.stopDrag);
  },
  beforeUnmount() {
    window.removeEventListener('mousemove', this.onDrag);
    window.removeEventListener('mouseup', this.stopDrag);
    if (this.editorView) {
      this.editorView.destroy();
    }
  },
  methods: {
    initCodeMirror() {
      const self = this;
      this.editorView = new EditorView({
        state: EditorState.create({
          doc: this.mermaidText,
          extensions: [
            basicSetup,
            markdown(),
            oneDark,
            EditorView.updateListener.of(update => {
              if (update.docChanged) {
                self.mermaidText = update.state.doc.toString();
                self.renderWithDebounce();
              }
            })
          ]
        }),
        parent: this.$refs.editor
      });
    },
    loadDefault() {
      this.mermaidText = this.getDefaultText();
      if (this.editorView) {
        this.editorView.dispatch({
          changes: { from: 0, to: this.editorView.state.doc.length, insert: this.mermaidText }
        });
      }
      this.renderDiagram();
    },
    getDefaultText() {
      const defaults = {
        'sequenceDiagram': `sequenceDiagram\n    participant Client\n    participant Server\n    \n    Client->>Server: GET /data\n    Server-->>Client: 200 OK\n    Client->>Server: POST /update\n    Server-->>Client: 403 Forbidden`,
        'graph TD': `graph TD\n    Α[Καλωσήρθατε] --> Β{Είστε νέος;}\n    Β -->|Ναι| Γ[Εγγραφή]\n    Β -->|Όχι| Δ[Σύνδεση]\n    Γ --> Ε[Προφίλ]\n    Δ --> Ε`,
        'pie': `pie title Πλατφόρμες\n    "Android" : 45\n    "iOS" : 30\n    "Windows" : 15\n    "Άλλο" : 10`,
        'gantt': `gantt\n    title Πρόγραμμα Έργου\n    dateFormat  YYYY-MM-DD\n    section Ανάπτυξη\n    Σχεδίαση :done, des1, 2023-01-01, 14d\n    Κώδικας :active, des2, 2023-01-15, 21d\n    Τεστ : des3, after des2, 7d`
      };
      return defaults['graph TD']; // Default to flowchart if diagramType is removed
    },
    async renderDiagram() {
      try {
        mermaid.parse(this.mermaidText);
        const { svg } = await mermaid.render('mermaid-svg', this.mermaidText);
        this.$refs.diagramContainer.innerHTML = svg;
      } catch (error) {
        console.error('Mermaid error:', error);
        this.$refs.diagramContainer.innerHTML = 
          `<div class=\"error\">Λάθος σύνταξης: ${error.message}</div>`;
      }
    },
    renderWithDebounce() {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.renderDiagram();
      }, 500);
    },
    saveDiagram() {
      localStorage.setItem('lastMermaidDiagram', JSON.stringify({
        code: this.mermaidText
      }));
      alert('Αποθηκεύτηκε!');
    },
    setEditorContent(text) {
      this.mermaidText = text;
      if (this.editorView) {
        this.editorView.dispatch({
          changes: { from: 0, to: this.editorView.state.doc.length, insert: text }
        });
      }
      this.renderDiagram();
    },
    loadDiagram() {
      const saved = localStorage.getItem('lastMermaidDiagram');
      if (saved) {
        try {
          const { code } = JSON.parse(saved);
          this.mermaidText = code;
          if (this.editorView) {
            this.editorView.dispatch({
              changes: { from: 0, to: this.editorView.state.doc.length, insert: code }
            });
          }
          this.renderDiagram();
        } catch (e) {
          alert('Σφάλμα φόρτωσης: ' + e.message);
        }
      }
    },
    async exportImage(filename = 'diagram.png') {
      try {
        const svg = this.$refs.diagramContainer.querySelector('svg');
        if (!svg) {
          alert('Δεν βρέθηκε διαγραμμα για εξαγωγή');
          return;
        }
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          // Get computed background color of diagram-container
          const bg = window.getComputedStyle(this.$refs.diagramContainer).backgroundColor || '#ffffff';
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          const png = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = filename;
          link.href = png;
          link.click();
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
      } catch (error) {
        alert('Σφάλμα εξαγωγής: ' + error.message);
      }
    },
    startDrag(e) {
      this.dragging = true;
      this.dragStartX = e.clientX;
      this.dragStartWidth = this.leftWidth;
      document.body.style.cursor = 'col-resize';
    },
    onDrag(e) {
      if (!this.dragging) return;
      const delta = e.clientX - this.dragStartX;
      const container = this.$el.querySelector('.split-pane');
      const totalWidth = container.offsetWidth;
      let newLeftWidth = this.dragStartWidth + (delta / totalWidth) * 100;
      newLeftWidth = Math.max(10, Math.min(90, newLeftWidth));
      this.leftWidth = newLeftWidth;
    },
    stopDrag() {
      if (this.dragging) {
        this.dragging = false;
        document.body.style.cursor = '';
      }
    },
    getEditorContent() {
      return this.mermaidText;
    }
  }
});
</script>

<style scoped>
.mermaid-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-color: #f9f9f9;
  margin: 0;
  padding: 0;
}
.split-pane {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100%;
  min-height: 0;
  min-width: 0;
  position: relative;
  background: #eaeaea;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
.pane {
  height: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.editor-pane {
  background: #f5f5ff;
  border-right: 1px solid #ccc;
  min-width: 120px;
  max-width: 90%;
  transition: width 0.1s;
  height: 100%;
  overflow: auto;
  display: flex;
  flex-direction: column;
}
.diagram-pane {
  background: #fff;
  min-width: 120px;
  max-width: 90%;
  transition: width 0.1s;
  height: 100%;
  overflow: auto;
  display: flex;
  flex-direction: column;
}
.split-bar {
  width: 6px;
  background: #bbb;
  cursor: col-resize;
  z-index: 2;
  transition: background 0.2s;
}
.split-bar:hover, .split-bar:active {
  background: #888;
}
.mermaid-codemirror {
  height: 100%;
  width: 100%;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #1e1e1e;
}
.diagram-container {
  flex: 1;
  border: 1px solid #eee;
  padding: 1rem;
  border-radius: 4px;
  overflow: auto;
  background-color: thistle;
  height: 100%;
  box-sizing: border-box;
}
.error {
  color: #ff4444;
  padding: 1rem;
  background-color: #ffeeee;
  border-radius: 4px;
}
@media (max-width: 768px) {
  .split-pane {
    flex-direction: column;
  }
  .editor-pane, .diagram-pane {
    width: 100% !important;
    min-width: 0;
    max-width: 100%;
    height: 40vh;
  }
  .split-bar {
    width: 100%;
    height: 6px;
    cursor: row-resize;
  }
}

/***** Mermaid Theme Styles *****/
.mermaid-theme-default {
  background-color: thistle;
  color: #222;
}
.mermaid-theme-dark {
  background-color: #1e1e1e;
  color: #eee;
}
.mermaid-theme-forest {
  background-color: #e4f1e1;
  color: #234d20;
}
.mermaid-theme-neutral {
  background-color: #f4f4f4;
  color: #222;
}
</style>