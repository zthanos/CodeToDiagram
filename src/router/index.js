import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from '@/components/LandingPage.vue'
import ProjectWorkspace from '@/components/ProjectWorkspace.vue'
import { ProjectManager } from '@/services/ProjectManager'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: LandingPage,
    meta: {
      title: 'SO Assistant - Project Management'
    }
  },
  {
    path: '/project/:id',
    name: 'ProjectWorkspace',
    component: ProjectWorkspace,
    props: true,
    meta: {
      title: 'SO Assistant - Project Workspace',
      requiresProject: true
    },
    beforeEnter: async (to, from, next) => {
      try {
        const projectId = to.params.id
        
        // Validate project ID format
        if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
          console.error('Invalid project ID:', projectId)
          next({
            name: 'Home',
            query: { error: 'invalid-project-id', message: 'Invalid project ID provided' }
          })
          return
        }

        // Attempt to load the project to validate it exists
        const projectManager = ProjectManager.getInstance()
        
        try {
          await projectManager.loadProject(projectId)
          // Project loaded successfully, proceed to route
          next()
        } catch (projectError) {
          console.error('Failed to load project:', projectError)
          
          // Determine error type and redirect accordingly
          const errorMessage = projectError instanceof Error ? projectError.message : 'Unknown error'
          
          if (errorMessage.includes('not found') || errorMessage.includes('404')) {
            next({
              name: 'Home',
              query: { 
                error: 'project-not-found', 
                message: `Project "${projectId}" not found`,
                projectId: projectId
              }
            })
          } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
            next({
              name: 'Home',
              query: { 
                error: 'network-error', 
                message: 'Unable to load project due to network error',
                projectId: projectId
              }
            })
          } else {
            next({
              name: 'Home',
              query: { 
                error: 'project-load-failed', 
                message: `Failed to load project: ${errorMessage}`,
                projectId: projectId
              }
            })
          }
        }
      } catch (error) {
        console.error('Route guard error:', error)
        next({
          name: 'Home',
          query: { 
            error: 'route-error', 
            message: 'An unexpected error occurred while loading the project'
          }
        })
      }
    }
  },
  {
    path: '/project',
    redirect: '/'
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: (to) => {
      return {
        name: 'Home',
        query: { 
          error: 'page-not-found', 
          message: `Page "${to.path}" not found`
        }
      }
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Global navigation guards
router.beforeEach((to, from, next) => {
  // Set document title based on route meta
  if (to.meta.title) {
    document.title = to.meta.title
  }
  
  // Log navigation for debugging
  console.log(`Navigating from ${from.path} to ${to.path}`)
  
  next()
})

// Global error handler for navigation failures
router.onError((error) => {
  console.error('Router navigation error:', error)
  
  // Redirect to home page with error information
  router.push({
    name: 'Home',
    query: { 
      error: 'navigation-error', 
      message: 'A navigation error occurred'
    }
  })
})

// Helper function to navigate to project workspace
export const navigateToProject = (projectId) => {
  if (!projectId) {
    console.error('Cannot navigate to project: no project ID provided')
    return router.push({
      name: 'Home',
      query: { error: 'invalid-navigation', message: 'No project ID provided' }
    })
  }
  
  return router.push({
    name: 'ProjectWorkspace',
    params: { id: projectId }
  })
}

// Helper function to navigate to home with optional error
export const navigateToHome = (error = null, message = null) => {
  const query = {}
  if (error) query.error = error
  if (message) query.message = message
  
  return router.push({
    name: 'Home',
    query
  })
}

// Helper function to check if current route is project workspace
export const isProjectWorkspace = () => {
  return router.currentRoute.value.name === 'ProjectWorkspace'
}

// Helper function to get current project ID from route
export const getCurrentProjectId = () => {
  const route = router.currentRoute.value
  return route.name === 'ProjectWorkspace' ? route.params.id : null
}

export default router