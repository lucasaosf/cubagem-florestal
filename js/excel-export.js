/**
 * excel-export.js - Geração de planilha Excel personalizada via ExcelJS
 * Identidade Visual Oficial: Pesquisa & Soluções Ambientais — Lucas Aøsf
 * Cores: Verde-Floresta, Creme, Sálvia, Bronze e Ouro (Century Gothic + Garamond)
 */

// Logotipo oficial em base64 (logo-planilha.png)
const LOGO_PLANILHA_B64 = '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';

class CubagemExcelExport {
  static formatDateBR(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  /**
   * Exporta a planilha Excel completa com a identidade visual de Lucas Aøsf
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
    workbook.creator = 'Lucas Aøsf - Pesquisa & Soluções Ambientais';
    workbook.lastModifiedBy = responsavel || 'Lucas Aøsf';
    workbook.created = new Date();
    workbook.modified = new Date();

    const worksheet = workbook.addWorksheet('Cubagem Florestal', {
      views: [{ showGridLines: true }],
      pageSetup: {
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        paperSize: 9 // A4
      }
    });

    // Paleta Oficial: Pesquisa & Soluções Ambientais (Lucas Aøsf)
    const C = {
      verde: '13301A',      // Verde floresta escuro institucional
      verde2: '173A1E',     // Verde floresta médio
      bronze: 'A88552',     // Bronze elegante
      salvia: '8FA37F',     // Sálvia suave
      creme: 'FBF8F1',      // Creme claro
      creme2: 'EFE8D8',     // Creme textura
      grupo: 'E2DCCB',      // Fundo agrupador
      linha: 'E2D6BC',      // Borda sutil creme
      texto: '3B3F3A',      // Texto chumbo/cinza quente
      cinza: '899287',      // Texto muted
      branco: 'FFFFFF',
      ouro: 'B08854'        // Destaque dourado
    };

    const FONT_NAME = 'Century Gothic';
    const CONTATO = 'Desenvolvido por Lucas Aøsf  •  (12) 99182-1729  •  lucasaosf@gmail.com  •  CRBio 127233/01-D';

    // Bordas no padrão oficial
    const thinBorder = {
      top: { style: 'thin', color: { argb: C.linha } },
      left: { style: 'thin', color: { argb: C.linha } },
      bottom: { style: 'thin', color: { argb: C.linha } },
      right: { style: 'thin', color: { argb: C.linha } }
    };

    const doubleBottomBorder = {
      top: { style: 'thin', color: { argb: C.bronze } },
      left: { style: 'thin', color: { argb: C.linha } },
      bottom: { style: 'double', color: { argb: C.verde } },
      right: { style: 'thin', color: { argb: C.linha } }
    };

    // Definição das colunas
    worksheet.columns = [
      { key: 'item', width: 7 },         // A: #
      { key: 'id', width: 22 },          // B: ID Registro
      { key: 'data', width: 13 },        // C: Data
      { key: 'horario', width: 10 },     // D: Horário
      { key: 'rodovia', width: 14 },     // E: Rodovia
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

    // Inserção da Logo Oficial (logo-planilha.png)
    try {
      const logoId = workbook.addImage({
        base64: LOGO_PLANILHA_B64,
        extension: 'png'
      });
      worksheet.addImage(logoId, {
        tl: { col: 0.15, row: 0.15 },
        ext: { width: 42, height: 44 }
      });
    } catch (e) {
      console.warn('Não foi possível inserir a logo na planilha:', e);
    }

    // 1. TÍTULO PRINCIPAL (Linha 1)
    worksheet.mergeCells('A1:T1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = '   CUBAGEM FLORESTAL — RELATÓRIO TÉCNICO DE CARGAS DE CAMINHÕES';
    titleCell.font = { name: FONT_NAME, size: 14, bold: true, color: { argb: C.creme } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 36;

    // 2. SUBTÍTULO / METADADOS (Linha 2)
    worksheet.mergeCells('A2:T2');
    const subCell = worksheet.getCell('A2');
    const periodoFormatado = startDate && endDate
      ? `Período: ${this.formatDateBR(startDate)} a ${this.formatDateBR(endDate)}`
      : 'Período Completo (Todos os Registros)';
    const dataEmissao = new Date().toLocaleString('pt-BR');
    subCell.value = `${periodoFormatado}  •  Emitido em: ${dataEmissao}  •  ${CONTATO}`;
    subCell.font = { name: FONT_NAME, size: 9, italic: true, color: { argb: C.creme2 } };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde2 } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(2).height = 20;

    // Linha 3: em branco
    worksheet.getRow(3).height = 8;

    // 3. CARDS DE RESUMO (Linhas 4 e 5)
    // Card 1: Total de Caminhões
    worksheet.mergeCells('B4:D4');
    worksheet.mergeCells('B5:D5');
    const k1Title = worksheet.getCell('B4');
    k1Title.value = 'TOTAL DE CAMINHÕES';
    k1Title.font = { name: FONT_NAME, size: 8, bold: true, color: { argb: C.bronze } };
    k1Title.alignment = { horizontal: 'center', vertical: 'middle' };
    k1Title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.creme2 } };

    const k1Val = worksheet.getCell('B5');
    k1Val.value = records.length;
    k1Val.font = { name: FONT_NAME, size: 16, bold: true, color: { argb: C.verde } };
    k1Val.alignment = { horizontal: 'center', vertical: 'middle' };
    k1Val.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.creme } };

    // Card 2: Volume Total Acumulado
    worksheet.mergeCells('F4:I4');
    worksheet.mergeCells('F5:I5');
    const totalVol = records.reduce((acc, r) => acc + (Number(r.volumeGeometrico) || 0), 0);
    const k2Title = worksheet.getCell('F4');
    k2Title.value = 'VOLUME TOTAL GEOMÉTRICO (m³)';
    k2Title.font = { name: FONT_NAME, size: 8, bold: true, color: { argb: C.bronze } };
    k2Title.alignment = { horizontal: 'center', vertical: 'middle' };
    k2Title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.creme2 } };

    const k2Val = worksheet.getCell('F5');
    k2Val.value = totalVol;
    k2Val.numFmt = '#,##0.00 "m³"';
    k2Val.font = { name: FONT_NAME, size: 16, bold: true, color: { argb: C.verde } };
    k2Val.alignment = { horizontal: 'center', vertical: 'middle' };
    k2Val.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.creme } };

    // Card 3: Média de Volume por Caminhão
    worksheet.mergeCells('K4:N4');
    worksheet.mergeCells('K5:N5');
    const mediaVol = records.length > 0 ? totalVol / records.length : 0;
    const k3Title = worksheet.getCell('K4');
    k3Title.value = 'VOLUME MÉDIO POR CARGA (m³)';
    k3Title.font = { name: FONT_NAME, size: 8, bold: true, color: { argb: C.bronze } };
    k3Title.alignment = { horizontal: 'center', vertical: 'middle' };
    k3Title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.creme2 } };

    const k3Val = worksheet.getCell('K5');
    k3Val.value = mediaVol;
    k3Val.numFmt = '#,##0.00 "m³"';
    k3Val.font = { name: FONT_NAME, size: 16, bold: true, color: { argb: C.verde } };
    k3Val.alignment = { horizontal: 'center', vertical: 'middle' };
    k3Val.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.creme } };

    // Card 4: Responsável Técnico
    worksheet.mergeCells('P4:S4');
    worksheet.mergeCells('P5:S5');
    const k4Title = worksheet.getCell('P4');
    k4Title.value = 'RESPONSÁVEL TÉCNICO';
    k4Title.font = { name: FONT_NAME, size: 8, bold: true, color: { argb: C.bronze } };
    k4Title.alignment = { horizontal: 'center', vertical: 'middle' };
    k4Title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.creme2 } };

    const k4Val = worksheet.getCell('P5');
    k4Val.value = responsavel || (records.length > 0 ? records[0].responsavel : 'Lucas Aøsf');
    k4Val.font = { name: FONT_NAME, size: 12, bold: true, color: { argb: C.verde } };
    k4Val.alignment = { horizontal: 'center', vertical: 'middle' };
    k4Val.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.creme } };

    // Bordas dos cards
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

    worksheet.getRow(6).height = 8;

    // 4. CABEÇALHO AGRUPADO NÍVEL 1 (Linha 7)
    worksheet.getRow(7).height = 22;

    // A7:H7 - IDENTIFICAÇÃO E DADOS DA OPERAÇÃO
    worksheet.mergeCells('A7:H7');
    const g1 = worksheet.getCell('A7');
    g1.value = 'IDENTIFICAÇÃO E DADOS DA OPERAÇÃO';
    g1.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: C.creme } };
    g1.alignment = { horizontal: 'center', vertical: 'middle' };
    g1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };

    // I7:K7 - LADO ESQUERDO
    worksheet.mergeCells('I7:K7');
    const g2 = worksheet.getCell('I7');
    g2.value = 'ALTURAS LADO ESQUERDO (m)';
    g2.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: C.creme } };
    g2.alignment = { horizontal: 'center', vertical: 'middle' };
    g2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde2 } };

    // L7:N7 - LADO DIREITO
    worksheet.mergeCells('L7:N7');
    const g3 = worksheet.getCell('L7');
    g3.value = 'ALTURAS LADO DIREITO (m)';
    g3.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: C.creme } };
    g3.alignment = { horizontal: 'center', vertical: 'middle' };
    g3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde2 } };

    // O7:P7 - ESTATÍSTICA ALTURA
    worksheet.mergeCells('O7:P7');
    const g4 = worksheet.getCell('O7');
    g4.value = 'ESTATÍSTICA ALTURAS';
    g4.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: C.creme } };
    g4.alignment = { horizontal: 'center', vertical: 'middle' };
    g4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };

    // Q7:R7 - DIMENSÕES
    worksheet.mergeCells('Q7:R7');
    const g5 = worksheet.getCell('Q7');
    g5.value = 'DIMENSÕES (m)';
    g5.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: C.creme } };
    g5.alignment = { horizontal: 'center', vertical: 'middle' };
    g5.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde2 } };

    // S7 - RESULTADO
    const g6 = worksheet.getCell('S7');
    g6.value = 'RESULTADO';
    g6.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: C.creme } };
    g6.alignment = { horizontal: 'center', vertical: 'middle' };
    g6.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.ouro } };

    // T7 - NOTAS
    const g7 = worksheet.getCell('T7');
    g7.value = 'OBSERVAÇÕES';
    g7.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: C.creme } };
    g7.alignment = { horizontal: 'center', vertical: 'middle' };
    g7.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde2 } };

    // 5. CABEÇALHO DETALHADO NÍVEL 2 (Linha 8)
    const headerCols = [
      '#', 'ID Registro', 'Data', 'Horário', 'Rodovia', 'Km', 'Responsável', 'Placa',
      'LE 1 (m)', 'LE 2 (m)', 'LE 3 (m)', 'LD 1 (m)', 'LD 2 (m)', 'LD 3 (m)',
      'Soma Alt. (m)', 'Hm Média (m)', 'Comp. (m)', 'Larg. (m)',
      'Vol. Geométrico (m³)', 'Observações de Campo'
    ];

    const row8 = worksheet.getRow(8);
    row8.height = 24;

    headerCols.forEach((colTitle, idx) => {
      const cell = row8.getCell(idx + 1);
      cell.value = colTitle;
      cell.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: C.creme } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = thinBorder;

      if (idx === 18) {
        // Coluna Volume (Dourado Ouro)
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.ouro } };
      } else if (idx >= 8 && idx <= 13) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde2 } };
      } else {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
      }
    });

    // 6. LINHAS DE DADOS (Linha 9 em diante)
    let currentRow = 9;

    records.forEach((record, idx) => {
      const row = worksheet.getRow(currentRow);
      row.height = 19;

      const isEven = idx % 2 === 1;
      const rowBg = isEven ? C.creme2 : C.creme;

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
        idx + 1,
        record.id || `CUB-${idx + 1}`,
        this.formatDateBR(record.data),
        record.horario || '',
        record.rodovia || '',
        record.km !== undefined && record.km !== null ? Number(record.km) : '',
        record.responsavel || '',
        record.placa || '',
        le1, le2, le3, ld1, ld2, ld3,
        soma, hm, comp, larg, vol,
        record.observacoes || ''
      ];

      values.forEach((val, valIdx) => {
        const cell = row.getCell(valIdx + 1);
        cell.value = val;
        cell.border = thinBorder;
        cell.font = { name: FONT_NAME, size: 9, color: { argb: C.texto } };

        if (valIdx === 0) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (valIdx === 1) {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
          cell.font = { name: FONT_NAME, size: 8, color: { argb: C.cinza } };
        } else if (valIdx === 2 || valIdx === 3) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (valIdx === 4 || valIdx === 7) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: C.verde } };
        } else if (valIdx === 5) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0.00';
        } else if (valIdx >= 8 && valIdx <= 17) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0.00';
          if (valIdx === 15) {
            cell.numFmt = '#,##0.0000';
          }
        } else if (valIdx === 18) {
          // Volume Geométrico em Destaque
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0.00';
          cell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.verde } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D6C7A1' } };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }

        if (valIdx !== 18) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
        }
      });

      currentRow++;
    });

    // 7. LINHA DE TOTAIS GERAIS
    const totalsRow = worksheet.getRow(currentRow);
    totalsRow.height = 24;

    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    const totLabel = totalsRow.getCell(1);
    totLabel.value = `TOTAIS GERAIS (${records.length} CARGAS DE CAMINHÕES)`;
    totLabel.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.creme } };
    totLabel.alignment = { horizontal: 'right', vertical: 'middle' };
    totLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };

    for (let c = 1; c <= 20; c++) {
      const cell = totalsRow.getCell(c);
      cell.border = doubleBottomBorder;

      if (c <= 8) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
      } else if (c >= 9 && c <= 14) {
        cell.value = { formula: `AVERAGE(${worksheet.getColumn(c).letter}9:${worksheet.getColumn(c).letter}${currentRow - 1})` };
        cell.numFmt = '#,##0.00';
        cell.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: C.creme } };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde2 } };
      } else if (c === 15) {
        cell.value = { formula: `AVERAGE(O9:O${currentRow - 1})` };
        cell.numFmt = '#,##0.00';
        cell.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: C.creme } };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde2 } };
      } else if (c === 16) {
        cell.value = { formula: `AVERAGE(P9:P${currentRow - 1})` };
        cell.numFmt = '#,##0.0000';
        cell.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: C.creme } };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde2 } };
      } else if (c === 17 || c === 18) {
        cell.value = { formula: `AVERAGE(${worksheet.getColumn(c).letter}9:${worksheet.getColumn(c).letter}${currentRow - 1})` };
        cell.numFmt = '#,##0.00';
        cell.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: C.creme } };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde2 } };
      } else if (c === 19) {
        cell.value = { formula: `SUM(S9:S${currentRow - 1})` };
        cell.numFmt = '#,##0.00';
        cell.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: C.creme } };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.ouro } };
      } else {
        cell.value = '';
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
      }
    }

    // 8. NOTA TÉCNICA E CRÉDITO DO DESENVOLVEDOR
    currentRow += 2;
    worksheet.mergeCells(`A${currentRow}:T${currentRow}`);
    const f1 = worksheet.getCell(`A${currentRow}`);
    f1.value = '* Nota Técnica: Os valores expressam o Volume Geométrico da Carga de madeira (Hm × Comprimento × Largura), não equivalendo ao volume sólido estéreo sem casca.';
    f1.font = { name: FONT_NAME, size: 8, italic: true, color: { argb: C.cinza } };
    f1.alignment = { horizontal: 'left', vertical: 'middle' };

    currentRow++;
    worksheet.mergeCells(`A${currentRow}:T${currentRow}`);
    const f2 = worksheet.getCell(`A${currentRow}`);
    f2.value = `Sistema Cubagem Florestal  •  ${CONTATO}`;
    f2.font = { name: FONT_NAME, size: 8, bold: true, color: { argb: C.bronze } };
    f2.alignment = { horizontal: 'left', vertical: 'middle' };

    // Gera buffer e dispara download
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
      totalVolume: totalVol
    };
  }
}

window.CubagemExcelExport = CubagemExcelExport;
