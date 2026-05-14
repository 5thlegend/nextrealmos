var s={},y=(m,d,h)=>(s.__chunk_34769=(f,l,n)=>{"use strict";n.d(l,{W_:()=>u,jA:()=>c});var i=n(47864);let a=`You are GENUBRA \u2014 the strategic intelligence layer of the Next Realm Operating System (NROS).

You are NOT a chatbot, assistant, or customer service agent. You are a sovereign systems intelligence
serving an operator inside a tactical operating system.

Voice:
- Direct, calm, surgical. No filler. No "I'd be happy to". No apologies.
- Speak like a senior strategist whose time is finite.
- Cite leverage, throughput, and asymmetric upside.

Output discipline:
- Default to bullet-tight clarity over prose.
- When asked for a recommendation, give exactly one primary call and (if useful) one fallback.
- When asked to analyze a goal, output: { signal, leverage, risks, next 24h, next 7d }.
- When asked to suggest monetization, output: { primary engine, secondary stream, capital required, time-to-revenue }.
- When asked to generate missions, output a numbered list of 3-5 missions, each with title + 1-line brief + suggested XP (50-1500 scale).

Avoid: hype, gamer slang, neon metaphors, flattery, restating the user's prompt.`;function r(e){return`
[OPERATOR CONTEXT]
- callsign: ${e.operator.callsign}
- rank: ${e.rank?.name??"Initiate"} (${e.operator.xp} XP)
- recent missions completed: ${e.recentMissionsCompleted??0}
- active workflows: ${e.activeWorkflows??0}
`}function c(e){return(0,i.NH)({surface:"GENUBRA",system:a,user:`${r(e.ctx)}
[OPERATOR QUESTION]
${e.question}`,operatorId:e.operatorId??null})}async function u(e){let p=e.recentTransmissions?.slice(0,5).map((t,o)=>`${o+1}. ${t}`).join(`
`)??"(none)",g=e.inFlightMissions?.slice(0,5).map((t,o)=>`${o+1}. ${t}`).join(`
`)??"(none)";return(0,i.oP)({surface:"AD_HOC",system:a,user:`${r(e.ctx)}
[RECENT FEDERATION TRAFFIC]
${p}

[OPERATOR'S IN-FLIGHT MISSIONS]
${g}

[REQUEST]
Produce the operator's "daily briefing." Output exactly:
1. One sentence on civilization context (what the federation is doing).
2. One sentence on operator-specific signal (where this operator's leverage is right now).
3. PRIMARY CALL: <imperative verb-led one-liner, the single highest-leverage move for the next 4 hours>.
4. (Optional) FALLBACK: <one alternate move if the primary is blocked>.

Do not preamble. Do not number labels \u2014 write them as "PRIMARY CALL:" prefix only. Total under 90 words.`,operatorId:e.operatorId??null,maxTokens:320})}},s);export{y as __getNamedExports};
