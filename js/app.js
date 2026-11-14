/**
 * app.js - Controlador principal do Aplicativo Cubagem Florestal
 * Gestão de interface, eventos, cálculos em tempo real e orquestração offline
 * Suporte a: Caminhão (LE/LD dinâmicos), Pilha de Madeira e Toras
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
    this.appVersion = '2.10.13';
    this.swRegistration = null;
    this.updateChecking = false;
    this.updateAvailable = null;

    // Estado de Edição e Seleção Múltipla
    this.editingRecordId = null;
    this.mergedSourceRecordIds = [];
    this.selectedHistoryIds = new Set();
    this.modoSelecaoAtivo = false;

    // Sistema de Autenticação e Nuvem
    this.auth = window.CubagemAuth ? new window.CubagemAuth() : null;

    // Projeto / Frente Compartilhada da Equipe
    this.projetoAtivo = localStorage.getItem('cubagem.projeto_ativo') || 'BR-153';
    this.selectedProjectRecordIds = new Set();
    this.abaProjetoAtiva = 'painel';
    this.registrosProjetoCache = [];
    this.selectedVincularIds = new Set();
    this.vincularRecordsCache = [];
    try {
      this.projetosRecentes = JSON.parse(localStorage.getItem('cubagem.projetos_recentes') || '["BR-153", "Geral"]');
      if (!Array.isArray(this.projetosRecentes)) this.projetosRecentes = ['BR-153', 'Geral'];
    } catch (e) {
      this.projetosRecentes = ['BR-153', 'Geral'];
    }

    // Lista dinâmica de toras para cubagem de pilhas de toras
    this.torasPilha = [];

    // Modalidade de Carga do Caminhão: 'geometrica' | 'toras'
    this.modoCargaCaminhao = 'geometrica';
    this.torasCaminhao = [];
    this.modalTorasSelecionadas = new Set();
    this.filtroStatusTorasModal = 'todas';
    this.catalogoTorasCache = [];

    // Sistema de Prévia da Planilha Excel
    this.previaAberta = false;
    this.previaAtivaItem = null;
    this.abaAtivaPrevia = 'medicao'; // 'medicao' | 'memoria'
  }

  async init() {
    console.log('[Cubagem Florestal] Inicializando aplicativo multipasta...');
    document.body.setAttribute('data-active-tab', 'inicio');
    this.atualizarUIProjeto();

    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(() => {});
    }

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
    this.configurarMonitoramentoRascunho();
    this.atualizarTextoBotaoSalvar();

    if (window.CubagemEspecies && typeof window.CubagemEspecies.initInputs === 'function') {
      try {
        window.CubagemEspecies.initInputs(this);
      } catch (e) {
        console.warn('[Init] Especies init:', e);
      }
    }

    try {
      await this.carregarPreferenciasIniciais();
    } catch (e) {
      console.warn('[Init] Preferencias init:', e);
    }

    try {
      await this.autoRepararRegistrosZerados();
    } catch (e) {
      console.warn('[Init] AutoRepair init:', e);
    }

    try {
      await this.atualizarDashboard();
    } catch (e) {
      console.warn('[Init] Dashboard init:', e);
    }

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
    setTimeout(() => this.checkUpdate(false), 2000);

    // Escuta reconexão com a internet para atualizar automaticamente
    window.addEventListener('online', () => {
      console.log('[App] Conexão com a internet restabelecida. Verificando atualizações...');
      this.checkUpdate(false);
      if (this.auth && this.auth.user) {
        this.auth.syncAllWithCloud(true);
      }
    });

    // Verificação periódica automática a cada 15 minutos se conectado
    setInterval(() => {
      if (navigator.onLine) {
        this.checkUpdate(false);
      }
    }, 15 * 60 * 1000);

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
          console.log('[Service Worker] Nova versão ativada. Recarregando aplicativo...');
          window.location.reload();
        }
      });

      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('./sw.js')
          .then((reg) => {
            this.swRegistration = reg;
            console.log('[Service Worker] Ativo:', reg.scope);

            // Se já houver um Service Worker novo aguardando para ativar, ativa imediatamente
            if (reg.waiting) {
              console.log('[Service Worker] Novo worker aguardando, ativando automaticamente...');
              reg.waiting.postMessage({ action: 'skipWaiting', type: 'SKIP_WAITING' });
            }

            // Escuta novas instalações de Service Worker
            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing;
              if (!newWorker) return;
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('[Service Worker] Nova versão instalada. Ativando imediatamente...');
                    newWorker.postMessage({ action: 'skipWaiting', type: 'SKIP_WAITING' });
                  }
                }
              });
            });

            // Monitor de visibilidade: verifica atualizações ao voltar para o app (mínimo a cada 60s)
            let lastVisCheck = Date.now();
            document.addEventListener('visibilitychange', () => {
              if (document.visibilityState === 'visible' && (Date.now() - lastVisCheck > 60000) && navigator.onLine) {
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
          console.log(`[Update] Nova versão detectada: v${data.v} (atual: v${this.appVersion}). Atualizando automaticamente...`);
          await this.executarAtualizacaoAutomatica(data);
          this.updateChecking = false;
          return;
        } else if (force) {
          this.showToast(`✓ O aplicativo já está na versão mais recente (v${this.appVersion}).`, 'info');
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

  async executarAtualizacaoAutomatica(data) {
    if (this.isUpdatingAuto) return;
    this.isUpdatingAuto = true;

    const vNova = data ? (data.v || data.nome || '') : '';
    console.log(`[Update] Atualizando automaticamente para a versão ${vNova}...`);
    this.showToast(`✨ Atualizando aplicativo para a versão ${vNova}...`, 'info', 2500);

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
    }, 600);
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

    if (viewId === 'inicio') {
      await this.atualizarDashboard();
      this.verificarRascunhoAtivo();
    } else if (viewId === 'nova') {
      this.resetarDataHoraAtual();
      this.verificarERestaurarRascunhoAoNavegarParaNova();
      this.atualizarTextoBotaoSalvar();
    } else if (viewId === 'historico') await this.carregarHistorico();
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
    const projInput = document.getElementById('cubProjeto');

    if (respInput && respPadrao && !respInput.value) respInput.value = respPadrao;
    if (rodInput && rodPadrao && !rodInput.value) rodInput.value = rodPadrao;
    if (projInput) projInput.value = this.projetoAtivo || 'BR-153';
    this.atualizarUIProjeto();
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
    const inpZona = document.getElementById('cubZona');
    const inpLat = document.getElementById('cubLatitude');
    const inpLon = document.getElementById('cubLongitude');
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
        const zonaStr = utm ? `${utm.zone}${utm.band}` : '22K';

        if (inpZona) inpZona.value = zonaStr;
        if (inpLat) inpLat.value = lat.toFixed(6);
        if (inpLon) inpLon.value = lon.toFixed(6);
        if (inpUtm && utm) {
          inpUtm.value = utm.formatted;
        } else if (inpUtm) {
          inpUtm.value = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
        }

        const acc = Math.round(pos.coords.accuracy);
        this.showToast(`Coordenadas capturadas (±${acc}m): Lat ${lat.toFixed(6)}, Long ${lon.toFixed(6)} (Zona ${zonaStr})`, 'success');
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
        this.showToast(`${msg} Você pode digitar as coordenadas manualmente.`, 'warning');
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '📍 GPS';
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
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
      document.getElementById('liveTypeBadge').textContent = this.modoCargaCaminhao === 'toras' ? 'Retirada (Toras Rastreáveis)' : 'Retirada do Material (Caminhão)';
      if (this.modoCargaCaminhao === 'toras') {
        this.renderizarListaTorasCaminhao();
      }
      if (!this.editingRecordId) {
        this.sugerirProximaViagem();
      }
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
      document.getElementById('liveTypeBadge').textContent = 'Pilha de Toras (Smalian)';
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

    const setTxt = (el, txt) => { if (el) el.textContent = txt; };
    const setHtml = (el, html) => { if (el) el.innerHTML = html; };

    if (this.tipoCubagem === 'caminhao') {
      if (this.modoCargaCaminhao === 'toras') {
        const totalToras = this.torasCaminhao.length;
        const fNum = (n, d = 2) => window.CubagemCalculator.formatNumber(n, d);
        setTxt(l1, 'Total de Toras');
        setTxt(l2, 'Dm Médio');
        setTxt(l3, 'Comp. Médio');

        if (totalToras > 0) {
          const lote = window.CubagemCalculator.calculateLoteToras(this.torasCaminhao);
          let volNum = (lote && typeof lote.volumeTotal === 'number' && !isNaN(lote.volumeTotal) && lote.volumeTotal > 0)
            ? lote.volumeTotal
            : (lote && typeof lote.volumeGeometrico === 'number' && !isNaN(lote.volumeGeometrico) && lote.volumeGeometrico > 0 ? lote.volumeGeometrico : 0);
          if (volNum <= 0 && Array.isArray(this.torasCaminhao)) {
            volNum = this.torasCaminhao.reduce((acc, t) => acc + (window.CubagemCalculator ? (window.CubagemCalculator.parseNumber(t.volumeGeometrico) || 0) : 0), 0);
          }
          const volStr = window.CubagemCalculator.formatNumber(volNum, 3);

          setTxt(volEl, volStr);
          setTxt(v1, `${lote.totalToras} toras`);

          const dmVal = (lote && (lote.diametroMedio_cm || lote.diametroMedio)) || 0;
          const compVal = (lote && lote.comprimentoMedio) || 0;
          const dmClean = `${window.CubagemCalculator.formatNumber(dmVal, 1)} cm`;
          const compClean = `${window.CubagemCalculator.formatNumber(compVal, 2)} m`;

          setTxt(v2, dmClean);
          setTxt(v3, compClean);
          setHtml(memEl, [
            `<strong>Retirada por Toras Rastreáveis (Fórmula de Smalian)</strong>`,
            `Total de Toras: ${lote.totalToras} | Dm Médio: ${dmClean} | Comp. Médio: ${compClean}`,
            `Volume Total Transportado: <strong>${volStr} m³</strong>`
          ].join('<br>'));
        } else {
          setTxt(volEl, '0,000');
          setTxt(v1, '0 toras');
          setTxt(v2, '0,0 cm');
          setTxt(v3, '0,00 m');
          setTxt(memEl, 'Puxe as toras pelas plaquetas ou selecione na lista de toras cubadas.');
        }
      } else {
        const comp = document.getElementById('cubComprimentoCam')?.value || '';
        const larg = document.getElementById('cubLarguraCam')?.value || '';
        const res = window.CubagemCalculator.calculateCaminhao({
          alturasLE: this.alturasLE,
          alturasLD: this.alturasLD,
          comprimentoRaw: comp,
          larguraRaw: larg
        });

        setTxt(l1, 'Soma Alturas');
        setTxt(l2, 'Hm Média');
        setTxt(l3, 'Dimensões (C × L)');

        if (res.isValid) {
          setTxt(volEl, res.display.volumeGeometrico);
          setTxt(v1, `${res.display.somaAlturas} m`);
          setTxt(v2, `${res.display.alturaMedia} m`);
          setTxt(v3, `${res.display.comprimento} × ${res.display.largura} m`);
          setHtml(memEl, res.memoriaCalculo.join('<br>'));
        } else {
          setTxt(volEl, '0,00');
          setTxt(v1, '0,00 m');
          setTxt(v2, '0,00 m');
          setTxt(v3, '0 × 0 m');
          setTxt(memEl, 'Preencha todas as alturas (LE e LD) e as dimensões da carga.');
        }
      }
    } else if (this.tipoCubagem === 'pilha') {
      const comp = document.getElementById('cubComprimentoPilha')?.value || '';
      const larg = document.getElementById('cubLarguraPilha')?.value || '';
      const res = window.CubagemCalculator.calculatePilha({
        alturas: this.alturasPilha,
        comprimentoRaw: comp,
        larguraRaw: larg
      });

      setTxt(l1, 'Soma Face');
      setTxt(l2, 'Hm da Pilha');
      setTxt(l3, 'Dimensões (C × P)');

      if (res.isValid) {
        setTxt(volEl, res.display.volumeGeometrico);
        setTxt(v1, `${res.display.somaAlturas} m`);
        setTxt(v2, `${res.display.alturaMedia} m`);
        setTxt(v3, `${res.display.comprimento} × ${res.display.largura} m`);
        setHtml(memEl, res.memoriaCalculo.join('<br>'));
      } else {
        setTxt(volEl, '0,00');
        setTxt(v1, '0,00 m');
        setTxt(v2, '0,00 m');
        setTxt(v3, '0 × 0 m');
        setTxt(memEl, 'Preencha as alturas da face da pilha, comprimento e profundidade.');
      }
    } else if (this.tipoCubagem === 'tora') {
      const d1 = document.getElementById('cubDiametroPonta1')?.value || '';
      const d2 = document.getElementById('cubDiametroPonta2')?.value || '';
      const comp = document.getElementById('cubComprimentoTora')?.value || '';
      const plaqueta = document.getElementById('cubPlaqueta')?.value || '';

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
        setTxt(volEl, lote.display.volumeTotal);
        setTxt(l1, 'Total de Toras');
        setTxt(v1, `${lote.totalToras} unid.`);
        setTxt(l2, 'Diâmetro Médio');
        setTxt(v2, lote.display.diametroMedio);
        setTxt(l3, 'Comp. Médio');
        setTxt(v3, lote.display.comprimentoMedio);
        setHtml(memEl, lote.memoriaCalculo.join('<br>'));
        const typeBadge = document.getElementById('liveTypeBadge');
        if (typeBadge) typeBadge.textContent = `Pilha de Toras (${lote.totalToras} toras)`;
      } else {
        setTxt(l1, 'Diâmetro Médio');
        setTxt(l2, 'Comprimento');
        setTxt(l3, 'Plaqueta');

        if (resCurrent.isValid) {
          setTxt(volEl, resCurrent.display.volumeGeometrico);
          setTxt(v1, resCurrent.display.diametroMedio);
          setTxt(v2, resCurrent.display.comprimento);
          setTxt(v3, resCurrent.plaqueta);
          setHtml(memEl, resCurrent.memoriaCalculo.join('<br>'));
        } else {
          setTxt(volEl, '0,000');
          setTxt(v1, '0 cm');
          setTxt(v2, '0 m');
          setTxt(v3, plaqueta || '-');
          setTxt(memEl, 'Preencha os dados da tora e toque em "+ Adicionar Esta Tora à Pilha".');
        }
      }
    }

    // Agenda auto-save de rascunho sempre que os cálculos ou medidas forem atualizados
    this.agendarSalvarRascunho();
  }

  // =========================================================================
  // SALVAR CUBAGEM (CAMINHÃO, PILHA OU TORA)
  // =========================================================================
  async salvarCubagem() {
    const data = document.getElementById('cubData').value;
    const horario = document.getElementById('cubHorario').value;
    const rodovia = document.getElementById('cubRodovia').value.trim();
    const km = (document.getElementById('cubKm')?.value.trim()) || '';
    const zona = (document.getElementById('cubZona')?.value.trim()) || '22K';
    const latitude = (document.getElementById('cubLatitude')?.value.trim()) || '';
    const longitude = (document.getElementById('cubLongitude')?.value.trim()) || '';
    let utm = (document.getElementById('cubUtm')?.value.trim()) || '';
    if (!utm && (latitude || longitude)) {
      utm = `${zona ? zona + ' ' : ''}${longitude} ${latitude}`.trim();
    }
    const responsavel = document.getElementById('cubResponsavel').value.trim();
    const observacoes = document.getElementById('cubObservacoes').value.trim();
    const projeto = (document.getElementById('cubProjeto')?.value.trim()) || this.projetoAtivo || 'BR-153';
    this.definirProjetoAtivo(projeto, false);

    const autorNome = this.auth?.user?.displayName || (this.auth?.user?.email ? this.auth.user.email.split('@')[0] : '') || responsavel;
    const autorEmail = this.auth?.user?.email || '';
    const autorUid = this.auth?.user?.uid || '';

    if (!data || !horario || !rodovia || !responsavel) {
      this.showToast('Preencha os campos operacionais obrigatórios (Data, Hora, Local e Responsável).', 'warning');
      return;
    }

    let record = null;

    if (this.tipoCubagem === 'caminhao') {
      const placa = document.getElementById('cubPlaca').value.trim().toUpperCase();
      const numeroViagem = this.obterNumeroViagem();
      const viagemTexto = this.obterViagemTexto();

      if (this.modoCargaCaminhao === 'toras') {
        if (!this.torasCaminhao || this.torasCaminhao.length === 0) {
          this.showToast('Puxe ou selecione ao menos uma tora carregada no caminhão.', 'warning');
          return;
        }

        this.torasCaminhao.forEach(t => {
          if (!t.viagem) t.viagem = viagemTexto;
          if (!t.numeroViagem) t.numeroViagem = numeroViagem;
        });

        const lote = window.CubagemCalculator.calculateLoteToras(this.torasCaminhao);
        const plaquetasList = this.torasCaminhao.map(t => t.plaqueta).filter(Boolean);
        const especiesUnicas = [...new Set(this.torasCaminhao.map(t => t.especie).filter(Boolean))];
        const especieFinal = especiesUnicas.length > 0
          ? (especiesUnicas.length <= 2 ? especiesUnicas.join(', ') : `${especiesUnicas.slice(0, 2).join(', ')} (+${especiesUnicas.length - 2})`)
          : '';

        const plaquetasResumo = plaquetasList.length > 0
          ? (plaquetasList.length > 4 ? `${plaquetasList[0]}, ${plaquetasList[1]}... (${lote.totalToras} toras)` : plaquetasList.join(', '))
          : 'SEM PLAQUETA';

        const volFinal = lote.volumeTotal || lote.volumeGeometrico || (window.CubagemCalculator ? window.CubagemCalculator.obterVolumeEfetivo({ toras: this.torasCaminhao }) : 0);

        record = {
          id: window.cubagemDB.generateId('CAM'),
          tipo: 'caminhao',
          modoCarga: 'toras',
          origemMadeira: this.origemMadeira || 'Nativa',
          especie: especieFinal,
          projeto, autorNome, autorEmail, autorUid,
          data, horario, rodovia, km, zona, latitude, longitude, utm, responsavel,
          placa: placa || 'NÃO INFORMADA',
          numeroViagem: numeroViagem,
          viagem: viagemTexto,
          observacoes,
          totalToras: lote.totalToras,
          diametroMedio_cm: lote.diametroMedio || lote.diametroMedio_cm,
          comprimento: lote.comprimentoMedio,
          comprimentoMedio: lote.comprimentoMedio,
          largura: 0,
          volumeGeometrico: volFinal,
          volumeTotal: volFinal,
          tipoVolume: 'Volume Smalian (Retirada Caminhão)',
          toras: [...this.torasCaminhao],
          plaqueta: `Plaquetas: ${plaquetasResumo}`,
          identificacao: `Retirada ${placa || 'S/ Placa'} (${viagemTexto} • ${lote.totalToras} Toras)`,
          memoriaCalculo: [
            `Retirada do Material (Caminhão) ${placa || 'S/ Placa'} — ${viagemTexto} — Toras Rastreáveis`,
            `Projeto / Frente: ${projeto}`,
            `Total de Toras Carregadas: ${lote.totalToras}`,
            `Diâmetro Médio (Dm): ${lote.display.diametroMedio} | Comprimento Médio: ${lote.display.comprimentoMedio}`,
            `Volume Total da Retirada: ${window.CubagemCalculator.formatNumber(volFinal, 3)} m³ (Fórmula de Smalian individual por tora)`
          ],
          timestamp: Date.now()
        };
      } else {
        const comp = document.getElementById('cubComprimentoCam').value;
        const larg = document.getElementById('cubLarguraCam').value;

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
          modoCarga: 'geometrica',
          origemMadeira: this.origemMadeira || 'Nativa',
          especie: '',
          projeto, autorNome, autorEmail, autorUid,
          data, horario, rodovia, km, zona, latitude, longitude, utm, responsavel,
          placa: placa || 'NÃO INFORMADA',
          numeroViagem: numeroViagem,
          viagem: viagemTexto,
          identificacao: `Retirada Caminhão ${placa || 'S/ Placa'} (${viagemTexto})`,
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
          memoriaCalculo: [
            `Retirada do Material (Caminhão) ${placa || 'S/ Placa'} — ${viagemTexto} — Carga Geométrica`,
            ...(Array.isArray(calc.memoriaCalculo) ? calc.memoriaCalculo : [calc.memoriaCalculo])
          ],
          timestamp: Date.now()
        };
      }
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
        projeto, autorNome, autorEmail, autorUid,
        data, horario, rodovia, km, zona, latitude, longitude, utm, responsavel,
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
        projeto, autorNome, autorEmail, autorUid,
        data, horario, rodovia, km, zona, latitude, longitude, utm, responsavel,
        identificacao: identPilhaTora,
        placa: identPilhaTora,
        plaqueta: plaquetasResumo,
        observacoes,
        totalToras: lote.totalToras,
        diametroMedio_cm: lote.diametroMedio_cm,
        comprimentoMedio: lote.comprimentoMedio,
        volumeGeometrico: lote.volumeTotal,
        tipoVolume: `Pilha de Toras (${lote.totalToras} toras - Smalian)`,
        memoriaCalculo: lote.memoriaCalculo,
        toras: [...this.torasPilha],
        timestamp: Date.now()
      };
    }

    const isEditing = Boolean(this.editingRecordId);
    if (isEditing) {
      record.id = this.editingRecordId;
      record.updatedAt = Date.now();
    }

    try {
      if (isEditing) {
        await window.cubagemDB.update(record);

        // Se veio de mesclagem de cubagens, remove os registros secundários consolidados
        if (this.mergedSourceRecordIds && this.mergedSourceRecordIds.length > 0) {
          for (const extraId of this.mergedSourceRecordIds) {
            await window.cubagemDB.delete(extraId);
            if (this.auth) {
              this.auth.deleteRecordFromCloud(extraId, record.projeto).catch(() => {});
            }
          }
        }
      } else {
        await window.cubagemDB.add(record);
      }

      const isAuto = this.isAutoSyncAtivo();
      if (this.auth && isAuto) {
        this.auth.syncRecordToCloud(record);
      }

      const vFmt = window.CubagemCalculator.formatNumber(record.volumeGeometrico, record.tipo === 'tora' ? 3 : 2);
      this.showToast(
        isEditing
          ? `Medição atualizada no projeto "${projeto}"! Volume: ${vFmt} m³${isAuto ? ' • Sincronizado na nuvem ☁️' : ''}`
          : `${record.tipo === 'caminhao' ? 'Retirada do Material' : 'Cubagem de ' + record.tipo.toUpperCase()} finalizada no projeto "${projeto}"! Volume: ${vFmt} m³${isAuto ? ' • Sincronizado na nuvem ☁️' : ''}`,
        'success'
      );

      this.editingRecordId = null;
      this.mergedSourceRecordIds = [];
      const editBanner = document.getElementById('editBannerNova');
      if (editBanner) editBanner.style.display = 'none';

      // Limpa rascunho de medição em andamento pois acabou de ser finalizada!
      try { localStorage.removeItem('cubagem.rascunho_ativo'); } catch (e) {}
      this.verificarRascunhoAtivo();
      const rascunhoAviso = document.getElementById('rascunhoAvisoNova');
      if (rascunhoAviso) rascunhoAviso.style.display = 'none';
      this.atualizarTextoBotaoSalvar();

      this.limparApenasMedidas();
      this.resetarDataHoraAtual();
      await this.atualizarDashboard();
      this.navigate('historico');
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
      this.torasCaminhao = [];
      this.renderizarListaTorasCaminhao();
      const fb = document.getElementById('camToraFeedbackMsg');
      if (fb) fb.style.display = 'none';
      const plqInp = document.getElementById('cubCamPlaquetasInput');
      if (plqInp) plqInp.value = '';
      this.setModoCargaCaminhao('geometrica');
      this.sugerirProximaViagem();
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
    this.editingRecordId = null;
    this.mergedSourceRecordIds = [];
    const editBanner = document.getElementById('editBannerNova');
    if (editBanner) editBanner.style.display = 'none';

    try { localStorage.removeItem('cubagem.rascunho_ativo'); } catch (e) {}
    this.verificarRascunhoAtivo();
    const rascunhoAviso = document.getElementById('rascunhoAvisoNova');
    if (rascunhoAviso) rascunhoAviso.style.display = 'none';
    this.atualizarTextoBotaoSalvar();

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
    this.torasCaminhao = [];
    this.renderizarListaTorasCaminhao();
    this.setModoCargaCaminhao('geometrica');
    const fb = document.getElementById('camToraFeedbackMsg');
    if (fb) fb.style.display = 'none';
    const plqInp = document.getElementById('cubCamPlaquetasInput');
    if (plqInp) plqInp.value = '';
    this.carregarPreferenciasIniciais();
    this.sugerirProximaViagem();
    this.executarCalculoTempoReal();
    this.showToast('Formulário limpo.', 'warning');
  }

  // =========================================================================
  // GESTÃO DE RASCUNHO & MEDIÇÃO EM ANDAMENTO (AUTO-SAVE)
  // =========================================================================

  isAutoSyncAtivo() {
    try {
      const val = localStorage.getItem('cubagem.sync.auto');
      return val === null ? true : (val === 'true' || val === true);
    } catch (e) {
      return true;
    }
  }

  alternarAutoSync(ativo) {
    try {
      localStorage.setItem('cubagem.sync.auto', ativo ? 'true' : 'false');
    } catch (e) {}
    this.atualizarTextoBotaoSalvar();
    this.showToast(
      ativo
        ? '✓ Sincronização Automática ATIVADA: medições finalizadas sobem sozinhas para a nuvem.'
        : '⚠️ Sincronização Automática DESATIVADA: medições ficam salvas apenas neste aparelho até envio manual.',
      ativo ? 'success' : 'warning',
      4500
    );
    if (this.auth && typeof this.auth.renderizarPainelUsuario === 'function') {
      this.auth.renderizarPainelUsuario();
    }
  }

  atualizarTextoBotaoSalvar() {
    const btnText = document.getElementById('btnSalvarTexto');
    if (!btnText) return;
    const auto = this.isAutoSyncAtivo();
    if (this.editingRecordId) {
      btnText.textContent = auto ? 'Salvar Alterações & Sincronizar' : 'Salvar Alterações no Aparelho';
    } else {
      btnText.textContent = auto ? 'Finalizar Medição & Enviar para Nuvem' : 'Finalizar Medição (Salvar no Aparelho)';
    }
  }

  configurarMonitoramentoRascunho() {
    const form = document.getElementById('formNovaCubagem');
    if (form) {
      form.addEventListener('input', () => this.agendarSalvarRascunho());
      form.addEventListener('change', () => this.agendarSalvarRascunho());
    }
    this.verificarRascunhoAtivo();
  }

  agendarSalvarRascunho() {
    if (this.editingRecordId) return;
    clearTimeout(this._timerRascunho);
    this._timerRascunho = setTimeout(() => this.salvarRascunhoMedicao(), 350);
  }

  salvarRascunhoMedicao() {
    if (this.editingRecordId) return;

    const data = document.getElementById('cubData')?.value || '';
    const horario = document.getElementById('cubHorario')?.value || '';
    const rodovia = document.getElementById('cubRodovia')?.value?.trim() || '';
    const km = document.getElementById('cubKm')?.value?.trim() || '';
    const zona = document.getElementById('cubZona')?.value?.trim() || '';
    const latitude = document.getElementById('cubLatitude')?.value?.trim() || '';
    const longitude = document.getElementById('cubLongitude')?.value?.trim() || '';
    const utm = document.getElementById('cubUtm')?.value?.trim() || '';
    const responsavel = document.getElementById('cubResponsavel')?.value?.trim() || '';
    const observacoes = document.getElementById('cubObservacoes')?.value?.trim() || '';
    const projeto = document.getElementById('cubProjeto')?.value?.trim() || this.projetoAtivo || 'BR-153';

    let temConteudo = false;
    let resumo = '';
    let volumeParcial = 0;
    let detalhes = '';

    const fNum = (n, d = 3) => (window.CubagemCalculator && typeof window.CubagemCalculator.formatNumber === 'function')
      ? window.CubagemCalculator.formatNumber(n, d)
      : Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

    const dados = {
      tipo: this.tipoCubagem,
      modoCargaCaminhao: this.modoCargaCaminhao,
      origemMadeira: this.origemMadeira,
      projeto, data, horario, rodovia, km, zona, latitude, longitude, utm, responsavel, observacoes
    };

    if (this.tipoCubagem === 'caminhao') {
      const placa = document.getElementById('cubPlaca')?.value?.trim().toUpperCase() || '';
      const comp = document.getElementById('cubComprimentoCam')?.value || '';
      const larg = document.getElementById('cubLarguraCam')?.value || '';
      const numeroViagem = this.obterNumeroViagem();
      const viagemTexto = this.obterViagemTexto();

      dados.placa = placa;
      dados.numeroViagem = numeroViagem;
      dados.viagemTexto = viagemTexto;
      dados.comprimento = comp;
      dados.largura = larg;
      dados.alturasLE = [...(this.alturasLE || [])];
      dados.alturasLD = [...(this.alturasLD || [])];
      dados.torasCaminhao = [...(this.torasCaminhao || [])];

      if (this.modoCargaCaminhao === 'toras') {
        if (this.torasCaminhao.length > 0 || placa) {
          temConteudo = true;
          const lote = window.CubagemCalculator ? window.CubagemCalculator.calculateLoteToras(this.torasCaminhao) : null;
          volumeParcial = lote ? (lote.volumeTotal || lote.volumeGeometrico || 0) : 0;
          resumo = `Retirada Caminhão ${placa || 'S/ Placa'}`;
          detalhes = `${this.torasCaminhao.length} toras carregadas (${fNum(volumeParcial, 3)} m³) • ${viagemTexto}`;
        }
      } else {
        const temAlturas = (this.alturasLE && this.alturasLE.some(Boolean)) || (this.alturasLD && this.alturasLD.some(Boolean));
        if (placa || comp || larg || temAlturas) {
          temConteudo = true;
          const calc = window.CubagemCalculator ? window.CubagemCalculator.calculateCaminhao({
            alturasLE: this.alturasLE,
            alturasLD: this.alturasLD,
            comprimentoRaw: comp,
            larguraRaw: larg
          }) : null;
          volumeParcial = calc && calc.volumeGeometrico ? calc.volumeGeometrico : 0;
          resumo = `Retirada Caminhão ${placa || 'S/ Placa'}`;
          detalhes = `Carga Geométrica (${fNum(volumeParcial, 2)} m³) • ${viagemTexto}`;
        }
      }
    } else if (this.tipoCubagem === 'pilha') {
      const identPilha = document.getElementById('cubIdentPilha')?.value?.trim() || '';
      const comp = document.getElementById('cubComprimentoPilha')?.value || '';
      const larg = document.getElementById('cubLarguraPilha')?.value || '';
      const temAlturas = this.alturasPilha && this.alturasPilha.some(Boolean);

      dados.identPilha = identPilha;
      dados.comprimento = comp;
      dados.largura = larg;
      dados.alturasPilha = [...(this.alturasPilha || [])];

      if (identPilha || comp || larg || temAlturas) {
        temConteudo = true;
        const calc = window.CubagemCalculator ? window.CubagemCalculator.calculatePilha({
          alturas: this.alturasPilha,
          comprimentoRaw: comp,
          larguraRaw: larg
        }) : null;
        volumeParcial = calc && calc.volumeGeometrico ? calc.volumeGeometrico : 0;
        resumo = `Pilha ${identPilha || 'S/ Identificação'}`;
        detalhes = `Pilha de Madeira (${fNum(volumeParcial, 2)} m³)`;
      }
    } else if (this.tipoCubagem === 'tora') {
      const identTora = document.getElementById('cubIdentPilhaTora')?.value?.trim() || '';
      const d1 = document.getElementById('cubDiametroPonta1')?.value || '';
      const d2 = document.getElementById('cubDiametroPonta2')?.value || '';
      const comp = document.getElementById('cubComprimentoTora')?.value || '';
      const plaqueta = document.getElementById('cubPlaqueta')?.value?.trim() || '';
      const especie = document.getElementById('cubEspecieTora')?.value?.trim() || '';

      dados.identPilhaTora = identTora;
      dados.diametroPonta1 = d1;
      dados.diametroPonta2 = d2;
      dados.comprimentoTora = comp;
      dados.plaqueta = plaqueta;
      dados.especie = especie;
      dados.torasPilha = [...(this.torasPilha || [])];

      if (this.torasPilha.length > 0 || plaqueta || d1 || comp || identTora) {
        temConteudo = true;
        const lote = window.CubagemCalculator ? window.CubagemCalculator.calculateLoteToras(this.torasPilha) : null;
        volumeParcial = lote ? (lote.volumeTotal || lote.volumeGeometrico || 0) : 0;
        resumo = identTora || (this.torasPilha.length > 0 ? `Pilha com ${this.torasPilha.length} Toras` : 'Cubagem de Toras');
        detalhes = `${this.torasPilha.length} toras adicionadas (${fNum(volumeParcial, 3)} m³) Smalian`;
      }
    }

    if (temConteudo) {
      const draft = {
        timestamp: Date.now(),
        tipo: this.tipoCubagem,
        resumo,
        detalhes,
        volumeParcial,
        dados
      };
      try { localStorage.setItem('cubagem.rascunho_ativo', JSON.stringify(draft)); } catch (e) {}
      this.verificarRascunhoAtivo();
    } else {
      try { localStorage.removeItem('cubagem.rascunho_ativo'); } catch (e) {}
      this.verificarRascunhoAtivo();
    }
  }

  verificarRascunhoAtivo() {
    const banner = document.getElementById('coverRascunhoAlerta');
    let raw = null;
    try { raw = localStorage.getItem('cubagem.rascunho_ativo'); } catch (e) {}

    if (!raw) {
      if (banner) banner.style.display = 'none';
      return;
    }

    try {
      const draft = JSON.parse(raw);
      if (!draft || !draft.dados) {
        if (banner) banner.style.display = 'none';
        return;
      }

      if (banner) {
        const descEl = document.getElementById('coverDraftDesc');
        const subEl = document.getElementById('coverDraftSub');
        const timeEl = document.getElementById('coverDraftTime');

        const horaFormatada = new Date(draft.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const tipoFmt = draft.tipo === 'caminhao' ? 'Retirada (Caminhão)' : (draft.tipo === 'pilha' ? 'Pilha de Madeira' : 'Cubagem de Toras');

        if (descEl) descEl.innerHTML = `<strong>${this.escapeHtml(draft.resumo || tipoFmt)}</strong>`;
        if (subEl) subEl.textContent = `${draft.detalhes || 'Dados preservados no aparelho'} • ${draft.dados.projeto ? 'Frente ' + draft.dados.projeto : ''}`;
        if (timeEl) timeEl.textContent = `Salvo no aparelho às ${horaFormatada}`;

        banner.style.display = 'block';
      }
    } catch (e) {
      if (banner) banner.style.display = 'none';
    }
  }

  verificarERestaurarRascunhoAoNavegarParaNova() {
    let raw = null;
    try { raw = localStorage.getItem('cubagem.rascunho_ativo'); } catch (e) {}

    const avisoNova = document.getElementById('rascunhoAvisoNova');
    const avisoTexto = document.getElementById('rascunhoAvisoTexto');

    if (!raw) {
      if (avisoNova) avisoNova.style.display = 'none';
      return;
    }

    try {
      const draft = JSON.parse(raw);
      if (!draft || !draft.dados) {
        if (avisoNova) avisoNova.style.display = 'none';
        return;
      }

      if (this.editingRecordId) return;

      const placaInp = document.getElementById('cubPlaca');
      const identPilha = document.getElementById('cubIdentPilha');
      const d1 = document.getElementById('cubDiametroPonta1');
      const precisaRestaurar = (!placaInp || !placaInp.value) &&
                               (!identPilha || !identPilha.value) &&
                               (!d1 || !d1.value) &&
                               this.torasCaminhao.length === 0 &&
                               this.torasPilha.length === 0;

      if (precisaRestaurar) {
        this.restaurarDadosDoRascunho(draft);
      }

      if (avisoNova) {
        if (avisoTexto) {
          avisoTexto.textContent = `${draft.resumo || 'Medição'} preservada no aparelho (${draft.detalhes || 'em andamento'}). Preencha e finalize abaixo.`;
        }
        avisoNova.style.display = 'flex';
      }
    } catch (e) {
      if (avisoNova) avisoNova.style.display = 'none';
    }
  }

  restaurarDadosDoRascunho(draft) {
    if (!draft || !draft.dados) return;
    const d = draft.dados;

    this.setTipoCubagem(d.tipo || 'caminhao');
    if (d.origemMadeira) this.setOrigemMadeira(d.origemMadeira);

    if (d.data) { const el = document.getElementById('cubData'); if (el) el.value = d.data; }
    if (d.horario) { const el = document.getElementById('cubHorario'); if (el) el.value = d.horario; }
    if (d.projeto) { const el = document.getElementById('cubProjeto'); if (el) el.value = d.projeto; }
    if (d.responsavel) { const el = document.getElementById('cubResponsavel'); if (el) el.value = d.responsavel; }
    if (d.rodovia) { const el = document.getElementById('cubRodovia'); if (el) el.value = d.rodovia; }
    if (d.km) { const el = document.getElementById('cubKm'); if (el) el.value = d.km; }
    if (d.zona) { const el = document.getElementById('cubZona'); if (el) el.value = d.zona; }
    if (d.latitude) { const el = document.getElementById('cubLatitude'); if (el) el.value = d.latitude; }
    if (d.longitude) { const el = document.getElementById('cubLongitude'); if (el) el.value = d.longitude; }
    if (d.utm) { const el = document.getElementById('cubUtm'); if (el) el.value = d.utm; }
    if (d.observacoes) { const el = document.getElementById('cubObservacoes'); if (el) el.value = d.observacoes; }

    if (d.tipo === 'caminhao') {
      this.setModoCargaCaminhao(d.modoCargaCaminhao || 'geometrica');
      const plq = document.getElementById('cubPlaca');
      if (plq && d.placa) plq.value = d.placa;

      if (d.modoCargaCaminhao === 'toras') {
        this.torasCaminhao = Array.isArray(d.torasCaminhao) ? [...d.torasCaminhao] : [];
        this.renderizarListaTorasCaminhao();
      } else {
        if (Array.isArray(d.alturasLE)) this.alturasLE = [...d.alturasLE];
        if (Array.isArray(d.alturasLD)) this.alturasLD = [...d.alturasLD];
        this.renderizarGridsAlturas();
        const comp = document.getElementById('cubComprimentoCam');
        const larg = document.getElementById('cubLarguraCam');
        if (comp && d.comprimento) comp.value = d.comprimento;
        if (larg && d.largura) larg.value = d.largura;
      }
    } else if (d.tipo === 'pilha') {
      const idEl = document.getElementById('cubIdentPilha');
      const comp = document.getElementById('cubComprimentoPilha');
      const larg = document.getElementById('cubLarguraPilha');
      if (idEl && d.identPilha) idEl.value = d.identPilha;
      if (comp && d.comprimento) comp.value = d.comprimento;
      if (larg && d.largura) larg.value = d.largura;
      if (Array.isArray(d.alturasPilha)) this.alturasPilha = [...d.alturasPilha];
      this.renderizarGridsAlturas();
    } else if (d.tipo === 'tora') {
      const idEl = document.getElementById('cubIdentPilhaTora');
      if (idEl && d.identPilhaTora) idEl.value = d.identPilhaTora;
      this.torasPilha = Array.isArray(d.torasPilha) ? [...d.torasPilha] : [];
      this.renderizarListaTorasPilha();
      const d1 = document.getElementById('cubDiametroPonta1');
      const d2 = document.getElementById('cubDiametroPonta2');
      const comp = document.getElementById('cubComprimentoTora');
      const plaqueta = document.getElementById('cubPlaqueta');
      const esp = document.getElementById('cubEspecieTora');
      if (d1 && d.diametroPonta1) d1.value = d.diametroPonta1;
      if (d2 && d.diametroPonta2) d2.value = d.diametroPonta2;
      if (comp && d.comprimentoTora) comp.value = d.comprimentoTora;
      if (plaqueta && d.plaqueta) plaqueta.value = d.plaqueta;
      if (esp && d.especie) esp.value = d.especie;
    }

    this.executarCalculoTempoReal();
  }

  retomarMedicaoRascunho() {
    let raw = null;
    try { raw = localStorage.getItem('cubagem.rascunho_ativo'); } catch (e) {}
    if (!raw) return;

    try {
      const draft = JSON.parse(raw);
      this.restaurarDadosDoRascunho(draft);
      this.navigate('nova');
      this.showToast('✓ Medição em andamento restaurada! Continue de onde parou e finalize quando terminar.', 'success', 5000);
    } catch (err) {
      console.error('Erro ao retomar rascunho:', err);
      this.showToast('Não foi possível restaurar os dados.', 'danger');
    }
  }

  descartarMedicaoRascunho() {
    if (!confirm('Deseja realmente descartar a medição em andamento? Todas as medidas não finalizadas deste aparelho serão apagadas.')) {
      return;
    }
    try { localStorage.removeItem('cubagem.rascunho_ativo'); } catch (e) {}
    this.limparFormularioNova();
    this.verificarRascunhoAtivo();
    const avisoNova = document.getElementById('rascunhoAvisoNova');
    if (avisoNova) avisoNova.style.display = 'none';
    this.showToast('Medição em andamento descartada com sucesso.', 'info');
  }

  // =========================================================================
  // EDIÇÃO DE CUBAGEM, MULTI-SELEÇÃO E MESCLAGEM
  // =========================================================================

  async iniciarEdicaoCubagem(id) {
    try {
      const item = await window.cubagemDB.get(id);
      if (!item) {
        this.showToast('Cubagem não encontrada.', 'warning');
        return;
      }

      this.editingRecordId = item.id;
      this.mergedSourceRecordIds = [];

      const tipo = item.tipo || 'caminhao';
      this.setTipoCubagem(tipo);

      const elData = document.getElementById('cubData');
      const elHora = document.getElementById('cubHorario');
      const elRod = document.getElementById('cubRodovia');
      const elKm = document.getElementById('cubKm');
      const elZona = document.getElementById('cubZona');
      const elLat = document.getElementById('cubLatitude');
      const elLon = document.getElementById('cubLongitude');
      const elUtm = document.getElementById('cubUtm');
      const elResp = document.getElementById('cubResponsavel');
      const elObs = document.getElementById('cubObservacoes');

      const coords = window.CubagemExcelExport && typeof window.CubagemExcelExport.extrairCoordenadas === 'function'
        ? window.CubagemExcelExport.extrairCoordenadas(item)
        : { zona: item.zona || '22K', latitude: item.latitude || '', longitude: item.longitude || '' };

      if (elData && item.data) elData.value = item.data;
      if (elHora && item.horario) elHora.value = item.horario;
      if (elRod && item.rodovia) elRod.value = item.rodovia;
      if (elKm) elKm.value = item.km || '';
      if (elZona) elZona.value = coords.zona || '22K';
      if (elLat) elLat.value = coords.latitude || '';
      if (elLon) elLon.value = coords.longitude || '';
      if (elUtm) elUtm.value = item.utm || (coords.latitude && coords.longitude ? `${coords.zona} ${coords.longitude} ${coords.latitude}` : '');
      if (elResp && item.responsavel) elResp.value = item.responsavel;
      if (elObs) elObs.value = item.observacoes || '';

      const elProj = document.getElementById('cubProjeto');
      if (elProj && item.projeto) {
        elProj.value = item.projeto;
        this.definirProjetoAtivo(item.projeto, false);
      }

      this.setOrigemMadeira(item.origemMadeira || 'Nativa');

      if (tipo === 'caminhao') {
        const elPlaca = document.getElementById('cubPlaca');
        if (elPlaca) elPlaca.value = item.placa || '';

        const numViagem = item.numeroViagem || (item.viagem ? parseInt(String(item.viagem).replace(/\D+/g, ''), 10) : 1) || 1;
        this.definirViagemCaminhao(numViagem);

        const modo = (item.modoCarga === 'toras' || (Array.isArray(item.toras) && item.toras.length > 0)) ? 'toras' : 'geometrica';
        this.setModoCargaCaminhao(modo);

        if (modo === 'toras') {
          this.torasCaminhao = Array.isArray(item.toras) ? JSON.parse(JSON.stringify(item.toras)) : [];
          this.renderizarListaTorasCaminhao();
        } else {
          const elComp = document.getElementById('cubComprimentoCam');
          const elLarg = document.getElementById('cubLarguraCam');
          if (elComp) elComp.value = item.comprimento || '';
          if (elLarg) elLarg.value = item.largura || '';

          this.alturasLE = Array.isArray(item.alturasLE) && item.alturasLE.length > 0 ? [...item.alturasLE] : ['', '', ''];
          this.alturasLD = Array.isArray(item.alturasLD) && item.alturasLD.length > 0 ? [...item.alturasLD] : ['', '', ''];
          this.renderizarGridsAlturas();
        }
      } else if (tipo === 'pilha') {
        const elIdent = document.getElementById('cubIdentPilha');
        const elComp = document.getElementById('cubComprimentoPilha');
        const elLarg = document.getElementById('cubLarguraPilha');

        if (elIdent) elIdent.value = item.identificacao || item.placa || '';
        if (elComp) elComp.value = item.comprimento || '';
        if (elLarg) elLarg.value = item.largura || '';

        this.alturasPilha = Array.isArray(item.alturas) && item.alturas.length > 0 ? [...item.alturas] : ['', '', '', ''];
        this.renderizarGridsAlturas();
      } else if (tipo === 'tora') {
        const elIdent = document.getElementById('cubIdentPilhaTora');
        const elPlaq = document.getElementById('cubPlaqueta');
        const elEsp = document.getElementById('cubEspecieTora');

        if (elIdent) elIdent.value = item.identificacao || item.placa || '';
        if (elPlaq) elPlaq.value = item.plaqueta || '';
        if (elEsp) elEsp.value = item.especie || '';

        if (Array.isArray(item.toras) && item.toras.length > 0) {
          this.torasPilha = JSON.parse(JSON.stringify(item.toras));
        } else if (item.diametroPonta1_cm) {
          this.torasPilha = [{
            numero: 1,
            plaqueta: item.plaqueta || '1',
            especie: item.especie || '',
            diametroPonta1_cm: item.diametroPonta1_cm,
            diametroPonta2_cm: item.diametroPonta2_cm,
            diametroPonta1_m: item.diametroPonta1_m || (item.diametroPonta1_cm / 100),
            diametroPonta2_m: item.diametroPonta2_m || (item.diametroPonta2_cm / 100),
            diametroMedio_cm: item.diametroMedio_cm || ((item.diametroPonta1_cm + item.diametroPonta2_cm) / 2),
            comprimento: item.comprimento,
            volumeGeometrico: item.volumeGeometrico
          }];
        } else {
          this.torasPilha = [];
        }
        this.renderizarListaTorasPilha();
      }

      this.executarCalculoTempoReal();

      const banner = document.getElementById('editBannerNova');
      const titleEl = document.getElementById('editBannerTitle');
      const subEl = document.getElementById('editBannerSub');
      const btnTxt = document.getElementById('btnSalvarTexto');

      if (banner) {
        banner.style.display = 'flex';
        const idVisual = item.placa || item.identificacao || item.plaqueta || item.id;
        if (titleEl) titleEl.textContent = `Editando Cubagem: ${idVisual}`;
        if (subEl) {
          const dtFmt = window.CubagemExcelExport.formatDateBR(item.data);
          subEl.textContent = `Registrada em ${dtFmt} às ${item.horario || ''} (${item.rodovia || 'Pátio'}). Altere os dados e salve.`;
        }
      }

      if (btnTxt) {
        this.atualizarTextoBotaoSalvar();
      }

      this.navigate('nova');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.showToast('Cubagem carregada para edição. Modifique os dados e clique em salvar.', 'info');
    } catch (err) {
      console.error('Erro ao iniciar edição:', err);
      this.showToast('Erro ao carregar dados da cubagem para edição.', 'danger');
    }
  }

  cancelarEdicao() {
    this.editingRecordId = null;
    this.mergedSourceRecordIds = [];

    const banner = document.getElementById('editBannerNova');
    if (banner) banner.style.display = 'none';

    this.atualizarTextoBotaoSalvar();

    this.limparFormularioNova();
    this.showToast('Edição cancelada.', 'info');
  }

  toggleItemSelecionado(id, isChecked) {
    if (isChecked) {
      this.selectedHistoryIds.add(id);
    } else {
      this.selectedHistoryIds.delete(id);
    }
    this.atualizarBarraSelecao();

    const card = document.querySelector(`.history-item-card[data-id="${id}"]`);
    if (card) {
      if (isChecked) card.classList.add('selected-card');
      else card.classList.remove('selected-card');
    }
  }

  atualizarBarraSelecao() {
    const bar = document.getElementById('historyBulkBar');
    const badgeNum = document.getElementById('bulkCountBadge');
    const countText = document.getElementById('bulkCountText');
    const btnMerge = document.getElementById('btnBulkMerge');
    const btnToggleAll = document.getElementById('btnMarcarTodasHist');

    const totalSelected = this.selectedHistoryIds.size;

    if (!bar) return;

    if (totalSelected > 0) {
      bar.style.display = 'flex';
      if (badgeNum) badgeNum.textContent = totalSelected;
      if (countText) countText.textContent = totalSelected === 1 ? 'medição selecionada' : 'medições selecionadas';
      if (btnMerge) {
        btnMerge.style.display = totalSelected >= 2 ? 'inline-flex' : 'none';
      }
      if (btnToggleAll) {
        btnToggleAll.textContent = '✕ Desmarcar';
      }
    } else {
      bar.style.display = 'none';
      if (btnToggleAll) {
        btnToggleAll.textContent = '☑️ Selecionar';
      }
    }
  }

  desmarcarTodasHistorico() {
    this.selectedHistoryIds.clear();
    document.querySelectorAll('.hist-card-checkbox').forEach(cb => {
      cb.checked = false;
    });
    document.querySelectorAll('.history-item-card.selected-card').forEach(card => {
      card.classList.remove('selected-card');
    });
    this.atualizarBarraSelecao();
  }

  marcarTodasHistorico() {
    const checkboxes = document.querySelectorAll('.hist-card-checkbox');
    checkboxes.forEach(cb => {
      cb.checked = true;
      this.selectedHistoryIds.add(cb.value);
    });
    document.querySelectorAll('.history-item-card').forEach(card => {
      card.classList.add('selected-card');
    });
    this.atualizarBarraSelecao();
  }

  toggleMarcarTodasHistorico() {
    if (this.selectedHistoryIds.size > 0) {
      this.desmarcarTodasHistorico();
    } else {
      this.marcarTodasHistorico();
    }
  }

  async exportarSelecionadasExcel() {
    if (this.selectedHistoryIds.size === 0) {
      this.showToast('Selecione ao menos uma cubagem para exportar.', 'warning');
      return;
    }

    const ids = [...this.selectedHistoryIds];
    const records = (await Promise.all(ids.map(id => window.cubagemDB.get(id)))).filter(Boolean);
    if (records.length === 0) return;

    records.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    const dataPrimeira = records[0].data || '';
    const dataUltima = records[records.length - 1].data || '';
    const isSingleDay = Boolean(dataPrimeira && dataPrimeira === dataUltima);
    const fileName = isSingleDay
      ? `Planilha_Consolidada_do_Dia_${dataPrimeira}_${records.length}_Cubagens.xlsx`
      : `Planilha_${records.length}_Cubagens_${dataPrimeira}_a_${dataUltima}.xlsx`;

    try {
      this.showToast(
        isSingleDay
          ? `Exportando consolidado de ${records.length} cubagens do dia para Excel (.xlsx)...`
          : `Exportando ${records.length} cubagens para Excel (.xlsx)...`,
        'info'
      );
      await window.CubagemExcelExport.exportWorkbook(records, {
        fileName,
        responsavel: records[0].responsavel || 'BioKuri Soluções Ambientais',
        startDate: dataPrimeira,
        endDate: dataUltima
      });
      this.showToast(`Planilha com ${records.length} cubagens baixada com sucesso!`, 'success');
    } catch (err) {
      console.error('Erro ao exportar selecionadas:', err);
      this.showToast(`Erro ao exportar planilha Excel: ${err.message || err}`, 'danger');
    }
  }

  async preverSelecionadas() {
    if (this.selectedHistoryIds.size === 0) {
      this.showToast('Selecione ao menos uma cubagem para visualizar.', 'warning');
      return;
    }

    const ids = [...this.selectedHistoryIds];
    const records = (await Promise.all(ids.map(id => window.cubagemDB.get(id)))).filter(Boolean);
    if (records.length === 0) return;

    records.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    if (records.length === 1) {
      this.mostrarPreviaPlanilha(records[0]);
    } else {
      this.mostrarPreviaPlanilha(records);
    }
  }

  async mesclarSelecionadas() {
    if (this.selectedHistoryIds.size < 2) {
      this.showToast('Selecione ao menos 2 cubagens para mesclar.', 'warning');
      return;
    }

    const ids = [...this.selectedHistoryIds];
    const records = (await Promise.all(ids.map(id => window.cubagemDB.get(id)))).filter(Boolean);
    if (records.length < 2) return;

    const tipos = [...new Set(records.map(r => r.tipo || 'caminhao'))];
    if (tipos.length > 1) {
      this.showToast('Para mesclar, selecione cubagens da mesma modalidade (ex: apenas caminhões ou apenas pilhas).', 'warning');
      return;
    }

    const tipo = tipos[0];
    records.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    const principal = records[0];
    const secundarias = records.slice(1);
    const secundariasIds = secundarias.map(r => r.id);

    this.editingRecordId = principal.id;
    this.mergedSourceRecordIds = secundariasIds;

    this.setTipoCubagem(tipo);

    const elData = document.getElementById('cubData');
    const elHora = document.getElementById('cubHorario');
    const elRod = document.getElementById('cubRodovia');
    const elKm = document.getElementById('cubKm');
    const elZona = document.getElementById('cubZona');
    const elLat = document.getElementById('cubLatitude');
    const elLon = document.getElementById('cubLongitude');
    const elUtm = document.getElementById('cubUtm');
    const elResp = document.getElementById('cubResponsavel');
    const elObs = document.getElementById('cubObservacoes');

    const coords = window.CubagemExcelExport && typeof window.CubagemExcelExport.extrairCoordenadas === 'function'
      ? window.CubagemExcelExport.extrairCoordenadas(principal)
      : { zona: principal.zona || '22K', latitude: principal.latitude || '', longitude: principal.longitude || '' };

    if (elData) elData.value = principal.data;
    if (elHora) elHora.value = principal.horario;
    if (elRod) elRod.value = principal.rodovia;
    if (elKm) elKm.value = principal.km || secundarias.find(s => s.km)?.km || '';
    if (elZona) elZona.value = coords.zona || '22K';
    if (elLat) elLat.value = coords.latitude || '';
    if (elLon) elLon.value = coords.longitude || '';
    if (elUtm) elUtm.value = principal.utm || secundarias.find(s => s.utm)?.utm || '';
    if (elResp) elResp.value = principal.responsavel;

    const horasJuntas = records.map(r => r.horario).filter(Boolean).join(', ');
    const placasJuntas = [...new Set(records.map(r => r.placa || r.identificacao).filter(Boolean))].join(' / ');
    const obsMesclada = `Cubagem unificada do dia todo (${records.length} medições: ${horasJuntas}). ${principal.observacoes || ''}`;
    if (elObs) elObs.value = obsMesclada.trim();

    if (tipo === 'caminhao') {
      const elPlaca = document.getElementById('cubPlaca');
      const elComp = document.getElementById('cubComprimentoCam');
      const elLarg = document.getElementById('cubLarguraCam');

      if (elPlaca) elPlaca.value = placasJuntas || principal.placa || '';
      if (elComp) elComp.value = principal.comprimento || secundarias[0]?.comprimento || '';
      if (elLarg) elLarg.value = principal.largura || secundarias[0]?.largura || '';

      const temToras = records.some(r => r.modoCarga === 'toras' || (Array.isArray(r.toras) && r.toras.length > 0));
      if (temToras) {
        this.setModoCargaCaminhao('toras');
        const todasTorasCam = [];
        records.forEach(r => {
          const tripR = r.viagem || (r.numeroViagem ? `${r.numeroViagem}ª Viagem` : '');
          if (Array.isArray(r.toras)) {
            r.toras.forEach(t => {
              todasTorasCam.push({
                ...t,
                viagem: t.viagem || tripR,
                numeroViagem: t.numeroViagem || r.numeroViagem
              });
            });
          }
        });
        todasTorasCam.forEach((t, i) => { t.numero = i + 1; });
        this.torasCaminhao = todasTorasCam;
        this.renderizarListaTorasCaminhao();
      } else {
        this.setModoCargaCaminhao('geometrica');
        const todasLE = records.flatMap(r => Array.isArray(r.alturasLE) ? r.alturasLE : [r.alturasLE]).filter(v => v !== '' && !isNaN(v));
        const todasLD = records.flatMap(r => Array.isArray(r.alturasLD) ? r.alturasLD : [r.alturasLD]).filter(v => v !== '' && !isNaN(v));

        this.alturasLE = todasLE.length > 0 ? todasLE : ['', '', ''];
        this.alturasLD = todasLD.length > 0 ? todasLD : ['', '', ''];
        this.renderizarGridsAlturas();
      }
    } else if (tipo === 'pilha') {
      const elIdent = document.getElementById('cubIdentPilha');
      const elComp = document.getElementById('cubComprimentoPilha');
      const elLarg = document.getElementById('cubLarguraPilha');

      if (elIdent) elIdent.value = placasJuntas || principal.identificacao || '';
      if (elComp) elComp.value = principal.comprimento || '';
      if (elLarg) elLarg.value = principal.largura || '';

      const todasAlt = records.flatMap(r => Array.isArray(r.alturas) ? r.alturas : [r.alturas]).filter(v => v !== '' && !isNaN(v));
      this.alturasPilha = todasAlt.length > 0 ? todasAlt : ['', '', '', ''];
      this.renderizarGridsAlturas();
    } else if (tipo === 'tora') {
      const elIdent = document.getElementById('cubIdentPilhaTora');
      const diaBR = window.CubagemExcelExport.formatDateBR(principal.data);
      if (elIdent) elIdent.value = `Cubagem do Dia - ${diaBR}`;

      const todasToras = [];
      records.forEach(r => {
        if (Array.isArray(r.toras) && r.toras.length > 0) {
          todasToras.push(...r.toras);
        } else if (r.diametroPonta1_cm) {
          todasToras.push({
            numero: 1,
            plaqueta: r.plaqueta || '1',
            especie: r.especie || '',
            diametroPonta1_cm: r.diametroPonta1_cm,
            diametroPonta2_cm: r.diametroPonta2_cm,
            diametroPonta1_m: r.diametroPonta1_m || (r.diametroPonta1_cm / 100),
            diametroPonta2_m: r.diametroPonta2_m || (r.diametroPonta2_cm / 100),
            diametroMedio_cm: r.diametroMedio_cm || ((r.diametroPonta1_cm + r.diametroPonta2_cm) / 2),
            comprimento: r.comprimento,
            volumeGeometrico: r.volumeGeometrico
          });
        }
      });
      todasToras.forEach((t, i) => { t.numero = i + 1; });
      this.torasPilha = todasToras;
      this.renderizarListaTorasPilha();
    }

    this.executarCalculoTempoReal();

    const banner = document.getElementById('editBannerNova');
    const titleEl = document.getElementById('editBannerTitle');
    const subEl = document.getElementById('editBannerSub');
    const btnTxt = document.getElementById('btnSalvarTexto');

    if (banner) {
      banner.style.display = 'flex';
      if (titleEl) titleEl.textContent = `Mesclando ${records.length} Cubagens em 1 Só`;
      if (subEl) subEl.textContent = `Ao salvar, estas medições serão unificadas nesta cubagem definitiva do dia.`;
    }
    if (btnTxt) {
      btnTxt.textContent = this.isAutoSyncAtivo() ? 'Salvar e Unificar (Sincronizar na Nuvem)' : 'Salvar e Unificar no Aparelho';
    }

    this.desmarcarTodasHistorico();
    this.navigate('nova');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.showToast(`Dados das ${records.length} cubagens unidos no formulário! Revise e clique em Salvar.`, 'success');
  }

  // =========================================================================
  // DASHBOARD E ESTATÍSTICAS
  // =========================================================================
  async atualizarDashboard() {
    try {
      this.verificarRascunhoAtivo();
      const stats = await window.cubagemDB.getStats();

      // Formatação inteligente com precisão de campo (2 ou 3 casas)
      const fVol = (v) => {
        if (!v || isNaN(v) || v <= 0) return '0,00';
        const has3Dec = Math.abs(Math.round(v * 100) / 100 - Math.round(v * 1000) / 1000) > 0.0001;
        return window.CubagemCalculator.formatNumber(v, has3Dec ? 3 : 2);
      };

      // 1. TOTAL CUBADO (ENTRADA NO PÁTIO: PILHAS + TORAS)
      const totalCubadoEl = document.getElementById('coverTotalCubado');
      const coverStatSubEl = document.getElementById('coverStatSub');
      const coverHistCountEl = document.getElementById('coverHistCount');

      const totalPilhas = stats.totalPilhas || 0;
      const totalToras = stats.totalToras || 0;
      const totalItemsEntrada = totalPilhas + totalToras;

      let subEntradaText = 'Nenhuma cubagem de entrada registrada';
      if (totalItemsEntrada > 0) {
        const partes = [];
        if (totalPilhas > 0) partes.push(`${totalPilhas} ${totalPilhas === 1 ? 'pilha' : 'pilhas'}`);
        if (totalToras > 0) partes.push(`${totalToras} ${totalToras === 1 ? 'lote de toras' : 'lotes de toras'}`);
        subEntradaText = `${partes.join(' e ')} no pátio`;
      }

      const volEntrada = stats.totalVolumeEntrada !== undefined ? stats.totalVolumeEntrada : (stats.totalVolume || 0);
      if (totalCubadoEl) totalCubadoEl.textContent = fVol(volEntrada);
      if (coverStatSubEl) coverStatSubEl.textContent = subEntradaText;
      if (coverHistCountEl) coverHistCountEl.textContent = stats.totalCount || 0;

      // 2. TOTAL RETIRADO (SAÍDA: CAMINHÕES)
      const coverRetiradasVol = document.getElementById('coverRetiradasVol');
      const coverRetiradasSub = document.getElementById('coverRetiradasSub');
      const volSaida = stats.totalVolumeSaida !== undefined ? stats.totalVolumeSaida : (stats.volCaminhoes || 0);
      const nCaminhoes = stats.totalCaminhoes || 0;

      if (coverRetiradasVol) coverRetiradasVol.textContent = fVol(volSaida);
      if (coverRetiradasSub) {
        coverRetiradasSub.textContent = nCaminhoes === 0
          ? '0 retiradas (caminhões)'
          : `${nCaminhoes} ${nCaminhoes === 1 ? 'caminhão retirado' : 'caminhões retirados'}`;
      }

      // 3. FALTA RETIRAR (SALDO RESTANTE NO PÁTIO)
      const coverSaldoPatio = document.getElementById('coverSaldoPatio');
      const coverSaldoSub = document.getElementById('coverSaldoSub');
      const saldo = stats.saldoPatio !== undefined ? stats.saldoPatio : (volEntrada - volSaida);

      if (coverSaldoPatio) {
        coverSaldoPatio.textContent = fVol(saldo > 0 ? saldo : 0);
      }
      if (coverSaldoSub) {
        if (volEntrada <= 0) {
          coverSaldoSub.textContent = 'Aguardando medições';
        } else if (saldo <= 0.001 && volSaida > 0) {
          coverSaldoSub.textContent = '✓ Pátio 100% retirado';
        } else {
          const perc = volEntrada > 0 ? Math.min(100, Math.round((saldo / volEntrada) * 100)) : 0;
          coverSaldoSub.textContent = `${perc}% restante no pátio`;
        }
      }

      // Mantém compatibilidade com outros elementos se presentes
      const kpiVol = document.getElementById('kpiTotalVolume');
      if (kpiVol) kpiVol.innerHTML = `${window.CubagemCalculator.formatNumber(volEntrada, 2)} <span class="kpi-unit">m³</span>`;
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
      if (elVolDet) elVolDet.textContent = `${stats.totalCaminhoes} cam (saída) • ${stats.totalPilhas} pilhas • ${stats.totalToras} toras`;

      // Atualiza lista de pastas de projetos vinculados à conta na capa
      try {
        await this.renderizarProjetosCapa();
      } catch (eProj) {
        console.warn('[Dashboard] Erro ao renderizar projetos da capa:', eProj);
      }

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
  // AUTO-REPARAÇÃO DE MEDIÇÕES COM CUBAGEM ZERADA OU CORROMPIDA
  // =========================================================================
  async autoRepararRegistrosZerados() {
    try {
      const all = await window.cubagemDB.getAll(false);
      let reparados = 0;
      for (const item of all) {
        let mudou = false;
        const volAtual = Number(item.volumeGeometrico) || 0;

        if (volAtual <= 0) {
          const volEfetivo = window.CubagemCalculator ? window.CubagemCalculator.obterVolumeEfetivo(item) : 0;
          if (volEfetivo > 0) {
            item.volumeGeometrico = volEfetivo;
            item.volumeTotal = volEfetivo;
            mudou = true;
          }
        }

        if (Array.isArray(item.toras) && item.toras.length > 0) {
          const lote = window.CubagemCalculator ? window.CubagemCalculator.calculateLoteToras(item.toras) : null;
          if (lote) {
            if (!item.totalToras || item.totalToras !== lote.totalToras) {
              item.totalToras = lote.totalToras;
              mudou = true;
            }
            if ((!item.diametroMedio_cm || item.diametroMedio_cm <= 0) && lote.diametroMedio_cm) {
              item.diametroMedio_cm = lote.diametroMedio_cm;
              mudou = true;
            }
            if ((!item.comprimento || item.comprimento <= 0) && lote.comprimentoMedio) {
              item.comprimento = lote.comprimentoMedio;
              mudou = true;
            }
            if ((!item.comprimentoMedio || item.comprimentoMedio <= 0) && lote.comprimentoMedio) {
              item.comprimentoMedio = lote.comprimentoMedio;
              mudou = true;
            }
          }
        }

        if (mudou) {
          await window.cubagemDB.update(item);
          if (this.auth && typeof this.auth.syncRecordToCloud === 'function') {
            this.auth.syncRecordToCloud(item).catch(() => {});
          }
          reparados++;
        }
      }

      if (reparados > 0) {
        console.log(`[AutoRepair] ✓ ${reparados} medição(ões) reparadas e sincronizadas!`);
        this.atualizarDashboard();
      }
    } catch (err) {
      console.warn('[AutoRepair] Erro na auto-reparação:', err);
    }
  }

  // =========================================================================
  // HISTÓRICO
  // =========================================================================
  async carregarHistorico() {
    try {
      const searchVal = document.getElementById('historySearchInput').value;
      const items = await window.cubagemDB.search(searchVal, this.historyFilterTipo);

      const countLabel = document.getElementById('histTotalCountLabel');
      if (countLabel) {
        countLabel.textContent = `${items.length} mediç${items.length === 1 ? 'ão salva' : 'ões salvas'}`;
      }

      const container = document.getElementById('historyListContainer');
      if (!container) return;

      if (items.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-title">Nenhum registro encontrado</div>
            <div class="empty-state-desc">Tente ajustar o termo de pesquisa ou os filtros de tipo.</div>
          </div>
        `;
        this.atualizarBarraSelecao();
        return;
      }

      container.innerHTML = items.map((item) => this.gerarCardItemHTML(item)).join('');
      this.atualizarBarraSelecao();

      if (items.some(it => !it.volumeGeometrico || Number(it.volumeGeometrico) <= 0 || (Array.isArray(it.toras) && it.toras.length > 0 && !it.comprimentoMedio))) {
        this.autoRepararRegistrosZerados();
      }
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
    const esc = (s) => this.escapeHtml(s);
    const tipo = item.tipo || 'caminhao';
    const isTorasCam = tipo === 'caminhao' && (item.modoCarga === 'toras' || (Array.isArray(item.toras) && item.toras.length > 0));
    const isTora = tipo === 'tora' || isTorasCam;
    const volNum = (window.CubagemCalculator && typeof window.CubagemCalculator.obterVolumeEfetivo === 'function')
      ? window.CubagemCalculator.obterVolumeEfetivo(item)
      : (Number(item.volumeGeometrico) || 0);
    const volFormatado = window.CubagemCalculator.formatNumber(volNum, isTora ? 3 : 2);
    const dataBR = window.CubagemExcelExport.formatDateBR(item.data);
    const isSelected = this.selectedHistoryIds.has(item.id);

    let tagTipo = '🚚 Retirada (Caminhão)';
    let tituloItem = esc(item.placa || 'SEM PLACA');
    let subItem = `${esc(item.rodovia)} ${item.km ? '• km ' + esc(item.km) : ''}`;

    if (tipo === 'caminhao') {
      const vNum = item.numeroViagem || (item.viagem ? parseInt(String(item.viagem).replace(/\D+/g, ''), 10) : 0);
      const vStr = vNum > 0 ? `${vNum}ª Viagem` : (item.viagem || '');
      const vTag = vStr ? ` • ${vStr}` : '';
      if (isTorasCam) {
        const nToras = item.totalToras || (item.toras ? item.toras.length : 0);
        tagTipo = `🚚 Retirada${vTag} • ${nToras} Toras`;
        tituloItem = `${esc(item.placa || 'SEM PLACA')}${vStr ? ' (' + esc(vStr) + ')' : ''} (${nToras} toras)`;
        subItem = `${esc(item.rodovia)} • Smalian • ${esc(item.especie || item.origemMadeira || 'Nativa')}`;
      } else {
        const origStr = item.origemMadeira ? ` • ${item.origemMadeira}` : ' • Nativa';
        tagTipo = `🚚 Retirada${vTag}${origStr}`;
        tituloItem = `${esc(item.placa || 'SEM PLACA')}${vStr ? ' (' + esc(vStr) + ')' : ''}`;
      }
    } else if (tipo === 'pilha') {
      const origStr = item.origemMadeira ? ` • ${item.origemMadeira}` : ' • Nativa';
      tagTipo = `🪵 Pilha${origStr}`;
      tituloItem = esc(item.identificacao || item.placa || 'Pilha Sem Identificação');
      const nAlt = Array.isArray(item.alturas) ? item.alturas.length : (item.totalAlturas || '-');
      subItem = `${esc(item.rodovia)} • ${nAlt} alturas`;
    } else if (tipo === 'tora') {
      tagTipo = '🌲 Tora (Smalian)';
      tituloItem = `Plaqueta: ${esc(item.plaqueta || 'S/P')}`;
      const espStr = item.especie ? ` • ${esc(item.especie)}` : '';
      let compVal = item.comprimento || item.comprimentoMedio;
      let dmVal = item.diametroMedio_cm;
      if (Array.isArray(item.toras) && item.toras.length > 0) {
        if (!compVal) {
          const somaC = item.toras.reduce((acc, t) => acc + (Number(t.comprimento) || 0), 0);
          compVal = somaC / item.toras.length;
        }
        if (!dmVal) {
          const somaD = item.toras.reduce((acc, t) => {
            const d = Number(t.diametroMedio_cm) || ((Number(t.diametroPonta1_cm) + Number(t.diametroPonta2_cm)) / 2) || 0;
            return acc + d;
          }, 0);
          dmVal = somaD / item.toras.length;
        }
      }
      const dmStr = (dmVal && !isNaN(dmVal) && Number(dmVal) > 0) ? `${Number(dmVal).toFixed(1)} cm` : '-';
      const compStr = (compVal && !isNaN(compVal) && Number(compVal) > 0) ? `${Number(compVal).toFixed(2)} m` : '-';
      subItem = `D: ${dmStr} • L: ${compStr}${espStr}`;
    }

    return `
      <div class="history-item-card ${isSelected ? 'selected-card' : ''}" data-id="${esc(item.id)}">
        <div class="history-card-top">
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" class="hist-card-checkbox" value="${esc(item.id)}" ${isSelected ? 'checked' : ''} onchange="app.toggleItemSelecionado('${esc(item.id)}', this.checked)" title="Selecionar cubagem">
            <span class="badge-type ${esc(tipo)}">${esc(tagTipo)}</span>
          </div>
          <span class="history-tag-date">${esc(dataBR)} • ${esc(item.horario || '')}</span>
        </div>
        <div class="history-card-body">
          <div>
            <div class="history-plate">${tituloItem}</div>
            <div class="history-resp">${subItem}</div>
            <div style="font-size: 0.75rem; color: var(--muted); margin-top: 2px;">Resp: ${esc(item.responsavel || '-')}${item.projeto ? ` • 📁 ${esc(item.projeto)}` : ''}${item.autorNome && item.autorNome !== item.responsavel ? ` • (${esc(item.autorNome)})` : ''}</div>
          </div>
          <div class="history-vol-badge">
            <div class="history-vol-num">${volFormatado}</div>
            <div class="history-vol-unit">m³ geom.</div>
          </div>
        </div>
        <div class="history-card-actions">
          <button type="button" class="btn-action-small edit-btn" onclick="app.iniciarEdicaoCubagem('${esc(item.id)}')" title="Editar medidas e dados desta cubagem">✏️ Editar</button>
          <button type="button" class="btn-action-small preview-btn" onclick="app.abrirPreviaFixada('${esc(item.id)}')" title="Ver planilha completa desta cubagem">📊 Ver Planilha</button>
          <button type="button" class="btn-action-small" onclick="app.abrirDetalhes('${esc(item.id)}')">Detalhes</button>
          <button type="button" class="btn-action-small danger" onclick="app.abrirModalExcluir('${esc(item.id)}')">Excluir</button>
        </div>
      </div>
    `;
  }

  async abrirDetalhes(id) {
    const item = await window.cubagemDB.get(id);
    if (!item) return;

    this.currentDetailItem = item;
    const esc = (s) => this.escapeHtml(s);
    const dataBR = window.CubagemExcelExport.formatDateBR(item.data);
    const tipo = item.tipo || 'caminhao';
    const isTorasCam = tipo === 'caminhao' && (item.modoCarga === 'toras' || (Array.isArray(item.toras) && item.toras.length > 0));
    const isTora = tipo === 'tora' || isTorasCam;
    const fNum = (n, d = 2) => window.CubagemCalculator.formatNumber(n, d);
    const volDet = (window.CubagemCalculator && typeof window.CubagemCalculator.obterVolumeEfetivo === 'function')
      ? window.CubagemCalculator.obterVolumeEfetivo(item)
      : (Number(item.volumeGeometrico) || 0);

    document.getElementById('detalheModalTitulo').textContent = tipo === 'caminhao' ? 'Detalhes: Retirada (Caminhão)' : `Detalhes: ${tipo.toUpperCase()}`;

    let detalheHtml = '';
    const projMetaHtml = item.projeto ? `<strong>Projeto / Frente:</strong> <span style="font-weight: 700; color: var(--gold);">${esc(item.projeto)}</span><br>` : '';
    const autorMetaHtml = item.autorNome && item.autorNome !== item.responsavel ? `<strong>Registrado por:</strong> ${esc(item.autorNome)} (Equipe)<br>` : '';

    if (tipo === 'caminhao') {
      if (isTorasCam) {
        const torasArr = Array.isArray(item.toras) ? item.toras : [];
        const nToras = item.totalToras || torasArr.length;
        const torasPreview = torasArr.slice(0, 15).map(t =>
          `<div style="display: flex; justify-content: space-between; font-size: 0.78rem; padding: 4px 0; border-bottom: 1px dotted var(--line);">
            <span><strong>Plaqueta ${esc(t.plaqueta)}</strong> <em>(${esc(t.especie || 'N/I')})</em></span>
            <span>Dm: ${fNum(t.diametroMedio_cm, 1)} cm • L: ${fNum(t.comprimento, 2)} m • <strong style="color: var(--gold);">${fNum(t.volumeGeometrico, 3)} m³</strong></span>
          </div>`
        ).join('') + (torasArr.length > 15 ? `<div style="text-align: center; font-size: 0.75rem; color: var(--gold); margin-top: 6px; font-weight: 700;">+ ${torasArr.length - 15} outras toras carregadas</div>` : '');

        detalheHtml = `
          <div style="margin-bottom: 12px;">
            ${projMetaHtml}
            ${autorMetaHtml}
            <strong>Placa:</strong> ${esc(item.placa || 'Sem placa')}<br>
            <strong>Nº da Viagem:</strong> <span style="font-weight: 700; color: var(--gold);">${esc(item.viagem || (item.numeroViagem ? item.numeroViagem + 'ª Viagem' : '1ª Viagem'))}</span><br>
            <strong>Modalidade:</strong> <span style="font-weight: 700; color: var(--gold);">Toras Rastreáveis (Fórmula de Smalian)</span><br>
            <strong>Origem da Madeira:</strong> <span style="font-weight: 700; color: var(--gold);">${esc(item.origemMadeira || 'Nativa')}</span><br>
            ${item.especie ? `<strong>Espécies:</strong> <span style="font-weight: 700; font-style: italic; color: var(--gold);">${esc(item.especie)}</span><br>` : ''}
            <strong>Local / Pátio:</strong> ${esc(item.rodovia)} ${item.km ? '• km ' + esc(item.km) : ''}<br>
            ${item.utm ? `<strong>Coordenada UTM:</strong> <span style="font-family: monospace; color: var(--gold); font-weight: 700;">${esc(item.utm)}</span><br>` : ''}
            <strong>Data/Hora:</strong> ${esc(dataBR)} às ${esc(item.horario)}<br>
            <strong>Responsável:</strong> ${esc(item.responsavel)}
          </div>
          <div class="calc-result-card">
            <div class="calc-result-header">
              <span class="calc-result-tag">Volume Total das Toras</span>
              <span class="calc-result-type-badge">${fNum(volDet, 3)} m³</span>
            </div>
            <div style="font-size: 0.85rem; line-height: 1.6; margin-bottom: 10px;">
              <strong>Total de Toras Carregadas:</strong> ${nToras} toras<br>
              <strong>Diâmetro Médio (Dm):</strong> ${fNum(item.diametroMedio_cm, 1)} cm<br>
              <strong>Comprimento Médio:</strong> ${fNum(item.comprimento || item.comprimentoMedio, 2)} m
            </div>
            ${torasArr.length > 0 ? `
              <div style="border-top: 1.5px solid var(--line); padding-top: 8px;">
                <strong style="font-size: 0.82rem; color: var(--gold); display: block; margin-bottom: 6px;">Toras Carregadas neste Caminhão:</strong>
                ${torasPreview}
              </div>
            ` : ''}
          </div>
        `;
      } else {
        const leStr = Array.isArray(item.alturasLE) ? item.alturasLE.map(v => fNum(v) + ' m').join(', ') : '-';
        const ldStr = Array.isArray(item.alturasLD) ? item.alturasLD.map(v => fNum(v) + ' m').join(', ') : '-';
        detalheHtml = `
          <div style="margin-bottom: 12px;">
            ${projMetaHtml}
            ${autorMetaHtml}
            <strong>Placa:</strong> ${esc(item.placa || 'Sem placa')}<br>
            <strong>Nº da Viagem:</strong> <span style="font-weight: 700; color: var(--gold);">${esc(item.viagem || (item.numeroViagem ? item.numeroViagem + 'ª Viagem' : '1ª Viagem'))}</span><br>
            <strong>Origem da Madeira:</strong> <span style="font-weight: 700; color: var(--gold);">${esc(item.origemMadeira || 'Nativa')}</span><br>
            ${item.especie ? `<strong>Espécie Florestal:</strong> <span style="font-weight: 700; font-style: italic; color: var(--gold);">${esc(item.especie)}</span><br>` : ''}
            <strong>Local / Pátio:</strong> ${esc(item.rodovia)} ${item.km ? '• km ' + esc(item.km) : ''}<br>
            ${item.utm ? `<strong>Coordenada UTM:</strong> <span style="font-family: monospace; color: var(--gold); font-weight: 700;">${esc(item.utm)}</span><br>` : ''}
            <strong>Data/Hora:</strong> ${esc(dataBR)} às ${esc(item.horario)}<br>
            <strong>Responsável:</strong> ${esc(item.responsavel)}
          </div>
          <div class="calc-result-card">
            <div class="calc-result-header">
              <span class="calc-result-tag">Volume Geométrico</span>
              <span class="calc-result-type-badge">${fNum(volDet, 2)} m³</span>
            </div>
            <div style="font-size: 0.85rem; line-height: 1.6;">
              <strong>Alturas LE:</strong> ${leStr}<br>
              <strong>Alturas LD:</strong> ${ldStr}<br>
              <strong>Hm Média:</strong> ${fNum(item.alturaMedia, 4)} m<br>
              <strong>Dimensões:</strong> ${fNum(item.comprimento)} m × ${fNum(item.largura)} m
            </div>
          </div>
        `;
      }
    } else if (tipo === 'pilha') {
      const altStr = Array.isArray(item.alturas) ? item.alturas.map(v => fNum(v) + ' m').join(', ') : '-';
      detalheHtml = `
        <div style="margin-bottom: 12px;">
          ${projMetaHtml}
          ${autorMetaHtml}
          <strong>Identificação:</strong> ${esc(item.identificacao || item.placa || 'Pilha')}<br>
          <strong>Origem da Madeira:</strong> <span style="font-weight: 700; color: var(--gold);">${esc(item.origemMadeira || 'Nativa')}</span><br>
          ${item.especie ? `<strong>Espécie Florestal:</strong> <span style="font-weight: 700; font-style: italic; color: var(--gold);">${esc(item.especie)}</span><br>` : ''}
          <strong>Local / Pátio:</strong> ${esc(item.rodovia)} ${item.km ? '• km ' + esc(item.km) : ''}<br>
          ${item.utm ? `<strong>Coordenada UTM:</strong> <span style="font-family: monospace; color: var(--gold); font-weight: 700;">${esc(item.utm)}</span><br>` : ''}
          <strong>Data/Hora:</strong> ${esc(dataBR)} às ${esc(item.horario)}<br>
          <strong>Responsável:</strong> ${esc(item.responsavel)}
        </div>
        <div class="calc-result-card">
          <div class="calc-result-header">
            <span class="calc-result-tag">Volume Estéreo</span>
            <span class="calc-result-type-badge">${fNum(volDet, 2)} m³</span>
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
          ${projMetaHtml}
          ${autorMetaHtml}
          <strong>Identificação Individual:</strong> ${esc(item.identificacao || item.plaqueta || item.id)}<br>
          ${item.especie ? `<strong>Espécie Florestal:</strong> <span style="font-weight: 700; font-style: italic; color: var(--gold);">${esc(item.especie)}</span><br>` : ''}
          <strong>Nº da Plaqueta:</strong> ${esc(item.plaqueta || 'S/P')}<br>
          <strong>Local / Pátio:</strong> ${esc(item.rodovia)} ${item.km ? '• km ' + esc(item.km) : ''}<br>
          ${item.utm ? `<strong>Coordenada UTM:</strong> <span style="font-family: monospace; color: var(--gold); font-weight: 700;">${esc(item.utm)}</span><br>` : ''}
          <strong>Data/Hora:</strong> ${esc(dataBR)} às ${esc(item.horario)}<br>
          <strong>Responsável:</strong> ${esc(item.responsavel)}
        </div>
        <div class="calc-result-card">
          <div class="calc-result-header">
            <span class="calc-result-tag">Volume Total da Pilha</span>
            <span class="calc-result-type-badge">${fNum(volDet, 3)} m³</span>
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
                      <td style="padding: 6px 8px; font-weight: 700;">#${esc(t.numero)}</td>
                      <td style="padding: 6px 8px; font-weight: 700; color: var(--ink);">${esc(t.plaqueta)}</td>
                      <td style="padding: 6px 8px; font-style: italic; color: var(--gold);">${esc(t.especie || item.especie || '-')}</td>
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
      detalheHtml += `<div style="background: var(--surface-2); padding: 10px; border-radius: 8px; font-size: 0.85rem; margin-top: 10px;"><strong>Observações:</strong> ${esc(item.observacoes)}</div>`;
    }

    document.getElementById('detalheModalConteudo').innerHTML = detalheHtml;
    this.abrirModal('modalDetalhes');
  }

  async abrirModalExcluir(id) {
    const item = await window.cubagemDB.get(id);
    if (!item) return;

    this.itemToDeleteId = id;
    const esc = (s) => this.escapeHtml(s);
    const vol = window.CubagemCalculator.formatNumber(item.volumeGeometrico, item.tipo === 'tora' ? 3 : 2);
    document.getElementById('excluirItemInfo').innerHTML = `
      Modalidade: <strong>${esc((item.tipo || 'caminhao').toUpperCase())}</strong><br>
      Identificação: <strong>${esc(item.plaqueta || item.identificacao || item.placa || item.id)}</strong><br>
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

    if (tipo === 'hoje') {
      const hojeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      start = hojeStr;
      end = hojeStr;
    } else if (tipo === 'esta-semana') {
      const diaSemana = now.getDay();
      const diffSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;
      const segunda = new Date(now);
      segunda.setDate(now.getDate() + diffSegunda);
      const domingo = new Date(segunda);
      domingo.setDate(segunda.getDate() + 6);
      start = `${segunda.getFullYear()}-${pad(segunda.getMonth() + 1)}-${pad(segunda.getDate())}`;
      end = `${domingo.getFullYear()}-${pad(domingo.getMonth() + 1)}-${pad(domingo.getDate())}`;
    } else if (tipo === 'mes-atual') {
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
    let volEntrada = 0;
    let volSaida = 0;
    let countEntrada = 0;
    let countSaida = 0;

    records.forEach(r => {
      const v = Number(r.volumeGeometrico) || 0;
      if (r.tipo === 'caminhao') {
        volSaida += v;
        countSaida++;
      } else {
        volEntrada += v;
        countEntrada++;
      }
    });

    const fNum = (n, d = 2) => window.CubagemCalculator.formatNumber(n, d);
    const kpiVolEl = document.getElementById('repKpiVolume');
    const kpiCamEl = document.getElementById('repKpiCaminhoes');
    const kpiMedEl = document.getElementById('repKpiMedia');
    const badgeEl = document.getElementById('repPreviewCountBadge');

    if (tipoSelect === 'caminhao') {
      const mediaVol = countSaida > 0 ? volSaida / countSaida : 0;
      if (kpiVolEl) kpiVolEl.innerHTML = `${fNum(volSaida, 2)} <span class="kpi-unit">m³</span>`;
      if (kpiMedEl) kpiMedEl.innerHTML = `${fNum(mediaVol, 2)} <span class="kpi-unit">m³</span>`;
    } else {
      // Para 'todos' ou pilhas/toras, o volume principal é a ENTRADA
      const mediaVol = countEntrada > 0 ? volEntrada / countEntrada : 0;
      if (kpiVolEl) kpiVolEl.innerHTML = `${fNum(volEntrada, 2)} <span class="kpi-unit">m³</span>`;
      if (kpiMedEl) kpiMedEl.innerHTML = `${fNum(mediaVol, 2)} <span class="kpi-unit">m³</span>`;
    }

    if (kpiCamEl) kpiCamEl.textContent = count;
    if (badgeEl) badgeEl.textContent = `${count} registros`;

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
    const isSelectedMode = this.selectedHistoryIds && this.selectedHistoryIds.size > 0;

    if (isSelectedMode) {
      const ids = [...this.selectedHistoryIds];
      records = (await Promise.all(ids.map(id => window.cubagemDB.get(id)))).filter(Boolean);
      records.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    } else if (start && end) {
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
      const finalFileName = fileName && fileName.trim()
        ? fileName
        : (isSelectedMode ? `Planilha_${records.length}_Cubagens_Selecionadas.xlsx` : null);

      const res = await window.CubagemExcelExport.exportWorkbook(records, {
        startDate: isSelectedMode ? (records[0]?.data || start) : start,
        endDate: isSelectedMode ? (records[records.length - 1]?.data || end) : end,
        fileName: finalFileName,
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

  async compartilharBackup() {
    try {
      const backup = await window.cubagemDB.exportBackup();
      const nRecs = backup.totalRecords || (backup.data && backup.data.cubagens.length) || 0;
      if (nRecs === 0) {
        this.showToast('Nenhuma medição encontrada neste aparelho para exportar.', 'warning');
        return;
      }
      const now = new Date().toISOString().slice(0, 10);
      const fileName = `Backup_Cubagem_Florestal_${now}.json`;
      const jsonStr = JSON.stringify(backup, null, 2);

      // Tenta compartilhamento nativo móvel (WhatsApp, Drive, Email, etc.)
      if (navigator.canShare && navigator.share) {
        try {
          const file = new File([jsonStr], fileName, { type: 'application/json' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'Backup Cubagem Florestal',
              text: `Backup com ${nRecs} medições de cubagem florestal (BIOKURI) para abrir no PC.`
            });
            this.showToast(`✓ Backup com ${nRecs} medições compartilhado com sucesso!`, 'success');
            return;
          }
        } catch (shareFileErr) {
          if (shareFileErr.name === 'AbortError') return;
        }
      }

      // Fallback para download direto do arquivo .json
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      this.showToast(`✓ Arquivo de backup (${nRecs} medições) baixado! Envie para seu PC e clique em 'Restaurar Backup' lá.`, 'success', 8000);
    } catch (err) {
      console.error('Erro ao compartilhar backup:', err);
      this.showToast('Erro ao exportar backup.', 'danger');
    }
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

  selecionarArquivoBackup() {
    let inp = document.getElementById('fileInputBackupGlobal');
    if (!inp) {
      inp = document.createElement('input');
      inp.id = 'fileInputBackupGlobal';
      inp.type = 'file';
      inp.accept = '.json';
      inp.style.display = 'none';
      inp.onchange = (e) => this.processarArquivoBackup(e);
      document.body.appendChild(inp);
    }
    inp.click();
  }

  async processarArquivoBackup(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target.result);
        const total = json.totalRecords || (json.data && json.data.cubagens.length) || 0;
        const confirmMerge = confirm(
          `Arquivo de backup detectado com ${total} medições.\n\nDeseja carregar e mesclar essas medições no seu histórico?`
        );
        if (confirmMerge) {
          const res = await window.cubagemDB.importBackup(json, 'merge');
          await this.autoRepararRegistrosZerados();
          await this.atualizarDashboard();
          if (this.currentView === 'historico') {
            await this.carregarHistorico();
          }
          this.showToast(`✓ Sucesso! ${res.importedCount} medições carregadas no seu aparelho!`, 'success', 8000);
          if (this.auth) {
            this.auth.fecharModalAuth();
          }
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
              Plaqueta: ${this.escapeHtml(t.plaqueta)} ${t.especie ? `<span style="font-weight: 400; font-style: italic; color: var(--gold); font-size: 0.78rem;">(${this.escapeHtml(t.especie)})</span>` : ''}
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

  // =========================================================================
  // CUBAGEM DE CAMINHÃO POR TORAS RASTREÁVEIS (POR PLAQUETA)
  // =========================================================================

  setModoCargaCaminhao(modo) {
    this.modoCargaCaminhao = modo;
    const btnGeom = document.getElementById('btnModoCargaCamGeometrica');
    const btnTor = document.getElementById('btnModoCargaCamToras');
    const boxGeom = document.getElementById('containerCargaGeometricaCam');
    const boxTor = document.getElementById('containerCargaTorasCam');

    if (btnGeom) btnGeom.classList.toggle('active', modo === 'geometrica');
    if (btnTor) btnTor.classList.toggle('active', modo === 'toras');

    if (boxGeom) boxGeom.style.display = modo === 'geometrica' ? 'block' : 'none';
    if (boxTor) boxTor.style.display = modo === 'toras' ? 'block' : 'none';

    const typeBadge = document.getElementById('liveTypeBadge');
    if (typeBadge && this.tipoCubagem === 'caminhao') {
      typeBadge.textContent = modo === 'toras' ? 'Retirada (Toras Rastreáveis)' : 'Retirada do Material (Caminhão)';
    }

    if (modo === 'toras') {
      this.renderizarListaTorasCaminhao();
    }

    this.executarCalculoTempoReal();
  }

  obterNumeroViagem() {
    const sel = document.getElementById('cubViagem');
    if (!sel) return 1;
    if (sel.value === 'outra') {
      const inp = document.getElementById('cubViagemOutro');
      const val = parseInt(inp?.value, 10);
      return (Number.isFinite(val) && val > 0) ? val : 1;
    }
    const val = parseInt(sel.value, 10);
    return (Number.isFinite(val) && val > 0) ? val : 1;
  }

  obterViagemTexto() {
    const num = this.obterNumeroViagem();
    return `${num}ª Viagem`;
  }

  definirViagemCaminhao(num) {
    const sel = document.getElementById('cubViagem');
    const inp = document.getElementById('cubViagemOutro');
    if (!sel) return;
    const n = parseInt(num, 10) || 1;
    const opt = sel.querySelector(`option[value="${n}"]`);
    if (opt) {
      sel.value = String(n);
      if (inp) {
        inp.style.display = 'none';
        inp.value = '';
      }
    } else {
      sel.value = 'outra';
      if (inp) {
        inp.style.display = 'inline-block';
        inp.value = n;
      }
    }
  }

  aoMudarViagemCaminhao() {
    const sel = document.getElementById('cubViagem');
    const inp = document.getElementById('cubViagemOutro');
    if (!sel || !inp) return;
    if (sel.value === 'outra') {
      inp.style.display = 'inline-block';
      if (!inp.value) inp.value = '16';
      inp.focus();
    } else {
      inp.style.display = 'none';
    }
  }

  async sugerirProximaViagem() {
    try {
      const records = await window.cubagemDB.getAll(false);
      const hoje = (document.getElementById('cubData')?.value) || new Date().toISOString().slice(0, 10);
      const proj = this.projetoAtivo || '';

      const retiradasHoje = records.filter(r => {
        if ((r.tipo || 'caminhao') !== 'caminhao') return false;
        if (proj && r.projeto && r.projeto !== proj) return false;
        const dataR = (r.data || '').slice(0, 10);
        return !dataR || dataR === hoje;
      });

      let maxViagem = 0;
      retiradasHoje.forEach(r => {
        const num = r.numeroViagem || (r.viagem ? parseInt(String(r.viagem).replace(/\D+/g, ''), 10) : 0);
        if (num > maxViagem) maxViagem = num;
      });

      const prox = maxViagem + 1;
      this.definirViagemCaminhao(prox > 0 ? prox : 1);
    } catch (e) {
      this.definirViagemCaminhao(1);
    }
  }

  compararPlaquetas(q, c) {
    if (!q || !c) return false;
    const s1 = String(q).trim().toLowerCase();
    const s2 = String(c).trim().toLowerCase();
    if (s1 === s2) return true;

    // Normalização numérica retirando zeros à esquerda (ex: '01' === '1' === '001')
    const num1 = s1.replace(/\D/g, '').replace(/^0+/, '') || '0';
    const num2 = s2.replace(/\D/g, '').replace(/^0+/, '') || '0';
    if (num1 && num2 && num1 === num2 && num1 !== '0') return true;

    return false;
  }

  parsePlaquetasInput(inputStr) {
    if (!inputStr) return [];
    // Divide por vírgulas, ponto-e-vírgula ou quebras de linha
    const tokens = inputStr.split(/[,;\n\r]+/).map(s => s.trim()).filter(Boolean);
    const result = [];

    tokens.forEach(tok => {
      // Reconhece intervalos: "01 a 10", "1 até 10", "1 ate 10", "1-10", "01-10"
      const rangeMatch = tok.match(/^(\d+)\s*(?:a|até|ate|-|\.\.)\s*(\d+)$/i);
      if (rangeMatch) {
        const rawStart = rangeMatch[1];
        const rawEnd = rangeMatch[2];
        const start = parseInt(rawStart, 10);
        const end = parseInt(rawEnd, 10);
        if (!isNaN(start) && !isNaN(end)) {
          const min = Math.min(start, end);
          const max = Math.max(start, end);
          const padLen = (rawStart.startsWith('0') || rawEnd.startsWith('0')) ? Math.max(rawStart.length, rawEnd.length) : 0;
          for (let i = min; i <= max; i++) {
            result.push(padLen > 0 ? String(i).padStart(padLen, '0') : String(i));
          }
          return;
        }
      }

      // Se houver números separados por espaço no mesmo token
      const subParts = tok.split(/\s+/).filter(Boolean);
      if (subParts.length > 1) {
        subParts.forEach(sp => result.push(sp));
      } else {
        result.push(tok);
      }
    });

    return [...new Set(result)];
  }

  async obterCatalogoTorasCubadas() {
    const allRecords = await window.cubagemDB.getAll(false);

    // Mapeia toras já despachadas em outros caminhões
    const carregadasMap = new Map();
    allRecords.forEach(rec => {
      if (rec.tipo === 'caminhao' && (rec.modoCarga === 'toras' || (Array.isArray(rec.toras) && rec.toras.length > 0))) {
        if (this.editingRecordId && rec.id === this.editingRecordId) return;
        if (Array.isArray(rec.toras)) {
          rec.toras.forEach(t => {
            if (t && t.plaqueta) {
              const numKey = String(t.plaqueta).trim().replace(/\D/g, '').replace(/^0+/, '') || String(t.plaqueta).trim().toLowerCase();
              carregadasMap.set(numKey, {
                placa: rec.placa || 'Sem Placa',
                data: rec.data || '',
                caminhaoId: rec.id
              });
            }
          });
        }
      }
    });

    const catalogo = [];
    const toraRecords = allRecords.filter(r => r.tipo === 'tora');
    toraRecords.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    toraRecords.forEach(rec => {
      if (Array.isArray(rec.toras) && rec.toras.length > 0) {
        rec.toras.forEach((t, i) => {
          if (!t) return;
          const plaqStr = String(t.plaqueta || '').trim();
          if (!plaqStr) return;
          const numKey = plaqStr.replace(/\D/g, '').replace(/^0+/, '') || plaqStr.toLowerCase();
          const infoCarga = carregadasMap.get(numKey);
          catalogo.push({
            id: `${rec.id}_${i}_${plaqStr}`,
            registroOrigemId: rec.id,
            registroData: rec.data || '',
            plaqueta: plaqStr,
            especie: t.especie || rec.especie || 'Nativa',
            diametroPonta1_cm: Number(t.diametroPonta1_cm) || 0,
            diametroPonta2_cm: Number(t.diametroPonta2_cm) || 0,
            diametroMedio_cm: Number(t.diametroMedio_cm) || ((Number(t.diametroPonta1_cm) + Number(t.diametroPonta2_cm)) / 2) || 0,
            comprimento: Number(t.comprimento) || 0,
            volumeGeometrico: Number(t.volumeGeometrico) || 0,
            statusCarga: infoCarga ? 'carregada' : 'disponivel',
            carregadaEm: infoCarga ? infoCarga.placa : null,
            responsavel: rec.autorNome || rec.responsavel || 'Equipe',
            projeto: rec.projeto || 'BR-153'
          });
        });
      } else if (rec.diametroPonta1_cm || rec.volumeGeometrico || rec.plaqueta) {
        const plaqStr = String(rec.plaqueta || '').trim();
        if (plaqStr) {
          const numKey = plaqStr.replace(/\D/g, '').replace(/^0+/, '') || plaqStr.toLowerCase();
          const infoCarga = carregadasMap.get(numKey);
          catalogo.push({
            id: `${rec.id}_single_${plaqStr}`,
            registroOrigemId: rec.id,
            registroData: rec.data || '',
            plaqueta: plaqStr,
            especie: rec.especie || 'Nativa',
            diametroPonta1_cm: Number(rec.diametroPonta1_cm) || 0,
            diametroPonta2_cm: Number(rec.diametroPonta2_cm) || 0,
            diametroMedio_cm: Number(rec.diametroMedio_cm) || ((Number(rec.diametroPonta1_cm) + Number(rec.diametroPonta2_cm)) / 2) || 0,
            comprimento: Number(rec.comprimento) || 0,
            volumeGeometrico: Number(rec.volumeGeometrico) || 0,
            statusCarga: infoCarga ? 'carregada' : 'disponivel',
            carregadaEm: infoCarga ? infoCarga.placa : null,
            responsavel: rec.autorNome || rec.responsavel || 'Equipe',
            projeto: rec.projeto || 'BR-153'
          });
        }
      }
    });

    this.catalogoTorasCache = catalogo;
    return catalogo;
  }

  async puxarTorasPorPlaquetasDigitadas() {
    const inputEl = document.getElementById('cubCamPlaquetasInput');
    const rawVal = inputEl ? inputEl.value.trim() : '';
    if (!rawVal) {
      this.showToast('Digite as plaquetas das toras a carregar (ex: 01, 05, 09, 17, 45).', 'warning');
      return;
    }

    const plaquetasBuscadas = this.parsePlaquetasInput(rawVal);
    if (plaquetasBuscadas.length === 0) {
      this.showToast('Nenhuma plaqueta válida identificada no texto digitado.', 'warning');
      return;
    }

    await this.obterCatalogoTorasCubadas();
    const catalogo = this.catalogoTorasCache;

    if (catalogo.length === 0) {
      this.showToast('Não há toras cubadas no banco local. Realize primeiro a cubagem de toras no pátio.', 'warning');
      return;
    }

    const adicionadas = [];
    const jaEstavam = [];
    const naoEncontradas = [];

    plaquetasBuscadas.forEach(plaqQuery => {
      const candidatos = catalogo.filter(c => this.compararPlaquetas(plaqQuery, c.plaqueta));
      if (candidatos.length === 0) {
        naoEncontradas.push(plaqQuery);
        return;
      }

      // Prioriza toras disponíveis no pátio
      const tora = candidatos.find(c => c.statusCarga === 'disponivel') || candidatos[0];

      const jaPresente = this.torasCaminhao.some(tc => this.compararPlaquetas(tora.plaqueta, tc.plaqueta));
      if (jaPresente) {
        jaEstavam.push(tora.plaqueta);
        return;
      }

      const itemTora = {
        numero: this.torasCaminhao.length + 1,
        plaqueta: tora.plaqueta,
        especie: tora.especie,
        diametroPonta1_cm: tora.diametroPonta1_cm,
        diametroPonta2_cm: tora.diametroPonta2_cm,
        diametroPonta1_m: tora.diametroPonta1_cm / 100,
        diametroPonta2_m: tora.diametroPonta2_cm / 100,
        diametroMedio_cm: tora.diametroMedio_cm,
        comprimento: tora.comprimento,
        volumeGeometrico: tora.volumeGeometrico,
        origemId: tora.registroOrigemId,
        responsavel: tora.responsavel || 'Equipe',
        projeto: tora.projeto || 'BR-153'
      };

      this.torasCaminhao.push(itemTora);
      adicionadas.push(tora.plaqueta);
    });

    this.torasCaminhao.forEach((t, i) => { t.numero = i + 1; });

    if (inputEl) inputEl.value = '';
    this.renderizarListaTorasCaminhao();
    this.executarCalculoTempoReal();

    const fb = document.getElementById('camToraFeedbackMsg');
    if (fb) {
      let fbHtml = '';
      if (adicionadas.length > 0) {
        fbHtml += `<div style="color: var(--sage); font-weight: 700;">✓ ${adicionadas.length} toras adicionadas à carga: Plaqueta(s) ${adicionadas.join(', ')}</div>`;
      }
      if (jaEstavam.length > 0) {
        fbHtml += `<div style="color: var(--gold); margin-top: 2px;">ℹ️ Já estavam no caminhão: ${jaEstavam.join(', ')}</div>`;
      }
      if (naoEncontradas.length > 0) {
        fbHtml += `<div style="color: var(--danger); margin-top: 2px;">⚠️ Não encontradas no pátio: Plaqueta(s) ${naoEncontradas.join(', ')}</div>`;
      }
      fb.innerHTML = fbHtml;
      fb.style.display = 'block';
    }

    if (adicionadas.length > 0) {
      const fNum = (n, d = 3) => window.CubagemCalculator.formatNumber(n, d);
      const volTotal = this.torasCaminhao.reduce((acc, t) => acc + (t.volumeGeometrico || 0), 0);
      this.showToast(`✓ ${adicionadas.length} toras puxadas com sucesso! Carga atual: ${fNum(volTotal)} m³`, 'success');
    } else if (naoEncontradas.length > 0) {
      this.showToast(`Atenção: plaqueta(s) ${naoEncontradas.join(', ')} não encontradas no banco.`, 'warning');
    }
  }

  renderizarListaTorasCaminhao() {
    const container = document.getElementById('camToraListContainer');
    const headerCounter = document.getElementById('camToraHeaderCounter');
    const countBadge = document.getElementById('camToraCountBadge');
    const sumBox = document.getElementById('camToraTotalSummary');
    const btnLimpar = document.getElementById('btnLimparTorasCam');
    const fNum = (n, d = 2) => window.CubagemCalculator.formatNumber(n, d);

    const totalToras = this.torasCaminhao.length;
    if (headerCounter) headerCounter.textContent = `${totalToras} ${totalToras === 1 ? 'tora' : 'toras'}`;
    if (countBadge) countBadge.textContent = `${totalToras} ${totalToras === 1 ? 'tora' : 'toras'}`;
    if (btnLimpar) btnLimpar.style.display = totalToras > 0 ? 'inline-block' : 'none';

    if (!container) return;

    if (totalToras === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 18px 12px; color: var(--muted); font-size: 0.82rem; background: var(--surface-2); border-radius: 8px; border: 1px dashed var(--line);">
          Nenhuma tora carregada ainda.<br>
          Digite as plaquetas acima e clique em <strong>"🔍 Puxar Toras"</strong> ou toque em <strong>"📋 Escolher da Lista"</strong>.
        </div>
      `;
      if (sumBox) sumBox.style.display = 'none';
      return;
    }

    const lote = window.CubagemCalculator.calculateLoteToras(this.torasCaminhao);
    if (sumBox) {
      sumBox.style.display = 'block';
      const volDisp = document.getElementById('camToraTotalVolDisplay');
      const statsEl = document.getElementById('camToraDmCompStats');
      const espEl = document.getElementById('camToraEspeciesResumo');

      let volNum = (lote && typeof lote.volumeTotal === 'number' && !isNaN(lote.volumeTotal) && lote.volumeTotal > 0)
        ? lote.volumeTotal
        : (lote && typeof lote.volumeGeometrico === 'number' && !isNaN(lote.volumeGeometrico) && lote.volumeGeometrico > 0 ? lote.volumeGeometrico : 0);
      if (volNum <= 0 && Array.isArray(this.torasCaminhao)) {
        volNum = this.torasCaminhao.reduce((acc, t) => acc + (window.CubagemCalculator ? (window.CubagemCalculator.parseNumber(t.volumeGeometrico) || 0) : 0), 0);
      }
      const volStr = window.CubagemCalculator.formatNumber(volNum, 3);
      if (volDisp) volDisp.textContent = `${volStr} m³`;

      const dmVal = (lote && (lote.diametroMedio_cm || lote.diametroMedio)) || 0;
      const compVal = (lote && lote.comprimentoMedio) || 0;
      const dmClean = `${window.CubagemCalculator.formatNumber(dmVal, 1)} cm`;
      const compClean = `${window.CubagemCalculator.formatNumber(compVal, 2)} m`;
      if (statsEl) statsEl.textContent = `Dm Médio: ${dmClean} • Comp. Médio: ${compClean}`;

      const especiesUnicas = [...new Set(this.torasCaminhao.map(t => t.especie).filter(Boolean))];
      if (espEl) {
        espEl.innerHTML = especiesUnicas.length > 0
          ? `<strong>Espécies na Carga:</strong> ${especiesUnicas.map(e => this.escapeHtml(e)).join(', ')}`
          : '<strong>Espécies na Carga:</strong> Madeira Nativa Diversa';
      }
    }

    container.innerHTML = this.torasCaminhao.map((t, idx) => `
      <div class="cam-tora-card">
        <div class="cam-tora-card-left">
          <span class="cam-tora-badge">#${this.escapeHtml(t.plaqueta)}</span>
          <div class="cam-tora-info">
            <div class="cam-tora-especie">${this.escapeHtml(t.especie || 'Não informada')}</div>
            <div class="cam-tora-medidas">
              D: ${fNum(t.diametroPonta1_cm, 1)} × ${fNum(t.diametroPonta2_cm, 1)} cm (Dm: ${fNum(t.diametroMedio_cm, 1)}) • L: ${fNum(t.comprimento, 2)} m${t.responsavel ? ' • Por: ' + this.escapeHtml(t.responsavel) : ''}
            </div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="cam-tora-vol">${fNum(t.volumeGeometrico, 3)} m³</div>
          <button type="button" class="cam-tora-btn-del" onclick="app.removerToraCaminhao(${idx})" title="Remover tora do caminhão">&times;</button>
        </div>
      </div>
    `).join('');
  }

  removerToraCaminhao(index) {
    if (index >= 0 && index < this.torasCaminhao.length) {
      const removida = this.torasCaminhao.splice(index, 1)[0];
      this.torasCaminhao.forEach((t, i) => { t.numero = i + 1; });
      this.renderizarListaTorasCaminhao();
      this.executarCalculoTempoReal();
      this.showToast(`Tora Plaqueta ${removida.plaqueta} removida do caminhão.`, 'warning');
    }
  }

  limparTorasCaminhao() {
    if (this.torasCaminhao.length === 0) return;
    if (confirm('Deseja remover todas as toras carregadas neste caminhão?')) {
      this.torasCaminhao = [];
      this.renderizarListaTorasCaminhao();
      this.executarCalculoTempoReal();
      const fb = document.getElementById('camToraFeedbackMsg');
      if (fb) fb.style.display = 'none';
      this.showToast('Carga de toras do caminhão zerada.', 'info');
    }
  }

  // =========================================================================
  // MODAL: SELEÇÃO VISUAL DE TORAS CUBADAS DO BANCO
  // =========================================================================

  async abrirModalSelecionarTorasBanco() {
    await this.obterCatalogoTorasCubadas();
    if (this.catalogoTorasCache.length === 0) {
      this.showToast('Não há toras cubadas cadastradas no aparelho.', 'warning');
      return;
    }

    this.modalTorasSelecionadas = new Set(this.torasCaminhao.map(t => String(t.plaqueta).trim()));
    this.filtroStatusTorasModal = 'todas';

    const pillTodas = document.getElementById('modalPillTodas');
    const pillDisp = document.getElementById('modalPillDisponiveis');
    const pillCarreg = document.getElementById('modalPillCarregadas');
    if (pillTodas) pillTodas.classList.add('active');
    if (pillDisp) pillDisp.classList.remove('active');
    if (pillCarreg) pillCarreg.classList.remove('active');

    const searchInput = document.getElementById('filtroModalTorasInput');
    if (searchInput) searchInput.value = '';

    this.filtrarTorasModalCarregamento();
    this.abrirModal('modalSelecionarTorasCaminhao');
  }

  setFiltroStatusTorasModal(status) {
    this.filtroStatusTorasModal = status;
    const pillTodas = document.getElementById('modalPillTodas');
    const pillDisp = document.getElementById('modalPillDisponiveis');
    const pillCarreg = document.getElementById('modalPillCarregadas');

    if (pillTodas) pillTodas.classList.toggle('active', status === 'todas');
    if (pillDisp) pillDisp.classList.toggle('active', status === 'disponiveis');
    if (pillCarreg) pillCarreg.classList.toggle('active', status === 'carregadas');

    this.filtrarTorasModalCarregamento();
  }

  filtrarTorasModalCarregamento() {
    const searchInput = document.getElementById('filtroModalTorasInput');
    const term = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const container = document.getElementById('listaTorasModalContainer');
    if (!container) return;

    let items = this.catalogoTorasCache;

    if (this.filtroStatusTorasModal === 'disponiveis') {
      items = items.filter(t => t.statusCarga === 'disponivel');
    } else if (this.filtroStatusTorasModal === 'carregadas') {
      items = items.filter(t => t.statusCarga === 'carregada');
    }

    if (term) {
      items = items.filter(t => {
        const p = String(t.plaqueta).toLowerCase();
        const esp = String(t.especie).toLowerCase();
        const d = String(t.registroData).toLowerCase();
        return p.includes(term) || esp.includes(term) || d.includes(term);
      });
    }

    const fNum = (n, d = 2) => window.CubagemCalculator.formatNumber(n, d);

    if (items.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 24px 12px; color: var(--muted); font-size: 0.85rem;">
          Nenhuma tora encontrada para os filtros aplicados.
        </div>
      `;
      this.atualizarResumoSelecaoModal();
      return;
    }

    container.innerHTML = items.map(t => {
      const plaqStr = String(t.plaqueta).trim();
      const isSelected = this.modalTorasSelecionadas.has(plaqStr);
      const isCarregada = t.statusCarga === 'carregada';

      const tagStatus = isCarregada
        ? `<span class="modal-tora-status-tag status-tag-carregada">🚚 Em ${this.escapeHtml(t.carregadaEm || 'outro caminhão')}</span>`
        : `<span class="modal-tora-status-tag status-tag-disponivel">🟢 No Pátio</span>`;

      return `
        <div class="modal-tora-item ${isSelected ? 'selected' : ''} ${isCarregada ? 'already-loaded' : ''}" onclick="app.toggleSelecaoToraModal('${this.escapeHtml(plaqStr)}')">
          <input type="checkbox" class="modal-tora-checkbox" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation(); app.toggleSelecaoToraModal('${this.escapeHtml(plaqStr)}')">
          <div style="min-width: 0; flex: 1;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span class="cam-tora-badge" style="font-size: 0.78rem;">#${this.escapeHtml(plaqStr)}</span>
              <span style="font-weight: 600; color: var(--ink); font-size: 0.82rem;">${this.escapeHtml(t.especie || 'N/I')}</span>
              ${tagStatus}
            </div>
            <div style="font-size: 0.72rem; color: var(--muted); margin-top: 3px;">
              D: ${fNum(t.diametroPonta1_cm, 1)} × ${fNum(t.diametroPonta2_cm, 1)} cm (Dm: ${fNum(t.diametroMedio_cm, 1)}) • L: ${fNum(t.comprimento, 2)} m • Medição: ${window.CubagemExcelExport.formatDateBR(t.registroData)}${t.responsavel ? ' • Por: ' + this.escapeHtml(t.responsavel) : ''}${t.projeto ? ' (' + this.escapeHtml(t.projeto) + ')' : ''}
            </div>
          </div>
          <div style="text-align: right; font-family: var(--mono); font-weight: 700; color: var(--gold); font-size: 0.88rem; white-space: nowrap;">
            ${fNum(t.volumeGeometrico, 3)} m³
          </div>
        </div>
      `;
    }).join('');

    this.atualizarResumoSelecaoModal();
  }

  toggleSelecaoToraModal(plaqueta) {
    if (!plaqueta) return;
    if (this.modalTorasSelecionadas.has(plaqueta)) {
      this.modalTorasSelecionadas.delete(plaqueta);
    } else {
      this.modalTorasSelecionadas.add(plaqueta);
    }
    this.filtrarTorasModalCarregamento();
  }

  marcarTodasTorasModal(marcar) {
    const searchInput = document.getElementById('filtroModalTorasInput');
    const term = searchInput ? searchInput.value.trim().toLowerCase() : '';

    let items = this.catalogoTorasCache;
    if (this.filtroStatusTorasModal === 'disponiveis') {
      items = items.filter(t => t.statusCarga === 'disponivel');
    } else if (this.filtroStatusTorasModal === 'carregadas') {
      items = items.filter(t => t.statusCarga === 'carregada');
    }
    if (term) {
      items = items.filter(t => {
        const p = String(t.plaqueta).toLowerCase();
        const esp = String(t.especie).toLowerCase();
        return p.includes(term) || esp.includes(term);
      });
    }

    items.forEach(t => {
      const p = String(t.plaqueta).trim();
      if (marcar) {
        this.modalTorasSelecionadas.add(p);
      } else {
        this.modalTorasSelecionadas.delete(p);
      }
    });

    this.filtrarTorasModalCarregamento();
  }

  atualizarResumoSelecaoModal() {
    const resumoEl = document.getElementById('modalTorasResumoSelecao');
    const btnConfirm = document.getElementById('btnConfirmarTorasModal');
    const count = this.modalTorasSelecionadas.size;

    let volTotal = 0;
    this.modalTorasSelecionadas.forEach(p => {
      const t = this.catalogoTorasCache.find(c => this.compararPlaquetas(p, c.plaqueta));
      if (t) {
        const v = Number(t.volumeGeometrico) || Number(t.volumeTotal) || 0;
        volTotal += v;
      }
    });

    const fNum = (n, d = 3) => window.CubagemCalculator.formatNumber(n, d);
    if (resumoEl) {
      resumoEl.textContent = `${count} ${count === 1 ? 'tora selecionada' : 'toras selecionadas'} • ${fNum(volTotal)} m³`;
    }
    if (btnConfirm) {
      btnConfirm.textContent = `Confirmar Seleção (${count} toras • ${fNum(volTotal)} m³)`;
    }
  }

  confirmarSelecaoTorasModal() {
    const selecionadas = Array.from(this.modalTorasSelecionadas);
    const novasToras = [];

    selecionadas.forEach(p => {
      const existing = this.torasCaminhao.find(tc => this.compararPlaquetas(p, tc.plaqueta));
      if (existing) {
        novasToras.push(existing);
      } else {
        const t = this.catalogoTorasCache.find(c => this.compararPlaquetas(p, c.plaqueta));
        if (t) {
          novasToras.push({
            numero: novasToras.length + 1,
            plaqueta: t.plaqueta,
            especie: t.especie,
            diametroPonta1_cm: t.diametroPonta1_cm,
            diametroPonta2_cm: t.diametroPonta2_cm,
            diametroPonta1_m: t.diametroPonta1_cm / 100,
            diametroPonta2_m: t.diametroPonta2_cm / 100,
            diametroMedio_cm: t.diametroMedio_cm,
            comprimento: t.comprimento,
            volumeGeometrico: t.volumeGeometrico,
            origemId: t.registroOrigemId
          });
        }
      }
    });

    novasToras.forEach((t, i) => { t.numero = i + 1; });
    this.torasCaminhao = novasToras;

    this.fecharModal('modalSelecionarTorasCaminhao');
    this.renderizarListaTorasCaminhao();
    this.executarCalculoTempoReal();

    const fNum = (n, d = 3) => window.CubagemCalculator.formatNumber(n, d);
    const vTot = this.torasCaminhao.reduce((acc, t) => acc + (t.volumeGeometrico || 0), 0);
    this.showToast(`✓ Carga do caminhão atualizada com ${this.torasCaminhao.length} toras (${fNum(vTot)} m³).`, 'success');
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

  // =========================================================================
  // GESTÃO DE PROJETOS COMPARTILHADOS EM EQUIPE
  // =========================================================================

  atualizarUIProjeto() {
    const nome = this.projetoAtivo || 'BR-153';
    const headerBtnName = document.getElementById('headerProjectName');
    if (headerBtnName) headerBtnName.textContent = nome;

    const cubProjInput = document.getElementById('cubProjeto');
    if (cubProjInput && !cubProjInput.value) cubProjInput.value = nome;

    const modalDisplay = document.getElementById('modalProjetoNomeDisplay');
    if (modalDisplay) modalDisplay.textContent = nome;

    // Atualiza contagem local e da nuvem de medições do projeto
    this.obterEstatisticasMembrosProjeto(nome).then((statsData) => {
      const infoEl = document.getElementById('modalProjetoInfoLocal');
      if (infoEl) {
        const fNum = (n, d = 3) => (window.CubagemCalculator && typeof window.CubagemCalculator.formatNumber === 'function')
          ? window.CubagemCalculator.formatNumber(n, d)
          : Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
        infoEl.innerHTML = `Medições neste aparelho: <strong>${statsData.totalLocalCount}</strong> • Na Nuvem: <strong style="color: var(--gold);">${statsData.totalGeralCount} medições</strong> (<span style="color: #4ade80; font-weight: 700;">🟢 Entrada: <strong>${fNum(statsData.totalEntradaVolume, 3)} m³</strong></span> • <span style="color: #fbbf24; font-weight: 700;">🚚 Retirada: <strong>${fNum(statsData.totalRetiradaVolume, 3)} m³</strong></span>)`;
      }
    }).catch(() => {});

    // Atualiza dados da aba ativa se o modal estiver aberto
    const modalProj = document.getElementById('modalProjeto');
    if (modalProj && modalProj.classList.contains('open')) {
      if (this.abaProjetoAtiva === 'painel') {
        this.carregarDadosPainelProjeto();
      } else if (this.abaProjetoAtiva === 'integrantes') {
        this.renderizarSecaoMembrosProjeto(nome);
      }
    }

    // Atualiza lista de pastas de projetos vinculados na capa
    this.renderizarProjetosCapa().catch(() => {});
  }

  definirProjetoAtivo(nomeProjeto, sincronizarNuvem = true) {
    const limpo = (nomeProjeto || 'BR-153').trim();
    if (!limpo) return;

    this.projetoAtivo = limpo;
    this.selectedProjectRecordIds.clear();
    try {
      localStorage.setItem('cubagem.projeto_ativo', limpo);
      if (!this.projetosRecentes.includes(limpo)) {
        this.projetosRecentes.unshift(limpo);
        if (this.projetosRecentes.length > 8) this.projetosRecentes.pop();
        localStorage.setItem('cubagem.projetos_recentes', JSON.stringify(this.projetosRecentes));
      }
    } catch (e) {}

    const cubProjInput = document.getElementById('cubProjeto');
    if (cubProjInput) cubProjInput.value = limpo;

    this.atualizarUIProjeto();

    if (sincronizarNuvem && this.auth && typeof this.auth.vincularProjeto === 'function') {
      this.auth.vincularProjeto(limpo);
    }
  }

  sincronizarInputProjetoComApp(valor) {
    const limpo = (valor || '').trim();
    if (limpo && limpo !== this.projetoAtivo) {
      this.definirProjetoAtivo(limpo, true);
      this.showToast(`Projeto ativo alterado para "${limpo}".`, 'info');
    }
  }

  async abrirModalProjeto(nomeProjeto = null, aba = null) {
    if (nomeProjeto) {
      this.definirProjetoAtivo(nomeProjeto, false);
    }
    if (aba) {
      this.abaProjetoAtiva = aba;
    }

    this.atualizarUIProjeto();
    await this.alternarAbaModalProjeto(this.abaProjetoAtiva || 'painel');

    const inputTrocar = document.getElementById('inputTrocarProjeto');
    if (inputTrocar) inputTrocar.value = '';

    const containerRecentes = document.getElementById('containerProjetosRecentes');
    if (containerRecentes) {
      if (!this.projetosRecentes || this.projetosRecentes.length === 0) {
        this.projetosRecentes = ['BR-153', 'Geral'];
      }
      containerRecentes.innerHTML = this.projetosRecentes.map(p => `
        <button type="button" class="recent-project-pill ${p === this.projetoAtivo ? 'active' : ''}" onclick="app.ativarProjetoPill('${this.escapeHtml(p)}')">
          📁 ${this.escapeHtml(p)}
        </button>
      `).join('');
    }

    const badgeStatus = document.getElementById('modalProjetoStatusBadge');
    if (badgeStatus) {
      const isOnline = navigator.onLine;
      const hasUser = this.auth && this.auth.user;
      if (!isOnline) {
        badgeStatus.textContent = 'Modo Offline';
        badgeStatus.style.background = 'rgba(150, 120, 74, 0.2)';
        badgeStatus.style.color = 'var(--gold)';
      } else if (hasUser) {
        badgeStatus.textContent = `Online • ${this.auth.user.displayName || this.auth.user.email.split('@')[0]}`;
        badgeStatus.style.background = 'rgba(74, 150, 90, 0.2)';
        badgeStatus.style.color = '#5cb85c';
      } else {
        badgeStatus.textContent = 'Sem Login (Salvo Localmente)';
        badgeStatus.style.background = 'rgba(150, 120, 74, 0.2)';
        badgeStatus.style.color = 'var(--gold)';
      }
    }

    this.abrirModal('modalProjeto');
  }

  /**
   * Atalho para entrar na pasta do projeto a partir da capa com foco na aba solicitada
   */
  async abrirPastaProjetoCapa(nomeProjeto, aba = 'painel') {
    if (nomeProjeto) {
      this.definirProjetoAtivo(nomeProjeto, true);
    }
    await this.abrirModalProjeto(nomeProjeto, aba);
  }

  /**
   * Alterna entre as abas do Modal de Projeto: Painel & Extração, Integrantes e Trocar Frente
   */
  async alternarAbaModalProjeto(aba = 'painel') {
    this.abaProjetoAtiva = aba;

    const btnPainel = document.getElementById('projTabBtnPainel');
    const btnIntegrantes = document.getElementById('projTabBtnIntegrantes');
    const btnTrocar = document.getElementById('projTabBtnTrocar');

    if (btnPainel) btnPainel.classList.toggle('active', aba === 'painel');
    if (btnIntegrantes) btnIntegrantes.classList.toggle('active', aba === 'integrantes');
    if (btnTrocar) btnTrocar.classList.toggle('active', aba === 'trocar');

    const contentPainel = document.getElementById('projTabContentPainel');
    const contentIntegrantes = document.getElementById('projTabContentIntegrantes');
    const contentTrocar = document.getElementById('projTabContentTrocar');

    if (contentPainel) contentPainel.classList.toggle('active', aba === 'painel');
    if (contentIntegrantes) contentIntegrantes.classList.toggle('active', aba === 'integrantes');
    if (contentTrocar) contentTrocar.classList.toggle('active', aba === 'trocar');

    if (aba === 'painel') {
      await this.carregarDadosPainelProjeto();
    } else if (aba === 'integrantes') {
      await this.renderizarSecaoMembrosProjeto(this.projetoAtivo);
    }
  }

  /**
   * Carrega os dados operacionais, resumo de toras e lista interativa de medições da frente
   */
  async carregarDadosPainelProjeto() {
    const nome = (this.projetoAtivo || 'BR-153').trim();
    const projId = (this.auth && typeof this.auth.normalizarProjetoId === 'function')
      ? this.auth.normalizarProjetoId(nome)
      : String(nome).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');

    let allRecords = [];
    if (window.cubagemDB && typeof window.cubagemDB.getAll === 'function') {
      allRecords = await window.cubagemDB.getAll(false);
    }

    const records = allRecords.filter(r => {
      const rProj = r.projeto || 'BR-153';
      const rId = (this.auth && typeof this.auth.normalizarProjetoId === 'function')
        ? this.auth.normalizarProjetoId(rProj)
        : String(rProj).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      return rId === projId;
    });

    // Se online, integra em tempo real as medições subidas na nuvem pela equipe
    if (navigator.onLine && window.firebase && window.firebase.firestore) {
      try {
        const snap = await window.firebase.firestore().collection('projects').doc(projId).collection('cubagens').get();
        let novosLocais = 0;
        for (const doc of snap.docs) {
          const rec = doc.data();
          if (rec && rec.id && !records.some(r => r.id === rec.id)) {
            records.push(rec);
            if (window.cubagemDB && typeof window.cubagemDB.saveRecord === 'function') {
              try {
                await window.cubagemDB.saveRecord(rec);
                novosLocais++;
              } catch (eSave) {}
            }
          }
        }
        if (novosLocais > 0) {
          console.log(`[PainelProjeto] ${novosLocais} nova(s) medição(ões) da nuvem integradas localmente.`);
        }
      } catch (eCloud) {
        console.warn('[PainelProjeto] Consulta à nuvem falhou, usando base local:', eCloud);
      }
    }

    records.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    this.registrosProjetoCache = records;

    const fNum = (n, d = 2) => window.CubagemCalculator.formatNumber(n, d);

    // Cálculos consolidados da frente
    let volTotalEntrada = 0;
    let torasCubadasCount = 0;
    let retiradasCargasCount = 0;
    let retiradasVolTotal = 0;
    const torasCarregadasPlaquetas = new Set();
    const responsaveisMap = new Map();

    records.forEach(r => {
      const vol = (window.CubagemCalculator && typeof window.CubagemCalculator.obterVolumeEfetivo === 'function')
        ? window.CubagemCalculator.obterVolumeEfetivo(r)
        : (Number(r.volumeGeometrico) || 0);

      const autor = r.autorNome || r.responsavel || 'Lucas Aøsf';
      const statsAutor = responsaveisMap.get(autor) || { vol: 0, count: 0, volEntrada: 0, countEntrada: 0, volRetirada: 0, countRetirada: 0 };
      statsAutor.vol += vol;
      statsAutor.count += 1;

      if (r.tipo === 'caminhao') {
        statsAutor.volRetirada = (statsAutor.volRetirada || 0) + vol;
        statsAutor.countRetirada = (statsAutor.countRetirada || 0) + 1;
        retiradasCargasCount += 1;
        retiradasVolTotal += vol;
        if (Array.isArray(r.toras)) {
          r.toras.forEach(t => {
            if (t.plaqueta) torasCarregadasPlaquetas.add(String(t.plaqueta).trim().toLowerCase());
          });
        }
      } else {
        statsAutor.volEntrada = (statsAutor.volEntrada || 0) + vol;
        statsAutor.countEntrada = (statsAutor.countEntrada || 0) + 1;
        volTotalEntrada += vol;
        if (Array.isArray(r.toras) && r.toras.length > 0) {
          torasCubadasCount += r.toras.length;
        } else {
          torasCubadasCount += 1;
        }
      }
      responsaveisMap.set(autor, statsAutor);
    });

    const torasNoPatioRestante = Math.max(0, torasCubadasCount - torasCarregadasPlaquetas.size);
    const saldoVolumePatio = volTotalEntrada - retiradasVolTotal;

    // Atualiza KPIs
    const kpiVol = document.getElementById('projKpiVolTotal');
    const kpiToras = document.getElementById('projKpiTorasTotal');
    const kpiRetiradas = document.getElementById('projKpiRetiradas');
    const kpiPatio = document.getElementById('projKpiPatioRestante');
    const totalCountEl = document.getElementById('projTotalRecordsCount');

    if (kpiVol) kpiVol.textContent = `${fNum(volTotalEntrada, 3)} m³`;
    if (kpiToras) kpiToras.textContent = `${torasCubadasCount}`;
    if (kpiRetiradas) kpiRetiradas.textContent = `${retiradasCargasCount} (${fNum(retiradasVolTotal, 2)} m³)`;
    if (kpiPatio) kpiPatio.textContent = `${torasNoPatioRestante} (${fNum(saldoVolumePatio, 2)} m³)`;
    if (totalCountEl) totalCountEl.textContent = `${records.length}`;

    // Atualiza Resumo de Contribuição da Equipe com dados da Nuvem
    const equipeEl = document.getElementById('projEquipeResumo');
    if (equipeEl) {
      try {
        const statsData = await this.obterEstatisticasMembrosProjeto(nome);
        const partes = [];
        Object.values(statsData.porMembro).forEach(s => {
          const n = s.membro.nome || (s.membro.email ? s.membro.email.split('@')[0] : 'Integrante');
          const entStr = `<span style="color: #4ade80; font-weight: 700;">🟢 Entrada: <strong>${fNum(s.volEntrada, 2)} m³</strong> (${s.countEntrada} med.)</span>`;
          const retStr = `<span style="color: #fbbf24; font-weight: 700;">🚚 Retirada: <strong>${fNum(s.volRetirada, 2)} m³</strong> (${s.countRetirada} carg.)</span>`;
          partes.push(`<strong>${this.escapeHtml(n)}</strong> (${s.count} ${s.count === 1 ? 'med.' : 'med.'} na nuvem) &mdash; ${entStr} • ${retStr}`);
        });
        if (partes.length === 0) {
          equipeEl.innerHTML = `Nenhuma medição registrada nesta frente ainda. As cubagens e retiradas de todos os integrantes autorizados serão integradas aqui em tempo real.`;
        } else {
          equipeEl.innerHTML = `<strong>☁️ Subido na Nuvem por Integrante:</strong><div style="margin-top: 6px; display: flex; flex-direction: column; gap: 5px;">${partes.map(p => `<div style="font-size: 0.8rem; line-height: 1.4;">• ${p}</div>`).join('')}</div>`;
        }
      } catch (eEquipe) {
        console.warn('[Painel] Erro ao carregar resumo de equipe:', eEquipe);
        if (responsaveisMap.size === 0) {
          equipeEl.innerHTML = `Nenhuma medição registrada nesta frente ainda.`;
        } else {
          const partes = [];
          responsaveisMap.forEach((stats, resp) => {
            const entStr = `<span style="color: #4ade80; font-weight: 700;">🟢 Entrada: <strong>${fNum(stats.volEntrada || 0, 2)} m³</strong> (${stats.countEntrada || 0} med.)</span>`;
            const retStr = `<span style="color: #fbbf24; font-weight: 700;">🚚 Retirada: <strong>${fNum(stats.volRetirada || 0, 2)} m³</strong> (${stats.countRetirada || 0} carg.)</span>`;
            partes.push(`<strong>${this.escapeHtml(resp)}</strong> (${stats.count} med.) &mdash; ${entStr} • ${retStr}`);
          });
          equipeEl.innerHTML = `<strong>👷 Equipe Ativa na Frente:</strong><div style="margin-top: 6px; display: flex; flex-direction: column; gap: 5px;">${partes.map(p => `<div style="font-size: 0.8rem; line-height: 1.4;">• ${p}</div>`).join('')}</div>`;
        }
      }
    }

    // Renderiza Lista de Medições com Checkboxes
    const container = document.getElementById('projListaMedicoesContainer');
    if (container) {
      if (records.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 24px 12px; color: var(--muted); font-size: 0.84rem; background: var(--surface-2); border-radius: 8px; border: 1px dashed var(--line);">
            Nenhuma medição vinculada a esta frente até o momento.<br>
            Crie cubagens de toras ou registre retiradas com caminhão para extrair os relatórios consolidados!
          </div>
        `;
      } else {
        container.innerHTML = records.map(r => {
          const isSelected = this.selectedProjectRecordIds.has(r.id);
          const dataStr = r.data ? window.CubagemExcelExport.formatDateBR(r.data) : (r.dataCriacao ? new Date(r.dataCriacao).toLocaleDateString('pt-BR') : '');
          const autor = r.autorNome || r.responsavel || 'Lucas Aøsf';
          
          let tipoBadge = '🌲 Tora';
          let icone = '🌲';
          let titulo = r.plaqueta ? `Plaqueta #${r.plaqueta}` : (r.identificacao || `Tora #${r.numero || 1}`);

          if (r.tipo === 'caminhao') {
            icone = '🚚';
            tipoBadge = 'Retirada Caminhão';
            titulo = r.placa ? `Caminhão ${r.placa}` : `Caminhão ${r.identificacao || r.id}`;
          } else if (r.tipo === 'pilha') {
            icone = '🪵';
            tipoBadge = 'Pilha';
            const nToras = Array.isArray(r.toras) ? r.toras.length : 1;
            titulo = `${r.identificacao || 'Pilha'} (${nToras} toras)`;
          }

          const volStr = `${fNum(r.volumeGeometrico, 3)} m³`;
          const espStr = r.especie || 'Madeira Nativa Diversa';

          return `
            <div class="proj-medicao-card ${isSelected ? 'selected' : ''}" id="projCard_${this.escapeHtml(r.id)}" onclick="app.toggleSelecaoMedicaoProjeto('${this.escapeHtml(r.id)}', event)">
              <input type="checkbox" class="proj-medicao-checkbox" id="projChk_${this.escapeHtml(r.id)}" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation(); app.toggleSelecaoMedicaoProjeto('${this.escapeHtml(r.id)}', event)">
              <div class="proj-medicao-info">
                <div class="proj-medicao-top">
                  <div class="proj-medicao-title">
                    <span>${icone}</span> <strong>${this.escapeHtml(titulo)}</strong>
                    <span style="font-size: 0.72rem; color: var(--gold); margin-left: 4px;">(${tipoBadge})</span>
                  </div>
                  <div class="proj-medicao-vol">${volStr}</div>
                </div>
                <div class="proj-medicao-sub">
                  ${this.escapeHtml(espStr)} • 📅 ${dataStr} • 👤 ${this.escapeHtml(autor)}
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    const totalRecsEl = document.getElementById('projTotalRecordsCount');
    if (totalRecsEl) totalRecsEl.textContent = records.length;

    this.atualizarContadorSelecaoProjeto();
  }

  toggleSelecaoMedicaoProjeto(id, event) {
    if (this.selectedProjectRecordIds.has(id)) {
      this.selectedProjectRecordIds.delete(id);
    } else {
      this.selectedProjectRecordIds.add(id);
    }

    const card = document.getElementById(`projCard_${id}`);
    const chk = document.getElementById(`projChk_${id}`);
    const isSel = this.selectedProjectRecordIds.has(id);

    if (card) card.classList.toggle('selected', isSel);
    if (chk) chk.checked = isSel;

    this.atualizarContadorSelecaoProjeto();
  }

  selecionarTodasMedicoesProjeto(selecionar = true) {
    const records = this.registrosProjetoCache || [];
    if (selecionar) {
      records.forEach(r => this.selectedProjectRecordIds.add(r.id));
    } else {
      this.selectedProjectRecordIds.clear();
    }

    records.forEach(r => {
      const card = document.getElementById(`projCard_${r.id}`);
      const chk = document.getElementById(`projChk_${r.id}`);
      const isSel = this.selectedProjectRecordIds.has(r.id);
      if (card) card.classList.toggle('selected', isSel);
      if (chk) chk.checked = isSel;
    });

    this.atualizarContadorSelecaoProjeto();
  }

  atualizarContadorSelecaoProjeto() {
    const badge = document.getElementById('projSelCountBadge');
    if (badge) {
      badge.textContent = `${this.selectedProjectRecordIds.size}`;
    }

    const btnExtrairSel = document.getElementById('btnExtrairSelecionadasProj');
    if (btnExtrairSel) {
      btnExtrairSel.style.opacity = this.selectedProjectRecordIds.size > 0 ? '1' : '0.6';
    }
  }

  /**
   * Extrai todos os dados gerais da frente ativa para planilha Excel (.xlsx) consolidada
   */
  async extrairDadosGeraisProjeto() {
    const records = this.registrosProjetoCache || [];
    if (records.length === 0) {
      this.showToast('Nenhuma medição encontrada neste projeto para exportar.', 'warning');
      return;
    }

    const nomeProj = (this.projetoAtivo || 'BR-153').trim();
    const cleanProj = nomeProj.replace(/[^a-zA-Z0-9_-]/g, '_');
    const dataPri = records[records.length - 1]?.data || '';
    const dataUlt = records[0]?.data || '';
    const dateTag = dataPri === dataUlt ? dataPri : `${dataPri}_a_${dataUlt}`;
    const fileName = `Planilha_Geral_Projeto_${cleanProj}_${records.length}_Medicoes_${dateTag || 'completo'}.xlsx`;

    try {
      this.showToast(`📊 Gerando planilha oficial consolidada do projeto ${nomeProj} (${records.length} medições)...`, 'info');

      const resp = (this.auth && this.auth.user)
        ? (this.auth.user.displayName || this.auth.user.email.split('@')[0])
        : 'Lucas Aøsf';

      const res = await window.CubagemExcelExport.exportWorkbook(records, {
        fileName,
        responsavel: resp,
        startDate: dataPri,
        endDate: dataUlt
      });

      this.showToast(`✓ Planilha Geral do projeto ${nomeProj} exportada com sucesso! (${res.recordsCount} medições)`, 'success');
    } catch (err) {
      console.error('Erro ao exportar planilha geral do projeto:', err);
      this.showToast(`Erro ao exportar planilha Excel: ${err.message || err}`, 'danger');
    }
  }

  /**
   * Extrai apenas as medições selecionadas pelo usuário no projeto para Excel (.xlsx)
   */
  async extrairDadosSelecionadosProjeto() {
    if (this.selectedProjectRecordIds.size === 0) {
      this.showToast('Selecione ao menos uma medição na lista abaixo marcando a caixinha.', 'warning');
      const listContainer = document.getElementById('projListaMedicoesContainer');
      if (listContainer) listContainer.focus();
      return;
    }

    const ids = this.selectedProjectRecordIds;
    const records = (this.registrosProjetoCache || []).filter(r => ids.has(r.id));
    if (records.length === 0) {
      this.showToast('Nenhuma medição selecionada válida encontrada.', 'warning');
      return;
    }

    const nomeProj = (this.projetoAtivo || 'BR-153').trim();
    const cleanProj = nomeProj.replace(/[^a-zA-Z0-9_-]/g, '_');
    const dataPri = records[records.length - 1]?.data || '';
    const dataUlt = records[0]?.data || '';
    const dateTag = dataPri === dataUlt ? dataPri : `${dataPri}_a_${dataUlt}`;
    const fileName = `Planilha_${cleanProj}_${records.length}_Medicoes_Selecionadas_${dateTag || 'export'}.xlsx`;

    try {
      this.showToast(`📑 Exportando ${records.length} medições selecionadas do projeto ${nomeProj}...`, 'info');

      const resp = (this.auth && this.auth.user)
        ? (this.auth.user.displayName || this.auth.user.email.split('@')[0])
        : 'Lucas Aøsf';

      const res = await window.CubagemExcelExport.exportWorkbook(records, {
        fileName,
        responsavel: resp,
        startDate: dataPri,
        endDate: dataUlt
      });

      this.showToast(`✓ Planilha com ${res.recordsCount} medições selecionadas baixada com sucesso!`, 'success');
    } catch (err) {
      console.error('Erro ao exportar selecionadas do projeto:', err);
      this.showToast(`Erro ao exportar planilha Excel: ${err.message || err}`, 'danger');
    }
  }

  /**
   * Abre a prévia em tela cheia do ExcelJS das medições (selecionadas ou gerais)
   */
  preverDadosProjeto() {
    let records = [];
    if (this.selectedProjectRecordIds.size > 0) {
      const ids = this.selectedProjectRecordIds;
      records = (this.registrosProjetoCache || []).filter(r => ids.has(r.id));
    } else {
      records = this.registrosProjetoCache || [];
    }

    if (records.length === 0) {
      this.showToast('Nenhuma medição disponível para visualização neste projeto.', 'warning');
      return;
    }

    this.fecharModal('modalProjeto');
    this.mostrarPreviaPlanilha(records);
  }

  /**
   * Abre o modal para selecionar e atribuir cubagens que foram feitas sem projeto (ou em outras frentes)
   */
  async abrirModalVincularCubagensProjeto() {
    const nomeProj = (this.projetoAtivo || 'BR-153').trim();
    const destEl = document.getElementById('vincularDestinoNome');
    if (destEl) destEl.textContent = nomeProj;

    this.selectedVincularIds.clear();

    const projIdAtivo = (this.auth && typeof this.auth.normalizarProjetoId === 'function')
      ? this.auth.normalizarProjetoId(nomeProj)
      : String(nomeProj).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');

    let allRecords = [];
    if (window.cubagemDB && typeof window.cubagemDB.getAll === 'function') {
      allRecords = await window.cubagemDB.getAll(false);
    }

    // Filtra cubagens que NÃO pertencem ao projeto ativo (sem projeto ou de outro projeto)
    const foraDoProjeto = allRecords.filter(r => {
      const rProj = r.projeto || '';
      const rId = (this.auth && typeof this.auth.normalizarProjetoId === 'function')
        ? this.auth.normalizarProjetoId(rProj)
        : String(rProj).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      return rId !== projIdAtivo;
    });

    foraDoProjeto.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    this.vincularRecordsCache = foraDoProjeto;

    if (foraDoProjeto.length === 0) {
      this.showToast(`Todas as medições cadastradas no aparelho já estão vinculadas ao projeto "${nomeProj}".`, 'info');
      return;
    }

    const filtroInput = document.getElementById('filtroVincularInput');
    if (filtroInput) filtroInput.value = '';

    this.renderizarListaVincularCubagens();
    this.abrirModal('modalVincularCubagensProjeto');
  }

  /**
   * Renderiza a lista de cubagens disponíveis fora do projeto para vinculação
   */
  renderizarListaVincularCubagens() {
    const container = document.getElementById('listaVincularContainer');
    const totalCountEl = document.getElementById('vincularTotalCount');
    const filtroInput = document.getElementById('filtroVincularInput');
    const term = filtroInput ? filtroInput.value.trim().toLowerCase() : '';

    if (!container) return;

    let items = this.vincularRecordsCache || [];
    if (term) {
      items = items.filter(r => {
        const p = String(r.plaqueta || '').toLowerCase();
        const pl = String(r.placa || '').toLowerCase();
        const id = String(r.identificacao || '').toLowerCase();
        const esp = String(r.especie || '').toLowerCase();
        const aut = String(r.autorNome || r.responsavel || '').toLowerCase();
        return p.includes(term) || pl.includes(term) || id.includes(term) || esp.includes(term) || aut.includes(term);
      });
    }

    if (totalCountEl) totalCountEl.textContent = `${items.length}`;

    const fNum = (n, d = 2) => window.CubagemCalculator.formatNumber(n, d);

    if (items.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 24px 12px; color: var(--muted); font-size: 0.84rem; background: var(--surface-2); border-radius: 8px; border: 1px dashed var(--line);">
          Nenhuma cubagem encontrada para os filtros aplicados.
        </div>
      `;
      this.atualizarContadorSelecaoVincular();
      return;
    }

    container.innerHTML = items.map(r => {
      const isSelected = this.selectedVincularIds.has(r.id);
      const dataStr = r.data ? window.CubagemExcelExport.formatDateBR(r.data) : (r.dataCriacao ? new Date(r.dataCriacao).toLocaleDateString('pt-BR') : '');
      const autor = r.autorNome || r.responsavel || 'Lucas Aøsf';
      const projOrigem = r.projeto ? `Projeto: ${r.projeto}` : 'Sem Projeto Atribuído';
      
      let tipoBadge = '🌲 Tora';
      let icone = '🌲';
      let titulo = r.plaqueta ? `Plaqueta #${r.plaqueta}` : (r.identificacao || `Tora #${r.numero || 1}`);

      if (r.tipo === 'caminhao') {
        icone = '🚚';
        tipoBadge = 'Retirada Caminhão';
        titulo = r.placa ? `Caminhão ${r.placa}` : `Caminhão ${r.identificacao || r.id}`;
      } else if (r.tipo === 'pilha') {
        icone = '🪵';
        tipoBadge = 'Pilha';
        const nToras = Array.isArray(r.toras) ? r.toras.length : 1;
        titulo = `${r.identificacao || 'Pilha'} (${nToras} toras)`;
      }

      const volStr = `${fNum(r.volumeGeometrico, 3)} m³`;

      return `
        <div class="proj-medicao-card ${isSelected ? 'selected' : ''}" id="vincCard_${this.escapeHtml(r.id)}" onclick="app.toggleSelecaoVincular('${this.escapeHtml(r.id)}', event)">
          <input type="checkbox" class="proj-medicao-checkbox" id="vincChk_${this.escapeHtml(r.id)}" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation(); app.toggleSelecaoVincular('${this.escapeHtml(r.id)}', event)">
          <div class="proj-medicao-info">
            <div class="proj-medicao-top">
              <div class="proj-medicao-title">
                <span>${icone}</span> <strong>${this.escapeHtml(titulo)}</strong>
                <span style="font-size: 0.72rem; color: var(--gold); margin-left: 4px;">(${tipoBadge})</span>
              </div>
              <div class="proj-medicao-vol">${volStr}</div>
            </div>
            <div class="proj-medicao-sub">
              <strong style="color: var(--gold);">${this.escapeHtml(projOrigem)}</strong> • 📅 ${dataStr} • 👤 ${this.escapeHtml(autor)}
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.atualizarContadorSelecaoVincular();
  }

  filtrarListaVincularCubagens() {
    this.renderizarListaVincularCubagens();
  }

  toggleSelecaoVincular(id, event) {
    if (this.selectedVincularIds.has(id)) {
      this.selectedVincularIds.delete(id);
    } else {
      this.selectedVincularIds.add(id);
    }

    const card = document.getElementById(`vincCard_${id}`);
    const chk = document.getElementById(`vincChk_${id}`);
    const isSel = this.selectedVincularIds.has(id);

    if (card) card.classList.toggle('selected', isSel);
    if (chk) chk.checked = isSel;

    this.atualizarContadorSelecaoVincular();
  }

  selecionarTodasVincular(selecionar = true) {
    const items = this.vincularRecordsCache || [];
    if (selecionar) {
      items.forEach(r => this.selectedVincularIds.add(r.id));
    } else {
      this.selectedVincularIds.clear();
    }

    items.forEach(r => {
      const card = document.getElementById(`vincCard_${r.id}`);
      const chk = document.getElementById(`vincChk_${r.id}`);
      const isSel = this.selectedVincularIds.has(r.id);
      if (card) card.classList.toggle('selected', isSel);
      if (chk) chk.checked = isSel;
    });

    this.atualizarContadorSelecaoVincular();
  }

  atualizarContadorSelecaoVincular() {
    const badge = document.getElementById('vincularSelBadge');
    if (badge) {
      badge.textContent = `${this.selectedVincularIds.size}`;
    }

    const btnConf = document.getElementById('btnConfirmarVinculacaoProj');
    if (btnConf) {
      btnConf.style.opacity = this.selectedVincularIds.size > 0 ? '1' : '0.6';
    }
  }

  async confirmarVinculacaoCubagensProjeto() {
    if (this.selectedVincularIds.size === 0) {
      this.showToast('Selecione ao menos uma cubagem para atribuir a este projeto.', 'warning');
      return;
    }

    const nomeProj = (this.projetoAtivo || 'BR-153').trim();
    const ids = [...this.selectedVincularIds];
    const btn = document.getElementById('btnConfirmarVinculacaoProj');
    if (btn) btn.disabled = true;

    try {
      let count = 0;
      for (const id of ids) {
        const rec = await window.cubagemDB.get(id);
        if (rec) {
          rec.projeto = nomeProj;
          rec.updatedAt = Date.now();
          await window.cubagemDB.update(rec);
          if (this.auth && typeof this.auth.syncRecordToCloud === 'function') {
            await this.auth.syncRecordToCloud(rec);
          }
          count++;
        }
      }

      this.fecharModal('modalVincularCubagensProjeto');
      this.showToast(`✓ ${count} ${count === 1 ? 'cubagem atribuída' : 'cubagens atribuídas'} com sucesso ao projeto "${nomeProj}"!`, 'success');

      // Atualiza o painel do projeto aberto
      await this.carregarDadosPainelProjeto();
      this.atualizarUIProjeto();
    } catch (err) {
      console.error('Erro ao vincular cubagens:', err);
      this.showToast(`Erro ao atribuir cubagens: ${err.message || err}`, 'danger');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async atribuirSelecionadasAoProjetoModal() {
    if (this.selectedHistoryIds.size === 0) {
      this.showToast('Selecione ao menos uma cubagem no histórico marcando a caixinha.', 'warning');
      return;
    }

    const nomeProj = (this.projetoAtivo || 'BR-153').trim();
    const qtd = this.selectedHistoryIds.size;

    if (!confirm(`Deseja atribuir as ${qtd} medições selecionadas ao projeto "${nomeProj}"?`)) {
      return;
    }

    try {
      let count = 0;
      for (const id of this.selectedHistoryIds) {
        const rec = await window.cubagemDB.get(id);
        if (rec) {
          rec.projeto = nomeProj;
          rec.updatedAt = Date.now();
          await window.cubagemDB.update(rec);
          if (this.auth && typeof this.auth.syncRecordToCloud === 'function') {
            await this.auth.syncRecordToCloud(rec);
          }
          count++;
        }
      }

      this.showToast(`✓ ${count} medições atribuídas ao projeto "${nomeProj}" com sucesso!`, 'success');
      this.desmarcarTodasHistorico();
      await this.carregarHistorico();
      this.atualizarUIProjeto();
    } catch (err) {
      console.error('Erro ao atribuir selecionadas ao projeto:', err);
      this.showToast(`Erro ao atribuir ao projeto: ${err.message || err}`, 'danger');
    }
  }

  /**
   * Obtém a lista de nomes de todos os projetos vinculados à conta do usuário
   */
  async obterProjetosVinculadosUsuario() {
    const nomesProjetos = new Set();

    // 1. Projeto Ativo e Padrões
    if (this.projetoAtivo) {
      nomesProjetos.add(this.projetoAtivo.trim());
    }
    nomesProjetos.add('BR-153');

    // 2. Projetos recentes em memória/localStorage
    if (Array.isArray(this.projetosRecentes)) {
      this.projetosRecentes.forEach(p => {
        if (p && typeof p === 'string' && p.trim()) nomesProjetos.add(p.trim());
      });
    }

    // 3. Local IndexedDB: vasculha todos os registros locais por projetos distintos
    if (window.cubagemDB && typeof window.cubagemDB.getAll === 'function') {
      try {
        const allRecords = await window.cubagemDB.getAll(false);
        allRecords.forEach(r => {
          if (r.projeto && typeof r.projeto === 'string' && r.projeto.trim()) {
            nomesProjetos.add(r.projeto.trim());
          }
        });
      } catch (eDb) {
        console.warn('[Projetos] Erro ao ler projetos do IndexedDB:', eDb);
      }
    }

    // 4. Metadados de projetos locais (localStorage)
    if (this.auth && typeof this.auth.getProjetosMetaLocal === 'function') {
      try {
        const metas = this.auth.getProjetosMetaLocal();
        Object.keys(metas).forEach(k => {
          const m = metas[k];
          if (m && m.nome && typeof m.nome === 'string' && m.nome.trim()) {
            nomesProjetos.add(m.nome.trim());
          } else if (k && typeof k === 'string' && k.trim()) {
            nomesProjetos.add(k.trim());
          }
        });
      } catch (eMeta) {}
    }

    // 5. Nuvem Firestore: lista projetos onde o usuário é criador ou membro autorizado
    if (navigator.onLine && window.firebase && window.firebase.firestore) {
      try {
        const user = this.auth?.user;
        const userEmail = (user?.email || '').trim().toLowerCase();
        const userUid = (user?.uid || '').trim();

        const snap = await window.firebase.firestore().collection('projects').get();
        snap.forEach(doc => {
          const data = doc.data();
          if (!data) return;
          const pNome = (data.nome || doc.id || '').trim();
          if (!pNome) return;

          if (!userEmail) {
            nomesProjetos.add(pNome);
          } else {
            const criadorEmail = (data.criadorEmail || '').trim().toLowerCase();
            const criadorUid = (data.criadorUid || '').trim();
            let isVinculado = (criadorEmail === userEmail || (criadorUid && criadorUid === userUid));

            if (!isVinculado && Array.isArray(data.membros)) {
              isVinculado = data.membros.some(m => {
                const mEmail = (m.email || '').trim().toLowerCase();
                const mUid = (m.uid || '').trim();
                return (mEmail && mEmail === userEmail) || (mUid && mUid === userUid);
              });
            }

            if (isVinculado) {
              nomesProjetos.add(pNome);
            }
          }
        });
      } catch (eCloud) {
        console.warn('[Projetos] Erro ao buscar projetos vinculados no Firestore:', eCloud);
      }
    }

    // Retorna lista com o projeto ativo sempre no topo, seguido dos demais ordenados
    const arr = Array.from(nomesProjetos).filter(Boolean);
    const ativo = (this.projetoAtivo || 'BR-153').trim();
    arr.sort((a, b) => {
      if (a.toLowerCase() === ativo.toLowerCase()) return -1;
      if (b.toLowerCase() === ativo.toLowerCase()) return 1;
      return a.localeCompare(b, 'pt-BR');
    });

    return arr;
  }

  /**
   * Renderiza a lista de pastas e projetos vinculados à conta do usuário na tela inicial (capa)
   */
  async renderizarProjetosCapa() {
    const container = document.getElementById('coverProjetosListContainer');
    if (!container) return;

    try {
      const projetos = await this.obterProjetosVinculadosUsuario();
      if (!projetos || projetos.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 14px; font-size: 0.82rem; color: var(--muted); background: var(--surface-2); border-radius: 10px; border: 1px dashed var(--line);">
            Nenhuma pasta de projeto vinculada no momento.<br>
            Toque em <strong>➕ Nova Frente</strong> acima para criar ou ativar.
          </div>
        `;
        return;
      }

      const fNum = (n, d = 2) => (window.CubagemCalculator && typeof window.CubagemCalculator.formatNumber === 'function')
        ? window.CubagemCalculator.formatNumber(n, d)
        : Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

      const cardsHtml = [];
      for (const pNome of projetos) {
        const statsData = await this.obterEstatisticasMembrosProjeto(pNome);
        const meta = statsData.meta || {};
        const isAtivo = (pNome.trim().toLowerCase() === (this.projetoAtivo || 'BR-153').trim().toLowerCase());
        const criadorNome = meta.criadorNome || (meta.criadorEmail ? meta.criadorEmail.split('@')[0] : 'Lucas Aøsf');
        const totalMembros = Array.isArray(statsData.membros) && statsData.membros.length > 0 ? statsData.membros.length : 1;

        cardsHtml.push(`
          <div class="cover-project-card ${isAtivo ? 'active-project' : ''}" onclick="app.abrirPastaProjetoCapa('${this.escapeHtml(pNome)}', 'painel')">
            <div class="cover-project-card-top">
              <div class="cover-project-card-title-wrap">
                <span class="cover-project-folder-icon">📁</span>
                <div style="min-width: 0; flex: 1;">
                  <h4 class="cover-project-card-title">${this.escapeHtml(pNome)}</h4>
                  <div class="cover-project-card-owner">
                    👑 Criador: <strong>${this.escapeHtml(criadorNome)}</strong>
                  </div>
                </div>
              </div>
              <div>
                ${isAtivo
                  ? '<span class="badge-frente-ativa">⚡ Frente Ativa</span>'
                  : '<span class="badge-abrir-frente">Entrar ➔</span>'}
              </div>
            </div>

            <div class="cover-project-card-stats">
              <div class="cover-proj-stat-pill">
                <span class="stat-ico">☁️</span>
                <span class="stat-txt"><strong>${statsData.totalGeralCount}</strong> ${statsData.totalGeralCount === 1 ? 'med.' : 'med.'}</span>
              </div>
              <div class="cover-proj-stat-pill stat-entrada">
                <span class="stat-ico">🟢</span>
                <span class="stat-txt">Entrada: <strong>${fNum(statsData.totalEntradaVolume, 2)} m³</strong></span>
              </div>
              <div class="cover-proj-stat-pill stat-retirada">
                <span class="stat-ico">🚚</span>
                <span class="stat-txt">Retirada: <strong>${fNum(statsData.totalRetiradaVolume, 2)} m³</strong></span>
              </div>
              <div class="cover-proj-stat-pill">
                <span class="stat-ico">👥</span>
                <span class="stat-txt"><strong>${totalMembros}</strong> ${totalMembros === 1 ? 'integrante' : 'integrantes'}</span>
              </div>
            </div>

            <div class="cover-project-card-actions" onclick="event.stopPropagation()">
              <button type="button" class="btn-card-proj-open" onclick="app.abrirPastaProjetoCapa('${this.escapeHtml(pNome)}', 'painel')" title="Ver todas as medições desta frente e baixar planilha Excel selecionando as medições">
                <span>📊</span> Medições &amp; Planilha
              </button>
              <button type="button" class="btn-card-proj-members" onclick="app.abrirPastaProjetoCapa('${this.escapeHtml(pNome)}', 'integrantes')" title="Ver integrantes da equipe e métricas de cada um">
                <span>👥</span> Integrantes (${totalMembros})
              </button>
            </div>
          </div>
        `);
      }

      container.innerHTML = cardsHtml.join('');
    } catch (err) {
      console.warn('[CapaProjetos] Erro ao renderizar pastas de projetos:', err);
      container.innerHTML = `
        <div style="text-align: center; padding: 10px; font-size: 0.8rem; color: var(--muted);">
          Toque em 📁 <strong>${this.escapeHtml(this.projetoAtivo || 'BR-153')}</strong> no topo para gerenciar medições e equipe.
        </div>
      `;
    }
  }

  /**
   * Consolida métricas de medições e volume em m³ subidos na nuvem por cada integrante do projeto
   */
  async obterEstatisticasMembrosProjeto(nomeProjeto) {
    const nome = (nomeProjeto || this.projetoAtivo || 'BR-153').trim();
    const projId = (this.auth && typeof this.auth.normalizarProjetoId === 'function')
      ? this.auth.normalizarProjetoId(nome)
      : String(nome).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');

    let meta = null;
    if (this.auth && typeof this.auth.obterMetaProjeto === 'function') {
      meta = await this.auth.obterMetaProjeto(nome);
    }
    if (!meta) {
      meta = {
        id: projId,
        nome: nome,
        criadorNome: 'Lucas Aøsf',
        criadorEmail: 'lucasaosf@gmail.com',
        membros: [{ nome: 'Lucas Aøsf', email: 'lucasaosf@gmail.com', role: 'criador' }]
      };
    }

    const membros = Array.isArray(meta.membros) ? [...meta.membros] : [];
    const criadorEmail = (meta.criadorEmail || 'lucasaosf@gmail.com').trim().toLowerCase();
    if (!membros.some(m => (m.email || '').trim().toLowerCase() === criadorEmail)) {
      membros.unshift({
        nome: meta.criadorNome || 'Lucas Aøsf',
        email: meta.criadorEmail || 'lucasaosf@gmail.com',
        role: 'criador'
      });
    }

    // Coleta registros vinculados a esta frente (IndexedDB local + Firestore se online)
    const recordsMap = new Map();
    let totalLocalCount = 0;

    if (window.cubagemDB && typeof window.cubagemDB.getAll === 'function') {
      try {
        const localAll = await window.cubagemDB.getAll(false);
        localAll.forEach(r => {
          const rProj = r.projeto || 'BR-153';
          const rId = (this.auth && typeof this.auth.normalizarProjetoId === 'function')
            ? this.auth.normalizarProjetoId(rProj)
            : String(rProj).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
          if (rId === projId && r.id) {
            recordsMap.set(r.id, r);
            totalLocalCount++;
          }
        });
      } catch (eLocal) {}
    }

    // Busca registros sincronizados na nuvem Firestore para ter números em tempo real da equipe
    if (navigator.onLine && window.firebase && window.firebase.firestore) {
      try {
        const snap = await window.firebase.firestore().collection('projects').doc(projId).collection('cubagens').get();
        snap.forEach(doc => {
          const d = doc.data();
          if (d && d.id) {
            recordsMap.set(d.id, d);
          }
        });
      } catch (eCloud) {
        console.warn('[Stats] Nuvem indisponível para contagem, usando base local:', eCloud);
      }
    }

    const porMembro = {};
    membros.forEach(m => {
      const emailChave = (m.email || m.nome || '').trim().toLowerCase();
      porMembro[emailChave] = {
        membro: m,
        count: 0,
        volume: 0,
        countEntrada: 0,
        volEntrada: 0,
        countRetirada: 0,
        volRetirada: 0,
        saldoVol: 0
      };
    });

    let totalGeralCount = 0;
    let totalGeralVolume = 0;
    let totalEntradaCount = 0;
    let totalEntradaVolume = 0;
    let totalRetiradaCount = 0;
    let totalRetiradaVolume = 0;

    recordsMap.forEach(r => {
      let vol = 0;
      if (window.CubagemCalculator && typeof window.CubagemCalculator.obterVolumeEfetivo === 'function') {
        vol = window.CubagemCalculator.obterVolumeEfetivo(r);
      } else {
        vol = Number(r.volumeTotal || r.volumeGeometrico || 0);
      }
      if (isNaN(vol) || vol < 0) vol = 0;

      const isRetirada = (r.tipo === 'caminhao');

      const rEmail = (r.autorEmail || '').trim().toLowerCase();
      const rNome = (r.autorNome || r.responsavel || '').trim().toLowerCase();
      const rUid = r.autorUid || '';

      // Tenta encontrar o integrante que realizou a medição
      let matched = membros.find(m => {
        const mEmail = (m.email || '').trim().toLowerCase();
        const mNome = (m.nome || '').trim().toLowerCase();
        return (mEmail && rEmail && mEmail === rEmail) ||
               (mNome && rNome && mNome === rNome) ||
               (m.uid && rUid && m.uid === rUid);
      });

      if (!matched) {
        // Se sem autor ou legado, atribui ao criador oficial da frente
        matched = membros.find(m => m.role === 'criador' || (m.email && m.email.toLowerCase() === criadorEmail));
      }

      if (matched) {
        const chave = (matched.email || matched.nome || '').trim().toLowerCase();
        if (!porMembro[chave]) {
          porMembro[chave] = {
            membro: matched,
            count: 0,
            volume: 0,
            countEntrada: 0,
            volEntrada: 0,
            countRetirada: 0,
            volRetirada: 0,
            saldoVol: 0
          };
        }
        porMembro[chave].count += 1;
        porMembro[chave].volume += vol;
        if (isRetirada) {
          porMembro[chave].countRetirada += 1;
          porMembro[chave].volRetirada += vol;
        } else {
          porMembro[chave].countEntrada += 1;
          porMembro[chave].volEntrada += vol;
        }
        porMembro[chave].saldoVol = porMembro[chave].volEntrada - porMembro[chave].volRetirada;
      }

      totalGeralCount += 1;
      totalGeralVolume += vol;
      if (isRetirada) {
        totalRetiradaCount += 1;
        totalRetiradaVolume += vol;
      } else {
        totalEntradaCount += 1;
        totalEntradaVolume += vol;
      }
    });

    return {
      meta,
      membros,
      porMembro,
      totalLocalCount,
      totalGeralCount,
      totalGeralVolume,
      totalEntradaCount,
      totalEntradaVolume,
      totalRetiradaCount,
      totalRetiradaVolume,
      saldoGeralVolume: (totalEntradaVolume - totalRetiradaVolume)
    };
  }

  /**
   * Renderiza a seção de membros com regras estritas e exibe as medições e m³ de cada um
   */
  async renderizarSecaoMembrosProjeto(nomeProjeto) {
    const container = document.getElementById('containerSecaoMembrosProjeto');
    if (!container) return;

    const nome = (nomeProjeto || this.projetoAtivo || 'BR-153').trim();
    const statsData = await this.obterEstatisticasMembrosProjeto(nome);
    const meta = statsData.meta;
    const membros = statsData.membros;

    const isCriador = this.auth ? this.auth.isUsuarioCriador(meta) : true;
    const isLogado = !!(this.auth && this.auth.user);

    const fNum = (n, d = 3) => (window.CubagemCalculator && typeof window.CubagemCalculator.formatNumber === 'function')
      ? window.CubagemCalculator.formatNumber(n, d)
      : Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

    // Atualiza badge de papel no cabeçalho do modal
    const roleBadge = document.getElementById('modalProjetoRoleBadge');
    if (roleBadge) {
      if (isCriador) {
        roleBadge.className = 'badge-role-criador';
        roleBadge.textContent = '👑 Você é o Criador';
      } else if (isLogado) {
        roleBadge.className = 'badge-role-membro';
        roleBadge.textContent = '✓ Integrante Autorizado';
      } else {
        roleBadge.className = 'badge-role-criador';
        roleBadge.textContent = 'Modo Local';
      }
    }

    // Atualiza info do criador oficial
    const criadorInfoEl = document.getElementById('modalProjetoCriadorInfo');
    if (criadorInfoEl) {
      const criadorNome = meta.criadorNome || 'Lucas Aøsf';
      const criadorEmail = meta.criadorEmail || 'lucasaosf@gmail.com';
      criadorInfoEl.innerHTML = `👑 Criador Oficial: <strong>${this.escapeHtml(criadorNome)}</strong> <span style="color: var(--muted); font-size: 0.74rem;">(${this.escapeHtml(criadorEmail)})</span>`;
    }

    // Constrói lista visual dos integrantes com medições e m³ subidos na nuvem
    let membrosHtml = '';
    if (membros.length === 0) {
      membrosHtml = `<div style="text-align: center; color: var(--muted); font-size: 0.8rem; padding: 12px;">Nenhum integrante cadastrado nesta frente.</div>`;
    } else {
      membrosHtml = membros.map(m => {
        const nomeMembro = m.nome || (m.email ? m.email.split('@')[0] : 'Integrante');
        const isOwner = m.role === 'criador';
        const inicial = (nomeMembro || 'U').charAt(0).toUpperCase();
        const mKey = (m.email || m.nome || '').trim().toLowerCase();
        const stats = (statsData.porMembro && statsData.porMembro[mKey]) || {
          count: 0,
          volume: 0,
          countEntrada: 0,
          volEntrada: 0,
          countRetirada: 0,
          volRetirada: 0,
          saldoVol: 0
        };
        const volFmt = fNum(stats.volume, 3);
        const entFmt = fNum(stats.volEntrada, 3);
        const retFmt = fNum(stats.volRetirada, 3);

        return `
          <div class="project-member-row" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: var(--surface-2); border: 1px solid var(--line); border-radius: 8px; margin-bottom: 8px; gap: 10px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 170px;">
              <div class="project-member-avatar" style="width: 40px; height: 40px; border-radius: 50%; background: #14351B; border: 1.5px solid var(--gold); display: grid; place-items: center; font-weight: 700; color: var(--gold); font-size: 1rem; flex-shrink: 0;">${inicial}</div>
              <div class="project-member-details" style="flex: 1; min-width: 0;">
                <div class="project-member-name" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                  <strong style="color: var(--ink); font-size: 0.95rem;">${this.escapeHtml(nomeMembro)}</strong>
                  ${isOwner ? '<span class="badge-tag-owner" style="background: rgba(178, 143, 89, 0.2); color: var(--gold); padding: 1px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 600;">👑 Criador</span>' : '<span class="badge-tag-member" style="background: rgba(85, 124, 99, 0.2); color: var(--sage); padding: 1px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 600;">✓ Integrante</span>'}
                </div>
                <div class="project-member-email" style="font-size: 0.76rem; color: var(--muted); margin-top: 2px;">${this.escapeHtml(m.email || '')}</div>
              </div>
            </div>

            <!-- Valores ao lado do Integrante: Total Nuvem, Total Entrada e Total Retirada -->
            <div class="project-member-metrics">
              <div style="display: inline-flex; align-items: center; gap: 6px; font-size: 0.78rem;">
                <span style="color: var(--muted); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.3px; font-weight: 600;">Na Nuvem:</span>
                <span style="color: var(--gold); font-weight: 700;">☁️ <strong>${stats.count}</strong> ${stats.count === 1 ? 'medição' : 'medições'}</span>
                <span style="color: var(--line);">•</span>
                <span style="color: var(--ink); font-weight: 600;">${volFmt} m³</span>
              </div>
              <div class="project-member-metrics-pills">
                <!-- Valor Total de Entrada -->
                <div style="display: inline-flex; align-items: center; gap: 4px; background: rgba(85, 124, 99, 0.16); border: 1px solid rgba(85, 124, 99, 0.45); border-radius: 6px; padding: 3px 8px; font-size: 0.78rem;" title="Volume total de entrada no pátio (cubagem de toras e pilhas)">
                  <span style="color: #4ade80; font-weight: 800;">🟢 Entrada:</span>
                  <strong style="color: var(--ink);">${entFmt} m³</strong>
                  <span style="color: var(--muted); font-size: 0.70rem;">(${stats.countEntrada} ${stats.countEntrada === 1 ? 'med.' : 'med.'})</span>
                </div>
                <!-- Valor Total de Retirada -->
                <div style="display: inline-flex; align-items: center; gap: 4px; background: rgba(217, 119, 6, 0.16); border: 1px solid rgba(217, 119, 6, 0.45); border-radius: 6px; padding: 3px 8px; font-size: 0.78rem;" title="Volume total de retirada do pátio (cargas de caminhão)">
                  <span style="color: #fbbf24; font-weight: 800;">🚚 Retirada:</span>
                  <strong style="color: var(--ink);">${retFmt} m³</strong>
                  <span style="color: var(--muted); font-size: 0.70rem;">(${stats.countRetirada} ${stats.countRetirada === 1 ? 'carg.' : 'carg.'})</span>
                </div>
              </div>
            </div>

            ${(isCriador && !isOwner) ? `
              <button type="button" class="btn-remove-member" onclick="app.removerMembroProjeto('${this.escapeHtml(m.email)}', '${this.escapeHtml(nomeMembro)}')" title="Remover este integrante do projeto" style="background: transparent; border: 1px solid #d9534f; color: #d9534f; border-radius: 4px; padding: 4px 8px; font-size: 0.72rem; cursor: pointer; align-self: center;">
                Remover
              </button>
            ` : ''}
          </div>
        `;
      }).join('');
    }

    // Constrói painel de adição conforme permissão do usuário
    let painelAdicaoHtml = '';
    if (isCriador) {
      painelAdicaoHtml = `
        <div class="project-add-member-box">
          <div style="font-size: 0.82rem; font-weight: 700; color: var(--gold); margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
            <span>➕</span> Adicionar Nova Conta (Exclusivo do Criador)
          </div>
          <p style="font-size: 0.74rem; color: var(--muted); margin-bottom: 8px; line-height: 1.35;">
            Somente você, como criador do projeto, pode autorizar outras contas. Informe o e-mail Google ou de acesso do integrante da sua frente (ex: Marco, Norberto):
          </p>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <input type="email" id="inputNovoMembroEmail" class="form-control" placeholder="E-mail da conta (ex: norberto@gmail.com)" style="flex: 2; min-width: 180px; font-size: 0.85rem;">
              <input type="text" id="inputNovoMembroNome" class="form-control" placeholder="Nome (ex: Norberto)" style="flex: 1; min-width: 110px; font-size: 0.85rem;">
            </div>
            <button type="button" class="btn btn-primary btn-block" style="padding: 10px; font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; gap: 6px;" onclick="app.adicionarMembroProjeto()">
              <span>✓</span> Autorizar Conta neste Projeto
            </button>
          </div>
        </div>
      `;
    } else if (isLogado) {
      painelAdicaoHtml = `
        <div class="project-locked-notice">
          <span style="font-size: 1.3rem;">🔒</span>
          <div>
            <strong>Somente o criador pode adicionar ou remover contas.</strong><br>
            O criador deste projeto é <strong>${this.escapeHtml(meta.criadorNome || meta.criadorEmail)}</strong>. Sua conta está autorizada para medições e retiradas em campo.
          </div>
        </div>
      `;
    } else {
      painelAdicaoHtml = `
        <div class="project-login-notice">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <span style="font-size: 1.2rem;">🔑</span>
            <strong>Entre na sua conta para gerenciar integrantes:</strong>
          </div>
          <p style="font-size: 0.74rem; color: var(--muted); margin-bottom: 8px;">
            Conecte-se com sua conta Google ou e-mail para validar seus projetos na nuvem e adicionar sua equipe.
          </p>
          <button type="button" class="btn btn-sm btn-primary" onclick="app.abrirModalAuth()">
            Fazer Login com Google ou E-mail
          </button>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="project-members-wrapper">
        <div style="background: rgba(14, 37, 21, 0.6); border: 1px solid var(--line); border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div>
            <div style="font-size: 0.72rem; text-transform: uppercase; color: var(--muted); font-weight: 700;">Total da Frente na Nuvem</div>
            <div style="font-size: 1.1rem; font-weight: 700; color: var(--gold); font-family: var(--display);">
              ${statsData.totalGeralCount} ${statsData.totalGeralCount === 1 ? 'medição' : 'medições'} • ${fNum(statsData.totalGeralVolume, 3)} m³
            </div>
            <div style="display: flex; gap: 10px; margin-top: 4px; font-size: 0.75rem; flex-wrap: wrap;">
              <span style="color: #4ade80; font-weight: 700;">🟢 Entrada: <strong>${fNum(statsData.totalEntradaVolume, 3)} m³</strong> (${statsData.totalEntradaCount} med.)</span>
              <span style="color: #fbbf24; font-weight: 700;">🚚 Retirada: <strong>${fNum(statsData.totalRetiradaVolume, 3)} m³</strong> (${statsData.totalRetiradaCount} carg.)</span>
            </div>
          </div>
          <div style="font-size: 0.75rem; color: var(--sage); font-weight: 600;">
            ☁️ Nuvem Ativa
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <h4 style="font-size: 0.88rem; font-weight: 700; margin: 0; color: var(--ink); display: flex; align-items: center; gap: 6px;">
            <span>👥</span> Integrantes Autorizados (${membros.length})
          </h4>
          <span style="font-size: 0.72rem; color: var(--gold); font-weight: 700;">
            ${isCriador ? '👑 Controle do Criador' : 'Acesso Autorizado'}
          </span>
        </div>

        <div class="project-members-list">
          ${membrosHtml}
        </div>

        ${painelAdicaoHtml}
      </div>
    `;
  }

  async adicionarMembroProjeto() {
    const emailEl = document.getElementById('inputNovoMembroEmail');
    const nomeEl = document.getElementById('inputNovoMembroNome');

    const email = emailEl ? emailEl.value.trim() : '';
    const nome = nomeEl ? nomeEl.value.trim() : '';

    if (!email) {
      this.showToast('Por favor, informe o e-mail da conta do integrante.', 'warning');
      if (emailEl) emailEl.focus();
      return;
    }

    try {
      if (!this.auth) throw new Error('Módulo de autenticação indisponível.');
      const res = await this.auth.adicionarMembroAoProjeto(this.projetoAtivo, email, nome);
      this.showToast(`✓ Conta "${res.membro.nome || res.membro.email}" autorizada com sucesso no projeto ${this.projetoAtivo}!`, 'success');
      if (emailEl) emailEl.value = '';
      if (nomeEl) nomeEl.value = '';
      await this.renderizarSecaoMembrosProjeto(this.projetoAtivo);
    } catch (err) {
      this.showToast(err.message || 'Erro ao adicionar integrante.', 'danger');
    }
  }

  async removerMembroProjeto(email, nome) {
    const ident = nome ? `${nome} (${email})` : email;
    if (!confirm(`Deseja remover ${ident} do projeto ${this.projetoAtivo}?\nEsta conta não terá mais acesso às medições deste projeto.`)) {
      return;
    }

    try {
      if (!this.auth) throw new Error('Módulo de autenticação indisponível.');
      await this.auth.removerMembroDoProjeto(this.projetoAtivo, email);
      this.showToast(`Conta de ${ident} removida do projeto.`, 'info');
      await this.renderizarSecaoMembrosProjeto(this.projetoAtivo);
    } catch (err) {
      this.showToast(err.message || 'Erro ao remover integrante.', 'danger');
    }
  }

  async tornarSeCriadorDoProjeto() {
    try {
      if (!this.auth) throw new Error('Módulo de autenticação indisponível.');
      await this.auth.reivindicarCriacaoProjeto(this.projetoAtivo);
      this.showToast(`👑 Sua conta foi registrada como Criadora oficial do projeto ${this.projetoAtivo}!`, 'success');
      await this.renderizarSecaoMembrosProjeto(this.projetoAtivo);
    } catch (err) {
      this.showToast(err.message || 'Erro ao registrar autoria.', 'danger');
    }
  }

  async ativarProjetoPill(nome) {
    if (this.auth) {
      const meta = await this.auth.obterMetaProjeto(nome);
      const isCriador = this.auth.isUsuarioCriador(meta);
      const isMembro = this.auth.isUsuarioMembroAutorizado(meta);

      if (this.auth.user && !isCriador && !isMembro) {
        this.showToast(`⛔ Acesso restrito: o projeto "${nome}" pertence a ${meta.criadorNome || meta.criadorEmail}. Somente o criador pode autorizar sua conta nele.`, 'danger', 6000);
        return;
      }
    }

    this.definirProjetoAtivo(nome, true);
    await this.abrirModalProjeto();
    this.showToast(`Projeto alterado para "${nome}".`, 'success');
  }

  async salvarNovoProjeto() {
    const input = document.getElementById('inputTrocarProjeto');
    const nome = input ? input.value.trim() : '';
    if (!nome) {
      this.showToast('Digite o nome do projeto para ativar.', 'warning');
      return;
    }

    if (this.auth) {
      const meta = await this.auth.obterMetaProjeto(nome);
      const isCriador = this.auth.isUsuarioCriador(meta);
      const isMembro = this.auth.isUsuarioMembroAutorizado(meta);

      if (this.auth.user && !isCriador && !isMembro) {
        this.showToast(`⛔ Acesso restrito: o projeto "${nome}" pertence a ${meta.criadorNome || meta.criadorEmail}. Somente o criador pode autorizar sua conta nele.`, 'danger', 6000);
        return;
      }
    }

    this.definirProjetoAtivo(nome, true);
    if (input) input.value = '';
    await this.abrirModalProjeto();
    this.showToast(`✓ Projeto "${nome}" ativado com sucesso!`, 'success');
  }

  async sincronizarProjetoAgora(forcarEnvio = false) {
    if (!navigator.onLine) {
      this.showToast('Sem conexão de internet no momento. As medições locais continuam seguras.', 'warning');
      return;
    }
    if (!this.auth || !this.auth.user) {
      this.showToast('Faça login com sua conta para sincronizar projetos com a equipe.', 'info');
      this.abrirModalAuth();
      return;
    }
    await this.auth.syncProjectWithCloud(this.projetoAtivo, false, forcarEnvio);
    this.atualizarUIProjeto();
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
  // SISTEMA DE PRÉVIA DA PLANILHA EXCEL (ACIONADO EXCLUSIVAMENTE POR BOTÃO)
  // =========================================================================
  abrirPreviaDoCard(e, id) {
    this.abrirPreviaFixada(id);
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
    const zona = (document.getElementById('cubZona')?.value?.trim()) || '22K';
    const latitude = (document.getElementById('cubLatitude')?.value?.trim()) || '';
    const longitude = (document.getElementById('cubLongitude')?.value?.trim()) || '';
    let utm = (document.getElementById('cubUtm')?.value?.trim()) || '';
    if (!utm && (latitude || longitude)) {
      utm = `${zona ? zona + ' ' : ''}${longitude} ${latitude}`.trim();
    }
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
        data, horario, rodovia, km, zona, latitude, longitude, utm, responsavel,
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
        data, horario, rodovia, km, zona, latitude, longitude, utm, responsavel,
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
          data, horario, rodovia, km, zona, latitude, longitude, utm, responsavel,
          identificacao: identPilhaTora,
          placa: identPilhaTora,
          plaqueta: plaquetasList.join(', '),
          observacoes,
          totalToras: lote.totalToras,
          diametroMedio_cm: lote.diametroMedio_cm,
          comprimentoMedio: lote.comprimentoMedio,
          volumeGeometrico: lote.volumeTotal,
          tipoVolume: `Pilha de Toras (${lote.totalToras} toras - Smalian)`,
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
          data, horario, rodovia, km, zona, latitude, longitude, utm, responsavel,
          identificacao: `Tora Plaqueta ${plaqueta}`,
          placa: `Plaqueta ${plaqueta}`,
          plaqueta: plaqueta,
          observacoes,
          diametroPonta1_cm: calc.diametroPonta1_cm || 0,
          diametroPonta2_cm: calc.diametroPonta2_cm || 0,
          diametroMedio_cm: calc.diametroMedio_cm || 0,
          comprimento: calc.comprimento || 0,
          volumeGeometrico: calc.volumeGeometrico || 0,
          tipoVolume: 'Tora Individual (Smalian)',
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

  mostrarPreviaPlanilha(itemOrItems) {
    if (!itemOrItems) return;

    this.previaAtivaItem = itemOrItems;
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

    const isMulti = Array.isArray(itemOrItems) && itemOrItems.length > 1;

    if (isMulti) {
      const nomeArquivo = `Planilha_Consolidada_${itemOrItems.length}_Cubagens.xlsx`;
      if (filenameEl) filenameEl.textContent = nomeArquivo;
      if (holdIndEl) holdIndEl.style.display = 'inline-flex';
      if (holdTextEl) holdTextEl.textContent = `📋 ${itemOrItems.length} Cubagens`;
      if (cellRefEl) cellRefEl.textContent = 'FX';
      if (formulaTextEl) formulaTextEl.textContent = `=SOMA(VOLUMES_GEOMETRICOS) [${itemOrItems.length} Medições Consolidadas]`;

      if (tabMedicao) {
        tabMedicao.classList.add('active');
        tabMedicao.textContent = `📋 Medições (${itemOrItems.length})`;
      }
      if (tabMemoria) {
        tabMemoria.classList.remove('active');
        tabMemoria.textContent = '📐 Memórias de Cálculo';
      }

      viewportGrid.innerHTML = this.gerarHtmlPlanilhaConsolidada(itemOrItems, 'medicao');
    } else {
      const item = Array.isArray(itemOrItems) ? itemOrItems[0] : itemOrItems;
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
      if (holdTextEl) holdTextEl.textContent = '📋 Planilha Excel';

      if (tabMedicao) {
        tabMedicao.classList.add('active');
        tabMedicao.textContent = '📋 Medição Técnica';
      }
      if (tabMemoria) {
        tabMemoria.classList.remove('active');
        tabMemoria.textContent = '📐 Memória de Cálculo';
      }

      viewportGrid.innerHTML = this.gerarHtmlPlanilhaPrevia(item, 'medicao');
    }

    // Abre o modal de forma 100% visível, fixa e persistente
    modal.style.display = 'flex';
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
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
      modal.classList.remove('open');
      modal.classList.remove('peek-mode');
      modal.setAttribute('aria-hidden', 'true');
    }
    this.previaAberta = false;
    this.previaAtivaItem = null;

    const tabMedicao = document.getElementById('prevTabMedicao');
    const tabMemoria = document.getElementById('prevTabMemoria');
    if (tabMedicao) tabMedicao.textContent = '📋 Medição Técnica';
    if (tabMemoria) tabMemoria.textContent = '📐 Memória de Cálculo';
  }

  alternarAbaPrevia(aba) {
    this.abaAtivaPrevia = aba;
    const tabMedicao = document.getElementById('prevTabMedicao');
    const tabMemoria = document.getElementById('prevTabMemoria');
    const viewportGrid = document.getElementById('prevSheetGrid');
    const cellRefEl = document.getElementById('prevCellRef');
    const formulaTextEl = document.getElementById('prevFormulaText');

    if (!this.previaAtivaItem || !viewportGrid) return;

    const isMulti = Array.isArray(this.previaAtivaItem) && this.previaAtivaItem.length > 1;

    if (aba === 'medicao') {
      if (tabMedicao) tabMedicao.classList.add('active');
      if (tabMemoria) tabMemoria.classList.remove('active');

      if (isMulti) {
        if (cellRefEl) cellRefEl.textContent = 'FX';
        if (formulaTextEl) formulaTextEl.textContent = `=SOMA(VOLUMES_GEOMETRICOS) [${this.previaAtivaItem.length} Medições Consolidadas]`;
        viewportGrid.innerHTML = this.gerarHtmlPlanilhaConsolidada(this.previaAtivaItem, 'medicao');
      } else {
        const item = Array.isArray(this.previaAtivaItem) ? this.previaAtivaItem[0] : this.previaAtivaItem;
        const tipo = item?.tipo || 'caminhao';
        if (cellRefEl) cellRefEl.textContent = tipo === 'caminhao' ? 'K6' : 'J6';
        if (formulaTextEl) {
          formulaTextEl.textContent = tipo === 'tora'
            ? '=((PI()*(D6/200)^2 + PI()*(E6/200)^2)/2) * G6'
            : '=(G6 * H6 * F6) * J6';
        }
        viewportGrid.innerHTML = this.gerarHtmlPlanilhaPrevia(item, 'medicao');
      }
    } else {
      if (tabMedicao) tabMedicao.classList.remove('active');
      if (tabMemoria) tabMemoria.classList.add('active');

      if (isMulti) {
        if (cellRefEl) cellRefEl.textContent = 'FX';
        if (formulaTextEl) formulaTextEl.textContent = `=MEMORIA_CONSOLIDADA(${this.previaAtivaItem.length}_CUBAGENS)`;
        viewportGrid.innerHTML = this.gerarHtmlPlanilhaConsolidada(this.previaAtivaItem, 'memoria');
      } else {
        const item = Array.isArray(this.previaAtivaItem) ? this.previaAtivaItem[0] : this.previaAtivaItem;
        if (cellRefEl) cellRefEl.textContent = 'fx';
        if (formulaTextEl) formulaTextEl.textContent = (item && item.memoriaCalculo) ? item.memoriaCalculo : '=MEMORIA_DE_CALCULO_OFICIAL(SISTAXON, IBAMA, CRBio)';
        viewportGrid.innerHTML = this.gerarHtmlPlanilhaPrevia(item, 'memoria');
      }
    }
  }

  async baixarExcelDaPrevia() {
    if (!this.previaAtivaItem) return;

    // Se a prévia ativa for uma lista consolidada de múltiplas cubagens
    if (Array.isArray(this.previaAtivaItem) && this.previaAtivaItem.length > 1) {
      const items = this.previaAtivaItem;
      const dataPri = items[0].data || '';
      const dataUlt = items[items.length - 1].data || '';
      const dateTag = dataPri === dataUlt ? dataPri : `${dataPri}_a_${dataUlt}`;
      const fileName = `Planilha_Consolidada_${items.length}_Cubagens_${dateTag}.xlsx`;

      try {
        this.showToast(`Exportando ${items.length} cubagens para Excel (.xlsx)...`, 'info');
        await window.CubagemExcelExport.exportWorkbook(items, {
          fileName,
          responsavel: items[0].responsavel || 'BioKuri Soluções Ambientais',
          startDate: dataPri,
          endDate: dataUlt
        });
        this.showToast(`Planilha ${fileName} baixada com sucesso!`, 'success');
      } catch (err) {
        console.error('Erro ao baixar planilha consolidada da prévia:', err);
        this.showToast(`Erro ao exportar planilha Excel: ${err.message || err}`, 'danger');
      }
      return;
    }

    // Prévia de um único item
    const item = Array.isArray(this.previaAtivaItem) ? this.previaAtivaItem[0] : this.previaAtivaItem;
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
      this.showToast(`Erro ao exportar planilha Excel: ${err.message || err}`, 'danger');
    }
  }

  gerarHtmlPlanilhaConsolidada(records, aba = 'medicao') {
    const totalVol = records.reduce((acc, r) => acc + (Number(r.volumeGeometrico) || 0), 0);
    const dataPrimeira = records[0]?.data ? window.CubagemExcelExport.formatDateBR(records[0].data) : '';
    const dataUltima = records[records.length - 1]?.data ? window.CubagemExcelExport.formatDateBR(records[records.length - 1].data) : '';
    const isSingleDay = Boolean(dataPrimeira && dataPrimeira === dataUltima);
    const periodoStr = isSingleDay ? dataPrimeira : `${dataPrimeira} a ${dataUltima}`;
    const titPrincipal = isSingleDay
      ? `BIOKURI PESQUISA E SOLUÇÕES AMBIENTAIS — CONSOLIDADO DIÁRIO DE CUBAGEM (${dataPrimeira})`
      : 'BIOKURI PESQUISA E SOLUÇÕES AMBIENTAIS — PLANILHA CONSOLIDADA DE CUBAGEM';
    const titTotal = isSingleDay
      ? `TOTAL GERAL DA CUBAGEM DO DIA (${records.length} MEDIÇÕES CONSOLIDADAS):`
      : `TOTAL GERAL CONSOLIDADO (${records.length} CUBAGENS):`;
    const fNum = (n, d = 2) => window.CubagemCalculator.formatNumber(n, d);

    const sumVol = arr => arr.reduce((acc, x) => acc + ((window.CubagemCalculator && typeof window.CubagemCalculator.obterVolumeEfetivo === 'function') ? window.CubagemCalculator.obterVolumeEfetivo(x) : (Number(x.volumeGeometrico) || 0)), 0);
    const caminhoes = records.filter(r => (r.tipo || 'caminhao') === 'caminhao');
    const pilhas = records.filter(r => r.tipo === 'pilha');
    const toras = records.filter(r => r.tipo === 'tora');
    const vCam = sumVol(caminhoes);
    const vPil = sumVol(pilhas);
    const vTor = sumVol(toras);
    const vTotEntrada = vPil + vTor;
    const vSaldoPatio = vTotEntrada - vCam;

    const viagensMap = new Map();
    caminhoes.forEach((c, idx) => {
      let num = c.numeroViagem;
      if (!num && c.viagem) {
        const m = String(c.viagem).match(/\d+/);
        if (m) num = parseInt(m[0], 10);
      }
      num = num || (idx + 1);
      const label = `${num}ª Viagem`;
      if (!viagensMap.has(num)) {
        viagensMap.set(num, { num, label, volumeTotal: 0, placas: new Set(), totalToras: 0, items: [] });
      }
      const g = viagensMap.get(num);
      g.items.push(c);
      const v = (window.CubagemCalculator && typeof window.CubagemCalculator.obterVolumeEfetivo === 'function')
        ? window.CubagemCalculator.obterVolumeEfetivo(c)
        : (Number(c.volumeGeometrico) || 0);
      g.volumeTotal += v;
      if (c.placa && c.placa !== 'NÃO INFORMADA') g.placas.add(c.placa);
      if (Array.isArray(c.toras)) g.totalToras += c.toras.length;
      else if (c.totalToras) g.totalToras += Number(c.totalToras) || 0;
    });
    const viagensList = [...viagensMap.values()].sort((a, b) => a.num - b.num);

    if (aba === 'memoria') {
      return `
        <table class="excel-grid-table">
          <thead>
            <tr>
              <th class="excel-row-num"></th>
              <th class="excel-col-head" style="width: 45px;">A</th>
              <th class="excel-col-head" style="width: 95px;">B</th>
              <th class="excel-col-head" style="width: 140px;">C</th>
              <th class="excel-col-head" style="width: 320px;">D</th>
              <th class="excel-col-head" style="width: 120px;">E</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="excel-row-num">1</td>
              <td colspan="5" class="excel-brand-title-cell">
                ${titPrincipal} — MEMÓRIA TÉCNICA
              </td>
            </tr>
            <tr>
              <td class="excel-row-num">2</td>
              <td colspan="5" class="excel-brand-sub-cell">
                Auditoria Numérica de ${records.length} Medições Técnicas no Período ${periodoStr}
              </td>
            </tr>
            <tr>
              <td class="excel-row-num">3</td>
              <td colspan="5" class="excel-meta-cell">
                <strong>Responsável:</strong> ${this.escapeHtml(records[0]?.responsavel || 'Lucas Aøsf')} &bull; 
                <strong>Registro:</strong> CRBio 127233/01-D &bull; 
                <strong>Total de Cubagens:</strong> ${records.length} &bull; 
                <strong>Volume Total Consolidado:</strong> ${fNum(totalVol, 2)} m³
              </td>
            </tr>
            <tr>
              <td class="excel-row-num">4</td>
              <td class="excel-header-col">#</td>
              <td class="excel-header-col">Data/Hora</td>
              <td class="excel-header-col">Identificação</td>
              <td class="excel-header-col">Memória de Cálculo Individual</td>
              <td class="excel-header-col">Volume (m³)</td>
            </tr>
            ${records.map((r, idx) => {
              const dtBR = window.CubagemExcelExport.formatDateBR(r.data);
              const isCam = (r.tipo || 'caminhao') === 'caminhao';
              const tripNum = r.numeroViagem || (r.viagem ? parseInt(String(r.viagem).replace(/\D+/g, ''), 10) : 0);
              const tripStr = tripNum > 0 ? `${tripNum}ª Viagem` : (r.viagem || '');
              const ident = isCam ? `${r.placa || 'Sem placa'}${tripStr ? ' (' + tripStr + ')' : ''}` : (r.placa || r.identificacao || r.plaqueta || `Medição ${idx + 1}`);
              const mem = r.memoriaCalculo || `V = C × L × Hm (${r.volumeGeometrico} m³)`;
              const vol = fNum(r.volumeGeometrico, r.tipo === 'tora' ? 3 : 2);
              return `
                <tr>
                  <td class="excel-row-num">${idx + 5}</td>
                  <td class="excel-cell-center" style="font-weight: 700;">${idx + 1}</td>
                  <td class="excel-cell-center">${this.escapeHtml(dtBR)} ${this.escapeHtml(r.horario || '')}</td>
                  <td class="excel-cell-center" style="font-weight: 700;">${this.escapeHtml(ident)}</td>
                  <td class="excel-cell-text" style="font-family: Consolas, monospace; font-size: 0.76rem;">${this.escapeHtml(mem)}</td>
                  <td class="excel-cell-num" style="font-weight: 700; color: #0E2515;">${vol}</td>
                </tr>
              `;
            }).join('')}
            <tr class="excel-total-row">
              <td class="excel-row-num">${records.length + 5}</td>
              <td colspan="4" class="excel-cell-text" style="font-weight: 800; text-transform: uppercase;">
                ${titTotal}
              </td>
              <td class="excel-cell-num" style="font-size: 1.05rem; font-weight: 800; color: #0E2515;">
                ${fNum(totalVol, 2)} m³
              </td>
            </tr>
          </tbody>
        </table>
      `;
    }

    // Aba de medição técnica consolidada
    return `
      <table class="excel-grid-table">
        <thead>
          <tr>
            <th class="excel-row-num"></th>
            <th class="excel-col-head" style="width: 35px;">A</th>
            <th class="excel-col-head" style="width: 85px;">B</th>
            <th class="excel-col-head" style="width: 55px;">C</th>
            <th class="excel-col-head" style="width: 95px;">D</th>
            <th class="excel-col-head" style="width: 120px;">E</th>
            <th class="excel-col-head" style="width: 130px;">F</th>
            <th class="excel-col-head" style="width: 110px;">G</th>
            <th class="excel-col-head" style="width: 90px;">H</th>
            <th class="excel-col-head" style="width: 75px;">I</th>
            <th class="excel-col-head" style="width: 95px;">J</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="excel-row-num">1</td>
            <td colspan="10" class="excel-brand-title-cell">
              ${titPrincipal}
            </td>
          </tr>
          <tr>
            <td class="excel-row-num">2</td>
            <td colspan="10" class="excel-brand-sub-cell">
              Relatório Multipasta Oficial de Dendrometria e Cubagem Florestal · Diretrizes Sistaxon / Sinaflor (IBAMA)
            </td>
          </tr>
          <tr>
            <td class="excel-row-num">3</td>
            <td colspan="10" class="excel-meta-cell">
              <strong>Período:</strong> ${periodoStr} &bull; 
              <strong>Total de Medições:</strong> ${records.length} &bull; 
              <strong>Volume Geral do Dia:</strong> ${fNum(totalVol, 2)} m³
              ${caminhoes.length > 0 ? ` &bull; <strong>Retiradas:</strong> ${fNum(vCam, 2)} m³ (${viagensList.length} viagens) &bull; <strong>Entrada:</strong> ${fNum(vTotEntrada, 2)} m³ &bull; <strong>Saldo Pátio:</strong> ${fNum(vSaldoPatio, 2)} m³` : ''} &bull; 
              <strong>Responsável:</strong> ${this.escapeHtml(records[0]?.responsavel || 'Lucas Aøsf')} &bull; 
              <strong>CRBio:</strong> 127233/01-D
            </td>
          </tr>
          <tr>
            <td class="excel-row-num">4</td>
            <td class="excel-header-col">#</td>
            <td class="excel-header-col">Data</td>
            <td class="excel-header-col">Hora</td>
            <td class="excel-header-col">Modalidade</td>
            <td class="excel-header-col">Placa / Ident.</td>
            <td class="excel-header-col">Local / Rodovia</td>
            <td class="excel-header-col">Origem / Espécie</td>
            <td class="excel-header-col">Dimensões</td>
            <td class="excel-header-col">Hm (m)</td>
            <td class="excel-header-col">Volume (m³)</td>
          </tr>
          ${records.map((r, idx) => {
            const dtBR = window.CubagemExcelExport.formatDateBR(r.data);
            const tipo = r.tipo || 'caminhao';
            const tipoLabel = tipo === 'caminhao' ? 'Caminhão' : (tipo === 'pilha' ? 'Pilha' : 'Toras');
            const isCam = tipo === 'caminhao';
            const tripNum = r.numeroViagem || (r.viagem ? parseInt(String(r.viagem).replace(/\D+/g, ''), 10) : 0);
            const tripStr = tripNum > 0 ? `${tripNum}ª Viagem` : (r.viagem || '');
            const ident = isCam ? `${r.placa || 'Sem placa'}${tripStr ? ' (' + tripStr + ')' : ''}` : (r.placa || r.identificacao || r.plaqueta || '-');
            const loc = `${r.rodovia || '-'}${r.km ? ' km ' + r.km : ''}`;
            const espOrig = r.especie ? `${r.origemMadeira || 'Nativa'} (${r.especie})` : (r.origemMadeira || 'Nativa');
            const dimStr = tipo === 'tora'
              ? `${r.totalToras || 1} toras`
              : `${fNum(r.comprimento || 0)} × ${fNum(r.largura || 0)} m`;
            const hmStr = tipo === 'tora' ? `D: ${fNum(r.diametroMedio_cm || 0, 1)} cm` : `${fNum(r.alturaMedia || 0, 3)} m`;
            const volStr = fNum(r.volumeGeometrico, tipo === 'tora' ? 3 : 2);

            return `
              <tr>
                <td class="excel-row-num">${idx + 5}</td>
                <td class="excel-cell-center" style="font-weight: 700;">${idx + 1}</td>
                <td class="excel-cell-center">${this.escapeHtml(dtBR)}</td>
                <td class="excel-cell-center">${this.escapeHtml(r.horario || '-')}</td>
                <td class="excel-cell-center"><span class="badge-type ${this.escapeHtml(tipo)}" style="font-size: 0.7rem; padding: 2px 6px;">${this.escapeHtml(tipoLabel)}</span></td>
                <td class="excel-cell-center" style="font-weight: 700;">${this.escapeHtml(ident)}</td>
                <td class="excel-cell-text">${this.escapeHtml(loc)}</td>
                <td class="excel-cell-text" style="font-size: 0.75rem;">${this.escapeHtml(espOrig)}</td>
                <td class="excel-cell-center font-mono">${this.escapeHtml(dimStr)}</td>
                <td class="excel-cell-center font-mono">${this.escapeHtml(hmStr)}</td>
                <td class="excel-cell-num" style="font-weight: 700; color: #0E2515;">${volStr}</td>
              </tr>
            `;
          }).join('')}
          ${viagensList.length > 0 ? `
            <tr style="background: rgba(140, 74, 55, 0.12); font-weight: 700;">
              <td class="excel-row-num" style="background: #e2dccb;">•</td>
              <td colspan="9" class="excel-cell-text" style="color: #8C4A37; font-size: 0.78rem;">
                🚚 RETIRADAS SEPARADAS POR VIAGEM (${viagensList.length} ${viagensList.length === 1 ? 'VIAGEM' : 'VIAGENS'}): ${viagensList.map(v => `<b>${v.label}</b>: ${fNum(v.volumeTotal, 2)} m³ (${v.placas.size > 0 ? [...v.placas].join(', ') : 'S/P'})`).join(' &bull; ')}
              </td>
              <td class="excel-cell-num" style="font-weight: 800; color: #8C4A37;">
                ${fNum(vCam, 2)} m³
              </td>
            </tr>
          ` : ''}
          <tr class="excel-total-row">
            <td class="excel-row-num">${records.length + 5 + (viagensList.length > 0 ? 1 : 0)}</td>
            <td colspan="9" class="excel-cell-text" style="font-weight: 800; text-transform: uppercase;">
              ${titTotal}
            </td>
            <td class="excel-cell-num" style="font-size: 1.05rem; font-weight: 800; color: #0E2515;">
              ${fNum(totalVol, 2)} m³
            </td>
          </tr>
        </tbody>
      </table>
    `;
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
                BIOKURI PESQUISA E SOLUÇÕES AMBIENTAIS — MEMÓRIA TÉCNICA DE CÁLCULO
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
                <strong>Responsável:</strong> ${this.escapeHtml(item.responsavel || 'Lucas Aøsf')} &bull; 
                <strong>Registro:</strong> CRBio 127233/01-D &bull; 
                <strong>Data:</strong> ${this.escapeHtml(dataBR)} às ${this.escapeHtml(item.horario || '--:--')} &bull; 
                <strong>Local:</strong> ${this.escapeHtml(item.rodovia || 'Pátio')} ${item.km ? 'km ' + this.escapeHtml(item.km) : ''}
              </td>
            </tr>
            <tr>
              <td class="excel-row-num">4</td>
              <td class="excel-cell-center font-mono">1</td>
              <td style="font-weight: 700; background: #F9FAFB;">Modalidade</td>
              <td colspan="5" class="excel-cell-text" style="font-weight: 600; color: #0E2515;">
                ${this.escapeHtml(item.tipoVolume || (tipo === 'caminhao' ? 'Retirada do Material (Caminhão)' : tipo === 'pilha' ? 'Pilha de Madeira' : 'Toras (Smalian)'))}
              </td>
            </tr>
            <tr>
              <td class="excel-row-num">5</td>
              <td class="excel-cell-center font-mono">2</td>
              <td style="font-weight: 700; background: #F9FAFB;">Identificação</td>
              <td colspan="5" class="excel-cell-text font-mono" style="font-weight: 700;">
                ${this.escapeHtml(item.placa || item.identificacao || item.plaqueta || 'S/ID')}
              </td>
            </tr>
            <tr>
              <td class="excel-row-num">6</td>
              <td class="excel-cell-center font-mono">3</td>
              <td style="font-weight: 700; background: #F9FAFB;">Origem da Madeira</td>
              <td colspan="5" class="excel-cell-text">
                ${this.escapeHtml(item.origemMadeira || 'Nativa')} ${item.especie ? ' &bull; <em>' + this.escapeHtml(item.especie) + '</em>' : ''}
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
      const isToras = item.modoCarga === 'toras' || (Array.isArray(item.toras) && item.toras.length > 0);
      if (isToras) {
        const listaToras = Array.isArray(item.toras) && item.toras.length > 0 ? item.toras : [];
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
              <td class="excel-cell-center font-mono" style="font-weight: 700;">${this.escapeHtml(t.plaqueta || 'S/P')}</td>
              <td class="excel-cell-text" style="font-style: italic;">${this.escapeHtml(t.especie || item.especie || '-')}</td>
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
                <th class="excel-col-head" style="width: 70px;">F</th>
                <th class="excel-col-head" style="width: 80px;">G</th>
                <th class="excel-col-head" style="width: 85px;">H</th>
                <th class="excel-col-head" style="width: 85px;">I</th>
                <th class="excel-col-head" style="width: 105px;">J</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="excel-row-num">1</td>
                <td colspan="10" class="excel-brand-title-cell">
                  BIOKURI PESQUISA E SOLUÇÕES AMBIENTAIS — ROMANEIO DE TRANSPORTE DE TORAS (CAMINHÃO)
                </td>
              </tr>
              <tr>
                <td class="excel-row-num">2</td>
                <td colspan="10" class="excel-brand-sub-cell">
                  Planilha Oficial de Carga por Toras Rastreáveis (Fórmula de Smalian) &bull; Placa: ${item.placa || 'SEM PLACA'}
                </td>
              </tr>
              <tr>
                <td class="excel-row-num">3</td>
                <td colspan="10" class="excel-meta-cell">
                  <strong>Data:</strong> ${dataBR} &bull; 
                  <strong>Horário:</strong> ${item.horario || '--:--'} &bull; 
                  <strong>Caminhão:</strong> ${item.placa || 'Sem placa'} &bull; 
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
                <th class="excel-header-col">Plaqueta</th>
                <th class="excel-header-col">Espécie</th>
                <th class="excel-header-col">D1 (cm)</th>
                <th class="excel-header-col">D2 (cm)</th>
                <th class="excel-header-col">Dm (cm)</th>
                <th class="excel-header-col">Comp. (m)</th>
                <th class="excel-header-col">g1 (m²)</th>
                <th class="excel-header-col">g2 (m²)</th>
                <th class="excel-header-col">Vol. Smalian (m³)</th>
              </tr>
              ${rowsHtml}
              <tr class="excel-total-row">
                <td class="excel-row-num">${6 + listaToras.length}</td>
                <td colspan="3" class="excel-cell-text" style="font-weight: 700;">TOTAL DA CARGA DO CAMINHÃO (${totalToras} toras)</td>
                <td class="excel-cell-center" style="font-size: 0.74rem;">-</td>
                <td class="excel-cell-center" style="font-size: 0.74rem;">-</td>
                <td class="excel-cell-num" style="font-weight: 700;">${fNum(dmMedio, 1)} cm</td>
                <td class="excel-cell-num" style="font-weight: 700;">${fNum(compMedio, 2)} m</td>
                <td class="excel-cell-center">-</td>
                <td class="excel-cell-center">-</td>
                <td class="excel-cell-num" style="font-size: 0.96rem; font-weight: 800; color: #0E2515;">${fNum(totalVolFinal, 3)} m³</td>
              </tr>
            </tbody>
          </table>
        `;
      }

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
                BIOKURI PESQUISA E SOLUÇÕES AMBIENTAIS — RETIRADA DO MATERIAL (CAMINHÃO)
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
                ${item.projeto ? `<strong>Projeto:</strong> ${item.projeto} &bull; ` : ''}
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
                BIOKURI PESQUISA E SOLUÇÕES AMBIENTAIS — CUBAGEM DE PILHA DE MADEIRA
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
                BIOKURI PESQUISA E SOLUÇÕES AMBIENTAIS — CUBAGEM DE TORAS (MÉTODO SMALIAN)
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
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.app.init();
  });
} else {
  // DOM já carregado (ex: retorno de redirect, cache PWA ou carregamento em final de body)
  window.app.init();
}
