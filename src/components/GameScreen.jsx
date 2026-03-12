import { useState, useEffect, useRef, useCallback } from 'react'
import { X, ChevronDown, ArrowRight, Send } from 'lucide-react'
import questions from '../data/questions.json'
import { isSoundOn } from '../lib/storage'
import { playCorrect, playIncorrect, playClick } from '../lib/sounds'
import { useSwipe } from '../lib/useSwipe'

function shuffleArray(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}; return a }
const ALL_REFS=[...new Set(questions.flatMap(q=>q.refs||[]))]
const ALL_ANS=questions.filter(q=>!q.isScripture&&q.a.length<60).map(q=>q.a)

// Fill in the Blank: pick a key word to blank out from verse text
function generateBlank(verse, questionNum) {
  const text = verse.text.replace(/\[\d+\]\s*/g, '') // strip verse numbers like [38]
  const words = text.split(/\s+/)
  // Skip short filler words, pick meaningful words (4+ chars)
  const candidates = []
  words.forEach((w, i) => {
    const clean = w.replace(/[^a-zA-Z]/g, '')
    if (clean.length >= 4) candidates.push({ word: clean, idx: i, original: w })
  })
  if (candidates.length === 0) return null
  // Deterministic pick based on question number
  const pick = candidates[questionNum % candidates.length]
  // Build display text with blank
  const display = words.map((w, i) => i === pick.idx ? '_____' : w).join(' ')
  return { display, answer: pick.word, ref: verse.ref }
}

function VerseBlock({verses,defaultOpen=false}){
  const[open,setOpen]=useState(defaultOpen)
  if(!verses||verses.length===0)return null
  return(<div style={vs.block}><button onClick={()=>setOpen(!open)} style={vs.header}>
    <span>📜 Full Scripture ({verses.length} passage{verses.length>1?'s':''})</span>
    <ChevronDown size={14} style={{transform:open?'rotate(180deg)':'none',transition:'0.2s'}}/></button>
    {open&&<div style={vs.list}>{verses.map((v,i)=>(<div key={i} style={vs.item}><div style={vs.ref}>{v.ref}</div><div style={vs.text}>{v.text}</div></div>))}</div>}</div>)
}
const vs={block:{marginTop:16,borderRadius:'var(--radius-sm)',overflow:'hidden',border:'1px solid var(--border)'},header:{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',background:'var(--cyan-subtle)',border:'none',fontSize:12,fontWeight:600,color:'var(--cyan)',cursor:'pointer',fontFamily:'var(--font-mono)'},list:{background:'var(--bg-card)'},item:{padding:'12px 14px',borderTop:'1px solid var(--border)'},ref:{fontFamily:'var(--font-mono)',fontSize:12,fontWeight:600,color:'var(--cyan)',marginBottom:4},text:{fontSize:13,lineHeight:1.65,color:'var(--text)',fontStyle:'italic'}}

function Feedback({correct,answer}){
  if(correct===null)return null
  return(<div style={{...fb.base,background:correct?'var(--green-subtle)':'var(--red-subtle)',borderColor:correct?'var(--green)':'var(--red)',color:correct?'var(--green)':'var(--red)'}}>
    <span style={fb.icon}>{correct?'✓':'✗'}</span><div><div style={fb.label}>{correct?'Correct!':'Incorrect'}</div>
    {!correct&&answer&&<div style={fb.answer}>Answer: {answer}</div>}</div></div>)
}
const fb={base:{display:'flex',alignItems:'flex-start',gap:12,padding:'12px 16px',borderRadius:'var(--radius-sm)',border:'1px solid',marginTop:14,fontSize:14},icon:{fontSize:18,fontWeight:700,lineHeight:1,marginTop:1},label:{fontWeight:600,marginBottom:2},answer:{fontFamily:'var(--font-mono)',fontSize:12,marginTop:4,lineHeight:1.5,color:'var(--text)'}}

export default function GameScreen({gameState,allRefs,onEnd,onQuit,onProgress}){
  const{mode,questions:gQ,confirmBeforeSubmit}=gameState
  const needsConfirm=confirmBeforeSubmit&&mode!=='timed'
  const[idx,setIdx]=useState(gameState.idx||0)
  const[score,setScore]=useState(gameState.score||0)
  const[answers,setAnswers]=useState(gameState.answers||[])
  const[submitted,setSubmitted]=useState(false)
  const[correct,setCorrect]=useState(null)
  const[selected,setSelected]=useState(new Set())
  const[options,setOptions]=useState([])
  const[typedValue,setTypedValue]=useState('')
  const[timeLeft,setTimeLeft]=useState(15)
  const[showQuit,setShowQuit]=useState(false)
  const[blankData,setBlankData]=useState(null)
  const timerRef=useRef(null)
  const inputRef=useRef(null)

  const q=gQ[idx], total=gQ.length
  const hasScripture=q.isScripture&&q.refs&&q.refs.length>0
  const isMulti=hasScripture&&q.refs.length>1

  // Save progress
  useEffect(()=>{
    onProgress({...gameState,idx,score,answers})
  },[idx,score,answers.length])

  useEffect(()=>{
    setSubmitted(false);setCorrect(null);setSelected(new Set());setTypedValue('')
    if(mode==='mc'||mode==='timed'){
      if(hasScripture){
        const cRefs=q.refs,cSet=new Set(cRefs)
        const nW=isMulti?Math.min(3,8-cRefs.length):3
        const wrong=shuffleArray(ALL_REFS.filter(r=>!cSet.has(r))).slice(0,nW)
        setOptions(shuffleArray([...cRefs,...wrong]))
      } else {
        const wrong=shuffleArray(ALL_ANS.filter(a=>a!==q.a)).slice(0,3)
        setOptions(shuffleArray([q.a,...wrong]))
      }
    }
    if(mode==='fillin'&&q.verses&&q.verses.length>0){
      const blank=generateBlank(q.verses[0],q.n)
      setBlankData(blank)
      setTimeout(()=>inputRef.current?.focus(),50)
    }
    if(mode==='timed')setTimeLeft(15)
    if(mode==='type'||mode==='fillin')setTimeout(()=>inputRef.current?.focus(),50)
  },[idx,q])

  useEffect(()=>{
    if(mode!=='timed'||submitted)return
    timerRef.current=setInterval(()=>{
      setTimeLeft(p=>{if(p<=0.1){clearInterval(timerRef.current);doExpired();return 0}return p-0.1})
    },100)
    return()=>clearInterval(timerRef.current)
  },[idx,submitted])

  const sfx=(fn)=>{if(isSoundOn())fn()}
  const doExpired=()=>{if(submitted)return;setSubmitted(true);setCorrect(false);sfx(playIncorrect);setAnswers(p=>[...p,{q,correct:false,given:'Time expired'}])}

  const toggleOpt=(ref)=>{
    if(submitted)return; sfx(playClick)
    if(!isMulti||!hasScripture){setSelected(new Set([ref]));if(!needsConfirm)doSubmitMC(new Set([ref]))}
    else{const n=new Set(selected);if(n.has(ref))n.delete(ref);else n.add(ref);setSelected(n)}
  }

  const doSubmitMC=(sel)=>{
    const s=sel||selected; if(submitted||s.size===0)return; clearInterval(timerRef.current)
    const cSet=hasScripture?new Set(q.refs):new Set([q.a])
    const isR=hasScripture?q.refs.every(r=>s.has(r))&&[...s].every(r=>cSet.has(r)):s.has(q.a)
    setSubmitted(true);setCorrect(isR); sfx(isR?playCorrect:playIncorrect)
    if(isR)setScore(sc=>sc+1); setAnswers(p=>[...p,{q,correct:isR,given:[...s].join(', ')}])
  }

  const submitTyped=()=>{
    if(submitted||!typedValue.trim())return
    const isR=fuzzyMatch(typedValue.trim(),q.a)
    setSubmitted(true);setCorrect(isR); sfx(isR?playCorrect:playIncorrect)
    if(isR)setScore(sc=>sc+1); setAnswers(p=>[...p,{q,correct:isR,given:typedValue.trim()}])
  }

  const doSubmitBible=(sel)=>{
    const s=sel||selected; if(submitted||s.size===0)return
    const isR=s.has(q.a)
    setSubmitted(true);setCorrect(isR); sfx(isR?playCorrect:playIncorrect)
    if(isR)setScore(sc=>sc+1); setAnswers(p=>[...p,{q,correct:isR,given:[...s].join(', ')}])
  }

  const submitBlank=()=>{
    if(submitted||!typedValue.trim()||!blankData)return
    const isR=typedValue.trim().toLowerCase()===blankData.answer.toLowerCase()
    setSubmitted(true);setCorrect(isR); sfx(isR?playCorrect:playIncorrect)
    if(isR)setScore(sc=>sc+1); setAnswers(p=>[...p,{q,correct:isR,given:typedValue.trim()}])
  }

  const nextQuestion=useCallback(()=>{
    if(!submitted)return
    if(idx+1>=total){onEnd(answers,score);return}
    setIdx(idx+1)
  },[submitted,idx,total,answers,score,onEnd])

  const handleEndTest=()=>{clearInterval(timerRef.current);onEnd(answers,score)}

  // Swipe right to go next (only after submitted)
  useSwipe(null, submitted ? nextQuestion : null)

  const renderContent=()=>{
    if(mode==='flash'){return(<>
      {submitted&&(<div style={st.flashAns} className="animate-in"><div style={st.flashLabel}>ANSWER</div><div style={st.flashVal}>{q.a}</div><VerseBlock verses={q.verses} defaultOpen={true}/></div>)}
      <div style={st.actionRow}>{!submitted?<button onClick={()=>setSubmitted(true)} style={st.btnP}>Reveal Answer</button>
        :<button onClick={nextQuestion} style={st.btnP}>{idx+1>=total?'Finish':'Next'} <ArrowRight size={16}/></button>}</div>
    </>)}

    // Bible game modes (guessbook, whosaid, scenario, quotecomplete)
    if(['guessbook','whosaid','scenario','quotecomplete'].includes(mode)&&q.options){
      const cSet=new Set([q.a])
      return(<>
        {mode==='guessbook'&&<div style={st.hint}>Which book is this verse from?</div>}
        {mode==='whosaid'&&<div style={st.hint}>Who said this?</div>}
        {mode==='scenario'&&<div style={st.hint}>Which scripture applies?</div>}
        {mode==='quotecomplete'&&<div style={st.hint}>Complete the verse</div>}
        <div style={st.optGrid}>{q.options.map((opt,i)=>{
          const isC=cSet.has(opt),isSel=selected.has(opt)
          let ss={}
          if(submitted){if(isC&&isSel)ss=st.optOk;else if(!isC&&isSel)ss=st.optBad;else if(isC&&!isSel)ss=st.optMiss;else ss={opacity:0.35}}
          else if(isSel)ss=st.optSel
          return(<button key={i} onClick={()=>{if(submitted)return;sfx(playClick);setSelected(new Set([opt]));doSubmitBible(new Set([opt]))}} disabled={submitted} style={{...st.opt,...ss}}>
            <div style={{...st.ind,...(isSel&&!submitted?st.indA:{}),...(submitted&&isC&&isSel?st.indOk:{}),...(submitted&&!isC&&isSel?st.indBad:{}),borderRadius:'50%'}}>
              {submitted&&isC?'✓':submitted&&isSel&&!isC?'✗':isSel?'✓':''}</div>
            <span style={st.optTxt}>{opt}</span></button>)
        })}</div>
        <Feedback correct={correct} answer={!correct&&submitted?q.a:null}/>
        {submitted&&q.verses&&<VerseBlock verses={q.verses} defaultOpen={true}/>}
        <div style={st.actionRow}>
          {submitted&&<button onClick={nextQuestion} style={st.btnP}>{idx+1>=total?'Finish':'Next'} <ArrowRight size={16}/></button>}
        </div>
        {submitted&&<div style={st.swipeHint}>Swipe right for next →</div>}
      </>)
    }

    if(mode==='fillin'&&blankData){return(<>
      <div style={st.blankRef}>{blankData.ref}</div>
      <div style={st.blankVerse}>
        {blankData.display.split('_____').map((part,i,arr)=>(
          <span key={i}>
            {part}
            {i<arr.length-1&&(
              submitted
                ? <span style={{fontWeight:700,color:correct?'var(--green)':'var(--red)',textDecoration:'underline'}}>{blankData.answer}</span>
                : <span style={st.blankSlot}>_____</span>
            )}
          </span>
        ))}
      </div>
      <input ref={inputRef} type="text" value={typedValue} onChange={e=>setTypedValue(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submitBlank()} placeholder="Type the missing word..." disabled={submitted} style={st.input} autoComplete="off" autoCapitalize="off"/>
      <Feedback correct={correct} answer={!correct&&submitted?blankData.answer:null}/>
      {submitted&&<VerseBlock verses={q.verses}/>}
      <div style={st.actionRow}>{!submitted?<button onClick={submitBlank} style={st.btnP} disabled={!typedValue.trim()}><Send size={15}/> Submit</button>
        :<button onClick={nextQuestion} style={st.btnP}>{idx+1>=total?'Finish':'Next'} <ArrowRight size={16}/></button>}</div>
    </>)}

    if(mode==='type'){return(<>
      <input ref={inputRef} type="text" value={typedValue} onChange={e=>setTypedValue(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submitTyped()} placeholder={hasScripture?'Type scripture reference(s)...':'Type your answer...'} disabled={submitted} style={st.input}/>
      <Feedback correct={correct} answer={!correct&&submitted?q.a:null}/>
      {submitted&&<VerseBlock verses={q.verses}/>}
      <div style={st.actionRow}>{!submitted?<button onClick={submitTyped} style={st.btnP} disabled={!typedValue.trim()}><Send size={15}/> Submit</button>
        :<button onClick={nextQuestion} style={st.btnP}>{idx+1>=total?'Finish':'Next'} <ArrowRight size={16}/></button>}</div>
    </>)}

    const cSet=hasScripture?new Set(q.refs):new Set([q.a])
    return(<>
      {mode==='timed'&&(<div style={st.timerBar}><div style={{...st.timerFill,width:`${(timeLeft/15)*100}%`,background:timeLeft<=5?'var(--red)':'var(--cyan)'}}/></div>)}
      {isMulti&&!submitted&&<div style={st.hint}>Select {q.refs.length} answer{q.refs.length>1?'s':''}</div>}
      <div style={st.optGrid}>{options.map((opt,i)=>{
        const isC=cSet.has(opt),isSel=selected.has(opt)
        let ss={}
        if(submitted){if(isC&&isSel)ss=st.optOk;else if(!isC&&isSel)ss=st.optBad;else if(isC&&!isSel)ss=st.optMiss;else ss={opacity:0.35}}
        else if(isSel)ss=st.optSel
        return(<button key={i} onClick={()=>toggleOpt(opt)} disabled={submitted} style={{...st.opt,...ss}}>
          <div style={{...st.ind,...(isSel&&!submitted?st.indA:{}),...(submitted&&isC&&isSel?st.indOk:{}),...(submitted&&!isC&&isSel?st.indBad:{}),borderRadius:isMulti?4:'50%'}}>
            {submitted&&isC?'✓':submitted&&isSel&&!isC?'✗':isSel?'✓':''}</div>
          <span style={st.optTxt}>{opt}</span></button>)
      })}</div>
      <Feedback correct={correct} answer={!correct&&submitted?q.a:null}/>
      {submitted&&<VerseBlock verses={q.verses}/>}
      <div style={st.actionRow}>
        {!submitted&&(needsConfirm||isMulti)&&<button onClick={()=>doSubmitMC()} style={st.btnP} disabled={selected.size===0}><Send size={15}/> Submit{isMulti&&selected.size>0?` (${selected.size}/${q.refs.length})`:''}</button>}
        {submitted&&<button onClick={nextQuestion} style={st.btnP}>{idx+1>=total?'Finish':'Next'} <ArrowRight size={16}/></button>}
      </div>
      {submitted&&<div style={st.swipeHint}>Swipe right for next →</div>}
    </>)
  }

  const mLabels={mc:isMulti?`MULTIPLE CHOICE — SELECT ${q.refs.length}`:'MULTIPLE CHOICE',type:'TYPE YOUR ANSWER',flash:'FLASHCARD',timed:isMulti?`TIMED — SELECT ${q.refs.length}`:'TIMED QUIZ',fillin:'FILL IN THE BLANK',guessbook:'GUESS THE BOOK',whosaid:'WHO SAID IT?',scenario:'SCENARIO MODE',quotecomplete:'QUOTE COMPLETION'}

  return(<div style={st.container}>
    <div style={st.topBar}><div style={st.topL}>
      <span style={st.qC}>{idx+1}<span style={{color:'var(--text-muted)'}}> / {total}</span></span>
      {mode!=='flash'&&<span style={st.sTag}>{score} ✓</span>}</div>
      <button onClick={()=>setShowQuit(true)} style={st.quitBtn}><X size={16}/> END</button></div>
    <div style={st.pBar}><div style={{...st.pFill,width:`${(idx/total)*100}%`}}/></div>
    <div key={idx} className="animate-in">
      {q.categories&&<div style={st.catTags}>{q.categories.map(c=><span key={c} style={st.catTag}>{c}</span>)}</div>}
      <div style={st.mTag}>{mLabels[mode]||'QUIZ'}</div>
      <h2 style={st.qTxt}>{q.n}) {q.q}</h2>
      {renderContent()}
    </div>
    {showQuit&&(<div style={st.overlay} onClick={()=>setShowQuit(false)}><div style={st.modal} onClick={e=>e.stopPropagation()} className="animate-in">
      <h3 style={st.mTitle}>End Test?</h3><p style={st.mText}>Answered {answers.length} of {total}. Your progress will be scored.</p>
      <div style={st.mActions}><button onClick={()=>setShowQuit(false)} style={st.mCancel}>Keep Going</button><button onClick={handleEndTest} style={st.mConfirm}>End & Results</button></div>
    </div></div>)}
  </div>)
}

function fuzzyMatch(g,c){const n=s=>s.toLowerCase().replace(/[^a-z0-9 :,-]/g,'').replace(/\s+/g,' ').trim();const a=n(g),b=n(c);if(a===b)return true;const aR=a.split(/[,;]/).map(s=>s.trim()).filter(Boolean),bR=b.split(/[,;]/).map(s=>s.trim()).filter(Boolean);if(bR.length<=1)return a.includes(b)||b.includes(a);let m=0;for(const cr of bR){for(const gr of aR){if(gr.includes(cr)||cr.includes(gr)){m++;break}}}return m>=Math.ceil(bR.length*.5)}

const st={
  container:{maxWidth:640,margin:'0 auto',padding:'16px 20px 80px'},
  topBar:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10},
  topL:{display:'flex',alignItems:'center',gap:10},
  qC:{fontFamily:'var(--font-display)',fontSize:14,fontWeight:700,color:'var(--text)'},
  sTag:{fontFamily:'var(--font-mono)',fontSize:12,color:'var(--green)',background:'var(--green-subtle)',padding:'3px 10px',borderRadius:12,border:'1px solid rgba(0,255,136,0.15)'},
  quitBtn:{display:'flex',alignItems:'center',gap:4,padding:'7px 14px',fontSize:12,fontWeight:700,fontFamily:'var(--font-display)',letterSpacing:1,color:'var(--red)',background:'var(--red-subtle)',border:'1px solid rgba(255,51,102,0.15)',borderRadius:'var(--radius-sm)',cursor:'pointer'},
  pBar:{width:'100%',height:3,background:'var(--border)',borderRadius:2,marginBottom:24,overflow:'hidden'},
  pFill:{height:'100%',background:'linear-gradient(90deg, var(--cyan-dim), var(--cyan))',borderRadius:2,transition:'width 0.4s'},
  catTags:{display:'flex',gap:4,marginBottom:6,flexWrap:'wrap'},
  catTag:{fontFamily:'var(--font-mono)',fontSize:9,fontWeight:600,letterSpacing:1,textTransform:'uppercase',color:'var(--cyan-dim)',background:'var(--cyan-subtle)',padding:'2px 8px',borderRadius:10,border:'1px solid var(--border)'},
  mTag:{fontFamily:'var(--font-display)',fontSize:9,fontWeight:700,letterSpacing:2,color:'var(--cyan-dim)',marginBottom:8},
  qTxt:{fontFamily:'var(--font-body)',fontSize:'clamp(18px,4.5vw,24px)',fontWeight:600,lineHeight:1.45,color:'var(--text)',marginBottom:24},
  hint:{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--cyan)',background:'var(--cyan-subtle)',padding:'5px 12px',borderRadius:6,marginBottom:12,display:'inline-block',border:'1px solid var(--border)'},
  timerBar:{width:'100%',height:3,background:'var(--border)',borderRadius:2,marginBottom:18,overflow:'hidden'},
  timerFill:{height:'100%',borderRadius:2,transition:'width 0.1s linear'},
  optGrid:{display:'flex',flexDirection:'column',gap:8},
  opt:{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',minHeight:52,background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',fontSize:14,color:'var(--text)',textAlign:'left',width:'100%',transition:'all 0.2s',cursor:'pointer',backdropFilter:'blur(8px)',lineHeight:1.4},
  optSel:{borderColor:'var(--cyan)',background:'var(--cyan-subtle)',boxShadow:'0 0 12px rgba(0,212,255,0.1)'},
  optOk:{borderColor:'var(--green)',background:'var(--green-subtle)'},
  optBad:{borderColor:'var(--red)',background:'var(--red-subtle)'},
  optMiss:{borderColor:'var(--cyan)',background:'var(--cyan-subtle)',opacity:0.6},
  ind:{width:22,height:22,minWidth:22,border:'2px solid var(--text-muted)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,transition:'all 0.15s'},
  indA:{borderColor:'var(--cyan)',background:'var(--cyan)',color:'var(--bg)'},
  indOk:{borderColor:'var(--green)',background:'var(--green)',color:'var(--bg)'},
  indBad:{borderColor:'var(--red)',background:'var(--red)',color:'#fff'},
  optTxt:{fontFamily:'var(--font-mono)',fontSize:14,fontWeight:500},
  input:{width:'100%',padding:'13px 16px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',color:'var(--text)',fontFamily:'var(--font-mono)',fontSize:15,outline:'none'},
  blankRef:{fontFamily:'var(--font-mono)',fontSize:12,fontWeight:600,color:'var(--cyan)',marginBottom:10},
  blankVerse:{fontSize:15,lineHeight:1.8,color:'var(--text)',fontStyle:'italic',padding:'16px 20px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:'var(--radius)',marginBottom:16},
  blankSlot:{display:'inline-block',minWidth:80,borderBottom:'2px solid var(--cyan)',color:'var(--cyan)',fontWeight:700,fontStyle:'normal',textAlign:'center',margin:'0 2px',verticalAlign:'bottom'},
  flashAns:{padding:20,background:'var(--cyan-subtle)',border:'1px solid var(--border)',borderRadius:'var(--radius)',marginBottom:16},
  flashLabel:{fontFamily:'var(--font-display)',fontSize:9,fontWeight:700,letterSpacing:2,color:'var(--cyan)',marginBottom:8},
  flashVal:{fontFamily:'var(--font-mono)',fontSize:14,color:'var(--text)',lineHeight:1.6},
  actionRow:{display:'flex',gap:10,marginTop:24},
  btnP:{flex:1,display:'flex',justifyContent:'center',alignItems:'center',gap:8,padding:'13px 24px',fontSize:14,fontWeight:700,fontFamily:'var(--font-display)',letterSpacing:1.5,color:'var(--bg)',background:'linear-gradient(135deg, var(--cyan), var(--cyan-dim))',border:'none',borderRadius:'var(--radius-sm)',boxShadow:'0 0 15px rgba(0,212,255,0.15)',cursor:'pointer'},
  swipeHint:{textAlign:'center',marginTop:12,fontSize:11,color:'var(--text-muted)',fontFamily:'var(--font-mono)'},
  overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:20,backdropFilter:'blur(4px)'},
  modal:{background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:24,maxWidth:360,width:'100%'},
  mTitle:{fontFamily:'var(--font-display)',fontSize:18,color:'var(--text)',marginBottom:6,letterSpacing:1},
  mText:{fontSize:13,color:'var(--text-sec)',lineHeight:1.5,marginBottom:20},
  mActions:{display:'flex',gap:8},
  mCancel:{flex:1,padding:'10px 14px',fontSize:13,fontWeight:700,fontFamily:'var(--font-display)',letterSpacing:1,background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',color:'var(--text)',cursor:'pointer'},
  mConfirm:{flex:1,padding:'10px 14px',fontSize:13,fontWeight:700,fontFamily:'var(--font-display)',letterSpacing:1,background:'var(--red)',border:'none',borderRadius:'var(--radius-sm)',color:'#fff',cursor:'pointer'},
}
