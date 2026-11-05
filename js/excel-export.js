/**
 * excel-export.js - Geração de planilha Excel personalizada e profissional via ExcelJS
 * Fidelidade visual total ao modelo do usuário
 */

class CubagemExcelExport {
  /**
   * Converte data ISO YYYY-MM-DD para DD/MM/AAAA
   */
  static formatDateBR(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  /**
   * Gera e baixa a planilha Excel completa com a identidade visual preservada
   */
  static async exportWorkbook(records, options = {}) {
    if (!window.ExcelJS) {
      throw new Error('Biblioteca ExcelJS não carregada.');
    }

    const {
      startDate = '',
      endDate = '',
      fileName = '',
      responsavel = ''
    } = options;

    const workbook = new window.ExcelJS.Workbook();
    workbook.creator = 'Cubagem Florestal';
    workbook.lastModifiedBy = responsavel || 'Cubagem Florestal';
    workbook.created = new Date();
    workbook.modified = new Date();

    const worksheet = workbook.addWorksheet('Relatório de Cubagem', {
      views: [{ showGridLines: true }],
      pageSetup: {
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        paperSize: 9 // A4
      }
    });

    // Paleta de cores corporativa da identidade visual
    const COLORS = {
      headerDark: '1B4D3E',    // Verde escuro florestal principal
      headerMedium: '2D6A4F',  // Verde médio elegante
      headerSage: '52B788',    // Verde folha de destaque
      kpiCardBg: 'E8F5E9',     // Fundo suave de cards
      stripeBg: 'F7FAFC',      // Zebra listrada suave
      white: 'FFFFFF',
      borderLight: 'CBD5E1',   // Borda cinza suave
      borderMedium: '64748B',  // Borda cinza média
      borderDark: '1B4D3E',    // Borda escura
      volumeHighlight: 'D8F3DC', // Destaque suave na coluna do volume
      darkText: '0F172A',
      mutedText: '475569'
    };

    // Estilos padrão de borda
    const thinBorder = {
      top: { style: 'thin', color: { argb: COLORS.borderLight } },
      left: { style: 'thin', color: { argb: COLORS.borderLight } },
      bottom: { style: 'thin', color: { argb: COLORS.borderLight } },
      right: { style: 'thin', color: { argb: COLORS.borderLight } }
    };

    const doubleBottomBorder = {
      top: { style: 'thin', color: { argb: COLORS.borderMedium } },
      left: { style: 'thin', color: { argb: COLORS.borderLight } },
      bottom: { style: 'double', color: { argb: COLORS.headerDark } },
      right: { style: 'thin', color: { argb: COLORS.borderLight } }
    };

    // Definição das colunas com larguras adequadas
    worksheet.columns = [
      { key: 'item', width: 8 },         // A: #
      { key: 'id', width: 22 },          // B: ID Registro
      { key: 'data', width: 13 },        // C: Data
      { key: 'horario', width: 10 },     // D: Horário
      { key: 'rodovia', width: 14 },     // E: Rodovia (BR)
      { key: 'km', width: 10 },          // F: Km
      { key: 'responsavel', width: 22 }, // G: Responsável
      { key: 'placa', width: 13 },       // H: Placa
      { key: 'le1', width: 10 },         // I: LE1
      { key: 'le2', width: 10 },         // J: LE2
      { key: 'le3', width: 10 },         // K: LE3
      { key: 'ld1', width: 10 },         // L: LD1
      { key: 'ld2', width: 10 },         // M: LD2
      { key: 'ld3', width: 10 },         // N: LD3
      { key: 'soma', width: 14 },        // O: Soma Alturas
      { key: 'hm', width: 14 },          // P: Altura Média
      { key: 'comp', width: 14 },        // Q: Comprimento
      { key: 'larg', width: 14 },        // R: Largura
      { key: 'vol', width: 22 },         // S: Volume Geométrico (m³)
      { key: 'obs', width: 28 }          // T: Observações
    ];

    // 1. TÍTULO PRINCIPAL (Linha 1)
    worksheet.mergeCells('A1:T1');
    const titleRow = worksheet.getCell('A1');
    titleRow.value = 'RELATÓRIO TÉCNICO DE CUBAGEM FLORESTAL — CARGAS DE CAMINHÕES';
    titleRow.font = { name: 'Calibri', size: 16, bold: true, color: { argb: COLORS.white } };
    titleRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.headerDark }
    };
    titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 36;

    // 2. SUBTÍTULO / METADADOS (Linha 2)
    worksheet.mergeCells('A2:T2');
    const subTitleRow = worksheet.getCell('A2');
    const periodoFormatado = startDate && endDate
      ? `Período Amostral: ${this.formatDateBR(startDate)} a ${this.formatDateBR(endDate)}`
      : 'Período Completo (Todos os Registros)';
    const dataEmissao = new Date().toLocaleString('pt-BR');
    subTitleRow.value = `${periodoFormatado} | Emitido em: ${dataEmissao} | Sistema: Cubagem Florestal 100% Offline`;
    subTitleRow.font = { name: 'Calibri', size: 10, italic: true, color: { argb: COLORS.white } };
    subTitleRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.headerMedium }
    };
    subTitleRow.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(2).height = 22;

    // Linha 3: em branco
    worksheet.getRow(3).height = 10;

    // 3. CARDS DE INDICADORES (Linhas 4 e 5)
    // Card 1: Total de Caminhões
    worksheet.mergeCells('B4:D4');
    worksheet.mergeCells('B5:D5');
    const kpi1Title = worksheet.getCell('B4');
    kpi1Title.value = 'TOTAL DE CAMINHÕES';
    kpi1Title.font = { name: 'Calibri', size: 9, bold: true, color: { argb: COLORS.mutedText } };
    kpi1Title.alignment = { horizontal: 'center', vertical: 'middle' };
    kpi1Title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.kpiCardBg } };

    const kpi1Val = worksheet.getCell('B5');
    kpi1Val.value = records.length;
    kpi1Val.font = { name: 'Calibri', size: 16, bold: true, color: { argb: COLORS.headerDark } };
    kpi1Val.alignment = { horizontal: 'center', vertical: 'middle' };
    kpi1Val.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.kpiCardBg } };

    // Card 2: Volume Total Acumulado (m³)
    worksheet.mergeCells('F4:I4');
    worksheet.mergeCells('F5:I5');
    const totalVolSum = records.reduce((acc, r) => acc + (Number(r.volumeGeometrico) || 0), 0);
    const kpi2Title = worksheet.getCell('F4');
    kpi2Title.value = 'VOLUME TOTAL GEOMÉTRICO (m³)';
    kpi2Title.font = { name: 'Calibri', size: 9, bold: true, color: { argb: COLORS.mutedText } };
    kpi2Title.alignment = { horizontal: 'center', vertical: 'middle' };
    kpi2Title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.kpiCardBg } };

    const kpi2Val = worksheet.getCell('F5');
    kpi2Val.value = totalVolSum;
    kpi2Val.numFmt = '#,##0.00 "m³"';
    kpi2Val.font = { name: 'Calibri', size: 16, bold: true, color: { argb: COLORS.headerDark } };
    kpi2Val.alignment = { horizontal: 'center', vertical: 'middle' };
    kpi2Val.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.kpiCardBg } };

    // Card 3: Média de Volume por Caminhão
    worksheet.mergeCells('K4:N4');
    worksheet.mergeCells('K5:N5');
    const mediaVol = records.length > 0 ? totalVolSum / records.length : 0;
    const kpi3Title = worksheet.getCell('K4');
    kpi3Title.value = 'VOLUME MÉDIO POR CAMINHÃO (m³)';
    kpi3Title.font = { name: 'Calibri', size: 9, bold: true, color: { argb: COLORS.mutedText } };
    kpi3Title.alignment = { horizontal: 'center', vertical: 'middle' };
    kpi3Title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.kpiCardBg } };

    const kpi3Val = worksheet.getCell('K5');
    kpi3Val.value = mediaVol;
    kpi3Val.numFmt = '#,##0.00 "m³"';
    kpi3Val.font = { name: 'Calibri', size: 16, bold: true, color: { argb: COLORS.headerDark } };
    kpi3Val.alignment = { horizontal: 'center', vertical: 'middle' };
    kpi3Val.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.kpiCardBg } };

    // Card 4: Responsável / Operação
    worksheet.mergeCells('P4:S4');
    worksheet.mergeCells('P5:S5');
    const kpi4Title = worksheet.getCell('P4');
    kpi4Title.value = 'RESPONSÁVEL / OPERAÇÃO';
    kpi4Title.font = { name: 'Calibri', size: 9, bold: true, color: { argb: COLORS.mutedText } };
    kpi4Title.alignment = { horizontal: 'center', vertical: 'middle' };
    kpi4Title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.kpiCardBg } };

    const kpi4Val = worksheet.getCell('P5');
    kpi4Val.value = responsavel || (records.length > 0 ? records[0].responsavel : 'Equipe de Campo');
    kpi4Val.font = { name: 'Calibri', size: 13, bold: true, color: { argb: COLORS.headerDark } };
    kpi4Val.alignment = { horizontal: 'center', vertical: 'middle' };
    kpi4Val.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.kpiCardBg } };

    // Bordas nos cards
    ['B4:D5', 'F4:I5', 'K4:N5', 'P4:S5'].forEach((range) => {
      const [start, end] = range.split(':');
      const startCol = start.charCodeAt(0) - 64;
      const startRow = parseInt(start.slice(1));
      const endCol = end.charCodeAt(0) - 64;
      const endRow = parseInt(end.slice(1));
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          worksheet.getCell(r, c).border = thinBorder;
        }
      }
    });

    // Linha 6: em branco
    worksheet.getRow(6).height = 10;

    // 4. CABEÇALHO AGRUPADO NÍVEL 1 (Linha 7)
    worksheet.getRow(7).height = 24;

    // A7:H7 - IDENTIFICAÇÃO E DADOS DA OPERAÇÃO
    worksheet.mergeCells('A7:H7');
    const h1Op = worksheet.getCell('A7');
    h1Op.value = 'IDENTIFICAÇÃO E DADOS DA OPERAÇÃO';
    h1Op.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.white } };
    h1Op.alignment = { horizontal: 'center', vertical: 'middle' };
    h1Op.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerDark } };

    // I7:K7 - LADO ESQUERDO (m)
    worksheet.mergeCells('I7:K7');
    const h1Le = worksheet.getCell('I7');
    h1Le.value = 'ALTURAS LADO ESQUERDO (m)';
    h1Le.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.white } };
    h1Le.alignment = { horizontal: 'center', vertical: 'middle' };
    h1Le.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerMedium } };

    // L7:N7 - LADO DIREITO (m)
    worksheet.mergeCells('L7:N7');
    const h1Ld = worksheet.getCell('L7');
    h1Ld.value = 'ALTURAS LADO DIREITO (m)';
    h1Ld.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.white } };
    h1Ld.alignment = { horizontal: 'center', vertical: 'middle' };
    h1Ld.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerMedium } };

    // O7:P7 - ESTATÍSTICA DE ALTURA
    worksheet.mergeCells('O7:P7');
    const h1Hm = worksheet.getCell('O7');
    h1Hm.value = 'ESTATÍSTICA ALTURAS';
    h1Hm.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.white } };
    h1Hm.alignment = { horizontal: 'center', vertical: 'middle' };
    h1Hm.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerDark } };

    // Q7:R7 - DIMENSÕES DA CARGA
    worksheet.mergeCells('Q7:R7');
    const h1Dim = worksheet.getCell('Q7');
    h1Dim.value = 'DIMENSÕES DA CARGA';
    h1Dim.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.white } };
    h1Dim.alignment = { horizontal: 'center', vertical: 'middle' };
    h1Dim.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerMedium } };

    // S7 - RESULTADO FINAL
    const h1Res = worksheet.getCell('S7');
    h1Res.value = 'RESULTADO';
    h1Res.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.white } };
    h1Res.alignment = { horizontal: 'center', vertical: 'middle' };
    h1Res.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerDark } };

    // T7 - NOTAS
    const h1Obs = worksheet.getCell('T7');
    h1Obs.value = 'OBSERVAÇÕES';
    h1Obs.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.white } };
    h1Obs.alignment = { horizontal: 'center', vertical: 'middle' };
    h1Obs.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerMedium } };

    // 5. CABEÇALHO DETALHADO NÍVEL 2 (Linha 8)
    const headerCols = [
      '#',
      'ID Registro',
      'Data',
      'Horário',
      'Rodovia',
      'Km',
      'Responsável',
      'Placa',
      'LE 1 (m)',
      'LE 2 (m)',
      'LE 3 (m)',
      'LD 1 (m)',
      'LD 2 (m)',
      'LD 3 (m)',
      'Soma Alt. (m)',
      'Hm Média (m)',
      'Comp. (m)',
      'Larg. (m)',
      'Vol. Geométrico (m³)',
      'Observações de Campo'
    ];

    const row8 = worksheet.getRow(8);
    row8.height = 26;

    headerCols.forEach((colTitle, idx) => {
      const cell = row8.getCell(idx + 1);
      cell.value = colTitle;
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.white } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      
      // Cores diferenciadas por setor
      if (idx === 18) {
        // Coluna de Volume
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0E3B2F' } };
      } else if (idx >= 8 && idx <= 13) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2D6A4F' } };
      } else {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1B4D3E' } };
      }
      cell.border = thinBorder;
    });

    // 6. LINHAS DE DADOS (A partir da Linha 9)
    let currentRow = 9;

    records.forEach((record, idx) => {
      const row = worksheet.getRow(currentRow);
      row.height = 20;

      const isEven = idx % 2 === 1;
      const rowBgColor = isEven ? COLORS.stripeBg : COLORS.white;

      const le1 = Number(record.le1) || 0;
      const le2 = Number(record.le2) || 0;
      const le3 = Number(record.le3) || 0;
      const ld1 = Number(record.ld1) || 0;
      const ld2 = Number(record.ld2) || 0;
      const ld3 = Number(record.ld3) || 0;
      const soma = Number(record.somaAlturas) || (le1 + le2 + le3 + ld1 + ld2 + ld3);
      const hm = Number(record.alturaMedia) || (soma / 6);
      const comp = Number(record.comprimento) || 0;
      const larg = Number(record.largura) || 0;
      const vol = Number(record.volumeGeometrico) || (hm * comp * larg);

      const values = [
        idx + 1,                                // A: #
        record.id || `CUB-${idx + 1}`,          // B: ID
        this.formatDateBR(record.data),         // C: Data
        record.horario || '',                   // D: Horário
        record.rodovia || '',                   // E: Rodovia
        record.km !== undefined && record.km !== null ? Number(record.km) : '', // F: Km
        record.responsavel || '',               // G: Responsável
        record.placa || '',                     // H: Placa
        le1,                                    // I: LE1
        le2,                                    // J: LE2
        le3,                                    // K: LE3
        ld1,                                    // L: LD1
        ld2,                                    // M: LD2
        ld3,                                    // N: LD3
        soma,                                   // O: Soma
        hm,                                     // P: Hm
        comp,                                   // Q: Comp
        larg,                                   // R: Larg
        vol,                                    // S: Volume
        record.observacoes || ''                // T: Obs
      ];

      values.forEach((val, valIdx) => {
        const cell = row.getCell(valIdx + 1);
        cell.value = val;
        cell.border = thinBorder;
        cell.font = { name: 'Calibri', size: 10 };

        // Formatação específica por coluna
        if (valIdx === 0) {
          // #
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (valIdx === 1) {
          // ID
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
          cell.font = { name: 'Calibri', size: 9, color: { argb: COLORS.mutedText } };
        } else if (valIdx === 2 || valIdx === 3) {
          // Data / Hora
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (valIdx === 4 || valIdx === 7) {
          // BR / Placa
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.font = { name: 'Calibri', size: 10, bold: true };
        } else if (valIdx === 5) {
          // Km
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0.00';
        } else if (valIdx >= 8 && valIdx <= 17) {
          // Medidas numéricas (LE, LD, Soma, Hm, C, L)
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0.00';
          if (valIdx === 15) {
            // Hm Média
            cell.numFmt = '#,##0.0000';
          }
        } else if (valIdx === 18) {
          // Volume Geométrico (DESTACADO)
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0.00';
          cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLORS.headerDark } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.volumeHighlight } };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }

        // Fundo zebra se não for a coluna de volume
        if (valIdx !== 18) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBgColor } };
        }
      });

      currentRow++;
    });

    // 7. LINHA DE TOTAIS E MÉDIAS GERAIS
    const totalsRow = worksheet.getRow(currentRow);
    totalsRow.height = 26;

    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    const totalLabel = totalsRow.getCell(1);
    totalLabel.value = `TOTAIS GERAIS (${records.length} CAMINHÕES REGISTRADOS)`;
    totalLabel.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLORS.white } };
    totalLabel.alignment = { horizontal: 'right', vertical: 'middle' };
    totalLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerDark } };

    // Preenche colunas numéricas de totais
    for (let c = 1; c <= 20; c++) {
      const cell = totalsRow.getCell(c);
      cell.border = doubleBottomBorder;
      if (c <= 8) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerDark } };
      } else if (c >= 9 && c <= 14) {
        // Médias das alturas
        cell.value = {
          formula: `AVERAGE(${worksheet.getColumn(c).letter}9:${worksheet.getColumn(c).letter}${currentRow - 1})`
        };
        cell.numFmt = '#,##0.00';
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.white } };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerMedium } };
      } else if (c === 15) {
        // Soma média
        cell.value = {
          formula: `AVERAGE(O9:O${currentRow - 1})`
        };
        cell.numFmt = '#,##0.00';
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.white } };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerMedium } };
      } else if (c === 16) {
        // Hm médio
        cell.value = {
          formula: `AVERAGE(P9:P${currentRow - 1})`
        };
        cell.numFmt = '#,##0.0000';
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.white } };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerMedium } };
      } else if (c === 17 || c === 18) {
        // Comp / Larg médios
        cell.value = {
          formula: `AVERAGE(${worksheet.getColumn(c).letter}9:${worksheet.getColumn(c).letter}${currentRow - 1})`
        };
        cell.numFmt = '#,##0.00';
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.white } };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerMedium } };
      } else if (c === 19) {
        // SOMA DO VOLUME TOTAL (m³)
        cell.value = {
          formula: `SUM(S9:S${currentRow - 1})`
        };
        cell.numFmt = '#,##0.00';
        cell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: COLORS.white } };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0E3B2F' } };
      } else {
        cell.value = '';
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerDark } };
      }
    }

    // Linha de Rodapé explicativo
    currentRow += 2;
    worksheet.mergeCells(`A${currentRow}:T${currentRow}`);
    const footerCell = worksheet.getCell(`A${currentRow}`);
    footerCell.value = '* Nota Técnica: O resultado apresentado corresponde ao Volume Geométrico da Carga de madeira (Hm × Comprimento × Largura), não equivalendo ao volume sólido estéreo sem casca.';
    footerCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: COLORS.mutedText } };
    footerCell.alignment = { horizontal: 'left', vertical: 'middle' };

    // Gera o buffer e faz o download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const finalFileName = fileName && fileName.trim()
      ? (fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`)
      : `Cubagem_Florestal_${startDate || 'Geral'}_a_${endDate || 'Geral'}.xlsx`;

    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = finalFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);

    return {
      success: true,
      fileName: finalFileName,
      recordsCount: records.length,
      totalVolume: totalVolSum
    };
  }
}

// Disponibiliza no escopo global
window.CubagemExcelExport = CubagemExcelExport;
