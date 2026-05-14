var h={},K=(Y,A,C)=>(h.__chunk_22964=(D,O,c)=>{"use strict";c.d(O,{Zr:()=>E,ZG:()=>T,Dl:()=>v});var f=c(86990),I=c(47864),t=c(78545);let k=`You are OBLISK \u2014 the workflow manifestation engine of NROS.

You decompose an operator's objective into a structured roadmap.

You MUST respond with strict JSON matching this TypeScript shape (no prose, no markdown fences):

{
  "title": string,
  "summary": string,                              // 1-2 sentences
  "recommended_stack": string[],                  // 3-8 concrete tools / frameworks / services
  "monetization_notes": string,                   // 1-3 sentences on revenue model + time-to-revenue
  "phases": [
    {
      "title": string,
      "detail": string,                           // 1 sentence
      "estimated_hours": number,
      "tasks": [
        { "type": "TASK"|"AUTOMATION"|"DECISION", "title": string, "detail": string, "estimated_hours": number }
      ]
    }
  ]
}

Constraints:
- 3 to 5 phases.
- 2 to 5 tasks per phase.
- Each task type is exactly one of TASK | AUTOMATION | DECISION.
- estimated_hours is a positive number; round to 0.5 increments.
- Do NOT wrap the JSON in code fences. Do NOT add commentary.`,S=t.Ik({type:t.k5(["TASK","AUTOMATION","DECISION"]),title:t.Yj(),detail:t.Yj(),estimated_hours:t.ai().positive()}),y=t.Ik({title:t.Yj(),detail:t.Yj(),estimated_hours:t.ai().positive(),tasks:t.YO(S).min(1).max(8)}),g=t.Ik({title:t.Yj(),summary:t.Yj(),recommended_stack:t.YO(t.Yj()).min(1),monetization_notes:t.Yj(),phases:t.YO(y).min(1).max(8)});async function x(r){let o,i=await(0,I.oP)({surface:"OBLISK",system:k,user:`[OPERATOR] ${r.operatorCallsign}
[OBJECTIVE]
${r.objective}

Return ONLY the JSON object.`,operatorId:r.operatorId??null,maxTokens:2400});try{o=JSON.parse(function(a){let m=a.match(/```(?:json)?\s*([\s\S]*?)\s*```/);if(m)return m[1];let d=a.indexOf("{"),u=a.lastIndexOf("}");return d!==-1&&u!==-1?a.slice(d,u+1):a}(i))}catch(a){throw Error(`OBLISK returned invalid JSON: ${a.message}
Raw: ${i.slice(0,400)}`)}return g.parse(o)}var N=c(40037);async function v(r){let o=await(0,f.createSupabaseServer)(),{data:i}=await o.from("workflows").select("*").eq("operator_id",r).order("updated_at",{ascending:!1});return i??[]}async function T(r){let o=await(0,f.createSupabaseServer)(),{data:i}=await o.from("workflows").select("*").eq("id",r).maybeSingle();if(!i)return null;let{data:a}=await o.from("workflow_steps").select("*").eq("workflow_id",r).order("order_index");return{workflow:i,steps:a??[]}}async function E(r){let o=await x({objective:r.objective,operatorCallsign:r.operatorCallsign,operatorId:r.operatorId}),i=await(0,f.createSupabaseServer)(),{data:a,error:m}=await i.from("workflows").insert({operator_id:r.operatorId,title:o.title,objective:r.objective,status:"ACTIVE",ai_summary:o.summary,monetization_notes:o.monetization_notes,recommended_stack:o.recommended_stack}).select("id").single();if(m)throw m;let d=function(e){let s=[],n=0;return e.phases.forEach((l,b)=>{s.push({parent_index:null,type:"PHASE",title:l.title,detail:l.detail,estimated_hours:l.estimated_hours,order_index:n++});let j=s.length-1;l.tasks.forEach(p=>{s.push({parent_index:j,type:p.type,title:p.title,detail:p.detail,estimated_hours:p.estimated_hours,order_index:n++})})}),s}(o),u=d.filter(e=>e.type==="PHASE"),_=[];for(let e of u){let{data:s,error:n}=await i.from("workflow_steps").insert({workflow_id:a.id,type:e.type,title:e.title,detail:e.detail,estimated_hours:e.estimated_hours,order_index:e.order_index,status:"PENDING"}).select("id").single();if(n)throw n;_.push(s.id)}let w=d.filter(e=>e.type!=="PHASE").map(e=>{let s=e.parent_index,n=_[u.findIndex((l,b)=>d.indexOf(l)===s)]??null;return{workflow_id:a.id,parent_id:n,type:e.type,title:e.title,detail:e.detail,estimated_hours:e.estimated_hours,order_index:e.order_index,status:"PENDING"}});if(w.length>0){let{error:e}=await i.from("workflow_steps").insert(w);if(e)throw e}return await(0,N.C)({operatorId:r.operatorId,delta:100,reason:`OBLISK workflow forged: ${o.title}`,sourceType:"WORKFLOW",sourceId:a.id}).catch(()=>{}),{workflowId:a.id,plan:o}}},h);export{K as __getNamedExports};
