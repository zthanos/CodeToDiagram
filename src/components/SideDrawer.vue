<template>
    <div class="side-drawer-wrapper" v-if="visible">
      <div class="side-drawer-backdrop" @click="close"></div>
      <div class="side-drawer" :class="position">
        <slot />
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: 'SideDrawer',
    props: {
      visible: { type: Boolean, required: true },
      position: { type: String, default: 'right' } // right or left
    },
    emits: ['close'],
    methods: {
      close() {
        this.$emit('close')
      }
    }
  }
  </script>
  
  <style scoped>
  .side-drawer-wrapper {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2000;
  }
  
  .side-drawer-backdrop {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.4);
    backdrop-filter: blur(2px);
  }
  
  .side-drawer {
    position: absolute;
    top: 0;
    width: 400px;
    height: 100%;
    background: #fff;
    box-shadow: -2px 0 10px rgba(0,0,0,0.1);
    transition: transform 0.3s ease;
  }
  
  .side-drawer.right {
    right: 0;
    transform: translateX(0);
  }
  
  .side-drawer.left {
    left: 0;
    transform: translateX(0);
  }
  </style>
  