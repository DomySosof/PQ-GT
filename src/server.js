const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const dbPath = process.env.DB_PATH || '/app/data/iva.db';
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Init / Migrate database
const hasUsuarios = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='usuarios'").get();
const hasOldConfig = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='config'").get();

if (!hasUsuarios && !hasOldConfig) {
  db.exec(`CREATE TABLE usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL UNIQUE)`);
  db.exec(`CREATE TABLE config (id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER UNIQUE, salario_minimo REAL DEFAULT 4002.28, multiplo INTEGER DEFAULT 125, tasa_iva REAL DEFAULT 0.05, limite_anual REAL DEFAULT 500285, color_ingresos TEXT DEFAULT '#4f46e5', color_retenciones TEXT DEFAULT '#f59e0b', color_acumulado TEXT DEFAULT '#10b981', color_limite TEXT DEFAULT '#ef4444', tipo_grafico TEXT DEFAULT 'bar', fondo_grafico TEXT DEFAULT '#ffffff')`);
  db.exec(`CREATE TABLE meses (id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER, nombre TEXT NOT NULL, orden INTEGER NOT NULL, saldo_inicial REAL DEFAULT 0, ingresos REAL DEFAULT 0, compra_gastos REAL DEFAULT 0, retenciones REAL DEFAULT 0, impuesto REAL DEFAULT 0, total_pagar REAL DEFAULT 0, acumulado REAL DEFAULT 0, alerta TEXT DEFAULT 'OK', UNIQUE(usuario_id, nombre))`);
  db.prepare('INSERT INTO usuarios (id, nombre) VALUES (1, \'Usuario\')').run();
  const cfg = db.prepare('INSERT INTO config (usuario_id, salario_minimo, multiplo, tasa_iva, limite_anual) VALUES (1, 4002.28, 125, 0.05, 500285)').run();
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const stmt = db.prepare('INSERT INTO meses (usuario_id, nombre, orden, ingresos, retenciones) VALUES (?, ?, ?, 0, 0)');
  months.forEach((m, i) => { stmt.run(1, m, i + 1); });
} else if (hasOldConfig && !hasUsuarios) {
  db.exec(`CREATE TABLE usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL UNIQUE)`);
  db.prepare('INSERT INTO usuarios (id, nombre) VALUES (1, \'Usuario\')').run();
  db.exec(`ALTER TABLE config ADD COLUMN usuario_id INTEGER DEFAULT 1`);
  db.exec(`ALTER TABLE meses ADD COLUMN usuario_id INTEGER DEFAULT 1`);
  db.exec(`ALTER TABLE meses ADD COLUMN saldo_inicial REAL DEFAULT 0`);
  db.exec(`ALTER TABLE meses ADD COLUMN compra_gastos REAL DEFAULT 0`);
  db.prepare('UPDATE config SET usuario_id = 1').run();
  db.prepare('UPDATE meses SET usuario_id = 1').run();
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const stmt = db.prepare('INSERT INTO meses (usuario_id, nombre, orden, ingresos, retenciones) VALUES (?, ?, ?, 0, 0)');
  months.forEach((m, i) => { stmt.run(1, m, i + 1); });
} else if (hasUsuarios && !hasOldConfig) {
  db.exec(`CREATE TABLE config (id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER UNIQUE, salario_minimo REAL DEFAULT 4002.28, multiplo INTEGER DEFAULT 125, tasa_iva REAL DEFAULT 0.05, limite_anual REAL DEFAULT 500285, color_ingresos TEXT DEFAULT '#4f46e5', color_retenciones TEXT DEFAULT '#f59e0b', color_acumulado TEXT DEFAULT '#10b981', color_limite TEXT DEFAULT '#ef4444', tipo_grafico TEXT DEFAULT 'bar', fondo_grafico TEXT DEFAULT '#ffffff')`);
  db.exec(`CREATE TABLE meses (id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER, nombre TEXT NOT NULL, orden INTEGER NOT NULL, saldo_inicial REAL DEFAULT 0, ingresos REAL DEFAULT 0, compra_gastos REAL DEFAULT 0, retenciones REAL DEFAULT 0, impuesto REAL DEFAULT 0, total_pagar REAL DEFAULT 0, acumulado REAL DEFAULT 0, alerta TEXT DEFAULT 'OK', UNIQUE(usuario_id, nombre))`);
  const users = db.prepare('SELECT id FROM usuarios').all();
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  users.forEach(u => {
    db.prepare('INSERT INTO config (usuario_id, salario_minimo, multiplo, tasa_iva, limite_anual) VALUES (?, 4002.28, 125, 0.05, 500285)').run(u.id);
    const stmt = db.prepare('INSERT INTO meses (usuario_id, nombre, orden, ingresos, retenciones) VALUES (?, ?, ?, 0, 0)');
    months.forEach((m, i) => { stmt.run(u.id, m, i + 1); });
  });
} else if (hasUsuarios) {
  const cols = db.prepare("PRAGMA table_info(meses)").all().map(c => c.name);
  if (!cols.includes('saldo_inicial')) { db.exec(`ALTER TABLE meses ADD COLUMN saldo_inicial REAL DEFAULT 0`); }
  if (!cols.includes('compra_gastos')) { db.exec(`ALTER TABLE meses ADD COLUMN compra_gastos REAL DEFAULT 0`); }
  if (!cols.includes('usuario_id')) {
    db.exec(`ALTER TABLE meses ADD COLUMN usuario_id INTEGER DEFAULT 1`);
    db.exec(`ALTER TABLE config ADD COLUMN usuario_id INTEGER DEFAULT 1`);
  }
}

function ensureMonths(usuario_id) {
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  months.forEach((m, i) => {
    const exists = db.prepare('SELECT id FROM meses WHERE usuario_id = ? AND nombre = ?').get(usuario_id, m);
    if (!exists) {
      db.prepare('INSERT INTO meses (usuario_id, nombre, orden, ingresos, retenciones) VALUES (?, ?, ?, 0, 0)').run(usuario_id, m, i + 1);
    }
  });
}

function getActiveUser() {
  const row = db.prepare('SELECT * FROM usuarios ORDER BY id ASC LIMIT 1').get();
  return row || { id: 1, nombre: 'Usuario' };
}

function getUsers() {
  return db.prepare('SELECT id, nombre FROM usuarios ORDER BY nombre').all();
}

function addUser(nombre) {
  try {
    const r = db.prepare('INSERT INTO usuarios (nombre) VALUES (?)').run(nombre);
    const uid = r.lastInsertRowid;
    db.prepare('INSERT INTO config (usuario_id, salario_minimo, multiplo, tasa_iva, limite_anual) VALUES (?, 4002.28, 125, 0.05, 500285)').run(uid);
    ensureMonths(uid);
    return r;
  } catch(e) { return null; }
}

function removeUser(id) {
  db.prepare('DELETE FROM meses WHERE usuario_id = ?').run(id);
  db.prepare('DELETE FROM config WHERE usuario_id = ?').run(id);
  return db.prepare('DELETE FROM usuarios WHERE id = ?').run(id);
}

function getConfig(usuario_id) {
  const uid = usuario_id || getActiveUser().id;
  const row = db.prepare('SELECT * FROM config WHERE usuario_id = ?').get(uid);
  if (row) return row;
  const ncfg = db.prepare('INSERT INTO config (usuario_id, salario_minimo, multiplo, tasa_iva, limite_anual) VALUES (?, 4002.28, 125, 0.05, 500285)').run(uid);
  return db.prepare('SELECT * FROM config WHERE id = ?').get(ncfg.lastInsertRowid);
}

function saveConfig(data, usuario_id) {
  const uid = usuario_id || getActiveUser().id;
  const cfg = getConfig(uid);
  const sal = data.salario_minimo || cfg.salario_minimo;
  const mult = data.multiplo || cfg.multiplo;
  const tasa = data.tasa_iva || cfg.tasa_iva;
  const limi = sal * mult;
  db.prepare('UPDATE config SET salario_minimo = ?, multiplo = ?, tasa_iva = ?, limite_anual = ?, color_ingresos = ?, color_retenciones = ?, color_acumulado = ?, color_limite = ?, tipo_grafico = ?, fondo_grafico = ? WHERE usuario_id = ?').run(
    sal, mult, tasa, limi,
    data.color_ingresos || cfg.color_ingresos,
    data.color_retenciones || cfg.color_retenciones,
    data.color_acumulado || cfg.color_acumulado,
    data.color_limite || cfg.color_limite,
    data.tipo_grafico || cfg.tipo_grafico,
    data.fondo_grafico || cfg.fondo_grafico,
    uid
  );
  return getConfig(uid);
}

function getDatos(usuario_id) {
  const uid = usuario_id || getActiveUser().id;
  return db.prepare('SELECT * FROM meses WHERE usuario_id = ? ORDER BY orden').all(uid);
}

function saveDatos(id, ingresos, compra_gastos, retenciones, saldo_inicial, usuario_id) {
  const uid = usuario_id || getActiveUser().id;
  const cfg = getConfig(uid);
  const imp = +(ingresos * cfg.tasa_iva).toFixed(2);
  const tot = +(Math.max(0, imp - retenciones)).toFixed(2);
  const rows = getDatos(uid);
  let acum = 0;
  for (let r of rows) {
    if (r.id === id) {
      acum += ingresos; r.acumulado = acum; r.ingresos = ingresos; r.compra_gastos = compra_gastos; r.retenciones = retenciones;
      if (saldo_inicial !== undefined && saldo_inicial !== null) r.saldo_inicial = saldo_inicial;
      r.impuesto = imp; r.total_pagar = tot;
    }
    else { acum += r.ingresos; r.acumulado = acum; r.impuesto = +(r.ingresos * cfg.tasa_iva).toFixed(2); r.total_pagar = +(Math.max(0, r.impuesto - r.retenciones)).toFixed(2); }
    r.alerta = r.acumulado > cfg.limite_anual ? 'LIMITE SUPERADO' : 'OK';
    db.prepare('UPDATE meses SET ingresos = ?, compra_gastos = ?, retenciones = ?, saldo_inicial = ?, impuesto = ?, total_pagar = ?, acumulado = ?, alerta = ? WHERE id = ?').run(r.ingresos, r.compra_gastos, r.retenciones, r.saldo_inicial, r.impuesto, r.total_pagar, r.acumulado, r.alerta, r.id);
  }
  return { impuesto: imp, total_pagar: tot, acumulado: rows.filter(r => r.id <= id).reduce((a, r) => a + r.ingresos, 0) };
}

app.get('/api/usuarios', (req, res) => { res.json(getUsers()); });
app.post('/api/usuarios', (req, res) => { const r = addUser(req.body.nombre); res.json(r ? {ok:true, user:{id:r.lastInsertRowid, nombre:req.body.nombre}} : {ok:false,error:'Ya existe'}); });
app.delete('/api/usuarios/:id', (req, res) => { removeUser(parseInt(req.params.id)); res.json({ok:true}); });
app.post('/api/usuarios/activo/:id', (req, res) => { res.json({ok:true, user: getActiveUser()}); });

app.get('/api/config', (req, res) => { res.json(getConfig(req.query.usuario_id)); });
app.put('/api/config', (req, res) => { res.json(saveConfig(req.body, req.body.usuario_id)); });
app.get('/api/datos', (req, res) => { res.json(getDatos(req.query.usuario_id)); });
app.put('/api/datos/:id', (req, res) => { res.json(saveDatos(parseInt(req.params.id), req.body.ingresos, req.body.compra_gastos, req.body.retenciones, req.body.saldo_inicial, req.body.usuario_id)); });
app.post('/api/datos/import', (req, res) => {
  const { salario_minimo, multiplo, tasa_iva, usuario_id, datos } = req.body;
  const cfg = saveConfig({ salario_minimo, multiplo, tasa_iva }, usuario_id);
  ensureMonths(usuario_id);
  if (datos && Array.isArray(datos)) {
    datos.forEach(d => {
      const exists = db.prepare('SELECT id FROM meses WHERE usuario_id = ? AND nombre = ?').get(usuario_id, d.mes);
      if (exists) {
        db.prepare('UPDATE meses SET ingresos = ?, compra_gastos = ?, retenciones = ?, saldo_inicial = ? WHERE usuario_id = ? AND nombre = ?').run(d.ingresos, d.compra_gastos || 0, d.retenciones || 0, d.saldo_inicial || 0, usuario_id, d.mes);
      } else {
        db.prepare('INSERT INTO meses (usuario_id, nombre, orden, ingresos, compra_gastos, retenciones, saldo_inicial) VALUES (?, ?, ?, ?, ?, ?, ?)').run(usuario_id, d.mes, 0, d.ingresos, d.compra_gastos || 0, d.retenciones || 0, d.saldo_inicial || 0);
      }
    });
    const allRows = getDatos(usuario_id);
    let acum = 0;
    for (let r of allRows) {
      r.impuesto = +(r.ingresos * cfg.tasa_iva).toFixed(2);
      r.total_pagar = +(Math.max(0, r.impuesto - r.retenciones)).toFixed(2);
      acum += r.ingresos;
      r.acumulado = acum;
      r.alerta = r.acumulado > cfg.limite_anual ? 'LIMITE SUPERADO' : 'OK';
      db.prepare('UPDATE meses SET impuesto = ?, total_pagar = ?, acumulado = ?, alerta = ? WHERE id = ?').run(r.impuesto, r.total_pagar, r.acumulado, r.alerta, r.id);
    }
  }
  res.json({ ok: true, config: cfg, datos: getDatos(usuario_id) });
});
app.get('/api/export', (req, res) => {
  const cfg = getConfig(req.query.usuario_id);
  const datos = getDatos(req.query.usuario_id);
  res.json({ config: cfg, datos: datos });
});
app.get('/api/export/csv', (req, res) => {
  const datos = getDatos(req.query.usuario_id);
  let csv = 'Mes,Saldo Inicial,Ingresos,Compras/Gastos,Retenciones IVA,Impuesto Calculado,Total a Pagar,Ingresos Acumulados,Alerta\n';
  datos.forEach(d => { csv += `${d.nombre},${d.saldo_inicial},${d.ingresos},${d.compra_gastos},${d.retenciones},${d.impuesto},${d.total_pagar},${d.acumulado},${d.alerta}\n`; });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=iva_datos.csv');
  res.send(csv);
});
app.get('/api/export/json', (req, res) => {
  const cfg = getConfig(req.query.usuario_id);
  const datos = getDatos(req.query.usuario_id);
  res.json({ salario_minimo: cfg.salario_minimo, multiplo: cfg.multiplo, tasa_iva: cfg.tasa_iva, limite_anual: cfg.limite_anual, datos: datos });
});

app.listen(PORT, '0.0.0.0', () => { console.log(`Server running on port ${PORT}`); });
