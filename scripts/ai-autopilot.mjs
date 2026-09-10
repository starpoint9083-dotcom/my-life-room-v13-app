import fs from "node:fs";

const key=process.env.OPENAI_API_KEY||"";
if(!key){console.log("OPENAI_API_KEY is not configured; AI proposal skipped safely.");process.exit(0)}

const targets=["public/index.html","public/runtime-v14.js","public/room-runtime-v19.js","public/pose-runtime-v20.js"];
const runNumber=Math.max(1,Number(process.env.GITHUB_RUN_NUMBER)||1);
const target=process.env.AUTOPILOT_TARGET&&targets.includes(process.env.AUTOPILOT_TARGET)?process.env.AUTOPILOT_TARGET:targets[(runNumber-1)%targets.length];
const source=fs.readFileSync(target,"utf8");
const policy=fs.readFileSync("AUTOPILOT_POLICY.md","utf8");
if(source.length>220000)throw new Error(`Target too large for guarded autopilot: ${source.length}`);

const schema={
  type:"object",
  properties:{
    decision:{type:"string",enum:["edit","none"]},
    summary:{type:"string"},
    risk:{type:"string",enum:["low"]},
    edits:{type:"array",items:{type:"object",properties:{search:{type:"string"},replace:{type:"string"}},required:["search","replace"],additionalProperties:false}}
  },
  required:["decision","summary","risk","edits"],
  additionalProperties:false
};

const system=`You are the guarded maintenance engineer for a deployed Korean wellness web app. Propose at most ONE genuinely low-risk improvement to the single file provided. Prefer accessibility, clarity, defensive UI behavior, or small performance improvements. Preserve all existing product behavior and Korean copy intent unless a tiny copy correction is clearly beneficial. Never change authentication, secrets, payments, privacy behavior, API contracts, storage semantics, reset semantics, D1/R2 behavior, Cloudflare configuration, deployment logic, or version contracts. Never weaken checks. If no clearly safe improvement is warranted, return decision none. For an edit, return 1 to 3 exact search/replace operations; each search string must appear exactly once in the supplied file. Keep the patch small.`;
const user=`Repository policy:\n${policy}\n\nTarget file: ${target}\n\nCURRENT FILE START\n${source}\nCURRENT FILE END`;

const response=await fetch("https://api.openai.com/v1/responses",{
  method:"POST",
  headers:{"authorization":`Bearer ${key}`,"content-type":"application/json"},
  body:JSON.stringify({
    model:process.env.OPENAI_MODEL||"gpt-5.6-luna",
    reasoning:{effort:"medium"},
    input:[{role:"system",content:system},{role:"user",content:user}],
    max_output_tokens:6000,
    text:{format:{type:"json_schema",name:"autopilot_change",strict:true,schema}}
  })
});
const data=await response.json().catch(()=>({}));
if(!response.ok)throw new Error(`OpenAI Responses API ${response.status}: ${JSON.stringify(data).slice(0,800)}`);
const outputText=(data.output||[]).flatMap(item=>item.content||[]).filter(item=>item.type==="output_text").map(item=>item.text||"").join("\n").trim();
if(!outputText)throw new Error(`No structured output text returned. status=${data.status||"unknown"}`);
const proposal=JSON.parse(outputText);
const summary=String(proposal.summary||"").replace(/[\r\n]+/g," ").slice(0,180)||"Low-risk maintenance improvement";
fs.writeFileSync(".autopilot-summary.txt",summary+"\n");

if(proposal.decision==="none"){
  if(Array.isArray(proposal.edits)&&proposal.edits.length)throw new Error("Unsafe structured response: decision none with edits.");
  console.log(`AI reviewed ${target} and proposed no change: ${summary}`);
  process.exit(0);
}
if(proposal.decision!=="edit"||proposal.risk!=="low")throw new Error("Autopilot accepts only low-risk edit decisions.");
if(!Array.isArray(proposal.edits)||proposal.edits.length<1||proposal.edits.length>3)throw new Error("Autopilot allows 1-3 exact edits only.");

let next=source,totalReplacementChars=0;
for(const [i,edit] of proposal.edits.entries()){
  const search=String(edit.search||""),replace=String(edit.replace??"");
  if(!search)throw new Error(`Edit ${i+1} has an empty search string.`);
  const count=next.split(search).length-1;
  if(count!==1)throw new Error(`Edit ${i+1} search must match exactly once; matched ${count}.`);
  totalReplacementChars+=replace.length;
  if(totalReplacementChars>30000)throw new Error("AI replacement payload exceeds the guarded size limit.");
  next=next.replace(search,replace);
}
if(next===source){console.log("AI proposal produced no effective change.");process.exit(0)}
const delta=Math.abs(next.length-source.length);
if(delta>20000)throw new Error(`AI change is too large: character delta ${delta}.`);
fs.writeFileSync(target,next);
console.log(`AUTOPILOT_EDIT_APPLIED target=${target} edits=${proposal.edits.length} summary=${summary}`);
