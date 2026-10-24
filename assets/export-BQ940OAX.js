const a=o=>Number(o.toFixed(3));function g(o,c,n,t){const e=(c-2)*t,i=(n-2)*t,s=o.map(r=>"M"+r.map(([d,l])=>`${a((d-1)*t)} ${a(i-(l-1)*t)}`).join("L")+"Z").join("");return`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${a(e)}mm" height="${a(i)}mm" viewBox="0 0 ${a(e)} ${a(i)}">
<path fill="#172027" fill-rule="evenodd" d="${s}"/>
</svg>
`}function u(o,c){const n=["0","SECTION","2","HEADER","9","$ACADVER","1","AC1009","0","ENDSEC","0","SECTION","2","ENTITIES"];for(const t of o){n.push("0","POLYLINE","8","0","66","1","70","1","10","0","20","0","30","0");for(const[e,i]of t)n.push("0","VERTEX","8","0","10",String(a((e-1)*c)),"20",String(a((i-1)*c)),"30","0");n.push("0","SEQEND","8","0")}return n.push("0","ENDSEC","0","EOF"),n.join(`
`)+`
`}function m(o,c,n){const t=URL.createObjectURL(new Blob([c],{type:n})),e=document.createElement("a");e.href=t,e.download=o,document.body.appendChild(e),e.click(),e.remove(),setTimeout(()=>URL.revokeObjectURL(t),1e3)}const h=o=>`<?xml version="1.0" encoding="UTF-8"?>
${new XMLSerializer().serializeToString(o)}
`;function E(o,c,n,t,e=3){const i=new Image,s=URL.createObjectURL(new Blob([c],{type:"image/svg+xml"}));i.onload=()=>{const r=document.createElement("canvas");r.width=Math.round(n*e),r.height=Math.round(t*e),r.getContext("2d").drawImage(i,0,0,r.width,r.height),URL.revokeObjectURL(s),r.toBlob(d=>d&&m(o,d,"image/png"),"image/png")},i.src=s}export{u as a,E as b,m as d,g as l,h as s};
