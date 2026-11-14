/**
 * auth.js - Sistema de Autenticação (Google e E-mail) e Sincronização em Nuvem (Firestore)
 * Cubagem Florestal — Pesquisa & Soluções Ambientais
 * Desenvolvido por Lucas Aøsf
 */

class CubagemAuth {
  constructor() {
    this.fb = null;
    this.user = null;
    this.authPromise = null;
    this.syncing = false;
    this.FBV = '10.13.2';
    this.unsubscribeProject = null;
    this.unsubscribeProjectDoc = null;
    this.projetoVinculado = null;
  }

  /**
   * Carrega os scripts do Firebase sob demanda ou reutiliza os já carregados
   */
  async loadFirebase() {
    if (this.fb) return this.fb;

    if (window.firebase && window.firebase.auth && window.firebase.firestore) {
      if (!window.firebase.apps.length && window.FIREBASE_CONFIG) {
        window.firebase.initializeApp(window.FIREBASE_CONFIG);
      }
      this.fb = window.firebase;
      return this.fb;
    }

    if (this.authPromise) return this.authPromise;

    if (!window.FIREBASE_CONFIG) {
      console.warn('window.FIREBASE_CONFIG não configurado.');
      return null;
    }

    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
          if (existing.getAttribute('data-loaded') === 'true' || (window.firebase && window.firebase.auth)) {
            return resolve();
          }
          existing.remove();
        }
        const s = document.createElement('script');
        s.src = src;
        const timer = setTimeout(() => {
          s.onerror = null;
          s.onload = null;
          reject(new Error(`Timeout ao carregar ${src}`));
        }, 8000);

        s.onload = () => {
          clearTimeout(timer);
          s.setAttribute('data-loaded', 'true');
          resolve();
        };
        s.onerror = (e) => {
          clearTimeout(timer);
          s.remove();
          reject(e);
        };
        document.head.appendChild(s);
      });
    };

    const base = `https://www.gstatic.com/firebasejs/${this.FBV}/`;

    this.authPromise = loadScript(`${base}firebase-app-compat.js`)
      .then(() => Promise.all([
        loadScript(`${base}firebase-auth-compat.js`),
        loadScript(`${base}firebase-firestore-compat.js`)
      ]))
      .then(() => {
        if (!window.firebase.apps.length) {
          window.firebase.initializeApp(window.FIREBASE_CONFIG);
        }
        this.fb = window.firebase;
        return this.fb;
      })
      .catch((err) => {
        console.warn('Não foi possível carregar o Firebase (offline ou erro de rede):', err);
        this.authPromise = null;
        return null;
      });

    return this.authPromise;
  }

  /**
   * Salva e recupera sessão local mesmo sem conexão
   */
  salvarSessaoUsuario(user) {
    if (!user) return;
    try {
      const uData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'Lucas Aøsf'),
        photoURL: user.photoURL || '',
        salvoEm: Date.now()
      };
      localStorage.setItem('cubagem.local_user', JSON.stringify(uData));
      localStorage.setItem('cubagem.usuario_conectado', JSON.stringify(uData));
    } catch (e) {}
  }

  verificarUsuarioLocal() {
    if (this.user) return;
    try {
      const localU = JSON.parse(localStorage.getItem('cubagem.local_user') || 'null');
      if (localU && localU.email) {
        this.user = localU;
        console.log('[Auth] Sessão local restaurada com sucesso:', localU.email);
      }
    } catch (e) {}
  }

  entrarModoLocal(email = 'lucasaosf@gmail.com', nome = 'Lucas Aøsf') {
    this.user = {
      uid: 'local_' + email.replace(/[^a-zA-Z0-9]/g, '_'),
      email: email,
      displayName: nome,
      isLocal: true
    };
    this.salvarSessaoUsuario(this.user);
    this.fecharModalAuth();
    this.renderAuthUI();
    if (window.app && window.app.showToast) {
      window.app.showToast(`✓ Conectado no modo local como ${nome}!`, 'success');
    }
  }

  /**
   * Inicializa o monitoramento de autenticação
   */
  async init() {
    this.verificarUsuarioLocal();

    try {
      const fb = await this.loadFirebase();
      if (!fb) {
        this.renderAuthUI();
        return;
      }

      // Processa resultado de redirecionamento (essencial para mobile / PWA)
      try {
        const redirectRes = await fb.auth().getRedirectResult();
        if (redirectRes && redirectRes.user) {
          this.user = redirectRes.user;
          this.salvarSessaoUsuario(this.user);
          this.renderAuthUI();
          if (window.app && window.app.showToast) {
            window.app.showToast(`Bem-vindo, ${redirectRes.user.displayName || redirectRes.user.email}!`, 'success');
          }
          this.syncAllWithCloud(true);
        }
      } catch (redirErr) {
        console.warn('[Auth] Redirect result info:', redirErr);
        if (redirErr && redirErr.code === 'auth/unauthorized-domain') {
          if (window.app && window.app.showToast) {
            window.app.showToast('Aviso: Autorize o domínio lucasaosf.github.io no console do Firebase para login Google.', 'warning', 8000);
          }
        }
      }

      fb.auth().onAuthStateChanged(async (user) => {
        if (user) {
          this.user = user;
          this.salvarSessaoUsuario(user);
        } else {
          this.verificarUsuarioLocal();
        }
        this.renderAuthUI();

        if (this.user) {
          console.log('[Auth] Usuário autenticado:', this.user.email);
          // Sincronização automática em segundo plano pessoal e do projeto
          this.syncAllWithCloud(true);
          const projAtual = (window.app && window.app.projetoAtivo) || localStorage.getItem('cubagem.projeto_ativo') || 'BR-153';
          this.vincularProjeto(projAtual);
        } else {
          console.log('[Auth] Usuário não conectado.');
          if (typeof this.unsubscribeProject === 'function') {
            this.unsubscribeProject();
            this.unsubscribeProject = null;
          }
        }
      });
    } catch (err) {
      console.warn('Erro ao inicializar Firebase Auth:', err);
      this.renderAuthUI();
    }
  }

  /**
   * Atualiza os elementos visuais de autenticação na interface
   */
  renderAuthUI() {
    const chipBtn = document.getElementById('authHeaderBtn');
    const chipText = document.getElementById('authHeaderText');
    const dot = document.getElementById('authHeaderDot');

    const coverAvatar = document.getElementById('coverAvatarContainer');
    const coverBtn = document.getElementById('coverAcctBtn');

    if (this.user) {
      const nome = this.user.displayName || this.user.email.split('@')[0];
      if (chipText) chipText.textContent = nome.length > 12 ? nome.slice(0, 10) + '..' : nome;
      if (dot) {
        dot.style.display = 'inline-block';
        dot.style.backgroundColor = 'var(--sage)';
      }
      if (chipBtn) {
        chipBtn.classList.add('logged');
        chipBtn.setAttribute('title', `Conectado como ${this.user.email}`);
      }

      if (coverBtn) {
        coverBtn.classList.add('logged');
        coverBtn.setAttribute('title', `Conectado como ${this.user.email}`);
      }
      if (coverAvatar) {
        if (this.user.photoURL) {
          coverAvatar.innerHTML = `<img src="${this.user.photoURL}" alt="Perfil" style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;">`;
        } else {
          const inicial = (this.user.displayName || this.user.email || 'U').charAt(0).toUpperCase();
          coverAvatar.innerHTML = `<span style="font-weight:700;color:var(--gold);font-size:15px;">${inicial}</span>`;
        }
      }
    } else {
      if (chipText) chipText.textContent = 'Entrar';
      if (dot) dot.style.display = 'none';
      if (chipBtn) {
        chipBtn.classList.remove('logged');
        chipBtn.setAttribute('title', 'Entrar com Google ou E-mail');
      }

      if (coverBtn) {
        coverBtn.classList.remove('logged');
        coverBtn.setAttribute('title', 'Entrar com Google ou E-mail');
      }
      if (coverAvatar) {
        coverAvatar.innerHTML = `
          <svg class="ico-avatar" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>
          </svg>
        `;
      }
    }
  }

  /**
   * Abre o modal de autenticação ou perfil
   */
  abrirModalAuth() {
    try {
      if (this.user) {
        // Usuário já conectado: exibe card de perfil e sincronização
        this.exibirPerfilConectado();
      } else {
        // Usuário não conectado: exibe opções de login
        this.exibirFormularioLogin('login');
      }
    } catch (e) {
      console.error('[Auth] Erro ao renderizar tela de autenticação:', e);
      const container = document.getElementById('authModalBody');
      if (container) {
        container.innerHTML = `
          <div style="text-align: center; padding: 20px;">
            <p style="color: var(--ink); margin-bottom: 8px;">Erro ao carregar o formulário de login.</p>
            <button class="btn btn-primary" onclick="app.abrirModalAuth()">Tentar novamente</button>
          </div>
        `;
      }
    }
    const modal = document.getElementById('modalAuth');
    if (modal) modal.classList.add('open');
  }

  fecharModalAuth() {
    const modal = document.getElementById('modalAuth');
    if (modal) modal.classList.remove('open');
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

  exibirPerfilConectado() {
    const container = document.getElementById('authModalBody');
    if (!container || !this.user) return;

    const nome = this.user.displayName || 'Lucas Aøsf';
    const email = this.user.email;
    const photo = this.user.photoURL;
    const isLocal = !!this.user.isLocal;

    container.innerHTML = `
      <div style="text-align: center; margin-bottom: 16px;">
        ${photo ? `<img src="${photo}" style="width: 64px; height: 64px; border-radius: 50%; border: 2px solid var(--gold); margin-bottom: 8px;">` : `<div style="width: 56px; height: 56px; border-radius: 50%; background: var(--surface-2); border: 2px solid var(--gold); margin: 0 auto 8px; display: grid; place-items: center; font-size: 24px; color: var(--gold);">👤</div>`}
        <h4 style="font-family: var(--display); font-size: 1.3rem; margin: 0; color: var(--ink);">${this.escapeHtml(nome)}</h4>
        <div style="font-size: 0.85rem; color: var(--muted);">${this.escapeHtml(email)}</div>
        <div style="margin-top: 6px;">
          <span class="header-chip" style="display: inline-flex;">
            <span class="dot-status" style="background-color: ${isLocal ? 'var(--gold)' : 'var(--sage)'};"></span>
            ${isLocal ? 'Modo Local (Apenas neste aparelho)' : 'Conta Conectada à Nuvem'}
          </span>
        </div>
      </div>

      ${isLocal ? `
        <div style="background: rgba(178, 143, 89, 0.15); border: 1px solid var(--gold); border-radius: 8px; padding: 12px; margin-bottom: 12px; font-size: 0.8rem; line-height: 1.45; color: var(--gold);">
          ⚠️ <strong>Atenção:</strong> Você está no <strong>Modo Local</strong>. Suas medições ficam salvas na memória deste aparelho e <strong>não sincronizam pela nuvem com o PC</strong> até você conectar sua conta oficial Google ou E-mail.
        </div>
        <button class="btn btn-primary btn-block" style="margin-bottom: 10px;" onclick="app.auth.exibirFormularioLogin('login')">
          🔑 Conectar Conta Google ou E-mail
        </button>
      ` : `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button class="btn btn-primary btn-block" onclick="app.auth.enviarTudoParaNuvem()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
            ⬆️ Enviar Todas as Medições deste Aparelho para a Nuvem
          </button>

          <button class="btn btn-outline btn-block" onclick="app.auth.baixarTudoDaNuvemParaAparelho()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            ⬇️ Baixar Medições da Nuvem para este Aparelho
          </button>
        </div>
      `}

      <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 8px;">
        <button class="btn btn-secondary btn-block" onclick="app.compartilharBackup()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          📲 Enviar para o PC via WhatsApp / Arquivo
        </button>

        <button class="btn btn-secondary btn-block" onclick="app.auth.logout()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Sair da Conta (Logout)
        </button>
      </div>

      <div style="font-size: 0.75rem; color: var(--muted); text-align: center; margin-top: 14px; line-height: 1.4;">
        Seus dados permanecem 100% seguros e preservados neste aparelho mesmo offline.
      </div>
    `;
  }

  exibirFormularioLogin(tab = 'login') {
    const container = document.getElementById('authModalBody');
    if (!container) return;

    container.innerHTML = `
      <div style="text-align: center; margin-bottom: 14px;">
        <h4 style="font-family: var(--display); font-size: 1.4rem; color: var(--ink); margin-bottom: 4px;">
          ${tab === 'login' ? 'Acessar sua Conta' : (tab === 'cadastro' ? 'Criar Nova Conta' : 'Recuperar Senha')}
        </h4>
        <p style="font-size: 0.82rem; color: var(--muted);">
          Salve suas cubagens na nuvem e acesse de qualquer celular ou computador.
        </p>
      </div>

      <!-- Banner de Erro/Aviso Dinâmico -->
      <div id="authErrorBox" style="display: none; background: rgba(220,53,69,0.15); border: 1px solid var(--danger); padding: 10px 12px; border-radius: 8px; margin-bottom: 14px; font-size: 0.8rem; color: #ffb3b3; line-height: 1.4;"></div>

      <!-- Botão Google Oficial -->
      <button type="button" id="btnGoogleLogin" class="btn btn-secondary btn-block" style="margin-bottom: 14px; display: flex; align-items: center; justify-content: center; gap: 10px;" onclick="app.auth.loginGoogle()">
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.41 7.34 24 12 24z"/>
          <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.94 0 12s.45 3.84 1.24 5.42l4.04-3.15z"/>
          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.59 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
        </svg>
        <strong>Entrar com o Google</strong>
      </button>

      <div style="display: flex; align-items: center; gap: 10px; margin: 12px 0;">
        <hr style="flex: 1; border: 0; border-top: 1px solid var(--line);">
        <span style="font-size: 0.72rem; color: var(--muted); text-transform: uppercase;">ou com e-mail e senha</span>
        <hr style="flex: 1; border: 0; border-top: 1px solid var(--line);">
      </div>

      <form onsubmit="event.preventDefault(); app.auth.submeterFormularioEmail('${tab}');">
        ${tab === 'cadastro' ? `
          <div class="form-group">
            <label class="form-label" for="authNome">Seu Nome</label>
            <input type="text" id="authNome" class="form-control" placeholder="Lucas Aøsf" required>
          </div>
        ` : ''}

        <div class="form-group">
          <label class="form-label" for="authEmail">E-mail</label>
          <input type="email" id="authEmail" class="form-control" placeholder="seuemail@exemplo.com" required>
        </div>

        ${tab !== 'recuperar' ? `
          <div class="form-group">
            <label class="form-label" for="authSenha">Senha</label>
            <input type="password" id="authSenha" class="form-control" placeholder="Mínimo de 6 caracteres" minlength="6" required>
          </div>
        ` : ''}

        <button type="submit" id="authSubmitBtn" class="btn btn-primary btn-block btn-lg" style="margin-top: 10px;">
          ${tab === 'login' ? 'Entrar na Conta' : (tab === 'cadastro' ? 'Criar Conta Gratuita' : 'Enviar Link de Recuperação')}
        </button>
      </form>

      <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-top: 14px; padding-top: 8px; border-top: 1px solid var(--line);">
        ${tab === 'login' ? `
          <a href="#" onclick="event.preventDefault(); app.auth.exibirFormularioLogin('recuperar');" style="color: var(--muted);">Esqueci a senha</a>
          <a href="#" onclick="event.preventDefault(); app.auth.exibirFormularioLogin('cadastro');" style="color: var(--gold); font-weight: 700;">Não tem conta? Cadastre-se</a>
        ` : `
          <a href="#" onclick="event.preventDefault(); app.auth.exibirFormularioLogin('login');" style="color: var(--gold); font-weight: 700;">Já tem conta? Entrar</a>
        `}
      </div>

      <!-- Atalho de Resgate e Modo Offline Direto -->
      <div style="margin-top: 16px; padding-top: 12px; border-top: 1px dashed var(--line); display: flex; flex-direction: column; gap: 8px;">
        <button type="button" class="btn btn-secondary btn-block" style="font-size: 0.84rem; padding: 10px;" onclick="app.auth.entrarModoLocal('lucasaosf@gmail.com', 'Lucas Aøsf')">
          🌿 Entrar como Lucas Aøsf (Modo Offline)
        </button>
        <button type="button" class="btn btn-outline btn-block" style="font-size: 0.82rem; padding: 8px;" onclick="app.auth.recuperarTodasMedicoesProjeto()">
          📥 Restaurar Medições Salvas na Nuvem
        </button>
      </div>
    `;
  }

  async loginGoogle() {
    if (!navigator.onLine) {
      if (window.app && window.app.showToast) {
        window.app.showToast('Você precisa de internet para fazer login com Google.', 'warning');
      }
      return;
    }

    // Detecção de WebView / Navegadores embutidos em redes sociais
    const ua = navigator.userAgent || '';
    const isWebView = /(FBAN|FBAV|Instagram|WhatsApp|Line|Twitter)/i.test(ua);
    if (isWebView && window.app && window.app.showToast) {
      window.app.showToast('Navegadores embutidos bloqueiam o Google. Abra no Chrome ou use E-mail e Senha abaixo.', 'warning', 7000);
    }

    const btnGoogle = document.getElementById('btnGoogleLogin');
    if (btnGoogle) {
      btnGoogle.disabled = true;
      btnGoogle.innerHTML = '<span>⏳ Conectando ao Google...</span>';
    }

    try {
      const fb = await this.loadFirebase();
      if (!fb) throw new Error('Serviço de autenticação temporariamente indisponível. Verifique sua conexão.');

      const provider = new fb.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      let res = null;
      try {
        res = await fb.auth().signInWithPopup(provider);
      } catch (popupErr) {
        console.warn('[Auth] signInWithPopup falhou, tentando redirect:', popupErr);
        if (popupErr && (
          popupErr.code === 'auth/popup-blocked' ||
          popupErr.code === 'auth/cancelled-popup-request' ||
          popupErr.code === 'auth/popup-closed-by-user' ||
          popupErr.code === 'auth/operation-not-supported-in-this-environment'
        )) {
          await fb.auth().signInWithRedirect(provider);
          return;
        }
        throw popupErr;
      }

      if (res && res.user) {
        this.user = res.user;
        this.salvarSessaoUsuario(res.user);
        this.fecharModalAuth();
        this.renderAuthUI();
        if (window.app && window.app.showToast) {
          window.app.showToast(`Bem-vindo, ${res.user.displayName || res.user.email}!`, 'success');
        }
        this.syncAllWithCloud(true);
      }
    } catch (err) {
      console.error('Erro no login Google:', err);
      this.tratarErroAuth(err);
    } finally {
      if (btnGoogle) {
        btnGoogle.disabled = false;
        btnGoogle.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.41 7.34 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.94 0 12s.45 3.84 1.24 5.42l4.04-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.59 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
          </svg>
          <strong>Entrar com o Google</strong>
        `;
      }
    }
  }

  async submeterFormularioEmail(modo) {
    if (!navigator.onLine) {
      if (window.app && window.app.showToast) {
        window.app.showToast('Conecte-se à internet para entrar ou criar conta.', 'warning');
      }
      return;
    }

    const emailEl = document.getElementById('authEmail');
    const passEl = document.getElementById('authSenha');
    const nomeEl = document.getElementById('authNome');
    const submitBtn = document.getElementById('authSubmitBtn');

    const email = emailEl ? emailEl.value.trim() : '';
    const pass = passEl ? passEl.value : '';
    const nome = nomeEl ? nomeEl.value.trim() : '';

    if (!email) return;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processando...';
    }

    try {
      const fb = await this.loadFirebase();
      if (!fb) throw new Error('Firebase indisponível no momento.');

      if (modo === 'login') {
        try {
          const res = await fb.auth().signInWithEmailAndPassword(email, pass);
          this.user = res.user;
          this.salvarSessaoUsuario(res.user);
          this.fecharModalAuth();
          this.renderAuthUI();
          if (window.app && window.app.showToast) {
            window.app.showToast(`Conectado como ${res.user.email}!`, 'success');
          }
          this.syncAllWithCloud(true);
        } catch (loginErr) {
          // Se a conta não existe ainda, tenta criar automaticamente para não travar o usuário
          if (loginErr && (loginErr.code === 'auth/user-not-found' || loginErr.code === 'auth/invalid-credential')) {
            console.log('[Auth] Tentando criação automática de conta para o e-mail informado...');
            try {
              const resCad = await fb.auth().createUserWithEmailAndPassword(email, pass);
              if (resCad.user) {
                await resCad.user.updateProfile({ displayName: 'Lucas Aøsf' }).catch(() => {});
              }
              this.user = resCad.user;
              this.salvarSessaoUsuario(resCad.user);
              this.fecharModalAuth();
              this.renderAuthUI();
              if (window.app && window.app.showToast) {
                window.app.showToast(`✓ Conta criada e conectada com sucesso como ${resCad.user.email}!`, 'success');
              }
              this.syncAllWithCloud(true);
              return;
            } catch (cadErr) {
              throw loginErr;
            }
          }
          throw loginErr;
        }
      } else if (modo === 'cadastro') {
        const res = await fb.auth().createUserWithEmailAndPassword(email, pass);
        if (nome && res.user) {
          await res.user.updateProfile({ displayName: nome });
        }
        this.user = res.user;
        this.salvarSessaoUsuario(res.user);
        this.fecharModalAuth();
        this.renderAuthUI();
        if (window.app && window.app.showToast) {
          window.app.showToast(`Conta criada com sucesso!`, 'success');
        }
        this.syncAllWithCloud(true);
      } else if (modo === 'recuperar') {
        fb.auth().languageCode = 'pt';
        await fb.auth().sendPasswordResetEmail(email);
        this.fecharModalAuth();
        if (window.app && window.app.showToast) {
          window.app.showToast('Enviamos um e-mail com instruções para redefinir sua senha.', 'info');
        }
      }
    } catch (err) {
      console.error('Erro no formulário de e-mail:', err);
      this.tratarErroAuth(err);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = modo === 'login' ? 'Entrar na Conta' : (modo === 'cadastro' ? 'Criar Conta Gratuita' : 'Enviar Link de Recuperação');
      }
    }
  }

  async logout() {
    try {
      if (typeof this.unsubscribeProject === 'function') {
        try { this.unsubscribeProject(); } catch (e) {}
        this.unsubscribeProject = null;
      }
      if (typeof this.unsubscribeProjectDoc === 'function') {
        try { this.unsubscribeProjectDoc(); } catch (e) {}
        this.unsubscribeProjectDoc = null;
      }
      if (this.fb && this.fb.auth()) {
        await this.fb.auth().signOut().catch(() => {});
      }
      this.user = null;
      try {
        localStorage.removeItem('cubagem.local_user');
        localStorage.removeItem('cubagem.usuario_conectado');
      } catch (e) {}
      this.fecharModalAuth();
      this.renderAuthUI();
      if (window.app && window.app.showToast) {
        window.app.showToast('Você saiu da conta. Seus dados continuam gravados no aparelho.', 'info');
      }
    } catch (err) {
      console.error('Erro ao sair:', err);
    }
  }

  tratarErroAuth(err) {
    let msg = 'Ocorreu um erro na autenticação.';
    const code = err ? err.code : '';
    if (code === 'auth/invalid-email') msg = 'E-mail informado é inválido.';
    else if (code === 'auth/user-not-found') msg = 'Nenhum usuário cadastrado com este e-mail. Crie uma conta no link abaixo.';
    else if (code === 'auth/wrong-password') msg = 'Senha incorreta. Se esqueceu, use "Esqueci a senha".';
    else if (code === 'auth/invalid-credential') msg = 'Credenciais incorretas ou conta inexistente. Verifique a senha ou cadastre-se abaixo.';
    else if (code === 'auth/email-already-in-use') msg = 'Este e-mail já está em uso por outra conta. Faça login ou recupere a senha.';
    else if (code === 'auth/weak-password') msg = 'A senha deve ter no mínimo 6 caracteres.';
    else if (code === 'auth/popup-closed-by-user') msg = 'A janela do Google foi fechada antes de concluir o login.';
    else if (code === 'auth/popup-blocked') msg = 'O navegador bloqueou a janela pop-up do Google. Toque em permitir ou use E-mail.';
    else if (code === 'auth/network-request-failed') msg = 'Sem conexão com a internet ou erro de rede.';
    else if (code === 'auth/unauthorized-domain') {
      msg = 'O domínio lucasaosf.github.io precisa ser autorizado no Console do Firebase (Authentication > Settings > Authorized domains). Use login por E-mail e Senha abaixo enquanto isso!';
    }
    else if (err && err.message) msg = err.message;

    const errBox = document.getElementById('authErrorBox');
    if (errBox) {
      errBox.innerHTML = `⚠️ ${msg}`;
      errBox.style.display = 'block';
    }

    if (window.app && window.app.showToast) {
      window.app.showToast(msg, 'danger', 7000);
    } else {
      alert(msg);
    }
  }

  /**
   * Força o envio de todas as medições salvas no IndexedDB local para a nuvem
   */
  async enviarTudoParaNuvem() {
    if (!this.user || this.user.isLocal) {
      if (window.app && window.app.showToast) {
        window.app.showToast('Para enviar medições para a nuvem, faça login com sua conta Google ou E-mail (Modo Local não grava na nuvem).', 'warning', 7000);
      }
      this.exibirFormularioLogin('login');
      return;
    }
    if (!navigator.onLine) {
      if (window.app && window.app.showToast) {
        window.app.showToast('Conecte-se à internet para enviar dados para a nuvem.', 'warning');
      }
      return;
    }

    if (window.app && window.app.showToast) {
      window.app.showToast('Enviando todas as medições deste aparelho para a nuvem...', 'info');
    }

    try {
      const fb = await this.loadFirebase();
      if (!fb) throw new Error('Firebase indisponível.');
      const firestore = fb.firestore();

      const localRecords = await window.cubagemDB.getAll(false);
      if (!localRecords || localRecords.length === 0) {
        if (window.app && window.app.showToast) {
          window.app.showToast('Nenhuma medição encontrada neste aparelho para enviar.', 'warning');
        }
        return;
      }

      let enviados = 0;
      const userCol = firestore.collection('users').doc(this.user.uid).collection('cubagens');

      for (const rec of localRecords) {
        const cleanRec = this.cleanRecordForFirestore(rec);
        await userCol.doc(rec.id).set(cleanRec);

        const projName = rec.projeto || (window.app && window.app.projetoAtivo) || 'BR-153';
        const projId = this.normalizarProjetoId(projName);
        const recordCompartilhado = this.cleanRecordForFirestore({
          ...cleanRec,
          projeto: projName,
          autorNome: cleanRec.autorNome || this.user.displayName || (this.user.email ? this.user.email.split('@')[0] : 'Campo'),
          autorEmail: cleanRec.autorEmail || this.user.email || '',
          autorUid: cleanRec.autorUid || this.user.uid || '',
          updatedAt: Date.now()
        });
        await firestore.collection('projects').doc(projId).collection('cubagens').doc(rec.id).set(recordCompartilhado);
        enviados++;
      }

      if (window.app && window.app.showToast) {
        window.app.showToast(`✓ Sucesso! ${enviados} medições enviadas para a nuvem. Já estão disponíveis para abrir no seu PC!`, 'success', 8000);
      }
    } catch (err) {
      console.error('[Cloud] Erro ao enviar medições:', err);
      if (window.app && window.app.showToast) {
        window.app.showToast(`Erro ao enviar para nuvem: ${err.message || 'Falha de permissão ou conexão'}`, 'danger', 7000);
      }
    }
  }

  /**
   * Baixa e restaura todas as medições da conta na nuvem (Firestore) para o IndexedDB local
   */
  async baixarTudoDaNuvemParaAparelho() {
    if (!navigator.onLine) {
      if (window.app && window.app.showToast) {
        window.app.showToast('Conecte-se à internet para baixar dados da nuvem.', 'warning');
      }
      return;
    }
    if (!this.user || this.user.isLocal) {
      if (window.app && window.app.showToast) {
        window.app.showToast('Faça login com sua conta Google ou E-mail para resgatar seus dados da nuvem.', 'warning', 7000);
      }
      this.exibirFormularioLogin('login');
      return;
    }

    if (window.app && window.app.showToast) {
      window.app.showToast('Buscando e baixando todas as medições da sua conta na nuvem...', 'info');
    }

    try {
      const fb = await this.loadFirebase();
      if (!fb) throw new Error('Firebase indisponível.');
      const firestore = fb.firestore();

      let totalBaixados = 0;
      const idsJaProcessados = new Set();

      // 1. Busca na coleção pessoal do usuário
      try {
        const snapUser = await firestore.collection('users').doc(this.user.uid).collection('cubagens').get();
        for (const doc of snapUser.docs) {
          const rec = doc.data();
          if (rec && rec.id && !idsJaProcessados.has(rec.id)) {
            idsJaProcessados.add(rec.id);
            await window.cubagemDB.add(rec).catch(() => window.cubagemDB.update(rec));
            totalBaixados++;
          }
        }
      } catch (eUser) {
        console.warn('[Cloud] Erro ao buscar na coleção do usuário:', eUser);
      }

      // 2. Busca em todos os projetos conhecidos (BR-153, Geral, etc.)
      const projetosParaBuscar = new Set(['br_153', 'geral']);
      const projAtual = (window.app && window.app.projetoAtivo) || localStorage.getItem('cubagem.projeto_ativo');
      if (projAtual) projetosParaBuscar.add(this.normalizarProjetoId(projAtual));

      try {
        const localMetas = this.getProjetosMetaLocal();
        Object.keys(localMetas).forEach(k => projetosParaBuscar.add(this.normalizarProjetoId(k)));
      } catch (e) {}

      try {
        const snapProjs = await firestore.collection('projects').get();
        snapProjs.forEach(pDoc => projetosParaBuscar.add(pDoc.id));
      } catch (eProjs) {}

      for (const pId of projetosParaBuscar) {
        try {
          const snapP = await firestore.collection('projects').doc(pId).collection('cubagens').get();
          for (const doc of snapP.docs) {
            const rec = doc.data();
            if (rec && rec.id && !idsJaProcessados.has(rec.id)) {
              idsJaProcessados.add(rec.id);
              await window.cubagemDB.add(rec).catch(() => window.cubagemDB.update(rec));
              totalBaixados++;
            }
          }
        } catch (eP) {
          console.warn(`[Cloud] Erro no projeto ${pId}:`, eP);
        }
      }

      if (window.app) {
        await window.app.autoRepararRegistrosZerados();
        await window.app.atualizarDashboard();
        if (window.app.currentView === 'historico') {
          await window.app.carregarHistorico();
        }
      }

      if (window.app && window.app.showToast) {
        if (totalBaixados > 0) {
          window.app.showToast(`✓ Sucesso! ${totalBaixados} medições resgatadas da nuvem e carregadas no seu aparelho!`, 'success', 8000);
        } else {
          window.app.showToast('Nenhuma medição encontrada na nuvem. Se mediu pelo celular, abra o celular e clique em "Enviar Medições para a Nuvem" ou use "Enviar para PC via WhatsApp".', 'warning', 10000);
        }
      }
    } catch (err) {
      console.error('[Cloud] Erro ao baixar medições:', err);
      if (window.app && window.app.showToast) {
        window.app.showToast(`Erro ao baixar da nuvem: ${err.message || 'Falha de conexão'}`, 'danger', 7000);
      }
    }
  }

  /**
   * Atalho de compatibilidade para restaurar medições da nuvem
   */
  async recuperarTodasMedicoesProjeto(nomeProjeto = 'BR-153') {
    return this.baixarTudoDaNuvemParaAparelho();
  }

  // =========================================================================
  // SINCRONIZAÇÃO BIDIRECIONAL COM O FIRESTORE
  // =========================================================================
  async syncAllWithCloud(silencioso = false) {
    if (!this.user || !navigator.onLine || this.syncing) return;
    this.syncing = true;

    try {
      const fb = await this.loadFirebase();
      if (!fb) return;

      const firestore = fb.firestore();
      const userCol = firestore.collection('users').doc(this.user.uid).collection('cubagens');

      // 1. Obter registros locais
      const localRecords = await window.cubagemDB.getAll(false);
      const localMap = new Map();
      localRecords.forEach((r) => localMap.set(r.id, r));

      // 2. Obter registros da nuvem do usuário
      const snapshot = await userCol.get();
      const cloudMap = new Map();
      snapshot.forEach((doc) => {
        cloudMap.set(doc.id, doc.data());
      });

      let novosDaNuvem = 0;
      let enviadosParaNuvem = 0;

      // 3. Nuvem -> Local (se existir na nuvem e não existir localmente ou for mais recente)
      for (const [id, cloudRec] of cloudMap) {
        const localRec = localMap.get(id);
        const cloudTs = cloudRec.updatedAt || cloudRec.timestamp || 0;
        const localTs = localRec ? (localRec.updatedAt || localRec.timestamp || 0) : 0;

        // Protege dados locais válidos: nunca substitui um registro local volumado por um da nuvem zerado
        if (localRec && (localRec.volumeGeometrico > 0 || (Array.isArray(localRec.toras) && localRec.toras.length > 0))) {
          if (!cloudRec.volumeGeometrico || Number(cloudRec.volumeGeometrico) <= 0) {
            cloudRec.volumeGeometrico = localRec.volumeGeometrico;
            cloudRec.volumeTotal = localRec.volumeTotal || localRec.volumeGeometrico;
          }
          if ((!Array.isArray(cloudRec.toras) || cloudRec.toras.length === 0) && Array.isArray(localRec.toras) && localRec.toras.length > 0) {
            cloudRec.toras = localRec.toras;
          }
        }

        if (!localRec || cloudTs > localTs) {
          await window.cubagemDB.add(cloudRec).catch(() => window.cubagemDB.update(cloudRec));
          novosDaNuvem++;
        }
      }

      // 4. Local -> Nuvem (se existir localmente e não estiver na nuvem ou for mais recente)
      for (const [id, localRec] of localMap) {
        const cloudRec = cloudMap.get(id);
        const localTs = localRec.updatedAt || localRec.timestamp || 0;
        const cloudTs = cloudRec ? (cloudRec.updatedAt || cloudRec.timestamp || 0) : 0;

        if (!cloudRec || localTs > cloudTs) {
          const cleanLocal = this.cleanRecordForFirestore(localRec);
          await userCol.doc(id).set(cleanLocal);
          enviadosParaNuvem++;
        }
      }

      // 5. Sincroniza também com o projeto ativo da equipe
      const projAtual = (window.app && window.app.projetoAtivo) || localStorage.getItem('cubagem.projeto_ativo') || 'BR-153';
      await this.syncProjectWithCloud(projAtual, true);

      await window.app.atualizarDashboard();

      if (!silencioso) {
        window.app.showToast(`Sincronização concluída! (${enviadosParaNuvem} enviados, ${novosDaNuvem} recebidos)`, 'success');
      }
    } catch (err) {
      console.warn('Erro ao sincronizar com Firestore:', err);
      if (!silencioso) {
        window.app.showToast('Erro ao sincronizar com a nuvem.', 'warning');
      }
    } finally {
      this.syncing = false;
    }
  }

  // =========================================================================
  // GESTÃO E SINCRONIZAÇÃO DE PROJETOS COMPARTILHADOS EM EQUIPE
  // =========================================================================

  normalizarProjetoId(nome) {
    if (!nome) return 'br_153';
    return String(nome).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'br_153';
  }

  getProjetosMetaLocal() {
    try {
      return JSON.parse(localStorage.getItem('cubagem.projetos_meta') || '{}');
    } catch (e) {
      return {};
    }
  }

  salvarProjetosMetaLocal(todosMeta) {
    try {
      localStorage.setItem('cubagem.projetos_meta', JSON.stringify(todosMeta));
    } catch (e) {}
  }

  /**
   * Sanitiza objetos para o Firestore, removendo valores undefined que quebram a gravação
   */
  cleanRecordForFirestore(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    try {
      return JSON.parse(JSON.stringify(obj, (key, value) => {
        if (value === undefined) return undefined;
        return value;
      }));
    } catch (e) {
      return obj;
    }
  }

  /**
   * Obtém metadados de autoria e integrantes de um projeto (local + Firestore)
   */
  async obterMetaProjeto(nomeProjeto) {
    const nome = (nomeProjeto || this.projetoVinculado || 'BR-153').trim();
    const projId = this.normalizarProjetoId(nome);
    const localMetas = this.getProjetosMetaLocal();
    let meta = localMetas[projId] || null;

    if (navigator.onLine) {
      try {
        const fb = await this.loadFirebase();
        if (fb) {
          const doc = await fb.firestore().collection('projects').doc(projId).get();
          if (doc.exists) {
            const cloudData = doc.data();
            meta = { ...cloudData, id: projId, nome: cloudData.nome || nome };
            localMetas[projId] = meta;
            this.salvarProjetosMetaLocal(localMetas);
          }
        }
      } catch (e) {
        console.warn('[Auth] Erro ao carregar metadados do projeto da nuvem:', e);
      }
    }

    if (!meta) {
      const isLucas = this.user && this.user.email && this.user.email.toLowerCase() === 'lucasaosf@gmail.com';
      const criadorEmail = isLucas ? 'lucasaosf@gmail.com' : (nome === 'BR-153' ? 'lucasaosf@gmail.com' : ((this.user && this.user.email) ? this.user.email.toLowerCase() : 'lucasaosf@gmail.com'));
      const criadorNome = isLucas ? (this.user.displayName || 'Lucas Aøsf') : (nome === 'BR-153' ? 'Lucas Aøsf' : ((this.user && (this.user.displayName || this.user.email.split('@')[0])) || 'Lucas Aøsf'));
      const criadorUid = isLucas ? this.user.uid : (nome === 'BR-153' ? 'lucas_master' : ((this.user && this.user.uid) || 'lucas_master'));

      const membrosIniciais = [
        {
          email: criadorEmail,
          nome: criadorNome,
          role: 'criador',
          adicionadoEm: Date.now()
        }
      ];
      const membrosEmailsIniciais = [criadorEmail];

      // Se o usuário atual for outro integrante (ex: Micheli), inclui na lista local para não travar o acesso
      if (this.user && this.user.email && this.user.email.toLowerCase() !== criadorEmail.toLowerCase()) {
        const uEmail = this.user.email.toLowerCase();
        membrosIniciais.push({
          email: uEmail,
          nome: this.user.displayName || uEmail.split('@')[0],
          role: 'membro',
          adicionadoEm: Date.now()
        });
        membrosEmailsIniciais.push(uEmail);
      }

      meta = {
        id: projId,
        nome: nome,
        criadorEmail: criadorEmail,
        criadorNome: criadorNome,
        criadorUid: criadorUid,
        criadoEm: Date.now(),
        membros: membrosIniciais,
        membrosEmails: membrosEmailsIniciais,
        updatedAt: Date.now()
      };
      localMetas[projId] = meta;
      this.salvarProjetosMetaLocal(localMetas);

      if (this.user && navigator.onLine) {
        this.salvarMetaProjetoNuvem(meta).catch(() => {});
      }
    } else {
      if (!Array.isArray(meta.membros)) meta.membros = [];
      if (!Array.isArray(meta.membrosEmails)) meta.membrosEmails = [];

      // Se for Lucas Aøsf e projeto padrão sem criador explícito, assume autoria oficial
      if (this.user && this.user.email && this.user.email.toLowerCase() === 'lucasaosf@gmail.com') {
        if (!meta.criadorEmail || meta.criadorEmail === 'lucas_master') {
          meta.criadorEmail = 'lucasaosf@gmail.com';
          meta.criadorNome = this.user.displayName || 'Lucas Aøsf';
          meta.criadorUid = this.user.uid;
        }
      }
    }

    return meta;
  }

  async salvarMetaProjetoNuvem(meta) {
    if (!meta || !meta.id || !navigator.onLine) return;
    try {
      const fb = await this.loadFirebase();
      if (!fb) return;
      const cleanMeta = this.cleanRecordForFirestore(meta);
      await fb.firestore().collection('projects').doc(meta.id).set(cleanMeta, { merge: true });
      console.log(`[Cloud] Metadados do projeto "${meta.id}" atualizados na nuvem.`);
    } catch (e) {
      console.warn('[Auth] Erro ao salvar meta do projeto no Firestore:', e);
      if (e && (e.code === 'permission-denied' || String(e).includes('permission-denied')) && window.app) {
        window.app.showToast('⚠️ Permissão negada no Firestore: configure as Regras de Segurança no Firebase Console para autorizar "projects".', 'danger', 9000);
      }
    }
  }

  isUsuarioCriador(meta, user = this.user) {
    if (!meta) return true;

    // Lucas Aøsf é o desenvolvedor e criador principal da BIOKURI
    if (user && user.email && user.email.toLowerCase() === 'lucasaosf@gmail.com') {
      return true;
    }
    if (user && user.displayName && user.displayName.toLowerCase().includes('lucas')) {
      return true;
    }

    if (user && meta.criadorUid && user.uid && meta.criadorUid === user.uid) {
      return true;
    }
    if (user && meta.criadorEmail && user.email && meta.criadorEmail.toLowerCase() === user.email.toLowerCase()) {
      return true;
    }

    // Se não há usuário conectado, modo local no aparelho de Lucas
    if (!user) {
      return meta.criadorEmail === 'lucasaosf@gmail.com' || !meta.criadorEmail;
    }

    return false;
  }

  isUsuarioMembroAutorizado(meta, user = this.user) {
    if (!meta) return true;
    if (this.isUsuarioCriador(meta, user)) return true;
    if (!user) return true;

    const userEmail = (user.email || '').toLowerCase();
    const userNome = (user.displayName || '').toLowerCase();

    if (Array.isArray(meta.membrosEmails) && meta.membrosEmails.some(e => (e || '').toLowerCase() === userEmail)) {
      return true;
    }

    if (Array.isArray(meta.membros)) {
      return meta.membros.some(m => {
        const mEmail = (m.email || '').toLowerCase();
        const mNome = (m.nome || '').toLowerCase();
        return (userEmail && mEmail === userEmail) || (userNome && mNome === userNome);
      });
    }

    return false;
  }

  /**
   * Adiciona uma nova conta ao projeto. EXCLUSIVO para o criador do projeto.
   */
  async adicionarMembroAoProjeto(nomeProjeto, email, nome = '') {
    const nomeP = (nomeProjeto || this.projetoVinculado || 'BR-153').trim();
    const meta = await this.obterMetaProjeto(nomeP);

    if (!this.isUsuarioCriador(meta, this.user)) {
      const dono = meta.criadorNome || meta.criadorEmail || 'o criador';
      throw new Error(`Somente ${dono} (criador do projeto) tem permissão para adicionar contas de integrantes.`);
    }

    const emailLimpo = String(email || '').trim().toLowerCase();
    if (!emailLimpo) {
      throw new Error('Informe o e-mail da conta do integrante.');
    }

    const nomeLimpo = String(nome || '').trim() || emailLimpo.split('@')[0];

    if (!Array.isArray(meta.membros)) meta.membros = [];
    if (!Array.isArray(meta.membrosEmails)) meta.membrosEmails = [];

    const jaExiste = meta.membros.some(m => (m.email && m.email.toLowerCase() === emailLimpo));
    if (jaExiste) {
      throw new Error(`A conta "${emailLimpo}" já está cadastrada como integrante deste projeto.`);
    }

    const novoMembro = {
      email: emailLimpo,
      nome: nomeLimpo,
      role: 'membro',
      adicionadoEm: Date.now(),
      adicionadoPor: (this.user && this.user.email) || 'Lucas Aøsf'
    };

    meta.membros.push(novoMembro);
    if (!meta.membrosEmails.includes(emailLimpo)) {
      meta.membrosEmails.push(emailLimpo);
    }
    meta.updatedAt = Date.now();

    const localMetas = this.getProjetosMetaLocal();
    localMetas[meta.id] = meta;
    this.salvarProjetosMetaLocal(localMetas);

    await this.salvarMetaProjetoNuvem(meta);
    return { success: true, membro: novoMembro, meta };
  }

  /**
   * Remove uma conta do projeto. EXCLUSIVO para o criador do projeto.
   */
  async removerMembroDoProjeto(nomeProjeto, emailRemover) {
    const nomeP = (nomeProjeto || this.projetoVinculado || 'BR-153').trim();
    const meta = await this.obterMetaProjeto(nomeP);

    if (!this.isUsuarioCriador(meta, this.user)) {
      throw new Error('Somente o criador do projeto pode remover integrantes.');
    }

    const emailLimpo = String(emailRemover || '').trim().toLowerCase();
    if (emailLimpo === (meta.criadorEmail || '').toLowerCase()) {
      throw new Error('O criador do projeto não pode ser removido.');
    }

    meta.membros = (meta.membros || []).filter(m => (m.email || '').toLowerCase() !== emailLimpo);
    meta.membrosEmails = (meta.membrosEmails || []).filter(e => (e || '').toLowerCase() !== emailLimpo);
    meta.updatedAt = Date.now();

    const localMetas = this.getProjetosMetaLocal();
    localMetas[meta.id] = meta;
    this.salvarProjetosMetaLocal(localMetas);

    await this.salvarMetaProjetoNuvem(meta);
    return { success: true, meta };
  }

  /**
   * Registra a autoria do projeto para o usuário atual
   */
  async reivindicarCriacaoProjeto(nomeProjeto) {
    const nomeP = (nomeProjeto || this.projetoVinculado || 'BR-153').trim();
    const meta = await this.obterMetaProjeto(nomeP);

    const userEmail = (this.user && this.user.email) ? this.user.email.toLowerCase() : 'lucasaosf@gmail.com';
    const userNome = (this.user && (this.user.displayName || this.user.email.split('@')[0])) ? (this.user.displayName || this.user.email.split('@')[0]) : 'Lucas Aøsf';
    const userUid = (this.user && this.user.uid) ? this.user.uid : 'lucas_master';

    meta.criadorEmail = userEmail;
    meta.criadorNome = userNome;
    meta.criadorUid = userUid;
    meta.updatedAt = Date.now();

    if (!Array.isArray(meta.membros)) meta.membros = [];
    if (!Array.isArray(meta.membrosEmails)) meta.membrosEmails = [];

    const idx = meta.membros.findIndex(m => (m.email || '').toLowerCase() === userEmail);
    if (idx >= 0) {
      meta.membros[idx].role = 'criador';
      meta.membros[idx].nome = userNome;
    } else {
      meta.membros.unshift({
        email: userEmail,
        nome: userNome,
        role: 'criador',
        adicionadoEm: Date.now()
      });
    }

    if (!meta.membrosEmails.includes(userEmail)) {
      meta.membrosEmails.unshift(userEmail);
    }

    const localMetas = this.getProjetosMetaLocal();
    localMetas[meta.id] = meta;
    this.salvarProjetosMetaLocal(localMetas);

    await this.salvarMetaProjetoNuvem(meta);
    return { success: true, meta };
  }

  async vincularProjeto(nomeProjeto) {
    const nome = (nomeProjeto || 'BR-153').trim();
    this.projetoVinculado = nome;
    const projId = this.normalizarProjetoId(nome);

    if (typeof this.unsubscribeProject === 'function') {
      try { this.unsubscribeProject(); } catch (e) {}
      this.unsubscribeProject = null;
    }
    if (typeof this.unsubscribeProjectDoc === 'function') {
      try { this.unsubscribeProjectDoc(); } catch (e) {}
      this.unsubscribeProjectDoc = null;
    }

    const meta = await this.obterMetaProjeto(nome);

    // Validação de segurança: se logado, valida se tem acesso
    if (this.user) {
      const autorizado = this.isUsuarioMembroAutorizado(meta, this.user);
      if (!autorizado) {
        console.warn(`[Cloud] Usuário ${this.user.email} não autorizado no projeto ${nome}.`);
        if (window.app && window.app.showToast) {
          window.app.showToast(`⛔ Acesso restrito ao projeto "${nome}". Solicite autorização ao criador (${meta.criadorNome || meta.criadorEmail}).`, 'danger', 6000);
        }
        return;
      }
    }

    if (!this.user || !navigator.onLine) return;

    try {
      const fb = await this.loadFirebase();
      if (!fb) return;
      const firestore = fb.firestore();

      // Escuta metadados do projeto em tempo real (adição/remoção de integrantes pelo criador)
      this.unsubscribeProjectDoc = firestore
        .collection('projects')
        .doc(projId)
        .onSnapshot((doc) => {
          if (doc.exists) {
            const cloudMeta = doc.data();
            const localMetas = this.getProjetosMetaLocal();
            localMetas[projId] = { ...cloudMeta, id: projId, nome: cloudMeta.nome || nome };
            this.salvarProjetosMetaLocal(localMetas);

            if (window.app) {
              if (typeof window.app.atualizarUIProjeto === 'function') {
                window.app.atualizarUIProjeto();
              }
              const modalProj = document.getElementById('modalProjeto');
              if (modalProj && modalProj.classList.contains('open') && typeof window.app.renderizarSecaoMembrosProjeto === 'function') {
                window.app.renderizarSecaoMembrosProjeto(nome);
              }
            }
          }
        }, (err) => {
          console.warn('[Cloud] Erro no listener do doc do projeto:', err);
        });

      // Inicia escuta em tempo real para as medições compartilhadas
      this.unsubscribeProject = firestore
        .collection('projects')
        .doc(projId)
        .collection('cubagens')
        .onSnapshot(async (snapshot) => {
          let novos = 0;
          for (const change of snapshot.docChanges()) {
            const data = change.doc.data();
            if (change.type === 'added' || change.type === 'modified') {
              const localRec = await window.cubagemDB.get(data.id);
              const cloudTs = data.updatedAt || data.timestamp || 0;
              const localTs = localRec ? (localRec.updatedAt || localRec.timestamp || 0) : 0;
              if (!localRec || cloudTs > localTs) {
                await window.cubagemDB.add(data).catch(() => window.cubagemDB.update(data));
                novos++;
              }
            }
          }
          if (novos > 0 && window.app) {
            console.log(`[Cloud] ${novos} medições sincronizadas no projeto "${nome}"!`);
            await window.app.atualizarDashboard();
            if (window.app.currentView === 'historico') {
              await window.app.carregarHistorico();
            }
            window.app.showToast(`📥 ${novos} medições da equipe recebidas no projeto ${nome}!`, 'info');
          }
        }, (err) => {
          console.warn('[Cloud] Erro no listener em tempo real do projeto:', err);
        });

      // Executa sincronização completa do projeto em segundo plano
      await this.syncProjectWithCloud(nome, true);
    } catch (err) {
      console.warn('[Cloud] Erro ao vincular projeto:', err);
    }
  }

  async syncProjectWithCloud(nomeProjeto, silencioso = false, forcarEnvioLocal = false) {
    if (!this.user || !navigator.onLine) {
      if (!silencioso && window.app) {
        if (!navigator.onLine) {
          window.app.showToast('Sem conexão de internet no momento.', 'warning');
        } else if (!this.user) {
          window.app.showToast('Faça login para sincronizar o projeto com a equipe.', 'info');
          if (typeof window.app.abrirModalAuth === 'function') window.app.abrirModalAuth();
        }
      }
      return;
    }

    const nome = (nomeProjeto || this.projetoVinculado || 'BR-153').trim();
    const projId = this.normalizarProjetoId(nome);

    try {
      const fb = await this.loadFirebase();
      if (!fb) return;
      const firestore = fb.firestore();

      // 0. Sincroniza metadados do projeto primeiro (garante criador e integrantes na nuvem)
      const metaLocal = await this.obterMetaProjeto(nome);
      if (metaLocal) {
        try {
          const cleanMeta = this.cleanRecordForFirestore(metaLocal);
          await firestore.collection('projects').doc(projId).set(cleanMeta, { merge: true });
        } catch (mErr) {
          console.warn('[Cloud] Erro ao sincronizar metadados do projeto:', mErr);
        }
      }

      const projCol = firestore.collection('projects').doc(projId).collection('cubagens');

      // 1. Obter medições locais deste projeto
      const localRecords = await window.cubagemDB.getAll(false);
      const registrosDoProjeto = localRecords.filter(r => {
        if (!r.projeto) return true; // vincula registros não tipados ao projeto atual
        return this.normalizarProjetoId(r.projeto) === projId;
      });

      const localMap = new Map();
      registrosDoProjeto.forEach(r => localMap.set(r.id, r));

      // 2. Obter medições da nuvem do projeto
      const snapshot = await projCol.get();
      const cloudMap = new Map();
      snapshot.forEach(doc => cloudMap.set(doc.id, doc.data()));

      let novosDaNuvem = 0;
      let enviadosParaNuvem = 0;

      // 3. Nuvem -> Local (recebe dados inseridos por outros membros)
      for (const [id, cloudRec] of cloudMap) {
        const localRec = localMap.get(id);
        const cloudTs = cloudRec.updatedAt || cloudRec.timestamp || 0;
        const localTs = localRec ? (localRec.updatedAt || localRec.timestamp || 0) : 0;

        if (!localRec || cloudTs > localTs) {
          await window.cubagemDB.add(cloudRec).catch(() => window.cubagemDB.update(cloudRec));
          novosDaNuvem++;
        }
      }

      // 4. Local -> Nuvem (envia dados medidos localmente)
      for (const [id, localRec] of localMap) {
        const cloudRec = cloudMap.get(id);
        const localTs = localRec.updatedAt || localRec.timestamp || 0;
        const cloudTs = cloudRec ? (cloudRec.updatedAt || cloudRec.timestamp || 0) : 0;

        if (forcarEnvioLocal || !cloudRec || localTs > cloudTs) {
          const recProj = this.cleanRecordForFirestore({
            ...localRec,
            projeto: nome,
            autorNome: localRec.autorNome || this.user.displayName || (this.user.email ? this.user.email.split('@')[0] : 'Campo'),
            autorEmail: localRec.autorEmail || this.user.email || '',
            autorUid: localRec.autorUid || this.user.uid || '',
            updatedAt: Date.now()
          });
          await projCol.doc(id).set(recProj);
          enviadosParaNuvem++;
        }
      }

      if (window.app) {
        await window.app.atualizarDashboard();
        if (window.app.currentView === 'historico') await window.app.carregarHistorico();
      }

      if (!silencioso && window.app) {
        window.app.showToast(`✓ Projeto ${nome} sincronizado com a equipe! (${enviadosParaNuvem} enviados, ${novosDaNuvem} recebidos)`, 'success');
      }
    } catch (err) {
      console.warn('[Cloud] Erro ao sincronizar projeto com nuvem:', err);
      const isPerm = err && (err.code === 'permission-denied' || String(err).includes('permission-denied') || String(err).includes('insufficient permissions'));
      if (!silencioso && window.app) {
        if (isPerm) {
          window.app.showToast(`⚠️ Permissão negada no Firebase: É necessário autorizar a coleção 'projects' nas Regras de Segurança do Firebase Console.`, 'danger', 9000);
        } else {
          window.app.showToast(`Não foi possível sincronizar o projeto "${nome}": ${err.message || err.code || 'Erro de conexão'}`, 'warning', 6000);
        }
      }
    }
  }

  /**
   * Salva um registro diretamente na nuvem (chamado após salvar localmente)
   */
  async syncRecordToCloud(record) {
    if (!this.user || !navigator.onLine) return;
    try {
      const fb = await this.loadFirebase();
      if (!fb) return;
      const firestore = fb.firestore();

      const cleanRec = this.cleanRecordForFirestore(record);

      // 1. Grava no backup pessoal do usuário
      await firestore.collection('users').doc(this.user.uid).collection('cubagens').doc(record.id).set(cleanRec);

      // 2. Grava na coleção compartilhada do projeto
      const projName = record.projeto || (window.app && window.app.projetoAtivo) || 'BR-153';
      const projId = this.normalizarProjetoId(projName);

      const recordCompartilhado = this.cleanRecordForFirestore({
        ...cleanRec,
        projeto: projName,
        autorNome: cleanRec.autorNome || this.user.displayName || (this.user.email ? this.user.email.split('@')[0] : 'Campo'),
        autorEmail: cleanRec.autorEmail || this.user.email || '',
        autorUid: cleanRec.autorUid || this.user.uid || '',
        updatedAt: Date.now()
      });

      await firestore.collection('projects').doc(projId).collection('cubagens').doc(record.id).set(recordCompartilhado);
      console.log(`[Cloud] Medição ${record.id} compartilhada com a equipe no projeto "${projName}"!`);
    } catch (err) {
      console.warn('[Auth] Não foi possível enviar registro para nuvem no momento:', err);
    }
  }

  /**
   * Remove um registro da nuvem (chamado após exclusão local)
   */
  async deleteRecordFromCloud(id, projeto) {
    if (!this.user || !navigator.onLine) return;
    try {
      const fb = await this.loadFirebase();
      if (!fb) return;
      const firestore = fb.firestore();

      await firestore.collection('users').doc(this.user.uid).collection('cubagens').doc(id).delete();

      const projName = projeto || (window.app && window.app.projetoAtivo) || 'BR-153';
      const projId = this.normalizarProjetoId(projName);
      await firestore.collection('projects').doc(projId).collection('cubagens').doc(id).delete();

      console.log('[Auth] Registro removido da nuvem:', id);
    } catch (err) {
      console.warn('[Auth] Não foi possível remover da nuvem no momento:', err);
    }
  }
}

window.CubagemAuth = CubagemAuth;
