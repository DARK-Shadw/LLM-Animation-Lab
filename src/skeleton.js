/**
 * Skeleton System - Hierarchical 2D Bone Structure
 *
 * This module implements a professional 2D skeletal rigging system with:
 * - Hierarchical bone relationships (parent-child)
 * - Forward Kinematics (FK) for pose calculation
 * - Local and world space transformations
 * - Proper joint rotation and positioning
 */

export class Joint {
    constructor(name, x, y, parent = null) {
        this.name = name;
        this.localX = x;
        this.localY = y;
        this.parent = parent;
        this.children = [];

        // Rotation in radians (local space)
        this.rotation = 0;

        // World space position (calculated)
        this.worldX = 0;
        this.worldY = 0;
        this.worldRotation = 0;

        if (parent) {
            parent.children.push(this);
        }
    }

    /**
     * Update world position based on parent transformations
     */
    updateWorldTransform() {
        if (this.parent) {
            // Apply parent's rotation to local position
            const cos = Math.cos(this.parent.worldRotation);
            const sin = Math.sin(this.parent.worldRotation);

            this.worldX = this.parent.worldX + (this.localX * cos - this.localY * sin);
            this.worldY = this.parent.worldY + (this.localX * sin + this.localY * cos);
            this.worldRotation = this.parent.worldRotation + this.rotation;
        } else {
            // Root joint - world position is same as local
            this.worldX = this.localX;
            this.worldY = this.localY;
            this.worldRotation = this.rotation;
        }

        // Recursively update children
        for (const child of this.children) {
            child.updateWorldTransform();
        }
    }

    /**
     * Set rotation in degrees (converts to radians internally)
     */
    setRotationDegrees(degrees) {
        this.rotation = degrees * Math.PI / 180;
    }

    /**
     * Get rotation in degrees
     */
    getRotationDegrees() {
        return this.rotation * 180 / Math.PI;
    }
}

export class Skeleton {
    constructor() {
        this.joints = {};
        this.rootJoint = null;
        this.initializeHumanoidSkeleton();
    }

    /**
     * Initialize a standard humanoid skeleton with proper proportions
     */
    initializeHumanoidSkeleton() {
        // Root (pelvis/hips)
        this.rootJoint = new Joint('pelvis', 0, 0, null);
        this.joints['pelvis'] = this.rootJoint;

        // Spine
        this.joints['spine_lower'] = new Joint('spine_lower', 0, 30, this.rootJoint);
        this.joints['spine_mid'] = new Joint('spine_mid', 0, 25, this.joints['spine_lower']);
        this.joints['spine_upper'] = new Joint('spine_upper', 0, 25, this.joints['spine_mid']);
        this.joints['chest'] = new Joint('chest', 0, 20, this.joints['spine_upper']);

        // Neck and Head
        this.joints['neck'] = new Joint('neck', 0, 15, this.joints['chest']);
        this.joints['head'] = new Joint('head', 0, 20, this.joints['neck']);

        // Left Arm
        this.joints['shoulder_L'] = new Joint('shoulder_L', -15, 10, this.joints['chest']);
        this.joints['elbow_L'] = new Joint('elbow_L', -30, 0, this.joints['shoulder_L']);
        this.joints['wrist_L'] = new Joint('wrist_L', -25, 0, this.joints['elbow_L']);
        this.joints['hand_L'] = new Joint('hand_L', -10, 0, this.joints['wrist_L']);

        // Right Arm
        this.joints['shoulder_R'] = new Joint('shoulder_R', 15, 10, this.joints['chest']);
        this.joints['elbow_R'] = new Joint('elbow_R', 30, 0, this.joints['shoulder_R']);
        this.joints['wrist_R'] = new Joint('wrist_R', 25, 0, this.joints['elbow_R']);
        this.joints['hand_R'] = new Joint('hand_R', 10, 0, this.joints['wrist_R']);

        // Left Leg
        this.joints['hip_L'] = new Joint('hip_L', -10, -5, this.rootJoint);
        this.joints['knee_L'] = new Joint('knee_L', 0, -40, this.joints['hip_L']);
        this.joints['ankle_L'] = new Joint('ankle_L', 0, -40, this.joints['knee_L']);
        this.joints['foot_L'] = new Joint('foot_L', 10, -5, this.joints['ankle_L']);

        // Right Leg
        this.joints['hip_R'] = new Joint('hip_R', 10, -5, this.rootJoint);
        this.joints['knee_R'] = new Joint('knee_R', 0, -40, this.joints['hip_R']);
        this.joints['ankle_R'] = new Joint('ankle_R', 0, -40, this.joints['knee_R']);
        this.joints['foot_R'] = new Joint('foot_R', 10, -5, this.joints['ankle_R']);

        this.updateAllTransforms();
    }

    /**
     * Update all joint world transforms from root
     */
    updateAllTransforms() {
        if (this.rootJoint) {
            this.rootJoint.updateWorldTransform();
        }
    }

    /**
     * Get a joint by name
     */
    getJoint(name) {
        return this.joints[name];
    }

    /**
     * Set joint rotation by name (in degrees)
     */
    setJointRotation(name, degrees) {
        const joint = this.joints[name];
        if (joint) {
            joint.setRotationDegrees(degrees);
        }
    }

    /**
     * Set multiple joint rotations at once
     */
    setJointRotations(rotations) {
        for (const [name, degrees] of Object.entries(rotations)) {
            this.setJointRotation(name, degrees);
        }
        this.updateAllTransforms();
    }

    /**
     * Set root position
     */
    setRootPosition(x, y) {
        if (this.rootJoint) {
            this.rootJoint.localX = x;
            this.rootJoint.localY = y;
            this.updateAllTransforms();
        }
    }

    /**
     * Get current pose as a snapshot of all joint rotations and positions
     */
    getPose() {
        const pose = {
            rootX: this.rootJoint.localX,
            rootY: this.rootJoint.localY,
            rotations: {}
        };

        for (const [name, joint] of Object.entries(this.joints)) {
            if (joint !== this.rootJoint) {
                pose.rotations[name] = joint.getRotationDegrees();
            }
        }

        return pose;
    }

    /**
     * Apply a pose to the skeleton
     */
    setPose(pose) {
        if (pose.rootX !== undefined && pose.rootY !== undefined) {
            this.setRootPosition(pose.rootX, pose.rootY);
        }

        if (pose.rotations) {
            this.setJointRotations(pose.rotations);
        }
    }

    /**
     * Reset to T-pose (neutral stance)
     */
    resetToTPose() {
        for (const joint of Object.values(this.joints)) {
            joint.rotation = 0;
        }
        this.setRootPosition(0, 0);
        this.updateAllTransforms();
    }

    /**
     * Get all joints as an array for iteration
     */
    getAllJoints() {
        return Object.values(this.joints);
    }

    /**
     * Get bone connections (pairs of joints that form bones)
     */
    getBones() {
        const bones = [];
        for (const joint of Object.values(this.joints)) {
            if (joint.parent) {
                bones.push({
                    start: joint.parent,
                    end: joint,
                    name: `${joint.parent.name}-${joint.name}`
                });
            }
        }
        return bones;
    }
}
