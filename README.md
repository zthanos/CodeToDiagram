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
