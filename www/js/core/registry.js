// Merkezi mod kayıt defteri. Menü ve oyun akışı buradan beslenir; yeni bir mod
// eklemek modes/*.js dosyasını yazıp burada register() çağırmaktan ibarettir.

const modes = new Map();

export function registerMode(mode) {
  const meta = mode.getMeta();
  if (!meta || !meta.id) throw new Error("Mod getMeta() içinde bir 'id' döndürmeli");
  modes.set(meta.id, mode);
  return mode;
}

export function getMode(id) {
  return modes.get(id) || null;
}

export function listModes() {
  return [...modes.values()];
}
