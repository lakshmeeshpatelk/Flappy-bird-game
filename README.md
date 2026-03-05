# Flappy Bird Clone

A browser-based Flappy Bird clone built with vanilla HTML, CSS, and JavaScript using the Canvas API.

## Features

- Smooth canvas game loop with gravity and flap physics
- Procedurally generated pipes with collision detection
- Live score and best score tracking
- Difficulty modes: `Easy`, `Normal`, `Hard`
- Pause/Resume support (`P` key or button)
- Sound effects (Web Audio API) with on/off toggle
- Responsive layout for desktop and mobile
- Persistent settings using `localStorage`

## Controls

- Flap: `Click`, `Tap`, `Space`, or `ArrowUp`
- Pause/Resume: `P` key or `Pause (P)` button
- Difficulty: use `Easy / Normal / Hard` buttons (when not actively playing)
- Sound: toggle via `Sound: On/Off` button

## Run Locally

You can run it directly by opening `index.html` in your browser.

For a local dev server (recommended):

```bash
python -m http.server 5500
```

Then open:

```text
http://localhost:5500
```

## Project Files

- `index.html` - game UI, controls, and canvas container
- `style.css` - styling and responsive layout
- `script.js` - game logic, physics, rendering, audio, and input handling

## Configuration

Game difficulty values are defined in `script.js` under:

- `DIFFICULTY_SETTINGS`

Best scores and preferences use:

- `flappy_best_score_easy`
- `flappy_best_score_normal`
- `flappy_best_score_hard`
- `flappy_sound_enabled`
