# Supplementary Material: Biometric Validation and Statistical Analysis

This directory contains the reproducible scripts, open datasets, and high-resolution figures (300 DPI) supporting the scientific paper:

> **Biokuri Cubagem Florestal: Aplicação Web Progressiva (PWA) Offline-First para Dendrometria, Controle Logístico de Pátio e Cadeia de Custódia da Madeira**  
> *Author:* Lucas Aøsf (Biokuri · Pesquisa e Soluções Ambientais)  
> *Repository:* https://github.com/lucasaosf/cubagem-florestal  

---

## 📁 Directory Structure

```text
supplementary/
├── scripts/
│   └── analise_eficacia_biometria.R                  # Full R script (data loading, statistics, and ggplot2 figures)
├── data/
│   ├── dados_operacionais_toras_validacao.csv        # Dataset with 60 commercial logs for volumetric accuracy validation
│   └── dados_balanco_patio_km.csv                    # Dataset with yard balance and species breakdown along BR-153
├── figures/
│   ├── Fig1_Acuracia_Volumetrica_300DPI.png          # Fig. 1: Volume correlation and 1:1 identity line
│   ├── Fig2_Bland_Altman_Residuos_300DPI.png         # Fig. 2: Bland-Altman agreement plot (±1.96 SD)
│   ├── Fig3_Eficiencia_Operacional_300DPI.png        # Fig. 3: Scaling time per log (conventional vs. Biokuri PWA)
│   ├── Fig4_Balanco_Patio_KM_300DPI.png              # Fig. 4: Operational yard flow and species ratio per KM
│   └── Fig5_Painel_Consolidado_300DPI.png            # Fig. 5: Integrated multi-panel publication figure
└── Apendice_S1_Formulacao_Matematica_e_Metodologia.md # Appendix S1: Detailed mathematical formulations and data dictionary
```

---

## 🔬 How to Reproduce the Analyses in R

The statistical analysis adheres to the methodologies and diagnostic tests described in **Da Silva et al. (2022) - *Análises Ecológicas no R***.

### Prerequisites:
Install R ($\ge 4.4.0$) and required packages:
```r
install.packages(c("ggplot2", "dplyr", "tidyr", "cowplot"))
```

### Running the Script:
Open R or RStudio, set the working directory to this `supplementary` folder, and run:
```r
source("scripts/analise_eficacia_biometria.R")
```
All statistical tests (Shapiro-Wilk, linear regression $R^2$, RMSE, MAE, paired $t$-test, Wilcoxon signed-rank test) will be computed, and all five figures will be exported at 300 DPI into the `figures/` folder.
