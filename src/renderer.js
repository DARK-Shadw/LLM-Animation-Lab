/**
 * Renderer - Canvas-based 2D Skeleton Visualization
 *
 * This module handles:
 * - Drawing skeleton bones and joints
 * - Camera positioning and zoom
 * - Visual styling and effects
 * - Real-time rendering updates
 */

export class SkeletonRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Camera settings
        this.cameraX = canvas.width / 2;
        this.cameraY = canvas.height / 2 + 100; // Offset down a bit
        this.zoom = 2.5; // Scale factor

        // Visual settings
        this.showBones = true;
        this.showJoints = true;
        this.showNames = false;

        // Colors
        this.colors = {
            background: '#1a2332',
            bone: '#6366f1',
            joint: '#8b5cf6',
            jointHighlight: '#a78bfa',
            text: '#f1f5f9',
            grid: '#2d3748'
        };

        // Animation state
        this.animationFrameId = null;
    }

    /**
     * Clear the canvas
     */
    clear() {
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Draw a grid for reference
     */
    drawGrid() {
        const gridSize = 50;
        this.ctx.strokeStyle = this.colors.grid;
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = 0.3;

        const startX = -this.cameraX;
        const startY = -this.cameraY;
        const endX = this.canvas.width - this.cameraX;
        const endY = this.canvas.height - this.cameraY;

        // Vertical lines
        for (let x = Math.floor(startX / gridSize) * gridSize; x < endX; x += gridSize) {
            const screenX = this.worldToScreenX(x);
            this.ctx.beginPath();
            this.ctx.moveTo(screenX, 0);
            this.ctx.lineTo(screenX, this.canvas.height);
            this.ctx.stroke();
        }

        // Horizontal lines
        for (let y = Math.floor(startY / gridSize) * gridSize; y < endY; y += gridSize) {
            const screenY = this.worldToScreenY(y);
            this.ctx.beginPath();
            this.ctx.moveTo(0, screenY);
            this.ctx.lineTo(this.canvas.width, screenY);
            this.ctx.stroke();
        }

        this.ctx.globalAlpha = 1.0;
    }

    /**
     * Convert world coordinates to screen coordinates
     */
    worldToScreenX(worldX) {
        return this.cameraX + worldX * this.zoom;
    }

    worldToScreenY(worldY) {
        return this.cameraY - worldY * this.zoom; // Invert Y axis
    }

    /**
     * Draw the skeleton
     */
    drawSkeleton(skeleton) {
        this.clear();
        this.drawGrid();

        if (!skeleton) return;

        // Update skeleton transforms
        skeleton.updateAllTransforms();

        // Draw bones first (so joints appear on top)
        if (this.showBones) {
            this.drawBones(skeleton);
        }

        // Draw joints
        if (this.showJoints) {
            this.drawJoints(skeleton);
        }

        // Draw joint names if enabled
        if (this.showNames) {
            this.drawJointNames(skeleton);
        }
    }

    /**
     * Draw all bones
     */
    drawBones(skeleton) {
        const bones = skeleton.getBones();

        this.ctx.strokeStyle = this.colors.bone;
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';
        this.ctx.globalAlpha = 0.8;

        for (const bone of bones) {
            const startX = this.worldToScreenX(bone.start.worldX);
            const startY = this.worldToScreenY(bone.start.worldY);
            const endX = this.worldToScreenX(bone.end.worldX);
            const endY = this.worldToScreenY(bone.end.worldY);

            // Draw bone as a line
            this.ctx.beginPath();
            this.ctx.moveTo(startX, startY);
            this.ctx.lineTo(endX, endY);
            this.ctx.stroke();

            // Add a gradient effect for depth
            const gradient = this.ctx.createLinearGradient(startX, startY, endX, endY);
            gradient.addColorStop(0, this.colors.bone);
            gradient.addColorStop(1, this.colors.jointHighlight);
            this.ctx.strokeStyle = gradient;
            this.ctx.stroke();
            this.ctx.strokeStyle = this.colors.bone;
        }

        this.ctx.globalAlpha = 1.0;
    }

    /**
     * Draw all joints
     */
    drawJoints(skeleton) {
        const joints = skeleton.getAllJoints();

        for (const joint of joints) {
            const screenX = this.worldToScreenX(joint.worldX);
            const screenY = this.worldToScreenY(joint.worldY);

            // Determine joint size based on hierarchy
            const isRoot = joint === skeleton.rootJoint;
            const radius = isRoot ? 8 : 5;

            // Draw joint outer circle (shadow)
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.beginPath();
            this.ctx.arc(screenX + 1, screenY + 1, radius, 0, Math.PI * 2);
            this.ctx.fill();

            // Draw joint main circle
            this.ctx.fillStyle = isRoot ? this.colors.jointHighlight : this.colors.joint;
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
            this.ctx.fill();

            // Draw joint inner highlight
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            this.ctx.beginPath();
            this.ctx.arc(screenX - 1, screenY - 1, radius * 0.4, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    /**
     * Draw joint names
     */
    drawJointNames(skeleton) {
        const joints = skeleton.getAllJoints();

        this.ctx.fillStyle = this.colors.text;
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';

        for (const joint of joints) {
            const screenX = this.worldToScreenX(joint.worldX);
            const screenY = this.worldToScreenY(joint.worldY);

            // Draw text background
            const textWidth = this.ctx.measureText(joint.name).width;
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(screenX - textWidth / 2 - 2, screenY + 8, textWidth + 4, 12);

            // Draw text
            this.ctx.fillStyle = this.colors.text;
            this.ctx.fillText(joint.name, screenX, screenY + 10);
        }
    }

    /**
     * Set camera position
     */
    setCamera(x, y) {
        this.cameraX = x;
        this.cameraY = y;
    }

    /**
     * Set zoom level
     */
    setZoom(zoom) {
        this.zoom = Math.max(0.5, Math.min(zoom, 5.0));
    }

    /**
     * Center camera on skeleton
     */
    centerOnSkeleton(skeleton) {
        if (skeleton && skeleton.rootJoint) {
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2 + 50;

            this.cameraX = centerX - skeleton.rootJoint.worldX * this.zoom;
            this.cameraY = centerY + skeleton.rootJoint.worldY * this.zoom;
        }
    }

    /**
     * Update visual settings
     */
    setShowBones(show) {
        this.showBones = show;
    }

    setShowJoints(show) {
        this.showJoints = show;
    }

    setShowNames(show) {
        this.showNames = show;
    }

    /**
     * Handle canvas resize
     */
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.cameraX = width / 2;
        this.cameraY = height / 2 + 100;
    }

    /**
     * Start animation loop
     */
    startRenderLoop(callback) {
        const render = () => {
            callback();
            this.animationFrameId = requestAnimationFrame(render);
        };
        render();
    }

    /**
     * Stop animation loop
     */
    stopRenderLoop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
}
