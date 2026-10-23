const t=c=>Number(c.toFixed(3));function m(c,i,n,e){const o=(i-2)*e,r=(n-2)*e,s=c.map(l=>"M"+l.map(([E,d])=>`${t((E-1)*e)} ${t(r-(d-1)*e)}`).join("L")+"Z").join("");return`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${t(o)}mm" height="${t(r)}mm" viewBox="0 0 ${t(o)} ${t(r)}">
<path fill="#172027" fill-rule="evenodd" d="${s}"/>
</svg>
`}function u(c,i){const n=["0","SECTION","2","HEADER","9","$ACADVER","1","AC1009","0","ENDSEC","0","SECTION","2","ENTITIES"];for(const e of c){n.push("0","POLYLINE","8","0","66","1","70","1","10","0","20","0","30","0");for(const[o,r]of e)n.push("0","VERTEX","8","0","10",String(t((o-1)*i)),"20",String(t((r-1)*i)),"30","0");n.push("0","SEQEND","8","0")}return n.push("0","ENDSEC","0","EOF"),n.join(`
`)+`
`}function a(c,i,n){const e=URL.createObjectURL(new Blob([i],{type:n})),o=document.createElement("a");o.href=e,o.download=c,document.body.appendChild(o),o.click(),o.remove(),setTimeout(()=>URL.revokeObjectURL(e),1e3)}export{u as a,a as d,m as l};
