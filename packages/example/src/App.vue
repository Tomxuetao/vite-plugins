<script setup>
import { Viewer } from 'cesium'
import { onMounted } from 'vue'

onMounted(() => {
  new Viewer('container')
});
</script>

<template>
  <div id="container" class="container"></div>
</template>

<style>
html,
body {
  margin: 0;
  padding: 0;
}

#app {
  width: 100vw;
  height: 100vh;
}

.container {
  width: 100%;
  height: 100%;
}
</style>
