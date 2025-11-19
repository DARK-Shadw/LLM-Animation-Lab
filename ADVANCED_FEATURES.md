# Advanced Animation Features Guide

## Overview

LLM Animation Lab now includes professional-grade advanced animation features:
- **Inverse Kinematics (IK)** - Position limbs by clicking targets
- **Ragdoll Physics** - Realistic gravity and collision simulation
- **Procedural Animation** - Real-time generated motion
- **Gemini API Support** - Google's Gemini AI as an alternative to Claude

---

## 1. Inverse Kinematics (IK)

### What is IK?

Instead of manually rotating each joint, IK lets you specify where you want a limb to END UP, and the system automatically calculates the required joint angles.

**Example**: Instead of rotating shoulder (-80°), elbow (90°), and wrist (-20°) to reach a point, you just click where you want the hand to be!

### How to Use IK

1. **Open Advanced Animation Section** in the UI
2. **Click an IK Button**:
   - Position Left Hand
   - Position Right Hand
   - Position Left Foot
   - Position Right Foot

3. **Click on Canvas** where you want the limb to reach
4. The skeleton automatically solves for the joint angles!

### IK Algorithms Implemented

#### Two-Bone IK (Arms & Legs)
- **Perfect for**: Shoulder-Elbow-Wrist and Hip-Knee-Ankle
- **Method**: Law of Cosines for exact analytical solution
- **Features**:
  - Pole vector control (controls elbow/knee bend direction)
  - Automatic unreachable target handling
  - Smooth interpolation

**Example Use Cases**:
- Make character reach for an object
- Plant feet on uneven ground
- Point at something
- Grab/hold animations

#### FABRIK (Spine & Multi-Joint Chains)
- **Forward And Backward Reaching Inverse Kinematics**
- **Perfect for**: Spine bending, tentacles, tails
- **Method**: Iterative constraint satisfaction
- **Features**:
  - Works with any number of joints
  - Fast convergence (typically 3-5 iterations)
  - Natural-looking bends

**Example Use Cases**:
- Bend spine to look at something
- Reach around obstacles
- Full-body IK

### IK Constraints

Realistic joint limits are enforced:
- **Elbows**: 0° to 160° (can't bend backwards)
- **Knees**: -160° to 0° (bend forward only)
- **Shoulders**: -180° to 180° (full rotation)
- **Hips**: -90° to 90° (limited rotation)
- **Spine**: -30° to 30° per segment (prevents over-bending)

### Code Example

```javascript
// Position right hand at specific coordinates
IKHelper.reachToward(skeleton, 'right', targetX, targetY);

// Plant left foot
IKHelper.plantFoot(skeleton, 'left', footX, footY);

// Make character look at point
IKHelper.lookAt(skeleton, targetX, targetY);

// Bend spine toward target
IKHelper.solveSpine(skeleton, targetX, targetY);
```

---

## 2. Ragdoll Physics

### What is Ragdoll Physics?

Simulate realistic falling, collisions, and physical interactions using a physics engine with:
- Gravity simulation
- Collision detection
- Joint constraints
- Verlet integration for stability

### How to Use Ragdoll Physics

#### Method 1: Gradual Activation
1. **Enable Physics Simulation** checkbox
2. Skeleton becomes affected by gravity
3. Falls realistically with proper joint constraints

#### Method 2: Instant Ragdoll
1. **Click "Trigger Ragdoll"** button
2. Character instantly goes limp with a random impulse
3. Falls and bounces realistically

### Physics Controls

- **Enable Physics Simulation**: Toggle physics on/off
- **Trigger Ragdoll**: Instant ragdoll with random force
- **Reset Physics**: Return to T-pose and disable physics
- **Gravity Slider**: Adjust gravity (0-2000 px/s²)
  - 980 = Earth gravity (default)
  - 0 = Zero gravity (float)
  - 2000 = Heavy gravity (fast fall)

### Technical Details

#### Verlet Integration
- Numerically stable physics simulation
- Position-based dynamics
- No explicit velocity storage (implicit in position history)

**Update Formula**:
```
newPosition = position + (position - prevPosition) * damping + acceleration * dt²
```

#### Constraint Solving
Two types of constraints:
1. **Distance Constraints**: Maintain bone lengths
2. **Angular Constraints**: Limit joint rotations

Constraints are solved iteratively (5 iterations) for stability.

#### Particle System
Each joint is a physics particle with:
- Position (current and previous)
- Mass (different per body part)
- Acceleration
- Pinned state (optional)

#### Collision Detection
- Ground plane collision at configurable Y position
- Bounce response with damping
- Prevents falling through floor

### Use Cases

- Death animations in games
- Knockout effects
- Falling from heights
- Explosion ragdolls
- Realistic impacts
- Physics-based comedy

### Code Example

```javascript
// Enable physics
ragdollPhysics.enable();

// Trigger ragdoll with force
ragdollPhysics.triggerRagdoll(forceX, forceY);

// Apply impulse to specific joint
ragdollPhysics.applyImpulse('chest', 500, -200);

// Pin a joint (make immovable)
ragdollPhysics.pinJoint('pelvis');

// Adjust gravity
ragdollPhysics.gravity = 1500; // Heavier gravity

// Reset everything
ragdollPhysics.reset();
```

---

## 3. Procedural Animation

### What is Procedural Animation?

Real-time generated animation using mathematical functions instead of keyframes. Results in:
- Infinite loops without repetition
- Dynamic responses to parameters
- Lightweight (no storage needed)
- Adjustable on-the-fly

### Procedural Animations Available

#### Walk Cycle
- **Realistic walking motion**
- Alternating leg movement
- Opposite arm swing
- Spine sway
- Speed adjustable

**Features**:
- Sine wave-based leg phases
- Natural foot lifting
- Counter-balancing arms
- Subtle torso rotation

#### Breathing Idle
- **Subtle chest movement**
- Natural breathing rhythm
- Spine compression/expansion
- Perfect for idle states

**Features**:
- Slow breathing frequency (0.5 Hz)
- Cascading spine movement
- Diminishing amplitude up spine
- Realistic breathing pattern

### How to Use Procedural Animation

1. **Click "Procedural Walk"** - Starts walk cycle
2. **Click "Breathing Idle"** - Starts breathing
3. **Click Again** - Stops procedural animation

Procedural animations run in real-time and can be stopped/started instantly.

### Technical Details

#### Walk Cycle Algorithm
```javascript
walkPhase = sin(time * speed * 2)
leftLegRotation = sin(walkPhase) * 30
rightLegRotation = sin(walkPhase + PI) * 30
leftArmRotation = -rightLegRotation * 0.66
rightArmRotation = -leftLegRotation * 0.66
spineRotation = sin(walkPhase * 2) * 5
```

#### Breathing Algorithm
```javascript
breathPhase = sin(time * 0.5)
breathAmount = breathPhase * 3
spine_lower = breathAmount
spine_mid = breathAmount * 0.8
chest = breathAmount * 0.6
```

### Use Cases

- Idle animations (breathing, fidgeting)
- Locomotion (walking, running)
- Environmental reactions (wind, swaying)
- Continuous background motion
- Demo/preview modes

### Code Example

```javascript
// Generate walk cycle
ProceduralAnimation.generateWalkCycle(skeleton, speed, time);

// Generate breathing
ProceduralAnimation.generateIdleBreathing(skeleton, time);

// Head tracking
ProceduralAnimation.generateHeadTracking(skeleton, targetX, targetY, blend);
```

---

## 4. Gemini API Support

### What is Gemini?

Google's Gemini is a powerful Large Language Model that can generate animations just like Claude!

### Why Multiple APIs?

- **Fallback**: If one API is down, use the other
- **Cost Optimization**: Choose cheaper option
- **Feature Comparison**: Test different LLM capabilities
- **Access**: Use whichever API you have access to

### How to Use Gemini

1. **Get Gemini API Key**:
   - Visit [aistudio.google.com](https://aistudio.google.com)
   - Sign in with Google account
   - Click "Get API Key"
   - Copy your key

2. **Configure in App**:
   - Open Settings section
   - Select **"Gemini (Google)"** from AI Provider dropdown
   - Paste your API key
   - Generate animations!

### API Provider Options

| Provider | Model | Cost | Speed | Notes |
|----------|-------|------|-------|-------|
| **Demo Mode** | N/A | Free | Instant | 6 predefined animations |
| **Claude** | Sonnet 3.5 | ~$0.02/anim | Fast | Excellent animation quality |
| **Gemini** | 1.5 Pro | ~$0.01/anim | Fast | Good animation quality |

### Technical Details

#### Claude API Format
```javascript
{
  model: "claude-3-5-sonnet-20241022",
  system: systemPrompt,
  messages: [{ role: "user", content: prompt }]
}
```

#### Gemini API Format
```javascript
{
  contents: [{
    role: "user",
    parts: [{ text: systemPrompt + prompt }]
  }],
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 4096
  }
}
```

### Switching Providers

The system handles API differences automatically:
- Different endpoints
- Different auth methods
- Different request formats
- Different response parsing
- Unified error handling

### Code Example

```javascript
// Initialize with provider
const llmEngine = new LLMAnimationEngine(apiKey, 'gemini');

// Change provider later
llmEngine.setProvider('claude');

// Generate animation (works with both)
const animation = await llmEngine.generateAnimation(prompt, skeleton);
```

---

## Animation Mode Priority

The system handles multiple animation modes with this priority:

1. **Physics** (highest priority)
   - When enabled, overrides everything
   - Skeleton is physics-driven

2. **Procedural Animation**
   - When active, runs continuously
   - Overrides keyframe playback

3. **Keyframe Animation** (default)
   - LLM-generated or demo animations
   - Timeline-based playback

4. **IK Posing** (manual)
   - One-time positioning
   - Pauses other modes while active

---

## Combining Features

### Example Workflows

#### 1. Realistic Fall Sequence
1. Use LLM to generate "character stands on edge"
2. Play animation to position
3. Pause at peak
4. **Trigger Ragdoll** - realistic fall!

#### 2. Reaching Animation
1. Use LLM to generate "character looks up"
2. When animation completes
3. **Use IK** to position hand reaching
4. **Use IK** to plant feet firmly

#### 3. Walking Character
1. Start **Procedural Walk**
2. Character walks in place
3. Optionally enable physics for foot collisions
4. Adjust gravity for different feels (moon walk!)

#### 4. Idle with Variation
1. Use LLM to generate idle pose
2. Play once to get in position
3. Start **Breathing Idle**
4. Character breathes naturally forever

---

## Performance Tips

1. **Physics**:
   - Disable when not needed
   - Lower constraint iterations (faster but less stable)
   - Reduce gravity for slower motion

2. **Procedural**:
   - Very lightweight, always runs at 60 FPS
   - Can run multiple simultaneously

3. **IK**:
   - Instant calculation
   - No performance impact
   - Can be called every frame for tracking

4. **LLM Generation**:
   - 1-3 seconds per request
   - Cache animations locally
   - Use demo mode for testing

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Space** | Play/Pause |
| **R** | Reset animation |
| **P** | Toggle physics |
| **G** | Trigger ragdoll |
| **1-4** | IK mode (arms/legs) |
| **W** | Procedural walk |
| **I** | Breathing idle |

*(Note: Shortcuts can be added by modifying event listeners in main.js)*

---

## Troubleshooting

### IK Target Unreachable
**Problem**: "Target out of reach" message
**Solution**: Click closer to the character or within arm/leg length

### Physics Goes Wild
**Problem**: Character flies off screen
**Solution**:
- Lower gravity
- Reduce constraint iterations
- Reset physics and try again

### Procedural Animation Jittery
**Problem**: Motion looks choppy
**Solution**:
- Check browser performance
- Close other tabs
- Reduce other animations

### Gemini API Not Working
**Problem**: Authentication errors
**Solution**:
- Verify API key is correct
- Check API key has no extra spaces
- Ensure billing is enabled on Google Cloud
- Try Claude API as fallback

---

## API Cost Comparison

### Per Animation Generation

| Provider | Input Tokens | Output Tokens | Cost |
|----------|--------------|---------------|------|
| Claude Sonnet 3.5 | ~800 | ~500 | $0.018 |
| Gemini 1.5 Pro | ~800 | ~500 | $0.009 |
| Demo Mode | 0 | 0 | $0.000 |

**Note**: Costs are approximate and may vary. Demo mode is always free!

---

## Future Enhancement Ideas

- [ ] Inverse Kinematics for full body (all limbs simultaneously)
- [ ] Motion capture data import
- [ ] Physics-based cloth simulation
- [ ] Character-to-character collision
- [ ] Advanced constraints (hinge, spring, motor)
- [ ] Animation blending (transition between modes)
- [ ] Bone scaling and mesh deformation
- [ ] Particle effects (dust, impacts)
- [ ] Sound integration (footsteps, impacts)

---

## Developer API

### IK Module

```javascript
import { TwoBoneIK, FABRIK, IKHelper, IKConstraints } from './ik-solver.js';

// Two-bone IK
TwoBoneIK.solve(shoulderJoint, elbowJoint, wristJoint, targetX, targetY, poleFactor);

// FABRIK
const chain = [joint1, joint2, joint3, joint4];
FABRIK.solve(chain, targetX, targetY, iterations, tolerance);

// Helper functions
IKHelper.solveArm(skeleton, 'left', targetX, targetY);
IKHelper.solveLeg(skeleton, 'right', targetX, targetY);
IKHelper.lookAt(skeleton, targetX, targetY);

// Constraints
IKConstraints.applyConstraint(joint);
IKConstraints.applyAllConstraints(skeleton);
```

### Physics Module

```javascript
import { RagdollPhysics, ProceduralAnimation } from './physics.js';

// Ragdoll
const ragdoll = new RagdollPhysics(skeleton);
ragdoll.enable();
ragdoll.gravity = 980;
ragdoll.update(deltaTime);
ragdoll.triggerRagdoll(forceX, forceY);

// Procedural
ProceduralAnimation.generateWalkCycle(skeleton, speed, time);
ProceduralAnimation.generateIdleBreathing(skeleton, time);
ProceduralAnimation.generateHeadTracking(skeleton, targetX, targetY, blend);
```

### LLM Module

```javascript
import { LLMAnimationEngine } from './llm-engine.js';

// Initialize
const engine = new LLMAnimationEngine(apiKey, 'gemini');

// Generate
const animation = await engine.generateAnimation("jump high", skeleton);

// Switch provider
engine.setProvider('claude');
engine.apiKey = newKey;
```

---

## Credits

**Advanced Features Implemented**: November 2025

**Technologies**:
- Two-bone IK Algorithm
- FABRIK (Aristidou & Lasenby, 2011)
- Verlet Integration (1791)
- Procedural Animation Techniques
- Claude API (Anthropic)
- Gemini API (Google)

**Powered by**: HTML5 Canvas, JavaScript ES6+, Advanced Mathematics

---

**Ready to create professional animations with advanced control!** 🚀✨
