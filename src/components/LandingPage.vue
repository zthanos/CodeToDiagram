<template>
  <div class="landing-page">
    <div class="landing-container">
      <!-- Error Alert -->
      <div v-if="routeError" class="error-alert">
        <div class="error-content">
          <h3>{{ getErrorTitle(routeError.error) }}</h3>
          <p>{{ routeError.message }}</p>
          <button @click="dismissError" class="dismiss-btn">Dismiss</button>
          <button v-if="routeError.projectId" @click="retryProject(routeError.projectId)" class="retry-btn">
            Try Again
          </button>
          <button v-if="routeError.error === 'project-list-load-failed'" @click="retryLoadProjects" class="retry-btn">
            Retry Loading
          </button>
        </div>
      </div>

      <div class="landing-header">
        <h1>Welcome to SO Assistant</h1>
        <p>Manage your projects with requirements, diagrams, teams, tasks, and notes all in one place.</p>
      </div>

      <!-- Project Creation Section -->
      <div class="create-project-section">
        <h2>Create New Project</h2>
        <form @submit.prevent="createProject" class="create-project-form">
          <div class="form-group">
            <label for="project-name">Project Name *</label>
            <input
              id="project-name"
              v-model="newProject.name"
              type="text"
              placeholder="Enter project name"
              :class="{ 'error': errors.name }"
              @input="clearError('name')"
              required
            />
            <span v-if="errors.name" class="error-message">{{ errors.name }}</span>
          </div>
          
          <div class="form-group">
            <label for="project-description">Description</label>
            <textarea
              id="project-description"
              v-model="newProject.description"
              placeholder="Enter project description (optional)"
              rows="3"
            ></textarea>
          </div>
          
          <button 
            type="submit" 
            class="create-btn"
            :disabled="isCreating || !newProject.name.trim()"
          >
            {{ isCreating ? 'Creating...' : 'Create Project' }}
          </button>
        </form>
      </div>

      <!-- Existing Projects Section -->
      <div class="projects-section">
        <h2>Your Projects</h2>
        
        <div v-if="isLoading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading projects...</p>
        </div>
        
        <div v-else-if="availableProjects.length === 0" class="empty-state">
          <p>No projects found. Create your first project above to get started!</p>
        </div>
        
        <div v-else class="projects-grid">
          <div
            v-for="project in availableProjects"
            :key="project.id"
            class="project-card"
            @click="selectProject(project.id)"
          >
            <div class="project-header">
              <h3 class="project-title">{{ project.name }}</h3>
              <span class="project-date">{{ formatDate(project.lastModified) }}</span>
            </div>
            <p class="project-description">
              {{ project.description || 'No description provided' }}
            </p>
            <div class="project-stats">
              <span class="stat">{{ project.diagrams?.length || 0 }} diagrams</span>
              <span class="stat">{{ project.requirements?.length || 0 }} requirements</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ProjectManager } from '@/services/ProjectManager'
import { navigateToProject } from '@/router'

export default {
  name: 'LandingPage',
  data() {
    return {
      availableProjects: [],
      isLoading: false,
      isCreating: false,
      newProject: {
        name: '',
        description: ''
      },
      errors: {},
      routeError: null
    }
  },
  
  computed: {
    hasRouteError() {
      return this.routeError !== null
    }
  },
  
  async mounted() {
    await this.loadProjects()
    this.checkForRouteErrors()
  },
  
  watch: {
    '$route'() {
      this.checkForRouteErrors()
    }
  },
  
  methods: {
    async loadProjects() {
      this.isLoading = true
      try {
        const projectManager = ProjectManager.getInstance()
        await projectManager.loadProjectList()
        this.availableProjects = projectManager.getProjectList()
      } catch (error) {
        console.error('Failed to load projects:', error)
        this.routeError = {
          error: 'project-list-load-failed',
          message: 'Failed to load projects. Please check your connection and try again.',
          projectId: null
        }
      } finally {
        this.isLoading = false
      }
    },
    
    async createProject() {
      // Clear previous errors
      this.errors = {}
      
      // Validate form
      if (!this.validateForm()) {
        return
      }
      
      this.isCreating = true
      
      try {
        const projectManager = ProjectManager.getInstance()
        const projectId = this.generateProjectId()
        
        const newProject = await projectManager.createProject(
          projectId,
          this.newProject.name.trim(),
          this.newProject.description.trim() || undefined
        )
        
        // Reset form
        this.newProject = {
          name: '',
          description: ''
        }
        
        // Navigate to the new project workspace using helper function
        await navigateToProject(newProject.id)
        
      } catch (error) {
        console.error('Failed to create project:', error)
        
        // Handle specific error cases
        if (error.message.includes('already exists')) {
          this.errors.name = 'A project with this name already exists'
        } else {
          this.errors.general = 'Failed to create project. Please try again.'
        }
      } finally {
        this.isCreating = false
      }
    },
    
    validateForm() {
      const errors = {}
      
      // Validate project name
      if (!this.newProject.name.trim()) {
        errors.name = 'Project name is required'
      } else if (this.newProject.name.trim().length < 2) {
        errors.name = 'Project name must be at least 2 characters long'
      } else if (this.newProject.name.trim().length > 100) {
        errors.name = 'Project name must be less than 100 characters'
      }
      
      // Check for duplicate names
      if (this.newProject.name.trim() && 
          this.availableProjects.some(p => p.name.toLowerCase() === this.newProject.name.trim().toLowerCase())) {
        errors.name = 'A project with this name already exists'
      }
      
      this.errors = errors
      return Object.keys(errors).length === 0
    },
    
    clearError(field) {
      if (this.errors[field]) {
        delete this.errors[field]
      }
    },
    
    async selectProject(projectId) {
      try {
        // Navigate to project workspace using helper function
        await navigateToProject(projectId)
      } catch (error) {
        console.error('Failed to select project:', error)
      }
    },
    
    generateProjectId() {
      return `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    },
    
    formatDate(date) {
      if (!date) return 'Unknown'
      
      const dateObj = date instanceof Date ? date : new Date(date)
      const now = new Date()
      const diffTime = Math.abs(now - dateObj)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays === 1) {
        return 'Yesterday'
      } else if (diffDays < 7) {
        return `${diffDays} days ago`
      } else {
        return dateObj.toLocaleDateString()
      }
    },
    
    // Error handling methods
    checkForRouteErrors() {
      const query = this.$route.query
      if (query.error && query.message) {
        this.routeError = {
          error: query.error,
          message: query.message,
          projectId: query.projectId || null
        }
        
        // Clear error from URL without triggering navigation
        this.$router.replace({ 
          name: 'Home',
          query: {}
        })
      }
    },
    
    getErrorTitle(errorType) {
      const errorTitles = {
        'invalid-project-id': 'Invalid Project ID',
        'project-not-found': 'Project Not Found',
        'network-error': 'Network Error',
        'project-load-failed': 'Failed to Load Project',
        'route-error': 'Navigation Error',
        'page-not-found': 'Page Not Found',
        'navigation-error': 'Navigation Error',
        'invalid-navigation': 'Invalid Navigation'
      }
      
      return errorTitles[errorType] || 'Error'
    },
    
    dismissError() {
      this.routeError = null
    },
    
    async retryProject(projectId) {
      this.dismissError()
      try {
        await navigateToProject(projectId)
      } catch (error) {
        console.error('Failed to retry project navigation:', error)
        this.routeError = {
          error: 'retry-failed',
          message: 'Failed to load project. Please try again later.',
          projectId: null
        }
      }
    },
    
    async retryLoadProjects() {
      this.dismissError()
      await this.loadProjects()
    }
  }
}
</script>

<style scoped>
.landing-page {
  min-height: 100vh;
  background-color: #f8f9fa;
  padding: 2rem 0;
}

.landing-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

.error-alert {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 2rem;
  color: #721c24;
}

.error-content h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.error-content p {
  margin: 0 0 1rem 0;
  line-height: 1.4;
}

.dismiss-btn,
.retry-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  margin-right: 0.5rem;
  transition: background-color 0.2s;
}

.dismiss-btn:hover,
.retry-btn:hover {
  background-color: #c82333;
}

.retry-btn {
  background-color: #007bff;
}

.retry-btn:hover {
  background-color: #0056b3;
}

.landing-header {
  text-align: center;
  margin-bottom: 3rem;
}

.landing-header h1 {
  font-size: 2.5rem;
  color: #2c3e50;
  margin-bottom: 1rem;
}

.landing-header p {
  font-size: 1.2rem;
  color: #6c757d;
  max-width: 600px;
  margin: 0 auto;
}

.create-project-section {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 3rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.create-project-section h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: #2c3e50;
}

.create-project-form {
  max-width: 600px;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #2c3e50;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e9ecef;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #007bff;
}

.form-group input.error {
  border-color: #dc3545;
}

.error-message {
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.25rem;
  display: block;
}

.create-btn {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.create-btn:hover:not(:disabled) {
  background-color: #0056b3;
}

.create-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.projects-section {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.projects-section h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: #2c3e50;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 3rem;
  color: #6c757d;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f4f6;
  border-top: 3px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.project-card {
  border: 2px solid #e9ecef;
  border-radius: 8px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.project-card:hover {
  border-color: #007bff;
  box-shadow: 0 4px 8px rgba(0, 123, 255, 0.1);
  transform: translateY(-2px);
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.project-title {
  margin: 0;
  color: #2c3e50;
  font-size: 1.25rem;
  font-weight: 600;
}

.project-date {
  font-size: 0.875rem;
  color: #6c757d;
  white-space: nowrap;
}

.project-description {
  color: #6c757d;
  margin-bottom: 1rem;
  line-height: 1.5;
}

.project-stats {
  display: flex;
  gap: 1rem;
}

.stat {
  font-size: 0.875rem;
  color: #007bff;
  font-weight: 500;
}

@media (max-width: 768px) {
  .landing-container {
    padding: 0 1rem;
  }
  
  .landing-header h1 {
    font-size: 2rem;
  }
  
  .projects-grid {
    grid-template-columns: 1fr;
  }
  
  .project-header {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>