(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[983],{87923:function(e,t,s){Promise.resolve().then(s.bind(s,76667))},76667:function(e,t,s){"use strict";s.r(t),s.d(t,{default:function(){return u}});var n=s(57437),a=s(2265),r=s(10482),i=s(40933),o=s(3274),l=s(13231),c=s(76780),d=s(36127);function u(){var e;let[t,s]=(0,a.useState)([]),[i,o]=(0,a.useState)([]),[l,c]=(0,a.useState)(null),[u,m]=(0,a.useState)(!1),[p,x]=(0,a.useState)(!0),[f,h]=(0,a.useState)(!1),[b,y]=(0,a.useState)(null),[g,v]=(0,a.useState)("Cora"),[j,k]=(0,a.useState)(""),[Z,N]=(0,a.useState)("Unknown"),[S,w]=(0,a.useState)(!1),[C,E]=(0,a.useState)(null),[M,P]=(0,a.useState)(null),[I,q]=(0,a.useState)([]),[A,F]=(0,a.useState)("all"),[_,z]=(0,a.useState)(!1),[D,R]=(0,a.useState)(!1),U=((0,a.useRef)(null),(0,a.useRef)(null)),O=(0,a.useCallback)(async()=>{x(!0);try{let t=await fetch("/api/ingest/documents");if(t.ok){var e;let n=await t.json();s(null!==(e=n.documents)&&void 0!==e?e:[])}}catch(e){}x(!1)},[]);(0,a.useEffect)(()=>{O()},[O]);let V=(0,a.useCallback)(async e=>{h(!0);try{let s=await fetch("/api/ingest/transactions?documentId=".concat(e));if(s.ok){var t;let e=await s.json();o(null!==(t=e.transactions)&&void 0!==t?t:[])}}catch(e){}h(!1)},[]);return(0,a.useEffect)(()=>{l&&V(l)},[l,V]),(0,a.useEffect)(()=>{var e;null===(e=U.current)||void 0===e||e.scrollIntoView({behavior:"smooth"})},[I]),t.find(e=>e.id===l),i.filter(e=>("all"===A||e.entity===A)&&(!!_||!e.isIntercompany)&&(!D||"ambiguous"===e.classificationConfidence)),i.filter(e=>!e.excludedFromConsolidated&&"credit"===e.direction).reduce((e,t)=>e+Math.abs(t.amount),0),i.filter(e=>!e.excludedFromConsolidated&&"debit"===e.direction).reduce((e,t)=>e+Math.abs(t.amount),0),i.filter(e=>e.isIntercompany).length,i.filter(e=>"ambiguous"===e.classificationConfidence).length,(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(r.default,{title:"Ingest\xe3o Financeira",subtitle:"Upload de extratos PDF \xb7 Extra\xe7\xe3o \xb7 Classifica\xe7\xe3o \xb7 Reconcilia\xe7\xe3o"}),(0,n.jsxs)("div",{className:"px-8 py-10 max-w-2xl",children:[(0,n.jsxs)("div",{className:"rounded-xl border-2 border-amber-200 bg-amber-50 p-6 space-y-4",children:[(0,n.jsxs)("div",{className:"flex items-start gap-3",children:[(0,n.jsx)(d.Z,{size:20,className:"text-amber-600 shrink-0 mt-0.5"}),(0,n.jsxs)("div",{children:[(0,n.jsx)("h2",{className:"text-sm font-bold text-amber-900",children:"Pipeline de ingest\xe3o n\xe3o dispon\xedvel neste ambiente"}),(0,n.jsx)("p",{className:"text-xs text-amber-700 mt-1 leading-relaxed",children:"Este site est\xe1 publicado como exporta\xe7\xe3o est\xe1tica (GitHub Pages). Ambientes est\xe1ticos n\xe3o suportam execu\xe7\xe3o de servidor, grava\xe7\xe3o em sistema de arquivos ou chamadas \xe0 API Claude — todas opera\xe7\xf5es obrigat\xf3rias para o pipeline de ingest\xe3o banc\xe1ria."})]})]}),(0,n.jsxs)("div",{className:"border-t border-amber-200 pt-4 space-y-3",children:[(0,n.jsx)("p",{className:"text-xs font-semibold text-amber-900",children:"O que n\xe3o est\xe1 dispon\xedvel aqui:"}),(0,n.jsxs)("ul",{className:"text-xs text-amber-700 space-y-1 ml-3",children:[(0,n.jsx)("li",{children:"✗ Upload de PDF de extrato banc\xe1rio"}),(0,n.jsx)("li",{children:"✗ Extra\xe7\xe3o de transa\xe7\xf5es (Claude API — requer servidor)"}),(0,n.jsx)("li",{children:"✗ Classifica\xe7\xe3o e reconcilia\xe7\xe3o (requer Node.js + fs)"}),(0,n.jsxs)("li",{children:["✗ Persist\xeancia de ",(0,n.jsx)("code",{className:"font-mono bg-amber-100 px-1 rounded",children:"documents.json"})," / ",(0,n.jsx)("code",{className:"font-mono bg-amber-100 px-1 rounded",children:"transactions.json"})]}),(0,n.jsxs)("li",{children:["✗ Streaming SSE do pipeline (",(0,n.jsx)("code",{className:"font-mono bg-amber-100 px-1 rounded",children:"/api/ingest/process"}),")"]})]})]}),(0,n.jsxs)("div",{className:"border-t border-amber-200 pt-4 space-y-3",children:[(0,n.jsx)("p",{className:"text-xs font-semibold text-amber-900",children:"Para usar o pipeline real:"}),(0,n.jsxs)("div",{className:"bg-gray-900 text-green-400 text-xs font-mono rounded-lg p-3 space-y-1",children:[(0,n.jsx)("div",{children:"git clone https://github.com/contato22/awq"}),(0,n.jsx)("div",{children:"npm install"}),(0,n.jsxs)("div",{children:["npm run dev  ",(0,n.jsx)("span",{className:"text-gray-500",children:"# ingest\xe3o dispon\xedvel em localhost:3000"})]})]}),(0,n.jsx)("p",{className:"text-[11px] text-amber-600",children:"Para produ\xe7\xe3o persistente: migre para Vercel + Vercel Blob (storage externo). O filesystem do GitHub Pages \xe9 somente leitura e sem execu\xe7\xe3o server-side."})]})]}),(0,n.jsxs)("div",{className:"mt-6 flex gap-3",children:[(0,n.jsx)("a",{href:"../management",className:"text-xs px-4 py-2 bg-gray-100 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors font-medium",children:"→ Ver Gest\xe3o da Base"}),(0,n.jsx)("a",{href:"../data",className:"text-xs px-4 py-2 bg-gray-100 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors font-medium",children:"→ Base de Dados"})]})]})]})}s(58184),s(66706),s(74697),s(22023),s(74232),s(53225),s(29162),s(17673),s(30690),s(404),s(30338),s(62483),s(75733),i.Z,o.Z,o.Z,o.Z,l.Z,c.Z},62483:function(e,t,s){"use strict";s.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,s(78030).Z)("ArrowDownRight",[["path",{d:"m7 7 10 10",key:"1fmybs"}],["path",{d:"M17 7v10H7",key:"6fjiku"}]])},30338:function(e,t,s){"use strict";s.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,s(78030).Z)("ArrowUpRight",[["path",{d:"M7 7h10v10",key:"1tivn9"}],["path",{d:"M7 17 17 7",key:"1vkiza"}]])},40933:function(e,t,s){"use strict";s.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,s(78030).Z)("Clock",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["polyline",{points:"12 6 12 12 16 14",key:"68esgv"}]])},75733:function(e,t,s){"use strict";s.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,s(78030).Z)("Eye",[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]])},404:function(e,t,s){"use strict";s.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,s(78030).Z)("Filter",[["polygon",{points:"22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3",key:"1yg77f"}]])},30690:function(e,t,s){"use strict";s.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,s(78030).Z)("Info",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 16v-4",key:"1dtifu"}],["path",{d:"M12 8h.01",key:"e9boi3"}]])},3274:function(e,t,s){"use strict";s.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,s(78030).Z)("LoaderCircle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]])},29162:function(e,t,s){"use strict";s.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,s(78030).Z)("TrendingDown",[["polyline",{points:"22 17 13.5 8.5 8.5 13.5 2 7",key:"1r2t7k"}],["polyline",{points:"16 17 22 17 22 11",key:"11uiuu"}]])},53225:function(e,t,s){"use strict";s.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,s(78030).Z)("TrendingUp",[["polyline",{points:"22 7 13.5 15.5 8.5 10.5 2 17",key:"126l90"}],["polyline",{points:"16 7 22 7 22 13",key:"kwv8wd"}]])},36127:function(e,t,s){"use strict";s.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,s(78030).Z)("TriangleAlert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]])}},function(e){e.O(0,[6388,1388,4279,2971,7023,1744],function(){return e(e.s=87923)}),_N_E=e.O()}]);