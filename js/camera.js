/**
 * camera.js - Sistema de Captura Fotográfica, Timestamp, Coordenadas UTM e Marca d'Água
 * Cubagem Florestal — Pesquisa & Soluções Ambientais
 * Desenvolvido por Lucas Aøsf
 */

class CubagemCamera {
  constructor() {
    this.stream = null;
    this.currentCapturedImage = null; // HTMLImageElement ou ImageBitmap temporário
    this.tempRawDataUrl = null;
    this.liveGpsWatcher = null;

    // Coordenadas e UTM atuais
    this.currentLat = null;
    this.currentLon = null;
    this.currentUtm = null;
    this.gpsAccuracy = null;
    this.gpsStatus = 'Buscando sinal GPS...';

    // Imagens de marcas d'água pré-carregadas (base64 ou caminho)
    this.presetsWatermark = {
      caruso: 'icons/logo-caruso.png',
      pesquisa: 'icons/logo-verde.png'
    };
    this.customWatermarkBase64 = null;

    // Configurações persistentes
    this.config = {
      watermarkPreset: 'caruso', // 'caruso' | 'pesquisa' | 'custom' | 'none'
      watermarkOpacity: 0.95,
      watermarkPos: 'bottom-left', // 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
      textPos: 'bottom-right',     // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
      legendaPersistente: 'BR 153 KM 37 + 150 Norte\nRetirada de material lenhoso'
    };

    this.carregarPreferencias();
  }

  // =========================================================================
  // CÁLCULO E CONVERSÃO MATEMÁTICA DE LAT/LON PARA UTM (WGS84 / SIRGAS2000)
  // =========================================================================
  latLonToUtm(lat, lon) {
    if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) {
      return null;
    }

    const a = 6378137.0; // Raio equatorial (WGS84)
    const f = 1.0 / 298.257223563;
    const b = a * (1.0 - f);
    const e2 = (a * a - b * b) / (a * a); // excentricidade ao quadrado
    const ep2 = (a * a - b * b) / (b * b);
    const k0 = 0.9996; // Fator de escala da linha central

    const zone = Math.floor((lon + 180.0) / 6.0) + 1;
    const lon0 = (zone - 1) * 6 - 180 + 3; // Meridiano central em graus
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

    const hemisphere = lat >= 0 ? 'N' : 'S';
    if (lat < 0) {
      y += 10000000.0; // False Northing para o hemisfério sul
    }

    // Banda de latitude (C a X, omitindo I e O)
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
      hemisphere,
      easting,
      northing,
      formatted: `UTM ${zone}${bandLetter} ${easting}mE ${northing}mN`,
      short: `${zone}${bandLetter} ${easting} ${northing}`
    };
  }

  // =========================================================================
  // GESTÃO DE PREFERÊNCIAS E PERSISTÊNCIA DA LEGENDA
  // =========================================================================
  carregarPreferencias() {
    try {
      const leg = localStorage.getItem('cubagem.v1.camera.legenda');
      if (leg !== null) this.config.legendaPersistente = leg;

      const wm = localStorage.getItem('cubagem.v1.camera.watermarkPreset');
      if (wm) this.config.watermarkPreset = wm;

      const op = localStorage.getItem('cubagem.v1.camera.watermarkOpacity');
      if (op) this.config.watermarkOpacity = parseFloat(op) || 0.95;

      const wmPos = localStorage.getItem('cubagem.v1.camera.watermarkPos');
      if (wmPos) this.config.watermarkPos = wmPos;

      const txtPos = localStorage.getItem('cubagem.v1.camera.textPos');
      if (txtPos) this.config.textPos = txtPos;

      const customLogo = localStorage.getItem('cubagem.v1.camera.customLogo');
      if (customLogo) this.customWatermarkBase64 = customLogo;
    } catch (e) {
      console.warn('Erro ao carregar preferências de câmera:', e);
    }
  }

  salvarPreferencias() {
    try {
      localStorage.setItem('cubagem.v1.camera.legenda', this.config.legendaPersistente);
      localStorage.setItem('cubagem.v1.camera.watermarkPreset', this.config.watermarkPreset);
      localStorage.setItem('cubagem.v1.camera.watermarkOpacity', String(this.config.watermarkOpacity));
      localStorage.setItem('cubagem.v1.camera.watermarkPos', this.config.watermarkPos);
      localStorage.setItem('cubagem.v1.camera.textPos', this.config.textPos);
      if (this.customWatermarkBase64) {
        localStorage.setItem('cubagem.v1.camera.customLogo', this.customWatermarkBase64);
      }
    } catch (e) {
      console.warn('Erro ao salvar preferências de câmera:', e);
    }
  }

  // =========================================================================
  // GEOLOCALIZAÇÃO E COORDENADAS EM TEMPO REAL
  // =========================================================================
  iniciarMonitoramentoGPS() {
    if (!('geolocation' in navigator)) {
      this.gpsStatus = 'GPS não suportado neste aparelho';
      this.atualizarStatusGpsUI();
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000
    };

    const onSuccess = (pos) => {
      this.currentLat = pos.coords.latitude;
      this.currentLon = pos.coords.longitude;
      this.gpsAccuracy = Math.round(pos.coords.accuracy);
      this.currentUtm = this.latLonToUtm(this.currentLat, this.currentLon);
      this.gpsStatus = `GPS Conectado (± ${this.gpsAccuracy}m)`;
      this.atualizarStatusGpsUI();
      this.recarimbarPreviaSeAberta();
    };

    const onError = (err) => {
      console.warn('Erro GPS:', err.message);
      if (!this.currentUtm) {
        this.gpsStatus = 'Aguardando permissão / sinal de satélite';
      }
      this.atualizarStatusGpsUI();
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError, options);

    if (this.liveGpsWatcher === null) {
      this.liveGpsWatcher = navigator.geolocation.watchPosition(onSuccess, onError, options);
    }
  }

  pararMonitoramentoGPS() {
    if (this.liveGpsWatcher !== null) {
      navigator.geolocation.clearWatch(this.liveGpsWatcher);
      this.liveGpsWatcher = null;
    }
  }

  atualizarStatusGpsUI() {
    const el = document.getElementById('cameraGpsStatusText');
    const badge = document.getElementById('cameraGpsBadge');
    if (!el) return;

    if (this.currentUtm) {
      el.textContent = `${this.currentUtm.formatted} (± ${this.gpsAccuracy || 5}m)`;
      if (badge) {
        badge.style.backgroundColor = 'var(--sage)';
        badge.style.color = '#FFFFFF';
      }
    } else {
      el.textContent = this.gpsStatus;
      if (badge) {
        badge.style.backgroundColor = 'var(--gold)';
        badge.style.color = '#FFFFFF';
      }
    }
  }

  // =========================================================================
  // GESTÃO DO MODAL DE CÂMERA
  // =========================================================================
  abrirCameraModal() {
    const modal = document.getElementById('modalCamera');
    if (!modal) return;

    // Atualiza número da plaqueta no cabeçalho
    const plaquetaInput = document.getElementById('cubPlaqueta');
    const plaquetaVal = plaquetaInput ? plaquetaInput.value.trim() : '';
    const numEl = document.getElementById('cameraPlaquetaNum');
    if (numEl) numEl.textContent = plaquetaVal ? `#${plaquetaVal}` : '(Sem Plaqueta)';

    // Preenche campos de configuração
    const txtLegenda = document.getElementById('cameraLegendaInput');
    if (txtLegenda) txtLegenda.value = this.config.legendaPersistente;

    const selWm = document.getElementById('cameraWmPreset');
    if (selWm) selWm.value = this.config.watermarkPreset;

    const rngOp = document.getElementById('cameraWmOpacity');
    const txtOp = document.getElementById('cameraWmOpacityVal');
    if (rngOp) rngOp.value = Math.round(this.config.watermarkOpacity * 100);
    if (txtOp) txtOp.textContent = `${Math.round(this.config.watermarkOpacity * 100)}%`;

    const selWmPos = document.getElementById('cameraWmPosition');
    if (selWmPos) selWmPos.value = this.config.watermarkPos;

    const selTxtPos = document.getElementById('cameraTextPosition');
    if (selTxtPos) selTxtPos.value = this.config.textPos;

    // Reseta visualização para modo Live ou Prévia
    document.getElementById('cameraLiveContainer').style.display = 'block';
    document.getElementById('cameraPreviewContainer').style.display = 'none';
    document.getElementById('btnDispararFoto').style.display = 'inline-flex';
    document.getElementById('btnConfirmarFoto').style.display = 'none';
    document.getElementById('btnRepetirFoto').style.display = 'none';

    modal.classList.add('open');

    this.iniciarMonitoramentoGPS();
    this.iniciarCameraStream();
  }

  fecharCameraModal() {
    this.pararCameraStream();
    const modal = document.getElementById('modalCamera');
    if (modal) modal.classList.remove('open');
  }

  async iniciarCameraStream() {
    const video = document.getElementById('cameraVideoFeed');
    if (!video) return;

    try {
      if (this.stream) {
        this.stream.getTracks().forEach((t) => t.stop());
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      video.srcObject = this.stream;
      await video.play();
    } catch (err) {
      console.warn('Acesso direto à câmera indisponível ou recusado:', err);
      // Se a câmera direta falhar, alterna automaticamente para upload de arquivo
      const alertEl = document.getElementById('cameraStreamError');
      if (alertEl) alertEl.style.display = 'block';
    }
  }

  pararCameraStream() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    const video = document.getElementById('cameraVideoFeed');
    if (video) video.srcObject = null;
  }

  // =========================================================================
  // CAPTURA DA FOTO (VIA WEBCAM OU VIA INPUT DE ARQUIVO)
  // =========================================================================
  dispararCaptura() {
    const video = document.getElementById('cameraVideoFeed');
    if (!video || !video.videoWidth) {
      // Se vídeo não estiver ativo, aciona o seletor de arquivo nativo
      document.getElementById('cameraFileInput').click();
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    this.tempRawDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    this.pararCameraStream();

    this.processarPreviaComCarimbo();
  }

  processarArquivoSelecionado(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.tempRawDataUrl = e.target.result;
      this.pararCameraStream();
      this.processarPreviaComCarimbo();
    };
    reader.readAsDataURL(file);
    // Limpa o input para permitir selecionar o mesmo arquivo se quiser
    event.target.value = '';
  }

  // =========================================================================
  // MOTOR DE CARIMBO (WATERMARK, DATA/HORA, UTM E LEGENDA NO CANVAS)
  // =========================================================================
  async carimbarFoto(rawImgSrc) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = async () => {
        try {
          // Limita resolução proporcional para não travar a memória (max 1600px de largura/altura)
          let targetW = img.width;
          let targetH = img.height;
          const maxDim = 1600;

          if (targetW > maxDim || targetH > maxDim) {
            if (targetW >= targetH) {
              targetH = Math.round((targetH * maxDim) / targetW);
              targetW = maxDim;
            } else {
              targetW = Math.round((targetW * maxDim) / targetH);
              targetH = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');

          // 1. Desenha a imagem capturada
          ctx.drawImage(img, 0, 0, targetW, targetH);

          // 2. Desenha a Marca d'Água (se habilitada)
          await this.desenharMarcaDagua(ctx, targetW, targetH);

          // 3. Desenha o Bloco de Informações (Data/Hora, UTM, Legenda)
          this.desenharBlocoTimestamp(ctx, targetW, targetH);

          // 4. Exporta JPEG com alta qualidade
          const finalDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(finalDataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = (e) => reject(e);
      img.src = rawImgSrc;
    });
  }

  async desenharMarcaDagua(ctx, width, height) {
    const preset = this.config.watermarkPreset;
    if (preset === 'none') return;

    let src = '';
    if (preset === 'custom' && this.customWatermarkBase64) {
      src = this.customWatermarkBase64;
    } else if (preset === 'pesquisa') {
      src = this.presetsWatermark.pesquisa;
    } else {
      src = this.presetsWatermark.caruso;
    }

    if (!src) return;

    return new Promise((resolve) => {
      const wmImg = new Image();
      wmImg.crossOrigin = 'anonymous';
      wmImg.onload = () => {
        // Proporção do logotipo: ~20% a 24% da largura da imagem
        const targetWmWidth = Math.round(width * 0.22);
        const aspect = wmImg.width / wmImg.height;
        const targetWmHeight = Math.round(targetWmWidth / aspect);

        const padding = Math.round(width * 0.02); // 2% de margem da borda
        let x = padding;
        let y = height - targetWmHeight - padding;

        const pos = this.config.watermarkPos;
        if (pos === 'bottom-left') {
          x = padding;
          y = height - targetWmHeight - padding;
        } else if (pos === 'bottom-right') {
          x = width - targetWmWidth - padding;
          y = height - targetWmHeight - padding;
        } else if (pos === 'top-left') {
          x = padding;
          y = padding;
        } else if (pos === 'top-right') {
          x = width - targetWmWidth - padding;
          y = padding;
        }

        ctx.save();
        ctx.globalAlpha = Math.min(1.0, Math.max(0.1, this.config.watermarkOpacity));
        ctx.drawImage(wmImg, x, y, targetWmWidth, targetWmHeight);
        ctx.restore();
        resolve();
      };
      wmImg.onerror = () => {
        console.warn('Não foi possível carregar a imagem da marca dágua:', src);
        resolve();
      };
      wmImg.src = src;
    });
  }

  desenharBlocoTimestamp(ctx, width, height) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dataHoraStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    // Coordenadas UTM
    let utmStr = this.currentUtm ? this.currentUtm.formatted : 'UTM: Aguardando sinal GPS';

    // Plaqueta se informada
    const plaquetaInput = document.getElementById('cubPlaqueta');
    const plaqueta = plaquetaInput ? plaquetaInput.value.trim() : '';

    // Monta as linhas de texto
    const lines = [];
    lines.push(dataHoraStr);
    lines.push(utmStr);

    if (plaqueta) {
      lines.push(`Plaqueta: ${plaqueta}`);
    }

    // Legenda personalizada
    if (this.config.legendaPersistente) {
      const legLinhas = this.config.legendaPersistente.split('\n');
      for (const l of legLinhas) {
        if (l.trim()) lines.push(l.trim());
      }
    }

    // Configurações tipográficas (estilo Timestamp Camera)
    const fontSize = Math.max(16, Math.round(width * 0.028));
    const lineHeight = Math.round(fontSize * 1.32);
    ctx.font = `700 ${fontSize}px 'Jost', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    ctx.textBaseline = 'bottom';

    const padding = Math.round(width * 0.022); // Margem da borda
    const pos = this.config.textPos;

    let isRight = pos === 'bottom-right' || pos === 'top-right';
    let isTop = pos === 'top-left' || pos === 'top-right';

    ctx.textAlign = isRight ? 'right' : 'left';
    const startX = isRight ? width - padding : padding;

    // Calcula posição Y inicial
    const totalTextHeight = lines.length * lineHeight;
    let startY = 0;

    if (isTop) {
      startY = padding + lineHeight;
    } else {
      startY = height - padding - totalTextHeight + lineHeight;
    }

    // Efeito de sombra e contorno para 100% de legibilidade
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = Math.round(fontSize * 0.35);
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.12));
    ctx.lineJoin = 'round';

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      const y = isTop ? startY + i * lineHeight : startY + i * lineHeight;

      // Desenha contorno preto e preenchimento branco
      ctx.strokeText(lineText, startX, y);
      ctx.fillText(lineText, startX, y);
    }

    ctx.restore();
  }

  // =========================================================================
  // PRÉVIA E CONFIRMAÇÃO
  // =========================================================================
  async processarPreviaComCarimbo() {
    if (!this.tempRawDataUrl) return;

    try {
      const stampedDataUrl = await this.carimbarFoto(this.tempRawDataUrl);

      const previewImg = document.getElementById('cameraPreviewImg');
      if (previewImg) previewImg.src = stampedDataUrl;

      document.getElementById('cameraLiveContainer').style.display = 'none';
      document.getElementById('cameraPreviewContainer').style.display = 'block';

      document.getElementById('btnDispararFoto').style.display = 'none';
      document.getElementById('btnConfirmarFoto').style.display = 'inline-flex';
      document.getElementById('btnRepetirFoto').style.display = 'inline-flex';
    } catch (err) {
      console.error('Erro ao carimbar foto:', err);
      window.app.showToast('Erro ao processar imagem.', 'danger');
    }
  }

  recarimbarPreviaSeAberta() {
    const previewContainer = document.getElementById('cameraPreviewContainer');
    if (previewContainer && previewContainer.style.display === 'block' && this.tempRawDataUrl) {
      this.processarPreviaComCarimbo();
    }
  }

  repetirFoto() {
    this.tempRawDataUrl = null;
    document.getElementById('cameraPreviewContainer').style.display = 'none';
    document.getElementById('cameraLiveContainer').style.display = 'block';

    document.getElementById('btnDispararFoto').style.display = 'inline-flex';
    document.getElementById('btnConfirmarFoto').style.display = 'none';
    document.getElementById('btnRepetirFoto').style.display = 'none';

    this.iniciarCameraStream();
  }

  confirmarEUsarFoto() {
    const previewImg = document.getElementById('cameraPreviewImg');
    if (!previewImg || !previewImg.src) return;

    const dataUrl = previewImg.src;
    const plaquetaInput = document.getElementById('cubPlaqueta');
    const plaqueta = plaquetaInput ? plaquetaInput.value.trim() : '';

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dataHoraStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    // Vincula a foto à sessão ativa de cubagem de tora
    window.app.definirFotoToraAtiva({
      dataUrl,
      plaqueta,
      utm: this.currentUtm ? this.currentUtm.formatted : 'UTM: Não registrado',
      dataHora: dataHoraStr,
      legenda: this.config.legendaPersistente
    });

    this.salvarPreferencias();
    this.fecharCameraModal();
    window.app.showToast('Foto com carimbo oficial anexada à tora!', 'success');
  }

  // =========================================================================
  // ATUALIZAÇÃO DINÂMICA DE CONFIGURAÇÕES VIA UI DO MODAL
  // =========================================================================
  onAlterarLegenda(val) {
    this.config.legendaPersistente = val;
    this.salvarPreferencias();
    this.recarimbarPreviaSeAberta();
  }

  onAlterarWmPreset(val) {
    this.config.watermarkPreset = val;
    this.salvarPreferencias();

    const uploadBtn = document.getElementById('btnUploadCustomWm');
    if (uploadBtn) {
      uploadBtn.style.display = val === 'custom' ? 'inline-block' : 'none';
    }

    this.recarimbarPreviaSeAberta();
  }

  onAlterarWmOpacity(val) {
    this.config.watermarkOpacity = parseInt(val, 10) / 100;
    const txt = document.getElementById('cameraWmOpacityVal');
    if (txt) txt.textContent = `${val}%`;
    this.salvarPreferencias();
    this.recarimbarPreviaSeAberta();
  }

  onAlterarWmPos(val) {
    this.config.watermarkPos = val;
    this.salvarPreferencias();
    this.recarimbarPreviaSeAberta();
  }

  onAlterarTextPos(val) {
    this.config.textPos = val;
    this.salvarPreferencias();
    this.recarimbarPreviaSeAberta();
  }

  processarUploadLogoCustomizado(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.customWatermarkBase64 = e.target.result;
      this.config.watermarkPreset = 'custom';
      this.salvarPreferencias();
      window.app.showToast('Logotipo personalizado carregado com sucesso!', 'info');
      this.recarimbarPreviaSeAberta();
    };
    reader.readAsDataURL(file);
  }
}

window.CubagemCamera = CubagemCamera;
