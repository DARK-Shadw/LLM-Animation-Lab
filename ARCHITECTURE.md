# System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                        │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │  Prompt    │  │   Playback   │  │     Settings        │ │
│  │  Input     │  │   Controls   │  │   & Visualization   │ │
│  └────────────┘  └──────────────┘  └─────────────────────┘ │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Main Application Controller                 │
│         (Event Handling & State Management)                  │
└──┬────────┬────────────┬──────────────┬────────────────┬────┘
   │        │            │              │                │
   │        │            │              │                │
   ▼        ▼            ▼              ▼                ▼
┌──────┐ ┌─────┐  ┌──────────┐  ┌────────────┐  ┌──────────┐
│Skele-│ │Anim-│  │ Renderer │  │LLM Engine  │  │  Canvas  │
│ton   │ │ation│  │          │  │            │  │   API    │
│      │ │ Player│ │          │  │            │  │          │
└──────┘ └─────┘  └──────────┘  └────────────┘  └──────────┘
   │        │            │              │                │
   │        │            │              ▼                │
   │        │            │      ┌──────────────┐        │
   │        │            │      │ Claude API   │        │
   │        │            │      │  (Optional)  │        │
   │        │            │      └──────────────┘        │
   │        │            │                               │
   └────────┴────────────┴───────────────────────────────┘
                         │
                         ▼
              ┌──────────────────┐
              │  HTML5 Canvas    │
              │  (Visual Output) │
              └──────────────────┘
```

## Data Flow

### Animation Generation Flow

```
User Input
   │
   ▼
┌─────────────────────────┐
│  "Make character jump"  │  ← Natural Language Prompt
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│    LLM Engine           │
│  ┌─────────────────┐    │
│  │ Has API Key?    │────┼──NO──→ Demo Mode
│  └────────┬────────┘    │          │
│           │ YES         │          ▼
│           ▼             │    ┌──────────────┐
│  ┌─────────────────┐    │    │  Predefined  │
│  │  Claude API     │    │    │  Animation   │
│  │  Call           │    │    └──────┬───────┘
│  └────────┬────────┘    │           │
│           │             │           │
└───────────┼─────────────┘           │
            │                         │
            ▼                         │
   ┌────────────────┐                 │
   │  JSON Response │                 │
   │  Keyframe Data │                 │
   └────────┬───────┘                 │
            │                         │
            └────────┬────────────────┘
                     │
                     ▼
          ┌──────────────────┐
          │  Animation Object│
          │  - Keyframes     │
          │  - Duration      │
          │  - Easing        │
          └─────────┬────────┘
                    │
                    ▼
          ┌──────────────────┐
          │ Animation Player │
          └─────────┬────────┘
                    │
                    ▼
                 Playback
```

### Rendering Pipeline

```
Animation Player
   │
   ▼
┌────────────────────────┐
│ Get Pose at Time       │  ← Current playback time
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│ Find Surrounding       │
│ Keyframes              │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│ Interpolate Poses      │  ← Easing function applied
│ - Root position        │
│ - Joint rotations      │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│ Apply to Skeleton      │
│ skeleton.setPose()     │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│ Update Transforms      │  ← Forward kinematics
│ - World positions      │
│ - World rotations      │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│ Renderer               │
│ - Draw grid            │
│ - Draw bones           │
│ - Draw joints          │
│ - Draw labels          │
└───────────┬────────────┘
            │
            ▼
     Canvas Display
```

## Component Details

### Skeleton System

```
Skeleton
├── joints: Map<string, Joint>
├── rootJoint: Joint (pelvis)
└── methods:
    ├── updateAllTransforms()
    ├── setJointRotations()
    ├── getPose()
    ├── setPose()
    └── getBones()

Joint
├── name: string
├── parent: Joint | null
├── children: Joint[]
├── localX, localY: number
├── rotation: number (radians)
├── worldX, worldY: number
├── worldRotation: number
└── methods:
    ├── updateWorldTransform()  ← Forward kinematics
    └── setRotationDegrees()
```

### Animation System

```
Animation
├── name: string
├── keyframes: Keyframe[]
├── duration: number
└── methods:
    ├── addKeyframe()
    ├── getPoseAtTime()  ← Main interpolation
    └── interpolatePoses()

Keyframe
├── time: number
├── pose: Pose
└── easing: Function

AnimationPlayer
├── skeleton: Skeleton
├── animation: Animation
├── currentTime: number
├── isPlaying: boolean
├── loop: boolean
├── speed: number
└── methods:
    ├── play()
    ├── pause()
    ├── seek()
    └── update()  ← Called each frame
```

### Renderer

```
SkeletonRenderer
├── canvas: HTMLCanvasElement
├── ctx: CanvasRenderingContext2D
├── cameraX, cameraY: number
├── zoom: number
├── showBones, showJoints, showNames: boolean
└── methods:
    ├── clear()
    ├── drawGrid()
    ├── drawSkeleton()
    ├── drawBones()
    ├── drawJoints()
    ├── drawJointNames()
    └── worldToScreen()
```

### LLM Engine

```
LLMAnimationEngine
├── apiKey: string | null
├── model: string
└── methods:
    ├── generateAnimation()
    │   ├── buildSystemPrompt()
    │   ├── callClaudeAPI()
    │   └── parseAnimationResponse()
    │
    └── generateDemoAnimation()
        ├── createWaveAnimation()
        ├── createJumpAnimation()
        ├── createVictoryDanceAnimation()
        ├── createBackflipAnimation()
        ├── createWalkAnimation()
        └── createReachAnimation()
```

## Coordinate Systems

### Local vs World Space

```
Local Space (relative to parent):
  Joint stores: localX, localY, rotation

World Space (absolute position):
  Calculated: worldX, worldY, worldRotation

Example:
  elbow_L (local):
    - localX: -30 (30 units from shoulder)
    - localY: 0
    - rotation: 90° (bent)

  elbow_L (world):
    - worldX: shoulder.worldX + rotated(localX, localY)
    - worldY: shoulder.worldY + rotated(localX, localY)
    - worldRotation: shoulder.worldRotation + 90°
```

### Canvas Coordinate Mapping

```
World Space        →  Screen Space
   Y ↑                   Y ↓
   |                      |
   |                      |
   +--→ X                 +--→ X

screenX = cameraX + worldX * zoom
screenY = cameraY - worldY * zoom  (Y inverted!)
```

## Animation Interpolation

### Keyframe Interpolation Process

```
Given:
  - Time t = 0.75 seconds
  - Keyframe A at t=0.5s
  - Keyframe B at t=1.0s

Step 1: Calculate normalized time
  tNorm = (0.75 - 0.5) / (1.0 - 0.5)
        = 0.25 / 0.5
        = 0.5

Step 2: Apply easing function
  tEased = easeInOutCubic(0.5)
         = 0.5  (happens to be same for cubic at 0.5)

Step 3: Interpolate values
  For each joint:
    rotation = lerp(rotationA, rotationB, tEased)
             = rotationA + (rotationB - rotationA) * tEased

  For root position:
    rootX = lerp(rootXA, rootXB, tEased)
    rootY = lerp(rootYA, rootYB, tEased)
```

### Easing Function Curves

```
Linear:             EaseInOutCubic:     EaseOutBounce:
 1│  ┌─────          1│      ┌─           1│     ┌─┐
  │ /               │     ┌─┘             │    ┌┘ └┐┌┐
  │/                │   ┌─┘               │  ┌─┘   └┘
 0└─────            0└──┘                 0└──┘
  0    1             0      1              0        1
```

## File Dependencies

```
index.html
   │
   ├─→ styles.css
   │
   └─→ src/main.js (module)
          │
          ├─→ skeleton.js
          │      └─→ exports: Skeleton, Joint
          │
          ├─→ animation.js
          │      └─→ exports: Animation, AnimationPlayer, Easing
          │
          ├─→ renderer.js
          │      └─→ exports: SkeletonRenderer
          │
          └─→ llm-engine.js
                 ├─→ imports: Animation, Easing
                 └─→ exports: LLMAnimationEngine
```

## State Management

### Application State

```
AnimationApp
├── Components
│   ├── skeleton: Skeleton
│   ├── renderer: SkeletonRenderer
│   ├── player: AnimationPlayer
│   └── llmEngine: LLMAnimationEngine
│
├── UI State
│   ├── showBones: boolean
│   ├── showJoints: boolean
│   ├── showNames: boolean
│   ├── loop: boolean
│   └── speed: number
│
└── Runtime State
    ├── isPlaying: boolean
    ├── currentTime: number
    └── currentAnimation: Animation | null
```

### Event Flow

```
User Action
   │
   ▼
Event Listener
   │
   ▼
State Update
   │
   ├─→ Update UI Elements
   │
   ├─→ Update Components
   │
   └─→ Trigger Render
```

## Performance Considerations

### Render Loop

```
requestAnimationFrame() ← 60 FPS target
   │
   ├─→ Update Animation (if playing)
   │     ├─→ Calculate current time
   │     ├─→ Get interpolated pose
   │     └─→ Apply to skeleton
   │
   ├─→ Update UI (timeline, time display)
   │
   └─→ Render Frame
         ├─→ Clear canvas
         ├─→ Draw grid
         ├─→ Draw bones (~20 draw calls)
         ├─→ Draw joints (~21 draw calls)
         └─→ Draw labels (if enabled)
```

### Optimization Strategies

1. **Transform Caching**: World transforms only calculated when needed
2. **Conditional Rendering**: Skip hidden elements (bones/joints/labels)
3. **Canvas Optimization**: Batch similar draw operations
4. **Event Throttling**: Timeline updates limited during playback
5. **LocalStorage**: API key cached to avoid re-entry

## Security Considerations

### API Key Handling

```
Input: User enters API key
   │
   ▼
Validate: Check format (sk-ant-...)
   │
   ▼
Store: localStorage.setItem('claude_api_key', key)
   │
   ▼
Use: Only sent to api.anthropic.com
   │
   ▼
Clear: localStorage.removeItem() on logout
```

### Data Flow Security

- API keys never logged or exposed
- No server-side storage (client-side only)
- HTTPS enforced for API calls
- No third-party analytics or tracking

## Extension Points

### Adding New Joints

```javascript
// In skeleton.js initializeHumanoidSkeleton()
this.joints['new_joint'] = new Joint(
  'new_joint',
  localX,
  localY,
  parentJoint
);
```

### Adding New Easing Functions

```javascript
// In animation.js Easing object
export const Easing = {
  ...existing,
  customEase: (t) => {
    // Your easing formula
    return transformedT;
  }
};
```

### Adding New Demo Animations

```javascript
// In llm-engine.js
createCustomAnimation() {
  const animation = new Animation('Custom');
  animation.addKeyframe(/* ... */);
  return animation;
}
```

---

This architecture enables:
- Clear separation of concerns
- Easy testing and debugging
- Simple extension and modification
- Professional code organization
- Maintainable codebase
