// @ts-nocheck
// TODO(typing): This file is a single-pass minified JSX shell (~1938 lines).
// Full TypeScript typing requires splitting into per-view components first.
// Tracked: all prop types live in shell-mapper.ts and workspace.ts (typed).
// The component contract (props in/out) is fully typed via the ShellData /
// AppProgress interfaces; only the internal view state is untyped here.
import { useState, useCallback, useEffect, useRef } from "react";
import { resolveDominantShellConceptId, type ShellData } from "./lib/shell-mapper";
import { buildConceptQuestionPool } from "./lib/concept-practice";
import type { AppProgress } from "./lib/workspace";
import { buildAtlasShellProjection } from "./lib/atlas-shell";
import { AtlasJourneyPanel } from "./components/AtlasJourneyPanel";
import { AssignmentWorkspacePanel } from "./components/AssignmentWorkspacePanel";
import { CanonicalArtifactInspector } from "./components/CanonicalArtifactInspector";
import { CompareConceptsPanel } from "./components/CompareConceptsPanel";
import { HomeDashboardPanel } from "./components/HomeDashboardPanel";
import { PracticeWorkspacePanel } from "./components/PracticeWorkspacePanel";
import { ReaderWorkspacePanel } from "./components/ReaderWorkspacePanel";
import { ShellSettingsPanel } from "./components/ShellSettingsPanel";
import { ShellStatsPanel } from "./components/ShellStatsPanel";
import { TranscriptWorkspacePanel } from "./components/TranscriptWorkspacePanel";
import { loadNotes, storeNotes } from "./lib/storage";

type AeonthraShellProps = {
  data: ShellData;
  progress: AppProgress;
  onProgressUpdate: (update: Partial<AppProgress>) => void;
  onReset: () => void;
  onDownloadCanonicalArtifact: () => void;
  onDownloadDiagnostics: () => void;
  onDownloadOfflineSite: () => void;
  onSaveReplayBundle: () => void;
  isDemoMode: boolean;
  initialView?: string;
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
const normalizePanelKeyText=(value)=>normalizePanelText(value).toLowerCase();
const isSamePanelText=(left,right)=>normalizePanelKeyText(left)===normalizePanelKeyText(right);
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

export function AeonthraShell({data,progress:initialProgress,onProgressUpdate,onReset,onDownloadCanonicalArtifact,onDownloadDiagnostics,onDownloadOfflineSite,onSaveReplayBundle,isDemoMode,initialView}:AeonthraShellProps){
const{concepts:CD,assignments:ASSIGNMENTS,reading:READING,margins:MARGINS,transcripts:TRANSCRIPTS,dists:DISTS,philosophers:PH,course:COURSE,synthesis:SYNTHESIS,diagnostics:DIAGNOSTICS}=data;
const[cc,setCC]=useState(()=>CD.map(c=>({...c,mastery:initialProgress.conceptMastery[c.id]??0})));
const[v,setV]=useState(initialView??"journey");
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
const[launched,setLaunched]=useState(Boolean(initialView));
const sessionTimeRef=useRef(0);
const sessionTimerElRef=useRef(null);
const[draft,setDraft]=useState({});
const[navScrolled,setNavScrolled]=useState(false);
const[notes,setNotes]=useState(()=>loadNotes());
const[viewportWidth,setViewportWidth]=useState(()=>typeof window!=="undefined"?window.innerWidth:1280);
const[prefersReducedMotion,setPrefersReducedMotion]=useState(()=>typeof window!=="undefined"&&window.matchMedia?window.matchMedia("(prefers-reduced-motion: reduce)").matches:false);
const mobileLayout=viewportWidth<=768;
const atlasLaneWidth=mobileLayout?Math.max(260,Math.min(320,viewportWidth-56)):360;
useEffect(()=>{storeNotes(notes);},[notes]);
useEffect(()=>{const h=()=>setNavScrolled(window.scrollY>30);window.addEventListener("scroll",h,{passive:true});return()=>window.removeEventListener("scroll",h);},[]);
useEffect(()=>{
  if(typeof window==="undefined"||!window.matchMedia)return;
  const media=window.matchMedia("(prefers-reduced-motion: reduce)");
  const onResize=()=>setViewportWidth(window.innerWidth);
  const onMotion=()=>setPrefersReducedMotion(media.matches);
  onResize();
  onMotion();
  window.addEventListener("resize",onResize,{passive:true});
  if(media.addEventListener)media.addEventListener("change",onMotion);else media.addListener(onMotion);
  return()=>{
    window.removeEventListener("resize",onResize);
    if(media.removeEventListener)media.removeEventListener("change",onMotion);else media.removeListener(onMotion);
  };
},[]);
const atlasScrollRef=useRef(null);
const atlasRafRef=useRef(null);
const toastTimerRef=useRef(null);
const celebrationDismissRef=useRef(null);
const celebrationReturnFocusRef=useRef(null);
const closeCelebration=()=>{setShowCelebration(false);const previous=celebrationReturnFocusRef.current;if(previous&&typeof previous.focus==="function")previous.focus();celebrationReturnFocusRef.current=null;};
useEffect(()=>{
  const container=atlasScrollRef.current;
  if(v!=="journey"||prefersReducedMotion||mobileLayout||!container){if(atlasRafRef.current){cancelAnimationFrame(atlasRafRef.current);atlasRafRef.current=null;}return;}
  let spd=0;
  const stopTick=()=>{spd=0;if(atlasRafRef.current){cancelAnimationFrame(atlasRafRef.current);atlasRafRef.current=null;}};
  const tick=()=>{if(!atlasScrollRef.current||spd===0){atlasRafRef.current=null;return;}atlasScrollRef.current.scrollLeft+=spd;atlasRafRef.current=requestAnimationFrame(tick);};
  const startTick=()=>{if(spd!==0&&!atlasRafRef.current)atlasRafRef.current=requestAnimationFrame(tick);};
  const onMove=(e)=>{const rect=container.getBoundingClientRect();const edge=Math.max(96,rect.width*.18);const left=e.clientX-rect.left;const right=rect.right-e.clientX;if(left<edge){spd=-((edge-left)/edge)*14;startTick();}else if(right<edge){spd=((edge-right)/edge)*14;startTick();}else{stopTick();}};
  container.addEventListener("mousemove",onMove,{passive:true});
  container.addEventListener("mouseleave",stopTick);
  return()=>{container.removeEventListener("mousemove",onMove);container.removeEventListener("mouseleave",stopTick);stopTick();};
},[mobileLayout,prefersReducedMotion,v]);
// ═══ ARGUMENT FORGE ═══
useEffect(()=>()=>{if(toastTimerRef.current)clearTimeout(toastTimerRef.current);},[]);
useEffect(()=>{
  if(!showCelebration||typeof document==="undefined")return;
  const active=document.activeElement;
  celebrationReturnFocusRef.current=active instanceof HTMLElement?active:null;
  const raf=typeof window!=="undefined"&&window.requestAnimationFrame?window.requestAnimationFrame(()=>celebrationDismissRef.current?.focus()):null;
  return()=>{if(raf!==null&&typeof window!=="undefined"&&window.cancelAnimationFrame)window.cancelAnimationFrame(raf);};
},[showCelebration]);
useEffect(()=>{
  if(!showCelebration||typeof window==="undefined")return;
  const onKeyDown=(event)=>{if(event.key==="Escape"){event.preventDefault();closeCelebration();}};
  window.addEventListener("keydown",onKeyDown);
  return()=>window.removeEventListener("keydown",onKeyDown);
},[showCelebration]);
const scrollAtlasLanes=(direction)=>{if(!atlasScrollRef.current)return;atlasScrollRef.current.scrollBy({left:direction*atlasLaneWidth*.92,behavior:prefersReducedMotion?"auto":"smooth"});};
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
  const hl={id:++hlIdRef.current,text:hlPopover.text,tag,source:readerContent.title,readingId:readerContent.id,sectionIdx:readerSection,conceptId:readerPrimaryConceptId||null,ts:Date.now()};
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
        if(railBtn)railBtn.scrollIntoView({behavior:prefersReducedMotion?"auto":"smooth",block:"nearest"});
      }
    }
  },{root:readerScrollRef.current,threshold:[0.3],rootMargin:"-80px 0px -40% 0px"});
  // Observe all section elements
  const sections=document.querySelectorAll("[data-section-idx]");
  sections.forEach(el=>observer.observe(el));
  return()=>observer.disconnect();
},[prefersReducedMotion,v,readerContent]);

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
const buildChapterProgressMap=()=>{
  const next={};
  const buckets={};
  READING.forEach((reading)=>{
    const progressValue=getReadingProgress(reading.id,reading.sections.length)/100;
    next[reading.id]=progressValue;
    const key=reading.module||reading.id;
    const bucket=buckets[key]||{sum:0,count:0};
    bucket.sum+=progressValue;
    bucket.count+=1;
    buckets[key]=bucket;
  });
  Object.entries(buckets).forEach(([key,bucket])=>{
    next[key]=bucket.count?bucket.sum/bucket.count:0;
  });
  return next;
};
const readerActiveSection=readerContent?.sections?.[readerSection]??null;
const readerPrimaryConceptId=readerContent?resolveDominantShellConceptId(readerContent,readerActiveSection,cc):null;
const markConceptComplete=(conceptId)=>setCC(p=>p.map(c=>c.id===conceptId?{...c,mastery:Math.max(c.mastery,.8)}:c));
const conceptMasteryMap=Object.fromEntries(cc.map(c=>[c.id,c.mastery]));
const chapterProgressMap=buildChapterProgressMap();
const skillHistoryMap=initialProgress.skillHistory??{};
const atlasProjection=buildAtlasShellProjection({skillTree:data.skillTree,assignments:ASSIGNMENTS,progress:{conceptMastery:conceptMasteryMap,chapterCompletion:chapterProgressMap,skillHistory:skillHistoryMap}});
const atlasSkillModel=atlasProjection.atlasSkillModel;
const atlasSkillById=atlasProjection.atlasSkillById;
const assignmentReadiness=(assignment)=>atlasProjection.assignmentReadinessById.get(assignment.id)||{assignmentId:assignment.id,requirement:null,requiredSkills:[],missingSkills:[],readiness:null,status:"unmapped",label:"Needs mapping",progressPercent:0};
const visibleConcepts=cc.filter(isRenderableConcept);
const visibleConceptById=new Map(visibleConcepts.map((concept)=>[concept.id,concept]));
const visibleDone=completedConceptSet(visibleConcepts,initialProgress);
const visibleMastered=visibleConcepts.filter((concept)=>concept.mastery>=.8).length;
const visibleConceptCount=visibleConcepts.length;

const MODULES=data.modules;

// QUESTION GENERATION ENGINE — generates up to 100 per concept from templates
const generateQuestions=(conceptId,count,type)=>{
  const c=cc.find(x=>x.id===conceptId);if(!c)return[];
  if(!isRenderableConcept(c))return[];
  const pool=buildConceptQuestionPool(c,cc,type);
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
  const next=new Set(cc.filter(c=>c.mastery>=.8).map(c=>c.id));
  setDone((prev)=>{
    if(next.size===prev.size&&[...next].every((id)=>prev.has(id)))return prev;
    return next;
  });
},[cc]);
useEffect(()=>{
  const restoredSections={};
  const restoredPositions={};
  READING.forEach((reading)=>{
    const completion=initialProgress.chapterCompletion?.[reading.id]??initialProgress.chapterCompletion?.[reading.module]??0;
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
  const key=JSON.stringify(mastery);
  if(prevProgressKeyRef.current===key)return; // identical — skip to break render loop
  prevProgressKeyRef.current=key;
  onProgressUpdate({conceptMastery:mastery,practiceMode:false});
// eslint-disable-next-line react-hooks/exhaustive-deps
},[cc]);
const prevChapterKeyRef=useRef(null);
useEffect(()=>{
  const chapterCompletion=Object.fromEntries(
    Object.entries(buildChapterProgressMap()).sort((left,right)=>String(left[0]).localeCompare(String(right[0])))
  );
  const key=JSON.stringify(chapterCompletion);
  if(prevChapterKeyRef.current===key)return; // identical — skip to break render loop
  prevChapterKeyRef.current=key;
  onProgressUpdate({chapterCompletion});
// eslint-disable-next-line react-hooks/exhaustive-deps
},[READING,sectionsRead]);
const prevSkillHistoryKeyRef=useRef(null);
useEffect(()=>{
  if(!atlasSkillModel)return;
  const mergedHistory={...(initialProgress.skillHistory??{})};
  let changed=false;
  atlasSkillModel.nodes.forEach((node)=>{
    if((node.state==="earned"||node.state==="mastered")&&mergedHistory[node.id]!==true){
      mergedHistory[node.id]=true;
      changed=true;
    }
  });
  if(!changed)return;
  const key=JSON.stringify(Object.keys(mergedHistory).sort().reduce((acc,id)=>{acc[id]=mergedHistory[id];return acc;},{}));
  if(prevSkillHistoryKeyRef.current===key)return;
  prevSkillHistoryKeyRef.current=key;
  onProgressUpdate({skillHistory:mergedHistory});
},[atlasSkillModel,initialProgress.skillHistory,onProgressUpdate]);

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
      const pick=visibleConcepts.filter(c=>!visibleDone.has(c.id)).sort((a,b)=>a.mastery-b.mastery)[0]||visibleConcepts[0]||null;
      setSC(pick);
    }
    if(to==="forge"){
      const t=d?.c||visibleConcepts.filter(c=>!visibleDone.has(c.id)&&c.mastery<.8).sort((a,b)=>a.mastery-b.mastery)[0]||visibleConcepts[0]||null;
      setFC(t);setFP("intro");setIS(0);setDC(null);setTI(0);setTA(null);setMI(0);setMA(null);setFI(0);setFF(false);setWS(null);setWD(new Set());setSCO({c:0,w:0});
    }
    setFade(true);
  },180);
},[cc,done]);

const bump=(id,d)=>setCC(p=>p.map(c=>c.id===id?{...c,mastery:Math.min(1,Math.max(0,c.mastery+d))}:c));
const flash=(m,g)=>{if(toastTimerRef.current)clearTimeout(toastTimerRef.current);setToast({m,g});toastTimerRef.current=window.setTimeout(()=>{setToast(null);toastTimerRef.current=null;},2200);};
const triggerCelebration=()=>{setShowCelebration(true);};
const openReader=(contentId)=>{const r=READING.find(x=>x.id===contentId);if(r){setReaderContent(r);setReaderSection(readingPositions[contentId]||0);setReaderUtilOpen(false);go("reader");}};
const openReaderForChapter=(moduleId,chapterIdx)=>{const chapters=READING.filter(x=>x.module===moduleId);const r=chapters[chapterIdx]||chapters[0];if(r){setReaderContent(r);setReaderSection(readingPositions[r.id]||0);setReaderUtilOpen(false);go("reader");}};
const openTranscript=(txId)=>{const t=TRANSCRIPTS.find(x=>x.id===txId);if(t){setTranscript(t);setTxTime(0);setTxPlaying(false);go("transcript");}};
const formatTime=(s)=>{const m=Math.floor(s/60);const sec=Math.floor(s%60);return m+":"+String(sec).padStart(2,"0");};

// Simulated playback timer
useEffect(()=>{if(!txPlaying||!transcript)return;const t=setInterval(()=>{setTxTime(p=>{if(p>=transcript.duration){setTxPlaying(false);return transcript.duration;}return p+1;});},1000);return()=>clearInterval(t);},[txPlaying,transcript]);
const assignmentDueCounter=(assignment)=>{
  if(assignment.dueState==="unknown")return "Date not captured";
  if(assignment.dueState==="today")return "Due today";
  if(assignment.dueState==="overdue")return assignment.dueLabel;
  return assignment.due+"d left";
};
const assignmentDueLine=(assignment,urgent)=>{
  if(assignment.dueState==="unknown")return "Date not captured";
  return urgent?"Due now: "+assignment.dueLabel:assignment.dueLabel;
};
const assignmentReadinessLabel=(state)=>state.status==="unmapped"?"Needs mapping":state.status==="concept-prep"?"Concept prep":state.label;
const assignmentReadinessStateLabel=(state)=>state.status==="unmapped"?"Needs mapping":state.status==="concept-prep"?"Concept prep":"Ready";
const assignmentReadinessSupportLabel=(state)=>state.status==="ready"?"Skill chain earned":state.status==="concept-prep"?"Concept grounding exists, but the checklist-backed skill chain is not complete yet.":"No readiness support has been derived yet.";
const mastered=cc.filter(c=>c.mastery>=.8).length;
const avg=cc.length>0?cc.reduce((s,c)=>s+c.mastery,0)/cc.length:0;
const nextA=[...ASSIGNMENTS].sort((a,b)=>a.due-b.due)[0];
const nextAReadiness=nextA?assignmentReadiness(nextA):null;
const nextAReadinessHasSupport=Boolean(nextAReadiness&&(nextAReadiness.requiredSkills.length>0||nextAReadiness.missingSkills.length>0||nextAReadiness.requirement?.checklist?.length>0));
const nextAHeader=nextA?((isSamePanelText(nextA.title,nextA.sub)||!normalizePanelText(nextA.sub))?nextA.title:`${nextA.title}: ${nextA.sub}`):"";
const nextAVisibleConcepts=nextA?nextA.con.map((id)=>visibleConceptById.get(id)).filter((concept)=>Boolean(concept)):[];
const nextAVisibleReady=nextAVisibleConcepts.filter((concept)=>concept.mastery>=.6);
const nextAVisibleNotReady=nextAVisibleConcepts.filter((concept)=>concept.mastery<.6);
const nextAVisibleSupportText=nextAReadinessHasSupport
  ? assignmentReadinessSupportLabel(nextAReadiness)
  : "No readiness support has been derived yet.";
const selAHeader=selA?((isSamePanelText(selA.title,selA.sub)||!normalizePanelText(selA.sub))?selA.title:`${selA.title}: ${selA.sub}`):"";
const selAVisibleConcepts=selA?selA.con.map((id)=>visibleConceptById.get(id)).filter((concept)=>Boolean(concept)):[];
const selAVisibleReady=selAVisibleConcepts.filter((concept)=>concept.mastery>=.6);
const selAVisibleNotReady=selAVisibleConcepts.filter((concept)=>concept.mastery<.6);
const selAReadiness=selA?assignmentReadiness(selA):null;
const selAReadinessHasSupport=Boolean(selAReadiness&&(selAReadiness.requiredSkills.length>0||selAReadiness.missingSkills.length>0||selAReadiness.requirement?.checklist?.length>0));
const selAVisibleSupportText=selAReadinessHasSupport&&selA
  ? assignmentReadinessSupportLabel(selAReadiness)
  : "No readiness support has been derived yet.";

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
<nav style={{display:"flex",justifyContent:"space-between",alignItems:mobileLayout?"stretch":"center",flexDirection:mobileLayout?"column":"row",padding:mobileLayout?"14px 16px":"16px 48px",borderBottom:`1px solid ${navScrolled?"rgba(0,240,255,.18)":"rgba(0,240,255,.07)"}`,position:"sticky",top:0,zIndex:100,background:navScrolled?"rgba(6,6,18,.98)":"rgba(8,8,20,.92)",backdropFilter:"blur(24px)",boxShadow:navScrolled?"0 4px 32px rgba(0,0,0,.7)":"none",transition:"background 300ms ease, box-shadow 300ms ease, border-color 300ms ease",gap:mobileLayout?12:0}}>
  <div style={{display:"flex",alignItems:"center",gap:mobileLayout?12:20,justifyContent:mobileLayout?"space-between":"flex-start",flexWrap:"wrap",width:mobileLayout?"100%":"auto"}}>
    <span style={{fontWeight:900,fontSize:"1.6rem",letterSpacing:".16em",color:CY,textShadow:`0 0 36px rgba(0,240,255,.35)`,fontFamily:"'Space Grotesk',sans-serif"}}>AEONTHRA</span>
    <span style={{fontSize:".78rem",letterSpacing:".14em",color:MU,border:"1px solid #222255",padding:"5px 14px",borderRadius:20}}>{COURSE.code}</span>
    {launched&&<span ref={sessionTimerElRef} style={{fontSize:".75rem",color:MU,marginLeft:8}}>⏱ 0m 0s</span>}
  </div>
  <div style={{display:"flex",gap:4,flexWrap:"wrap",width:mobileLayout?"100%":"auto",overflowX:mobileLayout?"auto":"visible",paddingBottom:mobileLayout?2:0}}>
    {[["home","Home"],["journey","Atlas"],["explore","Concepts"],["forge","Learn"],["reader","Read"],["gym","Gym"],["oracle","Oracle"]].map(([id,lb])=>(
      <button key={id} onClick={()=>go(id)} aria-current={v===id?"page":undefined} style={{background:v===id?"rgba(0,240,255,.1)":"transparent",border:"none",color:v===id?CY:MU,padding:"12px 18px",borderRadius:14,cursor:"pointer",fontSize:".85rem",fontWeight:600,transition:"all 200ms"}}>{lb}</button>
    ))}
    <button onClick={()=>go("settings")} aria-current={v==="settings"?"page":undefined} aria-label="Settings" title="Settings" style={{background:v==="settings"?"rgba(0,240,255,.1)":"transparent",border:"none",color:v==="settings"?CY:MU,padding:"12px 14px",borderRadius:14,cursor:"pointer",fontSize:".88rem",opacity:.65,transition:"all 200ms"}}>⚙</button>
  </div>
</nav>

{toast&&<div role="status" aria-live="polite" aria-atomic="true" style={{position:"fixed",top:88,left:"50%",transform:"translateX(-50%)",padding:"14px 36px",borderRadius:18,background:toast.g?`${TL}1a`:`${RD}1a`,border:`2px solid ${toast.g?TL:RD}`,color:toast.g?TL:RD,fontSize:".95rem",fontWeight:700,zIndex:200,animation:"fadeUp .3s ease",boxShadow:`0 8px 32px ${toast.g?TL:RD}22`,display:"flex",alignItems:"center",gap:12}}>
  {toast.m}
  {streak>=3&&toast.g&&<span style={{fontSize:"1.1rem"}}>{"🔥".repeat(Math.min(Math.floor(streak/3),5))}</span>}
  {streak>=3&&toast.g&&<span style={{color:GD,fontWeight:800}}>{streak}x</span>}
</div>}

{/* CELEBRATION OVERLAY */}
{showCelebration&&<div role="dialog" aria-modal="true" aria-labelledby="aeonthra-celebration-title" style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(2,2,8,.9)",animation:"fadeUp .5s ease",overflow:"hidden"}}>
  {/* Floating particles */}
  {[...Array(20)].map((_,i)=>(<div key={i} style={{position:"absolute",fontSize:["🔥","⭐","✨","💫","🏆"][i%5],left:`${(i*17)%100}%`,bottom:"-10%",animation:`floatParticle ${2+(i%4)}s ease ${(i%3)*.35}s infinite`,opacity:.8}}>{["🔥","⭐","✨","💫","🏆"][i%5]}</div>))}
  <div style={{textAlign:"center",position:"relative",zIndex:1}}>
    <div style={{fontSize:"5rem",marginBottom:24,animation:"float 1.5s ease infinite"}}>🏆</div>
    <h2 id="aeonthra-celebration-title" style={{fontSize:"2.8rem",fontWeight:900,background:`linear-gradient(135deg,${CY},${TL},${GD})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontFamily:"'Space Grotesk',sans-serif",marginBottom:16,animation:"completionBloom .8s ease, celebrate 1.2s ease"}}>CONCEPT MASTERED</h2>
    <div style={{fontSize:"1.5rem",color:GD,fontWeight:700,marginBottom:12}}>{"🔥".repeat(10)}</div>
    <p style={{color:TX,fontSize:"1.2rem",fontWeight:600}}>Streak: {streak}x · Best: {bestStreak}x</p>
    {totalAnswered>0&&<p style={{color:T2,fontSize:"1rem",marginTop:8}}>Session: {Math.round(totalCorrect/totalAnswered*100)}% accuracy across {totalAnswered} questions</p>}
    <div style={{marginTop:32}}>
      <button ref={celebrationDismissRef} onClick={closeCelebration} style={{...bt(`linear-gradient(135deg,${GD},#cc8800)`,"#000"),fontSize:"1.1rem",padding:"18px 48px"}}>Continue →</button>
    </div>
  </div>
</div>}

<main style={{maxWidth:1440,margin:"0 auto",padding:mobileLayout?"28px 16px 120px":"44px 48px 140px",opacity:fade?1:0,transition:"opacity 180ms ease"}}>

{/* HOME */}
{v==="home"&&null}

{/* COURSE ATLAS */}
{v==="journey"&&<AtlasJourneyPanel
  atlasSkillModel={atlasSkillModel}
  atlasSkillById={atlasSkillById}
  assignmentReadinessById={atlasProjection.assignmentReadinessById}
  assignments={ASSIGNMENTS}
  concepts={visibleConcepts}
  modules={MODULES}
  mobileLayout={mobileLayout}
  atlasLaneWidth={atlasLaneWidth}
  atlasScrollRef={atlasScrollRef}
  scrollAtlasLanes={scrollAtlasLanes}
  openReaderForChapter={openReaderForChapter}
  goToCourseware={()=>go("courseware")}
  goToAssignment={(assignment)=>go("assignment",{a:assignment})}
  goToGym={()=>go("gym")}
  goToConcept={(concept,destination)=>go(destination,{c:concept})}
  flash={flash}
  theme={{BD,CY,MU,T2,TL,GD,RD,DM,CD2,TX,innr,card,ey,heading:hd}}
/>}


{/* EXPLORE */}
{v==="explore"&&<div style={{display:"grid",gridTemplateColumns:mobileLayout?"1fr":"320px 1fr",gap:28,alignItems:"start",animation:"fadeUp .5s ease"}}>
<div style={{...card,position:"sticky",top:88,padding:"28px 24px"}}>
  <div style={{...ey,fontFamily:"'Space Grotesk',sans-serif"}}>CONCEPT LIBRARY</div>
  <p style={{fontSize:".82rem",color:MU,marginBottom:20,marginTop:-12}}>{visibleConceptCount} concept{visibleConceptCount!==1?"s":""} · {visibleMastered} mastered</p>
  {visibleConcepts.map(c=>{const act=selC?.id===c.id;const dn=visibleDone.has(c.id);const stage=getMemoryStage(c.id);
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
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>{selC.conn.map(id=>{const r=visibleConceptById.get(id);return r?<button key={id} onClick={()=>setSC(r)} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 20px",borderRadius:20,border:`1px solid ${CY}22`,color:CY,background:`${CY}08`,cursor:"pointer",fontSize:".88rem",fontWeight:600,transition:"all 200ms"}}><div style={{width:8,height:8,borderRadius:"50%",background:mc2(r.mastery)}}/>{r.name}</button>:null;})}</div>
    </div>}

    {isDemoMode||selC.practiceReady!==false
      ?<button onClick={()=>go("forge",{c:selC})} style={{...bt(`linear-gradient(135deg,${CY},#0066ff)`,"#000"),animation:"glow 3s ease infinite"}}>Practice {selC.name} in Neural Forge →</button>
      :<div style={{padding:"16px 18px",borderRadius:16,background:"rgba(255,68,102,.06)",border:`1px solid ${RD}22`,color:T2}}>
        <div style={{fontSize:".74rem",fontWeight:700,letterSpacing:".12em",color:RD,marginBottom:8,fontFamily:"'Space Grotesk',sans-serif"}}>PRACTICE LOCKED</div>
        <div style={{fontSize:".92rem",lineHeight:1.7}}>{selC.practiceSupportLabel}</div>
      </div>}
  </div>:<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:480,color:MU}}>
    <div style={{textAlign:"center"}}><div style={{fontSize:"2.5rem",marginBottom:16}}>🧠</div><h3 style={{...hd(1.2),color:MU,marginBottom:8}}>Concept Library</h3><p style={{fontSize:"1rem",color:MU}}>Select a concept from the sidebar to explore its full depth</p></div>
  </div>}
</div>
</div>}

{/* ASSIGNMENT */}
{v==="assignment"&&selA&&null}

{/* ═══ NEURAL FORGE ═══ */}
{v==="forge"&&fc&&(!isDemoMode&&fc.practiceReady===false?(
<div style={{maxWidth:860,margin:"0 auto"}}>
  <div style={{...card,padding:mobileLayout?"32px 24px":"44px 40px",borderTop:`3px solid ${RD}`}}>
    <div style={{fontSize:".78rem",fontWeight:700,letterSpacing:".14em",color:RD,marginBottom:12,fontFamily:"'Space Grotesk',sans-serif"}}>PRACTICE UNAVAILABLE</div>
    <h2 style={{...hd(1.5),marginBottom:10}}>{fc.name}</h2>
    <p style={{fontSize:"1rem",lineHeight:1.8,color:T2,margin:"0 0 18px"}}>{fc.practiceSupportLabel||"Practice unlocks after transfer or assignment evidence is captured."}</p>
    <p style={{fontSize:".88rem",lineHeight:1.7,color:MU,margin:"0 0 24px"}}>AEONTHRA will not synthesize Neural Forge drills from mapper-authored prose alone. This concept needs real transfer evidence or assignment evidence before practice opens.</p>
    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
      <button onClick={()=>go("explore",{c:fc})} style={bt(`linear-gradient(135deg,${CY},#0066ff)`,"#000")}>Review concept →</button>
      <button onClick={()=>go("journey")} style={{...bt("transparent",MU),border:`1px solid ${BD}`}}>Open Atlas</button>
      <button onClick={()=>go("courseware")} style={{...bt("transparent",MU),border:`1px solid ${BD}`}}>Back to library</button>
    </div>
  </div>
</div>
):(()=>{
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
      <button onClick={()=>{markConceptComplete(fc.id);triggerCelebration();const nextConcept=cc.filter(c=>c.id!==fc.id&&c.mastery<.8).sort((a,b)=>a.mastery-b.mastery)[0];if(nextConcept)go("forge",{c:nextConcept});else go("journey");}} style={bt(`linear-gradient(135deg,${CY},#0080ff)`,"#000")}>Next Concept →</button>
      <button onClick={()=>{markConceptComplete(fc.id);go("stats");}} style={{...bt("transparent",CY),border:`1px solid ${CY}33`}}>View Stats 📊</button>
      <button onClick={()=>{markConceptComplete(fc.id);go("journey");}} style={{...bt("transparent",MU),border:`1px solid ${BD}`}}>Journey Map</button>
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
    <button onClick={()=>{const n=visibleConcepts.filter(c=>c.id!==fc.id&&!visibleDone.has(c.id)&&c.mastery<.8);if(n.length)go("forge",{c:n[0]});}} style={{fontSize:".88rem",color:MU,background:"transparent",border:`1px solid ${BD}`,padding:"10px 24px",borderRadius:20,cursor:"pointer"}}>Switch to another concept →</button>
  </div>
</div>);
})())}

{/* COMPARE */}
{v==="compare"&&null}

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
<input value={oq} onChange={e=>setOQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")askO();}} placeholder={oracleMode==="thesis"?"Enter your thesis to challenge...":oracleMode==="single"?"Select a figure from the grid below...":"Ask a question about the course..."} style={{flex:1,padding:"18px 24px",borderRadius:18,border:`1px solid ${BD}`,background:innr,color:TX,fontSize:"1rem"}}/>
  <button onClick={askO} style={bt(`linear-gradient(135deg,${CY},#0080ff)`,"#000")}>{oracleMode==="thesis"?"Challenge":"Ask"}</button>
</div>

{/* Philosopher grid when no results */}
{!or2&&(PH.length>0?<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
  {PH.map((p,i)=>{const colors=[CY,GD,"#a78bfa",TL,"#fb923c","#f472b6"];const c2=colors[i%colors.length];
    return(<button key={p.n} onClick={()=>{if(oracleMode==="single"){setOQ(p.n);askO();}}} style={{...card,padding:"28px 24px",cursor:oracleMode==="single"?"pointer":"default",borderTop:`3px solid ${c2}`,transition:"all 300ms"}}>
      <div style={{fontSize:"1.2rem",fontWeight:700,marginBottom:4}}>{p.n}</div>
      <div style={{fontSize:".82rem",color:c2,fontWeight:600,marginBottom:10}}>{p.t}</div>
      <div style={{fontSize:".82rem",color:MU}}>{p.q.length} passage{p.q.length!==1?"s":""}</div>
      {p.q.length>0&&<div style={{fontSize:".78rem",color:T2,fontStyle:"italic",marginTop:12,lineHeight:1.5}}>"{(p.q[0].x.slice(0,80).replace(/\s+\S*$/,""))}…"</div>}
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
            {r.sq?.p>0&&<div style={{fontSize:".78rem",color:MU}}>Textbook p.{r.sq.p}</div>}
            <div style={{display:"flex",gap:2,marginTop:4,justifyContent:"flex-end"}}>{[...Array(5)].map((_,j)=><div key={j} style={{width:8,height:8,borderRadius:"50%",background:j<r.r?c2:`${MU}44`,transition:"all 300ms"}}/>)}</div>
          </div>
        </div>
        {r.sq&&<div style={{padding:"20px 24px",borderRadius:16,background:innr,border:`1px solid ${BD}`,marginBottom:16}}>
          <p style={{fontSize:"1.1rem",lineHeight:1.9,color:T2,fontStyle:"italic",margin:0}}>"{r.sq.x}"</p>
        </div>}
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
          {cc.filter(c=>c.cat.toLowerCase().includes(r.t.toLowerCase().split(" ")[0])||(r.sq?.tg??[]).some(t=>c.kw.includes(t))).slice(0,2).map(c=>(
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
{v==="courseware"&&<div style={{display:"grid",gridTemplateColumns:mobileLayout?"1fr":cwConcept?"340px 1fr":"1fr",gap:28,alignItems:"start"}}>
<div>
  <h2 style={{...hd(1.5),marginBottom:8}}>Course Map</h2>
  <p style={{color:T2,fontSize:".95rem",marginBottom:32}}>Explore modules, chapters, textbook content, and launch custom practice sessions.</p>

  {MODULES.map(m=>(
    <div key={m.id} role="button" tabIndex={0} style={{...card,marginBottom:16,padding:"28px 32px",cursor:"pointer",borderLeft:cwModule===m.id?`4px solid ${CY}`:`4px solid transparent`,transition:"all 300ms"}} onClick={()=>{setCWM(cwModule===m.id?null:m.id);setCWC(null);}} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setCWM(cwModule===m.id?null:m.id);setCWC(null);}}}>
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
          {m.concepts.map(id=>{const c=visibleConceptById.get(id);if(!c)return null;
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
                if(qs.length===0){flash("Practice stays locked until this module has source-backed transfer or assignment evidence.",false);return;}
                setPracticeQ(takeStableSubset(qs,n,`practice:${m.id}:tf:${n}`));
                setPracticeI(0);setPracticeA(null);setPracticeSc({c:0,w:0});setPracticeMode("tf");setV("practice");
              }} style={{padding:"8px 16px",borderRadius:12,border:`1px solid ${BD}`,background:innr,color:CY,fontSize:".82rem",fontWeight:600,cursor:"pointer",transition:"all 200ms"}}>
                {n} T/F
              </button>
            ))}
            {[5,10,25].map(n=>(
              <button key={"mc"+n} onClick={()=>{
                const qs=m.concepts.flatMap(id=>generateQuestions(id,Math.ceil(n/m.concepts.length),"mc").map(q=>({...q,cid:id})));
                if(qs.length===0){flash("Practice stays locked until this module has source-backed transfer or assignment evidence.",false);return;}
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
              <div style={{flex:1,textAlign:"left"}}><div style={{fontSize:".88rem",fontWeight:600}}>{a.title}</div><div style={{fontSize:".75rem",color:MU}}>{a.pts}pts · {assignmentDueCounter(a)}</div></div>
            </button>
          ))}
        </div>
      </div>}
    </div>
  ))}
</div>

{/* Concept deep-dive panel */}
{cwConcept&&(()=>{const c=visibleConceptById.get(cwConcept);if(!c)return null;
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
    {isDemoMode||c.practiceReady!==false
      ?<button onClick={()=>go("forge",{c})} style={{...bt(`linear-gradient(135deg,${CY},#0066ff)`,"#000")}}>⚡ Forge this concept</button>
      :<div style={{padding:"12px 14px",borderRadius:14,background:"rgba(255,68,102,.06)",border:`1px solid ${RD}22`,color:T2,fontSize:".82rem",lineHeight:1.6}}>{c.practiceSupportLabel}</div>}
    <button onClick={()=>{setSC(c);go("explore");}} style={{...bt("transparent",CY),border:`1px solid ${CY}33`}}>🔍 View in Explore</button>
  </div>
</div>);})()}
 

</div>}

{/* ═══ PRACTICE MODE ═══ */}
{v==="practice"&&practiceQ.length>0&&null}

{/* ??? READER OS ??? */}
{v==="reader"&&null}

{/* ??? TRANSCRIPT MODE ??? */}
{v==="transcript"&&transcript&&null}

{/* ═══ DISTINCTION GYM ═══ */}
{v==="gym"&&<div style={{maxWidth:920,margin:"0 auto"}}>
{!gymPair?<><div style={{...card,textAlign:"center",marginBottom:24}}><div style={ey}>DISTINCTION GYM</div><h2 style={hd(1.4)}>Sharpen Your Concept Boundaries</h2><p style={{color:T2,fontSize:"1rem",marginTop:10}}>Master the differences between concepts that students commonly confuse.</p></div>
  {DISTS.filter(d=>visibleConceptById.has(d.a)&&visibleConceptById.has(d.b)).length===0?<div style={{...card,textAlign:"center",padding:"60px 24px",color:MU}}><div style={{fontSize:"2.5rem",marginBottom:16}}>🥊</div><p style={{fontSize:"1rem",marginBottom:20}}>No concept pairs available yet for this course.</p><button onClick={()=>go("journey")} style={{...bt(`linear-gradient(135deg,${CY},#0066ff)`,"#000")}}>Explore the Atlas →</button></div>
  :<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>{DISTS.filter(d=>visibleConceptById.has(d.a)&&visibleConceptById.has(d.b)).map((d,i)=>{const cA=visibleConceptById.get(d.a);const cB=visibleConceptById.get(d.b);if(!cA||!cB)return null;return(<button key={i} onClick={()=>{setGymPair(d);setGymA(null);setGymExplained(false);}} style={{...card,padding:"28px",cursor:"pointer",textAlign:"center"}}><div style={{fontSize:".72rem",fontWeight:700,color:CY,marginBottom:12}}>{d.label}</div><div style={{display:"flex",justifyContent:"center",gap:8}}><span style={{padding:"4px 12px",borderRadius:10,background:`${CY}0a`,border:`1px solid ${CY}15`,fontSize:".82rem",color:CY}}>{cA.name}</span><span style={{color:MU,fontSize:".82rem"}}>vs</span><span style={{padding:"4px 12px",borderRadius:10,background:`${TL}0a`,border:`1px solid ${TL}15`,fontSize:".82rem",color:TL}}>{cB.name}</span></div></button>);})}</div>}
</>:
(()=>{const cA=visibleConceptById.get(gymPair.a);const cB=visibleConceptById.get(gymPair.b);if(!cA||!cB)return null;return(<div>
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

{/* Inspect */}
{v==="inspect"&&null}

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
{v==="settings"&&null}

{v==="stats"&&null}

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
}{/* ??? READER OS ??? */}
{v==="reader"&&null}

{/* ??? TRANSCRIPT MODE ??? */}
{v==="transcript"&&transcript&&null}

{/* ═══ DISTINCTION GYM ═══ */}
{v==="gym"&&<div style={{maxWidth:920,margin:"0 auto"}}>
{!gymPair?<><div style={{...card,textAlign:"center",marginBottom:24}}><div style={ey}>DISTINCTION GYM</div><h2 style={hd(1.4)}>Sharpen Your Concept Boundaries</h2><p style={{color:T2,fontSize:"1rem",marginTop:10}}>Master the differences between concepts that students commonly confuse.</p></div>
  {DISTS.filter(d=>visibleConceptById.has(d.a)&&visibleConceptById.has(d.b)).length===0?<div style={{...card,textAlign:"center",padding:"60px 24px",color:MU}}><div style={{fontSize:"2.5rem",marginBottom:16}}>🥊</div><p style={{fontSize:"1rem",marginBottom:20}}>No concept pairs available yet for this course.</p><button onClick={()=>go("journey")} style={{...bt(`linear-gradient(135deg,${CY},#0066ff)`,"#000")}}>Explore the Atlas →</button></div>
  :<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>{DISTS.filter(d=>visibleConceptById.has(d.a)&&visibleConceptById.has(d.b)).map((d,i)=>{const cA=visibleConceptById.get(d.a);const cB=visibleConceptById.get(d.b);if(!cA||!cB)return null;return(<button key={i} onClick={()=>{setGymPair(d);setGymA(null);setGymExplained(false);}} style={{...card,padding:"28px",cursor:"pointer",textAlign:"center"}}><div style={{fontSize:".72rem",fontWeight:700,color:CY,marginBottom:12}}>{d.label}</div><div style={{display:"flex",justifyContent:"center",gap:8}}><span style={{padding:"4px 12px",borderRadius:10,background:`${CY}0a`,border:`1px solid ${CY}15`,fontSize:".82rem",color:CY}}>{cA.name}</span><span style={{color:MU,fontSize:".82rem"}}>vs</span><span style={{padding:"4px 12px",borderRadius:10,background:`${TL}0a`,border:`1px solid ${TL}15`,fontSize:".82rem",color:TL}}>{cB.name}</span></div></button>);})}</div>}
</>:
(()=>{const cA=visibleConceptById.get(gymPair.a);const cB=visibleConceptById.get(gymPair.b);if(!cA||!cB)return null;return(<div>
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

{/* Inspect */}
{v==="inspect"&&null}

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
{v==="settings"&&null}

{v==="stats"&&null}

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
