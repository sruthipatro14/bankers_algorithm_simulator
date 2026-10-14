# Banker's Algorithm Simulator for Deadlock Avoidance

An interactive educational web application that demonstrates **Banker's Algorithm** — a classic deadlock-avoidance technique in Operating Systems. The site pairs a structured theoretical guide with a fully working browser-based simulator so students can read the theory and immediately experiment with it on the same page.

---

## About the Project

Operating systems must allocate shared resources (CPU, memory, devices) to multiple processes without causing deadlock. Banker's Algorithm solves this by checking, before every allocation, whether granting a request would leave the system in a *safe state* — one where all processes can still finish.

This website helps students understand that concept by:

- presenting a step-by-step written explanation of every component and algorithm, and
- providing a live simulator where they can configure processes and resources, enter values, and see the algorithm run in real time.

No installation, no frameworks, and no internet connection are required — open `index.html` and everything works.

---

## Features

### Educational Guide

The top of the page contains a complete self-study reference before the simulator begins:

| Section | What it covers |
|---|---|
| What is Banker's Algorithm? | Definition, purpose, and two key properties |
| Components | Available, Max, Allocation, and Need — size, meaning, and formal definition for each |
| Key Concepts | Safe State vs Unsafe State with plain-English explanations |
| Safety Algorithm | Four numbered steps with initialisation, eligibility check, resource update, and result |
| Resource Request Algorithm | Four numbered steps: need check, availability check, tentative allocation, safety check |

### Interactive Simulator

The simulator section follows the educational guide on the same page:

- **System Configuration** — choose the number of processes (1–10) and resource types (1–6), then click **Create Matrices** to generate the input tables.
- **Allocation Matrix** — editable table; enter the resources currently held by each process.
- **Maximum Matrix** — editable table; enter the maximum resources each process may ever request.
- **Available Resources** — editable inputs for the resources currently free in the system.
- **Need Matrix** — read-only; calculated automatically as `Need = Maximum − Allocation` and updated live whenever Allocation or Maximum values change.
- **Check Safe State** — runs the Safety Algorithm and shows:
  - a green **SAFE** or red **UNSAFE** status banner,
  - the safe sequence displayed as process pills (e.g. P1 → P3 → P4 → P0 → P2), and
  - a step-by-step timeline of every decision the algorithm made.
- **Resource Request** — select a process, enter a request vector, and click **Check Request** to find out whether the request can be safely granted. The result shows GRANTED or DENIED with a reason.
- **Reset** — clears all matrices back to zero without changing the current dimensions.

### Quick Test Cases

Three one-click presets sit alongside the configuration controls:

| Button | What it loads |
|---|---|
| Load Safe | Classic 5-process, 3-resource textbook example; expected sequence P1 → P3 → P4 → P0 → P2 |
| Load Unsafe | 4-process example where no safe sequence exists |
| Generate | Random valid dataset with randomised process and resource counts |

---

## Project Structure

```
bankers-algorithm-simulator/
│
├── index.html      ← Single-page application: educational guide + simulator
├── style.css       ← All styles (layout, cards, tables, status, edu sections)
├── script.js       ← All JavaScript: algorithm logic, DOM builders, event wiring
│
├── js/             ← Reference/draft modules (not loaded by index.html)
│   ├── banker.js
│   ├── main.js
│   ├── matrix.js
│   └── ui.js
│
├── css/            ← Reference stylesheet (not loaded by index.html)
│   └── style.css
│
├── assets/
│   └── .gitkeep
│
└── README.md
```

> **Note:** The page loads only `style.css` and `script.js` from the project root. The files inside `js/` and `css/` are not referenced by `index.html`.

---

## Technologies Used

| Layer | Technology |
|---|---|
| Markup | HTML5 (semantic elements, `aria-labelledby`) |
| Styling | CSS3 (custom properties, flexbox, grid, responsive breakpoints) |
| Logic | Vanilla JavaScript (ES5 strict mode) |

No frameworks, build tools, package managers, or external dependencies.

---

## How to Run

1. Clone or download the repository.
2. Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari).
3. No server, no build step, no installation required.

```bash
# Optional: serve with VS Code Live Server, or with Python
python3 -m http.server 8080
# then open http://localhost:8080
```

---

## How to Use

1. **Read the guide** — the educational sections at the top explain every concept before you use the simulator.
2. **Click "Start Simulation ↓"** — the page scrolls smoothly to the simulator.
3. **Configure** — set processes and resource types, then click **Create Matrices** (or load a preset).
4. **Enter values** — fill in Allocation, Maximum, and Available. The Need matrix updates automatically.
5. **Check Safe State** — see the SAFE/UNSAFE result, the safe sequence, and the step-by-step log.
6. **Test a request** — pick a process, enter the request vector, click **Check Request**.
7. **Reset** — start fresh with the same dimensions, or change the numbers and click **Create Matrices** again.

---

## Banker's Algorithm — Quick Reference

### Safety Algorithm

```
Work   = Available
Finish = [false, false, ..., false]

while (some Finish[i] == false):
    find i where Finish[i] == false AND Need[i] <= Work
    if found:
        Work     = Work + Allocation[i]
        Finish[i] = true
    else:
        → UNSAFE state

if all Finish[i] == true → SAFE state
```

### Resource Request Algorithm

```
if Request[i] > Need[i]      → reject (exceeds declared maximum)
if Request[i] > Available    → wait   (resources unavailable)

// Tentative allocation
Available     = Available     − Request[i]
Allocation[i] = Allocation[i] + Request[i]
Need[i]       = Need[i]       − Request[i]

run Safety Algorithm:
    if SAFE   → grant request
    if UNSAFE → roll back and deny
```

---

## License

Free to use for educational purposes.
