import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import { ProjectApiService } from './services/ProjectApiService'

// Initialize API service with interceptors
ProjectApiService.initialize()

createApp(App).mount('#app')
