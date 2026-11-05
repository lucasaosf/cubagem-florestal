/**
 * app.js - Controlador principal do Aplicativo Cubagem Florestal
 * Gestão de interface, eventos, cálculos em tempo real e orquestração offline
 * Suporte a: Caminhão (LE/LD dinâmicos), Pilha de Madeira e Toras Roliças
 * Desenvolvido por Lucas Aøsf
 */

class CubagemApp {
  constructor() {
    this.currentView = 'inicio';
    this.deferredInstallPrompt = null;
    this.currentDetailItem = null;
    this.itemToDeleteId = null;

    // Modalidade ativa: 'caminhao' | 'pilha' | 'tora'
    this.tipoCubagem = 'caminhao';

    // Listas dinâmicas de alturas
    this.alturasLE = ['', '', ''];
    this.alturasLD = ['', '', ''];
    this.alturasPilha = ['', '', '', ''];

    // Filtros no histórico
    this.historyFilterTipo = 'todos';

    // Sistema de Autenticação e Nuvem
    this.auth = window.CubagemAuth ? new window.CubagemAuth() : null;
  }

  async init() {
    console.log('[Cubagem Florestal] Inicializando aplicativo multipasta...');

    try {
      await window.cubagemDB.init();
    } catch (err) {
      console.error('Falha ao inicializar banco local:', err);
      this.showToast('Erro ao inicializar banco de dados local.', 'danger');
    }

    this.registrarServiceWorker();
    this.configurarMonitorRede();
    this.configurarInstalacaoPWA();

    if (this.auth) {
      this.auth.init().catch((e) => console.warn('[Auth] Init:', e));
    }

    this.renderizarGridsAlturas();
    this.configurarCalculoTempoReal();
    await this.carregarPreferenciasIniciais();
    await this.atualizarDashboard();

    const searchInput = document.getElementById('historySearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.carregarHistorico());
    }

    this.setReportPeriod('mes-atual', false);
    console.log('[Cubagem Florestal] Inicialização concluída!');
  }

  toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = cur === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('cubagem.v1.theme', JSON.stringify(next));
    } catch (e) {}
    this.showToast(`Modo ${next === 'light' ? 'Claro' : 'Escuro'} ativado.`, 'info');
  }

  registrarServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('./sw.js')
          .then((reg) => console.log('[Service Worker] Ativo:', reg.scope))
          .catch((err) => console.warn('[Service Worker] Falha:', err));
      });
    }
  }

  configurarMonitorRede() {
    const updateStatus = () => {
      const dot = document.getElementById('statusDot');
      const text = document.getElementById('statusText');
      if (!dot || !text) return;

      if (navigator.onLine) {
        dot.style.backgroundColor = 'var(--sage)';
        text.textContent = 'Online';
        if (this.auth && this.auth.user) {
          this.auth.syncAllWithCloud(true);
        }
      } else {
        dot.style.backgroundColor = 'var(--gold)';
        text.textContent = '100% Offline';
      }
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
  }

  configurarInstalacaoPWA() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      const btn = document.getElementById('btnInstallPwa');
      if (btn) btn.style.display = 'block';
    });

    window.addEventListener('appinstalled', () => {
      this.deferredInstallPrompt = null;
      const btn = document.getElementById('btnInstallPwa');
      if (btn) btn.style.display = 'none';
      this.showToast('Aplicativo instalado no celular com sucesso!', 'success');
    });
  }

  async instalarPwa() {
    if (this.deferredInstallPrompt) {
      this.deferredInstallPrompt.prompt();
      const choice = await this.deferredInstallPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        this.showToast('Instalando aplicativo...', 'success');
      }
      this.deferredInstallPrompt = null;
      const btn = document.getElementById('btnInstallPwa');
      if (btn) btn.style.display = 'none';
    }
  }

  async navigate(viewId) {
    const views = ['inicio', 'nova', 'historico', 'relatorios', 'configuracoes'];
    if (!views.includes(viewId)) return;

    views.forEach((v) => {
      const el = document.getElementById(`view-${v}`);
      if (el) el.classList.toggle('active', v === viewId);
    });

    document.querySelectorAll('.nav-item').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-target') === viewId);
    });

    this.currentView = viewId;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (viewId === 'inicio') await this.atualizarDashboard();
    else if (viewId === 'nova') this.resetarDataHoraAtual();
    else if (viewId === 'historico') await this.carregarHistorico();
    else if (viewId === 'relatorios') await this.atualizarRelatorioPeriodo();
    else if (viewId === 'configuracoes') await this.carregarCamposConfiguracoes();
  }

  resetarDataHoraAtual() {
    const dataInput = document.getElementById('cubData');
    const horarioInput = document.getElementById('cubHorario');
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');

    if (dataInput && !dataInput.value) {
      dataInput.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    }
    if (horarioInput && !horarioInput.value) {
      horarioInput.value = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    }
  }

  async carregarPreferenciasIniciais() {
    this.resetarDataHoraAtual();
    const respPadrao = await window.cubagemDB.getSetting('defaultResponsavel', 'Lucas Aøsf');
    const rodPadrao = await window.cubagemDB.getSetting('defaultRodovia', '');

    const respInput = document.getElementById('cubResponsavel');
    const rodInput = document.getElementById('cubRodovia');

    if (respInput && respPadrao && !respInput.value) respInput.value = respPadrao;
    if (rodInput && rodPadrao && !rodInput.value) rodInput.value = rodPadrao;
  }

  // =========================================================================
  // GESTÃO DE MODALIDADES (CAMINHÃO / PILHA / TORA)
  // =========================================================================
  setTipoCubagem(tipo) {
    this.tipoCubagem = tipo;

    document.querySelectorAll('.type-pill').forEach((p) => p.classList.remove('active'));
    const activeBtn = document.getElementById(tipo === 'caminhao' ? 'btnTypeCaminhao' : (tipo === 'pilha' ? 'btnTypePilha' : 'btnTypeTora'));
    if (activeBtn) activeBtn.classList.add('active');

    // Alternar visibilidade das seções
    const secCam = document.getElementById('sectionCaminhao');
    const secPil = document.getElementById('sectionPilha');
    const secTor = document.getElementById('sectionTora');

    const grpPlaca = document.getElementById('grpPlaca');
    const grpIdentPilha = document.getElementById('grpIdentPilha');
    const grpPlaqueta = document.getElementById('grpPlaqueta');
    const lblRodovia = document.getElementById('lblRodovia');

    if (tipo === 'caminhao') {
      secCam.style.display = 'block';
      secPil.style.display = 'none';
      secTor.style.display = 'none';
      grpPlaca.style.display = 'block';
      grpIdentPilha.style.display = 'none';
      grpPlaqueta.style.display = 'none';
      lblRodovia.innerHTML = 'Rodovia / BR <span class="required">*</span>';
      document.getElementById('liveTypeBadge').textContent = 'Carga de Caminhão';
    } else if (tipo === 'pilha') {
      secCam.style.display = 'none';
      secPil.style.display = 'block';
      secTor.style.display = 'none';
      grpPlaca.style.display = 'none';
      grpIdentPilha.style.display = 'block';
      grpPlaqueta.style.display = 'none';
      lblRodovia.innerHTML = 'Local / Pátio / Rodovia <span class="required">*</span>';
      document.getElementById('liveTypeBadge').textContent = 'Pilha de Madeira';
    } else if (tipo === 'tora') {
      secCam.style.display = 'none';
      secPil.style.display = 'none';
      secTor.style.display = 'block';
      grpPlaca.style.display = 'none';
      grpIdentPilha.style.display = 'none';
      grpPlaqueta.style.display = 'block';
      lblRodovia.innerHTML = 'Local / Pátio <span class="required">*</span>';
      document.getElementById('liveTypeBadge').textContent = 'Tora Roliça (Smalian)';
    }

    this.executarCalculoTempoReal();
  }

  // =========================================================================
  // GESTÃO DINÂMICA DE ALTURAS (ADICIONAR / REMOVER)
  // =========================================================================
  adicionarAltura(lado) {
    if (lado === 'LE') {
      this.alturasLE.push('');
      this.renderizarGridLado('LE', this.alturasLE, 'gridAlturasLE', 'highlight-le');
    } else if (lado === 'LD') {
      this.alturasLD.push('');
      this.renderizarGridLado('LD', this.alturasLD, 'gridAlturasLD', 'highlight-ld');
    } else if (lado === 'Pilha') {
      this.alturasPilha.push('');
      this.renderizarGridLado('Pilha', this.alturasPilha, 'gridAlturasPilha', 'highlight-pilha');
    }
    this.atualizarContadoresAlturas();
    this.executarCalculoTempoReal();
  }

  removerAltura(lado, index) {
    if (lado === 'LE') {
      if (this.alturasLE.length <= 1) return;
      this.alturasLE.splice(index, 1);
      this.renderizarGridLado('LE', this.alturasLE, 'gridAlturasLE', 'highlight-le');
    } else if (lado === 'LD') {
      if (this.alturasLD.length <= 1) return;
      this.alturasLD.splice(index, 1);
      this.renderizarGridLado('LD', this.alturasLD, 'gridAlturasLD', 'highlight-ld');
    } else if (lado === 'Pilha') {
      if (this.alturasPilha.length <= 1) return;
      this.alturasPilha.splice(index, 1);
      this.renderizarGridLado('Pilha', this.alturasPilha, 'gridAlturasPilha', 'highlight-pilha');
    }
    this.atualizarContadoresAlturas();
    this.executarCalculoTempoReal();
  }

  renderizarGridsAlturas() {
    this.renderizarGridLado('LE', this.alturasLE, 'gridAlturasLE', 'highlight-le');
    this.renderizarGridLado('LD', this.alturasLD, 'gridAlturasLD', 'highlight-ld');
    this.renderizarGridLado('Pilha', this.alturasPilha, 'gridAlturasPilha', 'highlight-pilha');
    this.atualizarContadoresAlturas();
  }

  renderizarGridLado(lado, array, containerId, highlightClass) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = array.map((val, i) => `
      <div class="measure-input-card ${highlightClass}">
        <div class="measure-input-label">
          <span>${lado} ${i + 1}</span>
          ${array.length > 1 ? `<button type="button" class="btn-remove-alt" onclick="app.removerAltura('${lado}', ${i})" title="Remover">&times;</button>` : ''}
        </div>
        <input type="text" inputmode="decimal" value="${val}" class="measure-input-field dynamic-alt-input" data-lado="${lado}" data-index="${i}" placeholder="0,00">
      </div>
    `).join('');

    container.querySelectorAll('.dynamic-alt-input').forEach((input) => {
      input.addEventListener('input', (e) => {
        const l = e.target.getAttribute('data-lado');
        const idx = parseInt(e.target.getAttribute('data-index'));
        if (l === 'LE') this.alturasLE[idx] = e.target.value;
        else if (l === 'LD') this.alturasLD[idx] = e.target.value;
        else if (l === 'Pilha') this.alturasPilha[idx] = e.target.value;
        this.executarCalculoTempoReal();
      });
    });
  }

  atualizarContadoresAlturas() {
    const cLE = document.getElementById('countLELabel');
    const cLD = document.getElementById('countLDLabel');
    const cPil = document.getElementById('countPilhaLabel');
    if (cLE) cLE.textContent = `${this.alturasLE.length} alturas`;
    if (cLD) cLD.textContent = `${this.alturasLD.length} alturas`;
    if (cPil) cPil.textContent = `${this.alturasPilha.length} alturas`;
  }

  // =========================================================================
  // CÁLCULO EM TEMPO REAL E ATUALIZAÇÃO DA TELA
  // =========================================================================
  configurarCalculoTempoReal() {
    document.querySelectorAll('.calc-trigger').forEach((inp) => {
      inp.addEventListener('input', () => this.executarCalculoTempoReal());
    });
  }

  executarCalculoTempoReal() {
    const volEl = document.getElementById('liveVolumeDisplay');
    const memEl = document.getElementById('liveMemoryText');
    const l1 = document.getElementById('liveDetLabel1');
    const v1 = document.getElementById('liveDetVal1');
    const l2 = document.getElementById('liveDetLabel2');
    const v2 = document.getElementById('liveDetVal2');
    const l3 = document.getElementById('liveDetLabel3');
    const v3 = document.getElementById('liveDetVal3');

    if (this.tipoCubagem === 'caminhao') {
      const comp = document.getElementById('cubComprimentoCam').value;
      const larg = document.getElementById('cubLarguraCam').value;
      const res = window.CubagemCalculator.calculateCaminhao({
        alturasLE: this.alturasLE,
        alturasLD: this.alturasLD,
        comprimentoRaw: comp,
        larguraRaw: larg
      });

      l1.textContent = 'Soma Alturas';
      l2.textContent = 'Hm Média';
      l3.textContent = 'Dimensões (C × L)';

      if (res.isValid) {
        volEl.textContent = res.display.volumeGeometrico;
        v1.textContent = `${res.display.somaAlturas} m`;
        v2.textContent = `${res.display.alturaMedia} m`;
        v3.textContent = `${res.display.comprimento} × ${res.display.largura} m`;
        memEl.innerHTML = res.memoriaCalculo.join('<br>');
      } else {
        volEl.textContent = '0,00';
        v1.textContent = '0,00 m';
        v2.textContent = '0,00 m';
        v3.textContent = '0 × 0 m';
        memEl.textContent = 'Preencha todas as alturas (LE e LD) e as dimensões da carga.';
      }
    } else if (this.tipoCubagem === 'pilha') {
      const comp = document.getElementById('cubComprimentoPilha').value;
      const larg = document.getElementById('cubLarguraPilha').value;
      const res = window.CubagemCalculator.calculatePilha({
        alturas: this.alturasPilha,
        comprimentoRaw: comp,
        larguraRaw: larg
      });

      l1.textContent = 'Soma Face';
      l2.textContent = 'Hm da Pilha';
      l3.textContent = 'Dimensões (C × P)';

      if (res.isValid) {
        volEl.textContent = res.display.volumeGeometrico;
        v1.textContent = `${res.display.somaAlturas} m`;
        v2.textContent = `${res.display.alturaMedia} m`;
        v3.textContent = `${res.display.comprimento} × ${res.display.largura} m`;
        memEl.innerHTML = res.memoriaCalculo.join('<br>');
      } else {
        volEl.textContent = '0,00';
        v1.textContent = '0,00 m';
        v2.textContent = '0,00 m';
        v3.textContent = '0 × 0 m';
        memEl.textContent = 'Preencha as alturas da face da pilha, comprimento e profundidade.';
      }
    } else if (this.tipoCubagem === 'tora') {
      const d1 = document.getElementById('cubDiametroPonta1').value;
      const d2 = document.getElementById('cubDiametroPonta2').value;
      const comp = document.getElementById('cubComprimentoTora').value;
      const plaqueta = document.getElementById('cubPlaqueta').value;

      const res = window.CubagemCalculator.calculateTora({
        diametroPonta1Raw: d1,
        diametroPonta2Raw: d2,
        comprimentoRaw: comp,
        plaqueta: plaqueta
      });

      l1.textContent = 'Diâmetro Médio';
      l2.textContent = 'Comprimento';
      l3.textContent = 'Plaqueta';

      if (res.isValid) {
        volEl.textContent = res.display.volumeGeometrico;
        v1.textContent = res.display.diametroMedio;
        v2.textContent = res.display.comprimento;
        v3.textContent = res.plaqueta;
        memEl.innerHTML = res.memoriaCalculo.join('<br>');
      } else {
        volEl.textContent = '0,000';
        v1.textContent = '0 cm';
        v2.textContent = '0 m';
        v3.textContent = plaqueta || '-';
        memEl.textContent = 'Informe os diâmetros das duas pontas da tora e o comprimento.';
      }
    }
  }

  // =========================================================================
  // SALVAR CUBAGEM (CAMINHÃO, PILHA OU TORA)
  // =========================================================================
  async salvarCubagem() {
    const data = document.getElementById('cubData').value;
    const horario = document.getElementById('cubHorario').value;
    const rodovia = document.getElementById('cubRodovia').value.trim();
    const km = document.getElementById('cubKm').value.trim();
    const responsavel = document.getElementById('cubResponsavel').value.trim();
    const observacoes = document.getElementById('cubObservacoes').value.trim();

    if (!data || !horario || !rodovia || !responsavel) {
      this.showToast('Preencha os campos operacionais obrigatórios (Data, Horário, Local e Responsável).', 'warning');
      return;
    }

    let record = null;

    if (this.tipoCubagem === 'caminhao') {
      const comp = document.getElementById('cubComprimentoCam').value;
      const larg = document.getElementById('cubLarguraCam').value;
      const placa = document.getElementById('cubPlaca').value.trim().toUpperCase();

      const calc = window.CubagemCalculator.calculateCaminhao({
        alturasLE: this.alturasLE,
        alturasLD: this.alturasLD,
        comprimentoRaw: comp,
        larguraRaw: larg
      });

      if (!calc.isValid) {
        this.showToast(calc.errors[0] || 'Verifique as medidas do caminhão.', 'danger');
        return;
      }

      record = {
        id: window.cubagemDB.generateId('CAM'),
        tipo: 'caminhao',
        data, horario, rodovia, km, responsavel,
        placa: placa || 'NÃO INFORMADA',
        observacoes,
        alturasLE: calc.alturasLE,
        alturasLD: calc.alturasLD,
        somaAlturas: calc.somaAlturas,
        totalAlturas: calc.totalAlturas,
        alturaMedia: calc.alturaMedia,
        comprimento: calc.comprimento,
        largura: calc.largura,
        volumeGeometrico: calc.volumeGeometrico,
        tipoVolume: calc.tipoVolume,
        memoriaCalculo: calc.memoriaCalculo,
        timestamp: Date.now()
      };
    } else if (this.tipoCubagem === 'pilha') {
      const comp = document.getElementById('cubComprimentoPilha').value;
      const larg = document.getElementById('cubLarguraPilha').value;
      const identPilha = document.getElementById('cubIdentPilha').value.trim();

      if (!identPilha) {
        this.showToast('Informe a identificação da pilha (ex: Pilha 01).', 'warning');
        return;
      }

      const calc = window.CubagemCalculator.calculatePilha({
        alturas: this.alturasPilha,
        comprimentoRaw: comp,
        larguraRaw: larg
      });

      if (!calc.isValid) {
        this.showToast(calc.errors[0] || 'Verifique as medidas da pilha.', 'danger');
        return;
      }

      record = {
        id: window.cubagemDB.generateId('PILHA'),
        tipo: 'pilha',
        data, horario, rodovia, km, responsavel,
        identificacao: identPilha,
        placa: identPilha,
        observacoes,
        alturas: calc.alturas,
        somaAlturas: calc.somaAlturas,
        totalAlturas: calc.totalAlturas,
        alturaMedia: calc.alturaMedia,
        comprimento: calc.comprimento,
        largura: calc.largura,
        volumeGeometrico: calc.volumeGeometrico,
        tipoVolume: calc.tipoVolume,
        memoriaCalculo: calc.memoriaCalculo,
        timestamp: Date.now()
      };
    } else if (this.tipoCubagem === 'tora') {
      const d1 = document.getElementById('cubDiametroPonta1').value;
      const d2 = document.getElementById('cubDiametroPonta2').value;
      const comp = document.getElementById('cubComprimentoTora').value;
      const plaqueta = document.getElementById('cubPlaqueta').value.trim();

      if (!plaqueta) {
        this.showToast('Informe o número da plaqueta de identificação da tora.', 'warning');
        return;
      }

      const calc = window.CubagemCalculator.calculateTora({
        diametroPonta1Raw: d1,
        diametroPonta2Raw: d2,
        comprimentoRaw: comp,
        plaqueta: plaqueta
      });

      if (!calc.isValid) {
        this.showToast(calc.errors[0] || 'Verifique os diâmetros e comprimento da tora.', 'danger');
        return;
      }

      record = {
        id: window.cubagemDB.generateId('TORA'),
        tipo: 'tora',
        data, horario, rodovia, km, responsavel,
        plaqueta: calc.plaqueta,
        placa: calc.plaqueta,
        observacoes,
        diametroPonta1_cm: calc.diametroPonta1_cm,
        diametroPonta2_cm: calc.diametroPonta2_cm,
        diametroPonta1_m: calc.diametroPonta1_m,
        diametroPonta2_m: calc.diametroPonta2_m,
        diametroMedio_cm: calc.diametroMedio_cm,
        comprimento: calc.comprimento,
        volumeGeometrico: calc.volumeGeometrico,
        tipoVolume: calc.tipoVolume,
        memoriaCalculo: calc.memoriaCalculo,
        timestamp: Date.now()
      };
    }

    try {
      await window.cubagemDB.add(record);

      if (this.auth) {
        this.auth.syncRecordToCloud(record);
      }

      const vFmt = window.CubagemCalculator.formatNumber(record.volumeGeometrico, record.tipo === 'tora' ? 3 : 2);
      this.showToast(`Cubagem de ${record.tipo.toUpperCase()} salva com sucesso! Volume: ${vFmt} m³`, 'success');

      this.limparApenasMedidas();
      this.resetarDataHoraAtual();
      await this.atualizarDashboard();
    } catch (err) {
      console.error('Erro ao salvar cubagem:', err);
      this.showToast('Erro ao gravar registro.', 'danger');
    }
  }

  limparApenasMedidas() {
    if (this.tipoCubagem === 'caminhao') {
      this.alturasLE = ['', '', ''];
      this.alturasLD = ['', '', ''];
      this.renderizarGridsAlturas();
      document.getElementById('cubComprimentoCam').value = '';
      document.getElementById('cubLarguraCam').value = '';
      document.getElementById('cubPlaca').value = '';
    } else if (this.tipoCubagem === 'pilha') {
      this.alturasPilha = ['', '', '', ''];
      this.renderizarGridsAlturas();
      document.getElementById('cubComprimentoPilha').value = '';
      document.getElementById('cubLarguraPilha').value = '';
      document.getElementById('cubIdentPilha').value = '';
    } else if (this.tipoCubagem === 'tora') {
      document.getElementById('cubDiametroPonta1').value = '';
      document.getElementById('cubDiametroPonta2').value = '';
      document.getElementById('cubComprimentoTora').value = '';
      document.getElementById('cubPlaqueta').value = '';
    }
    document.getElementById('cubObservacoes').value = '';
    this.executarCalculoTempoReal();
  }

  limparFormularioNova() {
    document.getElementById('formNovaCubagem').reset();
    this.alturasLE = ['', '', ''];
    this.alturasLD = ['', '', ''];
    this.alturasPilha = ['', '', '', ''];
    this.renderizarGridsAlturas();
    this.carregarPreferenciasIniciais();
    this.executarCalculoTempoReal();
    this.showToast('Formulário limpo.', 'warning');
  }

  // =========================================================================
  // DASHBOARD E ESTATÍSTICAS
  // =========================================================================
  async atualizarDashboard() {
    try {
      const stats = await window.cubagemDB.getStats();

      document.getElementById('kpiTotalVolume').innerHTML = `${window.CubagemCalculator.formatNumber(stats.totalVolume, 2)} <span class="kpi-unit">m³</span>`;
      document.getElementById('kpiTotalCaminhoes').textContent = stats.totalCaminhoes;
      document.getElementById('kpiTotalPilhas').textContent = stats.totalPilhas;
      document.getElementById('kpiPilhasVolume').textContent = `${window.CubagemCalculator.formatNumber(stats.volPilhas, 2)} m³ estéreo`;
      document.getElementById('kpiTotalToras').textContent = stats.totalToras;
      document.getElementById('kpiTorasVolume').textContent = `${window.CubagemCalculator.formatNumber(stats.volToras, 3)} m³ Smalian`;
      document.getElementById('kpiVolumeDetail').textContent = `${stats.totalCaminhoes} cam • ${stats.totalPilhas} pilhas • ${stats.totalToras} toras`;

      const container = document.getElementById('dashboardRecentList');
      if (!container) return;

      if (stats.recentItems.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-title">Nenhuma cubagem registrada ainda</div>
            <div class="empty-state-desc">Toque em "Nova Medição" para começar a registrar caminhões, pilhas ou toras.</div>
            <button class="btn btn-primary" onclick="app.navigate('nova')">Nova Medição</button>
          </div>
        `;
        return;
      }

      container.innerHTML = stats.recentItems.map((item) => this.gerarCardItemHTML(item)).join('');
    } catch (err) {
      console.error('Erro no dashboard:', err);
    }
  }

  // =========================================================================
  // HISTÓRICO
  // =========================================================================
  async carregarHistorico() {
    try {
      const searchVal = document.getElementById('historySearchInput').value;
      const items = await window.cubagemDB.search(searchVal, this.historyFilterTipo);

      const container = document.getElementById('historyListContainer');
      if (!container) return;

      if (items.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-title">Nenhum registro encontrado</div>
            <div class="empty-state-desc">Tente ajustar o termo de pesquisa ou os filtros de tipo.</div>
          </div>
        `;
        return;
      }

      container.innerHTML = items.map((item) => this.gerarCardItemHTML(item)).join('');
    } catch (err) {
      console.error('Erro no histórico:', err);
    }
  }

  filtrarHistoricoTipo(tipo) {
    this.historyFilterTipo = tipo;
    document.querySelectorAll('[data-hfilter]').forEach((btn) => {
      btn.classList.toggle('active-filter', btn.getAttribute('data-hfilter') === tipo);
    });
    this.carregarHistorico();
  }

  gerarCardItemHTML(item) {
    const tipo = item.tipo || 'caminhao';
    const isTora = tipo === 'tora';
    const volFormatado = window.CubagemCalculator.formatNumber(item.volumeGeometrico, isTora ? 3 : 2);
    const dataBR = window.CubagemExcelExport.formatDateBR(item.data);

    let tagTipo = '🚚 Caminhão';
    let tituloItem = item.placa || 'SEM PLACA';
    let subItem = `${item.rodovia} ${item.km ? '• km ' + item.km : ''}`;

    if (tipo === 'pilha') {
      tagTipo = '🪵 Pilha';
      tituloItem = item.identificacao || item.placa || 'Pilha Sem Identificação';
      const nAlt = Array.isArray(item.alturas) ? item.alturas.length : (item.totalAlturas || '-');
      subItem = `${item.rodovia} • ${nAlt} alturas`;
    } else if (tipo === 'tora') {
      tagTipo = '🌲 Tora (Smalian)';
      tituloItem = `Plaqueta: ${item.plaqueta || 'S/P'}`;
      subItem = `D: ${item.diametroMedio_cm ? Number(item.diametroMedio_cm).toFixed(1) + ' cm' : '-'} • L: ${item.comprimento || '-'} m`;
    }

    return `
      <div class="history-item-card">
        <div class="history-card-top">
          <span class="badge-type ${tipo}">${tagTipo}</span>
          <span class="history-tag-date">${dataBR} • ${item.horario || ''}</span>
        </div>
        <div class="history-card-body">
          <div>
            <div class="history-plate">${tituloItem}</div>
            <div class="history-resp">${subItem}</div>
            <div style="font-size: 0.75rem; color: var(--muted); margin-top: 2px;">Resp: ${item.responsavel || '-'}</div>
          </div>
          <div class="history-vol-badge">
            <div class="history-vol-num">${volFormatado}</div>
            <div class="history-vol-unit">m³ geom.</div>
          </div>
        </div>
        <div class="history-card-actions">
          <button class="btn-action-small" onclick="app.abrirDetalhes('${item.id}')">Detalhes</button>
          <button class="btn-action-small danger" onclick="app.abrirModalExcluir('${item.id}')">Excluir</button>
        </div>
      </div>
    `;
  }

  async abrirDetalhes(id) {
    const item = await window.cubagemDB.get(id);
    if (!item) return;

    this.currentDetailItem = item;
    const dataBR = window.CubagemExcelExport.formatDateBR(item.data);
    const tipo = item.tipo || 'caminhao';
    const isTora = tipo === 'tora';
    const fNum = (n, d = 2) => window.CubagemCalculator.formatNumber(n, d);

    document.getElementById('detalheModalTitulo').textContent = `Detalhes: ${tipo.toUpperCase()}`;

    let detalheHtml = '';
    if (tipo === 'caminhao') {
      const leStr = Array.isArray(item.alturasLE) ? item.alturasLE.map(v => fNum(v) + ' m').join(', ') : '-';
      const ldStr = Array.isArray(item.alturasLD) ? item.alturasLD.map(v => fNum(v) + ' m').join(', ') : '-';
      detalheHtml = `
        <div style="margin-bottom: 12px;">
          <strong>Placa:</strong> ${item.placa || 'Sem placa'}<br>
          <strong>Local:</strong> ${item.rodovia} ${item.km ? 'km ' + item.km : ''}<br>
          <strong>Data/Hora:</strong> ${dataBR} às ${item.horario}<br>
          <strong>Responsável:</strong> ${item.responsavel}
        </div>
        <div class="calc-result-card">
          <div class="calc-result-header">
            <span class="calc-result-tag">Volume Geométrico</span>
            <span class="calc-result-type-badge">${fNum(item.volumeGeometrico, 2)} m³</span>
          </div>
          <div style="font-size: 0.85rem; line-height: 1.6;">
            <strong>Alturas LE:</strong> ${leStr}<br>
            <strong>Alturas LD:</strong> ${ldStr}<br>
            <strong>Hm Média:</strong> ${fNum(item.alturaMedia, 4)} m<br>
            <strong>Dimensões:</strong> ${fNum(item.comprimento)} m × ${fNum(item.largura)} m
          </div>
        </div>
      `;
    } else if (tipo === 'pilha') {
      const altStr = Array.isArray(item.alturas) ? item.alturas.map(v => fNum(v) + ' m').join(', ') : '-';
      detalheHtml = `
        <div style="margin-bottom: 12px;">
          <strong>Identificação:</strong> ${item.identificacao || item.placa || 'Pilha'}<br>
          <strong>Local:</strong> ${item.rodovia} ${item.km ? 'km ' + item.km : ''}<br>
          <strong>Data/Hora:</strong> ${dataBR} às ${item.horario}<br>
          <strong>Responsável:</strong> ${item.responsavel}
        </div>
        <div class="calc-result-card">
          <div class="calc-result-header">
            <span class="calc-result-tag">Volume Estéreo</span>
            <span class="calc-result-type-badge">${fNum(item.volumeGeometrico, 2)} m³</span>
          </div>
          <div style="font-size: 0.85rem; line-height: 1.6;">
            <strong>Alturas da Face:</strong> ${altStr}<br>
            <strong>Hm da Pilha:</strong> ${fNum(item.alturaMedia, 4)} m<br>
            <strong>Comprimento:</strong> ${fNum(item.comprimento)} m | <strong>Profundidade:</strong> ${fNum(item.largura)} m
          </div>
        </div>
      `;
    } else if (tipo === 'tora') {
      detalheHtml = `
        <div style="margin-bottom: 12px;">
          <strong>Nº da Plaqueta:</strong> ${item.plaqueta || 'S/P'}<br>
          <strong>Local / Pátio:</strong> ${item.rodovia}<br>
          <strong>Data/Hora:</strong> ${dataBR} às ${item.horario}<br>
          <strong>Responsável:</strong> ${item.responsavel}
        </div>
        <div class="calc-result-card">
          <div class="calc-result-header">
            <span class="calc-result-tag">Volume Smalian</span>
            <span class="calc-result-type-badge">${fNum(item.volumeGeometrico, 3)} m³</span>
          </div>
          <div style="font-size: 0.85rem; line-height: 1.6;">
            <strong>Diâmetro Ponta 1 (fina):</strong> ${fNum(item.diametroPonta1_cm, 1)} cm<br>
            <strong>Diâmetro Ponta 2 (grossa):</strong> ${fNum(item.diametroPonta2_cm, 1)} cm<br>
            <strong>Diâmetro Médio:</strong> ${fNum(item.diametroMedio_cm, 1)} cm<br>
            <strong>Comprimento:</strong> ${fNum(item.comprimento, 2)} m
          </div>
        </div>
      `;
    }

    if (item.observacoes) {
      detalheHtml += `<div style="background: var(--surface-2); padding: 10px; border-radius: 8px; font-size: 0.85rem; margin-top: 10px;"><strong>Observações:</strong> ${item.observacoes}</div>`;
    }

    document.getElementById('detalheModalConteudo').innerHTML = detalheHtml;
    this.abrirModal('modalDetalhes');
  }

  async abrirModalExcluir(id) {
    const item = await window.cubagemDB.get(id);
    if (!item) return;

    this.itemToDeleteId = id;
    const vol = window.CubagemCalculator.formatNumber(item.volumeGeometrico, item.tipo === 'tora' ? 3 : 2);
    document.getElementById('excluirItemInfo').innerHTML = `
      Modalidade: <strong>${(item.tipo || 'caminhao').toUpperCase()}</strong><br>
      Identificação: <strong>${item.plaqueta || item.identificacao || item.placa || item.id}</strong><br>
      Volume: <strong>${vol} m³</strong>
    `;
    this.abrirModal('modalExcluir');
  }

  async confirmarExclusao() {
    if (!this.itemToDeleteId) return;
    const idParaExcluir = this.itemToDeleteId;
    try {
      await window.cubagemDB.delete(idParaExcluir);

      if (this.auth) {
        this.auth.deleteRecordFromCloud(idParaExcluir);
      }

      this.fecharModal('modalExcluir');
      this.itemToDeleteId = null;
      this.showToast('Registro excluído com sucesso.', 'warning');
      await this.carregarHistorico();
      await this.atualizarDashboard();
    } catch (err) {
      console.error('Erro ao excluir:', err);
      this.showToast('Erro ao excluir do banco.', 'danger');
    }
  }

  // =========================================================================
  // RELATÓRIOS E EXPORTAÇÃO EXCEL (.XLSX)
  // =========================================================================
  setReportPeriod(tipo, triggerUpdate = true) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    let start = '';
    let end = '';

    if (tipo === 'mes-atual') {
      start = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      end = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(lastDay)}`;
    } else if (tipo === 'mes-anterior') {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      start = `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}-01`;
      const lastDay = new Date(prev.getFullYear(), prev.getMonth() + 1, 0).getDate();
      end = `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}-${pad(lastDay)}`;
    } else if (tipo === 'ultimos-30') {
      const p30 = new Date();
      p30.setDate(p30.getDate() - 30);
      start = `${p30.getFullYear()}-${pad(p30.getMonth() + 1)}-${pad(p30.getDate())}`;
      end = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    } else if (tipo === 'todos') {
      start = '2000-01-01';
      end = '2099-12-31';
    }

    const sIn = document.getElementById('reportDataInicio');
    const eIn = document.getElementById('reportDataFim');
    const fIn = document.getElementById('reportFileName');
    if (sIn) sIn.value = start;
    if (eIn) eIn.value = end;
    if (fIn) fIn.value = `Cubagem_Florestal_${start}_a_${end}.xlsx`;

    if (triggerUpdate) this.atualizarRelatorioPeriodo();
  }

  async atualizarRelatorioPeriodo() {
    const start = document.getElementById('reportDataInicio').value;
    const end = document.getElementById('reportDataFim').value;
    const tipoSelect = document.getElementById('reportTipoSelect') ? document.getElementById('reportTipoSelect').value : 'todos';

    let records = [];
    if (start && end) {
      records = await window.cubagemDB.getByDateRange(start, end, tipoSelect);
    } else {
      records = await window.cubagemDB.getAll(false);
      if (tipoSelect !== 'todos') {
        records = records.filter(r => (r.tipo || 'caminhao') === tipoSelect);
      }
    }

    const count = records.length;
    const totalVol = records.reduce((acc, r) => acc + (Number(r.volumeGeometrico) || 0), 0);
    const mediaVol = count > 0 ? totalVol / count : 0;

    document.getElementById('repKpiVolume').innerHTML = `${window.CubagemCalculator.formatNumber(totalVol, 2)} <span class="kpi-unit">m³</span>`;
    document.getElementById('repKpiCaminhoes').textContent = count;
    document.getElementById('repKpiMedia').innerHTML = `${window.CubagemCalculator.formatNumber(mediaVol, 2)} <span class="kpi-unit">m³</span>`;
    document.getElementById('repPreviewCountBadge').textContent = `${count} registros`;

    const previewContainer = document.getElementById('reportPreviewList');
    if (!previewContainer) return;

    if (records.length === 0) {
      previewContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">Nenhum registro no período</div>
          <div class="empty-state-desc">Ajuste as datas para visualizar as medições correspondentes.</div>
        </div>
      `;
      return;
    }

    previewContainer.innerHTML = records.map((item) => this.gerarCardItemHTML(item)).join('');
  }

  async exportarPlanilhaExcel() {
    const start = document.getElementById('reportDataInicio').value;
    const end = document.getElementById('reportDataFim').value;
    const fileName = document.getElementById('reportFileName').value;
    const tipoSelect = document.getElementById('reportTipoSelect') ? document.getElementById('reportTipoSelect').value : 'todos';
    const btn = document.getElementById('btnExportarExcel');

    let records = [];
    if (start && end) {
      records = await window.cubagemDB.getByDateRange(start, end, tipoSelect);
    } else {
      records = await window.cubagemDB.getAll(false);
      if (tipoSelect !== 'todos') {
        records = records.filter(r => (r.tipo || 'caminhao') === tipoSelect);
      }
    }

    if (records.length === 0) {
      this.showToast('Nenhum registro encontrado no período para exportar.', 'warning');
      return;
    }

    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Gerando Planilha Multipasta Excel...';

    try {
      const respPadrao = await window.cubagemDB.getSetting('defaultResponsavel', 'Lucas Aøsf');
      const res = await window.CubagemExcelExport.exportWorkbook(records, {
        startDate: start,
        endDate: end,
        fileName: fileName,
        responsavel: respPadrao
      });

      this.showToast(`Planilha ${res.fileName} exportada com sucesso! (${res.recordsCount} registros)`, 'success');
    } catch (err) {
      console.error('Erro ao gerar Excel:', err);
      this.showToast(`Erro ao gerar Excel: ${err.message}`, 'danger');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }

  // =========================================================================
  // CONFIGURAÇÕES E BACKUP
  // =========================================================================
  async carregarCamposConfiguracoes() {
    const resp = await window.cubagemDB.getSetting('defaultResponsavel', 'Lucas Aøsf');
    const rod = await window.cubagemDB.getSetting('defaultRodovia', '');
    const rInput = document.getElementById('cfgResponsavel');
    const rodInput = document.getElementById('cfgRodovia');
    if (rInput) rInput.value = resp;
    if (rodInput) rodInput.value = rod;
  }

  async salvarPreferencias() {
    const resp = document.getElementById('cfgResponsavel').value.trim();
    const rod = document.getElementById('cfgRodovia').value.trim();
    await window.cubagemDB.setSetting('defaultResponsavel', resp);
    await window.cubagemDB.setSetting('defaultRodovia', rod);
    this.showToast('Preferências salvas com sucesso!', 'success');
  }

  async exportarBackupJSON() {
    try {
      const backup = await window.cubagemDB.exportBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const now = new Date().toISOString().slice(0, 10);
      const fileName = `Backup_Cubagem_Florestal_${now}.json`;

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      this.showToast(`Backup JSON baixado (${backup.totalRecords} registros).`, 'success');
    } catch (err) {
      console.error('Erro no backup:', err);
      this.showToast('Erro ao criar backup.', 'danger');
    }
  }

  async processarArquivoBackup(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target.result);
        const confirmMerge = confirm(
          `Arquivo de backup detectado com ${json.totalRecords || (json.data && json.data.cubagens.length) || 0} registros.\n\nDeseja MESCLAR os registros com os atuais?`
        );
        if (confirmMerge) {
          const res = await window.cubagemDB.importBackup(json, 'merge');
          this.showToast(`Backup importado com sucesso: ${res.importedCount} registros!`, 'success');
          await this.atualizarDashboard();
        }
      } catch (err) {
        console.error('Erro na importação:', err);
        this.showToast(`Falha na importação: ${err.message}`, 'danger');
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  }

  abrirModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('open');
  }

  fecharModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}

window.app = new CubagemApp();
document.addEventListener('DOMContentLoaded', () => {
  window.app.init();
});
