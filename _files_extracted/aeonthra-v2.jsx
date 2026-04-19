import { useState, useCallback, useEffect, useRef } from "react";

const COURSE = { code: "PHI 208", title: "Ethics and Moral Reasoning", term: "Spring 2026" };

/* ═══════════════════════════════════════════════════════════════
   DATA — Every piece hand-crafted for real learning value
   ═══════════════════════════════════════════════════════════════ */

const CONCEPTS = [
  { id:"util", name:"Utilitarianism", mastery:0, cat:"Consequentialism",
    core:"The right action is the one that produces the greatest total good for the greatest number of people.",
    depth:"Jeremy Bentham founded it; John Stuart Mill refined it. Where Bentham counted all pleasures equally, Mill argued that intellectual pleasures are qualitatively higher than bodily ones. Both agree: morality is about outcomes, not intentions or rules.",
    distinction:"Unlike deontology (which follows rules regardless of outcomes) and virtue ethics (which focuses on character), utilitarianism cares ONLY about consequences. A lie that saves lives is morally good. A truthful statement that causes suffering is morally bad.",
    mnemonic:"A happiness calculator — every action gets scored by total well-being produced across everyone affected.",
    keywords:["consequences","greatest good","Bentham","Mill","pleasure","pain"],
    connections:["felicific","actrule","expmachine"],
    pitfall:"Students often confuse utilitarianism with selfishness. It's the opposite — it demands you count everyone's happiness equally, including strangers." },
  { id:"deont", name:"Deontology", mastery:0, cat:"Non-consequentialism",
    core:"Actions are morally right or wrong based on rules and duties, regardless of their consequences.",
    depth:"Immanuel Kant argued moral law comes from pure reason. His test: before acting, ask 'Could everyone do this?' If universal adoption would create a contradiction (everyone lying would destroy trust, making lying impossible), the action is wrong.",
    distinction:"Deontology says some acts are inherently wrong — lying, murder, using people — even if they produce good outcomes. This directly conflicts with utilitarianism, which would permit any act if it maximizes happiness.",
    mnemonic:"'Deon' = duty in Greek. A judge who follows the law even when the verdict seems unfair — because the rules matter more than any single outcome.",
    keywords:["duty","rules","Kant","categorical imperative","universal law"],
    connections:["catimperative","naturallaw"],
    pitfall:"Students often think deontology means 'follow whatever rules exist.' Kant meant rules derived from reason, not social conventions or laws." },
  { id:"virtue", name:"Virtue Ethics", mastery:0, cat:"Character-based",
    core:"Morality is about developing good character traits (virtues) through practice and habit.",
    depth:"Aristotle argued we become virtuous by practicing virtue — like learning an instrument. Courage isn't a rule to follow but a stable character trait you develop by repeatedly choosing brave actions in appropriate situations.",
    distinction:"Utilitarianism asks 'What outcome is best?' Deontology asks 'What rule applies?' Virtue ethics asks 'What would a person of good character do?' It shifts focus from actions to the agent performing them.",
    mnemonic:"Learning guitar — you don't become a musician by memorizing rules, you become one by practicing until excellence is habitual.",
    keywords:["character","Aristotle","habit","doctrine of the mean","flourishing"],
    connections:["mean"],
    pitfall:"Students think virtue ethics is vague or subjective. Aristotle was precise — virtues are specific, nameable traits (courage, justice, temperance) with clear excesses and deficiencies." },
  { id:"catimperative", name:"Categorical Imperative", mastery:0, cat:"Deontological Principles",
    core:"Kant's supreme moral principle: act only on rules you could rationally will everyone to follow.",
    depth:"Two key formulations: (1) Universal Law — 'Could everyone do this without contradiction?' If everyone lied, trust collapses and lying becomes pointless. So lying fails the test. (2) Humanity — 'Am I treating this person as a tool or as someone with their own dignity?'",
    distinction:"'Categorical' means unconditional — it applies always, to everyone. This contrasts with 'hypothetical' imperatives like 'If you want trust, don't lie' which only apply if you want something.",
    mnemonic:"Two tests for every action: (1) Could this be a universal law? (2) Am I using someone as a mere tool?",
    keywords:["Kant","universal law","maxim","humanity","ends","means"],
    connections:["deont"],
    pitfall:"Students confuse 'categorical imperative' with 'follow the law.' It's not about legal rules — it's about moral principles derived from pure reason." },
  { id:"felicific", name:"Felicific Calculus", mastery:0, cat:"Utilitarian Methods",
    core:"Bentham's systematic method for measuring pleasure and pain to determine the right action.",
    depth:"Seven factors: Intensity (how strong?), Duration (how long?), Certainty (how likely?), Propinquity (how soon?), Fecundity (will it lead to more pleasure?), Purity (is it free from pain?), Extent (how many people affected?). Together they give a 'happiness score' for any action.",
    distinction:"This is utilitarianism made operational. Critics argue you can't actually quantify happiness this precisely. Mill later argued quality of pleasure matters too, not just quantity.",
    mnemonic:"Seven factors, seven days: Intense Monday, Duration Tuesday, Certain Wednesday, Proximity Thursday, Fertile Friday, Pure Saturday, Extensive Sunday.",
    keywords:["Bentham","seven factors","intensity","duration","extent"],
    connections:["util"],
    pitfall:"Don't memorize the list mechanically — understand WHY each factor matters for calculating total happiness." },
  { id:"mean", name:"Doctrine of the Mean", mastery:0, cat:"Virtue Ethics Principles",
    core:"Every virtue is a balanced middle ground between two vices — one of excess and one of deficiency.",
    depth:"Courage sits between cowardice (too little bravery) and recklessness (too much). Generosity sits between stinginess and wastefulness. The 'mean' isn't a mathematical midpoint — it shifts based on the person and situation. A soldier needs more courage than an accountant.",
    distinction:"This is Aristotle's framework for identifying specific virtues. It gives virtue ethics practical content — virtues aren't vague ideals but precise balances you can aim for.",
    mnemonic:"A guitar string: too loose = no sound (deficiency), too tight = it snaps (excess), tuned just right = music (virtue).",
    keywords:["Aristotle","mean","excess","deficiency","courage","moderation"],
    connections:["virtue"],
    pitfall:"The mean is NOT 'always do the moderate thing.' Sometimes the virtuous response is extreme — great courage in a crisis, fierce honesty about injustice." },
  { id:"expmachine", name:"Experience Machine", mastery:0, cat:"Thought Experiments",
    core:"Nozick's challenge to utilitarianism: would you plug into a machine that simulates a perfectly happy life?",
    depth:"If pleasure were truly all that matters (as utilitarianism suggests), everyone would choose the machine. But most people refuse. This reveals we value authenticity, real accomplishment, genuine relationships, and actually doing things — not just feeling like we did.",
    distinction:"This is one of the strongest objections to hedonistic utilitarianism. It suggests there's more to a good life than subjective experience. Mill's response: higher pleasures (intellectual, moral) may require reality to be genuine.",
    mnemonic:"Neo choosing the red pill in The Matrix. We want the real world, not a perfect simulation — even if the simulation feels better.",
    keywords:["Nozick","thought experiment","pleasure","reality","authenticity"],
    connections:["util"],
    pitfall:"Some students think this 'disproves' utilitarianism entirely. More precise: it challenges HEDONISTIC utilitarianism (pleasure = the only good). Preference utilitarianism can accommodate the insight." },
  { id:"actrule", name:"Act vs Rule Utilitarianism", mastery:0, cat:"Utilitarian Variations",
    core:"Act utilitarianism judges each action individually; rule utilitarianism asks which general rules maximize happiness.",
    depth:"Act: 'Will THIS specific lie, right now, produce more happiness than truth?' Flexible but unstable — could justify horrific individual acts. Rule: 'Does a general rule of honesty produce more happiness than a rule permitting lies?' More stable, can defend rights.",
    distinction:"This split emerged because act utilitarianism has troubling implications (could justify punishing an innocent person if it maximizes happiness). Rule utilitarianism tries to preserve utilitarian logic while avoiding these problems.",
    mnemonic:"Act = referee reviewing each play with instant replay. Rule = police officer following the rulebook consistently.",
    keywords:["act","rule","individual","general","consequences","rights"],
    connections:["util","felicific"],
    pitfall:"Rule utilitarianism can collapse back into act utilitarianism if rules get too specific ('lie when lying produces more happiness')." },
  { id:"socialcontract", name:"Social Contract Theory", mastery:0, cat:"Political Philosophy",
    core:"Moral and political rules are justified because rational people would agree to them under fair conditions.",
    depth:"Hobbes: without government, life is 'solitary, poor, nasty, brutish, and short.' We accept authority to escape this chaos. Rawls: imagine choosing society's rules behind a 'veil of ignorance' — not knowing whether you'll be rich or poor, healthy or sick. You'd design a fair system.",
    distinction:"Unlike utilitarianism (maximize happiness) or deontology (follow duty), social contract theory grounds morality in agreement — rules are legitimate because we'd rationally consent to them.",
    mnemonic:"Writing the rules for a board game you must play — but you don't know which piece you'll be. You'd make it fair for every position.",
    keywords:["Hobbes","Rawls","veil of ignorance","consent","fairness"],
    connections:["deont"],
    pitfall:"The 'contract' is hypothetical, not historical. No one actually signed it. The question is what rational people WOULD agree to." },
  { id:"relativism", name:"Moral Relativism", mastery:0, cat:"Metaethics",
    core:"There are no universal moral truths — right and wrong are determined by cultural or individual standards.",
    depth:"Cultural relativism: morality is whatever your culture says it is. What's right in one society may be wrong in another, and neither is objectively correct. This seems tolerant, but it has a devastating implication: you can never criticize another culture's practices, including slavery or genocide.",
    distinction:"Relativism denies what every other ethical theory assumes — that some moral claims are universally true. Utilitarians, deontologists, and virtue ethicists all disagree with each other, but they all believe objective moral truth exists.",
    mnemonic:"'When in Rome, do as the Romans do' — taken to its logical extreme. But if Rome practices slavery, should you?",
    keywords:["culture","relative","universal","tolerance","subjectivity"],
    connections:["naturallaw"],
    pitfall:"Students confuse moral relativism with tolerance. True tolerance requires believing others are WRONG but respecting their right to differ — relativism eliminates the concept of being wrong." },
  { id:"trolley", name:"Trolley Problem", mastery:0, cat:"Applied Ethics",
    core:"A thought experiment revealing the tension between consequentialist math and deontological intuitions about harming people.",
    depth:"Switch case: diverting a trolley to kill 1 instead of 5 feels acceptable (consequentialist thinking). Footbridge case: pushing a large person off a bridge to stop the trolley and save 5 feels deeply wrong (deontological intuition). Same math — different moral response. Why?",
    distinction:"The trolley problem isn't just a puzzle — it reveals that most people use BOTH consequentialist and deontological reasoning simultaneously, depending on the situation. Pure theories break down here.",
    mnemonic:"The math says 5 > 1 in both cases. Your gut agrees with the lever but recoils at the push. That gap between math and gut IS the trolley problem.",
    keywords:["dilemma","switch","footbridge","five vs one","intentions"],
    connections:["util","deont"],
    pitfall:"Don't treat this as having a 'right answer.' Its value is in exposing your own moral intuitions and testing whether your ethical theory can explain them." },
  { id:"naturallaw", name:"Natural Law Theory", mastery:0, cat:"Moral Foundations",
    core:"Moral standards are built into human nature itself and can be discovered through reason.",
    depth:"Aquinas: God embedded moral law in human reason. Modern secular versions: certain things promote human flourishing (health, knowledge, friendship) and are therefore naturally good. Actions that systematically undermine flourishing are naturally wrong.",
    distinction:"Natural law claims morality is objective AND discoverable through reason (not just revelation). This conflicts with relativism (morality is subjective) and pure deontology (morality comes from rational duty, not nature).",
    mnemonic:"Murder feels wrong everywhere, in every century, in every culture. Natural law says that's not coincidence — it's built into what humans ARE.",
    keywords:["nature","reason","Aquinas","flourishing","universal","objective"],
    connections:["deont","virtue"],
    pitfall:"'Natural' doesn't mean 'whatever happens in nature.' Natural law is about human rational nature — what reason reveals about flourishing, not what animals do." },
];

const ASSIGNMENTS = [
  { id:"a1", title:"Ethics Position Paper 1", sub:"Utilitarianism in Practice", type:"paper", due:7, pts:100, concepts:["util","felicific","actrule","expmachine"],
    desc:"Write a 1500-word paper analyzing a real-world ethical dilemma through the lens of utilitarianism. Include Bentham and Mill's perspectives, address one major objection, cite 4 sources in APA.",
    strategy:"Start by picking a concrete dilemma (e.g., organ donation policy, surveillance for safety). Apply the felicific calculus. Then show how act and rule utilitarianism might disagree. Use the experience machine as an objection." },
  { id:"a2", title:"Week 3 Discussion", sub:"The Trolley Problem", type:"discussion", due:3, pts:25, concepts:["trolley","util","deont"],
    desc:"In 300+ words, explain what you would do in the classic trolley problem and why. Compare utilitarian and deontological perspectives. Reply to 2 classmates.",
    strategy:"Don't just pick a side. Show you understand BOTH perspectives. Explain the switch case vs footbridge case. Your strongest move: acknowledge the tension instead of pretending one theory resolves everything." },
  { id:"a3", title:"Kantian Ethics Analysis", sub:"Categorical Imperative Applied", type:"paper", due:14, pts:100, concepts:["deont","catimperative"],
    desc:"Apply Kant's categorical imperative to a contemporary ethical issue. Explain both formulations and show how they lead to the same conclusion.",
    strategy:"Pick an issue where the two formulations clearly converge (e.g., exploitative labor, deceptive advertising). Show the Universal Law test first, then the Humanity formula. Address the strongest objection: Kant seems too rigid for complex situations." },
  { id:"a4", title:"Week 5 Discussion", sub:"Cultural Relativism Debate", type:"discussion", due:10, pts:25, concepts:["relativism","naturallaw"],
    desc:"Is moral relativism defensible? Argue for or against with at least two examples. Consider the strongest objection to your position.",
    strategy:"If arguing against: use the 'can't criticize genocide' problem. If arguing for: distinguish between moral relativism and cultural sensitivity. Either way, engage with natural law theory as a counterpoint." },
  { id:"a5", title:"Midterm Quiz", sub:"Chapters 1-5 Review", type:"quiz", due:21, pts:50, concepts:["util","deont","virtue","catimperative","socialcontract"],
    desc:"25 multiple choice questions covering major ethical theories. 60 minutes. One attempt.",
    strategy:"Focus on DISTINCTIONS between theories. The quiz will test whether you can tell them apart, not just define them individually. Practice by asking: 'How would each theory handle the same dilemma differently?'" },
  { id:"a6", title:"Final Paper", sub:"Multi-Framework Case Study", type:"paper", due:42, pts:200, concepts:["util","deont","virtue","socialcontract","naturallaw"],
    desc:"Choose a real-world ethical controversy and analyze it using at least three different ethical frameworks.",
    strategy:"Pick something genuinely controversial (not 'murder is wrong'). Show how each framework produces a DIFFERENT conclusion or emphasis. The strongest papers identify where frameworks agree and where they diverge." },
];

const PHILOSOPHERS = [
  { name:"Jeremy Bentham", trad:"Utilitarianism", quotes:[
    { text:"The greatest happiness of the greatest number is the foundation of morals and legislation.", pg:44 },
    { text:"Nature has placed mankind under the governance of two sovereign masters: pain and pleasure.", pg:43 },
    { text:"The question is not Can they reason? nor Can they talk? but Can they suffer?", pg:47 },
  ]},
  { name:"Immanuel Kant", trad:"Deontology", quotes:[
    { text:"Act only according to that maxim whereby you can will that it should become a universal law.", pg:62 },
    { text:"Treat humanity never merely as a means to an end, but always at the same time as an end.", pg:64 },
    { text:"Two things fill the mind with ever new admiration: the starry heavens above and the moral law within.", pg:60 },
  ]},
  { name:"Aristotle", trad:"Virtue Ethics", quotes:[
    { text:"We are what we repeatedly do. Excellence, then, is not an act, but a habit.", pg:78 },
    { text:"Virtue is a state of character concerned with choice, lying in a mean relative to us.", pg:80 },
    { text:"It is the mark of an educated mind to entertain a thought without accepting it.", pg:82 },
  ]},
  { name:"John Stuart Mill", trad:"Utilitarianism", quotes:[
    { text:"It is better to be Socrates dissatisfied than a fool satisfied.", pg:51 },
    { text:"Actions are right in proportion as they tend to promote happiness.", pg:49 },
    { text:"Over himself, over his body and mind, the individual is sovereign.", pg:55 },
  ]},
  { name:"Thomas Aquinas", trad:"Natural Law", quotes:[
    { text:"The natural law is the rational creature's participation in the eternal law.", pg:118 },
    { text:"Good is to be done and pursued, and evil is to be avoided.", pg:120 },
  ]},
  { name:"John Rawls", trad:"Social Contract", quotes:[
    { text:"Justice is the first virtue of social institutions, as truth is of systems of thought.", pg:102 },
    { text:"No one knows his place in society — ensuring principles are chosen behind a veil of ignorance.", pg:104 },
  ]},
];

const DILEMMAS = [
  { text:"A hospital has one dose of a life-saving drug. Five patients will die without it, but one patient arrived first and was promised treatment. The drug saves all five OR the one.",
    opts:[
      { text:"Save the five — more lives preserved means more total good.", fw:"Utilitarianism", why:"Utilitarian calculus: 5 lives > 1. Painful but mathematically clear." },
      { text:"Honor the promise to the first patient — their right to treatment was established.", fw:"Deontology", why:"Breaking a promise treats the first patient merely as a means to save others, violating their dignity." },
      { text:"Consider what a wise, compassionate doctor with integrity would do here.", fw:"Virtue Ethics", why:"Virtue ethics resists reducing people to numbers OR rigid rules, asking instead about character and practical wisdom." },
    ]},
  { text:"Your best friend has cheated on every exam this semester and is about to graduate with honors. An honest student who deserved those honors will miss out. Do you report your friend?",
    opts:[
      { text:"Report — the harm of systemic cheating outweighs one friendship.", fw:"Utilitarianism", why:"Total harm calculation: cheating degrades every student's degree. One friendship lost prevents wider damage." },
      { text:"Report — honesty is a duty. Protecting cheaters makes you complicit.", fw:"Deontology", why:"Could you universalize 'cover for cheating friends'? If everyone did it, academic integrity collapses." },
      { text:"Talk to your friend first — a person of good character seeks understanding before acting.", fw:"Virtue Ethics", why:"Practical wisdom means you don't rush to punish or protect. You face the situation honestly and with care." },
    ]},
  { text:"A self-driving car must choose: stay on course and hit three pedestrians, or swerve and hit one bystander on the sidewalk. There is no third option.",
    opts:[
      { text:"Swerve — three lives outweigh one in any honest calculation.", fw:"Utilitarianism", why:"Pure numbers: minimizing total death means choosing the path with fewer casualties." },
      { text:"Stay on course — actively redirecting harm toward an innocent bystander is killing, not letting die.", fw:"Deontology", why:"There is a moral difference between causing death and failing to prevent it. Programming a car to kill a specific person crosses that line." },
      { text:"This scenario reveals why we can't reduce ethics to algorithms.", fw:"Virtue Ethics", why:"Real moral situations require human judgment, empathy, and wisdom — things no formula captures." },
    ]},
];

const RF = [
  { claim:"Utilitarianism judges actions by their outcomes, not intentions.", ans:true, cid:"util", exp:"Correct. Utilitarianism is purely consequentialist — only results matter." },
  { claim:"Kant believed consequences are the primary measure of moral worth.", ans:false, cid:"deont", exp:"False. Kant held that duty and rational principle determine morality, not outcomes." },
  { claim:"Virtue ethics asks 'What should I do?' rather than 'What kind of person should I be?'", ans:false, cid:"virtue", exp:"False. Virtue ethics fundamentally asks about CHARACTER — who you become through choices." },
  { claim:"The categorical imperative requires moral rules to apply universally without exception.", ans:true, cid:"catimperative", exp:"Correct. 'Categorical' means unconditional — if it's wrong, it's wrong for everyone, always." },
  { claim:"Bentham's felicific calculus considers seven dimensions of pleasure and pain.", ans:true, cid:"felicific", exp:"Correct: intensity, duration, certainty, propinquity, fecundity, purity, and extent." },
  { claim:"The doctrine of the mean says virtue is always the exact mathematical midpoint.", ans:false, cid:"mean", exp:"False. The mean is relative to the person and situation — a soldier needs more courage than an accountant." },
  { claim:"Nozick's experience machine proves pleasure is all that matters.", ans:false, cid:"expmachine", exp:"False. Most people REJECT the machine — proving we value authenticity, real achievement, and genuine connection beyond pleasure." },
  { claim:"Rule utilitarianism evaluates each individual act separately.", ans:false, cid:"actrule", exp:"False. That's ACT utilitarianism. Rule utilitarianism evaluates general rules by their overall consequences." },
  { claim:"Social contract theory grounds morality in hypothetical rational agreement.", ans:true, cid:"socialcontract", exp:"Correct. Rules are legitimate because rational people WOULD consent under fair conditions." },
  { claim:"Moral relativism claims some ethical truths are universal.", ans:false, cid:"relativism", exp:"False. Moral relativism denies ALL universal moral truths — right and wrong vary by culture or individual." },
  { claim:"The trolley problem reveals a tension between consequentialist and deontological intuitions.", ans:true, cid:"trolley", exp:"Correct. We accept the utilitarian math (5>1) for the lever but reject it for the push — revealing competing moral instincts." },
  { claim:"Natural law theory claims morality is invented by human societies.", ans:false, cid:"naturallaw", exp:"False. Natural law holds morality is DISCOVERED through reason, not invented — it's built into human nature." },
];

const DD = [
  { q:"A CEO discovers a factory causes minor pollution affecting a small town, but closing it eliminates 500 jobs. What does utilitarianism recommend?",
    opts:["Shut down immediately","Keep operating — jobs matter more","Calculate total consequences for ALL affected parties","Follow whatever regulators say"],
    cor:2, cid:"util", exp:"Utilitarianism demands calculating total harm vs benefit for everyone — workers, townspeople, their families. The answer depends on actual impact, not a reflexive rule." },
  { q:"Which is a formulation of Kant's categorical imperative?",
    opts:["Greatest good for the greatest number","Act only on maxims you could will as universal law","Virtue lies in the mean between extremes","Justice requires a veil of ignorance"],
    cor:1, cid:"catimperative", exp:"The Formula of Universal Law — could everyone follow your principle without contradiction?" },
  { q:"What fundamentally distinguishes virtue ethics from utilitarianism and deontology?",
    opts:["It focuses on consequences","It focuses on character and habits rather than rules or outcomes","It requires calculating pleasure","It was developed in the Enlightenment"],
    cor:1, cid:"virtue", exp:"Virtue ethics shifts from 'What should I DO?' to 'What kind of person should I BE?' — character over calculation." },
  { q:"The trolley problem's switch vs footbridge cases reveal what about moral psychology?",
    opts:["Consequentialism is always correct","People use BOTH consequentialist and deontological reasoning depending on context","Deontology is always correct","Ethics cannot be studied scientifically"],
    cor:1, cid:"trolley", exp:"Same math, different response — proving we don't operate from a single moral theory but draw on multiple ethical frameworks." },
  { q:"What is the strongest objection to moral relativism?",
    opts:["It's too complicated","It would make it impossible to condemn practices like slavery or genocide in other cultures","It was invented recently","It contradicts religion"],
    cor:1, cid:"relativism", exp:"If morality is truly relative, you cannot say any culture's practices are wrong — including the most horrific ones. Most people find this implication unacceptable." },
  { q:"Rawls's 'veil of ignorance' asks us to design society's rules without knowing what?",
    opts:["What country we're in","Our position — wealth, health, abilities, gender, race","What year it is","Who the leaders are"],
    cor:1, cid:"socialcontract", exp:"Not knowing your place forces you to design fair rules — because any rule that disadvantages a group might disadvantage YOU." },
];

// ═══════════════════════════════════════════════════════════════
const mc = (m) => m>=.8?"#ffd700":m>=.5?"#06d6a0":m>=.2?"#00f0ff":m>0?"#4a5a8a":"#252540";
const pct = (v) => Math.round(v*100)+"%";
const ti = (t) => t==="paper"?"📝":t==="discussion"?"💬":"❓";
const dl = (d) => d<=3?"Due in "+d+" days":d<=7?"This week":"In "+d+" days";

export default function App() {
  const [v, setV] = useState("home");
  const [cc, setCC] = useState(CONCEPTS.map(c=>({...c})));
  const [selC, setSelC] = useState(null);
  const [selA, setSelA] = useState(null);
  const [phase, setPhase] = useState("intro");
  const [fs, setFS] = useState({di:0,sel:null,rev:false,ri:0,ra:null,rr:false,di2:0,da:null,dr:false,sc:{c:0,w:0},introC:null,introStep:0});
  const [oq,setOQ]=useState("");
  const [or,setOR]=useState(null);
  const [fade,setFade]=useState(true);
  const [toast,setToast]=useState(null);

  const go = useCallback((to,d)=>{
    setFade(false);
    setTimeout(()=>{
      setV(to);
      if(d?.c) setSelC(d.c);
      if(d?.a) setSelA(d.a);
      if(to==="forge"){
        const first = cc.filter(c=>c.mastery<0.8).sort((a,b)=>a.mastery-b.mastery)[0]||cc[0];
        setPhase("intro");
        setFS({di:Math.floor(Math.random()*DILEMMAS.length),sel:null,rev:false,ri:0,ra:null,rr:false,di2:0,da:null,dr:false,sc:{c:0,w:0},introC:first,introStep:0});
      }
      setFade(true);
    },180);
  },[cc]);

  const bump=(id,d)=>{setCC(p=>p.map(c=>c.id===id?{...c,mastery:Math.min(1,Math.max(0,c.mastery+d))}:c));};
  const showToast=(msg,good)=>{setToast({msg,good});setTimeout(()=>setToast(null),2200);};

  const mastered=cc.filter(c=>c.mastery>=.8).length;
  const avg=cc.reduce((s,c)=>s+c.mastery,0)/cc.length;
  const nextA=ASSIGNMENTS.sort((a,b)=>a.due-b.due)[0];
  const weak=nextA?nextA.concepts.filter(id=>(cc.find(c=>c.id===id)?.mastery??0)<.6):[];

  // Styles
  const C={
    bg:"#020208",card:"rgba(6,6,15,0.72)",bdr:"rgba(26,26,58,0.45)",cyan:"#00f0ff",teal:"#06d6a0",gold:"#ffd700",
    red:"#ff4466",txt:"#e0e0ff",txt2:"#b0b0d0",mute:"#5a5a8a",dim:"#252540",
  };

  const btn=(bg,fg,border)=>({background:bg,color:fg,border:border||"none",padding:"10px 22px",borderRadius:10,fontWeight:700,fontSize:".78rem",cursor:"pointer",letterSpacing:".04em",transition:"all 220ms cubic-bezier(.22,1,.36,1)"});
  const card={background:C.card,border:`1px solid ${C.bdr}`,borderRadius:16,padding:"28px 32px"};
  const ey={fontSize:".62rem",fontWeight:800,letterSpacing:".16em",textTransform:"uppercase",color:C.mute,marginBottom:14};
  const hd=(s)=>({fontSize:s+"rem",fontWeight:700,margin:0,lineHeight:1.25,color:C.txt});

  return(
  <div style={{minHeight:"100vh",background:C.bg,backgroundImage:"radial-gradient(ellipse at 50% 0%,#0a0a20 0%,#020208 55%)",color:C.txt,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
    {/* NAV */}
    <nav style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 28px",borderBottom:`1px solid rgba(0,240,255,.06)`,position:"sticky",top:0,zIndex:100,background:"rgba(2,2,8,.94)",backdropFilter:"blur(16px)"}}>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        <span style={{fontWeight:900,fontSize:"1.05rem",letterSpacing:".14em",color:C.cyan,textShadow:"0 0 24px rgba(0,240,255,.25)"}}>AEONTHRA</span>
        <span style={{fontSize:".65rem",letterSpacing:".14em",color:C.mute,border:"1px solid #1a1a3a",padding:"3px 10px",borderRadius:20}}>{COURSE.code}</span>
      </div>
      <div style={{display:"flex",gap:2}}>
        {[["home","Home"],["explore","Concepts"],["forge","Learn"],["oracle","Oracle"]].map(([id,lb])=>(
          <button key={id} onClick={()=>go(id)} style={{background:v===id?"rgba(0,240,255,.07)":"transparent",border:"none",color:v===id?C.cyan:C.mute,padding:"8px 18px",borderRadius:8,cursor:"pointer",fontSize:".8rem",fontWeight:600,transition:"all 200ms"}}>{lb}</button>
        ))}
      </div>
    </nav>

    {/* TOAST */}
    {toast&&<div style={{position:"fixed",top:80,left:"50%",transform:"translateX(-50%)",padding:"10px 24px",borderRadius:12,background:toast.good?"rgba(6,214,160,.15)":"rgba(255,68,102,.15)",border:`1px solid ${toast.good?C.teal:C.red}`,color:toast.good?C.teal:C.red,fontSize:".82rem",fontWeight:700,zIndex:200,animation:"fadeInUp .3s ease"}}>{toast.msg}</div>}

    {/* MAIN */}
    <main style={{maxWidth:1080,margin:"0 auto",padding:"28px 24px 80px",opacity:fade?1:0,transition:"opacity 180ms ease"}}>

    {/* ═══ HOME ═══ */}
    {v==="home"&&<>
      {/* Hero */}
      <div style={{...card,marginBottom:20,background:"linear-gradient(135deg,rgba(0,240,255,.03),rgba(6,6,15,.7))",borderColor:"rgba(0,240,255,.12)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:20}}>
          <div>
            <div style={ey}>YOUR COURSE</div>
            <h1 style={hd(1.45)}>{COURSE.title}</h1>
            <p style={{color:C.mute,fontSize:".8rem",marginTop:4}}>{COURSE.code} · {COURSE.term}</p>
          </div>
          <div style={{display:"flex",gap:28}}>
            {[[mastered+"/"+cc.length,"Mastered"],[pct(avg),"Overall"],[ASSIGNMENTS.length,"Tasks"]].map(([val,lb],i)=>(
              <div key={i} style={{textAlign:"center"}}>
                <div style={{fontSize:"1.5rem",fontWeight:700,color:C.txt,fontVariantNumeric:"tabular-nums"}}>{val}</div>
                <div style={{fontSize:".62rem",color:C.mute,letterSpacing:".1em",textTransform:"uppercase",marginTop:2}}>{lb}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,alignItems:"start"}}>
        {/* START HERE */}
        {nextA&&<div style={{...card,gridColumn:"1/-1",borderLeft:`3px solid ${C.cyan}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:16}}>
            <div style={{flex:1,minWidth:280}}>
              <div style={{...ey,color:C.cyan}}>⚡ START HERE</div>
              <h2 style={hd(1.1)}>{nextA.title}: {nextA.sub}</h2>
              <p style={{color:C.txt2,fontSize:".84rem",lineHeight:1.6,margin:"8px 0 0"}}>{nextA.desc}</p>
              {nextA.strategy&&<p style={{color:C.mute,fontSize:".78rem",fontStyle:"italic",lineHeight:1.5,margin:"10px 0 0"}}>💡 {nextA.strategy}</p>}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8,alignItems:"flex-end",minWidth:180}}>
              <span style={{fontSize:".72rem",color:C.mute}}>{ti(nextA.type)} {nextA.pts} pts · {dl(nextA.due)}</span>
              {weak.length>0?(
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:".75rem",color:C.red,marginBottom:8}}>{weak.length} concept{weak.length>1?"s":""} need{weak.length===1?"s":""} preparation</div>
                  <button onClick={()=>go("forge")} style={btn(`linear-gradient(135deg,${C.cyan},#0080ff)`,"#000")}>⚡ Start Learning</button>
                </div>
              ):(
                <button onClick={()=>go("assignment",{a:nextA})} style={btn(`linear-gradient(135deg,${C.teal},#00b088)`,"#000")}>✓ Ready — Open Assignment</button>
              )}
            </div>
          </div>
        </div>}

        {/* Mastery */}
        <div style={card}>
          <div style={ey}>CONCEPT MASTERY</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
            {cc.map(c=>(
              <button key={c.id} onClick={()=>go("explore",{c})} style={{display:"flex",alignItems:"center",gap:8,background:"transparent",border:"1px solid transparent",borderRadius:8,padding:"7px 10px",cursor:"pointer",color:C.txt,fontSize:".78rem",textAlign:"left",width:"100%",transition:"all 180ms"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:mc(c.mastery),flexShrink:0}}/>
                <span style={{flex:1}}>{c.name}</span>
                <span style={{color:mc(c.mastery),fontSize:".7rem",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{c.mastery>0?pct(c.mastery):"—"}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Assignments */}
        <div style={card}>
          <div style={ey}>ASSIGNMENTS</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {ASSIGNMENTS.map(a=>{
              const rdy=a.concepts.every(id=>(cc.find(c=>c.id===id)?.mastery??0)>=.6);
              return(
                <button key={a.id} onClick={()=>go("assignment",{a})} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"rgba(10,10,26,.4)",border:`1px solid ${C.bdr}`,borderRadius:10,cursor:"pointer",width:"100%",color:C.txt,transition:"all 200ms"}}>
                  <span style={{fontSize:"1.1rem",width:28,textAlign:"center"}}>{ti(a.type)}</span>
                  <div style={{flex:1,textAlign:"left"}}>
                    <div style={{fontSize:".8rem",fontWeight:600}}>{a.title}</div>
                    <div style={{fontSize:".68rem",color:C.mute}}>{a.pts}pts · {dl(a.due)}</div>
                  </div>
                  <span style={{fontSize:".62rem",fontWeight:700,padding:"3px 8px",borderRadius:16,letterSpacing:".06em",...(rdy?{color:C.teal,border:`1px solid rgba(6,214,160,.25)`,background:"rgba(6,214,160,.06)"}:{color:"#ff8800",border:"1px solid rgba(255,136,0,.25)",background:"rgba(255,136,0,.06)"})}}>{rdy?"Ready":"Prepare"}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>}

    {/* ═══ EXPLORE ═══ */}
    {v==="explore"&&<div style={{display:"grid",gridTemplateColumns:"280px 1fr",gap:20,alignItems:"start"}}>
      <div style={{...card,position:"sticky",top:72,padding:"20px 16px"}}>
        <div style={ey}>CONCEPTS</div>
        {cc.map(c=>(
          <button key={c.id} onClick={()=>setSelC(c)} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 10px",borderRadius:8,background:selC?.id===c.id?"rgba(0,240,255,.06)":"transparent",border:selC?.id===c.id?`1px solid rgba(0,240,255,.18)`:"1px solid transparent",cursor:"pointer",width:"100%",color:C.txt,fontSize:".8rem",transition:"all 180ms",marginBottom:2}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:mc(c.mastery)}}/>
            <span style={{flex:1,textAlign:"left"}}>{c.name}</span>
            <span style={{color:mc(c.mastery),fontSize:".68rem",fontWeight:700}}>{c.mastery>0?pct(c.mastery):"—"}</span>
          </button>
        ))}
      </div>
      <div style={{...card,minHeight:480,padding:"32px 40px"}}>
        {selC?<>
          <div style={{...ey,color:mc(selC.mastery)}}>{selC.cat}</div>
          <h2 style={hd(1.3)}>{selC.name}</h2>
          <div style={{height:4,background:C.dim,borderRadius:2,margin:"14px 0 8px",overflow:"hidden"}}><div style={{height:"100%",borderRadius:2,background:mc(selC.mastery),width:pct(selC.mastery),transition:"width 500ms ease"}}/></div>
          <p style={{fontSize:".75rem",color:C.mute,marginBottom:28}}>{pct(selC.mastery)} mastery</p>
          {[["Core Idea",selC.core],["In Depth",selC.depth],["Key Distinction",selC.distinction],["Common Mistake",selC.pitfall]].map(([lb,txt])=>(
            <div key={lb} style={{marginBottom:22}}>
              <div style={{fontSize:".65rem",fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:C.cyan,marginBottom:6}}>{lb}</div>
              <p style={{fontSize:".88rem",lineHeight:1.7,color:C.txt2,margin:0}}>{txt}</p>
            </div>
          ))}
          <div style={{marginBottom:22}}>
            <div style={{fontSize:".65rem",fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:C.cyan,marginBottom:6}}>Memory Hook</div>
            <p style={{fontSize:".88rem",lineHeight:1.6,color:C.teal,fontStyle:"italic",margin:0}}>{selC.mnemonic}</p>
          </div>
          <div style={{marginBottom:22}}>
            <div style={{fontSize:".65rem",fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:C.cyan,marginBottom:8}}>Key Terms</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{selC.keywords.map(k=><span key={k} style={{padding:"3px 10px",borderRadius:16,border:`1px solid ${C.bdr}`,fontSize:".68rem",color:C.mute,background:"rgba(10,10,26,.5)"}}>{k}</span>)}</div>
          </div>
          {selC.connections.length>0&&<div style={{marginBottom:22}}>
            <div style={{fontSize:".65rem",fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:C.cyan,marginBottom:8}}>Related Concepts</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{selC.connections.map(id=>{const r=cc.find(c=>c.id===id);return r?<button key={id} onClick={()=>setSelC(r)} style={{padding:"4px 12px",borderRadius:16,border:`1px solid rgba(0,240,255,.15)`,fontSize:".72rem",color:C.cyan,background:"rgba(0,240,255,.04)",cursor:"pointer"}}>{r.name}</button>:null;})}</div>
          </div>}
          <button onClick={()=>go("forge")} style={btn(`linear-gradient(135deg,${C.cyan},#0080ff)`,"#000")}>Practice This →</button>
        </>:<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:400,color:C.mute}}>
          <div style={{textAlign:"center"}}><div style={{fontSize:"1.8rem",marginBottom:8}}>←</div><p>Select a concept to explore</p></div>
        </div>}
      </div>
    </div>}

    {/* ═══ ASSIGNMENT ═══ */}
    {v==="assignment"&&selA&&<div style={{maxWidth:700}}>
      <button onClick={()=>go("home")} style={{background:"transparent",border:"none",color:C.mute,cursor:"pointer",fontSize:".8rem",marginBottom:16}}>← Back to Home</button>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <span style={{fontSize:"1.6rem"}}>{ti(selA.type)}</span>
        <div><h2 style={hd(1.15)}>{selA.title}</h2><p style={{color:C.mute,fontSize:".78rem",margin:"2px 0 0"}}>{selA.sub} · {selA.pts} pts · {dl(selA.due)}</p></div>
      </div>
      <div style={{...card,marginBottom:16}}>
        <div style={{fontSize:".65rem",fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:C.cyan,marginBottom:8}}>What's Being Asked</div>
        <p style={{fontSize:".88rem",lineHeight:1.7,color:C.txt2,margin:0}}>{selA.desc}</p>
      </div>
      {selA.strategy&&<div style={{...card,marginBottom:16,borderLeft:`3px solid ${C.teal}`}}>
        <div style={{fontSize:".65rem",fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:C.teal,marginBottom:8}}>💡 Strategy Tip</div>
        <p style={{fontSize:".85rem",lineHeight:1.6,color:C.txt2,margin:0}}>{selA.strategy}</p>
      </div>}
      <div style={{...card}}>
        <div style={{fontSize:".65rem",fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:C.cyan,marginBottom:12}}>Required Concepts</div>
        {selA.concepts.map(id=>{const c=cc.find(x=>x.id===id);if(!c)return null;const rdy=c.mastery>=.6;
          return(<div key={id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.bdr}`}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:mc(c.mastery)}}/>
            <button onClick={()=>go("explore",{c})} style={{flex:1,background:"none",border:"none",color:C.txt,cursor:"pointer",textAlign:"left",fontSize:".84rem"}}>{c.name}</button>
            <span style={{color:mc(c.mastery),fontSize:".72rem",fontWeight:700}}>{pct(c.mastery)}</span>
            <span style={{fontSize:".6rem",fontWeight:700,padding:"2px 8px",borderRadius:12,...(rdy?{color:C.teal,background:"rgba(6,214,160,.08)"}:{color:C.red,background:"rgba(255,68,102,.08)"})}}>{rdy?"✓":"Needs work"}</span>
          </div>);
        })}
        {selA.concepts.some(id=>(cc.find(c=>c.id===id)?.mastery??0)<.6)&&
          <button onClick={()=>go("forge")} style={{...btn(`linear-gradient(135deg,${C.cyan},#0080ff)`,"#000"),marginTop:20}}>⚡ Prepare in Neural Forge</button>}
      </div>
    </div>}

    {/* ═══ FORGE ═══ */}
    {v==="forge"&&<div style={{maxWidth:680,margin:"0 auto"}}>
      {/* Phase nav */}
      <div style={{display:"flex",gap:4,marginBottom:24,alignItems:"center"}}>
        {[["intro","Orientation"],["genesis","Dilemma"],["rf","Rapid Fire"],["dd","Deep Drill"]].map(([id,lb])=>(
          <button key={id} onClick={()=>setPhase(id)} style={{background:phase===id?"rgba(0,240,255,.07)":"transparent",border:phase===id?`1px solid rgba(0,240,255,.2)`:`1px solid ${C.bdr}`,color:phase===id?C.cyan:C.mute,padding:"7px 16px",borderRadius:20,cursor:"pointer",fontSize:".72rem",fontWeight:700,letterSpacing:".06em",transition:"all 200ms"}}>{lb}</button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",gap:12,fontSize:".8rem",fontWeight:700}}>
          <span style={{color:C.teal}}>✓ {fs.sc.c}</span>
          <span style={{color:C.red}}>✗ {fs.sc.w}</span>
        </div>
      </div>

      {/* INTRO — teach before testing */}
      {phase==="intro"&&fs.introC&&(()=>{const c=fs.introC;const steps=["core","depth","distinction","pitfall"];const s=steps[fs.introStep];
        return(<div style={{...card,padding:"36px 40px"}}>
          <div style={{...ey,color:mc(c.mastery)}}>ORIENTATION</div>
          <h2 style={hd(1.2)}>{c.name}</h2>
          <div style={{display:"flex",gap:6,margin:"16px 0 24px"}}>{steps.map((st,i)=>(<div key={st} style={{flex:1,height:3,borderRadius:2,background:i<=fs.introStep?C.cyan:C.dim,transition:"background 400ms ease"}}/>))}</div>
          
          {s==="core"&&<><div style={{fontSize:".65rem",fontWeight:700,letterSpacing:".12em",color:C.cyan,marginBottom:8}}>CORE IDEA</div><p style={{fontSize:"1.02rem",lineHeight:1.7,color:C.txt2}}>{c.core}</p></>}
          {s==="depth"&&<><div style={{fontSize:".65rem",fontWeight:700,letterSpacing:".12em",color:C.cyan,marginBottom:8}}>GOING DEEPER</div><p style={{fontSize:".92rem",lineHeight:1.7,color:C.txt2}}>{c.depth}</p></>}
          {s==="distinction"&&<><div style={{fontSize:".65rem",fontWeight:700,letterSpacing:".12em",color:C.cyan,marginBottom:8}}>KEY DISTINCTION</div><p style={{fontSize:".92rem",lineHeight:1.7,color:C.txt2}}>{c.distinction}</p></>}
          {s==="pitfall"&&<><div style={{fontSize:".65rem",fontWeight:700,letterSpacing:".12em",color:C.red,marginBottom:8}}>⚠ COMMON MISTAKE</div><p style={{fontSize:".92rem",lineHeight:1.7,color:C.txt2}}>{c.pitfall}</p><p style={{fontSize:".85rem",lineHeight:1.5,color:C.teal,fontStyle:"italic",margin:"16px 0 0"}}>🔗 {c.mnemonic}</p></>}
          
          <div style={{display:"flex",justifyContent:"space-between",marginTop:28}}>
            {fs.introStep>0?<button onClick={()=>setFS(p=>({...p,introStep:p.introStep-1}))} style={btn("transparent",C.mute,`1px solid ${C.bdr}`)}>← Back</button>:<div/>}
            {fs.introStep<3?
              <button onClick={()=>setFS(p=>({...p,introStep:p.introStep+1}))} style={btn(`linear-gradient(135deg,${C.cyan},#0080ff)`,"#000")}>Continue →</button>:
              <button onClick={()=>{bump(c.id,.05);showToast("Orientation complete — concept unlocked!",true);setPhase("genesis");}} style={btn(`linear-gradient(135deg,${C.teal},#00b088)`,"#000")}>✓ I understand — test me →</button>
            }
          </div>
        </div>);
      })()}

      {/* GENESIS */}
      {phase==="genesis"&&(()=>{const d=DILEMMAS[fs.di];
        return(<div style={{...card,padding:"36px 40px"}}>
          <div style={ey}>ETHICAL DILEMMA</div>
          <p style={{fontSize:"1rem",lineHeight:1.7,color:C.txt2,margin:"0 0 24px"}}>{d.text}</p>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {d.opts.map((o,i)=>(
              <button key={i} onClick={()=>{if(!fs.rev)setFS(p=>({...p,sel:i,rev:true}));}} style={{textAlign:"left",padding:"16px 20px",borderRadius:12,border:`1px solid ${fs.sel===i?C.cyan:C.bdr}`,background:fs.sel===i?"rgba(0,240,255,.04)":"rgba(10,10,26,.4)",cursor:fs.rev?"default":"pointer",color:C.txt,transition:"all 250ms",width:"100%",opacity:fs.rev&&fs.sel!==i?.35:1}}>
                <div style={{fontSize:".86rem",lineHeight:1.5}}>{o.text}</div>
                {fs.rev&&fs.sel===i&&<div style={{marginTop:12,padding:"12px 16px",borderRadius:10,background:"rgba(0,240,255,.04)",border:`1px solid rgba(0,240,255,.1)`}}>
                  <div style={{fontSize:".65rem",fontWeight:700,letterSpacing:".1em",color:C.cyan,marginBottom:4}}>{o.fw}</div>
                  <p style={{fontSize:".82rem",lineHeight:1.5,color:C.txt2,margin:0}}>{o.why}</p>
                </div>}
              </button>
            ))}
          </div>
          {fs.rev&&<button onClick={()=>setFS(p=>({...p,di:(p.di+1)%DILEMMAS.length,sel:null,rev:false}))} style={{...btn(`linear-gradient(135deg,${C.cyan},#0080ff)`,"#000"),marginTop:20}}>Next Dilemma →</button>}
        </div>);
      })()}

      {/* RAPID FIRE */}
      {phase==="rf"&&(()=>{const q=RF[fs.ri];
        if(!q) return(<div style={{...card,textAlign:"center",padding:48}}><div style={{fontSize:"1.3rem",marginBottom:12}}>🔥</div><p style={{fontSize:".92rem",color:C.txt2}}>Rapid fire complete! {fs.sc.c} correct out of {fs.sc.c+fs.sc.w}.</p><button onClick={()=>setPhase("dd")} style={{...btn(`linear-gradient(135deg,${C.cyan},#0080ff)`,"#000"),marginTop:16}}>Continue to Deep Drill →</button></div>);
        const concept=cc.find(c=>c.id===q.cid);
        return(<div style={{...card,padding:"36px 40px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={ey}>TRUE OR FALSE · {fs.ri+1}/{RF.length}</div>
            {concept&&<span style={{fontSize:".68rem",color:mc(concept.mastery),border:`1px solid ${mc(concept.mastery)}33`,padding:"2px 8px",borderRadius:12}}>{concept.name}</span>}
          </div>
          <p style={{fontSize:"1rem",lineHeight:1.7,color:C.txt2,margin:"0 0 24px"}}>{q.claim}</p>
          {!fs.rr?<div style={{display:"flex",gap:12}}>
            <button onClick={()=>{const ok=q.ans;setFS(p=>({...p,ra:true,rr:true,sc:{c:p.sc.c+(ok?1:0),w:p.sc.w+(ok?0:1)}}));if(ok){bump(q.cid,.04);showToast("✓ Correct!",true);}else showToast("✗ Not quite",false);}} style={{flex:1,padding:"14px",borderRadius:12,fontWeight:700,fontSize:".85rem",cursor:"pointer",background:"rgba(6,214,160,.1)",color:C.teal,border:`1px solid rgba(6,214,160,.25)`,transition:"all 200ms"}}>TRUE</button>
            <button onClick={()=>{const ok=!q.ans;setFS(p=>({...p,ra:false,rr:true,sc:{c:p.sc.c+(ok?1:0),w:p.sc.w+(ok?0:1)}}));if(ok){bump(q.cid,.04);showToast("✓ Correct!",true);}else showToast("✗ Not quite",false);}} style={{flex:1,padding:"14px",borderRadius:12,fontWeight:700,fontSize:".85rem",cursor:"pointer",background:"rgba(255,68,102,.1)",color:C.red,border:`1px solid rgba(255,68,102,.25)`,transition:"all 200ms"}}>FALSE</button>
          </div>:<>
            <div style={{padding:"12px 16px",borderRadius:10,background:fs.ra===q.ans?"rgba(6,214,160,.08)":"rgba(255,68,102,.08)",border:`1px solid ${fs.ra===q.ans?C.teal:C.red}`,marginBottom:12}}>
              <strong>{fs.ra===q.ans?"✓ Correct":"✗ Incorrect"}</strong> — Answer: {q.ans?"True":"False"}
            </div>
            <p style={{fontSize:".85rem",lineHeight:1.6,color:C.txt2}}>{q.exp}</p>
            <button onClick={()=>setFS(p=>({...p,ri:p.ri+1,ra:null,rr:false}))} style={{...btn(`linear-gradient(135deg,${C.cyan},#0080ff)`,"#000"),marginTop:16}}>Next →</button>
          </>}
        </div>);
      })()}

      {/* DEEP DRILL */}
      {phase==="dd"&&(()=>{const q=DD[fs.di2];
        if(!q) return(<div style={{...card,textAlign:"center",padding:48}}><div style={{fontSize:"1.6rem",marginBottom:12}}>⭐</div><h3 style={hd(1.1)}>Session Complete</h3><p style={{fontSize:".88rem",color:C.txt2,margin:"8px 0 20px"}}>Score: {fs.sc.c} correct, {fs.sc.w} wrong</p><button onClick={()=>go("home")} style={btn(`linear-gradient(135deg,${C.teal},#00b088)`,"#000")}>Return Home</button></div>);
        const concept=cc.find(c=>c.id===q.cid);
        return(<div style={{...card,padding:"36px 40px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={ey}>DEEP DRILL · {fs.di2+1}/{DD.length}</div>
            {concept&&<span style={{fontSize:".68rem",color:mc(concept.mastery),border:`1px solid ${mc(concept.mastery)}33`,padding:"2px 8px",borderRadius:12}}>{concept.name}</span>}
          </div>
          <p style={{fontSize:"1rem",lineHeight:1.7,color:C.txt2,margin:"0 0 20px"}}>{q.q}</p>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {q.opts.map((o,i)=>(
              <button key={i} onClick={()=>{if(fs.dr)return;const ok=i===q.cor;setFS(p=>({...p,da:i,dr:true,sc:{c:p.sc.c+(ok?1:0),w:p.sc.w+(ok?0:1)}}));if(ok){bump(q.cid,.06);showToast("✓ Correct!",true);}else showToast("✗ Not quite",false);}} style={{textAlign:"left",padding:"14px 18px",borderRadius:10,border:`1px solid ${fs.dr&&i===q.cor?C.teal:fs.dr&&fs.da===i&&i!==q.cor?C.red:C.bdr}`,background:fs.dr&&i===q.cor?"rgba(6,214,160,.06)":fs.dr&&fs.da===i&&i!==q.cor?"rgba(255,68,102,.06)":"rgba(10,10,26,.4)",cursor:fs.dr?"default":"pointer",color:C.txt,fontSize:".86rem",lineHeight:1.5,width:"100%",transition:"all 250ms",opacity:fs.dr&&fs.da!==i&&i!==q.cor?.3:1}}>{o}</button>
            ))}
          </div>
          {fs.dr&&<><p style={{fontSize:".85rem",lineHeight:1.6,color:C.txt2,marginTop:16}}>{q.exp}</p><button onClick={()=>setFS(p=>({...p,di2:p.di2+1,da:null,dr:false}))} style={{...btn(`linear-gradient(135deg,${C.cyan},#0080ff)`,"#000"),marginTop:16}}>Next →</button></>}
        </div>);
      })()}
    </div>}

    {/* ═══ ORACLE ═══ */}
    {v==="oracle"&&<div style={{maxWidth:780,margin:"0 auto"}}>
      <h2 style={hd(1.2)}>Oracle Panel</h2>
      <p style={{color:C.txt2,fontSize:".86rem",lineHeight:1.5,margin:"6px 0 20px"}}>Ask an ethical question. Six philosophers respond from their own frameworks.</p>
      <div style={{display:"flex",gap:10,marginBottom:28}}>
        <input value={oq} onChange={e=>setOQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(()=>{
          if(!oq.trim())return;
          setOR(PHILOSOPHERS.map(p=>({...p,q:p.quotes[Math.floor(Math.random()*p.quotes.length)]})));
        })()} placeholder="e.g. Is lying ever justified?" style={{flex:1,padding:"12px 18px",borderRadius:12,border:`1px solid ${C.bdr}`,background:"rgba(10,10,26,.7)",color:C.txt,fontSize:".86rem",outline:"none"}}/>
        <button onClick={()=>{if(!oq.trim())return;setOR(PHILOSOPHERS.map(p=>({...p,q:p.quotes[Math.floor(Math.random()*p.quotes.length)]})));}} style={btn(`linear-gradient(135deg,${C.cyan},#0080ff)`,"#000")}>Ask</button>
      </div>
      {!or?<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
        {PHILOSOPHERS.map(p=><div key={p.name} style={{...card,padding:"20px 24px"}}><div style={{fontSize:".9rem",fontWeight:700}}>{p.name}</div><div style={{fontSize:".7rem",color:C.cyan,marginTop:2}}>{p.trad}</div><div style={{fontSize:".68rem",color:C.mute,marginTop:6}}>{p.quotes.length} positions</div></div>)}
      </div>:<div style={{display:"flex",flexDirection:"column",gap:14}}>
        {or.map((r,i)=><div key={i} style={{...card,padding:"24px 28px",borderLeft:`3px solid ${C.cyan}`,animation:`fadeInUp ${300+i*120}ms ease both`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div><div style={{fontSize:".88rem",fontWeight:700}}>{r.name}</div><div style={{fontSize:".68rem",color:C.cyan}}>{r.trad}</div></div>
            <span style={{fontSize:".68rem",color:C.mute,fontStyle:"italic"}}>p. {r.q.pg}</span>
          </div>
          <p style={{fontSize:".9rem",lineHeight:1.7,color:C.txt2,fontStyle:"italic",margin:0}}>"{r.q.text}"</p>
        </div>)}
        <button onClick={()=>{setOR(null);setOQ("");}} style={btn("transparent",C.cyan,`1px solid rgba(0,240,255,.2)`)}>Ask another question</button>
      </div>}
    </div>}

    </main>
    <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
  </div>);
}
