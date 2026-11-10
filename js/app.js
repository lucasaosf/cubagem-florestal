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

    // Versão oficial do aplicativo e gestão de atualizações
    this.appVersion = '2.7.3';
    this.swRegistration = null;
    this.updateChecking = false;
    this.updateAvailable = null;

    // Sistema de Autenticação e Nuvem
    this.auth = window.CubagemAuth ? new window.CubagemAuth() : null;

    // Lista dinâmica de toras para cubagem de pilhas de toras
    this.torasPilha = [];

    // Sistema de Abertura de Planilha por Duplo Toque (Dois toques rápidos)
    this.lastTapTime = 0;
    this.lastTapTargetId = null;
    this.previaAberta = false;
    this.previaAtivaItem = null;
    this.abaAtivaPrevia = 'medicao'; // 'medicao' | 'memoria'
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

    // Fechar modal de prévia da planilha com a tecla Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.previaAberta) {
        this.fecharPreviaPlanilha(true);
      }
    });

    // Verifica por novas atualizações em segundo plano
    setTimeout(() => this.checkUpdate(false), 2500);

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
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });

      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('./sw.js')
          .then((reg) => {
            this.swRegistration = reg;
            console.log('[Service Worker] Ativo:', reg.scope);

            // Se já houver um Service Worker novo aguardando para ativar, ativa silenciosamente
            if (reg.waiting) {
              reg.waiting.postMessage({ action: 'skipWaiting', type: 'SKIP_WAITING' });
            }

            // Escuta novas instalações de Service Worker
            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing;
              if (!newWorker) return;
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  this.checkUpdate(false);
                }
              });
            });

            // Monitor de visibilidade: verifica silenciosamente com intervalo mínimo de 12 horas
            let lastVisCheck = Date.now();
            document.addEventListener('visibilitychange', () => {
              if (document.visibilityState === 'visible' && (Date.now() - lastVisCheck > 12 * 3600000)) {
                lastVisCheck = Date.now();
                this.checkUpdate(false);
              }
            });
          })
          .catch((err) => console.warn('[Service Worker] Falha:', err));
      });
    }
  }

  // =========================================================================
  // SISTEMA DE ATUALIZAÇÃO DO APLICATIVO
  // =========================================================================
  compararVersoes(v1, v2) {
    const p1 = String(v1).replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
    const p2 = String(v2).replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
    const len = Math.max(p1.length, p2.length);
    for (let i = 0; i < len; i++) {
      const num1 = p1[i] || 0;
      const num2 = p2[i] || 0;
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    return 0;
  }

  verificarOuAbrirPopUpAtualizacao() {
    this.checkUpdate(true);
  }

  async checkUpdate(force = false) {
    if (this.updateChecking) return;
    this.updateChecking = true;

    // Respeita intervalo de 3 horas se dispensado recentemente (a menos que seja clique manual)
    const lastDismissed = localStorage.getItem('cubagem.update_dismissed');
    if (!force && lastDismissed && (Date.now() - parseInt(lastDismissed, 10) < 3 * 3600000)) {
      this.updateChecking = false;
      return;
    }

    if (!navigator.onLine) {
      if (force) this.showToast('Sem conexão com a internet para verificar atualizações.', 'warning');
      this.updateChecking = false;
      return;
    }

    if (force) {
      this.showToast('Verificando se há atualizações...', 'info');
    }

    try {
      if (this.swRegistration) {
        try {
          await this.swRegistration.update();
        } catch (e) {}
      }

      const res = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const temNova = data && data.v && this.compararVersoes(data.v, this.appVersion) > 0;
        if (temNova) {
          this.notificarAtualizacaoDisponivel(data);
          this.updateChecking = false;
          return;
        } else if (force) {
          this.abrirPopUpJaAtualizado(data || { v: this.appVersion });
          this.updateChecking = false;
          return;
        }
      }
    } catch (err) {
      console.warn('[Update] Erro ao verificar atualização:', err);
      if (force) {
        this.showToast('Não foi possível verificar atualizações no momento.', 'warning');
      }
    } finally {
      this.updateChecking = false;
    }
  }

  notificarAtualizacaoDisponivel(data) {
    this.updateAvailable = data || { v: '2.7', novidades: [] };

    const title = document.getElementById('updateModalTitle');
    const badge = document.getElementById('updateModalBadge');
    const desc = document.getElementById('updateModalDesc');
    const list = document.getElementById('updateModalChangelog');
    const btnTxt = document.getElementById('updateBtnText');
    const btnIcon = document.getElementById('updateBtnIcon');
    const btnLater = document.getElementById('btnUpdateLater');
    const btnNow = document.getElementById('btnUpdateNow');

    if (btnNow) btnNow.disabled = false;
    if (btnIcon) btnIcon.textContent = '🔄';
    if (btnTxt) btnTxt.textContent = 'Atualizar Agora';
    if (title) title.textContent = 'Nova Versão Disponível!';
    if (badge) badge.textContent = `Versão ${data.v || data.nome || '2.7'}`;
    if (desc) desc.textContent = 'Uma nova versão do aplicativo está pronta para ser instalada. Atualize agora para ter as últimas melhorias, novidades e correções.';
    if (btnLater) {
      btnLater.style.display = 'inline-block';
      btnLater.textContent = 'Lembrar Depois';
    }

    if (list) {
      const novidades = Array.isArray(data.novidades) && data.novidades.length > 0 ? data.novidades : [
        'Melhorias de desempenho e estabilidade',
        'Visualização fluida de planilhas e exportação Excel',
        'Guia de Campo botânico com 315 pranchas ilustradas'
      ];
      list.innerHTML = novidades.map((n) => `<li>${this.escapeHtml(n)}</li>`).join('');
    }

    this.abrirModal('modalAtualizacaoApp');
  }

  abrirPopUpJaAtualizado(data) {
    const title = document.getElementById('updateModalTitle');
    const badge = document.getElementById('updateModalBadge');
    const desc = document.getElementById('updateModalDesc');
    const list = document.getElementById('updateModalChangelog');
    const btnTxt = document.getElementById('updateBtnText');
    const btnIcon = document.getElementById('updateBtnIcon');
    const btnLater = document.getElementById('btnUpdateLater');
    const btnNow = document.getElementById('btnUpdateNow');

    if (btnNow) btnNow.disabled = false;
    if (btnIcon) btnIcon.textContent = '🔄';
    if (btnTxt) btnTxt.textContent = 'Recarregar / Limpar Cache';
    if (title) title.textContent = 'Aplicativo Atualizado';
    if (badge) badge.textContent = `v${this.appVersion} (Mais recente)`;
    if (desc) desc.textContent = `Você já está utilizando a versão mais recente do aplicativo (v${this.appVersion}). Se desejar forçar a limpeza de memória e cache, use o botão abaixo.`;
    if (btnLater) {
      btnLater.style.display = 'inline-block';
      btnLater.textContent = 'Fechar';
    }

    if (list) {
      const novidades = Array.isArray(data.novidades) && data.novidades.length > 0 ? data.novidades : [
        'Sistema completo de cubagem de caminhões, pilhas e toras',
        'Prévia instantânea da Planilha Excel com 1 toque',
        'Guia de Campo Oficial aplicado à Identificação Botânica no Modo Campeiro'
      ];
      list.innerHTML = novidades.map((n) => `<li>${this.escapeHtml(n)}</li>`).join('');
    }

    this.abrirModal('modalAtualizacaoApp');
  }

  dispensarAtualizacaoPopUp() {
    this.fecharModal('modalAtualizacaoApp');
    try {
      localStorage.setItem('cubagem.update_dismissed', String(Date.now()));
    } catch (e) {}
  }

  async confirmarAtualizacaoPopUp() {
    const btn = document.getElementById('btnUpdateNow');
    const icon = document.getElementById('updateBtnIcon');
    const txt = document.getElementById('updateBtnText');
    if (btn) btn.disabled = true;
    if (icon) icon.textContent = '⏳';
    if (txt) txt.textContent = 'Atualizando e limpando cache...';

    this.showToast('Atualizando e limpando arquivos antigos...', 'info');

    try {
      localStorage.removeItem('cubagem.update_dismissed');
    } catch (_) {}

    // Limpa todos os caches locais do Service Worker
    if ('caches' in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch (_) {}
    }

    // Comanda ativação imediata do novo Service Worker e cancela registros antigos
    if ('serviceWorker' in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) {
          if (r.waiting) {
            r.waiting.postMessage({ action: 'skipWaiting', type: 'SKIP_WAITING' });
          }
          await r.unregister();
        }
      } catch (_) {}
    }

    // Recarrega sem cache após breve intervalo para confirmação de disco
    setTimeout(() => {
      const cleanUrl = window.location.origin + window.location.pathname + '?reload=' + Date.now();
      window.location.replace(cleanUrl);
    }, 350);
  }

  async forcarAtualizacaoApp() {
    return this.confirmarAtualizacaoPopUp();
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

  isAppInstalled() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')
    );
  }

  detectarNavegadorEPlataforma() {
    const ua = navigator.userAgent || '';
    const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(ua);
    const isFirefox = /Firefox|FxiOS/i.test(ua);
    const isOpera = /OPR|Opera|OPT/i.test(ua);
    const isEdge = /Edg/i.test(ua);
    const isChrome = /Chrome|CriOS/i.test(ua) && !isEdge && !isOpera;
    const isSafari = /Safari/i.test(ua) && !isChrome && !isEdge && !isOpera;
    const isDesktop = !isIOS && !isAndroid;

    if (isIOS) {
      return {
        tab: 'ios',
        nome: 'Apple Safari / iPhone ou iPad',
        icon: '🍎'
      };
    }

    if (isFirefox) {
      return {
        tab: 'firefox',
        nome: isAndroid ? 'Mozilla Firefox (Android)' : 'Mozilla Firefox (Computador)',
        icon: '🦊'
      };
    }

    if (isDesktop) {
      let bName = 'Computador';
      if (isEdge) bName = 'Microsoft Edge (Computador)';
      else if (isOpera) bName = 'Opera (Computador)';
      else if (isChrome) bName = 'Google Chrome (Computador)';
      else if (isSafari) bName = 'Apple Safari (Mac)';
      return {
        tab: 'desktop',
        nome: bName,
        icon: '💻'
      };
    }

    let mob = 'Android';
    if (isOpera) mob = 'Opera (Android)';
    else if (isEdge) mob = 'Microsoft Edge (Android)';
    else if (isChrome) mob = 'Google Chrome (Android)';
    else mob = 'Navegador Web (Android)';

    return {
      tab: 'chrome',
      nome: mob,
      icon: '🌐'
    };
  }

  atualizarUIInstalacao() {
    const installed = this.isAppInstalled();
    const coverBtn = document.getElementById('coverBtnInstallApp');
    const coverFooterBtn = document.getElementById('coverFooterInstallBtn');
    const cfgBtn = document.getElementById('btnInstallPwa');
    const cfgBadge = document.getElementById('cfgInstalledBadge');

    if (installed) {
      this.esconderBalaoInstalacao();
      if (coverBtn) {
        coverBtn.innerHTML = '✅ Aplicativo Instalado';
        coverBtn.classList.add('installed');
        coverBtn.title = 'Aplicativo operando em modo instalado nativo';
      }
      if (coverFooterBtn) {
        coverFooterBtn.innerHTML = '✅ App Instalado';
      }
      if (cfgBtn) cfgBtn.style.display = 'none';
      if (cfgBadge) cfgBadge.style.display = 'flex';
    } else {
      if (coverBtn) {
        coverBtn.innerHTML = '📲 Instalar Aplicativo';
        coverBtn.classList.remove('installed');
      }
      if (coverFooterBtn) {
        coverFooterBtn.innerHTML = '📲 Instalar App';
      }
      if (cfgBtn) cfgBtn.style.display = 'flex';
      if (cfgBadge) cfgBadge.style.display = 'none';
    }
  }

  verificarExibicaoBalaoInstalacao() {
    if (this.isAppInstalled()) return;

    try {
      const dismissed = localStorage.getItem('cubagem_install_balloon_dismissed');
      if (dismissed) {
        const hours = (Date.now() - parseInt(dismissed, 10)) / (1000 * 60 * 60);
        if (hours < 12) {
          return;
        }
      }
    } catch (e) {}

    setTimeout(() => {
      if (!this.isAppInstalled()) {
        const balloon = document.getElementById('installBalloon');
        if (balloon) balloon.hidden = false;
      }
    }, 1500);
  }

  clicarInstalarBalao() {
    this.fecharBalaoInstalacao(false);
    this.iniciarInstalacaoApp();
  }

  fecharBalaoInstalacao(registrarDismiss = true) {
    const balloon = document.getElementById('installBalloon');
    if (balloon) {
      balloon.style.transform = 'translateY(60px)';
      balloon.style.opacity = '0';
      setTimeout(() => {
        balloon.hidden = true;
        balloon.style.transform = '';
        balloon.style.opacity = '';
      }, 300);
    }
    if (registrarDismiss) {
      try {
        localStorage.setItem('cubagem_install_balloon_dismissed', Date.now().toString());
      } catch (e) {}
    }
  }

  esconderBalaoInstalacao() {
    const balloon = document.getElementById('installBalloon');
    if (balloon) balloon.hidden = true;
  }

  configurarInstalacaoPWA() {
    this.atualizarUIInstalacao();
    this.verificarExibicaoBalaoInstalacao();

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      this.atualizarUIInstalacao();

      const nativeBox = document.getElementById('installNativeActionBox');
      if (nativeBox) nativeBox.style.display = 'block';
    });

    window.addEventListener('appinstalled', () => {
      this.deferredInstallPrompt = null;
      this.atualizarUIInstalacao();
      this.esconderBalaoInstalacao();
      this.fecharModal('modalInstalarApp');
      this.showToast('Cubagem Florestal instalado com sucesso no aparelho!', 'success');
    });

    try {
      const mm = window.matchMedia('(display-mode: standalone)');
      if (mm && typeof mm.addEventListener === 'function') {
        mm.addEventListener('change', () => this.atualizarUIInstalacao());
      }
    } catch (e) {}
  }

  async iniciarInstalacaoApp() {
    if (this.isAppInstalled()) {
      this.showToast('Você já está usando o aplicativo instalado no aparelho! ✅', 'info');
      return;
    }

    if (this.deferredInstallPrompt) {
      try {
        this.deferredInstallPrompt.prompt();
        const choice = await this.deferredInstallPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          this.showToast('Instalando aplicativo...', 'success');
          this.deferredInstallPrompt = null;
          this.atualizarUIInstalacao();
          return;
        }
      } catch (err) {
        console.warn('[PWA] Prompt falhou ou foi descartado:', err);
      }
    }

    this.abrirModalInstalarApp();
  }

  abrirModalInstalarApp(tabEspecifica = null) {
    const info = this.detectarNavegadorEPlataforma();
    const iconeEl = document.getElementById('installDetectedIcon');
    const nomeEl = document.getElementById('installDetectedName');
    const nativeBox = document.getElementById('installNativeActionBox');

    if (iconeEl) iconeEl.textContent = info.icon;
    if (nomeEl) nomeEl.textContent = info.nome;

    if (nativeBox) {
      nativeBox.style.display = this.deferredInstallPrompt ? 'block' : 'none';
    }

    const tabAlvo = tabEspecifica || info.tab;
    this.trocarAbaInstalacao(tabAlvo);
    this.abrirModal('modalInstalarApp');
  }

  trocarAbaInstalacao(tabId) {
    const tabs = ['chrome', 'firefox', 'ios', 'desktop'];
    tabs.forEach((t) => {
      const btn = document.getElementById(`tabBtn${t.charAt(0).toUpperCase() + t.slice(1)}`);
      const pane = document.getElementById(`installPane${t.charAt(0).toUpperCase() + t.slice(1)}`);
      if (btn) btn.classList.toggle('active', t === tabId);
      if (pane) pane.classList.toggle('active', t === tabId);
    });
  }

  async acionarPromptNativo() {
    if (this.deferredInstallPrompt) {
      try {
        this.deferredInstallPrompt.prompt();
        const choice = await this.deferredInstallPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          this.showToast('Instalando aplicativo...', 'success');
        }
        this.deferredInstallPrompt = null;
        this.atualizarUIInstalacao();
        this.fecharModal('modalInstalarApp');
      } catch (err) {
        console.warn('[PWA] Erro ao acionar prompt nativo:', err);
      }
    } else {
      this.showToast('Siga os passos acima do seu navegador para instalar.', 'info');
    }
  }

  instalarPwa() {
    this.iniciarInstalacaoApp();
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
    window.scrollTo(0, 0);

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
      <div class="history-item-card clickable-sheet-card"
           onclick="app.abrirPreviaDoCard(event, '${item.id}')">
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
        <div class="card-sheet-action-banner">
          <span class="sheet-icon">📊</span>
          <span class="sheet-label">Toque para ver a Planilha Excel</span>
          <span class="sheet-arrow">➔</span>
        </div>
        <div class="history-card-actions">
          <button type="button" class="btn-action-small preview-btn" onclick="event.stopPropagation(); app.abrirPreviaFixada('${item.id}')" title="Ver planilha completa">📊 Planilha</button>
          <button type="button" class="btn-action-small" onclick="event.stopPropagation(); app.abrirDetalhes('${item.id}')">Detalhes</button>
          <button type="button" class="btn-action-small danger" onclick="event.stopPropagation(); app.abrirModalExcluir('${item.id}')">Excluir</button>
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

  abrirModalAuth() {
    if (!this.auth && window.CubagemAuth) {
      try {
        this.auth = new window.CubagemAuth();
        this.auth.init().catch((e) => console.warn('[Auth] Init:', e));
      } catch (e) {
        console.error('[Auth] Erro ao instanciar CubagemAuth:', e);
      }
    }

    if (this.auth && typeof this.auth.abrirModalAuth === 'function') {
      this.auth.abrirModalAuth();
    } else {
      const body = document.getElementById('authModalBody');
      if (body) {
        body.innerHTML = `
          <div style="text-align: center; padding: 20px;">
            <p style="color: var(--ink); margin-bottom: 8px;">Sistema de autenticação temporariamente indisponível.</p>
            <p style="font-size: 0.85rem; color: var(--muted);">Verifique sua conexão ou tente novamente mais tarde.</p>
          </div>
        `;
      }
      this.abrirModal('modalAuth');
    }
  }

  fecharModalAuth() {
    if (this.auth && typeof this.auth.fecharModalAuth === 'function') {
      this.auth.fecharModalAuth();
    } else {
      this.fecharModal('modalAuth');
    }
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

  // =========================================================================
  // GUIA BOTÂNICO DE CAMPO & IDENTIFICAÇÃO DE ESPÉCIES (MODO CAMPEIRO & CERRADO)
  // =========================================================================
  abrirModalGuiaEspecies(categoria = 'todas') {
    this.guiaCategoriaAtiva = categoria || 'todas';
    this.guiaTermoBusca = '';

    const inpBusca = document.getElementById('inpGuiaEspeciesBusca');
    if (inpBusca) inpBusca.value = '';

    this.atualizarPillsGuiaUI();
    this.renderGuiaEspecies();
    this.abrirModal('modalGuiaEspecies');
  }

  filtrarCategoriaGuia(categoria) {
    this.guiaCategoriaAtiva = categoria || 'todas';
    this.atualizarPillsGuiaUI();
    this.renderGuiaEspecies();
  }

  atualizarPillsGuiaUI() {
    const pills = document.querySelectorAll('#guiaPillsContainer .guia-pill');
    pills.forEach((p) => {
      const cat = p.getAttribute('data-cat');
      p.classList.toggle('active', cat === this.guiaCategoriaAtiva);
    });
  }

  onInputBuscaGuia(query) {
    clearTimeout(this.debounceGuiaTimer);
    this.debounceGuiaTimer = setTimeout(() => {
      this.guiaTermoBusca = query || '';
      this.renderGuiaEspecies();
    }, 120);
  }

  pesquisarGuiaEspecies(query) {
    this.guiaTermoBusca = query || '';
    this.renderGuiaEspecies();
  }

  renderGuiaEspecies() {
    const container = document.getElementById('guiaEspeciesList');
    const contador = document.getElementById('guiaContadorResultados');
    if (!container || !window.speciesDatabase) return;

    const termo = this.guiaTermoBusca || '';
    const categoria = this.guiaCategoriaAtiva || 'todas';
    const results = window.speciesDatabase.search(termo, categoria, 100);

    if (contador) {
      const totalDisp = results ? results.length : 0;
      contador.textContent = `Exibindo ${totalDisp} espécie(s) no catálogo botânico`;
    }

    if (!results || results.length === 0) {
      container.innerHTML = `
        <div class="species-item-empty" style="grid-column: 1 / -1; padding: 36px 16px; text-align: center;">
          <div style="font-size: 2rem; margin-bottom: 8px;">🌿</div>
          <p style="font-weight: 600; font-size: 1rem; color: var(--gold);">Nenhuma espécie encontrada</p>
          <p style="font-size: 0.85rem; color: var(--muted); margin-top: 4px;">
            Não encontramos resultados para "<b>${this.escapeHtml(termo)}</b>" nesta categoria.<br>
            Tente buscar por gênero, nome popular, família botânica ou selecione "🌟 Todas as Espécies".
          </p>
        </div>
      `;
      return;
    }

    container.innerHTML = results.map((sp) => {
      const nomePrincipal = (sp.nomesPopulares && sp.nomesPopulares[0]) ? sp.nomesPopulares[0] : sp.nomeCientifico;
      const outrosNomes = (sp.nomesPopulares && sp.nomesPopulares.length > 1)
        ? sp.nomesPopulares.slice(1, 4).join(', ')
        : '';
      const isExotica = sp.origem === 'Exótica';
      const badgeOrigemCls = isExotica ? 'badge-exotica' : 'badge-nativa';
      const badgeOrigemTxt = isExotica ? '🌲 Exótica' : '🌿 Nativa';

      // Badge de conservação (Portaria MMA 148/2022)
      let badgeAmeacaHtml = '';
      if (sp.ameaca && sp.ameaca !== 'NA') {
        const ameacaMap = {
          'CR': { label: '🚨 CR - Criticamente em Perigo', cls: 'threat-cr' },
          'EN': { label: '⚠️ EN - Em Perigo', cls: 'threat-en' },
          'VU': { label: '⚡ VU - Vulnerável', cls: 'threat-vu' },
          'IC': { label: '🛡️ Imune de Corte (MG)', cls: 'threat-ic' }
        };
        const m = ameacaMap[sp.ameaca] || { label: sp.ameaca, cls: 'threat-vu' };
        badgeAmeacaHtml = `<span class="species-threat-pill ${m.cls}">${m.label}</span>`;
      }

      // Imagem da prancha / miniatura
      const hasPrancha = !!sp.prancha;
      const thumbUrl = sp.thumb || (hasPrancha ? `img/pranchas/thumbs/thumb_${sp.prancha}.jpg` : '');
      const pranchaNum = sp.prancha || '';

      // Traits tags
      let traitsHtml = '';
      if (sp.caracteristicas) {
        if (sp.caracteristicas.folha) {
          traitsHtml += `<span class="guia-trait-tag">🍃 Folha: ${this.escapeHtml(sp.caracteristicas.folha)}</span>`;
        }
        if (sp.caracteristicas.filotaxia) {
          traitsHtml += `<span class="guia-trait-tag">🌿 Filotaxia: ${this.escapeHtml(sp.caracteristicas.filotaxia)}</span>`;
        }
        if (sp.caracteristicas.exsudacao && sp.caracteristicas.exsudacao !== 'Ausente') {
          traitsHtml += `<span class="guia-trait-tag highlight">💧 Exsudação: ${this.escapeHtml(sp.caracteristicas.exsudacao)}</span>`;
        }
      }

      // Biomas
      let biomasHtml = '';
      if (Array.isArray(sp.biomas) && sp.biomas.length > 0) {
        biomasHtml = `<span class="guia-bioma-tag">🌎 ${this.escapeHtml(sp.biomas.slice(0, 3).join(', '))}</span>`;
      }

      return `
        <div class="guia-specie-card ${hasPrancha ? 'has-prancha' : ''}">
          <div class="guia-card-top">
            ${hasPrancha ? `
              <div class="guia-card-thumb-box" onclick="app.abrirPrancha(${pranchaNum})" title="Clique para ampliar a Prancha Botânica nº ${pranchaNum}">
                <img src="${thumbUrl}" alt="${this.escapeHtml(sp.nomeCientifico)}" class="guia-card-thumb" loading="lazy">
                <span class="guia-prancha-badge">Prancha ${pranchaNum}</span>
                <span class="guia-zoom-overlay">🔍 Ampliar</span>
              </div>
            ` : `
              <div class="guia-card-thumb-box placeholder">
                <span class="guia-thumb-tree-icon">${isExotica ? '🌲' : '🌳'}</span>
              </div>
            `}

            <div class="guia-card-body">
              <div class="guia-specie-pop">${this.escapeHtml(nomePrincipal)}</div>
              ${outrosNomes ? `<div class="guia-specie-syn">• ${this.escapeHtml(outrosNomes)}</div>` : ''}
              <div class="guia-specie-sci"><em>${this.escapeHtml(sp.nomeCientifico)}</em></div>
              <div class="guia-specie-meta-pills">
                <span class="guia-family-pill">${this.escapeHtml(sp.familia || 'Não categorizada')}</span>
                <span class="species-origin-pill ${badgeOrigemCls}">${badgeOrigemTxt}</span>
                ${badgeAmeacaHtml}
              </div>

              ${(traitsHtml || biomasHtml) ? `
                <div class="guia-traits-row">
                  ${traitsHtml}
                  ${biomasHtml}
                </div>
              ` : ''}
            </div>
          </div>

          <div class="guia-card-actions">
            ${hasPrancha ? `
              <button type="button" class="btn-card-action prancha" onclick="app.abrirPrancha(${pranchaNum})">
                🔍 Ver Prancha Completa
              </button>
            ` : ''}
            <button type="button" class="btn-card-action usar" onclick="app.selecionarEspecieParaCubagem('${this.escapeHtml(nomePrincipal)}', '${this.escapeHtml(sp.nomeCientifico)}', '${sp.origem}')">
              🪵 Usar na Cubagem
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // =========================================================================
  // LIGHTBOX INTERATIVO COM ZOOM E PAN PARA PRANCHAS BOTÂNICAS
  // =========================================================================
  abrirPrancha(pranchaNum) {
    const num = parseInt(pranchaNum, 10);
    if (!num) return;

    this.pranchaAtivaNum = num;
    this.zoomLevel = 1.0;
    this.panX = 0;
    this.panY = 0;

    // Buscar espécie nos metadados
    const sp = window.speciesDatabase ? window.speciesDatabase.getPrancha(num) : null;
    this.especieAtivaLightbox = sp;

    const lbNum = document.getElementById('lbPranchaNum');
    const lbSci = document.getElementById('lbSciTitle');
    const lbPop = document.getElementById('lbPopSub');
    const lbImg = document.getElementById('lbImagem');
    const lbDl = document.getElementById('lbBtnDownload');
    const lbFam = document.getElementById('lbFamTxt');
    const lbPopTxt = document.getElementById('lbPopTxt');
    const lbAmeacaTxt = document.getElementById('lbAmeacaTxt');
    const lbBiomasTxt = document.getElementById('lbBiomasTxt');

    const imgSrc = `img/pranchas/prancha_${num}.jpg`;

    if (lbNum) lbNum.textContent = `Prancha Botânica nº ${num}`;
    if (lbImg) {
      lbImg.src = imgSrc;
      lbImg.alt = sp ? sp.nomeCientifico : `Prancha ${num}`;
    }
    if (lbDl) {
      lbDl.href = imgSrc;
      lbDl.download = sp ? `Prancha_${num}_${sp.nomeCientifico.replace(/\s+/g, '_')}.jpg` : `Prancha_${num}.jpg`;
    }

    if (sp) {
      if (lbSci) lbSci.innerHTML = `<em>${this.escapeHtml(sp.nomeCientifico)}</em>`;
      if (lbPop) lbPop.textContent = `${(sp.nomesPopulares && sp.nomesPopulares[0]) || ''} • ${sp.familia || ''}`;
      if (lbFam) lbFam.textContent = sp.familia || '--';
      if (lbPopTxt) lbPopTxt.textContent = (sp.nomesPopulares && sp.nomesPopulares.join(', ')) || '--';
      if (lbAmeacaTxt) {
        const amMap = {
          'CR': '🚨 Criticamente em Perigo (CR - MMA 148/2022)',
          'EN': '⚠️ Em Perigo (EN - MMA 148/2022)',
          'VU': '⚡ Vulnerável (VU - MMA 148/2022)',
          'IC': '🛡️ Imune de Corte (MG)',
          'NA': '🌿 Não Ameaçada (Menor Preocupação - LC/NA)'
        };
        lbAmeacaTxt.textContent = amMap[sp.ameaca] || sp.ameaca || 'Não Ameaçada';
      }
      if (lbBiomasTxt) lbBiomasTxt.textContent = (sp.biomas && sp.biomas.join(', ')) || 'Brasil';
    } else {
      if (lbSci) lbSci.textContent = `Prancha Ilustrada nº ${num}`;
      if (lbPop) lbPop.textContent = 'Guia de Campo no Modo Campeiro';
      if (lbFam) lbFam.textContent = '--';
      if (lbPopTxt) lbPopTxt.textContent = '--';
      if (lbAmeacaTxt) lbAmeacaTxt.textContent = 'Nativa do Brasil';
      if (lbBiomasTxt) lbBiomasTxt.textContent = 'Brasil';
    }

    this.atualizarTransformPrancha();
    this.iniciarArrastoPrancha();
    this.abrirModal('modalPranchaLightbox');
  }

  fecharPranchaLightbox() {
    this.fecharModal('modalPranchaLightbox');
  }

  ajustarZoomPrancha(delta) {
    this.zoomLevel = Math.max(0.6, Math.min(4.0, this.zoomLevel + delta));
    this.atualizarTransformPrancha();
  }

  resetarZoomPrancha() {
    this.zoomLevel = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.atualizarTransformPrancha();
  }

  onWheelZoomPrancha(e) {
    if (!e) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.2 : -0.2;
    this.ajustarZoomPrancha(delta);
  }

  atualizarTransformPrancha() {
    const img = document.getElementById('lbImagem');
    if (img) {
      img.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel})`;
    }
  }

  iniciarArrastoPrancha() {
    const canvas = document.getElementById('lbCanvas');
    if (!canvas || canvas._dragIniciado) return;
    canvas._dragIniciado = true;

    let isDragging = false;
    let startX = 0;
    let startY = 0;

    const startPan = (clientX, clientY) => {
      isDragging = true;
      startX = clientX - this.panX;
      startY = clientY - this.panY;
      canvas.style.cursor = 'grabbing';
    };

    const movePan = (clientX, clientY) => {
      if (!isDragging) return;
      this.panX = clientX - startX;
      this.panY = clientY - startY;
      this.atualizarTransformPrancha();
    };

    const stopPan = () => {
      isDragging = false;
      canvas.style.cursor = 'grab';
    };

    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      startPan(e.clientX, e.clientY);
    });
    window.addEventListener('mousemove', (e) => movePan(e.clientX, e.clientY));
    window.addEventListener('mouseup', stopPan);

    // Touch support (Mobile)
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length === 1) {
        startPan(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });
    window.addEventListener('touchmove', (e) => {
      if (isDragging && e.touches && e.touches.length === 1) {
        movePan(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });
    window.addEventListener('touchend', stopPan);
  }

  usarPranchaAtivaNaCubagem() {
    if (!this.especieAtivaLightbox) {
      this.fecharPranchaLightbox();
      return;
    }
    const sp = this.especieAtivaLightbox;
    const nomePop = (sp.nomesPopulares && sp.nomesPopulares[0]) || sp.nomeCientifico;
    this.selecionarEspecieParaCubagem(nomePop, sp.nomeCientifico, sp.origem);
    this.fecharPranchaLightbox();
  }

  selecionarEspecieParaCubagem(nomePopular, nomeCientifico, origem) {
    const inpTora = document.getElementById('cubEspecieTora');
    const valorFormatado = nomeCientifico ? `${nomePopular} (${nomeCientifico})` : nomePopular;

    if (inpTora) {
      inpTora.value = valorFormatado;
      inpTora.classList.add('highlight-glow');
      setTimeout(() => inpTora.classList.remove('highlight-glow'), 1200);
    }

    if (typeof this.setOrigemMadeira === 'function') {
      this.setOrigemMadeira(origem || 'Nativa');
    }

    // Se estiver em outra tela, navegar para 'cubagem' e selecionar sub-aba 'toras'
    if (this.currentScreen !== 'cubagem') {
      this.navigate('cubagem');
    }
    if (typeof this.setTipoCubagem === 'function') {
      this.setTipoCubagem('tora');
    }

    this.fecharModal('modalGuiaEspecies');
    this.showToast(`✓ Espécie "${nomePopular}" selecionada para a cubagem de toras!`, 'success');
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

  // =========================================================================
  // SISTEMA DE ABERTURA DIRETA DA PLANILHA EXCEL (1 TOQUE OU BOTÃO)
  // =========================================================================
  abrirPreviaDoCard(e, id) {
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('input')) {
      return;
    }
    if (typeof navigator.vibrate === 'function') {
      try { navigator.vibrate(35); } catch (_) {}
    }
    this.abrirPreviaFixada(id);
  }

  tratarToqueItem(e, id) {
    this.abrirPreviaDoCard(e, id);
  }

  tratarToqueLive(e) {
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('input')) {
      return;
    }
    if (typeof navigator.vibrate === 'function') {
      try { navigator.vibrate(35); } catch (_) {}
    }
    this.abrirPreviaLiveFixada();
  }

  abrirPreviaLiveFixada() {
    const itemLive = this.obterRegistroLiveAtual();
    if (itemLive) {
      this.mostrarPreviaPlanilha(itemLive);
    }
  }

  obterRegistroLiveAtual() {
    const data = (document.getElementById('cubData')?.value) || new Date().toISOString().split('T')[0];
    const horario = (document.getElementById('cubHorario')?.value) || new Date().toTimeString().slice(0, 5);
    const rodovia = (document.getElementById('cubRodovia')?.value?.trim()) || 'Pátio / Rodovia';
    const km = (document.getElementById('cubKm')?.value?.trim()) || '';
    const utm = (document.getElementById('cubUtm')?.value?.trim()) || '';
    const responsavel = (document.getElementById('cubResponsavel')?.value?.trim()) || 'Responsável Técnico';
    const observacoes = (document.getElementById('cubObservacoes')?.value?.trim()) || '';

    if (this.tipoCubagem === 'caminhao') {
      const comp = document.getElementById('cubComprimentoCam')?.value || '0';
      const larg = document.getElementById('cubLarguraCam')?.value || '0';
      const placa = (document.getElementById('cubPlaca')?.value?.trim().toUpperCase()) || 'EM MEDIÇÃO';
      const calc = window.CubagemCalculator.calculateCaminhao({
        alturasLE: this.alturasLE,
        alturasLD: this.alturasLD,
        comprimentoRaw: comp,
        larguraRaw: larg
      });

      return {
        id: 'LIVE-CAMINHAO',
        tipo: 'caminhao',
        origemMadeira: this.origemMadeira || 'Nativa',
        especie: '',
        data, horario, rodovia, km, utm, responsavel,
        placa,
        observacoes,
        alturasLE: calc.alturasLE || [],
        alturasLD: calc.alturasLD || [],
        somaAlturas: calc.somaAlturas || 0,
        totalAlturas: calc.totalAlturas || 0,
        alturaMedia: calc.alturaMedia || 0,
        comprimento: calc.comprimento || 0,
        largura: calc.largura || 0,
        volumeGeometrico: calc.volumeGeometrico || 0,
        tipoVolume: calc.tipoVolume || 'Volume Geométrico',
        memoriaCalculo: calc.memoriaCalculo || 'Fórmula: Hm = (LE + LD) / n; V = C × L × Hm'
      };
    } else if (this.tipoCubagem === 'pilha') {
      const comp = document.getElementById('cubComprimentoPilha')?.value || '0';
      const larg = document.getElementById('cubLarguraPilha')?.value || '0';
      const identPilha = (document.getElementById('cubIdentPilha')?.value?.trim()) || 'PILHA EM MEDIÇÃO';
      const calc = window.CubagemCalculator.calculatePilha({
        alturas: this.alturasPilha,
        comprimentoRaw: comp,
        larguraRaw: larg
      });

      return {
        id: 'LIVE-PILHA',
        tipo: 'pilha',
        origemMadeira: this.origemMadeira || 'Nativa',
        especie: '',
        data, horario, rodovia, km, utm, responsavel,
        identificacao: identPilha,
        placa: identPilha,
        observacoes,
        alturas: calc.alturas || [],
        somaAlturas: calc.somaAlturas || 0,
        totalAlturas: calc.totalAlturas || 0,
        alturaMedia: calc.alturaMedia || 0,
        comprimento: calc.comprimento || 0,
        largura: calc.largura || 0,
        volumeGeometrico: calc.volumeGeometrico || 0,
        tipoVolume: calc.tipoVolume || 'Volume de Pilha',
        memoriaCalculo: calc.memoriaCalculo || 'Fórmula: V = Comp × Prof × Hm'
      };
    } else if (this.tipoCubagem === 'tora') {
      if (this.torasPilha.length > 0) {
        const lote = window.CubagemCalculator.calculateLoteToras(this.torasPilha);
        const identInput = document.getElementById('cubIdentPilhaTora');
        const plaquetasList = this.torasPilha.map(t => t.plaqueta).filter(Boolean);
        const identIndividualVal = (identInput ? identInput.value.trim() : '');
        const identPilhaTora = identIndividualVal || (plaquetasList.length > 0 ? `Pilha com ${lote.totalToras} toras` : 'Pilha de Toras');

        return {
          id: 'LIVE-PILHA-TORA',
          tipo: 'tora',
          especie: this.torasPilha[0]?.especie || '',
          data, horario, rodovia, km, utm, responsavel,
          identificacao: identPilhaTora,
          placa: identPilhaTora,
          plaqueta: plaquetasList.join(', '),
          observacoes,
          totalToras: lote.totalToras,
          diametroMedio_cm: lote.diametroMedio_cm,
          comprimentoMedio: lote.comprimentoMedio,
          volumeGeometrico: lote.volumeTotal,
          tipoVolume: `Pilha de Toras Roliças (${lote.totalToras} toras - Smalian)`,
          memoriaCalculo: lote.memoriaCalculo,
          toras: [...this.torasPilha]
        };
      } else {
        const d1 = document.getElementById('cubDiametroPonta1')?.value || '0';
        const d2 = document.getElementById('cubDiametroPonta2')?.value || '0';
        const comp = document.getElementById('cubComprimentoTora')?.value || '0';
        const plaqueta = (document.getElementById('cubPlaqueta')?.value?.trim()) || 'S/P';
        const espToraInp = document.getElementById('cubEspecieTora');
        const espAuto = (espToraInp && espToraInp.value.trim()) || '';
        const calc = window.CubagemCalculator.calculateTora({
          diametroPonta1Raw: d1,
          diametroPonta2Raw: d2,
          comprimentoRaw: comp,
          plaqueta: plaqueta
        });

        return {
          id: 'LIVE-TORA-INDIVIDUAL',
          tipo: 'tora',
          especie: espAuto,
          data, horario, rodovia, km, utm, responsavel,
          identificacao: `Tora Plaqueta ${plaqueta}`,
          placa: `Plaqueta ${plaqueta}`,
          plaqueta: plaqueta,
          observacoes,
          diametroPonta1_cm: calc.diametroPonta1_cm || 0,
          diametroPonta2_cm: calc.diametroPonta2_cm || 0,
          diametroMedio_cm: calc.diametroMedio_cm || 0,
          comprimento: calc.comprimento || 0,
          volumeGeometrico: calc.volumeGeometrico || 0,
          tipoVolume: 'Tora Roliça Individual (Smalian)',
          memoriaCalculo: calc.memoriaCalculo || 'Fórmula Smalian: V = ((g1 + g2) / 2) × L',
          toras: [{
            numero: 1,
            plaqueta,
            especie: espAuto,
            diametroPonta1_cm: calc.diametroPonta1_cm || 0,
            diametroPonta2_cm: calc.diametroPonta2_cm || 0,
            diametroMedio_cm: calc.diametroMedio_cm || 0,
            comprimento: calc.comprimento || 0,
            volumeGeometrico: calc.volumeGeometrico || 0
          }]
        };
      }
    }
    return null;
  }

  mostrarPreviaPlanilha(item) {
    if (!item) return;

    this.previaAtivaItem = item;
    this.abaAtivaPrevia = 'medicao';

    const modal = document.getElementById('modalPreviaPlanilha');
    const filenameEl = document.getElementById('prevExcelFilename');
    const holdIndEl = document.getElementById('prevHoldIndicator');
    const holdTextEl = document.getElementById('prevHoldText');
    const cellRefEl = document.getElementById('prevCellRef');
    const formulaTextEl = document.getElementById('prevFormulaText');
    const viewportGrid = document.getElementById('prevSheetGrid');
    const tabMedicao = document.getElementById('prevTabMedicao');
    const tabMemoria = document.getElementById('prevTabMemoria');

    if (!modal || !viewportGrid) return;

    modal.classList.remove('peek-mode');

    const tipo = item.tipo || 'caminhao';
    let nomeArquivo = 'Cubagem_Florestal.xlsx';
    if (tipo === 'caminhao') {
      nomeArquivo = `Planilha_Caminhao_${(item.placa || 'Medicao').replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`;
      if (cellRefEl) cellRefEl.textContent = 'K6';
      if (formulaTextEl) formulaTextEl.textContent = '=(G6 * H6 * F6) * J6';
    } else if (tipo === 'pilha') {
      nomeArquivo = `Planilha_Pilha_${(item.identificacao || item.placa || 'Pilha').replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`;
      if (cellRefEl) cellRefEl.textContent = 'J6';
      if (formulaTextEl) formulaTextEl.textContent = '=(E6 * F6 * G6) * I6';
    } else if (tipo === 'tora') {
      nomeArquivo = `Planilha_Toras_${(item.plaqueta || item.identificacao || 'Lote').replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`;
      if (cellRefEl) cellRefEl.textContent = 'J6';
      if (formulaTextEl) formulaTextEl.textContent = '=((PI()*(D6/200)^2 + PI()*(E6/200)^2)/2) * G6';
    }

    if (filenameEl) filenameEl.textContent = nomeArquivo;
    if (holdIndEl) holdIndEl.style.display = 'inline-flex';
    if (holdTextEl) holdTextEl.textContent = '📋 Planilha Aberta (Toque no ✕ ou fora para fechar)';

    if (tabMedicao) tabMedicao.classList.add('active');
    if (tabMemoria) tabMemoria.classList.remove('active');

    viewportGrid.innerHTML = this.gerarHtmlPlanilhaPrevia(item, 'medicao');

    modal.style.display = 'flex';
    this.previaAberta = true;
  }

  async abrirPreviaFixada(id) {
    let item = null;
    if (typeof id === 'string') {
      item = await window.cubagemDB.get(id);
    } else if (typeof id === 'object' && id !== null) {
      item = id;
    }
    if (!item && this.currentDetailItem) {
      item = this.currentDetailItem;
    }
    if (!item) {
      item = this.obterRegistroLiveAtual();
    }
    if (item) {
      this.mostrarPreviaPlanilha(item);
    }
  }

  fecharPreviaPlanilha(forcar = true) {
    const modal = document.getElementById('modalPreviaPlanilha');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('peek-mode');
    }
    this.previaAberta = false;
    this.previaAtivaItem = null;
  }

  alternarAbaPrevia(aba) {
    this.abaAtivaPrevia = aba;
    const tabMedicao = document.getElementById('prevTabMedicao');
    const tabMemoria = document.getElementById('prevTabMemoria');
    const viewportGrid = document.getElementById('prevSheetGrid');
    const cellRefEl = document.getElementById('prevCellRef');
    const formulaTextEl = document.getElementById('prevFormulaText');

    if (aba === 'medicao') {
      if (tabMedicao) tabMedicao.classList.add('active');
      if (tabMemoria) tabMemoria.classList.remove('active');
      const tipo = this.previaAtivaItem?.tipo || 'caminhao';
      if (cellRefEl) cellRefEl.textContent = tipo === 'caminhao' ? 'K6' : 'J6';
      if (formulaTextEl) {
        formulaTextEl.textContent = tipo === 'tora'
          ? '=((PI()*(D6/200)^2 + PI()*(E6/200)^2)/2) * G6'
          : '=(G6 * H6 * F6) * J6';
      }
    } else {
      if (tabMedicao) tabMedicao.classList.remove('active');
      if (tabMemoria) tabMemoria.classList.add('active');
      if (cellRefEl) cellRefEl.textContent = 'fx';
      if (formulaTextEl) formulaTextEl.textContent = '=MEMORIA_DE_CALCULO_OFICIAL(SISTAXON, IBAMA, CRBio)';
    }

    if (viewportGrid && this.previaAtivaItem) {
      viewportGrid.innerHTML = this.gerarHtmlPlanilhaPrevia(this.previaAtivaItem, aba);
    }
  }

  async baixarExcelDaPrevia() {
    if (!this.previaAtivaItem) return;
    const item = this.previaAtivaItem;
    const items = Array.isArray(item.toras) && item.toras.length > 1
      ? item.toras.map((t, idx) => ({
          ...item,
          id: `${item.id}-${idx + 1}`,
          plaqueta: t.plaqueta,
          especie: t.especie || item.especie,
          diametroPonta1_cm: t.diametroPonta1_cm,
          diametroPonta2_cm: t.diametroPonta2_cm,
          diametroMedio_cm: t.diametroMedio_cm,
          comprimento: t.comprimento,
          volumeGeometrico: t.volumeGeometrico
        }))
      : [item];

    const tag = (item.placa || item.identificacao || item.plaqueta || 'Medicao').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Planilha_${tag}_${item.data || 'cubagem'}.xlsx`;

    try {
      this.showToast('Gerando arquivo Excel (.xlsx)...', 'info');
      await window.CubagemExcelExport.exportWorkbook(items, {
        fileName,
        responsavel: item.responsavel || 'BioKuri Soluções Ambientais',
        startDate: item.data || '',
        endDate: item.data || ''
      });
      this.showToast(`Planilha ${fileName} baixada com sucesso!`, 'success');
    } catch (err) {
      console.error('Erro ao baixar planilha da prévia:', err);
      this.showToast('Erro ao exportar planilha Excel.', 'danger');
    }
  }

  gerarHtmlPlanilhaPrevia(item, aba = 'medicao') {
    if (!item) return '';

    const tipo = item.tipo || 'caminhao';
    const isTora = tipo === 'tora';
    const dataBR = window.CubagemExcelExport.formatDateBR(item.data);
    const fNum = (n, d = 2) => window.CubagemCalculator.formatNumber(n, d);
    const volStr = fNum(item.volumeGeometrico, isTora ? 3 : 2);

    if (aba === 'memoria') {
      return `
        <table class="excel-grid-table">
          <thead>
            <tr>
              <th class="excel-row-num"></th>
              <th class="excel-col-head" style="width: 50px;">A</th>
              <th class="excel-col-head" style="width: 220px;">B</th>
              <th class="excel-col-head" colspan="5">C</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="excel-row-num">1</td>
              <td colspan="7" class="excel-brand-title-cell">
                BIOKURI · SOLUÇÕES AMBIENTAIS — MEMÓRIA TÉCNICA DE CÁLCULO
              </td>
            </tr>
            <tr>
              <td class="excel-row-num">2</td>
              <td colspan="7" class="excel-brand-sub-cell">
                Auditoria Numérica e Paramétrica Conforme Diretrizes Sistaxon / Sinaflor (IBAMA)
              </td>
            </tr>
            <tr>
              <td class="excel-row-num">3</td>
              <td colspan="7" class="excel-meta-cell">
                <strong>Responsável:</strong> ${item.responsavel || 'Lucas Aøsf'} &bull; 
                <strong>Registro:</strong> CRBio 127233/01-D &bull; 
                <strong>Data:</strong> ${dataBR} às ${item.horario || '--:--'} &bull; 
                <strong>Local:</strong> ${item.rodovia || 'Pátio'} ${item.km ? 'km ' + item.km : ''}
              </td>
            </tr>
            <tr>
              <td class="excel-row-num">4</td>
              <td class="excel-cell-center font-mono">1</td>
              <td style="font-weight: 700; background: #F9FAFB;">Modalidade</td>
              <td colspan="5" class="excel-cell-text" style="font-weight: 600; color: #0E2515;">
                ${item.tipoVolume || (tipo === 'caminhao' ? 'Carga de Caminhão' : tipo === 'pilha' ? 'Pilha de Madeira' : 'Toras Roliças (Smalian)')}
              </td>
            </tr>
            <tr>
              <td class="excel-row-num">5</td>
              <td class="excel-cell-center font-mono">2</td>
              <td style="font-weight: 700; background: #F9FAFB;">Identificação</td>
              <td colspan="5" class="excel-cell-text font-mono" style="font-weight: 700;">
                ${item.placa || item.identificacao || item.plaqueta || 'S/ID'}
              </td>
            </tr>
            <tr>
              <td class="excel-row-num">6</td>
              <td class="excel-cell-center font-mono">3</td>
              <td style="font-weight: 700; background: #F9FAFB;">Origem da Madeira</td>
              <td colspan="5" class="excel-cell-text">
                ${item.origemMadeira || 'Nativa'} ${item.especie ? ' &bull; <em>' + item.especie + '</em>' : ''}
              </td>
            </tr>
            <tr>
              <td class="excel-row-num">7</td>
              <td class="excel-cell-center font-mono">4</td>
              <td style="font-weight: 700; background: #F9FAFB;">Equação Aplicada</td>
              <td colspan="5" class="excel-cell-text" style="font-family: Consolas, monospace; background: #FEFCE8; color: #854D0E;">
                ${tipo === 'caminhao' ? 'Hm = (Σ LE + Σ LD) / TotalAlturas  |  Vol = Comprimento × Largura × Hm' : tipo === 'pilha' ? 'Hm = (Σ Alturas) / TotalAlturas  |  Vol = Comprimento × Largura × Hm' : 'Smalian: V = ((g1 + g2) / 2) × L, onde g = π × (D/2)²'}
              </td>
            </tr>
            <tr>
              <td class="excel-row-num">8</td>
              <td class="excel-cell-center font-mono">5</td>
              <td style="font-weight: 700; background: #F9FAFB;">Memória Detalhada</td>
              <td colspan="5" class="excel-cell-text" style="white-space: pre-line; line-height: 1.5;">
                ${item.memoriaCalculo || 'Cálculo geométrico validado.'}
              </td>
            </tr>
            <tr class="excel-total-row">
              <td class="excel-row-num">9</td>
              <td class="excel-cell-center font-mono">✓</td>
              <td style="color: #0E2515; text-transform: uppercase;">Volume Final Homologado</td>
              <td colspan="5" class="excel-cell-num" style="font-size: 1.05rem; color: #0E2515; font-weight: 800;">
                ${volStr} m³ geométrico
              </td>
            </tr>
          </tbody>
        </table>
      `;
    }

    // ABA: MEDIÇÃO TÉCNICA (Planilha Excel Principal)
    if (tipo === 'caminhao') {
      const leArray = Array.isArray(item.alturasLE) ? item.alturasLE : [];
      const ldArray = Array.isArray(item.alturasLD) ? item.alturasLD : [];
      const leStr = leArray.length > 0 ? leArray.map(v => fNum(v)).join(' | ') : '-';
      const ldStr = ldArray.length > 0 ? ldArray.map(v => fNum(v)).join(' | ') : '-';
      const comp = item.comprimento || 0;
      const larg = item.largura || 0;
      const hm = item.alturaMedia || 0;
      const volEstereo = comp * larg * hm;

      return `
        <table class="excel-grid-table">
          <thead>
            <tr>
              <th class="excel-row-num"></th>
              <th class="excel-col-head" style="width: 35px;">A</th>
              <th class="excel-col-head" style="width: 95px;">B</th>
              <th class="excel-col-head" style="width: 70px;">C</th>
              <th class="excel-col-head" style="width: 140px;">D</th>
              <th class="excel-col-head" style="width: 140px;">E</th>
              <th class="excel-col-head" style="width: 80px;">F</th>
              <th class="excel-col-head" style="width: 80px;">G</th>
              <th class="excel-col-head" style="width: 80px;">H</th>
              <th class="excel-col-head" style="width: 95px;">I</th>
              <th class="excel-col-head" style="width: 60px;">J</th>
              <th class="excel-col-head" style="width: 100px;">K</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="excel-row-num">1</td>
              <td colspan="11" class="excel-brand-title-cell">
                BIOKURI · SOLUÇÕES AMBIENTAIS — CUBAGEM DE CARGA DE CAMINHÃO
              </td>
            </tr>
            <tr>
              <td class="excel-row-num">2</td>
              <td colspan="11" class="excel-brand-sub-cell">
                Planilha Oficial de Medição de Volume em Transporte Florestal
              </td>
            </tr>
            <tr>
              <td class="excel-row-num">3</td>
              <td colspan="11" class="excel-meta-cell">
                <strong>Data:</strong> ${dataBR} &bull; 
                <strong>Horário:</strong> ${item.horario || '--:--'} &bull; 
                <strong>Local:</strong> ${item.rodovia || 'Pátio'} ${item.km ? 'km ' + item.km : ''} &bull; 
                <strong>UTM:</strong> ${item.utm || 'Não reg.'} &bull; 
                <strong>Resp:</strong> ${item.responsavel || '-'}
              </td>
            </tr>
            <tr>
              <td class="excel-row-num">4</td>
              <td colspan="11" style="background: #FAFAFA; height: 6px; padding: 0;"></td>
            </tr>
            <tr>
              <td class="excel-row-num">5</td>
              <th class="excel-header-col">Nº</th>
              <th class="excel-header-col">Placa</th>
              <th class="excel-header-col">Origem</th>
              <th class="excel-header-col">LE Alturas (m)</th>
              <th class="excel-header-col">LD Alturas (m)</th>
              <th class="excel-header-col">Hm (m)</th>
              <th class="excel-header-col">Comp. (m)</th>
              <th class="excel-header-col">Larg. (m)</th>
              <th class="excel-header-col">Vol. Estéreo (st)</th>
              <th class="excel-header-col">F.E.</th>
              <th class="excel-header-col">Vol. Sólido (m³)</th>
            </tr>
            <tr>
              <td class="excel-row-num">6</td>
              <td class="excel-cell-center font-mono">1</td>
              <td class="excel-cell-center font-mono" style="font-weight: 700;">${item.placa || 'SEM PLACA'}</td>
              <td class="excel-cell-center">${item.origemMadeira || 'Nativa'}</td>
              <td class="excel-cell-center font-mono">${leStr}</td>
              <td class="excel-cell-center font-mono">${ldStr}</td>
              <td class="excel-cell-num">${fNum(hm)}</td>
              <td class="excel-cell-num">${fNum(comp)}</td>
              <td class="excel-cell-num">${fNum(larg)}</td>
              <td class="excel-cell-num">${fNum(volEstereo)}</td>
              <td class="excel-cell-center">1,00</td>
              <td class="excel-cell-num" style="font-weight: 700; color: #0E2515;">${volStr}</td>
            </tr>
            <tr class="excel-total-row">
              <td class="excel-row-num">7</td>
              <td colspan="3" class="excel-cell-text" style="font-weight: 700;">TOTAL DA CARGA</td>
              <td colspan="2" class="excel-cell-center" style="font-size: 0.74rem;">${leArray.length + ldArray.length} Tomadas de Altura</td>
              <td class="excel-cell-num">${fNum(hm)}</td>
              <td class="excel-cell-num">${fNum(comp)}</td>
              <td class="excel-cell-num">${fNum(larg)}</td>
              <td class="excel-cell-num">${fNum(volEstereo)} st</td>
              <td class="excel-cell-center">-</td>
              <td class="excel-cell-num" style="font-size: 0.96rem; font-weight: 800; color: #0E2515;">${volStr} m³</td>
            </tr>
          </tbody>
        </table>
      `;
    }

    if (tipo === 'pilha') {
      const altArray = Array.isArray(item.alturas) ? item.alturas : [];
      const altStr = altArray.length > 0 ? altArray.map(v => fNum(v)).join(' | ') : '-';
      const comp = item.comprimento || 0;
      const larg = item.largura || 0;
      const hm = item.alturaMedia || 0;
      const volEstereo = comp * larg * hm;

      return `
        <table class="excel-grid-table">
          <thead>
            <tr>
              <th class="excel-row-num"></th>
              <th class="excel-col-head" style="width: 35px;">A</th>
              <th class="excel-col-head" style="width: 120px;">B</th>
              <th class="excel-col-head" style="width: 70px;">C</th>
              <th class="excel-col-head" style="width: 200px;">D</th>
              <th class="excel-col-head" style="width: 80px;">E</th>
              <th class="excel-col-head" style="width: 80px;">F</th>
              <th class="excel-col-head" style="width: 80px;">G</th>
              <th class="excel-col-head" style="width: 95px;">H</th>
              <th class="excel-col-head" style="width: 60px;">I</th>
              <th class="excel-col-head" style="width: 100px;">J</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="excel-row-num">1</td>
              <td colspan="10" class="excel-brand-title-cell">
                BIOKURI · SOLUÇÕES AMBIENTAIS — CUBAGEM DE PILHA DE MADEIRA
              </td>
            </tr>
            <tr>
              <td class="excel-row-num">2</td>
              <td colspan="10" class="excel-brand-sub-cell">
                Planilha Oficial de Medição de Pilhas no Pátio / Campo
              </td>
            </tr>
            <tr>
              <td class="excel-row-num">3</td>
              <td colspan="10" class="excel-meta-cell">
                <strong>Data:</strong> ${dataBR} &bull; 
                <strong>Horário:</strong> ${item.horario || '--:--'} &bull; 
                <strong>Local:</strong> ${item.rodovia || 'Pátio'} ${item.km ? 'km ' + item.km : ''} &bull; 
                <strong>Resp:</strong> ${item.responsavel || '-'}
              </td>
            </tr>
            <tr>
              <td class="excel-row-num">4</td>
              <td colspan="10" style="background: #FAFAFA; height: 6px; padding: 0;"></td>
            </tr>
            <tr>
              <td class="excel-row-num">5</td>
              <th class="excel-header-col">Nº</th>
              <th class="excel-header-col">Identificação</th>
              <th class="excel-header-col">Origem</th>
              <th class="excel-header-col">Alturas Verticais (m)</th>
              <th class="excel-header-col">Hm (m)</th>
              <th class="excel-header-col">Comp. (m)</th>
              <th class="excel-header-col">Profund. (m)</th>
              <th class="excel-header-col">Vol. Estéreo (st)</th>
              <th class="excel-header-col">F.E.</th>
              <th class="excel-header-col">Vol. Sólido (m³)</th>
            </tr>
            <tr>
              <td class="excel-row-num">6</td>
              <td class="excel-cell-center font-mono">1</td>
              <td class="excel-cell-center font-mono" style="font-weight: 700;">${item.identificacao || item.placa || 'PILHA'}</td>
              <td class="excel-cell-center">${item.origemMadeira || 'Nativa'}</td>
              <td class="excel-cell-center font-mono">${altStr}</td>
              <td class="excel-cell-num">${fNum(hm)}</td>
              <td class="excel-cell-num">${fNum(comp)}</td>
              <td class="excel-cell-num">${fNum(larg)}</td>
              <td class="excel-cell-num">${fNum(volEstereo)}</td>
              <td class="excel-cell-center">1,00</td>
              <td class="excel-cell-num" style="font-weight: 700; color: #0E2515;">${volStr}</td>
            </tr>
            <tr class="excel-total-row">
              <td class="excel-row-num">7</td>
              <td colspan="3" class="excel-cell-text" style="font-weight: 700;">TOTAL DA PILHA</td>
              <td class="excel-cell-center" style="font-size: 0.74rem;">${altArray.length} Alturas tomadas</td>
              <td class="excel-cell-num">${fNum(hm)}</td>
              <td class="excel-cell-num">${fNum(comp)}</td>
              <td class="excel-cell-num">${fNum(larg)}</td>
              <td class="excel-cell-num">${fNum(volEstereo)} st</td>
              <td class="excel-cell-center">-</td>
              <td class="excel-cell-num" style="font-size: 0.96rem; font-weight: 800; color: #0E2515;">${volStr} m³</td>
            </tr>
          </tbody>
        </table>
      `;
    }

    if (tipo === 'tora') {
      const listaToras = Array.isArray(item.toras) && item.toras.length > 0
        ? item.toras
        : [{
            numero: 1,
            plaqueta: item.plaqueta || 'S/P',
            especie: item.especie || '',
            diametroPonta1_cm: item.diametroPonta1_cm || (Number(item.diametroMedio_cm) || 0),
            diametroPonta2_cm: item.diametroPonta2_cm || (Number(item.diametroMedio_cm) || 0),
            diametroMedio_cm: item.diametroMedio_cm || 0,
            comprimento: item.comprimento || 0,
            volumeGeometrico: item.volumeGeometrico || 0
          }];

      const totalToras = listaToras.length;
      let somaDm = 0;
      let somaComp = 0;
      let somaVol = 0;

      const rowsHtml = listaToras.map((t, idx) => {
        const rowNum = 6 + idx;
        const d1 = Number(t.diametroPonta1_cm) || 0;
        const d2 = Number(t.diametroPonta2_cm) || 0;
        const dm = Number(t.diametroMedio_cm) || ((d1 + d2) / 2);
        const comp = Number(t.comprimento) || 0;
        const vol = Number(t.volumeGeometrico) || 0;

        const g1 = Math.PI * Math.pow(d1 / 200, 2);
        const g2 = Math.PI * Math.pow(d2 / 200, 2);

        somaDm += dm;
        somaComp += comp;
        somaVol += vol;

        return `
          <tr>
            <td class="excel-row-num">${rowNum}</td>
            <td class="excel-cell-center font-mono">${idx + 1}</td>
            <td class="excel-cell-center font-mono" style="font-weight: 700;">${t.plaqueta || 'S/P'}</td>
            <td class="excel-cell-text" style="font-style: italic;">${t.especie || item.especie || '-'}</td>
            <td class="excel-cell-num">${fNum(d1, 1)}</td>
            <td class="excel-cell-num">${fNum(d2, 1)}</td>
            <td class="excel-cell-num font-mono" style="font-weight: 600;">${fNum(dm, 1)}</td>
            <td class="excel-cell-num">${fNum(comp, 2)}</td>
            <td class="excel-cell-num" style="color: #6B7280;">${fNum(g1, 4)}</td>
            <td class="excel-cell-num" style="color: #6B7280;">${fNum(g2, 4)}</td>
            <td class="excel-cell-num" style="font-weight: 700; color: #0E2515;">${fNum(vol, 3)}</td>
          </tr>
        `;
      }).join('');

      const dmMedio = totalToras > 0 ? (somaDm / totalToras) : 0;
      const compMedio = totalToras > 0 ? (somaComp / totalToras) : 0;
      const totalVolFinal = somaVol > 0 ? somaVol : (Number(item.volumeGeometrico) || 0);

      return `
        <table class="excel-grid-table">
          <thead>
            <tr>
              <th class="excel-row-num"></th>
              <th class="excel-col-head" style="width: 35px;">A</th>
              <th class="excel-col-head" style="width: 85px;">B</th>
              <th class="excel-col-head" style="width: 150px;">C</th>
              <th class="excel-col-head" style="width: 70px;">D</th>
              <th class="excel-col-head" style="width: 70px;">E</th>
              <th class="excel-col-head" style="width: 75px;">F</th>
              <th class="excel-col-head" style="width: 75px;">G</th>
              <th class="excel-col-head" style="width: 85px;">H</th>
              <th class="excel-col-head" style="width: 85px;">I</th>
              <th class="excel-col-head" style="width: 100px;">J</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="excel-row-num">1</td>
              <td colspan="10" class="excel-brand-title-cell">
                BIOKURI · SOLUÇÕES AMBIENTAIS — CUBAGEM DE TORAS ROLIÇAS (MÉTODO SMALIAN)
              </td>
            </tr>
            <tr>
              <td class="excel-row-num">2</td>
              <td colspan="10" class="excel-brand-sub-cell">
                Romaneio Analítico de Medição com Rastreabilidade de Plaqueta
              </td>
            </tr>
            <tr>
              <td class="excel-row-num">3</td>
              <td colspan="10" class="excel-meta-cell">
                <strong>Data:</strong> ${dataBR} &bull; 
                <strong>Horário:</strong> ${item.horario || '--:--'} &bull; 
                <strong>Local:</strong> ${item.rodovia || 'Pátio'} ${item.km ? 'km ' + item.km : ''} &bull; 
                <strong>Resp:</strong> ${item.responsavel || '-'} &bull; 
                <strong>Lote:</strong> ${item.identificacao || item.placa || 'Pilha de Toras'}
              </td>
            </tr>
            <tr>
              <td class="excel-row-num">4</td>
              <td colspan="10" style="background: #FAFAFA; height: 6px; padding: 0;"></td>
            </tr>
            <tr>
              <td class="excel-row-num">5</td>
              <th class="excel-header-col">Nº</th>
              <th class="excel-header-col">Plaqueta</th>
              <th class="excel-header-col">Espécie</th>
              <th class="excel-header-col">D1 (cm)</th>
              <th class="excel-header-col">D2 (cm)</th>
              <th class="excel-header-col">Dm (cm)</th>
              <th class="excel-header-col">Comp. L (m)</th>
              <th class="excel-header-col">g1 (m²)</th>
              <th class="excel-header-col">g2 (m²)</th>
              <th class="excel-header-col">Vol. Smalian (m³)</th>
            </tr>
            ${rowsHtml}
            <tr class="excel-total-row">
              <td class="excel-row-num">${6 + totalToras}</td>
              <td colspan="3" class="excel-cell-text" style="font-weight: 700;">
                TOTAL DO LOTE: ${totalToras} ${totalToras === 1 ? 'tora' : 'toras'}
              </td>
              <td colspan="2" class="excel-cell-center" style="font-size: 0.74rem;">Médias:</td>
              <td class="excel-cell-num font-mono" style="font-weight: 700;">${fNum(dmMedio, 1)} cm</td>
              <td class="excel-cell-num font-mono" style="font-weight: 700;">${fNum(compMedio, 2)} m</td>
              <td colspan="2" class="excel-cell-center" style="font-size: 0.72rem; color: #6B7280;">Σ Seções</td>
              <td class="excel-cell-num" style="font-size: 0.98rem; font-weight: 800; color: #0E2515;">
                ${fNum(totalVolFinal, 3)} m³
              </td>
            </tr>
          </tbody>
        </table>
      `;
    }

    return '<div style="padding: 20px; text-align: center; color: #666;">Nenhum dado para exibir.</div>';
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
