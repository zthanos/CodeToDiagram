import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { ProjectApiService } from './services/ProjectApiService'

// Initialize API service with interceptors
ProjectApiService.initialize()

createApp(App).use(router).mount('#app')
