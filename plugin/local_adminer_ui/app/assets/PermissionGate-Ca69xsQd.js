import{i as d,j as r,s as i,e as c}from"./index-BbFbaPq4.js";/**
 * @license lucide-react v1.33.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]],b=d("chevron-down",m);/**
 * @license lucide-react v1.33.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u=[["path",{d:"M10 11v6",key:"nco0om"}],["path",{d:"M14 11v6",key:"outv1u"}],["path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",key:"miytrc"}],["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",key:"e791ji"}]],p=d("trash-2",u),y=({className:a,variant:n="default",children:t,...s})=>{const e={default:"bg-primary/10 text-primary border-primary/20",secondary:"bg-secondary text-secondary-foreground border-transparent",destructive:"bg-destructive/10 text-destructive border-destructive/20",outline:"text-foreground border-border",success:"bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",warning:"bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",info:"bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"};return r.jsx("span",{className:i("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors",e[n],a),...s,children:t})},g=({capability:a,permission:n,children:t,fallback:s=null})=>{const{permissions:e}=c();if(!e)return s;if(e.is_siteadmin===1)return r.jsx(r.Fragment,{children:t});const o=a||n;return o&&e[o]===1?r.jsx(r.Fragment,{children:t}):s};export{y as B,b as C,g as P,p as T};
