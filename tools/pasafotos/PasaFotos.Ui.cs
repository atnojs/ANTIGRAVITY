// PASAFOTOS · ventana principal (WPF) y punto de entrada.
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Threading;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Markup;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Threading;
using Shapes = System.Windows.Shapes;

namespace PasaFotos
{
    internal sealed class FuenteUI : INotifyPropertyChanged
    {
        private string _nombre;
        private string _ruta;
        private string _resumen = "analizando…";

        public string Nombre { get { return _nombre; } set { _nombre = value; Notificar("Nombre"); } }
        public string Ruta { get { return _ruta; } set { _ruta = value; Notificar("Ruta"); } }
        public string Resumen
        {
            get { return _resumen; }
            set { _resumen = value; Notificar("Resumen"); }
        }

        public long Archivos;
        public long Bytes;
        public bool Analizada;

        public event PropertyChangedEventHandler PropertyChanged;

        private void Notificar(string propiedad)
        {
            PropertyChangedEventHandler h = PropertyChanged;
            if (h != null) h(this, new PropertyChangedEventArgs(propiedad));
        }

        public void RefrescarResumen()
        {
            if (!Analizada) { Resumen = "analizando…"; return; }
            Resumen = Formato.Bytes(Bytes) + " · " + Formato.Entero(Archivos) + " ficheros";
        }
    }

    internal sealed class Ventana : Window
    {
        private readonly Args _args;
        private Grid _raiz;

        // Controles
        private ListBox _lstOrigen;
        private StackPanel _panelVacio;
        private Button _btnAnadir, _btnQuitar, _btnVaciar, _btnCambiarDestino, _btnPresetServidor, _btnComprobar;
        private TextBox _txtDestino;
        private TextBlock _lblResumenOrigen, _lblDestino, _lblEspacio, _lblAvisoDestino, _lblChip, _lblEstado, _lblVelocidad;
        private TextBlock _lblStats, _lblPorcentaje, _lblActual, _lblUltimaCopia;
        private Shapes.Ellipse _dotEstado;
        private Border _chipEstado;
        private ProgressBar _prg;
        private ListBox _lstRegistro, _lstErrores;
        private CheckBox _chkVerificar, _chkSobrescribir;
        private Button _btnCopiar, _btnCancelar, _btnAbrir;
        private Grid _overlay;
        private TextBlock _lblFinalTitulo, _lblFinalResumen;
        private Shapes.Ellipse _circuloFinal;
        private Shapes.Path _tickFinal;
        private Border _panelErrores;
        private Button _btnFinalAbrir, _btnFinalInforme, _btnFinalCerrar;

        private readonly ObservableCollection<FuenteUI> _fuentes = new ObservableCollection<FuenteUI>();
        private readonly Dictionary<string, FuenteUI> _porRuta = new Dictionary<string, FuenteUI>(StringComparer.OrdinalIgnoreCase);
        private readonly ObservableCollection<string> _registroUI = new ObservableCollection<string>();

        private string _destino = "";
        private bool _auto;
        private MotorCopia _motor;
        private Thread _hilo;
        private DispatcherTimer _timer;
        private DispatcherTimer _timerRed;
        private bool _copiando;
        private bool _finalizado;
        private DateTime _inicioCopia;
        private DateTime _marcaVelocidad;
        private long _bytesMarcaVelocidad;
        private double _velocidad;
        private int _lineasRegistroMostradas;
        private string _rutaInforme;
        private string _ultimoDestinoComprobado = "";
        private bool _comprobando;

        private static readonly Color ColorCian = Color.FromRgb(0, 208, 208);
        private static readonly Color ColorVerde = Color.FromRgb(38, 198, 38);
        private static readonly Color ColorError = Color.FromRgb(255, 107, 107);
        private static readonly Color ColorAviso = Color.FromRgb(255, 200, 87);
        private static readonly Color ColorSuave = Color.FromRgb(159, 182, 201);

        public Ventana(Args args)
        {
            _args = args;
            _auto = args.Auto;
            Config.Cargar();

            Title = "PASAFOTOS · Copiar fotos al servidor de ANTONIO";
            Width = 1070;
            Height = 748;
            MinWidth = 900;
            MinHeight = 620;
            WindowStartupLocation = WindowStartupLocation.CenterScreen;
            Background = new SolidColorBrush(Color.FromRgb(0, 16, 24));
            FontFamily = CargarFuente();
            UseLayoutRounding = true;
            SnapsToDevicePixels = true;
            TextOptions.SetTextFormattingMode(this, TextFormattingMode.Display);
            TextOptions.SetTextRenderingMode(this, TextRenderingMode.ClearType);

            Stream flujo = Assembly.GetExecutingAssembly().GetManifestResourceStream("ui.xaml");
            if (flujo == null) throw new InvalidOperationException("No se encontró la interfaz embebida (ui.xaml).");
            _raiz = (Grid)XamlReader.Load(flujo);
            Content = _raiz;
            System.Windows.Documents.TextElement.SetFontFamily(_raiz, FontFamily);

            LocalizarControles();
            CablearEventos();
            AplicarValoresIniciales();

            SourceInitialized += delegate
            {
                IntPtr hwnd = new WindowInteropHelper(this).Handle;
                Win32.BarraTituloOscura(hwnd);
            };
            Loaded += AlMostrar;
            Closing += AlCerrar;
            PreviewKeyDown += Atajos;
        }

        private static FontFamily CargarFuente()
        {
            try
            {
                string ttf = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "electrolize.ttf");
                if (File.Exists(ttf))
                {
                    string carpeta = Path.GetDirectoryName(ttf).Replace('\\', '/');
                    if (!carpeta.EndsWith("/")) carpeta = carpeta + "/";
                    Uri baseUri = new Uri("file:///" + carpeta);
                    return new FontFamily(baseUri, "./#Electrolize");
                }
            }
            catch { }
            try { return new FontFamily(new Uri("pack://application:,,,/"), "./#Electrolize"); }
            catch { }
            return new FontFamily("Segoe UI");
        }

        private T B<T>(string nombre) where T : class
        {
            return (T)_raiz.FindName(nombre);
        }

        private void LocalizarControles()
        {
            _lstOrigen = B<ListBox>("lstOrigen");
            _panelVacio = B<StackPanel>("panelVacio");
            _btnAnadir = B<Button>("btnAnadir");
            _btnQuitar = B<Button>("btnQuitar");
            _btnVaciar = B<Button>("btnVaciar");
            _btnCambiarDestino = B<Button>("btnCambiarDestino");
            _btnPresetServidor = B<Button>("btnPresetServidor");
            _btnComprobar = B<Button>("btnComprobar");
            _txtDestino = B<TextBox>("txtDestino");
            _lblResumenOrigen = B<TextBlock>("lblResumenOrigen");
            _lblDestino = B<TextBlock>("lblDestino");
            _lblEspacio = B<TextBlock>("lblEspacio");
            _lblAvisoDestino = B<TextBlock>("lblAvisoDestino");
            _lblChip = B<TextBlock>("lblChip");
            _lblEstado = B<TextBlock>("lblEstado");
            _lblVelocidad = B<TextBlock>("lblVelocidad");
            _lblStats = B<TextBlock>("lblStats");
            _lblPorcentaje = B<TextBlock>("lblPorcentaje");
            _lblActual = B<TextBlock>("lblActual");
            _lblUltimaCopia = B<TextBlock>("lblUltimaCopia");
            _dotEstado = B<Shapes.Ellipse>("dotEstado");
            _chipEstado = B<Border>("chipEstado");
            _prg = B<ProgressBar>("prg");
            _lstRegistro = B<ListBox>("lstRegistro");
            _lstErrores = B<ListBox>("lstErrores");
            _chkVerificar = B<CheckBox>("chkVerificar");
            _chkSobrescribir = B<CheckBox>("chkSobrescribir");
            _btnCopiar = B<Button>("btnCopiar");
            _btnCancelar = B<Button>("btnCancelar");
            _btnAbrir = B<Button>("btnAbrir");
            _overlay = B<Grid>("overlay");
            _lblFinalTitulo = B<TextBlock>("lblFinalTitulo");
            _lblFinalResumen = B<TextBlock>("lblFinalResumen");
            _circuloFinal = B<Shapes.Ellipse>("circuloFinal");
            _tickFinal = B<Shapes.Path>("tickFinal");
            _panelErrores = B<Border>("panelErrores");
            _btnFinalAbrir = B<Button>("btnFinalAbrir");
            _btnFinalInforme = B<Button>("btnFinalInforme");
            _btnFinalCerrar = B<Button>("btnFinalCerrar");

            _lstOrigen.ItemsSource = _fuentes;
            _lstRegistro.ItemsSource = _registroUI;
            _lstOrigen.SelectionMode = SelectionMode.Extended;
        }

        private void CablearEventos()
        {
            _btnAnadir.Click += delegate { AnadirCarpetas(); };
            _btnQuitar.Click += delegate { QuitarSeleccionadas(); };
            _btnVaciar.Click += delegate { Vaciar(); };
            _btnCambiarDestino.Click += delegate { ElegirDestino(); };
            _btnPresetServidor.Click += delegate { AplicarDestino(Constantes.DestinoPorDefecto); };
            _btnComprobar.Click += delegate { ComprobarServidor(); };
            _txtDestino.KeyDown += delegate (object s, KeyEventArgs e)
            {
                if (e.Key == Key.Enter) { AplicarDestino(_txtDestino.Text); e.Handled = true; }
            };
            _txtDestino.LostKeyboardFocus += delegate { if (!string.Equals(_txtDestino.Text, _destino, StringComparison.OrdinalIgnoreCase)) AplicarDestino(_txtDestino.Text); };
            _btnCopiar.Click += delegate { IniciarCopia(); };
            _btnCancelar.Click += delegate { CancelarCopia(); };
            _btnAbrir.Click += delegate { AbrirDestino(); };
            _btnFinalAbrir.Click += delegate { AbrirDestino(); };
            _btnFinalCerrar.Click += delegate { _overlay.Visibility = Visibility.Collapsed; };
            _btnFinalInforme.Click += delegate { AbrirInforme(); };
            _lstOrigen.SelectionChanged += delegate { ActualizarBotones(); };
            _lstOrigen.MouseDoubleClick += delegate { AbrirCarpetaSeleccionada(); };

            AllowDrop = true;
            DragOver += delegate (object s, DragEventArgs e)
            {
                e.Effects = e.Data.GetDataPresent(DataFormats.FileDrop) ? DragDropEffects.Copy : DragDropEffects.None;
                e.Handled = true;
            };
            Drop += delegate (object s, DragEventArgs e)
            {
                string[] datos = e.Data.GetData(DataFormats.FileDrop) as string[];
                if (datos == null) return;
                int anadidas = 0;
                foreach (string ruta in datos)
                {
                    if (Directory.Exists(Rutas.Largo(ruta))) { AnadirRuta(ruta); anadidas++; }
                }
                if (anadidas == 0) MostrarError("Suelta carpetas, no ficheros sueltos. Arrastra la carpeta completa.");
            };
        }

        private void AplicarValoresIniciales()
        {
            string inicial = _args.Destino;
            if (string.IsNullOrEmpty(inicial)) inicial = Config.Destino;
            if (string.IsNullOrEmpty(inicial)) inicial = Constantes.DestinoPorDefecto;
            _destino = Rutas.Normalizar(inicial);
            _txtDestino.Text = _destino;

            _chkVerificar.IsChecked = _args.Verificar;
            _chkSobrescribir.IsChecked = _args.Sobrescribir;

            _lstOrigen.ItemsSource = _fuentes;
            _registroUI.Clear();
            _prg.Value = 0;

            foreach (string origen in _args.Origenes) AnadirRuta(origen);

            RefrescarDestino();
            ActualizarResumen();
            ActualizarBotones();
            ActualizarUltimaCopia();
            SetChip("COMPROBANDO…", ColorAviso);
            _lblEstado.Text = "Listo para copiar";
            _lblStats.Text = "0 / 0 ficheros · 0 B de 0 B";
            _lblPorcentaje.Text = "0 %";
        }

        private void AlMostrar(object s, RoutedEventArgs e)
        {
            Rect wa = SystemParameters.WorkArea;
            if (wa.Width > 100 && wa.Height > 100)
            {
                Width = Math.Min(Width, Math.Max(MinWidth, wa.Width * 0.95));
                Height = Math.Min(Height, Math.Max(MinHeight, wa.Height * 0.95));
            }
            ComprobarServidor();

            _timerRed = new DispatcherTimer();
            _timerRed.Interval = TimeSpan.FromSeconds(25);
            _timerRed.Tick += delegate { if (!_copiando && _overlay.Visibility != Visibility.Visible) ComprobarServidor(silencioso: true); };
            _timerRed.Start();

            if (_args.Auto)
            {
                DispatcherTimer arranque = new DispatcherTimer();
                arranque.Interval = TimeSpan.FromMilliseconds(700);
                arranque.Tick += delegate { arranque.Stop(); IniciarCopia(); };
                arranque.Start();
            }

            if (!string.IsNullOrEmpty(_args.Captura))
            {
                DispatcherTimer captura = new DispatcherTimer();
                captura.Interval = TimeSpan.FromMilliseconds(_args.CapturaEspera);
                captura.Tick += delegate
                {
                    captura.Stop();
                    try { GuardarCaptura(_args.Captura); }
                    catch { }
                    Close();
                };
                captura.Start();
            }
        }

        private void GuardarCaptura(string ruta)
        {
            int ancho = (int)Math.Ceiling(_raiz.ActualWidth);
            int alto = (int)Math.Ceiling(_raiz.ActualHeight);
            if (ancho <= 0 || alto <= 0) return;
            RenderTargetBitmap imagen = new RenderTargetBitmap(ancho, alto, 96, 96, PixelFormats.Pbgra32);
            imagen.Render(_raiz);
            PngBitmapEncoder codificador = new PngBitmapEncoder();
            codificador.Frames.Add(BitmapFrame.Create(imagen));
            string carpeta = Path.GetDirectoryName(Path.GetFullPath(ruta));
            if (!string.IsNullOrEmpty(carpeta)) Directory.CreateDirectory(carpeta);
            using (FileStream fs = new FileStream(ruta, FileMode.Create, FileAccess.Write))
            {
                codificador.Save(fs);
            }
        }

        // ------------------------------------------------------------------
        // Origen
        // ------------------------------------------------------------------
        private void AnadirCarpetas()
        {
            if (_copiando) return;
            try
            {
                IntPtr hwnd = new WindowInteropHelper(this).Handle;
                string[] rutas = FolderDialog.ElegirVarias(hwnd, _destino);
                foreach (string ruta in rutas) AnadirRuta(ruta);
            }
            catch (Exception ex)
            {
                MostrarError("No se pudo abrir el selector de carpetas. Detalle: " + ex.Message);
            }
        }

        private void AnadirRuta(string ruta)
        {
            if (_copiando || string.IsNullOrEmpty(ruta)) return;
            string limpia = Rutas.Normalizar(ruta);
            if (Rutas.EsIgual(limpia, _destino))
            {
                MostrarError("Esa carpeta es el destino. Elige una carpeta de origen distinta.");
                return;
            }
            if (Rutas.EsSubcarpeta(_destino, limpia) || Rutas.EsSubcarpeta(limpia, _destino))
            {
                MostrarError("La carpeta «" + limpia + "» está dentro del destino (o al contrario). No se puede copiar una carpeta sobre sí misma.");
                return;
            }
            foreach (FuenteUI existente in _fuentes)
            {
                if (Rutas.EsIgual(existente.Ruta, limpia))
                {
                    MostrarError("Esa carpeta ya está en la lista:\n" + limpia);
                    return;
                }
            }

            FuenteUI f = new FuenteUI();
            f.Ruta = limpia;
            f.Nombre = Rutas.NombreCarpeta(limpia);
            f.Resumen = "analizando…";
            _fuentes.Add(f);
            _porRuta[limpia] = f;

            ThreadPool.QueueUserWorkItem(delegate
            {
                long archivos = 0;
                long bytes = 0;
                string error = null;
                try { MotorCopia.Contar(limpia, out archivos, out bytes); }
                catch (Exception ex) { error = ex.Message; }
                Dispatcher.BeginInvoke(new Action(delegate
                {
                    if (error != null)
                    {
                        f.Resumen = "error de lectura";
                    }
                    else
                    {
                        f.Archivos = archivos;
                        f.Bytes = bytes;
                        f.Analizada = true;
                        f.RefrescarResumen();
                    }
                    ActualizarResumen();
                    ActualizarBotones();
                }));
            });

            ActualizarResumen();
            ActualizarBotones();
        }

        private void QuitarSeleccionadas()
        {
            if (_copiando) return;
            List<FuenteUI> quitar = new List<FuenteUI>();
            foreach (object o in _lstOrigen.SelectedItems) if (o is FuenteUI) quitar.Add((FuenteUI)o);
            foreach (FuenteUI f in quitar)
            {
                _fuentes.Remove(f);
                _porRuta.Remove(f.Ruta);
            }
            ActualizarResumen();
            ActualizarBotones();
        }

        private void Vaciar()
        {
            if (_copiando) return;
            _fuentes.Clear();
            _porRuta.Clear();
            ActualizarResumen();
            ActualizarBotones();
        }

        private void AbrirCarpetaSeleccionada()
        {
            FuenteUI f = _lstOrigen.SelectedItem as FuenteUI;
            if (f != null && Directory.Exists(Rutas.Largo(f.Ruta))) Process.Start("explorer.exe", "\"" + f.Ruta + "\"");
        }

        private void ActualizarResumen()
        {
            long totalFicheros = 0;
            long totalBytes = 0;
            int analizando = 0;
            foreach (FuenteUI f in _fuentes)
            {
                if (!f.Analizada) analizando++;
                totalFicheros += f.Archivos;
                totalBytes += f.Bytes;
            }
            if (_fuentes.Count == 0)
            {
                _lblResumenOrigen.Text = "";
            }
            else if (analizando > 0)
            {
                _lblResumenOrigen.Text = Formato.Entero(_fuentes.Count) + " carpetas · analizando…";
            }
            else
            {
                _lblResumenOrigen.Text = Formato.Entero(_fuentes.Count) + " carpetas · " + Formato.Entero(totalFicheros) +
                                        " ficheros · " + Formato.Bytes(totalBytes);
            }
            _panelVacio.Visibility = _fuentes.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
        }

        private void ActualizarBotones()
        {
            bool bloqueado = _copiando;
            _btnAnadir.IsEnabled = !bloqueado;
            _btnQuitar.IsEnabled = !bloqueado && _lstOrigen.SelectedItems.Count > 0;
            _btnVaciar.IsEnabled = !bloqueado && _fuentes.Count > 0;
            _btnCambiarDestino.IsEnabled = !bloqueado;
            _btnPresetServidor.IsEnabled = !bloqueado;
            _txtDestino.IsReadOnly = bloqueado;
            _chkSobrescribir.IsEnabled = !bloqueado;
            _chkVerificar.IsEnabled = !bloqueado;
            _btnCopiar.IsEnabled = !bloqueado && _fuentes.Count > 0;
        }

        // ------------------------------------------------------------------
        // Destino
        // ------------------------------------------------------------------
        private void ElegirDestino()
        {
            if (_copiando) return;
            string ruta = FolderDialog.ElegirUna(new WindowInteropHelper(this).Handle, _destino);
            if (!string.IsNullOrEmpty(ruta)) AplicarDestino(ruta);
        }

        private void AplicarDestino(string texto)
        {
            string limpia = Rutas.Normalizar(texto);
            if (limpia.Length == 0)
            {
                _txtDestino.Text = _destino;
                MostrarError("Escribe o elige una carpeta de destino.");
                return;
            }
            _destino = limpia;
            _txtDestino.Text = _destino;
            Config.Destino = _destino;
            Config.Guardar();
            RefrescarDestino();
            ComprobarServidor();
        }

        private void RefrescarDestino()
        {
            _lblDestino.Text = _destino;
            _lblAvisoDestino.Text = "";
            _lblEspacio.Text = "Comprobando el servidor…";
        }

        private void ComprobarServidor()
        {
            ComprobarServidor(false);
        }

        private void ComprobarServidor(bool silencioso)
        {
            if (_comprobando) return;
            _comprobando = true;
            string destino = _destino;
            _ultimoDestinoComprobado = destino;
            if (!silencioso) SetChip("COMPROBANDO…", ColorAviso);

            ThreadPool.QueueUserWorkItem(delegate
            {
                string error;
                long libres;
                bool ok;
                try { ok = MotorCopia.ComprobarEscribible(destino, false, out error, out libres); }
                catch (Exception ex) { ok = false; error = ex.Message; libres = -1; }

                Dispatcher.BeginInvoke(new Action(delegate
                {
                    _comprobando = false;
                    if (!string.Equals(destino, _destino, StringComparison.OrdinalIgnoreCase)) { ComprobarServidor(silencioso); return; }
                    if (ok)
                    {
                        SetChip("SERVIDOR CONECTADO", ColorVerde);
                        _lblAvisoDestino.Text = "";
                        _lblEspacio.Text = libres > 0 ? Formato.Bytes(libres) + " libres en el destino" : "Destino accesible";
                    }
                    else
                    {
                        bool noExiste = error != null && error.IndexOf("no existe", StringComparison.OrdinalIgnoreCase) >= 0;
                        SetChip(noExiste ? "DESTINO NO EXISTE" : "SIN CONEXIÓN", noExiste ? ColorAviso : ColorError);
                        _lblAvisoDestino.Text = error;
                        _lblEspacio.Text = "";
                    }
                    if (ok && !_copiando) _btnCopiar.IsEnabled = _fuentes.Count > 0;
                }));
            });
        }

        private void SetChip(string texto, Color color)
        {
            _lblChip.Text = texto;
            _dotEstado.Fill = new SolidColorBrush(color);
            _chipEstado.BorderBrush = new SolidColorBrush(Color.FromArgb(80, color.R, color.G, color.B));
        }

        // ------------------------------------------------------------------
        // Copia
        // ------------------------------------------------------------------
        private void IniciarCopia()
        {
            if (_copiando) return;
            _overlay.Visibility = Visibility.Collapsed;

            if (_fuentes.Count == 0)
            {
                MostrarError("Añade al menos una carpeta de fotos para copiar.");
                return;
            }
            if (string.IsNullOrWhiteSpace(_destino))
            {
                MostrarError("Falta la carpeta de destino.");
                return;
            }

            foreach (FuenteUI f in _fuentes)
            {
                if (Rutas.EsSubcarpeta(_destino, f.Ruta) || Rutas.EsSubcarpeta(f.Ruta, _destino))
                {
                    MostrarError("La carpeta de origen «" + f.Ruta + "» está dentro del destino (o al contrario). Elige otra ruta.");
                    return;
                }
            }

            string error;
            long libres = -1;
            bool existe = Directory.Exists(Rutas.Largo(_destino));
            if (!existe)
            {
                if (!_auto && !Preguntar("La carpeta de destino no existe:\n\n" + _destino + "\n\n¿Quieres crearla?")) return;
                if (!MotorCopia.ComprobarEscribible(_destino, true, out error, out libres)) { MostrarError(error); return; }
            }
            else
            {
                if (!MotorCopia.ComprobarEscribible(_destino, false, out error, out libres)) { MostrarError(error); return; }
            }

            List<string> yaExisten = new List<string>();
            HashSet<string> usados = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (FuenteUI f in _fuentes)
            {
                string nombre = Rutas.NombreCarpeta(f.Ruta);
                string nd = nombre;
                int k = 2;
                while (usados.Contains(nd)) { nd = nombre + " (" + k.ToString(Cultura.Es) + ")"; k++; }
                usados.Add(nd);
                if (Directory.Exists(Rutas.Largo(Path.Combine(_destino, nd)))) yaExisten.Add(nd);
            }
            if (yaExisten.Count > 0 && !_auto)
            {
                string lista = string.Join("\n", yaExisten.GetRange(0, Math.Min(6, yaExisten.Count)).ToArray());
                if (yaExisten.Count > 6) lista = lista + "\n… y " + (yaExisten.Count - 6) + " más";
                string mensaje = "En el destino ya existe(n) estas carpeta(s):\n\n" + lista +
                                 "\n\nSe combinarán: los ficheros idénticos se omiten y los distintos NO se sobrescriben (salvo que marques la opción).\n\n¿Continuar?" +
                                 (_chkSobrescribir.IsChecked == true ? "\n\nATENCIÓN: tienes marcado sobrescribir los ficheros distintos." : "");
                if (!Preguntar(mensaje)) return;
            }

            bool todoAnalizado = true;
            long totalBytes = 0;
            foreach (FuenteUI f in _fuentes) { if (!f.Analizada) todoAnalizado = false; totalBytes += f.Bytes; }
            if (todoAnalizado && totalBytes > 0 && libres > 0 && totalBytes > libres - 536870912 && !_auto)
            {
                if (!Preguntar("Parece que no cabe todo:\n\nNecesitas " + Formato.Bytes(totalBytes) + " y el destino tiene " +
                               Formato.Bytes(libres) + " libres.\n\n¿Continuar de todos modos?")) return;
            }

            Config.Destino = _destino;
            Config.Guardar();

            List<string> rutas = new List<string>();
            foreach (FuenteUI f in _fuentes) rutas.Add(f.Ruta);

            _copiando = true;
            _finalizado = false;
            _rutaInforme = null;
            _motor = new MotorCopia(rutas, _destino, _chkSobrescribir.IsChecked == true, _chkVerificar.IsChecked == true);
            _inicioCopia = DateTime.Now;
            _marcaVelocidad = DateTime.Now;
            _bytesMarcaVelocidad = 0;
            _velocidad = 0;
            _lineasRegistroMostradas = 0;
            _registroUI.Clear();
            _prg.Value = 0;
            _lblPorcentaje.Text = "0 %";
            _lblStats.Text = "Analizando…";
            _lblActual.Text = "";
            _lblVelocidad.Text = "";
            _lblEstado.Text = "Analizando carpetas…";
            _btnCancelar.Visibility = Visibility.Visible;
            _btnCancelar.IsEnabled = true;
            ActualizarBotones();

            _hilo = new Thread(new ThreadStart(delegate
            {
                try
                {
                    _motor.Anotar("PASAFOTOS " + Constantes.Version + " · copia iniciada");
                    _motor.Escanear();
                    if (!_motor.Cancelar)
                    {
                        _motor.Copiar();
                    }
                    else
                    {
                        _motor.Estado.Cancelado = true;
                        _motor.Estado.Terminado = true;
                        _motor.Estado.Segundos = (DateTime.Now - _motor.Estado.Inicio).TotalSeconds;
                    }
                }
                catch (Exception ex)
                {
                    _motor.Estado.AnadirFallo("", "Error inesperado durante la copia: " + ex.Message, false);
                    _motor.Estado.EnMarcha = false;
                    _motor.Estado.Terminado = true;
                }
                finally
                {
                    try { Dispatcher.BeginInvoke(new Action(Finalizar)); }
                    catch { }
                }
            }));
            _hilo.IsBackground = true;
            _hilo.Start();

            _timer = new DispatcherTimer();
            _timer.Interval = TimeSpan.FromMilliseconds(140);
            _timer.Tick += delegate { ActualizarProgreso(); };
            _timer.Start();
        }

        private void CancelarCopia()
        {
            if (!_copiando || _motor == null) return;
            _motor.Cancelar = true;
            _btnCancelar.IsEnabled = false;
            _lblEstado.Text = "Cancelando…";
        }

        private void ActualizarProgreso()
        {
            if (_motor == null) return;
            EstadoCopia e = _motor.Estado;

            if (e.Escaneando)
            {
                _lblEstado.Text = "Analizando carpetas…";
                _lblStats.Text = Formato.Entero(e.ArchivosEscaneados) + " ficheros encontrados";
                _lblPorcentaje.Text = "";
                _lblActual.Text = "";
            }
            else
            {
                long hechos = Interlocked.Read(ref e.BytesProcesados) + Interlocked.Read(ref e.BytesEnCurso);
                double pct = e.BytesTotales > 0 ? Math.Min(100.0, hechos * 100.0 / e.BytesTotales) : 0.0;
                _prg.Value = pct;
                _lblPorcentaje.Text = ((int)pct).ToString() + " %";
                _lblEstado.Text = e.Cancelado ? "Cancelando…" : "Copiando al servidor…";
                _lblStats.Text = Formato.Entero(e.ArchivosCopiados) + " / " + Formato.Entero(e.ArchivosTotales) +
                                 " ficheros · " + Formato.Bytes(hechos) + " de " + Formato.Bytes(e.BytesTotales);
                _lblActual.Text = e.FicheroActual;

                DateTime ahora = DateTime.Now;
                double dt = (ahora - _marcaVelocidad).TotalSeconds;
                if (dt >= 0.45)
                {
                    long delta = hechos - Interlocked.Read(ref _bytesMarcaVelocidad);
                    double instantanea = delta / dt;
                    _velocidad = _velocidad <= 0 ? instantanea : (_velocidad * 0.65 + instantanea * 0.35);
                    _bytesMarcaVelocidad = hechos;
                    _marcaVelocidad = ahora;

                    if (_velocidad > 1024 && e.BytesTotales > hechos)
                    {
                        double restante = (e.BytesTotales - hechos) / _velocidad;
                        _lblVelocidad.Text = Formato.Bytes((long)_velocidad) + "/s · faltan " + Formato.Duracion(restante);
                    }
                    else if (_velocidad > 1024)
                    {
                        _lblVelocidad.Text = Formato.Bytes((long)_velocidad) + "/s";
                    }
                    else
                    {
                        _lblVelocidad.Text = "";
                    }
                }
            }

            // Registro
            List<string> log = _motor.Log;
            if (log.Count != _lineasRegistroMostradas)
            {
                _registroUI.Clear();
                int desde = Math.Max(0, log.Count - 200);
                for (int i = desde; i < log.Count; i++) _registroUI.Add(log[i]);
                _lineasRegistroMostradas = log.Count;
                if (_registroUI.Count > 0) _lstRegistro.ScrollIntoView(_registroUI[_registroUI.Count - 1]);
            }
        }

        private void Finalizar()
        {
            if (_finalizado) return;
            _finalizado = true;
            _copiando = false;
            try { if (_timer != null) _timer.Stop(); } catch { }

            EstadoCopia e = _motor.Estado;
            e.EnMarcha = false;
            if (e.Segundos <= 0) e.Segundos = (DateTime.Now - _inicioCopia).TotalSeconds;
            bool cancelado = e.Cancelado || _motor.Cancelar;
            e.Cancelado = cancelado;

            try { _rutaInforme = Informes.Escribir(_motor, cancelado); }
            catch { _rutaInforme = null; }

            try { Historial.Anadir(_destino, e.ArchivosCopiados, e.BytesProcesados, e.NumErrores, (int)e.Conflictos, cancelado, e.Segundos); }
            catch { }

            _btnCancelar.Visibility = Visibility.Collapsed;
            _btnCancelar.IsEnabled = true;
            _prg.Value = 100;
            _lblPorcentaje.Text = "100 %";
            _lblVelocidad.Text = "";
            _lblActual.Text = "";
            _lblEstado.Text = cancelado ? "Copia cancelada" : (e.NumErrores > 0 ? "Copia terminada con errores" : "Copia terminada");
            _lblStats.Text = Formato.Entero(e.ArchivosCopiados) + " / " + Formato.Entero(e.ArchivosTotales) +
                             " ficheros · " + Formato.Bytes(e.BytesProcesados) + " de " + Formato.Bytes(e.BytesTotales);
            ActualizarBotones();
            ActualizarUltimaCopia();
            MostrarOverlay(e, cancelado);
            ComprobarServidor(true);
        }

        private void MostrarOverlay(EstadoCopia e, bool cancelado)
        {
            int errores = e.NumErrores;
            int avisos = (int)e.Conflictos;
            Color color = ColorVerde;
            string titulo = "Copia terminada";
            if (cancelado) { titulo = "Copia cancelada"; color = ColorAviso; }
            else if (errores > 0) { titulo = "Copia terminada con errores"; color = ColorError; }
            else if (avisos > 0) { titulo = "Copia terminada con avisos"; color = ColorAviso; }

            _lblFinalTitulo.Text = titulo;
            _circuloFinal.Stroke = new SolidColorBrush(color);
            _tickFinal.Stroke = new SolidColorBrush(color);
            if (color == ColorVerde)
            {
                _tickFinal.Data = Geometry.Parse("M0,8 L9,17 L24,0");
            }
            else
            {
                _tickFinal.Data = Geometry.Parse("M12,2 L12,15 M12,19 L12,19.6");
                _tickFinal.Width = 26;
                _tickFinal.Height = 24;
            }

            string texto = string.Format(Cultura.Es,
                "{0} ficheros copiados · {1}\nOmitidos por ser idénticos: {2} · Avisos: {3} · Errores: {4}\nDuración: {5}",
                Formato.Entero(e.ArchivosCopiados), Formato.Bytes(e.BytesProcesados),
                Formato.Entero(e.Omitidos), Formato.Entero(avisos), Formato.Entero(errores), Formato.Duracion(e.Segundos));
            if (cancelado) texto = texto + "\n\nSe canceló a petición tuya. Lo ya copiado está en el destino.";
            _lblFinalResumen.Text = texto;

            List<Fallo> fallos = e.CopiaFallos();
            if (fallos.Count > 0)
            {
                _panelErrores.Visibility = Visibility.Visible;
                List<string> lineas = new List<string>();
                for (int i = 0; i < fallos.Count && i < 300; i++)
                {
                    lineas.Add((fallos[i].Conflicto ? "AVISO · " : "ERROR · ") + fallos[i].Ruta + " — " + fallos[i].Mensaje);
                }
                _lstErrores.ItemsSource = lineas;
            }
            else
            {
                _panelErrores.Visibility = Visibility.Collapsed;
                _lstErrores.ItemsSource = null;
            }

            _btnFinalInforme.Visibility = string.IsNullOrEmpty(_rutaInforme) ? Visibility.Collapsed : Visibility.Visible;
            _overlay.Visibility = Visibility.Visible;
        }

        private void AbrirInforme()
        {
            if (string.IsNullOrEmpty(_rutaInforme)) return;
            try { Process.Start("explorer.exe", "/select,\"" + _rutaInforme + "\""); }
            catch { try { Process.Start("explorer.exe", "\"" + Path.GetDirectoryName(_rutaInforme) + "\""); } catch { } }
        }

        private void AbrirDestino()
        {
            try
            {
                if (Directory.Exists(Rutas.Largo(_destino))) Process.Start("explorer.exe", "\"" + _destino + "\"");
                else MostrarError("El destino no está accesible ahora mismo:\n" + _destino);
            }
            catch (Exception ex)
            {
                MostrarError("No se pudo abrir la carpeta: " + ex.Message);
            }
        }

        private void ActualizarUltimaCopia()
        {
            string linea = Historial.UltimaLinea();
            if (string.IsNullOrEmpty(linea)) { _lblUltimaCopia.Text = "Sin copias todavía en este equipo"; return; }
            string[] partes = linea.Split('\t');
            if (partes.Length >= 8)
            {
                long archivos;
                long bytes;
                long.TryParse(partes[2], out archivos);
                long.TryParse(partes[3], out bytes);
                _lblUltimaCopia.Text = "Última copia: " + partes[0] + " · " + Formato.Entero(archivos) + " ficheros · " +
                                       Formato.Bytes(bytes) + " · " + partes[7];
            }
        }

        private void Atajos(object s, KeyEventArgs e)
        {
            if (e.Key == Key.F5) { ComprobarServidor(); e.Handled = true; return; }
            if (e.Key == Key.Escape)
            {
                if (_overlay.Visibility == Visibility.Visible) { _overlay.Visibility = Visibility.Collapsed; e.Handled = true; return; }
                if (_copiando) { CancelarCopia(); e.Handled = true; return; }
                Close();
                e.Handled = true;
                return;
            }
            if (e.Key == Key.Enter && !_copiando && _overlay.Visibility != Visibility.Visible && !_txtDestino.IsKeyboardFocusWithin)
            {
                IniciarCopia();
                e.Handled = true;
            }
        }

        private void AlCerrar(object s, CancelEventArgs e)
        {
            if (_copiando)
            {
                if (_auto || !string.IsNullOrEmpty(_args.Captura))
                {
                    if (_motor != null) _motor.Cancelar = true;
                    try { if (_hilo != null) _hilo.Join(3000); }
                    catch { }
                    return;
                }
                if (!Preguntar("Hay una copia en marcha.\n\n¿Cancelarla y cerrar PASAFOTOS?"))
                {
                    e.Cancel = true;
                    return;
                }
                if (_motor != null) _motor.Cancelar = true;
                try { if (_hilo != null) _hilo.Join(5000); }
                catch { }
            }
            Config.Destino = _destino;
            Config.Guardar();
        }

        private void MostrarError(string texto)
        {
            MessageBox.Show(this, texto, "PASAFOTOS", MessageBoxButton.OK, MessageBoxImage.Warning);
        }

        private bool Preguntar(string texto)
        {
            return MessageBox.Show(this, texto, "PASAFOTOS", MessageBoxButton.YesNo, MessageBoxImage.Question) == MessageBoxResult.Yes;
        }
    }

    internal static class Program
    {
        private const string Ayuda =
            "PASAFOTOS " + Constantes.Version + " · copia carpetas de fotos de este PC al servidor\r\n" +
            "\r\n" +
            "Uso normal: abre PasaFotos.exe y elige las carpetas y el destino.\r\n" +
            "\r\n" +
            "Modo automático (sin ventana):\r\n" +
            "  PasaFotos.exe --cli --origen \"C:\\fotos\\viaje|D:\\fotos\\playa\" --destino \"\\\\192.168.18.10\\D\\Media\\Fotos\" [--sobrescribir] [--sin-verificar] [--informe \"ruta.json\"]\r\n" +
            "\r\n" +
            "Códigos de salida: 0 bien, 1 con avisos/errores, 2 argumentos, 3 destino, 4 cancelado, 5 origen inválido.\r\n" +
            "\r\n" +
            "Los ajustes e informes se guardan en %APPDATA%\\PasaFotos.\r\n";

        [STAThread]
        private static int Main(string[] args)
        {
            Args a = Args.Parse(args);

            if (a.Ayuda)
            {
                Win32.PrepararConsola();
                Console.WriteLine(Ayuda);
                return 0;
            }

            if (a.Cli || a.Diagnostico)
            {
                Win32.PrepararConsola();
                return Cli.Ejecutar(a);
            }

            Application app = new Application();
            app.ShutdownMode = ShutdownMode.OnMainWindowClose;
            app.DispatcherUnhandledException += delegate (object s, DispatcherUnhandledExceptionEventArgs e)
            {
                try
                {
                    MessageBox.Show("Ha ocurrido un error inesperado:\n\n" + e.Exception.Message, "PASAFOTOS", MessageBoxButton.OK, MessageBoxImage.Error);
                }
                catch { }
                e.Handled = true;
            };

            Ventana ventana = new Ventana(a);
            app.MainWindow = ventana;
            app.Run(ventana);
            return 0;
        }
    }
}
