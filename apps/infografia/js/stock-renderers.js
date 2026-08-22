/* Diez motores visuales de stock. Cada composición se dibuja desde datos editables. */
const FolioStockRender = {
  draw(c, data, template, engine) {
    const family = template?.family || 'minimal';
    const method = this[`draw_${family}`] || this.draw_minimal;
    method.call(this, c, this.normalize(data), template, engine);
    return true;
  },

  normalize(data) {
    const sections = Array.isArray(data.sections) && data.sections.length ? data.sections : [{titulo:'Idea',icono:'✦',dato_destacado:'',puntos:['Contenido editable']}];
    return {...data, titulo:data.titulo || 'Una idea visual', subtitulo:data.subtitulo || '', sections};
  },

  rr(ctx,x,y,w,h,r=16) { ctx.beginPath(); ctx.roundRect(x,y,w,h,r); },
  fillRR(ctx,x,y,w,h,r,color) { ctx.fillStyle=color; this.rr(ctx,x,y,w,h,r); ctx.fill(); },
  strokeRR(ctx,x,y,w,h,r,color,width=2) { ctx.strokeStyle=color;ctx.lineWidth=width;this.rr(ctx,x,y,w,h,r);ctx.stroke(); },
  alpha(color,a) { return App.withAlpha(color,a); },
  title(ctx,text,x,y,w,size,color,font,lines=2) { ctx.fillStyle=color;ctx.font=`800 ${size}px ${font}`;ctx.textAlign='left';App.drawWrapped(ctx,text,x,y,w,size*1.04,lines); },
  body(ctx,text,x,y,w,size,color,font,lines=3) { ctx.fillStyle=color;ctx.font=`500 ${size}px ${font}`;ctx.textAlign='left';App.drawWrapped(ctx,text,x,y,w,size*1.38,lines); },
  fitLine(ctx,text,x,y,maxWidth,startSize,color,font,align='left',stroke=false) { let size=startSize;const value=String(text||'').slice(0,34);ctx.textAlign=align;do{ctx.font=`900 ${size}px ${font}`;size-=1;}while(size>24&&ctx.measureText(value).width>maxWidth);if(stroke){ctx.strokeStyle=color;ctx.lineWidth=2;ctx.strokeText(value,x,y);}ctx.fillStyle=color;ctx.fillText(value,x,y);ctx.textAlign='left';return size+1; },
  icon(ctx,icon,x,y,size,bg,fg) { ctx.fillStyle=bg;ctx.beginPath();ctx.arc(x,y,size*.62,0,Math.PI*2);ctx.fill();ctx.fillStyle=fg;ctx.font=`700 ${size}px "Segoe UI Emoji", Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(icon || '✦',x,y+1);ctx.textAlign='left';ctx.textBaseline='alphabetic'; },
  source(ctx,data,c,color) { ctx.fillStyle=color;ctx.font=`500 10px ${c.mono}`;ctx.fillText(data.fuente ? `FUENTE · ${data.fuente.slice(0,72)}` : 'FUENTE · EDITABLE',c.margin,c.height-24); },
  context(c) {
    return {...c, margin:c.aspect==='vertical'?48:58, heading:FolioStock.font('heading'), body:FolioStock.font('body'), mono:FolioStock.font('mono')};
  },

  draw_handmade(raw,data,t,engine) {
    const c=this.context(raw),{ctx,width,height}=c; const ink='#252420',paper='#f3ead8',accent='#de6650',gold='#e6b84d',blue='#2b8fa3';
    ctx.fillStyle=paper;ctx.fillRect(0,0,width,height);
    ctx.strokeStyle=this.alpha(ink,.07);ctx.lineWidth=1;for(let y=20;y<height;y+=24){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
    ctx.strokeStyle=this.alpha(ink,.18);ctx.setLineDash([7,9]);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(width*.18,190);ctx.bezierCurveTo(width*.85,190,width*.12,height*.52,width*.73,height*.6);ctx.bezierCurveTo(width*.96,height*.66,width*.3,height*.8,width*.76,height*.9);ctx.stroke();ctx.setLineDash([]);
    this.fitLine(ctx,data.titulo.toUpperCase(),c.margin,92,width-c.margin*2,c.aspect==='vertical'?50:44,ink,'Georgia,serif','left',true);
    this.body(ctx,data.subtitulo,c.margin,126,width-c.margin*2,14,ink,c.body,2);
    const items=data.sections.slice(0,c.aspect==='vertical'?6:4); const cols=c.aspect==='vertical'?2:4; const cellW=(width-c.margin*2)/cols; const top=205; const rowH=(height-top-65)/Math.ceil(items.length/cols);
    items.forEach((s,i)=>{const col=i%cols,row=Math.floor(i/cols),x=c.margin+col*cellW,y=top+row*rowH;const colors=[accent,gold,blue][i%3];this.icon(ctx,s.icono,x+30,y+28,24,this.alpha(colors,.18),ink);ctx.fillStyle=ink;ctx.font=`800 18px ${c.heading}`;App.drawWrapped(ctx,s.titulo,x+4,y+75,cellW-18,20,2);this.body(ctx,s.puntos?.[0]||'',x+4,y+120,cellW-20,11,ink,c.body,4);ctx.strokeStyle=colors;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+5,y+95);ctx.lineTo(x+cellW*.65,y+95);ctx.stroke();});
    this.source(ctx,data,c,this.alpha(ink,.65));
  },

  draw_editorial(raw,data,t,engine) {
    const c=this.context(raw),{ctx,width,height}=c;const ink='#151a1d',paper='#fffdf8',accent=raw.accent,accent2=raw.accent2;
    ctx.fillStyle=paper;ctx.fillRect(0,0,width,height);ctx.fillStyle=ink;ctx.fillRect(0,0,width,112);
    ctx.fillStyle=accent;ctx.beginPath();ctx.moveTo(width*.62,0);ctx.lineTo(width,0);ctx.lineTo(width,155);ctx.closePath();ctx.fill();
    ctx.fillStyle='#fff';ctx.font=`800 34px ${c.heading}`;App.drawWrapped(ctx,data.titulo,c.margin,51,width*.56,36,2);ctx.fillStyle='#fff';ctx.font=`600 12px ${c.body}`;ctx.fillText(data.subtitulo.slice(0,80),c.margin,98);
    const items=data.sections.slice(0,6);const top=150;const h=(height-top-48)/items.length;
    items.forEach((s,i)=>{const y=top+i*h;ctx.fillStyle=i%2?this.alpha(accent,.08):paper;ctx.fillRect(0,y,width,h-2);ctx.fillStyle=i%2?accent2:accent;ctx.fillRect(c.margin,y+18,7,h-36);this.icon(ctx,s.icono,c.margin+50,y+h/2,20,this.alpha(i%2?accent2:accent,.16),ink);ctx.fillStyle=ink;ctx.font=`800 17px ${c.heading}`;ctx.fillText(s.titulo.slice(0,30),c.margin+86,y+35);this.body(ctx,s.puntos?.[0]||'',c.margin+86,y+58,width-c.margin*2-105,11,'#4d5557',c.body,3);if(s.dato_destacado){ctx.fillStyle=i%2?accent2:accent;ctx.font=`800 22px ${c.body}`;ctx.textAlign='right';ctx.fillText(s.dato_destacado,width-c.margin,y+36);ctx.textAlign='left';}});
    this.source(ctx,data,c,'#6f7574');
  },

  draw_illustrated(raw,data,t,engine) {
    const c=this.context(raw),{ctx,width,height}=c;const bg='#fff4dc',ink='#24343a',accent=raw.accent,accent2=raw.accent2;
    ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);this.title(ctx,data.titulo,c.margin,64,width-c.margin*2,40,ink,c.heading,2);this.body(ctx,data.subtitulo,c.margin,145,width-c.margin*2,14,'#5d696a',c.body,2);
    const cx=width/2,cy=height*.5;ctx.fillStyle=this.alpha(accent,.18);ctx.beginPath();ctx.arc(cx,cy,108,0,Math.PI*2);ctx.fill();ctx.fillStyle=accent;ctx.beginPath();ctx.arc(cx,cy-18,48,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='700 44px "Segoe UI Emoji"';ctx.textAlign='center';ctx.fillText(t.category==='Tecnología'?'🤖':t.category==='Salud'?'🧠':t.category==='Medioambiente'?'🌱':'💡',cx,cy-2);ctx.textAlign='left';ctx.strokeStyle=ink;ctx.lineWidth=5;ctx.beginPath();ctx.arc(cx,cy+48,56,.15,Math.PI-.15);ctx.stroke();
    const items=data.sections.slice(0,6);items.forEach((s,i)=>{const angle=-Math.PI*.82+i*(Math.PI*1.64/Math.max(items.length-1,1));const x=cx+Math.cos(angle)*(width*.34),y=cy+Math.sin(angle)*(height*.32);ctx.strokeStyle=this.alpha(i%2?accent2:accent,.7);ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cx+Math.cos(angle)*112,cy+Math.sin(angle)*112);ctx.lineTo(x,y);ctx.stroke();this.fillRR(ctx,x-76,y-42,152,84,20,'#fff');this.icon(ctx,s.icono,x-50,y,17,this.alpha(i%2?accent2:accent,.2),ink);ctx.fillStyle=ink;ctx.font=`800 13px ${c.heading}`;ctx.fillText(s.titulo.slice(0,18),x-25,y-8);this.body(ctx,s.puntos?.[0]||'',x-25,y+10,86,8,'#536063',c.body,3);});
    this.source(ctx,data,c,'#6f706b');
  },

  draw_bold(raw,data,t,engine) {
    const c=this.context(raw),{ctx,width,height}=c;const left='#211d43',right='#f5aa61',cream='#fff8ec',red='#ed5d61';
    ctx.fillStyle=left;ctx.fillRect(0,0,width/2,height);ctx.fillStyle=right;ctx.fillRect(width/2,0,width/2,height);
    this.fitLine(ctx,data.titulo.toUpperCase(),width/2,78,width-c.margin*2,c.aspect==='vertical'?44:38,cream,c.heading,'center');
    const cx=width/2,cy=height*.48;const hero={Creatividad:'✏️',Negocio:'📦',Salud:'☕',Tecnología:'🤖',Medioambiente:'🌱',Sostenibilidad:'💧'}[t.category]||'💡';ctx.fillStyle=cream;ctx.beginPath();ctx.arc(cx,cy,92,0,Math.PI*2);ctx.fill();ctx.strokeStyle=red;ctx.lineWidth=8;ctx.stroke();ctx.fillStyle=left;ctx.font='700 62px "Segoe UI Emoji"';ctx.textAlign='center';ctx.fillText(hero,cx,cy+12);ctx.fillStyle=red;ctx.font=`900 24px ${c.heading}`;ctx.fillText('VS',cx,cy+62);ctx.textAlign='left';
    const items=data.sections.slice(0,6);items.forEach((s,i)=>{const side=i%2===0?-1:1;const row=Math.floor(i/2);const x=side<0?c.margin:cx+132;const y=205+row*145;ctx.strokeStyle=cream;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(side<0?cx-112:cx+112,cy-80+row*76);ctx.lineTo(side<0?x+150:x,y+18);ctx.stroke();this.icon(ctx,s.icono,side<0?x+22:x+22,y,17,side<0?right:left,cream);ctx.fillStyle=cream;ctx.font=`800 16px ${c.heading}`;ctx.fillText(s.titulo.slice(0,20),x+48,y+5);this.body(ctx,s.puntos?.[0]||'',x,y+30,Math.min(165,width/2-c.margin-18),10,cream,c.body,3);});
    ctx.fillStyle=red;ctx.fillRect(0,height-54,width,54);this.source(ctx,data,{...c,margin:24},cream);
  },

  draw_data(raw,data,t,engine) {
    const c=this.context(raw),{ctx,width,height}=c;const bg='#111c2f',panel='#1d2a40',ink='#f6f8fb',accent='#46a2ff',green='#35d39b',gold='#ffbf5b';
    ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);ctx.fillStyle='#0b1423';ctx.fillRect(0,0,width,104);this.title(ctx,data.titulo,c.margin,48,width*.58,34,ink,c.heading,2);ctx.fillStyle=green;ctx.fillRect(width-c.margin-94,34,94,6);ctx.fillStyle='#91a0b5';ctx.font=`600 11px ${c.mono}`;ctx.fillText('LIVE DATA / EDITABLE',width-c.margin-150,69);
    const items=data.sections.slice(0,6);const cols=c.aspect==='vertical'?2:3;const gap=14;const top=132;const cardW=(width-c.margin*2-gap*(cols-1))/cols;const rows=Math.ceil(items.length/cols);const cardH=(height-top-62-gap*(rows-1))/rows;
    items.forEach((s,i)=>{const x=c.margin+(i%cols)*(cardW+gap),y=top+Math.floor(i/cols)*(cardH+gap);this.fillRR(ctx,x,y,cardW,cardH,12,panel);ctx.fillStyle=[accent,green,gold][i%3];ctx.fillRect(x,y,cardW,5);ctx.fillStyle='#93a2b6';ctx.font=`600 10px ${c.mono}`;ctx.fillText(s.titulo.toUpperCase().slice(0,18),x+16,y+26);ctx.fillStyle=ink;ctx.font=`800 ${s.dato_destacado?28:20}px ${c.body}`;ctx.fillText(s.dato_destacado||s.icono||'●',x+16,y+62);const base=y+cardH-24;ctx.fillStyle=this.alpha([accent,green,gold][i%3],.24);ctx.fillRect(x+16,base-40,cardW-32,40);ctx.fillStyle=[accent,green,gold][i%3];for(let b=0;b<5;b++)ctx.fillRect(x+20+b*(cardW-48)/5,base-(8+((b+i*2)%5)*7),Math.max(5,(cardW-65)/7),8+((b+i*2)%5)*7);this.body(ctx,s.puntos?.[0]||'',x+16,y+78,cardW-32,9,'#aab6c7',c.body,2);});this.source(ctx,data,c,'#8290a3');
  },

  draw_minimal(raw,data,t,engine) {
    const c=this.context(raw),{ctx,width,height}=c;const bg='#f7f7f2',ink='#192422',accent=raw.accent;
    ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);ctx.fillStyle=accent;ctx.fillRect(c.margin,35,8,82);this.title(ctx,data.titulo,c.margin+28,57,width-c.margin*2-28,46,ink,c.heading,2);this.body(ctx,data.subtitulo,c.margin+28,153,width*.62,14,'#697472',c.body,2);
    const items=data.sections.slice(0,6);const top=232;const gap=18;const cols=c.aspect==='vertical'?1:2;const w=(width-c.margin*2-gap*(cols-1))/cols;const h=(height-top-62-gap*(Math.ceil(items.length/cols)-1))/Math.ceil(items.length/cols);
    items.forEach((s,i)=>{const x=c.margin+(i%cols)*(w+gap),y=top+Math.floor(i/cols)*(h+gap);ctx.strokeStyle=this.alpha(ink,.18);ctx.lineWidth=1;ctx.strokeRect(x,y,w,h);ctx.fillStyle=accent;ctx.font=`800 12px ${c.mono}`;ctx.fillText(String(i+1).padStart(2,'0'),x+16,y+25);ctx.fillStyle=ink;ctx.font=`800 19px ${c.heading}`;ctx.fillText(s.titulo.slice(0,28),x+54,y+27);if(s.dato_destacado){ctx.fillStyle=accent;ctx.font=`800 34px ${c.body}`;ctx.fillText(s.dato_destacado,x+16,y+70);}this.body(ctx,s.puntos?.[0]||'',x+16,y+(s.dato_destacado?94:58),w-32,11,'#65706d',c.body,4);});this.source(ctx,data,c,'#747b78');
  },

  draw_education(raw,data,t,engine) {
    const c=this.context(raw),{ctx,width,height}=c;const paper='#fffefa',ink='#25292a',pink='#ef7190',yellow='#f1c84c',cyan='#42aeb5',red='#f2645a';
    ctx.fillStyle=paper;ctx.fillRect(0,0,width,height);ctx.strokeStyle=this.alpha(cyan,.12);for(let y=18;y<height;y+=22){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
    this.strokeRR(ctx,c.margin,26,width-c.margin*2,74,0,ink,2);ctx.fillStyle=paper;ctx.fillRect(c.margin+36,18,width-c.margin*2-72,22);this.title(ctx,data.titulo.toUpperCase(),c.margin+58,52,width-c.margin*2-116,36,ink,'Trebuchet MS,Arial',1);this.body(ctx,data.subtitulo,c.margin,132,width-c.margin*2,14,ink,c.body,2);
    const items=data.sections.slice(0,6);const left=c.margin+16,right=width-c.margin-16,top=210;const step=(height-top-58)/items.length;ctx.strokeStyle=ink;ctx.lineWidth=3;ctx.beginPath();items.forEach((s,i)=>{const x=i%2?width*.58:width*.18,y=top+i*step;if(i===0)ctx.moveTo(x+52,y);else ctx.quadraticCurveTo(width/2,y-step/2,x+52,y);});ctx.stroke();
    items.forEach((s,i)=>{const x=i%2?width*.54:c.margin,y=top+i*step-32,w=width*.38;const color=[pink,yellow,cyan,red][i%4];this.fillRR(ctx,x,y,w,Math.min(92,step-8),0,this.alpha(color,.92));ctx.fillStyle=paper;ctx.fillRect(x+7,y+7,w-14,Math.min(78,step-22));ctx.fillStyle=ink;ctx.font=`800 15px Trebuchet MS,Arial`;ctx.fillText(s.titulo.slice(0,24),x+17,y+31);this.body(ctx,s.puntos?.[0]||'',x+17,y+50,w-34,9,ink,c.body,3);this.icon(ctx,String(i+1),i%2?x-18:x+w+18,y+35,18,color,ink);this.icon(ctx,s.icono,i%2?width*.24:width*.76,y+35,28,this.alpha(color,.18),ink);});this.source(ctx,data,c,'#6d716e');
  },

  draw_vintage(raw,data,t,engine) {
    const c=this.context(raw),{ctx,width,height}=c;const paper='#ead8b5',ink='#3e3025',rust='#9d4935',blue='#4f7180';ctx.fillStyle=paper;ctx.fillRect(0,0,width,height);ctx.strokeStyle=this.alpha(ink,.22);ctx.lineWidth=4;ctx.strokeRect(16,16,width-32,height-32);ctx.lineWidth=1;ctx.strokeRect(23,23,width-46,height-46);
    this.title(ctx,data.titulo,c.margin,52,width-c.margin*2,39,ink,'Georgia,serif',2);ctx.fillStyle=rust;ctx.fillRect(c.margin,137,width-c.margin*2,3);this.body(ctx,data.subtitulo,c.margin,164,width-c.margin*2,13,ink,c.body,2);
    const cx=width*.48,cy=height*.53;ctx.fillStyle='#f3e5c7';ctx.beginPath();ctx.ellipse(cx-86,cy,90,150,-.08,0,Math.PI*2);ctx.ellipse(cx+86,cy,90,150,.08,0,Math.PI*2);ctx.fill();ctx.strokeStyle=ink;ctx.lineWidth=3;ctx.stroke();ctx.beginPath();ctx.moveTo(cx,cy-148);ctx.lineTo(cx,cy+148);ctx.stroke();
    ctx.strokeStyle=blue;ctx.lineWidth=14;ctx.beginPath();ctx.arc(cx+120,cy-45,76,0,Math.PI*2);ctx.stroke();ctx.lineWidth=18;ctx.beginPath();ctx.moveTo(cx+174,cy+10);ctx.lineTo(cx+232,cy+82);ctx.stroke();
    const items=data.sections.slice(0,6);items.forEach((s,i)=>{const side=i%2?-1:1,x=side<0?c.margin:width-c.margin-170,y=220+Math.floor(i/2)*150;ctx.fillStyle=rust;ctx.font=`800 16px Georgia,serif`;ctx.fillText(s.titulo.slice(0,21),x,y);this.body(ctx,s.puntos?.[0]||'',x,y+24,155,10,ink,c.body,4);ctx.strokeStyle=this.alpha(ink,.5);ctx.beginPath();ctx.moveTo(side<0?x+150:x,y+54);ctx.lineTo(cx+side*64,cy-80+Math.floor(i/2)*75);ctx.stroke();});this.source(ctx,data,c,this.alpha(ink,.75));
  },

  draw_tech(raw,data,t,engine) {
    const c=this.context(raw),{ctx,width,height}=c;const bg='#071426',ink='#eaf8ff',cyan='#31d8df',magenta='#ff4e9a';ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);ctx.strokeStyle=this.alpha(cyan,.12);ctx.lineWidth=1;for(let x=0;x<width;x+=28){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke();}for(let y=0;y<height;y+=28){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
    this.title(ctx,data.titulo.toUpperCase(),c.margin,54,width-c.margin*2,38,ink,'DM Mono,monospace',2);ctx.fillStyle=magenta;ctx.fillRect(c.margin,143,120,5);this.body(ctx,data.subtitulo,c.margin,174,width-c.margin*2,13,'#9bb5c8',c.body,2);
    const items=data.sections.slice(0,6),cx=width/2,cy=height*.56;ctx.strokeStyle=cyan;ctx.lineWidth=3;items.forEach((s,i)=>{const a=i*Math.PI*2/items.length-Math.PI/2,x=cx+Math.cos(a)*width*.31,y=cy+Math.sin(a)*height*.28;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(x,y);ctx.stroke();this.fillRR(ctx,x-72,y-42,144,84,8,this.alpha(i%2?magenta:cyan,.14));this.strokeRR(ctx,x-72,y-42,144,84,8,i%2?magenta:cyan,2);ctx.fillStyle=ink;ctx.font=`800 13px ${c.mono}`;ctx.fillText(s.titulo.slice(0,18),x-58,y-11);this.body(ctx,s.puntos?.[0]||'',x-58,y+8,116,8,'#a9bfce',c.body,3);});ctx.fillStyle=bg;ctx.beginPath();ctx.arc(cx,cy,72,0,Math.PI*2);ctx.fill();ctx.strokeStyle=magenta;ctx.lineWidth=7;ctx.stroke();ctx.fillStyle=ink;ctx.font=`800 17px ${c.mono}`;ctx.textAlign='center';ctx.fillText('CORE',cx,cy+6);ctx.textAlign='left';this.source(ctx,data,c,'#7190a4');
  },

  draw_organic(raw,data,t,engine) {
    const c=this.context(raw),{ctx,width,height}=c;const bg='#eef1e6',ink='#294039',green='#4f8b6d',coral='#df896d',gold='#d7ad57';ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);this.title(ctx,data.titulo,c.margin,55,width-c.margin*2,38,ink,c.heading,2);this.body(ctx,data.subtitulo,c.margin,145,width-c.margin*2,13,'#64756e',c.body,2);
    const cx=width/2,cy=height*.55;ctx.strokeStyle=green;ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(cx,cy+110);ctx.bezierCurveTo(cx-20,cy+20,cx+22,cy-58,cx,cy-122);ctx.stroke();
    const items=data.sections.slice(0,6);items.forEach((s,i)=>{const side=i%2?-1:1,row=Math.floor(i/2),x=cx+side*(width*.31+row*5),y=cy-125+row*135;ctx.strokeStyle=[green,coral,gold][i%3];ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(cx,y+30);ctx.bezierCurveTo(cx+side*65,y-20,x-side*78,y,x,y);ctx.stroke();ctx.fillStyle=this.alpha([green,coral,gold][i%3],.22);ctx.beginPath();ctx.ellipse(x,y,98,57,side*.16,0,Math.PI*2);ctx.fill();this.icon(ctx,s.icono,x-side*58,y,18,this.alpha([green,coral,gold][i%3],.3),ink);ctx.fillStyle=ink;ctx.font=`800 15px ${c.heading}`;ctx.textAlign=side<0?'right':'left';ctx.fillText(s.titulo.slice(0,18),x+side*35,y-7);ctx.textAlign='left';this.body(ctx,s.puntos?.[0]||'',side<0?x-66:x+35,y+12,132,9,'#4d615a',c.body,3);});ctx.fillStyle='#f8faf2';ctx.beginPath();ctx.arc(cx,cy,82,0,Math.PI*2);ctx.fill();ctx.strokeStyle=coral;ctx.lineWidth=7;ctx.stroke();ctx.fillStyle=ink;ctx.font='700 50px "Segoe UI Emoji"';ctx.textAlign='center';ctx.fillText('🧠',cx,cy+17);ctx.textAlign='left';this.source(ctx,data,c,'#68766f');
  }
};
