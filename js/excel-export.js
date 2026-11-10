/**
 * excel-export.js - GeraÃ§Ã£o de planilha Excel multipasta personalizada via ExcelJS
 * Suporte a Cargas de CaminhÃ£o, Pilhas de Madeira e Toras RoliÃ§as (Smalian)
 * Identidade Visual Oficial: Pesquisa & SoluÃ§Ãµes Ambientais â€” Lucas AÃ¸sf
 */

const LOGO_PLANILHA_B64 = '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';

class CubagemExcelExport {
  static formatDateBR(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  }

  static async exportWorkbook(records, options = {}) {
    if (!window.ExcelJS) {
      throw new Error('Biblioteca ExcelJS nÃ£o carregada.');
    }

    const {
      startDate = '',
      endDate = '',
      fileName = '',
      responsavel = ''
    } = options;

    const workbook = new window.ExcelJS.Workbook();
    workbook.creator = 'Lucas AÃ¸sf - Pesquisa & SoluÃ§Ãµes Ambientais';
    workbook.lastModifiedBy = responsavel || 'Lucas AÃ¸sf';
    workbook.created = new Date();
    workbook.modified = new Date();

    const C = {
      verde: '0E2515',
      verde2: '173A1E',
      bronze: 'A88552',
      salvia: '8FA37F',
      creme: 'FBF8F1',
      creme2: 'EFE8D8',
      grupo: 'E2DCCB',
      linha: 'E2D6BC',
      texto: '3B3F3A',
      cinza: '899287',
      branco: 'FFFFFF',
      ouro: '96784A'
    };

    const FONT_NAME = 'Century Gothic';
    const CONTATO = 'Desenvolvido por Lucas AÃ¸sf  â€¢  (12) 99182-1729  â€¢  lucasaosf@gmail.com  â€¢  CRBio 127233/01-D';

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

    // Separar registros por tipo
    const caminhoes = records.filter(r => (r.tipo || 'caminhao') === 'caminhao');
    const pilhas = records.filter(r => r.tipo === 'pilha');
    const toras = records.filter(r => r.tipo === 'tora');

    const sumVol = arr => arr.reduce((acc, x) => {
      if (x.tipo === 'tora' && Array.isArray(x.toras) && x.toras.length > 0) {
        const sumT = x.toras.reduce((s, t) => s + (Number(t.volumeGeometrico) || 0), 0);
        return acc + (Number(x.volumeGeometrico) || sumT);
      }
      return acc + (Number(x.volumeGeometrico) || 0);
    }, 0);

    const vCam = sumVol(caminhoes);
    const vPil = sumVol(pilhas);
    const vTor = sumVol(toras);
    const vTot = vCam + vPil + vTor;

    // =========================================================================
    // ABA 1: RESUMO CONSOLIDADO
    // =========================================================================
    const wsResumo = workbook.addWorksheet('Resumo Geral', {
      views: [{ showGridLines: true }]
    });

    try {
      const logoId = workbook.addImage({ base64: LOGO_PLANILHA_B64, extension: 'png' });
      wsResumo.addImage(logoId, { tl: { col: 0.1, row: 0.1 }, ext: { width: 44, height: 46 } });
    } catch (e) {}

    wsResumo.columns = [
      { key: 'A', width: 28 },
      { key: 'B', width: 20 },
      { key: 'C', width: 24 },
      { key: 'D', width: 24 }
    ];

    const isSingleDay = records.length > 0 && records.every(r => r.data === records[0].data);
    const dayStr = isSingleDay && records[0]?.data ? this.formatDateBR(records[0].data) : '';

    wsResumo.mergeCells('A1:D1');
    const r1 = wsResumo.getCell('A1');
    r1.value = isSingleDay
      ? `   CUBAGEM FLORESTAL — CONSOLIDADO DIÁRIO OFICIAL (${dayStr})`
      : '   CUBAGEM FLORESTAL — RELATÓRIO TÉCNICO GERAL';
    r1.font = { name: FONT_NAME, size: 14, bold: true, color: { argb: C.creme } };
    r1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
    r1.alignment = { vertical: 'middle', horizontal: 'center' };
    wsResumo.getRow(1).height = 36;

    wsResumo.mergeCells('A2:D2');
    const r2 = wsResumo.getCell('A2');
    const perStr = isSingleDay
      ? `Data: ${dayStr}  •  Volume Total Consolidado do Dia: ${vTot.toFixed(2)} m³`
      : (startDate && endDate ? `${this.formatDateBR(startDate)} a ${this.formatDateBR(endDate)}` : 'Período Completo');
    r2.value = `Período: ${perStr}  •  ${CONTATO}`;
    r2.font = { name: FONT_NAME, size: 9, italic: true, color: { argb: C.creme2 } };
    r2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde2 } };
    r2.alignment = { vertical: 'middle', horizontal: 'center' };
    wsResumo.getRow(2).height = 20;

    wsResumo.getRow(3).height = 10;

    // Cabeçalho da Tabela de Resumo
    const resHeaders = ['Modalidade de Cubagem', 'Qtd. Registros', 'Volume Total (m³)', 'Volume Médio (m³)'];
    const r4 = wsResumo.getRow(4);
    r4.height = 24;
    resHeaders.forEach((h, i) => {
      const cell = r4.getCell(i + 1);
      cell.value = h;
      cell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.creme } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
      cell.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle' };
      cell.border = thinBorder;
    });

    const resRows = [
      ['🚚 Cargas de Caminhões', caminhoes.length, vCam, caminhoes.length > 0 ? vCam / caminhoes.length : 0],
      ['🪵 Pilhas de Madeira', pilhas.length, vPil, pilhas.length > 0 ? vPil / pilhas.length : 0],
      ['🌲 Toras Roliças (Smalian)', toras.length, vTor, toras.length > 0 ? vTor / toras.length : 0]
    ];

    let rowIdx = 5;
    resRows.forEach(row => {
      const r = wsResumo.getRow(rowIdx);
      r.height = 20;
      row.forEach((v, i) => {
        const cell = r.getCell(i + 1);
        cell.value = v;
        cell.font = { name: FONT_NAME, size: 10, color: { argb: C.texto } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowIdx % 2 === 0 ? C.creme2 : C.creme } };
        cell.border = thinBorder;
        if (i === 0) cell.alignment = { horizontal: 'left', vertical: 'middle' };
        else if (i === 1) cell.alignment = { horizontal: 'center', vertical: 'middle' };
        else {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0.00';
        }
      });
      rowIdx++;
    });

    // Linha Total Geral do Resumo
    const rTot = wsResumo.getRow(rowIdx);
    rTot.height = 24;
    rTot.getCell(1).value = 'TOTAL CONSOLIDADO';
    rTot.getCell(1).font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.creme } };
    rTot.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
    rTot.getCell(1).border = doubleBottomBorder;

    rTot.getCell(2).value = records.length;
    rTot.getCell(2).font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.creme } };
    rTot.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
    rTot.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    rTot.getCell(2).border = doubleBottomBorder;

    rTot.getCell(3).value = vTot;
    rTot.getCell(3).font = { name: FONT_NAME, size: 11, bold: true, color: { argb: C.creme } };
    rTot.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.ouro } };
    rTot.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
    rTot.getCell(3).numFmt = '#,##0.00 "m³"';
    rTot.getCell(3).border = doubleBottomBorder;

    rTot.getCell(4).value = records.length > 0 ? vTot / records.length : 0;
    rTot.getCell(4).font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.creme } };
    rTot.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
    rTot.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
    rTot.getCell(4).numFmt = '#,##0.00 "m³"';
    rTot.getCell(4).border = doubleBottomBorder;

    // Demonstrativo detalhado das medições selecionadas / do dia
    if (records.length > 0) {
      rowIdx += 2;
      const titTabelaDetalhe = isSingleDay
        ? `DEMONSTRATIVO CONSOLIDADO DO DIA — ${dayStr} (${records.length} MEDIÇÕES)`
        : `DEMONSTRATIVO DAS MEDIÇÕES CONSOLIDADAS NO PERÍODO (${records.length} MEDIÇÕES)`;

      wsResumo.mergeCells(`A${rowIdx}:D${rowIdx}`);
      const hDet = wsResumo.getCell(`A${rowIdx}`);
      hDet.value = titTabelaDetalhe;
      hDet.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: C.creme } };
      hDet.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
      hDet.alignment = { vertical: 'middle', horizontal: 'center' };
      wsResumo.getRow(rowIdx).height = 26;
      rowIdx++;

      const detHeaders = ['Item / Data e Horário', 'Identificação / Placa / Lote', 'Modalidade / Espécie', 'Volume Geométrico (m³)'];
      const rDetH = wsResumo.getRow(rowIdx);
      rDetH.height = 22;
      detHeaders.forEach((h, i) => {
        const cell = rDetH.getCell(i + 1);
        cell.value = h;
        cell.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: C.creme } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde2 } };
        cell.alignment = { horizontal: i === 3 ? 'right' : (i === 1 ? 'center' : 'left'), vertical: 'middle' };
        cell.border = thinBorder;
      });
      rowIdx++;

      records.forEach((rec, idx) => {
        const r = wsResumo.getRow(rowIdx);
        r.height = 20;
        const bg = idx % 2 === 0 ? C.creme : C.creme2;
        const tipoLabel = rec.tipo === 'tora' ? 'Toras (Smalian)' : (rec.tipo === 'pilha' ? 'Pilha de Madeira' : 'Carga Caminhão');
        const identStr = rec.placa || rec.identificacao || rec.plaqueta || `Medição ${idx + 1}`;
        const dtStr = `${this.formatDateBR(rec.data)} ${rec.horario || ''}`;
        const vNum = Number(rec.volumeGeometrico) || 0;
        const isToraRec = rec.tipo === 'tora';

        const vals = [
          `#${idx + 1}  •  ${dtStr}`,
          identStr,
          rec.especie ? `${tipoLabel} (${rec.especie})` : tipoLabel,
          vNum
        ];

        vals.forEach((v, vi) => {
          const cell = r.getCell(vi + 1);
          cell.value = v;
          cell.font = { name: FONT_NAME, size: 9, color: { argb: C.texto } };
          cell.border = thinBorder;
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: vi === 3 ? 'D6C7A1' : bg } };
          if (vi === 0) cell.alignment = { horizontal: 'left', vertical: 'middle' };
          else if (vi === 1) cell.alignment = { horizontal: 'center', vertical: 'middle' };
          else if (vi === 2) cell.alignment = { horizontal: 'left', vertical: 'middle' };
          else {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            cell.numFmt = isToraRec ? '#,##0.000' : '#,##0.00';
            cell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.verde } };
          }
        });
        rowIdx++;
      });

      // Linha Final: TOTAL GERAL DA CUBAGEM (VOLUME TOTAL DO DIA)
      const rTotFinal = wsResumo.getRow(rowIdx);
      rTotFinal.height = 28;

      wsResumo.mergeCells(`A${rowIdx}:C${rowIdx}`);
      const cTotGeralTit = rTotFinal.getCell(1);
      cTotGeralTit.value = isSingleDay
        ? `TOTAL GERAL DA CUBAGEM DO DIA (${records.length} MEDIÇÕES CONSOLIDADAS):`
        : `TOTAL GERAL DA CUBAGEM CONSOLIDADA (${records.length} MEDIÇÕES):`;
      cTotGeralTit.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.creme } };
      cTotGeralTit.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
      cTotGeralTit.alignment = { horizontal: 'right', vertical: 'middle' };
      cTotGeralTit.border = doubleBottomBorder;

      const cTotGeralVal = rTotFinal.getCell(4);
      cTotGeralVal.value = vTot;
      cTotGeralVal.numFmt = '#,##0.00 "m³"';
      cTotGeralVal.font = { name: FONT_NAME, size: 12, bold: true, color: { argb: C.creme } };
      cTotGeralVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.ouro } };
      cTotGeralVal.alignment = { horizontal: 'right', vertical: 'middle' };
      cTotGeralVal.border = doubleBottomBorder;
    }

    // =========================================================================
    // ABA 2: CARGAS DE CAMINHÃ•ES
    // =========================================================================
    if (caminhoes.length > 0 || records.length === 0) {
      const wsCam = workbook.addWorksheet('CaminhÃµes', { views: [{ showGridLines: true }] });
      wsCam.columns = [
        { key: 'num', width: 6 },
        { key: 'id', width: 22 },
        { key: 'data', width: 12 },
        { key: 'horario', width: 9 },
        { key: 'rodovia', width: 16 },
        { key: 'km', width: 14 },
        { key: 'utm', width: 24 },
        { key: 'responsavel', width: 20 },
        { key: 'placa', width: 12 },
        { key: 'origem', width: 15 },
        { key: 'medidasLE', width: 20 },
        { key: 'medidasLD', width: 20 },
        { key: 'soma', width: 14 },
        { key: 'hm', width: 14 },
        { key: 'comp', width: 12 },
        { key: 'larg', width: 12 },
        { key: 'vol', width: 20 },
        { key: 'obs', width: 26 }
      ];

      wsCam.mergeCells('A1:R1');
      const hCam = wsCam.getCell('A1');
      hCam.value = '   CUBAGEM DE CARGAS DE CAMINHÃ•ES (LADO ESQUERDO E DIREITO)';
      hCam.font = { name: FONT_NAME, size: 13, bold: true, color: { argb: C.creme } };
      hCam.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
      hCam.alignment = { vertical: 'middle', horizontal: 'center' };
      wsCam.getRow(1).height = 32;

      const camCols = ['#', 'ID Registro', 'Data', 'HorÃ¡rio', 'Local / PÃ¡tio', 'Km', 'Coordenada UTM', 'ResponsÃ¡vel', 'Placa', 'Origem da Madeira', 'Alturas LE (m)', 'Alturas LD (m)', 'Soma Alt. (m)', 'Hm MÃ©dia (m)', 'Comp. (m)', 'Larg. (m)', 'Vol. GeomÃ©trico (mÂ³)', 'ObservaÃ§Ãµes'];
      const rCamH = wsCam.getRow(2);
      rCamH.height = 24;
      camCols.forEach((col, i) => {
        const c = rCamH.getCell(i + 1);
        c.value = col;
        c.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: C.creme } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i === 16 ? C.ouro : C.verde2 } };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.border = thinBorder;
      });

      let rCamIdx = 3;
      caminhoes.forEach((item, idx) => {
        const row = wsCam.getRow(rCamIdx);
        row.height = 19;
        const bg = idx % 2 === 1 ? C.creme2 : C.creme;

        const leStr = Array.isArray(item.alturasLE) ? item.alturasLE.map(v => Number(v).toFixed(2)).join('; ') : (item.le1 ? `${Number(item.le1).toFixed(2)}; ${Number(item.le2).toFixed(2)}; ${Number(item.le3).toFixed(2)}` : '');
        const ldStr = Array.isArray(item.alturasLD) ? item.alturasLD.map(v => Number(v).toFixed(2)).join('; ') : (item.ld1 ? `${Number(item.ld1).toFixed(2)}; ${Number(item.ld2).toFixed(2)}; ${Number(item.ld3).toFixed(2)}` : '');
        const origBase = item.origemMadeira || 'Nativa';
        const origFinal = item.especie ? `${origBase} (${item.especie})` : origBase;

        const vals = [
          idx + 1, item.id, this.formatDateBR(item.data), item.horario, item.rodovia, item.km || '', item.utm || '',
          item.responsavel, item.placa, origFinal, leStr, ldStr, Number(item.somaAlturas) || 0,
          Number(item.alturaMedia) || 0, Number(item.comprimento) || 0, Number(item.largura) || 0,
          Number(item.volumeGeometrico) || 0, item.observacoes || ''
        ];

        vals.forEach((v, vi) => {
          const c = row.getCell(vi + 1);
          c.value = v;
          c.font = { name: FONT_NAME, size: 9, color: { argb: C.texto } };
          c.border = thinBorder;
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: vi === 16 ? 'D6C7A1' : bg } };
          if (vi === 0 || vi === 2 || vi === 3 || vi === 4 || vi === 5 || vi === 6 || vi === 8 || vi === 9) c.alignment = { horizontal: 'center', vertical: 'middle' };
          else if (vi >= 12 && vi <= 16) {
            c.alignment = { horizontal: 'right', vertical: 'middle' };
            c.numFmt = vi === 13 ? '#,##0.0000' : '#,##0.00';
            if (vi === 16) c.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.verde } };
          } else c.alignment = { horizontal: 'left', vertical: 'middle' };
        });
        rCamIdx++;
      });

      // Linha de TOTAL GERAL de Caminhões
      if (caminhoes.length > 0) {
        const totCamRow = wsCam.getRow(rCamIdx);
        totCamRow.height = 26;
        wsCam.mergeCells(`A${rCamIdx}:P${rCamIdx}`);
        const cTotCamTit = totCamRow.getCell(1);
        cTotCamTit.value = `TOTAL GERAL DE CARGAS DE CAMINHÕES (${caminhoes.length} CARGAS MEDIDAS):`;
        cTotCamTit.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.creme } };
        cTotCamTit.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
        cTotCamTit.alignment = { horizontal: 'right', vertical: 'middle' };
        cTotCamTit.border = doubleBottomBorder;

        const cTotCamVol = totCamRow.getCell(17);
        cTotCamVol.value = vCam;
        cTotCamVol.numFmt = '#,##0.00 "m³"';
        cTotCamVol.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: C.creme } };
        cTotCamVol.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.ouro } };
        cTotCamVol.alignment = { horizontal: 'right', vertical: 'middle' };
        cTotCamVol.border = doubleBottomBorder;

        const cTotCamObs = totCamRow.getCell(18);
        cTotCamObs.value = 'Volume Total Homologado';
        cTotCamObs.font = { name: FONT_NAME, size: 9, bold: true, italic: true, color: { argb: C.creme } };
        cTotCamObs.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
        cTotCamObs.alignment = { horizontal: 'left', vertical: 'middle' };
        cTotCamObs.border = doubleBottomBorder;
      }
    }

    // =========================================================================
    // ABA 3: PILHAS DE MADEIRA (1 face)
    // =========================================================================
    if (pilhas.length > 0) {
      const wsPil = workbook.addWorksheet('Pilhas de Madeira', { views: [{ showGridLines: true }] });
      wsPil.columns = [
        { key: 'num', width: 6 },
        { key: 'id', width: 22 },
        { key: 'data', width: 12 },
        { key: 'horario', width: 9 },
        { key: 'rodovia', width: 16 },
        { key: 'km', width: 14 },
        { key: 'utm', width: 24 },
        { key: 'identificacao', width: 16 },
        { key: 'origem', width: 15 },
        { key: 'responsavel', width: 20 },
        { key: 'alturasFace', width: 26 },
        { key: 'soma', width: 14 },
        { key: 'hm', width: 14 },
        { key: 'comp', width: 14 },
        { key: 'larg', width: 14 },
        { key: 'vol', width: 20 },
        { key: 'obs', width: 26 }
      ];

      wsPil.mergeCells('A1:Q1');
      const hPil = wsPil.getCell('A1');
      hPil.value = '   CUBAGEM DE PILHAS DE MADEIRA (MEDIÃ‡ÃƒO EM UMA FACE)';
      hPil.font = { name: FONT_NAME, size: 13, bold: true, color: { argb: C.creme } };
      hPil.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
      hPil.alignment = { vertical: 'middle', horizontal: 'center' };
      wsPil.getRow(1).height = 32;

      const pilCols = ['#', 'ID Registro', 'Data', 'HorÃ¡rio', 'Local / PÃ¡tio', 'Km', 'Coordenada UTM', 'IdentificaÃ§Ã£o Pilha', 'Origem da Madeira', 'ResponsÃ¡vel', 'Alturas Medidas na Face (m)', 'Soma Alt. (m)', 'Hm MÃ©dia (m)', 'Comprimento (m)', 'Profundidade (m)', 'Vol. EstÃ©reo (mÂ³)', 'ObservaÃ§Ãµes'];
      const rPilH = wsPil.getRow(2);
      rPilH.height = 24;
      pilCols.forEach((col, i) => {
        const c = rPilH.getCell(i + 1);
        c.value = col;
        c.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: C.creme } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i === 15 ? C.ouro : C.verde2 } };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.border = thinBorder;
      });

      let rPilIdx = 3;
      pilhas.forEach((item, idx) => {
        const row = wsPil.getRow(rPilIdx);
        row.height = 19;
        const bg = idx % 2 === 1 ? C.creme2 : C.creme;
        const altStr = Array.isArray(item.alturas) ? item.alturas.map(v => Number(v).toFixed(2)).join('; ') : '';
        const origBasePil = item.origemMadeira || 'Nativa';
        const origFinalPil = item.especie ? `${origBasePil} (${item.especie})` : origBasePil;

        const vals = [
          idx + 1, item.id, this.formatDateBR(item.data), item.horario, item.rodovia, item.km || '', item.utm || '',
          item.identificacao || item.placa || `Pilha ${idx + 1}`, origFinalPil, item.responsavel,
          altStr, Number(item.somaAlturas) || 0, Number(item.alturaMedia) || 0,
          Number(item.comprimento) || 0, Number(item.largura) || 0,
          Number(item.volumeGeometrico) || 0, item.observacoes || ''
        ];

        vals.forEach((v, vi) => {
          const c = row.getCell(vi + 1);
          c.value = v;
          c.font = { name: FONT_NAME, size: 9, color: { argb: C.texto } };
          c.border = thinBorder;
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: vi === 15 ? 'D6C7A1' : bg } };
          if (vi === 0 || vi === 2 || vi === 3 || vi === 4 || vi === 5 || vi === 6 || vi === 7 || vi === 8) c.alignment = { horizontal: 'center', vertical: 'middle' };
          else if (vi >= 11 && vi <= 15) {
            c.alignment = { horizontal: 'right', vertical: 'middle' };
            c.numFmt = vi === 12 ? '#,##0.0000' : '#,##0.00';
            if (vi === 15) c.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.verde } };
          } else c.alignment = { horizontal: 'left', vertical: 'middle' };
        });
        rPilIdx++;
      });

      // Linha de TOTAL GERAL de Pilhas
      const totPilRow = wsPil.getRow(rPilIdx);
      totPilRow.height = 26;
      wsPil.mergeCells(`A${rPilIdx}:O${rPilIdx}`);
      const cTotPilTit = totPilRow.getCell(1);
      cTotPilTit.value = `TOTAL GERAL DE PILHAS DE MADEIRA (${pilhas.length} PILHAS MEDIDAS):`;
      cTotPilTit.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.creme } };
      cTotPilTit.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
      cTotPilTit.alignment = { horizontal: 'right', vertical: 'middle' };
      cTotPilTit.border = doubleBottomBorder;

      const cTotPilVol = totPilRow.getCell(16);
      cTotPilVol.value = vPil;
      cTotPilVol.numFmt = '#,##0.00 "m³"';
      cTotPilVol.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: C.creme } };
      cTotPilVol.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.ouro } };
      cTotPilVol.alignment = { horizontal: 'right', vertical: 'middle' };
      cTotPilVol.border = doubleBottomBorder;

      const cTotPilObs = totPilRow.getCell(17);
      cTotPilObs.value = 'Volume Total Homologado';
      cTotPilObs.font = { name: FONT_NAME, size: 9, bold: true, italic: true, color: { argb: C.creme } };
      cTotPilObs.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
      cTotPilObs.alignment = { horizontal: 'left', vertical: 'middle' };
      cTotPilObs.border = doubleBottomBorder;
    }

    // =========================================================================
    // ABA 4: TORAS ROLIÃ‡AS (Smalian)
    // =========================================================================
    if (toras.length > 0) {
      const wsTor = workbook.addWorksheet('Toras RoliÃ§as', { views: [{ showGridLines: true }] });
      wsTor.columns = [
        { key: 'num', width: 6 },
        { key: 'id', width: 22 },
        { key: 'data', width: 12 },
        { key: 'horario', width: 9 },
        { key: 'plaqueta', width: 16 },
        { key: 'especie', width: 22 },
        { key: 'local', width: 18 },
        { key: 'km', width: 14 },
        { key: 'utm', width: 24 },
        { key: 'responsavel', width: 20 },
        { key: 'd1_cm', width: 15 },
        { key: 'd2_cm', width: 15 },
        { key: 'dm_cm', width: 15 },
        { key: 'comp', width: 15 },
        { key: 'vol_smalian', width: 20 },
        { key: 'obs', width: 28 }
      ];

      wsTor.mergeCells('A1:P1');
      const hTor = wsTor.getCell('A1');
      hTor.value = '   CUBAGEM DE TORAS ROLIÃ‡AS INDIVIDUAIS (FÃ“RMULA DE SMALIAN)';
      hTor.font = { name: FONT_NAME, size: 13, bold: true, color: { argb: C.creme } };
      hTor.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
      hTor.alignment = { vertical: 'middle', horizontal: 'center' };
      wsTor.getRow(1).height = 32;

      const torCols = [
        '#', 'IdentificaÃ§Ã£o Individual', 'Data', 'HorÃ¡rio', 'NÂº Plaqueta', 'EspÃ©cie Florestal',
        'Local / PÃ¡tio', 'Km', 'Coordenada UTM', 'ResponsÃ¡vel',
        'DiÃ¢m. Ponta 1 (cm)', 'DiÃ¢m. Ponta 2 (cm)', 'DiÃ¢m. MÃ©dio (cm)', 'Comprimento (m)',
        'Vol. Smalian (mÂ³)', 'ObservaÃ§Ãµes'
      ];
      const rTorH = wsTor.getRow(2);
      rTorH.height = 24;
      torCols.forEach((col, i) => {
        const c = rTorH.getCell(i + 1);
        c.value = col;
        c.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: C.creme } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i === 14 ? C.ouro : C.verde2 } };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.border = thinBorder;
      });

      let rTorIdx = 3;
      let totalTorasLinhas = 0;

      toras.forEach((pileItem) => {
        const torasIndiv = (pileItem.toras && Array.isArray(pileItem.toras) && pileItem.toras.length > 0)
          ? pileItem.toras
          : [pileItem];

        let subtotalVolPilha = 0;
        let subtotalDmPilha = 0;

        torasIndiv.forEach((item) => {
          totalTorasLinhas++;
          const row = wsTor.getRow(rTorIdx);
          row.height = 20;
          const bg = totalTorasLinhas % 2 === 1 ? C.creme2 : C.creme;

          const vVol = Number(item.volumeGeometrico) || 0;
          const vDm = Number(item.diametroMedio_cm) || 0;
          subtotalVolPilha += vVol;
          subtotalDmPilha += vDm;

          const vals = [
            totalTorasLinhas,
            pileItem.identificacao || pileItem.id,
            this.formatDateBR(pileItem.data),
            pileItem.horario,
            item.plaqueta || 'S/P',
            item.especie || pileItem.especie || 'NÃ£o informada',
            pileItem.rodovia || 'PÃ¡tio',
            pileItem.km || '',
            pileItem.utm || '',
            pileItem.responsavel,
            Number(item.diametroPonta1_cm) || (Number(item.diametroPonta1_m) * 100) || 0,
            Number(item.diametroPonta2_cm) || (Number(item.diametroPonta2_m) * 100) || 0,
            vDm,
            Number(item.comprimento) || 0,
            vVol,
            pileItem.observacoes || item.observacoes || ''
          ];

          vals.forEach((v, vi) => {
            const c = row.getCell(vi + 1);
            c.value = v;
            c.font = { name: FONT_NAME, size: 9, color: { argb: C.texto } };
            c.border = thinBorder;
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: vi === 14 ? 'D6C7A1' : bg } };
            if (vi === 0 || vi === 2 || vi === 3 || vi === 4 || vi === 6 || vi === 7 || vi === 8) c.alignment = { horizontal: 'center', vertical: 'middle' };
            else if (vi === 5) {
              c.alignment = { horizontal: 'left', vertical: 'middle' };
              c.font = { name: FONT_NAME, size: 9, italic: true, color: { argb: C.texto } };
            } else if (vi >= 10 && vi <= 14) {
              c.alignment = { horizontal: 'right', vertical: 'middle' };
              c.numFmt = vi === 14 ? '#,##0.000' : '#,##0.0';
              if (vi === 14) c.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.verde } };
            } else c.alignment = { horizontal: 'left', vertical: 'middle' };
          });

          rTorIdx++;
        });

        // Se a pilha tiver mais de 1 indivÃ­duo, adiciona linha de subtotal da pilha
        if (torasIndiv.length > 1) {
          const subRow = wsTor.getRow(rTorIdx);
          subRow.height = 22;
          const avgDm = subtotalDmPilha / torasIndiv.length;

          // Mescla colunas 1 a 10 para o tÃ­tulo do subtotal
          wsTor.mergeCells(`A${rTorIdx}:J${rTorIdx}`);
          const cTit = subRow.getCell(1);
          cTit.value = `SUBTOTAL DA PILHA (${torasIndiv.length} toras) â€” ${pileItem.identificacao || pileItem.id}`;
          cTit.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: C.creme } };
          cTit.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.ouro } };
          cTit.alignment = { horizontal: 'right', vertical: 'middle' };
          cTit.border = thinBorder;

          for (let col = 11; col <= 12; col++) {
            const c = subRow.getCell(col);
            c.value = '-';
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8DFCE' } };
            c.border = thinBorder;
            c.alignment = { horizontal: 'center', vertical: 'middle' };
          }

          const cDm = subRow.getCell(13);
          cDm.value = avgDm;
          cDm.numFmt = '#,##0.0';
          cDm.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: C.verde } };
          cDm.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8DFCE' } };
          cDm.border = thinBorder;
          cDm.alignment = { horizontal: 'right', vertical: 'middle' };

          const cComp = subRow.getCell(14);
          cComp.value = '-';
          cComp.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8DFCE' } };
          cComp.border = thinBorder;
          cComp.alignment = { horizontal: 'center', vertical: 'middle' };

          const cVol = subRow.getCell(15);
          cVol.value = subtotalVolPilha;
          cVol.numFmt = '#,##0.000';
          cVol.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.verde } };
          cVol.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D6C7A1' } };
          cVol.border = thinBorder;
          cVol.alignment = { horizontal: 'right', vertical: 'middle' };

          const cObs = subRow.getCell(16);
          cObs.value = 'Volume Total da Pilha';
          cObs.font = { name: FONT_NAME, size: 8, italic: true, color: { argb: C.texto } };
          cObs.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8DFCE' } };
          cObs.border = thinBorder;
          cObs.alignment = { horizontal: 'left', vertical: 'middle' };

          rTorIdx++;
        }
      });

      // Linha de TOTAL GERAL de Toras
      const totTorRow = wsTor.getRow(rTorIdx);
      totTorRow.height = 26;

      wsTor.mergeCells(`A${rTorIdx}:L${rTorIdx}`);
      const cTotTit = totTorRow.getCell(1);
      cTotTit.value = `TOTAL GERAL DA CUBAGEM DE TORAS (${totalTorasLinhas} TORAS AVALIADAS):`;
      cTotTit.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.creme } };
      cTotTit.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
      cTotTit.alignment = { horizontal: 'right', vertical: 'middle' };
      cTotTit.border = doubleBottomBorder;

      const allTorasIndiv = toras.flatMap(p => (p.toras && Array.isArray(p.toras) && p.toras.length > 0) ? p.toras : [p]);
      const avgDmGeral = allTorasIndiv.length > 0
        ? allTorasIndiv.reduce((acc, t) => acc + (Number(t.diametroMedio_cm) || 0), 0) / allTorasIndiv.length
        : 0;
      const avgCompGeral = allTorasIndiv.length > 0
        ? allTorasIndiv.reduce((acc, t) => acc + (Number(t.comprimento) || 0), 0) / allTorasIndiv.length
        : 0;

      const cTotDm = totTorRow.getCell(13);
      cTotDm.value = avgDmGeral;
      cTotDm.numFmt = '#,##0.0';
      cTotDm.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.creme } };
      cTotDm.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde2 } };
      cTotDm.alignment = { horizontal: 'right', vertical: 'middle' };
      cTotDm.border = doubleBottomBorder;

      const cTotComp = totTorRow.getCell(14);
      cTotComp.value = avgCompGeral;
      cTotComp.numFmt = '#,##0.00';
      cTotComp.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.creme } };
      cTotComp.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde2 } };
      cTotComp.alignment = { horizontal: 'right', vertical: 'middle' };
      cTotComp.border = doubleBottomBorder;

      const cTotVol = totTorRow.getCell(15);
      cTotVol.value = vTor;
      cTotVol.numFmt = '#,##0.000 "m³"';
      cTotVol.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: C.creme } };
      cTotVol.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.ouro } };
      cTotVol.alignment = { horizontal: 'right', vertical: 'middle' };
      cTotVol.border = doubleBottomBorder;

      const cTotObs = totTorRow.getCell(16);
      cTotObs.value = 'Volume Total Homologado';
      cTotObs.font = { name: FONT_NAME, size: 9, bold: true, italic: true, color: { argb: C.creme } };
      cTotObs.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
      cTotObs.alignment = { horizontal: 'left', vertical: 'middle' };
      cTotObs.border = doubleBottomBorder;
    }

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
    setTimeout(() => {
      window.URL.revokeObjectURL(downloadUrl);
    }, 60000);

    return {
      success: true,
      fileName: finalFileName,
      recordsCount: records.length,
      totalVolume: vTot
    };
  }
}

window.CubagemExcelExport = CubagemExcelExport;

