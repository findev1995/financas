// SUBSCRIÇÕES

function periodoLabel(p){return{mensal:'Mensal',anual:'Anual',trimestral:'Trimestral',semestral:'Semestral'}[p]||p;}
function valorMensal(s){
  if(s.periodo==='mensal') return s.valor;
  if(s.periodo==='anual') return s.valor/12;
  if(s.periodo==='trimestral') return s.valor/3;
  if(s.periodo==='semestral') return s.valor/6;
  return s.valor;
}

function abrirModalSub(){
  const modal=document.getElementById('modal-sub');
  if(modal)modal.classList.add('open');
  setTimeout(()=>document.getElementById('sub-nome')?.focus(),50);
}
function fecharModalSub(){
  const modal=document.getElementById('modal-sub');
  if(modal)modal.classList.remove('open');
}
function addSub(){
  const nome=document.getElementById('sub-nome').value.trim();
  const valor=parseFloat(document.getElementById('sub-valor').value)||0;
  const periodo=document.getElementById('sub-periodo').value;
  const dia=parseInt(document.getElementById('sub-dia').value)||1;
  const mes=parseInt(document.getElementById('sub-mes').value)||1;
  const cat=document.getElementById('sub-cat').value;
  const notas=document.getElementById('sub-notas').value;
  const contaId=parseInt(document.getElementById('sub-conta').value)||null;
  if(!nome||!valor) return;
  subscricoes.push({id:Date.now(),nome,valor,periodo,dia,mes,cat,notas,contaId,ativa:true,autoDesde:new Date().toISOString().slice(0,10)});
  sv('fp_subs',subscricoes);
  ['sub-nome','sub-valor','sub-dia','sub-mes','sub-notas'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('sub-conta').value='';
  renderSubs();
  fecharModalSub();
}
function delSub(id){subscricoes=subscricoes.filter(s=>s.id!==id);sv('fp_subs',subscricoes);renderSubs();}
function toggleSub(id){
  subscricoes=subscricoes.map(s=>s.id===id?{...s,ativa:!s.ativa}:s);
  sv('fp_subs',subscricoes);renderSubs();
}

function renderSubs(){
  const ativas=subscricoes.filter(s=>s.ativa);
  const totalMes=ativas.reduce((s,sub)=>s+valorMensal(sub),0);
  const totalAno=ativas.reduce((s,sub)=>s+valorMensal(sub)*12,0);
  document.getElementById('sub-metrics').innerHTML=`
    <div class="metric"><div class="metric-label">Total/mês (ativas)</div><div class="metric-value pink" style="color:var(--pink)">€${fmt(totalMes)}</div></div>
    <div class="metric"><div class="metric-label">Total/ano</div><div class="metric-value" style="color:var(--pink)">€${fmt(totalAno)}</div></div>
    <div class="metric"><div class="metric-label">Subscrições ativas</div><div class="metric-value blue">${ativas.length}</div></div>
    <div class="metric"><div class="metric-label">Total registadas</div><div class="metric-value" style="color:var(--text2)">${subscricoes.length}</div></div>
  `;
  const el=document.getElementById('lista-subs');
  if(!subscricoes.length){el.innerHTML='<div class="card"><div style="color:var(--text3);font-size:13px">Ainda não tens subscrições. Usa «Nova Subscrição» para adicionar a primeira.</div></div>';return;}
  const grupos={};
  subscricoes.forEach(s=>{if(!grupos[s.cat])grupos[s.cat]=[];grupos[s.cat].push(s);});
  el.innerHTML=Object.entries(grupos).map(([cat,subs])=>`
    <div class="card subscription-group">
      <div class="subscription-group-head">
        <div class="subscription-group-name"><span class="dot" style="background:${SUB_COLS[cat]||'#888'}"></span>${escapeCal(cat)}</div>
        <span class="subscription-group-total">€${fmt(subs.filter(s=>s.ativa).reduce((s,sub)=>s+valorMensal(sub),0))}/mês</span>
      </div>
      ${subs.map(s=>`<div class="subscription-item" id="sub-row-${s.id}" style="opacity:${s.ativa?1:.48}">
        <div class="subscription-main">
          <div class="subscription-name">${escapeCal(s.nome)}</div>
          <div class="subscription-meta">${periodoLabel(s.periodo)} · cobrança dia ${s.dia}${s.periodo!=='mensal'?' / mês '+s.mes:''}${s.notas?' · '+escapeCal(s.notas):''}</div>
        </div>
        <div class="subscription-price">
          <div class="subscription-value">€${fmt(s.valor)}</div>
          ${s.periodo!=='mensal'?`<div class="subscription-equivalent">€${fmt(valorMensal(s))}/mês</div>`:''}
        </div>
        <div class="subscription-actions">
          <button class="btn-ghost" onclick="toggleSub(${s.id})" style="padding:5px 9px;font-size:11px">${s.ativa?'Pausar':'Ativar'}</button>
          <button class="btn-del" onclick="editSub(${s.id})" aria-label="Editar"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-1"/><path d="M20.385 6.585a2.1 2.1 0 0 0-2.97-2.97L9 12v3h3l8.385-8.415z"/></svg></button>
          <button class="btn-del" onclick="delSub(${s.id})" aria-label="Remover"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg></button>
        </div>
      </div>`).join('')}
    </div>`).join('');
}

function editSub(id){
  const s=subscricoes.find(x=>x.id===id);
  if(!s)return;
  const S='background:var(--bg3);border:0.5px solid var(--border2);border-radius:var(--radius-sm);color:var(--text);font-family:var(--font);font-size:12px;padding:6px 8px;outline:none;width:100%';
  const periodoOpts=['mensal','anual','trimestral','semestral'].map(v=>`<option value="${v}" ${v===s.periodo?'selected':''}>${{mensal:'Mensal',anual:'Anual',trimestral:'Trimestral',semestral:'Semestral'}[v]}</option>`).join('');
  const catOpts=['Entretenimento','Produtividade','Saúde','Educação','Software','Outro'].map(v=>`<option ${v===s.cat?'selected':''}>${v}</option>`).join('');
  const contaOpts='<option value="">— sem conta —</option>'+contas.map(c=>`<option value="${c.id}" ${c.id===s.contaId?'selected':''}>${escapeCal(c.nome)}</option>`).join('');
  document.getElementById('sub-row-'+id).outerHTML=`<div id="sub-row-${id}" style="padding:10px 0;border-bottom:0.5px solid var(--border)">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">NOME</div><input id="es-nome-${id}" value="${escapeCal(s.nome)}" style="${S}"></div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">VALOR (€)</div><input type="number" id="es-valor-${id}" value="${s.valor}" style="${S}"></div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">PERIODICIDADE</div><select id="es-periodo-${id}" style="${S}">${periodoOpts}</select></div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">CATEGORIA</div><select id="es-cat-${id}" style="${S}">${catOpts}</select></div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">DIA COBRANÇA</div><input type="number" id="es-dia-${id}" value="${s.dia}" style="${S}"></div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">CONTA</div><select id="es-conta-${id}" style="${S}">${contaOpts}</select></div>
      <div style="grid-column:1/-1"><div style="font-size:10px;color:var(--text3);margin-bottom:3px">NOTAS</div><input id="es-notas-${id}" value="${s.notas||''}" style="${S}"></div>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn-primary" onclick="saveSub(${id})" style="font-size:12px;padding:6px 14px"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg> Guardar</button>
      <button class="btn-ghost" onclick="renderSubs()" style="font-size:12px;padding:6px 10px">Cancelar</button>
    </div>
  </div>`;
}
function saveSub(id){
  const nome=document.getElementById('es-nome-'+id).value.trim();
  const valor=parseFloat(document.getElementById('es-valor-'+id).value)||0;
  const periodo=document.getElementById('es-periodo-'+id).value;
  const cat=document.getElementById('es-cat-'+id).value;
  const dia=parseInt(document.getElementById('es-dia-'+id).value)||1;
  const contaId=parseInt(document.getElementById('es-conta-'+id).value)||null;
  const notas=document.getElementById('es-notas-'+id).value;
  if(!nome)return;
  subscricoes=subscricoes.map(s=>s.id===id?{...s,nome,valor,periodo,cat,dia,contaId,notas}:s);
  sv('fp_subs',subscricoes);renderSubs();
}

function creditosCal(){
  const arr=[];
  const ano=hoje.getFullYear();
  creditos.forEach(c=>{
    if(!c.prazo||!c.prest)return;
    const planoCompleto=planoCredito(c).filter(r=>r.cap>0);
    const plano=planoCompleto.filter(r=>r.data.getFullYear()===ano);
    plano.forEach(r=>{
      const d=r.data;
      const dias=Math.ceil((d-hoje)/(1000*60*60*24));
      const posicao=planoCompleto.findIndex(p=>p.n===r.n);
      const prazoRestante=posicao<0?0:planoCompleto.length-posicao;
      arr.push({
        desc:c.nome,
        valor:r.prest,
        mes:d.getMonth()+1,
        dia:d.getDate(),
        dias,
        ativoNome:c.tipo,
        atDot:CR_DOT[c.tipo]||'#f06060',
        isCredito:true,
        prazoRestante,
        creditoId:c.id
      });
    });
  });
  return arr;
}

function renderCal(){
  const todos=todosOsCustos();
  const subCustos=subscricoesCal();
  const credCustos=creditosCal();
  const invReforcos=reforcosInvestimentosCal();
  const pprReforcos=reforcosPprCal();
  const totalComissoesContas=contas.reduce((s,c)=>s+(c.comissao||0)*12,0);
  const totalCredAnual=credCustos.reduce((s,c)=>s+c.valor,0);
  const totalAnual=ativos.reduce((s,a)=>(a.custos||[]).reduce((s2,c)=>s2+c.valor,s),0)
    +subscricoes.filter(s=>s.ativa).reduce((s,sub)=>s+valorMensal(sub)*12,0)
    +totalComissoesContas+totalCredAnual+invReforcos.reduce((s,c)=>s+c.valor,0)+pprReforcos.reduce((s,c)=>s+c.valor,0);
  const prox60=[...todos,...subCustos,...credCustos,...invReforcos,...pprReforcos].filter(c=>c.dias>=0&&c.dias<=60);
  const urg=[...todos,...subCustos,...credCustos,...invReforcos,...pprReforcos].filter(c=>c.dias>=0&&c.dias<=7);
  const totalPrestMes=creditos.reduce((s,c)=>s+(estadoCreditoHoje(c).futuros[0]?.prest||0),0);
  const totalReforcosMes=investimentos.reduce((s,i)=>s+(+i.mensal||0),0)+pprs.reduce((s,p)=>s+(+p.mensal||0),0);
  document.getElementById('cal-metrics').innerHTML=`
    <div class="metric"><div class="metric-label">Prestações/mês (ativas)</div><div class="metric-value red">€${fmt(totalPrestMes)}</div></div>
    <div class="metric"><div class="metric-label">Subscrições/mês</div><div class="metric-value" style="color:var(--pink)">€${fmt(subscricoes.filter(s=>s.ativa).reduce((s,sub)=>s+valorMensal(sub),0))}</div></div>
    <div class="metric"><div class="metric-label">Reforços/mês</div><div class="metric-value blue">€${fmt(totalReforcosMes)}</div></div>
    <div class="metric"><div class="metric-label">Próximos 60 dias</div><div class="metric-value ${prox60.length?'amber':'green'}">€${fmt(prox60.reduce((s,c)=>s+c.valor,0))}</div></div>
    <div class="metric"><div class="metric-label">Urgentes (7d)</div><div class="metric-value ${urg.length?'red':'green'}">${urg.length}</div></div>
  `;
  const porMes=Array(12).fill(0).map(()=>({ativos:0,subs:0,contas:0,creds:0,reforcos:0,urg:false,temSub:false,temConta:false,temCred:false,temReforco:false}));
  todos.forEach(c=>{
    const m=c.mes-1;
    if(c.isConta){porMes[m].contas+=c.valor;porMes[m].temConta=true;}
    else{porMes[m].ativos+=c.valor;}
    if(c.dias<=30&&c.dias>=0)porMes[m].urg=true;
  });
  subCustos.forEach(c=>{const m=c.mes-1;porMes[m].subs+=c.valor;porMes[m].temSub=true;});
  credCustos.forEach(c=>{const m=c.mes-1;porMes[m].creds+=c.valor;porMes[m].temCred=true;});
  [...invReforcos,...pprReforcos].forEach(c=>{const m=c.mes-1;porMes[m].reforcos+=c.valor;porMes[m].temReforco=true;});

  document.getElementById('cal-grid').innerHTML=MESES_SHORT.map((nm,i)=>{
    const pm=porMes[i];
    const total=pm.ativos+pm.subs+pm.contas+pm.creds+pm.reforcos;
    let cls='cal-cell';
    if(pm.urg) cls+=' urgent';
    else if(pm.ativos>0||pm.temConta||pm.temReforco) cls+=' has-cost';
    if(pm.temSub) cls+=' has-sub';
    if(pm.temCred) cls+=' has-cred';
    if(i===hoje.getMonth()) cls+=' current';
    return`<div class="${cls}" onclick="calCellClick(${i})" ondblclick="openMesCal(${i})" title="Duplo clique para abrir ${MESES_FULL[i]}">
      <div class="cal-cell-name">${nm}</div>
      <div class="cal-cell-val">${total>0?'€'+Math.round(total):'-'}</div>
      <div style="font-size:9px;margin-top:2px;color:#f0a060;min-height:13px">${pm.temCred?'€'+Math.round(pm.creds)+' prest.':''}</div>
    </div>`;
  }).join('');
  if(calMesAberto!==null) renderMesCal();
  else showMesCal(null);
}

function subscricoesCal(){
  const arr=[];
  const ativas=subscricoes.filter(s=>s.ativa);
  const ano=hoje.getFullYear();
  ativas.forEach(s=>{
    if(s.periodo==='mensal'){
      for(let m=0;m<12;m++){
        const d=new Date(ano,m,s.dia);
        const dias=Math.ceil((d-hoje)/(1000*60*60*24));
        arr.push({desc:s.nome,valor:s.valor,mes:m+1,dia:s.dia,dias,ativoNome:s.cat,atDot:SUB_COLS[s.cat]||'#f060c0',isSub:true,cat:s.cat});
      }
    } else {
      const meses=s.periodo==='anual'?[s.mes]:s.periodo==='trimestral'?[s.mes,(s.mes+2)%12+1,(s.mes+5)%12+1,(s.mes+8)%12+1]:[s.mes,(s.mes+5)%12+1];
      meses.forEach(m=>{
        const d=new Date(ano,m-1,s.dia);
        const dias=Math.ceil((d-hoje)/(1000*60*60*24));
        arr.push({desc:s.nome,valor:s.valor,mes:m,dia:s.dia,dias,ativoNome:s.cat,atDot:SUB_COLS[s.cat]||'#f060c0',isSub:true,cat:s.cat});
      });
    }
  });
  return arr.sort((a,b)=>a.dias-b.dias);
}
function reforcosInvestimentosCal(){
  const arr=[],ano=hoje.getFullYear();
  investimentos.filter(i=>(+i.mensal||0)>0).forEach(i=>{
    for(let m=0;m<12;m++){
      const d=new Date(ano,m,i.dia||1);
      arr.push({desc:`Reforço ${i.nome}`,valor:+i.mensal,mes:m+1,dia:i.dia||1,dias:Math.ceil((d-hoje)/(1000*60*60*24)),ativoNome:i.tipo,atDot:'var(--blue)',isInvestRef:true});
    }
  });
  return arr;
}
function reforcosPprCal(){
  const arr=[],ano=hoje.getFullYear();
  pprs.filter(p=>(+p.mensal||0)>0).forEach(p=>{
    for(let m=0;m<12;m++){
      const d=new Date(ano,m,p.dia||1);
      arr.push({desc:`Reforço ${p.nome}`,valor:+p.mensal,mes:m+1,dia:p.dia||1,dias:Math.ceil((d-hoje)/(1000*60*60*24)),ativoNome:p.tipo,atDot:'var(--purple)',isPprRef:true});
    }
  });
  return arr;
}
function showMesCal(m){
  const todos=todosOsCustos();
  const subCustos=subscricoesCal();
  const credCustos=creditosCal();
  const invReforcos=reforcosInvestimentosCal();
  const pprReforcos=reforcosPprCal();
  if(m===null){
    document.getElementById('cal-detail-title').textContent='Próximos pagamentos';
    const prox=[...todos,...subCustos,...credCustos,...invReforcos,...pprReforcos].filter(c=>c.dias>=0).sort((a,b)=>a.dias-b.dias).slice(0,12);
    renderCalDetail(prox);return;
  }
  document.getElementById('cal-detail-title').textContent=MESES_FULL[m]+' — pagamentos';
  const combined=[
    ...todos.filter(c=>c.mes-1===m),
    ...subCustos.filter(c=>c.mes-1===m),
    ...credCustos.filter(c=>c.mes-1===m),
    ...invReforcos.filter(c=>c.mes-1===m),
    ...pprReforcos.filter(c=>c.mes-1===m)
  ].sort((a,b)=>a.dia-b.dia);
  renderCalDetail(combined);
}


function calCellClick(m){
  // em ecrãs de toque não há duplo clique: um toque abre o mês
  if(window.matchMedia('(hover: none), (pointer: coarse)').matches)openMesCal(m);
  else showMesCal(m);
}

function openMesCal(m){
  calMesAberto=m;
  document.getElementById('cal-annual-view').classList.add('hidden');
  document.getElementById('cal-month-view').classList.add('active');
  renderMesCal();
}

function closeMesCal(){
  calMesAberto=null;
  document.getElementById('cal-month-view').classList.remove('active');
  document.getElementById('cal-annual-view').classList.remove('hidden');
  showMesCal(null);
}

function moveMesCal(delta){
  calMesAberto=(calMesAberto+delta+12)%12;
  renderMesCal();
}

function custosDoMesCal(m){
  return [
    ...todosOsCustos().filter(c=>c.mes-1===m),
    ...subscricoesCal().filter(c=>c.mes-1===m),
    ...creditosCal().filter(c=>c.mes-1===m),
    ...reforcosInvestimentosCal().filter(c=>c.mes-1===m),
    ...reforcosPprCal().filter(c=>c.mes-1===m)
  ].sort((a,b)=>a.dia-b.dia);
}

function escapeCal(value){
  return String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
}

function calAccent(c){
  if(c.isCredito) return 'var(--amber)';
  if(c.isSub) return 'var(--pink)';
  if(c.isInvestRef) return 'var(--blue)';
  if(c.isPprRef) return 'var(--purple)';
  if(c.isConta) return 'var(--blue)';
  return c.atDot||'var(--green)';
}

function calEntityIcon(c){
  const label=escapeCal(c.desc);
  const logo=c.logo||c.logoUrl||c.iconUrl||'';
  if(logo) return `<span class="month-payment-icon" style="background:${calAccent(c)}"><img src="${escapeCal(logo)}" alt="" onerror="this.remove()"></span>`;
  const initial=escapeCal(String(c.desc||'?').trim().charAt(0)||'?');
  return `<span class="month-payment-icon" style="background:${calAccent(c)}" title="${label}">${initial}</span>`;
}

function renderMesCal(){
  if(calMesAberto===null) return;
  const ano=hoje.getFullYear();
  const m=calMesAberto;
  const custos=custosDoMesCal(m);
  const porDia={};
  custos.forEach(c=>{(porDia[c.dia]??=[]).push(c);});
  document.getElementById('cal-month-heading').textContent=`${MESES_FULL[m]} ${ano}`;
  document.getElementById('cal-detail-title').textContent=`${MESES_FULL[m]} — pagamentos`;
  const primeiro=new Date(ano,m,1);
  const offset=(primeiro.getDay()+6)%7; // segunda-feira é a primeira coluna
  const diasNoMes=new Date(ano,m+1,0).getDate();
  const cells=[];
  for(let i=0;i<offset;i++) cells.push('<div class="month-day empty" aria-hidden="true"></div>');
  for(let dia=1;dia<=diasNoMes;dia++){
    const items=porDia[dia]||[];
    const isHoje=ano===hoje.getFullYear()&&m===hoje.getMonth()&&dia===hoje.getDate();
    const visible=items.slice(0,3).map(c=>`<div class="month-payment" title="${escapeCal(c.desc)} — €${fmt(c.valor)}">${calEntityIcon(c)}<span class="month-payment-name">${escapeCal(c.desc)}</span><span class="month-payment-value">€${fmt(c.valor)}</span></div>`).join('');
    const extra=items.length>3?`<div class="month-more">+${items.length-3} pagamento${items.length-3>1?'s':''}</div>`:'';
    cells.push(`<div class="month-day${isHoje?' today':''}"><div class="month-day-number">${dia}</div>${visible}${extra}</div>`);
  }
  while(cells.length%7) cells.push('<div class="month-day empty" aria-hidden="true"></div>');
  document.getElementById('month-days').innerHTML=cells.join('');
  renderCalDetail(custos);
}

function renderCalDetail(custos){
  const el=document.getElementById('cal-detail');
  if(!custos.length){el.innerHTML='<div style="color:var(--text3);font-size:13px;padding:8px 0">Sem custos</div>';return;}
  el.innerHTML=custos.map(c=>{
    const isSub=c.isSub;
    const isConta=c.isConta;
    const isCred=c.isCredito;
    const isInvestRef=c.isInvestRef;
    const isPprRef=c.isPprRef;
    let accentColor='';
    let badge='';
    if(isCred){accentColor='var(--amber)';badge=`<span class="pill pill-amber" style="font-size:10px">prestação · ${c.prazoRestante}m restantes</span>`;}
    else if(isSub){accentColor='var(--pink)';badge='<span class="pill" style="background:var(--pink-bg);color:var(--pink-text);font-size:10px">sub</span>';}
    else if(isInvestRef){accentColor='var(--blue)';badge='<span class="pill pill-blue" style="font-size:10px">reforço</span>';}
    else if(isPprRef){accentColor='var(--purple)';badge='<span class="pill" style="background:var(--purple-bg);color:var(--purple);font-size:10px">reforço</span>';}
    else if(isConta){accentColor='var(--blue)';badge='<span class="pill pill-blue" style="font-size:10px">conta</span>';}
    return`<div class="custo-row ${urgCls(c.dias)}" style="border-left-color:${accentColor||'var(--green)'}">
      <div class="row-left">
        <span class="dot" style="background:${accentColor||c.atDot}"></span>
        <div>
          <div style="font-weight:500">${escapeCal(c.desc)} ${badge}</div>
          <div class="sub">${c.ativoNome} · dia ${c.dia}/${String(c.mes).padStart(2,'0')}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-family:var(--mono)">€${fmt(c.valor)}</span>
        <span class="${pillUrgCls(c.dias)}">${pillUrgLabel(c.dias)}</span>
      </div></div>`;
  }).join('');
}

