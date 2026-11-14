/**
 * excel-export.js - Geração de planilha Excel multipasta personalizada via ExcelJS
 * Suporte a Cargas de Caminhão, Pilhas de Madeira e Toras (Smalian)
 * Identidade Visual Oficial: Pesquisa & Soluções Ambientais — Lucas Aøsf
 */

const LOGO_PLANILHA_B64 = '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';

class CubagemExcelExport {
  /**
   * Sanitização de valores para evitar Injeção de Fórmulas no Excel (CSV/Formula Injection)
   * Se o texto iniciar com =, +, -, @, \t ou \r (e não for um número legítimo),
   * adiciona apóstrofo (') para forçar exibição estrita como texto puro.
   */
  static sanitizeCellValue(v) {
    if (typeof v === 'string') {
      const trimmed = v.trim();
      if (/^[=\+\-@\t\r]/.test(trimmed) && !/^[+\-]?\d+(\.\d+)?$/.test(trimmed)) {
        return "'" + v;
      }
    }
    return v;
  }

  static formatDateBR(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  }

  static extrairCoordenadas(item) {
    if (!item) return { zona: '', latitude: '', longitude: '' };

    // 1. Se já existirem campos separados salvos no registro
    if (item.latitude || item.longitude || item.zona) {
      return {
        zona: String(item.zona || '').trim(),
        latitude: String(item.latitude || '').trim(),
        longitude: String(item.longitude || '').trim()
      };
    }

    const raw = String(item.utm || item.coordenada || '').trim();
    if (!raw) return { zona: '', latitude: '', longitude: '' };

    // Caso 1: UTM completo: "22K 483210 E 7421350 N" ou "22S 483210 7421350"
    const utmRegex = /^([0-9]{1,2}\s*[A-Za-z]?)\s+([0-9.,]+)\s*([EeXx]?)\s+([0-9.,]+)\s*([NnYy]?)$/;
    const matchUtm = raw.match(utmRegex);
    if (matchUtm) {
      const zona = matchUtm[1].replace(/\s+/g, '').toUpperCase();
      const easting = matchUtm[2].trim();
      const northing = matchUtm[4].trim();
      const sufE = matchUtm[3] ? ` ${matchUtm[3].toUpperCase()}` : ' E';
      const sufN = matchUtm[5] ? ` ${matchUtm[5].toUpperCase()}` : ' N';
      return {
        zona,
        latitude: `${northing}${sufN}`,
        longitude: `${easting}${sufE}`
      };
    }

    // Caso 2: Decimal Lat/Lon: "-23.550520, -46.633308" ou "-23.550520 -46.633308"
    const latLonRegex = /^(-?[0-9]{1,2}\.[0-9]+)[,\s]+(-?[0-9]{1,3}\.[0-9]+)$/;
    const matchLatLon = raw.match(latLonRegex);
    if (matchLatLon) {
      return {
        zona: '22K',
        latitude: matchLatLon[1],
        longitude: matchLatLon[2]
      };
    }

    // Caso 3: Formato com tags: "Zona: 22K Lat: -23.x Lon: -46.x"
    const zM = raw.match(/zona:?\s*([0-9]{1,2}[A-Za-z]?)/i);
    const latM = raw.match(/lat(?:itude)?:?\s*(-?[0-9.,]+)/i);
    const lonM = raw.match(/lon(?:gitude)?:?\s*(-?[0-9.,]+)/i);
    if (latM || lonM || zM) {
      return {
        zona: zM ? zM[1].toUpperCase() : '22K',
        latitude: latM ? latM[1] : '',
        longitude: lonM ? lonM[1] : ''
      };
    }

    // Caso 4: Texto genérico
    return {
      zona: '',
      latitude: raw,
      longitude: ''
    };
  }

  static obterZonaPadrao(items) {
    if (!items || !items.length) return '22K';
    for (const it of items) {
      const c = CubagemExcelExport.extrairCoordenadas(it);
      if (c && c.zona) return c.zona;
      if (it.toras && Array.isArray(it.toras)) {
        for (const t of it.toras) {
          const ct = CubagemExcelExport.extrairCoordenadas(t);
          if (ct && ct.zona) return ct.zona;
        }
      }
    }
    return '22K';
  }

  static getColLetter(col) {
    let letter = '';
    let temp = col;
    while (temp > 0) {
      const rem = (temp - 1) % 26;
      letter = String.fromCharCode(65 + rem) + letter;
      temp = Math.floor((temp - 1) / 26);
    }
    return letter;
  }

  static renderMultiHeader(ws, colDefs, coordColStart, zonaPadrao, C, FONT_NAME, thinBorder) {
    const r2 = ws.getRow(2);
    const r3 = ws.getRow(3);
    r2.height = 22;
    r3.height = 22;

    const totalCols = colDefs.length;
    for (let c = 1; c <= totalCols; c++) {
      if (c === coordColStart || c === coordColStart + 1) {
        if (c === coordColStart) {
          const startL = CubagemExcelExport.getColLetter(coordColStart);
          const endL = CubagemExcelExport.getColLetter(coordColStart + 1);
          ws.mergeCells(`${startL}2:${endL}2`);
          const cellZona = r2.getCell(coordColStart);
          cellZona.value = `ZONA: ${zonaPadrao || '22K'}`;
          cellZona.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: C.creme } };
          cellZona.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8C4A37' } }; // Terracota nobre
          cellZona.alignment = { horizontal: 'center', vertical: 'middle' };
          cellZona.border = thinBorder;
          r2.getCell(coordColStart + 1).border = thinBorder;
        }
        const subCell = r3.getCell(c);
        subCell.value = colDefs[c - 1];
        subCell.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: C.creme } };
        subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde2 } };
        subCell.alignment = { horizontal: 'center', vertical: 'middle' };
        subCell.border = thinBorder;
      } else {
        const colL = CubagemExcelExport.getColLetter(c);
        ws.mergeCells(`${colL}2:${colL}3`);
        const topCell = r2.getCell(c);
        topCell.value = colDefs[c - 1];
        const isVolCol = colDefs[c - 1].includes('Vol.');
        const bgColor = isVolCol ? C.ouro : C.verde2;
        topCell.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: C.creme } };
        topCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        topCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        topCell.border = thinBorder;
        r3.getCell(c).border = thinBorder;
      }
    }
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
    workbook.creator = 'BIOKURI Pesquisa e Soluções Ambientais — Lucas Aøsf';
    workbook.lastModifiedBy = responsavel || 'BIOKURI';
    workbook.company = 'BIOKURI Pesquisa e Soluções Ambientais';
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
    const CONTATO = 'BIOKURI Pesquisa e Soluções Ambientais  •  Lucas Aøsf (CRBio 127233/01-D)  •  (12) 99182-1729  •  lucasaosf@gmail.com';

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
      const v = (window.CubagemCalculator && typeof window.CubagemCalculator.obterVolumeEfetivo === 'function')
        ? window.CubagemCalculator.obterVolumeEfetivo(x)
        : (Number(x.volumeGeometrico) || 0);
      return acc + v;
    }, 0);

    const vCam = sumVol(caminhoes);
    const vPil = sumVol(pilhas);
    const vTor = sumVol(toras);
    const vTotEntrada = vPil + vTor;
    const vSaldoPatio = vTotEntrada - vCam;
    const vTot = sumVol(records);

    // Extração padronizada de informações de viagem
    const getTripInfo = (rec, fallbackIndex = 1) => {
      let num = rec.numeroViagem;
      if (!num && rec.viagem) {
        const match = String(rec.viagem).match(/\d+/);
        if (match) num = parseInt(match[0], 10);
      }
      if (!num || isNaN(num) || num <= 0) {
        num = fallbackIndex;
      }
      return {
        num: Number(num),
        label: `${num}ª Viagem`
      };
    };

    // Agrupamento consolidado das retiradas por viagem
    const viagensMap = new Map();
    caminhoes.forEach((c, idx) => {
      const trip = getTripInfo(c, idx + 1);
      if (!viagensMap.has(trip.num)) {
        viagensMap.set(trip.num, {
          num: trip.num,
          label: trip.label,
          items: [],
          volumeTotal: 0,
          placas: new Set(),
          especies: new Set(),
          totalToras: 0
        });
      }
      const group = viagensMap.get(trip.num);
      group.items.push(c);
      const volItem = (window.CubagemCalculator && typeof window.CubagemCalculator.obterVolumeEfetivo === 'function')
        ? window.CubagemCalculator.obterVolumeEfetivo(c)
        : (Number(c.volumeGeometrico) || 0);
      group.volumeTotal += volItem;
      if (c.placa && c.placa !== 'NÃO INFORMADA') group.placas.add(c.placa);
      if (c.especie) group.especies.add(c.especie);
      if (Array.isArray(c.toras) && c.toras.length > 0) {
        group.totalToras += c.toras.length;
      } else if (c.totalToras) {
        group.totalToras += Number(c.totalToras) || 0;
      }
    });
    const viagensOrdenadas = [...viagensMap.values()].sort((a, b) => a.num - b.num);

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
      ? `   BIOKURI — CONSOLIDADO DIÁRIO DE CUBAGEM FLORESTAL (${dayStr})`
      : '   BIOKURI — RELATÓRIO TÉCNICO DE CUBAGEM FLORESTAL';
    r1.font = { name: FONT_NAME, size: 13, bold: true, color: { argb: C.creme } };
    r1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
    r1.alignment = { vertical: 'middle', horizontal: 'center' };
    wsResumo.getRow(1).height = 36;

    wsResumo.mergeCells('A2:D2');
    const r2 = wsResumo.getCell('A2');
    const perStr = isSingleDay
      ? `Data: ${dayStr}  •  Entrada: ${vTotEntrada.toFixed(2)} m³  •  Retiradas: ${vCam.toFixed(2)} m³  •  Saldo: ${vSaldoPatio.toFixed(2)} m³`
      : (startDate && endDate ? `${this.formatDateBR(startDate)} a ${this.formatDateBR(endDate)}` : 'Período Completo');
    const projStr = records.find(r => r.projeto)?.projeto || (window.app && window.app.projetoAtivo) || '';
    const projSuffix = projStr ? `  •  Projeto: ${projStr}` : '';
    r2.value = `BIOKURI Pesquisa e Soluções Ambientais  •  Período: ${perStr}${projSuffix}  •  Resp. Técnico: ${responsavel || 'Lucas Aøsf'} (CRBio 127233/01-D)`;
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
      ['🪵 Pilhas de Madeira (Entrada)', pilhas.length, vPil, pilhas.length > 0 ? vPil / pilhas.length : 0],
      ['🌲 Toras (Entrada)', toras.length, vTor, toras.length > 0 ? vTor / toras.length : 0],
      ['🚚 Retirada do Material (Saída / Caminhões)', caminhoes.length, vCam, caminhoes.length > 0 ? vCam / caminhoes.length : 0]
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

    // 1. Linha Total Entrada no Pátio (Pilhas + Toras)
    const totalEntradasCount = pilhas.length + toras.length;
    const rTotEntrada = wsResumo.getRow(rowIdx);
    rTotEntrada.height = 23;
    rTotEntrada.getCell(1).value = 'TOTAL ENTRADA NO PÁTIO';
    rTotEntrada.getCell(1).font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.creme } };
    rTotEntrada.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
    rTotEntrada.getCell(1).border = thinBorder;

    rTotEntrada.getCell(2).value = totalEntradasCount;
    rTotEntrada.getCell(2).font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.creme } };
    rTotEntrada.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
    rTotEntrada.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    rTotEntrada.getCell(2).border = thinBorder;

    rTotEntrada.getCell(3).value = vTotEntrada;
    rTotEntrada.getCell(3).font = { name: FONT_NAME, size: 11, bold: true, color: { argb: C.creme } };
    rTotEntrada.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.ouro } };
    rTotEntrada.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
    rTotEntrada.getCell(3).numFmt = '#,##0.00 "m³"';
    rTotEntrada.getCell(3).border = thinBorder;

    rTotEntrada.getCell(4).value = totalEntradasCount > 0 ? vTotEntrada / totalEntradasCount : 0;
    rTotEntrada.getCell(4).font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.creme } };
    rTotEntrada.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
    rTotEntrada.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
    rTotEntrada.getCell(4).numFmt = '#,##0.00 "m³"';
    rTotEntrada.getCell(4).border = thinBorder;
    rowIdx++;

    // 2. Linha Total Saída (Retiradas com Caminhão)
    const rTotSaida = wsResumo.getRow(rowIdx);
    rTotSaida.height = 23;
    rTotSaida.getCell(1).value = 'TOTAL SAÍDA (RETIRADAS)';
    rTotSaida.getCell(1).font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.creme } };
    rTotSaida.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8C4A37' } }; // Terracota / Vinho suave
    rTotSaida.getCell(1).border = thinBorder;

    rTotSaida.getCell(2).value = caminhoes.length;
    rTotSaida.getCell(2).font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.creme } };
    rTotSaida.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8C4A37' } };
    rTotSaida.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    rTotSaida.getCell(2).border = thinBorder;

    rTotSaida.getCell(3).value = vCam;
    rTotSaida.getCell(3).font = { name: FONT_NAME, size: 11, bold: true, color: { argb: C.creme } };
    rTotSaida.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8C4A37' } };
    rTotSaida.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
    rTotSaida.getCell(3).numFmt = '#,##0.00 "m³"';
    rTotSaida.getCell(3).border = thinBorder;

    rTotSaida.getCell(4).value = caminhoes.length > 0 ? vCam / caminhoes.length : 0;
    rTotSaida.getCell(4).font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.creme } };
    rTotSaida.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8C4A37' } };
    rTotSaida.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
    rTotSaida.getCell(4).numFmt = '#,##0.00 "m³"';
    rTotSaida.getCell(4).border = thinBorder;
    rowIdx++;

    // 3. Linha Saldo no Pátio (Entrada - Saída)
    const rSaldo = wsResumo.getRow(rowIdx);
    rSaldo.height = 24;
    rSaldo.getCell(1).value = 'SALDO NO PÁTIO (ENTRADA - SAÍDA)';
    rSaldo.getCell(1).font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.creme } };
    rSaldo.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde2 } };
    rSaldo.getCell(1).border = doubleBottomBorder;

    rSaldo.getCell(2).value = '—';
    rSaldo.getCell(2).font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.creme } };
    rSaldo.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde2 } };
    rSaldo.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    rSaldo.getCell(2).border = doubleBottomBorder;

    rSaldo.getCell(3).value = vSaldoPatio;
    rSaldo.getCell(3).font = { name: FONT_NAME, size: 11, bold: true, color: { argb: C.creme } };
    rSaldo.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.ouro } };
    rSaldo.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
    rSaldo.getCell(3).numFmt = '#,##0.00 "m³"';
    rSaldo.getCell(3).border = doubleBottomBorder;

    rSaldo.getCell(4).value = '—';
    rSaldo.getCell(4).font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.creme } };
    rSaldo.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde2 } };
    rSaldo.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    rSaldo.getCell(4).border = doubleBottomBorder;

    // 4. DEMONSTRATIVO DE RETIRADA POR VIAGEM (VOLUME SEPARADO POR VIAGEM)
    if (viagensOrdenadas.length > 0) {
      rowIdx += 2;
      wsResumo.mergeCells(`A${rowIdx}:D${rowIdx}`);
      const hViag = wsResumo.getCell(`A${rowIdx}`);
      hViag.value = isSingleDay
        ? `DEMONSTRATIVO DE RETIRADA POR VIAGEM DO DIA (${viagensOrdenadas.length} ${viagensOrdenadas.length === 1 ? 'VIAGEM' : 'VIAGENS'})`
        : `DEMONSTRATIVO DE RETIRADA POR VIAGEM NO PERÍODO (${viagensOrdenadas.length} ${viagensOrdenadas.length === 1 ? 'VIAGEM' : 'VIAGENS'})`;
      hViag.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.creme } };
      hViag.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8C4A37' } }; // Terracota / Saídas
      hViag.alignment = { vertical: 'middle', horizontal: 'center' };
      wsResumo.getRow(rowIdx).height = 24;
      rowIdx++;

      const vHeaders = ['Nº da Viagem', 'Placa / Identificação', 'Especificação da Carga', 'Volume da Viagem (m³)'];
      const rVH = wsResumo.getRow(rowIdx);
      rVH.height = 22;
      vHeaders.forEach((h, i) => {
        const cell = rVH.getCell(i + 1);
        cell.value = h;
        cell.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: C.creme } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde2 } };
        cell.alignment = { horizontal: i === 3 ? 'right' : (i === 0 ? 'center' : 'left'), vertical: 'middle' };
        cell.border = thinBorder;
      });
      rowIdx++;

      viagensOrdenadas.forEach((v, vIdx) => {
        const r = wsResumo.getRow(rowIdx);
        r.height = 20;
        const bg = vIdx % 2 === 0 ? C.creme : C.creme2;
        const placasStr = v.placas.size > 0 ? [...v.placas].join(', ') : (v.items[0]?.placa || 'Sem placa');
        const espStr = v.especies.size > 0 ? [...v.especies].join(', ') : (v.items[0]?.origemMadeira || 'Nativa');
        const descCarga = v.totalToras > 0
          ? `${v.totalToras} Toras • ${espStr} (Smalian)`
          : `Carga Geométrica LE/LD (${v.items.length} ${v.items.length === 1 ? 'carga' : 'cargas'})`;

        const vals = [
          v.label,
          placasStr,
          descCarga,
          v.volumeTotal
        ];

        vals.forEach((val, colI) => {
          const cell = r.getCell(colI + 1);
          cell.value = val;
          cell.font = { name: FONT_NAME, size: 9, color: { argb: C.texto } };
          cell.border = thinBorder;
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colI === 3 ? 'D6C7A1' : bg } };
          if (colI === 0) cell.alignment = { horizontal: 'center', vertical: 'middle' };
          else if (colI === 3) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            cell.numFmt = '#,##0.000';
            cell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.verde } };
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }
        });
        rowIdx++;
      });

      // Subtotal das Viagens
      const rSubViag = wsResumo.getRow(rowIdx);
      rSubViag.height = 24;
      wsResumo.mergeCells(`A${rowIdx}:C${rowIdx}`);
      const cSubTit = rSubViag.getCell(1);
      cSubTit.value = `SUBTOTAL DAS RETIRADAS POR VIAGEM (${viagensOrdenadas.length} ${viagensOrdenadas.length === 1 ? 'VIAGEM' : 'VIAGENS'}):`;
      cSubTit.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.creme } };
      cSubTit.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8C4A37' } };
      cSubTit.alignment = { horizontal: 'right', vertical: 'middle' };
      cSubTit.border = doubleBottomBorder;

      const cSubVal = rSubViag.getCell(4);
      cSubVal.value = vCam;
      cSubVal.numFmt = '#,##0.00 "m³"';
      cSubVal.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: C.creme } };
      cSubVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8C4A37' } };
      cSubVal.alignment = { horizontal: 'right', vertical: 'middle' };
      cSubVal.border = doubleBottomBorder;
    }

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
        const isCamRec = (rec.tipo || 'caminhao') === 'caminhao';
        const tipoLabel = rec.tipo === 'tora' ? 'Toras (Smalian)' : (rec.tipo === 'pilha' ? 'Pilha de Madeira' : 'Retirada (Caminhão)');
        let identStr = rec.placa || rec.identificacao || rec.plaqueta || `Medição ${idx + 1}`;
        if (isCamRec) {
          const trip = getTripInfo(rec);
          identStr = `${rec.placa || 'Sem placa'} (${trip.label})`;
        }
        const dtStr = `${this.formatDateBR(rec.data)} ${rec.horario || ''}`;
        const vNum = (window.CubagemCalculator && typeof window.CubagemCalculator.obterVolumeEfetivo === 'function')
          ? window.CubagemCalculator.obterVolumeEfetivo(rec)
          : (Number(rec.volumeGeometrico) || 0);
        const isToraRec = rec.tipo === 'tora';

        const vals = [
          `#${idx + 1}  •  ${dtStr}`,
          identStr,
          rec.especie ? `${tipoLabel} (${rec.especie})` : tipoLabel,
          vNum
        ];

        vals.forEach((v, vi) => {
          const cell = r.getCell(vi + 1);
          cell.value = CubagemExcelExport.sanitizeCellValue(v);
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
    // ABA 2: RETIRADA DO MATERIAL (CAMINHÕES)
    // =========================================================================
    if (caminhoes.length > 0 || records.length === 0) {
      const wsCam = workbook.addWorksheet('Retirada Caminhões', { views: [{ showGridLines: true }] });
      wsCam.columns = [
        { key: 'num', width: 6 },
        { key: 'id', width: 22 },
        { key: 'data', width: 12 },
        { key: 'horario', width: 9 },
        { key: 'viagem', width: 14 },
        { key: 'placa', width: 12 },
        { key: 'rodovia', width: 16 },
        { key: 'km', width: 14 },
        { key: 'lat', width: 16 },
        { key: 'long', width: 16 },
        { key: 'responsavel', width: 20 },
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

      wsCam.mergeCells('A1:T1');
      const hCam = wsCam.getCell('A1');
      hCam.value = '   BIOKURI PESQUISA E SOLUÇÕES AMBIENTAIS — RETIRADA DO MATERIAL (CAMINHÕES)';
      hCam.font = { name: FONT_NAME, size: 13, bold: true, color: { argb: C.creme } };
      hCam.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
      hCam.alignment = { vertical: 'middle', horizontal: 'center' };
      wsCam.getRow(1).height = 32;

      const camCols = [
        '#', 'ID Registro', 'Data', 'Horário', 'Nº Viagem', 'Placa', 'Local / Pátio', 'Km',
        'Latitude', 'Longitude',
        'Responsável', 'Origem da Madeira', 'Alturas LE (m)', 'Alturas LD (m)',
        'Soma Alt. (m)', 'Hm Média (m)', 'Comp. (m)', 'Larg. (m)', 'Vol. Geométrico (m³)', 'Observações'
      ];
      const zonaCam = CubagemExcelExport.obterZonaPadrao(caminhoes);
      CubagemExcelExport.renderMultiHeader(wsCam, camCols, 9, zonaCam, C, FONT_NAME, thinBorder);

      // Ordenar caminhões por data e viagem
      caminhoes.sort((a, b) => {
        if (a.data !== b.data) return (a.data || '').localeCompare(b.data || '');
        const vA = getTripInfo(a).num;
        const vB = getTripInfo(b).num;
        if (vA !== vB) return vA - vB;
        return (a.timestamp || 0) - (b.timestamp || 0);
      });

      let rCamIdx = 4;
      caminhoes.forEach((item, idx) => {
        const row = wsCam.getRow(rCamIdx);
        row.height = 19;
        const bg = idx % 2 === 1 ? C.creme2 : C.creme;

        const trip = getTripInfo(item, idx + 1);
        const isToras = item.modoCarga === 'toras' || (Array.isArray(item.toras) && item.toras.length > 0);
        const nToras = item.totalToras || (item.toras ? item.toras.length : 0);
        const leStr = isToras
          ? `Toras: ${nToras} un`
          : (Array.isArray(item.alturasLE) ? item.alturasLE.map(v => Number(v).toFixed(2)).join('; ') : (item.le1 ? `${Number(item.le1).toFixed(2)}; ${Number(item.le2).toFixed(2)}; ${Number(item.le3).toFixed(2)}` : ''));
        const ldStr = isToras
          ? 'Fórmula Smalian'
          : (Array.isArray(item.alturasLD) ? item.alturasLD.map(v => Number(v).toFixed(2)).join('; ') : (item.ld1 ? `${Number(item.ld1).toFixed(2)}; ${Number(item.ld2).toFixed(2)}; ${Number(item.ld3).toFixed(2)}` : ''));
        const somaVal = isToras ? nToras : (Number(item.somaAlturas) || 0);
        const hmVal = isToras ? ((Number(item.diametroMedio_cm) || 0) / 100) : (Number(item.alturaMedia) || 0);
        const obsFinal = isToras && item.plaqueta ? `${item.plaqueta}${item.observacoes ? ' • ' + item.observacoes : ''}` : (item.observacoes || '');

        const origBase = item.origemMadeira || 'Nativa';
        const origFinal = item.especie ? `${origBase} (${item.especie})` : origBase;
        const volVal = (window.CubagemCalculator && typeof window.CubagemCalculator.obterVolumeEfetivo === 'function' ? window.CubagemCalculator.obterVolumeEfetivo(item) : (Number(item.volumeGeometrico) || 0));

        const coords = CubagemExcelExport.extrairCoordenadas(item);
        const vals = [
          idx + 1, item.id, this.formatDateBR(item.data), item.horario, trip.label, item.placa, item.rodovia, item.km || '',
          coords.latitude, coords.longitude,
          item.responsavel, origFinal, leStr, ldStr, somaVal,
          hmVal, Number(item.comprimento) || 0, Number(item.largura) || 0,
          volVal, obsFinal
        ];

        vals.forEach((v, vi) => {
          const c = row.getCell(vi + 1);
          c.value = CubagemExcelExport.sanitizeCellValue(v);
          c.font = { name: FONT_NAME, size: 9, color: { argb: C.texto } };
          c.border = thinBorder;
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: vi === 18 ? 'D6C7A1' : bg } };
          if (vi === 0 || vi === 2 || vi === 3 || vi === 4 || vi === 5 || vi === 6 || vi === 7 || vi === 8 || vi === 9 || vi === 10) {
            c.alignment = { horizontal: 'center', vertical: 'middle' };
            if (vi === 4) {
              c.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: 'FF8C4A37' } };
            }
          } else if (vi >= 14 && vi <= 18) {
            c.alignment = { horizontal: 'right', vertical: 'middle' };
            c.numFmt = vi === 15 ? '#,##0.0000' : (isToras && vi === 18 ? '#,##0.000' : '#,##0.00');
            if (vi === 18) c.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.verde } };
          } else {
            c.alignment = { horizontal: 'left', vertical: 'middle' };
          }
        });
        rCamIdx++;
      });

      // Linha de TOTAL GERAL de Caminhões
      if (caminhoes.length > 0) {
        const totCamRow = wsCam.getRow(rCamIdx);
        totCamRow.height = 26;
        wsCam.mergeCells(`A${rCamIdx}:R${rCamIdx}`);
        const cTotCamTit = totCamRow.getCell(1);
        cTotCamTit.value = `TOTAL GERAL DE RETIRADAS DE MATERIAL (CAMINHÕES) (${caminhoes.length} CARGAS MEDIDAS):`;
        cTotCamTit.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.creme } };
        cTotCamTit.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
        cTotCamTit.alignment = { horizontal: 'right', vertical: 'middle' };
        cTotCamTit.border = doubleBottomBorder;

        const cTotCamVol = totCamRow.getCell(19);
        cTotCamVol.value = vCam;
        cTotCamVol.numFmt = '#,##0.00 "m³"';
        cTotCamVol.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: C.creme } };
        cTotCamVol.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.ouro } };
        cTotCamVol.alignment = { horizontal: 'right', vertical: 'middle' };
        cTotCamVol.border = doubleBottomBorder;

        const cTotCamObs = totCamRow.getCell(20);
        cTotCamObs.value = 'Volume Total Homologado';
        cTotCamObs.font = { name: FONT_NAME, size: 9, bold: true, italic: true, color: { argb: C.creme } };
        cTotCamObs.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
        cTotCamObs.alignment = { horizontal: 'left', vertical: 'middle' };
        cTotCamObs.border = doubleBottomBorder;

        // Resumo consolidado por viagem na própria Aba 2
        if (viagensOrdenadas.length > 0) {
          rCamIdx += 2;
          wsCam.mergeCells(`A${rCamIdx}:E${rCamIdx}`);
          const hVBox = wsCam.getCell(`A${rCamIdx}`);
          hVBox.value = `RESUMO CONSOLIDADO POR VIAGEM (${viagensOrdenadas.length} ${viagensOrdenadas.length === 1 ? 'VIAGEM' : 'VIAGENS'})`;
          hVBox.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.creme } };
          hVBox.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8C4A37' } };
          hVBox.alignment = { vertical: 'middle', horizontal: 'center' };
          wsCam.getRow(rCamIdx).height = 22;
          rCamIdx++;

          const vBoxCols = ['Viagem', 'Placa(s)', 'Cargas / Toras', 'Volume da Viagem (m³)', 'Status'];
          const rVBoxH = wsCam.getRow(rCamIdx);
          rVBoxH.height = 20;
          vBoxCols.forEach((col, i) => {
            const c = rVBoxH.getCell(i + 1);
            c.value = col;
            c.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: C.creme } };
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde2 } };
            c.alignment = { horizontal: i === 3 ? 'right' : (i === 0 ? 'center' : 'left'), vertical: 'middle' };
            c.border = thinBorder;
          });
          rCamIdx++;

          viagensOrdenadas.forEach((v, vIdx) => {
            const r = wsCam.getRow(rCamIdx);
            r.height = 19;
            const bg = vIdx % 2 === 1 ? C.creme2 : C.creme;
            const placasStr = v.placas.size > 0 ? [...v.placas].join(', ') : (v.items[0]?.placa || 'Sem placa');
            const descCarga = v.totalToras > 0 ? `${v.totalToras} toras (Smalian)` : `${v.items.length} carga(s) geométrica(s)`;

            const valsV = [
              v.label,
              placasStr,
              descCarga,
              v.volumeTotal,
              'Concluída'
            ];

            valsV.forEach((val, colI) => {
              const c = r.getCell(colI + 1);
              c.value = val;
              c.font = { name: FONT_NAME, size: 9, color: { argb: C.texto } };
              c.border = thinBorder;
              c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colI === 3 ? 'D6C7A1' : bg } };
              if (colI === 0 || colI === 4) c.alignment = { horizontal: 'center', vertical: 'middle' };
              else if (colI === 3) {
                c.alignment = { horizontal: 'right', vertical: 'middle' };
                c.numFmt = '#,##0.000 "m³"';
                c.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: C.verde } };
              } else {
                c.alignment = { horizontal: 'left', vertical: 'middle' };
              }
            });
            rCamIdx++;
          });
        }
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
        { key: 'lat', width: 16 },
        { key: 'long', width: 16 },
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

      wsPil.mergeCells('A1:R1');
      const hPil = wsPil.getCell('A1');
      hPil.value = '   BIOKURI PESQUISA E SOLUÇÕES AMBIENTAIS — CUBAGEM DE PILHAS DE MADEIRA';
      hPil.font = { name: FONT_NAME, size: 13, bold: true, color: { argb: C.creme } };
      hPil.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
      hPil.alignment = { vertical: 'middle', horizontal: 'center' };
      wsPil.getRow(1).height = 32;

      const pilCols = [
        '#', 'ID Registro', 'Data', 'Horário', 'Local / Pátio', 'Km',
        'Latitude', 'Longitude',
        'Identificação Pilha', 'Origem da Madeira', 'Responsável',
        'Alturas Medidas na Face (m)', 'Soma Alt. (m)', 'Hm Média (m)', 'Comprimento (m)', 'Profundidade (m)',
        'Vol. Estéreo (m³)', 'Observações'
      ];
      const zonaPil = CubagemExcelExport.obterZonaPadrao(pilhas);
      CubagemExcelExport.renderMultiHeader(wsPil, pilCols, 7, zonaPil, C, FONT_NAME, thinBorder);

      let rPilIdx = 4;
      pilhas.forEach((item, idx) => {
        const row = wsPil.getRow(rPilIdx);
        row.height = 19;
        const bg = idx % 2 === 1 ? C.creme2 : C.creme;
        const altStr = Array.isArray(item.alturas) ? item.alturas.map(v => Number(v).toFixed(2)).join('; ') : '';
        const origBasePil = item.origemMadeira || 'Nativa';
        const origFinalPil = item.especie ? `${origBasePil} (${item.especie})` : origBasePil;

        const coords = CubagemExcelExport.extrairCoordenadas(item);
        const vals = [
          idx + 1, item.id, this.formatDateBR(item.data), item.horario, item.rodovia, item.km || '',
          coords.latitude, coords.longitude,
          item.identificacao || item.placa || `Pilha ${idx + 1}`, origFinalPil, item.responsavel,
          altStr, Number(item.somaAlturas) || 0, Number(item.alturaMedia) || 0,
          Number(item.comprimento) || 0, Number(item.largura) || 0,
          Number(item.volumeGeometrico) || 0, item.observacoes || ''
        ];

        vals.forEach((v, vi) => {
          const c = row.getCell(vi + 1);
          c.value = CubagemExcelExport.sanitizeCellValue(v);
          c.font = { name: FONT_NAME, size: 9, color: { argb: C.texto } };
          c.border = thinBorder;
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: vi === 16 ? 'D6C7A1' : bg } };
          if (vi === 0 || vi === 2 || vi === 3 || vi === 4 || vi === 5 || vi === 6 || vi === 7 || vi === 8 || vi === 10) c.alignment = { horizontal: 'center', vertical: 'middle' };
          else if (vi >= 12 && vi <= 16) {
            c.alignment = { horizontal: 'right', vertical: 'middle' };
            c.numFmt = vi === 13 ? '#,##0.0000' : '#,##0.00';
            if (vi === 16) c.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.verde } };
          } else c.alignment = { horizontal: 'left', vertical: 'middle' };
        });
        rPilIdx++;
      });

      // Linha de TOTAL GERAL de Pilhas
      const totPilRow = wsPil.getRow(rPilIdx);
      totPilRow.height = 26;
      wsPil.mergeCells(`A${rPilIdx}:P${rPilIdx}`);
      const cTotPilTit = totPilRow.getCell(1);
      cTotPilTit.value = `TOTAL GERAL DE PILHAS DE MADEIRA (${pilhas.length} PILHAS MEDIDAS):`;
      cTotPilTit.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.creme } };
      cTotPilTit.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
      cTotPilTit.alignment = { horizontal: 'right', vertical: 'middle' };
      cTotPilTit.border = doubleBottomBorder;

      const cTotPilVol = totPilRow.getCell(17);
      cTotPilVol.value = vPil;
      cTotPilVol.numFmt = '#,##0.00 "m³"';
      cTotPilVol.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: C.creme } };
      cTotPilVol.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.ouro } };
      cTotPilVol.alignment = { horizontal: 'right', vertical: 'middle' };
      cTotPilVol.border = doubleBottomBorder;

      const cTotPilObs = totPilRow.getCell(18);
      cTotPilObs.value = 'Volume Total Homologado';
      cTotPilObs.font = { name: FONT_NAME, size: 9, bold: true, italic: true, color: { argb: C.creme } };
      cTotPilObs.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
      cTotPilObs.alignment = { horizontal: 'left', vertical: 'middle' };
      cTotPilObs.border = doubleBottomBorder;
    }

    // =========================================================================
    // ABA 4: TORAS (Smalian)
    // =========================================================================
    const caminhoesComToras = caminhoes.filter(c => c.modoCarga === 'toras' || (Array.isArray(c.toras) && c.toras.length > 0));
    const todasTorasParaAba = [...toras, ...caminhoesComToras];

    if (todasTorasParaAba.length > 0) {
      const wsTor = workbook.addWorksheet('Toras', { views: [{ showGridLines: true }] });
      wsTor.columns = [
        { key: 'num', width: 6 },
        { key: 'id', width: 22 },
        { key: 'viagem', width: 14 },
        { key: 'data', width: 12 },
        { key: 'horario', width: 9 },
        { key: 'plaqueta', width: 16 },
        { key: 'especie', width: 22 },
        { key: 'local', width: 18 },
        { key: 'km', width: 14 },
        { key: 'lat', width: 16 },
        { key: 'long', width: 16 },
        { key: 'responsavel', width: 20 },
        { key: 'd1_cm', width: 15 },
        { key: 'd2_cm', width: 15 },
        { key: 'dm_cm', width: 15 },
        { key: 'comp', width: 15 },
        { key: 'vol_smalian', width: 20 },
        { key: 'obs', width: 28 }
      ];

      wsTor.mergeCells('A1:R1');
      const hTor = wsTor.getCell('A1');
      hTor.value = '   BIOKURI PESQUISA E SOLUÇÕES AMBIENTAIS — CUBAGEM DE TORAS (SMALIAN)';
      hTor.font = { name: FONT_NAME, size: 13, bold: true, color: { argb: C.creme } };
      hTor.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
      hTor.alignment = { vertical: 'middle', horizontal: 'center' };
      wsTor.getRow(1).height = 32;

      const torCols = [
        '#', 'Identificação / Lote', 'Nº Viagem', 'Data', 'Horário', 'Nº Plaqueta', 'Espécie Florestal',
        'Local / Pátio', 'Km', 'Latitude', 'Longitude', 'Responsável',
        'Diâm. Ponta 1 (cm)', 'Diâm. Ponta 2 (cm)', 'Diâm. Médio (cm)', 'Comprimento (m)',
        'Vol. Smalian (m³)', 'Observações'
      ];
      const zonaTor = CubagemExcelExport.obterZonaPadrao(todasTorasParaAba);
      CubagemExcelExport.renderMultiHeader(wsTor, torCols, 10, zonaTor, C, FONT_NAME, thinBorder);

      let rTorIdx = 4;
      let totalTorasLinhas = 0;

      todasTorasParaAba.forEach((pileItem) => {
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

          const trip = getTripInfo(pileItem);
          const toraViagem = item.viagem || (item.numeroViagem ? `${item.numeroViagem}ª Viagem` : (pileItem.tipo === 'caminhao' ? trip.label : '—'));
          const identItem = pileItem.tipo === 'caminhao'
            ? `Retirada ${pileItem.placa || 'S/P'}`
            : (pileItem.identificacao || pileItem.id);

          const coords = CubagemExcelExport.extrairCoordenadas(item.latitude ? item : pileItem);
          const vals = [
            totalTorasLinhas,
            identItem,
            toraViagem,
            this.formatDateBR(pileItem.data),
            pileItem.horario,
            item.plaqueta || 'S/P',
            item.especie || pileItem.especie || 'Não informada',
            pileItem.rodovia || 'Pátio',
            pileItem.km || '',
            coords.latitude,
            coords.longitude,
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
            c.value = CubagemExcelExport.sanitizeCellValue(v);
            c.font = { name: FONT_NAME, size: 9, color: { argb: C.texto } };
            c.border = thinBorder;
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: vi === 16 ? 'D6C7A1' : bg } };
            if (vi === 0 || vi === 2 || vi === 3 || vi === 4 || vi === 5 || vi === 7 || vi === 8 || vi === 9 || vi === 10 || vi === 11) {
              c.alignment = { horizontal: 'center', vertical: 'middle' };
              if (vi === 2 && toraViagem !== '—') {
                c.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: 'FF8C4A37' } };
              }
            } else if (vi === 6) {
              c.alignment = { horizontal: 'left', vertical: 'middle' };
              c.font = { name: FONT_NAME, size: 9, italic: true, color: { argb: C.texto } };
            } else if (vi >= 12 && vi <= 16) {
              c.alignment = { horizontal: 'right', vertical: 'middle' };
              c.numFmt = vi === 14 ? '#,##0.0' : (vi === 15 ? '#,##0.00' : (vi === 16 ? '#,##0.000' : '#,##0.0'));
              if (vi === 16) c.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.verde } };
            } else c.alignment = { horizontal: 'left', vertical: 'middle' };
          });

          rTorIdx++;
        });

        // Se a pilha tiver mais de 1 indivíduo, adiciona linha de subtotal da pilha
        if (torasIndiv.length > 1) {
          const subRow = wsTor.getRow(rTorIdx);
          subRow.height = 22;
          const avgDm = subtotalDmPilha / torasIndiv.length;

          // Mescla colunas 1 a 12 para o título do subtotal
          wsTor.mergeCells(`A${rTorIdx}:L${rTorIdx}`);
          const cTit = subRow.getCell(1);
          const tripSub = getTripInfo(pileItem);
          cTit.value = pileItem.tipo === 'caminhao'
            ? `SUBTOTAL RETIRADA ${pileItem.placa || ''} (${tripSub.label}) (${torasIndiv.length} toras):`
            : `SUBTOTAL DA PILHA (${torasIndiv.length} toras) — ${pileItem.identificacao || pileItem.id}`;
          cTit.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: C.creme } };
          cTit.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.ouro } };
          cTit.alignment = { horizontal: 'right', vertical: 'middle' };
          cTit.border = thinBorder;

          for (let col = 13; col <= 14; col++) {
            const c = subRow.getCell(col);
            c.value = '-';
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8DFCE' } };
            c.border = thinBorder;
            c.alignment = { horizontal: 'center', vertical: 'middle' };
          }

          const cDm = subRow.getCell(15);
          cDm.value = avgDm;
          cDm.numFmt = '#,##0.0';
          cDm.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: C.verde } };
          cDm.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8DFCE' } };
          cDm.border = thinBorder;
          cDm.alignment = { horizontal: 'right', vertical: 'middle' };

          const cComp = subRow.getCell(16);
          cComp.value = '-';
          cComp.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8DFCE' } };
          cComp.border = thinBorder;
          cComp.alignment = { horizontal: 'center', vertical: 'middle' };

          const cVol = subRow.getCell(17);
          cVol.value = subtotalVolPilha;
          cVol.numFmt = '#,##0.000';
          cVol.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.verde } };
          cVol.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D6C7A1' } };
          cVol.border = thinBorder;
          cVol.alignment = { horizontal: 'right', vertical: 'middle' };

          const cObs = subRow.getCell(18);
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

      wsTor.mergeCells(`A${rTorIdx}:N${rTorIdx}`);
      const cTotTit = totTorRow.getCell(1);
      cTotTit.value = `TOTAL GERAL DA CUBAGEM DE TORAS (${totalTorasLinhas} TORAS AVALIADAS):`;
      cTotTit.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.creme } };
      cTotTit.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
      cTotTit.alignment = { horizontal: 'right', vertical: 'middle' };
      cTotTit.border = doubleBottomBorder;

      const allTorasIndiv = todasTorasParaAba.flatMap(p => (p.toras && Array.isArray(p.toras) && p.toras.length > 0) ? p.toras : [p]);
      const avgDmGeral = allTorasIndiv.length > 0
        ? allTorasIndiv.reduce((acc, t) => acc + (Number(t.diametroMedio_cm) || 0), 0) / allTorasIndiv.length
        : 0;
      const avgCompGeral = allTorasIndiv.length > 0
        ? allTorasIndiv.reduce((acc, t) => acc + (Number(t.comprimento) || 0), 0) / allTorasIndiv.length
        : 0;

      const cTotDm = totTorRow.getCell(15);
      cTotDm.value = avgDmGeral;
      cTotDm.numFmt = '#,##0.0';
      cTotDm.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.creme } };
      cTotDm.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde2 } };
      cTotDm.alignment = { horizontal: 'right', vertical: 'middle' };
      cTotDm.border = doubleBottomBorder;

      const cTotComp = totTorRow.getCell(16);
      cTotComp.value = avgCompGeral;
      cTotComp.numFmt = '#,##0.00';
      cTotComp.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.creme } };
      cTotComp.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde2 } };
      cTotComp.alignment = { horizontal: 'right', vertical: 'middle' };
      cTotComp.border = doubleBottomBorder;

      const vTotTorasAba = todasTorasParaAba.reduce((acc, p) => {
        if (Array.isArray(p.toras) && p.toras.length > 0) {
          return acc + sumVol(p.toras);
        }
        const v = (window.CubagemCalculator && typeof window.CubagemCalculator.obterVolumeEfetivo === 'function')
          ? window.CubagemCalculator.obterVolumeEfetivo(p)
          : (Number(p.volumeGeometrico) || 0);
        return acc + v;
      }, 0);

      const cTotVol = totTorRow.getCell(17);
      cTotVol.value = vTotTorasAba;
      cTotVol.numFmt = '#,##0.000 "m³"';
      cTotVol.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: C.creme } };
      cTotVol.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.ouro } };
      cTotVol.alignment = { horizontal: 'right', vertical: 'middle' };
      cTotVol.border = doubleBottomBorder;

      const cTotObs = totTorRow.getCell(18);
      cTotObs.value = 'Volume Total Homologado';
      cTotObs.font = { name: FONT_NAME, size: 9, bold: true, italic: true, color: { argb: C.creme } };
      cTotObs.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
      cTotObs.alignment = { horizontal: 'left', vertical: 'middle' };
      cTotObs.border = doubleBottomBorder;
    }

    // =========================================================================
    // ABA: BALANÇO DE CUBAGEM E RETIRADA POR KM (LOGÍSTICA FLORESTAL)
    // =========================================================================
    const recordsComKm = records.filter(r => r.km && String(r.km).trim());
    if (recordsComKm.length > 0) {
      const wsKm = workbook.addWorksheet('Balanço por Km', { views: [{ showGridLines: true }] });
      wsKm.columns = [
        { key: 'num', width: 6 },
        { key: 'km', width: 18 },
        { key: 'vol_entrada', width: 22 },
        { key: 'qtd_pilhas', width: 14 },
        { key: 'qtd_toras', width: 14 },
        { key: 'vol_retirada', width: 22 },
        { key: 'qtd_cargas', width: 14 },
        { key: 'saldo_restante', width: 22 },
        { key: 'perc_retirado', width: 16 },
        { key: 'perc_nativa', width: 18 },
        { key: 'perc_exotica', width: 18 },
        { key: 'status_km', width: 22 },
        { key: 'responsaveis', width: 26 }
      ];

      wsKm.mergeCells('A1:M1');
      const hKm = wsKm.getCell('A1');
      hKm.value = '   BIOKURI PESQUISA E SOLUÇÕES AMBIENTAIS — BALANÇO DE CUBAGEM & RETIRADA POR KM';
      hKm.font = { name: FONT_NAME, size: 13, bold: true, color: { argb: C.creme } };
      hKm.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
      hKm.alignment = { vertical: 'middle', horizontal: 'center' };
      wsKm.getRow(1).height = 32;

      const kmCols = [
        '#', 'Km / Localização', 'Vol. Cubado Entrada (m³)', 'Qtd. Pilhas', 'Qtd. Toras',
        'Vol. Retirado Saída (m³)', 'Cargas Caminhão', 'Saldo Restante no Km (m³)',
        '% Retirado', '% Nativa a Retirar', '% Exótica a Retirar', 'Status de Liberação', 'Equipe / Responsáveis'
      ];

      const rHdrKm = wsKm.addRow(kmCols);
      rHdrKm.height = 26;
      rHdrKm.eachCell(c => {
        c.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.creme } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde2 } };
        c.alignment = { vertical: 'middle', horizontal: 'center' };
        c.border = thinBorder;
      });

      // Agrupamento por KM normalizado
      const normKm = (km) => {
        let s = String(km || '').trim().replace(/\s+/g, ' ');
        if (/^\d+([.,]\d+)?$/i.test(s)) return `Km ${s.replace(',', '.')}`;
        if (/^km\s*([0-9].*)$/i.test(s)) return `Km ${s.replace(/^km\s*/i, '').trim()}`;
        if (/^km\b/i.test(s)) return `Km ${s.slice(2).trim()}`;
        return s;
      };

      const kmMap = new Map();
      recordsComKm.forEach(r => {
        const dKm = normKm(r.km);
        const k = dKm.toLowerCase();
        if (!kmMap.has(k)) {
          kmMap.set(k, {
            km: dKm,
            volEntrada: 0,
            volEntradaNativa: 0,
            volEntradaExotica: 0,
            volRetirada: 0,
            volRetiradaNativa: 0,
            volRetiradaExotica: 0,
            pilhasCount: 0,
            torasCount: 0,
            caminhoesCount: 0,
            responsaveis: new Set()
          });
        }
        const item = kmMap.get(k);
        const v = (window.CubagemCalculator && typeof window.CubagemCalculator.obterVolumeEfetivo === 'function')
          ? window.CubagemCalculator.obterVolumeEfetivo(r)
          : (Number(r.volumeGeometrico) || 0);

        const resp = r.autorNome || r.responsavel || '';
        if (resp) item.responsaveis.add(resp);

        const rawOrig = String(r.origemMadeira || r.origem || '').trim().toLowerCase();
        const isExotica = rawOrig.includes('exot') || rawOrig.includes('exót');

        if (r.tipo === 'caminhao') {
          item.volRetirada += v;
          item.caminhoesCount += 1;
          if (isExotica) item.volRetiradaExotica += v;
          else item.volRetiradaNativa += v;
        } else {
          item.volEntrada += v;
          if (r.tipo === 'pilha') item.pilhasCount += 1;
          if (r.tipo === 'tora') item.torasCount += 1;
          if (isExotica) item.volEntradaExotica += v;
          else item.volEntradaNativa += v;
        }
      });

      const kmList = Array.from(kmMap.values()).map(it => {
        const saldo = Math.max(0, it.volEntrada - it.volRetirada);
        let saldoNat = Math.max(0, it.volEntradaNativa - it.volRetiradaNativa);
        let saldoExo = Math.max(0, it.volEntradaExotica - it.volRetiradaExotica);

        if (saldo <= 0.005) {
          saldoNat = 0;
          saldoExo = 0;
        } else {
          const somaP = saldoNat + saldoExo;
          if (somaP > 0 && Math.abs(somaP - saldo) > 0.05) {
            saldoNat = (saldoNat / somaP) * saldo;
            saldoExo = (saldoExo / somaP) * saldo;
          }
        }

        let pNat = 0;
        let pExo = 0;
        if (saldo > 0.005) {
          const base = saldoNat + saldoExo;
          if (base > 0) {
            pNat = Math.round((saldoNat / base) * 100);
            pExo = 100 - pNat;
          }
        } else if (it.volEntrada > 0) {
          pNat = Math.round(((it.volEntradaNativa || 0) / it.volEntrada) * 100);
          pExo = 100 - pNat;
        }

        const perc = it.volEntrada > 0 ? Math.round((it.volRetirada / it.volEntrada) * 100) : (it.volRetirada > 0 ? 100 : 0);
        const concluido = (it.volEntrada > 0 && saldo <= 0.005) || (it.volEntrada === 0 && it.volRetirada > 0);
        return {
          ...it,
          saldo,
          saldoNat,
          saldoExo,
          percNativa: Math.min(100, Math.max(0, pNat)),
          percExotica: Math.min(100, Math.max(0, pExo)),
          perc: Math.min(100, Math.max(0, perc)),
          concluido
        };
      });

      kmList.sort((a, b) => {
        const numA = parseFloat(a.km.replace(/[^\d.]/g, ''));
        const numB = parseFloat(b.km.replace(/[^\d.]/g, ''));
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.km.localeCompare(b.km, 'pt-BR', { numeric: true });
      });

      let totEntradaKm = 0;
      let totEntradaNat = 0;
      let totEntradaExo = 0;
      let totRetiradaKm = 0;
      let totRetiradaNat = 0;
      let totRetiradaExo = 0;
      let totPilhasKm = 0;
      let totTorasKm = 0;
      let totCaminhoesKm = 0;

      kmList.forEach((it, idx) => {
        totEntradaKm += it.volEntrada;
        totEntradaNat += it.volEntradaNativa;
        totEntradaExo += it.volEntradaExotica;
        totRetiradaKm += it.volRetirada;
        totRetiradaNat += it.volRetiradaNativa;
        totRetiradaExo += it.volRetiradaExotica;
        totPilhasKm += it.pilhasCount;
        totTorasKm += it.torasCount;
        totCaminhoesKm += it.caminhoesCount;

        const rowKm = wsKm.addRow([
          idx + 1,
          it.km,
          it.volEntrada,
          it.pilhasCount,
          it.torasCount,
          it.volRetirada,
          it.caminhoesCount,
          it.saldo,
          `${it.perc}%`,
          `${it.percNativa}%`,
          `${it.percExotica}%`,
          it.concluido ? '✓ 100% RETIRADO' : 'EM ANDAMENTO',
          Array.from(it.responsaveis).join(', ') || '-'
        ]);

        rowKm.height = 20;
        const bgRow = idx % 2 === 0 ? C.creme : C.creme2;
        rowKm.eachCell({ includeEmpty: true }, (c, colNum) => {
          c.font = { name: FONT_NAME, size: 9, color: { argb: C.texto } };
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgRow } };
          c.border = thinBorder;
          if (colNum === 1) c.alignment = { horizontal: 'center' };
          if (colNum === 2) { c.alignment = { horizontal: 'center' }; c.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: C.verde } }; }
          if (colNum === 3 || colNum === 6 || colNum === 8) {
            c.numFmt = '#,##0.000 "m³"';
            c.alignment = { horizontal: 'right' };
          }
          if (colNum === 4 || colNum === 5 || colNum === 7) {
            c.numFmt = '#,##0';
            c.alignment = { horizontal: 'center' };
          }
          if (colNum === 9 || colNum === 10 || colNum === 11) c.alignment = { horizontal: 'center' };
          if (colNum === 12) {
            c.alignment = { horizontal: 'center' };
            c.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: it.concluido ? '0E8038' : 'B45309' } };
          }
        });
      });

      // Linha de Totais
      const totSaldo = Math.max(0, totEntradaKm - totRetiradaKm);
      const totSaldoNat = Math.max(0, totEntradaNat - totRetiradaNat);
      const totSaldoExo = Math.max(0, totEntradaExo - totRetiradaExo);
      const totBase = totSaldoNat + totSaldoExo;
      const totPercNat = totBase > 0 ? Math.round((totSaldoNat / totBase) * 100) : (totEntradaKm > 0 ? Math.round((totEntradaNat / totEntradaKm) * 100) : 0);
      const totPercExo = 100 - totPercNat;

      const totKmRow = wsKm.addRow([
        'TOTAIS',
        `${kmList.length} KMs`,
        totEntradaKm,
        totPilhasKm,
        totTorasKm,
        totRetiradaKm,
        totCaminhoesKm,
        totSaldo,
        totEntradaKm > 0 ? `${Math.min(100, Math.round((totRetiradaKm / totEntradaKm) * 100))}%` : '100%',
        `${totPercNat}%`,
        `${totPercExo}%`,
        totEntradaKm > 0 && (totSaldo <= 0.005) ? '✓ 100% RETIRADO' : 'EM ANDAMENTO',
        'Consolidado da Rodovia'
      ]);
      totKmRow.height = 24;
      totKmRow.eachCell({ includeEmpty: true }, (c, colNum) => {
        c.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: C.creme } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.verde } };
        c.border = doubleBottomBorder;
        if (colNum === 1 || colNum === 2 || colNum === 9 || colNum === 10 || colNum === 11 || colNum === 12) c.alignment = { horizontal: 'center', vertical: 'middle' };
        if (colNum === 3 || colNum === 6 || colNum === 8) {
          c.numFmt = '#,##0.000 "m³"';
          c.alignment = { horizontal: 'right', vertical: 'middle' };
        }
        if (colNum === 4 || colNum === 5 || colNum === 7) {
          c.numFmt = '#,##0';
          c.alignment = { horizontal: 'center', vertical: 'middle' };
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

    if (options.download !== false) {
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
    }

    return {
      success: true,
      fileName: finalFileName,
      recordsCount: records.length,
      totalVolume: vTot,
      workbook
    };
  }
}

window.CubagemExcelExport = CubagemExcelExport;

