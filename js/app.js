/**
 * app.js - Controlador principal do Aplicativo Cubagem Florestal
 * Gestão de interface, eventos, cálculos em tempo real e orquestração offline
 */

class CubagemApp {
  constructor() {
    this.currentView = 'inicio';
    this.deferredInstallPrompt = null;
    this.currentDetailItem = null;
    this.itemToDeleteId = null;
    this.historyFilterMode = 'todos';
  }

  /**
   * Inicialização da aplicação
   */
  async init() {
    console.log('[Cubagem Florestal] Inicializando aplicativo...');

    // 1. Inicializar Banco IndexedDB
    try {
      await window.cubagemDB.init();
    } catch (err) {
      console.error('Falha ao inicializar banco local:', err);
      this.showToast('Erro ao inicializar banco de dados local.', 'danger');
    }

    // 2. Registrar Service Worker para PWA Offline
    this.registrarServiceWorker();

    // 3. Configurar listeners de rede (Online/Offline)
    this.configurarMonitorRede();

    // 4. Configurar listener de instalação PWA
    this.configurarInstalacaoPWA();

    // 5. Configurar listeners de cálculo em tempo real
    this.configurarCalculoTempoReal();

    // 6. Preencher data/hora automáticas e carregar preferências
    await this.carregarPreferenciasIniciais();

    // 7. Atualizar Painel Inicial
    await this.atualizarDashboard();

    // 8. Configurar busca no histórico
    const searchInput = document.getElementById('historySearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.carregarHistorico());
    }

    // 9. Configurar datas padrão no relatório
    this.setReportPeriod('mes-atual', false);

    console.log('[Cubagem Florestal] Inicialização concluída com sucesso!');
  }

  /**
   * Registro do Service Worker
   */
  registrarServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('./sw.js')
          .then((reg) => {
            console.log('[Service Worker] Registrado com sucesso:', reg.scope);
          })
          .catch((err) => {
            console.warn('[Service Worker] Falha no registro:', err);
          });
      });
    }
  }

  /**
   * Monitoramento de conectividade (Online / Offline)
   */
  configurarMonitorRede() {
    const updateStatus = () => {
      const dot = document.getElementById('statusDot');
      const text = document.getElementById('statusText');
      if (!dot || !text) return;

      if (navigator.onLine) {
        dot.style.backgroundColor = '#52B788';
        dot.style.boxShadow = '0 0 6px #52B788';
        text.textContent = 'Online / Offline Ready';
      } else {
        dot.style.backgroundColor = '#D4A373';
        dot.style.boxShadow = '0 0 6px #D4A373';
        text.textContent = 'Modo Campo (100% Offline)';
      }
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
  }

  /**
   * Captura evento de instalação PWA no celular
   */
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
      this.showToast('Aplicativo instalado com sucesso!', 'success');
    });
  }

  async instalarPwa() {
    if (this.deferredInstallPrompt) {
      this.deferredInstallPrompt.prompt();
      const choice = await this.deferredInstallPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        this.showToast('Iniciando instalação...', 'success');
      }
      this.deferredInstallPrompt = null;
      const btn = document.getElementById('btnInstallPwa');
      if (btn) btn.style.display = 'none';
    }
  }

  /**
   * Navegação entre seções
   */
  async navigate(viewId) {
    const views = ['inicio', 'nova', 'historico', 'relatorios', 'configuracoes'];
    if (!views.includes(viewId)) return;

    // Atualiza classes das views
    views.forEach((v) => {
      const el = document.getElementById(`view-${v}`);
      if (el) el.classList.toggle('active', v === viewId);
    });

    // Atualiza botões da barra de navegação
    document.querySelectorAll('.nav-item').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-target') === viewId);
    });

    this.currentView = viewId;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Ações ao entrar em cada tela
    if (viewId === 'inicio') {
      await this.atualizarDashboard();
    } else if (viewId === 'nova') {
      this.resetarDataHoraAtual();
    } else if (viewId === 'historico') {
      await this.carregarHistorico();
    } else if (viewId === 'relatorios') {
      await this.atualizarRelatorioPeriodo();
    } else if (viewId === 'configuracoes') {
      await this.carregarCamposConfiguracoes();
    }
  }

  /**
   * Preenchimento automático de data e horário atual
   */
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

  /**
   * Carrega preferências de campo do usuário (Nome do Responsável / Rodovia)
   */
  async carregarPreferenciasIniciais() {
    this.resetarDataHoraAtual();

    const respPadrao = await window.cubagemDB.getSetting('defaultResponsavel', '');
    const rodPadrao = await window.cubagemDB.getSetting('defaultRodovia', '');

    const respInput = document.getElementById('cubResponsavel');
    const rodInput = document.getElementById('cubRodovia');

    if (respInput && respPadrao && !respInput.value) {
      respInput.value = respPadrao;
    }
    if (rodInput && rodPadrao && !rodInput.value) {
      rodInput.value = rodPadrao;
    }
  }

  /**
   * Configura recálculo automático quando o usuário digita medidas
   */
  configurarCalculoTempoReal() {
    const inputs = document.querySelectorAll('.calc-trigger');
    inputs.forEach((input) => {
      input.addEventListener('input', () => this.executarCalculoTempoReal());
    });
  }

  /**
   * Executa cálculo e atualiza card de memória em tempo real
   */
  executarCalculoTempoReal() {
    const measures = {
      le1: document.getElementById('cubLE1').value,
      le2: document.getElementById('cubLE2').value,
      le3: document.getElementById('cubLE3').value,
      ld1: document.getElementById('cubLD1').value,
      ld2: document.getElementById('cubLD2').value,
      ld3: document.getElementById('cubLD3').value,
      comprimento: document.getElementById('cubComprimento').value,
      largura: document.getElementById('cubLargura').value
    };

    const res = window.CubagemCalculator.calculate(measures);

    const volEl = document.getElementById('liveVolumeDisplay');
    const somaEl = document.getElementById('liveSomaDisplay');
    const hmEl = document.getElementById('liveHmDisplay');
    const dimEl = document.getElementById('liveDimDisplay');
    const memEl = document.getElementById('liveMemoryText');

    if (res.isValid) {
      volEl.textContent = res.display.volumeGeometrico;
      somaEl.textContent = `${res.display.somaAlturas} m`;
      hmEl.textContent = `${res.display.alturaMedia} m`;
      dimEl.textContent = `${res.display.comprimento} × ${res.display.largura} m`;
      memEl.innerHTML = res.memoriaCalculo.join('<br>');
    } else {
      volEl.textContent = '0,00';
      somaEl.textContent = '0,00 m';
      hmEl.textContent = '0,00 m';
      dimEl.textContent = '0 × 0 m';
      memEl.textContent = 'Preencha todas as medidas válidas (> 0) para ver o resultado.';
    }
  }

  /**
   * Salva uma nova medição no IndexedDB
   */
  async salvarCubagem() {
    // 1. Obter dados operacionais
    const data = document.getElementById('cubData').value;
    const horario = document.getElementById('cubHorario').value;
    const rodovia = document.getElementById('cubRodovia').value.trim();
    const kmStr = document.getElementById('cubKm').value.trim();
    const responsavel = document.getElementById('cubResponsavel').value.trim();
    const placa = document.getElementById('cubPlaca').value.trim().toUpperCase();
    const observacoes = document.getElementById('cubObservacoes').value.trim();

    // Validações básicas de operação
    if (!data || !horario || !rodovia || !kmStr || !responsavel) {
      this.showToast('Por favor, preencha todos os campos operacionais obrigatórios.', 'warning');
      return;
    }

    const km = window.CubagemCalculator.parseNumber(kmStr);
    if (isNaN(km) || km < 0) {
      this.showToast('Informe um valor de quilômetro (Km) válido.', 'warning');
      return;
    }

    // 2. Obter medidas
    const measures = {
      le1: document.getElementById('cubLE1').value,
      le2: document.getElementById('cubLE2').value,
      le3: document.getElementById('cubLE3').value,
      ld1: document.getElementById('cubLD1').value,
      ld2: document.getElementById('cubLD2').value,
      ld3: document.getElementById('cubLD3').value,
      comprimento: document.getElementById('cubComprimento').value,
      largura: document.getElementById('cubLargura').value
    };

    // 3. Validar e Calcular
    const calc = window.CubagemCalculator.calculate(measures);
    if (!calc.isValid) {
      this.showToast(calc.errors[0] || 'Verifique as medidas informadas.', 'danger');
      return;
    }

    // 4. Montar Objeto da Cubagem
    const record = {
      id: window.cubagemDB.generateId(),
      data,
      horario,
      rodovia,
      km,
      responsavel,
      placa: placa || 'NÃO INFORMADA',
      observacoes: observacoes || '',
      // Medições numéricas
      le1: calc.measures.le1,
      le2: calc.measures.le2,
      le3: calc.measures.le3,
      ld1: calc.measures.ld1,
      ld2: calc.measures.ld2,
      ld3: calc.measures.ld3,
      somaAlturas: calc.somaAlturas,
      alturaMedia: calc.alturaMedia,
      comprimento: calc.measures.comprimento,
      largura: calc.measures.largura,
      volumeGeometrico: calc.volumeGeometrico,
      tipoVolume: calc.tipoVolume,
      memoriaCalculo: calc.memoriaCalculo,
      timestamp: Date.now()
    };

    try {
      await window.cubagemDB.add(record);
      this.showToast(`Cubagem salva com sucesso! Volume: ${calc.display.volumeGeometrico} m³`, 'success');
      
      // Limpa os campos de medições para o próximo caminhão, mantendo a operação
      this.limparCamposMedicao();
      this.resetarDataHoraAtual();
      await this.atualizarDashboard();
    } catch (err) {
      console.error('Erro ao salvar cubagem:', err);
      this.showToast('Erro ao gravar dados no celular.', 'danger');
    }
  }

  /**
   * Limpa apenas as medições após salvar um caminhão
   */
  limparCamposMedicao() {
    ['cubLE1', 'cubLE2', 'cubLE3', 'cubLD1', 'cubLD2', 'cubLD3', 'cubComprimento', 'cubLargura', 'cubPlaca', 'cubObservacoes'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    this.executarCalculoTempoReal();
  }

  /**
   * Limpa o formulário inteiro
   */
  limparFormularioNova() {
    document.getElementById('formNovaCubagem').reset();
    this.carregarPreferenciasIniciais();
    this.executarCalculoTempoReal();
    this.showToast('Formulário limpo.', 'warning');
  }

  /**
   * Atualiza o painel inicial com estatísticas e lista recente
   */
  async atualizarDashboard() {
    try {
      const stats = await window.cubagemDB.getStats();

      document.getElementById('kpiTotalVolume').innerHTML = `${window.CubagemCalculator.formatNumber(stats.totalVolume, 2)} <span class="kpi-unit">m³</span>`;
      document.getElementById('kpiTotalCaminhoes').textContent = stats.totalCount;
      document.getElementById('kpiHojeCaminhoes').textContent = stats.todayCount;
      document.getElementById('kpiHojeVolume').textContent = `${window.CubagemCalculator.formatNumber(stats.todayVolume, 2)} m³ acumulados hoje`;
      document.getElementById('kpiMediaVolume').innerHTML = `${window.CubagemCalculator.formatNumber(stats.averageVolume, 2)} <span class="kpi-unit">m³</span>`;

      // Renderiza lista recente
      const container = document.getElementById('dashboardRecentList');
      if (!container) return;

      if (stats.recentItems.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            </svg>
            <div class="empty-state-title">Nenhuma cubagem registrada ainda</div>
            <div class="empty-state-desc">Toque em "Nova Cubagem" para começar a registrar as cargas.</div>
            <button class="btn btn-primary" onclick="app.navigate('nova')">Nova Cubagem</button>
          </div>
        `;
        return;
      }

      container.innerHTML = stats.recentItems.map((item) => this.gerarCardItemHTML(item)).join('');
    } catch (err) {
      console.error('Erro ao atualizar dashboard:', err);
    }
  }

  /**
   * Carrega histórico com busca e filtros
   */
  async carregarHistorico() {
    try {
      const searchVal = document.getElementById('historySearchInput').value;
      let items = [];

      if (searchVal && searchVal.trim()) {
        items = await window.cubagemDB.search(searchVal);
      } else {
        items = await window.cubagemDB.getAll(true);
      }

      // Aplica filtro rápido (hoje, mês)
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const monthPrefix = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;

      if (this.historyFilterMode === 'hoje') {
        items = items.filter((i) => i.data === todayStr);
      } else if (this.historyFilterMode === 'mes') {
        items = items.filter((i) => i.data && i.data.startsWith(monthPrefix));
      }

      const container = document.getElementById('historyListContainer');
      if (!container) return;

      if (items.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-title">Nenhum registro encontrado</div>
            <div class="empty-state-desc">Tente ajustar o termo de busca ou filtros.</div>
          </div>
        `;
        return;
      }

      container.innerHTML = items.map((item) => this.gerarCardItemHTML(item)).join('');
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    }
  }

  filtrarHistorico(modo) {
    this.historyFilterMode = modo;
    document.querySelectorAll('.history-controls .btn-action-small').forEach((btn) => {
      btn.classList.toggle('active-filter', btn.textContent.toLowerCase().includes(modo));
    });
    this.carregarHistorico();
  }

  /**
   * Gera o HTML de um card de caminhão
   */
  gerarCardItemHTML(item) {
    const volFormatado = window.CubagemCalculator.formatNumber(item.volumeGeometrico, 2);
    const dataBR = window.CubagemExcelExport.formatDateBR(item.data);
    const kmFormatado = item.km !== undefined ? `km ${item.km}` : '';

    return `
      <div class="history-item-card">
        <div class="history-card-top">
          <span class="history-tag-date">${dataBR} • ${item.horario || ''}</span>
          <span class="history-tag-highway">${item.rodovia} ${kmFormatado}</span>
        </div>
        <div class="history-card-body">
          <div class="history-plate-resp">
            <span class="history-plate">${item.placa || 'SEM PLACA'}</span>
            <span class="history-resp">Resp: ${item.responsavel || '-'}</span>
          </div>
          <div class="history-vol-badge">
            <div class="history-vol-num">${volFormatado}</div>
            <div class="history-vol-unit">m³ geom.</div>
          </div>
        </div>
        <div class="history-card-actions">
          <button class="btn-action-small" onclick="app.abrirDetalhes('${item.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            Detalhes
          </button>
          <button class="btn-action-small" onclick="app.abrirEditar('${item.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Editar
          </button>
          <button class="btn-action-small danger" onclick="app.abrirModalExcluir('${item.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            Excluir
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Modal de Detalhes
   */
  async abrirDetalhes(id) {
    const item = await window.cubagemDB.get(id);
    if (!item) return;

    this.currentDetailItem = item;
    const dataBR = window.CubagemExcelExport.formatDateBR(item.data);
    const fNum = (n, d = 2) => window.CubagemCalculator.formatNumber(n, d);

    document.getElementById('detalheModalTitulo').textContent = `Cubagem ${item.placa || ''} (${dataBR})`;

    const html = `
      <div style="margin-bottom: 14px;">
        <div style="font-size: 0.8rem; color: var(--text-muted); font-family: monospace;">ID: ${item.id}</div>
        <div style="font-size: 1.1rem; font-weight: 800; color: var(--primary-dark); margin-top: 2px;">
          ${item.rodovia} — Km ${item.km}
        </div>
        <div style="font-size: 0.85rem; color: var(--text-secondary);">
          Data: <strong>${dataBR} às ${item.horario}</strong> | Responsável: <strong>${item.responsavel}</strong>
        </div>
      </div>

      <!-- Card do Volume -->
      <div class="calc-result-card" style="margin-bottom: 16px;">
        <div class="calc-result-header">
          <span class="calc-result-tag">Resultado Calculado</span>
          <span class="calc-result-type-badge">${item.tipoVolume || 'Volume Geométrico'}</span>
        </div>
        <div class="calc-volume-display">
          <span class="calc-volume-number">${fNum(item.volumeGeometrico, 2)}</span>
          <span class="calc-volume-unit">m³</span>
        </div>
        <div class="calc-details-row">
          <div class="calc-detail-item">
            <span class="calc-detail-label">Soma Alturas</span>
            <span class="calc-detail-value">${fNum(item.somaAlturas, 2)} m</span>
          </div>
          <div class="calc-detail-item">
            <span class="calc-detail-label">Altura Média Hm</span>
            <span class="calc-detail-value">${fNum(item.alturaMedia, 4)} m</span>
          </div>
          <div class="calc-detail-item">
            <span class="calc-detail-label">C × L</span>
            <span class="calc-detail-value">${fNum(item.comprimento, 2)} × ${fNum(item.largura, 2)} m</span>
          </div>
        </div>
      </div>

      <!-- Tabela de Medições -->
      <div style="margin-bottom: 14px;">
        <h4 style="font-size: 0.9rem; font-weight: 800; color: var(--text-main); margin-bottom: 8px;">
          Medições Realizadas
        </h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.85rem;">
          <div style="background: var(--primary-tint); padding: 8px; border-radius: var(--radius-sm);">
            <strong>Lado Esquerdo (LE):</strong><br>
            LE1: ${fNum(item.le1)} m<br>
            LE2: ${fNum(item.le2)} m<br>
            LE3: ${fNum(item.le3)} m
          </div>
          <div style="background: #FDFBF7; padding: 8px; border-radius: var(--radius-sm); border: 1px solid #EAD7C3;">
            <strong style="color: #8C4A15;">Lado Direito (LD):</strong><br>
            LD1: ${fNum(item.ld1)} m<br>
            LD2: ${fNum(item.ld2)} m<br>
            LD3: ${fNum(item.ld3)} m
          </div>
        </div>
      </div>

      <!-- Observações -->
      ${item.observacoes ? `
        <div style="background: var(--bg-elevated); padding: 10px; border-radius: var(--radius-sm); font-size: 0.85rem;">
          <strong>Observações:</strong> ${item.observacoes}
        </div>
      ` : ''}
    `;

    document.getElementById('detalheModalConteudo').innerHTML = html;
    this.abrirModal('modalDetalhes');
  }

  abrirEditarPeloDetalhe() {
    if (this.currentDetailItem) {
      this.fecharModal('modalDetalhes');
      this.abrirEditar(this.currentDetailItem.id);
    }
  }

  /**
   * Modal de Edição
   */
  async abrirEditar(id) {
    const item = await window.cubagemDB.get(id);
    if (!item) return;

    document.getElementById('editId').value = item.id;
    document.getElementById('editData').value = item.data;
    document.getElementById('editHorario').value = item.horario;
    document.getElementById('editRodovia').value = item.rodovia;
    document.getElementById('editKm').value = item.km;
    document.getElementById('editResponsavel').value = item.responsavel;
    document.getElementById('editPlaca').value = item.placa !== 'NÃO INFORMADA' ? item.placa : '';
    document.getElementById('editObservacoes').value = item.observacoes || '';

    document.getElementById('editLE1').value = item.le1;
    document.getElementById('editLE2').value = item.le2;
    document.getElementById('editLE3').value = item.le3;
    document.getElementById('editLD1').value = item.ld1;
    document.getElementById('editLD2').value = item.ld2;
    document.getElementById('editLD3').value = item.ld3;
    document.getElementById('editComprimento').value = item.comprimento;
    document.getElementById('editLargura').value = item.largura;

    this.abrirModal('modalEditar');
  }

  async salvarEdicao() {
    const id = document.getElementById('editId').value;
    const existing = await window.cubagemDB.get(id);
    if (!existing) return;

    const data = document.getElementById('editData').value;
    const horario = document.getElementById('editHorario').value;
    const rodovia = document.getElementById('editRodovia').value.trim();
    const kmStr = document.getElementById('editKm').value.trim();
    const responsavel = document.getElementById('editResponsavel').value.trim();
    const placa = document.getElementById('editPlaca').value.trim().toUpperCase();
    const observacoes = document.getElementById('editObservacoes').value.trim();

    const km = window.CubagemCalculator.parseNumber(kmStr);

    const measures = {
      le1: document.getElementById('editLE1').value,
      le2: document.getElementById('editLE2').value,
      le3: document.getElementById('editLE3').value,
      ld1: document.getElementById('editLD1').value,
      ld2: document.getElementById('editLD2').value,
      ld3: document.getElementById('editLD3').value,
      comprimento: document.getElementById('editComprimento').value,
      largura: document.getElementById('editLargura').value
    };

    const calc = window.CubagemCalculator.calculate(measures);
    if (!calc.isValid) {
      this.showToast(calc.errors[0] || 'Medidas inválidas.', 'danger');
      return;
    }

    const updated = {
      ...existing,
      data,
      horario,
      rodovia,
      km,
      responsavel,
      placa: placa || 'NÃO INFORMADA',
      observacoes,
      le1: calc.measures.le1,
      le2: calc.measures.le2,
      le3: calc.measures.le3,
      ld1: calc.measures.ld1,
      ld2: calc.measures.ld2,
      ld3: calc.measures.ld3,
      somaAlturas: calc.somaAlturas,
      alturaMedia: calc.alturaMedia,
      comprimento: calc.measures.comprimento,
      largura: calc.measures.largura,
      volumeGeometrico: calc.volumeGeometrico,
      memoriaCalculo: calc.memoriaCalculo
    };

    try {
      await window.cubagemDB.update(updated);
      this.fecharModal('modalEditar');
      this.showToast('Registro atualizado com sucesso!', 'success');
      await this.carregarHistorico();
      await this.atualizarDashboard();
    } catch (err) {
      console.error('Erro ao atualizar:', err);
      this.showToast('Erro ao atualizar registro.', 'danger');
    }
  }

  /**
   * Modal de Exclusão
   */
  async abrirModalExcluir(id) {
    const item = await window.cubagemDB.get(id);
    if (!item) return;

    this.itemToDeleteId = id;
    const dataBR = window.CubagemExcelExport.formatDateBR(item.data);
    const vol = window.CubagemCalculator.formatNumber(item.volumeGeometrico, 2);

    document.getElementById('excluirItemInfo').innerHTML = `
      Caminhão Placa: <strong>${item.placa || 'Sem Placa'}</strong><br>
      Data: ${dataBR} (${item.rodovia} km ${item.km})<br>
      Volume: <strong>${vol} m³</strong>
    `;

    this.abrirModal('modalExcluir');
  }

  async confirmarExclusao() {
    if (!this.itemToDeleteId) return;

    try {
      await window.cubagemDB.delete(this.itemToDeleteId);
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

  /**
   * Seção de Relatórios e Exportação Excel
   */
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
      const past30 = new Date();
      past30.setDate(past30.getDate() - 30);
      start = `${past30.getFullYear()}-${pad(past30.getMonth() + 1)}-${pad(past30.getDate())}`;
      end = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    } else if (tipo === 'todos') {
      start = '2000-01-01';
      end = '2099-12-31';
    }

    const startInput = document.getElementById('reportDataInicio');
    const endInput = document.getElementById('reportDataFim');
    if (startInput) startInput.value = start;
    if (endInput) endInput.value = end;

    // Atualiza nome padrão do arquivo
    const fileInput = document.getElementById('reportFileName');
    if (fileInput) {
      fileInput.value = `Cubagem_Florestal_${start}_a_${end}.xlsx`;
    }

    if (triggerUpdate) {
      this.atualizarRelatorioPeriodo();
    }
  }

  async atualizarRelatorioPeriodo() {
    const start = document.getElementById('reportDataInicio').value;
    const end = document.getElementById('reportDataFim').value;

    let records = [];
    if (start && end) {
      records = await window.cubagemDB.getByDateRange(start, end);
    } else {
      records = await window.cubagemDB.getAll(false);
    }

    // Calcula indicadores do período
    const count = records.length;
    const totalVol = records.reduce((acc, r) => acc + (Number(r.volumeGeometrico) || 0), 0);
    const mediaVol = count > 0 ? totalVol / count : 0;

    document.getElementById('repKpiVolume').innerHTML = `${window.CubagemCalculator.formatNumber(totalVol, 2)} <span class="kpi-unit">m³</span>`;
    document.getElementById('repKpiCaminhoes').textContent = count;
    document.getElementById('repKpiMedia').innerHTML = `${window.CubagemCalculator.formatNumber(mediaVol, 2)} <span class="kpi-unit">m³</span>`;
    document.getElementById('repPreviewCountBadge').textContent = `${count} caminhões`;

    // Atualiza lista prévia
    const previewContainer = document.getElementById('reportPreviewList');
    if (!previewContainer) return;

    if (records.length === 0) {
      previewContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">Nenhum registro no período selecionado</div>
          <div class="empty-state-desc">Ajuste as datas para visualizar as cubagens correspondentes.</div>
        </div>
      `;
      return;
    }

    previewContainer.innerHTML = records.map((item) => this.gerarCardItemHTML(item)).join('');
  }

  /**
   * Exporta a planilha Excel usando o gerador profissional
   */
  async exportarPlanilhaExcel() {
    const start = document.getElementById('reportDataInicio').value;
    const end = document.getElementById('reportDataFim').value;
    const fileName = document.getElementById('reportFileName').value;
    const btn = document.getElementById('btnExportarExcel');

    let records = [];
    if (start && end) {
      records = await window.cubagemDB.getByDateRange(start, end);
    } else {
      records = await window.cubagemDB.getAll(false);
    }

    if (records.length === 0) {
      this.showToast('Nenhum registro encontrado no período para exportar.', 'warning');
      return;
    }

    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Gerando Planilha Excel...';

    try {
      const respPadrao = await window.cubagemDB.getSetting('defaultResponsavel', '');
      const res = await window.CubagemExcelExport.exportWorkbook(records, {
        startDate: start,
        endDate: end,
        fileName: fileName,
        responsavel: respPadrao
      });

      this.showToast(`Planilha ${res.fileName} exportada com sucesso! (${res.recordsCount} caminhões)`, 'success');
    } catch (err) {
      console.error('Erro ao gerar Excel:', err);
      this.showToast(`Erro ao gerar Excel: ${err.message}`, 'danger');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }

  /**
   * Backup e Configurações
   */
  async carregarCamposConfiguracoes() {
    const resp = await window.cubagemDB.getSetting('defaultResponsavel', '');
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
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json'
      });

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
      console.error('Erro ao exportar backup:', err);
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
          `Arquivo de backup detectado com ${json.totalRecords || (json.data && json.data.cubagens.length) || 0} registros.\n\nDeseja MESCLAR os registros com os atuais?\n(Clique em 'Cancelar' para cancelar)`
        );

        if (confirmMerge) {
          const res = await window.cubagemDB.importBackup(json, 'merge');
          this.showToast(`Backup importado com sucesso: ${res.importedCount} registros!`, 'success');
          await this.atualizarDashboard();
        }
      } catch (err) {
        console.error('Erro ao importar backup:', err);
        this.showToast(`Falha na importação: ${err.message}`, 'danger');
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  }

  /**
   * Auxiliares de Modal
   */
  abrirModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('open');
  }

  fecharModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
  }

  /**
   * Sistema de Toasts
   */
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

// Inicializa a aplicação quando a página carregar
window.app = new CubagemApp();
document.addEventListener('DOMContentLoaded', () => {
  window.app.init();
});
