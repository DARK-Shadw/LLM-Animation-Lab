# LLM Animation Lab

**AI-Powered 2D Skeleton Animation System**

Create character animations through natural language. Simply describe the movement you want, and watch as AI brings it to life.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Overview

LLM Animation Lab is an innovative animation application that uses Large Language Models to generate skeletal character animations from natural language descriptions. This represents a paradigm shift in animation creation - no animation expertise required, just describe what you want!

### Key Features

- **Natural Language Animation**: Describe movements in plain English
- **LLM Animation Engine**: AI understands motion, physics, and animation principles
- **Professional Skeleton System**: Hierarchical 2D rigging with proper joint relationships
- **Smooth Interpolation**: Multiple easing functions for natural-looking motion
- **Real-time Playback**: Interactive controls with timeline, speed adjustment, and looping
- **Demo Mode**: Works without API key using predefined animations
- **Web-Based**: No installation required, runs in any modern browser

## Quick Start

### Option 1: Run Locally

1. Clone this repository:
```bash
git clone https://github.com/DARK-Shadw/LLM-Animation-Lab.git
cd LLM-Animation-Lab
```

2. Serve the files using any web server:
```bash
# Using Python 3
python -m http.server 8000

# Using Node.js
npx serve

# Using PHP
php -S localhost:8000
```

3. Open your browser to `http://localhost:8000`

### Option 2: Demo Mode (No API Key Required)

Simply open `index.html` in your browser! The app includes predefined animations that work without any API key:

- Wave hello
- Jump
- Victory dance
- Backflip
- Walk cycle
- Reach up

### Option 3: Full LLM Mode (Requires API Key)

1. Get your Anthropic API key from [console.anthropic.com](https://console.anthropic.com)
2. Open the Settings section in the app
3. Enter your API key
4. Start generating custom animations!

## How to Use

### Basic Usage

1. **Enter a Prompt**: Describe the animation you want
   ```
   "Make the character do a backflip"
   "Have the character wave hello enthusiastically"
   "Create a celebratory victory dance"
   ```

2. **Generate**: Click "Generate Animation" or press Enter

3. **Watch**: The animation plays automatically

4. **Control Playback**:
   - Play/Pause/Reset buttons
   - Adjust speed (0.25x to 2.0x)
   - Enable/disable looping
   - Scrub through timeline

### Example Prompts

**Simple Actions**:
- "Wave goodbye"
- "Jump in the air"
- "Bow respectfully"
- "Stretch arms overhead"

**Complex Movements**:
- "Do a backflip and land smoothly"
- "Walk forward slowly and tiredly"
- "Jump and reach for something high"
- "Fall dramatically to the ground"

**Emotional Expressions**:
- "Celebrate with an enthusiastic victory dance"
- "Slump shoulders in defeat"
- "Jump excitedly with arms raised"
- "Shake fist angrily"

## Architecture

### Project Structure

```
LLM-Animation-Lab/
├── index.html              # Main application UI
├── styles.css              # Application styling
├── src/
│   ├── skeleton.js         # Hierarchical bone system
│   ├── animation.js        # Keyframe engine & interpolation
│   ├── renderer.js         # Canvas-based visualization
│   ├── llm-engine.js       # LLM integration & demo animations
│   └── main.js             # Application entry point
└── README.md               # This file
```

### Core Components

#### 1. Skeleton System (`skeleton.js`)

Implements a professional 2D skeletal rigging system:

- **Hierarchical Structure**: Parent-child joint relationships
- **Forward Kinematics**: Automatic propagation of transformations
- **Joint Types**: Root (pelvis), spine, limbs, extremities
- **Pose Management**: Save/restore complete skeleton states

**Skeleton Hierarchy**:
```
pelvis (root)
├── spine_lower → spine_mid → spine_upper → chest
│   ├── neck → head
│   ├── shoulder_L → elbow_L → wrist_L → hand_L
│   └── shoulder_R → elbow_R → wrist_R → hand_R
├── hip_L → knee_L → ankle_L → foot_L
└── hip_R → knee_R → ankle_R → foot_R
```

#### 2. Animation Engine (`animation.js`)

Keyframe-based animation system with smooth interpolation:

- **Keyframes**: Define poses at specific timestamps
- **Interpolation**: Smooth transitions between keyframes
- **Easing Functions**: Multiple curves for natural motion
  - Linear, Cubic (In/Out/InOut), Quadratic, Elastic, Bounce
- **Timeline Management**: Duration calculation, progress tracking
- **Animation Player**: Playback control with loop and speed settings

#### 3. Renderer (`renderer.js`)

Canvas-based 2D visualization:

- **Bone Rendering**: Gradient-shaded connections between joints
- **Joint Rendering**: Hierarchical sizing with highlights
- **Camera System**: Pan, zoom, auto-centering
- **Visual Options**: Toggle bones, joints, and labels
- **Grid Display**: Reference grid for spatial awareness

#### 4. LLM Engine (`llm-engine.js`)

The innovation core - natural language to animation:

- **Claude API Integration**: Sends prompts to Claude with animation context
- **Prompt Engineering**: Comprehensive system prompt explaining skeleton, animation principles, and output format
- **Response Parsing**: Converts LLM JSON output to Animation objects
- **Demo Mode**: Predefined high-quality animations as fallback

**How It Works**:

1. User enters natural language prompt
2. System sends prompt to Claude with context about:
   - Skeleton structure and joint hierarchy
   - Animation principles (anticipation, follow-through, arcs, etc.)
   - Expected output format (JSON with keyframes)
   - Example animations
3. Claude generates keyframe data with timing, poses, and easing
4. System parses response into Animation object
5. Animation plays on skeleton

#### 5. Main Application (`main.js`)

Ties everything together:

- UI event handling
- Animation generation workflow
- Playback controls
- Settings management
- Status logging

## Technical Details

### Coordinate System

- **World Space**: Origin at skeleton root (pelvis)
- **Y-Axis**: Positive up
- **Rotations**: Counter-clockwise positive, in degrees
- **Units**: Arbitrary (scaled by renderer)

### Animation Data Format

Animations are defined as JSON:

```json
{
  "name": "Animation Name",
  "keyframes": [
    {
      "time": 0.0,
      "rootX": 0,
      "rootY": 0,
      "rotations": {
        "shoulder_R": -80,
        "elbow_R": 90,
        "wrist_R": -20
      },
      "easing": "easeInOutCubic"
    }
  ]
}
```

**Keyframe Properties**:
- `time`: Timestamp in seconds
- `rootX`, `rootY`: World position of root joint
- `rotations`: Joint rotations in degrees
- `easing`: Easing function for transition to next keyframe

### Supported Easing Functions

- `linear` - Constant speed
- `easeInOutCubic` - Slow start/end, fast middle
- `easeInCubic` - Slow start, fast end
- `easeOutCubic` - Fast start, slow end
- `easeInQuad` - Gentle acceleration
- `easeOutQuad` - Gentle deceleration
- `easeOutElastic` - Bouncy end
- `easeOutBounce` - Bouncing effect

## API Key Setup

### Getting an Anthropic API Key

1. Visit [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new key
5. Copy the key (starts with `sk-ant-`)

### Using Your API Key

**In the App**:
1. Open Settings section
2. Paste your API key
3. Key is saved to browser localStorage

**Security Note**: API keys are stored locally in your browser. Never share your API key publicly.

### API Costs

The app uses Claude 3.5 Sonnet. Typical costs:
- Simple animation: ~$0.01-0.02
- Complex animation: ~$0.02-0.05

Monitor your usage at [console.anthropic.com](https://console.anthropic.com)

## Browser Compatibility

Tested and working on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires:
- ES6 module support
- Canvas API
- Fetch API

## Customization

### Adding Custom Animations

Edit `llm-engine.js` to add new predefined animations:

```javascript
createCustomAnimation() {
    const animation = new Animation('Custom Animation');

    animation.addKeyframe(0.0, {
        rootX: 0, rootY: 0,
        rotations: { /* your rotations */ }
    }, Easing.easeInOutCubic);

    // Add more keyframes...

    return animation;
}
```

### Modifying the Skeleton

Edit `skeleton.js` to change bone proportions or add joints:

```javascript
this.joints['new_joint'] = new Joint('new_joint', x, y, parentJoint);
```

### Styling

All visual styling is in `styles.css`. Customize colors, layouts, and effects to match your preferences.

## Limitations

- **2D Only**: No 3D transformations or perspective
- **Skeletal Only**: No mesh deformation (yet)
- **Single Character**: One skeleton at a time
- **API Dependent**: Full features require Claude API access

## Future Enhancements

Potential additions:
- [ ] Character artwork generation and rigging
- [ ] Multiple characters and object interaction
- [ ] Animation export (GIF, video, sprite sheets)
- [ ] Custom skeleton creation
- [ ] Inverse Kinematics (IK) solver
- [ ] Physics simulation
- [ ] Animation library and sharing
- [ ] Voice-to-animation

## Troubleshooting

**Animation doesn't generate**:
- Check console for errors (F12)
- Verify API key is correct
- Try demo mode without API key

**Skeleton doesn't appear**:
- Check browser compatibility
- Ensure JavaScript is enabled
- Try refreshing the page

**Jerky animation**:
- Reduce playback speed
- Check system performance
- Close other browser tabs

## Contributing

Contributions welcome! Areas of interest:
- Additional predefined animations
- Improved prompt engineering
- Performance optimizations
- New features (IK, physics, etc.)
- Documentation improvements

## License

MIT License - see LICENSE file for details

## Credits

**Created by**: DARK-Shadw
**Powered by**: Anthropic Claude AI
**Technology**: HTML5 Canvas, JavaScript ES6, Claude API

## Acknowledgments

This project demonstrates the incredible potential of LLMs in creative tools. Special thanks to:
- Anthropic for Claude API
- The animation community for principles and techniques
- Open source contributors

## Contact

- GitHub: [DARK-Shadw/LLM-Animation-Lab](https://github.com/DARK-Shadw/LLM-Animation-Lab)
- Issues: [Report bugs or request features](https://github.com/DARK-Shadw/LLM-Animation-Lab/issues)

---

**Make animation accessible to everyone through the power of AI!** ✨
