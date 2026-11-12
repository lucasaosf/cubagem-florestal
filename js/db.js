/**
 * db.js - Camada de persistência local 100% offline via IndexedDB
 * Cubagem Florestal — Suporte a Caminhões, Pilhas e Toras
 * Desenvolvido por Lucas Aøsf
 */

class CubagemDB {
  constructor() {
    this.dbName = 'CubagemFlorestalDB';
    this.version = 2; // Atualizado para suportar índices de tipo e plaqueta
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;

    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(() => {});
    }

    return new Promise((resolve, reject) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          console.warn('[DB] Timeout ao abrir IndexedDB. Continuando com fallback se disponível...');
          resolve(this.db);
        }
      }, 5000);

      const request = indexedDB.open(this.dbName, this.version);

      request.onblocked = (event) => {
        console.warn('[DB] IndexedDB bloqueado por outra conexão ou aba aberta:', event);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        let store;
        if (!db.objectStoreNames.contains('cubagens')) {
          store = db.createObjectStore('cubagens', { keyPath: 'id' });
        } else {
          store = event.target.transaction.objectStore('cubagens');
        }

        const ensureIndex = (name, key) => {
          if (!store.indexNames.contains(name)) {
            store.createIndex(name, key, { unique: false });
          }
        };

        ensureIndex('data', 'data');
        ensureIndex('tipo', 'tipo');
        ensureIndex('rodovia', 'rodovia');
        ensureIndex('responsavel', 'responsavel');
        ensureIndex('placa', 'placa');
        ensureIndex('plaqueta', 'plaqueta');
        ensureIndex('timestamp', 'timestamp');

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        clearTimeout(timeout);
        resolved = true;
        this.db = event.target.result;

        this.db.onversionchange = () => {
          console.warn('[DB] onversionchange detectado, fechando banco.');
          if (this.db) {
            this.db.close();
            this.db = null;
          }
        };

        resolve(this.db);
      };

      request.onerror = (event) => {
        clearTimeout(timeout);
        resolved = true;
        console.error('Erro ao abrir IndexedDB:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  syncEmergencyBackup() {
    setTimeout(async () => {
      try {
        if (!this.db) return;
        const all = await this.getAll(false);
        if (Array.isArray(all) && all.length > 0) {
          localStorage.setItem('cubagem.emergency_backup', JSON.stringify(all));
        }
      } catch (e) {}
    }, 400);
  }

  generateId(prefix = 'CUB') {
    const now = new Date();
    const pad = (n, len = 2) => String(n).padStart(len, '0');
    const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const rand = Math.floor(Math.random() * 900 + 100);
    return `${prefix}-${dateStr}-${timeStr}-${rand}`;
  }

  async add(record) {
    await this.init();
    if (!record.id) {
      const pfx = record.tipo === 'tora' ? 'TORA' : (record.tipo === 'pilha' ? 'PILHA' : 'CAM');
      record.id = this.generateId(pfx);
    }
    if (!record.timestamp) {
      record.timestamp = Date.now();
    }
    if (!record.tipo) {
      record.tipo = 'caminhao';
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        // Fallback para storage local se DB estiver offline
        try {
          const bkp = JSON.parse(localStorage.getItem('cubagem.emergency_backup') || '[]');
          bkp.unshift(record);
          localStorage.setItem('cubagem.emergency_backup', JSON.stringify(bkp));
          return resolve(record);
        } catch (e) {
          return reject(e);
        }
      }

      const tx = this.db.transaction(['cubagens'], 'readwrite');
      const store = tx.objectStore('cubagens');
      const req = store.add(record);

      req.onsuccess = () => {
        this.syncEmergencyBackup();
        resolve(record);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async update(record) {
    await this.init();
    record.updatedAt = Date.now();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        try {
          const bkp = JSON.parse(localStorage.getItem('cubagem.emergency_backup') || '[]');
          const idx = bkp.findIndex(r => r.id === record.id);
          if (idx >= 0) bkp[idx] = record;
          else bkp.unshift(record);
          localStorage.setItem('cubagem.emergency_backup', JSON.stringify(bkp));
          return resolve(record);
        } catch (e) {
          return reject(e);
        }
      }

      const tx = this.db.transaction(['cubagens'], 'readwrite');
      const store = tx.objectStore('cubagens');
      const req = store.put(record);

      req.onsuccess = () => {
        this.syncEmergencyBackup();
        resolve(record);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async delete(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) {
        try {
          let bkp = JSON.parse(localStorage.getItem('cubagem.emergency_backup') || '[]');
          bkp = bkp.filter(r => r.id !== id);
          localStorage.setItem('cubagem.emergency_backup', JSON.stringify(bkp));
          return resolve(true);
        } catch (e) {
          return reject(e);
        }
      }

      const tx = this.db.transaction(['cubagens'], 'readwrite');
      const store = tx.objectStore('cubagens');
      const req = store.delete(id);

      req.onsuccess = () => {
        this.syncEmergencyBackup();
        resolve(true);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async get(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) {
        try {
          const bkp = JSON.parse(localStorage.getItem('cubagem.emergency_backup') || '[]');
          const it = bkp.find(r => r.id === id);
          return resolve(it || null);
        } catch (e) {
          return resolve(null);
        }
      }

      const tx = this.db.transaction(['cubagens'], 'readonly');
      const store = tx.objectStore('cubagens');
      const req = store.get(id);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async getAll(sortDesc = true) {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) {
        try {
          const bkp = JSON.parse(localStorage.getItem('cubagem.emergency_backup') || '[]');
          bkp.sort((a, b) => {
            const tA = a.timestamp || 0;
            const tB = b.timestamp || 0;
            return sortDesc ? tB - tA : tA - tB;
          });
          return resolve(bkp);
        } catch (e) {
          return resolve([]);
        }
      }

      const tx = this.db.transaction(['cubagens'], 'readonly');
      const store = tx.objectStore('cubagens');
      const req = store.getAll();

      req.onsuccess = () => {
        let list = req.result || [];

        // Auto-recuperação imediata se IndexedDB estiver vazio mas houver backup de emergência
        if (list.length === 0) {
          try {
            const bkp = JSON.parse(localStorage.getItem('cubagem.emergency_backup') || '[]');
            if (Array.isArray(bkp) && bkp.length > 0) {
              console.log(`[DB] Restaurando ${bkp.length} medições do backup de emergência local...`);
              list = bkp;
              setTimeout(() => {
                bkp.forEach(r => this.add(r).catch(() => {}));
              }, 100);
            }
          } catch (e) {}
        } else {
          // Atualiza o backup de emergência sempre que houver dados no banco
          try {
            localStorage.setItem('cubagem.emergency_backup', JSON.stringify(list));
          } catch (e) {}
        }

        list.sort((a, b) => {
          const tA = a.timestamp || 0;
          const tB = b.timestamp || 0;
          return sortDesc ? tB - tA : tA - tB;
        });
        resolve(list);
      };
      req.onerror = (e) => {
        try {
          const bkp = JSON.parse(localStorage.getItem('cubagem.emergency_backup') || '[]');
          resolve(bkp);
        } catch (err) {
          reject(e.target.error);
        }
      };
    });
  }

  async getByDateRange(startDateStr, endDateStr, tipoFiltro = 'todos') {
    const all = await this.getAll(false);
    return all.filter((item) => {
      if (!item.data) return false;
      const dataMatch = item.data >= startDateStr && item.data <= endDateStr;
      if (!dataMatch) return false;
      if (tipoFiltro !== 'todos' && item.tipo !== tipoFiltro) return false;
      return true;
    });
  }

  async search(query, tipoFiltro = 'todos') {
    const all = await this.getAll(true);
    let filtered = all;

    if (tipoFiltro && tipoFiltro !== 'todos') {
      filtered = filtered.filter(i => (i.tipo || 'caminhao') === tipoFiltro);
    }

    if (!query || !query.trim()) return filtered;

    const term = query.toLowerCase().trim();
    return filtered.filter((item) => {
      return (
        (item.rodovia && item.rodovia.toLowerCase().includes(term)) ||
        (item.responsavel && item.responsavel.toLowerCase().includes(term)) ||
        (item.placa && item.placa.toLowerCase().includes(term)) ||
        (item.plaqueta && item.plaqueta.toLowerCase().includes(term)) ||
        (item.identificacao && item.identificacao.toLowerCase().includes(term)) ||
        (item.km && String(item.km).toLowerCase().includes(term)) ||
        (item.data && item.data.includes(term)) ||
        (item.observacoes && item.observacoes.toLowerCase().includes(term)) ||
        (item.id && item.id.toLowerCase().includes(term))
      );
    });
  }

  async getStats() {
    const all = await this.getAll(true);
    const todayStr = new Date().toISOString().slice(0, 10);

    let totalVolumeEntrada = 0; // Pilhas + Toras (Entrada de madeira no pátio)
    let totalVolumeSaida = 0;   // Retirada do Material / Caminhões (Saída de madeira)
    let todayCount = 0;
    let todayVolumeEntrada = 0;
    let todayVolumeSaida = 0;

    let totalCaminhoes = 0;
    let totalPilhas = 0;
    let totalToras = 0;

    let volCaminhoes = 0;
    let volPilhas = 0;
    let volToras = 0;

    for (const item of all) {
      const vol = (window.CubagemCalculator && typeof window.CubagemCalculator.obterVolumeEfetivo === 'function')
        ? window.CubagemCalculator.obterVolumeEfetivo(item)
        : (Number(item.volumeGeometrico) || 0);
      const t = item.tipo || 'caminhao';

      if (t === 'caminhao') {
        totalCaminhoes++;
        volCaminhoes += vol;
        totalVolumeSaida += vol;
        if (item.data === todayStr) {
          todayVolumeSaida += vol;
        }
      } else if (t === 'pilha') {
        totalPilhas++;
        volPilhas += vol;
        totalVolumeEntrada += vol;
        if (item.data === todayStr) {
          todayVolumeEntrada += vol;
        }
      } else if (t === 'tora') {
        totalToras++;
        volToras += vol;
        totalVolumeEntrada += vol;
        if (item.data === todayStr) {
          todayVolumeEntrada += vol;
        }
      }

      if (item.data === todayStr) {
        todayCount++;
      }
    }

    const saldoPatio = totalVolumeEntrada - totalVolumeSaida;
    const totalEntradas = totalPilhas + totalToras;

    return {
      totalCount: all.length,
      // totalVolume representa exclusivamente a CUBAGEM GERAL DE ENTRADA (Pilhas + Toras)
      totalVolume: totalVolumeEntrada,
      totalVolumeEntrada,
      totalVolumeSaida,
      saldoPatio,
      todayCount,
      todayVolume: todayVolumeEntrada,
      todayVolumeEntrada,
      todayVolumeSaida,
      totalCaminhoes,
      totalPilhas,
      totalToras,
      volCaminhoes,
      volPilhas,
      volToras,
      averageVolume: totalEntradas > 0 ? totalVolumeEntrada / totalEntradas : 0,
      recentItems: all.slice(0, 6)
    };
  }

  async setSetting(key, value) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['settings'], 'readwrite');
      const store = tx.objectStore('settings');
      const req = store.put({ key, value });

      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async getSetting(key, defaultValue = null) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['settings'], 'readonly');
      const store = tx.objectStore('settings');
      const req = store.get(key);

      req.onsuccess = () => {
        if (req.result && req.result.value !== undefined) {
          resolve(req.result.value);
        } else {
          resolve(defaultValue);
        }
      };
      req.onerror = () => resolve(defaultValue);
    });
  }

  async exportBackup() {
    const cubagens = await this.getAll(false);
    const settings = await new Promise((resolve) => {
      const tx = this.db.transaction(['settings'], 'readonly');
      const store = tx.objectStore('settings');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    return {
      app: 'Cubagem Florestal',
      version: '2.0.0',
      desenvolvedor: 'Lucas Aøsf',
      exportedAt: new Date().toISOString(),
      totalRecords: cubagens.length,
      data: {
        cubagens,
        settings
      }
    };
  }

  async importBackup(backupJson, mode = 'merge') {
    await this.init();

    if (!backupJson || !backupJson.data || !Array.isArray(backupJson.data.cubagens)) {
      throw new Error('Arquivo de backup inválido ou incompatível.');
    }

    const newCubagens = backupJson.data.cubagens;

    for (const item of newCubagens) {
      if (!item.id || !item.data || item.volumeGeometrico === undefined) {
        throw new Error('O backup contém registros com estrutura corrompida.');
      }
    }

    const tx = this.db.transaction(['cubagens', 'settings'], 'readwrite');
    const cubagensStore = tx.objectStore('cubagens');

    if (mode === 'replace') {
      await new Promise((resolve, reject) => {
        const clearReq = cubagensStore.clear();
        clearReq.onsuccess = () => resolve();
        clearReq.onerror = (e) => reject(e.target.error);
      });
    }

    let importedCount = 0;
    for (const item of newCubagens) {
      await new Promise((resolve, reject) => {
        const req = cubagensStore.put(item);
        req.onsuccess = () => {
          importedCount++;
          resolve();
        };
        req.onerror = (e) => reject(e.target.error);
      });
    }

    if (Array.isArray(backupJson.data.settings)) {
      const settingsStore = tx.objectStore('settings');
      for (const s of backupJson.data.settings) {
        if (s.key) {
          settingsStore.put(s);
        }
      }
    }

    return {
      success: true,
      importedCount,
      mode
    };
  }
}

window.cubagemDB = new CubagemDB();
