// ── PREVISÃO DE SALDO ────────────────────────────────────────────
// Projeta o saldo de cada conta com as mesmas regras que a app já usa para lançar movimentos
// automáticos (prestações, subscrições, comissões, juros) mais o que indicares à mão.
let prevDias=60, prevChart=null;
const PREV_CORES=['#60a0f0','#2dd4a0','#f0b060','#f06060','#c060f0','#f060c0'];
const prevData=iso=>iso.slice(8)+'/'+iso.slice(5,7);
const contaPorId=id=>contas.find(c=>String(c.id)===String(id));
function prevSetDias(n){
  prevDias=n;
  document.querySelectorAll('.prev-seg button').forEach(b=>b.classList.toggle('active',+b.dataset.dias===n));
  renderPrev();
}
function prevToggleMedia(){renderPrev();}
function prevCalcular(dias,usaMedia){
  const h0=new Date(hoje.getFullYear(),hoje.getMonth(),hoje.getDate());
  const hojeISO=dataLocalISO(h0);
  const fim=new Date(h0.getFullYear(),h0.getMonth(),h0.getDate()+dias), fimISO=dataLocalISO(fim);
  const porDia=new Map();
  const add=(iso,contaId,valor,desc,tipo)=>{
    const c=contaPorId(contaId);
    if(!c||iso<=hojeISO||iso>fimISO||!(Math.abs(valor)>0.004))return;
    if(!porDia.has(iso))porDia.set(iso,[]);
    porDia.get(iso).push({iso,contaId:c.id,valor:+valor.toFixed(2),desc,tipo});
  };
  const meses=[];
  for(let cur=new Date(h0.getFullYear(),h0.getMonth(),1);cur<=fim;cur.setMonth(cur.getMonth()+1))meses.push([cur.getFullYear(),cur.getMonth()]);
  contas.forEach(c=>{
    if(+c.comissao>0)meses.forEach(([a,m])=>add(dataLocalISO(dataComDia(a,m,c.comissaoDia||1)),c.id,-(+c.comissao),c.comissaoDesc||'Comissão de conta','Comissão'));
  });
  subscricoes.filter(x=>x.ativa).forEach(x=>{
    meses.forEach(([a,m0])=>{
      const m=m0+1;
      let ocorre=x.periodo==='mensal'||(x.periodo==='anual'&&m===(+x.mes||1));
      if(x.periodo==='trimestral')ocorre=((m-(+x.mes||1)+12)%3===0);
      if(x.periodo==='semestral')ocorre=((m-(+x.mes||1)+12)%6===0);
      if(ocorre)add(dataLocalISO(dataComDia(a,m0,x.dia||1)),x.contaId,-(+x.valor),x.nome,'Subscrição');
    });
  });
  creditos.forEach(c=>{
    if(!c.contaId||!c.inicio||!c.prest)return;
    planoCredito(c).forEach(r=>{if(r.prest>0)add(dataLocalISO(r.data),c.contaId,-r.prest,'Prestação · '+c.nome,'Crédito');});
  });
  previsoes.forEach(p=>add(p.data,p.contaId,(p.tipo==='entrada'?1:-1)*(+p.valor||0),p.desc||(p.tipo==='entrada'?'Entrada prevista':'Saída prevista'),'Previsto'));
  // média diária de despesas manuais por conta (últimos 90 dias)
  const media={};
  if(usaMedia){
    const i90=dataLocalISO(new Date(h0.getFullYear(),h0.getMonth(),h0.getDate()-90));
    transacoes.forEach(t=>{
      if(t.tipo!=='despesa'||t.automatico||t.isTransferencia||t.data<=i90||t.data>hojeISO)return;
      const c=contaPorId(t.contaId); if(c)media[c.id]=(media[c.id]||0)+(+t.valor||0)/90;
    });
  }
  const saldo={}, series={}, minimo={}, negativo={}, eventos=[], datas=[hojeISO];
  contas.forEach(c=>{
    saldo[c.id]=saldoContaAte(c.id,hojeISO);
    series[c.id]=[saldo[c.id]];
    minimo[c.id]={v:saldo[c.id],iso:hojeISO};
    negativo[c.id]=saldo[c.id]<0?hojeISO:null;
  });
  for(let i=1;i<=dias;i++){
    const d=new Date(h0.getFullYear(),h0.getMonth(),h0.getDate()+i), iso=dataLocalISO(d);
    datas.push(iso);
    (porDia.get(iso)||[]).forEach(ev=>{saldo[ev.contaId]+=ev.valor;ev.saldoApos=saldo[ev.contaId];eventos.push(ev);});
    contas.forEach(c=>{
      if(media[c.id])saldo[c.id]-=media[c.id];
      // juros: mesmas datas e fórmulas do lançamento automático
      if(+c.taxa>0&&c.juroPeriodo&&c.juroPeriodo!=='nenhum'){
        const ultimoMes=new Date(d.getFullYear(),d.getMonth()+1,0).getDate()===d.getDate();
        const ultimoAno=d.getMonth()===11&&d.getDate()===31;
        const devido=c.juroPeriodo==='diario'||(c.juroPeriodo==='mensal'&&ultimoMes)||(c.juroPeriodo==='anual'&&ultimoAno);
        if(devido){
          const t=+c.taxa/100;
          const j=+(c.juroPeriodo==='diario'?saldo[c.id]*t/365:c.juroPeriodo==='mensal'?saldo[c.id]*t/12:saldo[c.id]*t).toFixed(2);
          if(j>0){saldo[c.id]+=j;eventos.push({iso,contaId:c.id,valor:j,desc:'Juros creditados · '+c.nome,tipo:'Juros',saldoApos:saldo[c.id]});}
        }
      }
      series[c.id].push(+saldo[c.id].toFixed(2));
      if(saldo[c.id]<minimo[c.id].v)minimo[c.id]={v:saldo[c.id],iso};
      if(saldo[c.id]<0&&!negativo[c.id])negativo[c.id]=iso;
    });
  }
  return {datas,series,eventos,resumo:contas.map(c=>({conta:c,hoje:series[c.id][0],fim:series[c.id][dias],min:minimo[c.id].v,minISO:minimo[c.id].iso,negISO:negativo[c.id]}))};
}
function prevAdd(){
  const $=id=>document.getElementById(id);
  const valor=parseFloat($('prev-valor').value)||0, data=$('prev-data').value, contaId=$('prev-conta').value;
  if(!(valor>0)||!data||!contaPorId(contaId)||data<=dataLocalISO(hoje))return;
  previsoes.push({id:Date.now(),tipo:$('prev-tipo').value,data,valor,contaId:contaPorId(contaId).id,desc:$('prev-desc').value.trim()});
  sv('fp_prev',previsoes);
  $('prev-valor').value='';$('prev-desc').value='';
  renderPrev();
}
function prevDel(id){
  previsoes=previsoes.filter(p=>p.id!==id);
  sv('fp_prev',previsoes);
  renderPrev();
}
function renderPrev(){
  const $=id=>document.getElementById(id);
  const vazio=!contas.length;
  $('prev-vazio').style.display=vazio?'block':'none';
  $('prev-corpo').style.display=vazio?'none':'';
  if(vazio)return;
  const eur=v=>(v<0?'−':'')+'€'+fmt(Math.abs(v));
  const sel=$('prev-conta'), atual=sel.value;
  sel.innerHTML=contas.map(c=>`<option value="${c.id}">${escapeCal(c.nome)}</option>`).join('');
  if(contas.some(c=>String(c.id)===atual))sel.value=atual;
  const amanha=dataLocalISO(new Date(hoje.getFullYear(),hoje.getMonth(),hoje.getDate()+1));
  $('prev-data').min=amanha;
  if(!$('prev-data').value||$('prev-data').value<amanha)$('prev-data').value=amanha;
  const usaMedia=$('prev-media').checked;
  const R=prevCalcular(prevDias,usaMedia);
  // alertas
  const neg=R.resumo.filter(r=>r.negISO);
  $('prev-alertas').innerHTML=neg.length
    ?neg.map(r=>`<div class="sim-msg err">${r.negISO===dataLocalISO(hoje)?'<b>'+escapeCal(r.conta.nome)+'</b> já está negativa':'<b>'+escapeCal(r.conta.nome)+'</b> fica negativa a '+prevData(r.negISO)}. Mínimo previsto: <span style="white-space:nowrap">${eur(r.min)}</span> a ${prevData(r.minISO)}.</div>`).join('')
    :`<div class="sim-msg ok">Nenhuma conta fica negativa nos próximos ${prevDias} dias.</div>`;
  // cartões por conta
  $('prev-contas').innerHTML=R.resumo.map(r=>`<div class="metric"><div class="metric-label">${escapeCal(r.conta.nome)}</div><div class="metric-value ${r.min<0?'red':''}">${eur(r.fim)}</div><div class="sub">hoje ${eur(r.hoje)} · mín. ${eur(r.min)}${r.minISO!==R.datas[0]?' a '+prevData(r.minISO):''}</div></div>`).join('');
  // gráfico
  if(window.Chart){
    const eixo='rgba(255,255,255,0.04)',txt='#55555f';
    prevChart=upsertChart(prevChart,'chartPrev',{
      type:'line',
      data:{labels:R.datas.map(prevData),datasets:R.resumo.map((r,i)=>({label:r.conta.nome,data:R.series[r.conta.id],borderColor:PREV_CORES[i%PREV_CORES.length],backgroundColor:'transparent',stepped:true,pointRadius:0,borderWidth:2}))},
      options:{
        responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
        plugins:{legend:{display:R.resumo.length>1,labels:{color:'#8a8a96',font:{size:11},boxWidth:10,padding:16}},tooltip:{callbacks:{label:c=>' '+c.dataset.label+': '+eur(c.raw)}}},
        scales:{x:{grid:{color:eixo},ticks:{color:txt,font:{size:10},maxTicksLimit:7,maxRotation:0}},y:{grid:{color:eixo},ticks:{color:txt,font:{size:10},callback:v=>(v<0?'−':'')+'€'+(Math.abs(v)>=1000?fmtK(Math.abs(v)):Math.round(Math.abs(v)))}}}
      }
    });
  }
  $('prev-nota').textContent='Inclui prestações de crédito, subscrições ativas, comissões, juros e as entradas/saídas que acrescentares abaixo'+(usaMedia?', mais a média das tuas despesas habituais.':'. Não inclui salário nem despesas do dia a dia, a não ser que os indiques ou ative as despesas habituais.');
  // lista de previstos (só futuros)
  const futuros=previsoes.filter(p=>p.data>dataLocalISO(hoje)&&contaPorId(p.contaId)).sort((a,b)=>a.data.localeCompare(b.data));
  $('prev-lista').innerHTML=futuros.length?futuros.map(p=>`<div class="row"><div><div style="font-size:13px">${escapeCal(p.desc||(p.tipo==='entrada'?'Entrada prevista':'Saída prevista'))}</div><div class="sub" style="font-size:11px;color:var(--text3)">${prevData(p.data)} · ${escapeCal(contaPorId(p.contaId).nome)}</div></div><div style="display:flex;align-items:center;gap:12px"><span style="font-family:var(--mono);font-size:13px;color:var(--${p.tipo==='entrada'?'green':'red'})">${p.tipo==='entrada'?'+':'−'}€${fmt(p.valor)}</span><button class="btn-ghost" type="button" onclick="prevDel(${p.id})" aria-label="Remover" style="padding:4px 9px">✕</button></div></div>`).join('')
    :'<div style="color:var(--text3);font-size:12px">Nada previsto por agora.</div>';
  // movimentos
  const evs=R.eventos.slice().sort((a,b)=>a.iso.localeCompare(b.iso));
  const mostrar=evs.slice(0,40), multi=contas.length>1;
  $('prev-body').innerHTML=mostrar.length?mostrar.map(e=>`<tr><td>${prevData(e.iso)}</td><td>${escapeCal(e.desc)}${multi?`<div class="sub">${escapeCal(contaPorId(e.contaId).nome)}</div>`:''}</td><td style="color:var(--${e.valor>0?'green':'red'})">${e.valor>0?'+':'−'}€${fmt(Math.abs(e.valor))}</td><td style="${e.saldoApos<0?'color:var(--red)':''}">${eur(e.saldoApos)}</td></tr>`).join('')
    +(evs.length>mostrar.length?`<tr><td colspan="4" style="text-align:center;color:var(--text3)">A mostrar os primeiros ${mostrar.length} de ${evs.length}</td></tr>`:'')
    :'<tr><td colspan="4" style="text-align:center;color:var(--text3)">Sem movimentos previstos neste período.</td></tr>';
}

