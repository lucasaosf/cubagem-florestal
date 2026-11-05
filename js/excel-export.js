/**
 * excel-export.js - Geração de planilha Excel multipasta personalizada via ExcelJS
 * Suporte a Cargas de Caminhão, Pilhas de Madeira e Toras Roliças (Smalian)
 * Identidade Visual Oficial: Pesquisa & Soluções Ambientais — Lucas Aøsf
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

    const C = {
      verde: '13301A',
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
      ouro: 'B08854'
    };

    const FONT_NAME = 'Century Gothic';
    const CONTATO = 'Desenvolvido por Lucas Aøsf  •  (12) 99182-1729  •  lucasaosf@gmail.com  •  CRBio 127233/01-D';

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

    wsResumo.mergeCells('A1:D1');
    const r1 = wsResumo.getCell('A1');
    r1.value = '   CUBAGEM FLORESTAL — RELATÓRIO TÉCNICO GERAL';
    r1.font = { name: FONT_NAME, size: 14, bold: true, color: { argb: C.creme } };
    r1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
    r1.alignment = { vertical: 'middle', horizontal: 'center' };
    wsResumo.getRow(1).height = 36;

    wsResumo.mergeCells('A2:D2');
    const r2 = wsResumo.getCell('A2');
    const perStr = startDate && endDate ? `${this.formatDateBR(startDate)} a ${this.formatDateBR(endDate)}` : 'Período Completo';
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

    const sumVol = arr => arr.reduce((acc, x) => acc + (Number(x.volumeGeometrico) || 0), 0);
    const vCam = sumVol(caminhoes);
    const vPil = sumVol(pilhas);
    const vTor = sumVol(toras);
    const vTot = vCam + vPil + vTor;

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

    // =========================================================================
    // ABA 2: CARGAS DE CAMINHÕES
    // =========================================================================
    if (caminhoes.length > 0 || records.length === 0) {
      const wsCam = workbook.addWorksheet('Caminhões', { views: [{ showGridLines: true }] });
      wsCam.columns = [
        { key: 'num', width: 6 },
        { key: 'id', width: 22 },
        { key: 'data', width: 12 },
        { key: 'horario', width: 9 },
        { key: 'rodovia', width: 14 },
        { key: 'km', width: 10 },
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

      wsCam.mergeCells('A1:Q1');
      const hCam = wsCam.getCell('A1');
      hCam.value = '   CUBAGEM DE CARGAS DE CAMINHÕES (LADO ESQUERDO E DIREITO)';
      hCam.font = { name: FONT_NAME, size: 13, bold: true, color: { argb: C.creme } };
      hCam.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
      hCam.alignment = { vertical: 'middle', horizontal: 'center' };
      wsCam.getRow(1).height = 32;

      const camCols = ['#', 'ID Registro', 'Data', 'Horário', 'Rodovia', 'Km', 'Responsável', 'Placa', 'Origem da Madeira', 'Alturas LE (m)', 'Alturas LD (m)', 'Soma Alt. (m)', 'Hm Média (m)', 'Comp. (m)', 'Larg. (m)', 'Vol. Geométrico (m³)', 'Observações'];
      const rCamH = wsCam.getRow(2);
      rCamH.height = 24;
      camCols.forEach((col, i) => {
        const c = rCamH.getCell(i + 1);
        c.value = col;
        c.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: C.creme } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i === 15 ? C.ouro : C.verde2 } };
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
          idx + 1, item.id, this.formatDateBR(item.data), item.horario, item.rodovia, item.km,
          item.responsavel, item.placa, origFinal, leStr, ldStr, Number(item.somaAlturas) || 0,
          Number(item.alturaMedia) || 0, Number(item.comprimento) || 0, Number(item.largura) || 0,
          Number(item.volumeGeometrico) || 0, item.observacoes || ''
        ];

        vals.forEach((v, vi) => {
          const c = row.getCell(vi + 1);
          c.value = v;
          c.font = { name: FONT_NAME, size: 9, color: { argb: C.texto } };
          c.border = thinBorder;
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: vi === 15 ? 'D6C7A1' : bg } };
          if (vi === 0 || vi === 2 || vi === 3 || vi === 4 || vi === 7 || vi === 8) c.alignment = { horizontal: 'center', vertical: 'middle' };
          else if (vi >= 11 && vi <= 15) {
            c.alignment = { horizontal: 'right', vertical: 'middle' };
            c.numFmt = vi === 12 ? '#,##0.0000' : '#,##0.00';
            if (vi === 15) c.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.verde } };
          } else c.alignment = { horizontal: 'left', vertical: 'middle' };
        });
        rCamIdx++;
      });
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

      wsPil.mergeCells('A1:O1');
      const hPil = wsPil.getCell('A1');
      hPil.value = '   CUBAGEM DE PILHAS DE MADEIRA (MEDIÇÃO EM UMA FACE)';
      hPil.font = { name: FONT_NAME, size: 13, bold: true, color: { argb: C.creme } };
      hPil.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
      hPil.alignment = { vertical: 'middle', horizontal: 'center' };
      wsPil.getRow(1).height = 32;

      const pilCols = ['#', 'ID Registro', 'Data', 'Horário', 'Local / Rodovia', 'Identificação Pilha', 'Origem da Madeira', 'Responsável', 'Alturas Medidas na Face (m)', 'Soma Alt. (m)', 'Hm Média (m)', 'Comprimento (m)', 'Profundidade (m)', 'Vol. Estéreo (m³)', 'Observações'];
      const rPilH = wsPil.getRow(2);
      rPilH.height = 24;
      pilCols.forEach((col, i) => {
        const c = rPilH.getCell(i + 1);
        c.value = col;
        c.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: C.creme } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i === 13 ? C.ouro : C.verde2 } };
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
          idx + 1, item.id, this.formatDateBR(item.data), item.horario, item.rodovia,
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
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: vi === 13 ? 'D6C7A1' : bg } };
          if (vi === 0 || vi === 2 || vi === 3 || vi === 5 || vi === 6) c.alignment = { horizontal: 'center', vertical: 'middle' };
          else if (vi >= 9 && vi <= 13) {
            c.alignment = { horizontal: 'right', vertical: 'middle' };
            c.numFmt = vi === 10 ? '#,##0.0000' : '#,##0.00';
            if (vi === 13) c.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.verde } };
          } else c.alignment = { horizontal: 'left', vertical: 'middle' };
        });
        rPilIdx++;
      });
    }

    // =========================================================================
    // ABA 4: TORAS ROLIÇAS (Smalian)
    // =========================================================================
    if (toras.length > 0) {
      const wsTor = workbook.addWorksheet('Toras Roliças', { views: [{ showGridLines: true }] });
      wsTor.columns = [
        { key: 'num', width: 6 },
        { key: 'id', width: 22 },
        { key: 'data', width: 12 },
        { key: 'horario', width: 9 },
        { key: 'plaqueta', width: 16 },
        { key: 'especie', width: 20 },
        { key: 'foto', width: 28 },
        { key: 'utm', width: 30 },
        { key: 'local', width: 16 },
        { key: 'responsavel', width: 20 },
        { key: 'd1_cm', width: 15 },
        { key: 'd2_cm', width: 15 },
        { key: 'dm_cm', width: 15 },
        { key: 'comp', width: 15 },
        { key: 'vol_smalian', width: 20 },
        { key: 'obs', width: 32 }
      ];

      wsTor.mergeCells('A1:P1');
      const hTor = wsTor.getCell('A1');
      hTor.value = '   CUBAGEM DE TORAS ROLIÇAS INDIVIDUAIS (FÓRMULA DE SMALIAN)';
      hTor.font = { name: FONT_NAME, size: 13, bold: true, color: { argb: C.creme } };
      hTor.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
      hTor.alignment = { vertical: 'middle', horizontal: 'center' };
      wsTor.getRow(1).height = 32;

      const torCols = [
        '#', 'ID Registro', 'Data', 'Horário', 'Nº Plaqueta', 'Espécie Florestal',
        'Foto da Plaqueta (Arquivo)', 'Coordenadas UTM', 'Local / Pátio', 'Responsável',
        'Diâm. Ponta 1 (cm)', 'Diâm. Ponta 2 (cm)', 'Diâm. Médio (cm)', 'Comprimento (m)',
        'Vol. Smalian (m³)', 'Legenda da Foto / Obs'
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
          row.height = item.foto ? 42 : 20;
          const bg = totalTorasLinhas % 2 === 1 ? C.creme2 : C.creme;

          const nomeFoto = item.foto
            ? (item.fotoNome || `Plaqueta_${item.plaqueta || pileItem.id}_${pileItem.data}.jpg`)
            : 'SEM FOTO';
          const utmStr = item.fotoUtm || pileItem.fotoUtm || 'NÃO REGISTRADO';
          const obsFinal = item.fotoLegenda
            ? `${item.fotoLegenda}${pileItem.observacoes ? ' | ' + pileItem.observacoes : ''}`
            : (pileItem.observacoes || '');

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
            item.especie || pileItem.especie || 'Não informada',
            nomeFoto,
            utmStr,
            pileItem.rodovia || 'Pátio',
            pileItem.responsavel,
            Number(item.diametroPonta1_cm) || (Number(item.diametroPonta1_m) * 100) || 0,
            Number(item.diametroPonta2_cm) || (Number(item.diametroPonta2_m) * 100) || 0,
            vDm,
            Number(item.comprimento) || 0,
            vVol,
            obsFinal
          ];

          vals.forEach((v, vi) => {
            const c = row.getCell(vi + 1);
            c.value = v;
            c.font = { name: FONT_NAME, size: 9, color: { argb: C.texto } };
            c.border = thinBorder;
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: vi === 14 ? 'D6C7A1' : bg } };
            if (vi === 0 || vi === 2 || vi === 3 || vi === 4) c.alignment = { horizontal: 'center', vertical: 'middle' };
            else if (vi === 5) {
              c.alignment = { horizontal: 'left', vertical: 'middle' };
              c.font = { name: FONT_NAME, size: 9, italic: true, color: { argb: C.texto } };
            } else if (vi >= 10 && vi <= 14) {
              c.alignment = { horizontal: 'right', vertical: 'middle' };
              c.numFmt = vi === 14 ? '#,##0.000' : '#,##0.0';
              if (vi === 14) c.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.verde } };
            } else c.alignment = { horizontal: 'left', vertical: 'middle' };
          });

          // Embutir miniatura da foto na planilha se existir
          if (item.foto) {
            try {
              const imgId = workbook.addImage({
                base64: item.foto,
                extension: 'jpeg'
              });
              wsTor.addImage(imgId, {
                tl: { col: 6.1, row: rTorIdx - 0.95 },
                ext: { width: 50, height: 38 }
              });
            } catch (e) {
              console.warn('Erro ao embutir foto na planilha:', e);
            }
          }

          rTorIdx++;
        });

        // Se a pilha tiver mais de 1 indivíduo, adiciona linha de subtotal da pilha
        if (torasIndiv.length > 1) {
          const subRow = wsTor.getRow(rTorIdx);
          subRow.height = 22;
          const avgDm = subtotalDmPilha / torasIndiv.length;

          // Mescla colunas 1 a 10 para o título do subtotal
          wsTor.mergeCells(`A${rTorIdx}:J${rTorIdx}`);
          const cTit = subRow.getCell(1);
          cTit.value = `SUBTOTAL DA PILHA (${torasIndiv.length} toras) — ${pileItem.identificacao || pileItem.id}`;
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
    window.URL.revokeObjectURL(downloadUrl);

    return {
      success: true,
      fileName: finalFileName,
      recordsCount: records.length,
      totalVolume: vTot
    };
  }
}

window.CubagemExcelExport = CubagemExcelExport;
