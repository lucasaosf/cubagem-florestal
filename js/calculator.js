/**
 * calculator.js - Motor matemático de cálculo e validação da cubagem florestal
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
   * Formata número com mais casas para exibição técnica da memória
   */
  static formatPrecision(val, decimals = 6) {
    if (val === null || val === undefined || isNaN(val)) return '0,000000';
    return Number(val).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals
    });
  }

  /**
   * Valida todas as 8 medidas obrigatórias
   */
  static validate(measures) {
    const fields = [
      { key: 'le1', label: 'LE1 (Esquerdo 1)' },
      { key: 'le2', label: 'LE2 (Esquerdo 2)' },
      { key: 'le3', label: 'LE3 (Esquerdo 3)' },
      { key: 'ld1', label: 'LD1 (Direito 1)' },
      { key: 'ld2', label: 'LD2 (Direito 2)' },
      { key: 'ld3', label: 'LD3 (Direito 3)' },
      { key: 'comprimento', label: 'Comprimento' },
      { key: 'largura', label: 'Largura' }
    ];

    const errors = [];
    const parsed = {};

    for (const f of fields) {
      const val = this.parseNumber(measures[f.key]);
      if (isNaN(val)) {
        errors.push(`Campo obrigatório não preenchido: ${f.label}`);
      } else if (val <= 0) {
        errors.push(`O valor de ${f.label} deve ser maior que zero (valor informado: ${measures[f.key]}).`);
      } else {
        parsed[f.key] = val;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      parsed
    };
  }

  /**
   * Executa os cálculos com precisão máxima sem arredondamento intermediário
   */
  static calculate(measures) {
    const validation = this.validate(measures);
    if (!validation.isValid) {
      return {
        isValid: false,
        errors: validation.errors
      };
    }

    const { le1, le2, le3, ld1, ld2, ld3, comprimento, largura } = validation.parsed;

    // A) Soma das seis alturas
    const somaAlturas = le1 + le2 + le3 + ld1 + ld2 + ld3;

    // B) Altura média (Hm) sem arredondamento
    const alturaMedia = somaAlturas / 6;

    // C) Volume geométrico da carga (m³) = Hm * C * L
    const volumeGeometrico = alturaMedia * comprimento * largura;

    return {
      isValid: true,
      measures: {
        le1,
        le2,
        le3,
        ld1,
        ld2,
        ld3,
        comprimento,
        largura
      },
      somaAlturas,
      alturaMedia,
      volumeGeometrico,
      tipoVolume: 'Volume Geométrico da Carga',
      display: {
        somaAlturas: this.formatNumber(somaAlturas, 2),
        alturaMedia: this.formatNumber(alturaMedia, 2),
        alturaMediaPrecisa: this.formatPrecision(alturaMedia, 6),
        comprimento: this.formatNumber(comprimento, 2),
        largura: this.formatNumber(largura, 2),
        volumeGeometrico: this.formatNumber(volumeGeometrico, 2),
        volumeGeometricoPreciso: this.formatPrecision(volumeGeometrico, 4)
      },
      memoriaCalculo: [
        `Soma das Alturas = LE1 (${this.formatNumber(le1)}) + LE2 (${this.formatNumber(le2)}) + LE3 (${this.formatNumber(le3)}) + LD1 (${this.formatNumber(ld1)}) + LD2 (${this.formatNumber(ld2)}) + LD3 (${this.formatNumber(ld3)}) = ${this.formatNumber(somaAlturas, 2)} m`,
        `Altura Média (Hm) = ${this.formatNumber(somaAlturas, 2)} / 6 = ${this.formatPrecision(alturaMedia, 6)} m`,
        `Volume Geométrico = Hm (${this.formatPrecision(alturaMedia, 4)} m) × C (${this.formatNumber(comprimento, 2)} m) × L (${this.formatNumber(largura, 2)} m) = ${this.formatNumber(volumeGeometrico, 2)} m³`
      ]
    };
  }
}

// Disponibiliza no escopo global
window.CubagemCalculator = CubagemCalculator;
