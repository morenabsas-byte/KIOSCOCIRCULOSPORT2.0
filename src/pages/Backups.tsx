// src/pages/Backups.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  exportBackupManual,
  importBackupManual,
  chooseBackupFolder,
  configureAutoBackup,
  getDataPath,
  getWebBackupFolderName,
} from '../utils/db';
import {
  Download,
  Upload,
  FolderOpen,
  Clock,
  RefreshCw,
  Monitor,
  Globe,
  Save,
} from 'lucide-react';

type Mode = 'interval' | 'time';

type UIConfig = {
  enabled: boolean;
  mode: Mode;
  intervalMinutes: number;
  time: string; // "HH:mm"
  folder: string | null;
};

const BACKUP_CONFIG_KEY = 'kiosco-backup-config';

export default function Backups() {
  const isDesktop =
    typeof window !== 'undefined' && !!(window as any).electronAPI;
  const fsAccessSupported =
    typeof window !== 'undefined' &&
    typeof (window as any).showSaveFilePicker === 'function';

  const [folder, setFolder] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<boolean>(false);
  const [mode, setMode] = useState<Mode>('interval');
  const [intervalMinutes, setIntervalMinutes] = useState<number>(60);
  const [time, setTime] = useState<string>('03:00');
  const [dataPath, setDataPath] = useState<string>('...');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // Carga inicial desde localStorage (misma clave que usa utils/db.ts)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(BACKUP_CONFIG_KEY);
      if (raw) {
        const cfg = JSON.parse(raw) as Partial<UIConfig>;
        setEnabled(!!cfg.enabled);
        setMode((cfg.mode as Mode) || 'interval');
        setIntervalMinutes(Number(cfg.intervalMinutes ?? 60));
        setTime((cfg.time as string) || '03:00');
        setFolder(cfg.folder ?? null);
      }
    } catch {
      /* noop */
    }
    // Info útil de entorno
    getDataPath().then(setDataPath).catch(() => setDataPath(''));
    const webFolder = getWebBackupFolderName();
    if (webFolder && !folder) setFolder(webFolder);
  }, []);

  const envLabel = useMemo(
    () => (isDesktop ? 'Desktop (Electron)' : 'Navegador / PWA'),
    [isDesktop]
  );

  const handleChooseFolder = async () => {
    const chosen = await chooseBackupFolder();
    if (chosen) {
      setFolder(chosen);
      setStatus(`Carpeta seleccionada: ${chosen}`);
    }
  };

  const handleExport = async () => {
    setStatus('Exportando backup...');
    try {
      await exportBackupManual();
      setStatus('✅ Backup exportado correctamente.');
    } catch (e) {
      setStatus('❌ Error al exportar el backup.');
    }
  };

  const handleImport = async () => {
    setStatus('Importando backup...');
    try {
      await importBackupManual();
      setStatus('✅ Backup importado. Refrescá la vista si no ves cambios.');
    } catch (e) {
      setStatus('❌ Error al importar el backup.');
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    setStatus('Guardando configuración...');
    const cfg: UIConfig = {
      enabled,
      mode,
      intervalMinutes: Math.max(1, Number(intervalMinutes || 60)),
      time: time || '03:00',
      folder: folder ?? null,
    };
    try {
      // Persistimos nosotros también para que quede espejo con utils/db.ts
      localStorage.setItem(BACKUP_CONFIG_KEY, JSON.stringify(cfg));
      configureAutoBackup({
        enabled: cfg.enabled,
        mode: cfg.mode,
        intervalMinutes: cfg.intervalMinutes,
        time: cfg.time,
        folder: cfg.folder,
      });
      setStatus('✅ Configuración guardada y programada.');
    } catch {
      setStatus('❌ No se pudo guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Backups</h1>
      <p className="text-sm text-gray-600 mb-6">
        Entorno: <span className="font-medium">{envLabel}</span> · Datos: <span className="font-mono">{dataPath}</span>
      </p>

      {/* Exportar / Importar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button
          onClick={handleExport}
          className="flex items-center justify-center gap-2 rounded-2xl shadow px-4 py-3 border hover:shadow-md active:scale-[0.98]"
        >
          <Download size={18} />
          Exportar backup (.json)
        </button>

        <button
          onClick={handleImport}
          className="flex items-center justify-center gap-2 rounded-2xl shadow px-4 py-3 border hover:shadow-md active:scale-[0.98]"
        >
          <Upload size={18} />
          Importar backup (.json)
        </button>
      </div>

      {/* Carpeta destino */}
      <div className="rounded-2xl border p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <FolderOpen size={18} />
          <h2 className="font-medium">Carpeta de destino</h2>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          {isDesktop ? (
            <>Elegí una carpeta local donde guardar los backups automáticos.</>
          ) : fsAccessSupported ? (
            <>Podés seleccionar una carpeta (permiso del navegador) o usar guardado manual al exportar.</>
          ) : (
            <>
              Tu navegador no permite elegir carpeta de forma persistente. Usá la
              exportación manual (descarga) o ejecutá la app en Desktop.
            </>
          )}
        </p>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
          <button
            onClick={handleChooseFolder}
            className="flex items-center gap-2 rounded-xl border px-3 py-2 hover:shadow active:scale-[0.98]"
          >
            <FolderOpen size={16} />
            Elegir carpeta
          </button>
          <span className="text-sm text-gray-700">
            {folder ? `Seleccionada: ${folder}` : 'Ninguna seleccionada'}
          </span>
        </div>
      </div>

      {/* Programación de respaldo */}
      <div className="rounded-2xl border p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={18} />
          <h2 className="font-medium">Backup automático</h2>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="accent-black"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            Activar
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Modo</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              className="border rounded-xl px-3 py-2"
            >
              <option value="interval">Cada X minutos</option>
              <option value="time">A una hora fija</option>
            </select>
          </label>

          {mode === 'interval' ? (
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Intervalo (minutos)</span>
              <input
                type="number"
                min={1}
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                className="border rounded-xl px-3 py-2"
              />
            </label>
          ) : (
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Hora (HH:mm)</span>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="border rounded-xl px-3 py-2"
              />
            </label>
          )}
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl border px-4 py-2 hover:shadow active:scale-[0.98]"
          >
            <Save size={16} />
            Guardar configuración
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {isDesktop ? <Monitor size={16} /> : <Globe size={16} />}
            <span>Se ejecuta en {envLabel}</span>
          </div>
        </div>
      </div>

      {/* Estado */}
      {status && (
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <RefreshCw size={14} className="shrink-0" />
          <span>{status}</span>
        </div>
      )}
    </div>
  );
}
