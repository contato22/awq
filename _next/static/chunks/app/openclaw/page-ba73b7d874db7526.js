(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[5455],{20096:function(e,t,r){Promise.resolve().then(r.bind(r,48871)),Promise.resolve().then(r.bind(r,14356))},14356:function(e,t,r){"use strict";r.d(t,{default:function(){return b}});var a=r(57437),s=r(2265),n=r(25489),l=r(47019),i=r(75733),o=r(23787),c=r(33907),d=r(68954),u=r(3274),x=r(52022),h=r(76780),y=r(60994),f=r(49590);let m="openclaw_api_key",p=["Quais clientes est\xe3o em maior risco de churn?","Por que a margem subiu para 67.4%?","Compare APAC vs Europe em receita","O que est\xe1 causando a queda de NPS do Analytics Suite?","Como atingir $6M de receita mensal?"];function g(e){let{onSave:t}=e,[r,c]=(0,s.useState)(""),[d,u]=(0,s.useState)(!1),x=()=>{let e=r.trim();e&&(localStorage.setItem(m,e),t(e))};return(0,a.jsxs)("div",{className:"flex flex-col items-center justify-center flex-1 px-8 py-10 text-center gap-5",children:[(0,a.jsx)("div",{className:"w-16 h-16 rounded-2xl bg-brand-600/10 border border-brand-500/20 flex items-center justify-center",children:(0,a.jsx)(n.Z,{size:26,className:"text-brand-600"})}),(0,a.jsxs)("div",{children:[(0,a.jsx)("h3",{className:"text-base font-semibold text-gray-400",children:"Configurar OpenClaw"}),(0,a.jsx)("p",{className:"text-sm text-gray-500 mt-1 max-w-xs leading-relaxed",children:"Insira sua chave da API Anthropic para ativar o assistente. A chave \xe9 salva localmente no seu navegador."})]}),(0,a.jsxs)("div",{className:"w-full max-w-sm relative",children:[(0,a.jsx)("input",{autoFocus:!0,type:d?"text":"password",value:r,onChange:e=>c(e.target.value),onKeyDown:e=>"Enter"===e.key&&x(),placeholder:"sk-ant-...",className:"w-full px-4 py-3 pr-10 bg-gray-100 border border-gray-300 rounded-xl text-sm text-gray-400 placeholder:text-gray-400 focus:outline-none focus:border-brand-500 transition-colors"}),(0,a.jsx)("button",{onClick:()=>u(e=>!e),className:"absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-400",children:d?(0,a.jsx)(l.Z,{size:16}):(0,a.jsx)(i.Z,{size:16})})]}),(0,a.jsx)("button",{onClick:x,disabled:!r.trim(),className:"w-full max-w-sm py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-gray-900 text-sm font-semibold rounded-xl transition-colors",children:"Salvar e ativar"}),(0,a.jsxs)("a",{href:"https://console.anthropic.com",target:"_blank",rel:"noopener noreferrer",className:"flex items-center gap-1 text-xs text-brand-600 hover:text-brand-500 transition-colors",children:["Obter chave no console.anthropic.com",(0,a.jsx)(o.Z,{size:12})]})]})}function b(){let[e,t]=(0,s.useState)(null),[r,l]=(0,s.useState)([]),[i,o]=(0,s.useState)(""),[b,v]=(0,s.useState)(!1),[k,j]=(0,s.useState)(null),w=(0,s.useRef)(null),N=(0,s.useRef)(null);(0,s.useEffect)(()=>{let e=localStorage.getItem(m);e&&t(e)},[]),(0,s.useEffect)(()=>{var e;null===(e=w.current)||void 0===e||e.scrollIntoView({behavior:"smooth"})},[r,b]);let Z=async a=>{let s=a.trim();if(!s||b||!e)return;let n=[...r,{role:"user",content:s}];l(n),o(""),v(!0),j(null),N.current&&(N.current.style.height="auto");try{let r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json","x-anthropic-key":e},body:JSON.stringify({messages:n,buContext:"jacqes"})});if(!r.ok){let e="HTTP ".concat(r.status);try{let a=await r.json();"API_KEY_REQUIRED"===a.error&&(t(null),localStorage.removeItem(m)),e=a.error||e}catch(e){}throw Error(e)}let a=r.body.getReader(),s=new TextDecoder,i="";for(l(e=>[...e,{role:"assistant",content:""}]);;){let{done:e,value:t}=await a.read();if(e)break;for(let e of s.decode(t,{stream:!0}).split("\n")){if(!e.startsWith("data: "))continue;let t=e.slice(6).trim();if("[DONE]"===t)break;let r=null;try{r=JSON.parse(t)}catch(e){}if(r){if(r.error)throw Error(r.error);r.text&&(i+=r.text,l(e=>{let t=[...e];return t[t.length-1]={role:"assistant",content:i},t}))}}}}catch(e){j(e instanceof Error?e.message:"Algo deu errado"),l(e=>{let t=e[e.length-1];return(null==t?void 0:t.role)!=="assistant"||t.content?e:e.slice(0,-1)})}finally{v(!1)}};return e?(0,a.jsxs)("div",{className:"flex flex-col h-full",children:[(0,a.jsxs)("div",{className:"flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0",children:[0===r.length&&(0,a.jsxs)("div",{className:"flex flex-col items-center justify-center h-full text-center pb-8",children:[(0,a.jsx)("div",{className:"w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center mb-4 shadow-lg",children:(0,a.jsx)(c.Z,{size:24,className:"text-gray-900"})}),(0,a.jsx)("h3",{className:"text-lg font-semibold text-gray-400 mb-1",children:"OpenClaw \xb7 JACQES"}),(0,a.jsx)("p",{className:"text-sm text-gray-500 mb-6 max-w-xs",children:"Assistente de intelig\xeancia de neg\xf3cios da JACQES. Pergunte qualquer coisa sobre clientes, receita, CS e opera\xe7\xf5es."}),(0,a.jsx)("div",{className:"space-y-2 w-full max-w-sm",children:p.map(e=>(0,a.jsx)("button",{onClick:()=>Z(e),className:"w-full text-left px-3 py-2.5 text-xs text-gray-400 bg-gray-100/60 hover:bg-gray-100 border border-gray-300/50 hover:border-gray-600 rounded-lg transition-colors",children:e},e))})]}),r.map((e,t)=>(0,a.jsxs)("div",{className:"flex gap-3 ".concat("user"===e.role?"justify-end":"justify-start"),children:["assistant"===e.role&&(0,a.jsx)("div",{className:"w-7 h-7 rounded-lg bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center shrink-0 mt-0.5",children:(0,a.jsx)(d.Z,{size:14,className:"text-gray-900"})}),(0,a.jsx)("div",{className:"max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ".concat("user"===e.role?"bg-brand-600 text-gray-900 rounded-br-sm":"bg-gray-100 text-gray-400 rounded-bl-sm border border-gray-300/50"),children:e.content||(0,a.jsxs)("span",{className:"flex items-center gap-1.5 text-gray-500",children:[(0,a.jsx)(u.Z,{size:12,className:"animate-spin"}),"Pensando..."]})}),"user"===e.role&&(0,a.jsx)("div",{className:"w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center shrink-0 mt-0.5",children:(0,a.jsx)(x.Z,{size:14,className:"text-gray-400"})})]},t)),k&&(0,a.jsxs)("div",{className:"flex items-start gap-2 px-3 py-2.5 bg-red-950/40 border border-red-800/50 rounded-xl text-xs text-red-600",children:[(0,a.jsx)(h.Z,{size:14,className:"shrink-0 mt-0.5"}),(0,a.jsx)("span",{children:k})]}),(0,a.jsx)("div",{ref:w})]}),(0,a.jsxs)("div",{className:"border-t border-gray-200 px-4 py-3",children:[(0,a.jsxs)("div",{className:"flex items-end gap-2 bg-gray-100 border border-gray-300 rounded-xl px-3 py-2 focus-within:border-brand-500 transition-colors",children:[(0,a.jsx)("textarea",{ref:N,value:i,onChange:e=>{o(e.target.value),e.target.style.height="auto",e.target.style.height="".concat(Math.min(e.target.scrollHeight,160),"px")},onKeyDown:e=>{"Enter"!==e.key||e.shiftKey||(e.preventDefault(),Z(i))},placeholder:"Pergunte sobre clientes, receita, CS ou opera\xe7\xf5es JACQES...",rows:1,className:"flex-1 bg-transparent text-sm text-gray-400 placeholder:text-gray-400 resize-none focus:outline-none min-h-[24px] max-h-40",disabled:b}),(0,a.jsx)("button",{onClick:()=>Z(i),disabled:!i.trim()||b,className:"w-8 h-8 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0",children:b?(0,a.jsx)(u.Z,{size:14,className:"text-gray-900 animate-spin"}):(0,a.jsx)(y.Z,{size:14,className:"text-gray-900"})})]}),(0,a.jsxs)("div",{className:"flex items-center justify-between mt-1.5",children:[(0,a.jsx)("p",{className:"text-[10px] text-gray-400",children:"Powered by Claude \xb7 JACQES \xb7 Mar 2026"}),(0,a.jsxs)("div",{className:"flex items-center gap-3",children:[r.length>0&&(0,a.jsxs)("button",{onClick:()=>{l([]),j(null)},className:"flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-400 transition-colors",title:"Nova conversa",children:[(0,a.jsx)(f.Z,{size:10}),"Nova conversa"]}),(0,a.jsxs)("button",{onClick:()=>{t(null),localStorage.removeItem(m),l([]),j(null)},className:"flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-500 transition-colors",title:"Trocar chave de API",children:[(0,a.jsx)(n.Z,{size:10}),"Trocar chave"]})]})]})]})]}):(0,a.jsx)("div",{className:"flex flex-col h-full",children:(0,a.jsx)(g,{onSave:t})})}},78030:function(e,t,r){"use strict";r.d(t,{Z:function(){return o}});var a=r(2265);/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),n=function(){for(var e=arguments.length,t=Array(e),r=0;r<e;r++)t[r]=arguments[r];return t.filter((e,t,r)=>!!e&&r.indexOf(e)===t).join(" ")};/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var l={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let i=(0,a.forwardRef)((e,t)=>{let{color:r="currentColor",size:s=24,strokeWidth:i=2,absoluteStrokeWidth:o,className:c="",children:d,iconNode:u,...x}=e;return(0,a.createElement)("svg",{ref:t,...l,width:s,height:s,stroke:r,strokeWidth:o?24*Number(i)/Number(s):i,className:n("lucide",c),...x},[...u.map(e=>{let[t,r]=e;return(0,a.createElement)(t,r)}),...Array.isArray(d)?d:[d]])}),o=(e,t)=>{let r=(0,a.forwardRef)((r,l)=>{let{className:o,...c}=r;return(0,a.createElement)(i,{ref:l,iconNode:t,className:n("lucide-".concat(s(e)),o),...c})});return r.displayName="".concat(e),r}},6600:function(e,t,r){"use strict";r.d(t,{Z:function(){return a}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,r(78030).Z)("Bell",[["path",{d:"M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9",key:"1qo2s2"}],["path",{d:"M10.3 21a1.94 1.94 0 0 0 3.4 0",key:"qgo35s"}]])},68954:function(e,t,r){"use strict";r.d(t,{Z:function(){return a}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,r(78030).Z)("Bot",[["path",{d:"M12 8V4H8",key:"hb8ula"}],["rect",{width:"16",height:"12",x:"4",y:"8",rx:"2",key:"enze0r"}],["path",{d:"M2 14h2",key:"vft8re"}],["path",{d:"M20 14h2",key:"4cs60a"}],["path",{d:"M15 13v2",key:"1xurst"}],["path",{d:"M9 13v2",key:"rq6x2g"}]])},76780:function(e,t,r){"use strict";r.d(t,{Z:function(){return a}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,r(78030).Z)("CircleAlert",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]])},23787:function(e,t,r){"use strict";r.d(t,{Z:function(){return a}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,r(78030).Z)("ExternalLink",[["path",{d:"M15 3h6v6",key:"1q9fwt"}],["path",{d:"M10 14 21 3",key:"gplh6r"}],["path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",key:"a6xqqp"}]])},47019:function(e,t,r){"use strict";r.d(t,{Z:function(){return a}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,r(78030).Z)("EyeOff",[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]])},75733:function(e,t,r){"use strict";r.d(t,{Z:function(){return a}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,r(78030).Z)("Eye",[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]])},25489:function(e,t,r){"use strict";r.d(t,{Z:function(){return a}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,r(78030).Z)("Key",[["path",{d:"m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4",key:"g0fldk"}],["path",{d:"m21 2-9.6 9.6",key:"1j0ho8"}],["circle",{cx:"7.5",cy:"15.5",r:"5.5",key:"yqb3hr"}]])},3274:function(e,t,r){"use strict";r.d(t,{Z:function(){return a}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,r(78030).Z)("LoaderCircle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]])},66706:function(e,t,r){"use strict";r.d(t,{Z:function(){return a}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,r(78030).Z)("RefreshCw",[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]])},49590:function(e,t,r){"use strict";r.d(t,{Z:function(){return a}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,r(78030).Z)("RotateCcw",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]])},54817:function(e,t,r){"use strict";r.d(t,{Z:function(){return a}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,r(78030).Z)("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]])},60994:function(e,t,r){"use strict";r.d(t,{Z:function(){return a}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,r(78030).Z)("Send",[["path",{d:"m22 2-7 20-4-9-9-4Z",key:"1q3vgg"}],["path",{d:"M22 2 11 13",key:"nzbqef"}]])},33907:function(e,t,r){"use strict";r.d(t,{Z:function(){return a}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,r(78030).Z)("Sparkles",[["path",{d:"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",key:"4pj2yx"}],["path",{d:"M20 3v4",key:"1olli1"}],["path",{d:"M22 5h-4",key:"1gvqau"}],["path",{d:"M4 17v2",key:"vumght"}],["path",{d:"M5 18H3",key:"zchphs"}]])},52022:function(e,t,r){"use strict";r.d(t,{Z:function(){return a}});/**
 * @license lucide-react v0.435.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,r(78030).Z)("User",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]])}},function(e){e.O(0,[8871,2971,7023,1744],function(){return e(e.s=20096)}),_N_E=e.O()}]);