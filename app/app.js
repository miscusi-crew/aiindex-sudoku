"use strict";
const $ = (id) => document.getElementById(id);
const CLUES = { easy: 40, medium: 32, hard: 27 };
let solution, given, board, notes, selected = -1, history = [], noteMode = false, started, timer, done;

const rowOf = (i) => Math.floor(i / 9), colOf = (i) => i % 9;
const boxOf = (i) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);
const PEERS = Array.from({ length: 81 }, (_, i) =>
  [...Array(81).keys()].filter((j) => j !== i && (rowOf(j) === rowOf(i) || colOf(j) === colOf(i) || boxOf(j) === boxOf(i))));

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const allowed = (g, i, v) => PEERS[i].every((j) => g[j] !== v);

/** Fills g in place; returns true when it found a full grid. */
function fill(g) {
  const i = g.indexOf(0);
  if (i < 0) return true;
  for (const v of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (allowed(g, i, v)) {
      g[i] = v;
      if (fill(g)) return true;
    }
  }
  g[i] = 0;
  return false;
}

/** Counts solutions up to `limit` (2 is enough to know a puzzle isn't unique). */
function countSolutions(g, limit = 2) {
  let best = -1, bestOpts = null;
  for (let i = 0; i < 81; i++) {
    if (g[i]) continue;
    const opts = [];
    for (let v = 1; v <= 9; v++) if (allowed(g, i, v)) opts.push(v);
    if (!opts.length) return 0;
    if (!bestOpts || opts.length < bestOpts.length) { best = i; bestOpts = opts; }
  }
  if (best < 0) return 1;
  let n = 0;
  for (const v of bestOpts) {
    g[best] = v;
    n += countSolutions(g, limit - n);
    if (n >= limit) break;
  }
  g[best] = 0;
  return n;
}

function generate(level) {
  const full = Array(81).fill(0);
  fill(full);
  const puzzle = [...full];
  let clues = 81;
  for (const i of shuffle([...Array(81).keys()])) {
    if (clues <= CLUES[level]) break;
    const keep = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions([...puzzle]) !== 1) puzzle[i] = keep;
    else clues--;
  }
  return { full, puzzle };
}

function newGame() {
  const { full, puzzle } = generate($("level").value);
  solution = full;
  given = puzzle.map(Boolean);
  board = [...puzzle];
  notes = Array.from({ length: 81 }, () => new Set());
  history = [];
  selected = board.indexOf(0);
  done = false;
  started = Date.now();
  clearInterval(timer);
  timer = setInterval(tick, 500);
  $("msg").textContent = "";
  tick();
  render();
}

function tick() {
  const s = Math.floor((Date.now() - started) / 1000);
  $("time").textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function enter(v) {
  if (done || selected < 0 || given[selected]) return;
  history.push({ i: selected, v: board[selected], n: new Set(notes[selected]) });
  if (noteMode && v) {
    if (board[selected]) return;
    if (notes[selected].has(v)) notes[selected].delete(v);
    else notes[selected].add(v);
  } else {
    board[selected] = board[selected] === v ? 0 : v;
    notes[selected].clear();
    if (v) for (const j of PEERS[selected]) notes[j].delete(v);
  }
  if (board.every((v, i) => v === solution[i])) {
    done = true;
    clearInterval(timer);
    $("msg").textContent = `Solved in ${$("time").textContent}!`;
  }
  render();
}

function undo() {
  const h = history.pop();
  if (!h || done) return;
  board[h.i] = h.v;
  notes[h.i] = h.n;
  selected = h.i;
  render();
}

function render() {
  const cells = $("grid").children;
  const selVal = selected >= 0 ? board[selected] : 0;
  for (let i = 0; i < 81; i++) {
    const b = cells[i], v = board[i];
    b.className = given[i] ? "given" : v ? "mine" : "";
    if (selected >= 0 && PEERS[selected].includes(i)) b.classList.add("peer");
    if (selVal && v === selVal) b.classList.add("same");
    if (i === selected) b.classList.add("sel");
    if ($("check").checked && v && !given[i] && v !== solution[i]) b.classList.add("wrong");
    if (v) b.textContent = v;
    else if (notes[i].size) b.innerHTML = `<span class="notes">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<span>${notes[i].has(n) ? n : ""}</span>`).join("")}</span>`;
    else b.textContent = "";
    b.setAttribute("aria-label", `Row ${rowOf(i) + 1}, column ${colOf(i) + 1}: ${v || "empty"}`);
  }
  $("left").textContent = board.filter((v) => !v).length;
  $("notes").setAttribute("aria-pressed", String(noteMode));
}

for (let i = 0; i < 81; i++) {
  const b = document.createElement("button");
  b.addEventListener("click", () => { selected = i; render(); });
  $("grid").append(b);
}
for (let v = 1; v <= 9; v++) {
  const b = document.createElement("button");
  b.textContent = v;
  b.addEventListener("click", () => enter(v));
  $("pad").append(b);
}
$("new").addEventListener("click", newGame);
$("level").addEventListener("change", newGame);
$("erase").addEventListener("click", () => enter(0));
$("undo").addEventListener("click", undo);
$("notes").addEventListener("click", () => { noteMode = !noteMode; render(); });
$("check").addEventListener("change", render);
document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "SELECT" || e.target.tagName === "INPUT") return;
  if (/^[1-9]$/.test(e.key)) enter(Number(e.key));
  else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") enter(0);
  else if (e.key === "n" || e.key === "N") { noteMode = !noteMode; render(); }
  else if ((e.ctrlKey || e.metaKey) && e.key === "z") undo();
  else if (e.key.startsWith("Arrow") && selected >= 0) {
    e.preventDefault();
    const d = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }[e.key];
    selected = (selected + d + 81) % 81;
    render();
  }
});
newGame();
