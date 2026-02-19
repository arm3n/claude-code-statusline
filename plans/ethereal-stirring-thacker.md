# Morse Code Translator Webapp

## Context
Build a modern, single-page Morse code translator webapp using vanilla HTML/CSS/JS. The app translates bidirectionally (English ↔ Morse) with graphical dot/dash visualization and audio playback with adjustable frequency.

## Project Structure
```
C:\Users\armen\morse-translator\
├── index.html      — Single HTML file with all markup
├── style.css       — Styles (dark modern theme)
└── app.js          — All logic (translation, audio, visualization)
```

Three files keeps concerns separated while staying simple (no build tools needed). Just open `index.html` in a browser.

## Architecture & Features

### 1. Translation Engine (`app.js`)
- Complete Morse mapping: A-Z, 0-9, common punctuation (.,?!'/-()&:;=+_"@)
- **English → Morse**: split by character, look up each, join with spaces (words separated by ` / `)
- **Morse → English**: split by ` / ` for words, split by space for characters, reverse-lookup
- Swap button to flip input/output direction
- Live translation on input (debounced ~150ms for smooth typing)

### 2. Visual Morse Display
- Render each Morse character as a row of styled `<span>` elements:
  - **Dot (·)**: small circle (CSS `border-radius: 50%`, ~12px)
  - **Dash (−)**: wide rectangle (~36px × 12px)
  - Character separators: small gap
  - Word separators: large gap with a subtle divider
- Characters are grouped and labeled (the letter above each dot/dash group)
- Scrollable container for long messages

### 3. Audio Playback (Web Audio API)
- `OscillatorNode` → `GainNode` → `AudioContext.destination`
- Timing (standard Morse):
  - Dot = 1 unit (~60ms at 20 WPM)
  - Dash = 3 units
  - Intra-character gap = 1 unit (silence)
  - Inter-character gap = 3 units
  - Word gap = 7 units
- **Frequency slider**: 400Hz – 1000Hz (default 600Hz), live preview
- **Speed slider**: 10 – 30 WPM (affects unit duration)
- Play/Stop button with visual progress (highlights current character being played)
- Uses `setTimeout` scheduling chain for sequential playback

### 4. UI Design (`style.css`)
- Dark theme with accent color (amber/gold — evocative of telegraph era)
- CSS custom properties for theming
- Responsive layout (flexbox/grid), works on mobile
- Two text areas side by side (stacked on mobile) with swap button in between
- Visual morse display below the text areas
- Audio controls (play/stop, frequency slider, speed slider) in a control bar
- Smooth transitions and hover effects
- Google Fonts for a clean modern typeface (Inter or similar via system font stack to avoid external deps)

## Implementation Steps

1. **Create project folder** and the 3 files
2. **`index.html`**: Semantic markup — header, translation panel (two textareas + swap btn), visual display area, audio controls bar
3. **`style.css`**: Dark theme, layout, dot/dash styling, responsive breakpoints, slider styling
4. **`app.js` — Translation**: Morse lookup table, encode/decode functions, input event listeners, swap logic
5. **`app.js` — Visualization**: DOM rendering of dots/dashes with character labels
6. **`app.js` — Audio**: Web Audio API oscillator, play/stop controls, frequency/speed sliders, playback progress highlighting

## Verification
- Open `index.html` in browser (no server needed)
- Type English text → verify Morse output, visual dots/dashes, and audio playback
- Type Morse code (dots `.` and dashes `-`, space-separated) → verify English output
- Adjust frequency slider → hear tone change
- Adjust speed slider → hear timing change
- Test swap button toggles direction
- Test on narrow viewport for responsive layout
