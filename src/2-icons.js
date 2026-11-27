const S=(vb,inner,extra='')=>`<svg viewBox="${vb}" ${extra}>${inner}</svg>`;
const stroke='fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
// ---------- icons ----------
const I={
  sleep:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  stress:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  alcohol:'<path d="M8 3h8l-1 7a3 3 0 0 1-6 0zM12 13v7M8 21h8"/>',
  spicy:'<path d="M14 6c4 1 6 5 4 10s-9 6-12 3c4 0 7-3 7-8 0-2 0-4 1-5zM14 6c0-2 1-3 3-3"/>',
  othertag:'<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  food:'<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 1-3 4-3 8h3v10"/>',
  dairy:'<path d="M8 2h8M9 2v3l-2 4v13h10V9l-2-4V2M7 13h10"/>',
  coffee:'<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 10h1a3 3 0 0 1 0 6h-1M8 2v3M12 2v3"/>',
  travel:'<path d="M2 16l20-8-3-2-7 3-6-4-2 1 4 5-4 2-2-1-1 1 3 3z"/>',
  sport:'<circle cx="14" cy="4" r="2"/><path d="M6 21l4-6 3 2 1 4M10 15l1-6-4 1-2 3M11 9l4 1 2 3 3 1"/>',
  hospital:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 7v10M7 12h10"/>',
  scope:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>',
  pill:'<rect x="2" y="8" width="20" height="8" rx="4"/><path d="M12 8v8"/>',
  flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  drop:'<path d="M12 3s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12z"/>',
  toilet:'<path d="M6 3h5v8H6zM4 11h16a8 8 0 0 1-8 8h-1l1 2H8l1-3a8 8 0 0 1-5-7z"/>',
  moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  check:'<path d="M5 12l5 5 9-10"/>',
  joint:'<path d="M9 2v7a3 3 0 0 0 0 6v7M15 2v7a3 3 0 0 1 0 6v7"/><circle cx="12" cy="12" r="2"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  skin:'<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="9" cy="9" r="1.5"/><circle cx="15" cy="13" r="2"/><circle cx="9" cy="16" r="1"/>',
  mouth:'<path d="M3 12c3-4 15-4 18 0-3 5-15 5-18 0z"/><circle cx="14" cy="13" r="1.3"/>',
  phone:'<path d="M5 3h4l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
  cal:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  q:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 1-1 1.7M12 17h.01"/>',
  lowmood:'<path d="M7 15a4 4 0 0 1 .5-8A5.5 5.5 0 0 1 18 8a3.5 3.5 0 0 1 0 7z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>',
  anxious:'<circle cx="12" cy="12" r="9"/><path d="M8 16c1-1 2 1 3 0s2 1 3 0 2 1 2 0M9 10h.01M15 10h.01"/>',
  ill:'<path d="M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0z"/><path d="M12 9v7"/>',
  nsaid:'<circle cx="12" cy="12" r="8"/><path d="M6.5 17.5l11-11"/>',
  steroid:'<path d="M12 2l2.5 6.5L21 9l-5 4.5L17.5 21 12 17l-5.5 4L8 13.5 3 9l6.5-.5z"/>'
};
const ico=(k,size='')=>S('0 0 24 24',I[k],`${stroke} ${size}`);

// Blood drops: empty with slash, streak, half, full
const dropPath='M20 4s12 13 12 21a12 12 0 0 1-24 0C8 17 20 4 20 4z';
const bloodIco=(n)=>{const id='bg'+n;const fill=[0,0,.5,1][n];
  let s=`<defs><linearGradient id="${id}" x1="0" y1="1" x2="0" y2="0"><stop offset="${fill}" stop-color="var(--blood)"/><stop offset="${fill}" stop-color="var(--blood)" stop-opacity="0"/></linearGradient></defs>`;
  s+=`<path d="${dropPath}" fill="url(#${id})" stroke="var(--blood)" stroke-width="2.5"/>`;
  if(n===0)s+=`<path d="M10 34L30 10" stroke="var(--muted)" stroke-width="2.5" stroke-linecap="round"/>`;
  if(n===1)s+=`<path d="M16 22v8M21 20v10M25 24v5" stroke="var(--blood)" stroke-width="2.5" stroke-linecap="round"/>`;
  return S('0 0 40 40',s)};
// Urgency: chevrons
const urgIco=n=>{if(n===0)return S('0 0 40 40','<path d="M8 22c4-5 8-5 12 0s8 5 12 0" fill="none" stroke="var(--ok)" stroke-width="3" stroke-linecap="round"/>');
  const c=SC[n];let s='';for(let i=0;i<n;i++){const x=8+i*9+(3-n)*4.5;s+=`<path d="M${x} 10l9 10-9 10" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`}
  if(n===3)s=`<circle cx="20" cy="20" r="15" fill="${c}"/><path d="M20 11v11" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="20" cy="28.5" r="2.4" fill="#fff"/>`;
  return S('0 0 40 40',s)};
// Bristol stool scale drawings
const BR=[
 '<circle cx="8" cy="14" r="4.5"/><circle cx="19" cy="11" r="4"/><circle cx="30" cy="14" r="4.5"/>',
 '<circle cx="9" cy="13" r="5.5"/><circle cx="16" cy="11" r="5.5"/><circle cx="23" cy="13" r="5.5"/><circle cx="30" cy="11" r="5.5"/>',
 '<rect x="4" y="7" width="32" height="11" rx="5.5"/><path d="M12 8v4M19 17v-4M27 8v4" stroke="var(--surface)" stroke-width="1.5"/>',
 '<path d="M5 15c5-8 10 2 15-4s10 0 15-3" fill="none" stroke="var(--stool)" stroke-width="7" stroke-linecap="round"/>',
 '<ellipse cx="9" cy="13" rx="6" ry="4.5"/><ellipse cx="21" cy="11" rx="5.5" ry="4"/><ellipse cx="32" cy="14" rx="5" ry="4"/>',
 '<path d="M4 15c2-5 6-3 8-6 3 3 5-1 8 2 3-3 6 0 8-2 2 3 6 2 8 6 0 4-5 4-8 3-3 2-7 1-10 1-4 1-8 1-10-1-3 0-4-1-4-3z" fill="var(--stool-2)"/>',
 '<ellipse cx="20" cy="15" rx="17" ry="5" fill="var(--stool-2)" opacity=".75"/><path d="M8 14c3-2 5 2 8 0s5 2 8 0 5 2 8 0" fill="none" stroke="var(--stool)" stroke-width="1.5"/>'
];
const brIco=i=>S('0 0 40 24',`<g fill="var(--stool)">${BR[i]}</g>`);
// Faces
const face=n=>{const c=SC[n],m=[ 'M13 25c4 5 10 5 14 0','M13 26h14','M13 28c4-4 10-4 14 0','M12 29c4-6 12-6 16 0'][n];
  const brow=n===3?'<path d="M11 12l5 2M29 12l-5 2" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>':'';
  return S('0 0 40 40',`<circle cx="20" cy="20" r="18" fill="${c}"/><circle cx="14" cy="17" r="2.4" fill="#fff"/><circle cx="26" cy="17" r="2.4" fill="#fff"/>${brow}<path d="${m}" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>`)};
// Capsule
const capsule=(c,half=true)=>S('0 0 58 32',`<rect x="3" y="5" width="52" height="22" rx="11" fill="${c}" opacity=".25"/><path d="M14 5h15v22H14a11 11 0 0 1 0-22z" fill="${c}"/><rect x="3" y="5" width="52" height="22" rx="11" fill="none" stroke="${c}" stroke-width="2"/><path d="M12 10h8" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>`,'class="cap"');
const bullet=(c)=>S('0 0 58 32',`<path d="M10 9h30a10 7 0 0 1 0 14H10a4 4 0 0 1-4-4v-6a4 4 0 0 1 4-4z" fill="${c}"/><path d="M14 13h12" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>`,'class="cap"');
const tablet=(c)=>S('0 0 58 32',`<circle cx="29" cy="16" r="12" fill="${c}"/><path d="M20 16h18" stroke="#fff" stroke-width="2" opacity=".7"/>`,'class="cap"');

I.camera='<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>';
I.paste='<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h3"/>';
I.mic='<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/>';
I.cut='<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.5 7.5L20 18M8.5 16.5L20 6"/>';
I.diag='<path d="M9 3h6v4H9zM6 5H4v16h16V5h-2M8 12h8M8 16h5"/>';
I.liver='<path d="M3 9c0-3 3-5 8-5 6 0 10 2 10 5 0 4-5 6-9 9-2 1.5-4 2-5 0C5 15 3 13 3 9z"/>';
I.pen='<path d="M4 20l4-1 11-11-3-3L5 16zM14 6l3 3"/>';
I.tube='<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M7.5 14h9"/>';
I.gear='<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>';
I.lock='<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>';
I.trash='<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>';
I.today='<path d="M12 5v14M5 12h14"/>';
I.trend='<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>';
I.clock='<path d="M12 7v5l3 2"/><circle cx="12" cy="12" r="9"/>';
I.doc='<path d="M7 3h7l5 5v13H7zM14 3v5h5M10 17v-3M13 17v-5M16 17v-2"/>';
const syringe=(c)=>S('0 0 58 32',`<rect x="14" y="11" width="26" height="10" rx="2" fill="${c}"/><path d="M40 16h10M6 11v10M10 16h4M50 13v6" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/><path d="M18 14h10" stroke="#fff" stroke-width="2" opacity=".7"/>`,'class="cap"');
const dripbag=(c)=>S('0 0 58 32',`<rect x="20" y="2" width="18" height="20" rx="4" fill="${c}"/><path d="M29 22v8M25 9h8" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/><path d="M25 9h8" stroke="#fff" stroke-width="2"/>`,'class="cap"');
const medIcon=(m,c)=>({Rectal:bullet,Injection:syringe,Drip:dripbag}[m.form]||(/vitamin|iron|folic/i.test(m.name)?tablet:capsule))(c);
