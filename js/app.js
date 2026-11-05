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

    // Origem da madeira: 'Nativa' | 'Exótica'
    this.origemMadeira = 'Nativa';

    // Listas dinâmicas de alturas
    this.alturasLE = ['', '', ''];
    this.alturasLD = ['', '', ''];
    this.alturasPilha = ['', '', '', ''];

    // Filtros no histórico
    this.historyFilterTipo = 'todos';

    // Sistema de Autenticação e Nuvem
    this.auth = window.CubagemAuth ? new window.CubagemAuth() : null;

    // Lista dinâmica de toras para cubagem de pilhas de toras
    this.torasPilha = [];
  }

  async init() {
    console.log('[Cubagem Florestal] Inicializando aplicativo multipasta...');
    document.body.setAttribute('data-active-tab', 'inicio');

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

    if (window.CubagemEspecies && typeof window.CubagemEspecies.initInputs === 'function') {
      window.CubagemEspecies.initInputs(this);
    }

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
          .then((reg) => {
            console.log('[Service Worker] Ativo:', reg.scope);
            document.addEventListener('visibilitychange', () => {
              if (document.visibilityState === 'visible') {
                reg.update().catch(() => {});
              }
            });
          })
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

    document.body.setAttribute('data-active-tab', viewId);

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
  // GESTÃO DE MODALIDADES (CAMINHÃO / PILHA / TORA) E ORIGEM DA MADEIRA
  // =========================================================================
  setOrigemMadeira(origem) {
    this.origemMadeira = origem || 'Nativa';
    ['btnOrigemNativa', 'btnOrigemNativaCam', 'btnOrigemNativaPil'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('active', this.origemMadeira === 'Nativa');
    });
    ['btnOrigemExotica', 'btnOrigemExoticaCam', 'btnOrigemExoticaPil'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('active', this.origemMadeira === 'Exótica');
    });
  }

  // =========================================================================
  // GEOLOCALIZAÇÃO E COORDENADAS UTM (WGS84 / SIRGAS2000)
  // =========================================================================
  latLonToUtm(lat, lon) {
    if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) return null;

    const a = 6378137.0; // Raio equatorial (WGS84)
    const f = 1.0 / 298.257223563;
    const b = a * (1.0 - f);
    const e2 = (a * a - b * b) / (a * a);
    const ep2 = (a * a - b * b) / (b * b);
    const k0 = 0.9996;

    const zone = Math.floor((lon + 180.0) / 6.0) + 1;
    const lon0 = (zone - 1) * 6 - 180 + 3;
    const lon0Rad = (lon0 * Math.PI) / 180.0;

    const latRad = (lat * Math.PI) / 180.0;
    const lonRad = (lon * Math.PI) / 180.0;

    const N = a / Math.sqrt(1.0 - e2 * Math.sin(latRad) * Math.sin(latRad));
    const T = Math.tan(latRad) * Math.tan(latRad);
    const C = ep2 * Math.cos(latRad) * Math.cos(latRad);
    const A = Math.cos(latRad) * (lonRad - lon0Rad);

    const e4 = e2 * e2;
    const e6 = e4 * e2;

    const M = a * (
      (1.0 - e2 / 4.0 - 3.0 * e4 / 64.0 - 5.0 * e6 / 256.0) * latRad -
      (3.0 * e2 / 8.0 + 3.0 * e4 / 32.0 + 45.0 * e6 / 1024.0) * Math.sin(2.0 * latRad) +
      (15.0 * e4 / 256.0 + 45.0 * e6 / 1024.0) * Math.sin(4.0 * latRad) -
      (35.0 * e6 / 3072.0) * Math.sin(6.0 * latRad)
    );

    const A2 = A * A;
    const A3 = A2 * A;
    const A4 = A2 * A2;
    const A5 = A4 * A;
    const A6 = A3 * A3;

    const x = k0 * N * (
      A +
      (1.0 - T + C) * A3 / 6.0 +
      (5.0 - 18.0 * T + T * T + 72.0 * C - 58.0 * ep2) * A5 / 120.0
    ) + 500000.0;

    let y = k0 * (
      M +
      N * Math.tan(latRad) * (
        A2 / 2.0 +
        (5.0 - T + 9.0 * C + 4.0 * C * C) * A4 / 24.0 +
        (61.0 - 58.0 * T + T * T + 600.0 * C - 330.0 * ep2) * A6 / 720.0
      )
    );

    if (lat < 0) {
      y += 10000000.0; // False Northing hemisfério sul
    }

    const letters = 'CDEFGHJKLMNPQRSTUVWX';
    let bandIdx = Math.floor((lat + 80.0) / 8.0);
    if (bandIdx < 0) bandIdx = 0;
    if (bandIdx >= letters.length) bandIdx = letters.length - 1;
    const bandLetter = letters.charAt(bandIdx);

    const easting = Math.round(x);
    const northing = Math.round(y);

    return {
      zone,
      band: bandLetter,
      easting,
      northing,
      formatted: `${zone}${bandLetter} ${easting} E ${northing} N`
    };
  }

  capturarGpsUtm() {
    const btn = document.getElementById('btnCapturarGps');
    const inpUtm = document.getElementById('cubUtm');
    if (!navigator.geolocation) {
      this.showToast('Geolocalização não é suportada por este dispositivo.', 'warning');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '⏳ Localizando...';
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const utm = this.latLonToUtm(lat, lon);
        if (utm && inpUtm) {
          inpUtm.value = utm.formatted;
          const acc = Math.round(pos.coords.accuracy);
          this.showToast(`Coordenada UTM capturada (±${acc}m): ${utm.formatted}`, 'success');
        }
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '📍 GPS';
        }
      },
      (err) => {
        console.warn('Erro ao obter GPS:', err);
        let msg = 'Não foi possível capturar o GPS.';
        if (err.code === 1) msg = 'Permissão de localização não concedida.';
        else if (err.code === 2) msg = 'Sinal de GPS indisponível.';
        else if (err.code === 3) msg = 'Tempo limite de busca do GPS esgotado.';
        this.showToast(`${msg} Você pode digitar a coordenada UTM manualmente.`, 'warning');
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '📍 GPS';
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  }

  setTipoCubagem(tipo) {
    this.tipoCubagem = tipo;

    document.querySelectorAll('.type-pill').forEach((p) => p.classList.remove('active'));
    const activeBtn = document.getElementById(tipo === 'caminhao' ? 'btnTypeCaminhao' : (tipo === 'pilha' ? 'btnTypePilha' : 'btnTypeTora'));
    if (activeBtn) activeBtn.classList.add('active');

    // Alternar visibilidade das seções
    const secCam = document.getElementById('sectionCaminhao');
    const secPil = document.getElementById('sectionPilha');
    const secTor = document.getElementById('sectionTora');
    const lblRodovia = document.getElementById('lblRodovia');

    if (tipo === 'caminhao') {
      secCam.style.display = 'block';
      secPil.style.display = 'none';
      secTor.style.display = 'none';
      if (lblRodovia) lblRodovia.innerHTML = 'Local / Pátio <span class="required">*</span>';
      document.getElementById('liveTypeBadge').textContent = 'Carga de Caminhão';
    } else if (tipo === 'pilha') {
      secCam.style.display = 'none';
      secPil.style.display = 'block';
      secTor.style.display = 'none';
      if (lblRodovia) lblRodovia.innerHTML = 'Local / Pátio <span class="required">*</span>';
      document.getElementById('liveTypeBadge').textContent = 'Pilha de Madeira';
    } else if (tipo === 'tora') {
      secCam.style.display = 'none';
      secPil.style.display = 'none';
      secTor.style.display = 'block';
      if (lblRodovia) lblRodovia.innerHTML = 'Local / Pátio <span class="required">*</span>';
      document.getElementById('liveTypeBadge').textContent = 'Pilha de Toras Roliças (Smalian)';
      this.renderizarListaTorasPilha();
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

      const resCurrent = window.CubagemCalculator.calculateTora({
        diametroPonta1Raw: d1,
        diametroPonta2Raw: d2,
        comprimentoRaw: comp,
        plaqueta: plaqueta
      });

      const currentPreviewEl = document.getElementById('currentToraVolPreview');
      if (currentPreviewEl) {
        currentPreviewEl.textContent = resCurrent.isValid ? `${resCurrent.display.volumeGeometrico} m³` : '0,000 m³';
      }

      if (this.torasPilha.length > 0) {
        const lote = window.CubagemCalculator.calculateLoteToras(this.torasPilha);
        volEl.textContent = lote.display.volumeTotal;
        l1.textContent = 'Total de Toras';
        v1.textContent = `${lote.totalToras} unid.`;
        l2.textContent = 'Diâmetro Médio';
        v2.textContent = lote.display.diametroMedio;
        l3.textContent = 'Comp. Médio';
        v3.textContent = lote.display.comprimentoMedio;
        memEl.innerHTML = lote.memoriaCalculo.join('<br>');
        document.getElementById('liveTypeBadge').textContent = `Pilha de Toras (${lote.totalToras} toras)`;
      } else {
        l1.textContent = 'Diâmetro Médio';
        l2.textContent = 'Comprimento';
        l3.textContent = 'Plaqueta';

        if (resCurrent.isValid) {
          volEl.textContent = resCurrent.display.volumeGeometrico;
          v1.textContent = resCurrent.display.diametroMedio;
          v2.textContent = resCurrent.display.comprimento;
          v3.textContent = resCurrent.plaqueta;
          memEl.innerHTML = resCurrent.memoriaCalculo.join('<br>');
        } else {
          volEl.textContent = '0,000';
          v1.textContent = '0 cm';
          v2.textContent = '0 m';
          v3.textContent = plaqueta || '-';
          memEl.textContent = 'Preencha os dados da tora e toque em "+ Adicionar Esta Tora à Pilha".';
        }
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
    const km = (document.getElementById('cubKm')?.value.trim()) || '';
    const utm = (document.getElementById('cubUtm')?.value.trim()) || '';
    const responsavel = document.getElementById('cubResponsavel').value.trim();
    const observacoes = document.getElementById('cubObservacoes').value.trim();

    if (!data || !horario || !rodovia || !responsavel) {
      this.showToast('Preencha os campos operacionais obrigatórios (Data, Hora, Local e Responsável).', 'warning');
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
        origemMadeira: this.origemMadeira || 'Nativa',
        especie: '',
        data, horario, rodovia, km, utm, responsavel,
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
        origemMadeira: this.origemMadeira || 'Nativa',
        especie: '',
        data, horario, rodovia, km, utm, responsavel,
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
      // Se houver uma tora preenchida nos inputs que ainda não foi adicionada, adiciona automaticamente
      const d1 = document.getElementById('cubDiametroPonta1').value;
      const d2 = document.getElementById('cubDiametroPonta2').value;
      const comp = document.getElementById('cubComprimentoTora').value;
      const plaqueta = document.getElementById('cubPlaqueta').value.trim();
      const espToraInp = document.getElementById('cubEspecieTora');
      const espAuto = (espToraInp && espToraInp.value.trim()) || '';

      if (d1 && d2 && comp && plaqueta) {
        const calcAuto = window.CubagemCalculator.calculateTora({
          diametroPonta1Raw: d1,
          diametroPonta2Raw: d2,
          comprimentoRaw: comp,
          plaqueta: plaqueta
        });
        if (calcAuto.isValid) {
          this.torasPilha.push({
            numero: this.torasPilha.length + 1,
            plaqueta: calcAuto.plaqueta,
            especie: espAuto,
            diametroPonta1_cm: calcAuto.diametroPonta1_cm,
            diametroPonta2_cm: calcAuto.diametroPonta2_cm,
            diametroPonta1_m: calcAuto.diametroPonta1_m,
            diametroPonta2_m: calcAuto.diametroPonta2_m,
            diametroMedio_cm: calcAuto.diametroMedio_cm,
            comprimento: calcAuto.comprimento,
            volumeGeometrico: calcAuto.volumeGeometrico
          });
        }
      }

      if (this.torasPilha.length === 0) {
        this.showToast('Adicione ao menos uma tora à pilha tocando em "+ Adicionar Esta Tora à Pilha".', 'warning');
        return;
      }

      const lote = window.CubagemCalculator.calculateLoteToras(this.torasPilha);
      const identInput = document.getElementById('cubIdentPilhaTora');
      const plaquetasList = this.torasPilha.map(t => t.plaqueta).filter(Boolean);
      const identIndividualVal = (identInput ? identInput.value.trim() : '');
      const identPilhaTora = identIndividualVal || (plaquetasList.length > 0 ? (plaquetasList.length === 1 ? `Plaqueta ${plaquetasList[0]}` : `Plaquetas ${plaquetasList.join(', ')}`) : `Tora Individual`);
      const especiesUnicas = [...new Set(this.torasPilha.map(t => t.especie).filter(Boolean))];
      const especieFinal = especiesUnicas.length > 0
        ? (especiesUnicas.length <= 2 ? especiesUnicas.join(', ') : `${especiesUnicas.slice(0, 2).join(', ')} (+${especiesUnicas.length - 2})`)
        : '';

      const plaquetasResumo = plaquetasList.length > 0
        ? (plaquetasList.length > 3 ? `${plaquetasList[0]} a ${plaquetasList[plaquetasList.length - 1]} (${lote.totalToras} toras)` : plaquetasList.join(', '))
        : (identIndividualVal || 'SEM PLAQUETA');

      record = {
        id: window.cubagemDB.generateId('PILHA-TORA'),
        tipo: 'tora',
        especie: especieFinal,
        data, horario, rodovia, km, utm, responsavel,
        identificacao: identPilhaTora,
        placa: identPilhaTora,
        plaqueta: plaquetasResumo,
        observacoes,
        totalToras: lote.totalToras,
        diametroMedio_cm: lote.diametroMedio_cm,
        comprimentoMedio: lote.comprimentoMedio,
        volumeGeometrico: lote.volumeTotal,
        tipoVolume: `Pilha de Toras Roliças (${lote.totalToras} toras - Smalian)`,
        memoriaCalculo: lote.memoriaCalculo,
        toras: [...this.torasPilha],
        timestamp: Date.now()
      };
    }

    try {
      await window.cubagemDB.add(record);

      if (this.auth) {
        this.auth.syncRecordToCloud(record);
      }

      const vFmt = window.CubagemCalculator.formatNumber(record.volumeGeometrico, record.tipo === 'tora' ? 3 : 2);
      this.showToast(`Cubagem de ${record.tipo.toUpperCase()} salva com sucesso! Volume Total: ${vFmt} m³`, 'success');

      this.limparApenasMedidas();
      this.resetarDataHoraAtual();
      await this.atualizarDashboard();
    } catch (err) {
      console.error('Erro ao salvar cubagem:', err);
      this.showToast('Erro ao gravar registro.', 'danger');
    }
  }

  limparApenasMedidas() {
    this.setOrigemMadeira('Nativa');

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
      const espTora = document.getElementById('cubEspecieTora');
      if (espTora) espTora.value = '';
      const identTora = document.getElementById('cubIdentPilhaTora');
      if (identTora) identTora.value = '';
      this.torasPilha = [];
      this.renderizarListaTorasPilha();
    }
    document.getElementById('cubObservacoes').value = '';
    this.executarCalculoTempoReal();
  }

  limparFormularioNova() {
    document.getElementById('formNovaCubagem').reset();
    this.setOrigemMadeira('Nativa');
    const espTora = document.getElementById('cubEspecieTora');
    if (espTora) espTora.value = '';
    this.alturasLE = ['', '', ''];
    this.alturasLD = ['', '', ''];
    this.alturasPilha = ['', '', '', ''];
    this.renderizarGridsAlturas();
    this.torasPilha = [];
    this.renderizarListaTorasPilha();
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

      // Atualiza valores do painel da Capa Inicial
      const totalCubadoEl = document.getElementById('coverTotalCubado');
      const coverStatSubEl = document.getElementById('coverStatSub');
      const coverHistCountEl = document.getElementById('coverHistCount');

      const totalItems = (stats.totalCaminhoes || 0) + (stats.totalPilhas || 0) + (stats.totalToras > 0 ? 1 : 0);
      const totalCargasText = totalItems === 0
        ? 'Nenhuma medição registrada'
        : (totalItems === 1 ? '1 medição registrada no aparelho' : `${totalItems} medições registradas no aparelho`);

      if (totalCubadoEl) totalCubadoEl.textContent = window.CubagemCalculator.formatNumber(stats.totalVolume, 2);
      if (coverStatSubEl) coverStatSubEl.textContent = totalCargasText;
      if (coverHistCountEl) coverHistCountEl.textContent = totalItems;

      // Mantém compatibilidade com outros elementos se presentes
      const kpiVol = document.getElementById('kpiTotalVolume');
      if (kpiVol) kpiVol.innerHTML = `${window.CubagemCalculator.formatNumber(stats.totalVolume, 2)} <span class="kpi-unit">m³</span>`;
      const elCam = document.getElementById('kpiTotalCaminhoes');
      if (elCam) elCam.textContent = stats.totalCaminhoes;
      const elPil = document.getElementById('kpiTotalPilhas');
      if (elPil) elPil.textContent = stats.totalPilhas;
      const elPilVol = document.getElementById('kpiPilhasVolume');
      if (elPilVol) elPilVol.textContent = `${window.CubagemCalculator.formatNumber(stats.volPilhas, 2)} m³ estéreo`;
      const elTor = document.getElementById('kpiTotalToras');
      if (elTor) elTor.textContent = stats.totalToras;
      const elTorVol = document.getElementById('kpiTorasVolume');
      if (elTorVol) elTorVol.textContent = `${window.CubagemCalculator.formatNumber(stats.volToras, 3)} m³ Smalian`;
      const elVolDet = document.getElementById('kpiVolumeDetail');
      if (elVolDet) elVolDet.textContent = `${stats.totalCaminhoes} cam • ${stats.totalPilhas} pilhas • ${stats.totalToras} toras`;

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

    if (tipo === 'caminhao') {
      const origStr = item.origemMadeira ? ` • ${item.origemMadeira}` : ' • Nativa';
      tagTipo = `🚚 Caminhão${origStr}`;
    } else if (tipo === 'pilha') {
      const origStr = item.origemMadeira ? ` • ${item.origemMadeira}` : ' • Nativa';
      tagTipo = `🪵 Pilha${origStr}`;
      tituloItem = item.identificacao || item.placa || 'Pilha Sem Identificação';
      const nAlt = Array.isArray(item.alturas) ? item.alturas.length : (item.totalAlturas || '-');
      subItem = `${item.rodovia} • ${nAlt} alturas`;
    } else if (tipo === 'tora') {
      tagTipo = '🌲 Tora (Smalian)';
      tituloItem = `Plaqueta: ${item.plaqueta || 'S/P'}`;
      const espStr = item.especie ? ` • ${item.especie}` : '';
      subItem = `D: ${item.diametroMedio_cm ? Number(item.diametroMedio_cm).toFixed(1) + ' cm' : '-'} • L: ${item.comprimento || '-'} m${espStr}`;
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
          <strong>Origem da Madeira:</strong> <span style="font-weight: 700; color: var(--gold);">${item.origemMadeira || 'Nativa'}</span><br>
          ${item.especie ? `<strong>Espécie Florestal:</strong> <span style="font-weight: 700; font-style: italic; color: var(--gold);">${item.especie}</span><br>` : ''}
          <strong>Local / Pátio:</strong> ${item.rodovia} ${item.km ? '• km ' + item.km : ''}<br>
          ${item.utm ? `<strong>Coordenada UTM:</strong> <span style="font-family: monospace; color: var(--gold); font-weight: 700;">${item.utm}</span><br>` : ''}
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
          <strong>Origem da Madeira:</strong> <span style="font-weight: 700; color: var(--gold);">${item.origemMadeira || 'Nativa'}</span><br>
          ${item.especie ? `<strong>Espécie Florestal:</strong> <span style="font-weight: 700; font-style: italic; color: var(--gold);">${item.especie}</span><br>` : ''}
          <strong>Local / Pátio:</strong> ${item.rodovia} ${item.km ? '• km ' + item.km : ''}<br>
          ${item.utm ? `<strong>Coordenada UTM:</strong> <span style="font-family: monospace; color: var(--gold); font-weight: 700;">${item.utm}</span><br>` : ''}
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
      const nToras = item.totalToras || (item.toras ? item.toras.length : 1);
      detalheHtml = `
        <div style="margin-bottom: 12px;">
          <strong>Identificação Individual:</strong> ${item.identificacao || item.plaqueta || item.id}<br>
          ${item.especie ? `<strong>Espécie Florestal:</strong> <span style="font-weight: 700; font-style: italic; color: var(--gold);">${item.especie}</span><br>` : ''}
          <strong>Nº da Plaqueta:</strong> ${item.plaqueta || 'S/P'}<br>
          <strong>Local / Pátio:</strong> ${item.rodovia} ${item.km ? '• km ' + item.km : ''}<br>
          ${item.utm ? `<strong>Coordenada UTM:</strong> <span style="font-family: monospace; color: var(--gold); font-weight: 700;">${item.utm}</span><br>` : ''}
          <strong>Data/Hora:</strong> ${dataBR} às ${item.horario}<br>
          <strong>Responsável:</strong> ${item.responsavel}
        </div>
        <div class="calc-result-card">
          <div class="calc-result-header">
            <span class="calc-result-tag">Volume Total da Pilha</span>
            <span class="calc-result-type-badge">${fNum(item.volumeGeometrico, 3)} m³</span>
          </div>
          <div style="font-size: 0.85rem; line-height: 1.6;">
            <strong>Total de Indivíduos:</strong> ${nToras} toras<br>
            <strong>Diâmetro Médio da Pilha:</strong> ${fNum(item.diametroMedio_cm, 1)} cm<br>
            <strong>Comprimento Médio:</strong> ${fNum(item.comprimentoMedio || item.comprimento, 2)} m
          </div>
        </div>
      `;

      if (item.toras && Array.isArray(item.toras) && item.toras.length > 0) {
        detalheHtml += `
          <div style="margin-top: 14px;">
            <div style="font-weight: 700; font-size: 0.85rem; color: var(--gold); text-transform: uppercase; margin-bottom: 8px;">
              Indivíduos da Pilha (${item.toras.length} toras)
            </div>
            <div style="max-height: 240px; overflow-y: auto; border: 1px solid var(--line); border-radius: 8px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 0.78rem;">
                <thead>
                  <tr style="background: var(--surface-2); border-bottom: 1px solid var(--line); text-align: left;">
                    <th style="padding: 6px 8px;">#</th>
                    <th style="padding: 6px 8px;">Plaqueta</th>
                    <th style="padding: 6px 8px;">Espécie</th>
                    <th style="padding: 6px 8px;">D1 × D2 (cm)</th>
                    <th style="padding: 6px 8px;">Comp.</th>
                    <th style="padding: 6px 8px; text-align: right;">Vol (m³)</th>
                  </tr>
                </thead>
                <tbody>
                  ${item.toras.map(t => `
                    <tr style="border-bottom: 1px solid var(--line);">
                      <td style="padding: 6px 8px; font-weight: 700;">#${t.numero}</td>
                      <td style="padding: 6px 8px; font-weight: 700; color: var(--ink);">${t.plaqueta}</td>
                      <td style="padding: 6px 8px; font-style: italic; color: var(--gold);">${t.especie || item.especie || '-'}</td>
                      <td style="padding: 6px 8px;">${fNum(t.diametroPonta1_cm, 1)} × ${fNum(t.diametroPonta2_cm, 1)}</td>
                      <td style="padding: 6px 8px;">${fNum(t.comprimento, 2)} m</td>
                      <td style="padding: 6px 8px; text-align: right; font-weight: 700; color: var(--gold);">${fNum(t.volumeGeometrico, 3)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }
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

  // =========================================================================
  // GESTÃO DE MÚLTIPLAS TORAS NA PILHA (INDIVÍDUOS COM FOTOS E PLAQUETAS)
  // =========================================================================
  adicionarToraNaPilha() {
    const d1 = document.getElementById('cubDiametroPonta1').value;
    const d2 = document.getElementById('cubDiametroPonta2').value;
    const comp = document.getElementById('cubComprimentoTora').value;
    const plaqueta = document.getElementById('cubPlaqueta').value.trim();

    if (!plaqueta) {
      this.showToast('Informe o número da plaqueta da tora.', 'warning');
      document.getElementById('cubPlaqueta').focus();
      return;
    }

    const calc = window.CubagemCalculator.calculateTora({
      diametroPonta1Raw: d1,
      diametroPonta2Raw: d2,
      comprimentoRaw: comp,
      plaqueta: plaqueta
    });

    if (!calc.isValid) {
      this.showToast(calc.errors[0] || 'Verifique as medidas da tora.', 'danger');
      return;
    }

    const espToraInput = document.getElementById('cubEspecieTora');
    const especie = (espToraInput && espToraInput.value.trim()) || '';

    const toraItem = {
      numero: this.torasPilha.length + 1,
      plaqueta: calc.plaqueta,
      especie: especie,
      diametroPonta1_cm: calc.diametroPonta1_cm,
      diametroPonta2_cm: calc.diametroPonta2_cm,
      diametroPonta1_m: calc.diametroPonta1_m,
      diametroPonta2_m: calc.diametroPonta2_m,
      diametroMedio_cm: calc.diametroMedio_cm,
      comprimento: calc.comprimento,
      volumeGeometrico: calc.volumeGeometrico
    };

    this.torasPilha.push(toraItem);

    // Limpa diâmetros para a próxima tora, preservando comprimento
    document.getElementById('cubDiametroPonta1').value = '';
    document.getElementById('cubDiametroPonta2').value = '';

    // Tenta auto-incrementar plaqueta se for número (ex: 101 -> 102)
    const numPlaqueta = parseInt(plaqueta, 10);
    if (!isNaN(numPlaqueta) && String(numPlaqueta) === plaqueta) {
      document.getElementById('cubPlaqueta').value = String(numPlaqueta + 1);
    } else {
      document.getElementById('cubPlaqueta').value = '';
    }
    document.getElementById('cubDiametroPonta1').focus();

    this.renderizarListaTorasPilha();
    this.executarCalculoTempoReal();

    const volFmt = window.CubagemCalculator.formatNumber(toraItem.volumeGeometrico, 3);
    this.showToast(`Tora #${toraItem.numero} (Plaqueta ${toraItem.plaqueta}) adicionada! Vol: ${volFmt} m³`, 'success');
  }

  removerToraDaPilha(index) {
    if (index >= 0 && index < this.torasPilha.length) {
      this.torasPilha.splice(index, 1);
      this.torasPilha.forEach((t, i) => { t.numero = i + 1; });
      this.renderizarListaTorasPilha();
      this.executarCalculoTempoReal();
      this.showToast('Tora removida da pilha.', 'warning');
    }
  }

  limparTodasTorasPilha() {
    if (this.torasPilha.length === 0) return;
    if (confirm('Deseja realmente limpar todas as toras adicionadas nesta pilha?')) {
      this.torasPilha = [];
      this.renderizarListaTorasPilha();
      this.executarCalculoTempoReal();
      this.showToast('Pilha de toras zerada.', 'info');
    }
  }

  renderizarListaTorasPilha() {
    const container = document.getElementById('toraListContainer');
    const badge = document.getElementById('toraListCountBadge');
    const sumBox = document.getElementById('toraPileTotalSummary');
    const btnLimpar = document.getElementById('btnLimparTorasPilha');

    if (badge) badge.textContent = `${this.torasPilha.length} ${this.torasPilha.length === 1 ? 'tora' : 'toras'}`;
    if (btnLimpar) btnLimpar.style.display = this.torasPilha.length > 0 ? 'inline-block' : 'none';

    if (!container) return;

    if (this.torasPilha.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 18px 12px; color: var(--muted); font-size: 0.82rem; background: var(--surface-2); border-radius: 8px; border: 1px dashed var(--line);">
          Nenhuma tora adicionada nesta pilha ainda.<br>
          Preencha os campos acima e toque em <strong>"+ Adicionar Esta Tora à Pilha"</strong>.
        </div>
      `;
      if (sumBox) sumBox.style.display = 'none';
      return;
    }

    const fNum = (n, d = 2) => window.CubagemCalculator.formatNumber(n, d);

    container.innerHTML = this.torasPilha.map((t, idx) => `
      <div class="tora-item-row">
        <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
          <span class="tora-item-badge">#${t.numero}</span>
          <div style="min-width: 0; flex: 1;">
            <div style="font-weight: 700; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              Plaqueta: ${t.plaqueta} ${t.especie ? `<span style="font-weight: 400; font-style: italic; color: var(--gold); font-size: 0.78rem;">(${t.especie})</span>` : ''}
            </div>
            <div style="font-size: 0.73rem; color: var(--muted);">
              D: ${fNum(t.diametroPonta1_cm, 1)} × ${fNum(t.diametroPonta2_cm, 1)} cm (Dm: ${fNum(t.diametroMedio_cm, 1)}) • L: ${fNum(t.comprimento, 2)} m
            </div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="text-align: right;">
            <div style="font-weight: 700; color: var(--gold); font-size: 0.9rem;">${fNum(t.volumeGeometrico, 3)} m³</div>
          </div>
          <button type="button" class="btn-action-small danger" onclick="app.removerToraDaPilha(${idx})" title="Remover tora">🗑️</button>
        </div>
      </div>
    `).join('');

    const lote = window.CubagemCalculator.calculateLoteToras(this.torasPilha);
    if (sumBox) {
      sumBox.style.display = 'block';
      const dispEl = document.getElementById('toraPileTotalVolDisplay');
      const statsEl = document.getElementById('toraPileTotalStats');
      if (dispEl) dispEl.textContent = `${lote.display.volumeTotal} m³`;
      if (statsEl) statsEl.textContent = `${lote.totalToras} toras • Dm Médio: ${lote.display.diametroMedio} • Comp. Médio: ${lote.display.comprimentoMedio}`;
    }
  }



  abrirModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('open');
  }

  fecharModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
  }

  abrirModalNovidades() {
    this.abrirModal('modalNovidades');
  }

  abrirModalSuporte() {
    this.abrirModal('modalSuporte');
  }

  abrirModalComoUsar() {
    this.abrirModal('modalComoUsar');
  }

  abrirModalGuiaEspecies() {
    this.abrirModal('modalGuiaEspecies');
    this.pesquisarGuiaEspecies('');
  }

  pesquisarGuiaEspecies(query) {
    const container = document.getElementById('guiaEspeciesList');
    if (!container || !window.speciesDatabase) return;

    const results = window.speciesDatabase.search(query, 30);
    if (!results || results.length === 0) {
      container.innerHTML = `
        <div class="species-item-empty">
          Nenhuma espécie encontrada para "<b>${this.escapeHtml(query)}</b>".
        </div>
      `;
      return;
    }

    container.innerHTML = results.map((sp) => {
      const isExotica = sp.origem === 'Exótica';
      const badgeCls = isExotica ? 'badge-exotica' : 'badge-nativa';
      const badgeTxt = isExotica ? 'Exótica' : 'Nativa';
      return `
        <div class="guia-specie-card">
          <div class="guia-specie-info">
            <div class="guia-specie-nome">${this.escapeHtml(sp.nomePopular)}</div>
            <div class="guia-specie-cientifico">${this.escapeHtml(sp.nomeCientifico)}</div>
            ${sp.familia ? `<div class="guia-specie-fam">${this.escapeHtml(sp.familia)}</div>` : ''}
          </div>
          <span class="species-origin-pill ${badgeCls}">${badgeTxt}</span>
        </div>
      `;
    }).join('');
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
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
