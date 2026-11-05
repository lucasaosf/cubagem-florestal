/**
 * db.js - Camada de persistência local 100% offline via IndexedDB
 * Cubagem Florestal
 */

class CubagemDB {
  constructor() {
    this.dbName = 'CubagemFlorestalDB';
    this.version = 1;
    this.db = null;
  }

  /**
   * Inicializa o banco IndexedDB
   */
  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store para os registros de cubagem
        if (!db.objectStoreNames.contains('cubagens')) {
          const store = db.createObjectStore('cubagens', { keyPath: 'id' });
          store.createIndex('data', 'data', { unique: false });
          store.createIndex('rodovia', 'rodovia', { unique: false });
          store.createIndex('responsavel', 'responsavel', { unique: false });
          store.createIndex('placa', 'placa', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Store para configurações do usuário
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

  /**
   * Gera um ID único e legível para a cubagem
   */
  generateId() {
    const now = new Date();
    const pad = (n, len = 2) => String(n).padStart(len, '0');
    const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const rand = Math.floor(Math.random() * 900 + 100);
    return `CUB-${dateStr}-${timeStr}-${rand}`;
  }

  /**
   * Salva uma nova cubagem
   */
  async add(record) {
    await this.init();
    if (!record.id) {
      record.id = this.generateId();
    }
    if (!record.timestamp) {
      record.timestamp = Date.now();
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['cubagens'], 'readwrite');
      const store = tx.objectStore('cubagens');
      const req = store.add(record);

      req.onsuccess = () => resolve(record);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Atualiza uma cubagem existente
   */
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

  /**
   * Remove uma cubagem por ID
   */
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

  /**
   * Obtém uma cubagem por ID
   */
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

  /**
   * Retorna todas as cubagens ordenadas por data/timestamp desc
   */
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

  /**
   * Filtra cubagens por intervalo de datas (inclusive)
   */
  async getByDateRange(startDateStr, endDateStr) {
    const all = await this.getAll(false);
    return all.filter((item) => {
      if (!item.data) return false;
      return item.data >= startDateStr && item.data <= endDateStr;
    });
  }

  /**
   * Busca registros por múltiplos campos
   */
  async search(query) {
    const all = await this.getAll(true);
    if (!query || !query.trim()) return all;

    const term = query.toLowerCase().trim();
    return all.filter((item) => {
      return (
        (item.rodovia && item.rodovia.toLowerCase().includes(term)) ||
        (item.responsavel && item.responsavel.toLowerCase().includes(term)) ||
        (item.placa && item.placa.toLowerCase().includes(term)) ||
        (item.km && String(item.km).toLowerCase().includes(term)) ||
        (item.data && item.data.includes(term)) ||
        (item.observacoes && item.observacoes.toLowerCase().includes(term)) ||
        (item.id && item.id.toLowerCase().includes(term))
      );
    });
  }

  /**
   * Retorna estatísticas para o painel inicial
   */
  async getStats() {
    const all = await this.getAll(true);
    const todayStr = new Date().toISOString().slice(0, 10);

    let totalVolume = 0;
    let todayCount = 0;
    let todayVolume = 0;

    for (const item of all) {
      const vol = Number(item.volumeGeometrico) || 0;
      totalVolume += vol;
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
      averageVolume: all.length > 0 ? totalVolume / all.length : 0,
      recentItems: all.slice(0, 5)
    };
  }

  /**
   * Salva uma configuração
   */
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

  /**
   * Lê uma configuração
   */
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

  /**
   * Gera arquivo JSON para backup completo
   */
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
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      totalRecords: cubagens.length,
      data: {
        cubagens,
        settings
      }
    };
  }

  /**
   * Importa dados de backup com validação
   */
  async importBackup(backupJson, mode = 'merge') {
    await this.init();

    if (!backupJson || !backupJson.data || !Array.isArray(backupJson.data.cubagens)) {
      throw new Error('Arquivo de backup inválido ou incompatível.');
    }

    const newCubagens = backupJson.data.cubagens;

    // Validação mínima de cada item
    for (const item of newCubagens) {
      if (!item.id || !item.data || item.volumeGeometrico === undefined) {
        throw new Error('O backup contém registros corrompidos ou mal formatados.');
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

    // Importar settings se existirem
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

// Instância singleton global
window.cubagemDB = new CubagemDB();
