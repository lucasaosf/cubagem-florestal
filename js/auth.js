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
  }

  /**
   * Carrega os scripts do Firebase sob demanda
   */
  async loadFirebase() {
    if (this.authPromise) return this.authPromise;

    if (!window.FIREBASE_CONFIG) {
      console.warn('window.FIREBASE_CONFIG não configurado.');
      return null;
    }

    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = () => resolve();
        s.onerror = (e) => reject(e);
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
   * Inicializa o monitoramento de autenticação
   */
  async init() {
    try {
      const fb = await this.loadFirebase();
      if (!fb) {
        this.renderAuthUI();
        return;
      }

      fb.auth().onAuthStateChanged(async (user) => {
        this.user = user || null;
        this.renderAuthUI();

        if (user) {
          console.log('[Auth] Usuário autenticado:', user.email);
          // Sincronização automática em segundo plano
          this.syncAllWithCloud(true);
        } else {
          console.log('[Auth] Usuário não conectado.');
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
    } else {
      if (chipText) chipText.textContent = 'Entrar';
      if (dot) dot.style.display = 'none';
      if (chipBtn) {
        chipBtn.classList.remove('logged');
        chipBtn.setAttribute('title', 'Entrar com Google ou E-mail');
      }
    }
  }

  /**
   * Abre o modal de autenticação ou perfil
   */
  abrirModalAuth() {
    if (this.user) {
      // Usuário já conectado: exibe card de perfil e sincronização
      this.exibirPerfilConectado();
    } else {
      // Usuário não conectado: exibe opções de login
      this.exibirFormularioLogin();
    }
    const modal = document.getElementById('modalAuth');
    if (modal) modal.classList.add('open');
  }

  fecharModalAuth() {
    const modal = document.getElementById('modalAuth');
    if (modal) modal.classList.remove('open');
  }

  exibirPerfilConectado() {
    const container = document.getElementById('authModalBody');
    if (!container || !this.user) return;

    const nome = this.user.displayName || 'Profissional de Campo';
    const email = this.user.email;
    const photo = this.user.photoURL;

    container.innerHTML = `
      <div style="text-align: center; margin-bottom: 16px;">
        ${photo ? `<img src="${photo}" style="width: 64px; height: 64px; border-radius: 50%; border: 2px solid var(--gold); margin-bottom: 8px;">` : `<div style="width: 56px; height: 56px; border-radius: 50%; background: var(--surface-2); border: 2px solid var(--gold); margin: 0 auto 8px; display: grid; place-items: center; font-size: 24px; color: var(--gold);">👤</div>`}
        <h4 style="font-family: var(--display); font-size: 1.3rem; margin: 0; color: var(--ink);">${nome}</h4>
        <div style="font-size: 0.85rem; color: var(--muted);">${email}</div>
        <div style="margin-top: 6px;">
          <span class="header-chip" style="display: inline-flex;">
            <span class="dot-status" style="background-color: var(--sage);"></span>
            Sincronização em Nuvem Ativa
          </span>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 10px;">
        <button class="btn btn-primary btn-block" onclick="app.auth.syncAllWithCloud(false)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
          </svg>
          Sincronizar Dados Agora com a Nuvem
        </button>

        <button class="btn btn-secondary btn-block" onclick="app.auth.logout()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Sair da Conta (Logout)
        </button>
      </div>

      <div style="font-size: 0.75rem; color: var(--muted); text-align: center; margin-top: 14px; line-height: 1.4;">
        Seus dados permanecem salvos localmente neste aparelho mesmo se você sair da conta.
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
          Salve suas cubagens na nuvem e acerte em qualquer celular ou computador.
        </p>
      </div>

      <!-- Botão Google Oficial -->
      <button class="btn btn-secondary btn-block" style="margin-bottom: 14px; display: flex; align-items: center; justify-content: center; gap: 10px;" onclick="app.auth.loginGoogle()">
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
        <span style="font-size: 0.72rem; color: var(--muted); text-transform: uppercase;">ou com e-mail</span>
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

        <button type="submit" class="btn btn-primary btn-block btn-lg" style="margin-top: 10px;">
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
    `;
  }

  async loginGoogle() {
    if (!navigator.onLine) {
      window.app.showToast('Você precisa de internet para fazer login com Google.', 'warning');
      return;
    }

    try {
      const fb = await this.loadFirebase();
      if (!fb) throw new Error('Serviço de autenticação indisponível.');

      const provider = new fb.auth.GoogleAuthProvider();
      const res = await fb.auth().signInWithPopup(provider).catch((err) => {
        if (err && (err.code === 'auth/popup-blocked' || err.code === 'auth/operation-not-supported-in-this-environment')) {
          return fb.auth().signInWithRedirect(provider);
        }
        throw err;
      });

      if (res && res.user) {
        this.user = res.user;
        this.fecharModalAuth();
        window.app.showToast(`Bem-vindo, ${res.user.displayName || res.user.email}!`, 'success');
        this.syncAllWithCloud(true);
      }
    } catch (err) {
      console.error('Erro no login Google:', err);
      this.tratarErroAuth(err);
    }
  }

  async submeterFormularioEmail(modo) {
    if (!navigator.onLine) {
      window.app.showToast('Conecte-se à internet para entrar ou criar conta.', 'warning');
      return;
    }

    const emailEl = document.getElementById('authEmail');
    const passEl = document.getElementById('authSenha');
    const nomeEl = document.getElementById('authNome');

    const email = emailEl ? emailEl.value.trim() : '';
    const pass = passEl ? passEl.value : '';
    const nome = nomeEl ? nomeEl.value.trim() : '';

    if (!email) return;

    try {
      const fb = await this.loadFirebase();
      if (!fb) throw new Error('Firebase indisponível.');

      if (modo === 'login') {
        const res = await fb.auth().signInWithEmailAndPassword(email, pass);
        this.user = res.user;
        this.fecharModalAuth();
        window.app.showToast(`Conectado como ${res.user.email}!`, 'success');
        this.syncAllWithCloud(true);
      } else if (modo === 'cadastro') {
        const res = await fb.auth().createUserWithEmailAndPassword(email, pass);
        if (nome && res.user) {
          await res.user.updateProfile({ displayName: nome });
        }
        this.user = res.user;
        this.fecharModalAuth();
        window.app.showToast(`Conta criada com sucesso!`, 'success');
        this.syncAllWithCloud(true);
      } else if (modo === 'recuperar') {
        fb.auth().languageCode = 'pt';
        await fb.auth().sendPasswordResetEmail(email);
        this.fecharModalAuth();
        window.app.showToast('Enviamos um e-mail com instruções para redefinir sua senha.', 'info');
      }
    } catch (err) {
      console.error('Erro no formulário de e-mail:', err);
      this.tratarErroAuth(err);
    }
  }

  async logout() {
    try {
      if (this.fb && this.fb.auth()) {
        await this.fb.auth().signOut();
      }
      this.user = null;
      this.fecharModalAuth();
      this.renderAuthUI();
      window.app.showToast('Você saiu da conta. Seus dados continuam no aparelho.', 'info');
    } catch (err) {
      console.error('Erro ao sair:', err);
    }
  }

  tratarErroAuth(err) {
    let msg = 'Ocorreu um erro na autenticação.';
    if (err.code === 'auth/invalid-email') msg = 'E-mail informado é inválido.';
    else if (err.code === 'auth/user-not-found') msg = 'Nenhum usuário cadastrado com este e-mail.';
    else if (err.code === 'auth/wrong-password') msg = 'Senha incorreta.';
    else if (err.code === 'auth/email-already-in-use') msg = 'Este e-mail já está em uso por outra conta.';
    else if (err.code === 'auth/weak-password') msg = 'A senha deve ter no mínimo 6 caracteres.';
    else if (err.code === 'auth/popup-closed-by-user') msg = 'A janela do Google foi fechada antes de concluir.';
    else if (err.code === 'auth/network-request-failed') msg = 'Sem conexão com a internet.';
    else if (err.message) msg = err.message;

    window.app.showToast(msg, 'danger');
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

      // 2. Obter registros da nuvem
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
          await userCol.doc(id).set(localRec);
          enviadosParaNuvem++;
        }
      }

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

  /**
   * Salva um registro diretamente na nuvem (chamado após salvar localmente)
   */
  async syncRecordToCloud(record) {
    if (!this.user || !navigator.onLine) return;
    try {
      const fb = await this.loadFirebase();
      if (!fb) return;
      const firestore = fb.firestore();
      await firestore.collection('users').doc(this.user.uid).collection('cubagens').doc(record.id).set(record);
      console.log('[Auth] Registro sincronizado na nuvem:', record.id);
    } catch (err) {
      console.warn('[Auth] Não foi possível enviar registro para nuvem no momento:', err);
    }
  }

  /**
   * Remove um registro da nuvem (chamado após exclusão local)
   */
  async deleteRecordFromCloud(id) {
    if (!this.user || !navigator.onLine) return;
    try {
      const fb = await this.loadFirebase();
      if (!fb) return;
      const firestore = fb.firestore();
      await firestore.collection('users').doc(this.user.uid).collection('cubagens').doc(id).delete();
      console.log('[Auth] Registro removido da nuvem:', id);
    } catch (err) {
      console.warn('[Auth] Não foi possível remover da nuvem no momento:', err);
    }
  }
}

window.CubagemAuth = CubagemAuth;
