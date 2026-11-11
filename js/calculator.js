/**
 * calculator.js - Motor matemático de cálculo e validação florestal
 * Suporte a:
 * 1. Cargas de Caminhão (LE e LD com número dinâmico de alturas)
 * 2. Pilhas de Madeira (medição de 1 face com número dinâmico de alturas)
 * 3. Toras Roliças Individuais (Fórmula de Smalian: diâmetro das pontas + comprimento + plaqueta)
 * Desenvolvido por Lucas Aøsf
 */

class CubagemCalculator {
  /**
   * Converte string com vírgula ou ponto para float válido
   */
  static parseNumber(value) {
    if (value === null || value === undefined) return NaN;
    if (typeof value === 'number') return isFinite(value) ? value : NaN;

    const sanitized = String(value)
      .trim()
      .replace(/\s+/g, '')
      .replace(',', '.');

    if (sanitized === '') return NaN;
    const num = parseFloat(sanitized);
    return isFinite(num) ? num : NaN;
  }

  /**
   * Formata número para o padrão brasileiro com 2 casas decimais
   */
  static formatNumber(val, decimals = 2) {
    if (val === null || val === undefined || isNaN(val)) return '0,00';
    return Number(val).toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  /**
   * Formata número com precisão estendida (para toras ou memórias)
   */
  static formatPrecision(val, decimals = 4) {
    if (val === null || val === undefined || isNaN(val)) return '0,0000';
    return Number(val).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals
    });
  }

  /**
   * Normaliza diâmetro: se informado em centímetros (ex: 35 ou 40), converte para metros (0.35 ou 0.40)
   */
  static normalizarDiametro(val) {
    const num = this.parseNumber(val);
    if (isNaN(num) || num <= 0) return NaN;
    // Se o valor for maior que 3 metros, trata-se de centímetros
    if (num > 3.0) {
      return num / 100.0;
    }
    return num;
  }

  // =========================================================================
  // 1. CÁLCULO DE CAMINHÃO (LE + LD dinâmicos)
  // =========================================================================
  static calculateCaminhao(measures) {
    const { alturasLE = [], alturasLD = [], comprimentoRaw, larguraRaw } = measures;
    const errors = [];

    const comp = this.parseNumber(comprimentoRaw);
    const larg = this.parseNumber(larguraRaw);

    if (isNaN(comp) || comp <= 0) errors.push('Comprimento da carga deve ser maior que zero.');
    if (isNaN(larg) || larg <= 0) errors.push('Largura da carga deve ser maior que zero.');

    const parsedLE = [];
    alturasLE.forEach((val, i) => {
      const n = this.parseNumber(val);
      if (isNaN(n) || n <= 0) {
        errors.push(`Altura LE ${i + 1} inválida ou não preenchida.`);
      } else {
        parsedLE.push(n);
      }
    });

    const parsedLD = [];
    alturasLD.forEach((val, i) => {
      const n = this.parseNumber(val);
      if (isNaN(n) || n <= 0) {
        errors.push(`Altura LD ${i + 1} inválida ou não preenchida.`);
      } else {
        parsedLD.push(n);
      }
    });

    if (parsedLE.length === 0) errors.push('Informe ao menos uma altura do Lado Esquerdo.');
    if (parsedLD.length === 0) errors.push('Informe ao menos uma altura do Lado Direito.');

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    const somaLE = parsedLE.reduce((a, b) => a + b, 0);
    const somaLD = parsedLD.reduce((a, b) => a + b, 0);
    const somaTotal = somaLE + somaLD;
    const totalAlturas = parsedLE.length + parsedLD.length;
    const alturaMedia = somaTotal / totalAlturas;
    const volumeGeometrico = alturaMedia * comp * larg;

    return {
      isValid: true,
      tipo: 'caminhao',
      alturasLE: parsedLE,
      alturasLD: parsedLD,
      somaAlturas: somaTotal,
      totalAlturas,
      alturaMedia,
      comprimento: comp,
      largura: larg,
      volumeGeometrico,
      tipoVolume: 'Volume Geométrico da Carga',
      display: {
        somaAlturas: this.formatNumber(somaTotal, 2),
        alturaMedia: this.formatNumber(alturaMedia, 2),
        alturaMediaPrecisa: this.formatPrecision(alturaMedia, 6),
        comprimento: this.formatNumber(comp, 2),
        largura: this.formatNumber(larg, 2),
        volumeGeometrico: this.formatNumber(volumeGeometrico, 2),
        totalAlturas: `${totalAlturas} medidas (${parsedLE.length} LE + ${parsedLD.length} LD)`
      },
      memoriaCalculo: [
        `Soma Alturas = LE (${parsedLE.map(v => this.formatNumber(v)).join(' + ')}) + LD (${parsedLD.map(v => this.formatNumber(v)).join(' + ')}) = ${this.formatNumber(somaTotal, 2)} m`,
        `Altura Média (Hm) = ${this.formatNumber(somaTotal, 2)} / ${totalAlturas} = ${this.formatPrecision(alturaMedia, 6)} m`,
        `Volume Geométrico = Hm (${this.formatPrecision(alturaMedia, 4)} m) × C (${this.formatNumber(comp, 2)} m) × L (${this.formatNumber(larg, 2)} m) = ${this.formatNumber(volumeGeometrico, 2)} m³`
      ]
    };
  }

  // =========================================================================
  // 2. CÁLCULO DE PILHA DE MADEIRA (1 lado apenas, alturas dinâmicas)
  // =========================================================================
  static calculatePilha(measures) {
    const { alturas = [], comprimentoRaw, larguraRaw } = measures;
    const errors = [];

    const comp = this.parseNumber(comprimentoRaw);
    const larg = this.parseNumber(larguraRaw);

    if (isNaN(comp) || comp <= 0) errors.push('Comprimento da pilha deve ser maior que zero.');
    if (isNaN(larg) || larg <= 0) errors.push('Largura / Profundidade da pilha deve ser maior que zero.');

    const parsedAlturas = [];
    alturas.forEach((val, i) => {
      const n = this.parseNumber(val);
      if (isNaN(n) || n <= 0) {
        errors.push(`Altura ${i + 1} da pilha inválida ou não preenchida.`);
      } else {
        parsedAlturas.push(n);
      }
    });

    if (parsedAlturas.length === 0) {
      errors.push('Informe ao menos uma altura da pilha.');
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    const somaAlturas = parsedAlturas.reduce((a, b) => a + b, 0);
    const totalAlturas = parsedAlturas.length;
    const alturaMedia = somaAlturas / totalAlturas;
    const volumeGeometrico = alturaMedia * comp * larg;

    return {
      isValid: true,
      tipo: 'pilha',
      alturas: parsedAlturas,
      somaAlturas,
      totalAlturas,
      alturaMedia,
      comprimento: comp,
      largura: larg,
      volumeGeometrico,
      tipoVolume: 'Volume Geométrico (Estéreo) da Pilha',
      display: {
        somaAlturas: this.formatNumber(somaAlturas, 2),
        alturaMedia: this.formatNumber(alturaMedia, 2),
        alturaMediaPrecisa: this.formatPrecision(alturaMedia, 6),
        comprimento: this.formatNumber(comp, 2),
        largura: this.formatNumber(larg, 2),
        volumeGeometrico: this.formatNumber(volumeGeometrico, 2),
        totalAlturas: `${totalAlturas} alturas medidas em uma face`
      },
      memoriaCalculo: [
        `Soma das Alturas da Face = ${parsedAlturas.map(v => this.formatNumber(v)).join(' + ')} = ${this.formatNumber(somaAlturas, 2)} m`,
        `Altura Média (Hm) = ${this.formatNumber(somaAlturas, 2)} / ${totalAlturas} = ${this.formatPrecision(alturaMedia, 6)} m`,
        `Volume Geométrico da Pilha = Hm (${this.formatPrecision(alturaMedia, 4)} m) × C (${this.formatNumber(comp, 2)} m) × L (${this.formatNumber(larg, 2)} m) = ${this.formatNumber(volumeGeometrico, 2)} m³`
      ]
    };
  }

  // =========================================================================
  // 3. CÁLCULO DE TORA INDIVIDUAL (Fórmula de Smalian)
  // =========================================================================
  static calculateTora(measures) {
    const { diametroPonta1Raw, diametroPonta2Raw, comprimentoRaw, plaqueta = '' } = measures;
    const errors = [];

    const d1_m = this.normalizarDiametro(diametroPonta1Raw);
    const d2_m = this.normalizarDiametro(diametroPonta2Raw);
    const comp = this.parseNumber(comprimentoRaw);

    if (isNaN(d1_m) || d1_m <= 0) errors.push('Diâmetro da ponta 1 deve ser maior que zero.');
    if (isNaN(d2_m) || d2_m <= 0) errors.push('Diâmetro da ponta 2 deve ser maior que zero.');
    if (isNaN(comp) || comp <= 0) errors.push('Comprimento da tora deve ser maior que zero.');

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    // Fórmula de Smalian:
    // Área seccional ponta 1: g1 = (PI * d1^2) / 4
    // Área seccional ponta 2: g2 = (PI * d2^2) / 4
    // Volume = ((g1 + g2) / 2) * L
    const g1 = (Math.PI * Math.pow(d1_m, 2)) / 4.0;
    const g2 = (Math.PI * Math.pow(d2_m, 2)) / 4.0;
    const volumeGeometrico = ((g1 + g2) / 2.0) * comp;

    const diametroMedio_m = (d1_m + d2_m) / 2.0;
    const d1_cm = d1_m * 100.0;
    const d2_cm = d2_m * 100.0;
    const dm_cm = diametroMedio_m * 100.0;

    return {
      isValid: true,
      tipo: 'tora',
      plaqueta: String(plaqueta).trim() || 'SEM PLAQUETA',
      diametroPonta1_m: d1_m,
      diametroPonta2_m: d2_m,
      diametroPonta1_cm: d1_cm,
      diametroPonta2_cm: d2_cm,
      diametroMedio_cm: dm_cm,
      seccaoPonta1: g1,
      seccaoPonta2: g2,
      comprimento: comp,
      volumeGeometrico,
      tipoVolume: 'Volume de Tora Roliça (Smalian)',
      display: {
        diametroPonta1: `${this.formatNumber(d1_cm, 1)} cm (${this.formatPrecision(d1_m, 3)} m)`,
        diametroPonta2: `${this.formatNumber(d2_cm, 1)} cm (${this.formatPrecision(d2_m, 3)} m)`,
        diametroMedio: `${this.formatNumber(dm_cm, 1)} cm`,
        comprimento: `${this.formatNumber(comp, 2)} m`,
        volumeGeometrico: this.formatNumber(volumeGeometrico, 3),
        volumeGeometricoPreciso: this.formatPrecision(volumeGeometrico, 4)
      },
      memoriaCalculo: [
        `Diâmetros: Ponta 1 = ${this.formatNumber(d1_cm, 1)} cm (${this.formatPrecision(d1_m, 3)} m) | Ponta 2 = ${this.formatNumber(d2_cm, 1)} cm (${this.formatPrecision(d2_m, 3)} m)`,
        `Áreas Basais: g1 = ${this.formatPrecision(g1, 5)} m² | g2 = ${this.formatPrecision(g2, 5)} m²`,
        `Smalian: V = ((g1 + g2) / 2) × L = ((${this.formatPrecision(g1, 4)} + ${this.formatPrecision(g2, 4)}) / 2) × ${this.formatNumber(comp, 2)} = ${this.formatPrecision(volumeGeometrico, 4)} m³`
      ]
    };
  }

  // =========================================================================
  // 4. CÁLCULO DE PILHA / LOTE DE TORAS (Agrupamento e Soma de Múltiplos Indivíduos)
  // =========================================================================
  static calculateLoteToras(toras) {
    if (!Array.isArray(toras) || toras.length === 0) {
      return {
        isValid: false,
        totalToras: 0,
        volumeTotal: 0,
        volumeGeometrico: 0,
        diametroMedio: 0,
        diametroMedio_cm: 0,
        comprimentoMedio: 0,
        display: {
          volumeTotal: '0,000',
          volumeGeometrico: '0,000',
          volumeTotalPreciso: '0,0000',
          totalToras: '0 toras',
          diametroMedio: '0,0 cm',
          comprimentoMedio: '0,00 m'
        }
      };
    }

    let somaVolume = 0;
    let somaDm = 0;
    let somaComp = 0;

    toras.forEach((t) => {
      somaVolume += Number(t.volumeGeometrico) || 0;
      somaDm += Number(t.diametroMedio_cm) || 0;
      somaComp += Number(t.comprimento) || 0;
    });

    const totalToras = toras.length;
    const dmGeral = somaDm / totalToras;
    const compMedio = somaComp / totalToras;

    const volFmt = this.formatNumber(somaVolume, 3);
    const dmFmt = `${this.formatNumber(dmGeral, 1)} cm`;
    const compFmt = `${this.formatNumber(compMedio, 2)} m`;

    return {
      isValid: true,
      tipo: 'tora',
      totalToras,
      volumeTotal: somaVolume,
      volumeGeometrico: somaVolume,
      diametroMedio: dmGeral,
      diametroMedio_cm: dmGeral,
      comprimentoMedio: compMedio,
      display: {
        volumeTotal: volFmt,
        volumeGeometrico: volFmt,
        volumeTotalPreciso: this.formatPrecision(somaVolume, 4),
        totalToras: `${totalToras} ${totalToras === 1 ? 'tora' : 'toras'}`,
        diametroMedio: dmFmt,
        comprimentoMedio: compFmt
      },
      memoriaCalculo: [
        `Pilha / Carga de Toras: Total de ${totalToras} indivíduos mensurados`,
        `Diâmetro Médio: ${dmFmt} | Comprimento Médio: ${compFmt}`,
        `Volume Total Acumulado (Smalian) = ${volFmt} m³`
      ]
    };
  }

  /**
   * Ponto de entrada genérico para cálculo dependente do tipo
   */
  static calculate(type, data) {
    if (type === 'pilha') {
      return this.calculatePilha(data);
    } else if (type === 'tora') {
      return this.calculateTora(data);
    } else {
      return this.calculateCaminhao(data);
    }
  }
}

window.CubagemCalculator = CubagemCalculator;
