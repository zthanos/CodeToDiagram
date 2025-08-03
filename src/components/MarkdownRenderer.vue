<template>
    <div 
      class="markdown-content"
      v-html="renderedHtml"
    />
  </template>
  
  <script setup lang="ts">
  import { ref, watch, onMounted } from 'vue'
  import { marked } from 'marked'
  import type { MarkedOptions } from 'marked'
  import hljs from 'highlight.js'
  import 'highlight.js/styles/github-dark.css'
  
  // Props interface
  interface Props {
    content: string
  }
  
  const props = defineProps<Props>()
  
  // Configure marked with highlight.js
  const markedOptions: MarkedOptions = {
    breaks: true,
    gfm: true,
    highlight: function(code: string, lang: string) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(code, { language: lang }).value
        } catch (err) {
          console.warn('Highlight.js error:', err)
        }
      }
      
      try {
        return hljs.highlightAuto(code).value
      } catch (err) {
        console.warn('Highlight.js auto-detect error:', err)
        return code
      }
    }
  }
  
  marked.setOptions(markedOptions)
  
  // Reactive rendered HTML
  const renderedHtml = ref<string>('')
  
  // Function to render markdown
  const renderMarkdown = (markdown: string): string => {
    try {
      return marked(markdown) as string
    } catch (error) {
      console.error('Error rendering markdown:', error)
      return '<p>Error rendering content</p>'
    }
  }
  
  // Watch for content changes (for SSE updates)
  watch(
    () => props.content,
    (newContent) => {
      renderedHtml.value = renderMarkdown(newContent)
    },
    { immediate: true }
  )
  
  // Initial render on mount
  onMounted(() => {
    renderedHtml.value = renderMarkdown(props.content)
  })
  </script>
  <style scoped>
  .markdown-content {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #333;
  }
  
  /* Headers */
  .markdown-content :deep(h1),
  .markdown-content :deep(h2),
  .markdown-content :deep(h3),
  .markdown-content :deep(h4),
  .markdown-content :deep(h5),
  .markdown-content :deep(h6) {
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    font-weight: 600;
    line-height: 1.25;
  }
  
  .markdown-content :deep(h1) {
    font-size: 2em;
    border-bottom: 1px solid #eaecef;
    padding-bottom: 0.3em;
  }
  
  .markdown-content :deep(h2) {
    font-size: 1.5em;
    border-bottom: 1px solid #eaecef;
    padding-bottom: 0.3em;
  }
  
  .markdown-content :deep(h3) {
    font-size: 1.25em;
  }
  
  /* Paragraphs */
  .markdown-content :deep(p) {
    margin-bottom: 1em;
  }
  
  /* Bold and italic text */
  .markdown-content :deep(strong),
  .markdown-content :deep(b) {
    font-weight: 600;
  }
  
  .markdown-content :deep(em),
  .markdown-content :deep(i) {
    font-style: italic;
  }
  
  /* Lists */
  .markdown-content :deep(ul),
  .markdown-content :deep(ol) {
    padding-left: 2em;
    margin-bottom: 1em;
  }
  
  .markdown-content :deep(li) {
    margin-bottom: 0.25em;
  }
  
  /* Links */
  .markdown-content :deep(a) {
    color: #0366d6;
    text-decoration: none;
  }
  
  .markdown-content :deep(a:hover) {
    text-decoration: underline;
  }
  
  /* Inline code */
  .markdown-content :deep(code:not(.hljs)) {
    background-color: rgba(175, 184, 193, 0.2);
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 85%;
  }
  
  /* Code blocks */
  .markdown-content :deep(pre) {
    background-color: #f6f8fa;
    border-radius: 6px;
    padding: 16px;
    overflow: auto;
    margin: 1em 0;
  }
  
  .markdown-content :deep(pre code) {
    background: transparent;
    padding: 0;
    border-radius: 0;
    font-size: 14px;
    line-height: 1.45;
  }
  
  /* Blockquotes */
  .markdown-content :deep(blockquote) {
    border-left: 4px solid #dfe2e5;
    padding: 0 1em;
    color: #6a737d;
    margin: 1em 0;
  }
  
  .markdown-content :deep(blockquote p) {
    margin-bottom: 0;
  }
  
  /* Tables */
  .markdown-content :deep(table) {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
  }
  
  .markdown-content :deep(th),
  .markdown-content :deep(td) {
    border: 1px solid #dfe2e5;
    padding: 6px 13px;
    text-align: left;
  }
  
  .markdown-content :deep(th) {
    background-color: #f6f8fa;
    font-weight: 600;
  }
  
  /* Horizontal rule */
  .markdown-content :deep(hr) {
    border: none;
    border-top: 1px solid #eaecef;
    margin: 1.5em 0;
  }
  
  /* Images */
  .markdown-content :deep(img) {
    max-width: 100%;
    height: auto;
  }
  </style>
  