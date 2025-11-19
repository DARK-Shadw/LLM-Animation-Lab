/**
 * Physics Engine - Ragdoll Physics and Dynamics
 *
 * Implements:
 * - Verlet integration for stable physics
 * - Ragdoll dynamics with joint constraints
 * - Collision detection and response
 * - Force application (gravity, impulses)
 */

/**
 * Physics Particle - represents a joint with physics properties
 */
class PhysicsParticle {
    constructor(x, y, mass = 1.0) {
        this.x = x;
        this.y = y;
        this.prevX = x;
        this.prevY = y;
        this.accX = 0;
        this.accY = 0;
        this.mass = mass;
        this.pinned = false; // Pinned particles don't move
    }

    /**
     * Apply force to particle
     */
    applyForce(fx, fy) {
        if (this.pinned) return;
        this.accX += fx / this.mass;
        this.accY += fy / this.mass;
    }

    /**
     * Update position using Verlet integration
     */
    update(deltaTime) {
        if (this.pinned) return;

        const damping = 0.99; // Air resistance

        // Verlet integration
        const velX = (this.x - this.prevX) * damping;
        const velY = (this.y - this.prevY) * damping;

        this.prevX = this.x;
        this.prevY = this.y;

        this.x += velX + this.accX * deltaTime * deltaTime;
        this.y += velY + this.accY * deltaTime * deltaTime;

        // Reset acceleration
        this.accX = 0;
        this.accY = 0;
    }

    /**
     * Set position (and reset velocity)
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.prevX = x;
        this.prevY = y;
    }
}

/**
 * Physics Constraint - maintains distance between two particles
 */
class DistanceConstraint {
    constructor(p1, p2, stiffness = 1.0) {
        this.p1 = p1;
        this.p2 = p2;

        // Calculate rest length
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        this.restLength = Math.sqrt(dx * dx + dy * dy);

        this.stiffness = stiffness; // 0-1, how strongly to enforce constraint
    }

    /**
     * Solve constraint by moving particles
     */
    solve() {
        const dx = this.p2.x - this.p1.x;
        const dy = this.p2.y - this.p1.y;
        const currentLength = Math.sqrt(dx * dx + dy * dy);

        if (currentLength === 0) return;

        const diff = (currentLength - this.restLength) / currentLength;
        const offsetX = dx * diff * 0.5 * this.stiffness;
        const offsetY = dy * diff * 0.5 * this.stiffness;

        if (!this.p1.pinned) {
            this.p1.x += offsetX;
            this.p1.y += offsetY;
        }

        if (!this.p2.pinned) {
            this.p2.x -= offsetX;
            this.p2.y -= offsetY;
        }
    }
}

/**
 * Angular Constraint - limits rotation between three particles
 */
class AngleConstraint {
    constructor(p1, p2, p3, minAngle, maxAngle, stiffness = 0.5) {
        this.p1 = p1; // Parent
        this.p2 = p2; // Joint
        this.p3 = p3; // Child
        this.minAngle = minAngle * Math.PI / 180;
        this.maxAngle = maxAngle * Math.PI / 180;
        this.stiffness = stiffness;
    }

    /**
     * Solve angular constraint
     */
    solve() {
        // Calculate current angle
        const dx1 = this.p1.x - this.p2.x;
        const dy1 = this.p1.y - this.p2.y;
        const dx2 = this.p3.x - this.p2.x;
        const dy2 = this.p3.y - this.p2.y;

        const angle1 = Math.atan2(dy1, dx1);
        const angle2 = Math.atan2(dy2, dx2);
        let angle = angle2 - angle1;

        // Normalize angle to -PI to PI
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;

        // Check if angle violates constraints
        let correction = 0;
        if (angle < this.minAngle) {
            correction = (this.minAngle - angle) * this.stiffness;
        } else if (angle > this.maxAngle) {
            correction = (this.maxAngle - angle) * this.stiffness;
        } else {
            return; // Within limits
        }

        // Apply correction to child particle
        if (!this.p3.pinned) {
            const len = Math.sqrt(dx2 * dx2 + dy2 * dy2);
            if (len > 0) {
                const targetAngle = angle1 + angle + correction;
                this.p3.x = this.p2.x + Math.cos(targetAngle) * len;
                this.p3.y = this.p2.y + Math.sin(targetAngle) * len;
            }
        }
    }
}

/**
 * Ragdoll Physics System
 */
export class RagdollPhysics {
    constructor(skeleton) {
        this.skeleton = skeleton;
        this.particles = new Map(); // Joint name -> PhysicsParticle
        this.constraints = [];
        this.enabled = false;
        this.gravity = 980; // pixels/s^2 (approx 9.8 m/s^2)
        this.groundY = -100; // Ground level
        this.constraintIterations = 5; // More = stiffer

        this.initializePhysics();
    }

    /**
     * Initialize physics particles for all joints
     */
    initializePhysics() {
        // Create particles for each joint
        for (const [name, joint] of Object.entries(this.skeleton.joints)) {
            const mass = this.getJointMass(name);
            const particle = new PhysicsParticle(joint.worldX, joint.worldY, mass);
            this.particles.set(name, particle);
        }

        // Create distance constraints (bones)
        const bones = this.skeleton.getBones();
        for (const bone of bones) {
            const p1 = this.particles.get(bone.start.name);
            const p2 = this.particles.get(bone.end.name);
            if (p1 && p2) {
                this.constraints.push(new DistanceConstraint(p1, p2, 1.0));
            }
        }

        // Create angular constraints for realistic joint limits
        this.addAngleConstraint('shoulder_L', 'elbow_L', 'wrist_L', 0, 160);
        this.addAngleConstraint('shoulder_R', 'elbow_R', 'wrist_R', 0, 160);
        this.addAngleConstraint('hip_L', 'knee_L', 'ankle_L', -160, 0);
        this.addAngleConstraint('hip_R', 'knee_R', 'ankle_R', -160, 0);
    }

    /**
     * Add angular constraint between three joints
     */
    addAngleConstraint(joint1Name, joint2Name, joint3Name, minAngle, maxAngle) {
        const p1 = this.particles.get(joint1Name);
        const p2 = this.particles.get(joint2Name);
        const p3 = this.particles.get(joint3Name);

        if (p1 && p2 && p3) {
            this.constraints.push(new AngleConstraint(p1, p2, p3, minAngle, maxAngle));
        }
    }

    /**
     * Get mass for different joint types
     */
    getJointMass(name) {
        if (name === 'pelvis') return 5.0;
        if (name.includes('spine') || name === 'chest') return 3.0;
        if (name === 'head') return 2.0;
        if (name.includes('shoulder') || name.includes('hip')) return 1.5;
        if (name.includes('hand') || name.includes('foot')) return 0.5;
        return 1.0;
    }

    /**
     * Enable ragdoll physics
     */
    enable() {
        this.enabled = true;
        this.syncFromSkeleton();
    }

    /**
     * Disable ragdoll physics
     */
    disable() {
        this.enabled = false;
    }

    /**
     * Pin a joint (make it immovable)
     */
    pinJoint(jointName) {
        const particle = this.particles.get(jointName);
        if (particle) {
            particle.pinned = true;
        }
    }

    /**
     * Unpin a joint
     */
    unpinJoint(jointName) {
        const particle = this.particles.get(jointName);
        if (particle) {
            particle.pinned = false;
        }
    }

    /**
     * Apply impulse to a joint
     */
    applyImpulse(jointName, forceX, forceY) {
        const particle = this.particles.get(jointName);
        if (particle) {
            particle.applyForce(forceX, forceY);
        }
    }

    /**
     * Sync particle positions from skeleton (when entering ragdoll mode)
     */
    syncFromSkeleton() {
        this.skeleton.updateAllTransforms();
        for (const [name, joint] of Object.entries(this.skeleton.joints)) {
            const particle = this.particles.get(name);
            if (particle) {
                particle.setPosition(joint.worldX, joint.worldY);
            }
        }
    }

    /**
     * Sync skeleton rotations from particle positions
     */
    syncToSkeleton() {
        // Update joint rotations based on particle positions
        for (const [name, joint] of Object.entries(this.skeleton.joints)) {
            if (joint.parent) {
                const particle = this.particles.get(name);
                const parentParticle = this.particles.get(joint.parent.name);

                if (particle && parentParticle) {
                    const dx = particle.x - parentParticle.x;
                    const dy = particle.y - parentParticle.y;
                    const angle = Math.atan2(dy, dx);

                    const parentRotation = joint.parent.worldRotation || 0;
                    joint.rotation = angle - parentRotation;
                }
            } else {
                // Root joint - update position
                const particle = this.particles.get(name);
                if (particle) {
                    joint.localX = particle.x;
                    joint.localY = particle.y;
                }
            }
        }

        this.skeleton.updateAllTransforms();
    }

    /**
     * Update physics simulation
     */
    update(deltaTime) {
        if (!this.enabled) return;

        // Limit deltaTime to prevent instability
        deltaTime = Math.min(deltaTime, 0.033); // Max 33ms

        // Apply gravity to all particles
        for (const particle of this.particles.values()) {
            particle.applyForce(0, this.gravity * particle.mass);
        }

        // Update particle positions
        for (const particle of this.particles.values()) {
            particle.update(deltaTime);
        }

        // Ground collision
        for (const particle of this.particles.values()) {
            if (particle.y < this.groundY) {
                particle.y = this.groundY;
                particle.prevY = this.groundY + (this.groundY - particle.prevY) * 0.3; // Bounce
            }
        }

        // Solve constraints multiple times for stability
        for (let i = 0; i < this.constraintIterations; i++) {
            for (const constraint of this.constraints) {
                constraint.solve();
            }
        }

        // Sync back to skeleton
        this.syncToSkeleton();
    }

    /**
     * Trigger ragdoll fall
     */
    triggerRagdoll(forceX = 0, forceY = 0) {
        this.enable();

        // Unpin all joints
        for (const particle of this.particles.values()) {
            particle.pinned = false;
        }

        // Apply initial force if provided
        if (forceX !== 0 || forceY !== 0) {
            for (const particle of this.particles.values()) {
                particle.applyForce(forceX * particle.mass, forceY * particle.mass);
            }
        }
    }

    /**
     * Reset physics state
     */
    reset() {
        this.disable();
        for (const particle of this.particles.values()) {
            particle.pinned = false;
            particle.accX = 0;
            particle.accY = 0;
        }
    }
}

/**
 * Procedural Animation Helpers
 */
export class ProceduralAnimation {
    /**
     * Generate walk cycle procedurally
     */
    static generateWalkCycle(skeleton, speed = 1.0, time = 0) {
        const walkFreq = speed * 2;
        const t = time * walkFreq;

        // Legs - alternating swing
        const leftLegPhase = Math.sin(t);
        const rightLegPhase = Math.sin(t + Math.PI);

        skeleton.setJointRotation('hip_L', leftLegPhase * 30);
        skeleton.setJointRotation('knee_L', Math.max(0, -leftLegPhase * 40));

        skeleton.setJointRotation('hip_R', rightLegPhase * 30);
        skeleton.setJointRotation('knee_R', Math.max(0, -rightLegPhase * 40));

        // Arms - opposite of legs
        skeleton.setJointRotation('shoulder_L', -rightLegPhase * 20);
        skeleton.setJointRotation('shoulder_R', -leftLegPhase * 20);

        // Spine - subtle sway
        skeleton.setJointRotation('spine_lower', Math.sin(t * 2) * 5);

        skeleton.updateAllTransforms();
    }

    /**
     * Generate idle breathing animation
     */
    static generateIdleBreathing(skeleton, time = 0) {
        const breathFreq = 0.5;
        const t = time * breathFreq;
        const breath = Math.sin(t) * 3;

        skeleton.setJointRotation('spine_lower', breath);
        skeleton.setJointRotation('spine_mid', breath * 0.8);
        skeleton.setJointRotation('chest', breath * 0.6);

        skeleton.updateAllTransforms();
    }

    /**
     * Generate head tracking (look at point)
     */
    static generateHeadTracking(skeleton, targetX, targetY, blend = 1.0) {
        const neck = skeleton.getJoint('neck');
        if (!neck) return;

        const dx = targetX - neck.worldX;
        const dy = targetY - neck.worldY;
        const angle = Math.atan2(dy, dx);

        const parentRot = neck.parent ? neck.parent.worldRotation : 0;
        const targetRot = (angle - parentRot) * Math.PI / 180;

        // Blend toward target
        neck.rotation = neck.rotation * (1 - blend) + targetRot * blend * 0.3;

        skeleton.updateAllTransforms();
    }
}
