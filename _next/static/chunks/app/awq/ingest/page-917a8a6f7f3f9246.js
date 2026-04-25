(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[983],{87923:function(e,t,s){Promise.resolve().then(s.bind(s,28e3))},28e3:function(e,t,s){"use strict";s.r(t),s.d(t,{default:function(){return u}});var a=s(57437),n=s(2265),r=s(10482),i=s(40933),l=s(3274),c=s(13231),o=s(76780),d=s(36127);function u(){var e;let[t,s]=(0,n.useState)([]),[i,l]=(0,n.useState)([]),[c,o]=(0,n.useState)(null),[u,x]=(0,n.useState)(!1),[m,p]=(0,n.useState)(!0),[y,h]=(0,n.useState)(!1),[f,b]=(0,n.useState)(null),[g,k]=(0,n.useState)("Cora"),[v,j]=(0,n.useState)(""),[Z,N]=(0,n.useState)("Unknown"),[S,C]=(0,n.useState)(!1),[w,M]=(0,n.useState)(null),[E,P]=(0,n.useState)(null),[q,F]=(0,n.useState)([]),[I,z]=(0,n.useState)("all"),[H,A]=(0,n.useState)(!1),[V,_]=(0,n.useState)(!1),D=((0,n.useRef)(null),(0,n.useRef)(null)),G=(0,n.useCallback)(async()=>{p(!0);try{let t=await fetch("/api/ingest/documents");if(t.ok){var e;let a=await t.json();s(null!==(e=a.documents)&&void 0!==e?e:[])}}catch(e){}p(!1)},[]);(0,n.useEffect)(()=>{G()},[G]);let O=(0,n.useCallback)(async e=>{h(!0);try{let s=await fetch("/api/ingest/transactions?documentId=".concat(e));if(s.ok){var t;let e=await s.json();l(null!==(t=e.transactions)&&void 0!==t?t:[])}}catch(e){}h(!1)},[]);return(0,n.useEffect)(()=>{c&&O(c)},[c,O]),(0,n.useEffect)(()=>{var e;null===(e=D.current)||void 0===e||e.scrollIntoView({behavior:"smooth"})},[q]),t.find(e=>e.id===c),i.filter(e=>("all"===I||e.entity===I)&&(!!H||!e.isIntercompany)&&(!V||"ambiguous"===e.classificationConfidence)),i.filter(e=>!e.excludedFromConsolidated&&"credit"===e.direction).reduce((e,t)=>e+Math.abs(t.amount),0),i.filter(e=>!e.excludedFromConsolidated&&"debit"===e.direction).reduce((e,t)=>e+Math.abs(t.amount),0),i.filter(e=>e.isIntercompany).length,i.filter(e=>"ambiguous"===e.classificationConfidence).length,(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)(r.default,{title:"Ingest\xe3o Financeira",subtitle:"Upload de extratos PDF \xb7 Extra\xe7\xe3o \xb7 Classifica\xe7\xe3o \xb7 Reconcilia\xe7\xe3o"}),(0,a.jsxs)("div",{className:"px-8 py-10 max-w-2xl",children:[(0,a.jsxs)("div",{className:"rounded-xl border-2 border-amber-200 bg-amber-50 p-6 space-y-4",children:[(0,a.jsxs)("div",{className:"flex items-start gap-3",children:[(0,a.jsx)(d.Z,{size:20,className:"text-amber-600 shrink-0 mt-0.5"}),(0,a.jsxs)("div",{children:[(0,a.jsx)("h2",{className:"text-sm font-bold text-amber-900",children:"Pipeline de ingest\xe3o n\xe3o dispon\xedvel neste ambiente"}),(0,a.jsx)("p",{className:"text-xs text-amber-700 mt-1 leading-relaxed",children:"Este site est\xe1 publicado como exporta\xe7\xe3o est\xe1tica (GitHub Pages). Ambientes est\xe1ticos n\xe3o suportam execu\xe7\xe3o de servidor, grava\xe7\xe3o em sistema de arquivos ou chamadas \xe0 API Claude — todas opera\xe7\xf5es obrigat\xf3rias para o pipeline de ingest\xe3o banc\xe1ria."})]})]}),(0,a.jsxs)("div",{className:"border-t border-amber-200 pt-4 space-y-3",children:[(0,a.jsx)("p",{className:"text-xs font-semibold text-amber-900",children:"O que n\xe3o est\xe1 dispon\xedvel aqui:"}),(0,a.jsxs)("ul",{className:"text-xs text-amber-700 space-y-1 ml-3",children:[(0,a.jsx)("li",{children:"✗ Upload de PDF de extrato banc\xe1rio"}),(0,a.jsx)("li",{children:"✗ Extra\xe7\xe3o de transa\xe7\xf5es (Claude API — requer servidor)"}),(0,a.jsx)("li",{children:"✗ Classifica\xe7\xe3o e reconcilia\xe7\xe3o (requer Node.js + fs)"}),(0,a.jsxs)("li",{children:["✗ Persist\xeancia de ",(0,a.jsx)("code",{className:"font-mono bg-amber-100 px-1 rounded",children:"documents.json"})," / ",(0,a.jsx)("code",{className:"font-mono bg-amber-100 px-1 rounded",children:"transactions.json"})]}),(0,a.jsxs)("li",{children:["✗ Streaming SSE do pipeline (",(0,a.jsx)("code",{className:"font-mono bg-amber-100 px-1 rounded",children:"/api/ingest/process"}),")"]})]})]}),(0,a.jsxs)("div",{className:"border-t border-amber-200 pt-4 space-y-3",children:[(0,a.jsx)("p",{className:"text-xs font-semibold text-amber-900",children:"Para usar o pipeline real:"}),(0,a.jsxs)("div",{className:"bg-gray-900 text-green-400 text-xs font-mono rounded-lg p-3 space-y-1",children:[(0,a.jsx)("div",{children:"git clone https://github.com/contato22/awq"}),(0,a.jsx)("div",{children:"npm install"}),(0,a.jsxs)("div",{children:["npm run dev  ",(0,a.jsx)("span",{className:"text-gray-500",children:"# ingest\xe3o dispon\xedvel em localhost:3000"})]})]}),(0,a.jsx)("p",{className:"text-[11px] text-amber-600",children:"Para produ\xe7\xe3o persistente: migre para Vercel + Vercel Blob (storage externo). O filesystem do GitHub Pages \xe9 somente leitura e sem execu\xe7\xe3o server-side."})]})]}),(0,a.jsxs)("div",{className:"mt-6 flex gap-3",children:[(0,a.jsx)("a",{href:"../management",className:"text-xs px-4 py-2 bg-gray-100 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors font-medium",children:"→ Ver Gest\xe3o da Base"}),(0,a.jsx)("a",{href:"../data",className:"text-xs px-4 py-2 bg-gray-100 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors font-medium",children:"→ Base de Dados"})]})]})]})}s(58184),s(66706),s(74697),s(22023),s(74232),s(53225),s(29162),(0,s(78030).Z)("GitMerge",[["circle",{cx:"18",cy:"18",r:"3",key:"1xkwt0"}],["circle",{cx:"6",cy:"6",r:"3",key:"1lh9wr"}],["path",{d:"M6 21V9a9 9 0 0 0 9 9",key:"7kw0sc"}]]),s(30690),s(404),s(30338),s(62483),s(75733),i.Z,l.Z,l.Z,l.Z,c.Z,o.Z},76780:function(e,t,s){"use strict";s.d(t,{Z:function(){return a}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,s(78030).Z)("CircleAlert",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]])},13231:function(e,t,s){"use strict";s.d(t,{Z:function(){return a}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,s(78030).Z)("CircleCheck",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]])},40933:function(e,t,s){"use strict";s.d(t,{Z:function(){return a}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,s(78030).Z)("Clock",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["polyline",{points:"12 6 12 12 16 14",key:"68esgv"}]])},75733:function(e,t,s){"use strict";s.d(t,{Z:function(){return a}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,s(78030).Z)("Eye",[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]])},22023:function(e,t,s){"use strict";s.d(t,{Z:function(){return a}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,s(78030).Z)("FileText",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]])},404:function(e,t,s){"use strict";s.d(t,{Z:function(){return a}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,s(78030).Z)("Filter",[["polygon",{points:"22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3",key:"1yg77f"}]])},30690:function(e,t,s){"use strict";s.d(t,{Z:function(){return a}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,s(78030).Z)("Info",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 16v-4",key:"1dtifu"}],["path",{d:"M12 8h.01",key:"e9boi3"}]])},3274:function(e,t,s){"use strict";s.d(t,{Z:function(){return a}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,s(78030).Z)("LoaderCircle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]])},29162:function(e,t,s){"use strict";s.d(t,{Z:function(){return a}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,s(78030).Z)("TrendingDown",[["polyline",{points:"22 17 13.5 8.5 8.5 13.5 2 7",key:"1r2t7k"}],["polyline",{points:"16 17 22 17 22 11",key:"11uiuu"}]])},36127:function(e,t,s){"use strict";s.d(t,{Z:function(){return a}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,s(78030).Z)("TriangleAlert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]])},58184:function(e,t,s){"use strict";s.d(t,{Z:function(){return a}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,s(78030).Z)("Upload",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"17 8 12 3 7 8",key:"t8dd8p"}],["line",{x1:"12",x2:"12",y1:"3",y2:"15",key:"widbto"}]])}},function(e){e.O(0,[6388,1388,9989,2971,7023,1744],function(){return e(e.s=87923)}),_N_E=e.O()}]);