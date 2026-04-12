(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[4109],{59243:function(e,t,r){Promise.resolve().then(r.bind(r,23474))},23474:function(e,t,r){"use strict";r.r(t),r.d(t,{default:function(){return f}});var s=r(57437),a=r(2265),n=r(48871),o=r(30690),l=r(66706),i=r(98094),c=r(78030);/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let d=(0,c.Z)("Download",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"7 10 12 15 17 10",key:"2ggqvy"}],["line",{x1:"12",x2:"12",y1:"15",y2:"3",key:"1vk2je"}]]);var m=r(13231),x=r(71935);/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let u=(0,c.Z)("SkipForward",[["polygon",{points:"5 4 15 12 5 20 5 4",key:"16p6eg"}],["line",{x1:"19",x2:"19",y1:"5",y2:"19",key:"futhcm"}]]);var p=r(36127),h=r(97589);function f(){let[e,t]=(0,a.useState)("idle"),[r,c]=(0,a.useState)(!0),[f,g]=(0,a.useState)(null),[b,y]=(0,a.useState)(null);async function j(){t("running"),g(null),y(null);try{let s=await fetch("/api/caza/import",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({dryRun:r})});if(503===s.status){var e;let r=await s.json();y(null!==(e=r.error)&&void 0!==e?e:"Servi\xe7o indispon\xedvel (banco de dados ou token Notion n\xe3o configurado)."),t("error");return}if(!s.ok){y("Erro HTTP ".concat(s.status)),t("error");return}let a=await s.json();g(a),t("done")}catch(e){y(e instanceof Error?e.message:"Erro desconhecido"),t("error")}}return(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(n.default,{title:"Importar do Notion",subtitle:"Sincroniza\xe7\xe3o \xfanica \xb7 Notion → Base interna AWQ"}),(0,s.jsxs)("div",{className:"page-container",children:[(0,s.jsx)("div",{className:"rounded-xl border border-blue-200 bg-blue-50 px-4 py-3",children:(0,s.jsxs)("div",{className:"flex items-start gap-2",children:[(0,s.jsx)(o.Z,{size:14,className:"text-blue-600 shrink-0 mt-0.5"}),(0,s.jsxs)("div",{children:[(0,s.jsx)("p",{className:"text-xs font-semibold text-blue-800",children:"Importa\xe7\xe3o manual — Notion \xe9 fonte de refer\xeancia, n\xe3o fonte operacional."}),(0,s.jsxs)("p",{className:"text-[11px] text-blue-600 mt-0.5",children:["Os dados importados s\xe3o gravados na base interna AWQ (Neon Postgres). Ap\xf3s a importa\xe7\xe3o, edi\xe7\xf5es devem ser feitas diretamente na base interna. O token Notion \xe9 lido de ",(0,s.jsx)("code",{className:"bg-blue-100 px-1 rounded",children:"NOTION_TOKEN"})," no ambiente do servidor — nunca exposto ao cliente."]})]})]})}),(0,s.jsxs)("div",{className:"card p-5",children:[(0,s.jsx)("h2",{className:"text-sm font-semibold text-gray-900 mb-4",children:"Configurar Importa\xe7\xe3o"}),(0,s.jsxs)("div",{className:"flex flex-col sm:flex-row items-start sm:items-center gap-4",children:[(0,s.jsxs)("label",{className:"flex items-center gap-2 cursor-pointer select-none",children:[(0,s.jsx)("div",{onClick:()=>c(e=>!e),className:"relative w-10 h-5 rounded-full transition-colors ".concat(r?"bg-amber-400":"bg-emerald-500"),children:(0,s.jsx)("div",{className:"absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ".concat(r?"left-0.5":"left-5")})}),(0,s.jsx)("span",{className:"text-sm font-medium text-gray-700",children:r?"Dry Run (simula\xe7\xe3o)":"Importa\xe7\xe3o real"})]}),(0,s.jsx)("p",{className:"text-xs text-gray-500 flex-1",children:r?"Dry Run: simula a importa\xe7\xe3o sem gravar nada. Use para auditar antes de confirmar.":"Importa\xe7\xe3o real: projetos e clientes ser\xe3o gravados na base interna AWQ."})]}),(0,s.jsxs)("div",{className:"mt-4 flex items-center gap-3",children:[(0,s.jsxs)("button",{onClick:j,disabled:"running"===e,className:"inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors",children:["running"===e?(0,s.jsx)(l.Z,{size:14,className:"animate-spin"}):r?(0,s.jsx)(i.Z,{size:14}):(0,s.jsx)(d,{size:14}),"running"===e?"Importando…":r?"Simular Importa\xe7\xe3o":"Importar Agora"]}),"done"===e&&(0,s.jsxs)("span",{className:"flex items-center gap-1.5 text-xs text-emerald-600 font-medium",children:[(0,s.jsx)(m.Z,{size:14})," Conclu\xeddo"]}),"error"===e&&(0,s.jsxs)("span",{className:"flex items-center gap-1.5 text-xs text-red-600 font-medium",children:[(0,s.jsx)(x.Z,{size:14})," Falhou"]})]})]}),"error"===e&&b&&(0,s.jsxs)("div",{className:"rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2",children:[(0,s.jsx)(x.Z,{size:14,className:"text-red-600 shrink-0 mt-0.5"}),(0,s.jsxs)("div",{children:[(0,s.jsx)("p",{className:"text-xs font-semibold text-red-800",children:"Erro na importa\xe7\xe3o"}),(0,s.jsx)("p",{className:"text-[11px] text-red-600 mt-0.5",children:b}),(0,s.jsxs)("p",{className:"text-[11px] text-red-500 mt-1",children:["Verifique se ",(0,s.jsx)("code",{className:"bg-red-100 px-1 rounded",children:"NOTION_TOKEN"})," est\xe1 configurado no ambiente Vercel e se os IDs dos bancos de dados Notion est\xe3o corretos."]})]})]}),f&&(0,s.jsxs)("div",{className:"card p-5",children:[(0,s.jsx)("div",{className:"flex items-center gap-2 mb-4",children:f.dry_run?(0,s.jsxs)("span",{className:"inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-700 font-semibold",children:[(0,s.jsx)(i.Z,{size:10})," Simula\xe7\xe3o (Dry Run)"]}):(0,s.jsxs)("span",{className:"inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold",children:[(0,s.jsx)(m.Z,{size:10})," Importado em ",new Date(f.imported_at).toLocaleString("pt-BR")]})}),(0,s.jsx)("div",{className:"grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-5",children:[{label:"Projetos importados",value:f.projects_imported,color:"text-emerald-600",icon:m.Z},{label:"Projetos ignorados",value:f.projects_skipped,color:"text-gray-500",icon:u},{label:"Conflitos",value:f.projects_conflicts.length+f.clients_conflicts.length,color:"text-amber-700",icon:p.Z},{label:"Clientes importados",value:f.clients_imported,color:"text-emerald-600",icon:h.Z},{label:"Clientes ignorados",value:f.clients_skipped,color:"text-gray-500",icon:u}].map(e=>{let t=e.icon;return(0,s.jsxs)("div",{className:"text-center p-3 rounded-lg bg-gray-50 border border-gray-100",children:[(0,s.jsx)(t,{size:14,className:"".concat(e.color," mx-auto mb-1")}),(0,s.jsx)("div",{className:"text-2xl font-bold ".concat(e.color),children:e.value}),(0,s.jsx)("div",{className:"text-[10px] text-gray-500 mt-0.5",children:e.label})]},e.label)})}),f.errors.length>0&&(0,s.jsxs)("div",{className:"mt-4 p-3 rounded-lg bg-red-50 border border-red-200",children:[(0,s.jsxs)("p",{className:"text-xs font-semibold text-red-700 mb-2 flex items-center gap-1.5",children:[(0,s.jsx)(p.Z,{size:12})," ",f.errors.length," erro(s) encontrado(s)"]}),(0,s.jsx)("ul",{className:"space-y-1",children:f.errors.map((e,t)=>(0,s.jsx)("li",{className:"text-[11px] text-red-600 font-mono",children:e},t))})]}),0===f.errors.length&&(0,s.jsxs)("p",{className:"text-xs text-gray-400 flex items-center gap-1.5",children:[(0,s.jsx)(m.Z,{size:11,className:"text-emerald-500"}),"Nenhum erro encontrado.",f.dry_run&&" Execute novamente sem Dry Run para gravar na base interna."]})]}),(0,s.jsxs)("div",{className:"card p-5 bg-gray-50 border-gray-200",children:[(0,s.jsx)("h3",{className:"text-xs font-semibold text-gray-700 mb-2",children:"Arquitetura de dados"}),(0,s.jsxs)("div",{className:"space-y-1 text-[11px] text-gray-500",children:[(0,s.jsxs)("div",{className:"flex items-center gap-2",children:[(0,s.jsx)("span",{className:"w-2 h-2 rounded-full bg-violet-400 shrink-0"}),(0,s.jsxs)("span",{children:[(0,s.jsx)("strong",{children:"Notion"})," — fonte de refer\xeancia / importa\xe7\xe3o (nunca consultado em tempo real)"]})]}),(0,s.jsxs)("div",{className:"flex items-center gap-2",children:[(0,s.jsx)("span",{className:"w-2 h-2 rounded-full bg-emerald-400 shrink-0"}),(0,s.jsxs)("span",{children:[(0,s.jsx)("strong",{children:"Base interna AWQ"})," — fonte can\xf4nica operacional (Neon Postgres)"]})]}),(0,s.jsxs)("div",{className:"flex items-center gap-2",children:[(0,s.jsx)("span",{className:"w-2 h-2 rounded-full bg-brand-400 shrink-0"}),(0,s.jsxs)("span",{children:[(0,s.jsx)("strong",{children:"UI Caza Vision"})," — l\xea exclusivamente da base interna"]})]})]})]})]})]})}},78030:function(e,t,r){"use strict";r.d(t,{Z:function(){return i}});var s=r(2265);/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),n=function(){for(var e=arguments.length,t=Array(e),r=0;r<e;r++)t[r]=arguments[r];return t.filter((e,t,r)=>!!e&&r.indexOf(e)===t).join(" ")};/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var o={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let l=(0,s.forwardRef)((e,t)=>{let{color:r="currentColor",size:a=24,strokeWidth:l=2,absoluteStrokeWidth:i,className:c="",children:d,iconNode:m,...x}=e;return(0,s.createElement)("svg",{ref:t,...o,width:a,height:a,stroke:r,strokeWidth:i?24*Number(l)/Number(a):l,className:n("lucide",c),...x},[...m.map(e=>{let[t,r]=e;return(0,s.createElement)(t,r)}),...Array.isArray(d)?d:[d]])}),i=(e,t)=>{let r=(0,s.forwardRef)((r,o)=>{let{className:i,...c}=r;return(0,s.createElement)(l,{ref:o,iconNode:t,className:n("lucide-".concat(a(e)),i),...c})});return r.displayName="".concat(e),r}},6600:function(e,t,r){"use strict";r.d(t,{Z:function(){return s}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,r(78030).Z)("Bell",[["path",{d:"M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9",key:"1qo2s2"}],["path",{d:"M10.3 21a1.94 1.94 0 0 0 3.4 0",key:"qgo35s"}]])},13231:function(e,t,r){"use strict";r.d(t,{Z:function(){return s}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,r(78030).Z)("CircleCheck",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]])},71935:function(e,t,r){"use strict";r.d(t,{Z:function(){return s}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,r(78030).Z)("CircleX",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m15 9-6 6",key:"1uzhvr"}],["path",{d:"m9 9 6 6",key:"z0biqf"}]])},97589:function(e,t,r){"use strict";r.d(t,{Z:function(){return s}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,r(78030).Z)("Database",[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3",key:"msslwz"}],["path",{d:"M3 5V19A9 3 0 0 0 21 19V5",key:"1wlel7"}],["path",{d:"M3 12A9 3 0 0 0 21 12",key:"mv7ke4"}]])},30690:function(e,t,r){"use strict";r.d(t,{Z:function(){return s}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,r(78030).Z)("Info",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 16v-4",key:"1dtifu"}],["path",{d:"M12 8h.01",key:"e9boi3"}]])},98094:function(e,t,r){"use strict";r.d(t,{Z:function(){return s}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,r(78030).Z)("Play",[["polygon",{points:"6 3 20 12 6 21 6 3",key:"1oa8hb"}]])},66706:function(e,t,r){"use strict";r.d(t,{Z:function(){return s}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,r(78030).Z)("RefreshCw",[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]])},54817:function(e,t,r){"use strict";r.d(t,{Z:function(){return s}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,r(78030).Z)("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]])},36127:function(e,t,r){"use strict";r.d(t,{Z:function(){return s}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,r(78030).Z)("TriangleAlert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]])}},function(e){e.O(0,[8871,2971,7023,1744],function(){return e(e.s=59243)}),_N_E=e.O()}]);