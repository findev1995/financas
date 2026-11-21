function addConta(){
  const nome=document.getElementById('cn-nome').value.trim();
  const saldo=parseFloat(document.getElementById('cn-saldo').value)||0;
  const tipo=document.getElementById('cn-tipo').value;
  const taxa=parseFloat(document.getElementById('cn-taxa').value)||0;
  const juroPeriodo=document.getElementById('cn-juro-periodo').value;
  const comissao=parseFloat(document.getElementById('cn-comissao').value)||0;
  const comissaoDia=parseInt(document.getElementById('cn-comissao-dia').value)||1;
  const comissaoDesc=document.getElementById('cn-comissao-desc').value.trim()||'Comissão de conta';
  if(!nome)return;
  contas.push({id:Date.now(),nome,saldo,tipo,taxa,juroPeriodo,comissao,comissaoDia,comissaoDesc,autoDesde:new Date().toISOString().slice(0,10)});
  sv('fp_contas',contas);
  ['cn-nome','cn-saldo','cn-taxa','cn-comissao','cn-comissao-dia','cn-comissao-desc'].forEach(id=>document.getElementById(id).value='');
  renderContas();
  fecharModalConta();
}
function delConta(id){contas=contas.filter(c=>c.id!==id);sv('fp_contas',contas);renderContas();}
function abrirModalConta(){
  const modal=document.getElementById('modal-conta');
  if(modal)modal.classList.add('open');
  setTimeout(()=>document.getElementById('cn-nome')?.focus(),50);
}
function fecharModalConta(){
  const modal=document.getElementById('modal-conta');
  if(modal)modal.classList.remove('open');
}
function renderContas(){
  populaSelectContas();
  const el=document.getElementById('lista-contas');
  const total=contas.reduce((s,c)=>s+saldoEfetivo(c.id),0);
  const totalComissoes=contas.reduce((s,c)=>s+(c.comissao||0),0);
  const metricsHtml=`<div class="metrics" style="margin-bottom:1rem">
    <div class="metric"><div class="metric-label">Total disponível</div><div class="metric-value green">€${fmt(total)}</div></div>
    <div class="metric"><div class="metric-label">Comissões/mês</div><div class="metric-value red">€${fmt(totalComissoes)}</div></div>
    <div class="metric"><div class="metric-label">Contas</div><div class="metric-value blue">${contas.length}</div></div>
  </div>`;
  if(!contas.length){
    el.innerHTML=metricsHtml+`<div class="card"><div style="color:var(--text3);font-size:13px;padding:8px 0">Ainda não tens contas bancárias. Usa «Nova Conta» para adicionar a primeira.</div></div>`;
    return;
  }
  el.innerHTML=metricsHtml+`<div class="card account-list-card">
    ${contas.map(c=>{
      const saldoEf=saldoEfetivo(c.id);
      const jurosAnual=c.taxa>0&&c.juroPeriodo&&c.juroPeriodo!=='nenhum'?(saldoEf*c.taxa/100):0;
      const labels={diario:'Juros diários',mensal:'Juros mensais',anual:'Juros anuais'};
      const juroLabel=c.taxa>0&&c.juroPeriodo&&c.juroPeriodo!=='nenhum'?`${c.taxa}% a.a. · ${labels[c.juroPeriodo]||'Juros'}`:'';
      const detalhes=[c.tipo,juroLabel].filter(Boolean).join(' · ');
      const icon=(c.tipo||'').toLowerCase().includes('poup')||(c.tipo||'').toLowerCase().includes('prazo')?'◫':(c.tipo||'').toLowerCase().includes('cofre')?'▣':'▤';
      return`<div class="account-item" id="conta-row-${c.id}">
        <div class="account-icon" aria-hidden="true">${icon}</div>
        <div class="account-main">
          <div class="account-name">${escapeCal(c.nome)}</div>
          <div class="account-meta">${escapeCal(detalhes)}</div>
          ${c.comissao>0?`<div style="font-size:11px;color:var(--red);margin-top:5px">${escapeCal(c.comissaoDesc||'Comissão de conta')} · €${fmt(c.comissao)}/mês</div>`:''}
          ${jurosAnual>0?`<div style="font-size:11px;color:var(--teal);margin-top:4px">Rendimento estimado: €${fmt(jurosAnual)}/ano</div>`:''}
        </div>
        <div class="account-balance amount green">€ ${fmt(saldoEf)}</div>
        <div class="account-actions">
          <button class="btn-del" onclick="editConta(${c.id})" aria-label="Editar conta"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-1"/><path d="M20.385 6.585a2.1 2.1 0 0 0-2.97-2.97L9 12v3h3l8.385-8.415z"/></svg></button>
          <button class="btn-del" onclick="delConta(${c.id})" aria-label="Eliminar conta"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg></button>
        </div>
      </div>`;
    }).join('')}
    <div class="row" style="font-weight:600;margin-top:4px;padding-top:14px">
      <div>Total disponível</div>
      <span class="amount green" style="font-size:16px">€ ${fmt(total)}</span>
    </div>
  </div>`;
}

function editConta(id){
  const c=contas.find(x=>x.id===id);
  if(!c)return;
  const S='background:var(--bg3);border:0.5px solid var(--border2);border-radius:var(--radius-sm);color:var(--text);font-family:var(--font);font-size:12px;padding:6px 8px;outline:none;width:100%';
  const periodoOpts=['nenhum','diario','mensal','anual'].map(v=>`<option value="${v}" ${v===c.juroPeriodo?'selected':''}>${{nenhum:'Sem juros',diario:'Diário',mensal:'Mensal',anual:'Anual'}[v]}</option>`).join('');
  const tipoOpts=['Conta à ordem','Conta poupança','Conta a prazo','Conta cofre'].map(v=>`<option ${v===c.tipo?'selected':''}>${v}</option>`).join('');
  const el=document.getElementById('conta-row-'+id);
  el.outerHTML=`<div id="conta-row-${id}" style="padding:10px 0;border-bottom:0.5px solid var(--border)">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">NOME</div><input id="ec-nome-${id}" value="${escapeCal(c.nome)}" style="${S}"></div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">SALDO BASE (€)</div><input type="number" id="ec-saldo-${id}" value="${c.saldo}" style="${S}"></div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">TIPO</div><select id="ec-tipo-${id}" style="${S}">${tipoOpts}</select></div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">TAXA JURO ANUAL (%)</div><input type="number" id="ec-taxa-${id}" value="${c.taxa||0}" style="${S}"></div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">PERIODICIDADE JURO</div><select id="ec-jp-${id}" style="${S}">${periodoOpts}</select></div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">COMISSÃO MENSAL (€)</div><input type="number" id="ec-com-${id}" value="${c.comissao||0}" style="${S}"></div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">DIA COMISSÃO</div><input type="number" id="ec-comdia-${id}" value="${c.comissaoDia||1}" style="${S}"></div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">DESC. COMISSÃO</div><input id="ec-comdesc-${id}" value="${c.comissaoDesc||''}" style="${S}"></div>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn-primary" onclick="saveConta(${id})" style="font-size:12px;padding:6px 14px"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg> Guardar</button>
      <button class="btn-ghost" onclick="renderContas()" style="font-size:12px;padding:6px 10px">Cancelar</button>
    </div>
  </div>`;
}
function saveConta(id){
  const nome=document.getElementById('ec-nome-'+id).value.trim();
  const saldo=parseFloat(document.getElementById('ec-saldo-'+id).value)||0;
  const tipo=document.getElementById('ec-tipo-'+id).value;
  const taxa=parseFloat(document.getElementById('ec-taxa-'+id).value)||0;
  const juroPeriodo=document.getElementById('ec-jp-'+id).value;
  const comissao=parseFloat(document.getElementById('ec-com-'+id).value)||0;
  const comissaoDia=parseInt(document.getElementById('ec-comdia-'+id).value)||1;
  const comissaoDesc=document.getElementById('ec-comdesc-'+id).value.trim();
  if(!nome)return;
  contas=contas.map(c=>c.id===id?{...c,nome,saldo,tipo,taxa,juroPeriodo,comissao,comissaoDia,comissaoDesc}:c);
  sv('fp_contas',contas);renderContas();
}


function editAtivo(id){
  const a=ativos.find(x=>x.id===id);
  if(!a)return;
  const S='background:var(--bg3);border:0.5px solid var(--border2);border-radius:var(--radius-sm);color:var(--text);font-family:var(--font);font-size:12px;padding:6px 8px;outline:none;width:100%';
  const tipoOpts=['Automóvel','Imóvel','Equipamento','Outro'].map(v=>`<option ${v===a.tipo?'selected':''}>${v}</option>`).join('');
  // Find the ativo-card and replace its header only (keep body with custos intact)
  const card=document.getElementById('ativo-head-'+id);
  if(!card)return;
  card.outerHTML=`<div class="ativo-head" id="ativo-head-${id}">
    <div style="width:100%">
      <div style="font-size:10px;color:var(--text3);margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">Editar ativo</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
        <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">NOME</div><input id="ea-nome-${id}" value="${escapeCal(a.nome)}" style="${S}"></div>
        <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">TIPO</div><select id="ea-tipo-${id}" style="${S}">${tipoOpts}</select></div>
        <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">VALOR AQUISIÇÃO (€)</div><input type="number" id="ea-aq-${id}" value="${a.aq}" style="${S}"></div>
        <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">VALOR MERCADO (€)</div><input type="number" id="ea-mkt-${id}" value="${a.mkt}" style="${S}"></div>
        <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">ANO</div><input type="number" id="ea-ano-${id}" value="${a.ano}" style="${S}"></div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn-primary" onclick="saveAtivo(${id})" style="font-size:12px;padding:6px 14px"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg> Guardar</button>
        <button class="btn-ghost" onclick="renderAtivos()" style="font-size:12px;padding:6px 10px">Cancelar</button>
      </div>
    </div>
  </div>`;
}
function saveAtivo(id){
  const nome=document.getElementById('ea-nome-'+id).value.trim();
  const tipo=document.getElementById('ea-tipo-'+id).value;
  const aq=parseFloat(document.getElementById('ea-aq-'+id).value)||0;
  const mkt=parseFloat(document.getElementById('ea-mkt-'+id).value)||0;
  const ano=parseInt(document.getElementById('ea-ano-'+id).value)||hoje.getFullYear();
  if(!nome)return;
  ativos=ativos.map(a=>a.id===id?{...a,nome,tipo,aq,mkt,ano}:a);
  sv('fp_ativos',ativos);renderAtivos();
}

function abrirModalAtivo(){
  const modal=document.getElementById('modal-ativos');
  if(modal)modal.classList.add('open');
}
function fecharModalAtivo(){
  const modal=document.getElementById('modal-ativos');
  if(modal)modal.classList.remove('open');
}
function addAtivo(){
  const nome=document.getElementById('at-nome').value.trim();
  const tipo=document.getElementById('at-tipo').value;
  const aq=parseFloat(document.getElementById('at-aq').value)||0;
  const mkt=parseFloat(document.getElementById('at-mkt').value)||0;
  const ano=parseInt(document.getElementById('at-ano').value)||hoje.getFullYear();
  if(!nome)return;
  ativos.push({id:Date.now(),nome,tipo,aq,mkt,ano,custos:[]});
  sv('fp_ativos',ativos);
  ['at-nome','at-aq','at-mkt','at-ano'].forEach(id=>document.getElementById(id).value='');
  renderAtivos();
  fecharModalAtivo();
}
function delAtivo(id){ativos=ativos.filter(a=>a.id!==id);sv('fp_ativos',ativos);renderAtivos();}
function toggleFormCusto(id){
  const el=document.getElementById('fc-'+id);
  el.style.display=el.style.display==='none'?'block':'none';
}
function addCusto(aId){
  const desc=document.getElementById('cd-d-'+aId).value.trim();
  const valor=parseFloat(document.getElementById('cd-v-'+aId).value)||0;
  const mes=parseInt(document.getElementById('cd-m-'+aId).value)||0;
  const dia=parseInt(document.getElementById('cd-dia-'+aId).value)||1;
  const cat=document.getElementById('cd-c-'+aId).value;
  if(!desc||!valor||!mes)return;
  ativos=ativos.map(a=>a.id===aId?{...a,custos:[...(a.custos||[]),{id:Date.now(),desc,valor,mes,dia,cat}]}:a);
  sv('fp_ativos',ativos);renderAtivos();
}
function delCusto(aId,cId){
  ativos=ativos.map(a=>a.id===aId?{...a,custos:(a.custos||[]).filter(c=>c.id!==cId)}:a);
  sv('fp_ativos',ativos);renderAtivos();
}
function dadosAtualizacao(tipo,id){
  const config={ativo:{lista:ativos,chave:'mkt',storage:'fp_ativos',render:renderAtivos},investimento:{lista:investimentos,chave:'atual',storage:'fp_inv',render:renderInv},ppr:{lista:pprs,chave:'atual',storage:'fp_pprs',render:renderPPR}}[tipo];
  return config?{...config,item:config.lista.find(x=>x.id===id)}:null;
}
function resumoAtualizacoes(atualizacoes,tipo,id){
  const ultimas=(atualizacoes||[]).slice().sort((a,b)=>b.data.localeCompare(a.data)).slice(0,3);
  if(!ultimas.length)return '<div class="sub" style="margin-top:5px">Ainda sem histórico de avaliações</div>';
  return `<div class="sub" style="margin-top:5px">Última atualização: ${new Date(ultimas[0].data+'T00:00:00').toLocaleDateString('pt-PT')} · €${fmt(ultimas[0].valor)}${ultimas.length>1?` · <button class="btn-del" onclick="alternarHistorico('${tipo}',${id})" style="font-size:11px">${ultimas.length} registos</button>`:''}</div><div id="historico-${tipo}-${id}"></div>`;
}
function alternarHistorico(tipo,id){
  const d=dadosAtualizacao(tipo,id);
  const el=document.getElementById(`historico-${tipo}-${id}`);
  if(!d?.item||!el)return;
  if(el.innerHTML){el.innerHTML='';return;}
  const rows=(d.item.atualizacoes||[]).slice().sort((a,b)=>b.data.localeCompare(a.data));
  el.innerHTML=`<div style="margin-top:6px;padding-top:6px;border-top:.5px solid var(--border);font-size:11px">${rows.map(a=>`<div style="display:flex;justify-content:space-between;padding:2px 0"><span>${new Date(a.data+'T00:00:00').toLocaleDateString('pt-PT')}</span><span style="font-family:var(--mono)">€${fmt(a.valor)}</span></div>`).join('')}</div>`;
}
function abrirAtualizacao(tipo,id){
  const d=dadosAtualizacao(tipo,id);
  const alvo=document.getElementById(`atualizacao-${tipo}-${id}`);
  if(!d?.item||!alvo)return;
  const hojeISO=hoje.toISOString().slice(0,10);
  alvo.innerHTML=`<div class="form-inline" style="margin:10px 0"><div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Atualizar avaliação</div><div style="display:flex;gap:8px;align-items:end;flex-wrap:wrap"><div class="form-group" style="min-width:160px;flex:1"><label>Novo valor (€)</label><input type="number" id="av-valor-${tipo}-${id}" value="${d.item[d.chave]}" min="0" step="0.01"></div><div class="form-group"><label>Data</label><input type="date" id="av-data-${tipo}-${id}" value="${hojeISO}"></div><button class="btn-primary" onclick="guardarAtualizacao('${tipo}',${id})" style="font-size:12px;padding:7px 12px">Guardar</button><button class="btn-ghost" onclick="document.getElementById('atualizacao-${tipo}-${id}').innerHTML=''" style="font-size:12px;padding:7px 10px">Cancelar</button></div></div>`;
}
function guardarAtualizacao(tipo,id){
  const d=dadosAtualizacao(tipo,id);
  const valor=parseFloat(document.getElementById(`av-valor-${tipo}-${id}`).value);
  const data=document.getElementById(`av-data-${tipo}-${id}`).value;
  if(!d?.item||!Number.isFinite(valor)||valor<0||!data)return;
  const registo={id:Date.now(),data,valor};
  const lista=d.lista.map(x=>x.id===id?{...x,[d.chave]:valor,atualizacoes:[...(x.atualizacoes||[]),registo]}:x);
  if(tipo==='ativo')ativos=lista;
  if(tipo==='investimento')investimentos=lista;
  if(tipo==='ppr')pprs=lista;
  sv(d.storage,lista);
  d.render();
}
function abrirReforco(tipo,id){
  const item=(tipo==='investimento'?investimentos:pprs).find(x=>x.id===id);
  const alvo=document.getElementById(`reforco-${tipo}-${id}`);
  if(!item||!alvo)return;
  const data=hoje.toISOString().slice(0,10);
  const eAcao=tipo==='investimento'&&item.tipo==='Ações';
  alvo.innerHTML=`<div class="form-inline" style="margin:10px 0"><div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Registar reforço</div><div style="display:flex;gap:8px;align-items:end;flex-wrap:wrap">${eAcao?`<div class="form-group"><label>Quantidade</label><input type="number" id="rf-qtd-${tipo}-${id}" min="0.0001" step="any" placeholder="0"></div><div class="form-group"><label>Preço por ação (€)</label><input type="number" id="rf-preco-${tipo}-${id}" min="0.01" step="0.01" placeholder="0.00"></div>`:`<div class="form-group"><label>Valor (€)</label><input type="number" id="rf-valor-${tipo}-${id}" min="0.01" step="0.01" placeholder="0.00"></div>`}<div class="form-group"><label>Data</label><input type="date" id="rf-data-${tipo}-${id}" value="${data}"></div><button class="btn-primary" onclick="guardarReforco('${tipo}',${id})" style="font-size:12px;padding:7px 12px">Guardar reforço</button><button class="btn-ghost" onclick="document.getElementById('reforco-${tipo}-${id}').innerHTML=''" style="font-size:12px;padding:7px 10px">Cancelar</button></div></div>`;
}
function guardarReforco(tipo,id){
  const lista=tipo==='investimento'?investimentos:pprs;
  const item=lista.find(x=>x.id===id);
  const data=document.getElementById(`rf-data-${tipo}-${id}`).value;
  if(!item||!data)return;
  const eAcao=tipo==='investimento'&&item.tipo==='Ações';
  const quantidade=eAcao?(parseFloat(document.getElementById(`rf-qtd-${tipo}-${id}`).value)||0):null;
  const preco=eAcao?(parseFloat(document.getElementById(`rf-preco-${tipo}-${id}`).value)||0):null;
  const valor=eAcao?quantidade*preco:(parseFloat(document.getElementById(`rf-valor-${tipo}-${id}`).value)||0);
  if(!valor||valor<=0)return;
  const reforco={id:Date.now(),data,valor,...(eAcao?{quantidade,preco}:{})};
  const atualizada=lista.map(x=>x.id===id?{...x,inv:tipo==='investimento'?(+x.inv||0)+valor:x.inv,contrib:tipo==='ppr'?(+x.contrib||0)+valor:x.contrib,atual:(+x.atual||0)+valor,reforcos:[...(x.reforcos||[]),reforco]}:x);
  if(tipo==='investimento'){investimentos=atualizada;sv('fp_inv',investimentos);renderInv();}
  else{pprs=atualizada;sv('fp_pprs',pprs);renderPPR();}
}
function renderAtivos(){
  const el=document.getElementById('lista-ativos');
  if(!ativos.length){el.innerHTML='<div class="card"><div style="color:var(--text3);font-size:13px">Nenhum ativo</div></div>';return;}
  el.innerHTML=ativos.map(a=>{
    const custos=a.custos||[];
    const historico=resumoAtualizacoes(a.atualizacoes,'ativo',a.id);
    const totalC=custos.reduce((s,c)=>s+c.valor,0);
    const delta=a.mkt-a.aq;
    const pct=a.aq>0?((delta/a.aq)*100).toFixed(1):0;
    const custosHtml=custos.length?custos.map(c=>{
      const dias=diasPara(c.dia,c.mes-1);
      return`<div class="custo-row ${urgCls(dias)}">
        <div><span style="font-weight:500">${escapeCal(c.desc)}</span> <span class="pill pill-gray">${c.cat}</span></div>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="text-align:right"><div style="font-family:var(--mono)">€${fmt(c.valor)}</div><div class="sub">até ${c.dia}/${String(c.mes).padStart(2,'0')}</div></div>
          <span class="${pillUrgCls(dias)}">${pillUrgLabel(dias)}</span>
          <button class="btn-del" onclick="delCusto(${a.id},${c.id})" aria-label="Remover custo"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div></div>`}).join(''):'<div style="color:var(--text3);font-size:12px;padding:6px 0">Sem custos associados</div>';
    return`<div class="ativo-card">
      <div class="ativo-head" id="ativo-head-${a.id}">
        <div class="row-left"><span class="dot" style="background:${AT_DOT[a.tipo]||'#888'}"></span>
          <div><div style="font-weight:500">${escapeCal(a.nome)}</div><div class="sub">${a.tipo}${a.ano?' · '+a.ano:''}</div></div></div>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="text-align:right"><div style="font-family:var(--mono)">€${fmt(a.mkt)}</div>
            <div style="font-size:11px;color:${delta>=0?'var(--green)':'var(--red)'}">${delta>=0?'+':''}${pct}%</div></div>
          <button class="btn-ghost" onclick="abrirAtualizacao('ativo',${a.id})" style="font-size:12px;padding:5px 8px">Atualizar valor</button>
          <button class="btn-del" onclick="editAtivo(${a.id})" aria-label="Editar ativo"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-1"/><path d="M20.385 6.585a2.1 2.1 0 0 0-2.97-2.97L9 12v3h3l8.385-8.415z"/></svg></button>
          <button class="btn-del" onclick="delAtivo(${a.id})" aria-label="Remover ativo"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg></button>
        </div>
      </div>
      <div id="atualizacao-ativo-${a.id}"></div>
      <div class="ativo-body">
        ${historico}
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <span style="font-size:12px;color:var(--text3)">Custos anuais <span style="color:var(--red);font-family:var(--mono)">€${fmt(totalC)}</span></span>
          <button class="btn-ghost" style="font-size:12px;padding:4px 10px" onclick="toggleFormCusto(${a.id})"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg> Custo</button>
        </div>
        <div id="fc-${a.id}" style="display:none;margin-bottom:10px">
          <div class="form-inline" style="background:var(--bg3);border-radius:var(--radius-sm);padding:.75rem">
            <div class="form-grid3">
              <div class="form-group"><label>Descrição</label><input type="text" id="cd-d-${a.id}"></div>
              <div class="form-group"><label>Valor (€)</label><input type="number" id="cd-v-${a.id}" placeholder="0.00" min="0" step="0.01"></div>
              <div class="form-group"><label>Mês (1-12)</label><input type="number" id="cd-m-${a.id}" min="1" max="12"></div>
            </div>
            <div class="form-grid">
              <div class="form-group"><label>Dia limite</label><input type="number" id="cd-dia-${a.id}" min="1" max="31"></div>
              <div class="form-group"><label>Categoria</label><select id="cd-c-${a.id}"><option>Seguro</option><option>Imposto</option><option>Manutenção</option><option>Condomínio</option><option>Inspeção</option><option>Outro</option></select></div>
            </div>
            <button class="btn-primary" style="font-size:12px;padding:6px 14px" onclick="addCusto(${a.id})">Guardar</button>
          </div>
        </div>
        ${custosHtml}
      </div>
      <div class="ativo-foot"><span>${custos.length} custo${custos.length!==1?'s':''}</span><span>€${fmt(totalC/12)}/mês médio</span></div>
    </div>`;
  }).join('');
}

function diasPara(dia,mes){
  const d=new Date(hoje.getFullYear(),mes,dia);
  if(d<hoje)d.setFullYear(hoje.getFullYear()+1);
  return Math.ceil((d-hoje)/(1000*60*60*24));
}
function urgCls(d){return d<=7?'urg':d<=30?'prox':'ok';}
function pillUrgCls(d){return d<=7?'pill pill-red':d<=30?'pill pill-amber':'pill pill-green';}
function pillUrgLabel(d){return d<0?'Vencido':d===0?'Hoje':'em '+d+'d';}

function todosOsCustos(){
  const arr=[];
  ativos.forEach(a=>(a.custos||[]).forEach(c=>{
    const dias=diasPara(c.dia,c.mes-1);
    arr.push({...c,ativoNome:a.nome,atDot:AT_DOT[a.tipo]||'#888',dias,fonte:'ativo'});
  }));
  // Comissões de contas bancárias — mensais, todos os meses
  contas.forEach(c=>{
    if(!c.comissao||c.comissao<=0)return;
    const mesAtualNum=hoje.getMonth();
    const dias=diasPara(c.comissaoDia,mesAtualNum);
    for(let m=0;m<12;m++){
      const d2=diasPara(c.comissaoDia,m);
      arr.push({
        desc:c.comissaoDesc||'Comissão de conta',
        valor:c.comissao,
        mes:m+1,
        dia:c.comissaoDia,
        dias:m===mesAtualNum?dias:d2,
        ativoNome:c.nome,
        atDot:CN_DOT[c.tipo]||'#60a0f0',
        fonte:'conta',
        isConta:true
      });
    }
  });
  return arr.sort((a,b)=>a.dias-b.dias);
}


function abrirModalInv(){
  const modal=document.getElementById('modal-investimentos');
  if(modal)modal.classList.add('open');
}
function fecharModalInv(){
  const modal=document.getElementById('modal-investimentos');
  if(modal)modal.classList.remove('open');
}
function addInv(){
  const nome=document.getElementById('i-nome').value.trim();
  const tipo=document.getElementById('i-tipo').value;
  const inv=parseFloat(document.getElementById('i-inv').value)||0;
  const atual=parseFloat(document.getElementById('i-atual').value)||0;
  const mensal=parseFloat(document.getElementById('i-mensal').value)||0;
  const dia=parseInt(document.getElementById('i-dia').value)||1;
  if(!nome||!inv||!atual)return;
  investimentos.push({id:Date.now(),nome,tipo,inv,atual,mensal,dia,reforcos:[]});
  sv('fp_inv',investimentos);
  ['i-nome','i-inv','i-atual','i-mensal','i-dia'].forEach(id=>document.getElementById(id).value='');
  renderInv();
  fecharModalInv();
}
function delInv(id){investimentos=investimentos.filter(i=>i.id!==id);sv('fp_inv',investimentos);renderInv();}
function renderInv(){
  const totalInv=investimentos.reduce((s,i)=>s+i.inv,0);
  const totalAt=investimentos.reduce((s,i)=>s+i.atual,0);
  const ganho=totalAt-totalInv;
  document.getElementById('inv-metrics').innerHTML=`
    <div class="metric"><div class="metric-label">Total investido</div><div class="metric-value blue">€${fmt(totalInv)}</div></div>
    <div class="metric"><div class="metric-label">Valor atual</div><div class="metric-value blue">€${fmt(totalAt)}</div></div>
    <div class="metric"><div class="metric-label">Ganho / perda</div><div class="metric-value ${ganho>=0?'green':'red'}">${ganho>=0?'+':''}€${fmt(Math.abs(ganho))}</div></div>
  `;
  const el=document.getElementById('lista-inv');
  if(!investimentos.length){el.innerHTML='<div class="card"><div style="color:var(--text3);font-size:13px">Nenhum investimento</div></div>';return;}
  el.innerHTML=`<div class="card">${investimentos.map(i=>{
    const delta=i.atual-i.inv;
    const pct=i.inv>0?((delta/i.inv)*100).toFixed(1):0;
    return`<div class="row" id="inv-row-${i.id}">
      <div><div style="font-weight:500">${escapeCal(i.nome)}</div><div class="sub">${i.tipo}${i.mensal>0?' · reforço €'+fmt(i.mensal)+'/mês (dia '+(i.dia||1)+')':''}</div>${resumoAtualizacoes(i.atualizacoes,'investimento',i.id)}</div>
      <div style="display:flex;align-items:center;gap:8px">
        <div style="text-align:right">
          <div style="font-family:var(--mono)">€${fmt(i.atual)}</div>
          <div style="font-size:11px;color:${delta>=0?'var(--green)':'var(--red)'}">${delta>=0?'+':''}${pct}%</div>
        </div>
        <button class="btn-ghost" onclick="abrirReforco('investimento',${i.id})" style="font-size:12px;padding:5px 8px">Reforçar</button>
        <button class="btn-ghost" onclick="abrirAtualizacao('investimento',${i.id})" style="font-size:12px;padding:5px 8px">Atualizar</button>
        <button class="btn-del" onclick="editInv(${i.id})" aria-label="Editar"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-1"/><path d="M20.385 6.585a2.1 2.1 0 0 0-2.97-2.97L9 12v3h3l8.385-8.415z"/></svg></button>
        <button class="btn-del" onclick="delInv(${i.id})" aria-label="Remover"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg></button>
      </div></div><div id="reforco-investimento-${i.id}"></div><div id="atualizacao-investimento-${i.id}"></div>`;
  }).join('')}</div>`;
}
function editInv(id){
  const i=investimentos.find(x=>x.id===id);
  if(!i)return;
  const S='background:var(--bg3);border:0.5px solid var(--border2);border-radius:var(--radius-sm);color:var(--text);font-family:var(--font);font-size:12px;padding:6px 8px;outline:none;width:100%';
  document.getElementById('inv-row-'+id).outerHTML=`<div id="inv-row-${id}" style="padding:10px 0;border-bottom:0.5px solid var(--border)">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">NOME</div><input id="ei-nome-${id}" value="${escapeCal(i.nome)}" style="${S}"></div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">TIPO</div>
        <select id="ei-tipo-${id}" style="${S}">
          ${['ETF','Ações','Criptomoeda','Obrigações','Imobiliário','Depósito a Prazo','Outro'].map(t=>`<option ${t===i.tipo?'selected':''}>${t}</option>`).join('')}
        </select>
      </div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">INVESTIDO (€)</div><input type="number" id="ei-inv-${id}" value="${i.inv}" style="${S}"></div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">VALOR ATUAL (€)</div><input type="number" id="ei-atual-${id}" value="${i.atual}" style="${S}"></div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">REFORÇO MENSAL (€)</div><input type="number" id="ei-mensal-${id}" value="${i.mensal||0}" style="${S}"></div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">DIA DO REFORÇO</div><input type="number" id="ei-dia-${id}" value="${i.dia||1}" min="1" max="31" style="${S}"></div>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn-primary" onclick="saveInv(${id})" style="font-size:12px;padding:6px 14px"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg> Guardar</button>
      <button class="btn-ghost" onclick="renderInv()" style="font-size:12px;padding:6px 10px">Cancelar</button>
    </div>
  </div>`;
}
function saveInv(id){
  const nome=document.getElementById('ei-nome-'+id).value.trim();
  const tipo=document.getElementById('ei-tipo-'+id).value;
  const inv=parseFloat(document.getElementById('ei-inv-'+id).value)||0;
  const atual=parseFloat(document.getElementById('ei-atual-'+id).value)||0;
  const mensal=parseFloat(document.getElementById('ei-mensal-'+id).value)||0;
  const dia=parseInt(document.getElementById('ei-dia-'+id).value)||1;
  if(!nome)return;
  investimentos=investimentos.map(i=>i.id===id?{...i,nome,tipo,inv,atual,mensal,dia}:i);
  sv('fp_inv',investimentos);renderInv();
}


function abrirModalPPR(){
  const modal=document.getElementById('modal-ppr');
  if(modal)modal.classList.add('open');
}
function fecharModalPPR(){
  const modal=document.getElementById('modal-ppr');
  if(modal)modal.classList.remove('open');
}
function addPPR(){
  const nome=document.getElementById('ppr-nome').value.trim();
  const tipo=document.getElementById('ppr-tipo').value;
  const contrib=parseFloat(document.getElementById('ppr-contrib').value)||0;
  const atual=parseFloat(document.getElementById('ppr-atual').value)||0;
  const mensal=parseFloat(document.getElementById('ppr-mensal').value)||0;
  const dia=parseInt(document.getElementById('ppr-dia').value)||1;
  const ano=parseInt(document.getElementById('ppr-ano').value)||2050;
  if(!nome||!atual)return;
  pprs.push({id:Date.now(),nome,tipo,contrib,atual,mensal,dia,ano,reforcos:[]});
  sv('fp_pprs',pprs);
  ['ppr-nome','ppr-contrib','ppr-atual','ppr-mensal','ppr-dia'].forEach(id=>document.getElementById(id).value='');
  renderPPR();
  fecharModalPPR();
}
function delPPR(id){pprs=pprs.filter(p=>p.id!==id);sv('fp_pprs',pprs);renderPPR();}
function renderPPR(){
  const total=pprs.reduce((s,p)=>s+p.atual,0);
  const el=document.getElementById('lista-ppr');
  if(!pprs.length){el.innerHTML='<div class="card"><div style="color:var(--text3);font-size:13px">Nenhum PPR</div></div>';return;}
  el.innerHTML=`<div class="card">${pprs.map(p=>{
    const delta=p.atual-p.contrib;
    const pct=p.contrib>0?((delta/p.contrib)*100).toFixed(1):0;
    const anosResto=p.ano-hoje.getFullYear();
    return`<div class="row" id="ppr-row-${p.id}">
      <div><div style="font-weight:500">${escapeCal(p.nome)}</div>
        <div class="sub">${p.tipo} · resgate ${p.ano} (${anosResto} anos)${p.mensal>0?' · +€'+fmt(p.mensal)+'/mês (dia '+(p.dia||1)+')':''}</div>
        ${resumoAtualizacoes(p.atualizacoes,'ppr',p.id)}
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div style="text-align:right">
          <div style="font-family:var(--mono)">€${fmt(p.atual)}</div>
          <div style="font-size:11px;color:${delta>=0?'var(--green)':'var(--red)'}">${delta>=0?'+':''}${pct}% vs contribuído</div>
        </div>
        <button class="btn-ghost" onclick="abrirReforco('ppr',${p.id})" style="font-size:12px;padding:5px 8px">Reforçar</button>
        <button class="btn-ghost" onclick="abrirAtualizacao('ppr',${p.id})" style="font-size:12px;padding:5px 8px">Atualizar</button>
        <button class="btn-del" onclick="editPPR(${p.id})" aria-label="Editar"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-1"/><path d="M20.385 6.585a2.1 2.1 0 0 0-2.97-2.97L9 12v3h3l8.385-8.415z"/></svg></button>
        <button class="btn-del" onclick="delPPR(${p.id})" aria-label="Remover"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg></button>
      </div></div><div id="reforco-ppr-${p.id}"></div><div id="atualizacao-ppr-${p.id}"></div>`;
  }).join('')}
    <div class="row" style="font-weight:500"><div>Total acumulado</div><span style="color:var(--purple);font-family:var(--mono)">€${fmt(total)}</span></div>
  </div>`;
}
function editPPR(id){
  const p=pprs.find(x=>x.id===id);
  if(!p)return;
  const S='background:var(--bg3);border:0.5px solid var(--border2);border-radius:var(--radius-sm);color:var(--text);font-family:var(--font);font-size:12px;padding:6px 8px;outline:none;width:100%';
  document.getElementById('ppr-row-'+id).outerHTML=`<div id="ppr-row-${id}" style="padding:10px 0;border-bottom:0.5px solid var(--border)">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">NOME</div><input id="ep-nome-${id}" value="${escapeCal(p.nome)}" style="${S}"></div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">TIPO</div>
        <select id="ep-tipo-${id}" style="${S}">
          ${['PPR','Fundo de pensões','Plano reforma empresa','Outro'].map(t=>`<option ${t===p.tipo?'selected':''}>${t}</option>`).join('')}
        </select>
      </div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">TOTAL CONTRIBUÍDO (€)</div><input type="number" id="ep-contrib-${id}" value="${p.contrib}" style="${S}"></div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">VALOR ATUAL (€)</div><input type="number" id="ep-atual-${id}" value="${p.atual}" style="${S}"></div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">CONTRIBUIÇÃO MENSAL (€)</div><input type="number" id="ep-mensal-${id}" value="${p.mensal||0}" style="${S}"></div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">DIA DO REFORÇO</div><input type="number" id="ep-dia-${id}" value="${p.dia||1}" min="1" max="31" style="${S}"></div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">ANO DE RESGATE</div><input type="number" id="ep-ano-${id}" value="${p.ano}" style="${S}"></div>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn-primary" onclick="savePPR(${id})" style="font-size:12px;padding:6px 14px"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg> Guardar</button>
      <button class="btn-ghost" onclick="renderPPR()" style="font-size:12px;padding:6px 10px">Cancelar</button>
    </div>
  </div>`;
}
function savePPR(id){
  const nome=document.getElementById('ep-nome-'+id).value.trim();
  const tipo=document.getElementById('ep-tipo-'+id).value;
  const contrib=parseFloat(document.getElementById('ep-contrib-'+id).value)||0;
  const atual=parseFloat(document.getElementById('ep-atual-'+id).value)||0;
  const mensal=parseFloat(document.getElementById('ep-mensal-'+id).value)||0;
  const dia=parseInt(document.getElementById('ep-dia-'+id).value)||1;
  const ano=parseInt(document.getElementById('ep-ano-'+id).value)||2050;
  if(!nome)return;
  pprs=pprs.map(p=>p.id===id?{...p,nome,tipo,contrib,atual,mensal,dia,ano}:p);
  sv('fp_pprs',pprs);renderPPR();
}



document.getElementById('t-data').value=hoje.toISOString().split('T')[0];

// ENCARGOS TEMPORÁRIOS (antes de guardar o crédito)
