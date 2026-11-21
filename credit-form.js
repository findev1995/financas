let encargosTemp = [];

function addEncargoTemp(){
  const desc = document.getElementById('e-desc').value.trim();
  const valor = parseFloat(document.getElementById('e-valor').value)||0;
  const tipo = document.getElementById('e-tipo').value;
  if(!desc||!valor) return;
  encargosTemp.push({id:Date.now(), desc, valor, tipo});
  document.getElementById('e-desc').value='';
  document.getElementById('e-valor').value='';
  renderEncargosForm();
}

function removeEncargoTemp(id){
  encargosTemp = encargosTemp.filter(e=>e.id!==id);
  renderEncargosForm();
}

function renderEncargosForm(){
  const el = document.getElementById('lista-encargos-form');
  if(!encargosTemp.length){el.innerHTML='';return;}
  el.innerHTML = encargosTemp.map(e=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:0.5px solid var(--border);font-size:13px">
      <div><span style="font-weight:500">${escapeCal(e.desc)}</span> <span class="pill pill-gray">${e.tipo==='pontual'?'já pago':e.tipo==='diluido'?'na prestação':'anual'}</span></div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-family:var(--mono);color:${e.tipo==='pontual'?'var(--text2)':'var(--amber)'}">€${fmt(e.valor)}</span>
        <button class="btn-del" onclick="removeEncargoTemp(${e.id})"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
      </div>
    </div>`).join('');
}

function addCredito(){
  const nome=document.getElementById('c-nome').value.trim();
  const tipo=document.getElementById('c-tipo').value;
  const divida=parseFloat(document.getElementById('c-divida').value)||0;
  const taxa=parseFloat(document.getElementById('c-taxa').value)||0;
  const prest=parseFloat(document.getElementById('c-prest').value)||0;
  const prazo=parseInt(document.getElementById('c-prazo').value)||0;
  const dia=parseInt(document.getElementById('c-dia').value)||1;
  const inicio=document.getElementById('c-inicio').value;
  const jurosInicial=parseFloat(document.getElementById('c-juros-inic').value)||0;
  const isJuros=parseFloat(document.getElementById('c-is-juros').value)||0;
  const contaId=parseInt(document.getElementById('c-conta').value)||null;
  if(!nome||!divida||!prest||!prazo) return;
  creditos.push({id:Date.now(),nome,tipo,divida,taxa,prest,prazo,dia,inicio,jurosInicial,isJuros,contaId,autoDesde:new Date().toISOString().slice(0,10),encargos:[...encargosTemp]});
  sv('fp_cred',creditos);
  ['c-nome','c-divida','c-taxa','c-prest','c-prazo','c-dia'].forEach(id=>document.getElementById(id).value='');
  encargosTemp=[];
  renderEncargosForm();
  renderCreditos();
  fecharModalCredito();
}

function abrirModalCredito(){
  const modal=document.getElementById('modal-credito');
  if(modal)modal.classList.add('open');
  setTimeout(()=>document.getElementById('c-nome')?.focus(),50);
}
function fecharModalCredito(){
  const modal=document.getElementById('modal-credito');
  if(modal)modal.classList.remove('open');
}

function renderCreditos(){
  const el=document.getElementById('lista-creditos');
  if(!creditos.length){el.innerHTML='<div class="card"><div style="color:var(--text3);font-size:13px">Nenhum crédito</div></div>';return;}
  el.innerHTML=creditos.map(c=>{
    const estado=estadoCreditoHoje(c);
    const encargos=c.encargos||[];
    const totalJ=estado.futuros.reduce((s,r)=>s+r.juros,0);
    const totalIS=estado.futuros.reduce((s,r)=>s+(r.selo||0),0);
    const encArg=encargos.filter(e=>e.tipo==='anual').reduce((s,e)=>s+e.valor,0)*( estado.futuros.length/12);
    const encPont=encargos.filter(e=>e.tipo==='pontual').reduce((s,e)=>s+e.valor,0);
    const encDil=encargos.filter(e=>e.tipo==='diluido').reduce((s,e)=>s+e.valor,0);
    const custoTotal=totalJ+totalIS+encArg+encPont;
    const amortizacoes=c.amortizacoes||[];
    const amortHtml=amortizacoes.length?`<div style="margin-top:12px;padding-top:12px;border-top:0.5px solid var(--border)"><div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Amortizações registadas</div>${amortizacoes.slice().sort((a,b)=>b.data.localeCompare(a.data)).map(a=>`<div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:4px 0"><span>${new Date(a.data+'T00:00:00').toLocaleDateString('pt-PT')} · ${a.modo==='prestacao'?'reduzir prestação':'reduzir prazo'}${a.comissao?` · comissão €${fmt(a.comissao)}`:''}</span><span style="display:flex;align-items:center;gap:6px"><span style="font-family:var(--mono);color:var(--green)">−€${fmt(a.valor)}</span><button class="btn-del" onclick="apagarAmortizacao(${c.id},${a.id})" aria-label="Remover amortização">×</button></span></div>`).join('')}</div>`:'';
    const encHtml=encargos.length?`<div style="margin-top:12px;padding-top:12px;border-top:0.5px solid var(--border)">
      <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Comissões e encargos</div>
      ${encargos.map(e=>`<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0">
        <div><span>${escapeCal(e.desc)}</span> <span class="pill pill-gray" style="font-size:10px">${e.tipo==='pontual'?'já pago':e.tipo==='diluido'?'na prestação':'anual'}</span></div>
        <span style="font-family:var(--mono);color:${e.tipo==='pontual'?'var(--text2)':e.tipo==='diluido'?'var(--amber)':'var(--red)'}">€${fmt(e.valor)}${e.tipo==='anual'?'/ano':''}</span>
      </div>`).join('')}
      ${encDil>0?`<div style="font-size:12px;color:var(--text3);margin-top:4px;font-style:italic">€${fmt(encDil)} já incluído na prestação mensal</div>`:''}
    </div>`:' ';
    return`<div class="card credit-card" id="cred-card-${c.id}">
      <div class="credit-card-head">
        <div style="display:flex;align-items:center;gap:11px;min-width:0">
          <span class="dot" style="background:${CR_DOT[c.tipo]||'#888'};width:9px;height:9px;flex:0 0 9px"></span>
          <div style="min-width:0"><div class="credit-card-title">${escapeCal(c.nome)}</div><div class="credit-card-sub">${c.tipo} · vencimento dia ${c.dia}</div></div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex:0 0 auto">
          <div class="credit-balance" style="color:var(--red)">€ ${fmt(estado.saldo)}</div>
          <button class="btn-del" onclick="editCred(${c.id})" aria-label="Editar"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-1"/><path d="M20.385 6.585a2.1 2.1 0 0 0-2.97-2.97L9 12v3h3l8.385-8.415z"/></svg></button>
          <button class="btn-del" onclick="delCred(${c.id})" aria-label="Remover"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg></button>
        </div>
      </div>
      <div class="credit-stats">
        <div class="credit-stat"><div class="credit-stat-label">Prestação mensal</div><div class="credit-stat-value">€${fmt(c.prest)}</div></div>
        <div class="credit-stat"><div class="credit-stat-label">Taxa anual</div><div class="credit-stat-value">${c.taxa}% a.a.</div></div>
        <div class="credit-stat"><div class="credit-stat-label">Prazo restante</div><div class="credit-stat-value">${estado.futuros.length} meses</div></div>
        <div class="credit-stat"><div class="credit-stat-label">Custo total estimado</div><div class="credit-stat-value" style="color:var(--red)">€${fmt(custoTotal)}</div></div>
      </div>
      <div class="credit-card-actions">
      <button class="btn-primary" onclick="abrirAmortizacao(${c.id})" style="font-size:12px;padding:8px 13px">Amortizar crédito</button>
      <button class="btn-ghost" onclick="irSimular(${c.id})" style="font-size:12px;padding:8px 13px">Simular</button>
      <div id="amort-form-${c.id}"></div>
      </div>
      ${amortHtml}
      ${encHtml}
    </div>`;
  }).join('');
}


function editCred(id){
  const c=creditos.find(x=>x.id===id);
  if(!c)return;
  const S='background:var(--bg3);border:0.5px solid var(--border2);border-radius:var(--radius-sm);color:var(--text);font-family:var(--font);font-size:12px;padding:6px 8px;outline:none;width:100%';
  const tipoOpts=['Crédito pessoal','Cartão de crédito','Hipoteca','Leasing','Outro'].map(v=>`<option ${v===c.tipo?'selected':''}>${v}</option>`).join('');
  const contaOpts='<option value="">— sem conta —</option>'+contas.map(cn=>`<option value="${cn.id}" ${cn.id===c.contaId?'selected':''}>${escapeCal(cn.nome)}</option>`).join('');
  document.getElementById('cred-card-'+id).outerHTML=`<div class="card" id="cred-card-${id}">
    <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Editar crédito</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">NOME</div><input id="ecr-nome-${id}" value="${escapeCal(c.nome)}" style="${S}"></div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">TIPO</div><select id="ecr-tipo-${id}" style="${S}">${tipoOpts}</select></div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">CAPITAL INICIAL (€)</div><input type="number" id="ecr-divida-${id}" value="${c.divida}" style="${S}"></div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">TAXA ANUAL (%)</div><input type="number" id="ecr-taxa-${id}" value="${c.taxa}" style="${S}"></div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">PRESTAÇÃO MENSAL (€)</div><input type="number" id="ecr-prest-${id}" value="${c.prest}" style="${S}"></div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">PRAZO TOTAL (meses)</div><input type="number" id="ecr-prazo-${id}" value="${c.prazo}" style="${S}"></div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">DIA DE VENCIMENTO</div><input type="number" id="ecr-dia-${id}" value="${c.dia}" style="${S}"></div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">MÊS DE INÍCIO</div><input type="month" id="ecr-inicio-${id}" value="${c.inicio||''}" style="${S}"></div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">JUROS NO MÊS INICIAL (€)</div><input type="number" step="0.01" id="ecr-juros-inic-${id}" value="${c.jurosInicial||0}" style="${S}"></div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">IS SOBRE JUROS (%)</div><input type="number" step="0.01" id="ecr-is-juros-${id}" value="${c.isJuros===undefined?4:c.isJuros}" style="${S}"></div>
      <div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">CONTA A DEBITAR</div><select id="ecr-conta-${id}" style="${S}">${contaOpts}</select></div>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn-primary" onclick="saveCred(${id})" style="font-size:12px;padding:6px 14px"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg> Guardar</button>
      <button class="btn-ghost" onclick="renderCreditos()" style="font-size:12px;padding:6px 10px">Cancelar</button>
    </div>
  </div>`;
}
function saveCred(id){
  const nome=document.getElementById('ecr-nome-'+id).value.trim();
  const tipo=document.getElementById('ecr-tipo-'+id).value;
  const divida=parseFloat(document.getElementById('ecr-divida-'+id).value)||0;
  const taxa=parseFloat(document.getElementById('ecr-taxa-'+id).value)||0;
  const prest=parseFloat(document.getElementById('ecr-prest-'+id).value)||0;
  const prazo=parseInt(document.getElementById('ecr-prazo-'+id).value)||0;
  const dia=parseInt(document.getElementById('ecr-dia-'+id).value)||1;
  const inicio=document.getElementById('ecr-inicio-'+id).value;
  const jurosInicial=parseFloat(document.getElementById('ecr-juros-inic-'+id).value)||0;
  const isJuros=parseFloat(document.getElementById('ecr-is-juros-'+id).value)||0;
  const contaId=parseInt(document.getElementById('ecr-conta-'+id).value)||null;
  if(!nome)return;
  creditos=creditos.map(c=>c.id===id?{...c,nome,tipo,divida,taxa,prest,prazo,dia,inicio,jurosInicial,isJuros,contaId}:c);
  sv('fp_cred',creditos);renderCreditos();
}

