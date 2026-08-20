import{d as E,a as b,b as F,f as O,l as f,s as a}from"../chunks/BIh1fz_L.js";import{p as T,o as U,t as D,a as G,s as o,c as e,b as s,r as t,g as j,d as y}from"../chunks/CDTwUiG9.js";import{p as r}from"../chunks/_p40DKcu.js";var M=O('<div class="error-page svelte-1j96wlh"><div class="error-container svelte-1j96wlh"><div class="icon svelte-1j96wlh">⚠️</div> <h1 class="svelte-1j96wlh">Something went wrong</h1> <p class="status svelte-1j96wlh"> </p> <p class="message svelte-1j96wlh"> </p> <div class="actions svelte-1j96wlh"><button class="primary-btn svelte-1j96wlh">Reload App</button> <button class="secondary-btn svelte-1j96wlh"> </button></div> <details class="svelte-1j96wlh"><summary class="svelte-1j96wlh">Technical Details</summary> <pre class="svelte-1j96wlh"> </pre></details></div></div>');function q(_,x){T(x,!0);let l=y(!1),i=y("");U(()=>{try{o(i,f.getRecentLogs(),!0)}catch{o(i,"Failed to retrieve logs.")}});async function L(){const u=`
ERROR: ${r.status} 
MESSAGE: ${r.error?.message||"Unknown error"}
URL: ${r.url.href}
UA: ${navigator.userAgent}
----------------------------------------
LOGS:
${j(i)}
`;try{await navigator.clipboard.writeText(u),o(l,!0),setTimeout(()=>o(l,!1),2e3)}catch(C){f.error("debug","Failed to copy logs:",C),alert("Failed to copy logs to clipboard. Check console.")}}function R(){window.location.reload()}var c=M(),g=e(c),n=s(e(g),4),S=e(n);t(n);var v=s(n,2),$=e(v,!0);t(v);var d=s(v,2),h=e(d),p=s(h,2),k=e(p,!0);t(p),t(d);var m=s(d,2),w=s(e(m),2),A=e(w,!0);t(w),t(m),t(g),t(c),D(u=>{a(S,`Error ${r.status??""}`),a($,r.error?.message||"An unexpected error occurred."),a(k,j(l)?"Logs Copied! ✅":"Copy Debug Logs 📋"),a(A,u)},[()=>JSON.stringify(r.error,null,2)]),b("click",h,R),b("click",p,L),F(_,c),G()}E(["click"]);export{q as component};
