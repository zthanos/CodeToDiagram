<template>
  <div class="app-layout">
    <header class="app-header">
      <div class="header-content">
        <div class="header-left">
          <img src="@/assets/logo.svg" alt="Code To Diagram Logo" class="header-logo" />
          <h1 class="header-title">Code To Diagram</h1>
        </div>

      </div>
    </header>
    <main class="app-main">
      <ProjectWorkspace :theme="theme" @update:theme="theme = $event" />
    </main>
  </div>
</template>

<script>
import ProjectWorkspace from './components/ProjectWorkspace.vue'

export default {
  components: {
    ProjectWorkspace
  },
  data() {
    return {
      theme: 'default',
    }
  },

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