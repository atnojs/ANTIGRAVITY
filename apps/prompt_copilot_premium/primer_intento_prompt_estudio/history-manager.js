class HistoryManager {
  constructor(namespace, endpoint = 'history.php') {
    if (!/^[a-z0-9_-]{3,64}$/i.test(namespace)) {
      throw new Error('El nombre del historial no es válido.');
    }
    this.namespace = namespace;
    this.endpoint = endpoint;
    this.items = [];
  }

  async request(action, payload = {}) {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        action,
        namespace: this.namespace,
        ...payload
      })
    });

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error('El servidor devolvió una respuesta no válida.');
    }

    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'No se pudo completar la operación de historial.');
    }

    return data;
  }

  async load() {
    const data = await this.request('load');
    this.items = Array.isArray(data.items) ? data.items : [];
    return this.items;
  }

  async save(item) {
    const data = await this.request('save', { item });
    this.items = Array.isArray(data.items) ? data.items : this.items;
    return data.item;
  }

  async delete(id) {
    const data = await this.request('delete', { id });
    this.items = Array.isArray(data.items) ? data.items : this.items.filter((item) => item.id !== id);
    return true;
  }

  async clear() {
    const data = await this.request('clear');
    this.items = Array.isArray(data.items) ? data.items : [];
    return true;
  }
}
