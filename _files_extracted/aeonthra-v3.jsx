import { useState, useCallback, useRef } from "react";

const COURSE = { code: "PHI 208", title: "Ethics and Moral Reasoning", term: "Spring 2026" };

const CONCEPTS = [
  { id:"util", name:"Utilitarianism", mastery:0, cat:"Consequentialism",
    core:"The right action produces the greatest total good for the greatest number of people.",
    depth:"Jeremy Bentham founded it; John Stuart Mill refined it. Bentham counted all pleasures equally. Mill argued intellectual pleasures are qualitatively higher than bodily ones. Both agree: morality is about outcomes, not intentions.",
    distinction:"Unlike deontology (rules regardless of outcomes) and virtue ethics (character focus), utilitarianism cares ONLY about consequences. A lie that saves lives is morally good. Truth that causes suffering is morally bad.",
    mnemonic:"A happiness calculator — every action scored by total well-being across everyone affected.",
    pitfall:"Students confuse utilitarianism with selfishness. It's the opposite — it demands counting everyone's happiness equally, including strangers.",
    keywords:["consequences","greatest good","Bentham","Mill","pleasure","pain"], connections:["felicific","actrule","expmachine"],
    dilemma:{ text:"A factory causes minor pollution in a small town but provides 500 jobs. Should it stay open?",
      opts:[{text:"Calculate total harm vs benefit for ALL affected — workers, families, townspeople.",fw:"Utilitarian",why:"Utilitarianism demands weighing total consequences, not following a reflexive rule."},
        {text:"Pollution violates residents' rights regardless of job benefits.",fw:"Deontological",why:"Rights-based thinking says people shouldn't be harmed as a means to economic benefit."},
        {text:"A responsible leader would find a way to reduce pollution while preserving jobs.",fw:"Virtue Ethics",why:"Practical wisdom seeks creative solutions rather than accepting false dilemmas."}]},
    tf:[{claim:"Utilitarianism judges actions by outcomes, not intentions.",ans:true,exp:"Correct — only consequences matter in utilitarian ethics."},
      {claim:"Utilitarianism says you should maximize YOUR OWN happiness.",ans:false,exp:"False — it demands equal consideration of EVERYONE's happiness, not just yours."},
      {claim:"Under utilitarianism, a lie that prevents great suffering is morally acceptable.",ans:true,exp:"Correct — if lying produces more total good than truth-telling, it's the right action."}],
    mc:[{q:"A city can build a park (benefiting 10,000 people slightly) or a hospital (saving 100 lives). A utilitarian would:",
      opts:["Always choose the hospital","Always choose the park","Calculate which produces greater total well-being","Flip a coin — both are moral"],
      cor:2,exp:"Utilitarianism requires calculating total consequences — the answer depends on actual impact, not assumptions."}] },

  { id:"deont", name:"Deontology", mastery:0, cat:"Non-consequentialism",
    core:"Actions are morally right or wrong based on rules and duties, regardless of consequences.",
    depth:"Immanuel Kant argued moral law comes from pure reason. Before acting, ask: 'Could everyone do this?' If universal adoption creates contradiction (everyone lying destroys trust), the action is wrong.",
    distinction:"Deontology says some acts are inherently wrong — lying, murder, using people — even if they produce good outcomes. This directly conflicts with utilitarianism.",
    mnemonic:"'Deon' = duty in Greek. A judge who follows the law even when the verdict seems unfair — rules matter more than any single outcome.",
    pitfall:"Students think deontology means 'follow whatever rules exist.' Kant meant rules derived from REASON, not social conventions.",
    keywords:["duty","rules","Kant","categorical imperative","universal law"], connections:["catimperative","naturallaw"],
    dilemma:{ text:"A murderer asks where your friend is hiding. Do you lie to protect your friend, or tell the truth because lying is always wrong?",
      opts:[{text:"Lie — saving a life matters more than abstract honesty.",fw:"Utilitarian",why:"Consequences override rules when lives are at stake."},
        {text:"Tell the truth — lying is wrong regardless of the outcome.",fw:"Deontological (Kant's actual position)",why:"Kant argued you are not responsible for what the murderer does, but you ARE responsible for lying."},
        {text:"Find a creative third option — redirect the murderer without directly lying.",fw:"Virtue Ethics",why:"Practical wisdom might find a way to protect your friend without violating honesty."}]},
    tf:[{claim:"Kant believed consequences are the primary measure of moral worth.",ans:false,exp:"False — Kant held that duty and rational principle determine morality, not outcomes."},
      {claim:"Deontology holds that some acts are wrong even if they produce good consequences.",ans:true,exp:"Correct — lying, murder, and using people are wrong regardless of outcomes."},
      {claim:"Deontology is based on cultural traditions and social norms.",ans:false,exp:"False — Kant grounded morality in pure REASON, not cultural convention."}],
    mc:[{q:"Kant's key test for moral actions is:",
      opts:["Does it make people happy?","Could everyone do this without contradiction?","Does it build good character?","Is it legal?"],
      cor:1,exp:"The universalizability test: if everyone did it and the action would undermine itself, it's wrong."}] },

  { id:"virtue", name:"Virtue Ethics", mastery:0, cat:"Character-based",
    core:"Morality is about developing good character traits through practice and habit.",
    depth:"Aristotle argued we become virtuous by practicing virtue — like learning an instrument. Courage isn't a rule but a stable character trait developed by repeatedly choosing brave actions.",
    distinction:"Utilitarianism asks 'What outcome is best?' Deontology asks 'What rule applies?' Virtue ethics asks 'What would a person of good character do?' — shifting focus to the agent.",
    mnemonic:"Learning guitar — you become a musician not by memorizing rules but by practicing until excellence becomes habitual.",
    pitfall:"Students think virtue ethics is vague. Aristotle was precise — virtues are specific traits (courage, justice, temperance) with clear excesses and deficiencies.",
    keywords:["character","Aristotle","habit","flourishing","excellence"], connections:["mean"],
    dilemma:{ text:"You see a colleague take credit for a junior team member's idea in a meeting. What do you do?",
      opts:[{text:"Speak up if it produces the best outcome for the team overall.",fw:"Utilitarian",why:"Calculate whether correcting this helps or hurts the team's total productivity and morale."},
        {text:"Speak up because taking credit for others' work is inherently dishonest.",fw:"Deontological",why:"Honesty and giving proper credit are duties regardless of consequences."},
        {text:"Ask yourself what a person of integrity and courage would do in this specific situation.",fw:"Virtue Ethics",why:"Focus on which response reflects the character you're building — cowardice, courage, or recklessness?"}]},
    tf:[{claim:"Virtue ethics focuses on character rather than rules or consequences.",ans:true,exp:"Correct — it asks 'What kind of person should I be?' not 'What should I do?'"},
      {claim:"Aristotle believed virtues are innate — you're either born virtuous or not.",ans:false,exp:"False — Aristotle insisted virtues are HABITS developed through practice, not inborn traits."},
      {claim:"Virtue ethics provides specific mathematical formulas for moral decisions.",ans:false,exp:"False — it requires practical wisdom (phronesis), not formulas. That's its strength AND its challenge."}],
    mc:[{q:"What is the key difference between virtue ethics and deontology?",
      opts:["Virtue ethics focuses on character; deontology focuses on rules","They are essentially the same thing","Virtue ethics was developed after deontology","Deontology cares about character more"],
      cor:0,exp:"Virtue ethics = 'Who should I be?' Deontology = 'What rules must I follow?' Fundamentally different starting points."}] },

  { id:"catimperative", name:"Categorical Imperative", mastery:0, cat:"Deontological Principles",
    core:"Kant's supreme principle: act only on rules you could rationally will everyone to follow.",
    depth:"Two formulations: (1) Universal Law — 'Could everyone do this without contradiction?' (2) Humanity — 'Am I treating this person as a tool or as someone with dignity?'",
    distinction:"'Categorical' = unconditional, always applies. Unlike 'hypothetical' imperatives ('If you want X, do Y') which only apply when you want something.",
    mnemonic:"Two tests: (1) Could this be a universal law? (2) Am I using someone as a mere tool?",
    pitfall:"Students confuse this with 'follow the law.' It's about MORAL principles from reason, not legal rules.",
    keywords:["Kant","universal law","maxim","humanity","ends","means"], connections:["deont"],
    dilemma:{ text:"You could cheat on a test and no one would ever know. Apply the categorical imperative.",
      opts:[{text:"If everyone cheated, grades would become meaningless — so cheating fails the universal law test.",fw:"Formula of Universal Law",why:"Universalized cheating destroys the institution of testing, making cheating itself pointless — a contradiction."},
        {text:"Cheating uses other honest students as means to your own advantage.",fw:"Formula of Humanity",why:"You're treating honest students as tools by exploiting their integrity for your benefit."},
        {text:"The consequences are what matter — if no one is harmed, it's acceptable.",fw:"Utilitarian objection",why:"This is exactly what Kant REJECTS — consequences don't determine morality."}]},
    tf:[{claim:"The categorical imperative applies unconditionally — no exceptions.",ans:true,exp:"Correct — 'categorical' means it applies always, to everyone, in every situation."},
      {claim:"Kant's Formula of Humanity says: treat people as ends, never merely as means.",ans:true,exp:"Correct — people have inherent dignity and shouldn't be used as tools for others' purposes."},
      {claim:"A hypothetical imperative and categorical imperative are the same thing.",ans:false,exp:"False — hypothetical = conditional ('if you want X'). Categorical = unconditional ('always')."}],
    mc:[{q:"'I'll lie to get this job' fails the categorical imperative because:",
      opts:["Lying doesn't maximize happiness","If everyone lied in interviews, the institution of hiring would collapse","Lying isn't a virtue","It's illegal"],
      cor:1,exp:"Universal lying destroys trust, making lying itself ineffective — a logical contradiction."}] },

  { id:"felicific", name:"Felicific Calculus", mastery:0, cat:"Utilitarian Methods",
    core:"Bentham's systematic method for measuring pleasure and pain to determine the right action.",
    depth:"Seven factors: Intensity, Duration, Certainty, Propinquity (nearness), Fecundity (leads to more pleasure?), Purity (free from pain?), Extent (how many affected?).",
    distinction:"This makes utilitarianism operational. Critics say you can't quantify happiness. Mill later argued quality matters too, not just quantity.",
    mnemonic:"Seven days: Intense Monday, Duration Tuesday, Certain Wednesday, Proximity Thursday, Fertile Friday, Pure Saturday, Extensive Sunday.",
    pitfall:"Don't just memorize the list — understand WHY each factor matters for calculating total happiness.",
    keywords:["Bentham","seven factors","intensity","duration","extent"], connections:["util"],
    dilemma:{ text:"Apply the felicific calculus: Should a city spend $1M on fireworks (brief joy for 50,000) or a community garden (moderate joy for 5,000 over years)?",
      opts:[{text:"Fireworks — high intensity and massive extent outweigh short duration.",fw:"Intensity + Extent focused",why:"50,000 people × high intensity might outweigh 5,000 × moderate × years."},
        {text:"Garden — duration and fecundity (ongoing benefits) outweigh the fireworks' brief thrill.",fw:"Duration + Fecundity focused",why:"Long-term, compounding benefits may produce more total happiness."},
        {text:"You need actual data — the calculus demands measurement, not guessing.",fw:"Methodological rigor",why:"Bentham's whole point: morality should be calculated, not assumed."}]},
    tf:[{claim:"Bentham's calculus includes seven dimensions of pleasure and pain.",ans:true,exp:"Correct: intensity, duration, certainty, propinquity, fecundity, purity, extent."},
      {claim:"The felicific calculus considers the QUALITY of pleasures, not just quantity.",ans:false,exp:"False — that was MILL's contribution. Bentham treated all pleasures as equal in kind."},
      {claim:"'Extent' in the calculus refers to how many people are affected.",ans:true,exp:"Correct — extent counts the number of people whose pleasure/pain is influenced by the action."}],
    mc:[{q:"Which factor of Bentham's calculus measures whether a pleasure will lead to MORE pleasure?",
      opts:["Intensity","Purity","Fecundity","Propinquity"],
      cor:2,exp:"Fecundity = the likelihood that a pleasure will produce additional pleasures over time."}] },

  { id:"mean", name:"Doctrine of the Mean", mastery:0, cat:"Virtue Ethics Principles",
    core:"Every virtue is a balanced middle ground between two vices — excess and deficiency.",
    depth:"Courage between cowardice and recklessness. Generosity between stinginess and wastefulness. The mean isn't a mathematical midpoint — it shifts by person and situation.",
    distinction:"This gives virtue ethics practical content — virtues aren't vague ideals but precise balances you can aim for.",
    mnemonic:"A guitar string: too loose = no sound (deficiency), too tight = it snaps (excess), tuned just right = music (virtue).",
    pitfall:"The mean is NOT 'always do the moderate thing.' Sometimes virtue demands extreme action — great courage in crisis, fierce honesty about injustice.",
    keywords:["Aristotle","mean","excess","deficiency","courage","moderation"], connections:["virtue"],
    dilemma:{ text:"A friend asks how their presentation went. It was mediocre. How does the doctrine of the mean apply?",
      opts:[{text:"Tell them it was great to spare their feelings. (Excess of kindness → flattery)",fw:"Excess",why:"Dishonest praise isn't kindness — it prevents growth and betrays trust."},
        {text:"Tell them exactly everything wrong with brutal honesty. (Excess of honesty → cruelty)",fw:"Deficiency of tact",why:"Truth without compassion is just cruelty with an alibi."},
        {text:"Give honest, constructive feedback — truthful but supportive. (The mean)",fw:"The virtuous mean",why:"Balancing honesty with care is the virtue. The mean isn't silence — it's wisdom about how to speak truth."}]},
    tf:[{claim:"The doctrine of the mean says virtue is always the exact mathematical midpoint.",ans:false,exp:"False — the mean is relative to the person and situation. A soldier needs more courage than an accountant."},
      {claim:"Courage is the mean between cowardice and recklessness.",ans:true,exp:"Correct — too little bravery = cowardice, too much = recklessness, just right = courage."},
      {claim:"The mean always requires moderation — extreme actions are never virtuous.",ans:false,exp:"False — sometimes virtue demands extreme courage, fierce honesty, or radical generosity."}],
    mc:[{q:"A student is deciding how much to study. Applying the doctrine of the mean:",
      opts:["Study as little as possible","Study 24/7 without breaks","Find the balanced amount that produces genuine learning without burnout","Don't study — virtue is innate"],
      cor:2,exp:"The mean between negligence (deficiency) and obsessive overwork (excess) = disciplined, sustainable study."}] },

  { id:"expmachine", name:"Experience Machine", mastery:0, cat:"Thought Experiments",
    core:"Nozick's challenge: would you plug into a machine simulating a perfectly happy life?",
    depth:"If pleasure were all that matters, everyone would choose the machine. But most refuse — revealing we value authenticity, real accomplishment, and genuine relationships beyond feeling.",
    distinction:"One of the strongest objections to hedonistic utilitarianism. It suggests a good life requires more than subjective experience.",
    mnemonic:"Neo choosing the red pill. We want the real world, not a perfect simulation.",
    pitfall:"This doesn't 'disprove' all utilitarianism — it challenges HEDONISTIC utilitarianism specifically. Preference utilitarianism can accommodate the insight.",
    keywords:["Nozick","thought experiment","pleasure","reality","authenticity"], connections:["util"],
    dilemma:{ text:"If the experience machine existed and was perfectly safe, would you plug in? Why or why not?",
      opts:[{text:"Yes — if the experiences feel completely real, there's no meaningful difference.",fw:"Hedonistic position",why:"If pleasure is the only good, simulated pleasure is equally valuable."},
        {text:"No — I want to actually DO things, not just feel like I did them.",fw:"Nozick's insight",why:"We value being a certain kind of person and actually living, not just experiencing."},
        {text:"No — real relationships require another person who actually exists.",fw:"Relational argument",why:"Simulated love isn't love. Connection requires two real people."}]},
    tf:[{claim:"Most people in surveys choose to plug into the experience machine.",ans:false,exp:"False — most people refuse, revealing that pleasure alone isn't what we value most."},
      {claim:"The experience machine thought experiment challenges hedonistic utilitarianism.",ans:true,exp:"Correct — if pleasure were all that mattered, everyone would choose the machine. They don't."},
      {claim:"Nozick created the experience machine to SUPPORT utilitarianism.",ans:false,exp:"False — he created it as an OBJECTION to hedonistic utilitarianism."}],
    mc:[{q:"What does the experience machine thought experiment primarily demonstrate?",
      opts:["That technology is dangerous","That people value things beyond subjective pleasure","That utilitarianism is completely wrong","That Kant was right about everything"],
      cor:1,exp:"We value authenticity, real achievement, and genuine connection — not just how things feel."}] },

  { id:"actrule", name:"Act vs Rule Utilitarianism", mastery:0, cat:"Utilitarian Variations",
    core:"Act judges each action individually; rule asks which general rules maximize happiness.",
    depth:"Act: 'Will THIS lie produce more good?' Flexible but unstable. Rule: 'Does a general rule of honesty produce more good?' More stable, defends rights.",
    distinction:"The split emerged because act utilitarianism has troubling implications — it could justify punishing an innocent person if it maximizes happiness.",
    mnemonic:"Act = referee reviewing each play. Rule = police officer following the rulebook consistently.",
    pitfall:"Rule utilitarianism can collapse into act utilitarianism if rules get too specific.",
    keywords:["act","rule","individual","general","consequences","rights"], connections:["util","felicific"],
    dilemma:{ text:"A doctor could save five patients by secretly harvesting organs from one healthy patient. No one would ever know.",
      opts:[{text:"Act utilitarianism says yes — 5 lives > 1 life in this specific case.",fw:"Act Utilitarian",why:"In THIS case, the math is clear: more lives are saved."},
        {text:"Rule utilitarianism says no — a rule permitting secret organ harvesting would destroy medical trust.",fw:"Rule Utilitarian",why:"Even if one case works out, the RULE would cause far more harm than good."},
        {text:"This is exactly why act utilitarianism is dangerous — it can justify horrific individual acts.",fw:"Critique of Act",why:"The organ harvesting case is the classic argument for why we need rule utilitarianism."}]},
    tf:[{claim:"Act utilitarianism evaluates each individual action by its specific consequences.",ans:true,exp:"Correct — each action is judged on its own merits."},
      {claim:"Rule utilitarianism can justify punishing an innocent person if it maximizes happiness.",ans:false,exp:"False — that's a problem with ACT utilitarianism. Rule utilitarianism defends rules that protect the innocent."},
      {claim:"Act and rule utilitarianism always reach the same conclusion.",ans:false,exp:"False — they often disagree. Act might permit an isolated harmful act; rule would prohibit it."}],
    mc:[{q:"Why did philosophers develop rule utilitarianism?",
      opts:["To make ethics simpler","To address problems with act utilitarianism justifying harmful individual actions","To reject Kant","Because Bentham asked them to"],
      cor:1,exp:"Act utilitarianism could justify injustice in individual cases. Rule utilitarianism provides stability."}] },

  { id:"socialcontract", name:"Social Contract Theory", mastery:0, cat:"Political Philosophy",
    core:"Moral and political rules are justified because rational people would agree to them under fair conditions.",
    depth:"Hobbes: without government, life is 'solitary, poor, nasty, brutish, and short.' Rawls: choose rules behind a 'veil of ignorance' — not knowing your position ensures fairness.",
    distinction:"Unlike utilitarianism or deontology, social contract grounds morality in rational agreement — rules are legitimate because we'd consent.",
    mnemonic:"Writing rules for a board game you must play — but you don't know which piece you'll be.",
    pitfall:"The 'contract' is hypothetical, not historical. No one signed it. The question is what rational people WOULD agree to.",
    keywords:["Hobbes","Rawls","veil of ignorance","consent","fairness"], connections:["deont"],
    dilemma:{ text:"Behind Rawls's veil of ignorance, you're designing healthcare policy. You don't know if you'll be rich or poor, healthy or sick.",
      opts:[{text:"Universal healthcare — since I might be poor or sick, I'd want guaranteed coverage.",fw:"Rawlsian reasoning",why:"Not knowing your position forces you to protect the worst-off — you might BE them."},
        {text:"Market-based — competition produces the best quality care overall.",fw:"Libertarian objection",why:"Some argue Rawls's setup is biased toward redistribution."},
        {text:"Basic coverage for all, with options for additional private coverage.",fw:"Compromise position",why:"This attempts to satisfy both fairness and freedom concerns."}]},
    tf:[{claim:"Social contract theory grounds morality in hypothetical rational agreement.",ans:true,exp:"Correct — rules are legitimate because rational people WOULD consent under fair conditions."},
      {claim:"Rawls's 'veil of ignorance' means everyone must forget their actual memories.",ans:false,exp:"False — it's a thought experiment. You IMAGINE not knowing your position, not actually forgetting."},
      {claim:"Hobbes and Rawls agreed on everything about the social contract.",ans:false,exp:"False — Hobbes focused on escaping chaos; Rawls focused on fairness and justice."}],
    mc:[{q:"Rawls's veil of ignorance ensures fair rules because:",
      opts:["Everyone is equally smart","You design rules without knowing your position — so you protect everyone","It eliminates all disagreement","Rawls was always right"],
      cor:1,exp:"Not knowing if you'll be rich or poor, healthy or sick forces you to make rules fair for all positions."}] },

  { id:"relativism", name:"Moral Relativism", mastery:0, cat:"Metaethics",
    core:"There are no universal moral truths — right and wrong are set by cultural or individual standards.",
    depth:"What's right in one society may be wrong in another. This seems tolerant — but it means you can never criticize another culture's practices, including slavery or genocide.",
    distinction:"Relativism denies what every other theory assumes — that objective moral truth exists. Utilitarians, Kantians, and virtue ethicists all disagree with each other but agree moral truth exists.",
    mnemonic:"'When in Rome, do as Romans do' — but if Rome practices slavery, should you?",
    pitfall:"Students confuse relativism with tolerance. Real tolerance requires believing others are WRONG but respecting their right to differ.",
    keywords:["culture","relative","universal","tolerance","subjectivity"], connections:["naturallaw"],
    dilemma:{ text:"Culture A practices child marriage. Culture B condemns it. A moral relativist must say:",
      opts:[{text:"Culture A is wrong — child marriage harms children regardless of cultural norms.",fw:"Moral objectivism",why:"This requires believing some moral truths are universal — contradicting relativism."},
        {text:"Neither culture is objectively right — morality is culturally determined.",fw:"Consistent relativism",why:"This is what relativism requires — but most people find it unacceptable here."},
        {text:"We can criticize practices that cause measurable harm while respecting cultural differences.",fw:"Moderate position",why:"This tries to preserve cultural sensitivity without accepting anything goes."}]},
    tf:[{claim:"Moral relativism claims some ethical truths are universal across all cultures.",ans:false,exp:"False — moral relativism DENIES all universal moral truths."},
      {claim:"If moral relativism is true, we cannot condemn genocide in other cultures.",ans:true,exp:"Correct — this is the most devastating objection to relativism."},
      {claim:"Moral relativism and tolerance are the same thing.",ans:false,exp:"False — tolerance requires believing others are WRONG but respecting them. Relativism eliminates 'wrong' entirely."}],
    mc:[{q:"The strongest objection to moral relativism is:",
      opts:["It's too complicated","It makes it impossible to condemn slavery, genocide, or oppression in other cultures","It was invented recently","It contradicts all religions"],
      cor:1,exp:"If morality is truly relative, you can NEVER say another culture's practices are wrong — even the most horrific ones."}] },

  { id:"trolley", name:"Trolley Problem", mastery:0, cat:"Applied Ethics",
    core:"A thought experiment revealing tension between consequentialist math and deontological intuitions.",
    depth:"Switch case: diverting to kill 1 instead of 5 feels OK. Footbridge case: pushing someone to stop the trolley and save 5 feels wrong. Same math, different response.",
    distinction:"Not just a puzzle — it reveals that most people use BOTH consequentialist and deontological reasoning depending on situation.",
    mnemonic:"The math says 5>1 in both cases. Your gut agrees with the lever but recoils at the push. That gap IS the problem.",
    pitfall:"Don't treat this as having a 'right answer.' Its value is exposing your moral intuitions and testing your ethical theory.",
    keywords:["dilemma","switch","footbridge","five vs one","intentions"], connections:["util","deont"],
    dilemma:{ text:"In the FOOTBRIDGE variant: you can push a large stranger off a bridge to stop the trolley and save 5 people. The stranger will die. Do you push?",
      opts:[{text:"Yes — 5 lives vs 1 life, the math is the same as pulling the lever.",fw:"Consequentialist",why:"If outcomes are all that matter, pushing and pulling produce identical results."},
        {text:"No — there's a moral difference between diverting harm and directly causing it.",fw:"Deontological",why:"Pushing someone to their death USES them as a tool — violating their dignity."},
        {text:"The fact that this feels different from the lever case is itself philosophically significant.",fw:"Moral psychology",why:"Our conflicting intuitions reveal that we DON'T operate from a single ethical theory."}]},
    tf:[{claim:"Most people respond identically to the switch and footbridge versions of the trolley problem.",ans:false,exp:"False — most accept pulling the switch but reject pushing someone off a bridge, despite identical outcomes."},
      {claim:"The trolley problem reveals tension between consequentialist and deontological thinking.",ans:true,exp:"Correct — we accept utilitarian math for the lever but apply deontological constraints for the push."},
      {claim:"The trolley problem has a definitive correct answer.",ans:false,exp:"False — its value lies in EXPOSING moral intuitions and testing theories, not providing an answer."}],
    mc:[{q:"Why do most people accept pulling the lever but reject pushing someone off the bridge?",
      opts:["They're bad at math","There's an intuitive moral difference between redirecting harm and directly causing it","They haven't studied ethics","The bridge version is less realistic"],
      cor:1,exp:"The lever redirects existing harm; the push directly uses a person as a tool. This reflects deep deontological intuitions."}] },

  { id:"naturallaw", name:"Natural Law Theory", mastery:0, cat:"Moral Foundations",
    core:"Moral standards are built into human nature and discoverable through reason.",
    depth:"Aquinas: God embedded moral law in human reason. Modern secular versions: what promotes human flourishing is naturally good; what undermines it is naturally wrong.",
    distinction:"Claims morality is objective AND discoverable through reason. Conflicts with relativism (morality is subjective) and pure deontology (morality from duty, not nature).",
    mnemonic:"Murder feels wrong everywhere, every century, every culture. Natural law says that's not coincidence — it's built into what humans ARE.",
    pitfall:"'Natural' doesn't mean 'whatever happens in nature.' It's about human RATIONAL nature — what reason reveals about flourishing.",
    keywords:["nature","reason","Aquinas","flourishing","universal","objective"], connections:["deont","virtue"],
    dilemma:{ text:"Some argue homosexuality is 'unnatural' and therefore wrong under natural law. Is this a valid application of the theory?",
      opts:[{text:"Yes — if it doesn't match biological design, natural law prohibits it.",fw:"Traditional natural law",why:"Aquinas did apply natural law this way, but modern scholars question the reasoning."},
        {text:"No — 'natural' in natural law means what promotes human flourishing, not what's statistically common.",fw:"Modern natural law",why:"If loving relationships promote flourishing, they align with natural law regardless of gender."},
        {text:"This shows natural law theory can be misused to justify existing prejudices.",fw:"Critical perspective",why:"'Natural' is doing a lot of work in this argument — it often just means 'what I'm used to.'"}]},
    tf:[{claim:"Natural law theory claims morality is invented by human societies.",ans:false,exp:"False — natural law holds morality is DISCOVERED through reason, not invented."},
      {claim:"Aquinas argued natural law is embedded in human reason by God.",ans:true,exp:"Correct — though modern secular versions ground it in rational human nature without requiring God."},
      {claim:"'Natural' in natural law means the same as 'what happens in nature.'",ans:false,exp:"False — it refers to human RATIONAL nature and what reason reveals about flourishing."}],
    mc:[{q:"Natural law differs from moral relativism because:",
      opts:["Natural law is newer","Natural law claims moral truths are universal and discoverable through reason","Natural law is based on religion only","They're actually the same"],
      cor:1,exp:"Natural law = universal moral truths exist and reason can find them. Relativism = no universal truths exist."}] },
];

const PHILOSOPHERS = [
  { name:"Jeremy Bentham", trad:"Utilitarianism", concepts:["util","felicific","actrule","expmachine"],
    quotes:[
      {text:"The greatest happiness of the greatest number is the foundation of morals and legislation.",pg:44,about:["happiness","morality","foundation"]},
      {text:"Nature has placed mankind under the governance of two sovereign masters: pain and pleasure.",pg:43,about:["pain","pleasure","nature","human"]},
      {text:"The question is not Can they reason? nor Can they talk? but Can they suffer?",pg:47,about:["suffering","animals","rights","empathy"]},
    ]},
  { name:"Immanuel Kant", trad:"Deontology", concepts:["deont","catimperative"],
    quotes:[
      {text:"Act only according to that maxim whereby you can will that it should become a universal law.",pg:62,about:["universal","law","action","rule","lying","duty"]},
      {text:"Treat humanity never merely as a means to an end, but always at the same time as an end.",pg:64,about:["humanity","dignity","means","ends","person","respect","use"]},
      {text:"Two things fill the mind with ever new admiration: the starry heavens above and the moral law within.",pg:60,about:["moral","wonder","reason","beauty"]},
    ]},
  { name:"Aristotle", trad:"Virtue Ethics", concepts:["virtue","mean"],
    quotes:[
      {text:"We are what we repeatedly do. Excellence, then, is not an act, but a habit.",pg:78,about:["habit","excellence","practice","character","virtue","action"]},
      {text:"Virtue is a state of character concerned with choice, lying in a mean relative to us.",pg:80,about:["virtue","character","choice","mean","balance","moderate"]},
      {text:"It is the mark of an educated mind to entertain a thought without accepting it.",pg:82,about:["thought","education","open","mind","think","reason"]},
    ]},
  { name:"John Stuart Mill", trad:"Utilitarianism", concepts:["util","actrule","expmachine"],
    quotes:[
      {text:"It is better to be Socrates dissatisfied than a fool satisfied.",pg:51,about:["pleasure","quality","higher","lower","satisfaction","happiness","fool"]},
      {text:"Actions are right in proportion as they tend to promote happiness.",pg:49,about:["happiness","right","action","good","consequence"]},
      {text:"Over himself, over his body and mind, the individual is sovereign.",pg:55,about:["freedom","individual","liberty","autonomy","rights"]},
    ]},
  { name:"Thomas Aquinas", trad:"Natural Law", concepts:["naturallaw"],
    quotes:[
      {text:"The natural law is the rational creature's participation in the eternal law.",pg:118,about:["natural","law","reason","eternal","god","rational"]},
      {text:"Good is to be done and pursued, and evil is to be avoided.",pg:120,about:["good","evil","action","moral","pursue","avoid"]},
    ]},
  { name:"John Rawls", trad:"Social Contract", concepts:["socialcontract"],
    quotes:[
      {text:"Justice is the first virtue of social institutions, as truth is of systems of thought.",pg:102,about:["justice","society","institution","fairness","truth"]},
      {text:"No one knows his place in society — ensuring principles are chosen behind a veil of ignorance.",pg:104,about:["veil","ignorance","fairness","position","society","equal","justice"]},
    ]},
];

const ASSIGNMENTS = [
  {id:"a1",title:"Ethics Paper 1",sub:"Utilitarianism in Practice",type:"paper",due:7,pts:100,concepts:["util","felicific","actrule","expmachine"],
    desc:"1500-word paper analyzing a real-world dilemma through utilitarianism. Include Bentham and Mill, address one objection, cite 4 APA sources.",
    tip:"Pick a concrete dilemma (organ donation, surveillance). Apply the felicific calculus. Show how act/rule utilitarianism disagree. Use the experience machine as an objection."},
  {id:"a2",title:"Week 3 Discussion",sub:"The Trolley Problem",type:"discussion",due:3,pts:25,concepts:["trolley","util","deont"],
    desc:"300+ words: what would you do and why? Compare utilitarian and deontological perspectives. Reply to 2 classmates.",
    tip:"Don't just pick a side. Show you understand BOTH. Explain switch vs footbridge. Strongest move: acknowledge the tension."},
  {id:"a3",title:"Kantian Analysis",sub:"Categorical Imperative",type:"paper",due:14,pts:100,concepts:["deont","catimperative"],
    desc:"Apply Kant's categorical imperative to a contemporary issue. Explain both formulations.",
    tip:"Pick an issue where both formulations converge (exploitative labor, deception). Address Kant's rigidity objection."},
  {id:"a4",title:"Week 5 Discussion",sub:"Cultural Relativism",type:"discussion",due:10,pts:25,concepts:["relativism","naturallaw"],
    desc:"Is moral relativism defensible? Two examples. Consider the strongest objection.",
    tip:"If against: use the 'can't criticize genocide' problem. If for: distinguish relativism from cultural sensitivity."},
  {id:"a5",title:"Midterm Quiz",sub:"Chapters 1-5",type:"quiz",due:21,pts:50,concepts:["util","deont","virtue","catimperative","socialcontract"],
    desc:"25 MC questions. 60 min. One attempt.",
    tip:"Focus on DISTINCTIONS between theories. The quiz tests if you can tell them apart, not just define them."},
  {id:"a6",title:"Final Paper",sub:"Multi-Framework Case Study",type:"paper",due:42,pts:200,concepts:["util","deont","virtue","socialcontract","naturallaw"],
    desc:"Real-world controversy analyzed through 3+ frameworks.",
    tip:"Pick something genuinely controversial. Show how each framework produces DIFFERENT conclusions. Best papers identify where frameworks agree AND diverge."},
];

const mc=(m)=>m>=.8?"#ffd700":m>=.5?"#06d6a0":m>=.2?"#00f0ff":m>0?"#4a5a8a":"#2a2a48";
const pct=(v)=>Math.round(v*100)+"%";
const ti=(t)=>t==="paper"?"📝":t==="discussion"?"💬":"❓";

export default function App(){
  const [v,setV]=useState("home");
  const [cc,setCC]=useState(CONCEPTS.map(c=>({...c})));
  const [selC,setSelC]=useState(null);
  const [selA,setSelA]=useState(null);
  // Forge state
  const [forgeConcept,setForgeConcept]=useState(null);
  const [forgePhase,setForgePhase]=useState("intro");
  const [introStep,setIntroStep]=useState(0);
  const [dilemmaChoice,setDilemmaChoice]=useState(null);
  const [tfIdx,setTfIdx]=useState(0);
  const [tfAns,setTfAns]=useState(null);
  const [mcAns,setMcAns]=useState(null);
  const [score,setScore]=useState({c:0,w:0});
  const [done,setDone]=useState(new Set());
  // Oracle
  const [oq,setOQ]=useState("");
  const [oResp,setOResp]=useState(null);
  // Compare
  const [cmpA,setCmpA]=useState(null);
  const [cmpB,setCmpB]=useState(null);
  // UI
  const [fade,setFade]=useState(true);
  const [toast,setToast]=useState(null);

  const go=useCallback((to,data)=>{
    setFade(false);
    setTimeout(()=>{
      setV(to);
      if(data?.c)setSelC(data.c);
      if(data?.a)setSelA(data.a);
      if(to==="forge"){
        const target=data?.c||cc.filter(c=>c.mastery<.8&&!done.has(c.id)).sort((a,b)=>a.mastery-b.mastery)[0]||cc[0];
        setForgeConcept(target);setForgePhase("intro");setIntroStep(0);setDilemmaChoice(null);setTfIdx(0);setTfAns(null);setMcAns(null);setScore({c:0,w:0});
      }
      setFade(true);
    },180);
  },[cc,done]);

  const bump=(id,d)=>{setCC(p=>p.map(c=>c.id===id?{...c,mastery:Math.min(1,Math.max(0,c.mastery+d))}:c));};
  const flash=(msg,good)=>{setToast({msg,good});setTimeout(()=>setToast(null),2000);};
  const mastered=cc.filter(c=>c.mastery>=.8).length;
  const avg=cc.reduce((s,c)=>s+c.mastery,0)/cc.length;
  const nextA=[...ASSIGNMENTS].sort((a,b)=>a.due-b.due)[0];
  const weak=nextA?nextA.concepts.filter(id=>(cc.find(c=>c.id===id)?.mastery??0)<.6):[];

  // Oracle logic
  const askOracle=()=>{
    if(!oq.trim())return;
    const words=oq.toLowerCase().split(/\s+/).filter(w=>w.length>3);
    const results=PHILOSOPHERS.map(p=>{
      let best=null;let bestScore=0;
      p.quotes.forEach(q=>{
        let s=0;
        words.forEach(w=>{if(q.about.some(a=>a.includes(w)||w.includes(a)))s+=2;if(q.text.toLowerCase().includes(w))s+=1;});
        if(s>bestScore||(s===bestScore&&Math.random()>.5)){bestScore=s;best=q;}
      });
      if(!best)best=p.quotes[Math.floor(Math.random()*p.quotes.length)];
      return{...p,quote:best,relevance:bestScore};
    }).sort((a,b)=>b.relevance-a.relevance);
    setOResp(results);
  };

  // Styles
  const BG="#020208";const CARD="rgba(6,6,15,0.72)";const BDR="rgba(26,26,58,0.45)";const CYAN="#00f0ff";const TEAL="#06d6a0";const GOLD="#ffd700";const RED="#ff4466";const TXT="#e0e0ff";const T2="#b0b0d0";const MUTE="#5a5a8a";const DIM="#252540";
  const card={background:CARD,border:`1px solid ${BDR}`,borderRadius:20,padding:"32px 36px"};
  const ey={fontSize:".72rem",fontWeight:800,letterSpacing:".16em",textTransform:"uppercase",color:MUTE,marginBottom:16};
  const hd=(s)=>({fontSize:s+"rem",fontWeight:700,margin:0,lineHeight:1.3,color:TXT});
  const btn=(bg,fg)=>({background:bg,color:fg,border:"none",padding:"12px 28px",borderRadius:12,fontWeight:700,fontSize:".85rem",cursor:"pointer",letterSpacing:".04em",transition:"all 220ms cubic-bezier(.22,1,.36,1)"});

  const ConceptPill=({id})=>{const c=cc.find(x=>x.id===id);if(!c)return null;
    return <button onClick={()=>go("explore",{c})} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 14px",borderRadius:16,border:`1px solid ${mc(c.mastery)}33`,background:`${mc(c.mastery)}0a`,color:mc(c.mastery),fontSize:".78rem",fontWeight:600,cursor:"pointer"}}><div style={{width:7,height:7,borderRadius:"50%",background:mc(c.mastery)}}/>{c.name} {c.mastery>0?pct(c.mastery):""}</button>;
  };

  return(
  <div style={{minHeight:"100vh",background:BG,backgroundImage:"radial-gradient(ellipse at 50% 0%,#0a0a20 0%,#020208 55%)",color:TXT,fontFamily:"'Segoe UI',system-ui,sans-serif",fontSize:"16px"}}>
    <nav style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 32px",borderBottom:`1px solid rgba(0,240,255,.06)`,position:"sticky",top:0,zIndex:100,background:"rgba(2,2,8,.94)",backdropFilter:"blur(16px)"}}>
      <div style={{display:"flex",alignItems:"center",gap:16}}>
        <span style={{fontWeight:900,fontSize:"1.15rem",letterSpacing:".14em",color:CYAN,textShadow:"0 0 24px rgba(0,240,255,.25)"}}>AEONTHRA</span>
        <span style={{fontSize:".72rem",letterSpacing:".14em",color:MUTE,border:"1px solid #1a1a3a",padding:"4px 12px",borderRadius:20}}>{COURSE.code}</span>
      </div>
      <div style={{display:"flex",gap:4}}>
        {[["home","Home"],["explore","Concepts"],["forge","Learn"],["compare","Compare"],["oracle","Oracle"]].map(([id,lb])=>(
          <button key={id} onClick={()=>go(id)} style={{background:v===id?"rgba(0,240,255,.07)":"transparent",border:"none",color:v===id?CYAN:MUTE,padding:"10px 20px",borderRadius:10,cursor:"pointer",fontSize:".85rem",fontWeight:600,transition:"all 200ms"}}>{lb}</button>
        ))}
      </div>
    </nav>

    {toast&&<div style={{position:"fixed",top:80,left:"50%",transform:"translateX(-50%)",padding:"12px 28px",borderRadius:14,background:toast.good?"rgba(6,214,160,.15)":"rgba(255,68,102,.15)",border:`1px solid ${toast.good?TEAL:RED}`,color:toast.good?TEAL:RED,fontSize:".88rem",fontWeight:700,zIndex:200,animation:"fadeUp .3s ease"}}>{toast.msg}</div>}

    <main style={{maxWidth:1120,margin:"0 auto",padding:"32px 28px 100px",opacity:fade?1:0,transition:"opacity 180ms ease"}}>

    {/* ═══ HOME ═══ */}
    {v==="home"&&<>
      <div style={{...card,marginBottom:24,background:"linear-gradient(135deg,rgba(0,240,255,.03),rgba(6,6,15,.7))",borderColor:"rgba(0,240,255,.12)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:24}}>
          <div><div style={ey}>YOUR COURSE</div><h1 style={hd(1.6)}>{COURSE.title}</h1><p style={{color:MUTE,fontSize:".88rem",marginTop:6}}>{COURSE.code} · {COURSE.term}</p></div>
          <div style={{display:"flex",gap:36}}>
            {[[mastered+"/"+cc.length,"Mastered"],[pct(avg),"Overall"],[ASSIGNMENTS.length,"Tasks"]].map(([val,lb],i)=>(
              <div key={i} style={{textAlign:"center"}}><div style={{fontSize:"1.8rem",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{val}</div><div style={{fontSize:".68rem",color:MUTE,letterSpacing:".1em",textTransform:"uppercase",marginTop:3}}>{lb}</div></div>
            ))}
          </div>
        </div>
      </div>

      {nextA&&<div style={{...card,marginBottom:24,borderLeft:`4px solid ${CYAN}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:20}}>
          <div style={{flex:1,minWidth:300}}>
            <div style={{...ey,color:CYAN}}>⚡ START HERE</div>
            <h2 style={hd(1.25)}>{nextA.title}: {nextA.sub}</h2>
            <p style={{color:T2,fontSize:".92rem",lineHeight:1.7,margin:"10px 0 0"}}>{nextA.desc}</p>
            {nextA.tip&&<p style={{color:MUTE,fontSize:".84rem",fontStyle:"italic",lineHeight:1.6,margin:"12px 0 0"}}>💡 {nextA.tip}</p>}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10,alignItems:"flex-end",minWidth:200}}>
            <span style={{fontSize:".78rem",color:MUTE}}>{ti(nextA.type)} {nextA.pts}pts · Due in {nextA.due} days</span>
            {weak.length>0?<><div style={{fontSize:".82rem",color:RED,marginBottom:4}}>{weak.length} concept{weak.length>1?"s":""} need preparation</div><button onClick={()=>go("forge")} style={btn(`linear-gradient(135deg,${CYAN},#0080ff)`,"#000")}>⚡ Start Learning</button></>:
              <button onClick={()=>go("assignment",{a:nextA})} style={btn(`linear-gradient(135deg,${TEAL},#00b088)`,"#000")}>✓ Ready — View</button>}
          </div>
        </div>
      </div>}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        <div style={card}>
          <div style={ey}>CONCEPT MASTERY</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            {cc.map(c=>(
              <button key={c.id} onClick={()=>go("explore",{c})} style={{display:"flex",alignItems:"center",gap:10,background:"transparent",border:"1px solid transparent",borderRadius:10,padding:"10px 12px",cursor:"pointer",color:TXT,fontSize:".85rem",textAlign:"left",width:"100%",transition:"all 180ms"}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:mc(c.mastery),flexShrink:0,boxShadow:c.mastery>=.5?`0 0 8px ${mc(c.mastery)}44`:""}}/>
                <span style={{flex:1}}>{c.name}</span>
                <span style={{color:mc(c.mastery),fontSize:".78rem",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{c.mastery>0?pct(c.mastery):"—"}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={card}>
          <div style={ey}>ASSIGNMENTS</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {ASSIGNMENTS.map(a=>{const rdy=a.concepts.every(id=>(cc.find(c=>c.id===id)?.mastery??0)>=.6);
              return(<button key={a.id} onClick={()=>go("assignment",{a})} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"rgba(10,10,26,.4)",border:`1px solid ${BDR}`,borderRadius:12,cursor:"pointer",width:"100%",color:TXT,transition:"all 200ms"}}>
                <span style={{fontSize:"1.2rem",width:30}}>{ti(a.type)}</span>
                <div style={{flex:1,textAlign:"left"}}><div style={{fontSize:".88rem",fontWeight:600}}>{a.title}</div><div style={{fontSize:".74rem",color:MUTE}}>{a.pts}pts · Due in {a.due}d</div></div>
                <span style={{fontSize:".68rem",fontWeight:700,padding:"4px 10px",borderRadius:16,...(rdy?{color:TEAL,border:`1px solid ${TEAL}33`,background:`${TEAL}0a`}:{color:"#ff8800",border:"1px solid #ff880033",background:"#ff88000a"})}}>{rdy?"Ready":"Prepare"}</span>
              </button>);
            })}
          </div>
        </div>
      </div>
    </>}

    {/* ═══ EXPLORE ═══ */}
    {v==="explore"&&<div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:24,alignItems:"start"}}>
      <div style={{...card,position:"sticky",top:80,padding:"24px 20px"}}>
        <div style={ey}>CONCEPTS</div>
        {cc.map(c=>(<button key={c.id} onClick={()=>setSelC(c)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,background:selC?.id===c.id?"rgba(0,240,255,.06)":"transparent",border:selC?.id===c.id?`1px solid rgba(0,240,255,.18)`:"1px solid transparent",cursor:"pointer",width:"100%",color:TXT,fontSize:".85rem",transition:"all 180ms",marginBottom:3}}>
          <div style={{width:10,height:10,borderRadius:"50%",background:mc(c.mastery),boxShadow:c.mastery>=.5?`0 0 6px ${mc(c.mastery)}44`:""}}/>
          <span style={{flex:1,textAlign:"left"}}>{c.name}</span>
          <span style={{color:mc(c.mastery),fontSize:".74rem",fontWeight:700}}>{c.mastery>0?pct(c.mastery):"—"}</span>
        </button>))}
      </div>
      <div style={{...card,minHeight:500,padding:"36px 44px"}}>
        {selC?<>
          <div style={{...ey,color:mc(selC.mastery)}}>{selC.cat}</div>
          <h2 style={hd(1.4)}>{selC.name}</h2>
          <div style={{height:5,background:DIM,borderRadius:3,margin:"16px 0 8px",overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,background:mc(selC.mastery),width:pct(selC.mastery),transition:"width 500ms ease"}}/></div>
          <p style={{fontSize:".8rem",color:MUTE,marginBottom:32}}>{pct(selC.mastery)} mastery</p>
          {[["Core Idea",selC.core,TXT],["In Depth",selC.depth,T2],["Key Distinction",selC.distinction,T2],["Common Mistake",selC.pitfall,T2]].map(([lb,txt,clr])=>(
            <div key={lb} style={{marginBottom:28}}><div style={{fontSize:".72rem",fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:CYAN,marginBottom:8}}>{lb}</div><p style={{fontSize:".95rem",lineHeight:1.75,color:clr,margin:0}}>{txt}</p></div>
          ))}
          <div style={{marginBottom:28}}><div style={{fontSize:".72rem",fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:TEAL,marginBottom:8}}>Memory Hook</div><p style={{fontSize:".95rem",lineHeight:1.65,color:TEAL,fontStyle:"italic",margin:0}}>{selC.mnemonic}</p></div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:28}}>{selC.keywords.map(k=><span key={k} style={{padding:"5px 14px",borderRadius:20,border:`1px solid ${BDR}`,fontSize:".76rem",color:MUTE,background:"rgba(10,10,26,.5)"}}>{k}</span>)}</div>
          {selC.connections.length>0&&<div style={{marginBottom:28}}><div style={{fontSize:".72rem",fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:CYAN,marginBottom:10}}>Related</div><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{selC.connections.map(id=><ConceptPill key={id} id={id}/>)}</div></div>}
          <button onClick={()=>go("forge",{c:selC})} style={btn(`linear-gradient(135deg,${CYAN},#0080ff)`,"#000")}>Practice {selC.name} →</button>
        </>:<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:440,color:MUTE}}>
          <div style={{textAlign:"center"}}><div style={{fontSize:"2rem",marginBottom:12}}>←</div><p style={{fontSize:".95rem"}}>Select a concept to explore</p></div>
        </div>}
      </div>
    </div>}

    {/* ═══ ASSIGNMENT ═══ */}
    {v==="assignment"&&selA&&<div style={{maxWidth:740}}>
      <button onClick={()=>go("home")} style={{background:"transparent",border:"none",color:MUTE,cursor:"pointer",fontSize:".88rem",marginBottom:20}}>← Back</button>
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}>
        <span style={{fontSize:"1.8rem"}}>{ti(selA.type)}</span>
        <div><h2 style={hd(1.3)}>{selA.title}</h2><p style={{color:MUTE,fontSize:".85rem",margin:"3px 0 0"}}>{selA.sub} · {selA.pts}pts · Due in {selA.due} days</p></div>
      </div>
      <div style={{...card,marginBottom:20}}>
        <div style={{fontSize:".72rem",fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:CYAN,marginBottom:10}}>What's Being Asked</div>
        <p style={{fontSize:".95rem",lineHeight:1.75,color:T2,margin:0}}>{selA.desc}</p>
      </div>
      {selA.tip&&<div style={{...card,marginBottom:20,borderLeft:`4px solid ${TEAL}`}}>
        <div style={{fontSize:".72rem",fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:TEAL,marginBottom:10}}>💡 Strategy</div>
        <p style={{fontSize:".92rem",lineHeight:1.65,color:T2,margin:0}}>{selA.tip}</p>
      </div>}
      <div style={card}>
        <div style={{fontSize:".72rem",fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:CYAN,marginBottom:14}}>Required Concepts</div>
        {selA.concepts.map(id=>{const c=cc.find(x=>x.id===id);if(!c)return null;const rdy=c.mastery>=.6;
          return(<div key={id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:`1px solid ${BDR}`}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:mc(c.mastery)}}/>
            <button onClick={()=>go("explore",{c})} style={{flex:1,background:"none",border:"none",color:TXT,cursor:"pointer",textAlign:"left",fontSize:".92rem",fontWeight:500}}>{c.name}</button>
            <span style={{color:mc(c.mastery),fontSize:".8rem",fontWeight:700}}>{pct(c.mastery)}</span>
            <span style={{fontSize:".68rem",fontWeight:700,padding:"3px 10px",borderRadius:14,...(rdy?{color:TEAL,background:`${TEAL}0f`}:{color:RED,background:`${RED}0f`})}}>{rdy?"✓ Ready":"Needs work"}</span>
          </div>);
        })}
        {selA.concepts.some(id=>(cc.find(c=>c.id===id)?.mastery??0)<.6)&&
          <button onClick={()=>go("forge")} style={{...btn(`linear-gradient(135deg,${CYAN},#0080ff)`,"#000"),marginTop:24}}>⚡ Prepare in Neural Forge</button>}
      </div>
    </div>}

    {/* ═══ FORGE ═══ */}
    {v==="forge"&&forgeConcept&&<div style={{maxWidth:720,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div style={{display:"flex",gap:6}}>
          {[["intro","Learn"],["dilemma","Dilemma"],["tf","Quick Test"],["mc","Deep Test"]].map(([id,lb])=>(
            <button key={id} onClick={()=>{setForgePhase(id);if(id==="tf"){setTfIdx(0);setTfAns(null);}if(id==="mc")setMcAns(null);if(id==="dilemma")setDilemmaChoice(null);}} style={{background:forgePhase===id?"rgba(0,240,255,.08)":"transparent",border:forgePhase===id?`1px solid rgba(0,240,255,.2)`:`1px solid ${BDR}`,color:forgePhase===id?CYAN:MUTE,padding:"9px 18px",borderRadius:20,cursor:"pointer",fontSize:".78rem",fontWeight:700,letterSpacing:".06em",transition:"all 200ms"}}>{lb}</button>
          ))}
        </div>
        <div style={{display:"flex",gap:14,fontSize:".88rem",fontWeight:700}}>
          <span style={{color:TEAL}}>✓{score.c}</span><span style={{color:RED}}>✗{score.w}</span>
        </div>
      </div>

      <div style={{marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:12,height:12,borderRadius:"50%",background:mc(forgeConcept.mastery),boxShadow:`0 0 8px ${mc(forgeConcept.mastery)}44`}}/>
        <span style={{fontSize:"1.1rem",fontWeight:700}}>{forgeConcept.name}</span>
        <span style={{fontSize:".78rem",color:mc(forgeConcept.mastery),fontWeight:700}}>{pct(forgeConcept.mastery)}</span>
        <button onClick={()=>{const others=cc.filter(c=>c.id!==forgeConcept.id&&c.mastery<.8);if(others.length)go("forge",{c:others[0]});}} style={{marginLeft:"auto",fontSize:".78rem",color:MUTE,background:"transparent",border:`1px solid ${BDR}`,padding:"5px 14px",borderRadius:16,cursor:"pointer"}}>Next concept →</button>
      </div>

      {/* ORIENTATION */}
      {forgePhase==="intro"&&(()=>{const steps=["core","depth","distinction","pitfall"];const s=steps[introStep];
        return(<div style={{...card,padding:"40px 44px"}}>
          <div style={{...ey,color:mc(forgeConcept.mastery)}}>ORIENTATION · {forgeConcept.name}</div>
          <div style={{display:"flex",gap:6,margin:"0 0 28px"}}>{steps.map((_,i)=><div key={i} style={{flex:1,height:4,borderRadius:2,background:i<=introStep?CYAN:DIM,transition:"background 400ms ease"}}/>)}</div>
          {s==="core"&&<><h3 style={hd(1.15)}>Core Idea</h3><p style={{fontSize:"1.05rem",lineHeight:1.8,color:T2,marginTop:12}}>{forgeConcept.core}</p></>}
          {s==="depth"&&<><h3 style={hd(1.15)}>Going Deeper</h3><p style={{fontSize:"1rem",lineHeight:1.8,color:T2,marginTop:12}}>{forgeConcept.depth}</p></>}
          {s==="distinction"&&<><h3 style={hd(1.15)}>Key Distinction</h3><p style={{fontSize:"1rem",lineHeight:1.8,color:T2,marginTop:12}}>{forgeConcept.distinction}</p></>}
          {s==="pitfall"&&<><h3 style={{...hd(1.15),color:RED}}>⚠ Common Mistake</h3><p style={{fontSize:"1rem",lineHeight:1.8,color:T2,marginTop:12}}>{forgeConcept.pitfall}</p><p style={{fontSize:".95rem",lineHeight:1.6,color:TEAL,fontStyle:"italic",marginTop:16}}>🔗 {forgeConcept.mnemonic}</p></>}
          <div style={{display:"flex",justifyContent:"space-between",marginTop:32}}>
            {introStep>0?<button onClick={()=>setIntroStep(p=>p-1)} style={{...btn("transparent",MUTE),border:`1px solid ${BDR}`}}>← Back</button>:<div/>}
            {introStep<3?<button onClick={()=>setIntroStep(p=>p+1)} style={btn(`linear-gradient(135deg,${CYAN},#0080ff)`,"#000")}>Continue →</button>:
              <button onClick={()=>{bump(forgeConcept.id,.06);flash("Orientation complete!",true);setForgePhase("dilemma");setDilemmaChoice(null);}} style={btn(`linear-gradient(135deg,${TEAL},#00b088)`,"#000")}>✓ Test me →</button>}
          </div>
        </div>);
      })()}

      {/* DILEMMA — concept specific */}
      {forgePhase==="dilemma"&&forgeConcept.dilemma&&(()=>{const d=forgeConcept.dilemma;
        return(<div style={{...card,padding:"40px 44px"}}>
          <div style={ey}>ETHICAL DILEMMA · {forgeConcept.name}</div>
          <p style={{fontSize:"1.05rem",lineHeight:1.8,color:T2,margin:"0 0 28px"}}>{d.text}</p>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {d.opts.map((o,i)=>(
              <button key={i} onClick={()=>{if(dilemmaChoice===null)setDilemmaChoice(i);}} style={{textAlign:"left",padding:"18px 22px",borderRadius:14,border:`1px solid ${dilemmaChoice===i?CYAN:BDR}`,background:dilemmaChoice===i?"rgba(0,240,255,.04)":"rgba(10,10,26,.4)",cursor:dilemmaChoice!==null?"default":"pointer",color:TXT,transition:"all 250ms",width:"100%",opacity:dilemmaChoice!==null&&dilemmaChoice!==i?.35:1}}>
                <div style={{fontSize:".92rem",lineHeight:1.6}}>{o.text}</div>
                {dilemmaChoice===i&&<div style={{marginTop:14,padding:"14px 18px",borderRadius:12,background:"rgba(0,240,255,.04)",border:`1px solid rgba(0,240,255,.1)`}}>
                  <div style={{fontSize:".7rem",fontWeight:700,letterSpacing:".1em",color:CYAN,marginBottom:6}}>{o.fw}</div>
                  <p style={{fontSize:".88rem",lineHeight:1.6,color:T2,margin:0}}>{o.why}</p>
                </div>}
              </button>
            ))}
          </div>
          {dilemmaChoice!==null&&<button onClick={()=>{setForgePhase("tf");setTfIdx(0);setTfAns(null);}} style={{...btn(`linear-gradient(135deg,${CYAN},#0080ff)`,"#000"),marginTop:24}}>Continue to Quick Test →</button>}
        </div>);
      })()}

      {/* TRUE/FALSE — concept specific */}
      {forgePhase==="tf"&&(()=>{const qs=forgeConcept.tf||[];const q=qs[tfIdx];
        if(!q)return(<div style={{...card,textAlign:"center",padding:48}}><div style={{fontSize:"1.4rem",marginBottom:14}}>🔥</div><p style={{fontSize:"1rem",color:T2}}>Quick test complete for {forgeConcept.name}!</p><button onClick={()=>{setForgePhase("mc");setMcAns(null);}} style={{...btn(`linear-gradient(135deg,${CYAN},#0080ff)`,"#000"),marginTop:16}}>Continue to Deep Test →</button></div>);
        return(<div style={{...card,padding:"40px 44px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}><div style={ey}>TRUE OR FALSE · {tfIdx+1}/{qs.length}</div></div>
          <p style={{fontSize:"1.05rem",lineHeight:1.8,color:T2,margin:"0 0 28px"}}>{q.claim}</p>
          {tfAns===null?<div style={{display:"flex",gap:14}}>
            <button onClick={()=>{const ok=q.ans;setTfAns(true);setScore(s=>({c:s.c+(ok?1:0),w:s.w+(ok?0:1)}));if(ok){bump(forgeConcept.id,.04);flash("✓ Correct!",true);}else flash("✗ Not quite",false);}} style={{flex:1,padding:"16px",borderRadius:14,fontWeight:700,fontSize:".92rem",cursor:"pointer",background:"rgba(6,214,160,.1)",color:TEAL,border:`1px solid ${TEAL}44`,transition:"all 200ms"}}>TRUE</button>
            <button onClick={()=>{const ok=!q.ans;setTfAns(false);setScore(s=>({c:s.c+(ok?1:0),w:s.w+(ok?0:1)}));if(ok){bump(forgeConcept.id,.04);flash("✓ Correct!",true);}else flash("✗ Not quite",false);}} style={{flex:1,padding:"16px",borderRadius:14,fontWeight:700,fontSize:".92rem",cursor:"pointer",background:"rgba(255,68,102,.1)",color:RED,border:`1px solid ${RED}44`,transition:"all 200ms"}}>FALSE</button>
          </div>:<>
            <div style={{padding:"14px 18px",borderRadius:12,background:tfAns===q.ans?`${TEAL}12`:`${RED}12`,border:`1px solid ${tfAns===q.ans?TEAL:RED}`,marginBottom:14,fontSize:".92rem"}}>
              <strong>{tfAns===q.ans?"✓ Correct":"✗ Incorrect"}</strong> — Answer: {q.ans?"True":"False"}
            </div>
            <p style={{fontSize:".92rem",lineHeight:1.7,color:T2}}>{q.exp}</p>
            <button onClick={()=>{setTfIdx(p=>p+1);setTfAns(null);}} style={{...btn(`linear-gradient(135deg,${CYAN},#0080ff)`,"#000"),marginTop:20}}>Next →</button>
          </>}
        </div>);
      })()}

      {/* DEEP DRILL — concept specific */}
      {forgePhase==="mc"&&(()=>{const qs=forgeConcept.mc||[];const q=qs[0];
        if(!q||mcAns!==null&&mcAns!==-1)return(<div style={{...card,textAlign:"center",padding:52}}>
          <div style={{fontSize:"1.6rem",marginBottom:14}}>⭐</div>
          <h3 style={hd(1.2)}>Session Complete: {forgeConcept.name}</h3>
          <p style={{fontSize:".95rem",color:T2,margin:"10px 0 24px"}}>Score: {score.c} correct, {score.w} wrong</p>
          <div style={{display:"flex",gap:12,justifyContent:"center"}}>
            <button onClick={()=>{const next=cc.filter(c=>c.id!==forgeConcept.id&&c.mastery<.8);if(next.length){setDone(p=>new Set([...p,forgeConcept.id]));go("forge",{c:next.sort((a,b)=>a.mastery-b.mastery)[0]});}else go("home");}} style={btn(`linear-gradient(135deg,${CYAN},#0080ff)`,"#000")}>Next Concept →</button>
            <button onClick={()=>go("home")} style={{...btn("transparent",MUTE),border:`1px solid ${BDR}`}}>Home</button>
          </div>
        </div>);
        return(<div style={{...card,padding:"40px 44px"}}>
          <div style={ey}>DEEP TEST · {forgeConcept.name}</div>
          <p style={{fontSize:"1.05rem",lineHeight:1.8,color:T2,margin:"0 0 24px"}}>{q.q}</p>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {q.opts.map((o,i)=>(
              <button key={i} onClick={()=>{if(mcAns!==null)return;const ok=i===q.cor;setMcAns(i);setScore(s=>({c:s.c+(ok?1:0),w:s.w+(ok?0:1)}));if(ok){bump(forgeConcept.id,.08);flash("✓ Correct!",true);}else flash("✗ Not quite",false);}} style={{textAlign:"left",padding:"16px 20px",borderRadius:12,border:`1px solid ${mcAns!==null&&i===q.cor?TEAL:mcAns===i&&i!==q.cor?RED:BDR}`,background:mcAns!==null&&i===q.cor?`${TEAL}08`:mcAns===i&&i!==q.cor?`${RED}08`:"rgba(10,10,26,.4)",cursor:mcAns!==null?"default":"pointer",color:TXT,fontSize:".92rem",lineHeight:1.6,width:"100%",transition:"all 250ms",opacity:mcAns!==null&&mcAns!==i&&i!==q.cor?.3:1}}>{o}</button>
            ))}
          </div>
          {mcAns!==null&&<><p style={{fontSize:".92rem",lineHeight:1.7,color:T2,marginTop:18}}>{q.exp}</p>
            <button onClick={()=>setMcAns(-1)} style={{...btn(`linear-gradient(135deg,${TEAL},#00b088)`,"#000"),marginTop:20}}>Complete Session →</button></>}
        </div>);
      })()}
    </div>}

    {/* ═══ COMPARE ═══ */}
    {v==="compare"&&<div style={{maxWidth:900,margin:"0 auto"}}>
      <h2 style={hd(1.3)}>Compare Concepts</h2>
      <p style={{color:T2,fontSize:".92rem",margin:"8px 0 24px"}}>Select two concepts to see them side by side — definitions, distinctions, and where they clash.</p>
      <div style={{display:"flex",gap:16,marginBottom:28}}>
        <select value={cmpA?.id||""} onChange={e=>setCmpA(cc.find(c=>c.id===e.target.value)||null)} style={{flex:1,padding:"12px 16px",borderRadius:12,border:`1px solid ${BDR}`,background:"rgba(10,10,26,.7)",color:TXT,fontSize:".88rem"}}>
          <option value="">Select Concept A</option>
          {cc.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={cmpB?.id||""} onChange={e=>setCmpB(cc.find(c=>c.id===e.target.value)||null)} style={{flex:1,padding:"12px 16px",borderRadius:12,border:`1px solid ${BDR}`,background:"rgba(10,10,26,.7)",color:TXT,fontSize:".88rem"}}>
          <option value="">Select Concept B</option>
          {cc.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {cmpA&&cmpB&&cmpA.id!==cmpB.id&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        {[cmpA,cmpB].map(c=>(<div key={c.id} style={{...card,borderTop:`3px solid ${mc(c.mastery)}`}}>
          <div style={{...ey,color:mc(c.mastery)}}>{c.cat}</div>
          <h3 style={hd(1.15)}>{c.name}</h3>
          <div style={{marginTop:20}}>
            <div style={{fontSize:".72rem",fontWeight:700,letterSpacing:".12em",color:CYAN,marginBottom:6}}>CORE</div>
            <p style={{fontSize:".92rem",lineHeight:1.7,color:T2,margin:"0 0 20px"}}>{c.core}</p>
            <div style={{fontSize:".72rem",fontWeight:700,letterSpacing:".12em",color:CYAN,marginBottom:6}}>DISTINCTION</div>
            <p style={{fontSize:".92rem",lineHeight:1.7,color:T2,margin:"0 0 20px"}}>{c.distinction}</p>
            <div style={{fontSize:".72rem",fontWeight:700,letterSpacing:".12em",color:TEAL,marginBottom:6}}>MEMORY HOOK</div>
            <p style={{fontSize:".88rem",lineHeight:1.6,color:TEAL,fontStyle:"italic",margin:0}}>{c.mnemonic}</p>
          </div>
        </div>))}
      </div>}
    </div>}

    {/* ═══ ORACLE ═══ */}
    {v==="oracle"&&<div style={{maxWidth:820,margin:"0 auto"}}>
      <h2 style={hd(1.3)}>Oracle Panel</h2>
      <p style={{color:T2,fontSize:".92rem",lineHeight:1.6,margin:"8px 0 24px"}}>Ask an ethical question. Six philosophers respond from their own traditions — the more specific your question, the more relevant their answers.</p>
      <div style={{display:"flex",gap:12,marginBottom:32}}>
        <input value={oq} onChange={e=>setOQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")askOracle();}} placeholder="e.g. Is it ever right to lie? Can happiness be measured?" style={{flex:1,padding:"14px 20px",borderRadius:14,border:`1px solid ${BDR}`,background:"rgba(10,10,26,.7)",color:TXT,fontSize:".92rem",outline:"none"}}/>
        <button onClick={askOracle} style={btn(`linear-gradient(135deg,${CYAN},#0080ff)`,"#000")}>Ask</button>
      </div>
      {!oResp?<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
        {PHILOSOPHERS.map(p=><div key={p.name} style={{...card,padding:"24px 28px"}}><div style={{fontSize:".95rem",fontWeight:700}}>{p.name}</div><div style={{fontSize:".76rem",color:CYAN,marginTop:3}}>{p.trad}</div><div style={{fontSize:".74rem",color:MUTE,marginTop:8}}>{p.quotes.length} positions indexed</div></div>)}
      </div>:<div style={{display:"flex",flexDirection:"column",gap:16}}>
        {oResp.map((r,i)=><div key={i} style={{...card,padding:"28px 32px",borderLeft:`4px solid ${CYAN}`,animation:`fadeUp ${300+i*100}ms ease both`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div><div style={{fontSize:".95rem",fontWeight:700}}>{r.name}</div><div style={{fontSize:".74rem",color:CYAN}}>{r.trad}</div></div>
            <span style={{fontSize:".74rem",color:MUTE,fontStyle:"italic"}}>p.{r.quote.pg}</span>
          </div>
          <p style={{fontSize:".95rem",lineHeight:1.75,color:T2,fontStyle:"italic",margin:0}}>"{r.quote.text}"</p>
          {r.relevance>0&&<div style={{fontSize:".72rem",color:MUTE,marginTop:10}}>Relevance: {"●".repeat(Math.min(r.relevance,5))+"○".repeat(Math.max(0,5-r.relevance))}</div>}
        </div>)}
        <button onClick={()=>{setOResp(null);setOQ("");}} style={{...btn("transparent",CYAN),border:`1px solid ${CYAN}33`,alignSelf:"center"}}>Ask another question</button>
      </div>}
    </div>}

    </main>
    <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}*:focus-visible{outline:2px solid #00f0ff;outline-offset:2px;border-radius:8px}button:hover{filter:brightness(1.1)}button:active{transform:scale(.98)}`}</style>
  </div>);
}
