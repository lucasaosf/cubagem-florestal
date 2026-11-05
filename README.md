# 🌲 Cubagem Florestal — Pesquisa & Soluções Ambientais

> Aplicativo de cubagem florestal para cálculo de **Cargas de Caminhões**, **Pilhas de Madeira** e **Toras Roliças Individuais (Smalian)** com exportação Excel (.xlsx) multipasta. Funciona **100% offline** com suporte a **Modo Claro** e **Modo Escuro**.
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

### 📲 Instalação no Android:
1. Acesse o link acima no **Google Chrome** do celular.
2. Toque nos três pontinhos no canto superior direito do navegador.
3. Selecione **"Instalar aplicativo"** ou **"Adicionar à tela inicial"**.
4. O ícone oficial será adicionado à sua tela de aplicativos e funcionará **100% sem conexão com a internet** em campo.

---

## 🪵 Modalidades de Cubagem

### 1. 🚚 Cargas de Caminhões
- **Medição de Ambos os Lados:** Lado Esquerdo (LE) e Lado Direito (LD).
- **Alturas Dinâmicas:** Adicione (`+ Altura`) ou remova (`-`) alturas conforme a carga exigir (sem limite fixo).
- **Fórmulas:**
  $$H_m = \frac{\sum \text{LE} + \sum \text{LD}}{N_{\text{total}}}$$
  $$\text{Volume Geométrico} = H_m \times \text{Comprimento} \times \text{Largura}$$

### 2. 🪵 Pilhas de Madeira no Pátio / Campo
- **Medição em Uma Face:** Não é necessário medir ambos os lados da pilha.
- **Número Variável de Alturas:** Adicione quantas alturas verticais forem necessárias ao longo do comprimento da pilha.
- **Fórmulas:**
  $$H_m = \frac{\sum A_i}{n}$$
  $$\text{Volume Geométrico (Estéreo)} = H_m \times \text{Comprimento} \times \text{Profundidade / Largura}$$

### 3. 🌲 Toras Roliças Individuais (Fórmula de Smalian)
- **Rastreabilidade:** Controle por **Número da Plaqueta** florestal.
- **Diâmetro das Pontas:** Diâmetro da ponta fina ($d_1$) e da ponta grossa ($d_2$) em centímetros (ou metros).
- **Comprimento:** Comprimento da tora ($L$) em metros.
- **Fórmula Oficial de Smalian:**
  $$g_1 = \frac{\pi \times d_1^2}{4}, \quad g_2 = \frac{\pi \times d_2^2}{4}$$
  $$\text{Volume Smalian} = \frac{g_1 + g_2}{2} \times L$$

---

## 📊 Planilha Excel (.xlsx) Multipasta

O aplicativo gera relatórios em formato `.xlsx` com abas organizadas:
1. **Resumo Geral:** Totalizadores consolidados, volume por modalidade e médias gerais com logotipo oficial no cabeçalho.
2. **Caminhões:** Tabela detalhada de todas as cargas cubadas.
3. **Pilhas de Madeira:** Tabela com identificação de pilha e medição de face única.
4. **Toras Roliças:** Tabela com número da plaqueta, diâmetros das pontas, comprimento e volume Smalian.

---

## 🎨 Identidade Visual (Pesquisa & Soluções Ambientais)

- Padrão oficial de cores: Verde-Floresta (`#13301A`, `#173A1E`), Creme (`#F3EEE3`, `#FBF8F1`), Sálvia (`#8FA37F`) e Ouro/Bronze (`#B08854`, `#A88552`).
- **Modo Claro e Modo Escuro** com alternância no cabeçalho (☀️ / 🌙) e persistência no celular.
- **Logotipos Oficiais:** `logo-creme.png` (modo escuro), `logo-verde.png` (modo claro) e `logo-planilha.png` (Excel).

---

## 👤 Desenvolvedor & Contato

- **Desenvolvido por:** Lucas Aøsf
- **Registro Profissional:** CRBio 127233/01-D
- **E-mail:** lucasaosf@gmail.com
- **WhatsApp/Telefone:** (12) 99182-1729
- **GitHub:** [github.com/lucasaosf/cubagem-florestal](https://github.com/lucasaosf/cubagem-florestal)
