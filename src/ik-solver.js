/**
 * Inverse Kinematics (IK) Solver
 *
 * Implements multiple IK solving techniques:
 * - Two-bone IK (for arms and legs)
 * - FABRIK (Forward And Backward Reaching Inverse Kinematics)
 * - CCD (Cyclic Coordinate Descent)
 */

/**
 * Two-Bone IK Solver
 * Perfect for arms (shoulder-elbow-wrist) and legs (hip-knee-ankle)
 */
export class TwoBoneIK {
    /**
     * Solve two-bone IK chain
     * @param {Joint} rootJoint - First joint in chain (shoulder/hip)
     * @param {Joint} middleJoint - Middle joint (elbow/knee)
     * @param {Joint} endJoint - End joint (wrist/ankle)
     * @param {number} targetX - Target X position (world space)
     * @param {number} targetY - Target Y position (world space)
     * @param {number} poleFactor - Pole vector influence (-1 to 1)
     * @returns {boolean} - True if solution found
     */
    static solve(rootJoint, middleJoint, endJoint, targetX, targetY, poleFactor = 1) {
        // Get bone lengths
        const upperLength = Math.sqrt(
            middleJoint.localX ** 2 + middleJoint.localY ** 2
        );
        const lowerLength = Math.sqrt(
            endJoint.localX ** 2 + endJoint.localY ** 2
        );

        // Calculate distance to target
        const dx = targetX - rootJoint.worldX;
        const dy = targetY - rootJoint.worldY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Check if target is reachable
        const maxReach = upperLength + lowerLength;
        const minReach = Math.abs(upperLength - lowerLength);

        if (distance > maxReach) {
            // Target too far - stretch toward it
            const angle = Math.atan2(dy, dx);
            rootJoint.rotation = angle - rootJoint.parent.worldRotation;
            middleJoint.rotation = 0;
            return false;
        }

        if (distance < minReach) {
            // Target too close - fold completely
            const angle = Math.atan2(dy, dx);
            rootJoint.rotation = angle - rootJoint.parent.worldRotation;
            middleJoint.rotation = Math.PI;
            return false;
        }

        // Calculate angles using law of cosines
        const cosAngle = (upperLength * upperLength + distance * distance - lowerLength * lowerLength) /
                        (2 * upperLength * distance);
        const angle1 = Math.acos(Math.max(-1, Math.min(1, cosAngle)));

        const cosMiddle = (upperLength * upperLength + lowerLength * lowerLength - distance * distance) /
                         (2 * upperLength * lowerLength);
        const angle2 = Math.acos(Math.max(-1, Math.min(1, cosMiddle)));

        // Apply pole vector (controls elbow/knee bend direction)
        const targetAngle = Math.atan2(dy, dx);
        const rootAngle = targetAngle + (angle1 * poleFactor);
        const middleAngle = Math.PI - angle2;

        // Set rotations (convert from world to local space)
        rootJoint.rotation = rootAngle - (rootJoint.parent ? rootJoint.parent.worldRotation : 0);
        middleJoint.rotation = middleAngle;

        return true;
    }
}

/**
 * FABRIK (Forward And Backward Reaching Inverse Kinematics)
 * Works with any length chain of joints
 */
export class FABRIK {
    /**
     * Solve IK chain using FABRIK algorithm
     * @param {Joint[]} chain - Array of joints from root to end
     * @param {number} targetX - Target X position
     * @param {number} targetY - Target Y position
     * @param {number} iterations - Max iterations (default 10)
     * @param {number} tolerance - Convergence tolerance (default 0.01)
     */
    static solve(chain, targetX, targetY, iterations = 10, tolerance = 0.01) {
        if (chain.length < 2) return false;

        // Store original positions
        const positions = chain.map(joint => ({
            x: joint.worldX,
            y: joint.worldY
        }));

        // Calculate bone lengths
        const lengths = [];
        for (let i = 0; i < chain.length - 1; i++) {
            const dx = positions[i + 1].x - positions[i].x;
            const dy = positions[i + 1].y - positions[i].y;
            lengths.push(Math.sqrt(dx * dx + dy * dy));
        }

        // Store root position (fixed)
        const rootX = positions[0].x;
        const rootY = positions[0].y;

        // FABRIK iterations
        for (let iter = 0; iter < iterations; iter++) {
            // Forward reaching - start from end effector
            positions[positions.length - 1].x = targetX;
            positions[positions.length - 1].y = targetY;

            for (let i = positions.length - 2; i >= 0; i--) {
                const dx = positions[i].x - positions[i + 1].x;
                const dy = positions[i].y - positions[i + 1].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 0) {
                    const lambda = lengths[i] / dist;
                    positions[i].x = positions[i + 1].x + dx * lambda;
                    positions[i].y = positions[i + 1].y + dy * lambda;
                }
            }

            // Backward reaching - start from root
            positions[0].x = rootX;
            positions[0].y = rootY;

            for (let i = 0; i < positions.length - 1; i++) {
                const dx = positions[i + 1].x - positions[i].x;
                const dy = positions[i + 1].y - positions[i].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 0) {
                    const lambda = lengths[i] / dist;
                    positions[i + 1].x = positions[i].x + dx * lambda;
                    positions[i + 1].y = positions[i].y + dy * lambda;
                }
            }

            // Check convergence
            const endDx = positions[positions.length - 1].x - targetX;
            const endDy = positions[positions.length - 1].y - targetY;
            const error = Math.sqrt(endDx * endDx + endDy * endDy);

            if (error < tolerance) break;
        }

        // Apply positions back to joints by calculating rotations
        for (let i = 0; i < chain.length - 1; i++) {
            const dx = positions[i + 1].x - positions[i].x;
            const dy = positions[i + 1].y - positions[i].y;
            const angle = Math.atan2(dy, dx);

            const parentRotation = chain[i].parent ? chain[i].parent.worldRotation : 0;
            chain[i].rotation = angle - parentRotation;
        }

        return true;
    }
}

/**
 * IK Helper - High-level IK utilities for skeleton
 */
export class IKHelper {
    /**
     * Solve arm IK (shoulder -> elbow -> wrist)
     */
    static solveArm(skeleton, side, targetX, targetY, poleFactor = -1) {
        const suffix = side === 'left' ? '_L' : '_R';
        const shoulder = skeleton.getJoint(`shoulder${suffix}`);
        const elbow = skeleton.getJoint(`elbow${suffix}`);
        const wrist = skeleton.getJoint(`wrist${suffix}`);

        if (!shoulder || !elbow || !wrist) return false;

        return TwoBoneIK.solve(shoulder, elbow, wrist, targetX, targetY, poleFactor);
    }

    /**
     * Solve leg IK (hip -> knee -> ankle)
     */
    static solveLeg(skeleton, side, targetX, targetY, poleFactor = 1) {
        const suffix = side === 'left' ? '_L' : '_R';
        const hip = skeleton.getJoint(`hip${suffix}`);
        const knee = skeleton.getJoint(`knee${suffix}`);
        const ankle = skeleton.getJoint(`ankle${suffix}`);

        if (!hip || !knee || !ankle) return false;

        return TwoBoneIK.solve(hip, knee, ankle, targetX, targetY, poleFactor);
    }

    /**
     * Solve spine IK using FABRIK
     */
    static solveSpine(skeleton, targetX, targetY) {
        const chain = [
            skeleton.getJoint('pelvis'),
            skeleton.getJoint('spine_lower'),
            skeleton.getJoint('spine_mid'),
            skeleton.getJoint('spine_upper'),
            skeleton.getJoint('chest')
        ].filter(j => j);

        if (chain.length < 2) return false;

        return FABRIK.solve(chain, targetX, targetY);
    }

    /**
     * Look at target (rotate head/neck toward point)
     */
    static lookAt(skeleton, targetX, targetY) {
        const head = skeleton.getJoint('head');
        const neck = skeleton.getJoint('neck');

        if (!head || !neck) return false;

        const dx = targetX - neck.worldX;
        const dy = targetY - neck.worldY;
        const angle = Math.atan2(dy, dx);

        const parentRotation = neck.parent ? neck.parent.worldRotation : 0;
        neck.rotation = (angle - parentRotation) * 0.5; // Partial rotation for natural look

        return true;
    }

    /**
     * Make hand reach toward target with IK
     */
    static reachToward(skeleton, side, targetX, targetY) {
        const result = this.solveArm(skeleton, side, targetX, targetY);
        skeleton.updateAllTransforms();
        return result;
    }

    /**
     * Plant foot at position using IK
     */
    static plantFoot(skeleton, side, targetX, targetY) {
        const result = this.solveLeg(skeleton, side, targetX, targetY);
        skeleton.updateAllTransforms();
        return result;
    }
}

/**
 * IK Constraints - Limit joint rotations for realistic movement
 */
export class IKConstraints {
    static constraints = {
        // Elbow can only bend one direction
        elbow_L: { min: 0, max: 160 },
        elbow_R: { min: 0, max: 160 },

        // Knee can only bend one direction
        knee_L: { min: -160, max: 0 },
        knee_R: { min: -160, max: 0 },

        // Shoulder has wide range
        shoulder_L: { min: -180, max: 180 },
        shoulder_R: { min: -180, max: 180 },

        // Hip has limited range
        hip_L: { min: -90, max: 90 },
        hip_R: { min: -90, max: 90 },

        // Spine segments
        spine_lower: { min: -30, max: 30 },
        spine_mid: { min: -30, max: 30 },
        spine_upper: { min: -30, max: 30 },

        // Neck
        neck: { min: -45, max: 45 }
    };

    /**
     * Apply constraints to a joint
     */
    static applyConstraint(joint) {
        const constraint = this.constraints[joint.name];
        if (!constraint) return;

        const degrees = joint.getRotationDegrees();
        const clamped = Math.max(constraint.min, Math.min(constraint.max, degrees));

        if (clamped !== degrees) {
            joint.setRotationDegrees(clamped);
        }
    }

    /**
     * Apply constraints to all joints in skeleton
     */
    static applyAllConstraints(skeleton) {
        for (const joint of skeleton.getAllJoints()) {
            this.applyConstraint(joint);
        }
    }
}
