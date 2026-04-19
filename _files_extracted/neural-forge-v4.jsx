import { useState, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════
   NEURAL FORGE v4 — Built on v3's Proven Architecture
   Sequential loading · Per-step status · Back buttons everywhere
   ═══════════════════════════════════════════════════════════════ */

const CHS = [
  {id:1,title:"Introduction to Ethics",p:`Socrates's question "How should one live?" Ethics as reflective inquiry. Everyday choices have moral significance. Ethical reasoning via dialectic. Three major theories: consequentialism, deontology, virtue ethics. Normative vs metaethics vs applied. Plato's Cave. Euthyphro Dilemma.`},
  {id:2,title:"Skepticism About Ethics",p:`Cultural relativism vs moral relativism. Reformer's Dilemma. Is/ought gap. Tolerance paradox. Psychological egoism vs ethical egoism. Glaukon's Ring of Gyges. Emotivism.`},
  {id:3,title:"Utilitarianism",p:`Maximizing well-being. Bentham felicific calculus. Mill higher/lower pleasures. Impartiality, objectivity. Objections: calculation, minority harm, ignores rights. Act vs rule utilitarianism. Trolley problem.`},
  {id:4,title:"Deontology (Kant)",p:`Duty-based. Good will. Categorical Imperative: Universal Law, Humanity formula. Kingdom of Ends. Aquinas natural law. Rawls veil of ignorance.`},
  {id:5,title:"Virtue Ethics (Aristotle)",p:`Character focus. Eudaimonia. Function argument. Doctrine of the mean. Practical wisdom. The phronimos.`},
  {id:6,title:"Abortion",p:`Fetal stages. Roe v. Wade. Personhood arguments. Thomson's violinist. Utilitarian and virtue ethics approaches.`},
  {id:7,title:"Assisted Dying",p:`PAS vs euthanasia. Autonomy, mercy. Sanctity of life, slippery slope. Doctrine of double effect.`},
  {id:8,title:"Biotechnology",p:`Genetic screening. Enhancement vs treatment. Sandel on giftedness. Cloning. Repugnance argument.`},
  {id:9,title:"Animals and Eating",p:`Speciesism. Regan's animal rights. Agrarianism. Factory farming. Consumer obligations.`},
  {id:10,title:"Applied Ethics",p:`Just War Theory. Torture. Capital punishment. Same-sex marriage. Environmental ethics.`}
];

const PHASES = [
  {id:"genesis",label:"GENESIS",icon:"🌅",color:"#06d6a0"},
  {id:"forge",label:"FORGE",icon:"⚡",color:"#00f0ff"},
  {id:"crucible",label:"CRUCIBLE",icon:"🔥",color:"#ff6b2b"},
  {id:"architect",label:"ARCHITECT",icon:"🏗️",color:"#a855f7"},
  {id:"transcend",label:"TRANSCEND",icon:"👁️",color:"#ffd700"},
];

/* ── Single API helper with full error trapping ── */
async function ask(sysExtra, userMsg) {
  const sys = "You are a JSON generator. Return ONLY valid JSON. No markdown fences. No commentary. No preamble. " + sysExtra;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        system: sys,
        messages: [{ role: "user", content: userMsg.substring(0, 5000) }]
      })
    });
    if (!r.ok) return null;
    const d = await r.json();
    if (d.error) return null;
    const raw = (d.content || []).map(b => b.type === "text" ? b.text : "").join("");
    if (!raw) return null;
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch (e) {
    console.error("API call failed:", e);
    return null;
  }
}

/* ── Styles ── */
const C = { bg:"#020208", card:"#06060f", card2:"#0a0a1a", bord:"#1a1a3a",
  cyan:"#00f0ff", green:"#00ff88", purple:"#a855f7", orange:"#ff6b2b",
  gold:"#ffd700", red:"#ff4466", teal:"#06d6a0", text:"#e0e0ff", muted:"#6a6a9a", dim:"#3a3a5a" };

const CSS = `@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=JetBrains+Mono:wght@400;700&family=Sora:wght@300;400;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:${C.card2}}
::-webkit-scrollbar-thumb{background:${C.bord};border-radius:3px}
textarea::placeholder{color:#2a2a4a}`;

/* ══════════════════════════════════════════════════════════════ */
export default function NeuralForge() {
  // ── All state ──
  const [view, setView] = useState("home"); // home | loading | learn | done
  const [chId, setChId] = useState(null);
  const [steps, setSteps] = useState([]); // loading step statuses
  const [D, setD] = useState({}); // all generated data
  const [pi, setPi] = useState(0); // phase index
  const [mode, setMode] = useState("a"); // sub-mode within phase
  const [qi, setQi] = useState(0); // question/item index
  const [ans, setAns] = useState(null);
  const [show, setShow] = useState(false);
  const [flip, setFlip] = useState(false);
  const [seen, setSeen] = useState(new Set());
  const [score, setScore] = useState({ c: 0, w: 0 });
  const [learn, setLearn] = useState(false);
  const [conf, setConf] = useState(null); // confidence 1-5
  const [results, setResults] = useState([]); // transcend results
  const [revealed, setRevealed] = useState(false);
  const [subDone, setSubDone] = useState({});
  const [timer, setTimer] = useState(0);
  const [running, setRunning] = useState(false);
  const tRef = useRef(null);

  const ch = CHS.find(c => c.id === chId);
  const phase = PHASES[pi];

  useEffect(() => {
    if (running) tRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    else clearInterval(tRef.current);
    return () => clearInterval(tRef.current);
  }, [running]);

  const tStr = `${Math.floor(timer/60).toString().padStart(2,"0")}:${(timer%60).toString().padStart(2,"0")}`;

  // ── Reset sub-state for new phase/mode ──
  const resetSub = () => { setQi(0); setAns(null); setShow(false); setFlip(false);
    setSeen(new Set()); setScore({c:0,w:0}); setLearn(false); setConf(null); setMode("a"); setRevealed(false); setSubDone({}); };

  // ── LOAD CHAPTER — v3 pattern: sequential, with per-step status ──
  const loadChapter = async (id) => {
    setChId(id); setView("loading"); setPi(0); setD({}); resetSub(); setTimer(0); setResults([]);
    const ch = CHS.find(c => c.id === id);
    const pr = ch.p;

    const S = [
      { label: "Core Concepts", key: "concepts" },
      { label: "Immersive Dilemmas", key: "dilemmas" },
      { label: "Rapid Fire Questions", key: "rapid" },
      { label: "Deep Drill Questions", key: "drill" },
      { label: "Spot the Lie", key: "corruptions" },
      { label: "Cross-Exam Challenges", key: "crossExam" },
      { label: "Domain Transfer", key: "transfer" },
      { label: "Teach Back Prompts", key: "teachBack" },
      { label: "Boss Fight", key: "boss" },
    ];
    const st = S.map(s => ({ ...s, status: "waiting" }));
    setSteps([...st]);

    const built = {};
    const up = (i, status) => { st[i].status = status; setSteps([...st]); };

    // 1: Concepts — CRITICAL
    up(0, "loading");
    built.concepts = await ask(
      `Generate 12 concepts as a JSON array. Each: {"id":1,"name":"string","core":"1-2 sentence explanation for beginners","detail":"2-3 sentences with example","mnemonic":"vivid memory hook","primer":"1 sentence context","cat":"category"}`,
      "Break into concepts for a student who hasn't read the textbook: " + pr
    );
    if (!built.concepts || !Array.isArray(built.concepts) || !built.concepts.length) {
      up(0, "failed");
      // Try once more with even simpler prompt
      built.concepts = await ask(
        `Return a JSON array of 10 objects: [{"id":1,"name":"term","core":"definition","detail":"example","mnemonic":"memory trick","primer":"context","cat":"topic"}]`,
        "Define key terms from: " + pr
      );
    }
    up(0, built.concepts ? "done" : "failed");

    if (!built.concepts || !built.concepts.length) {
      setD({ _error: true }); setView("learn"); return;
    }

    const cShort = built.concepts.map(c => `${c.name}: ${c.core}`).join(". ");

    // 2-9: Everything else (failures are OK — those engines just won't appear)
    const calls = [
      [1, `Generate 3 ethical dilemmas as JSON array. Each: {"scenario":"3 sentences","question":"What would you do?","choices":[{"text":"option","label":"2 words","framework":"theory","reasoning":"2 sentences"}],"insight":"aha moment","conceptName":"concept"}. Each needs 3 choices.`, "Create dilemmas about: "+pr],
      [2, `Generate 10 true/false statements as JSON array. Each: {"q":"statement","a":true,"why":"explanation"}. Mix true and false roughly equally.`, "True/false about: "+cShort],
      [3, `Generate 12 multiple choice questions as JSON array. Each: {"q":"question","opts":["A","B","C","D"],"c":0,"why":"explanation","cid":1}. "c" is 0-based index of correct answer. Always 4 options.`, "Questions about: "+cShort],
      [4, `Generate 4 subtly wrong statements as JSON array. Each: {"statement":"plausible but wrong","error":"what's wrong","correct":"the truth","hint":"clue"}`, "Create corrupted versions of: "+cShort],
      [5, `Generate 3 devil's advocate arguments as JSON array. Each: {"challenge":"convincing counter-argument","hint":"what to consider","rebuttal":"why it fails"}`, "Challenge: "+cShort],
      [6, `Generate 3 novel scenarios as JSON array. Each: {"domain":"e.g. AI Ethics","scenario":"3 sentences","question":"How do concepts apply?","analysis":"3 sentence answer"}`, "Apply to new domains: "+cShort],
      [7, `Generate 3 teaching prompts as JSON array. Each: {"prompt":"Explain X as if teaching a curious child","keyPoints":["point1","point2"],"cid":1}`, "Teach-back for: "+cShort],
      [8, `Generate 10 hard questions as JSON array. Each: {"q":"synthesis question","opts":["A","B","C","D"],"c":0,"why":"explanation"}. "c" is 0-based. Include questions combining concepts.`, "Hard assessment: "+cShort],
    ];

    for (const [i, sys, usr] of calls) {
      up(i, "loading");
      const result = await ask(sys, usr);
      built[S[i].key] = Array.isArray(result) ? result : (result ? [result] : []);
      up(i, built[S[i].key].length > 0 ? "done" : "failed");
    }

    setD(built);
    setView("learn");
    setRunning(true);
  };

  // ── Navigation helpers ──
  const goHome = () => { setView("home"); setRunning(false); resetSub(); };
  const nextPhase = () => {
    if (pi < PHASES.length - 1) { setPi(pi + 1); resetSub(); }
    else { setRunning(false); setView("done"); }
  };
  const concepts = D.concepts || [];
  const getConcept = (cid) => concepts.find(c => c.id === cid) || concepts[0] || null;

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════

  // ═══ HOME ═══
  if (view === "home") return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Sora',sans-serif" }}>
      <style>{CSS}</style>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "2rem 1rem", animation: "fadeIn .8s" }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ color: C.cyan, fontSize: "2.2rem", fontWeight: 900, fontFamily: "'Orbitron',sans-serif",
            textShadow: `0 0 20px ${C.cyan}44`, letterSpacing: ".12em" }}>NEURAL FORGE</div>
          <p style={{ color: C.muted, fontSize: ".8rem", marginTop: 6 }}>HOW SHOULD ONE LIVE? — Bradley Thames</p>
          <p style={{ color: C.teal, fontSize: ".65rem", marginTop: 4 }}>v4 · 5 Phases · 9 AI-Generated Engines · Back Buttons Everywhere</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: ".4rem", marginBottom: "1.5rem" }}>
          {PHASES.map(p => (
            <div key={p.id} style={{ background: C.card2, border: `1px solid ${C.bord}`, borderRadius: 8,
              padding: ".5rem .25rem", textAlign: "center" }}>
              <div style={{ fontSize: ".95rem" }}>{p.icon}</div>
              <div style={{ fontSize: ".4rem", color: p.color, fontWeight: 700, marginTop: 1 }}>{p.label}</div>
            </div>
          ))}
        </div>

        {CHS.map(c => (
          <button key={c.id} onClick={() => loadChapter(c.id)}
            style={{ display: "flex", alignItems: "center", gap: ".9rem", padding: ".85rem 1rem",
              background: C.card, border: `1px solid ${C.bord}`, borderRadius: 11, cursor: "pointer",
              textAlign: "left", width: "100%", marginBottom: ".5rem", transition: "all .25s" }}>
            <div style={{ width: 36, textAlign: "center", color: C.cyan, fontWeight: 700, fontSize: ".9rem" }}>
              {c.id}</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#d0d0f0", fontSize: ".85rem", fontWeight: 600 }}>{c.title}</div>
            </div>
            <span style={{ color: C.dim }}>→</span>
          </button>
        ))}
      </div>
    </div>
  );

  // ═══ LOADING ═══
  if (view === "loading") return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Sora',sans-serif", padding: "2rem 1rem" }}>
      <style>{CSS}</style>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <button onClick={goHome} style={{ background: C.card2, border: `1px solid ${C.bord}`, borderRadius: 8,
            color: C.muted, padding: ".4rem .9rem", fontSize: ".7rem", fontWeight: 700, cursor: "pointer" }}>
            ← BACK</button>
          <span style={{ color: C.cyan, fontSize: ".8rem", fontFamily: "'Orbitron',sans-serif" }}>BUILDING...</span>
        </div>

        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ color: C.cyan, fontSize: "1rem", fontWeight: 700 }}>{ch?.title}</div>
          <p style={{ color: C.dim, fontSize: ".7rem", marginTop: 4 }}>Generating 9 learning engines via AI</p>
        </div>

        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: ".75rem", marginBottom: ".5rem",
            padding: ".65rem .85rem", background: C.card,
            border: `1px solid ${s.status === "done" ? "#00ff8833" : s.status === "failed" ? "#ff446633" : s.status === "loading" ? "#00f0ff33" : C.bord}`,
            borderRadius: 8, transition: "all .3s" }}>
            <div style={{ width: 24, textAlign: "center", fontSize: ".85rem", flexShrink: 0 }}>
              {s.status === "done" ? "✅" :
               s.status === "failed" ? "❌" :
               s.status === "loading" ? <span style={{ display: "inline-block", width: 14, height: 14,
                 border: `2px solid ${C.cyan}`, borderTopColor: "transparent", borderRadius: "50%",
                 animation: "spin .8s linear infinite" }} /> :
               "○"}
            </div>
            <div style={{ flex: 1, fontSize: ".8rem",
              color: s.status === "done" ? C.green : s.status === "failed" ? C.red :
                     s.status === "loading" ? C.cyan : C.dim }}>
              {s.label}
              {s.status === "loading" && <span style={{ color: C.dim, marginLeft: 6, fontSize: ".65rem" }}>generating...</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ═══ DONE ═══
  if (view === "done") return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Sora',sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{CSS}</style>
      <div style={{ textAlign: "center", animation: "fadeIn .8s" }}>
        <div style={{ fontSize: "4rem", fontWeight: 900, color: C.gold, fontFamily: "'Orbitron',sans-serif",
          textShadow: `0 0 60px ${C.gold}44` }}>🏆</div>
        <div style={{ color: C.gold, fontSize: "1.5rem", fontWeight: 900, fontFamily: "'Orbitron',sans-serif", marginTop: ".5rem" }}>
          CHAPTER COMPLETE</div>
        <p style={{ color: C.muted, marginTop: ".5rem" }}>{ch?.title}</p>
        <p style={{ color: C.dim, marginTop: ".25rem" }}>Time: {tStr} · Score: {score.c} correct</p>
        <button onClick={goHome} style={{ marginTop: "1.5rem", background: `linear-gradient(135deg,${C.gold},#ff8800)`,
          color: "#000", border: "none", borderRadius: 50, padding: ".9rem 2.5rem", fontWeight: 800,
          fontSize: ".9rem", cursor: "pointer", fontFamily: "'Orbitron',sans-serif" }}>
          BACK TO CHAPTERS</button>
      </div>
    </div>
  );

  // ═══ LEARN VIEW ═══
  // Error state
  if (D._error) return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Sora',sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{CSS}</style>
      <div style={{ textAlign: "center", maxWidth: 400, padding: "2rem" }}>
        <p style={{ color: C.red, fontSize: "1rem", marginBottom: "1rem" }}>
          ⚠ Failed to generate concepts. The API may be unavailable.</p>
        <div style={{ display: "flex", gap: ".75rem", justifyContent: "center" }}>
          <button onClick={() => loadChapter(chId)} style={{ background: `linear-gradient(135deg,${C.cyan},#0080ff)`,
            color: "#000", border: "none", borderRadius: 10, padding: ".75rem 2rem", fontWeight: 800, cursor: "pointer" }}>
            RETRY</button>
          <button onClick={goHome} style={{ background: C.card2, border: `1px solid ${C.bord}`,
            color: C.muted, borderRadius: 10, padding: ".75rem 2rem", fontWeight: 800, cursor: "pointer" }}>
            BACK</button>
        </div>
      </div>
    </div>
  );

  // ── Top bar ──
  const topBar = (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: ".5rem 1rem", borderBottom: "1px solid #1a1a2a", background: "#04040c" }}>
      <div style={{ display: "flex", gap: ".35rem", alignItems: "center" }}>
        {PHASES.map((p, i) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%",
              background: pi > i ? C.green : pi === i ? p.color : C.bord,
              boxShadow: pi === i ? `0 0 5px ${p.color}66` : "none" }} />
            <span style={{ fontSize: ".45rem", color: pi === i ? p.color : pi > i ? C.green : "#2a2a4a",
              fontWeight: 700 }}>{p.label}</span>
          </div>
        ))}
      </div>
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "1.1rem", fontWeight: 700,
        color: C.cyan, textShadow: `0 0 10px ${C.cyan}44` }}>{tStr}</span>
    </div>
  );

  const subBar = (
    <div style={{ textAlign: "center", padding: ".4rem", background: "#04040c", borderBottom: "1px solid #0a0a1a" }}>
      <span style={{ fontSize: ".6rem", color: C.dim }}>{ch?.title} · </span>
      <span style={{ fontSize: ".6rem", color: phase?.color, fontWeight: 700 }}>{phase?.icon} {phase?.label}</span>
    </div>
  );

  const backBtn = (target) => (
    <button onClick={target} style={{ background: C.card2, border: `1px solid ${C.bord}`, borderRadius: 8,
      color: C.muted, padding: ".4rem .9rem", fontSize: ".7rem", fontWeight: 700, cursor: "pointer" }}>
      ← BACK</button>
  );

  const advBtn = (label, onClick, color = C.cyan) => (
    <div style={{ textAlign: "center", marginTop: "1rem" }}>
      <button onClick={onClick} style={{ background: `linear-gradient(135deg,${color},${color}88)`,
        color: "#000", border: "none", borderRadius: 50, padding: ".85rem 2.5rem", fontWeight: 800,
        fontSize: ".85rem", cursor: "pointer" }}>{label}</button>
    </div>
  );

  // ── Phase renderer ──
  let content = null;

  // ═══ GENESIS ═══
  if (phase?.id === "genesis") {
    const dilemmas = D.dilemmas || [];
    const d = dilemmas[qi];

    if (mode === "a") {
      // Dilemmas
      if (!d || qi >= dilemmas.length) {
        content = <div style={{ textAlign: "center", padding: "2rem" }}>
          <div style={{ color: C.teal, fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>
            {dilemmas.length > 0 ? "🌅 Dilemmas Complete!" : "No dilemmas generated."}</div>
          <p style={{ color: C.muted, fontSize: ".8rem", marginBottom: "1rem" }}>{concepts.length} concepts ready to scan.</p>
          <button onClick={() => { setMode("b"); setQi(0); setFlip(false); setSeen(new Set()); }}
            style={{ background: `linear-gradient(135deg,${C.teal},#00b894)`, color: "#000", border: "none",
              borderRadius: 50, padding: ".85rem 2.5rem", fontWeight: 800, cursor: "pointer" }}>
            BEGIN CONCEPT SCAN →</button>
        </div>;
      } else {
        content = <div style={{ animation: "fadeIn .5s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".75rem" }}>
            {backBtn(goHome)}
            <span style={{ color: C.dim, fontSize: ".7rem" }}>{qi + 1}/{dilemmas.length}</span>
          </div>
          <div style={{ background: C.card, border: `1px solid #06d6a033`, borderRadius: 14, padding: "1.25rem", marginBottom: ".75rem" }}>
            <div style={{ fontSize: ".6rem", color: C.teal, letterSpacing: ".12em", fontWeight: 700, marginBottom: 8 }}>🌅 SCENARIO</div>
            <p style={{ fontSize: ".9rem", lineHeight: 1.7, marginBottom: ".75rem" }}>{d.scenario}</p>
            <p style={{ color: C.teal, fontWeight: 600 }}>{d.question}</p>
          </div>

          {ans === null ? <div>
            <p style={{ color: C.dim, fontSize: ".7rem", textAlign: "center", marginBottom: ".5rem" }}>
              No wrong answer — go with your gut.</p>
            {(d.choices || []).map((c, i) => (
              <button key={i} onClick={() => setAns(i)} style={{ display: "block", width: "100%", padding: ".8rem 1rem",
                background: C.card2, border: `1px solid ${C.bord}`, borderRadius: 10, color: "#b0b0d0",
                fontSize: ".8rem", textAlign: "left", cursor: "pointer", lineHeight: 1.5, marginBottom: ".4rem" }}>
                <span style={{ fontWeight: 700, marginRight: 8, color: C.teal }}>{String.fromCharCode(65 + i)}</span>{c.text}
              </button>
            ))}
          </div> : <div style={{ animation: "fadeIn .4s" }}>
            <div style={{ background: "#0a0f1a", border: "1px solid #00f0ff33", borderRadius: 12, padding: "1.1rem", marginBottom: ".75rem" }}>
              <div style={{ fontSize: ".6rem", color: C.gold, letterSpacing: ".12em", fontWeight: 700, marginBottom: 6 }}>
                💡 HERE'S WHAT JUST HAPPENED</div>
              <p style={{ fontSize: ".85rem", lineHeight: 1.7, marginBottom: ".75rem" }}>{d.insight}</p>
              <div style={{ background: "#0d1020", borderRadius: 8, padding: ".7rem", borderLeft: `3px solid ${C.teal}` }}>
                <span style={{ fontSize: ".7rem", color: C.teal, fontWeight: 700 }}>Concept: </span>
                <span style={{ fontSize: ".8rem" }}>{d.conceptName}</span>
              </div>
            </div>
            {(d.choices || []).map((c, i) => (
              <div key={i} style={{ padding: ".5rem .8rem", background: i === ans ? "#06d6a011" : C.card,
                border: `1px solid ${i === ans ? "#06d6a033" : "#0a0a1a"}`, borderRadius: 8, fontSize: ".7rem",
                color: "#8a8ab0", lineHeight: 1.5, marginBottom: ".3rem" }}>
                <span style={{ color: C.teal, fontWeight: 700, marginRight: 5 }}>{c.label}: </span>{c.reasoning}
              </div>
            ))}
            <button onClick={() => { setQi(qi + 1); setAns(null); }}
              style={{ display: "block", margin: "1rem auto 0", background: `linear-gradient(135deg,${C.teal},#00b894)`,
                color: "#000", border: "none", borderRadius: 50, padding: ".75rem 2rem", fontWeight: 800, cursor: "pointer" }}>
              {qi < dilemmas.length - 1 ? "NEXT SCENARIO →" : "CONCEPT SCAN →"}</button>
          </div>}
        </div>;
      }
    } else if (mode === "b") {
      // Concept scan
      const c = concepts[qi];
      if (!c || qi >= concepts.length) {
        content = <div style={{ textAlign: "center", padding: "2rem" }}>
          <div style={{ color: C.teal, fontSize: "1rem", fontWeight: 700 }}>🧠 All {concepts.length} Concepts Scanned!</div>
          {advBtn("ADVANCE TO FORGE →", nextPhase, C.teal)}
        </div>;
      } else {
        content = <div style={{ animation: "fadeIn .5s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".75rem" }}>
            {backBtn(() => { setMode("a"); setQi(0); setAns(null); })}
            <span style={{ color: C.cyan, fontWeight: 700, fontSize: ".85rem" }}>{seen.size}/{concepts.length}</span>
          </div>
          <div onClick={() => {
            if (!flip) { const s = new Set(seen); s.add(c.id); setSeen(s); }
            setFlip(!flip);
          }} style={{ background: flip ? "#080e1a" : C.card, border: `1px solid ${flip ? "#00f0ff33" : C.bord}`,
            borderRadius: 14, padding: "1.5rem", minHeight: 180, cursor: "pointer", transition: "all .4s" }}>
            <div style={{ fontSize: ".6rem", color: C.teal, letterSpacing: ".1em", fontWeight: 700, marginBottom: 8 }}>
              {c.cat || "CONCEPT"}</div>
            <h2 style={{ fontSize: "1.2rem", marginBottom: ".75rem" }}>{c.name}</h2>
            {!flip ? <p style={{ color: "#8a8ab0", fontSize: ".9rem", lineHeight: 1.7 }}>{c.core}</p> : (
              <div style={{ animation: "fadeIn .3s" }}>
                <p style={{ color: "#b0b0d0", fontSize: ".85rem", lineHeight: 1.7, marginBottom: "1rem" }}>{c.detail}</p>
                <div style={{ background: "#0d1020", borderRadius: 8, padding: ".7rem", borderLeft: `3px solid ${C.gold}` }}>
                  <span style={{ fontSize: ".65rem", color: C.gold, fontWeight: 700 }}>💡 </span>
                  <span style={{ fontSize: ".8rem", fontStyle: "italic" }}>{c.mnemonic}</span>
                </div>
              </div>
            )}
            <div style={{ textAlign: "center", marginTop: "1rem", fontSize: ".6rem", color: C.dim }}>
              {flip ? "TAP → next" : "TAP → reveal"}</div>
          </div>
          <div style={{ display: "flex", gap: ".5rem", justifyContent: "center", marginTop: ".75rem" }}>
            <button onClick={() => { setQi(Math.max(0, qi - 1)); setFlip(false); }}
              disabled={qi === 0} style={{ background: C.card2, border: `1px solid ${C.bord}`, borderRadius: 10,
                color: qi === 0 ? C.dim : C.muted, padding: ".5rem 1rem", fontSize: ".75rem", fontWeight: 700, cursor: "pointer" }}>
              ←</button>
            {flip && <button onClick={() => { setQi(qi + 1); setFlip(false); }}
              style={{ background: `linear-gradient(135deg,${C.cyan},#0080ff)`, color: "#000", border: "none",
                borderRadius: 10, padding: ".5rem 1rem", fontSize: ".75rem", fontWeight: 800, cursor: "pointer" }}>
              NEXT →</button>}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", marginTop: "1rem" }}>
            {concepts.map((x, i) => <div key={x.id} style={{ width: 8, height: 8, borderRadius: "50%",
              background: i === qi ? C.cyan : seen.has(x.id) ? "#00f0ff44" : C.bord }} />)}
          </div>
          {seen.size >= concepts.length && advBtn("ADVANCE TO FORGE →", nextPhase, C.cyan)}
        </div>;
      }
    }
  }

  // ═══ FORGE ═══
  else if (phase?.id === "forge") {
    const rapid = D.rapid || [];
    const drill = D.drill || [];

    if (mode === "a") {
      // Rapid fire
      const q = rapid[qi];
      if (!q || qi >= rapid.length) {
        const pct = rapid.length ? Math.round(score.c / rapid.length * 100) : 0;
        content = <div style={{ textAlign: "center", padding: "2rem" }}>
          <div style={{ color: C.green, fontSize: "2rem", fontWeight: 900, fontFamily: "'Orbitron',sans-serif" }}>{pct}%</div>
          <p style={{ color: C.muted, marginTop: ".5rem" }}>Rapid Fire: {score.c}/{rapid.length}</p>
          <button onClick={() => { setMode("b"); setQi(0); setAns(null); setShow(false); setScore({c:0,w:0}); }}
            style={{ marginTop: "1rem", background: `linear-gradient(135deg,${C.cyan},#0080ff)`, color: "#000",
              border: "none", borderRadius: 50, padding: ".85rem 2rem", fontWeight: 800, cursor: "pointer" }}>
            DEEP DRILL →</button>
        </div>;
      } else {
        content = <div style={{ animation: "fadeIn .5s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".75rem" }}>
            {backBtn(goHome)}
            <div><span style={{ color: C.green, fontWeight: 700 }}>{score.c}</span>
              <span style={{ color: C.dim }}> / </span>
              <span style={{ color: C.red, fontWeight: 700 }}>{score.w}</span>
              <span style={{ color: C.dim, marginLeft: 8, fontSize: ".75rem" }}>{qi + 1}/{rapid.length}</span></div>
          </div>
          <div style={{ fontSize: ".6rem", color: C.green, letterSpacing: ".12em", fontWeight: 700, marginBottom: 8 }}>⚡ RAPID FIRE</div>
          <div style={{ background: C.card, border: `1px solid ${C.bord}`, borderRadius: 14, padding: "1.25rem", marginBottom: ".75rem" }}>
            <p style={{ fontSize: ".95rem", lineHeight: 1.7 }}>{q.q}</p></div>

          {ans === null ? <div style={{ display: "flex", gap: ".75rem", justifyContent: "center" }}>
            <button onClick={() => { setAns(true); if (q.a === true) setScore(p=>({...p,c:p.c+1})); else setScore(p=>({...p,w:p.w+1})); }}
              style={{ background: `linear-gradient(135deg,${C.teal},#00b894)`, color: "#000", border: "none",
                borderRadius: 10, padding: "1rem 2.5rem", fontSize: "1rem", fontWeight: 800, cursor: "pointer" }}>TRUE</button>
            <button onClick={() => { setAns(false); if (q.a === false) setScore(p=>({...p,c:p.c+1})); else setScore(p=>({...p,w:p.w+1})); }}
              style={{ background: `linear-gradient(135deg,${C.orange},${C.red})`, color: "#000", border: "none",
                borderRadius: 10, padding: "1rem 2.5rem", fontSize: "1rem", fontWeight: 800, cursor: "pointer" }}>FALSE</button>
          </div> : <div style={{ background: ans === q.a ? "#00ff8808" : "#ff446608",
            border: `1px solid ${ans === q.a ? "#00ff8833" : "#ff446633"}`, borderRadius: 10, padding: "1rem" }}>
            <div style={{ fontWeight: 800, color: ans === q.a ? C.green : C.red, marginBottom: 6, fontSize: ".8rem" }}>
              {ans === q.a ? "✓ CORRECT" : "✗ INCORRECT"}</div>
            <p style={{ color: "#9a9ac0", fontSize: ".8rem", lineHeight: 1.6 }}>{q.why}</p>
            <button onClick={() => { setQi(qi + 1); setAns(null); }}
              style={{ marginTop: ".75rem", background: `linear-gradient(135deg,${C.cyan},#0080ff)`, color: "#000",
                border: "none", borderRadius: 10, padding: ".75rem 2rem", fontWeight: 800, cursor: "pointer" }}>NEXT →</button>
          </div>}
        </div>;
      }
    } else if (mode === "b") {
      // Deep drill with Learn First
      const q = drill[qi];
      const concept = q ? getConcept(q.cid) : null;

      if (!q || qi >= drill.length) {
        const pct = drill.length ? Math.round(score.c / drill.length * 100) : 0;
        content = <div style={{ textAlign: "center", padding: "2rem" }}>
          <div style={{ color: C.green, fontSize: "2rem", fontWeight: 900, fontFamily: "'Orbitron',sans-serif" }}>{pct}%</div>
          <p style={{ color: C.muted, marginTop: ".5rem" }}>Deep Drill: {score.c}/{drill.length}</p>
          {advBtn("ADVANCE TO CRUCIBLE →", nextPhase, C.cyan)}
        </div>;
      } else if (learn && concept) {
        content = <div style={{ animation: "fadeIn .3s" }}>
          <div style={{ background: "#06d6a008", border: "1px solid #06d6a033", borderRadius: 12, padding: "1.25rem" }}>
            <div style={{ fontSize: ".6rem", color: C.teal, letterSpacing: ".12em", fontWeight: 700, marginBottom: 8 }}>
              💡 LEARN FIRST — {concept.name}</div>
            <p style={{ fontSize: ".9rem", lineHeight: 1.7, marginBottom: ".5rem" }}>{concept.core}</p>
            <p style={{ color: "#a0a0c0", fontSize: ".85rem", lineHeight: 1.6, marginBottom: ".5rem" }}>{concept.detail}</p>
            {concept.mnemonic && <div style={{ background: "#0d1020", borderRadius: 8, padding: ".7rem", borderLeft: `3px solid ${C.gold}` }}>
              <span style={{ fontSize: ".65rem", color: C.gold, fontWeight: 700 }}>💡 </span>
              <span style={{ fontSize: ".8rem", fontStyle: "italic" }}>{concept.mnemonic}</span></div>}
            <button onClick={() => setLearn(false)}
              style={{ marginTop: ".75rem", background: `linear-gradient(135deg,${C.teal},#00b894)`, color: "#000",
                border: "none", borderRadius: 10, padding: ".5rem 1.5rem", fontWeight: 800, cursor: "pointer", fontSize: ".8rem" }}>
              GOT IT →</button>
          </div>
        </div>;
      } else {
        content = <div style={{ animation: "fadeIn .5s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".5rem" }}>
            {backBtn(goHome)}
            <div><span style={{ color: C.green, fontWeight: 700 }}>{score.c}</span>
              <span style={{ color: C.dim }}> / </span>
              <span style={{ color: C.red, fontWeight: 700 }}>{score.w}</span>
              <span style={{ color: C.dim, marginLeft: 8, fontSize: ".75rem" }}>{qi + 1}/{drill.length}</span></div>
          </div>
          <div style={{ fontSize: ".6rem", color: C.cyan, letterSpacing: ".12em", fontWeight: 700, marginBottom: 8 }}>🎯 DEEP DRILL</div>
          {concept?.primer && <p style={{ fontSize: ".7rem", color: C.teal, marginBottom: ".5rem", fontStyle: "italic" }}>
            💡 {concept.primer}</p>}
          <div style={{ background: C.card, border: `1px solid ${C.bord}`, borderRadius: 14, padding: "1.1rem", marginBottom: ".5rem" }}>
            <p style={{ fontSize: ".9rem", lineHeight: 1.7 }}>{q.q}</p></div>

          {!show && <div style={{ textAlign: "center", marginBottom: ".5rem" }}>
            <button onClick={() => setLearn(true)}
              style={{ background: "#06d6a011", border: "1px solid #06d6a044", color: C.teal, borderRadius: 20,
                padding: ".35rem 1rem", fontSize: ".65rem", fontWeight: 700, cursor: "pointer" }}>
              💡 LEARN FIRST</button></div>}

          {(q.opts || []).map((o, i) => {
            let bg = C.card2, bc = C.bord, cl = "#b0b0d0";
            if (show) { if (i === q.c) { bg = "#00ff8811"; bc = C.green; cl = C.green; }
              else if (i === ans) { bg = "#ff446611"; bc = C.red; cl = C.red; } }
            return <button key={i} onClick={() => { if (show) return; setAns(i); setShow(true);
              if (i === q.c) setScore(p=>({...p,c:p.c+1})); else setScore(p=>({...p,w:p.w+1})); }}
              disabled={show} style={{ display: "block", width: "100%", padding: ".75rem 1rem", background: bg,
                border: `1px solid ${bc}`, borderRadius: 10, color: cl, fontSize: ".8rem", textAlign: "left",
                cursor: show ? "default" : "pointer", lineHeight: 1.5, marginBottom: ".4rem" }}>
              <span style={{ fontWeight: 700, marginRight: 8, color: C.dim }}>{String.fromCharCode(65 + i)}</span>{o}
            </button>;
          })}

          {show && <div style={{ background: ans === q.c ? "#00ff8808" : "#ff446608",
            border: `1px solid ${ans === q.c ? "#00ff8833" : "#ff446633"}`, borderRadius: 10, padding: "1rem", marginTop: ".5rem" }}>
            <div style={{ fontWeight: 800, color: ans === q.c ? C.green : C.red, marginBottom: 6, fontSize: ".8rem" }}>
              {ans === q.c ? "✓ CORRECT" : "✗ INCORRECT"}</div>
            <p style={{ color: "#9a9ac0", fontSize: ".8rem", lineHeight: 1.6 }}>{q.why}</p>
            <button onClick={() => { setQi(qi + 1); setAns(null); setShow(false); setLearn(false); }}
              style={{ marginTop: ".75rem", background: `linear-gradient(135deg,${C.cyan},#0080ff)`, color: "#000",
                border: "none", borderRadius: 10, padding: ".75rem 2rem", fontWeight: 800, cursor: "pointer" }}>
              {qi < drill.length - 1 ? "NEXT →" : "VIEW RESULTS"}</button>
          </div>}
        </div>;
      }
    }
  }

  // ═══ CRUCIBLE ═══
  else if (phase?.id === "crucible") {
    const corr = D.corruptions || [];
    const cross = D.crossExam || [];
    const trans = D.transfer || [];
    const items = mode === "corruption" ? corr : mode === "cross" ? cross : mode === "transfer" ? trans : [];
    const item = items[qi];

    if (mode === "a") {
      // Menu
      content = <div style={{ animation: "fadeIn .5s" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
          {backBtn(goHome)}
          <span style={{ color: C.orange, fontFamily: "'Orbitron',sans-serif", fontSize: ".9rem" }}>🔥 CRUCIBLE</span>
        </div>
        {[{id:"corruption",label:"🔍 Spot the Lie",n:corr.length},
          {id:"cross",label:"⚔️ Cross-Exam",n:cross.length},
          {id:"transfer",label:"🌐 Domain Transfer",n:trans.length}].map(m => (
          <button key={m.id} onClick={() => { setMode(m.id); setQi(0); setRevealed(false); }}
            disabled={!m.n} style={{ display: "flex", alignItems: "center", gap: ".9rem", padding: ".85rem 1rem",
              background: C.card, border: `1px solid ${subDone[m.id] ? "#00ff8833" : C.bord}`, borderRadius: 11,
              cursor: m.n ? "pointer" : "default", textAlign: "left", width: "100%", marginBottom: ".5rem",
              opacity: m.n ? 1 : .4 }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: C.orange, fontSize: ".8rem", fontWeight: 700 }}>{m.label}</div>
              <div style={{ color: C.dim, fontSize: ".6rem" }}>{m.n} challenges</div></div>
            <span style={{ color: subDone[m.id] ? C.green : C.dim }}>{subDone[m.id] ? "✓" : "→"}</span>
          </button>
        ))}
        {advBtn("ADVANCE TO ARCHITECT →", nextPhase, C.orange)}
      </div>;
    } else if (item) {
      const goBack = () => { setMode("a"); setQi(0); };
      const finish = () => { setSubDone(p => ({...p, [mode]: true})); goBack(); };
      const next = () => { if (qi < items.length - 1) { setQi(qi + 1); setRevealed(false); } else finish(); };

      if (mode === "corruption") {
        content = <div style={{ animation: "fadeIn .5s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".75rem" }}>
            {backBtn(goBack)}<span style={{ color: C.red, fontSize: ".7rem" }}>{qi+1}/{items.length}</span></div>
          <div style={{ background: C.card, border: "1px solid #ff446633", borderRadius: 14, padding: "1.25rem" }}>
            <div style={{ fontSize: ".6rem", color: C.red, letterSpacing: ".12em", fontWeight: 700, marginBottom: 8 }}>⚠ FIND THE ERROR</div>
            <p style={{ fontSize: ".9rem", lineHeight: 1.7 }}>{item.statement}</p>
            {!revealed && item.hint && <p style={{ color: C.dim, fontSize: ".7rem", marginTop: ".5rem", fontStyle: "italic" }}>💡 {item.hint}</p>}</div>
          {!revealed ? <div style={{ textAlign: "center", marginTop: ".75rem" }}>
            <button onClick={() => setRevealed(true)} style={{ background: `linear-gradient(135deg,${C.orange},${C.red})`,
              color: "#000", border: "none", borderRadius: 50, padding: ".75rem 2rem", fontWeight: 800, cursor: "pointer" }}>REVEAL →</button></div> : (
            <div style={{ animation: "fadeIn .3s", marginTop: ".75rem" }}>
              <div style={{ background: C.card, borderLeft: `3px solid ${C.red}`, borderRadius: 10, padding: "1rem", marginBottom: ".5rem" }}>
                <div style={{ fontSize: ".6rem", color: C.red, fontWeight: 700, marginBottom: 4 }}>ERROR</div>
                <p style={{ color: "#e0b0b0", fontSize: ".8rem", lineHeight: 1.5 }}>{item.error}</p></div>
              <div style={{ background: C.card, borderLeft: `3px solid ${C.green}`, borderRadius: 10, padding: "1rem" }}>
                <div style={{ fontSize: ".6rem", color: C.green, fontWeight: 700, marginBottom: 4 }}>TRUTH</div>
                <p style={{ color: "#b0e0b0", fontSize: ".8rem", lineHeight: 1.5 }}>{item.correct}</p></div>
              <div style={{ display: "flex", gap: ".4rem", marginTop: ".75rem", justifyContent: "center" }}>
                {["😕","🤔","✅"].map((l,i) => <button key={i} onClick={next}
                  style={{ background: C.card2, border: `1px solid ${C.bord}`, borderRadius: 10, color: C.muted,
                    padding: ".4rem .7rem", fontSize: ".75rem", cursor: "pointer" }}>{l}</button>)}</div>
            </div>)}
        </div>;
      } else if (mode === "cross") {
        content = <div style={{ animation: "fadeIn .5s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".75rem" }}>
            {backBtn(goBack)}<span style={{ color: C.gold, fontSize: ".7rem" }}>{qi+1}/{items.length}</span></div>
          <div style={{ background: C.card, border: "1px solid #ffd70033", borderRadius: 14, padding: "1.25rem" }}>
            <div style={{ fontSize: ".6rem", color: C.gold, letterSpacing: ".12em", fontWeight: 700, marginBottom: 8 }}>DEVIL'S ADVOCATE</div>
            <p style={{ fontSize: ".9rem", lineHeight: 1.7, fontStyle: "italic" }}>"{item.challenge}"</p>
            {!revealed && item.hint && <p style={{ color: C.dim, fontSize: ".7rem", marginTop: ".5rem" }}>💡 {item.hint}</p>}</div>
          {!revealed ? <div style={{ textAlign: "center", marginTop: ".75rem" }}>
            <button onClick={() => setRevealed(true)} style={{ background: `linear-gradient(135deg,${C.gold},#ff8800)`,
              color: "#000", border: "none", borderRadius: 50, padding: ".75rem 2rem", fontWeight: 800, cursor: "pointer" }}>REVEAL REBUTTAL</button></div> : (
            <div style={{ animation: "fadeIn .3s", marginTop: ".75rem" }}>
              <div style={{ background: C.card, borderLeft: `3px solid ${C.gold}`, borderRadius: 14, padding: "1rem" }}>
                <p style={{ color: "#d0d0b0", fontSize: ".8rem", lineHeight: 1.6 }}>{item.rebuttal}</p></div>
              <div style={{ display: "flex", gap: ".4rem", marginTop: ".75rem", justifyContent: "center" }}>
                {["😕","🤔","✅"].map((l,i) => <button key={i} onClick={next}
                  style={{ background: C.card2, border: `1px solid ${C.bord}`, borderRadius: 10, color: C.muted,
                    padding: ".4rem .7rem", fontSize: ".75rem", cursor: "pointer" }}>{l}</button>)}</div></div>)}
        </div>;
      } else if (mode === "transfer") {
        content = <div style={{ animation: "fadeIn .5s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".75rem" }}>
            {backBtn(goBack)}<span style={{ color: C.purple, fontSize: ".7rem" }}>{qi+1}/{items.length}</span></div>
          <div style={{ background: C.card, border: "1px solid #a855f733", borderRadius: 14, padding: "1.25rem" }}>
            <div style={{ fontSize: ".6rem", color: C.purple, letterSpacing: ".12em", fontWeight: 700, marginBottom: 8 }}>🌐 {item.domain}</div>
            <p style={{ fontSize: ".9rem", lineHeight: 1.7, marginBottom: ".75rem" }}>{item.scenario}</p>
            <p style={{ color: C.purple, fontWeight: 600 }}>{item.question}</p></div>
          {!revealed ? <div style={{ textAlign: "center", marginTop: ".75rem" }}>
            <button onClick={() => setRevealed(true)} style={{ background: "#a855f722", border: "1px solid #a855f744",
              color: C.purple, borderRadius: 50, padding: ".75rem 2rem", fontWeight: 800, cursor: "pointer" }}>REVEAL</button></div> : (
            <div style={{ animation: "fadeIn .3s", marginTop: ".75rem" }}>
              <div style={{ background: C.card, borderLeft: `3px solid ${C.purple}`, borderRadius: 14, padding: "1rem" }}>
                <p style={{ color: "#c0b0d0", fontSize: ".8rem", lineHeight: 1.6 }}>{item.analysis}</p></div>
              <div style={{ display: "flex", gap: ".4rem", marginTop: ".75rem", justifyContent: "center" }}>
                {["😕","🤔","✅"].map((l,i) => <button key={i} onClick={next}
                  style={{ background: C.card2, border: `1px solid ${C.bord}`, borderRadius: 10, color: C.muted,
                    padding: ".4rem .7rem", fontSize: ".75rem", cursor: "pointer" }}>{l}</button>)}</div></div>)}
        </div>;
      }
    } else {
      content = <div style={{ textAlign: "center", padding: "2rem" }}>
        <p style={{ color: C.muted }}>No data for this section.</p>
        <button onClick={() => setMode("a")} style={{ marginTop: ".75rem", background: C.card2,
          border: `1px solid ${C.bord}`, color: C.muted, borderRadius: 10, padding: ".6rem 1.5rem",
          fontWeight: 700, cursor: "pointer" }}>← BACK</button>
      </div>;
    }
  }

  // ═══ ARCHITECT ═══
  else if (phase?.id === "architect") {
    const tbs = D.teachBack || [];
    const tb = tbs[qi];
    if (!tb || qi >= tbs.length) {
      content = <div style={{ textAlign: "center", padding: "2rem" }}>
        <div style={{ color: C.purple, fontSize: "1rem", fontWeight: 700 }}>🏗️ Architect Complete!</div>
        {advBtn("ADVANCE TO TRANSCEND →", nextPhase, C.purple)}
      </div>;
    } else {
      content = <div style={{ animation: "fadeIn .5s" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".75rem" }}>
          {backBtn(goHome)}<span style={{ color: C.dim, fontSize: ".7rem" }}>{qi+1}/{tbs.length}</span></div>
        <div style={{ fontSize: ".6rem", color: C.purple, letterSpacing: ".12em", fontWeight: 700, marginBottom: 8 }}>🏗️ TEACH BACK</div>
        <div style={{ background: C.card, border: "1px solid #a855f733", borderRadius: 14, padding: "1.25rem", marginBottom: ".75rem" }}>
          <p style={{ fontSize: ".9rem", lineHeight: 1.7 }}>{tb.prompt}</p></div>
        {!revealed ? <div>
          <textarea placeholder="Explain in your own words..." style={{ width: "100%", minHeight: 120, padding: "1rem",
            background: C.card2, border: `1px solid ${C.bord}`, borderRadius: 10, color: C.text, fontSize: ".85rem",
            outline: "none", fontFamily: "'Sora',sans-serif", lineHeight: 1.6, boxSizing: "border-box" }} />
          <button onClick={() => setRevealed(true)}
            style={{ marginTop: ".75rem", background: `linear-gradient(135deg,${C.purple},#7c3aed)`, color: "#fff",
              border: "none", borderRadius: 10, padding: ".75rem 2rem", fontWeight: 800, cursor: "pointer" }}>
            CHECK MY UNDERSTANDING</button>
        </div> : <div style={{ animation: "fadeIn .3s" }}>
          <div style={{ background: C.card, borderLeft: `3px solid ${C.gold}`, borderRadius: 10, padding: "1rem" }}>
            <div style={{ fontSize: ".6rem", color: C.gold, fontWeight: 700, marginBottom: 6 }}>KEY POINTS TO COVER</div>
            {(tb.keyPoints || []).map((p, i) => <p key={i} style={{ color: "#b0b0d0", fontSize: ".8rem", lineHeight: 1.7 }}>✓ {p}</p>)}</div>
          <div style={{ display: "flex", gap: ".4rem", marginTop: ".75rem", justifyContent: "center" }}>
            {["😕 Missed","🤔 Partial","✅ Nailed"].map((l,i) => <button key={i}
              onClick={() => { setQi(qi + 1); setRevealed(false); }}
              style={{ background: C.card2, border: `1px solid ${C.bord}`, borderRadius: 10, color: C.muted,
                padding: ".4rem .7rem", fontSize: ".65rem", cursor: "pointer" }}>{l}</button>)}</div>
        </div>}
      </div>;
    }
  }

  // ═══ TRANSCEND ═══
  else if (phase?.id === "transcend") {
    const qs = D.boss || [];
    const q = qs[qi];

    if (!q || qi >= qs.length) {
      const ok = results.filter(r => r.ok).length;
      const pct = results.length ? Math.round(ok / results.length * 100) : 0;
      const grade = pct >= 90 ? "S" : pct >= 80 ? "A" : pct >= 70 ? "B" : pct >= 60 ? "C" : "D";
      const gc = {S:C.gold,A:C.green,B:C.cyan,C:C.orange,D:C.red}[grade];
      const oc = results.filter(r => !r.ok && r.conf >= 4).length;
      const uc = results.filter(r => r.ok && r.conf <= 2).length;

      content = <div style={{ textAlign: "center", padding: "1.5rem 0", animation: "fadeIn .8s" }}>
        <div style={{ fontSize: "4rem", fontWeight: 900, color: gc, fontFamily: "'Orbitron',sans-serif",
          textShadow: `0 0 60px ${gc}44` }}>{grade}</div>
        <div style={{ color: gc, fontSize: "1.1rem", fontWeight: 900, fontFamily: "'Orbitron',sans-serif", marginTop: ".5rem" }}>
          {pct >= 90 ? "NEURAL MASTERY" : pct >= 70 ? "WELL FORGED" : "KEEP FORGING"}</div>
        <p style={{ color: C.muted, marginTop: ".5rem" }}>{ok}/{results.length} ({pct}%)</p>
        {oc > 0 && <p style={{ color: C.orange, fontSize: ".8rem", marginTop: ".5rem" }}>⚠ Overconfident on {oc} wrong answer{oc>1?"s":""}</p>}
        {uc > 0 && <p style={{ color: C.green, fontSize: ".8rem", marginTop: ".3rem" }}>✓ Underconfident on {uc} right answer{uc>1?"s":""}</p>}
        {advBtn("CHAPTER COMPLETE 🏆", nextPhase, C.gold)}
      </div>;
    } else if (conf === null) {
      content = <div style={{ animation: "fadeIn .5s" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".75rem" }}>
          {backBtn(goHome)}<span style={{ color: C.dim, fontSize: ".7rem" }}>{qi+1}/{qs.length}</span></div>
        <div style={{ background: "#1a1a2e", borderRadius: 20, height: 6, marginBottom: ".75rem", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(qi/qs.length)*100}%`, background: `linear-gradient(90deg,${C.gold},#ff8800)`, borderRadius: 20 }} /></div>
        <div style={{ background: C.card, border: "1px solid #ffd70033", borderRadius: 14, padding: "1.25rem", marginBottom: "1rem" }}>
          <p style={{ fontSize: ".9rem", lineHeight: 1.7 }}>{q.q}</p></div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: ".6rem", color: C.gold, letterSpacing: ".12em", fontWeight: 700, marginBottom: 8 }}>
            HOW CONFIDENT ARE YOU?</div>
          <div style={{ display: "flex", gap: ".5rem", justifyContent: "center" }}>
            {[1,2,3,4,5].map(n => <button key={n} onClick={() => setConf(n)}
              style={{ width: 44, height: 44, borderRadius: "50%", border: "1px solid #ffd70044",
                background: C.card2, color: C.gold, fontSize: "1rem", fontWeight: 700, cursor: "pointer" }}>{n}</button>)}</div>
          <div style={{ display: "flex", justifyContent: "space-between", margin: ".5rem 1rem 0", fontSize: ".6rem", color: C.dim }}>
            <span>No idea</span><span>Certain</span></div>
        </div>
      </div>;
    } else if (!show) {
      content = <div style={{ animation: "fadeIn .3s" }}>
        <span style={{ fontSize: ".65rem", color: C.gold }}>Confidence: {"⭐".repeat(conf)}</span>
        <div style={{ background: C.card, border: "1px solid #ffd70033", borderRadius: 14, padding: "1.1rem", margin: ".5rem 0" }}>
          <p style={{ fontSize: ".9rem", lineHeight: 1.7 }}>{q.q}</p></div>
        {(q.opts || []).map((o, i) => (
          <button key={i} onClick={() => { setAns(i); setShow(true);
            if (i === q.c) setScore(p=>({...p,c:p.c+1})); else setScore(p=>({...p,w:p.w+1})); }}
            style={{ display: "block", width: "100%", padding: ".75rem 1rem", background: C.card2,
              border: `1px solid ${C.bord}`, borderRadius: 10, color: "#b0b0d0", fontSize: ".8rem",
              textAlign: "left", cursor: "pointer", lineHeight: 1.5, marginBottom: ".4rem" }}>
            <span style={{ fontWeight: 700, marginRight: 8, color: C.dim }}>{String.fromCharCode(65+i)}</span>{o}
          </button>))}
      </div>;
    } else {
      const ok = ans === q.c;
      content = <div style={{ animation: "fadeIn .3s" }}>
        {(q.opts || []).map((o, i) => {
          let bg = C.card2, bc = C.bord, cl = "#b0b0d0";
          if (i === q.c) { bg = "#00ff8811"; bc = C.green; cl = C.green; }
          else if (i === ans) { bg = "#ff446611"; bc = C.red; cl = C.red; }
          return <div key={i} style={{ padding: ".6rem 1rem", background: bg, border: `1px solid ${bc}`,
            borderRadius: 10, color: cl, fontSize: ".8rem", marginBottom: ".3rem" }}>
            <span style={{ fontWeight: 700, marginRight: 8 }}>{String.fromCharCode(65+i)}</span>{o}</div>;
        })}
        <div style={{ background: ok ? "#00ff8808" : "#ff446608", border: `1px solid ${ok ? "#00ff8833" : "#ff446633"}`,
          borderRadius: 10, padding: "1rem", marginTop: ".5rem" }}>
          <div style={{ fontWeight: 800, color: ok ? C.green : C.red, marginBottom: 6, fontSize: ".8rem" }}>
            {ok ? "✓ CORRECT" : "✗ INCORRECT"}</div>
          <p style={{ color: "#9a9ac0", fontSize: ".8rem", lineHeight: 1.6 }}>{q.why}</p>
          {ok && conf <= 2 && <p style={{ color: C.teal, fontSize: ".75rem", marginTop: ".5rem" }}>💡 You knew more than you thought!</p>}
          {!ok && conf >= 4 && <p style={{ color: C.orange, fontSize: ".75rem", marginTop: ".5rem" }}>⚠ Blind spot detected.</p>}
        </div>
        <button onClick={() => { setResults([...results, { ok, conf }]); setQi(qi+1); setAns(null); setShow(false); setConf(null); }}
          style={{ marginTop: ".75rem", background: `linear-gradient(135deg,${C.gold},#ff8800)`, color: "#000",
            border: "none", borderRadius: 10, padding: ".75rem 2rem", fontWeight: 800, cursor: "pointer" }}>
          {qi < qs.length - 1 ? "NEXT →" : "VIEW RESULTS 🏆"}</button>
      </div>;
    }
  }

  if (!content) content = <div style={{ textAlign: "center", padding: "2rem" }}>
    <p style={{ color: C.muted }}>Loading phase content...</p>
    {advBtn("SKIP →", nextPhase, C.dim)}
  </div>;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Sora',sans-serif" }}>
      <style>{CSS}</style>
      {topBar}
      {subBar}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "1rem" }}>{content}</div>
    </div>
  );
}
