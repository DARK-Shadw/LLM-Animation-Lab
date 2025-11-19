/**
 * LLM Animation Engine - Natural Language to Skeletal Animation
 *
 * This is the core innovation: using an LLM to generate skeletal animations
 * from natural language descriptions. The LLM acts as the animation brain,
 * understanding motion, physics, and animation principles.
 */

import { Animation, Easing } from './animation.js';

export class LLMAnimationEngine {
    constructor(apiKey = null, provider = 'claude') {
        this.apiKey = apiKey;
        this.provider = provider; // 'claude' or 'gemini'

        // API configurations
        this.config = {
            claude: {
                endpoint: 'https://api.anthropic.com/v1/messages',
                model: 'claude-3-5-sonnet-20241022'
            },
            gemini: {
                endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
                model: 'gemini-2.0-flash-exp'
            }
        };
    }

    /**
     * Set API provider
     */
    setProvider(provider) {
        if (provider !== 'claude' && provider !== 'gemini') {
            throw new Error('Invalid provider. Use "claude" or "gemini"');
        }
        this.provider = provider;
    }

    /**
     * Generate animation from natural language prompt
     */
    async generateAnimation(prompt, skeleton) {
        if (!this.apiKey) {
            return this.generateDemoAnimation(prompt, skeleton);
        }

        try {
            const systemPrompt = this.buildSystemPrompt(skeleton);
            let response;

            if (this.provider === 'gemini') {
                response = await this.callGeminiAPI(systemPrompt, prompt);
            } else {
                response = await this.callClaudeAPI(systemPrompt, prompt);
            }

            const animation = this.parseAnimationResponse(response);
            return animation;
        } catch (error) {
            console.error('LLM API Error:', error);
            throw new Error(`Animation generation failed: ${error.message}`);
        }
    }

    /**
     * Build comprehensive system prompt for the LLM
     */
    buildSystemPrompt(skeleton) {
        const jointNames = Object.keys(skeleton.joints).join(', ');

        return `You are an expert animation engine that generates 2D skeletal character animations from natural language descriptions.

SKELETON STRUCTURE:
The character has the following joints: ${jointNames}

Joint hierarchy:
- pelvis (root) → spine_lower → spine_mid → spine_upper → chest
- chest → neck → head
- chest → shoulder_L → elbow_L → wrist_L → hand_L
- chest → shoulder_R → elbow_R → wrist_R → hand_R
- pelvis → hip_L → knee_L → ankle_L → foot_L
- pelvis → hip_R → knee_R → ankle_R → foot_R

YOUR TASK:
Generate keyframe-based animation data that brings the character to life based on the user's description.

ANIMATION PRINCIPLES TO APPLY:
1. Anticipation - prepare for major movements
2. Follow-through - parts continue moving after the main action
3. Arcs - natural movement follows curved paths
4. Timing - fast/slow timing creates different feels
5. Exaggeration - emphasize key poses for impact
6. Secondary action - additional movements that support the main action

OUTPUT FORMAT:
Return ONLY valid JSON in this exact structure (no markdown, no explanations):

{
  "name": "Animation Name",
  "keyframes": [
    {
      "time": 0.0,
      "rootX": 0,
      "rootY": 0,
      "rotations": {
        "pelvis": 0,
        "spine_lower": 0,
        "shoulder_L": -45,
        "elbow_L": 90,
        ... (all joints you want to rotate)
      },
      "easing": "easeInOutCubic"
    },
    ... more keyframes ...
  ]
}

IMPORTANT RULES:
- Times are in seconds (e.g., 0.0, 0.5, 1.0, 1.5)
- Rotations are in degrees
- Positive rotation is counter-clockwise
- rootX, rootY move the entire skeleton (in world units)
- Available easing: "linear", "easeInOutCubic", "easeInCubic", "easeOutCubic", "easeInQuad", "easeOutQuad", "easeOutElastic", "easeOutBounce"
- Only include joints you want to rotate (others stay at 0)
- Create smooth, believable motion
- Typical animations are 1-4 seconds long
- Use more keyframes for complex motions, fewer for simple ones

ANIMATION EXAMPLES:

Wave:
- Keyframe 0.0: Arm down, neutral
- Keyframe 0.3: Shoulder raises, elbow bends
- Keyframe 0.6: Hand up, slight rotation
- Keyframe 0.9: Hand tilted other way (wave motion)
- Keyframe 1.2: Back to keyframe 0.6
- Keyframe 1.5: Return to neutral

Jump:
- Keyframe 0.0: Standing neutral
- Keyframe 0.2: Crouch (anticipation) - knees bent, spine compressed
- Keyframe 0.4: Takeoff - legs extending, arms up
- Keyframe 0.7: Peak - full extension, slight arc
- Keyframe 1.0: Landing prep - legs slightly bent
- Keyframe 1.2: Impact - knees bent, absorbing impact
- Keyframe 1.5: Return to standing

Generate creative, physically plausible animations that match the user's intent!`;
    }

    /**
     * Call Claude API
     */
    async callClaudeAPI(systemPrompt, userPrompt) {
        const config = this.config.claude;
        const response = await fetch(config.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: config.model,
                max_tokens: 4096,
                system: systemPrompt,
                messages: [
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ]
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Claude API request failed: ${response.status} - ${error}`);
        }

        const data = await response.json();
        return data.content[0].text;
    }

    /**
     * Call Gemini API
     */
    async callGeminiAPI(systemPrompt, userPrompt) {
        const config = this.config.gemini;
        const url = `${config.endpoint}?key=${this.apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: systemPrompt + '\n\n' + userPrompt }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 4096,
                    topP: 0.95,
                    topK: 40
                }
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Gemini API request failed: ${response.status} - ${error}`);
        }

        const data = await response.json();

        // Gemini response format is different
        if (data.candidates && data.candidates.length > 0) {
            const candidate = data.candidates[0];
            if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                return candidate.content.parts[0].text;
            }
        }

        throw new Error('Invalid Gemini API response format');
    }

    /**
     * Parse LLM response into Animation object
     */
    parseAnimationResponse(responseText) {
        // Extract JSON from response (in case LLM added any text)
        let jsonText = responseText.trim();

        // Remove markdown code blocks if present
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

        // Find JSON object
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No valid JSON found in response');
        }

        const animData = JSON.parse(jsonMatch[0]);
        const animation = new Animation(animData.name || 'Generated Animation');

        // Add keyframes
        for (const kf of animData.keyframes) {
            const easing = Easing[kf.easing] || Easing.easeInOutCubic;
            const pose = {
                rootX: kf.rootX || 0,
                rootY: kf.rootY || 0,
                rotations: kf.rotations || {}
            };
            animation.addKeyframe(kf.time, pose, easing);
        }

        return animation;
    }

    /**
     * Demo mode - predefined animations for users without API key
     */
    generateDemoAnimation(prompt, skeleton) {
        const lowerPrompt = prompt.toLowerCase();

        // Match common animation requests
        if (lowerPrompt.includes('wave') || lowerPrompt.includes('hello')) {
            return this.createWaveAnimation();
        } else if (lowerPrompt.includes('jump')) {
            return this.createJumpAnimation();
        } else if (lowerPrompt.includes('dance') || lowerPrompt.includes('victory')) {
            return this.createVictoryDanceAnimation();
        } else if (lowerPrompt.includes('backflip') || lowerPrompt.includes('flip')) {
            return this.createBackflipAnimation();
        } else if (lowerPrompt.includes('walk')) {
            return this.createWalkAnimation();
        } else if (lowerPrompt.includes('reach')) {
            return this.createReachAnimation();
        } else {
            // Default to wave
            return this.createWaveAnimation();
        }
    }

    /**
     * Predefined: Wave animation
     */
    createWaveAnimation() {
        const animation = new Animation('Wave Hello');

        animation.addKeyframe(0.0, {
            rootX: 0, rootY: 0,
            rotations: { shoulder_R: 0, elbow_R: 0, wrist_R: 0 }
        }, Easing.easeOutCubic);

        animation.addKeyframe(0.3, {
            rootX: 0, rootY: 0,
            rotations: { shoulder_R: -80, elbow_R: 90, wrist_R: -20 }
        }, Easing.easeInOutCubic);

        animation.addKeyframe(0.6, {
            rootX: 0, rootY: 0,
            rotations: { shoulder_R: -80, elbow_R: 90, wrist_R: 20 }
        }, Easing.easeInOutCubic);

        animation.addKeyframe(0.9, {
            rootX: 0, rootY: 0,
            rotations: { shoulder_R: -80, elbow_R: 90, wrist_R: -20 }
        }, Easing.easeInOutCubic);

        animation.addKeyframe(1.2, {
            rootX: 0, rootY: 0,
            rotations: { shoulder_R: -80, elbow_R: 90, wrist_R: 20 }
        }, Easing.easeInOutCubic);

        animation.addKeyframe(1.5, {
            rootX: 0, rootY: 0,
            rotations: { shoulder_R: 0, elbow_R: 0, wrist_R: 0 }
        }, Easing.easeInCubic);

        return animation;
    }

    /**
     * Predefined: Jump animation
     */
    createJumpAnimation() {
        const animation = new Animation('Jump');

        animation.addKeyframe(0.0, {
            rootX: 0, rootY: 0,
            rotations: { knee_L: 0, knee_R: 0, shoulder_L: 0, shoulder_R: 0 }
        }, Easing.easeInCubic);

        animation.addKeyframe(0.2, {
            rootX: 0, rootY: -10,
            rotations: {
                knee_L: 45, knee_R: 45,
                hip_L: -30, hip_R: -30,
                spine_lower: 20,
                shoulder_L: 30, shoulder_R: 30
            }
        }, Easing.easeOutCubic);

        animation.addKeyframe(0.5, {
            rootX: 0, rootY: 60,
            rotations: {
                knee_L: -10, knee_R: -10,
                hip_L: -10, hip_R: -10,
                spine_lower: -10,
                shoulder_L: -120, shoulder_R: -120
            }
        }, Easing.linear);

        animation.addKeyframe(0.8, {
            rootX: 0, rootY: 0,
            rotations: {
                knee_L: 40, knee_R: 40,
                hip_L: -20, hip_R: -20,
                spine_lower: 15,
                shoulder_L: 20, shoulder_R: 20
            }
        }, Easing.easeInCubic);

        animation.addKeyframe(1.0, {
            rootX: 0, rootY: 0,
            rotations: { knee_L: 0, knee_R: 0, shoulder_L: 0, shoulder_R: 0 }
        }, Easing.easeOutCubic);

        return animation;
    }

    /**
     * Predefined: Victory dance
     */
    createVictoryDanceAnimation() {
        const animation = new Animation('Victory Dance');

        animation.addKeyframe(0.0, {
            rootX: 0, rootY: 0,
            rotations: {}
        }, Easing.easeInOutCubic);

        animation.addKeyframe(0.3, {
            rootX: 0, rootY: 10,
            rotations: {
                shoulder_L: -140, shoulder_R: -140,
                elbow_L: 90, elbow_R: 90,
                spine_lower: -15
            }
        }, Easing.easeOutBounce);

        animation.addKeyframe(0.6, {
            rootX: -5, rootY: 5,
            rotations: {
                shoulder_L: -140, shoulder_R: -100,
                elbow_L: 90, elbow_R: 45,
                spine_lower: 10,
                pelvis: -15
            }
        }, Easing.easeInOutCubic);

        animation.addKeyframe(0.9, {
            rootX: 5, rootY: 5,
            rotations: {
                shoulder_L: -100, shoulder_R: -140,
                elbow_L: 45, elbow_R: 90,
                spine_lower: -10,
                pelvis: 15
            }
        }, Easing.easeInOutCubic);

        animation.addKeyframe(1.2, {
            rootX: 0, rootY: 10,
            rotations: {
                shoulder_L: -140, shoulder_R: -140,
                elbow_L: 90, elbow_R: 90,
                spine_lower: -15
            }
        }, Easing.easeOutBounce);

        animation.addKeyframe(1.5, {
            rootX: 0, rootY: 0,
            rotations: {}
        }, Easing.easeInCubic);

        return animation;
    }

    /**
     * Predefined: Backflip
     */
    createBackflipAnimation() {
        const animation = new Animation('Backflip');

        animation.addKeyframe(0.0, {
            rootX: 0, rootY: 0,
            rotations: {}
        }, Easing.easeInCubic);

        animation.addKeyframe(0.2, {
            rootX: 0, rootY: -5,
            rotations: {
                knee_L: 40, knee_R: 40,
                hip_L: -20, hip_R: -20,
                shoulder_L: -30, shoulder_R: -30
            }
        }, Easing.easeOutCubic);

        animation.addKeyframe(0.5, {
            rootX: 0, rootY: 50,
            rotations: {
                pelvis: -90,
                spine_lower: -30,
                knee_L: -90, knee_R: -90,
                shoulder_L: -180, shoulder_R: -180
            }
        }, Easing.linear);

        animation.addKeyframe(0.8, {
            rootX: 0, rootY: 80,
            rotations: {
                pelvis: -180,
                spine_lower: -60,
                knee_L: -120, knee_R: -120,
                shoulder_L: -270, shoulder_R: -270
            }
        }, Easing.linear);

        animation.addKeyframe(1.1, {
            rootX: 0, rootY: 30,
            rotations: {
                pelvis: -270,
                spine_lower: -30,
                knee_L: -90, knee_R: -90,
                shoulder_L: -300, shoulder_R: -300
            }
        }, Easing.easeInCubic);

        animation.addKeyframe(1.4, {
            rootX: 0, rootY: 0,
            rotations: {
                pelvis: -360,
                knee_L: 30, knee_R: 30
            }
        }, Easing.easeOutBounce);

        animation.addKeyframe(1.7, {
            rootX: 0, rootY: 0,
            rotations: {}
        }, Easing.easeOutCubic);

        return animation;
    }

    /**
     * Predefined: Walk cycle
     */
    createWalkAnimation() {
        const animation = new Animation('Walk');

        animation.addKeyframe(0.0, {
            rootX: -20, rootY: 0,
            rotations: {
                hip_L: 30, knee_L: -20,
                hip_R: -30, knee_R: 40,
                shoulder_L: -20, shoulder_R: 20
            }
        }, Easing.easeInOutCubic);

        animation.addKeyframe(0.5, {
            rootX: 0, rootY: 0,
            rotations: {
                hip_L: -10, knee_L: 0,
                hip_R: 10, knee_R: 0,
                shoulder_L: 10, shoulder_R: -10
            }
        }, Easing.easeInOutCubic);

        animation.addKeyframe(1.0, {
            rootX: 20, rootY: 0,
            rotations: {
                hip_L: -30, knee_L: 40,
                hip_R: 30, knee_R: -20,
                shoulder_L: 20, shoulder_R: -20
            }
        }, Easing.easeInOutCubic);

        animation.addKeyframe(1.5, {
            rootX: 40, rootY: 0,
            rotations: {
                hip_L: -10, knee_L: 0,
                hip_R: 10, knee_R: 0,
                shoulder_L: 10, shoulder_R: -10
            }
        }, Easing.easeInOutCubic);

        return animation;
    }

    /**
     * Predefined: Reach up
     */
    createReachAnimation() {
        const animation = new Animation('Reach Up');

        animation.addKeyframe(0.0, {
            rootX: 0, rootY: 0,
            rotations: {}
        }, Easing.easeInCubic);

        animation.addKeyframe(0.3, {
            rootX: 0, rootY: 5,
            rotations: {
                knee_L: -10, knee_R: -10,
                shoulder_R: -160,
                elbow_R: -20,
                spine_lower: -10,
                spine_mid: -10,
                neck: 20
            }
        }, Easing.easeOutCubic);

        animation.addKeyframe(0.8, {
            rootX: 0, rootY: 8,
            rotations: {
                knee_L: -15, knee_R: -15,
                shoulder_R: -170,
                elbow_R: -10,
                wrist_R: 30,
                spine_lower: -12,
                spine_mid: -12,
                neck: 25
            }
        }, Easing.linear);

        animation.addKeyframe(1.2, {
            rootX: 0, rootY: 0,
            rotations: {}
        }, Easing.easeInCubic);

        return animation;
    }
}
