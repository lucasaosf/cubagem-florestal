# 🌲 Cubagem Florestal — Pesquisa & Soluções Ambientais

> Aplicativo Android & PWA de código aberto para registro, cálculo de volume geométrico, gerenciamento de dados de campo e exportação de planilhas Excel (.xlsx) de cargas de caminhões de madeira. Funciona **100% offline** com suporte a **Modo Claro** e **Modo Escuro**.
> 
> **Desenvolvido por Lucas Aøsf** (CRBio 127233/01-D).

[![PWA Ready](https://img.shields.io/badge/PWA-100%25%20Offline-13301A?style=flat&logo=pwa)](https://lucasaosf.github.io/cubagem-florestal/)
[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-A88552?style=flat&logo=github)](https://lucasaosf.github.io/cubagem-florestal/)
[![Tema Claro & Escuro](https://img.shields.io/badge/Tema-Claro%20%26%20Escuro-8FA37F?style=flat)](https://lucasaosf.github.io/cubagem-florestal/)
[![Licença MIT](https://img.shields.io/badge/Licen%C3%A7a-MIT-B08854)](./LICENSE)

---

## 📱 Acesso Rápido & Instalação no Celular

- **Link do Aplicativo Online:** [https://lucasaosf.github.io/cubagem-florestal/](https://lucasaosf.github.io/cubagem-florestal/)
- **Repositório GitHub:** [https://github.com/lucasaosf/cubagem-florestal](https://github.com/lucasaosf/cubagem-florestal)

### 📲 Passo a passo de instalação no Android:
1. Abra o link [https://lucasaosf.github.io/cubagem-florestal/](https://lucasaosf.github.io/cubagem-florestal/) no **Google Chrome** do celular.
2. Toque nos três pontinhos no canto superior direito do navegador.
3. Selecione **"Instalar aplicativo"** ou **"Adicionar à tela inicial"**.
4. O ícone oficial será adicionado à sua tela de aplicativos.
5. Uma vez instalado, o aplicativo abre instantaneamente e opera **100% sem conexão com a internet** em frentes de serviço e áreas florestais remotas.

---

## 🎨 Identidade Visual & Padrão de Cores

O aplicativo segue rigorosamente a identidade visual institucional de **Pesquisa & Soluções Ambientais** (mesmo padrão da [Caderneta de Campo](https://github.com/lucasaosf/caderneta-de-campo)):

- **Tipografia:** `Cormorant Garamond` (Títulos e display) + `Jost` (Interface e números) + `Century Gothic` (Planilha Excel).
- **Logotipos Oficiais:**
  - `logo-creme.png`: exibido no Modo Escuro.
  - `logo-verde.png`: exibido no Modo Claro.
  - `logo-planilha.png`: incorporado no cabeçalho dos relatórios Excel gerados.
- **Paleta de Cores:**
  - Verde-Floresta: `#13301A` e `#173A1E`
  - Creme Suave: `#F3EEE3`, `#FBF8F1` e `#EEE8DA`
  - Sálvia: `#8FA37F` e `#B2C2A5`
  - Bronze & Ouro: `#A88552`, `#86602E` e `#B08854`
- **Alternância de Tema:** Botão dedicado no cabeçalho (☀️ Sol / 🌙 Lua) para alternar entre Modo Claro e Modo Escuro com persistência local no dispositivo.

---

## 📐 Fórmulas Matemáticas de Cubagem

O sistema calcula com precisão de ponto flutuante total (sem perdas por arredondamento prévio):

### 1. Soma das 6 Alturas
$$\text{Soma} = \text{LE1} + \text{LE2} + \text{LE3} + \text{LD1} + \text{LD2} + \text{LD3}$$

### 2. Altura Média ($H_m$)
$$H_m = \frac{\text{LE1} + \text{LE2} + \text{LE3} + \text{LD1} + \text{LD2} + \text{LD3}}{6}$$

### 3. Volume Geométrico da Carga ($m^3$)
$$\text{Volume Geométrico} = H_m \times \text{Comprimento} \times \text{Largura}$$

> ⚠️ **Nota Técnica:** O resultado obtido corresponde rigorosamente ao **Volume Geométrico da Carga** (Hm × C × L), não se confundindo com o volume sólido de madeira estéreo sem casca.

---

## 📊 Planilha Excel (.xlsx)

- Geração 100% offline via biblioteca **ExcelJS**.
- Logotipo oficial `logo-planilha.png` inserido diretamente no cabeçalho.
- Cards superiores com resumo: **Total de Caminhões**, **Volume Total Geométrico (m³)**, **Volume Médio por Carga (m³)** e **Responsável Técnico**.
- Cabeçalho hierárquico em 2 níveis (Operação, Alturas LE, Alturas LD, Estatísticas, Dimensões, Resultado e Observações).
- Fórmulas automáticas do Excel (`=AVERAGE` e `=SUM`) na linha de totais gerais.
- Rodapé técnico com assinatura profissional e dados de contato.

---

## 👤 Desenvolvedor & Contato

- **Desenvolvido por:** Lucas Aøsf
- **Registro Profissional:** CRBio 127233/01-D
- **E-mail:** lucasaosf@gmail.com
- **WhatsApp/Telefone:** (12) 99182-1729
- **Instagram:** [@lucas_aosf](https://instagram.com/lucas_aosf)
- **GitHub:** [github.com/lucasaosf](https://github.com/lucasaosf)
