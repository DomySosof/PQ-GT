CREATE TABLE IF NOT EXISTS config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  salario_minimo REAL DEFAULT 4002.28,
  multiplo INTEGER DEFAULT 125,
  tasa_iva REAL DEFAULT 0.05,
  limite_anual REAL DEFAULT 500285,
  color_ingresos TEXT DEFAULT '#4f46e5',
  color_retenciones TEXT DEFAULT '#f59e0b',
  color_acumulado TEXT DEFAULT '#10b981',
  color_limite TEXT DEFAULT '#ef4444',
  tipo_grafico TEXT DEFAULT 'bar',
  fondo_grafico TEXT DEFAULT '#ffffff',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  orden INTEGER NOT NULL,
  ingresos REAL DEFAULT 0,
  retenciones REAL DEFAULT 0,
  impuesto REAL DEFAULT 0,
  total_pagar REAL DEFAULT 0,
  acumulado REAL DEFAULT 0,
  alerta TEXT DEFAULT 'OK',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO config (id, salario_minimo, multiplo, tasa_iva, limite_anual) VALUES (1, 4002.28, 125, 0.05, 500285);

INSERT OR IGNORE INTO meses (id, nombre, orden, ingresos, retenciones) VALUES
  (1, 'Enero', 1, 45000, 0),
  (2, 'Febrero', 2, 25000, 250),
  (3, 'Marzo', 3, 85000, 0),
  (4, 'Abril', 4, 12000, 0),
  (5, 'Mayo', 5, 35000, 0),
  (6, 'Junio', 6, 85000, 0),
  (7, 'Julio', 7, 350000, 0),
  (8, 'Agosto', 8, 0, 0),
  (9, 'Septiembre', 9, 0, 0),
  (10, 'Octubre', 10, 0, 0),
  (11, 'Noviembre', 11, 0, 0),
  (12, 'Diciembre', 12, 0, 0);
