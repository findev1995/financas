const MESES_SHORT=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MESES_FULL=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const CAT_DOT={Alimentação:'#2dd4a0',Transportes:'#60a0f0',Habitação:'#a090f0',Lazer:'#f0b060',Saúde:'#f06080',Educação:'#80d0f0',Vestuário:'#d0a060',Salário:'#2dd4a0',Subsídio:'#60d0a0',Rendimentos:'#80d060',Reembolso:'#60b0d0',Venda:'#d0c060',Transferência:'#888',Outro:'#555'};
const CATS_DESPESA=['Alimentação','Transportes','Habitação','Lazer','Saúde','Educação','Vestuário','Poupança','Outro'];
let CATS_CUSTOM=[];
let CATS_REMOVIDAS=[];
const CATS_RECEITA=['Salário','Subsídio','Rendimentos','Reembolso','Venda','Outro'];
function optsCat(tipo,sel){
  const lista=tipo==='receita'?CATS_RECEITA:todasCategoriasDespesa();
  const arr=(sel&&!lista.includes(sel))?[...lista,sel]:lista;  // mantém categorias antigas já guardadas
  return arr.map(c=>`<option ${c===sel?'selected':''}>${escapeCal(c)}</option>`).join('');
}
const AT_DOT={Automóvel:'#60a0f0',Imóvel:'#2dd4a0',Equipamento:'#888',Outro:'#f0b060'};
const CR_DOT={'Crédito pessoal':'#f06060','Cartão de crédito':'#f06090','Hipoteca':'#60a0f0','Leasing':'#f0b060',Outro:'#888'};
const CN_DOT={'Conta à ordem':'#60a0f0','Conta poupança':'#2dd4a0','Conta a prazo':'#80d060','Conta cofre':'#a090f0'};
const SUB_COLS={Entretenimento:'#f060c0',Produtividade:'#60a0f0',Saúde:'#2dd4a0',Educação:'#f0b060',Software:'#a090f0',Outro:'#888'};

function ld(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}}
CATS_CUSTOM=ld('fp_cats_custom',[]);
CATS_REMOVIDAS=ld('fp_cats_removidas',[]);
function avisoErro(msg){
  let el=document.getElementById('aviso-gravacao');
  if(!el){
    el=document.createElement('div');
    el.id='aviso-gravacao';
    el.style.cssText='position:fixed;left:12px;right:12px;top:calc(env(safe-area-inset-top,0px) + 12px);z-index:99999;background:#3a1414;color:#ffb4b4;border:1px solid #f06060;border-radius:10px;padding:12px 14px;font-size:14px;line-height:1.4';
    el.onclick=()=>el.remove();
    document.body.appendChild(el);
  }
  el.textContent=msg+' (toca para fechar)';
}
function sv(k,v){
  try{
    localStorage.setItem(k,JSON.stringify(v));
    return true;
  }catch(e){
    avisoErro('ATENÇÃO: não foi possível guardar os dados ('+k+'). Exporta um backup já e liberta espaço.');
    return false;
  }
}
const NF=new Intl.NumberFormat('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2});
const FMT_MES=new Intl.DateTimeFormat('pt-PT',{month:'short',year:'numeric'});
function fmt(n){return NF.format(+(n||0))}
function fmtK(n){n=+(n||0);return n>=1000?(n/1000).toFixed(1)+'K':fmt(n)}


// ── MIGRAÇÃO DE DADOS DE VERSÕES ANTERIORES ──────────────
function migrarDadosAntigos(){
  const mapeamento={
    // chaves antigas -> chaves novas
    'fin_transacoes':'fp_tx',
    'fin_orcamentos':'fp_orc',
    'fin_metas':'fp_metas',
    'fin_creditos':'fp_cred',
    'fin_contas':'fp_contas',
    'fin_ativos':'fp_ativos',
    'fin_investimentos':'fp_inv',
    'fin_pprs':'fp_pprs',
    'bp_creditos':'fp_cred',
    'bp_contas':'fp_contas',
    'bp_ativos':'fp_ativos',
    'bp_investimentos':'fp_inv',
    'bp_pprs':'fp_pprs',
    'bp_metas':'fp_metas',
    'bp2_ativos':'fp_ativos',
    'fp_subs':'fp_subs'
  };
  let migrou=false;
  Object.entries(mapeamento).forEach(([antiga,nova])=>{
    try{
      const dadosAntigos=localStorage.getItem(antiga);
      const dadosNovos=localStorage.getItem(nova);
      if(dadosAntigos&&!dadosNovos){
        localStorage.setItem(nova,dadosAntigos);
        console.log('Migrado:',antiga,'->',nova);
        migrou=true;
      }
    }catch(e){}
  });
  return migrou;
}

// Diagnóstico: mostra todas as chaves fp_* no localStorage
function diagnosticoStorage(){
  const chaves=Object.keys(localStorage).filter(k=>k.startsWith('fp_')||k.startsWith('fin_')||k.startsWith('bp_'));
  const info=chaves.map(k=>{
    try{
      const v=localStorage.getItem(k);
      const parsed=JSON.parse(v);
      const count=Array.isArray(parsed)?parsed.length:typeof parsed==='object'?Object.keys(parsed).length:1;
      return{chave:k,registos:count,bytes:v.length};
    }catch(e){return{chave:k,registos:'?',bytes:0};}
  });
  return info;
}

// Migrar dados de versões anteriores antes de carregar
migrarDadosAntigos();

// Versão do esquema de dados: aumentar SCHEMA_ATUAL e acrescentar um passo em MIGRACOES_SCHEMA quando a estrutura mudar
const SCHEMA_ATUAL=1;
const MIGRACOES_SCHEMA={
  // 2: ()=>{ /* exemplo: transformar dados da versão 1 para a 2 */ }
};
(function(){
  try{
    let v=parseInt(localStorage.getItem('fp_schema'))||0;
    while(v<SCHEMA_ATUAL){
      v++;
      if(MIGRACOES_SCHEMA[v])MIGRACOES_SCHEMA[v]();
    }
    localStorage.setItem('fp_schema',String(SCHEMA_ATUAL));
  }catch(e){}
  // Pede ao browser para não apagar os dados quando houver pouco espaço (ajuda no Safari/iOS)
  try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();}catch(e){}
})();

let transacoes=ld('fp_tx',[]);
let orcamentos=ld('fp_orc',{});
let metas=ld('fp_metas',[]);
let creditos=ld('fp_cred',[]);
let contas=ld('fp_contas',[]);
let ativos=ld('fp_ativos',[]);
let investimentos=ld('fp_inv',[]);
let pprs=ld('fp_pprs',[]);

// Correção única do crédito registado com os dados confirmados pelo utilizador:
// maio foi apenas um período parcial de juros; as prestações regulares começam em junho.
let creditoCorrigido=false;
creditos=creditos.map(c=>{
  if(c.inicio==='2026-05' && +c.divida===25000 && +c.prest===393 && +c.taxa===7.9 && c.jurosInicial===undefined){
    creditoCorrigido=true;
    return {...c,taxa:7.95,jurosInicial:16.56,isJuros:4};
  }
  return c;
});
if(creditoCorrigido) sv('fp_cred',creditos);

const hoje=new Date();
let vYear=hoje.getFullYear(), vMonth=hoje.getMonth();

let dashChart=null;
let catsChart=null;
let evolucaoChart=null;
let subscricoes=ld('fp_subs',[]);
let previsoes=ld('fp_prev',[]);
let calMesAberto=null;
const TX_PAGINA=80;
let txMostrar=TX_PAGINA;

