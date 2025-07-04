<template>
  <div class="app-layout">
    <header class="app-header">
      <div class="header-content">
        <div class="header-left">
          <img src="@/assets/logo.svg" alt="Code To Diagram Logo" class="header-logo" />
          <h1 class="header-title">Code To Diagram</h1>
        </div>
        <nav class="header-nav">
          <select v-model="theme" class="theme-select" title="Mermaid Theme">
            <option value="default">Default</option>
            <option value="dark">Dark</option>
            <option value="forest">Forest</option>
            <option value="neutral">Neutral</option>
          </select>
          <button @click="saveDiagram" class="control-button">Αποθήκευση</button>
          <button @click="triggerFileDialog" class="control-button">Φόρτωση</button>
          <button @click="exportImage" class="control-button">Εξαγωγή PNG</button>
          <input ref="fileInput" type="file" accept=".txt" style="display:none" @change="onFileChange" />
        </nav>
      </div>
    </header>
    <main class="app-main">
      <MermaidRenderer ref="mermaidRenderer" :theme="theme" />
    </main>
  </div>
</template>

<script>
import MermaidRenderer from './components/MermaidRenderer.vue'

export default {
  components: {
    MermaidRenderer
  },
  data() {
    return {
      theme: 'default',
    }
  },
  methods: {
    saveDiagram() {
      const content = this.$refs.mermaidRenderer.getEditorContent();
      let filename = prompt('Δώστε όνομα αρχείου για αποθήκευση:', 'diagram.txt');
      if (!filename) return;
      if (!filename.endsWith('.txt')) filename += '.txt';
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    triggerFileDialog() {
      this.$refs.fileInput.click();
    },
    onFileChange(event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        this.$refs.mermaidRenderer.setEditorContent(text);
      };
      reader.readAsText(file);
      event.target.value = '';
    },
    exportImage() {
      let filename = prompt('Δώστε όνομα αρχείου για αποθήκευση PNG:', 'diagram.png');
      if (!filename) return;
      if (!filename.endsWith('.png')) filename += '.png';
      this.$refs.mermaidRenderer.exportImage(filename);
    }
  }
}
</script>

<style>
html, body, #app, .app-layout, .app-main {
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
}
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
}
.app-header {
  position: relative;
  width: 100%;
  background-color: #f4f4f4; /* light grey */
  color: #222;
  padding: 0;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);
}
.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.header-logo {
  width: 40px;
  height: 40px;
  margin-right: 0.75rem;
}
.header-title {
  margin: 0;
  font-size: 2rem;
  color: #222;
  white-space: nowrap;
}
.header-nav {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.theme-select {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: 1px solid #ccc;
  background-color: white;
  cursor: pointer;
  margin-right: 0.5rem;
}
.control-button {
  background: none;
  border: none;
  color: #222;
  font-size: 1rem;
  padding: 0.5rem 1.25rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  font-weight: 500;
  position: relative;
}
.control-button:hover, .control-button:focus {
  background: #e0e0e0;
  color: #111;
}
.control-button:active {
  background: #d1d1d1;
  color: #000;
}
.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  margin: 0;
  padding: 0;
}

li{
  list-style: none;
}

a{
  color: white;
  text-decoration: none;
}

.container{
  width: 1280px;
  margin: auto;
}
@media(max-width:1280px) {
  
}
h1 {
  color: #2c3e50;
  text-align: center;
  margin-bottom: 2rem;
}
</style>