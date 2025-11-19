/**
 * Main Application Entry Point
 *
 * This module ties together all components and manages the UI
 */

import { Skeleton } from './skeleton.js';
import { AnimationPlayer } from './animation.js';
import { SkeletonRenderer } from './renderer.js';
import { LLMAnimationEngine } from './llm-engine.js';
import { IKHelper } from './ik-solver.js';
import { RagdollPhysics, ProceduralAnimation } from './physics.js';

class AnimationApp {
    constructor() {
        this.skeleton = null;
        this.renderer = null;
        this.player = null;
        this.llmEngine = null;
        this.ragdollPhysics = null;
        this.ikMode = null; // 'arm_left', 'arm_right', 'leg_left', 'leg_right', or null
        this.proceduralMode = null; // 'walk', 'idle', or null

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
        this.apiProvider = document.getElementById('apiProvider');
        this.skeletonInfo = document.getElementById('skeletonInfo');

        // Advanced feature elements
        this.ikArmLeftBtn = document.getElementById('ikArmLeftBtn');
        this.ikArmRightBtn = document.getElementById('ikArmRightBtn');
        this.ikLegLeftBtn = document.getElementById('ikLegLeftBtn');
        this.ikLegRightBtn = document.getElementById('ikLegRightBtn');
        this.physicsEnabledCheckbox = document.getElementById('physicsEnabledCheckbox');
        this.ragdollBtn = document.getElementById('ragdollBtn');
        this.resetPhysicsBtn = document.getElementById('resetPhysicsBtn');
        this.gravitySlider = document.getElementById('gravitySlider');
        this.gravityValue = document.getElementById('gravityValue');
        this.proceduralWalkBtn = document.getElementById('proceduralWalkBtn');
        this.proceduralIdleBtn = document.getElementById('proceduralIdleBtn');

        // Initialize components
        this.skeleton = new Skeleton();
        this.renderer = new SkeletonRenderer(this.canvas);
        this.player = new AnimationPlayer(this.skeleton);
        this.llmEngine = new LLMAnimationEngine();
        this.ragdollPhysics = new RagdollPhysics(this.skeleton);
        this.proceduralTime = 0;

        // Load API settings from localStorage
        const savedApiKey = localStorage.getItem('api_key');
        const savedProvider = localStorage.getItem('api_provider') || 'demo';

        if (savedApiKey) {
            this.apiKeyInput.value = savedApiKey;
            this.llmEngine.apiKey = savedApiKey;
        }

        this.apiProvider.value = savedProvider;
        if (savedProvider !== 'demo') {
            this.llmEngine.setProvider(savedProvider);
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

        // API provider
        this.apiProvider.addEventListener('change', () => {
            const provider = this.apiProvider.value;
            localStorage.setItem('api_provider', provider);

            if (provider === 'demo') {
                this.llmEngine.apiKey = null;
                this.logMessage('Using demo mode with predefined animations', 'info');
            } else {
                this.llmEngine.setProvider(provider);
                const providerName = provider === 'claude' ? 'Claude (Anthropic)' : 'Gemini (Google)';
                this.logMessage(`Switched to ${providerName}`, 'info');
            }
        });

        // API key
        this.apiKeyInput.addEventListener('change', () => {
            const apiKey = this.apiKeyInput.value.trim();
            if (apiKey) {
                this.llmEngine.apiKey = apiKey;
                localStorage.setItem('api_key', apiKey);
                this.logMessage('API key saved', 'success');
            } else {
                this.llmEngine.apiKey = null;
                localStorage.removeItem('api_key');
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

        // IK Controls
        this.ikArmLeftBtn.addEventListener('click', () => this.enableIKMode('arm_left'));
        this.ikArmRightBtn.addEventListener('click', () => this.enableIKMode('arm_right'));
        this.ikLegLeftBtn.addEventListener('click', () => this.enableIKMode('leg_left'));
        this.ikLegRightBtn.addEventListener('click', () => this.enableIKMode('leg_right'));

        // Physics Controls
        this.physicsEnabledCheckbox.addEventListener('change', () => {
            if (this.physicsEnabledCheckbox.checked) {
                this.ragdollPhysics.enable();
                this.logMessage('Physics simulation enabled', 'success');
            } else {
                this.ragdollPhysics.disable();
                this.logMessage('Physics simulation disabled', 'info');
            }
        });

        this.ragdollBtn.addEventListener('click', () => this.triggerRagdoll());
        this.resetPhysicsBtn.addEventListener('click', () => this.resetPhysics());

        this.gravitySlider.addEventListener('input', () => {
            const gravity = parseInt(this.gravitySlider.value);
            this.gravityValue.textContent = gravity;
            this.ragdollPhysics.gravity = gravity;
        });

        // Procedural Animation
        this.proceduralWalkBtn.addEventListener('click', () => this.toggleProceduralMode('walk'));
        this.proceduralIdleBtn.addEventListener('click', () => this.toggleProceduralMode('idle'));

        // Canvas click for IK
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));

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
        const deltaTime = 1 / 60; // Approximate for stable physics

        // Update physics
        if (this.ragdollPhysics.enabled) {
            this.ragdollPhysics.update(deltaTime);
        }
        // Update procedural animation
        else if (this.proceduralMode) {
            this.proceduralTime += deltaTime;
            if (this.proceduralMode === 'walk') {
                ProceduralAnimation.generateWalkCycle(this.skeleton, 1.0, this.proceduralTime);
            } else if (this.proceduralMode === 'idle') {
                ProceduralAnimation.generateIdleBreathing(this.skeleton, this.proceduralTime);
            }
        }
        // Update keyframe animation
        else if (this.player.isPlaying) {
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
     * Enable IK mode for positioning limbs
     */
    enableIKMode(mode) {
        this.ikMode = mode;
        this.proceduralMode = null;
        this.player.pause();

        const descriptions = {
            'arm_left': 'left hand',
            'arm_right': 'right hand',
            'leg_left': 'left foot',
            'leg_right': 'right foot'
        };

        this.logMessage(`IK Mode: Click on canvas to position ${descriptions[mode]}`, 'info');
        this.updateSkeletonInfo(`IK Mode: Position ${descriptions[mode]}`);
    }

    /**
     * Handle canvas click for IK positioning
     */
    handleCanvasClick(e) {
        if (!this.ikMode) return;

        const rect = this.canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;

        // Convert screen coordinates to world coordinates
        const worldX = (canvasX - this.renderer.cameraX) / this.renderer.zoom;
        const worldY = -(canvasY - this.renderer.cameraY) / this.renderer.zoom;

        // Apply IK
        let success = false;
        if (this.ikMode === 'arm_left') {
            success = IKHelper.reachToward(this.skeleton, 'left', worldX, worldY);
        } else if (this.ikMode === 'arm_right') {
            success = IKHelper.reachToward(this.skeleton, 'right', worldX, worldY);
        } else if (this.ikMode === 'leg_left') {
            success = IKHelper.plantFoot(this.skeleton, 'left', worldX, worldY);
        } else if (this.ikMode === 'leg_right') {
            success = IKHelper.plantFoot(this.skeleton, 'right', worldX, worldY);
        }

        if (success) {
            this.logMessage(`IK applied successfully`, 'success');
        } else {
            this.logMessage(`Target out of reach`, 'warning');
        }

        this.ikMode = null;
        this.updateSkeletonInfo('IK complete');
    }

    /**
     * Trigger ragdoll physics
     */
    triggerRagdoll() {
        this.player.pause();
        this.proceduralMode = null;
        this.ragdollPhysics.triggerRagdoll(Math.random() * 200 - 100, 0);
        this.physicsEnabledCheckbox.checked = true;
        this.logMessage('Ragdoll triggered!', 'success');
        this.updateSkeletonInfo('Ragdoll Active');
    }

    /**
     * Reset physics simulation
     */
    resetPhysics() {
        this.ragdollPhysics.reset();
        this.ragdollPhysics.disable();
        this.physicsEnabledCheckbox.checked = false;
        this.skeleton.resetToTPose();
        this.logMessage('Physics reset', 'info');
        this.updateSkeletonInfo('Ready to animate');
    }

    /**
     * Toggle procedural animation mode
     */
    toggleProceduralMode(mode) {
        if (this.proceduralMode === mode) {
            this.proceduralMode = null;
            this.proceduralTime = 0;
            this.skeleton.resetToTPose();
            this.logMessage(`Procedural ${mode} stopped`, 'info');
            this.updateSkeletonInfo('Ready to animate');
        } else {
            this.proceduralMode = mode;
            this.proceduralTime = 0;
            this.player.pause();
            this.ragdollPhysics.disable();
            this.physicsEnabledCheckbox.checked = false;
            const modeName = mode === 'walk' ? 'Walk Cycle' : 'Breathing Idle';
            this.logMessage(`Procedural ${modeName} started`, 'success');
            this.updateSkeletonInfo(`Procedural: ${modeName}`);
        }
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
