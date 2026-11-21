function delCred(id){creditos=creditos.filter(c=>c.id!==id);sv('fp_cred',creditos);renderCreditos();}

function abrirAmortizacao(id){
  const c=creditos.find(x=>x.id===id);
  const el=document.getElementById('amort-form-'+id);
  if(!c||!el)return;
  const hojeISO=hoje.toISOString().slice(0,10);
  el.innerHTML=`<div class="form-inline" style="margin-top:12px"><div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Registar amortização</div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px"><div class="form-group"><label>Valor (€)</label><input type="number" id="am-valor-${id}" min="0.01" step="0.01" placeholder="0.00"></div><div class="form-group"><label>Data</label><input type="date" id="am-data-${id}" value="${hojeISO}"></div><div class="form-group"><label>Comissão (€)</label><input type="number" id="am-comissao-${id}" value="0" min="0" step="0.01"></div><div class="form-group"><label>Depois da amortização</label><select id="am-modo-${id}"><option value="prazo">Reduzir prazo</option><option value="prestacao">Reduzir prestação</option></select></div></div><div style="display:flex;gap:8px;margin-top:6px"><button class="btn-primary" onclick="guardarAmortizacao(${id})" style="font-size:12px;padding:6px 12px">Guardar amortização</button><button class="btn-ghost" onclick="document.getElementById('amort-form-${id}').innerHTML=''" style="font-size:12px;padding:6px 10px">Cancelar</button></div><div class="sim-note">A amortização reduz o capital em dívida. A comissão é registada no histórico, mas não abate ao capital.</div></div>`;
}
function guardarAmortizacao(id){
  const valor=parseFloat(document.getElementById('am-valor-'+id).value)||0;
  const data=document.getElementById('am-data-'+id).value;
  const comissao=parseFloat(document.getElementById('am-comissao-'+id).value)||0;
  const modo=document.getElementById('am-modo-'+id).value;
  const c=creditos.find(x=>x.id===id);
  if(!c||!valor||!data)return;
  const saldo=estadoCreditoHoje(c).saldo;
  if(valor>saldo){alert(`O valor não pode exceder o capital em dívida (€${fmt(saldo)}).`);return;}
  const amortizacao={id:Date.now(),data,valor,comissao,modo};
  creditos=creditos.map(x=>x.id===id?{...x,amortizacoes:[...(x.amortizacoes||[]),amortizacao]}:x);
  sv('fp_cred',creditos);
  renderCreditos();
}
function apagarAmortizacao(creditoId,amortizacaoId){
  creditos=creditos.map(c=>c.id===creditoId?{...c,amortizacoes:(c.amortizacoes||[]).filter(a=>a.id!==amortizacaoId)}:c);
  sv('fp_cred',creditos);
  renderCreditos();
}

const _planoCache=new Map();
function planoCredito(c){
  const k=JSON.stringify([c.divida,c.taxa,c.prest,c.prazo,c.dia,c.inicio||hoje.getFullYear()+'-'+hoje.getMonth(),c.jurosInicial,c.isJuros,c.amortizacoes,c.ajustesJuros]);
  let p=_planoCache.get(k);
  if(!p){if(_planoCache.size>100)_planoCache.clear();p=calcPlanoCredito(c);_planoCache.set(k,p);}
  return p;
}
function calcPlanoCredito(c){
  const inicio=c.inicio?c.inicio.split('-').map(Number):[hoje.getFullYear(),hoje.getMonth()+1];
  const taxa=(+c.taxa||0)/1200;
  const taxaIS=(c.isJuros===undefined?4:+c.isJuros)/100;
  const dia=Math.max(1,Math.min(31,+c.dia||1));
  let saldo=+c.divida||0;
  const rows=[];
  const amortizacoes=(c.amortizacoes||[]).map(a=>({...a,dataObj:new Date(a.data+'T00:00:00')})).sort((a,b)=>a.dataObj-b.dataObj);
  let proximaAmortizacao=0;
  let prestacaoAtual=+c.prest||0;
  const dataInicial=new Date(inicio[0],inicio[1]-1,Math.min(dia,new Date(inicio[0],inicio[1],0).getDate()));
  const jurosInicial=+c.jurosInicial||0;
  if(jurosInicial>0){
    const selo=+(jurosInicial*taxaIS).toFixed(2);
    rows.push({n:1,data:dataInicial,label:FMT_MES.format(dataInicial),prest:+(jurosInicial+selo).toFixed(2),cap:0,juros:jurosInicial,selo,saldo,inicial:true});
  }
  for(let i=0;i<(+c.prazo||0)&&saldo>0.005;i++){
    const data=new Date(inicio[0],inicio[1]+i,Math.min(dia,new Date(inicio[0],inicio[1]+i+1,0).getDate()));
    const aplicadas=[];
    while(proximaAmortizacao<amortizacoes.length&&amortizacoes[proximaAmortizacao].dataObj<=data){
      const a=amortizacoes[proximaAmortizacao++];
      const valor=Math.min(saldo,+a.valor||0);
      saldo=+Math.max(0,saldo-valor).toFixed(2);
      aplicadas.push({...a,valorAplicado:valor});
      if(a.modo==='prestacao'){
        const restantes=Math.max(1,(+c.prazo||0)-i);
        const taxaEfetiva=taxa*(1+taxaIS);
        prestacaoAtual=taxaEfetiva>0?saldo*taxaEfetiva/(1-Math.pow(1+taxaEfetiva,-restantes)):saldo/restantes;
        prestacaoAtual=+prestacaoAtual.toFixed(2);
      }
    }
    // juros reais do banco, quando o utilizador corrigiu esta prestação (ajustesJuros[nº da prestação])
    const ajusteJ=c.ajustesJuros?c.ajustesJuros[rows.length+1]:undefined;
    const juros=(ajusteJ!==undefined&&ajusteJ!==null&&ajusteJ!=='')?+(+ajusteJ).toFixed(2):+(saldo*taxa).toFixed(2);
    const selo=+(juros*taxaIS).toFixed(2);
    // na última prestação o banco liquida o que restar (incluindo cêntimos de arredondamento)
    const ultima=i===(+c.prazo||0)-1;
    const prestacao=ultima?+(saldo+juros+selo).toFixed(2):Math.min(prestacaoAtual,+(saldo+juros+selo).toFixed(2));
    const capital=+Math.max(0,prestacao-juros-selo).toFixed(2);
    saldo=+Math.max(0,saldo-capital).toFixed(2);
    rows.push({n:rows.length+1,data,label:FMT_MES.format(data),prest:prestacao,cap:capital,juros,selo,saldo,amortizacoes:aplicadas});
    if(!prestacao||capital<=0) break;
  }
  return rows;
}
function estadoCreditoHoje(c){
  const hojeSemHora=new Date(hoje.getFullYear(),hoje.getMonth(),hoje.getDate());
  const plano=planoCredito(c);
  const pagos=plano.filter(r=>r.data<hojeSemHora);
  const futuros=plano.filter(r=>r.data>=hojeSemHora);
  let saldo=pagos.length?pagos[pagos.length-1].saldo:(+c.divida||0);
  const aplicadas=new Set(pagos.flatMap(r=>(r.amortizacoes||[]).map(a=>a.id)));
  (c.amortizacoes||[]).forEach(a=>{
    const data=new Date(a.data+'T00:00:00');
    if(data<=hojeSemHora&&!aplicadas.has(a.id)) saldo=+Math.max(0,saldo-(+a.valor||0)).toFixed(2);
  });
  return {plano,pagos,futuros,saldo};
}
function renderMapaInit(){
  const sel=document.getElementById('mapa-sel');
  sel.innerHTML=creditos.length?creditos.map(c=>`<option value="${c.id}">${escapeCal(c.nome)}</option>`):'<option>Sem créditos</option>';
  renderMapa();
}
let mapaMostrarPagas=false;
function toggleMapaPagas(v){mapaMostrarPagas=!!v;renderMapa();}
function editarJurosMapa(id,n){
  const c=creditos.find(x=>x.id===id);
  if(!c)return;
  const linha=planoCredito(c).find(r=>r.n===n);
  if(!linha||linha.inicial)return;
  const atual=c.ajustesJuros&&c.ajustesJuros[n]!==undefined?c.ajustesJuros[n]:'';
  const txt=prompt('Prestação nº '+n+' ('+linha.label+')\nJuros no mapa: €'+fmt(linha.juros)+(atual!==''?' (corrigido)':'')+'\n\nIndica os juros reais do banco, em euros.\nDeixa vazio para voltar ao cálculo automático.',atual!==''?String(atual).replace('.',','):'');
  if(txt===null)return;
  const limpo=txt.trim().replace(',','.');
  const aj={...(c.ajustesJuros||{})};
  if(limpo===''){delete aj[n];}
  else{
    const v=parseFloat(limpo);
    if(!isFinite(v)||v<0){alert('Valor inválido.');return;}
    aj[n]=+v.toFixed(2);
  }
  c.ajustesJuros=aj;
  sv('fp_cred',creditos);
  renderMapa();
}
function renderMapa(){
  if(!creditos.length){document.getElementById('mapa-metrics').innerHTML='';document.getElementById('mapa-body').innerHTML='';return;}
  const id=parseInt(document.getElementById('mapa-sel').value);
  const c=creditos.find(x=>x.id===id);
  if(!c)return;
  const estado=estadoCreditoHoje(c);
  const rows=estado.futuros;
  const totalJ=rows.reduce((s,r)=>s+r.juros,0);
  const totalIS=rows.reduce((s,r)=>s+(r.selo||0),0);
  const totalPagar=rows.reduce((s,r)=>s+r.prest,0);
  const prestacaoSeguinte=rows[0]?.prest||0;
  const efetiva=estado.saldo>0?(((totalJ+totalIS)/estado.saldo)*100).toFixed(1):0;
  document.getElementById('mapa-metrics').innerHTML=`
    <div class="metric"><div class="metric-label">Capital em dívida hoje</div><div class="metric-value red">€${fmt(estado.saldo)}</div></div>
    <div class="metric"><div class="metric-label">Próxima prestação</div><div class="metric-value amber">€${fmt(prestacaoSeguinte)}</div></div>
    <div class="metric"><div class="metric-label">Total por pagar</div><div class="metric-value red">€${fmt(totalPagar)}</div></div>
    <div class="metric"><div class="metric-label">Juros por pagar</div><div class="metric-value red">€${fmt(totalJ)}</div></div>
    <div class="metric"><div class="metric-label">IS por pagar</div><div class="metric-value red">€${fmt(totalIS)}</div></div>
    <div class="metric"><div class="metric-label">Taxa anual</div><div class="metric-value blue">${c.taxa}%</div></div>
    <div class="metric"><div class="metric-label">Custo real</div><div class="metric-value red">${efetiva}%</div></div>
  `;
  const chk=document.getElementById('mapa-pagas');
  if(chk)chk.checked=mapaMostrarPagas;
  const pagasN=new Set(estado.pagos.map(r=>r.n));
  const linhasTabela=mapaMostrarPagas?estado.plano:rows;
  document.getElementById('mapa-body').innerHTML=linhasTabela.map(r=>{
    const ajustada=!!(c.ajustesJuros&&c.ajustesJuros[r.n]!==undefined&&!r.inicial);
    return`
    <tr class="${r.n===estado.pagos.length+1?'cur':''}${pagasN.has(r.n)?' pago':''}">
      <td>${r.n}</td><td>${r.label}</td>
      <td>€${fmt(r.prest)}</td>
      <td style="color:var(--green)">€${fmt(r.cap)}</td>
      <td style="color:var(--red)${r.inicial?'':';cursor:pointer;text-decoration:underline dotted'}" ${r.inicial?'':`onclick="editarJurosMapa(${c.id},${r.n})"`}>€${fmt(r.juros)}${ajustada?' ✎':''}</td>
      <td style="color:var(--red)">€${fmt(r.selo||0)}</td>
      <td>€${fmt(r.saldo)}</td>
    </tr>`;}).join('');
}

