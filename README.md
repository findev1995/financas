# fin.pessoal

Aplicação web progressiva para acompanhamento de finanças pessoais. A interface é inteiramente em português e usa uma identidade visual escura com acentos verde-menta.

## Funcionalidades

- Registo de transações, transferências e contas.
- Dashboard com balanço, métricas e gráficos de receitas e despesas.
- Orçamentos mensais por categoria e alertas de limites.
- Metas de poupança, ativos, investimentos e PPR/pensões.
- Créditos, mapa de prestações, simulador de amortizações e previsão de saldo.
- Calendário de custos, subscrições e operações automáticas.
- Exportação e reposição de cópias de segurança.

Os dados são guardados localmente no navegador. Uma limpeza dos dados do site, a utilização de outro navegador ou de outro dispositivo não transfere esses dados automaticamente.

## Instalação e utilização

Não há processo de compilação: a aplicação é estática. Para a abrir localmente, serve a pasta através de um servidor HTTP e acede a `index.html`; não é recomendado abri-la directamente pelo sistema de ficheiros, pois o service worker exige um contexto HTTP(S).

Para publicar no GitHub Pages deste repositório:

1. Extrai o conteúdo desta pasta na raiz do repositório, preservando exactamente as pastas `css/` e `js/`.
2. Activa o GitHub Pages a partir da branch e pasta configuradas para o projecto.
3. Abre a aplicação em `https://findev1995.github.io/financas/` e usa a opção de instalação oferecida pelo navegador, quando disponível.

Estrutura esperada:

```text
.
├── index.html
├── manifest.json
├── icon.svg
├── sw.js
├── css/
│   └── styles.css
└── js/
    ├── core.js
    ├── dashboard.js
    ├── transactions.js
    └── … restantes scripts da aplicação
```

## PWA

O `manifest.json` identifica a aplicação como `fin.pessoal`, abre em modo autónomo e está configurado para a publicação do projecto em `/financas/`. O `sw.js` contém a lista de recursos da cache offline; sempre que forem adicionados, movidos ou renomeados recursos da aplicação, essa lista e o nome da cache devem ser actualizados em conjunto.

O ícone `icon.svg` é utilizado como favicon e ícone PWA. Tem um fundo escuro e um gráfico ascendente verde-menta, em linha com as cores definidas em `styles.css`.

## Desenvolvimento

A aplicação usa JavaScript clássico no navegador, sem framework nem empacotador. A biblioteca Chart.js é carregada a partir de CDN. Ao alterar a interface, preserva a ordem dos scripts em `index.html`, pois o HTML chama várias funções globais directamente.

## Privacidade

Os dados financeiros introduzidos são processados no navegador e persistidos em `localStorage`. Antes de limpar dados do navegador ou mudar de dispositivo, exporta uma cópia de segurança pela área **Backup**.

## Licença

Este repositório não declara actualmente uma licença. Define uma licença antes de redistribuir ou aceitar contribuições externas.
