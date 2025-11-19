/**
 * Main Application Entry Point
 *
 * This module ties together all components and manages the UI
 */

import { Skeleton } from './skeleton.js';
import { AnimationPlayer } from './animation.js';
import { SkeletonRenderer } from './renderer.js';
import { LLMAnimationEngine } from './llm-engine.js';

class AnimationApp {
    constructor() {
        this.skeleton = null;
        this.renderer = null;
        this.player = null;
        this.llmEngine = null;

        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        // Get DOM elements
        this.canvas = document.getElementById('animationCanvas');
        this.promptInput = document.getElementById('promptInput');
        this.generateBtn = document.getElementById('generateBtn');
        this.playBtn = document.getElementById('playBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.loopCheckbox = document.getElementById('loopCheckbox');
        this.speedSlider = document.getElementById('speedSlider');
        this.speedValue = document.getElementById('speedValue');
        this.timelineSlider = document.getElementById('timelineSlider');
        this.currentTimeDisplay = document.getElementById('currentTime');
        this.totalTimeDisplay = document.getElementById('totalTime');
        this.statusLog = document.getElementById('statusLog');
        this.showBonesCheckbox = document.getElementById('showBonesCheckbox');
        this.showJointsCheckbox = document.getElementById('showJointsCheckbox');
        this.showNamesCheckbox = document.getElementById('showNamesCheckbox');
        this.apiKeyInput = document.getElementById('apiKeyInput');
        this.skeletonInfo = document.getElementById('skeletonInfo');

        // Initialize components
        this.skeleton = new Skeleton();
        this.renderer = new SkeletonRenderer(this.canvas);
        this.player = new AnimationPlayer(this.skeleton);
        this.llmEngine = new LLMAnimationEngine();

        // Load API key from localStorage if available
        const savedApiKey = localStorage.getItem('claude_api_key');
        if (savedApiKey) {
            this.apiKeyInput.value = savedApiKey;
            this.llmEngine.apiKey = savedApiKey;
        }

        // Setup event listeners
        this.setupEventListeners();

        // Start render loop
        this.renderer.startRenderLoop(() => this.render());

        // Initial render
        this.updateSkeletonInfo();
        this.logMessage('Application initialized. Ready to create animations!', 'success');
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Generate button
        this.generateBtn.addEventListener('click', () => this.generateAnimation());

        // Example buttons
        document.querySelectorAll('.example-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.promptInput.value = btn.dataset.prompt;
            });
        });

        // Playback controls
        this.playBtn.addEventListener('click', () => this.play());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.resetBtn.addEventListener('click', () => this.reset());

        this.loopCheckbox.addEventListener('change', () => {
            this.player.setLoop(this.loopCheckbox.checked);
        });

        this.speedSlider.addEventListener('input', () => {
            const speed = parseFloat(this.speedSlider.value);
            this.speedValue.textContent = speed.toFixed(2);
            this.player.setSpeed(speed);
        });

        this.timelineSlider.addEventListener('input', () => {
            if (!this.player.animation) return;
            const progress = parseFloat(this.timelineSlider.value) / 100;
            const time = progress * this.player.animation.duration;
            this.player.seek(time);
            this.updateTimeDisplay();
        });

        // Visual settings
        this.showBonesCheckbox.addEventListener('change', () => {
            this.renderer.setShowBones(this.showBonesCheckbox.checked);
        });

        this.showJointsCheckbox.addEventListener('change', () => {
            this.renderer.setShowJoints(this.showJointsCheckbox.checked);
        });

        this.showNamesCheckbox.addEventListener('change', () => {
            this.renderer.setShowNames(this.showNamesCheckbox.checked);
        });

        // API key
        this.apiKeyInput.addEventListener('change', () => {
            const apiKey = this.apiKeyInput.value.trim();
            if (apiKey) {
                this.llmEngine.apiKey = apiKey;
                localStorage.setItem('claude_api_key', apiKey);
                this.logMessage('API key saved', 'success');
            } else {
                this.llmEngine.apiKey = null;
                localStorage.removeItem('claude_api_key');
                this.logMessage('API key removed - using demo mode', 'info');
            }
        });

        // Enter key in prompt
        this.promptInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.generateAnimation();
            }
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    /**
     * Generate animation from prompt
     */
    async generateAnimation() {
        const prompt = this.promptInput.value.trim();

        if (!prompt) {
            this.logMessage('Please enter an animation prompt', 'warning');
            return;
        }

        // Disable button and show loading
        this.generateBtn.disabled = true;
        this.generateBtn.querySelector('.btn-text').style.display = 'none';
        this.generateBtn.querySelector('.btn-loader').style.display = 'inline';

        const mode = this.llmEngine.apiKey ? 'LLM' : 'Demo';
        this.logMessage(`Generating animation using ${mode} mode: "${prompt}"`, 'info');

        try {
            const animation = await this.llmEngine.generateAnimation(prompt, this.skeleton);

            // Load animation
            this.player.loadAnimation(animation);
            this.player.setLoop(this.loopCheckbox.checked);

            // Enable playback controls
            this.enablePlaybackControls(true);

            // Update timeline
            this.updateTimeDisplay();

            // Auto-play
            this.play();

            this.logMessage(`Animation "${animation.name}" generated successfully! (${animation.duration.toFixed(1)}s, ${animation.keyframes.length} keyframes)`, 'success');
            this.updateSkeletonInfo(`Playing: ${animation.name}`);

        } catch (error) {
            this.logMessage(`Error: ${error.message}`, 'error');
            console.error('Animation generation error:', error);
        } finally {
            // Re-enable button
            this.generateBtn.disabled = false;
            this.generateBtn.querySelector('.btn-text').style.display = 'inline';
            this.generateBtn.querySelector('.btn-loader').style.display = 'none';
        }
    }

    /**
     * Playback controls
     */
    play() {
        if (!this.player.animation) return;
        this.player.play();
        this.updateSkeletonInfo(`Playing: ${this.player.animation.name}`);
    }

    pause() {
        this.player.pause();
        this.updateSkeletonInfo(`Paused: ${this.player.animation.name}`);
    }

    reset() {
        this.player.stop();
        this.updateTimeDisplay();
        if (this.player.animation) {
            this.updateSkeletonInfo(`Ready: ${this.player.animation.name}`);
        }
    }

    /**
     * Enable/disable playback controls
     */
    enablePlaybackControls(enabled) {
        this.playBtn.disabled = !enabled;
        this.pauseBtn.disabled = !enabled;
        this.resetBtn.disabled = !enabled;
        this.timelineSlider.disabled = !enabled;
    }

    /**
     * Update time displays
     */
    updateTimeDisplay() {
        if (!this.player.animation) {
            this.currentTimeDisplay.textContent = '0.0s';
            this.totalTimeDisplay.textContent = '0.0s';
            this.timelineSlider.value = 0;
            return;
        }

        this.currentTimeDisplay.textContent = this.player.currentTime.toFixed(1) + 's';
        this.totalTimeDisplay.textContent = this.player.animation.duration.toFixed(1) + 's';

        // Update timeline slider (avoid feedback loop)
        if (!this.timelineSlider.matches(':active')) {
            const progress = this.player.getProgress() * 100;
            this.timelineSlider.value = progress;
        }
    }

    /**
     * Update skeleton info display
     */
    updateSkeletonInfo(text = 'Ready to animate') {
        this.skeletonInfo.textContent = text;
    }

    /**
     * Main render loop
     */
    render() {
        // Update animation
        if (this.player.isPlaying) {
            this.player.update(performance.now());
            this.updateTimeDisplay();
        }

        // Render skeleton
        this.renderer.drawSkeleton(this.skeleton);
    }

    /**
     * Handle window resize
     */
    handleResize() {
        // Keep canvas at fixed aspect ratio
        const container = this.canvas.parentElement;
        const width = container.clientWidth;
        const height = Math.round(width * 0.75); // 4:3 aspect ratio

        this.renderer.resize(width, height);
        this.renderer.centerOnSkeleton(this.skeleton);
    }

    /**
     * Log message to status panel
     */
    logMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `status-message ${type}`;
        messageDiv.textContent = message;

        this.statusLog.insertBefore(messageDiv, this.statusLog.firstChild);

        // Limit to 10 messages
        while (this.statusLog.children.length > 10) {
            this.statusLog.removeChild(this.statusLog.lastChild);
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AnimationApp();
});
