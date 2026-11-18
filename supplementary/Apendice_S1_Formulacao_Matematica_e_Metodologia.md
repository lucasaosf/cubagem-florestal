# MATERIAL SUPLEMENTAR 1 (APÊNDICE S1)
## Formulação Matemática Detalhada, Protocolos Biométricos e Dicionário de Dados do Aplicativo Biokuri Cubagem Florestal

**Autor:** Lucas Aøsf  
*Biokuri · Pesquisa e Soluções Ambientais*  
E-mail: lucasaosf@gmail.com  
Repositório Aberto: https://github.com/lucasaosf/cubagem-florestal  
Aplicação Web (PWA): https://lucasaosf.github.io/cubagem-florestal/

---

### S1. FORMULAÇÃO MATEMÁTICA DOS MODELOS DE CUBAGEM

#### 1. Método de Smalian (Toras Roliças Individuais)
A cubagem rigorosa analítica pelo método de Smalian assume que o fuste ou torete assemelha-se geometricamente a um parabolóide truncado. O volume sólido ($V_{Smalian}$, em $\text{m}^3$) é calculado pelas áreas transversais das extremidades seccionadas:

$$V_{Smalian} = \left( \frac{g_1 + g_2}{2} \right) \cdot L$$

Onde:
* $g_1 = \frac{\pi \cdot d_1^2}{4} \approx 0{,}785398 \cdot d_1^2$ (área seccional da ponta fina, em $\text{m}^2$);
* $g_2 = \frac{\pi \cdot d_2^2}{4} \approx 0{,}785398 \cdot d_2^2$ (área seccional da ponta grossa, em $\text{m}^2$);
* $d_1$ e $d_2$: diâmetros medidos com suta ou fita diamétrica nas pontas fina e grossa (m);
* $L$: comprimento longitudinal da tora (m).

Expandindo a equação diretamente em função dos diâmetros:

$$V_{Smalian} = \frac{\pi \cdot L}{8} \cdot \left( d_1^2 + d_2^2 \right)$$

O somatório do lote de toras em um pátio ou talhão é obtido por:

$$V_{Lote} = \sum_{j=1}^{n} V_{Smalian, j}$$

---

#### 2. Cubagem Geométrica de Pilhas e Fatores de Conversão
Para toras empilhadas destinadas à celulose, lenha ou cavaco, calcula-se inicialmente o volume aparente ou volume estéreo ($V_{st}$, em $\text{m}^s$):

$$V_{st} = C \cdot H_m \cdot P$$

Onde:
* $C$: comprimento da face da pilha (m);
* $P$: profundidade média da pilha (comprimento dos toretes, em m);
* $H_m$: altura média obtida por amostragem vertical multiponto ao longo da pilha ($k$ alturas):

$$H_m = \frac{1}{k} \sum_{i=1}^{k} h_i$$

A relação entre o volume aparente ($V_{st}$) e o volume sólido real ($V_{sol}$, em $\text{m}^3$) é governada pelo **Fator de Empilhamento ($f_e$)** e pelo **Fator de Cubicação ($f_c$)**:

$$f_e = \frac{V_{st}}{V_{sol}} \quad \Longleftrightarrow \quad f_c = \frac{V_{sol}}{V_{st}} = \frac{1}{f_e}$$

$$V_{sol} = \frac{V_{st}}{f_e} = V_{st} \cdot f_c$$

---

#### 3. Cubagem Bilateral de Caminhões e Cargas Rodoviárias
Devido à inclinação do terreno de carregamento e ao assentamento assimétrico das toras nos fueiros, o aplicativo adota amostragem bilateral independente:

$$H_{m\_caminhao} = \frac{\left( \frac{1}{n_{LE}} \sum_{i=1}^{n_{LE}} h_{LE, i} \right) + \left( \frac{1}{n_{LD}} \sum_{j=1}^{n_{LD}} h_{LD, j} \right)}{2}$$

$$V_{carga} = C_{util} \cdot L_{util} \cdot H_{m\_caminhao}$$

Onde:
* $n_{LE}$ e $n_{LD}$: número de alturas medidas nos lados esquerdo e direito;
* $C_{util}$: comprimento útil da carroceria entre fueiros (m);
* $L_{util}$: largura útil entre fueiros (m).

---

#### 4. Álgebra de Fluxo e Balanço de Pátio por Quilômetro
Para evitar o fenômeno de falso 100% retirado quando cargas não cadastradas saem do talhão, o estoque remanescente no quilômetro $k$ é formulado como:

$$Saldo\_Remanescente_k = \max \left( 0\,,\, \sum E_k - \sum S_{cub, k} \right)$$

Com segregação botânica em tempo real:

$$\%_{Nativa} = \left( \frac{V_{Nativa\_Remanescente}}{Saldo\_Remanescente} \right) \cdot 100$$

$$\%_{Exotica} = \left( \frac{V_{Exotica\_Remanescente}}{Saldo\_Remanescente} \right) \cdot 100$$

---

### S2. DICIONÁRIO DE DADOS DOS ARQUIVOS COMPLEMENTARES

#### Tabela S1. Descrição dos campos de `dados_operacionais_toras_validacao.csv`
* `id`: Identificador sequencial unívoco da tora amostrada (1 a 60).
* `diametro_ponta_fina_m`: Diâmetro médio na extremidade superior da tora (m).
* `diametro_ponta_grossa_m`: Diâmetro médio na extremidade inferior da tora (m).
* `comprimento_m`: Comprimento total da tora seccionada (m).
* `volume_referencia_smalian_m3`: Volume analítico de controle calculado rigorosamente via Smalian ($m^3$).
* `volume_biokuri_app_m3`: Volume processado e armazenado pela aplicação Biokuri ($m^3$).
* `erro_residual_m3`: Diferença residual ($V_{App} - V_{Ref}$, em $m^3$).
* `erro_relativo_percentual`: Erro percentual relativo ($\frac{V_{App} - V_{Ref}}{V_{Ref}} \times 100$).
* `tempo_metodo_convencional_s`: Tempo total de mensuração, anotação em papel e digitação manual (segundos).
* `tempo_biokuri_app_s`: Tempo total de coleta assistida no PWA offline (segundos).
* `grupo_especies`: Classificação taxonômica (Exótica ou Nativa).

#### Tabela S2. Descrição dos campos de `dados_balanco_patio_km.csv`
* `estaca_km`: Identificação do trecho quilométrico da frente de serviço na rodovia BR-153.
* `volume_entrada_m3`: Volume total de toras e pilhas cubadas que deram entrada no pátio ($m^3$).
* `volume_saida_retirado_m3`: Volume total transportado por caminhões com madeira cubada ($m^3$).
* `saldo_remanescente_m3`: Saldo real remanescente em estoque a retirar ($m^3$).
* `porcentagem_exotica`: Proporção de madeira exótica no saldo remanescente (%).
* `porcentagem_nativa`: Proporção de madeira nativa no saldo remanescente (%).

---

### S3. REFERÊNCIAS METODOLÓGICAS
* AVERY, T. E.; BURKHART, H. E. **Forest measurements**. 5. ed. Long Grove: Waveland Press, 2015. 456 p.
* DA SILVA, F. R. et al. **Análises ecológicas no R**. Recife: Nupeea; São Paulo: Canal 6, 2022. 640 p. DOI: 10.52050/9788579175633.
* MACHADO, S. do A.; FIGUEIREDO FILHO, A. **Dendrometria**. 2. ed. Guarapuava: Ed. UNICENTRO, 2006. 316 p.
* SOARES, C. P. B.; PAULA NETO, F. de; SOUZA, A. L. de. **Dendrometria e inventário florestal**. 2. ed. Viçosa, MG: Ed. da UFV, 2011. 272 p.
