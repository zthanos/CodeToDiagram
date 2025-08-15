<template>
    <div class="carousel-container">
        <div class="carousel-wrapper" ref="carouselWrapper" @mousedown="startDrag" @touchstart="startDrag">
            <div class="carousel-track" ref="carouselTrack" :style="{ transform: `translateX(${translateX}px)` }">
                <div v-for="(item, index) in items" :key="index" class="carousel-item"
                    :class="{ active: index === currentIndex }">
                    <slot :item="item" :index="index">
                        <div class="default-item">{{ item }}</div>
                    </slot>
                </div>
            </div>
        </div>

        <!-- Navigation Buttons -->
        <button class="nav-button prev" @click="previous" :disabled="currentIndex === 0 && !infinite">
            ←
        </button>
        <button class="nav-button next" @click="next" :disabled="currentIndex === items.length - 1 && !infinite">
            →
        </button>

        <!-- Indicators -->
        <div class="indicators" v-if="showIndicators">
            <button v-for="(_, index) in items" :key="index" class="indicator"
                :class="{ active: index === currentIndex }" @click="goToSlide(index)" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

interface CarouselProps {
    items: any[]
    autoPlay?: boolean
    autoPlayInterval?: number
    infinite?: boolean
    showIndicators?: boolean
    itemWidth?: number
    centerMode?: boolean
}

const props = withDefaults(defineProps<CarouselProps>(), {
    autoPlay: false,
    autoPlayInterval: 3000,
    infinite: true,
    showIndicators: true,
    itemWidth: 300,
    centerMode: false
})

const emit = defineEmits<{
    change: [index: number]
    dragStart: []
    dragEnd: []
}>()

// Refs
const carouselWrapper = ref<HTMLElement>()
const carouselTrack = ref<HTMLElement>()
const currentIndex = ref(0)
const translateX = ref(0)
const isAnimating = ref(false)
const isDragging = ref(false)

// Drag state
const dragState = ref({
    startX: 0,
    startTranslateX: 0,
    currentX: 0
})

// Auto play
let autoPlayTimer: number | null = null

// Computed
const itemCount = computed(() => props.items.length)

// Methods
const updateTranslateX = () => {
    if (!carouselWrapper.value) return

    const containerWidth = carouselWrapper.value.offsetWidth
    const itemWidth = props.itemWidth

    if (props.centerMode) {
        const centerOffset = (containerWidth - itemWidth) / 2
        translateX.value = centerOffset - (currentIndex.value * itemWidth)
    } else {
        translateX.value = -(currentIndex.value * itemWidth)
    }
}

const goToSlide = async (index: number) => {
    if (isAnimating.value || index === currentIndex.value) return

    isAnimating.value = true
    currentIndex.value = index

    updateTranslateX()
    emit('change', index)

    // Wait for animation to complete
    await new Promise(resolve => setTimeout(resolve, 300))
    isAnimating.value = false
}

const next = () => {
    if (isAnimating.value) return

    let nextIndex = currentIndex.value + 1

    if (nextIndex >= itemCount.value) {
        if (props.infinite) {
            nextIndex = 0
        } else {
            return
        }
    }

    goToSlide(nextIndex)
}

const previous = () => {
    if (isAnimating.value) return

    let prevIndex = currentIndex.value - 1

    if (prevIndex < 0) {
        if (props.infinite) {
            prevIndex = itemCount.value - 1
        } else {
            return
        }
    }

    goToSlide(prevIndex)
}

// Drag functionality
const startDrag = (e: MouseEvent | TouchEvent) => {
    if (isAnimating.value) return

    isDragging.value = true
    emit('dragStart')

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX

    dragState.value = {
        startX: clientX,
        startTranslateX: translateX.value,
        currentX: clientX
    }

    // Add event listeners
    if ('touches' in e) {
        document.addEventListener('touchmove', onDragMove, { passive: false })
        document.addEventListener('touchend', endDrag)
    } else {
        document.addEventListener('mousemove', onDragMove)
        document.addEventListener('mouseup', endDrag)
        e.preventDefault() // Prevent text selection
    }

    stopAutoPlay()
}

const onDragMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging.value) return

    e.preventDefault()

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const deltaX = clientX - dragState.value.startX

    dragState.value.currentX = clientX
    translateX.value = dragState.value.startTranslateX + deltaX
}

const endDrag = () => {
    if (!isDragging.value) return

    isDragging.value = false
    emit('dragEnd')

    // Remove event listeners
    document.removeEventListener('mousemove', onDragMove)
    document.removeEventListener('mouseup', endDrag)
    document.removeEventListener('touchmove', onDragMove)
    document.removeEventListener('touchend', endDrag)

    // Calculate if we should change slide
    const deltaX = dragState.value.currentX - dragState.value.startX
    const threshold = props.itemWidth / 3 // 33% of item width

    if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0) {
            previous()
        } else {
            next()
        }
    } else {
        // Snap back to current slide
        updateTranslateX()
    }

    startAutoPlay()
}

// Auto play functionality
const startAutoPlay = () => {
    if (!props.autoPlay) return

    stopAutoPlay()
    autoPlayTimer = window.setInterval(() => {
        next()
    }, props.autoPlayInterval)
}

const stopAutoPlay = () => {
    if (autoPlayTimer) {
        clearInterval(autoPlayTimer)
        autoPlayTimer = null
    }
}

// Lifecycle
onMounted(() => {
    nextTick(() => {
        updateTranslateX()
        startAutoPlay()
    })

    // Handle window resize
    window.addEventListener('resize', updateTranslateX)
})

onUnmounted(() => {
    stopAutoPlay()
    window.removeEventListener('resize', updateTranslateX)

    // Clean up any remaining event listeners
    document.removeEventListener('mousemove', onDragMove)
    document.removeEventListener('mouseup', endDrag)
    document.removeEventListener('touchmove', onDragMove)
    document.removeEventListener('touchend', endDrag)
})

// Expose methods for parent component
defineExpose({
    next,
    previous,
    goToSlide,
    getCurrentIndex: () => currentIndex.value
})
</script>

<style scoped>
.carousel-container {
    position: relative;
    width: 100%;
    overflow: hidden;
    user-select: none;
}

.carousel-wrapper {
    position: relative;
    width: 100%;
    overflow: hidden;
    cursor: grab;
}

.carousel-wrapper:active {
    cursor: grabbing;
}

.carousel-track {
    display: flex;
    transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    will-change: transform;
}

.carousel-track.no-transition {
    transition: none;
}

.carousel-item {
    flex: 0 0 auto;
    width: v-bind('props.itemWidth + "px"');
    position: relative;
}

.default-item {
    width: 100%;
    height: 200px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1.2rem;
    font-weight: bold;
    border-radius: 8px;
    margin: 0 10px;
}

.nav-button {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.9);
    color: #333;
    font-size: 1.2rem;
    cursor: pointer;
    transition: all 0.3s ease;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.nav-button:hover:not(:disabled) {
    background: white;
    transform: translateY(-50%) scale(1.1);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.nav-button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

.nav-button.prev {
    left: 10px;
}

.nav-button.next {
    right: 10px;
}

.indicators {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 16px;
}

.indicator {
    width: 10px;
    height: 10px;
    border: none;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.3);
    cursor: pointer;
    transition: all 0.3s ease;
}

.indicator.active {
    background: #667eea;
    transform: scale(1.2);
}

.indicator:hover {
    background: #667eea;
    opacity: 0.7;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
    .nav-button {
        width: 36px;
        height: 36px;
        font-size: 1rem;
    }

    .nav-button.prev {
        left: 5px;
    }

    .nav-button.next {
        right: 5px;
    }
}
</style>