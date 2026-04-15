// @ts-nocheck — NaN-fix + forge-empty + gym-empty + hardcoded-8 patch v2
import { useState, useCallback, useEffect, useRef } from "react";
import type { ShellData } from "./lib/shell-mapper";
import type { AppProgress } from "./lib/workspace";
import { loadNotes, storeNotes } from "./lib/storage";

type AeonthraShellProps = {
  data: ShellData;
  progress: AppProgress;
  onProgressUpdate: (update: Partial<AppProgress>) => void;
  onReset: () => void;
  onDownloadOfflineSite: () => void;
  onSaveReplayBundle: () => void;
  isDemoMode: boolean;
};

const mc2=m=>m>=.8?"#ffd700":m>=.5?"#06d6a0":m>=.2?"#00f0ff":m>0?"#4a5a8a":"#2a2a48";
const P=v=>Math.round(v*100)+'%';
const INVALID_CONCEPT_LABELS=new Set([
  "common confusion",
  "common mistake",
  "core idea",
  "going deeper",
  "initial post",
  "key distinction",
  "memory hook",
  "real world application",
]);

const normalizePanelText=(value)=>(value??"").replace(/\s+/g," ").trim();
const isBadConceptLabel=(label)=>{const normalized=normalizePanelText(label).toLowerCase();return normalized.length<4||INVALID_CONCEPT_LABELS.has(normalized);};
const isRenderablePanelText=(value)=>normalizePanelText(value).length>=20;
const uniqueNonEmptyPanels=(panels)=>{
  const seen=new Set();
  return panels.filter((panel)=>{
    const body=normalizePanelText(panel.body);
    if(!isRenderablePanelText(body))return false;
    const key=body.toLowerCase();
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  }).map((panel)=>({...panel,body:normalizePanelText(panel.body)}));
};
const buildConceptPanels=(concept)=>uniqueNonEmptyPanels([
  {id:"core",label:"Core Idea",body:concept?.core,color:"#00f0ff",icon:"📌"},
  {id:"depth",label:"Going Deeper",body:concept?.depth,color:"#00f0ff",icon:"🔍"},
  {id:"dist",label:"Key Distinction",body:concept?.dist,color:"#a78bfa",icon:"⚖"},
  {id:"trap",label:"Common Mistake",body:concept?.trap,color:"#ff667a",icon:"🚫"},
  {id:"hook",label:"Memory Hook",body:concept?.hook,color:"#06d6a0",icon:"🔗"},
]);
const buildForgeSteps=(concept)=>buildConceptPanels(concept).filter((panel)=>panel.id!=="hook");
const buildFlashCards=(concept)=>uniqueNonEmptyPanels([
  {front:concept?.name,body:concept?.core,label:"Definition"},
  {front:"Going Deeper",body:concept?.depth,label:"Deeper context"},
  {front:"Key Distinction",body:concept?.dist,label:"How it differs"},
  {front:"Common Mistake",body:concept?.trap,label:"Watch out"},
  {front:"Memory Hook",body:concept?.hook,label:"Remember this"},
  {front:concept?.kw?.[0]||"Key Term",body:concept?.depth||concept?.core,label:"Apply it"},
]);
const stableHash=(value)=>{let hash=0;for(let i=0;i<value.length;i++)hash=(hash*31+value.charCodeAt(i))>>>0;return hash;};
const stableOrder=(values,seed)=>[...values].map((value,index)=>({value,index,key:stableHash(`${seed}:${index}:${JSON.stringify(value)}`)})).sort((a,b)=>a.key-b.key||a.index-b.index).map((entry)=>entry.value);
const takeStableSubset=(values,count,seed)=>stableOrder(values,seed).slice(0,Math.min(count,values.length));
const isRenderableConcept=(concept)=>Boolean(concept)&&!isBadConceptLabel(concept?.name||concept?.label||"")&&normalizePanelText(concept?.core||concept?.definition||"").length>=12;
const completedConceptSet=(concepts,progress)=>new Set(concepts.filter((concept)=>(progress?.conceptMastery?.[concept.id]??0)>=.8).map((concept)=>concept.id));

const MARGIN_TYPES={
  hook:{icon:"★",label:"Key Insight"},
  plain:{icon:"💬",label:"Plain English"},
  confusion:{icon:"⚠",label:"Common Confusion"},
  assignment:{icon:"📋",label:"Assignment Link"},
  border:{icon:"⚖",label:"Concept Border"},
  thesis:{icon:"✦",label:"Thesis Material"},
  oracle:{icon:"🏛",label:"Philosopher's View"},
  memory:{icon:"🔗",label:"Memory Hook"},
};

export function AeonthraShell({data,progress:initialProgress,onProgressUpdate,onReset,onDownloadOfflineSite,onSaveReplayBundle,isDemoMode}:AeonthraShellProps){
const{concepts:CD,assignments:ASSIGNMENTS,reading:READING,margins:MARGINS,transcripts:TRANSCRIPTS,dists:DISTS,philosophers:PH,course:COURSE,synthesis:SYNTHESIS}=data;
const[cc,setCC]=useState(()=>CD.map(c=>({...c,mastery:initialProgress.conceptMastery[c.id]??0})));
const[v,setV]=useState("home");
const[selC,setSC]=useState(null);
const[selA,setSA]=useState(null);
const[fc,setFC]=useState(null);
const[fp,setFP]=useState("intro");
const[is2,setIS]=useState(0);
const[dc,setDC]=useState(null);
const[ti2,setTI]=useState(0);
const[ta,setTA]=useState(null);
const[mi2,setMI]=useState(0);
const[ma,setMA]=useState(null);
const[fi,setFI]=useState(0);
const[ff,setFF]=useState(false);
const[ws,setWS]=useState(null);
const[wd,setWD]=useState(new Set());
const[sc,setSCO]=useState({c:0,w:0});
const[done,setDone]=useState(()=>completedConceptSet(CD,initialProgress));
const[qn,setQN]=useState(10);
const[diff,setDiff]=useState("mixed");
const[mode,setMode]=useState("learn");
const[oq,setOQ]=useState("");
const[or2,setOR]=useState(null);
const[oracleMode,setOracleMode]=useState("tribunal"); // tribunal|single|thesis|verdict
const[cA,setCA]=useState(null);
const[cB,setCB]=useState(null);
const[fade,setFade]=useState(true);
const[hoverCard,setHoverCard]=useState(null);
const[ripple,setRipple]=useState(null);
const[toast,setToast]=useState(null);
const[streak,setStreak]=useState(0);
const[bestStreak,setBestStreak]=useState(0);
const[missed,setMissed]=useState([]);
const[totalAnswered,setTotalAnswered]=useState(0);
const[totalCorrect,setTotalCorrect]=useState(0);
const[showCelebration,setShowCelebration]=useState(false);
const[conceptStats,setConceptStats]=useState({});

// ═══ MEMORY FOSSILIZATION SYSTEM ═══
const[memoryState,setMemoryState]=useState({}); // per concept: {firstSeen, lastPracticed, missCount, correctStreak, stage}
const[ghosts,setGhosts]=useState([]); // past mistakes that resurface: {question, conceptId, missedAt, resurfaced}
const[showImprint,setShowImprint]=useState(null); // concept id for memory imprint card
const[delayedRecall,setDelayedRecall]=useState(null); // surprise recall from earlier in session

// Memory stages: unseen → fragile → forming → stable → crystallized
const getMemoryStage=(conceptId)=>{
  const m=memoryState[conceptId];
  const c=cc.find(x=>x.id===conceptId);
  if(!m||!c)return "unseen";
  if(c.mastery>=.8&&m.correctStreak>=3)return "crystallized";
  if(c.mastery>=.6&&m.correctStreak>=2)return "stable";
  if(c.mastery>=.3||m.correctStreak>=1)return "forming";
  if(c.mastery>0||m.firstSeen)return "fragile";
  return "unseen";
};

const memoryStageColor=(stage)=>stage==="crystallized"?"#ffd700":stage==="stable"?"#06d6a0":stage==="forming"?"#00f0ff":stage==="fragile"?"#ff8800":"#2a2a4a";
const memoryStageLabel=(stage)=>stage==="crystallized"?"Crystallized ✦":stage==="stable"?"Stable":stage==="forming"?"Forming":stage==="fragile"?"Fragile":"Unseen";
const memoryStageIcon=(stage)=>stage==="crystallized"?"💎":stage==="stable"?"🟢":stage==="forming"?"🔵":stage==="fragile"?"🟠":"⚫";

// Record memory event
const recordMemory=(conceptId,correct)=>{
  setMemoryState(p=>{
    const prev=p[conceptId]||{firstSeen:Date.now(),lastPracticed:0,missCount:0,correctStreak:0};
    return{...p,[conceptId]:{
      ...prev,
      lastPracticed:Date.now(),
      missCount:prev.missCount+(correct?0:1),
      correctStreak:correct?(prev.correctStreak+1):0,
    }};
  });
  // Add ghosts from misses
  if(!correct){
    const concept=cc.find(c=>c.id===conceptId);
    if(concept){
      setGhosts(p=>[...p,{conceptId,conceptName:concept.name,missedAt:Date.now(),text:concept.trap}].slice(-20));
    }
  }
  // Trigger delayed recall on a stable cadence so identical sessions behave the same way.
  // Use stableHash(conceptId) — not conceptId.length — to avoid coupling cadence to string length.
  if(correct&&totalAnswered>5){
    const earlier=cc.filter(c=>c.id!==conceptId&&c.mastery>0&&c.mastery<.8);
    const seed=stableHash(conceptId);
    if(earlier.length&&((totalAnswered+seed)%7===0)){
      const pick=earlier[(totalAnswered+seed)%earlier.length];
      setDelayedRecall({concept:pick,ts:Date.now()});
    }
  }
};

// Get relevant ghost for current concept
const getGhost=(conceptId)=>{
  const g=ghosts.find(g=>g.conceptId===conceptId&&!g.resurfaced);
  if(g){setGhosts(p=>p.map(x=>x===g?{...x,resurfaced:true}:x));}
  return g;
};
const[launched,setLaunched]=useState(false);
const sessionTimeRef=useRef(0);
const sessionTimerElRef=useRef(null);
const[draft,setDraft]=useState({});
const[navScrolled,setNavScrolled]=useState(false);
const[notes,setNotes]=useState(()=>loadNotes());
useEffect(()=>{storeNotes(notes);},[notes]);
useEffect(()=>{const h=()=>setNavScrolled(window.scrollY>30);window.addEventListener("scroll",h,{passive:true});return()=>window.removeEventListener("scroll",h);},[]);
const atlasScrollRef=useRef(null);
const atlasRafRef=useRef(null);
useEffect(()=>{
  if(v!=="journey"){if(atlasRafRef.current){cancelAnimationFrame(atlasRafRef.current);atlasRafRef.current=null;}return;}
  let spd=0;
  const onMove=(e)=>{const w=window.innerWidth;const z=w*.28;if(e.clientX<z){spd=-(z-e.clientX)/z*14;}else if(e.clientX>w-z){spd=(e.clientX-(w-z))/z*14;}else{spd=0;}};
  const tick=()=>{if(atlasScrollRef.current&&spd!==0)atlasScrollRef.current.scrollLeft+=spd;atlasRafRef.current=requestAnimationFrame(tick);};
  window.addEventListener("mousemove",onMove,{passive:true});
  atlasRafRef.current=requestAnimationFrame(tick);
  return()=>{window.removeEventListener("mousemove",onMove);if(atlasRafRef.current)cancelAnimationFrame(atlasRafRef.current);atlasRafRef.current=null;};
},[v]);
// ═══ ARGUMENT FORGE ═══
const[argStage,setArgStage]=useState("thesis"); // thesis|outline|draft
const[thesis,setThesis]=useState({});
const[outline,setOutline]=useState({});

// Thesis templates per demand type

// ═══ FLOW-STATE CONDUCTOR ═══
const[answerTimes,setAnswerTimes]=useState([]); // last 10 answer timestamps
const[questionShownAt,setQuestionShownAt]=useState(Date.now());
const[consecutiveMisses,setConsecutiveMisses]=useState(0);
const[flowState,setFlowState]=useState("cold"); // cold|warming|flow|struggling|recovering|cruising
const[flowIntensity,setFlowIntensity]=useState(0); // 0-1 visual energy level
const[flowMessage,setFlowMessage]=useState("");

// Compute flow state from behavioral signals
useEffect(()=>{
  const recentAccuracy=totalAnswered>=3?(totalCorrect/totalAnswered):null;
  const avgSpeed=answerTimes.length>=3?(answerTimes.reduce((s,t)=>s+t,0)/answerTimes.length):null;
  let state="cold";let intensity=0;let msg="";

  if(totalAnswered===0){state="cold";intensity=0;msg="";}
  else if(totalAnswered<=3){state="warming";intensity=.2;msg="Warming up...";}
  else if(consecutiveMisses>=3){state="struggling";intensity=0;msg="Let's slow down — no rush";}
  else if(consecutiveMisses>=1&&streak===0&&recentAccuracy<.5){state="struggling";intensity=0;msg="Take a breath — you've got this";}
  else if(streak>=5&&avgSpeed&&avgSpeed<6000){state="flow";intensity=Math.min(1,.5+streak*.05);msg="You're in the zone 🔥";}
  else if(streak>=3){state="flow";intensity=.6;msg="Finding your rhythm";}
  else if(recentAccuracy>=.7&&totalAnswered>=5){state="cruising";intensity=.4;msg="Steady and strong";}
  else if(consecutiveMisses===0&&streak>=1&&recentAccuracy>=.5){state="recovering";intensity=.3;msg="Getting back on track";}
  else{state="warming";intensity=.2;msg="";}

  setFlowState(state);setFlowIntensity(intensity);setFlowMessage(msg);
},[totalAnswered,totalCorrect,streak,consecutiveMisses,answerTimes]);

// Flow-aware answer recorder
const recordAnswerFlow=(correct,conceptId,question)=>{
  const elapsed=Date.now()-questionShownAt;
  setAnswerTimes(p=>[...p.slice(-9),elapsed]);
  setQuestionShownAt(Date.now());
  setTotalAnswered(p=>p+1);
  if(correct){
    setTotalCorrect(p=>p+1);
    setConsecutiveMisses(0);
    setStreak(p=>{const ns=p+1;if(ns>bestStreak)setBestStreak(ns);return ns;});
  }else{
    setStreak(0);
    setConsecutiveMisses(p=>p+1);
    if(question)setMissed(p=>[...p,{...question,cid:conceptId,ts:Date.now()}].slice(-50));
  }
  setConceptStats(p=>({...p,[conceptId]:{correct:(p[conceptId]?.correct||0)+(correct?1:0),total:(p[conceptId]?.total||0)+1}}));
  recordMemory(conceptId,correct);
};

// Flow-adaptive helpers
const[prefs,setPrefs]=useState({questionsPerSet:5,difficulty:"all",timerEnabled:false,timerMinutes:10,showHints:true,autoAdvance:false,focusConcepts:[],shuffleQuestions:true,reviewMissedFirst:false,showExplanations:true,phaseOrder:["intro","dilemma","tf","mc","flash","whois"]});
const[cwModule,setCWM]=useState(null);
const[cwConcept,setCWC]=useState(null);
const[practiceMode,setPracticeMode]=useState(null);
const[practiceQ,setPracticeQ]=useState([]);
const[practiceI,setPracticeI]=useState(0);
const[practiceA,setPracticeA]=useState(null);
const[practiceSc,setPracticeSc]=useState({c:0,w:0});
const[gymPair,setGymPair]=useState(null);
const[gymA,setGymA]=useState(null);
const[gymExplained,setGymExplained]=useState(false);
// ═══ READER OS ═══
const[readerContent,setReaderContent]=useState(null);
const[readerSection,setReaderSection]=useState(0);
const[readerSaved,setReaderSaved]=useState([]);
const[readerUtilOpen,setReaderUtilOpen]=useState(false);
// Transcript mode
const[transcript,setTranscript]=useState(null);
const[txTime,setTxTime]=useState(0); // simulated playback position in seconds
const[txPlaying,setTxPlaying]=useState(false);
const[txAutoScroll,setTxAutoScroll]=useState(true);
const[txSegmentMarks,setTxSegmentMarks]=useState({}); // {transcriptId:segmentId: mark}
const[txSaved,setTxSaved]=useState([]);
// Margin intelligence
const[activePopover,setActivePopover]=useState(null); // {type,content,sectionIdx,x,y}
const[marginDismissed,setMarginDismissed]=useState(new Set());
// ═══ HIGHLIGHT PIPELINE ═══
const[highlights,setHighlights]=useState([]); // [{id,text,tag,source,readingId,sectionIdx,conceptId,ts}]
const[hlPopover,setHlPopover]=useState(null); // {text,x,y} — active selection popover
const[hlTrayOpen,setHlTrayOpen]=useState(false);
const hlIdRef=useRef(0);
// Discussion reader
const[activeDiscussion,setActiveDiscussion]=useState(null);
const[collapsedThreads,setCollapsedThreads]=useState(new Set());
const[discussionSaved,setDiscussionSaved]=useState([]);

// Capture text selection in Reader
useEffect(()=>{
  if(v!=="reader"||!readerContent)return;
  const handler=()=>{
    const sel=window.getSelection();
    if(!sel||sel.isCollapsed||!sel.toString().trim())return;
    const text=sel.toString().trim();
    if(text.length<5||text.length>500)return;
    const range=sel.getRangeAt(0);
    const rect=range.getBoundingClientRect();
    setHlPopover({text,x:rect.left+rect.width/2,y:rect.top-8});
  };
  document.addEventListener("mouseup",handler);
  return()=>document.removeEventListener("mouseup",handler);
},[v,readerContent]);

const addHighlight=(tag)=>{
  if(!hlPopover||!readerContent)return;
  const hl={id:++hlIdRef.current,text:hlPopover.text,tag,source:readerContent.title,readingId:readerContent.id,sectionIdx:readerSection,conceptId:readerContent.concepts?.[0]||null,ts:Date.now()};
  setHighlights(p=>[hl,...p].slice(0,100));
  setHlPopover(null);window.getSelection()?.removeAllRanges();
  flash("✓ Saved as "+tag,true);
  // Strengthen memory for related concept
  if(hl.conceptId&&(tag==="key idea"||tag==="evidence")){
    bump(hl.conceptId,.02);
  }
};

const hlTagColor=(tag)=>tag==="key idea"?"#ffd700":tag==="evidence"?"#06d6a0":tag==="confusing"?"#ff4466":tag==="quote"?"#a78bfa":tag==="example"?"#00f0ff":tag==="thesis fuel"?"#ffd700":tag==="revisit"?"#fb923c":"#6a6a9a";
const hlTagIcon=(tag)=>tag==="key idea"?"★":tag==="evidence"?"📌":tag==="confusing"?"?":tag==="quote"?"❝":tag==="example"?"◆":tag==="thesis fuel"?"✦":tag==="revisit"?"↻":"•";
const[sectionMarks,setSectionMarks]=useState({}); // {[readingId:sectionIdx]: "understood"|"revisit"|"confusing"|"important"}
const[readingPositions,setReadingPositions]=useState({}); // {[readingId]: lastSectionIdx}
const[sectionsRead,setSectionsRead]=useState({}); // {[readingId:sectionIdx]: true}
const readerScrollRef=useRef(null);

// True scrollspy — IntersectionObserver tracks which section is visible
useEffect(()=>{
  if(v!=="reader"||!readerContent)return;
  const observer=new IntersectionObserver((entries)=>{
    for(const entry of entries){
      if(entry.isIntersecting&&entry.intersectionRatio>=0.3){
        const idx=parseInt(entry.target.getAttribute("data-section-idx")||"0",10);
        setReaderSection(idx);
        setReadingPositions(p=>({...p,[readerContent.id]:idx}));
        markSectionRead(readerContent.id,idx);
        // Auto-scroll left rail to keep active section visible
        const railBtn=document.getElementById("rail-btn-"+idx);
        if(railBtn)railBtn.scrollIntoView({behavior:"smooth",block:"nearest"});
      }
    }
  },{root:readerScrollRef.current,threshold:[0.3],rootMargin:"-80px 0px -40% 0px"});
  // Observe all section elements
  const sections=document.querySelectorAll("[data-section-idx]");
  sections.forEach(el=>observer.observe(el));
  return()=>observer.disconnect();
},[v,readerContent]);

// Section mark helpers
const markSection=(readingId,sectionIdx,mark)=>{
  const key=readingId+":"+sectionIdx;
  setSectionMarks(p=>p[key]===mark?{...p,[key]:undefined}:{...p,[key]:mark});
};
const getSectionMark=(readingId,sectionIdx)=>sectionMarks[readingId+":"+sectionIdx];
const isSectionRead=(readingId,sectionIdx)=>sectionsRead[readingId+":"+sectionIdx];
const markSectionRead=(readingId,sectionIdx)=>setSectionsRead(p=>({...p,[readingId+":"+sectionIdx]:true}));
const getReadingProgress=(readingId,totalSections)=>{
  if(!totalSections)return 0;
  let read=0;
  for(let i=0;i<totalSections;i++)if(sectionsRead[readingId+":"+i])read++;
  return Math.round(read/totalSections*100);
};

const MODULES=data.modules;

// QUESTION GENERATION ENGINE — generates up to 100 per concept from templates
const generateQuestions=(conceptId,count,type)=>{
  const c=cc.find(x=>x.id===conceptId);if(!c)return[];
  if(!isRenderableConcept(c))return[];
  const pool=[];
  const primaryKeyword=normalizePanelText(c.kw[0]||c.name.toLowerCase());
  const safeTrap=normalizePanelText(c.trap||`Students often flatten ${c.name} into a generic course prompt.`);
  const safeDepth=normalizePanelText(c.depth||c.core);
  const safeDist=normalizePanelText(c.dist||c.core);
  const safeHook=normalizePanelText(c.hook||`Use ${c.name} as the lens for explaining what the source is trying to show.`);
  // Original hand-crafted questions
  if(type==="tf")c.tf.forEach(q=>pool.push({...q,source:"hand"}));
  if(type==="mc")c.mc.forEach(q=>pool.push({...q,source:"hand"}));
  // Generated cross-concept comparisons
  const others=cc.filter(x=>x.id!==c.id&&isRenderableConcept(x));
  if(type==="tf"){
    others.forEach(o=>{
      pool.push({statement:`${c.name} and ${o.name} are both part of the ${c.cat} tradition.`,answer:c.cat===o.cat,explanation:c.cat===o.cat?`Correct — both fall under ${c.cat}.`:`False — ${c.name} is ${c.cat} while ${o.name} is ${o.cat}.`,source:"gen"});
    });
    pool.push({statement:`${c.name} focuses primarily on ${primaryKeyword}.`,answer:true,explanation:`Correct — ${primaryKeyword} is central to ${c.name}.`,source:"gen"});
    pool.push({statement:`A key pitfall when studying ${c.name} is: ${safeTrap.split(".")[0]}.`,answer:true,explanation:`Correct — ${safeTrap}`,source:"gen"});
    pool.push({statement:`${c.name} applies only in academic writing contexts.`,answer:false,explanation:`Not specifically — ${safeDepth.split(".")[0]}.`,source:"gen"});
  }
  if(type==="mc"){
    others.slice(0,4).forEach(o=>{
      pool.push({question:`What is the key difference between ${c.name} and ${o.name}?`,options:[safeDist.split(".")[0]||`${c.name} has a distinct primary claim in this source`,normalizePanelText(o.dist||o.core).split(".")[0]||`${o.name} focuses on a different aspect of this topic`,"They are essentially identical","Neither has practical applications"],correctIndex:0,explanation:`${c.name}: ${c.core} vs ${o.name}: ${o.core}`,source:"gen"});
    });
    pool.push({question:`Which memory hook best captures ${c.name}?`,options:[safeHook,...others.slice(0,3).map(o=>normalizePanelText(o.hook||o.core))],correctIndex:0,explanation:`The correct hook for ${c.name}: ${safeHook}`,source:"gen"});
  }
  return takeStableSubset(pool,count,`${c.id}:${type}`);
};

useEffect(()=>{if(!launched)return;const t=setInterval(()=>{sessionTimeRef.current+=1;if(sessionTimerElRef.current){const s=sessionTimeRef.current;sessionTimerElRef.current.textContent=`⏱ ${Math.floor(s/60)}m ${s%60}s`;}},1000);return()=>clearInterval(t);},[launched]);
useEffect(()=>{
  setCC((current)=>{
    const currentMastery=new Map(current.map((c)=>[c.id,c.mastery]));
    const getNext=(id)=>Math.max(initialProgress.conceptMastery?.[id]??0,currentMastery.get(id)??0);
    const anyChange=CD.some((c)=>getNext(c.id)!==(currentMastery.get(c.id)??0));
    if(!anyChange)return current; // stable ref — no downstream re-render
    const currentMap=new Map(current.map((c)=>[c.id,c]));
    return CD.map((c)=>({...c,mastery:getNext(c.id)??currentMap.get(c.id)?.mastery??0}));
  });
  setDone((prev)=>{
    const next=completedConceptSet(CD,initialProgress);
    if(next.size===prev.size&&[...next].every((id)=>prev.has(id)))return prev;
    return next;
  });
},[CD,initialProgress]);
useEffect(()=>{
  const restoredSections={};
  const restoredPositions={};
  READING.forEach((reading)=>{
    const completion=initialProgress.chapterCompletion?.[reading.module]??initialProgress.chapterCompletion?.[reading.id]??0;
    const restoredCount=Math.max(0,Math.min(reading.sections.length,Math.round(completion*reading.sections.length)));
    for(let idx=0;idx<restoredCount;idx+=1){
      restoredSections[`${reading.id}:${idx}`]=true;
    }
    if(restoredCount>0){
      restoredPositions[reading.id]=restoredCount-1;
    }
  });
  setSectionsRead(restoredSections);
  setReadingPositions(restoredPositions);
},[READING,initialProgress]);
// Sync mastery back to parent for persistence
const prevProgressKeyRef=useRef(null);
useEffect(()=>{
  const mastery=Object.fromEntries(cc.map(c=>[c.id,c.mastery]));
  const key=JSON.stringify(mastery)+String(practiceMode);
  if(prevProgressKeyRef.current===key)return; // identical — skip to break render loop
  prevProgressKeyRef.current=key;
  onProgressUpdate({conceptMastery:mastery,practiceMode:Boolean(practiceMode)});
// eslint-disable-next-line react-hooks/exhaustive-deps
},[cc,practiceMode]);
const prevChapterKeyRef=useRef(null);
useEffect(()=>{
  const chapterCompletion=Object.fromEntries(
    READING
      .map((reading)=>[reading.module||reading.id,getReadingProgress(reading.id,reading.sections.length)/100])
      .sort((left,right)=>String(left[0]).localeCompare(String(right[0])))
  );
  const key=JSON.stringify(chapterCompletion);
  if(prevChapterKeyRef.current===key)return; // identical — skip to break render loop
  prevChapterKeyRef.current=key;
  onProgressUpdate({chapterCompletion});
// eslint-disable-next-line react-hooks/exhaustive-deps
},[READING,sectionsRead]);

// Keyboard shortcuts
useEffect(()=>{
  const handler=(e)=>{
    if(v!=="forge"||!fc)return;
    if(fp==="tf"&&ta===null){
      if(e.key==="t"||e.key==="T"){const q2=fc.tf[ti2];if(!q2)return;const ok=q2.answer;setTA(true);setSCO(s=>({c:s.c+(ok?1:0),w:s.w+(ok?0:1)}));recordAnswerFlow(ok,fc.id,q2);if(ok){bump(fc.id,.03);flash("✓ Correct!",true);}else{flash("✗ Not quite",false);}}
      if(e.key==="f"||e.key==="F"){const q2=fc.tf[ti2];if(!q2)return;const ok=!q2.answer;setTA(false);setSCO(s=>({c:s.c+(ok?1:0),w:s.w+(ok?0:1)}));recordAnswerFlow(ok,fc.id,q2);if(ok){bump(fc.id,.03);flash("✓ Correct!",true);}else{flash("✗ Not quite",false);}}
    }
    if(e.key===" "||e.key==="Enter"){
      if(fp==="intro"&&is2<3){e.preventDefault();setIS(p=>p+1);}
      if(fp==="tf"&&ta!==null){e.preventDefault();setTI(p=>p+1);setTA(null);}
      if(fp==="flash"){e.preventDefault();if(ff){setFI(p=>p+1);setFF(false);}else setFF(true);}
    }
  };
  window.addEventListener("keydown",handler);
  return()=>window.removeEventListener("keydown",handler);
},[v,fp,ta,ti2,is2,ff,fc]);

const go=useCallback((to,d)=>{
  setFade(false);
  setTimeout(()=>{
    setV(to);if(d?.c)setSC(d.c);if(d?.a)setSA(d.a);
    if(to==="explore"&&!d?.c){
      const pick=cc.filter(c=>!done.has(c.id)).sort((a,b)=>a.mastery-b.mastery)[0]||cc[0]||null;
      setSC(pick);
    }
    if(to==="forge"){
      const t=d?.c||cc.filter(c=>!done.has(c.id)&&c.mastery<.8).sort((a,b)=>a.mastery-b.mastery)[0]||cc[0];
      setFC(t);setFP("intro");setIS(0);setDC(null);setTI(0);setTA(null);setMI(0);setMA(null);setFI(0);setFF(false);setWS(null);setWD(new Set());setSCO({c:0,w:0});
    }
    setFade(true);
  },180);
},[cc,done]);

const bump=(id,d)=>setCC(p=>p.map(c=>c.id===id?{...c,mastery:Math.min(1,Math.max(0,c.mastery+d))}:c));
const flash=(m,g)=>{setToast({m,g});setTimeout(()=>setToast(null),2200);};
const triggerCelebration=()=>{setShowCelebration(true);setTimeout(()=>setShowCelebration(false),3000);};
const openReader=(contentId)=>{const r=READING.find(x=>x.id===contentId);if(r){setReaderContent(r);setReaderSection(readingPositions[contentId]||0);setReaderUtilOpen(false);go("reader");}};
const openReaderForChapter=(moduleId,chapterIdx)=>{const chapters=READING.filter(x=>x.module===moduleId);const r=chapters[chapterIdx]||chapters[0];if(r){setReaderContent(r);setReaderSection(readingPositions[r.id]||0);setReaderUtilOpen(false);go("reader");}};
const openTranscript=(txId)=>{const t=TRANSCRIPTS.find(x=>x.id===txId);if(t){setTranscript(t);setTxTime(0);setTxPlaying(false);go("transcript");}};
const formatTime=(s)=>{const m=Math.floor(s/60);const sec=Math.floor(s%60);return m+":"+String(sec).padStart(2,"0");};

// Simulated playback timer
useEffect(()=>{if(!txPlaying||!transcript)return;const t=setInterval(()=>{setTxTime(p=>{if(p>=transcript.duration){setTxPlaying(false);return transcript.duration;}return p+1;});},1000);return()=>clearInterval(t);},[txPlaying,transcript]);
const mastered=cc.filter(c=>c.mastery>=.8).length;
const avg=cc.length>0?cc.reduce((s,c)=>s+c.mastery,0)/cc.length:0;
const nextA=[...ASSIGNMENTS].sort((a,b)=>a.due-b.due)[0];

const askO=()=>{if(!oq.trim())return;const w=oq.toLowerCase().split(/\s+/).filter(x=>x.length>2);
  setOR(PH.map((p,pi)=>{let b=null,bs=0;p.q.forEach(q=>{let s=0;w.forEach(x=>{if(q.tg.some(t=>t.includes(x)||x.includes(t)))s+=3;if(q.x.toLowerCase().includes(x))s+=1;});if(s>bs){bs=s;b=q;}});if(!b&&p.q.length)b=p.q[stableHash(`${p.n}:${pi}:${oq}`)%p.q.length];return{...p,sq:b,r:bs};}).sort((a,b)=>b.r-a.r||a.n.localeCompare(b.n)));};

// STYLES
const B="#020208",CD2="rgba(16,16,36,0.94)",BD="rgba(50,50,100,0.55)",CY="#00f0ff",TL="#06d6a0",GD="#ffd700",RD="#ff4466",TX="#e0e0ff",T2="#b8b8d8",MU="#6a6a9a",DM="#2a2a4a";
const card={background:CD2,border:`1px solid ${BD}`,borderRadius:24,padding:"44px 50px",boxShadow:"0 8px 40px rgba(0,0,0,0.5)"};
const ey={fontSize:".84rem",fontWeight:800,letterSpacing:".2em",textTransform:"uppercase",color:MU,marginBottom:20,fontFamily:"'Space Grotesk',sans-serif"};
const hd=s=>({fontSize:s+"rem",fontWeight:700,margin:0,lineHeight:1.3,color:TX,fontFamily:"'Space Grotesk','Inter',sans-serif"});
const bt=(bg,fg)=>({background:bg,color:fg,border:"none",padding:"16px 38px",borderRadius:16,fontWeight:700,fontSize:".95rem",cursor:"pointer",letterSpacing:".04em",transition:"all 220ms cubic-bezier(.22,1,.36,1)"});
const innr="rgba(22,22,48,0.7)";
const flowColor=flowState==="flow"?CY:flowState==="struggling"?"#60a5fa":flowState==="cruising"?TL:MU;
const flowExplanationDensity=flowState==="struggling"?"full":flowState==="flow"?"minimal":"normal";
const flowShouldShowHint=flowState==="struggling"||flowState==="cold";
const flowFeedbackIntensity=flowState==="flow"?"vivid":flowState==="struggling"?"gentle":"normal";
const flowCardGlow=flowState==="flow"?`0 0 ${40+flowIntensity*40}px ${CY}${Math.round(flowIntensity*20).toString(16).padStart(2,"0")}`:flowState==="struggling"?`0 0 30px rgba(96,165,250,.08)`:"none";
const flowBorderColor=flowState==="flow"?`${CY}${Math.round(30+flowIntensity*40).toString(16).padStart(2,"0")}`:flowState==="struggling"?"rgba(96,165,250,.2)":BD;
const sectionMarkIcon=(mark)=>mark==="understood"?"✓":mark==="revisit"?"↻":mark==="confusing"?"?":mark==="important"?"★":"";
const sectionMarkColor=(mark)=>mark==="understood"?TL:mark==="revisit"?"#fb923c":mark==="confusing"?RD:mark==="important"?GD:MU;
const thesisTemplates={
  "Apply":[
    "When applied to [case], [framework] reveals that [claim] because [reason].",
    "[Framework] would judge [case] as [moral verdict] because [core principle applies how].",
    "Although [framework] initially supports [action], closer analysis shows [complication]."
  ],
  "Compare":[
    "[Framework A] and [Framework B] diverge on [issue] because [A prioritizes X] while [B prioritizes Y].",
    "While both [A] and [B] condemn [action], they do so for fundamentally different reasons.",
    "The tension between [A] and [B] on [issue] reveals that [deeper insight]."
  ],
  "Defend":[
    "[Position] is defensible because [reason], despite the objection that [counterpoint].",
    "The strongest case for [position] rests on [principle], which withstands [objection] because [rebuttal].",
    "Although [opposing view] seems compelling, [position] better accounts for [evidence]."
  ],
  "Synthesize":[
    "Examining [case] through [A], [B], and [C] reveals that [shared insight], though they disagree on [tension point].",
    "No single framework captures the full moral complexity of [case]; together, [A] and [B] illuminate [insight].",
    "The convergence of [A] and [B] on [point] suggests [deeper principle], while their divergence on [point] shows [limitation]."
  ]
};

const paraTypes=[
  {id:"frame",label:"Framing",icon:"🎯",desc:"Set up the issue and why it matters",color:CY},
  {id:"claim",label:"Central Claim",icon:"💡",desc:"State your main argument",color:TL},
  {id:"evidence",label:"Evidence / Application",icon:"📌",desc:"Apply framework to your case",color:"#a78bfa"},
  {id:"objection",label:"Counterargument",icon:"⚔",desc:"Address the strongest objection",color:"#fb923c"},
  {id:"rebuttal",label:"Rebuttal",icon:"🛡",desc:"Respond to the counterargument",color:GD},
  {id:"synthesis",label:"Synthesis",icon:"🔗",desc:"Connect frameworks or deepen analysis",color:"#f472b6"},
  {id:"close",label:"Conclusion",icon:"🏁",desc:"Tie together and reaffirm thesis",color:TL},
];

return(<div style={{minHeight:"100dvh",background:B,backgroundImage:"radial-gradient(ellipse at 50% 0%,#0c0c2a 0%,#060614 40%,#020208 65%)",color:TX,fontFamily:"'Inter',system-ui,sans-serif",fontSize:"18px",position:"relative",overflow:"clip"}}>
{/* Ambient glow orbs */}
<div style={{position:"fixed",top:"-20%",left:"-10%",width:"50vw",height:"50vw",borderRadius:"50%",background:"radial-gradient(circle,rgba(0,240,255,.03) 0%,transparent 70%)",pointerEvents:"none",zIndex:0,animation:"gradientMove 20s ease infinite"}}/>
<div style={{position:"fixed",bottom:"-30%",right:"-10%",width:"60vw",height:"60vw",borderRadius:"50%",background:"radial-gradient(circle,rgba(6,214,160,.02) 0%,transparent 70%)",pointerEvents:"none",zIndex:0,animation:"gradientMove 25s ease infinite reverse"}}/>

{/* WELCOME — immersive quadrant entry with material ripple */}
{!launched&&<div style={{minHeight:"100dvh",position:"relative",zIndex:10,overflow:"hidden"}}>
  {/* Four large quadrant cards as background */}
  <div style={{position:"absolute",inset:0,display:"grid",gridTemplateColumns:"1fr 1fr",gridTemplateRows:"1fr 1fr",gap:2,zIndex:1}}>
    {[
      {ic:"⚡",t:"Quick Session",s:"5 minutes to sharpen one concept",c:CY,g:"rgba(0,240,255,.05)",tg:"forge"},
      {ic:"📝",t:"Assignment Prep",s:"Get ready for what's due next",c:TL,g:"rgba(6,214,160,.05)",tg:"home"},
      {ic:"🧠",t:"Deep Understanding",s:"Really learn how these ideas connect",c:"#a78bfa",g:"rgba(167,139,250,.05)",tg:"explore"},
      {ic:"🌊",t:"Calm Start",s:"No pressure — ease into learning",c:"#60a5fa",g:"rgba(96,165,250,.05)",tg:"home"},
    ].map((p,i)=>(
      <button key={i} onMouseEnter={()=>setHoverCard(i)} onMouseLeave={()=>setHoverCard(null)}
        onClick={(e)=>{const r=e.currentTarget.getBoundingClientRect();setRipple({x:e.clientX-r.left,y:e.clientY-r.top,i,t:Date.now()});setTimeout(()=>{setLaunched(true);if(p.tg!=="home")setTimeout(()=>go(p.tg),200);},700);}}
        style={{position:"relative",overflow:"hidden",background:hoverCard===i?p.g:"rgba(4,4,12,.5)",border:"none",cursor:"pointer",color:TX,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",padding:48,textAlign:"center",transition:"all 700ms cubic-bezier(.22,1,.36,1)",opacity:hoverCard!==null&&hoverCard!==i?.25:1}}>
        {ripple&&ripple.i===i&&<div key={ripple.t} style={{position:"absolute",left:ripple.x,top:ripple.y,width:0,height:0,borderRadius:"50%",background:`${p.c}18`,transform:"translate(-50%,-50%)",animation:"rippleExpand .9s ease forwards",pointerEvents:"none"}}/>}
        {hoverCard===i&&<div style={{position:"absolute",inset:0,background:`radial-gradient(circle at 50% 50%,${p.c}08,transparent 70%)`,pointerEvents:"none"}}/>}
        <div style={{fontSize:"4rem",marginBottom:20,transition:"all 500ms cubic-bezier(.22,1,.36,1)",transform:hoverCard===i?"scale(1.2) translateY(-8px)":"scale(1)",filter:hoverCard===i?"drop-shadow(0 0 20px "+p.c+"44)":"brightness(.6)"}}>{p.ic}</div>
        <div style={{fontSize:"1.6rem",fontWeight:700,fontFamily:"'Space Grotesk',sans-serif",color:hoverCard===i?p.c:TX,transition:"all 500ms",marginBottom:10}}>{p.t}</div>
        <div style={{fontSize:"1.05rem",color:hoverCard===i?T2:MU,transition:"all 500ms",maxWidth:300,lineHeight:1.6}}>{p.s}</div>
      </button>
    ))}
  </div>
  {/* Center floating panel */}
  <div style={{position:"absolute",inset:0,zIndex:5,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
    <div style={{pointerEvents:"auto",textAlign:"center",padding:"44px 56px",borderRadius:28,background:"rgba(4,4,12,.9)",backdropFilter:"blur(40px)",border:`1px solid ${BD}`,boxShadow:"0 20px 100px rgba(0,0,0,.7)",maxWidth:520,animation:"fadeUp .6s ease"}}>
      <div style={{fontSize:"2.6rem",fontWeight:900,letterSpacing:".22em",color:CY,textShadow:`0 0 40px rgba(0,240,255,.4)`,marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}}>AEONTHRA</div>
      <div style={{fontSize:".78rem",letterSpacing:".3em",color:MU,textTransform:"uppercase",marginBottom:28}}>Neural Learning System</div>
      <h1 style={{fontSize:"1.4rem",fontWeight:600,color:TX,lineHeight:1.5,marginBottom:6}}>{COURSE.title}</h1>
      <p style={{fontSize:".9rem",color:MU,marginBottom:24}}>{COURSE.code} · {COURSE.term}</p>
      <div style={{padding:"14px 20px",borderRadius:14,background:`${TL}08`,border:`1px solid ${TL}15`,marginBottom:24}}>
        <p style={{fontSize:".92rem",color:TL,lineHeight:1.6,margin:0,fontStyle:"italic"}}>"One concept. One question. One small win."</p>
      </div>
      <p style={{fontSize:".82rem",color:MU,marginBottom:16}}>Hover a quadrant to begin, or:</p>
      <button onClick={()=>setLaunched(true)} style={{background:`linear-gradient(135deg,${CY},#0060ee)`,color:"#000",border:"none",padding:"14px 40px",borderRadius:14,fontWeight:800,fontSize:".95rem",letterSpacing:".06em",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>Enter →</button>
    </div>
  </div>
</div>}

{launched&&<>
<nav style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 48px",borderBottom:`1px solid ${navScrolled?"rgba(0,240,255,.18)":"rgba(0,240,255,.07)"}`,position:"sticky",top:0,zIndex:100,background:navScrolled?"rgba(6,6,18,.98)":"rgba(8,8,20,.92)",backdropFilter:"blur(24px)",boxShadow:navScrolled?"0 4px 32px rgba(0,0,0,.7)":"none",transition:"background 300ms ease, box-shadow 300ms ease, border-color 300ms ease"}}>
  <div style={{display:"flex",alignItems:"center",gap:20}}>
    <span style={{fontWeight:900,fontSize:"1.6rem",letterSpacing:".16em",color:CY,textShadow:`0 0 36px rgba(0,240,255,.35)`,fontFamily:"'Space Grotesk',sans-serif"}}>AEONTHRA</span>
    <span style={{fontSize:".78rem",letterSpacing:".14em",color:MU,border:"1px solid #222255",padding:"5px 14px",borderRadius:20}}>{COURSE.code}</span>
    {launched&&<span ref={sessionTimerElRef} style={{fontSize:".75rem",color:MU,marginLeft:8}}>⏱ 0m 0s</span>}
  </div>
  <div style={{display:"flex",gap:4}}>
    {[["home","Home"],["journey","Atlas"],["explore","Concepts"],["forge","Learn"],["reader","Read"],["gym","Gym"],["oracle","Oracle"]].map(([id,lb])=>(
      <button key={id} onClick={()=>go(id)} style={{background:v===id?"rgba(0,240,255,.1)":"transparent",border:"none",color:v===id?CY:MU,padding:"12px 18px",borderRadius:14,cursor:"pointer",fontSize:".85rem",fontWeight:600,transition:"all 200ms"}}>{lb}</button>
    ))}
    <button onClick={()=>go("settings")} title="Settings" style={{background:v==="settings"?"rgba(0,240,255,.1)":"transparent",border:"none",color:v==="settings"?CY:MU,padding:"12px 14px",borderRadius:14,cursor:"pointer",fontSize:".88rem",opacity:.65,transition:"all 200ms"}}>⚙</button>
  </div>
</nav>

{toast&&<div style={{position:"fixed",top:88,left:"50%",transform:"translateX(-50%)",padding:"14px 36px",borderRadius:18,background:toast.g?`${TL}1a`:`${RD}1a`,border:`2px solid ${toast.g?TL:RD}`,color:toast.g?TL:RD,fontSize:".95rem",fontWeight:700,zIndex:200,animation:"fadeUp .3s ease",boxShadow:`0 8px 32px ${toast.g?TL:RD}22`,display:"flex",alignItems:"center",gap:12}}>
  {toast.m}
  {streak>=3&&toast.g&&<span style={{fontSize:"1.1rem"}}>{"🔥".repeat(Math.min(Math.floor(streak/3),5))}</span>}
  {streak>=3&&toast.g&&<span style={{color:GD,fontWeight:800}}>{streak}x</span>}
</div>}

{/* CELEBRATION OVERLAY */}
{showCelebration&&<div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(2,2,8,.9)",animation:"fadeUp .5s ease",overflow:"hidden"}}>
  {/* Floating particles */}
  {[...Array(20)].map((_,i)=>(<div key={i} style={{position:"absolute",fontSize:["🔥","⭐","✨","💫","🏆"][i%5],left:`${(i*17)%100}%`,bottom:"-10%",animation:`floatParticle ${2+(i%4)}s ease ${(i%3)*.35}s infinite`,opacity:.8}}>{["🔥","⭐","✨","💫","🏆"][i%5]}</div>))}
  <div style={{textAlign:"center",position:"relative",zIndex:1}}>
    <div style={{fontSize:"5rem",marginBottom:24,animation:"float 1.5s ease infinite"}}>🏆</div>
    <h2 style={{fontSize:"2.8rem",fontWeight:900,background:`linear-gradient(135deg,${CY},${TL},${GD})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontFamily:"'Space Grotesk',sans-serif",marginBottom:16,animation:"completionBloom .8s ease, celebrate 1.2s ease"}}>CONCEPT MASTERED</h2>
    <div style={{fontSize:"1.5rem",color:GD,fontWeight:700,marginBottom:12}}>{"🔥".repeat(10)}</div>
    <p style={{color:TX,fontSize:"1.2rem",fontWeight:600}}>Streak: {streak}x · Best: {bestStreak}x</p>
    {totalAnswered>0&&<p style={{color:T2,fontSize:"1rem",marginTop:8}}>Session: {Math.round(totalCorrect/totalAnswered*100)}% accuracy across {totalAnswered} questions</p>}
    <div style={{marginTop:32}}>
      <button onClick={()=>setShowCelebration(false)} style={{...bt(`linear-gradient(135deg,${GD},#cc8800)`,"#000"),fontSize:"1.1rem",padding:"18px 48px"}}>Continue →</button>
    </div>
  </div>
</div>}

<main style={{maxWidth:1440,margin:"0 auto",padding:"44px 48px 140px",opacity:fade?1:0,transition:"opacity 180ms ease"}}>

{/* HOME */}
{v==="home"&&<>

{/* Source quality banner — only shown when synthesis quality is degraded */}
{SYNTHESIS?.qualityBanner&&<div style={{background:"rgba(251,146,60,.12)",border:"1px solid rgba(251,146,60,.35)",borderRadius:10,padding:"12px 18px",marginBottom:24,fontSize:".9rem",color:"#fb923c",lineHeight:1.6}}>
  {SYNTHESIS.qualityBanner}
</div>}

{/* Supportive greeting */}
<div style={{textAlign:"center",marginBottom:36,animation:"fadeUp .4s ease"}}>
  <h1 style={{...hd(1.8),marginBottom:10}}>{avg>0?"Welcome back.":"Let's get started."}</h1>
  <p style={{color:T2,fontSize:"1.1rem",lineHeight:1.7,maxWidth:600,margin:"0 auto"}}>
    {avg===0?"Every expert started at zero. Pick one concept, answer one question, and the rest follows.":
     avg<.3?"You've started building your foundation. Keep going — every answer strengthens it.":
     avg<.6?"You're making real progress. The concepts are starting to connect.":
     avg<.8?"You're in strong shape. A few more sessions and you'll be fully prepared.":
     "You've mastered the core material. Time to apply it with confidence."}
  </p>
</div>

{/* Progress ring + stats */}
<div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:56,marginBottom:40,animation:"fadeUp .5s ease"}}>
  <div style={{position:"relative",width:110,height:110}}>
    <svg viewBox="0 0 110 110" style={{width:110,height:110}}>
      <circle cx="55" cy="55" r="48" fill="none" stroke={DM} strokeWidth="5"/>
      <circle cx="55" cy="55" r="48" fill="none" stroke={avg>=.8?GD:avg>=.5?TL:CY} strokeWidth="5" strokeDasharray={`${avg*301} 301`} strokeLinecap="round" transform="rotate(-90 55 55)" style={{transition:"stroke-dasharray 1.2s ease",filter:`drop-shadow(0 0 8px ${avg>=.8?GD:avg>=.5?TL:CY}55)`}}/>
    </svg>
    <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
      <div style={{fontSize:"1.6rem",fontWeight:800,color:TX,fontFamily:"'Space Grotesk',sans-serif"}}>{P(avg)}</div>
      <div style={{fontSize:".62rem",color:MU,letterSpacing:".1em"}}>OVERALL</div>
    </div>
  </div>
  <div style={{display:"flex",gap:36}}>
    {[[mastered+"/"+cc.length,"Mastered","🏆"],[done.size+"/"+cc.length,"Learned","🧠"],[bestStreak>0?bestStreak+"x":"—","Streak","🔥"],[totalAnswered>0?Math.round(totalCorrect/totalAnswered*100)+"%":"—","Accuracy","🎯"]].map(([val,lb,ic],i)=>(
      <div key={i} style={{textAlign:"center"}}>
        <div style={{fontSize:".95rem",marginBottom:4}}>{ic}</div>
        <div style={{fontSize:"1.5rem",fontWeight:700,fontVariantNumeric:"tabular-nums",fontFamily:"'Space Grotesk',sans-serif"}}>{val}</div>
        <div style={{fontSize:".68rem",color:MU,letterSpacing:".1em",textTransform:"uppercase",marginTop:3}}>{lb}</div>
      </div>
    ))}
  </div>
</div>

{/* Quick paths strip */}
<div style={{display:"flex",gap:12,marginBottom:32,animation:"fadeUp .55s ease",justifyContent:"center"}}>
  {[
    ["⚡","Quick 5-min review",()=>go("forge")],
    ["📝","Assignment prep",()=>{if(nextA)go("assignment",{a:nextA});}],
    ["🗺","Journey map",()=>go("journey")],
    ["🧠","Explore concepts",()=>go("explore")],
    ["📚","Library",()=>go("courseware")],
    ["📊","My stats",()=>go("stats")],
  ].map(([ic,lb,fn])=>(
    <button key={lb} onClick={fn} style={{padding:"14px 22px",borderRadius:16,border:`1px solid ${BD}`,background:CD2,cursor:"pointer",color:TX,fontSize:".88rem",fontWeight:500,transition:"all 250ms",display:"flex",alignItems:"center",gap:8}}>
      <span style={{fontSize:"1.1rem"}}>{ic}</span>{lb}
    </button>
  ))}
</div>

{/* YOUR NEXT WIN — the single most important card */}
{nextA&&<div style={{...card,marginBottom:28,borderLeft:`5px solid ${CY}`,background:`linear-gradient(90deg,rgba(0,240,255,.05),${CD2})`,boxShadow:`0 8px 48px rgba(0,240,255,.06)`,animation:"fadeUp .6s ease"}}>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:24,flexWrap:"wrap"}}>
    <div style={{flex:1,minWidth:320}}>
      <div style={{...ey,color:CY,fontFamily:"'Space Grotesk',sans-serif"}}>🎯 YOUR NEXT WIN</div>
      <h2 style={hd(1.35)}>{nextA.title}: {nextA.sub}</h2>
      <p style={{color:MU,fontSize:".9rem",marginTop:8}}>{nextA.type} {nextA.pts}pts · Due in {nextA.due} days</p>

      {/* Why this matters */}
      <div style={{marginTop:16,padding:"16px 20px",borderRadius:14,background:"rgba(255,255,255,.02)",border:`1px solid ${BD}`}}>
        <div style={{fontSize:".72rem",fontWeight:700,letterSpacing:".12em",color:TL,marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}}>WHY THIS MATTERS</div>
        <p style={{color:T2,fontSize:".92rem",lineHeight:1.65,margin:0}}>{nextA.tip||"Completing this strengthens your foundation for everything that comes after."}</p>
      </div>

      {/* What you need — supportive framing */}
      {(()=>{const needed=nextA.con.map(id=>cc.find(c=>c.id===id)).filter(Boolean);const ready=needed.filter(c=>c.mastery>=.6);const notReady=needed.filter(c=>c.mastery<.6);
        return(<div style={{marginTop:16}}>
          {ready.length>0&&<p style={{color:TL,fontSize:".88rem",marginBottom:6}}>✓ You already know {ready.map(c=>c.name).join(", ")}</p>}
          {notReady.length>0?<p style={{color:CY,fontSize:".88rem"}}>→ {notReady.length===1?"Just one concept":""+notReady.length+" concepts"} to prepare: {notReady.map(c=>c.name).join(", ")}. About {notReady.length*5} minutes of learning.</p>:
            <p style={{color:TL,fontSize:".92rem",fontWeight:600}}>✓ You're ready for this. All required concepts are prepared.</p>}
        </div>);
      })()}
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:10,alignItems:"flex-end"}}>
      {(()=>{const notReady=nextA.con.filter(id=>(cc.find(c=>c.id===id)?.mastery??0)<.6);
        return notReady.length>0?
          <button onClick={()=>go("forge")} style={{...bt(`linear-gradient(135deg,${CY},#0066ff)`,"#000"),animation:"glow 3s ease infinite"}}>⚡ Prepare now ({notReady.length*5} min)</button>:
          <button onClick={()=>go("assignment",{a:nextA})} style={bt(`linear-gradient(135deg,${TL},#00b088)`,"#000")}>✓ Open Assignment</button>;
      })()}
      <button onClick={()=>go("journey")} style={{...bt("transparent",MU),border:`1px solid ${BD}`,padding:"10px 22px",fontSize:".82rem"}}>See full path →</button>
    </div>
  </div>
</div>}

{/* "You're closer than you think" readiness strip */}
<div style={{...card,marginBottom:28,padding:"28px 36px",animation:"fadeUp .65s ease"}}>
  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
    <div style={{...ey,color:TL,margin:0,fontFamily:"'Space Grotesk',sans-serif"}}>📊 ASSIGNMENT READINESS</div>
    <span style={{fontSize:".82rem",color:MU}}>How prepared you are for each task</span>
  </div>
  {ASSIGNMENTS.map(a=>{const readiness=a.con.length?Math.round(a.con.reduce((s,id)=>s+Math.min(1,(cc.find(c=>c.id===id)?.mastery??0)/.6),0)/a.con.length*100):100;const urgent=a.due<=3;
    return(<button key={a.id} onClick={()=>go("assignment",{a})} style={{display:"flex",alignItems:"center",gap:16,padding:"14px 18px",background:innr,border:`1px solid ${urgent?`${RD}33`:BD}`,borderRadius:16,cursor:"pointer",width:"100%",color:TX,transition:"all 250ms",marginBottom:8}}>
      <span style={{fontSize:"1.3rem",width:36}}>{a.type}</span>
      <div style={{flex:1,textAlign:"left"}}>
        <div style={{fontSize:".92rem",fontWeight:600}}>{a.title}</div>
        <div style={{width:"100%",height:4,borderRadius:2,background:DM,marginTop:6,overflow:"hidden"}}><div style={{height:"100%",borderRadius:2,background:readiness>=100?TL:readiness>50?CY:"#ff8800",width:readiness+"%",transition:"width 500ms ease"}}/></div>
      </div>
      <div style={{textAlign:"right",minWidth:70}}>
        <div style={{fontSize:"1.1rem",fontWeight:800,color:readiness>=100?TL:readiness>50?CY:"#ff8800",fontFamily:"'Space Grotesk',sans-serif"}}>{readiness}%</div>
        <div style={{fontSize:".65rem",color:urgent?RD:MU}}>{urgent?"⚠ "+a.due+"d":a.due+"d left"}</div>
      </div>
    </button>);
  })}
</div>

<div style={{animation:"fadeUp .7s ease"}}>
  {/* Module Progress Strip */}
  <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:14,marginBottom:28}}>
    {MODULES.map(m=>{
      const mConcepts=m.concepts.map(id=>cc.find(c=>c.id===id)).filter(Boolean);
      const mAvg=mConcepts.length?mConcepts.reduce((s,c)=>s+c.mastery,0)/mConcepts.length:0;
      const allDone=mConcepts.every(c=>done.has(c.id));
      return(
        <button key={m.id} onClick={()=>go("courseware")} style={{...card,padding:"22px 18px",textAlign:"center",cursor:"pointer",borderTop:`3px solid ${allDone?GD:mAvg>.5?TL:mAvg>0?CY:BD}`,transition:"all 250ms"}}>
          <div style={{fontSize:allDone?"1.3rem":".9rem",marginBottom:8}}>{allDone?"🔥":mAvg>.5?"⚡":"📖"}</div>
          <div style={{fontSize:".72rem",fontWeight:700,color:allDone?GD:mAvg>.5?TL:CY,letterSpacing:".08em",fontFamily:"'Space Grotesk',sans-serif"}}>{m.ch.replace("Chapters ","Ch ").replace("Chapter ","Ch ")}</div>
          <div style={{fontSize:"1.3rem",fontWeight:800,color:TX,margin:"6px 0",fontFamily:"'Space Grotesk',sans-serif"}}>{P(mAvg)}</div>
          <div style={{height:4,borderRadius:2,background:DM,overflow:"hidden"}}><div style={{height:"100%",borderRadius:2,background:allDone?GD:mc2(mAvg),width:P(mAvg),transition:"width 600ms cubic-bezier(.22,1,.36,1)"}}/></div>
        </button>
      );
    })}
  </div>

  {/* Concept Mastery Grid */}
  <div style={{...card,padding:"32px 36px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{...ey,margin:0,fontFamily:"'Space Grotesk',sans-serif"}}>CONCEPT MASTERY</div>
      <span style={{fontSize:".82rem",color:MU}}>{done.size} completed · {mastered} mastered</span>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      {cc.map(c=>(
        <button key={c.id} onClick={()=>go("explore",{c})} style={{display:"flex",alignItems:"center",gap:12,background:innr,border:`1px solid ${BD}`,borderRadius:14,padding:"14px 18px",cursor:"pointer",color:TX,fontSize:".92rem",textAlign:"left",width:"100%",transition:"all 250ms"}}>
          <span style={{fontSize:".72rem",width:16,textAlign:"center"}}>{memoryStageIcon(getMemoryStage(c.id))}</span>
          <span style={{flex:1,fontWeight:500}}>{c.name}</span>
          {done.has(c.id)&&<span style={{fontSize:".85rem"}}>🔥</span>}
          <div style={{width:80,height:5,borderRadius:3,background:DM,overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,background:mc2(c.mastery),width:P(c.mastery),transition:"width 600ms cubic-bezier(.22,1,.36,1)"}}/></div>
          <span style={{color:mc2(c.mastery),fontSize:".82rem",fontWeight:700,width:40,textAlign:"right"}}>{c.mastery>0?P(c.mastery):"—"}</span>
        </button>
      ))}
    </div>
  </div>
</div>
</>}

{/* COURSE ATLAS */}
{v==="journey"&&<div style={{marginLeft:-44,marginRight:-44,marginTop:-48}}>
  <div style={{padding:"28px 48px",background:"rgba(8,8,20,.85)",borderBottom:`1px solid ${BD}`,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:68,zIndex:40,backdropFilter:"blur(16px)"}}>
    <div><h2 style={{...hd(1.5),marginBottom:4}}>Course Atlas</h2><p style={{color:MU,fontSize:".88rem"}}>Each module climbs higher — scroll right and upward toward mastery</p></div>
    <div style={{display:"flex",gap:24,alignItems:"center"}}>
      <button onClick={()=>go("courseware")} style={{padding:"8px 18px",borderRadius:12,border:`1px solid ${BD}`,background:"transparent",color:MU,fontSize:".82rem",fontWeight:600,cursor:"pointer",transition:"all 200ms"}}>📚 Library</button>
      <div style={{fontSize:"1.4rem",fontWeight:800,color:avg>=.8?GD:avg>=.5?TL:CY,fontFamily:"'Space Grotesk',sans-serif"}}>{P(avg)}</div>
      <div style={{width:160,height:10,borderRadius:5,background:DM,overflow:"hidden"}}><div style={{height:"100%",borderRadius:5,background:`linear-gradient(90deg,${CY},${TL},${GD})`,width:P(avg),transition:"width 800ms ease"}}/></div>
      <span style={{fontSize:".88rem",color:MU}}>{done.size}/{cc.length}</span>
    </div>
  </div>
  <div ref={atlasScrollRef} style={{overflowX:"auto",overflowY:"auto",padding:"40px 56px 80px",minHeight:"calc(100dvh - 132px)",scrollbarWidth:"thin",scrollbarColor:`${BD} transparent`}}>
    <div style={{display:"flex",gap:28,minWidth:"max-content",alignItems:"flex-end",paddingTop:"max(160px,calc(100dvh - 640px))"}}>
      {MODULES.map((m,mi)=>{
        const mC=m.concepts.map(id=>cc.find(c=>c.id===id)).filter(Boolean);
        const mA=mC.length?mC.reduce((s,c)=>s+c.mastery,0)/mC.length:0;
        const aD=mC.every(c=>done.has(c.id));
        const mAs=ASSIGNMENTS.filter(a=>a.con.some(id=>m.concepts.includes(id)));
        const climb=mi*60;
        return(<div key={m.id} style={{width:500,flexShrink:0,transform:`translateY(-${climb}px)`,transition:"transform 800ms cubic-bezier(.22,1,.36,1)",position:"relative"}}>
          {/* Ascending connector line */}
          {mi>0&&<svg style={{position:"absolute",top:-35-70,left:-36,width:72,height:105,overflow:"visible",zIndex:0}} viewBox="0 0 72 105">
            <path d={`M 72 105 Q 36 52 0 0`} fill="none" stroke={MODULES[mi-1]&&cc.filter(c=>MODULES[mi-1].concepts.includes(c.id)).every(c=>done.has(c.id))?GD:`${MU}44`} strokeWidth="3" strokeDasharray={MODULES[mi-1]&&cc.filter(c=>MODULES[mi-1].concepts.includes(c.id)).every(c=>done.has(c.id))?"":"8 6"} strokeLinecap="round"/>
          </svg>}
          <div style={{...card,padding:"32px 28px",marginBottom:20,borderTop:`4px solid ${aD?GD:mA>.5?TL:mA>0?CY:BD}`,boxShadow:aD?`0 0 32px ${GD}15, 0 0 60px ${GD}08`:`0 8px 40px rgba(0,0,0,.5)`,transition:"all 600ms"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <div>
                <div style={{fontSize:aD?"1.6rem":"1.2rem",marginBottom:8}}>{aD?"🔥":mA>.5?"⚡":"📖"}</div>
                <h3 style={{...hd(1.15),fontFamily:"'Space Grotesk',sans-serif"}}>{m.title}</h3>
                <p style={{color:MU,fontSize:".82rem",marginTop:4}}>{m.pages}</p>
              </div>
              <div style={{textAlign:"right"}}><div style={{fontSize:"1.6rem",fontWeight:800,color:aD?GD:mA>.5?TL:CY,fontFamily:"'Space Grotesk',sans-serif"}}>{P(mA)}</div></div>
            </div>
            <div style={{height:6,borderRadius:3,background:DM,overflow:"hidden",marginBottom:16}}><div style={{height:"100%",borderRadius:3,background:aD?`linear-gradient(90deg,${GD},#ff8800)`:mA>.5?TL:CY,width:P(mA),transition:"width 800ms ease"}}/></div>
            <p style={{fontSize:".88rem",color:T2,lineHeight:1.6,margin:0}}>{m.desc}</p>
          </div>
          {m.textbook.map((ch,ci)=>(<div key={ci} style={{padding:"20px 24px",borderRadius:18,background:innr,border:`1px solid ${BD}`,marginBottom:12,marginLeft:24,borderLeft:`3px solid ${BD}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:".72rem",fontWeight:700,color:MU,fontFamily:"'Space Grotesk',sans-serif"}}>📖 CHAPTER</span><button onClick={()=>openReaderForChapter(m.id,ci)} style={{padding:"4px 12px",borderRadius:8,border:`1px solid ${CY}33`,background:`${CY}08`,color:CY,fontSize:".7rem",fontWeight:600,cursor:"pointer"}}>Read →</button></div>
            <div style={{fontSize:".95rem",fontWeight:600,margin:"6px 0"}}>{ch.title}</div>
            <p style={{fontSize:".85rem",color:T2,lineHeight:1.6,margin:0}}>{ch.summary}</p>
          </div>))}
          <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:20}}>
            {mC.map(c=>{const dn2=done.has(c.id),act2=c.mastery>0&&!dn2;
              return(<button key={c.id} onClick={()=>dn2?go("explore",{c}):go("forge",{c})} style={{display:"flex",alignItems:"center",gap:16,padding:"20px 24px",borderRadius:18,background:dn2?`${GD}08`:act2?`${CY}06`:innr,border:`2px solid ${dn2?`${GD}44`:act2?`${CY}33`:BD}`,cursor:"pointer",color:TX,width:"100%",textAlign:"left",transition:"all 400ms",boxShadow:dn2?`0 0 20px ${GD}15`:"none"}}>
                <div style={{position:"relative",flexShrink:0}}>
                  {dn2&&<div style={{position:"absolute",inset:-6,borderRadius:"50%",background:`radial-gradient(circle,${GD}20,transparent 70%)`,animation:"pulse 2s ease infinite"}}/>}
                  <div style={{width:52,height:52,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:dn2?"1.5rem":"1rem",
                    background:dn2?`linear-gradient(135deg,${GD},#ff6600)`:act2?`linear-gradient(135deg,${CY},${TL})`:CD2,
                    border:`2px solid ${dn2?GD:act2?CY:BD}`,boxShadow:dn2?`0 0 24px ${GD}44`:"none"}}>{dn2?"🔥":act2?"⚡":"○"}</div>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:"1.02rem",fontWeight:700,marginBottom:4}}>{c.name}</div>
                  <div style={{height:4,borderRadius:2,background:DM,overflow:"hidden",marginBottom:4}}><div style={{height:"100%",borderRadius:2,background:dn2?GD:mc2(c.mastery),width:dn2?"100%":P(c.mastery),transition:"width 600ms"}}/></div>
                  <div style={{fontSize:".78rem",color:dn2?GD:act2?CY:MU,fontWeight:600}}>{dn2?"Complete":act2?P(c.mastery):"Not started"}</div>
                </div>
              </button>);
            })}
          </div>
          {mAs.length>0&&<div style={{marginTop:20}}>
            <div style={{fontSize:".72rem",fontWeight:700,letterSpacing:".14em",color:"#fb923c",marginBottom:12,fontFamily:"'Space Grotesk',sans-serif"}}>📋 ASSIGNMENTS</div>
            {mAs.map(a=>{const rd=a.con.length?Math.round(a.con.reduce((s,id)=>s+Math.min(1,(cc.find(c=>c.id===id)?.mastery??0)/.6),0)/a.con.length*100):100;
              return(<button key={a.id} onClick={()=>go("assignment",{a})} style={{display:"flex",alignItems:"center",gap:12,padding:"16px 20px",borderRadius:16,background:innr,border:`1px solid ${a.due<=3?`${RD}33`:BD}`,cursor:"pointer",width:"100%",color:TX,marginBottom:10,textAlign:"left",borderLeft:`3px solid ${rd>=100?TL:a.due<=3?RD:"#ff8800"}`}}>
                <span style={{fontSize:"1.2rem"}}>{a.type}</span>
                <div style={{flex:1}}><div style={{fontSize:".92rem",fontWeight:600}}>{a.title}</div><div style={{height:3,borderRadius:2,background:DM,marginTop:6,overflow:"hidden"}}><div style={{height:"100%",borderRadius:2,background:rd>=100?TL:rd>50?CY:"#ff8800",width:rd+"%"}}/></div></div>
                <div style={{textAlign:"right"}}><div style={{fontSize:"1rem",fontWeight:800,color:rd>=100?TL:rd>50?CY:"#ff8800",fontFamily:"'Space Grotesk',sans-serif"}}>{rd}%</div><div style={{fontSize:".68rem",color:a.due<=3?RD:MU}}>{a.due}d</div></div>
              </button>);
            })}
          </div>}
        </div>);
      })}
    </div>
  </div>
  {done.size===0&&<div style={{textAlign:"center",padding:"20px 48px 40px"}}><p style={{fontSize:"1rem",color:MU}}>Complete your first concept to watch the atlas come alive ✨</p><button onClick={()=>go("forge")} style={{...bt(`linear-gradient(135deg,${CY},#0080ff)`,"#000"),marginTop:12}}>Start First Concept →</button></div>}
</div>}


{/* EXPLORE */}
{v==="explore"&&<div style={{display:"grid",gridTemplateColumns:"320px 1fr",gap:28,alignItems:"start",animation:"fadeUp .5s ease"}}>
<div style={{...card,position:"sticky",top:88,padding:"28px 24px"}}>
  <div style={{...ey,fontFamily:"'Space Grotesk',sans-serif"}}>CONCEPT LIBRARY</div>
  <p style={{fontSize:".82rem",color:MU,marginBottom:20,marginTop:-12}}>{cc.length} concept{cc.length!==1?"s":""} · {mastered} mastered</p>
  {cc.map(c=>{const act=selC?.id===c.id;const dn=done.has(c.id);const stage=getMemoryStage(c.id);
    return(<button key={c.id} onClick={()=>setSC(c)} style={{display:"flex",alignItems:"center",gap:10,padding:"13px 16px",borderRadius:14,background:act?`${CY}0c`:"transparent",border:act?`1px solid ${CY}28`:"1px solid transparent",cursor:"pointer",width:"100%",color:TX,fontSize:".92rem",transition:"all 200ms",marginBottom:4}}>
    <span style={{fontSize:".75rem",width:18,textAlign:"center"}}>{memoryStageIcon(stage)}</span>
    <span style={{flex:1,textAlign:"left",fontWeight:act?600:400}}>{c.name}</span>
    <span style={{color:memoryStageColor(stage),fontSize:".72rem",fontWeight:600}}>{stage!=="unseen"?memoryStageLabel(stage):""}</span>
    <span style={{color:mc2(c.mastery),fontSize:".78rem",fontWeight:700,width:32,textAlign:"right"}}>{c.mastery>0?P(c.mastery):"—"}</span>
  </button>);})}
</div>
<div style={{...card,minHeight:540}}>
  {selC?<div style={{animation:"fadeUp .35s ease"}}>
    {/* Concept header with mastery ring */}
    <div style={{display:"flex",alignItems:"center",gap:24,marginBottom:32}}>
      <div style={{position:"relative",width:72,height:72,flexShrink:0}}>
        <div style={{width:72,height:72,borderRadius:"50%",background:`${mc2(selC.mastery)}12`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.6rem",fontWeight:900,color:mc2(selC.mastery),fontFamily:"'Space Grotesk',sans-serif"}}>{P(selC.mastery)}</div>
        <svg style={{position:"absolute",inset:-3}} viewBox="0 0 78 78"><circle cx="39" cy="39" r="36" fill="none" stroke={DM} strokeWidth="3"/><circle cx="39" cy="39" r="36" fill="none" stroke={mc2(selC.mastery)} strokeWidth="3" strokeDasharray={`${selC.mastery*226} 226`} strokeLinecap="round" transform="rotate(-90 39 39)" style={{transition:"stroke-dasharray 800ms ease"}}/></svg>
      </div>
      <div>
        <div style={{fontSize:".72rem",fontWeight:700,letterSpacing:".14em",color:mc2(selC.mastery),textTransform:"uppercase",fontFamily:"'Space Grotesk',sans-serif"}}>{selC.cat}{done.has(selC.id)?" · 🔥 COMPLETE":""}</div>
        <h2 style={{...hd(1.6),marginTop:4}}>{selC.name}</h2>
      </div>
    </div>

    {/* Memory stage indicator */}
    {(()=>{const stage=getMemoryStage(selC.id);const stColor=memoryStageColor(stage);const mem=memoryState[selC.id];
    return stage!=="unseen"&&<div style={{display:"flex",alignItems:"center",gap:16,padding:"16px 20px",borderRadius:14,background:`${stColor}08`,border:`1px solid ${stColor}18`,marginBottom:28,animation:"fadeUp .3s ease"}}>
      <span style={{fontSize:"1.2rem"}}>{memoryStageIcon(stage)}</span>
      <div style={{flex:1}}>
        <div style={{fontSize:".82rem",fontWeight:700,color:stColor,fontFamily:"'Space Grotesk',sans-serif",letterSpacing:".08em"}}>{memoryStageLabel(stage).toUpperCase()}</div>
        <div style={{fontSize:".85rem",color:T2,marginTop:2}}>{
          stage==="crystallized"?"This concept is deeply embedded. You've proven mastery.":
          stage==="stable"?"Strong understanding. A few more recalls will make it permanent.":
          stage==="forming"?"You're building recognition. Keep practicing to solidify.":
          "First impressions. This idea needs more exposure to stick."
        }</div>
      </div>
      {mem&&mem.missCount>0&&<div style={{textAlign:"right"}}><div style={{fontSize:".75rem",color:MU}}>Past mistakes</div><div style={{fontSize:"1rem",fontWeight:700,color:"#ff8800"}}>{mem.missCount}</div></div>}
    </div>;})()}

    {/* Content sections with distinct styling */}
    {buildConceptPanels(selC).map((panel)=>(
      <div key={panel.id} style={{marginBottom:28,padding:"22px 26px",borderRadius:16,background:innr,border:`1px solid ${BD}`,borderLeft:`3px solid ${panel.color}`}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <span style={{fontSize:".95rem"}}>{panel.icon}</span>
          <span style={{fontSize:".78rem",fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:panel.color,fontFamily:"'Space Grotesk',sans-serif"}}>{panel.label}</span>
        </div>
        <p style={{fontSize:"1.02rem",lineHeight:1.9,color:T2,margin:0}}>{panel.body}</p>
      </div>
    ))}

    <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:28}}>{selC.kw.map(k=><span key={k} style={{padding:"7px 16px",borderRadius:20,border:`1px solid ${BD}`,fontSize:".82rem",color:MU,background:innr}}>{k}</span>)}</div>

    {selC.conn.length>0&&<div style={{marginBottom:28}}>
      <div style={{fontSize:".78rem",fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:CY,marginBottom:12,fontFamily:"'Space Grotesk',sans-serif"}}>🔗 Connected Concepts</div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>{selC.conn.map(id=>{const r=cc.find(c=>c.id===id);return r?<button key={id} onClick={()=>setSC(r)} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 20px",borderRadius:20,border:`1px solid ${CY}22`,color:CY,background:`${CY}08`,cursor:"pointer",fontSize:".88rem",fontWeight:600,transition:"all 200ms"}}><div style={{width:8,height:8,borderRadius:"50%",background:mc2(r.mastery)}}/>{r.name}</button>:null;})}</div>
    </div>}

    <button onClick={()=>go("forge",{c:selC})} style={{...bt(`linear-gradient(135deg,${CY},#0066ff)`,"#000"),animation:"glow 3s ease infinite"}}>Practice {selC.name} in Neural Forge →</button>
  </div>:<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:480,color:MU}}>
    <div style={{textAlign:"center"}}><div style={{fontSize:"2.5rem",marginBottom:16}}>🧠</div><h3 style={{...hd(1.2),color:MU,marginBottom:8}}>Concept Library</h3><p style={{fontSize:"1rem",color:MU}}>Select a concept from the sidebar to explore its full depth</p></div>
  </div>}
</div>
</div>}

{/* ASSIGNMENT */}
{v==="assignment"&&selA&&(()=>{
const needed=selA.con.map(id=>cc.find(c=>c.id===id)).filter(Boolean);
const ready=needed.filter(c=>c.mastery>=.6);
const weak=needed.filter(c=>c.mastery<.6);
const readiness=needed.length?Math.round(ready.length/needed.length*100):100;
const urgent=selA.due<=3;

return(<div style={{maxWidth:880}}>
<button onClick={()=>go("home")} style={{background:"transparent",border:"none",color:MU,cursor:"pointer",fontSize:".92rem",marginBottom:20}}>← Back</button>

{/* Header */}
<div style={{...card,marginBottom:24,borderTop:`4px solid ${readiness>=100?TL:urgent?RD:CY}`,background:`linear-gradient(135deg,${readiness>=100?`${TL}06`:urgent?`${RD}04`:`${CY}04`},${CD2})`}}>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:20}}>
    <div style={{flex:1}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
        <span style={{fontSize:"2rem"}}>{selA.type}</span>
        <div>
          <h2 style={hd(1.4)}>{selA.title}</h2>
          <p style={{color:MU,fontSize:".88rem",margin:"4px 0 0"}}>{selA.sub} · {selA.pts}pts · {urgent?"⚠ ":""}Due in {selA.due} days</p>
        </div>
      </div>
      {selA.demandIcon&&<div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"8px 16px",borderRadius:12,background:innr,border:`1px solid ${BD}`,marginTop:4}}>
        <span style={{fontSize:"1rem"}}>{selA.demandIcon}</span>
        <span style={{fontSize:".82rem",fontWeight:700,color:CY,fontFamily:"'Space Grotesk',sans-serif",letterSpacing:".06em"}}>{selA.demand}</span>
      </div>}
    </div>
    <div style={{textAlign:"center",minWidth:100}}>
      <div style={{position:"relative",width:80,height:80,margin:"0 auto"}}>
        <svg viewBox="0 0 80 80" style={{width:80,height:80}}><circle cx="40" cy="40" r="36" fill="none" stroke={DM} strokeWidth="4"/><circle cx="40" cy="40" r="36" fill="none" stroke={readiness>=100?TL:readiness>50?CY:"#ff8800"} strokeWidth="4" strokeDasharray={`${readiness/100*226} 226`} strokeLinecap="round" transform="rotate(-90 40 40)" style={{transition:"stroke-dasharray 800ms ease"}}/></svg>
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:"1.3rem",fontWeight:800,color:readiness>=100?TL:readiness>50?CY:"#ff8800",fontFamily:"'Space Grotesk',sans-serif"}}>{readiness}%</span></div>
      </div>
      <div style={{fontSize:".68rem",color:MU,marginTop:6}}>READINESS</div>
    </div>
  </div>
</div>

{/* What it's really asking */}
{selA.reallyAsking&&<div style={{...card,marginBottom:20,borderLeft:`4px solid ${CY}`}}>
  <div style={{fontSize:".72rem",fontWeight:700,letterSpacing:".12em",color:CY,marginBottom:10,fontFamily:"'Space Grotesk',sans-serif"}}>🎯 WHAT IT'S REALLY ASKING</div>
  <p style={{fontSize:"1.08rem",lineHeight:1.85,color:TX,margin:0}}>{selA.reallyAsking}</p>
</div>}

{/* What instructors care about */}
{selA.secretCare&&<div style={{...card,marginBottom:20,borderLeft:`4px solid ${GD}`}}>
  <div style={{fontSize:".72rem",fontWeight:700,letterSpacing:".12em",color:GD,marginBottom:10,fontFamily:"'Space Grotesk',sans-serif"}}>🔑 WHAT INSTRUCTORS SECRETLY CARE ABOUT</div>
  <p style={{fontSize:"1rem",lineHeight:1.8,color:T2,margin:0}}>{selA.secretCare}</p>
</div>}

{/* Concept readiness */}
<div style={{...card,marginBottom:20}}>
  <div style={{fontSize:".72rem",fontWeight:700,letterSpacing:".12em",color:TL,marginBottom:16,fontFamily:"'Space Grotesk',sans-serif"}}>🧠 CONCEPT READINESS</div>
  {ready.length>0&&<p style={{color:TL,fontSize:".92rem",marginBottom:12}}>✓ You're prepared in: {ready.map(c=>c.name).join(", ")}</p>}
  {weak.length>0&&<p style={{color:"#ff8800",fontSize:".92rem",marginBottom:16}}>→ Needs work: {weak.map(c=>c.name).join(", ")}</p>}
  <div style={{display:"flex",flexDirection:"column",gap:8}}>
    {needed.map((c,i)=>{const r=c.mastery>=.6;const stage=getMemoryStage(c.id);
      return(<div key={c.id} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",borderRadius:14,background:innr,border:`1px solid ${r?`${TL}22`:BD}`}}>
        <span style={{fontSize:".82rem"}}>{memoryStageIcon(stage)}</span>
        <button onClick={()=>go("explore",{c})} style={{flex:1,background:"none",border:"none",color:TX,cursor:"pointer",textAlign:"left",fontSize:".95rem",fontWeight:500}}>{c.name}</button>
        <div style={{width:80,height:4,borderRadius:2,background:DM,overflow:"hidden"}}><div style={{height:"100%",borderRadius:2,background:mc2(c.mastery),width:P(c.mastery),transition:"width 500ms cubic-bezier(.22,1,.36,1)"}}/></div>
        <span style={{color:mc2(c.mastery),fontSize:".82rem",fontWeight:700,width:36,textAlign:"right"}}>{P(c.mastery)}</span>
        {!r&&<button onClick={()=>go("forge",{c})} style={{padding:"6px 14px",borderRadius:10,border:`1px solid ${CY}33`,background:`${CY}0d`,color:CY,fontSize:".75rem",fontWeight:700,cursor:"pointer"}}>Learn →</button>}
      </div>);
    })}
  </div>
  {weak.length>0&&<div style={{marginTop:20,padding:"16px 20px",borderRadius:14,background:`${CY}06`,border:`1px solid ${CY}15`}}>
    <div style={{fontSize:".72rem",fontWeight:700,color:CY,marginBottom:8,fontFamily:"'Space Grotesk',sans-serif"}}>⚡ FASTEST PATH TO READY</div>
    <p style={{fontSize:".92rem",color:T2,margin:"0 0 12px"}}>{selA.quickPrep||`Learn ${weak.map(c=>c.name).join(", ")}. About ${weak.length*5} minutes.`}</p>
    <button onClick={()=>go("forge",{c:weak[0]})} style={bt(`linear-gradient(135deg,${CY},#0066ff)`,"#000")}>⚡ Start prep: {weak[0].name}</button>
  </div>}
</div>

{/* Discussion thread access */}
{(()=>{const disc=DISCUSSIONS.find(d=>d.assignmentId===selA.id);
  return disc?<div style={{...card,marginBottom:20,borderLeft:`4px solid #a78bfa`,cursor:"pointer"}} onClick={()=>{setActiveDiscussion(disc);go("discussion");}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div>
        <div style={{fontSize:".72rem",fontWeight:700,letterSpacing:".12em",color:"#a78bfa",marginBottom:8,fontFamily:"'Space Grotesk',sans-serif"}}>💬 DISCUSSION THREAD</div>
        <p style={{fontSize:".95rem",color:TX,margin:0}}>{disc.threads.length} posts · {disc.threads.reduce((s,t)=>s+t.replies.length+t.replies.reduce((s2,r)=>s2+r.replies.length,0),0)} replies</p>
        {disc.whatItsReallyAbout&&<p style={{fontSize:".82rem",color:T2,margin:"6px 0 0",fontStyle:"italic"}}>{disc.whatItsReallyAbout}</p>}
      </div>
      <span style={{color:"#a78bfa",fontSize:"1.1rem"}}>→</span>
    </div>
  </div>:null;
})()}

{/* Common failure modes */}
{selA.failModes&&<div style={{...card,marginBottom:20,borderLeft:`4px solid ${RD}`}}>
  <div style={{fontSize:".72rem",fontWeight:700,letterSpacing:".12em",color:RD,marginBottom:14,fontFamily:"'Space Grotesk',sans-serif"}}>⚠ COMMON MISTAKES TO AVOID</div>
  <div style={{display:"flex",flexDirection:"column",gap:10}}>
    {selA.failModes.map((fm,i)=>(
      <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
        <span style={{color:RD,fontSize:".88rem",fontWeight:700,flexShrink:0}}>✗</span>
        <p style={{fontSize:".95rem",color:T2,lineHeight:1.65,margin:0}}>{fm}</p>
      </div>
    ))}
  </div>
</div>}

{/* What you'll need to show */}
{selA.evidence&&<div style={{...card,marginBottom:20,borderLeft:`4px solid #a78bfa`}}>
  <div style={{fontSize:".72rem",fontWeight:700,letterSpacing:".12em",color:"#a78bfa",marginBottom:10,fontFamily:"'Space Grotesk',sans-serif"}}>📋 WHAT YOUR RESPONSE NEEDS</div>
  <p style={{fontSize:"1rem",lineHeight:1.8,color:T2,margin:0}}>{selA.evidence}</p>
</div>}

{/* ═══ ARGUMENT FORGE ═══ */}
<div style={{...card}}>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
    <div style={{fontSize:".72rem",fontWeight:700,letterSpacing:".12em",color:TL,fontFamily:"'Space Grotesk',sans-serif"}}>✍ ARGUMENT FORGE</div>
    <div style={{display:"flex",gap:4}}>
      {[["thesis","1. Thesis"],["outline","2. Outline"],["draft","3. Draft"]].map(([id,lb])=>(
        <button key={id} onClick={()=>setArgStage(id)} style={{padding:"8px 18px",borderRadius:12,border:argStage===id?`2px solid ${TL}`:`1px solid ${BD}`,background:argStage===id?`${TL}0d`:"transparent",color:argStage===id?TL:MU,fontSize:".78rem",fontWeight:700,cursor:"pointer"}}>{lb}</button>
      ))}
    </div>
  </div>

  {/* STAGE 1: THESIS */}
  {argStage==="thesis"&&<div style={{animation:"fadeUp .3s ease"}}>
    <p style={{fontSize:".92rem",color:T2,marginBottom:20,lineHeight:1.6}}>Your thesis is the single claim your entire response defends. Start here — everything else flows from this.</p>

    {/* Concept chips — promote to claims */}
    <div style={{marginBottom:20}}>
      <div style={{fontSize:".68rem",fontWeight:700,color:CY,marginBottom:10,letterSpacing:".1em"}}>AVAILABLE CONCEPTS</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {needed.map(c=>(
          <span key={c.id} style={{padding:"8px 16px",borderRadius:20,background:`${CY}0a`,border:`1px solid ${CY}22`,fontSize:".85rem",color:CY}}>{c.name}</span>
        ))}
      </div>
    </div>

    {/* Thesis templates */}
    {(()=>{const demandKey=selA.demand?.split(" ")[0]||"Apply";const templates=thesisTemplates[demandKey]||thesisTemplates["Apply"];
    return(<div style={{marginBottom:20}}>
      <div style={{fontSize:".68rem",fontWeight:700,color:GD,marginBottom:10,letterSpacing:".1em"}}>THESIS STARTERS FOR "{selA.demand}"</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {templates.map((t,i)=>(
          <button key={i} onClick={()=>setThesis(p=>({...p,[selA.id]:t}))} style={{padding:"14px 18px",borderRadius:14,border:thesis[selA.id]===t?`2px solid ${GD}`:`1px solid ${BD}`,background:thesis[selA.id]===t?`${GD}08`:innr,cursor:"pointer",color:T2,fontSize:".92rem",lineHeight:1.6,textAlign:"left",fontStyle:"italic",transition:"all 250ms"}}>{t}</button>
        ))}
      </div>
    </div>);})()}

    {/* Custom thesis */}
    <div>
      <div style={{fontSize:".68rem",fontWeight:700,color:TL,marginBottom:10,letterSpacing:".1em"}}>YOUR THESIS</div>
      <textarea value={thesis[selA.id]||""} onChange={e=>setThesis(p=>({...p,[selA.id]:e.target.value}))} placeholder="State your central claim in one sentence..." style={{width:"100%",minHeight:80,padding:"18px 22px",borderRadius:16,border:`1px solid ${BD}`,background:innr,color:TX,fontSize:"1.05rem",lineHeight:1.8,resize:"vertical",outline:"none",fontFamily:"'Inter',sans-serif"}}/>
    </div>
    {thesis[selA.id]&&<button onClick={()=>setArgStage("outline")} style={{...bt(`linear-gradient(135deg,${TL},#00b088)`,"#000"),marginTop:20}}>Build outline →</button>}
  </div>}

  {/* STAGE 2: OUTLINE */}
  {argStage==="outline"&&<div style={{animation:"fadeUp .3s ease"}}>
    {thesis[selA.id]&&<div style={{padding:"14px 18px",borderRadius:14,background:`${TL}06`,border:`1px solid ${TL}15`,marginBottom:20}}>
      <div style={{fontSize:".68rem",fontWeight:700,color:TL,marginBottom:6}}>YOUR THESIS</div>
      <p style={{fontSize:".92rem",color:TX,margin:0,fontStyle:"italic"}}>{thesis[selA.id]}</p>
    </div>}
    <p style={{fontSize:".92rem",color:T2,marginBottom:20}}>Build your argument by adding paragraph blocks. Each block has a purpose — click to add it to your structure.</p>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20}}>
      {paraTypes.map(pt=>(
        <button key={pt.id} onClick={()=>setOutline(p=>{const cur=p[selA.id]||[];return{...p,[selA.id]:[...cur,{type:pt.id,content:""}]};})} style={{padding:"10px 16px",borderRadius:14,border:`1px solid ${pt.color}33`,background:`${pt.color}08`,cursor:"pointer",color:pt.color,fontSize:".82rem",fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
          <span>{pt.icon}</span>{pt.label}
        </button>
      ))}
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {(outline[selA.id]||[]).map((block,i)=>{const pt=paraTypes.find(p=>p.id===block.type)||paraTypes[0];
        return(<div key={i} style={{padding:"18px 22px",borderRadius:16,background:innr,border:`1px solid ${BD}`,borderLeft:`4px solid ${pt.color}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:".9rem"}}>{pt.icon}</span>
              <span style={{fontSize:".72rem",fontWeight:700,color:pt.color,letterSpacing:".08em",fontFamily:"'Space Grotesk',sans-serif"}}>{pt.label.toUpperCase()}</span>
              <span style={{fontSize:".75rem",color:MU}}>— {pt.desc}</span>
            </div>
            <button onClick={()=>setOutline(p=>{const cur=[...(p[selA.id]||[])];cur.splice(i,1);return{...p,[selA.id]:cur};})} style={{background:"none",border:"none",color:MU,cursor:"pointer",fontSize:".82rem"}}>✕</button>
          </div>
          <textarea value={block.content} onChange={e=>{const v2=e.target.value;setOutline(p=>{const cur=[...(p[selA.id]||[])];cur[i]={...cur[i],content:v2};return{...p,[selA.id]:cur};});}} placeholder={`What will this ${pt.label.toLowerCase()} paragraph say?`} style={{width:"100%",minHeight:60,padding:"12px 16px",borderRadius:12,border:`1px solid ${BD}`,background:"rgba(0,0,0,.15)",color:TX,fontSize:".95rem",lineHeight:1.7,resize:"vertical",outline:"none",fontFamily:"'Inter',sans-serif"}}/>
        </div>);
      })}
    </div>
    {(outline[selA.id]||[]).length===0&&<div style={{padding:"32px",borderRadius:16,background:innr,border:`1px dashed ${BD}`,textAlign:"center"}}><p style={{color:MU,margin:0}}>Click paragraph types above to build your outline</p></div>}
    {(outline[selA.id]||[]).length>=2&&<button onClick={()=>setArgStage("draft")} style={{...bt(`linear-gradient(135deg,${TL},#00b088)`,"#000"),marginTop:20}}>Start drafting →</button>}
  </div>}

  {/* STAGE 3: DRAFT */}
  {argStage==="draft"&&<div style={{animation:"fadeUp .3s ease"}}>
    {/* Thesis reminder */}
    {thesis[selA.id]&&<div style={{padding:"12px 16px",borderRadius:12,background:`${TL}06`,border:`1px solid ${TL}12`,marginBottom:16}}>
      <span style={{fontSize:".72rem",fontWeight:700,color:TL}}>THESIS: </span><span style={{fontSize:".88rem",color:TX,fontStyle:"italic"}}>{thesis[selA.id]}</span>
    </div>}
    {/* Outline sidebar + draft */}
    <div style={{display:"grid",gridTemplateColumns:"200px 1fr",gap:16}}>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        <div style={{fontSize:".68rem",fontWeight:700,color:MU,marginBottom:4,letterSpacing:".1em"}}>STRUCTURE</div>
        {(outline[selA.id]||[]).map((block,i)=>{const pt=paraTypes.find(p=>p.id===block.type)||paraTypes[0];
          return(<div key={i} style={{padding:"10px 12px",borderRadius:10,background:innr,border:`1px solid ${BD}`,borderLeft:`3px solid ${pt.color}`}}>
            <div style={{fontSize:".72rem",fontWeight:700,color:pt.color}}>{pt.icon} {pt.label}</div>
            {block.content&&<div style={{fontSize:".72rem",color:MU,marginTop:4,lineHeight:1.4}}>{block.content.slice(0,60)}{block.content.length>60?"...":""}</div>}
          </div>);
        })}
        {(outline[selA.id]||[]).length===0&&<p style={{fontSize:".78rem",color:MU}}>No outline yet</p>}
      </div>
      <div>
        <textarea value={draft[selA.id]||""} onChange={e=>setDraft(d=>({...d,[selA.id]:e.target.value}))} placeholder="Write your full response here. Your outline is on the left for reference." style={{width:"100%",minHeight:320,padding:"22px 26px",borderRadius:16,border:`1px solid ${BD}`,background:innr,color:TX,fontSize:"1rem",lineHeight:1.9,resize:"vertical",outline:"none",fontFamily:"'Inter',sans-serif"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
          <span style={{fontSize:".78rem",color:MU}}>{(draft[selA.id]||"").split(/\s+/).filter(Boolean).length} words</span>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setArgStage("outline")} style={{fontSize:".78rem",color:MU,background:"none",border:`1px solid ${BD}`,padding:"6px 14px",borderRadius:10,cursor:"pointer"}}>← Edit outline</button>
            <button onClick={()=>setArgStage("thesis")} style={{fontSize:".78rem",color:MU,background:"none",border:`1px solid ${BD}`,padding:"6px 14px",borderRadius:10,cursor:"pointer"}}>← Edit thesis</button>
          </div>
        </div>
      </div>
    </div>
  </div>}
</div>
</div>);
})()}

{/* ═══ NEURAL FORGE ═══ */}
{v==="forge"&&fc&&(()=>{
const phases=[
  {id:"intro",icon:"🧠",name:"Orient",color:CY,desc:"Ground yourself in the core idea before anything else."},
  {id:"dilemma",icon:"⚖",name:"Apply",color:"#a78bfa",desc:"Face a real scenario that tests this concept in practice."},
  {id:"tf",icon:"⚡",name:"Recall",color:TL,desc:"Quick-fire recall — do you know the fundamentals?"},
  {id:"mc",icon:"🎯",name:"Prove",color:GD,desc:"Scenario-based questions that test deep understanding."},
  {id:"flash",icon:"🃏",name:"Reinforce",color:"#f472b6",desc:"Flip through key ideas to cement your memory."},
  ...(PH.length>0?[{id:"whois",icon:"🗣",name:"Attribute",color:"#fb923c",desc:"Match quotes to the course figures who said them."}]:[]),
];
const pi=phases.findIndex(p=>p.id===fp);
const pc=phases[pi]?.color||CY;
const fcMastery=cc.find(c=>c.id===fc.id)?.mastery??fc.mastery??0;

return(<div style={{maxWidth:860,margin:"0 auto"}}>
  {/* ─── FORGE HEADER ─── */}
  <div style={{textAlign:"center",marginBottom:40}}>
    <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:100,height:100,borderRadius:"50%",background:`linear-gradient(135deg,${pc}18,${pc}08)`,border:`3px solid ${pc}44`,boxShadow:`0 0 48px ${pc}22, 0 0 96px ${pc}0a`,marginBottom:20,position:"relative"}}>
      <span style={{fontSize:"2.4rem"}}>{phases[pi]?.icon||"🧠"}</span>
      {/* mastery ring — uses live cc mastery, not stale fc snapshot */}
      <svg style={{position:"absolute",inset:-4}} viewBox="0 0 108 108"><circle cx="54" cy="54" r="50" fill="none" stroke={DM} strokeWidth="3"/><circle cx="54" cy="54" r="50" fill="none" stroke={mc2(fcMastery)} strokeWidth="3" strokeDasharray={`${fcMastery*314} 314`} strokeLinecap="round" transform="rotate(-90 54 54)" style={{transition:"stroke-dasharray 800ms ease"}}/></svg>
    </div>
    <h2 style={{...hd(1.7),marginBottom:6}}>{fc.name}</h2>
    <p style={{color:pc,fontSize:".92rem",fontWeight:600,fontFamily:"'Space Grotesk',sans-serif",letterSpacing:".06em"}}>{phases[pi]?.desc}</p>
    <div style={{display:"flex",alignItems:"center",gap:8,justifyContent:"center",marginTop:6}}>
      <span style={{color:mc2(fcMastery),fontSize:".88rem",fontWeight:700}}>{P(fcMastery)} mastery</span>
      <span style={{color:MU}}>·</span>
      <span style={{color:TL,fontWeight:700}}>✓{sc.c}</span>
      <span style={{color:RD,fontWeight:700}}>✗{sc.w}</span>
    </div>
  </div>

  {/* ─── PHASE PATH ─── */}
  <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:0,marginBottom:44}}>
    {phases.map((p,i)=>{
      const active=fp===p.id;
      const passed=i<pi;
      return(<div key={p.id} style={{display:"flex",alignItems:"center"}}>
        <button onClick={()=>{setFP(p.id);if(p.id==="tf"){setTI(0);setTA(null);}if(p.id==="mc"){setMI(0);setMA(null);}if(p.id==="dilemma")setDC(null);if(p.id==="flash"){setFI(0);setFF(false);}if(p.id==="whois"){setWS(null);setWD(new Set());}}} style={{
          display:"flex",flexDirection:"column",alignItems:"center",gap:8,background:"transparent",border:"none",color:TX,cursor:"pointer",padding:"4px 8px",transition:"all 300ms",opacity:active?1:passed?.85:.4,
        }}>
          <div style={{width:active?52:40,height:active?52:40,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:active?"1.3rem":"1rem",
            background:active?`linear-gradient(135deg,${p.color}22,${p.color}0d)`:passed?`${p.color}12`:CD2,
            border:`2px solid ${active?p.color:passed?`${p.color}66`:BD}`,
            boxShadow:active?`0 0 28px ${p.color}33`:"none",
            transition:"all 400ms cubic-bezier(.22,1,.36,1)"}}>
            {passed?"✓":p.icon}
          </div>
          <span style={{fontSize:".68rem",fontWeight:700,letterSpacing:".08em",color:active?p.color:passed?T2:MU,fontFamily:"'Space Grotesk',sans-serif"}}>{p.name}</span>
        </button>
        {i<phases.length-1&&<div style={{width:28,height:3,borderRadius:2,background:passed?`${phases[i].color}55`:DM,transition:"all 400ms",marginBottom:22}}/>}
      </div>);
    })}
  </div>

  {/* STREAK BANNER */}
  {streak>=3&&<div style={{textAlign:"center",padding:"14px 24px",borderRadius:16,background:`linear-gradient(90deg,${GD}12,${RD}08,${GD}12)`,border:`1px solid ${GD}33`,marginBottom:16,animation:"shimmer 3s linear infinite",backgroundSize:"200% 100%"}}>
    <span style={{fontSize:"1.1rem",fontWeight:800,color:GD,fontFamily:"'Space Grotesk',sans-serif"}}>{"🔥".repeat(Math.min(Math.floor(streak/2),8))}</span><span style={{animation:"streakFire .5s ease"}}> {streak}x STREAK </span><span>{"🔥".repeat(Math.min(Math.floor(streak/2),8))}</span>
  </div>}

  {/* FLOW STATE — subtle awareness indicator */}
  {flowMessage&&totalAnswered>=3&&<div style={{textAlign:"center",marginBottom:16,transition:"all 600ms ease"}}>
    <span style={{fontSize:".82rem",fontWeight:600,color:flowColor,fontFamily:"'Space Grotesk',sans-serif",letterSpacing:".06em",opacity:.8}}>{flowMessage}</span>
  </div>}

  {/* STRUGGLING — recovery prompt */}
  {flowState==="struggling"&&consecutiveMisses>=3&&<div style={{padding:"20px 24px",borderRadius:16,background:"rgba(96,165,250,.06)",border:`1px solid rgba(96,165,250,.15)`,marginBottom:20,textAlign:"center",animation:"fadeUp .4s ease"}}>
    <p style={{fontSize:"1rem",color:"#60a5fa",margin:"0 0 12px",lineHeight:1.6}}>Looks like this one's tricky. Want to review the concept first?</p>
    <div style={{display:"flex",gap:12,justifyContent:"center"}}>
      <button onClick={()=>{setFP("intro");setIS(0);setConsecutiveMisses(0);}} style={{...bt("transparent","#60a5fa"),border:"1px solid rgba(96,165,250,.3)",padding:"10px 22px",fontSize:".85rem"}}>🧠 Review concept</button>
      <button onClick={()=>setConsecutiveMisses(0)} style={{...bt("transparent",MU),border:`1px solid ${BD}`,padding:"10px 22px",fontSize:".85rem"}}>Keep going</button>
    </div>
  </div>}

  {/* ─── PHASE CONTENT ─── */}
  <div style={{...card,borderTop:`3px solid ${pc}`,boxShadow:`0 8px 40px rgba(0,0,0,.5), ${flowCardGlow}`,borderColor:flowBorderColor,animation:"fadeUp .4s ease",transition:"box-shadow 800ms ease, border-color 800ms ease"}}>

  {/* ORIENT */}
  {fp==="intro"&&(()=>{const steps=buildForgeSteps(fc);const step=steps[is2]??steps[0];
  if(!step)return(<div style={{textAlign:"center",padding:"24px 0"}}><h3 style={hd(1.2)}>{fc.name}</h3><p style={{fontSize:"1.02rem",lineHeight:1.8,color:T2,marginTop:12}}>{normalizePanelText(fc.core||fc.hook||"This concept is ready for practice.")}</p><div style={{marginTop:32}}><button onClick={()=>{bump(fc.id,.06);flash("Orientation complete!",true);setFP("dilemma");setDC(null);}} style={bt(`linear-gradient(135deg,${TL},#00b088)`,"#000")}>Start Practice →</button></div></div>);
  return(<>
    <div style={{display:"flex",gap:8,margin:"0 0 36px"}}>{steps.map((_,i)=><div key={i} style={{flex:1,height:6,borderRadius:3,background:i<=is2?CY:DM,transition:"background 400ms ease"}}/>)}</div>
    <div style={{fontSize:".78rem",fontWeight:700,letterSpacing:".14em",color:step.color,marginBottom:12,fontFamily:"'Space Grotesk',sans-serif"}}>{step.label.toUpperCase()}</div>
    <p style={{fontSize:step.id==="core"?"1.2rem":"1.1rem",lineHeight:1.95,color:step.id==="core"?TX:T2}}>{step.body}</p>
    {step.id==="trap"&&isRenderablePanelText(fc.hook)&&<div style={{marginTop:24,padding:"20px 24px",borderRadius:16,background:`${TL}08`,border:`1px solid ${TL}22`}}><p style={{fontSize:"1.05rem",color:TL,fontStyle:"italic",margin:0,lineHeight:1.7}}>🔗 {normalizePanelText(fc.hook)}</p></div>}
    <div style={{display:"flex",justifyContent:"space-between",marginTop:44}}>
      {is2>0?<button onClick={()=>setIS(p=>p-1)} style={{...bt("transparent",MU),border:`1px solid ${BD}`}}>← Back</button>:<div/>}
      {is2<steps.length-1?<button onClick={()=>setIS(p=>p+1)} style={bt(`linear-gradient(135deg,${CY},#0080ff)`,"#000")}>Continue →</button>:
        <button onClick={()=>{bump(fc.id,.06);flash("✨ Orientation complete!",true);setFP("dilemma");setDC(null);}} style={bt(`linear-gradient(135deg,${TL},#00b088)`,"#000")}>✓ I understand — test me →</button>}
    </div>
  </>);})()}

  {/* APPLY */}
  {fp==="dilemma"&&!fc.dil&&<div style={{textAlign:"center",padding:"40px 0"}}><div style={{fontSize:"1.8rem",marginBottom:16}}>⚖</div><h3 style={hd(1.2)}>No scenario available</h3><p style={{color:T2,margin:"12px 0 24px"}}>This concept doesn't have a practice scenario yet. Continue to the recall questions.</p><button onClick={()=>{setFP("tf");setTI(0);setTA(null);}} style={bt(`linear-gradient(135deg,${TL},#00b088)`,"#000")}>Continue to Recall →</button></div>}
  {fp==="dilemma"&&fc.dil&&(()=>{const d=fc.dil;
  return(<>
    <p style={{fontSize:"1.15rem",lineHeight:1.95,color:T2,margin:"0 0 32px"}}>{d.text}</p>
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {d.options.map((o,i)=>(<button key={i} onClick={()=>{if(dc===null)setDC(i);}} style={{textAlign:"left",padding:"24px 28px",borderRadius:18,border:`2px solid ${dc===i?"#a78bfa":BD}`,background:dc===i?"rgba(167,139,250,.06)":innr,cursor:dc!==null?"default":"pointer",color:TX,width:"100%",opacity:dc!==null&&dc!==i?.25:1,transition:"all 300ms"}}>
        <div style={{fontSize:"1.02rem",lineHeight:1.75}}>{o.text}</div>
        {dc===i&&<div style={{marginTop:16,padding:"20px 24px",borderRadius:16,background:"rgba(167,139,250,.06)",border:"1px solid rgba(167,139,250,.18)"}}>
          <div style={{fontSize:".75rem",fontWeight:700,letterSpacing:".12em",color:"#a78bfa",marginBottom:8,fontFamily:"'Space Grotesk',sans-serif"}}>{o.framework}</div>
          <p style={{fontSize:".98rem",lineHeight:1.75,color:T2,margin:0}}>{o.why}</p>
        </div>}
      </button>))}
    </div>
    {dc!==null&&<button onClick={()=>{setFP("tf");setTI(0);setTA(null);}} style={{...bt(`linear-gradient(135deg,${TL},#00b088)`,"#000"),marginTop:28}}>Continue to Recall →</button>}
  </>);})()}

  {/* RECALL */}
  {fp==="tf"&&(()=>{const qs=fc.tf||[];const q=qs[ti2];
  if(!q)return(<div style={{textAlign:"center",padding:"40px 0"}}><div style={{fontSize:"1.8rem",marginBottom:16}}>🔥</div><h3 style={hd(1.2)}>Recall complete!</h3><p style={{color:T2,marginTop:8,marginBottom:24}}>{sc.c} correct, {sc.w} wrong</p><button onClick={()=>{setFP("mc");setMI(0);setMA(null);}} style={bt(`linear-gradient(135deg,${GD},#cc8800)`,"#000")}>Continue to Prove →</button></div>);
  return(<>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:flowShouldShowHint?16:24}}><span style={{fontSize:".82rem",fontWeight:700,color:TL,fontFamily:"'Space Grotesk',sans-serif"}}>QUESTION {ti2+1} OF {qs.length}</span><span style={{fontSize:".82rem",color:MU}}>{fc.name}</span></div>
    {/* Flow hint — shows when struggling or cold */}
    {flowShouldShowHint&&ta===null&&<div style={{padding:"14px 18px",borderRadius:14,background:`${TL}06`,border:`1px solid ${TL}12`,marginBottom:16,animation:"fadeUp .3s ease"}}>
      <p style={{fontSize:".88rem",color:TL,margin:0,fontStyle:"italic"}}>💡 Remember: {fc.hook}</p>
    </div>}
    {/* Ghost — past mistake resurfacing */}
    {(()=>{const g=ghosts.find(x=>x.conceptId===fc.id&&!x.resurfaced);
      return g&&ta===null&&ti2===0?<div style={{padding:"14px 18px",borderRadius:14,background:"rgba(255,136,0,.04)",border:"1px solid rgba(255,136,0,.12)",marginBottom:16,animation:"fadeUp .4s ease"}}>
        <p style={{fontSize:".85rem",color:"#ff8800",margin:0}}>👻 <span style={{fontStyle:"italic"}}>This concept tripped you up before.</span> <span style={{color:T2}}>Watch for: {g.text.split(".")[0]}.</span></p>
      </div>:null;
    })()}
    <p style={{fontSize:"1.15rem",lineHeight:1.95,color:T2,margin:"0 0 32px"}}>{q.statement}</p>
    {ta===null?<div style={{display:"flex",gap:18}}>
      <button onClick={()=>{const ok=q.answer;setTA(true);setSCO(s=>({c:s.c+(ok?1:0),w:s.w+(ok?0:1)}));if(ok){bump(fc.id,.03);recordAnswerFlow(true,fc.id,q);flash("✓ Correct!",true);}else{recordAnswerFlow(false,fc.id,q);flash("✗ Not quite",false);}}} style={{flex:1,padding:"22px",borderRadius:18,fontWeight:700,fontSize:"1.1rem",cursor:"pointer",background:`${TL}12`,color:TL,border:`2px solid ${TL}44`,transition:"all 250ms"}}> TRUE</button>
      <button onClick={()=>{const ok=!q.answer;setTA(false);setSCO(s=>({c:s.c+(ok?1:0),w:s.w+(ok?0:1)}));if(ok){bump(fc.id,.03);recordAnswerFlow(true,fc.id,q);flash("✓ Correct!",true);}else{recordAnswerFlow(false,fc.id,q);flash("✗ Not quite",false);}}} style={{flex:1,padding:"22px",borderRadius:18,fontWeight:700,fontSize:"1.1rem",cursor:"pointer",background:`${RD}12`,color:RD,border:`2px solid ${RD}44`,transition:"all 250ms"}}>FALSE</button>
    </div>:<>
      <div style={{padding:"20px 24px",borderRadius:16,background:ta===q.answer?`${TL}12`:`${RD}12`,border:`2px solid ${ta===q.answer?TL:RD}`,marginBottom:20,fontSize:"1.05rem",animation:"fadeUp .3s ease"}}>
        <strong>{ta===q.answer?(flowFeedbackIntensity==="vivid"?"🔥 Yes!":"✓ Correct"):(flowFeedbackIntensity==="gentle"?"Not quite — that's okay":"✗ Incorrect")}</strong> — The answer is {q.answer?"True":"False"}
      </div>
      {(flowExplanationDensity!=="minimal"||ta!==q.answer)&&<p style={{fontSize:"1.02rem",lineHeight:1.85,color:T2}}>{q.explanation}</p>}
      {flowState==="struggling"&&ta!==q.answer&&<p style={{fontSize:".92rem",color:"#60a5fa",marginTop:12,fontStyle:"italic"}}>Don't worry — getting it wrong is how you learn what sticks and what doesn't.</p>}
      <button onClick={()=>{setTI(p=>p+1);setTA(null);}} style={{...bt(`linear-gradient(135deg,${TL},#00b088)`,"#000"),marginTop:24}}>Next →</button>
    </>}
  </>);})()}

  {/* PROVE */}
  {fp==="mc"&&(()=>{const qs=fc.mc||[];const q=qs[mi2];
  if(!q)return(<div style={{textAlign:"center",padding:"56px 0",animation:"completionBloom .8s ease, celebrate 1.2s ease"}}>
    <div style={{fontSize:"4rem",marginBottom:16,animation:"float 2s ease infinite"}}>{"🔥🏆🔥"}</div>
    <h3 style={{fontSize:"2rem",fontWeight:900,background:`linear-gradient(135deg,${CY},${TL},${GD})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontFamily:"'Space Grotesk',sans-serif"}}>Session Complete!</h3>
    <p style={{fontSize:"1.4rem",fontWeight:700,color:TX,margin:"16px 0 4px"}}>{fc.name}</p>
    <div style={{display:"flex",gap:32,justifyContent:"center",margin:"20px 0"}}>
      <div style={{textAlign:"center"}}><div style={{fontSize:"1.8rem",fontWeight:800,color:TL}}>{sc.c}</div><div style={{fontSize:".72rem",color:MU}}>CORRECT</div></div>
      <div style={{textAlign:"center"}}><div style={{fontSize:"1.8rem",fontWeight:800,color:RD}}>{sc.w}</div><div style={{fontSize:".72rem",color:MU}}>WRONG</div></div>
      <div style={{textAlign:"center"}}><div style={{fontSize:"1.8rem",fontWeight:800,color:GD}}>{streak>0?streak+"x":"—"}</div><div style={{fontSize:".72rem",color:MU}}>STREAK</div></div>
      <div style={{textAlign:"center"}}><div style={{fontSize:"1.8rem",fontWeight:800,color:CY}}>{P(fcMastery)}</div><div style={{fontSize:".72rem",color:MU}}>MASTERY</div></div>
    </div>
    {sc.c>=4&&<div style={{padding:"14px 28px",borderRadius:16,background:`${GD}12`,border:`2px solid ${GD}44`,display:"inline-block",margin:"8px 0 24px"}}><span style={{color:GD,fontSize:"1.15rem",fontWeight:800}}>🔥 CONCEPT MASTERED 🔥</span></div>}
    {totalAnswered>0&&<p style={{color:MU,fontSize:".88rem"}}>Session accuracy: {Math.round(totalCorrect/totalAnswered*100)}% · Best streak: {bestStreak}x</p>}

    {/* Memory Imprint */}
    {(()=>{const stage=getMemoryStage(fc.id);const stColor=memoryStageColor(stage);
    return <div style={{margin:"24px auto 0",maxWidth:400,padding:"20px 24px",borderRadius:18,background:`${stColor}08`,border:`1px solid ${stColor}22`,textAlign:"left",animation:"fadeUp .6s ease .3s both"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
        <span style={{fontSize:"1.1rem"}}>{memoryStageIcon(stage)}</span>
        <span style={{fontSize:".78rem",fontWeight:700,color:stColor,letterSpacing:".1em",fontFamily:"'Space Grotesk',sans-serif"}}>MEMORY IMPRINT · {memoryStageLabel(stage).toUpperCase()}</span>
      </div>
      <p style={{fontSize:".92rem",color:T2,lineHeight:1.65,margin:"0 0 10px"}}>{fc.core}</p>
      <p style={{fontSize:".85rem",color:stColor,fontStyle:"italic",margin:0}}>🔗 {fc.hook}</p>
    </div>;})()}

    <div style={{display:"flex",gap:16,justifyContent:"center",marginTop:28}}>
      <button onClick={()=>{setDone(p=>new Set([...p,fc.id]));triggerCelebration();const n=cc.filter(c=>c.id!==fc.id&&!done.has(c.id));if(n.length)go("forge",{c:n.sort((a,b)=>a.mastery-b.mastery)[0]});else go("journey");}} style={bt(`linear-gradient(135deg,${CY},#0080ff)`,"#000")}>Next Concept →</button>
      <button onClick={()=>{setDone(p=>new Set([...p,fc.id]));go("stats");}} style={{...bt("transparent",CY),border:`1px solid ${CY}33`}}>View Stats 📊</button>
      <button onClick={()=>{setDone(p=>new Set([...p,fc.id]));go("journey");}} style={{...bt("transparent",MU),border:`1px solid ${BD}`}}>Journey Map</button>
    </div>
  </div>);
  return(<>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:24}}><span style={{fontSize:".82rem",fontWeight:700,color:GD,fontFamily:"'Space Grotesk',sans-serif"}}>SCENARIO {mi2+1} OF {qs.length}</span><span style={{fontSize:".82rem",color:MU}}>{fc.name}</span></div>
    <p style={{fontSize:"1.15rem",lineHeight:1.95,color:T2,margin:"0 0 28px"}}>{q.question}</p>
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {q.options.map((o,i)=>(<button key={i} onClick={()=>{if(ma!==null)return;const ok=i===q.correctIndex;setMA(i);setSCO(s=>({c:s.c+(ok?1:0),w:s.w+(ok?0:1)}));if(ok){bump(fc.id,.06);recordAnswerFlow(true,fc.id,q);flash("✓ Correct!",true);}else{recordAnswerFlow(false,fc.id,q);flash("✗ Not quite",false);}}} style={{textAlign:"left",padding:"22px 26px",borderRadius:16,border:`2px solid ${ma!==null&&i===q.correctIndex?TL:ma===i&&i!==q.correctIndex?RD:BD}`,background:ma!==null&&i===q.correctIndex?`${TL}0a`:ma===i&&i!==q.correctIndex?`${RD}0a`:innr,cursor:ma!==null?"default":"pointer",color:TX,fontSize:"1.02rem",lineHeight:1.75,width:"100%",opacity:ma!==null&&ma!==i&&i!==q.correctIndex?.2:1,transition:"all 300ms"}}>{o}</button>))}
    </div>
    {ma!==null&&<><p style={{fontSize:"1.02rem",lineHeight:1.85,color:T2,marginTop:24,animation:"fadeUp .3s ease"}}>{q.explanation}</p>
      <button onClick={()=>{setMI(p=>p+1);setMA(null);}} style={{...bt(`linear-gradient(135deg,${GD},#cc8800)`,"#000"),marginTop:24}}>Next →</button></>}
  </>);})()}

  {/* REINFORCE */}
  {fp==="flash"&&(()=>{
  const cards=buildFlashCards(fc);
  const c2=cards[fi];
  if(!c2)return(<div style={{textAlign:"center",padding:"40px 0"}}><div style={{fontSize:"1.8rem",marginBottom:16}}>🃏</div><h3 style={hd(1.2)}>Cards Complete!</h3><p style={{color:T2,margin:"12px 0 24px"}}>Reviewed {cards.length} cards</p><button onClick={()=>{setFI(0);setFF(false);}} style={bt(`linear-gradient(135deg,#f472b6,#ec4899)`,"#000")}>Review Again</button></div>);
  return(<>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:24}}><span style={{fontSize:".82rem",fontWeight:700,color:"#f472b6",fontFamily:"'Space Grotesk',sans-serif"}}>CARD {fi+1} OF {cards.length}</span></div>
    <button onClick={()=>setFF(!ff)} style={{width:"100%",minHeight:280,padding:"52px 44px",borderRadius:22,cursor:"pointer",textAlign:"center",
      background:ff?`linear-gradient(135deg,rgba(244,114,182,.08),rgba(0,240,255,.04))`:innr,
      border:`2px solid ${ff?"#f472b6":BD}`,boxShadow:ff?`0 0 40px rgba(244,114,182,.12)`:"0 6px 32px rgba(0,0,0,.35)",transition:"all 500ms cubic-bezier(.22,1,.36,1)",color:TX}}>
      <div style={{fontSize:".78rem",fontWeight:700,letterSpacing:".18em",color:ff?"#f472b6":MU,textTransform:"uppercase",marginBottom:24,fontFamily:"'Space Grotesk',sans-serif"}}>{ff?"ANSWER":"TAP TO REVEAL"}</div>
      <div style={{fontSize:ff?"1.1rem":"1.6rem",fontWeight:ff?400:700,lineHeight:1.85,color:ff?T2:TX,transition:"all 400ms"}}>{ff?c2.body:c2.front}</div>
      <div style={{fontSize:".82rem",color:MU,marginTop:24}}>{c2.label}</div>
    </button>
    <div style={{display:"flex",gap:14,marginTop:28,justifyContent:"center"}}>
      <button onClick={()=>{setFI(p=>p+1);setFF(false);}} style={bt(`linear-gradient(135deg,#f472b6,#ec4899)`,"#000")}>{fi<cards.length-1?"Next Card →":"Finish"}</button>
    </div>
  </>);})()}

  {/* ATTRIBUTE */}
  {fp==="whois"&&(()=>{
  if(PH.length===0)return(<div style={{textAlign:"center",padding:"40px 0"}}><div style={{fontSize:"2rem",marginBottom:16}}>🗣</div><h3 style={hd(1.2)}>No figures found yet</h3><p style={{color:T2,margin:"12px 0"}}>Upload your textbook PDF to unlock this activity.</p></div>);
  const allQ=PH.flatMap(p=>p.q.map(q=>({x:q.x,n:p.n,t:p.t,p:q.p})));
  const avail=allQ.filter(q=>!wd.has(q.x));
  if(avail.length===0)return(<div style={{textAlign:"center",padding:"40px 0"}}><div style={{fontSize:"1.8rem",marginBottom:16}}>🎯</div><h3 style={hd(1.2)}>Attribution Complete!</h3><p style={{color:T2,margin:"12px 0 24px"}}>Score: {sc.c} correct, {sc.w} wrong</p><button onClick={()=>{setWD(new Set());setSCO({c:0,w:0});}} style={bt(`linear-gradient(135deg,#fb923c,#f97316)`,"#000")}>Play Again</button></div>);
  const q2=avail[0];
  const opts=stableOrder([q2.n,...takeStableSubset(PH.filter(p=>p.n!==q2.n),3,`oracle:${q2.n}`).map(p=>p.n)],`oracle-options:${q2.n}`);
  return(<>
    <div style={{padding:"40px 36px",borderRadius:20,background:innr,border:`1px solid ${BD}`,marginBottom:32,textAlign:"center"}}>
      <p style={{fontSize:"1.2rem",lineHeight:1.9,color:T2,fontStyle:"italic",margin:0}}>"{q2.x}"</p>
      {q2.p>0&&<div style={{marginTop:14,fontSize:".85rem",color:MU}}>p. {q2.p}</div>}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
      {opts.map(nm=>(<button key={nm} onClick={()=>{
        if(ws)return;setWS(nm);const ok=nm===q2.n;
        setSCO(s=>({c:s.c+(ok?1:0),w:s.w+(ok?0:1)}));
        if(ok){bump(fc.id,.03);recordAnswerFlow(true,fc.id);flash("✓ "+q2.n+"!",true);}else{recordAnswerFlow(false,fc.id);flash("✗ It was "+q2.n,false);}
        setTimeout(()=>{setWD(p=>new Set([...p,q2.x]));setWS(null);},1800);
      }} style={{padding:"22px 24px",borderRadius:16,fontSize:"1.02rem",fontWeight:600,cursor:ws?"default":"pointer",
        background:ws===nm&&nm===q2.n?`${TL}14`:ws===nm&&nm!==q2.n?`${RD}14`:innr,
        border:`2px solid ${ws===nm&&nm===q2.n?TL:ws===nm&&nm!==q2.n?RD:BD}`,
        color:TX,transition:"all 300ms",opacity:ws&&ws!==nm&&nm!==q2.n?.25:1}}>
        {nm}{ws===nm&&nm===q2.n?" ✓":ws===nm&&nm!==q2.n?" ✗":""}
      </button>))}
    </div>
  </>);})()}

  </div>

  {/* Next concept button */}
  <div style={{textAlign:"center",marginTop:28}}>
    <button onClick={()=>{const n=cc.filter(c=>c.id!==fc.id&&!done.has(c.id)&&c.mastery<.8);if(n.length)go("forge",{c:n[0]});}} style={{fontSize:".88rem",color:MU,background:"transparent",border:`1px solid ${BD}`,padding:"10px 24px",borderRadius:20,cursor:"pointer"}}>Switch to another concept →</button>
  </div>
</div>);
})()}

{/* COMPARE */}
{v==="compare"&&<div style={{maxWidth:1020,margin:"0 auto"}}>
<h2 style={hd(1.5)}>Compare Concepts</h2>
<p style={{color:T2,fontSize:"1rem",margin:"10px 0 32px"}}>See two concepts side by side — where they agree and clash.</p>
<div style={{display:"flex",gap:18,marginBottom:36}}>
  <select value={cA?.id||""} onChange={e=>setCA(cc.find(c=>c.id===e.target.value)||null)} style={{flex:1,padding:"16px 20px",borderRadius:16,border:`1px solid ${BD}`,background:innr,color:TX,fontSize:"1rem"}}><option value="">Concept A</option>{cc.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
  <select value={cB?.id||""} onChange={e=>setCB(cc.find(c=>c.id===e.target.value)||null)} style={{flex:1,padding:"16px 20px",borderRadius:16,border:`1px solid ${BD}`,background:innr,color:TX,fontSize:"1rem"}}><option value="">Concept B</option>{cc.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
</div>
{cA&&cB&&cA.id!==cB.id&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
  {[cA,cB].map(c=>(<div key={c.id} style={{...card,borderTop:`5px solid ${mc2(c.mastery)}`}}>
    <div style={{...ey,color:mc2(c.mastery)}}>{c.cat}</div>
    <h3 style={hd(1.25)}>{c.name}</h3>
    <div style={{marginTop:26}}>
      {[["Core",c.core],["Distinction",c.dist]].map(([lb,txt])=>(<div key={lb} style={{marginBottom:24}}><div style={{fontSize:".78rem",fontWeight:700,letterSpacing:".14em",color:CY,marginBottom:8}}>{lb}</div><p style={{fontSize:"1rem",lineHeight:1.8,color:T2,margin:0}}>{txt}</p></div>))}
      <div style={{fontSize:".78rem",fontWeight:700,letterSpacing:".14em",color:TL,marginBottom:8}}>Memory Hook</div>
      <p style={{fontSize:".95rem",color:TL,fontStyle:"italic",margin:0}}>{c.hook}</p>
    </div>
  </div>))}
</div>}
</div>}

{/* ORACLE */}
{v==="oracle"&&<div style={{maxWidth:960,margin:"0 auto"}}>
{/* Chamber header */}
<div style={{textAlign:"center",marginBottom:32}}>
  <div style={{fontSize:"2rem",marginBottom:12}}>🏛</div>
  <h2 style={{...hd(1.6),marginBottom:8}}>The Oracle</h2>
  <p style={{color:T2,fontSize:"1rem"}}>{PH.length>0?`Bring a question, thesis, or confusion. ${PH.length} course figure${PH.length!==1?"s":""} will respond.`:"Bring a question or confusion. Upload your textbook to unlock course-specific responses."}</p>
</div>

{/* Mode selector */}
<div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:28,flexWrap:"wrap"}}>
  {[["tribunal","🏛 Full Tribunal"],["single","🎓 Ask One Mind"],["thesis","⚔ Challenge My Thesis"],["verdict","📜 Tribunal Verdict"]].map(([id,lb])=>(
    <button key={id} onClick={()=>{setOracleMode(id);setOR(null);}} style={{padding:"10px 22px",borderRadius:16,border:oracleMode===id?`2px solid ${CY}`:`1px solid ${BD}`,background:oracleMode===id?`${CY}0d`:"transparent",color:oracleMode===id?CY:MU,fontSize:".85rem",fontWeight:600,cursor:"pointer",transition:"all 250ms"}}>{lb}</button>
  ))}
</div>

{/* Input */}
<div style={{display:"flex",gap:14,marginBottom:32}}>
  <input value={oq} onChange={e=>setOQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")askO();}} placeholder={oracleMode==="thesis"?"Enter your thesis to challenge...":oracleMode==="single"?"Select a figure from the grid below...":"Ask a question about the course..."} style={{flex:1,padding:"18px 24px",borderRadius:18,border:`1px solid ${BD}`,background:innr,color:TX,fontSize:"1rem",outline:"none"}}/>
  <button onClick={askO} style={bt(`linear-gradient(135deg,${CY},#0080ff)`,"#000")}>{oracleMode==="thesis"?"Challenge":"Ask"}</button>
</div>

{/* Philosopher grid when no results */}
{!or2&&(PH.length>0?<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
  {PH.map((p,i)=>{const colors=[CY,GD,"#a78bfa",TL,"#fb923c","#f472b6"];const c2=colors[i%colors.length];
    return(<button key={p.n} onClick={()=>{if(oracleMode==="single"){setOQ(p.n);askO();}}} style={{...card,padding:"28px 24px",cursor:oracleMode==="single"?"pointer":"default",borderTop:`3px solid ${c2}`,transition:"all 300ms"}}>
      <div style={{fontSize:"1.2rem",fontWeight:700,marginBottom:4}}>{p.n}</div>
      <div style={{fontSize:".82rem",color:c2,fontWeight:600,marginBottom:10}}>{p.t}</div>
      <div style={{fontSize:".82rem",color:MU}}>{p.q.length} passage{p.q.length!==1?"s":""}</div>
      <div style={{fontSize:".78rem",color:T2,fontStyle:"italic",marginTop:12,lineHeight:1.5}}>"{(p.q[0].x.slice(0,80).replace(/\s+\S*$/,""))}…"</div>
    </button>);
  })}
</div>:<div style={{textAlign:"center",padding:"60px 0",color:MU}}>
  <div style={{fontSize:"2.5rem",marginBottom:16}}>📚</div>
  <p style={{fontSize:"1rem",marginBottom:8}}>No course figures found yet.</p>
  <p style={{fontSize:".88rem"}}>Upload your textbook PDF to populate this section with researchers and authors cited in the course.</p>
</div>)}

{/* Results */}
{or2&&<>
  {/* Tribunal verdict summary */}
  {(oracleMode==="tribunal"||oracleMode==="verdict")&&<div style={{...card,padding:"28px 32px",marginBottom:24,borderTop:`3px solid ${GD}`,animation:"fadeUp .3s ease"}}>
    <div style={{fontSize:".72rem",fontWeight:700,letterSpacing:".12em",color:GD,marginBottom:12,fontFamily:"'Space Grotesk',sans-serif"}}>📜 TRIBUNAL SUMMARY</div>
    {(()=>{
      const agree=or2.filter(r=>r.r>=3);const disagree=or2.filter(r=>r.r<2);
      return(<>
        {agree.length>=2&&<p style={{fontSize:".95rem",color:TL,marginBottom:8}}>🤝 <strong>Common ground:</strong> {agree.map(r=>r.n).join(", ")} would likely engage with this question from similar foundations.</p>}
        {disagree.length>0&&agree.length>0&&<p style={{fontSize:".95rem",color:"#fb923c"}}>⚔ <strong>Tension:</strong> {disagree.map(r=>r.n).join(", ")} would approach this from fundamentally different premises.</p>}
      </>);
    })()}
  </div>}

  {/* Individual responses — visually distinct per philosopher */}
  <div style={{display:"flex",flexDirection:"column",gap:20}}>
    {or2.map((r,i)=>{const colors=[CY,GD,"#a78bfa",TL,"#fb923c","#f472b6"];const c2=colors[i%colors.length];
      return(<div key={i} style={{...card,padding:"32px 36px",borderLeft:`5px solid ${c2}`,animation:`fadeUp ${300+i*150}ms ease both`,boxShadow:r.r>=4?`0 0 24px ${c2}12`:`0 8px 40px rgba(0,0,0,.5)`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
          <div>
            <div style={{fontSize:"1.2rem",fontWeight:700,color:TX}}>{r.n}</div>
            <div style={{fontSize:".82rem",color:c2,fontWeight:600}}>{r.t}</div>
          </div>
          <div style={{textAlign:"right"}}>
            {r.sq.p>0&&<div style={{fontSize:".78rem",color:MU}}>Textbook p.{r.sq.p}</div>}
            <div style={{display:"flex",gap:2,marginTop:4,justifyContent:"flex-end"}}>{[...Array(5)].map((_,j)=><div key={j} style={{width:8,height:8,borderRadius:"50%",background:j<r.r?c2:`${MU}44`,transition:"all 300ms"}}/>)}</div>
          </div>
        </div>
        <div style={{padding:"20px 24px",borderRadius:16,background:innr,border:`1px solid ${BD}`,marginBottom:16}}>
          <p style={{fontSize:"1.1rem",lineHeight:1.9,color:T2,fontStyle:"italic",margin:0}}>"{r.sq.x}"</p>
        </div>
        {/* Core principle for this figure's area */}
        <div style={{fontSize:".82rem",color:c2,fontWeight:600}}>
          {(()=>{const t=r.t.toLowerCase();
            if(t.includes("memory")||t.includes("cognition"))return"🔒 Core principle: Retrieval practice strengthens memory — passive re-reading is far less effective.";
            if(t.includes("motivat")||t.includes("mindset")||t.includes("self-efficac"))return"🔒 Core principle: Intrinsic motivation and growth mindset produce more durable learning than external rewards.";
            if(t.includes("time")||t.includes("organiz")||t.includes("productiv"))return"🔒 Core principle: Planning and prioritization must precede execution — reactive work undermines goals.";
            if(t.includes("health")||t.includes("wellness")||t.includes("nutrition"))return"🔒 Core principle: Physical wellbeing — sleep, nutrition, exercise — directly underpins cognitive performance.";
            if(t.includes("stress")||t.includes("wellbeing")||t.includes("anxiet"))return"🔒 Core principle: Emotional regulation and stress management are prerequisites for academic success.";
            if(t.includes("academic")||t.includes("reading")||t.includes("writing"))return"🔒 Core principle: Active engagement with material — not passive exposure — produces genuine comprehension.";
            if(t.includes("social")||t.includes("peer")||t.includes("collaborat"))return"🔒 Core principle: Collaborative learning and peer feedback accelerate mastery beyond solo study.";
            if(t.includes("career")||t.includes("profession"))return"🔒 Core principle: Self-awareness and intentional skill-building drive long-term career success.";
            if(t.includes("neuroscience")||t.includes("brain"))return"🔒 Core principle: Neuroplasticity means learning ability is developed through practice, not fixed at birth.";
            if(t.includes("learning science")||t.includes("instruct"))return"🔒 Core principle: Evidence-based study strategies consistently outperform intuitive but ineffective ones.";
            return"🔒 Core principle: Critical thinking and evidence-based reasoning are foundational academic skills.";
          })()}
        </div>
        {/* Thesis challenge mode */}
        {oracleMode==="thesis"&&<div style={{marginTop:16,padding:"16px 20px",borderRadius:14,background:`${c2}06`,border:`1px solid ${c2}18`}}>
          <div style={{fontSize:".72rem",fontWeight:700,color:c2,marginBottom:6}}>⚔ HOW {r.n.split(" ").pop()!.toUpperCase()} WOULD CHALLENGE THIS</div>
          <p style={{fontSize:".92rem",color:T2,lineHeight:1.65,margin:0}}>
            {(()=>{const t=r.t.toLowerCase();
              if(t.includes("memory")||t.includes("cognition"))return"Would ask: does your approach incorporate active retrieval and spaced repetition? The research is clear — encoding depth determines what sticks.";
              if(t.includes("motivat")||t.includes("mindset"))return"Would question: does your strategy build intrinsic drive or just rely on external pressure? Autonomous motivation is far more durable.";
              if(t.includes("time")||t.includes("organiz"))return"Would challenge: have you built in buffers, priority triage, and review time? Effective planning anticipates obstacles, not just tasks.";
              if(t.includes("health")||t.includes("wellness"))return"Would probe: have you accounted for sleep, nutrition, and physical activity? Cognitive performance is inseparable from physical wellbeing.";
              if(t.includes("stress")||t.includes("wellbeing"))return"Would examine: is your approach sustainable alongside real emotional demands? A strategy that ignores stress will eventually break down.";
              if(t.includes("academic")||t.includes("reading"))return"Would test: are you actively processing the material or passively exposing yourself to it? Elaboration and self-testing are what the evidence supports.";
              if(t.includes("social")||t.includes("peer"))return"Would challenge: does your thesis leverage peer learning and feedback? Social context amplifies individual learning in ways solo study cannot replicate.";
              if(t.includes("career"))return"Would press: does your approach develop transferable skills alongside content knowledge? Employers value applied competency, not just grades.";
              if(t.includes("neuroscience")||t.includes("brain"))return"Would ask: is your thesis consistent with how the brain actually consolidates information? Neuroplasticity research has direct implications for how you should study.";
              if(t.includes("learning"))return"Would demand: what empirical evidence supports your approach? Effective learning strategies must be grounded in research, not just intuition.";
              return"Would ask: what evidence supports your position? Strong claims require documented sources and critical analysis, not just opinion.";
            })()}
          </p>
        </div>}
        {/* Hand off to learning */}
        <div style={{display:"flex",gap:10,marginTop:16}}>
          {cc.filter(c=>c.cat.toLowerCase().includes(r.t.toLowerCase().split(" ")[0])||r.sq.tg.some(t=>c.kw.includes(t))).slice(0,2).map(c=>(
            <button key={c.id} onClick={()=>go("forge",{c})} style={{padding:"6px 14px",borderRadius:10,border:`1px solid ${c2}33`,background:`${c2}08`,color:c2,fontSize:".75rem",fontWeight:600,cursor:"pointer"}}>Learn {c.name} →</button>
          ))}
        </div>
      </div>);
    })}
  </div>
  <div style={{textAlign:"center",marginTop:24}}>
    <button onClick={()=>{setOR(null);setOQ("");}} style={{...bt("transparent",CY),border:`1px solid ${CY}33`}}>Ask another question</button>
  </div>
</>}
</div>}

{/* ═══ COURSEWARE ═══ */}
{v==="courseware"&&<div style={{display:"grid",gridTemplateColumns:cwConcept?"340px 1fr":"1fr",gap:28,alignItems:"start"}}>
<div>
  <h2 style={{...hd(1.5),marginBottom:8}}>Course Map</h2>
  <p style={{color:T2,fontSize:".95rem",marginBottom:32}}>Explore modules, chapters, textbook content, and launch custom practice sessions.</p>

  {MODULES.map(m=>(
    <div key={m.id} style={{...card,marginBottom:16,padding:"28px 32px",cursor:"pointer",borderLeft:cwModule===m.id?`4px solid ${CY}`:`4px solid transparent`,transition:"all 300ms"}} onClick={()=>{setCWM(cwModule===m.id?null:m.id);setCWC(null);}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <h3 style={{...hd(1.1),fontFamily:"'Space Grotesk',sans-serif"}}>{m.title}</h3>
          <p style={{color:MU,fontSize:".82rem",margin:"4px 0 0"}}>{m.ch} · {m.pages}</p>
        </div>
        <span style={{fontSize:"1.2rem",transition:"transform 300ms",transform:cwModule===m.id?"rotate(180deg)":"rotate(0)"}}>{cwModule===m.id?"▾":"▸"}</span>
      </div>

      {cwModule===m.id&&<div style={{marginTop:20}} onClick={e=>e.stopPropagation()}>
        <p style={{color:T2,fontSize:".92rem",lineHeight:1.7,marginBottom:20}}>{m.desc}</p>

        {/* Textbook Chapters */}
        <div style={{fontSize:".75rem",fontWeight:700,letterSpacing:".14em",color:CY,marginBottom:12,fontFamily:"'Space Grotesk',sans-serif"}}>📖 TEXTBOOK CHAPTERS</div>
        {m.textbook.map((ch,i)=>(
          <div key={i} style={{padding:"16px 20px",borderRadius:14,background:innr,border:`1px solid ${BD}`,marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:".95rem",fontWeight:600}}>{ch.title}</span>
              <span style={{fontSize:".78rem",color:MU}}>{ch.pages}</span>
            </div>
            <p style={{fontSize:".88rem",color:T2,margin:"6px 0 0",lineHeight:1.6}}>{ch.summary}</p>
          </div>
        ))}

        {/* Concepts in this module */}
        <div style={{fontSize:".75rem",fontWeight:700,letterSpacing:".14em",color:TL,marginBottom:12,marginTop:20,fontFamily:"'Space Grotesk',sans-serif"}}>🧠 CONCEPTS</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          {m.concepts.map(id=>{const c=cc.find(x=>x.id===id);if(!c)return null;
            return(<button key={id} onClick={()=>setCWC(cwConcept===id?null:id)} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 18px",borderRadius:14,border:cwConcept===id?`2px solid ${CY}`:`1px solid ${BD}`,background:cwConcept===id?`${CY}0d`:innr,cursor:"pointer",color:TX,fontSize:".88rem",fontWeight:600,transition:"all 250ms"}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:mc2(c.mastery)}}/>
              {c.name}
              <span style={{color:mc2(c.mastery),fontSize:".78rem",fontWeight:700}}>{c.mastery>0?P(c.mastery):"—"}</span>
            </button>);
          })}
        </div>

        {/* Practice launcher */}
        <div style={{marginTop:20,padding:"20px 24px",borderRadius:16,background:`${CY}06`,border:`1px solid ${CY}18`}}>
          <div style={{fontSize:".75rem",fontWeight:700,letterSpacing:".14em",color:CY,marginBottom:12,fontFamily:"'Space Grotesk',sans-serif"}}>🎯 PRACTICE THIS MODULE</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {[5,10,25,50,100].map(n=>(
              <button key={n} onClick={()=>{
                const qs=m.concepts.flatMap(id=>generateQuestions(id,Math.ceil(n/m.concepts.length),"tf").map(q=>({...q,cid:id})));
                setPracticeQ(takeStableSubset(qs,n,`practice:${m.id}:tf:${n}`));
                setPracticeI(0);setPracticeA(null);setPracticeSc({c:0,w:0});setPracticeMode("tf");setV("practice");
              }} style={{padding:"8px 16px",borderRadius:12,border:`1px solid ${BD}`,background:innr,color:CY,fontSize:".82rem",fontWeight:600,cursor:"pointer",transition:"all 200ms"}}>
                {n} T/F
              </button>
            ))}
            {[5,10,25].map(n=>(
              <button key={"mc"+n} onClick={()=>{
                const qs=m.concepts.flatMap(id=>generateQuestions(id,Math.ceil(n/m.concepts.length),"mc").map(q=>({...q,cid:id})));
                setPracticeQ(takeStableSubset(qs,n,`practice:${m.id}:mc:${n}`));
                setPracticeI(0);setPracticeA(null);setPracticeSc({c:0,w:0});setPracticeMode("mc");setV("practice");
              }} style={{padding:"8px 16px",borderRadius:12,border:`1px solid ${BD}`,background:innr,color:GD,fontSize:".82rem",fontWeight:600,cursor:"pointer",transition:"all 200ms"}}>
                {n} MC
              </button>
            ))}
          </div>
        </div>

        {/* Related assignments */}
        <div style={{marginTop:20}}>
          <div style={{fontSize:".75rem",fontWeight:700,letterSpacing:".14em",color:"#fb923c",marginBottom:12,fontFamily:"'Space Grotesk',sans-serif"}}>📋 ASSIGNMENTS</div>
          {ASSIGNMENTS.filter(a=>a.con.some(id=>m.concepts.includes(id))).map(a=>(
            <button key={a.id} onClick={()=>go("assignment",{a})} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:innr,border:`1px solid ${BD}`,borderRadius:12,cursor:"pointer",width:"100%",color:TX,marginBottom:8,transition:"all 200ms"}}>
              <span style={{fontSize:"1.1rem"}}>{a.type}</span>
              <div style={{flex:1,textAlign:"left"}}><div style={{fontSize:".88rem",fontWeight:600}}>{a.title}</div><div style={{fontSize:".75rem",color:MU}}>{a.pts}pts · {a.due}d</div></div>
            </button>
          ))}
        </div>
      </div>}
    </div>
  ))}
</div>

{/* Concept deep-dive panel */}
{cwConcept&&(()=>{const c=cc.find(x=>x.id===cwConcept);if(!c)return null;
return(<div style={{...card,position:"sticky",top:88,padding:"28px 24px",animation:"fadeUp .35s ease"}}>
  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
    <div style={{fontSize:".7rem",fontWeight:700,letterSpacing:".14em",color:CY,fontFamily:"'Space Grotesk',sans-serif"}}>CONCEPT DETAIL</div>
    <button onClick={()=>setCWC(null)} style={{background:"none",border:"none",color:MU,cursor:"pointer",fontSize:"1.1rem",lineHeight:1,padding:"4px 8px",borderRadius:8}}>✕</button>
  </div>
  <div style={{display:"flex",alignItems:"center",gap:20,marginBottom:28}}>
    <div style={{position:"relative",width:64,height:64,flexShrink:0}}>
      <div style={{width:64,height:64,borderRadius:"50%",background:`${mc2(c.mastery)}12`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.2rem",fontWeight:900,color:mc2(c.mastery),fontFamily:"'Space Grotesk',sans-serif"}}>{P(c.mastery)}</div>
      <svg style={{position:"absolute",inset:-3}} viewBox="0 0 70 70"><circle cx="35" cy="35" r="32" fill="none" stroke={DM} strokeWidth="3"/><circle cx="35" cy="35" r="32" fill="none" stroke={mc2(c.mastery)} strokeWidth="3" strokeDasharray={`${c.mastery*201} 201`} strokeLinecap="round" transform="rotate(-90 35 35)" style={{transition:"stroke-dasharray 800ms ease"}}/></svg>
    </div>
    <div>
      <div style={{fontSize:".68rem",fontWeight:700,letterSpacing:".12em",color:mc2(c.mastery),textTransform:"uppercase",fontFamily:"'Space Grotesk',sans-serif"}}>{c.cat}</div>
      <h3 style={{...hd(1.2),marginTop:2}}>{c.name}</h3>
    </div>
  </div>
  {buildConceptPanels(c).slice(0,4).map((panel)=>(
    <div key={panel.id} style={{marginBottom:18,padding:"16px 20px",borderRadius:14,background:innr,border:`1px solid ${BD}`,borderLeft:`3px solid ${panel.color}`}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
        <span style={{fontSize:".88rem"}}>{panel.icon}</span>
        <span style={{fontSize:".7rem",fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:panel.color,fontFamily:"'Space Grotesk',sans-serif"}}>{panel.label}</span>
      </div>
      <p style={{fontSize:".9rem",lineHeight:1.75,color:T2,margin:0}}>{panel.body}</p>
    </div>
  ))}
  {c.kw.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:20}}>{c.kw.slice(0,6).map(k=><span key={k} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${BD}`,fontSize:".75rem",color:MU,background:innr}}>{k}</span>)}</div>}
  <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:8}}>
    <button onClick={()=>go("forge",{c})} style={{...bt(`linear-gradient(135deg,${CY},#0066ff)`,"#000")}}>⚡ Forge this concept</button>
    <button onClick={()=>{setSC(c);go("explore");}} style={{...bt("transparent",CY),border:`1px solid ${CY}33`}}>🔍 View in Explore</button>
  </div>
</div>);})()}

</div>}

{/* ═══ PRACTICE MODE ═══ */}
{v==="practice"&&practiceQ.length>0&&(()=>{
const q=practiceQ[practiceI];
if(!q)return(<div style={{maxWidth:820,margin:"0 auto"}}><div style={{...card,textAlign:"center",padding:68}}>
  <div style={{fontSize:"2.5rem",marginBottom:20}}>🏆</div>
  <h3 style={{...hd(1.4),background:`linear-gradient(135deg,${CY},${TL},${GD})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Practice Complete!</h3>
  <p style={{fontSize:"1.2rem",color:TX,margin:"16px 0 6px"}}>{practiceSc.c} correct out of {practiceSc.c+practiceSc.w}</p>
  <p style={{fontSize:"1rem",color:MU}}>{(practiceSc.c+practiceSc.w)>0?Math.round(practiceSc.c/(practiceSc.c+practiceSc.w)*100):0}% accuracy</p>
  <div style={{display:"flex",gap:14,justifyContent:"center",marginTop:32}}>
    <button onClick={()=>go("courseware")} style={bt(`linear-gradient(135deg,${CY},#0080ff)`,"#000")}>Back to Courseware</button>
    <button onClick={()=>go("home")} style={{...bt("transparent",MU),border:`1px solid ${BD}`}}>Home</button>
  </div>
</div></div>);

return(<div style={{maxWidth:820,margin:"0 auto"}}>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28}}>
    <div style={{fontSize:".88rem",fontWeight:700,color:CY,fontFamily:"'Space Grotesk',sans-serif"}}>PRACTICE · {practiceI+1}/{practiceQ.length}</div>
    <div style={{display:"flex",gap:16,fontSize:".95rem",fontWeight:700}}><span style={{color:TL}}>✓{practiceSc.c}</span><span style={{color:RD}}>✗{practiceSc.w}</span></div>
  </div>
  <div style={{width:"100%",height:6,borderRadius:3,background:DM,marginBottom:28,overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,background:`linear-gradient(90deg,${CY},${TL})`,width:`${practiceQ.length>0?(practiceI/practiceQ.length)*100:0}%`,transition:"width 400ms ease"}}/></div>

  {practiceMode==="tf"&&<div style={{...card,borderTop:`3px solid ${TL}`}}>
    <p style={{fontSize:"1.15rem",lineHeight:1.9,color:T2,margin:"0 0 32px"}}>{q.statement}</p>
    {practiceA===null?<div style={{display:"flex",gap:18}}>
      <button onClick={()=>{const ok=q.answer;setPracticeA(true);setPracticeSc(s=>({c:s.c+(ok?1:0),w:s.w+(ok?0:1)}));if(ok){bump(q.cid,.02);recordAnswerFlow(true,q.cid,q);flash("✓",true);}else{recordAnswerFlow(false,q.cid,q);flash("✗",false);}}} style={{flex:1,padding:"22px",borderRadius:18,fontWeight:700,fontSize:"1.1rem",cursor:"pointer",background:`${TL}12`,color:TL,border:`2px solid ${TL}44`}}>TRUE</button>
      <button onClick={()=>{const ok=!q.answer;setPracticeA(false);setPracticeSc(s=>({c:s.c+(ok?1:0),w:s.w+(ok?0:1)}));if(ok){bump(q.cid,.02);recordAnswerFlow(true,q.cid,q);flash("✓",true);}else{recordAnswerFlow(false,q.cid,q);flash("✗",false);}}} style={{flex:1,padding:"22px",borderRadius:18,fontWeight:700,fontSize:"1.1rem",cursor:"pointer",background:`${RD}12`,color:RD,border:`2px solid ${RD}44`}}>FALSE</button>
    </div>:<>
      <div style={{padding:"18px 22px",borderRadius:16,background:practiceA===q.answer?`${TL}12`:`${RD}12`,border:`2px solid ${practiceA===q.answer?TL:RD}`,marginBottom:18,fontSize:"1.02rem",animation:"fadeUp .3s ease"}}><strong>{practiceA===q.answer?"✓ Correct":"✗ Incorrect"}</strong></div>
      {prefs.showExplanations&&<p style={{fontSize:"1rem",lineHeight:1.8,color:T2}}>{q.explanation}</p>}
      <button onClick={()=>{setPracticeI(p=>p+1);setPracticeA(null);}} style={{...bt(`linear-gradient(135deg,${TL},#00b088)`,"#000"),marginTop:22}}>Next →</button>
    </>}
  </div>}

  {practiceMode==="mc"&&<div style={{...card,borderTop:`3px solid ${GD}`}}>
    <p style={{fontSize:"1.15rem",lineHeight:1.9,color:T2,margin:"0 0 28px"}}>{q.question}</p>
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {q.options.map((o,i)=>(<button key={i} onClick={()=>{if(practiceA!==null)return;const ok=i===q.correctIndex;setPracticeA(i);setPracticeSc(s=>({c:s.c+(ok?1:0),w:s.w+(ok?0:1)}));if(ok){bump(q.cid,.04);recordAnswerFlow(true,q.cid,q);flash("✓",true);}else{recordAnswerFlow(false,q.cid,q);flash("✗",false);}}} style={{textAlign:"left",padding:"20px 24px",borderRadius:16,border:`2px solid ${practiceA!==null&&i===q.correctIndex?TL:practiceA===i&&i!==q.correctIndex?RD:BD}`,background:practiceA!==null&&i===q.correctIndex?`${TL}0a`:practiceA===i&&i!==q.correctIndex?`${RD}0a`:innr,cursor:practiceA!==null?"default":"pointer",color:TX,fontSize:"1rem",width:"100%",opacity:practiceA!==null&&practiceA!==i&&i!==q.correctIndex?.2:1,transition:"all 300ms"}}>{o}</button>))}
    </div>
    {practiceA!==null&&<><p style={{fontSize:"1rem",lineHeight:1.8,color:T2,marginTop:22,animation:"fadeUp .3s ease"}}>{q.explanation}</p>
      <button onClick={()=>{setPracticeI(p=>p+1);setPracticeA(null);}} style={{...bt(`linear-gradient(135deg,${GD},#cc8800)`,"#000"),marginTop:22}}>Next →</button></>}
  </div>}
</div>);
})()}

{/* ═══ READER OS ═══ */}
{v==="reader"&&<div style={{marginLeft:-44,marginRight:-44,marginTop:-48,minHeight:"calc(100dvh - 68px)",display:"flex",background:"#050510"}}>
  <div style={{width:readerContent?280:0,flexShrink:0,borderRight:`1px solid ${BD}`,padding:readerContent?"28px 20px":"0",overflowY:"auto",background:"rgba(6,6,16,.6)",transition:"width 300ms ease"}}>
    {readerContent&&<>
      <button onClick={()=>{setReadingPositions(p=>({...p,[readerContent.id]:readerSection}));setReaderContent(null);}} style={{background:"none",border:"none",color:MU,cursor:"pointer",fontSize:".82rem",marginBottom:20}}>← Library</button>
      <div style={{fontSize:".68rem",fontWeight:700,letterSpacing:".14em",color:CY,marginBottom:12,fontFamily:"'Space Grotesk',sans-serif"}}>📖 CHAPTER</div>
      <h3 style={{fontSize:"1rem",fontWeight:700,color:TX,lineHeight:1.4,marginBottom:4}}>{readerContent.title}</h3>
      <p style={{fontSize:".78rem",color:MU,marginBottom:4}}>{readerContent.subtitle}</p>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20}}><div style={{flex:1,height:4,borderRadius:2,background:DM,overflow:"hidden"}}><div style={{height:"100%",borderRadius:2,background:`linear-gradient(90deg,${CY},${TL})`,width:`${getReadingProgress(readerContent.id,readerContent.sections.length)}%`,transition:"width 500ms ease"}}/></div><span style={{fontSize:".72rem",color:CY,fontWeight:700}}>{getReadingProgress(readerContent.id,readerContent.sections.length)}%</span></div>
      <div style={{fontSize:".62rem",fontWeight:700,letterSpacing:".12em",color:MU,marginBottom:10}}>SECTIONS</div>
      {readerContent.sections.map((s,i)=>{const mark=getSectionMark(readerContent.id,i);const read=isSectionRead(readerContent.id,i);const active=readerSection===i;
        return(<button key={i} id={"rail-btn-"+i} onClick={()=>{setReaderSection(i);setReadingPositions(p=>({...p,[readerContent.id]:i}));markSectionRead(readerContent.id,i);const el=document.getElementById("rs-"+i);if(el)el.scrollIntoView({behavior:"smooth",block:"start"});}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",padding:"10px 14px",borderRadius:12,marginBottom:3,background:active?`${CY}0c`:"transparent",border:active?`1px solid ${CY}1a`:"1px solid transparent",cursor:"pointer",transition:"all 250ms"}}>
          <div style={{width:8,height:8,borderRadius:"50%",flexShrink:0,background:mark?sectionMarkColor(mark):read?`${TL}66`:active?CY:`${MU}44`,transition:"all 300ms"}}/>
          <span style={{flex:1,fontSize:".84rem",fontWeight:active?600:400,color:active?CY:read?TX:T2,lineHeight:1.35}}>{s.heading}</span>
          {mark&&<span style={{fontSize:".7rem",color:sectionMarkColor(mark),fontWeight:700}}>{sectionMarkIcon(mark)}</span>}
        </button>);
      })}
      {readerContent.concepts&&readerContent.concepts.length>0&&<><div style={{fontSize:".62rem",fontWeight:700,letterSpacing:".12em",color:TL,marginTop:24,marginBottom:10}}>CONCEPTS</div>
        {readerContent.concepts.map(id=>{const c=cc.find(x=>x.id===id);if(!c)return null;return(<button key={id} onClick={()=>go("forge",{c})} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:10,background:innr,border:`1px solid ${BD}`,cursor:"pointer",width:"100%",color:TX,fontSize:".82rem",marginBottom:4}}><span style={{fontSize:".7rem"}}>{memoryStageIcon(getMemoryStage(c.id))}</span><span style={{flex:1}}>{c.name}</span><span style={{color:mc2(c.mastery),fontSize:".72rem",fontWeight:600}}>{c.mastery>0?P(c.mastery):""}</span></button>);})}</>}
    </>}
  </div>
  {hlPopover&&<div style={{position:"fixed",left:Math.max(60,Math.min(hlPopover.x-140,window.innerWidth-340)),top:Math.max(10,hlPopover.y-52),zIndex:200,animation:"fadeUp .15s ease"}}><div style={{display:"flex",gap:4,padding:"8px 10px",borderRadius:14,background:"rgba(8,8,20,.95)",border:`1px solid ${BD}`,boxShadow:"0 8px 32px rgba(0,0,0,.6)"}}>
    {[["key idea","★"],["evidence","📌"],["quote","❝"],["thesis fuel","✦"],["confusing","?"],["revisit","↻"]].map(([tag,icon])=>(<button key={tag} onClick={()=>addHighlight(tag)} style={{padding:"6px 10px",borderRadius:10,border:`1px solid ${BD}`,background:"transparent",color:hlTagColor(tag),fontSize:".7rem",fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>{icon} {tag}</button>))}
    <button onClick={()=>{setHlPopover(null);window.getSelection()?.removeAllRanges();}} style={{padding:"4px 8px",borderRadius:8,border:"none",background:"transparent",color:MU,cursor:"pointer"}}>✕</button>
  </div></div>}
  <div ref={readerScrollRef} style={{flex:1,overflowY:"auto",display:"flex",justifyContent:"center"}}>
    {readerContent?<div style={{maxWidth:680,padding:"56px 48px 120px",animation:"fadeUp .4s ease"}}>
      {readingPositions[readerContent.id]>0&&readerSection===readingPositions[readerContent.id]&&<div style={{padding:"14px 20px",borderRadius:14,background:`${CY}06`,border:`1px solid ${CY}15`,marginBottom:32}}><span style={{fontSize:".85rem",color:CY}}>↻ Resumed from "{readerContent.sections[readerSection]?.heading}"</span></div>}
      <div style={{marginBottom:48,paddingBottom:32,borderBottom:`1px solid ${BD}`}}><div style={{fontSize:".72rem",fontWeight:700,letterSpacing:".2em",color:CY,marginBottom:12,fontFamily:"'Space Grotesk',sans-serif"}}>{readerContent.subtitle}</div><h1 style={{fontSize:"2.2rem",fontWeight:700,color:TX,lineHeight:1.35,marginBottom:12,fontFamily:"'Space Grotesk',sans-serif"}}>{readerContent.title}</h1></div>
      {readerContent.sections.map((s,i)=>{const mark=getSectionMark(readerContent.id,i);const active=readerSection===i;return(<div key={i} id={"rs-"+i} data-section-idx={i} style={{marginBottom:48,scrollMarginTop:80,padding:"24px 28px",marginLeft:-28,marginRight:-28,borderRadius:18,background:mark==="understood"?"rgba(6,214,160,.03)":mark==="confusing"?"rgba(255,68,102,.02)":"transparent",border:mark==="understood"?"1px solid rgba(6,214,160,.08)":mark==="confusing"?"1px solid rgba(255,68,102,.06)":"1px solid transparent",transition:"all 500ms ease"}}>
        {readerContent.concepts&&active&&(()=>{const c=cc.find(x=>x.id===readerContent.concepts[0]);if(!c)return null;return(<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"10px 14px",borderRadius:12,background:`${CY}04`,border:`1px solid ${CY}0a`}}><span style={{fontSize:".72rem"}}>{memoryStageIcon(getMemoryStage(c.id))}</span><span style={{fontSize:".78rem",color:CY,fontWeight:600}}>{c.name}</span></div>);})()}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}><div style={{width:4,height:32,borderRadius:2,background:active?CY:mark?sectionMarkColor(mark):"transparent",transition:"all 400ms ease",flexShrink:0}}/><h2 style={{fontSize:"1.4rem",fontWeight:700,color:active?TX:T2,lineHeight:1.4,fontFamily:"'Space Grotesk',sans-serif",margin:0,flex:1}}>{s.heading}</h2>{mark&&<span style={{fontSize:".72rem",fontWeight:700,color:sectionMarkColor(mark),padding:"4px 10px",borderRadius:8,background:sectionMarkColor(mark)+"12"}}>{sectionMarkIcon(mark)} {mark}</span>}</div>
        {s.body.split("\n\n").map((para,j)=>(<p key={j} style={{fontSize:"1.08rem",lineHeight:2.05,color:T2,marginBottom:20,letterSpacing:".01em"}}>{para}</p>))}
        {(()=>{const key=readerContent.id+":"+i;const notes=MARGINS[key];if(!notes||!notes.length)return null;const visible=active?notes:notes.filter(n=>n.type==="confusion");if(!visible.length)return null;return(<div style={{marginTop:8,marginBottom:16,display:"flex",flexDirection:"column",gap:8,animation:active?"fadeUp .4s ease":"none"}}>{visible.map((note,ni)=>{const dismissed=marginDismissed.has(key+":"+ni);if(dismissed)return null;const mt=MARGIN_TYPES[note.type]||{icon:"•",label:"Note"};return(<div key={ni} style={{display:"flex",gap:12,padding:"12px 16px",borderRadius:14,background:note.color+"06",borderLeft:`3px solid ${note.color}44`}}><span style={{fontSize:".82rem",flexShrink:0}}>{mt.icon}</span><div style={{flex:1}}><div style={{fontSize:".64rem",fontWeight:700,letterSpacing:".1em",color:note.color,marginBottom:4}}>{mt.label.toUpperCase()}</div><p style={{fontSize:".85rem",lineHeight:1.6,color:T2,margin:0}}>{note.text}</p></div><button onClick={()=>setMarginDismissed(p=>new Set([...p,key+":"+ni]))} style={{background:"none",border:"none",color:MU,cursor:"pointer",fontSize:".72rem",opacity:.5}}>✕</button></div>);})}</div>);})()}
        <div style={{display:"flex",alignItems:"center",gap:6,marginTop:12,paddingTop:12,borderTop:"1px solid rgba(50,50,100,.25)",flexWrap:"wrap"}}>{["understood","important","revisit","confusing"].map(m=>(<button key={m} onClick={()=>markSection(readerContent.id,i,m)} style={{padding:"5px 12px",borderRadius:10,border:`1px solid ${mark===m?sectionMarkColor(m)+"44":BD}`,background:mark===m?sectionMarkColor(m)+"12":"transparent",color:mark===m?sectionMarkColor(m):MU,fontSize:".72rem",fontWeight:600,cursor:"pointer"}}>{sectionMarkIcon(m)} {m}</button>))}<div style={{flex:1}}/><button onClick={()=>{setReaderSaved(p=>[...p,{heading:s.heading,body:s.body.slice(0,120),from:readerContent.title}]);flash("Saved",true);}} style={{padding:"5px 12px",borderRadius:10,border:`1px solid ${BD}`,background:"transparent",color:MU,fontSize:".72rem",cursor:"pointer"}}>💾</button></div>
      </div>);})}
      <div style={{textAlign:"center",padding:"40px 0",borderTop:`1px solid ${BD}`}}><p style={{color:TX,fontSize:"1.05rem",fontWeight:600,marginBottom:16}}>Chapter complete</p><div style={{display:"flex",gap:12,justifyContent:"center"}}>{readerContent.concepts&&readerContent.concepts[0]&&<button onClick={()=>{const c=cc.find(x=>x.id===readerContent.concepts[0]);if(c)go("forge",{c});}} style={bt(`linear-gradient(135deg,${CY},#0066ff)`,"#000")}>⚡ Practice</button>}<button onClick={()=>setReaderContent(null)} style={{...bt("transparent",MU),border:`1px solid ${BD}`}}>Library</button></div></div>
    </div>:
    <div style={{maxWidth:720,padding:"56px 48px",width:"100%"}}><div style={{textAlign:"center",marginBottom:40}}><div style={{fontSize:"2rem",marginBottom:12}}>📖</div><h2 style={{...hd(1.5),marginBottom:8}}>Reader</h2><p style={{color:T2,fontSize:"1rem"}}>Focused, distraction-free reading.</p></div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>{READING.map(r=>{const prog=getReadingProgress(r.id,r.sections.length);const lastPos=readingPositions[r.id];return(<button key={r.id} onClick={()=>openReader(r.id)} style={{display:"flex",alignItems:"center",gap:16,padding:"22px 26px",borderRadius:18,background:CD2,border:`1px solid ${BD}`,cursor:"pointer",color:TX,textAlign:"left",width:"100%"}}><div style={{position:"relative",width:44,height:44,flexShrink:0}}><svg viewBox="0 0 44 44" style={{width:44,height:44}}><circle cx="22" cy="22" r="19" fill="none" stroke={DM} strokeWidth="3"/><circle cx="22" cy="22" r="19" fill="none" stroke={prog>=100?TL:prog>0?CY:DM} strokeWidth="3" strokeDasharray={`${prog/100*119} 119`} strokeLinecap="round" transform="rotate(-90 22 22)"/></svg><div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:".7rem"}}>{prog>=100?"✓":"📖"}</div></div><div style={{flex:1}}><div style={{fontSize:"1.02rem",fontWeight:600,marginBottom:2}}>{r.title}</div><div style={{fontSize:".82rem",color:MU}}>{r.subtitle}</div>{lastPos>0&&prog<100&&<div style={{fontSize:".75rem",color:CY,marginTop:4}}>↻ Resume from "{r.sections[lastPos]?.heading}"</div>}</div><span style={{color:CY}}>→</span></button>);})}</div>
      {highlights.length>0&&<div style={{marginTop:36}}><div style={{fontSize:".72rem",fontWeight:700,letterSpacing:".14em",color:"#a78bfa",marginBottom:12}}>HIGHLIGHTS ({highlights.length})</div>{highlights.slice(0,8).map(hl=>(<div key={hl.id} style={{padding:"12px 16px",borderRadius:12,background:innr,border:`1px solid ${BD}`,borderLeft:`3px solid ${hlTagColor(hl.tag)}`,marginBottom:6}}><div style={{fontSize:".7rem",color:hlTagColor(hl.tag),fontWeight:700,marginBottom:4}}>{hlTagIcon(hl.tag)} {hl.tag}</div><p style={{fontSize:".82rem",color:T2,margin:0}}>{hl.text.length>80?hl.text.slice(0,80)+"...":hl.text}</p></div>))}</div>}
    </div>}
  </div>
  {readerContent&&<div style={{width:readerUtilOpen?240:48,flexShrink:0,borderLeft:`1px solid ${BD}`,background:"rgba(6,6,16,.6)",transition:"width 300ms ease",overflow:"hidden"}}><button onClick={()=>setReaderUtilOpen(!readerUtilOpen)} style={{width:48,height:48,display:"flex",alignItems:"center",justifyContent:"center",background:"none",border:"none",color:MU,cursor:"pointer",fontSize:"1.1rem"}}>{readerUtilOpen?"▸":"◂"}</button>{readerUtilOpen&&<div style={{padding:"0 16px 28px"}}><div style={{fontSize:".68rem",fontWeight:700,letterSpacing:".12em",color:MU,marginBottom:16}}>TOOLS</div><div style={{fontSize:"1.4rem",fontWeight:800,color:CY,marginBottom:12}}>{getReadingProgress(readerContent.id,readerContent.sections.length)}%</div><div style={{display:"flex",flexDirection:"column",gap:8}}>{readerContent.concepts&&readerContent.concepts[0]&&<button onClick={()=>{const c=cc.find(x=>x.id===readerContent.concepts[0]);if(c)go("forge",{c});}} style={{padding:"12px 14px",borderRadius:12,border:`1px solid ${CY}33`,background:`${CY}08`,color:CY,fontSize:".82rem",fontWeight:600,cursor:"pointer",textAlign:"left"}}>⚡ Practice</button>}<button onClick={()=>go("oracle")} style={{padding:"12px 14px",borderRadius:12,border:`1px solid ${GD}33`,background:`${GD}08`,color:GD,fontSize:".82rem",fontWeight:600,cursor:"pointer",textAlign:"left"}}>🏛 Oracle</button></div></div>}</div>}
</div>}

{/* ═══ TRANSCRIPT MODE ═══ */}
{v==="transcript"&&transcript&&<div style={{marginLeft:-44,marginRight:-44,marginTop:-48,minHeight:"calc(100dvh - 68px)",display:"flex",background:"#050510"}}>
  <div style={{width:260,flexShrink:0,borderRight:`1px solid ${BD}`,padding:"28px 20px",overflowY:"auto",background:"rgba(6,6,16,.6)"}}>
    <button onClick={()=>{setTranscript(null);go("reader");}} style={{background:"none",border:"none",color:MU,cursor:"pointer",fontSize:".82rem",marginBottom:20}}>← Reader</button>
    <div style={{fontSize:".68rem",fontWeight:700,letterSpacing:".14em",color:"#a78bfa",marginBottom:12}}>🎧 TRANSCRIPT</div>
    <h3 style={{fontSize:"1rem",fontWeight:700,color:TX,lineHeight:1.4,marginBottom:4}}>{transcript.title}</h3>
    <p style={{fontSize:".78rem",color:MU,marginBottom:16}}>{transcript.speaker} · {formatTime(transcript.duration)}</p>
    <div style={{padding:"14px 16px",borderRadius:14,background:innr,border:`1px solid ${BD}`,marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><button onClick={()=>setTxPlaying(!txPlaying)} style={{width:36,height:36,borderRadius:"50%",border:"2px solid #a78bfa",background:txPlaying?"#a78bfa":"transparent",color:txPlaying?"#000":"#a78bfa",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>{txPlaying?"⏸":"▶"}</button><div style={{flex:1}}><div style={{fontSize:".88rem",fontWeight:700,color:TX}}>{formatTime(txTime)}</div><div style={{height:4,borderRadius:2,background:DM,marginTop:4,overflow:"hidden",cursor:"pointer"}} onClick={(e)=>{const rect=e.currentTarget.getBoundingClientRect();setTxTime(Math.floor((e.clientX-rect.left)/rect.width*transcript.duration));}}><div style={{height:"100%",borderRadius:2,background:"#a78bfa",width:`${(txTime/transcript.duration)*100}%`}}/></div></div></div>
      <div style={{display:"flex",gap:6}}><button onClick={()=>setTxTime(p=>Math.max(0,p-15))} style={{padding:"3px 8px",borderRadius:6,border:`1px solid ${BD}`,background:"transparent",color:MU,fontSize:".7rem",cursor:"pointer"}}>-15s</button><button onClick={()=>setTxTime(p=>Math.min(transcript.duration,p+15))} style={{padding:"3px 8px",borderRadius:6,border:`1px solid ${BD}`,background:"transparent",color:MU,fontSize:".7rem",cursor:"pointer"}}>+15s</button><div style={{flex:1}}/><button onClick={()=>setTxAutoScroll(!txAutoScroll)} style={{padding:"3px 8px",borderRadius:6,border:`1px solid ${txAutoScroll?"#a78bfa33":BD}`,background:txAutoScroll?"rgba(167,139,250,.08)":"transparent",color:txAutoScroll?"#a78bfa":MU,fontSize:".7rem",cursor:"pointer"}}>{txAutoScroll?"Auto ✓":"Auto"}</button></div>
    </div>
    {transcript.segments.map(seg=>{const segActive=txTime>=seg.ts&&(!transcript.segments.find(s2=>s2.ts>seg.ts)||txTime<transcript.segments.find(s2=>s2.ts>seg.ts).ts);return(<button key={seg.id} onClick={()=>setTxTime(seg.ts)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",padding:"8px 12px",borderRadius:10,marginBottom:3,background:segActive?"rgba(167,139,250,.1)":"transparent",border:segActive?"1px solid rgba(167,139,250,.18)":"1px solid transparent",cursor:"pointer"}}><div style={{width:6,height:6,borderRadius:"50%",background:segActive?"#a78bfa":`${MU}44`,flexShrink:0}}/><div><div style={{fontSize:".8rem",fontWeight:segActive?600:400,color:segActive?"#a78bfa":TX}}>{seg.label}</div><div style={{fontSize:".65rem",color:MU}}>{formatTime(seg.ts)}</div></div></button>);})}
  </div>
  <div style={{flex:1,overflowY:"auto",display:"flex",justifyContent:"center"}}><div style={{maxWidth:700,padding:"56px 48px 120px",width:"100%"}}>
    <div style={{marginBottom:48,paddingBottom:32,borderBottom:`1px solid ${BD}`}}><div style={{fontSize:".72rem",fontWeight:700,letterSpacing:".2em",color:"#a78bfa",marginBottom:12}}>🎧 LECTURE TRANSCRIPT</div><h1 style={{fontSize:"2rem",fontWeight:700,color:TX,lineHeight:1.35,marginBottom:8,fontFamily:"'Space Grotesk',sans-serif"}}>{transcript.title}</h1><span style={{fontSize:".88rem",color:T2}}>{transcript.speaker} · {formatTime(transcript.duration)}</span></div>
    {transcript.segments.map(seg=>{const segActive=txTime>=seg.ts&&(!transcript.segments.find(s2=>s2.ts>seg.ts)||txTime<transcript.segments.find(s2=>s2.ts>seg.ts).ts);return(<div key={seg.id} style={{marginBottom:32}}><div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${segActive?"rgba(167,139,250,.15)":BD}`}}><div style={{width:4,height:20,borderRadius:2,background:segActive?"#a78bfa":"transparent"}}/><h3 style={{fontSize:"1.1rem",fontWeight:700,color:segActive?TX:T2,fontFamily:"'Space Grotesk',sans-serif",margin:0,flex:1}}>{seg.label}</h3><span style={{fontSize:".75rem",color:MU}}>{formatTime(seg.ts)}</span></div>
      {seg.lines.map((line,li)=>{const lineActive=txTime>=line.t&&(li<seg.lines.length-1?txTime<seg.lines[li+1].t:true)&&segActive;return(<button key={li} onClick={()=>{setTxTime(line.t);if(!txPlaying)setTxPlaying(true);}} style={{display:"flex",gap:12,padding:"10px 14px",marginBottom:2,borderRadius:12,width:"100%",textAlign:"left",cursor:"pointer",border:"none",background:lineActive?"rgba(167,139,250,.08)":"transparent",transition:"all 300ms"}}><span style={{fontSize:".7rem",color:lineActive?"#a78bfa":MU,fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,minWidth:36,paddingTop:3,flexShrink:0}}>{formatTime(line.t)}</span><span style={{fontSize:"1.02rem",lineHeight:1.8,color:lineActive?TX:T2}}>{line.text}</span></button>);})}</div>);})}
  </div></div>
</div>}

{/* ═══ DISTINCTION GYM ═══ */}
{v==="gym"&&<div style={{maxWidth:920,margin:"0 auto"}}>
{!gymPair?<><div style={{...card,textAlign:"center",marginBottom:24}}><div style={ey}>DISTINCTION GYM</div><h2 style={hd(1.4)}>Sharpen Your Concept Boundaries</h2><p style={{color:T2,fontSize:"1rem",marginTop:10}}>Master the differences between concepts that students commonly confuse.</p></div>
  {DISTS.filter(d=>cc.find(c=>c.id===d.a)&&cc.find(c=>c.id===d.b)).length===0?<div style={{...card,textAlign:"center",padding:"60px 24px",color:MU}}><div style={{fontSize:"2.5rem",marginBottom:16}}>🥊</div><p style={{fontSize:"1rem",marginBottom:20}}>No concept pairs available yet for this course.</p><button onClick={()=>go("journey")} style={{...bt(`linear-gradient(135deg,${CY},#0066ff)`,"#000")}}>Explore the Atlas →</button></div>
  :<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>{DISTS.map((d,i)=>{const cA=cc.find(c=>c.id===d.a);const cB=cc.find(c=>c.id===d.b);if(!cA||!cB)return null;return(<button key={i} onClick={()=>{setGymPair(d);setGymA(null);setGymExplained(false);}} style={{...card,padding:"28px",cursor:"pointer",textAlign:"center"}}><div style={{fontSize:".72rem",fontWeight:700,color:CY,marginBottom:12}}>{d.label}</div><div style={{display:"flex",justifyContent:"center",gap:8}}><span style={{padding:"4px 12px",borderRadius:10,background:`${CY}0a`,border:`1px solid ${CY}15`,fontSize:".82rem",color:CY}}>{cA.name}</span><span style={{color:MU,fontSize:".82rem"}}>vs</span><span style={{padding:"4px 12px",borderRadius:10,background:`${TL}0a`,border:`1px solid ${TL}15`,fontSize:".82rem",color:TL}}>{cB.name}</span></div></button>);})}</div>}
</>:
(()=>{const cA=cc.find(c=>c.id===gymPair.a);const cB=cc.find(c=>c.id===gymPair.b);if(!cA||!cB)return null;return(<div>
  <button onClick={()=>setGymPair(null)} style={{background:"none",border:"none",color:MU,cursor:"pointer",fontSize:".88rem",marginBottom:20}}>← All Pairs</button>
  <div style={{...card,borderTop:`3px solid ${CY}`,marginBottom:20}}><div style={ey}>{gymPair.label}</div>
    <div style={{padding:"20px 24px",borderRadius:16,background:innr,border:`1px solid ${BD}`,marginBottom:16}}><div style={{fontSize:".68rem",fontWeight:700,color:TL,marginBottom:8}}>THE BORDER</div><p style={{fontSize:".95rem",color:T2,lineHeight:1.7,margin:0}}>{gymPair.border}</p></div>
    <div style={{padding:"20px 24px",borderRadius:16,background:innr,border:`1px solid ${BD}`,marginBottom:16}}><div style={{fontSize:".68rem",fontWeight:700,color:RD,marginBottom:8}}>THE TRAP</div><p style={{fontSize:".95rem",color:T2,lineHeight:1.7,margin:0}}>{gymPair.trap}</p></div>
    <div style={{padding:"20px 24px",borderRadius:16,background:innr,border:`1px solid ${BD}`,marginBottom:16}}><div style={{fontSize:".68rem",fontWeight:700,color:"#fb923c",marginBottom:8}}>WHY STUDENTS CONFUSE THEM</div><p style={{fontSize:".95rem",color:T2,lineHeight:1.7,margin:0}}>{gymPair.twins}</p></div>
    <div style={{display:"flex",gap:12,marginTop:20}}>
      <button onClick={()=>go("forge",{c:cA})} style={bt(`linear-gradient(135deg,${CY},#0066ff)`,"#000")}>⚡ Practice {cA.name}</button>
      <button onClick={()=>go("forge",{c:cB})} style={{...bt("transparent",TL),border:`1px solid ${TL}33`}}>⚡ Practice {cB.name}</button>
    </div>
  </div>
</div>);})()}
</div>}

{/* Forge empty state — shown when no concepts are available for this course */}
{v==="forge"&&!fc&&<div style={{maxWidth:620,margin:"0 auto",textAlign:"center",padding:"80px 24px"}}>
  <div style={{fontSize:"3.5rem",marginBottom:24}}>🧠</div>
  <h2 style={{...hd(1.6),marginBottom:12}}>No Concepts to Practice Yet</h2>
  <p style={{color:T2,fontSize:"1rem",lineHeight:1.7,marginBottom:32}}>This course focuses on skill-building activities rather than concept vocabulary. Neural Forge works best with courses that have defined concepts to master — check back after exploring the Atlas or contact your instructor about concept resources.</p>
  <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
    <button onClick={()=>go("journey")} style={{...bt(`linear-gradient(135deg,${CY},#0066ff)`,"#000")}}>View Atlas →</button>
    <button onClick={()=>go("reader")} style={{...bt("transparent",TL),border:`1px solid ${TL}33`}}>Browse Reading →</button>
  </div>
</div>}

{/* ═══ SETTINGS ═══ */}
{v==="settings"&&<div style={{maxWidth:560,margin:"0 auto"}}><div style={{...card}}>
<div style={ey}>SETTINGS</div>
<div style={{marginBottom:20}}>
<div style={{fontSize:".82rem",color:T2,marginBottom:8}}>Questions per set</div>
<div style={{display:"flex",gap:8}}>{[5,10,25,50].map(n=><button key={n} onClick={()=>setQN(n)} style={{padding:"10px 20px",borderRadius:12,border:`1px solid ${qn===n?CY:BD}`,background:qn===n?`${CY}15`:"transparent",color:qn===n?CY:MU,fontWeight:700,cursor:"pointer"}}>{n}</button>)}</div></div>
<div style={{marginBottom:20}}>
<div style={{fontSize:".82rem",color:T2,marginBottom:8}}>Difficulty</div>
<div style={{display:"flex",gap:8}}>{["mixed","hard","review"].map(d=><button key={d} onClick={()=>setDiff(d)} style={{padding:"10px 20px",borderRadius:12,border:`1px solid ${diff===d?CY:BD}`,background:diff===d?`${CY}15`:"transparent",color:diff===d?CY:MU,fontWeight:600,cursor:"pointer",textTransform:"capitalize"}}>{d}</button>)}</div></div>
<div style={{marginBottom:20}}>
<div style={{fontSize:".82rem",color:T2,marginBottom:8}}>Learning mode</div>
<div style={{display:"flex",gap:8}}>{["learn","test","adaptive"].map(m=><button key={m} onClick={()=>setMode(m)} style={{padding:"10px 20px",borderRadius:12,border:`1px solid ${mode===m?CY:BD}`,background:mode===m?`${CY}15`:"transparent",color:mode===m?CY:MU,fontWeight:600,cursor:"pointer",textTransform:"capitalize"}}>{m}</button>)}</div></div>
<div style={{marginBottom:20}}>
<div style={{fontSize:".75rem",fontWeight:700,letterSpacing:".14em",color:"#a78bfa",marginBottom:12,fontFamily:"'Space Grotesk',sans-serif"}}>📝 SESSION NOTES</div>
<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Jot anything — key insights, reminders, questions for office hours…" rows={5} style={{width:"100%",padding:"16px 20px",borderRadius:16,border:`1px solid ${BD}`,background:innr,color:TX,fontSize:".92rem",lineHeight:1.7,resize:"vertical",outline:"none",fontFamily:"'Inter',system-ui,sans-serif"}}/>
<div style={{fontSize:".72rem",color:MU,marginTop:6,textAlign:"right"}}>{notes.length} chars · saved automatically</div>
</div>
<div style={{padding:"20px 24px",borderRadius:16,background:`${CY}06`,border:`1px solid ${CY}18`}}>
<div style={{fontSize:".75rem",fontWeight:700,letterSpacing:".14em",color:CY,marginBottom:12,fontFamily:"'Space Grotesk',sans-serif"}}>OFFLINE EXPORT</div>
<p style={{color:T2,fontSize:".92rem",lineHeight:1.7,marginBottom:16}}>Download this exact workspace for offline replay, or save the replay bundle for later restore without regenerating.</p>
<div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
<button onClick={onDownloadOfflineSite} style={bt(`linear-gradient(135deg,${CY},#0080ff)`,"#000")}>Download Offline Site</button>
<button onClick={onSaveReplayBundle} style={{...bt("transparent",TL),border:`1px solid ${TL}33`}}>Save Replay Bundle</button>
</div>
</div>
</div></div>}

{v==="stats"&&<div style={{maxWidth:720,margin:"0 auto"}}>
<div style={{...card}}><div style={ey}>PERFORMANCE</div>
<div style={{display:"flex",gap:24,flexWrap:"wrap"}}>
<div><div style={{fontSize:"2rem",fontWeight:800,color:CY}}>{mastered}/{cc.length}</div><div style={{color:MU,fontSize:".82rem"}}>Mastered</div></div>
<div><div style={{fontSize:"2rem",fontWeight:800,color:TL}}>{P(avg)}</div><div style={{color:MU,fontSize:".82rem"}}>Average</div></div>
<div><div style={{fontSize:"2rem",fontWeight:800,color:GD}}>{totalAnswered>0?`${totalCorrect}/${totalAnswered}`:"—"}</div><div style={{color:MU,fontSize:".82rem"}}>Correct</div></div>
</div></div>
{cc.map(c=><div key={c.id} style={{...card,padding:"16px 20px",marginTop:8,display:"flex",alignItems:"center",gap:12}}><span>{memoryStageIcon(getMemoryStage(c.id))}</span><span style={{flex:1,fontWeight:600}}>{c.name}</span><span style={{color:mc2(c.mastery),fontWeight:700}}>{P(c.mastery)}</span></div>)}
</div>}

</main>
</>}

<style>{`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@500;600;700&display=swap');

@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:1;transform:scale(1.25)}}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
@keyframes glow{0%,100%{box-shadow:0 0 20px rgba(0,240,255,.15)}50%{box-shadow:0 0 40px rgba(0,240,255,.3)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes gradientMove{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes celebrate{0%{transform:scale(1)}25%{transform:scale(1.08)}50%{transform:scale(1)}75%{transform:scale(1.04)}100%{transform:scale(1)}}
@keyframes floatParticle{0%{transform:translateY(0) rotate(0deg);opacity:0}10%{opacity:.9}90%{opacity:.6}100%{transform:translateY(-110vh) rotate(360deg);opacity:0}}
@keyframes rippleExpand{0%{width:0;height:0;opacity:1}100%{width:200vmax;height:200vmax;opacity:0}}
@keyframes flowPulse{0%,100%{box-shadow:0 0 20px rgba(0,240,255,.1)}50%{box-shadow:0 0 50px rgba(0,240,255,.25)}}
@keyframes masterySurge{0%{transform:scaleX(0.95);filter:brightness(1)}50%{transform:scaleX(1.02);filter:brightness(1.4)}100%{transform:scaleX(1);filter:brightness(1)}}
@keyframes completionBloom{0%{transform:scale(1);opacity:1}30%{transform:scale(1.12);opacity:1}60%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}
@keyframes unlockGlow{0%{box-shadow:0 0 0 rgba(0,240,255,0)}50%{box-shadow:0 0 40px rgba(0,240,255,.3),0 0 80px rgba(0,240,255,.1)}100%{box-shadow:0 0 0 rgba(0,240,255,0)}}
@keyframes countUp{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}
@keyframes streakFire{0%{transform:scale(1)}15%{transform:scale(1.3)}30%{transform:scale(1)}45%{transform:scale(1.15)}60%{transform:scale(1)}}
@keyframes phaseComplete{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}

*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',system-ui,sans-serif}
*:focus-visible{outline:2px solid #00f0ff;outline-offset:4px;border-radius:14px}
button{font-family:'Inter',system-ui,sans-serif;cursor:pointer}
button:hover{filter:brightness(1.14);transform:translateY(-1px)}
button:active{transform:scale(.96) translateY(0);transition:transform 80ms}
::selection{background:rgba(0,240,255,.25);color:#fff}
::-webkit-scrollbar{width:8px;height:8px}
::-webkit-scrollbar-track{background:rgba(10,10,26,.3)}
::-webkit-scrollbar-thumb{background:rgba(0,240,255,.2);border-radius:4px}
::-webkit-scrollbar-thumb:hover{background:rgba(0,240,255,.4)}
select{font-family:'Inter',system-ui,sans-serif}
input{font-family:'Inter',system-ui,sans-serif}
`}</style>
</div>);
}
