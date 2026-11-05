# 🌲 Cubagem Florestal — Aplicativo Android & PWA Offline

> Aplicativo de código aberto para registro, cálculo automático de volume geométrico, gerenciamento e exportação de relatórios em Excel (.xlsx) de caminhões carregados com madeira. Funciona **100% offline em atividades de campo**.

[![PWA Ready](https://img.shields.io/badge/PWA-Ready-1B4D3E?style=flat&logo=pwa)](https://lucasaosf.github.io/cubagem-florestal/)
[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-2D6A4F?style=flat&logo=github)](https://lucasaosf.github.io/cubagem-florestal/)
[![Licença](https://img.shields.io/badge/Licen%C3%A7a-MIT-informational)](./LICENSE)

---

## 📱 Acesso Rápido & Instalação

- **Link do Aplicativo Online:** [https://lucasaosf.github.io/cubagem-florestal/](https://lucasaosf.github.io/cubagem-florestal/)
- **Repositório GitHub:** [https://github.com/lucasaosf/cubagem-florestal](https://github.com/lucasaosf/cubagem-florestal)

### 📲 Como instalar no celular Android:
1. Abra o link acima no navegador **Google Chrome** do celular.
2. Toque no ícone de três pontos no canto superior direito do Chrome.
3. Selecione **"Instalar aplicativo"** ou **"Adicionar à tela inicial"**.
4. O ícone do **Cubagem Florestal** será adicionado à sua tela de aplicativos.
5. Uma vez instalado, o aplicativo funciona **100% sem conexão com a internet** em frentes de trabalho ou áreas remotas.

---

## 📐 Fórmulas Matemáticas e Regras de Cubagem

O sistema calcula com precisão interna total (sem arredondamento preliminar):

### A) Soma das Alturas
$$\text{Soma} = \text{LE1} + \text{LE2} + \text{LE3} + \text{LD1} + \text{LD2} + \text{LD3}$$

### B) Altura Média ($H_m$)
$$H_m = \frac{\text{LE1} + \text{LE2} + \text{LE3} + \text{LD1} + \text{LD2} + \text{LD3}}{6}$$

### C) Volume Geométrico da Carga ($m^3$)
$$\text{Volume Geométrico} = H_m \times \text{Comprimento} \times \text{Largura}$$

> ⚠️ **Importante:** O resultado é rigorosamente identificado como **Volume Geométrico da Carga**, não como volume sólido de madeira.

### Exemplo de Teste Padrão Homologado:
- **LE1:** $1,40\text{ m}$ | **LE2:** $1,40\text{ m}$ | **LE3:** $1,00\text{ m}$
- **LD1:** $1,20\text{ m}$ | **LD2:** $1,10\text{ m}$ | **LD3:** $1,00\text{ m}$
- **Comprimento:** $6,35\text{ m}$ | **Largura:** $2,55\text{ m}$

**Resultados calculados:**
- **Soma das alturas:** $7,10\text{ m}$
- **Altura média ($H_m$):** $1,183333\text{ m}$
- **Volume Geométrico:** $19,16\text{ m}^3$ a $19,17\text{ m}^3$

---

## 🌟 Principais Funcionalidades

### 1. Início (Dashboard Operacional)
- Contadores em tempo real: **Volume total acumulado ($m^3$)**, **Total de caminhões**, **Cubagens registradas hoje** e **Volume médio por carga**.
- Acesso rápido para nova medição e exportação.
- Lista rápida com as últimas cubagens cadastradas.

### 2. Nova Cubagem (Medição de Campo)
- **Preenchimento automático** da data e horário atuais (com possibilidade de correção manual).
- Registro de **Rodovia (BR)**, **Quilômetro (Km)**, **Responsável**, **Placa** e **Observações**.
- Inserção das 6 alturas (LE1, LE2, LE3, LD1, LD2, LD3), comprimento e largura.
- Aceitação flexível de números decimais com vírgula ou ponto (ex: `1,40` ou `1.40`).
- **Memória de cálculo interativa em tempo real** exibida antes de salvar.
- Validação automática contra valores nulos, zerados ou negativos.

### 3. Histórico Completo
- Busca dinâmica instantânea por Rodovia (BR), Km, Responsável, Placa ou Data.
- Filtros rápidos por período (Todos, Hoje, Este Mês).
- Visualização de detalhes completos de cada caminhão.
- Edição de cubagens já cadastradas com recálculo automático.
- Exclusão com confirmação de segurança.

### 4. Relatórios & Exportação Excel (.xlsx)
- Seleção livre de período por intervalo de datas (Data Inicial e Data Final).
- Atalhos rápidos: *Mês Atual*, *Mês Anterior*, *Últimos 30 Dias* e *Todos*.
- Totalizadores do período: caminhões filtrados, volume acumulado e média por caminhão.
- Pré-visualização dos registros selecionados.
- Geração local e offline de planilha Excel (.xlsx) profissional com **identidade visual corporativa**:
  - Cabeçalho padronizado;
  - Resumo de indicadores no topo (Cards com Total de Caminhões, Volume Total e Médias);
  - Agrupamento em dois níveis de colunas (Operação, Alturas LE, Alturas LD, Estatísticas, Dimensões e Volume);
  - Fórmulas dinâmicas integradas (`=SUM(...)`, `=AVERAGE(...)`);
  - Destaque visual na coluna de resultado de Volume Geométrico;
  - Formato adaptado para impressão e documentação técnica.

### 5. Configurações & Backup
- **Exportação de backup completo em JSON** com todos os registros e configurações.
- **Restauração de backup JSON** com validação de dados e opção de mesclagem.
- Definição de **Responsável Padrão** e **Rodovia Usual** para agilizar novas medições.
- Monitor de conexão online / offline.

---

## 🛠️ Tecnologias Utilizadas

- **HTML5 & CSS3** moderno com design system florestal (Mobile First, botões grandes para campo).
- **JavaScript Moderno (ES6+)** modular e puro (sem dependência de frameworks pesados).
- **Progressive Web App (PWA)** com Web App Manifest e Service Worker para cache 100% offline.
- **IndexedDB** nativo para persistência robusta dos dados no próprio aparelho celular.
- **ExcelJS** local (`vendor/exceljs.min.js`) para geração de arquivos `.xlsx` nativos e estilizados sem internet.

---

## 📁 Estrutura do Projeto

```text
cubagem-florestal/
│
├── index.html               # Aplicação SPA (Single Page Application)
├── manifest.webmanifest     # Manifesto PWA para Android
├── sw.js                    # Service Worker (Cache Offline)
├── README.md                # Documentação técnica e manual
├── LICENSE                  # Licença de código aberto MIT
│
├── css/
│   └── styles.css           # Estilos responsivos e identidade visual
│
├── js/
│   ├── app.js               # Controlador de interface e navegação
│   ├── db.js                # Camada IndexedDB (CRUD, busca e backup)
│   ├── calculator.js        # Motor matemático de validação e cálculos
│   └── excel-export.js      # Gerador de planilhas Excel formatadas
│
├── icons/
│   ├── favicon.png          # Ícone navegador (48x48)
│   ├── icon-192.png         # Ícone Android PWA (192x192)
│   ├── icon-512.png         # Ícone Splash Screen PWA (512x512)
│   └── logo.svg             # Logotipo vetorial da marca
│
└── vendor/
    └── exceljs.min.js       # Biblioteca local ExcelJS (offline)
```

---

## 🔒 Privacidade e Segurança

Todos os dados coletados em campo ficam armazenados **estritamente na memória local do seu dispositivo (IndexedDB)**. Nenhuma informação de campo, placa ou medição é enviada para servidores externos.

---

## 📄 Licença

Distribuído sob a licença MIT. Consulte o arquivo [LICENSE](./LICENSE) para mais detalhes.
