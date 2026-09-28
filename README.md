# Banker's Algorithm Simulator for Deadlock Avoidance

An interactive, browser-based simulator that visualises the **Banker's Algorithm** — a classic deadlock-avoidance technique in Operating Systems.

---

## Description

The simulator lets you enter any number of processes and resource types, fill in the Allocation and Maximum matrices, then run the Safety Algorithm to determine whether the system is in a safe state. It shows the computed safe sequence step-by-step and lets you test individual resource requests to see whether granting them would keep the system safe.

---

## Technologies Used

| Layer      | Technology |
|------------|------------|
| Markup     | HTML5      |
| Styling    | CSS3 (custom properties, flexbox, grid) |
| Logic      | Vanilla JavaScript (ES5 strict mode, IIFE modules) |

No frameworks, build tools, package managers, or external dependencies are required.

---

## Folder Structure

```
bankers-algorithm-simulator/
│
├── index.html          ← Main HTML page (app shell + script links)
│
├── css/
│   └── style.css       ← All styles (layout, cards, tables, status banners)
│
├── js/
│   ├── main.js         ← Entry point: initialisation & event wiring
│   ├── banker.js       ← Banker's Algorithm core (safety + request)
│   ├── matrix.js       ← Matrix data management (allocation, max, need, available)
│   └── ui.js           ← DOM rendering helpers (tables, status, sequence, log)
│
├── assets/
│   └── .gitkeep        ← Keeps assets/ folder tracked in git
│
└── README.md           ← Project documentation (this file)
```

---

## How to Run

1. Clone or download the repository.
2. Open `index.html` directly in any modern web browser (Chrome, Firefox, Edge, Safari).
3. No server, no build step, no installation required.

```bash
# Optional: serve locally with Python for cleaner URLs
python -m http.server 8080
# then open http://localhost:8080
```

---

## How to Use the Simulator

1. **Set dimensions** — choose the number of processes (n) and resource types (m).
2. **Click "Generate Matrices"** — editable tables appear for Allocation, Maximum, and Available.
3. **Fill in values** — type directly into each cell.
4. **Click "Run Safety Algorithm"** — the Need matrix is computed and the Safety Algorithm runs. The result shows:
   - Safe ✅ or Unsafe 🚨 status
   - Safe sequence (if one exists)
   - Step-by-step execution log
5. **Test a request** — select a process, enter the request vector, and click "Check Request" to see whether the request can be granted safely.

---

## Banker's Algorithm — Brief Explanation

The Banker's Algorithm, devised by **Edsger W. Dijkstra (1965)**, is a resource-allocation and deadlock-avoidance algorithm used in operating systems.

### Key Data Structures

| Structure  | Size  | Description |
|------------|-------|-------------|
| Available  | m     | Number of free instances of each resource |
| Allocation | n × m | Resources currently held by each process |
| Maximum    | n × m | Maximum resources a process may ever request |
| Need       | n × m | Remaining resources a process may still request (`Need = Max − Allocation`) |

### Safety Algorithm

1. Initialise `Work = Available`, `Finish[i] = false` for all i.
2. Find a process `i` where `Finish[i] == false` AND `Need[i] ≤ Work`.
3. Simulate process `i` finishing: `Work = Work + Allocation[i]`, `Finish[i] = true`.
4. Repeat steps 2–3 until no such process exists.
5. If all `Finish[i] == true` → **safe state**; otherwise → **unsafe state**.

### Resource Request Algorithm

1. Reject if `Request[i] > Need[i]` (exceeds declared maximum).
2. Reject if `Request[i] > Available` (resources unavailable right now — process waits).
3. Tentatively allocate: `Available -= Request`, `Allocation[i] += Request`, `Need[i] -= Request`.
4. Run the Safety Algorithm on the new state.
5. If safe → **grant request**; otherwise → **roll back and deny**.

---

## License

Free to use for educational purposes.
