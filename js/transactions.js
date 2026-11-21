function populaSelectContas(){
  const opts='<option value="">— sem conta —</option>'+contas.map(c=>`<option value="${c.id}">${escapeCal(c.nome)}</option>`).join('');
  ['t-conta','sub-conta','c-conta'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=opts;});
  const dest=document.getElementById('t-conta-dest');
  if(dest)dest.innerHTML='<option value="">— escolher —</option>'+contas.map(c=>`<option value="${c.id}">${escapeCal(c.nome)}</option>`).join('');
}

function saldoEfetivo(contaId){
  const c=contas.find(x=>x.id===contaId);
  if(!c)return 0;
  const delta=transacoes.filter(t=>t.contaId===contaId).reduce((s,t)=>t.tipo==='receita'?s+t.valor:s-t.valor,0);
  return c.saldo+delta;
}

function openTxModal(tipo=null){
  const modal=document.getElementById('tx-modal');
  if(!modal)return;
  populaSelectContas();
  const sel=document.getElementById('t-tipo');
  if(tipo==='saldo'){
    // Abre o formulário geral para escolher o movimento adequado; não inventa um tipo de transação.
    sel.value='despesa';
    document.getElementById('t-desc').value='';
  }else if(tipo){sel.value=tipo;}
  else{sel.value='despesa';}
  onTipoTxChange();
  if(!document.getElementById('t-data').value){
    const hoje=new Date();document.getElementById('t-data').value=[hoje.getFullYear(),String(hoje.getMonth()+1).padStart(2,'0'),String(hoje.getDate()).padStart(2,'0')].join('-');
  }
  modal.classList.add('open');modal.setAttribute('aria-hidden','false');
  setTimeout(()=>document.getElementById(tipo==='saldo'?'t-tipo':'t-valor').focus(),80);
}
function closeTxModal(){
  const modal=document.getElementById('tx-modal');if(!modal)return;
  modal.classList.remove('open');modal.setAttribute('aria-hidden','true');
}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeTxModal();});

function onTipoTxChange(){
  const tipo=document.getElementById('t-tipo').value;
  const transf=tipo==='transferencia';
  document.getElementById('t-cat-group').style.display=transf?'none':'';
  document.getElementById('t-dest-group').style.display=transf?'':'none';
  document.getElementById('t-conta-label').textContent=transf?'Conta origem':'Conta';
  if(!transf)document.getElementById('t-cat').innerHTML=optsCat(tipo,null);
}

function addTx(){
  const tipo=document.getElementById('t-tipo').value;
  const valor=parseFloat(document.getElementById('t-valor').value);
  const cat=document.getElementById('t-cat').value;
  const contaId=parseInt(document.getElementById('t-conta').value)||null;
  const data=document.getElementById('t-data').value;
  const desc=document.getElementById('t-desc').value;
  if(!valor||!data)return;
  if(tipo==='transferencia'){
    const destId=parseInt(document.getElementById('t-conta-dest').value)||null;
    if(!contaId||!destId||contaId===destId){avisoErro('Escolhe duas contas diferentes (origem e destino).');return;}
    const base=Date.now();
    const nomeO=(contas.find(c=>c.id===contaId)||{}).nome||'';
    const nomeD=(contas.find(c=>c.id===destId)||{}).nome||'';
    const d=desc||('Transferência '+nomeO+' → '+nomeD);
    // duas pernas ligadas: saída na origem (despesa) e entrada no destino (receita), fora dos totais
    transacoes.unshift({id:base+1,tipo:'receita',valor,cat:'Transferência',data,desc:d,contaId:destId,isTransferencia:true,transferId:base,contaOrigemId:contaId,contaDestinoId:destId});
    transacoes.unshift({id:base,tipo:'despesa',valor,cat:'Transferência',data,desc:d,contaId:contaId,isTransferencia:true,transferId:base,contaOrigemId:contaId,contaDestinoId:destId});
    sv('fp_tx',transacoes);
    document.getElementById('t-valor').value='';
    document.getElementById('t-desc').value='';
    closeTxModal();
    renderTx();
    renderDash();
    return;
  }
  transacoes.unshift({id:Date.now(),tipo,valor,cat,data,desc,contaId});
  sv('fp_tx',transacoes);
  document.getElementById('t-valor').value='';
  document.getElementById('t-desc').value='';
  closeTxModal();
  renderTx();
  renderDash();
}

function delTx(id){
  const alvo=transacoes.find(t=>t.id===id);
  // numa transferência apaga as duas pernas, para os saldos não ficarem desequilibrados
  if(alvo&&alvo.isTransferencia&&alvo.transferId)transacoes=transacoes.filter(t=>t.transferId!==alvo.transferId);
  else transacoes=transacoes.filter(t=>t.id!==id);
  sv('fp_tx',transacoes);renderTx();
}

function editTx(id){
  const t=transacoes.find(x=>x.id===id);
  if(!t)return;
  const contaOpts='<option value="">— sem conta —</option>'+contas.map(c=>`<option value="${c.id}" ${c.id===t.contaId?'selected':''}>${escapeCal(c.nome)}</option>`).join('');
  const iStyle='background:var(--bg3);border:0.5px solid var(--border2);border-radius:var(--radius-sm);color:var(--text);font-family:var(--font);font-size:12px;padding:6px 8px;outline:none;width:100%';
  document.getElementById('tx-row-'+id).innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;padding:8px 0;align-items:end;width:100%">
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">TIPO</div><select id="et-tipo-${id}" onchange="document.getElementById('et-cat-${id}').innerHTML=optsCat(this.value,null)" style="${iStyle}"><option value="despesa" ${t.tipo==='despesa'?'selected':''}>Despesa</option><option value="receita" ${t.tipo==='receita'?'selected':''}>Receita</option></select></div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">CATEGORIA</div><select id="et-cat-${id}" style="${iStyle}">${optsCat(t.tipo,t.cat)}</select></div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">VALOR (€)</div><input type="number" id="et-valor-${id}" value="${t.valor}" style="${iStyle};font-family:var(--mono)"></div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">DATA</div><input type="date" id="et-data-${id}" value="${t.data}" style="${iStyle}"></div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">CONTA</div><select id="et-conta-${id}" style="${iStyle}">${contaOpts}</select></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr auto auto;gap:8px;padding:0 0 8px;align-items:center">
      <input type="text" id="et-desc-${id}" value="${escapeCal(t.desc||'')}" placeholder="Descrição" style="${iStyle}">
      <button class="btn-primary" onclick="saveTx(${id})" style="font-size:12px;padding:6px 14px"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg> Guardar</button>
      <button class="btn-ghost" onclick="renderTx()" style="font-size:12px;padding:6px 10px">Cancelar</button>
    </div>`;
}

function saveTx(id){
  const tipo=document.getElementById('et-tipo-'+id).value;
  const valor=parseFloat(document.getElementById('et-valor-'+id).value)||0;
  const data=document.getElementById('et-data-'+id).value;
  const desc=document.getElementById('et-desc-'+id).value;
  const contaId=parseInt(document.getElementById('et-conta-'+id).value)||null;
  const catEl=document.getElementById('et-cat-'+id);
  if(!valor||!data)return;
  transacoes=transacoes.map(t=>t.id===id?{...t,tipo,valor,data,desc,contaId,cat:catEl?catEl.value:t.cat}:t);
  sv('fp_tx',transacoes);
  renderTx();
}

function filtrarTx(){txMostrar=TX_PAGINA;renderTx();}
function limparFiltrosTx(){
  const mes=document.getElementById('tx-filtro-mes');
  const conta=document.getElementById('tx-filtro-conta');
  if(mes)mes.value='';
  if(conta)conta.value='';
  filtrarTx();
}

function renderTx(){
  populaSelectContas();
  const el=document.getElementById('lista-tx');
  const mesEl=document.getElementById('tx-filtro-mes');
  const contaEl=document.getElementById('tx-filtro-conta');
  const mes=mesEl?mesEl.value:'';
  const contaId=contaEl?contaEl.value:'';
  if(contaEl){
    contaEl.innerHTML='<option value="">Todas as contas</option>'+contas.map(c=>`<option value="${c.id}">${escapeCal(c.nome)}</option>`).join('');
    contaEl.value=contas.some(c=>String(c.id)===contaId)?contaId:'';
  }
  const base=transacoes.filter(t=>!(t.isTransferencia&&t.tipo==='receita'));
  const filtradas=base.filter(t=>{
    if(mes && String(t.data||'').slice(0,7)!==mes)return false;
    if(contaId){
      if(t.isTransferencia){if(String(t.contaOrigemId)!==contaId)return false;}
      else if(String(t.contaId||'')!==contaId)return false;
    }
    return true;
  });
  const receitas=filtradas.filter(t=>t.tipo==='receita'&&!t.isTransferencia).reduce((s,t)=>s+(+t.valor||0),0);
  const despesas=filtradas.filter(t=>t.tipo==='despesa').reduce((s,t)=>s+(+t.valor||0),0);
  const resumo=document.getElementById('tx-filtro-resumo');
  if(resumo)resumo.textContent=`${filtradas.length} ${filtradas.length===1?'movimento encontrado':'movimentos encontrados'}`;
  const totais=document.getElementById('tx-filtro-totais');
  if(totais)totais.innerHTML=`
    <div style="background:var(--bg3);border-radius:var(--radius-sm);padding:9px;min-width:0"><div style="font-size:10px;color:var(--text3)">RECEITAS</div><div class="amount green" style="font-size:13px">€${fmt(receitas)}</div></div>
    <div style="background:var(--bg3);border-radius:var(--radius-sm);padding:9px;min-width:0"><div style="font-size:10px;color:var(--text3)">DESPESAS</div><div class="amount red" style="font-size:13px">€${fmt(despesas)}</div></div>
    <div style="background:var(--bg3);border-radius:var(--radius-sm);padding:9px;min-width:0"><div style="font-size:10px;color:var(--text3)">SALDO</div><div class="amount" style="font-size:13px;color:${receitas-despesas>=0?'var(--green)':'var(--red)'}">€${fmt(receitas-despesas)}</div></div>`;
  if(!filtradas.length){
    el.innerHTML='<div style="color:var(--text3);padding:8px 0;font-size:13px">Nenhuma transação corresponde aos filtros selecionados.</div>';
    return;
  }
  const visiveis=filtradas.slice(0,txMostrar);
  el.innerHTML=visiveis.map(t=>{
    const conta=t.contaId?contas.find(c=>c.id===t.contaId):null;
    if(t.isTransferencia){
      const o=contas.find(c=>c.id===t.contaOrigemId),d=contas.find(c=>c.id===t.contaDestinoId);
      return`<div class="row" id="tx-row-${t.id}">
      <div class="row-left"><span class="dot" style="background:${CAT_DOT['Transferência']}"></span>
        <div><div>${escapeCal(t.desc||'Transferência')}</div>
        <div class="sub">Transferência · ${new Date(t.data).toLocaleDateString('pt-PT')} · <span style="color:var(--blue)">${escapeCal(o?o.nome:'?')} → ${escapeCal(d?d.nome:'?')}</span></div></div></div>
      <div style="display:flex;align-items:center;gap:6px">
        <span class="amount" style="color:var(--text2)">€${fmt(t.valor)}</span>
        <button class="btn-del" onclick="delTx(${t.id})" aria-label="Remover"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg></button>
      </div></div>`;
    }
    return`<div class="row" id="tx-row-${t.id}">
      <div class="row-left"><span class="dot" style="background:${CAT_DOT[t.cat]||'#555'}"></span>
        <div><div>${escapeCal(t.desc||t.cat)}</div>
          <div class="sub">${t.cat} · ${new Date(t.data).toLocaleDateString('pt-PT')}${conta?` · <span style="color:var(--blue)">${escapeCal(conta.nome)}</span>`:''}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <span class="amount ${t.tipo==='receita'?'green':'red'}">${t.tipo==='receita'?'+':'-'}€${fmt(t.valor)}</span>
        <button class="btn-del" onclick="editTx(${t.id})" aria-label="Editar"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-1"/><path d="M20.385 6.585a2.1 2.1 0 0 0-2.97-2.97L9 12v3h3l8.385-8.415z"/></svg></button>
        <button class="btn-del" onclick="delTx(${t.id})" aria-label="Remover"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg></button>
      </div>
    </div>`;
  }).join('')+(filtradas.length>visiveis.length?`<div style="text-align:center;padding:14px 0 4px"><button class="btn-ghost" type="button" onclick="txMostrar+=TX_PAGINA;renderTx()">Mostrar mais (${filtradas.length-visiveis.length})</button></div>`:'');
}

function todasCategoriasDespesa(){
  return [...CATS_DESPESA,...CATS_CUSTOM.filter(c=>!CATS_DESPESA.includes(c))].filter(c=>!CATS_REMOVIDAS.includes(c));
}
function renderCategoriasOrc(){
  const lista=todasCategoriasDespesa();
  const el=document.getElementById('orc-categorias');
  if(el)el.innerHTML=lista.map(cat=>`<span class="budget-category-chip"><span>${escapeCal(cat)}</span><button type="button" onclick="remCategoriaOrc('${String(cat).replace(/'/g,"\\'")}')" aria-label="Remover ${escapeCal(cat)}">×</button></span>`).join('');
  const sel=document.getElementById('o-cat');
  if(sel){
    const atual=sel.value;
    sel.innerHTML=lista.map(cat=>`<option>${escapeCal(cat)}</option>`).join('');
    if(lista.includes(atual))sel.value=atual;
  }
}
function addCategoriaOrc(){
  const input=document.getElementById('orc-nova-cat');
  const nome=(input.value||'').trim();
  if(!nome)return;
  if(todasCategoriasDespesa().some(c=>c.toLocaleLowerCase('pt-PT')===nome.toLocaleLowerCase('pt-PT'))){
    alert('Essa categoria já existe.');return;
  }
  CATS_REMOVIDAS=CATS_REMOVIDAS.filter(c=>c.toLocaleLowerCase('pt-PT')!==nome.toLocaleLowerCase('pt-PT'));
  if(!CATS_DESPESA.includes(nome) && !CATS_CUSTOM.includes(nome)) CATS_CUSTOM.push(nome);
  sv('fp_cats_custom',CATS_CUSTOM);
  sv('fp_cats_removidas',CATS_REMOVIDAS);
  input.value='';
  renderCategoriasOrc();
}
function remCategoriaOrc(nome){
  if(!confirm('Remover a categoria «'+nome+'»? Os registos antigos não serão apagados.'))return;
  CATS_CUSTOM=CATS_CUSTOM.filter(c=>c!==nome);
  if(CATS_DESPESA.includes(nome) && !CATS_REMOVIDAS.includes(nome)) CATS_REMOVIDAS.push(nome);
  sv('fp_cats_custom',CATS_CUSTOM);
  sv('fp_cats_removidas',CATS_REMOVIDAS);
  renderCategoriasOrc();
}
function addOrc(){
  const cat=document.getElementById('o-cat').value;
  const lim=parseFloat(document.getElementById('o-lim').value);
  if(!lim)return;
  orcamentos[cat]=lim;
  sv('fp_orc',orcamentos);
  document.getElementById('o-lim').value='';
  renderOrc();
}
function remOrc(cat){
  if(!Object.prototype.hasOwnProperty.call(orcamentos,cat))return;
  if(!confirm('Apagar o limite de orçamento de «'+cat+'»?'))return;
  delete orcamentos[cat];
  sv('fp_orc',orcamentos);
  renderOrc();
  renderDashOrcamento();
  renderDash();
}
function renderOrc(){
  renderCategoriasOrc();
  const txs=mesAtual();
  const el=document.getElementById('orc-barras');
  const cats=Object.keys(orcamentos);
  if(!cats.length){el.innerHTML='<div style="color:var(--text3);font-size:13px">Nenhum limite definido</div>';return;}
  el.innerHTML=cats.map(cat=>{
    const gasto=txs.filter(t=>t.tipo==='despesa'&&t.cat===cat).reduce((s,t)=>s+t.valor,0);
    const lim=orcamentos[cat];
    const pct=Math.min((gasto/lim)*100,100);
    const over=gasto>lim;
    const col=over?'#f06060':pct>75?'#f0b060':'#2dd4a0';
    const excessoPct=lim>0&&over?((gasto-lim)/lim)*100:0;
    return`<div class="prog-wrap">
      <div class="prog-header">
        <span>${escapeCal(cat)}</span>
        <span style="display:flex;align-items:center;gap:10px">
          <span style="color:${col};font-family:var(--mono)">€${fmt(gasto)} / €${fmt(lim)}${over?` · +${excessoPct.toFixed(1).replace('.',',')}% excesso`:''}</span>
          <button class="btn-del" type="button" onclick="remOrc('${String(cat).replace(/'/g,"\\'")}')" aria-label="Apagar limite de ${escapeCal(cat)}" title="Apagar limite" style="color:var(--red);font-size:16px">×</button>
        </span>
      </div>
      <div class="prog-bg"><div class="prog-fill" style="width:${pct}%;background:${col}"></div></div>
    </div>`;
  }).join('');
}

