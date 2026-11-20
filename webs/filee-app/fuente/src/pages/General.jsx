import Icon from '../icons.jsx';
import { Button, Card, Field, Select, Switch } from '../ui.jsx';
import { useSettings } from '../state.jsx';

function toast(text) {
  window.dispatchEvent(new CustomEvent('filee-toast', { detail: text }));
}

const LANGS = [
  { value: 'auto', label: 'Predeterminado del sistema' },
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'zh-CN', label: '简体中文' },
];

export default function General() {
  const { settings, set, toggle } = useSettings();

  const exportPresets = () => {
    const blob = new Blob([JSON.stringify(settings.presets, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'filee-presets.json';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Ajustes preestablecidos exportados');
  };

  return (
    <>
      <h1 className="page-title">General</h1>

      <Card>
        <Field label="Idioma" htmlFor="lang">
          <Select id="lang" value={settings.lang} onChange={(v) => set({ lang: v })} options={LANGS} width="360px" />
        </Field>

        <Field label="Iniciar Filee al iniciar sesión">
          <Switch checked={settings.autostart} onChange={() => toggle('autostart')} />
        </Field>

        <Field label="Al cerrar la ventana" htmlFor="onclose">
          <Select
            id="onclose"
            value={settings.onClose}
            onChange={(v) => set({ onClose: v })}
            options={[
              { value: 'ask', label: 'Preguntar cada vez' },
              { value: 'tray', label: 'Seguir en segundo plano' },
              { value: 'quit', label: 'Salir de Filee' },
            ]}
            width="360px"
          />
        </Field>

        <Field label="Mostrar «Convertir con Filee» en el menú contextual del Explorador">
          <Switch checked={settings.contextMenu} onChange={() => toggle('contextMenu')} />
        </Field>

        <p className="hint">«Convertir con Filee» está en el menú principal de Windows 11.</p>
        <div className="row-actions">
          <Button onClick={() => toast('En la app de escritorio esto quita la entrada del menú de Windows 11.')}>Quitar del menú principal</Button>
        </div>
      </Card>

      <Card title="Carpeta de guardado predeterminada">
        <p className="hint">
          Los ajustes preestablecidos configurados en «Carpeta de guardado predeterminada» guardan aquí.
          <br />
          Un ajuste preestablecido con su propia carpeta la conserva.
        </p>
        <Field label="Guardar en" htmlFor="savefolder">
          <Select
            id="savefolder"
            value={settings.sameFolder ? 'same' : 'ask'}
            onChange={(v) => set({ sameFolder: v === 'same' })}
            options={[
              { value: 'same', label: 'La misma carpeta que el original' },
              { value: 'ask', label: 'Preguntar cada vez' },
            ]}
            width="360px"
          />
        </Field>
        <Field label="Conservar las fechas originales de los archivos en todas las conversiones">
          <Switch checked={settings.keepDates} onChange={() => toggle('keepDates')} />
        </Field>
        <p className="hint">
          Los archivos convertidos conservan las fechas de creación y modificación del original, con todos los ajustes preestablecidos.
          <br />
          Desactivado: solo lo hacen los ajustes preestablecidos con «Conservar las fechas del archivo original».
        </p>
      </Card>

      <Card title="Archivos arrastrados desde un navegador">
        <p className="hint">
          Mantén pulsada la tecla y arrastra una imagen, un enlace a un archivo o una descarga desde Chrome, Edge, Firefox o Safari: el menú circular se abre igual que con tus
          propios archivos. El archivo se guarda en esta carpeta, y los ajustes preestablecidos que guardan junto al original también guardan aquí el archivo convertido.
        </p>
        <Field label="Permitir arrastrar desde el navegador">
          <Switch checked={settings.browserDrop} onChange={() => toggle('browserDrop')} />
        </Field>
        <Field label="Descargar enlaces de la red local" hint="Permite que Filee descargue enlaces de este equipo y de la red local, como una intranet o un NAS. Actívalo solo si confías en las páginas desde las que arrastras.">
          <Switch checked={settings.browserDropLocal} onChange={() => toggle('browserDropLocal')} />
        </Field>
        <Field label="Proxy para las descargas de Filee" htmlFor="proxy" hint="Déjalo vacío para usar el proxy del sistema.">
          <input
            id="proxy"
            className="input"
            placeholder="http://host:puerto"
            value={settings.proxy}
            onChange={(e) => set({ proxy: e.target.value })}
          />
        </Field>
      </Card>

      <Card title="Historial de conversiones">
        <Field label="Guardar el historial de conversiones">
          <Switch checked={settings.historyEnabled} onChange={() => toggle('historyEnabled')} />
        </Field>
        <p className="hint">{settings.history.length} conversión(es) en el historial</p>
      </Card>

      <Card title="Ajustes preestablecidos y menús circulares">
        <div className="row-actions">
          <Button icon="download" onClick={exportPresets}>
            Exportar…
          </Button>
          <Button icon="upload" onClick={() => toast('En la app de escritorio se elige un archivo .json para importar.')}>
            Importar…
          </Button>
        </div>
        <p className="hint">Guarda los ajustes preestablecidos y los menús circulares en un archivo, como copia de seguridad o para compartirlos.</p>
        <div className="row-actions">
          <Button variant="danger" onClick={() => toast('Valores predeterminados restablecidos')}>
            Restablecer los valores predeterminados
          </Button>
        </div>
        <p className="hint">Sustituye todos los ajustes preestablecidos y menús circulares por los integrados. Tus demás ajustes no cambian.</p>
      </Card>

      <Card title="Carpeta de ajustes">
        <p className="code-line">
          <Icon name="folder" /> C:\Users\atnoj\AppData\Roaming\Filee
        </p>
        <p className="hint">
          Filee guarda aquí tus ajustes, los ajustes preestablecidos, los menús circulares, el historial de conversiones y los archivos de registro. Abre la carpeta para hacer una
          copia de seguridad o consultar un registro.
        </p>
      </Card>
    </>
  );
}
