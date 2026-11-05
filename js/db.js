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

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

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
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('Erro ao abrir IndexedDB:', event.target.error);
        reject(event.target.error);
      };
    });
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
      const tx = this.db.transaction(['cubagens'], 'readwrite');
      const store = tx.objectStore('cubagens');
      const req = store.add(record);

      req.onsuccess = () => resolve(record);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async update(record) {
    await this.init();
    record.updatedAt = Date.now();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['cubagens'], 'readwrite');
      const store = tx.objectStore('cubagens');
      const req = store.put(record);

      req.onsuccess = () => resolve(record);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async delete(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['cubagens'], 'readwrite');
      const store = tx.objectStore('cubagens');
      const req = store.delete(id);

      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async get(id) {
    await this.init();
    return new Promise((resolve, reject) => {
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
      const tx = this.db.transaction(['cubagens'], 'readonly');
      const store = tx.objectStore('cubagens');
      const req = store.getAll();

      req.onsuccess = () => {
        const list = req.result || [];
        list.sort((a, b) => {
          const tA = a.timestamp || 0;
          const tB = b.timestamp || 0;
          return sortDesc ? tB - tA : tA - tB;
        });
        resolve(list);
      };
      req.onerror = (e) => reject(e.target.error);
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

    let totalVolume = 0;
    let todayCount = 0;
    let todayVolume = 0;

    let totalCaminhoes = 0;
    let totalPilhas = 0;
    let totalToras = 0;

    let volCaminhoes = 0;
    let volPilhas = 0;
    let volToras = 0;

    for (const item of all) {
      const vol = Number(item.volumeGeometrico) || 0;
      totalVolume += vol;
      const t = item.tipo || 'caminhao';

      if (t === 'caminhao') {
        totalCaminhoes++;
        volCaminhoes += vol;
      } else if (t === 'pilha') {
        totalPilhas++;
        volPilhas += vol;
      } else if (t === 'tora') {
        totalToras++;
        volToras += vol;
      }

      if (item.data === todayStr) {
        todayCount++;
        todayVolume += vol;
      }
    }

    return {
      totalCount: all.length,
      totalVolume,
      todayCount,
      todayVolume,
      totalCaminhoes,
      totalPilhas,
      totalToras,
      volCaminhoes,
      volPilhas,
      volToras,
      averageVolume: all.length > 0 ? totalVolume / all.length : 0,
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
