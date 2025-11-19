/**
 * Animation Engine - Keyframe System with Smooth Interpolation
 *
 * This module provides:
 * - Keyframe-based animation system
 * - Multiple easing functions for natural motion
 * - Smooth interpolation between poses
 * - Timeline management and playback control
 */

/**
 * Easing Functions
 * These create natural-looking motion curves
 */
export const Easing = {
    // Linear - constant speed
    linear: (t) => t,

    // Ease In/Out - slow start and end, fast middle
    easeInOutCubic: (t) => {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    },

    // Ease In - slow start, fast end
    easeInCubic: (t) => t * t * t,

    // Ease Out - fast start, slow end
    easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),

    // Ease In Quad - gentle acceleration
    easeInQuad: (t) => t * t,

    // Ease Out Quad - gentle deceleration
    easeOutQuad: (t) => 1 - (1 - t) * (1 - t),

    // Ease Out Elastic - bouncy end
    easeOutElastic: (t) => {
        const c4 = (2 * Math.PI) / 3;
        return t === 0
            ? 0
            : t === 1
            ? 1
            : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    },

    // Ease Out Bounce - bouncing effect
    easeOutBounce: (t) => {
        const n1 = 7.5625;
        const d1 = 2.75;

        if (t < 1 / d1) {
            return n1 * t * t;
        } else if (t < 2 / d1) {
            return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
            return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
    }
};

/**
 * Keyframe - represents a pose at a specific time
 */
export class Keyframe {
    constructor(time, pose, easing = Easing.easeInOutCubic) {
        this.time = time; // Time in seconds
        this.pose = pose; // Skeleton pose data
        this.easing = easing; // Easing function for transition to next keyframe
    }
}

/**
 * Animation - collection of keyframes forming a complete animation
 */
export class Animation {
    constructor(name = 'Untitled Animation') {
        this.name = name;
        this.keyframes = [];
        this.duration = 0;
    }

    /**
     * Add a keyframe to the animation
     */
    addKeyframe(time, pose, easing = Easing.easeInOutCubic) {
        const keyframe = new Keyframe(time, pose, easing);
        this.keyframes.push(keyframe);
        this.sortKeyframes();
        this.updateDuration();
        return this;
    }

    /**
     * Sort keyframes by time
     */
    sortKeyframes() {
        this.keyframes.sort((a, b) => a.time - b.time);
    }

    /**
     * Update animation duration
     */
    updateDuration() {
        if (this.keyframes.length > 0) {
            this.duration = this.keyframes[this.keyframes.length - 1].time;
        } else {
            this.duration = 0;
        }
    }

    /**
     * Get interpolated pose at specific time
     */
    getPoseAtTime(time) {
        if (this.keyframes.length === 0) {
            return null;
        }

        // Clamp time to animation duration
        time = Math.max(0, Math.min(time, this.duration));

        // Find surrounding keyframes
        let prevKeyframe = this.keyframes[0];
        let nextKeyframe = this.keyframes[0];

        for (let i = 0; i < this.keyframes.length; i++) {
            if (this.keyframes[i].time <= time) {
                prevKeyframe = this.keyframes[i];
            }
            if (this.keyframes[i].time >= time) {
                nextKeyframe = this.keyframes[i];
                break;
            }
        }

        // If we're exactly on a keyframe, return its pose
        if (prevKeyframe === nextKeyframe) {
            return prevKeyframe.pose;
        }

        // Calculate interpolation factor
        const timeDiff = nextKeyframe.time - prevKeyframe.time;
        const t = timeDiff > 0 ? (time - prevKeyframe.time) / timeDiff : 0;

        // Apply easing function
        const easedT = prevKeyframe.easing(t);

        // Interpolate between poses
        return this.interpolatePoses(prevKeyframe.pose, nextKeyframe.pose, easedT);
    }

    /**
     * Interpolate between two poses
     */
    interpolatePoses(pose1, pose2, t) {
        const interpolated = {
            rootX: this.lerp(pose1.rootX, pose2.rootX, t),
            rootY: this.lerp(pose1.rootY, pose2.rootY, t),
            rotations: {}
        };

        // Interpolate all joint rotations
        for (const jointName in pose1.rotations) {
            const angle1 = pose1.rotations[jointName] || 0;
            const angle2 = pose2.rotations[jointName] || 0;
            interpolated.rotations[jointName] = this.lerpAngle(angle1, angle2, t);
        }

        // Include any joints only in pose2
        for (const jointName in pose2.rotations) {
            if (!(jointName in interpolated.rotations)) {
                interpolated.rotations[jointName] = pose2.rotations[jointName];
            }
        }

        return interpolated;
    }

    /**
     * Linear interpolation
     */
    lerp(a, b, t) {
        return a + (b - a) * t;
    }

    /**
     * Angular interpolation (handles wrapping)
     */
    lerpAngle(a, b, t) {
        // Normalize angles to -180 to 180 range
        const normalize = (angle) => {
            while (angle > 180) angle -= 360;
            while (angle < -180) angle += 360;
            return angle;
        };

        a = normalize(a);
        b = normalize(b);

        // Find shortest path
        let diff = b - a;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;

        return a + diff * t;
    }

    /**
     * Clear all keyframes
     */
    clear() {
        this.keyframes = [];
        this.duration = 0;
    }
}

/**
 * AnimationPlayer - handles playback of animations
 */
export class AnimationPlayer {
    constructor(skeleton) {
        this.skeleton = skeleton;
        this.animation = null;
        this.currentTime = 0;
        this.isPlaying = false;
        this.loop = true;
        this.speed = 1.0;
        this.lastUpdateTime = 0;
    }

    /**
     * Load an animation for playback
     */
    loadAnimation(animation) {
        this.animation = animation;
        this.currentTime = 0;
        this.updatePose();
    }

    /**
     * Start playback
     */
    play() {
        if (this.animation) {
            this.isPlaying = true;
            this.lastUpdateTime = performance.now();
        }
    }

    /**
     * Pause playback
     */
    pause() {
        this.isPlaying = false;
    }

    /**
     * Stop and reset
     */
    stop() {
        this.isPlaying = false;
        this.currentTime = 0;
        this.updatePose();
    }

    /**
     * Set playback speed (1.0 = normal, 0.5 = half speed, 2.0 = double speed)
     */
    setSpeed(speed) {
        this.speed = Math.max(0.1, Math.min(speed, 5.0));
    }

    /**
     * Set loop mode
     */
    setLoop(loop) {
        this.loop = loop;
    }

    /**
     * Seek to specific time
     */
    seek(time) {
        if (this.animation) {
            this.currentTime = Math.max(0, Math.min(time, this.animation.duration));
            this.updatePose();
        }
    }

    /**
     * Update animation (call this in animation loop)
     */
    update(currentTimeMs) {
        if (!this.isPlaying || !this.animation) {
            return;
        }

        const deltaTime = (currentTimeMs - this.lastUpdateTime) / 1000; // Convert to seconds
        this.lastUpdateTime = currentTimeMs;

        this.currentTime += deltaTime * this.speed;

        // Handle looping or stopping at end
        if (this.currentTime > this.animation.duration) {
            if (this.loop) {
                this.currentTime = this.currentTime % this.animation.duration;
            } else {
                this.currentTime = this.animation.duration;
                this.pause();
            }
        }

        this.updatePose();
    }

    /**
     * Update skeleton pose based on current time
     */
    updatePose() {
        if (this.animation && this.skeleton) {
            const pose = this.animation.getPoseAtTime(this.currentTime);
            if (pose) {
                this.skeleton.setPose(pose);
            }
        }
    }

    /**
     * Get current playback progress (0 to 1)
     */
    getProgress() {
        if (!this.animation || this.animation.duration === 0) {
            return 0;
        }
        return this.currentTime / this.animation.duration;
    }
}
