(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[983],{87923:function(e,t,r){Promise.resolve().then(r.bind(r,78783))},78783:function(e,t,r){"use strict";r.r(t),r.d(t,{default:function(){return h}});var n=r(57437),a=r(2265),s=r(48871),i=r(40933),o=r(3274),c=r(13231),l=r(76780),d=r(36127),u=r(78030);function h(){var e;let[t,r]=(0,a.useState)([]),[i,o]=(0,a.useState)([]),[c,l]=(0,a.useState)(null),[u,h]=(0,a.useState)(!1),[p,y]=(0,a.useState)(!0),[f,m]=(0,a.useState)(!1),[x,k]=(0,a.useState)(null),[b,g]=(0,a.useState)("Cora"),[v,Z]=(0,a.useState)(""),[j,M]=(0,a.useState)("Unknown"),[w,N]=(0,a.useState)(!1),[C,S]=(0,a.useState)(null),[q,E]=(0,a.useState)(null),[A,H]=(0,a.useState)([]),[P,z]=(0,a.useState)("all"),[F,I]=(0,a.useState)(!1),[R,V]=(0,a.useState)(!1),B=((0,a.useRef)(null),(0,a.useRef)(null)),L=(0,a.useCallback)(async()=>{y(!0);try{let t=await fetch("/api/ingest/documents");if(t.ok){var e;let n=await t.json();r(null!==(e=n.documents)&&void 0!==e?e:[])}}catch(e){}y(!1)},[]);(0,a.useEffect)(()=>{L()},[L]);let U=(0,a.useCallback)(async e=>{m(!0);try{let r=await fetch("/api/ingest/transactions?documentId=".concat(e));if(r.ok){var t;let e=await r.json();o(null!==(t=e.transactions)&&void 0!==t?t:[])}}catch(e){}m(!1)},[]);return(0,a.useEffect)(()=>{c&&U(c)},[c,U]),(0,a.useEffect)(()=>{var e;null===(e=B.current)||void 0===e||e.scrollIntoView({behavior:"smooth"})},[A]),t.find(e=>e.id===c),i.filter(e=>("all"===P||e.entity===P)&&(!!F||!e.isIntercompany)&&(!R||"ambiguous"===e.classificationConfidence)),i.filter(e=>!e.excludedFromConsolidated&&"credit"===e.direction).reduce((e,t)=>e+Math.abs(t.amount),0),i.filter(e=>!e.excludedFromConsolidated&&"debit"===e.direction).reduce((e,t)=>e+Math.abs(t.amount),0),i.filter(e=>e.isIntercompany).length,i.filter(e=>"ambiguous"===e.classificationConfidence).length,(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(s.default,{title:"Ingest\xe3o Financeira",subtitle:"Upload de extratos PDF \xb7 Extra\xe7\xe3o \xb7 Classifica\xe7\xe3o \xb7 Reconcilia\xe7\xe3o"}),(0,n.jsxs)("div",{className:"px-8 py-10 max-w-2xl",children:[(0,n.jsxs)("div",{className:"rounded-xl border-2 border-amber-200 bg-amber-50 p-6 space-y-4",children:[(0,n.jsxs)("div",{className:"flex items-start gap-3",children:[(0,n.jsx)(d.Z,{size:20,className:"text-amber-600 shrink-0 mt-0.5"}),(0,n.jsxs)("div",{children:[(0,n.jsx)("h2",{className:"text-sm font-bold text-amber-900",children:"Pipeline de ingest\xe3o n\xe3o dispon\xedvel neste ambiente"}),(0,n.jsx)("p",{className:"text-xs text-amber-700 mt-1 leading-relaxed",children:"Este site est\xe1 publicado como exporta\xe7\xe3o est\xe1tica (GitHub Pages). Ambientes est\xe1ticos n\xe3o suportam execu\xe7\xe3o de servidor, grava\xe7\xe3o em sistema de arquivos ou chamadas \xe0 API Claude — todas opera\xe7\xf5es obrigat\xf3rias para o pipeline de ingest\xe3o banc\xe1ria."})]})]}),(0,n.jsxs)("div",{className:"border-t border-amber-200 pt-4 space-y-3",children:[(0,n.jsx)("p",{className:"text-xs font-semibold text-amber-900",children:"O que n\xe3o est\xe1 dispon\xedvel aqui:"}),(0,n.jsxs)("ul",{className:"text-xs text-amber-700 space-y-1 ml-3",children:[(0,n.jsx)("li",{children:"✗ Upload de PDF de extrato banc\xe1rio"}),(0,n.jsx)("li",{children:"✗ Extra\xe7\xe3o de transa\xe7\xf5es (Claude API — requer servidor)"}),(0,n.jsx)("li",{children:"✗ Classifica\xe7\xe3o e reconcilia\xe7\xe3o (requer Node.js + fs)"}),(0,n.jsxs)("li",{children:["✗ Persist\xeancia de ",(0,n.jsx)("code",{className:"font-mono bg-amber-100 px-1 rounded",children:"documents.json"})," / ",(0,n.jsx)("code",{className:"font-mono bg-amber-100 px-1 rounded",children:"transactions.json"})]}),(0,n.jsxs)("li",{children:["✗ Streaming SSE do pipeline (",(0,n.jsx)("code",{className:"font-mono bg-amber-100 px-1 rounded",children:"/api/ingest/process"}),")"]})]})]}),(0,n.jsxs)("div",{className:"border-t border-amber-200 pt-4 space-y-3",children:[(0,n.jsx)("p",{className:"text-xs font-semibold text-amber-900",children:"Para usar o pipeline real:"}),(0,n.jsxs)("div",{className:"bg-gray-900 text-green-400 text-xs font-mono rounded-lg p-3 space-y-1",children:[(0,n.jsx)("div",{children:"git clone https://github.com/contato22/awq"}),(0,n.jsx)("div",{children:"npm install"}),(0,n.jsxs)("div",{children:["npm run dev  ",(0,n.jsx)("span",{className:"text-gray-500",children:"# ingest\xe3o dispon\xedvel em localhost:3000"})]})]}),(0,n.jsx)("p",{className:"text-[11px] text-amber-600",children:"Para produ\xe7\xe3o persistente: migre para Vercel + Vercel Blob (storage externo). O filesystem do GitHub Pages \xe9 somente leitura e sem execu\xe7\xe3o server-side."})]})]}),(0,n.jsxs)("div",{className:"mt-6 flex gap-3",children:[(0,n.jsx)("a",{href:"../management",className:"text-xs px-4 py-2 bg-gray-100 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors font-medium",children:"→ Ver Gest\xe3o da Base"}),(0,n.jsx)("a",{href:"../data",className:"text-xs px-4 py-2 bg-gray-100 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors font-medium",children:"→ Base de Dados"})]})]})]})}(0,u.Z)("Upload",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"17 8 12 3 7 8",key:"t8dd8p"}],["line",{x1:"12",x2:"12",y1:"3",y2:"15",key:"widbto"}]]),r(66706),r(74697),r(22023),r(74232),r(53225),r(29162),(0,u.Z)("GitMerge",[["circle",{cx:"18",cy:"18",r:"3",key:"1xkwt0"}],["circle",{cx:"6",cy:"6",r:"3",key:"1lh9wr"}],["path",{d:"M6 21V9a9 9 0 0 0 9 9",key:"7kw0sc"}]]),r(30690),r(404),r(30338),r(62483),r(75733),i.Z,o.Z,o.Z,o.Z,c.Z,l.Z},78030:function(e,t,r){"use strict";r.d(t,{Z:function(){return c}});var n=r(2265);/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),s=function(){for(var e=arguments.length,t=Array(e),r=0;r<e;r++)t[r]=arguments[r];return t.filter((e,t,r)=>!!e&&r.indexOf(e)===t).join(" ")};/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var i={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let o=(0,n.forwardRef)((e,t)=>{let{color:r="currentColor",size:a=24,strokeWidth:o=2,absoluteStrokeWidth:c,className:l="",children:d,iconNode:u,...h}=e;return(0,n.createElement)("svg",{ref:t,...i,width:a,height:a,stroke:r,strokeWidth:c?24*Number(o)/Number(a):o,className:s("lucide",l),...h},[...u.map(e=>{let[t,r]=e;return(0,n.createElement)(t,r)}),...Array.isArray(d)?d:[d]])}),c=(e,t)=>{let r=(0,n.forwardRef)((r,i)=>{let{className:c,...l}=r;return(0,n.createElement)(o,{ref:i,iconNode:t,className:s("lucide-".concat(a(e)),c),...l})});return r.displayName="".concat(e),r}},62483:function(e,t,r){"use strict";r.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,r(78030).Z)("ArrowDownRight",[["path",{d:"m7 7 10 10",key:"1fmybs"}],["path",{d:"M17 7v10H7",key:"6fjiku"}]])},30338:function(e,t,r){"use strict";r.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,r(78030).Z)("ArrowUpRight",[["path",{d:"M7 7h10v10",key:"1tivn9"}],["path",{d:"M7 17 17 7",key:"1vkiza"}]])},6600:function(e,t,r){"use strict";r.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,r(78030).Z)("Bell",[["path",{d:"M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9",key:"1qo2s2"}],["path",{d:"M10.3 21a1.94 1.94 0 0 0 3.4 0",key:"qgo35s"}]])},74232:function(e,t,r){"use strict";r.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,r(78030).Z)("Building2",[["path",{d:"M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z",key:"1b4qmf"}],["path",{d:"M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2",key:"i71pzd"}],["path",{d:"M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2",key:"10jefs"}],["path",{d:"M10 6h4",key:"1itunk"}],["path",{d:"M10 10h4",key:"tcdvrf"}],["path",{d:"M10 14h4",key:"kelpxr"}],["path",{d:"M10 18h4",key:"1ulq68"}]])},76780:function(e,t,r){"use strict";r.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,r(78030).Z)("CircleAlert",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]])},13231:function(e,t,r){"use strict";r.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,r(78030).Z)("CircleCheck",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]])},40933:function(e,t,r){"use strict";r.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,r(78030).Z)("Clock",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["polyline",{points:"12 6 12 12 16 14",key:"68esgv"}]])},75733:function(e,t,r){"use strict";r.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,r(78030).Z)("Eye",[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]])},22023:function(e,t,r){"use strict";r.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,r(78030).Z)("FileText",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]])},404:function(e,t,r){"use strict";r.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,r(78030).Z)("Filter",[["polygon",{points:"22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3",key:"1yg77f"}]])},30690:function(e,t,r){"use strict";r.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,r(78030).Z)("Info",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 16v-4",key:"1dtifu"}],["path",{d:"M12 8h.01",key:"e9boi3"}]])},3274:function(e,t,r){"use strict";r.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,r(78030).Z)("LoaderCircle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]])},66706:function(e,t,r){"use strict";r.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,r(78030).Z)("RefreshCw",[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]])},54817:function(e,t,r){"use strict";r.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,r(78030).Z)("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]])},29162:function(e,t,r){"use strict";r.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,r(78030).Z)("TrendingDown",[["polyline",{points:"22 17 13.5 8.5 8.5 13.5 2 7",key:"1r2t7k"}],["polyline",{points:"16 17 22 17 22 11",key:"11uiuu"}]])},53225:function(e,t,r){"use strict";r.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,r(78030).Z)("TrendingUp",[["polyline",{points:"22 7 13.5 15.5 8.5 10.5 2 17",key:"126l90"}],["polyline",{points:"16 7 22 7 22 13",key:"kwv8wd"}]])},36127:function(e,t,r){"use strict";r.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,r(78030).Z)("TriangleAlert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]])},74697:function(e,t,r){"use strict";r.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,r(78030).Z)("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]])}},function(e){e.O(0,[8871,2971,7023,1744],function(){return e(e.s=87923)}),_N_E=e.O()}]);