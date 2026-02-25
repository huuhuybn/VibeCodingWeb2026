/**
 * VIBE CODING - Slide Engine
 * Handles navigation, animations, and progress
 */

class SlideEngine {
  constructor() {
    this.sections = [];
    this.currentIndex = 0;
    this.isTransitioning = false;
    this.init();
  }

  init() {
    document.addEventListener('DOMContentLoaded', () => {
      this.sections = Array.from(document.querySelectorAll('.slide-section'));
      this.totalSections = this.sections.length;

      if (this.totalSections === 0) return;

      // Show first section
      this.sections[0].classList.add('active');
      this.updateProgress();
      this.updateCounter();

      // Keyboard navigation
      document.addEventListener('keydown', (e) => this.handleKeydown(e));

      // Click navigation
      document.addEventListener('click', (e) => this.handleClick(e));

      // Touch navigation
      this.setupTouch();

      // Trigger animations on first slide
      this.animateSection(this.sections[0]);
    });
  }

  handleKeydown(e) {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case ' ':
      case 'PageDown':
        e.preventDefault();
        this.next();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
        e.preventDefault();
        this.prev();
        break;
      case 'Home':
        e.preventDefault();
        this.goTo(0);
        break;
      case 'End':
        e.preventDefault();
        this.goTo(this.totalSections - 1);
        break;
      case 'f':
      case 'F':
        this.toggleFullscreen();
        break;
    }
  }

  handleClick(e) {
    // Don't navigate if clicking on interactive elements
    if (e.target.closest('a, button, input, select, textarea')) return;

    const x = e.clientX;
    const width = window.innerWidth;

    if (x > width * 0.65) {
      this.next();
    } else if (x < width * 0.35) {
      this.prev();
    }
  }

  setupTouch() {
    let startX = 0;
    let startY = 0;

    document.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffX = startX - endX;
      const diffY = startY - endY;

      // Horizontal swipe
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
        if (diffX > 0) {
          this.next();
        } else {
          this.prev();
        }
      }
    }, { passive: true });
  }

  next() {
    if (this.isTransitioning || this.currentIndex >= this.totalSections - 1) return;
    this.goTo(this.currentIndex + 1);
  }

  prev() {
    if (this.isTransitioning || this.currentIndex <= 0) return;
    this.goTo(this.currentIndex - 1);
  }

  goTo(index) {
    if (index === this.currentIndex || index < 0 || index >= this.totalSections || this.isTransitioning) return;

    this.isTransitioning = true;

    const currentSection = this.sections[this.currentIndex];
    const nextSection = this.sections[index];

    // Hide current
    currentSection.classList.remove('active');

    // Show next
    setTimeout(() => {
      nextSection.classList.add('active');
      this.animateSection(nextSection);
      this.currentIndex = index;
      this.updateProgress();
      this.updateCounter();

      setTimeout(() => {
        this.isTransitioning = false;
      }, 300);
    }, 200);
  }

  animateSection(section) {
    const animatedElements = section.querySelectorAll('.animate-in, [class*="animate-in-delay"]');
    animatedElements.forEach(el => {
      // Re-trigger animation
      el.style.animation = 'none';
      el.offsetHeight; // Force reflow
      el.style.animation = '';
    });
  }

  updateProgress() {
    const fill = document.querySelector('.progress-fill');
    if (!fill) return;
    const percent = ((this.currentIndex + 1) / this.totalSections) * 100;
    fill.style.width = percent + '%';
  }

  updateCounter() {
    const counter = document.querySelector('.page-counter');
    if (!counter) return;
    counter.innerHTML = `<span class="current">${this.currentIndex + 1}</span> / ${this.totalSections}`;
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }
}

// Auto-initialize
const slideEngine = new SlideEngine();
