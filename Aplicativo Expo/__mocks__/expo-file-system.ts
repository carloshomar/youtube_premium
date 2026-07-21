type CreateOptions = { intermediates?: boolean; idempotent?: boolean; overwrite?: boolean };

const store = new Map<string, { kind: 'dir' | 'file'; content?: string }>();

function joinUri(...parts: string[]): string {
  return parts
    .map((p, i) => (i === 0 ? p.replace(/\/$/, '') : p.replace(/^\//, '').replace(/\/$/, '')))
    .filter(Boolean)
    .join('/');
}

function ensureParent(uri: string) {
  const parent = uri.replace(/\/[^/]+$/, '');
  if (parent && parent !== uri && !store.has(parent)) {
    store.set(parent, { kind: 'dir' });
  }
}

export class Paths {
  static get document() {
    return { uri: 'file:///mock-document' };
  }
  static get cache() {
    return { uri: 'file:///mock-cache' };
  }
}

export class Directory {
  uri: string;
  constructor(...uris: Array<string | { uri: string } | Directory | File>) {
    const parts = uris.map((u) => (typeof u === 'string' ? u : u.uri));
    this.uri = joinUri(...parts);
  }

  get exists() {
    return store.has(this.uri) && store.get(this.uri)!.kind === 'dir';
  }

  create(_options?: CreateOptions) {
    store.set(this.uri, { kind: 'dir' });
  }
}

export class File {
  uri: string;
  constructor(...uris: Array<string | { uri: string } | Directory | File>) {
    const parts = uris.map((u) => (typeof u === 'string' ? u : u.uri));
    this.uri = joinUri(...parts);
  }

  get exists() {
    return store.has(this.uri) && store.get(this.uri)!.kind === 'file';
  }

  get name() {
    return this.uri.split('/').pop() ?? '';
  }

  create(_options?: CreateOptions) {
    ensureParent(this.uri);
    store.set(this.uri, { kind: 'file', content: '' });
  }

  write(content: string) {
    ensureParent(this.uri);
    store.set(this.uri, { kind: 'file', content });
  }

  delete() {
    store.delete(this.uri);
  }

  move(destination: File) {
    const entry = store.get(this.uri);
    if (!entry || entry.kind !== 'file') {
      throw new Error(`File not found: ${this.uri}`);
    }
    ensureParent(destination.uri);
    store.set(destination.uri, { ...entry });
    store.delete(this.uri);
  }

  async text() {
    const entry = store.get(this.uri);
    if (!entry || entry.kind !== 'file') {
      throw new Error(`File not found: ${this.uri}`);
    }
    return entry.content ?? '';
  }

  static async downloadFileAsync(
    _url: string,
    destination: Directory | File,
    _options?: { idempotent?: boolean }
  ) {
    if (destination instanceof File) {
      destination.write('sqlite-bytes');
      return destination;
    }
    const file = new File(destination, 'downloaded.sqlite');
    file.write('sqlite-bytes');
    return file;
  }
}

/** Test helper */
export function __resetMockFileSystem() {
  store.clear();
  store.set('file:///mock-document', { kind: 'dir' });
}

export function __mockFsStore() {
  return store;
}
