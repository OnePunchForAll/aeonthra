import { useState, useCallback } from "react";

const COURSE = { code: "PHI 208", title: "Ethics and Moral Reasoning", term: "Spring 2026" };

// ═══ CONCEPTS with 5+ questions each ═══
const C_DATA = [
  { id:"util",name:"Utilitarianism",cat:"Consequentialism",
    core:"The right action produces the greatest total good for the greatest number.",
    depth:"Bentham founded it; Mill refined it. Bentham counted pleasures equally. Mill argued intellectual pleasures rank higher. Both agree: morality = outcomes.",
    distinction:"Unlike deontology (rules) and virtue ethics (character), utilitarianism ONLY cares about consequences. A lie that saves lives is good.",
    mnemonic:"A happiness calculator — every action scored by total well-being across everyone.",
    pitfall:"Students confuse it with selfishness. It's the opposite — count everyone equally.",
    keywords:["consequences","greatest good","Bentham","Mill"], connections:["felicific","actrule","expmachine"],
    dilemma:{text:"A factory causes minor pollution but provides 500 jobs. What framework do you apply?",
      opts:[{t:"Calculate total harm vs benefit for ALL parties.",fw:"Utilitarian",w:"Demands weighing all consequences — workers, families, environment."},
        {t:"Pollution violates residents' rights regardless of jobs.",fw:"Deontological",w:"Rights-based: people shouldn't be harmed as means to economic benefit."},
        {t:"A good leader finds ways to reduce harm while preserving jobs.",fw:"Virtue Ethics",w:"Practical wisdom seeks creative solutions over false dilemmas."}]},
    tf:[
      {c:"Utilitarianism judges actions by outcomes, not intentions.",a:true,e:"Correct — only consequences matter."},
      {c:"Utilitarianism says maximize YOUR OWN happiness.",a:false,e:"False — equal consideration of EVERYONE's happiness."},
      {c:"A lie that prevents suffering is morally acceptable under utilitarianism.",a:true,e:"Correct — if lying produces more good, it's right."},
      {c:"Utilitarianism was founded by Aristotle.",a:false,e:"False — founded by Jeremy Bentham, refined by John Stuart Mill."},
      {c:"Under utilitarianism, the minority's suffering can be justified if the majority benefits.",a:true,e:"Correct — this is actually one of utilitarianism's most controversial implications."},
    ],
    mc:[
      {q:"A city can build a park (10,000 benefit slightly) or hospital (saves 100 lives). A utilitarian would:",opts:["Always hospital","Always park","Calculate which produces greater total well-being","Ask what's fair"],cor:2,e:"Must calculate actual impact, not assume."},
      {q:"What distinguishes Mill from Bentham?",opts:["Mill rejected utilitarianism","Mill argued some pleasures are qualitatively higher","Mill focused on rules instead","Mill was a deontologist"],cor:1,e:"Mill: 'Better to be Socrates dissatisfied than a fool satisfied.'"},
      {q:"The strongest objection to utilitarianism is:",opts:["It's too old","It could justify harming minorities for majority benefit","It's too simple","Bentham was wrong about pain"],cor:1,e:"If 51% benefit from oppressing 49%, utilitarianism struggles to object."},
    ]},
  { id:"deont",name:"Deontology",cat:"Non-consequentialism",
    core:"Actions are right or wrong based on duties and rules, regardless of consequences.",
    depth:"Kant: moral law from pure reason. Test: 'Could everyone do this?' If universal adoption creates contradiction, it's wrong.",
    distinction:"Some acts are inherently wrong — lying, murder, using people — EVEN if they produce good outcomes.",
    mnemonic:"'Deon' = duty. A judge following law even when the verdict seems unfair.",
    pitfall:"Students think it means 'follow existing rules.' Kant meant rules from REASON, not convention.",
    keywords:["duty","rules","Kant","universal law"], connections:["catimperative","naturallaw"],
    dilemma:{text:"A murderer asks where your friend is hiding. Lie to save them, or tell truth because lying is always wrong?",
      opts:[{t:"Lie — saving a life matters more than honesty.",fw:"Utilitarian",w:"Consequences override rules when lives are at stake."},
        {t:"Tell truth — you're responsible for lying, not for what the murderer does.",fw:"Kant's actual position",w:"Kant really argued this — moral duty doesn't bend."},
        {t:"Find a creative way to redirect without directly lying.",fw:"Virtue Ethics",w:"Practical wisdom seeks a path that preserves both honesty and life."}]},
    tf:[
      {c:"Kant believed consequences determine moral worth.",a:false,e:"False — duty and principle determine morality."},
      {c:"Deontology holds some acts are wrong even if they produce good outcomes.",a:true,e:"Correct — lying and murder are wrong regardless."},
      {c:"Deontology is based on cultural traditions.",a:false,e:"False — grounded in REASON, not convention."},
      {c:"Kant argued lying is always wrong, even to save a life.",a:true,e:"Correct — this is his most controversial claim."},
      {c:"Deontology and utilitarianism always agree on the right action.",a:false,e:"False — they frequently conflict, especially when good outcomes require rule-breaking."},
    ],
    mc:[
      {q:"Kant's key test for moral actions is:",opts:["Does it make people happy?","Could everyone do this without contradiction?","Does it build character?","Is it legal?"],cor:1,e:"Universalizability: if everyone did it and it undermined itself, it's wrong."},
      {q:"A deontologist would say about torturing one person to save thousands:",opts:["Do it — thousands outweigh one","Never — torture violates human dignity regardless of outcome","Only if the person consents","Depends on the situation"],cor:1,e:"Deontology prohibits treating people merely as means — torture violates this absolutely."},
      {q:"The main weakness of deontology is:",opts:["It's too new","It can seem rigid when following rules leads to terrible outcomes","It has no rules","Kant was unpopular"],cor:1,e:"Rigid rule-following can produce morally questionable results."},
    ]},
  { id:"virtue",name:"Virtue Ethics",cat:"Character-based",
    core:"Morality = developing good character traits through practice and habit.",
    depth:"Aristotle: become virtuous by practicing virtue — like learning an instrument. Character over calculation.",
    distinction:"Utilitarianism: 'Best outcome?' Deontology: 'What rule?' Virtue ethics: 'What would a good person do?'",
    mnemonic:"Learning guitar — not by rules but by practicing until excellence is habitual.",
    pitfall:"Students think it's vague. Aristotle was precise — specific virtues with clear excesses and deficiencies.",
    keywords:["character","Aristotle","habit","flourishing"], connections:["mean"],
    dilemma:{text:"A colleague takes credit for a junior's idea. What do you do?",
      opts:[{t:"Speak up if it helps the team overall.",fw:"Utilitarian",w:"Calculate net benefit for everyone involved."},
        {t:"Speak up — dishonesty is wrong regardless.",fw:"Deontological",w:"Giving proper credit is a duty."},
        {t:"Ask what a person of integrity and courage would do HERE.",fw:"Virtue Ethics",w:"Focus on which response reflects the character you're building."}]},
    tf:[
      {c:"Virtue ethics focuses on character rather than rules or consequences.",a:true,e:"Correct — 'What kind of person should I be?'"},
      {c:"Aristotle believed virtues are innate — born with them or not.",a:false,e:"False — virtues are HABITS developed through practice."},
      {c:"Virtue ethics provides mathematical formulas for decisions.",a:false,e:"False — requires practical wisdom, not formulas."},
      {c:"Aristotle argued that courage is a virtue.",a:true,e:"Correct — courage, justice, temperance, and practical wisdom are key virtues."},
      {c:"Virtue ethics was developed in the 1800s.",a:false,e:"False — Aristotle developed it in ancient Greece, ~350 BCE."},
    ],
    mc:[
      {q:"What distinguishes virtue ethics from deontology?",opts:["They're the same","Virtue = character, deontology = rules","Virtue has no principles","Deontology is about character"],cor:1,e:"Fundamentally different starting points."},
      {q:"According to Aristotle, how do we become virtuous?",opts:["By reading about virtue","By being born virtuous","By repeatedly practicing virtuous actions","By following rules"],cor:2,e:"Like learning music — practice makes it habitual."},
      {q:"Virtue ethics handles moral dilemmas by asking:",opts:["What produces the most happiness?","What does the rule say?","What would a person of good character do?","What's legal?"],cor:2,e:"Character-based reasoning rather than calculation or rules."},
    ]},
  { id:"catimperative",name:"Categorical Imperative",cat:"Deontological Principles",
    core:"Kant's supreme principle: act only on rules you could will everyone to follow.",
    depth:"Two formulations: (1) Universal Law — could everyone do this? (2) Humanity — am I using someone as a tool?",
    distinction:"'Categorical' = unconditional, always applies. Unlike 'hypothetical' which only applies if you want something.",
    mnemonic:"Two tests: (1) Universal law? (2) Using someone as a tool?",
    pitfall:"Not 'follow the law' — moral principles from reason.",
    keywords:["Kant","universal law","humanity","ends"], connections:["deont"],
    dilemma:{text:"You could cheat on a test and nobody would know. Apply the categorical imperative.",
      opts:[{t:"If everyone cheated, grades become meaningless — contradiction.",fw:"Universal Law",w:"Universalized cheating destroys testing itself."},
        {t:"Cheating uses honest students as means to your advantage.",fw:"Formula of Humanity",w:"Exploiting others' integrity violates their dignity."},
        {t:"No one's harmed, so it's fine.",fw:"Utilitarian objection",w:"Exactly what Kant rejects — consequences don't determine morality."}]},
    tf:[
      {c:"The categorical imperative applies unconditionally.",a:true,e:"'Categorical' = always, everyone, no exceptions."},
      {c:"Kant's Formula of Humanity: treat people as ends, never merely as means.",a:true,e:"People have dignity, not just price."},
      {c:"Hypothetical and categorical imperatives are the same.",a:false,e:"Hypothetical = conditional. Categorical = unconditional."},
      {c:"The categorical imperative only applies to religious people.",a:false,e:"False — derived from pure reason, not religion."},
      {c:"'Could everyone do this?' is a test from the categorical imperative.",a:true,e:"The Formula of Universal Law — Kant's key moral test."},
    ],
    mc:[
      {q:"Lying fails the categorical imperative because:",opts:["It doesn't maximize happiness","If everyone lied, trust collapses — making lying pointless","Lying isn't a virtue","It's illegal"],cor:1,e:"Universal lying destroys the trust that makes lying possible."},
      {q:"The Formula of Humanity prohibits:",opts:["All human interaction","Using people merely as tools for your goals","Having goals","Being successful"],cor:1,e:"Treat people as ends in themselves, not mere instruments."},
      {q:"Which is an example of treating someone merely as a means?",opts:["Paying someone fairly for work","Lying to someone to get what you want","Having a friendship","Teaching a class"],cor:1,e:"Deception uses someone's trust as a tool — violating their dignity."},
    ]},
  { id:"trolley",name:"Trolley Problem",cat:"Applied Ethics",
    core:"Reveals tension between consequentialist math and deontological intuitions about harming people.",
    depth:"Switch: kill 1 to save 5 feels OK. Footbridge: push someone to save 5 feels wrong. Same math, different response.",
    distinction:"Not just a puzzle — reveals we use BOTH frameworks depending on context.",
    mnemonic:"Math says 5>1. Gut agrees with lever, recoils at push. That gap IS the problem.",
    pitfall:"No 'right answer' — its value is exposing your moral intuitions.",
    keywords:["dilemma","switch","footbridge","five vs one"], connections:["util","deont"],
    dilemma:{text:"Footbridge variant: push a stranger off a bridge to stop the trolley and save 5. Do you push?",
      opts:[{t:"Yes — 5 vs 1, same math as the lever.",fw:"Consequentialist",w:"If outcomes are all that matter, pushing and pulling produce identical results."},
        {t:"No — directly causing death is different from redirecting harm.",fw:"Deontological",w:"Pushing someone USES them as a tool."},
        {t:"This shows why ethics can't be reduced to formulas.",fw:"Moral psychology",w:"Our conflicting intuitions reveal we don't operate from one theory."}]},
    tf:[
      {c:"Most people respond identically to switch and footbridge versions.",a:false,e:"False — most accept the switch but reject the push."},
      {c:"The trolley problem reveals tension between consequentialist and deontological thinking.",a:true,e:"We accept math for the lever but apply deontological constraints for the push."},
      {c:"The trolley problem has a definitive correct answer.",a:false,e:"Its value is exposing intuitions, not providing answers."},
      {c:"The trolley problem was designed to support utilitarianism.",a:false,e:"It was designed to CHALLENGE simplistic moral reasoning."},
      {c:"Most people find pulling the lever more acceptable than pushing someone.",a:true,e:"Correct — same outcome, but pushing feels like murder."},
    ],
    mc:[
      {q:"Why do people accept the lever but reject the push?",opts:["Bad at math","Intuitive difference between redirecting and directly causing harm","Haven't studied ethics","Bridge is scarier"],cor:1,e:"Lever redirects; push directly uses a person as a tool."},
      {q:"The trolley problem is most useful for:",opts:["Determining the right answer","Revealing hidden moral assumptions and conflicts","Making ethics fun","Proving consequentialism wrong"],cor:1,e:"It exposes the frameworks we unconsciously use."},
      {q:"A self-driving car faces a trolley-type scenario. This is problematic because:",opts:["Cars shouldn't drive","We can't program moral judgment — it requires human wisdom","Self-driving cars are too expensive","Trolley problems aren't real"],cor:1,e:"Algorithms can't capture the full complexity of moral reasoning."},
    ]},
  { id:"expmachine",name:"Experience Machine",cat:"Thought Experiments",
    core:"Nozick: would you plug into a machine simulating perfect happiness? Most say no.",
    depth:"If pleasure were all that matters, everyone would choose the machine. Refusal shows we value authenticity.",
    distinction:"Strongest objection to hedonistic utilitarianism — a good life requires more than feeling good.",
    mnemonic:"Neo choosing the red pill. We want real life, not perfect simulation.",
    pitfall:"Doesn't disprove ALL utilitarianism — challenges hedonistic specifically.",
    keywords:["Nozick","pleasure","reality","authenticity"], connections:["util"],
    dilemma:{text:"The experience machine exists and is safe. Do you plug in?",
      opts:[{t:"Yes — if experiences feel real, there's no meaningful difference.",fw:"Hedonist",w:"If pleasure is the only good, simulated pleasure is equally valuable."},
        {t:"No — I want to actually DO things, not just feel like I did.",fw:"Nozick's insight",w:"We value being and doing, not just experiencing."},
        {t:"No — real relationships require real people.",fw:"Relational",w:"Simulated love isn't love."}]},
    tf:[
      {c:"Most people choose to plug into the experience machine.",a:false,e:"Most REFUSE — showing pleasure isn't everything."},
      {c:"The experience machine challenges hedonistic utilitarianism.",a:true,e:"If pleasure = only good, everyone would choose the machine."},
      {c:"Nozick created the machine to support utilitarianism.",a:false,e:"Created as an OBJECTION to hedonistic utilitarianism."},
      {c:"The thought experiment suggests we value authenticity over pleasure.",a:true,e:"We want real accomplishment, not just the feeling of it."},
      {c:"The experience machine proves all utilitarianism is wrong.",a:false,e:"Only challenges hedonistic utilitarianism specifically."},
    ],
    mc:[
      {q:"The experience machine demonstrates:",opts:["Technology is bad","People value things beyond pleasure","Utilitarianism is completely wrong","Kant was right"],cor:1,e:"Authenticity, real achievement, genuine connection > just feeling good."},
      {q:"A preference utilitarian could respond to the machine by saying:",opts:["Plug in anyway","People's PREFERENCE for reality IS what matters — satisfying preferences, not just pleasure","Nozick was wrong","Ignore the experiment"],cor:1,e:"Preference utilitarianism counts what people actually want, not just pleasure."},
    ]},
  { id:"relativism",name:"Moral Relativism",cat:"Metaethics",
    core:"No universal moral truths — right and wrong are set by culture or individual.",
    depth:"Seems tolerant, but implies you can never condemn another culture's practices, including slavery.",
    distinction:"Denies what every other theory assumes — that objective moral truth exists.",
    mnemonic:"'When in Rome' taken to its extreme — but if Rome has slavery, should you?",
    pitfall:"Confusing relativism with tolerance. Tolerance requires believing others are WRONG but respecting them.",
    keywords:["culture","relative","universal","tolerance"], connections:["naturallaw"],
    dilemma:{text:"Culture A practices child marriage. Culture B condemns it. A moral relativist must say:",
      opts:[{t:"Culture A is wrong — harming children is wrong everywhere.",fw:"Objectivism",w:"Requires universal moral truths — contradicts relativism."},
        {t:"Neither is objectively right — morality is culturally determined.",fw:"Consistent relativism",w:"Logically consistent but most find it unacceptable."},
        {t:"We can criticize measurable harm while respecting cultural differences.",fw:"Moderate",w:"Tries to preserve sensitivity without accepting anything goes."}]},
    tf:[
      {c:"Moral relativism claims some truths are universal.",a:false,e:"DENIES all universal moral truths."},
      {c:"If relativism is true, we cannot condemn genocide.",a:true,e:"Most devastating objection — can never say another culture is wrong."},
      {c:"Moral relativism and tolerance are the same thing.",a:false,e:"Tolerance requires 'wrong but respected.' Relativism eliminates 'wrong.'"},
      {c:"Cultural relativism says right = whatever your culture says.",a:true,e:"Correct — morality is determined by cultural norms."},
      {c:"Moral relativists believe some acts are objectively evil.",a:false,e:"False — that would be moral objectivism."},
    ],
    mc:[
      {q:"Strongest objection to relativism:",opts:["Too complicated","Makes it impossible to condemn slavery/genocide","Too new","Contradicts religion"],cor:1,e:"If morality is relative, you can NEVER condemn any culture."},
      {q:"The difference between relativism and tolerance:",opts:["They're identical","Tolerance says 'you're wrong but I respect you'; relativism says nothing is wrong","Tolerance is stricter","Relativism requires tolerance"],cor:1,e:"True tolerance needs a concept of 'wrong' — relativism eliminates it."},
    ]},
  { id:"socialcontract",name:"Social Contract",cat:"Political Philosophy",
    core:"Rules are justified because rational people would agree to them under fair conditions.",
    depth:"Hobbes: escape chaos. Rawls: 'veil of ignorance' — design rules not knowing your position.",
    distinction:"Grounds morality in agreement — rules are legitimate because we'd consent.",
    mnemonic:"Writing board game rules without knowing which piece you'll be.",
    pitfall:"The contract is hypothetical — no one actually signed it.",
    keywords:["Hobbes","Rawls","veil of ignorance","fairness"], connections:["deont"],
    dilemma:{text:"Behind the veil of ignorance, design healthcare policy not knowing if you'll be rich or poor.",
      opts:[{t:"Universal healthcare — I might be poor or sick.",fw:"Rawlsian",w:"Not knowing your position forces protecting the worst-off."},
        {t:"Market-based — competition produces best quality.",fw:"Libertarian",w:"Some argue Rawls biases toward redistribution."},
        {t:"Basic coverage for all + optional private.",fw:"Compromise",w:"Balances fairness and freedom."}]},
    tf:[
      {c:"Social contract grounds morality in rational agreement.",a:true,e:"Rules are legitimate because rational people would consent."},
      {c:"Rawls's veil means actually forgetting your memories.",a:false,e:"A thought experiment — imagine not knowing your position."},
      {c:"Hobbes and Rawls agreed on everything.",a:false,e:"Hobbes = escape chaos. Rawls = achieve fairness."},
      {c:"The social contract is a real historical document people signed.",a:false,e:"It's hypothetical — what rational people WOULD agree to."},
      {c:"Behind the veil, you'd design fair rules because you might be anyone.",a:true,e:"Not knowing your position forces fairness for all."},
    ],
    mc:[
      {q:"The veil of ignorance ensures fair rules because:",opts:["Everyone is smart","You design without knowing your position","It eliminates disagreement","Rawls was always right"],cor:1,e:"Might be rich or poor, so you protect everyone."},
      {q:"Hobbes believed without government, life would be:",opts:["Perfect","Solitary, poor, nasty, brutish, and short","Unchanged","Better"],cor:1,e:"The 'state of nature' motivates accepting social contracts."},
    ]},
];

const ASSIGNMENTS = [
  {id:"a1",title:"Ethics Paper 1",sub:"Utilitarianism Applied",type:"📝",due:7,pts:100,concepts:["util"],tip:"Apply felicific calculus to a real dilemma."},
  {id:"a2",title:"Week 3 Discussion",sub:"Trolley Problem",type:"💬",due:3,pts:25,concepts:["trolley","util","deont"],tip:"Show you understand BOTH sides."},
  {id:"a3",title:"Kantian Analysis",sub:"Categorical Imperative",type:"📝",due:14,pts:100,concepts:["deont","catimperative"],tip:"Apply both formulations to one issue."},
  {id:"a4",title:"Week 5 Discussion",sub:"Relativism Debate",type:"💬",due:10,pts:25,concepts:["relativism"],tip:"Use the 'can't condemn genocide' objection."},
  {id:"a5",title:"Midterm Quiz",sub:"Chapters 1-5",type:"❓",due:21,pts:50,concepts:["util","deont","virtue","catimperative","socialcontract"],tip:"Focus on DISTINCTIONS between theories."},
  {id:"a6",title:"Final Paper",sub:"Multi-Framework Case",type:"📝",due:42,pts:200,concepts:["util","deont","virtue","socialcontract"],tip:"Show where frameworks AGREE and DIVERGE."},
];

const PHILOSOPHERS = [
  {name:"Jeremy Bentham",trad:"Utilitarianism",quotes:[
    {text:"The greatest happiness of the greatest number is the foundation of morals and legislation.",pg:44,tags:["happiness","morality","good","greatest"]},
    {text:"Nature has placed mankind under the governance of two sovereign masters: pain and pleasure.",pg:43,tags:["pain","pleasure","nature","human","feeling"]},
    {text:"The question is not Can they reason? but Can they suffer?",pg:47,tags:["suffering","rights","animals","empathy"]},
  ]},
  {name:"Immanuel Kant",trad:"Deontology",quotes:[
    {text:"Act only according to that maxim whereby you can will it should become a universal law.",pg:62,tags:["universal","law","action","rule","lying","duty","maxim"]},
    {text:"Treat humanity never merely as a means, but always also as an end.",pg:64,tags:["humanity","dignity","means","ends","person","respect","use","tool"]},
    {text:"Two things fill the mind with admiration: the starry heavens above and the moral law within.",pg:60,tags:["moral","wonder","reason","law","admiration"]},
  ]},
  {name:"Aristotle",trad:"Virtue Ethics",quotes:[
    {text:"We are what we repeatedly do. Excellence is not an act, but a habit.",pg:78,tags:["habit","excellence","practice","character","virtue","action","repeated"]},
    {text:"Virtue is a state of character concerned with choice, lying in a mean relative to us.",pg:80,tags:["virtue","character","choice","mean","balance","moderate"]},
    {text:"It is the mark of an educated mind to entertain a thought without accepting it.",pg:82,tags:["thought","education","mind","reason","open"]},
  ]},
  {name:"John Stuart Mill",trad:"Utilitarianism",quotes:[
    {text:"It is better to be Socrates dissatisfied than a fool satisfied.",pg:51,tags:["pleasure","quality","higher","satisfaction","happiness","fool","socrates"]},
    {text:"Actions are right in proportion as they tend to promote happiness.",pg:49,tags:["happiness","right","action","good","consequence","promote"]},
    {text:"Over himself, over his body and mind, the individual is sovereign.",pg:55,tags:["freedom","individual","liberty","autonomy","rights","sovereign"]},
  ]},
  {name:"Thomas Aquinas",trad:"Natural Law",quotes:[
    {text:"The natural law is the rational creature's participation in the eternal law.",pg:118,tags:["natural","law","reason","eternal","god","rational"]},
    {text:"Good is to be done and pursued, and evil is to be avoided.",pg:120,tags:["good","evil","action","moral","pursue","avoid","natural"]},
  ]},
  {name:"John Rawls",trad:"Social Contract",quotes:[
    {text:"Justice is the first virtue of social institutions, as truth is of systems of thought.",pg:102,tags:["justice","society","institution","fairness","truth","virtue"]},
    {text:"No one knows his place in society — principles are chosen behind a veil of ignorance.",pg:104,tags:["veil","ignorance","fairness","position","society","equal","justice"]},
  ]},
];

// ═══ HELPERS ═══
const mc=(m)=>m>=.8?"#ffd700":m>=.5?"#06d6a0":m>=.2?"#00f0ff":m>0?"#4a5a8a":"#2a2a48";
const pct=(v)=>Math.round(v*100)+"%";

export default function App(){
  const [cc,setCC]=useState(C_DATA.map(c=>({...c,mastery:0})));
  const [v,setV]=useState("home");
  const [selC,setSelC]=useState(null);
  const [selA,setSelA]=useState(null);
  const [fc,setFC]=useState(null); // forge concept
  const [fp,setFP]=useState("intro"); // forge phase
  const [is,setIS]=useState(0); // intro step
  const [dc,setDC]=useState(null); // dilemma choice
  const [ti,setTI]=useState(0); // tf index
  const [ta,setTA]=useState(null); // tf answer
  const [mi,setMI]=useState(0); // mc index
  const [ma,setMA]=useState(null); // mc answer
  const [sc,setSC]=useState({c:0,w:0});
  const [completed,setCompleted]=useState(new Set()); // completed concept IDs
  const [oq,setOQ]=useState("");
  const [or,setOR]=useState(null);
  const [cmpA,setCmpA]=useState(null);
  const [cmpB,setCmpB]=useState(null);
  const [fade,setFade]=useState(true);
  const [toast,setToast]=useState(null);

  const [flashIdx,setFlashIdx]=useState(0);
  const [flashFlipped,setFlashFlipped]=useState(false);
  const [matchItems,setMatchItems]=useState([]);
  const [matchSel,setMatchSel]=useState(null);
  const [matchDone,setMatchDone]=useState(new Set());

  const go=useCallback((to,d)=>{
    setFade(false);
    setTimeout(()=>{
      setV(to);
      if(d?.c)setSelC(d.c);
      if(d?.a)setSelA(d.a);
      if(to==="forge"){
        const target=d?.c||cc.filter(c=>!completed.has(c.id)&&c.mastery<.8).sort((a,b)=>a.mastery-b.mastery)[0]||cc[0];
        setFC(target);setFP("intro");setIS(0);setDC(null);setTI(0);setTA(null);setMI(0);setMA(null);setSC({c:0,w:0});
      }
      setFade(true);
    },180);
  },[cc,completed]);

  const bump=(id,d)=>setCC(p=>p.map(c=>c.id===id?{...c,mastery:Math.min(1,Math.max(0,c.mastery+d))}:c));
  const flash=(m,g)=>{setToast({m,g});setTimeout(()=>setToast(null),2200);};
  const mastered=cc.filter(c=>c.mastery>=.8).length;
  const avg=cc.reduce((s,c)=>s+c.mastery,0)/cc.length;
  const nextA=[...ASSIGNMENTS].sort((a,b)=>a.due-b.due)[0];

  const askOracle=()=>{
    if(!oq.trim())return;
    const w=oq.toLowerCase().split(/\s+/).filter(x=>x.length>2);
    setOR(PHILOSOPHERS.map(p=>{
      let best=null,bs=0;
      p.quotes.forEach(q=>{let s=0;w.forEach(x=>{if(q.tags.some(t=>t.includes(x)||x.includes(t)))s+=3;if(q.text.toLowerCase().includes(x))s+=1;});if(s>bs){bs=s;best=q;}});
      if(!best)best=p.quotes[Math.floor(Math.random()*p.quotes.length)];
      return{...p,q:best,rel:bs};
    }).sort((a,b)=>b.rel-a.rel));
  };

  // ═══ STYLES ═══
  const BG="#020208",CARD="rgba(14,14,32,0.92)",BDR="rgba(50,50,100,0.55)",CY="#00f0ff",TL="#06d6a0",GD="#ffd700",RD="#ff4466",TX="#e0e0ff",T2="#b8b8d8",MU="#6a6a9a",DM="#2a2a4a";
  const card={background:CARD,border:`1px solid ${BDR}`,borderRadius:24,padding:"44px 48px",boxShadow:"0 6px 32px rgba(0,0,0,0.45)"};
  const cardAlt={background:"rgba(18,18,40,0.95)",border:`1px solid rgba(60,60,110,0.5)`,borderRadius:24,padding:"44px 48px",boxShadow:"0 6px 32px rgba(0,0,0,0.45)"};
  const ey={fontSize:".82rem",fontWeight:800,letterSpacing:".18em",textTransform:"uppercase",color:MU,marginBottom:20};
  const hd=s=>({fontSize:s+"rem",fontWeight:700,margin:0,lineHeight:1.3,color:TX});
  const btn=(bg,fg)=>({background:bg,color:fg,border:"none",padding:"16px 36px",borderRadius:16,fontWeight:700,fontSize:".92rem",cursor:"pointer",letterSpacing:".04em",transition:"all 220ms cubic-bezier(.22,1,.36,1)"});

  return(
  <div style={{minHeight:"100vh",background:BG,backgroundImage:"radial-gradient(ellipse at 50% 0%,#0c0c28 0%,#050510 40%,#020208 70%)",color:TX,fontFamily:"'Segoe UI',system-ui,sans-serif",fontSize:"18px"}}>
    {/* NAV */}
    <nav style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 44px",borderBottom:`1px solid rgba(0,240,255,.08)`,position:"sticky",top:0,zIndex:100,background:"rgba(6,6,16,.96)",backdropFilter:"blur(20px)"}}>
      <div style={{display:"flex",alignItems:"center",gap:18}}>
        <span style={{fontWeight:900,fontSize:"1.5rem",letterSpacing:".14em",color:CY,textShadow:"0 0 30px rgba(0,240,255,.3)"}}>AEONTHRA</span>
        <span style={{fontSize:".74rem",letterSpacing:".14em",color:MU,border:"1px solid #1a1a3a",padding:"5px 14px",borderRadius:20}}>{COURSE.code}</span>
      </div>
      <div style={{display:"flex",gap:4}}>
        {[["home","Home"],["journey","Journey"],["explore","Concepts"],["forge","Learn"],["compare","Compare"],["oracle","Oracle"]].map(([id,lb])=>(
          <button key={id} onClick={()=>go(id)} style={{background:v===id?"rgba(0,240,255,.08)":"transparent",border:"none",color:v===id?CY:MU,padding:"12px 24px",borderRadius:14,cursor:"pointer",fontSize:".92rem",fontWeight:600,transition:"all 200ms"}}>{lb}</button>
        ))}
      </div>
    </nav>

    {toast&&<div style={{position:"fixed",top:84,left:"50%",transform:"translateX(-50%)",padding:"14px 32px",borderRadius:16,background:toast.g?`${TL}18`:`${RD}18`,border:`1px solid ${toast.g?TL:RD}`,color:toast.g?TL:RD,fontSize:".92rem",fontWeight:700,zIndex:200,animation:"fadeUp .3s ease"}}>{toast.m}</div>}

    <main style={{maxWidth:1280,margin:"0 auto",padding:"44px 40px 120px",opacity:fade?1:0,transition:"opacity 180ms ease"}}>

    {/* ═══ HOME ═══ */}
    {v==="home"&&<>
      <div style={{...card,marginBottom:28,background:"linear-gradient(135deg,rgba(0,240,255,.06),rgba(14,14,32,.92))",borderColor:"rgba(0,240,255,.18)",boxShadow:"0 4px 32px rgba(0,240,255,.06)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:28}}>
          <div><div style={ey}>YOUR COURSE</div><h1 style={hd(1.7)}>{COURSE.title}</h1><p style={{color:MU,fontSize:".9rem",marginTop:8}}>{COURSE.code} · {COURSE.term}</p></div>
          <div style={{display:"flex",gap:44}}>
            {[[mastered+"/"+cc.length,"Mastered"],[pct(avg),"Overall"],[completed.size,"Learned"]].map(([val,lb],i)=>(
              <div key={i} style={{textAlign:"center"}}><div style={{fontSize:"2.5rem",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{val}</div><div style={{fontSize:".74rem",color:MU,letterSpacing:".12em",textTransform:"uppercase",marginTop:4}}>{lb}</div></div>
            ))}
          </div>
        </div>
      </div>

      {nextA&&<div style={{...card,marginBottom:28,borderLeft:`4px solid ${CY}`}}>
        <div style={{...ey,color:CY}}>⚡ START HERE</div>
        <h2 style={hd(1.3)}>{nextA.title}: {nextA.sub}</h2>
        <p style={{color:MU,fontSize:".86rem",marginTop:6}}>{nextA.type} {nextA.pts}pts · Due in {nextA.due} days</p>
        {nextA.tip&&<p style={{color:T2,fontSize:".9rem",fontStyle:"italic",margin:"12px 0 20px"}}>💡 {nextA.tip}</p>}
        <button onClick={()=>go("forge")} style={btn(`linear-gradient(135deg,${CY},#0080ff)`,"#000")}>⚡ Start Learning</button>
      </div>}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:22}}>
        <div style={card}>
          <div style={ey}>MASTERY</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {cc.map(c=>(
              <button key={c.id} onClick={()=>go("explore",{c})} style={{display:"flex",alignItems:"center",gap:10,background:"transparent",border:"1px solid transparent",borderRadius:12,padding:"12px 14px",cursor:"pointer",color:TX,fontSize:".88rem",textAlign:"left",width:"100%",transition:"all 200ms"}}>
                <div style={{width:12,height:12,borderRadius:"50%",background:mc(c.mastery),flexShrink:0,boxShadow:c.mastery>=.5?`0 0 10px ${mc(c.mastery)}55`:""}}/>
                <span style={{flex:1}}>{c.name}</span>
                <span style={{color:mc(c.mastery),fontSize:".8rem",fontWeight:700}}>{c.mastery>0?pct(c.mastery):"—"}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={card}>
          <div style={ey}>ASSIGNMENTS</div>
          {ASSIGNMENTS.map(a=>{const rdy=a.concepts.every(id=>(cc.find(c=>c.id===id)?.mastery??0)>=.6);
            return(<button key={a.id} onClick={()=>go("assignment",{a})} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:"rgba(18,18,42,.65)",border:`1px solid ${BDR}`,borderRadius:14,cursor:"pointer",width:"100%",color:TX,transition:"all 200ms",marginBottom:8}}>
              <span style={{fontSize:"1.3rem",width:32}}>{a.type}</span>
              <div style={{flex:1,textAlign:"left"}}><div style={{fontSize:".92rem",fontWeight:600}}>{a.title}</div><div style={{fontSize:".76rem",color:MU}}>{a.pts}pts · {a.due}d</div></div>
              <span style={{fontSize:".72rem",fontWeight:700,padding:"5px 12px",borderRadius:16,...(rdy?{color:TL,border:`1px solid ${TL}33`,background:`${TL}0a`}:{color:"#ff8800",border:"1px solid #ff880033",background:"#ff88000a"})}}>{rdy?"Ready":"Prepare"}</span>
            </button>);
          })}
        </div>
      </div>
    </>}

    {/* ═══ JOURNEY ═══ */}
    {v==="journey"&&<>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:28}}>
        <div><h2 style={hd(1.5)}>Your Learning Journey</h2><p style={{color:T2,fontSize:".92rem",marginTop:6}}>Scroll through your path. Complete concepts to ignite each milestone.</p></div>
        <div style={{display:"flex",gap:20,alignItems:"center"}}>
          <div style={{fontSize:".82rem",color:MU}}>{completed.size}/{cc.length} completed</div>
          <div style={{width:120,height:8,borderRadius:4,background:DM,overflow:"hidden"}}><div style={{height:"100%",borderRadius:4,background:`linear-gradient(90deg,${CY},${TL},${GD})`,width:`${(completed.size/cc.length)*100}%`,transition:"width 800ms cubic-bezier(.22,1,.36,1)",boxShadow:`0 0 12px ${CY}44`}}/></div>
        </div>
      </div>

      <div style={{overflowX:"auto",paddingBottom:24,marginLeft:-36,marginRight:-36,paddingLeft:36,paddingRight:36}}>
        <div style={{display:"flex",alignItems:"stretch",gap:0,minWidth:"max-content",position:"relative"}}>
          {cc.map((c,i)=>{
            const done=completed.has(c.id);
            const active=c.mastery>0&&!done;
            const next=!done&&!active&&(i===0||completed.has(cc[i-1]?.id)||cc[i-1]?.mastery>0);
            return(
              <div key={c.id} style={{display:"flex",alignItems:"center",flexShrink:0}}>
                {/* Node + Card Column */}
                <button onClick={()=>done?go("explore",{c}):go("forge",{c})} style={{
                  width:240,display:"flex",flexDirection:"column",alignItems:"center",gap:14,cursor:"pointer",
                  background:"transparent",border:"none",color:TX,padding:"8px 4px",transition:"all 300ms",
                  opacity:!done&&!active&&!next?.4:1,
                  transform:next?"scale(1.02)":"scale(1)",
                }}>
                  {/* Glow ring */}
                  <div style={{position:"relative"}}>
                    {done&&<div style={{position:"absolute",inset:-8,borderRadius:"50%",background:`radial-gradient(circle,${GD}22 0%,transparent 70%)`,animation:"pulse 2s ease infinite"}}/>}
                    {next&&<div style={{position:"absolute",inset:-6,borderRadius:"50%",background:`radial-gradient(circle,${CY}18 0%,transparent 70%)`,animation:"pulse 1.5s ease infinite"}}/>}
                    <div style={{
                      width:72,height:72,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:done?"2rem":next?"1.4rem":"1.1rem",
                      background:done?`linear-gradient(135deg,${GD},#ff6600)`:active?`linear-gradient(135deg,${CY},${TL})`:next?`linear-gradient(135deg,rgba(0,240,255,.15),rgba(6,214,160,.1))`:CARD,
                      border:`3px solid ${done?GD:active?CY:next?`${CY}66`:BDR}`,
                      boxShadow:done?`0 0 32px ${GD}55,0 0 64px ${GD}22`:active?`0 0 24px ${CY}44`:"none",
                      transition:"all 500ms ease",position:"relative",zIndex:2,
                    }}>
                      {done?"🔥":active?"⚡":next?"▶":"○"}
                    </div>
                  </div>
                  {/* Label */}
                  <div style={{textAlign:"center",width:"100%"}}>
                    <div style={{fontSize:".65rem",fontWeight:700,letterSpacing:".14em",color:done?GD:active?CY:next?CY:MU,textTransform:"uppercase",marginBottom:4}}>{c.cat.split(" ")[0]}</div>
                    <div style={{fontSize:".95rem",fontWeight:700,lineHeight:1.3,marginBottom:6}}>{c.name}</div>
                    {done&&<div style={{fontSize:".78rem",fontWeight:700,color:GD}}>🔥 Complete</div>}
                    {active&&<div style={{fontSize:".78rem",fontWeight:700,color:CY}}>{pct(c.mastery)} mastery</div>}
                    {next&&<div style={{fontSize:".78rem",fontWeight:600,color:CY}}>Start here →</div>}
                    {!done&&!active&&!next&&<div style={{fontSize:".75rem",color:MU}}>Locked</div>}
                  </div>
                  {/* Mastery bar */}
                  <div style={{width:"80%",height:4,borderRadius:2,background:DM,overflow:"hidden"}}>
                    <div style={{height:"100%",borderRadius:2,background:done?GD:mc(c.mastery),width:done?"100%":pct(c.mastery),transition:"width 600ms ease"}}/>
                  </div>
                </button>
                {/* Connector line */}
                {i<cc.length-1&&<div style={{
                  width:40,height:4,flexShrink:0,borderRadius:2,alignSelf:"flex-start",marginTop:42,
                  background:done&&(completed.has(cc[i+1]?.id)||cc[i+1]?.mastery>0)?`linear-gradient(90deg,${GD},${CY})`:done?`linear-gradient(90deg,${GD},${DM})`:active?`linear-gradient(90deg,${CY},${DM})`:DM,
                  boxShadow:done?`0 0 8px ${GD}33`:"none",
                  transition:"all 500ms ease",
                }}/>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick stats row */}
      <div style={{display:"flex",gap:16,marginTop:20,flexWrap:"wrap"}}>
        {cc.filter(c=>completed.has(c.id)||c.mastery>0).length>0&&
          cc.filter(c=>completed.has(c.id)||c.mastery>0).map(c=>(
            <button key={c.id} onClick={()=>go("explore",{c})} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 18px",borderRadius:14,background:CARD,border:`1px solid ${completed.has(c.id)?`${GD}44`:BDR}`,cursor:"pointer",color:TX,fontSize:".82rem",transition:"all 200ms"}}>
              <span>{completed.has(c.id)?"🔥":"⚡"}</span>
              <span style={{fontWeight:600}}>{c.name}</span>
              <span style={{color:mc(c.mastery),fontWeight:700,fontSize:".78rem"}}>{pct(c.mastery)}</span>
            </button>
          ))
        }
        {completed.size===0&&<div style={{padding:"16px 24px",borderRadius:14,background:CARD,border:`1px solid ${BDR}`,color:MU,fontSize:".88rem"}}>Complete your first concept to see it glow here ✨</div>}
      </div>
    </>}

    {/* ═══ EXPLORE ═══ */}
    {v==="explore"&&<div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:24,alignItems:"start"}}>
      <div style={{...card,position:"sticky",top:84,padding:"28px 22px"}}>
        <div style={ey}>CONCEPTS</div>
        {cc.map(c=>(<button key={c.id} onClick={()=>setSelC(c)} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",borderRadius:12,background:selC?.id===c.id?"rgba(0,240,255,.07)":"transparent",border:selC?.id===c.id?`1px solid rgba(0,240,255,.2)`:"1px solid transparent",cursor:"pointer",width:"100%",color:TX,fontSize:".88rem",transition:"all 180ms",marginBottom:4}}>
          <div style={{width:10,height:10,borderRadius:"50%",background:mc(c.mastery)}}/>
          <span style={{flex:1,textAlign:"left"}}>{c.name}</span>
          <span style={{color:mc(c.mastery),fontSize:".76rem",fontWeight:700}}>{c.mastery>0?pct(c.mastery):"—"}</span>
        </button>))}
      </div>
      <div style={{...card,minHeight:500}}>
        {selC?<>
          <div style={{...ey,color:mc(selC.mastery)}}>{selC.cat}</div>
          <h2 style={hd(1.45)}>{selC.name}</h2>
          <div style={{height:5,background:DM,borderRadius:3,margin:"16px 0 8px",overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,background:mc(selC.mastery),width:pct(selC.mastery),transition:"width 600ms ease"}}/></div>
          <p style={{fontSize:".82rem",color:MU,marginBottom:36}}>{pct(selC.mastery)} mastery{completed.has(selC.id)?" · 🔥 Completed":""}</p>
          {[["Core Idea",selC.core],["Going Deeper",selC.depth],["Key Distinction",selC.distinction],["⚠ Common Mistake",selC.pitfall]].map(([lb,txt])=>(
            <div key={lb} style={{marginBottom:28}}><div style={{fontSize:".74rem",fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:lb.includes("⚠")?RD:CY,marginBottom:8}}>{lb}</div><p style={{fontSize:"1rem",lineHeight:1.8,color:T2,margin:0}}>{txt}</p></div>
          ))}
          <div style={{marginBottom:28}}><div style={{fontSize:".74rem",fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:TL,marginBottom:8}}>Memory Hook</div><p style={{fontSize:"1rem",lineHeight:1.65,color:TL,fontStyle:"italic",margin:0}}>{selC.mnemonic}</p></div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:28}}>{selC.keywords.map(k=><span key={k} style={{padding:"6px 14px",borderRadius:20,border:`1px solid ${BDR}`,fontSize:".78rem",color:MU}}>{k}</span>)}</div>
          {selC.connections.length>0&&<div style={{marginBottom:28}}><div style={{fontSize:".74rem",fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:CY,marginBottom:10}}>Related</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{selC.connections.map(id=>{const r=cc.find(c=>c.id===id);return r?<button key={id} onClick={()=>setSelC(r)} style={{padding:"6px 16px",borderRadius:20,border:`1px solid ${CY}22`,color:CY,background:`${CY}10`,cursor:"pointer",fontSize:".82rem",fontWeight:600}}>{r.name}</button>:null;})}</div></div>}
          <button onClick={()=>go("forge",{c:selC})} style={btn(`linear-gradient(135deg,${CY},#0080ff)`,"#000")}>Practice {selC.name} →</button>
        </>:<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:440,color:MU}}><div style={{textAlign:"center"}}><div style={{fontSize:"2rem",marginBottom:14}}>←</div><p style={{fontSize:"1rem"}}>Select a concept to explore</p></div></div>}
      </div>
    </div>}

    {/* ═══ ASSIGNMENT ═══ */}
    {v==="assignment"&&selA&&<div style={{maxWidth:820}}>
      <button onClick={()=>go("home")} style={{background:"transparent",border:"none",color:MU,cursor:"pointer",fontSize:".9rem",marginBottom:22}}>← Back</button>
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:22}}>
        <span style={{fontSize:"2rem"}}>{selA.type}</span>
        <div><h2 style={hd(1.35)}>{selA.title}</h2><p style={{color:MU,fontSize:".88rem",margin:"4px 0 0"}}>{selA.sub} · {selA.pts}pts · Due in {selA.due} days</p></div>
      </div>
      {selA.tip&&<div style={{...card,marginBottom:22,borderLeft:`4px solid ${TL}`}}><div style={{fontSize:".74rem",fontWeight:700,letterSpacing:".12em",color:TL,marginBottom:10}}>💡 Strategy</div><p style={{fontSize:".95rem",lineHeight:1.7,color:T2,margin:0}}>{selA.tip}</p></div>}
      <div style={card}>
        <div style={{fontSize:".74rem",fontWeight:700,letterSpacing:".12em",color:CY,marginBottom:14}}>REQUIRED CONCEPTS</div>
        {selA.concepts.map(id=>{const c=cc.find(x=>x.id===id);if(!c)return null;const rdy=c.mastery>=.6;
          return(<div key={id} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 0",borderBottom:`1px solid ${BDR}`}}>
            <div style={{width:12,height:12,borderRadius:"50%",background:mc(c.mastery)}}/>
            <span style={{flex:1,fontSize:".95rem"}}>{c.name}</span>
            <span style={{color:mc(c.mastery),fontSize:".85rem",fontWeight:700}}>{pct(c.mastery)}</span>
            <span style={{fontSize:".72rem",fontWeight:700,padding:"4px 12px",borderRadius:14,...(rdy?{color:TL,background:`${TL}1a`}:{color:RD,background:`${RD}1a`})}}>{rdy?"✓":"Needs work"}</span>
          </div>);
        })}
        {selA.concepts.some(id=>(cc.find(c=>c.id===id)?.mastery??0)<.6)&&<button onClick={()=>go("forge")} style={{...btn(`linear-gradient(135deg,${CY},#0080ff)`,"#000"),marginTop:24}}>⚡ Prepare</button>}
      </div>
    </div>}

    {/* ═══ FORGE ═══ */}
    {v==="forge"&&fc&&<div style={{maxWidth:800,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28}}>
        <div style={{display:"flex",gap:6}}>
          {[["intro","Learn"],["dilemma","Dilemma"],["tf","Quick Test"],["mc","Deep Test"],["flash","Flashcards"],["whois","Who Said It?"]].map(([id,lb])=>(
            <button key={id} onClick={()=>{setFP(id);if(id==="tf"){setTI(0);setTA(null);}if(id==="mc"){setMI(0);setMA(null);}if(id==="dilemma")setDC(null);if(id==="flash"){setFlashIdx(0);setFlashFlipped(false);}if(id==="whois"){setMatchItems(cc.filter(c=>c.id!==fc.id).sort(()=>Math.random()-.5).slice(0,3).concat([fc]).sort(()=>Math.random()-.5));setMatchSel(null);setMatchDone(new Set());}}} style={{background:fp===id?"rgba(0,240,255,.08)":"transparent",border:fp===id?`1px solid ${CY}33`:`1px solid ${BDR}`,color:fp===id?CY:MU,padding:"10px 20px",borderRadius:20,cursor:"pointer",fontSize:".82rem",fontWeight:700,transition:"all 200ms"}}>{lb}</button>
          ))}
        </div>
        <div style={{display:"flex",gap:16,fontSize:".92rem",fontWeight:700}}><span style={{color:TL}}>✓{sc.c}</span><span style={{color:RD}}>✗{sc.w}</span></div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}>
        <div style={{width:14,height:14,borderRadius:"50%",background:mc(fc.mastery),boxShadow:`0 0 10px ${mc(fc.mastery)}55`}}/>
        <span style={{fontSize:"1.2rem",fontWeight:700}}>{fc.name}</span>
        <span style={{fontSize:".82rem",color:mc(fc.mastery),fontWeight:700}}>{pct(fc.mastery)}</span>
        <button onClick={()=>{const n=cc.filter(c=>c.id!==fc.id&&!completed.has(c.id)&&c.mastery<.8);if(n.length)go("forge",{c:n[0]});}} style={{marginLeft:"auto",fontSize:".82rem",color:MU,background:"transparent",border:`1px solid ${BDR}`,padding:"6px 16px",borderRadius:16,cursor:"pointer"}}>Next concept →</button>
      </div>

      {/* INTRO */}
      {fp==="intro"&&(()=>{const steps=["core","depth","distinction","pitfall"];const s=steps[is];
        return(<div style={{...card}}>
          <div style={{...ey,color:mc(fc.mastery)}}>ORIENTATION · {fc.name}</div>
          <div style={{display:"flex",gap:6,margin:"0 0 32px"}}>{steps.map((_,i)=><div key={i} style={{flex:1,height:5,borderRadius:3,background:i<=is?CY:DM,transition:"background 400ms"}}/>)}</div>
          {s==="core"&&<><h3 style={hd(1.2)}>Core Idea</h3><p style={{fontSize:"1.1rem",lineHeight:1.85,color:T2,marginTop:14}}>{fc.core}</p></>}
          {s==="depth"&&<><h3 style={hd(1.2)}>Going Deeper</h3><p style={{fontSize:"1.05rem",lineHeight:1.85,color:T2,marginTop:14}}>{fc.depth}</p></>}
          {s==="distinction"&&<><h3 style={hd(1.2)}>Key Distinction</h3><p style={{fontSize:"1.05rem",lineHeight:1.85,color:T2,marginTop:14}}>{fc.distinction}</p></>}
          {s==="pitfall"&&<><h3 style={{...hd(1.2),color:RD}}>⚠ Common Mistake</h3><p style={{fontSize:"1.05rem",lineHeight:1.85,color:T2,marginTop:14}}>{fc.pitfall}</p><p style={{fontSize:"1rem",color:TL,fontStyle:"italic",marginTop:18}}>🔗 {fc.mnemonic}</p></>}
          <div style={{display:"flex",justifyContent:"space-between",marginTop:36}}>
            {is>0?<button onClick={()=>setIS(p=>p-1)} style={{...btn("transparent",MU),border:`1px solid ${BDR}`}}>← Back</button>:<div/>}
            {is<3?<button onClick={()=>setIS(p=>p+1)} style={btn(`linear-gradient(135deg,${CY},#0080ff)`,"#000")}>Continue →</button>:
              <button onClick={()=>{bump(fc.id,.06);flash("✨ Orientation complete!",true);setFP("dilemma");setDC(null);}} style={btn(`linear-gradient(135deg,${TL},#00b088)`,"#000")}>✓ Test me →</button>}
          </div>
        </div>);
      })()}

      {/* DILEMMA */}
      {fp==="dilemma"&&fc.dilemma&&(()=>{const d=fc.dilemma;
        return(<div style={card}>
          <div style={ey}>ETHICAL DILEMMA · {fc.name}</div>
          <p style={{fontSize:"1.1rem",lineHeight:1.85,color:T2,margin:"0 0 28px"}}>{d.text}</p>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {d.opts.map((o,i)=>(
              <button key={i} onClick={()=>{if(dc===null)setDC(i);}} style={{textAlign:"left",padding:"20px 24px",borderRadius:16,border:`1px solid ${dc===i?CY:BDR}`,background:dc===i?`${CY}06`:"rgba(18,18,42,.65)",cursor:dc!==null?"default":"pointer",color:TX,width:"100%",opacity:dc!==null&&dc!==i?.3:1,transition:"all 300ms"}}>
                <div style={{fontSize:".95rem",lineHeight:1.65}}>{o.t}</div>
                {dc===i&&<div style={{marginTop:14,padding:"16px 20px",borderRadius:14,background:`${CY}0d`,border:`1px solid ${CY}18`}}>
                  <div style={{fontSize:".72rem",fontWeight:700,letterSpacing:".12em",color:CY,marginBottom:6}}>{o.fw}</div>
                  <p style={{fontSize:".9rem",lineHeight:1.6,color:T2,margin:0}}>{o.w}</p>
                </div>}
              </button>
            ))}
          </div>
          {dc!==null&&<button onClick={()=>{setFP("tf");setTI(0);setTA(null);}} style={{...btn(`linear-gradient(135deg,${CY},#0080ff)`,"#000"),marginTop:24}}>Continue to Quick Test →</button>}
        </div>);
      })()}

      {/* TRUE/FALSE */}
      {fp==="tf"&&(()=>{const qs=fc.tf||[];const q=qs[ti];
        if(!q)return(<div style={{...card,textAlign:"center",padding:56}}><div style={{fontSize:"1.5rem",marginBottom:16}}>🔥</div><p style={{fontSize:"1.1rem",color:T2}}>Quick test complete for {fc.name}!</p><p style={{color:MU,marginTop:8}}>Score so far: {sc.c} correct, {sc.w} wrong</p><button onClick={()=>{setFP("mc");setMI(0);setMA(null);}} style={{...btn(`linear-gradient(135deg,${CY},#0080ff)`,"#000"),marginTop:20}}>Continue to Deep Test →</button></div>);
        return(<div style={card}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:18}}><div style={ey}>TRUE OR FALSE · {ti+1}/{qs.length}</div><div style={{fontSize:".82rem",color:MU}}>{fc.name}</div></div>
          <p style={{fontSize:"1.1rem",lineHeight:1.85,color:T2,margin:"0 0 28px"}}>{q.c}</p>
          {ta===null?<div style={{display:"flex",gap:16}}>
            <button onClick={()=>{const ok=q.a;setTA(true);setSC(s=>({c:s.c+(ok?1:0),w:s.w+(ok?0:1)}));if(ok){bump(fc.id,.03);flash("✓ Correct!",true);}else flash("✗ Not quite",false);}} style={{flex:1,padding:"18px",borderRadius:16,fontWeight:700,fontSize:"1rem",cursor:"pointer",background:`${TL}1a`,color:TL,border:`1px solid ${TL}44`}}>TRUE</button>
            <button onClick={()=>{const ok=!q.a;setTA(false);setSC(s=>({c:s.c+(ok?1:0),w:s.w+(ok?0:1)}));if(ok){bump(fc.id,.03);flash("✓ Correct!",true);}else flash("✗ Not quite",false);}} style={{flex:1,padding:"18px",borderRadius:16,fontWeight:700,fontSize:"1rem",cursor:"pointer",background:`${RD}1a`,color:RD,border:`1px solid ${RD}44`}}>FALSE</button>
          </div>:<>
            <div style={{padding:"16px 20px",borderRadius:14,background:ta===q.a?`${TL}10`:`${RD}10`,border:`1px solid ${ta===q.a?TL:RD}`,marginBottom:16,fontSize:".95rem"}}><strong>{ta===q.a?"✓ Correct":"✗ Incorrect"}</strong> — Answer: {q.a?"True":"False"}</div>
            <p style={{fontSize:".95rem",lineHeight:1.75,color:T2}}>{q.e}</p>
            <button onClick={()=>{setTI(p=>p+1);setTA(null);}} style={{...btn(`linear-gradient(135deg,${CY},#0080ff)`,"#000"),marginTop:20}}>Next →</button>
          </>}
        </div>);
      })()}

      {/* DEEP DRILL */}
      {fp==="mc"&&(()=>{const qs=fc.mc||[];const q=qs[mi];
        if(!q)return(<div style={{...card,textAlign:"center",padding:60}}>
          <div style={{fontSize:"2rem",marginBottom:16}}>⭐</div>
          <h3 style={hd(1.3)}>Session Complete: {fc.name}</h3>
          <p style={{fontSize:"1rem",color:T2,margin:"12px 0 8px"}}>Score: {sc.c} correct, {sc.w} wrong</p>
          {sc.c>=3&&<p style={{color:GD,fontSize:"1rem",fontWeight:700}}>🔥 {fc.name} mastered!</p>}
          <div style={{display:"flex",gap:14,justifyContent:"center",marginTop:28}}>
            <button onClick={()=>{setCompleted(p=>new Set([...p,fc.id]));const n=cc.filter(c=>c.id!==fc.id&&!completed.has(c.id)&&c.mastery<.8);if(n.length)go("forge",{c:n.sort((a,b)=>a.mastery-b.mastery)[0]});else go("journey");}} style={btn(`linear-gradient(135deg,${CY},#0080ff)`,"#000")}>Next Concept →</button>
            <button onClick={()=>{setCompleted(p=>new Set([...p,fc.id]));go("journey");}} style={{...btn("transparent",MU),border:`1px solid ${BDR}`}}>View Journey</button>
          </div>
        </div>);
        return(<div style={card}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:18}}><div style={ey}>DEEP TEST · {mi+1}/{qs.length}</div><div style={{fontSize:".82rem",color:MU}}>{fc.name}</div></div>
          <p style={{fontSize:"1.1rem",lineHeight:1.85,color:T2,margin:"0 0 24px"}}>{q.q}</p>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {q.opts.map((o,i)=>(
              <button key={i} onClick={()=>{if(ma!==null)return;const ok=i===q.cor;setMA(i);setSC(s=>({c:s.c+(ok?1:0),w:s.w+(ok?0:1)}));if(ok){bump(fc.id,.06);flash("✓ Correct!",true);}else flash("✗ Not quite",false);}} style={{textAlign:"left",padding:"18px 22px",borderRadius:14,border:`1px solid ${ma!==null&&i===q.cor?TL:ma===i&&i!==q.cor?RD:BDR}`,background:ma!==null&&i===q.cor?`${TL}08`:ma===i&&i!==q.cor?`${RD}08`:"rgba(18,18,42,.65)",cursor:ma!==null?"default":"pointer",color:TX,fontSize:".95rem",lineHeight:1.6,width:"100%",opacity:ma!==null&&ma!==i&&i!==q.cor?.3:1,transition:"all 250ms"}}>{o}</button>
            ))}
          </div>
          {ma!==null&&<><p style={{fontSize:".95rem",lineHeight:1.75,color:T2,marginTop:20}}>{q.e}</p>
            <button onClick={()=>{setMI(p=>p+1);setMA(null);}} style={{...btn(`linear-gradient(135deg,${CY},#0080ff)`,"#000"),marginTop:20}}>Next →</button></>}
        </div>);
      })()}

      {/* FLASHCARDS */}
      {fp==="flash"&&(()=>{
        const cards=[
          {front:fc.name,back:fc.core,label:"Definition"},
          {front:"Key Distinction",back:fc.distinction,label:"How it differs"},
          {front:"Common Mistake",back:fc.pitfall,label:"Watch out for"},
          {front:"Memory Hook",back:fc.mnemonic,label:"Remember this"},
          ...fc.keywords.map((k,i)=>({front:k,back:fc.core.includes(k)?fc.core:fc.depth,label:`Key term ${i+1}`})),
        ].slice(0,6);
        const c=cards[flashIdx];
        if(!c)return(<div style={{...card,textAlign:"center",padding:60}}><div style={{fontSize:"1.6rem",marginBottom:16}}>🃏</div><h3 style={hd(1.2)}>Flashcards Complete!</h3><p style={{color:T2,margin:"12px 0 24px"}}>You reviewed {cards.length} cards for {fc.name}.</p><button onClick={()=>{setFlashIdx(0);setFlashFlipped(false);}} style={btn(`linear-gradient(135deg,${CY},#0080ff)`,"#000")}>Review Again</button></div>);
        return(<div style={card}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}><div style={ey}>FLASHCARD · {flashIdx+1}/{cards.length}</div><div style={{fontSize:".82rem",color:MU}}>{fc.name}</div></div>
          <button onClick={()=>setFlashFlipped(!flashFlipped)} style={{
            width:"100%",minHeight:220,padding:"40px 36px",borderRadius:18,cursor:"pointer",textAlign:"center",
            background:flashFlipped?`linear-gradient(135deg,rgba(0,240,255,.06),rgba(6,214,160,.04))`:"rgba(18,18,42,.65)",
            border:`2px solid ${flashFlipped?CY:BDR}`,
            boxShadow:flashFlipped?`0 0 24px ${CY}15`:"0 4px 24px rgba(0,0,0,.3)",
            transition:"all 400ms cubic-bezier(.22,1,.36,1)",color:TX,
            transform:flashFlipped?"rotateX(0deg)":"rotateX(0deg)",
          }}>
            <div style={{fontSize:".7rem",fontWeight:700,letterSpacing:".14em",color:flashFlipped?CY:MU,textTransform:"uppercase",marginBottom:16}}>{flashFlipped?"ANSWER":"TAP TO REVEAL"}</div>
            <div style={{fontSize:flashFlipped?"1.05rem":"1.4rem",fontWeight:flashFlipped?400:700,lineHeight:1.7,color:flashFlipped?T2:TX}}>{flashFlipped?c.back:c.front}</div>
            <div style={{fontSize:".72rem",color:MU,marginTop:16}}>{c.label}</div>
          </button>
          <div style={{display:"flex",gap:12,marginTop:24,justifyContent:"center"}}>
            <button onClick={()=>{setFlashIdx(p=>p+1);setFlashFlipped(false);}} style={btn(`linear-gradient(135deg,${CY},#0080ff)`,"#000")}>{flashIdx<cards.length-1?"Next Card →":"Finish"}</button>
          </div>
        </div>);
      })()}

      {/* WHO SAID IT */}
      {fp==="whois"&&(()=>{
        const quotes=[
          ...PHILOSOPHERS.flatMap(p=>p.quotes.map(q=>({text:q.text,philosopher:p.name,trad:p.trad,pg:q.pg})))
        ].sort(()=>Math.random()-.5);
        const available=quotes.filter(q=>!matchDone.has(q.text));
        if(available.length===0)return(<div style={{...card,textAlign:"center",padding:60}}><div style={{fontSize:"1.6rem",marginBottom:16}}>🎯</div><h3 style={hd(1.2)}>Who Said It Complete!</h3><p style={{color:T2,margin:"12px 0 24px"}}>Score: {sc.c} correct, {sc.w} wrong</p><button onClick={()=>{setMatchDone(new Set());setSC({c:0,w:0});}} style={btn(`linear-gradient(135deg,${CY},#0080ff)`,"#000")}>Play Again</button></div>);
        const q=available[0];
        const options=[q.philosopher,...PHILOSOPHERS.filter(p=>p.name!==q.philosopher).sort(()=>Math.random()-.5).slice(0,3).map(p=>p.name)].sort(()=>Math.random()-.5);
        return(<div style={card}>
          <div style={ey}>WHO SAID THIS?</div>
          <div style={{padding:"32px 28px",borderRadius:16,background:"rgba(18,18,42,.65)",border:`1px solid ${BDR}`,marginBottom:28}}>
            <p style={{fontSize:"1.1rem",lineHeight:1.8,color:T2,fontStyle:"italic",margin:0,textAlign:"center"}}>"{q.text}"</p>
            <div style={{textAlign:"center",marginTop:12,fontSize:".78rem",color:MU}}>p. {q.pg}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {options.map(name=>(
              <button key={name} onClick={()=>{
                if(matchSel)return;
                setMatchSel(name);
                const ok=name===q.philosopher;
                setSC(s=>({c:s.c+(ok?1:0),w:s.w+(ok?0:1)}));
                if(ok){bump(fc.id,.03);flash("✓ "+q.philosopher+"!",true);}else flash("✗ It was "+q.philosopher,false);
                setTimeout(()=>{setMatchDone(p=>new Set([...p,q.text]));setMatchSel(null);},1800);
              }} style={{
                padding:"18px 20px",borderRadius:14,fontSize:".95rem",fontWeight:600,cursor:matchSel?"default":"pointer",
                background:matchSel===name&&name===q.philosopher?`${TL}1a`:matchSel===name&&name!==q.philosopher?`${RD}1a`:"rgba(18,18,42,.65)",
                border:`1px solid ${matchSel===name&&name===q.philosopher?TL:matchSel===name&&name!==q.philosopher?RD:BDR}`,
                color:TX,transition:"all 300ms",
                opacity:matchSel&&matchSel!==name&&name!==q.philosopher?.35:1,
              }}>{name}{matchSel===name&&name===q.philosopher?" ✓":matchSel===name&&name!==q.philosopher?" ✗":""}</button>
            ))}
          </div>
        </div>);
      })()}
    </div>}

    {/* ═══ COMPARE ═══ */}
    {v==="compare"&&<div style={{maxWidth:1020,margin:"0 auto"}}>
      <h2 style={hd(1.4)}>Compare Concepts</h2>
      <p style={{color:T2,fontSize:".95rem",margin:"8px 0 28px"}}>See two concepts side by side — where they agree and clash.</p>
      <div style={{display:"flex",gap:16,marginBottom:32}}>
        <select value={cmpA?.id||""} onChange={e=>setCmpA(cc.find(c=>c.id===e.target.value)||null)} style={{flex:1,padding:"14px 18px",borderRadius:14,border:`1px solid ${BDR}`,background:"rgba(10,10,26,.7)",color:TX,fontSize:".92rem"}}><option value="">Concept A</option>{cc.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select value={cmpB?.id||""} onChange={e=>setCmpB(cc.find(c=>c.id===e.target.value)||null)} style={{flex:1,padding:"14px 18px",borderRadius:14,border:`1px solid ${BDR}`,background:"rgba(10,10,26,.7)",color:TX,fontSize:".92rem"}}><option value="">Concept B</option>{cc.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
      </div>
      {cmpA&&cmpB&&cmpA.id!==cmpB.id&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:22}}>
        {[cmpA,cmpB].map(c=>(<div key={c.id} style={{...card,borderTop:`4px solid ${mc(c.mastery)}`}}>
          <div style={{...ey,color:mc(c.mastery)}}>{c.cat}</div>
          <h3 style={hd(1.2)}>{c.name}</h3>
          <div style={{marginTop:24}}>
            {[["Core",c.core],["Distinction",c.distinction]].map(([lb,txt])=>(
              <div key={lb} style={{marginBottom:22}}><div style={{fontSize:".74rem",fontWeight:700,letterSpacing:".12em",color:CY,marginBottom:8}}>{lb}</div><p style={{fontSize:".95rem",lineHeight:1.75,color:T2,margin:0}}>{txt}</p></div>
            ))}
            <div style={{fontSize:".74rem",fontWeight:700,letterSpacing:".12em",color:TL,marginBottom:8}}>Memory Hook</div>
            <p style={{fontSize:".92rem",color:TL,fontStyle:"italic",margin:0}}>{c.mnemonic}</p>
          </div>
        </div>))}
      </div>}
    </div>}

    {/* ═══ ORACLE ═══ */}
    {v==="oracle"&&<div style={{maxWidth:900,margin:"0 auto"}}>
      <h2 style={hd(1.4)}>Oracle Panel</h2>
      <p style={{color:T2,fontSize:".95rem",margin:"8px 0 28px"}}>Ask an ethical question. The more specific, the more relevant the responses.</p>
      <div style={{display:"flex",gap:14,marginBottom:36}}>
        <input value={oq} onChange={e=>setOQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")askOracle();}} placeholder="e.g. Is it right to lie to protect someone?" style={{flex:1,padding:"16px 22px",borderRadius:16,border:`1px solid ${BDR}`,background:"rgba(10,10,26,.7)",color:TX,fontSize:".95rem",outline:"none"}}/>
        <button onClick={askOracle} style={btn(`linear-gradient(135deg,${CY},#0080ff)`,"#000")}>Ask</button>
      </div>
      {!or?<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
        {PHILOSOPHERS.map(p=><div key={p.name} style={{...card,padding:"28px 32px"}}><div style={{fontSize:"1rem",fontWeight:700}}>{p.name}</div><div style={{fontSize:".8rem",color:CY,marginTop:4}}>{p.trad}</div><div style={{fontSize:".78rem",color:MU,marginTop:10}}>{p.quotes.length} positions</div></div>)}
      </div>:<div style={{display:"flex",flexDirection:"column",gap:18}}>
        {or.map((r,i)=><div key={i} style={{...card,padding:"30px 36px",borderLeft:`4px solid ${CY}`,animation:`fadeUp ${300+i*120}ms ease both`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div><div style={{fontSize:"1.05rem",fontWeight:700}}>{r.name}</div><div style={{fontSize:".78rem",color:CY}}>{r.trad}</div></div>
            <div style={{textAlign:"right"}}><span style={{fontSize:".78rem",color:MU}}>p.{r.q.pg}</span>{r.rel>0&&<div style={{fontSize:".72rem",color:MU,marginTop:2}}>{"●".repeat(Math.min(r.rel,5))+"○".repeat(Math.max(0,5-r.rel))}</div>}</div>
          </div>
          <p style={{fontSize:"1.02rem",lineHeight:1.8,color:T2,fontStyle:"italic",margin:0}}>"{r.q.text}"</p>
        </div>)}
        <button onClick={()=>{setOR(null);setOQ("");}} style={{...btn("transparent",CY),border:`1px solid ${CY}33`,alignSelf:"center",marginTop:8}}>Ask another question</button>
      </div>}
    </div>}

    </main>
    <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:1;transform:scale(1.15)}}*:focus-visible{outline:2px solid #00f0ff;outline-offset:3px;border-radius:12px}button:hover{filter:brightness(1.12)}button:active{transform:scale(.97);transition:transform 80ms}::selection{background:rgba(0,240,255,.2)}::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(0,240,255,.15);border-radius:3px}`}</style>
  </div>);
}
