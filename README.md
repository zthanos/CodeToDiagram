# mermaid-vue-app

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Preview Production Build

```sh
npm run preview
```

## API Configuration

The application uses a configurable API versioning system. You can configure the API version and other settings using environment variables.

### Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8000
VITE_API_VERSION=v1
VITE_API_TIMEOUT=30000
VITE_API_MAX_RETRIES=3
VITE_API_RETRY_DELAY=1000
```

### API Endpoints

All API endpoints are automatically versioned based on the `VITE_API_VERSION` environment variable.

**Default Version:** `v1`
**Base Pattern:** `/api/{version}/{endpoint}`

### Project Creation

The application supports creating new projects through the versioned API endpoint:

**POST** `/api/v1/projects` (or `/api/{version}/projects`)

**Request Body:**
```json
{
  "name": "string",
  "description": "string", 
  "code": "string",
  "state": "active",
  "id": "string"
}
```

**Required Fields:**
- `name`: Project name (2-100 characters)
- `code`: Unique project code (2-50 characters, e.g., "PROJ-001")
- `id`: Unique project identifier

**Optional Fields:**
- `description`: Project description (max 500 characters)
- `state`: Project state (defaults to "active")

**Example:**
```json
{
  "id": "project_1234567890_abc123",
  "name": "My New Project",
  "description": "A sample project for demonstration",
  "code": "PROJ-001",
  "state": "active"
}
```

### Other API Endpoints

All endpoints follow the versioned pattern:

- **GET** `/api/v1/projects` - List all projects
- **GET** `/api/v1/projects/{id}/outline` - Get project details
- **POST** `/api/v1/projects/{id}/diagrams/add` - Add diagram to project
- **PUT** `/api/v1/projects/{id}/diagrams/{diagramId}` - Update diagram
- **GET** `/api/v1/projects/{id}/diagrams/{diagramId}` - Get diagram
- **GET** `/api/v1/projects/{id}/diagrams/list` - List project diagrams
- **DELETE** `/api/v1/projects/{id}/diagrams/{diagramId}/delete` - Delete diagram
- **POST** `/api/v1/projects/{id}/requirements/add` - Add requirement
- **GET** `/api/v1/projects/{id}/requirements/list` - List requirements
- **PUT** `/api/v1/projects/{id}/requirements/{requirementId}` - Update requirement
- **DELETE** `/api/v1/projects/{id}/requirements/{requirementId}` - Delete requirement
- **POST** `/api/v1/projects/{id}/teams/assign` - Assign team
- **POST** `/api/v1/projects/{id}/tasks/create` - Create task
- **POST** `/api/v1/projects/{id}/requirements/upload-and-process` - Upload files for requirements

### Version Configuration

To change the API version, update the `VITE_API_VERSION` environment variable:

```env
# For version 2
VITE_API_VERSION=v2

# For version 1 (default)
VITE_API_VERSION=v1
```

The application will automatically use the configured version for all API calls.

## Docker Setup

### Build Docker Image

```sh
docker build -t mermaid-vue-app .
```

### Run Docker Container

```sh
docker run -p 4173:4173 mermaid-vue-app
```

The application will be available at `http://localhost:4173`

### Docker Development

For development with Docker, you can also run:

```sh
# Build and run in one command
docker build -t mermaid-vue-app . && docker run -p 4173:4173 mermaid-vue-app

# Or run with automatic removal after stopping
docker run --rm -p 4173:4173 mermaid-vue-app
```
