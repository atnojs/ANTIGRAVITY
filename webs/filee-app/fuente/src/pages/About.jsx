import Logo from '../components/Logo.jsx';
import Icon from '../icons.jsx';
import { Card } from '../ui.jsx';

const LIBS = [
  ['Avalonia UI', 'MIT', 'https://github.com/AvaloniaUI/Avalonia'],
  ['CommunityToolkit.Mvvm', 'MIT', 'https://github.com/CommunityToolkit/dotnet'],
  ['SharpHook', 'MIT (libuiohook: GPL-3.0 / LGPL-3.0)', 'https://github.com/TolikPylypchuk/SharpHook'],
  ['Magick.NET / ImageMagick', 'Apache-2.0 / ImageMagick License', 'https://github.com/dlemstra/Magick.NET'],
  ['PDFsharp', 'MIT', 'https://github.com/empira/PDFsharp'],
  ['PDFium', 'BSD-3-Clause / Apache-2.0', 'https://pdfium.googlesource.com/pdfium'],
  ['SkiaSharp', 'MIT', 'https://github.com/mono/SkiaSharp'],
  ['Svg.Skia', 'MIT', 'https://github.com/wieslawsoltes/Svg.Skia'],
];

export default function About() {
  return (
    <>
      <h1 className="page-title">Acerca de</h1>

      <Card className="about-card">
        <div className="about-head">
          <Logo className="about-logo" />
          <div>
            <h2>Filee</h2>
            <p className="hint">Arrastra, suelta y convierte. Versión 2.5.0 · licencia MIT.</p>
          </div>
        </div>
        <p className="hint">
          Filee convierte 255 formatos en tu PC, sin conexión y sin subir nada. Es un proyecto de Myeonggu Kim (KnifeLemon).
        </p>
        <div className="row-actions">
          <a className="btn btn-ghost" href="https://github.com/KnifeLemon/Filee" target="_blank" rel="noopener noreferrer">
            <Icon name="github" />
            <span>GitHub</span>
          </a>
          <a className="btn btn-ghost" href="https://github.com/KnifeLemon/Filee/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">
            <span>Licencia MIT</span>
          </a>
          <a className="btn btn-ghost" href="https://github.com/KnifeLemon/Filee/blob/main/THIRD-PARTY-NOTICES.md" target="_blank" rel="noopener noreferrer">
            <span>Avisos de terceros</span>
          </a>
        </div>
      </Card>

      <Card title="Esta réplica">
        <p className="hint">
          Es una reproducción web de la interfaz de Filee 2.5 con la estética de la casa, hecha para estudiar la app. No es oficial: el producto, sus textos y las capturas son de su
          autor. La conversión de imágenes que prueba aquí sí se ejecuta en el navegador; el resto de funciones de escritorio (gestos globales, motores, carpeta de ajustes) están
          representadas.
        </p>
      </Card>

      <Card title="Componentes de terceros">
        <ul className="licenses">
          {LIBS.map(([name, license, url]) => (
            <li key={name}>
              <strong>{name}</strong>
              <span>{license}</span>
              <a href={url} target="_blank" rel="noopener noreferrer">
                {url.replace('https://', '')}
              </a>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
