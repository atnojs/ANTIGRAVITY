// PASAFOTOS · motor de copia, configuración, informes, diálogos de carpeta y modo CLI.
// Compilado con el compilador de .NET Framework 4.8 (C# 5). Sin dependencias externas.
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

namespace PasaFotos
{
    internal static class Constantes
    {
        public const string App = "PASAFOTOS";
        public const string Version = "1.0";
        public const string DestinoPorDefecto = @"\\192.168.18.10\D\Media\Fotos";
    }

    internal static class Cultura
    {
        public static readonly CultureInfo Es = CultureInfo.GetCultureInfo("es-ES");
    }

    internal static class Formato
    {
        public static string Bytes(long b)
        {
            if (b < 0) return "—";
            if (b < 1024) return b.ToString("N0", Cultura.Es) + " B";
            double v = b;
            string[] u = new string[] { "KB", "MB", "GB", "TB", "PB" };
            int i = -1;
            do { v = v / 1024.0; i++; } while (v >= 1024.0 && i < u.Length - 1);
            string patron = v >= 100.0 ? "N0" : (v >= 10.0 ? "N1" : "N2");
            return v.ToString(patron, Cultura.Es) + " " + u[i];
        }

        public static string Fecha(DateTime d)
        {
            return d.ToString("dd/MM/yyyy HH:mm", Cultura.Es);
        }

        public static string Duracion(double segundos)
        {
            if (segundos < 0 || double.IsNaN(segundos) || double.IsInfinity(segundos)) return "—";
            TimeSpan t = TimeSpan.FromSeconds(segundos);
            if (t.TotalHours >= 1) return string.Format(Cultura.Es, "{0} h {1:00} min", (int)t.TotalHours, t.Minutes);
            if (t.TotalMinutes >= 1) return string.Format(Cultura.Es, "{0} min {1:00} s", t.Minutes, t.Seconds);
            return string.Format(Cultura.Es, "{0} s", Math.Max(1, (int)Math.Round(t.TotalSeconds)));
        }

        public static string Entero(long n)
        {
            return n.ToString("N0", Cultura.Es);
        }
    }

    internal static class Rutas
    {
        public static string Largo(string ruta)
        {
            if (string.IsNullOrEmpty(ruta)) return ruta;
            if (ruta.StartsWith(@"\\?\")) return ruta;
            if (ruta.Length < 240) return ruta;
            if (ruta.StartsWith(@"\\")) return @"\\?\UNC\" + ruta.Substring(2);
            return @"\\?\" + ruta;
        }

        public static string PrefijoSiempre(string ruta)
        {
            if (string.IsNullOrEmpty(ruta)) return ruta;
            if (ruta.StartsWith(@"\\?\")) return ruta;
            if (ruta.StartsWith(@"\\")) return @"\\?\UNC\" + ruta.Substring(2);
            return @"\\?\" + ruta;
        }

        public static string SinPrefijo(string ruta)
        {
            if (string.IsNullOrEmpty(ruta)) return ruta;
            if (ruta.StartsWith(@"\\?\UNC\")) return @"\\" + ruta.Substring(8);
            if (ruta.StartsWith(@"\\?\")) return ruta.Substring(4);
            return ruta;
        }

        public static string Normalizar(string ruta)
        {
            if (string.IsNullOrEmpty(ruta)) return "";
            string r = ruta.Trim().Trim('"').TrimEnd(' ');
            if (r.StartsWith(@"\\?\")) r = SinPrefijo(r);
            try { r = Path.GetFullPath(r); } catch { }
            r = r.TrimEnd('\\');
            if (r.Length == 2 && r[1] == ':') r = r + "\\";
            return r;
        }

        public static bool EsIgual(string a, string b)
        {
            return string.Equals(Normalizar(a).TrimEnd('\\'), Normalizar(b).TrimEnd('\\'), StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>Devuelve true si 'hijo' está dentro de 'padre' (o es el mismo).</summary>
        public static bool EsSubcarpeta(string padre, string hijo)
        {
            string p = Normalizar(padre);
            string h = Normalizar(hijo);
            if (p.Length == 0 || h.Length == 0) return false;
            if (!p.EndsWith("\\")) p = p + "\\";
            return h.StartsWith(p, StringComparison.OrdinalIgnoreCase) || string.Equals(h, p.TrimEnd('\\'), StringComparison.OrdinalIgnoreCase);
        }

        public static string NombreCarpeta(string ruta)
        {
            string r = Normalizar(ruta).TrimEnd('\\');
            try
            {
                string n = Path.GetFileName(r);
                if (!string.IsNullOrEmpty(n)) return n;
            }
            catch { }
            string limpio = r.Replace(":", "").TrimEnd('\\');
            int corte = limpio.LastIndexOf('\\');
            if (corte >= 0) limpio = limpio.Substring(corte + 1);
            return string.IsNullOrEmpty(limpio) ? "carpeta" : limpio;
        }
    }

    internal static class Disco
    {
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern bool GetDiskFreeSpaceExW(string lpDirectoryName, out ulong lpFreeBytesAvailable, out ulong lpTotalNumberOfBytes, out ulong lpTotalNumberOfFreeBytes);

        public static long EspacioLibre(string ruta)
        {
            try
            {
                ulong libre, total, totalLibre;
                string destino = ruta;
                if (!destino.EndsWith("\\")) destino = destino + "\\";
                if (GetDiskFreeSpaceExW(destino, out libre, out total, out totalLibre))
                {
                    return libre > (ulong)long.MaxValue ? long.MaxValue : (long)libre;
                }
            }
            catch { }
            return -1;
        }
    }

    internal class Args
    {
        public bool Cli;
        public bool Auto;
        public bool Ayuda;
        public bool Diagnostico;
        public bool Sobrescribir;
        public bool Verificar = true;
        public string Destino = "";
        public string Informe = "";
        public string Captura = "";
        public int CapturaEspera = 1500;
        public List<string> Origenes = new List<string>();

        public static Args Parse(string[] args)
        {
            Args a = new Args();
            if (args == null) return a;
            for (int i = 0; i < args.Length; i++)
            {
                string s = (args[i] ?? "").Trim();
                string bajo = s.ToLowerInvariant();
                if (bajo == "--cli") a.Cli = true;
                else if (bajo == "--auto") a.Auto = true;
                else if (bajo == "--sobrescribir") a.Sobrescribir = true;
                else if (bajo == "--sin-verificar") a.Verificar = false;
                else if (bajo == "--ayuda" || bajo == "-h" || bajo == "--help" || bajo == "/?") a.Ayuda = true;
                else if (bajo == "--diagnostico") a.Diagnostico = true;
                else if (bajo == "--origen" || bajo == "-o")
                {
                    string valor = (i + 1 < args.Length) ? args[i + 1] : "";
                    i++;
                    foreach (string trozo in valor.Split(new char[] { '|' }, StringSplitOptions.RemoveEmptyEntries))
                    {
                        string t = trozo.Trim().Trim('"');
                        if (t.Length > 0) a.Origenes.Add(t);
                    }
                }
                else if (bajo == "--destino" || bajo == "-d")
                {
                    a.Destino = (i + 1 < args.Length) ? args[i + 1].Trim().Trim('"') : "";
                    i++;
                }
                else if (bajo == "--informe")
                {
                    a.Informe = (i + 1 < args.Length) ? args[i + 1].Trim().Trim('"') : "";
                    i++;
                }
                else if (bajo == "--captura")
                {
                    a.Captura = (i + 1 < args.Length) ? args[i + 1].Trim().Trim('"') : "";
                    i++;
                }
                else if (bajo == "--captura-espera")
                {
                    int ms;
                    if (i + 1 < args.Length && int.TryParse(args[i + 1], out ms)) a.CapturaEspera = Math.Max(200, ms);
                    i++;
                }
            }
            return a;
        }
    }

    internal class Fichero
    {
        public string Rel;
        public long Tam;
        public DateTime FechaUtc;
    }

    internal class Ocurrencia
    {
        public string Ruta;
        public string Nombre;
        public string NombreDestino;
        public long Archivos;
        public long Bytes;
        public List<Fichero> Ficheros = new List<Fichero>();
        public List<string> Directorios = new List<string>();
    }

    internal class Fallo
    {
        public string Ruta;
        public string Mensaje;
        public bool Conflicto;
    }

    internal class EstadoCopia
    {
        private readonly object _candado = new object();

        public volatile bool Escaneando;
        public volatile bool EnMarcha;
        public volatile bool Cancelado;
        public volatile bool Terminado;

        public long ArchivosTotales;
        public long BytesTotales;
        public long ArchivosEscaneados;
        public long BytesProcesados;
        public long BytesEnCurso;
        public long ArchivosCopiados;
        public long ArchivosHechos;
        public long Omitidos;
        public long Conflictos;

        public string FicheroActual = "";
        public DateTime Inicio = DateTime.Now;
        public double Segundos;

        public readonly List<Fallo> Fallos = new List<Fallo>();

        public void AnadirFallo(string ruta, string mensaje, bool conflicto)
        {
            lock (_candado)
            {
                Fallo f = new Fallo();
                f.Ruta = ruta;
                f.Mensaje = mensaje;
                f.Conflicto = conflicto;
                Fallos.Add(f);
            }
        }

        public int NumErrores
        {
            get
            {
                lock (_candado)
                {
                    int n = 0;
                    for (int i = 0; i < Fallos.Count; i++) if (!Fallos[i].Conflicto) n++;
                    return n;
                }
            }
        }

        public int NumFallos
        {
            get { lock (_candado) { return Fallos.Count; } }
        }

        public List<Fallo> CopiaFallos()
        {
            lock (_candado) { return new List<Fallo>(Fallos); }
        }
    }

    internal class MotorCopia
    {
        public readonly EstadoCopia Estado = new EstadoCopia();
        public volatile bool Cancelar;

        private readonly List<string> _origenes;
        private readonly string _destino;
        private readonly bool _sobrescribir;
        private readonly bool _verificar;
        private readonly List<Ocurrencia> _ocurrencias = new List<Ocurrencia>();
        private readonly List<string> _log = new List<string>();
        private readonly object _candadoLog = new object();

        public string Destino { get { return _destino; } }
        public List<string> Origenes { get { return new List<string>(_origenes); } }
        public bool Sobrescribir { get { return _sobrescribir; } }
        public bool Verificar { get { return _verificar; } }
        public List<string> Log { get { lock (_candadoLog) { return new List<string>(_log); } } }

        public MotorCopia(IEnumerable<string> origenes, string destino, bool sobrescribir, bool verificar)
        {
            _origenes = new List<string>();
            foreach (string o in origenes)
            {
                string limpio = Rutas.Normalizar(o);
                if (limpio.Length > 0 && !_origenes.Contains(limpio, StringComparer.OrdinalIgnoreCase)) _origenes.Add(limpio);
            }
            _destino = Rutas.Normalizar(destino);
            _sobrescribir = sobrescribir;
            _verificar = verificar;
        }

        public void Anotar(string texto)
        {
            lock (_candadoLog)
            {
                _log.Add(DateTime.Now.ToString("HH:mm:ss", Cultura.Es) + "  " + texto);
                if (_log.Count > 4000) _log.RemoveAt(0);
            }
        }

        /// <summary>Comprueba el destino y (si se pide) lo crea. Devuelve espacio libre o -1.</summary>
        public static bool ComprobarEscribible(string destino, bool crear, out string error, out long libres)
        {
            error = "";
            libres = -1;
            string d = Rutas.Normalizar(destino);
            if (d.Length == 0)
            {
                error = "No has indicado la carpeta de destino.";
                return false;
            }
            if (!Directory.Exists(Rutas.Largo(d)))
            {
                if (!crear)
                {
                    error = "La carpeta de destino no existe: " + d;
                    return false;
                }
                try
                {
                    Directory.CreateDirectory(Rutas.Largo(d));
                }
                catch (Exception ex)
                {
                    error = "No se pudo crear la carpeta de destino. Comprueba que el servidor está encendido y que la ruta es correcta. Detalle: " + ex.Message;
                    return false;
                }
            }
            try
            {
                string prueba = Path.Combine(d, ".pasafotos-prueba-" + Guid.NewGuid().ToString("N") + ".tmp");
                using (FileStream fs = new FileStream(Rutas.Largo(prueba), FileMode.CreateNew, FileAccess.Write, FileShare.None, 4096))
                {
                    fs.WriteByte(65);
                }
                File.Delete(Rutas.Largo(prueba));
            }
            catch (Exception ex)
            {
                error = "No se puede escribir en el destino. Comprueba que el servidor está encendido, que la carpeta está compartida y que tienes permiso. Detalle: " + ex.Message;
                return false;
            }
            libres = Disco.EspacioLibre(d);
            return true;
        }

        public void Escanear()
        {
            Estado.Escaneando = true;
            Estado.EnMarcha = true;
            Estado.Inicio = DateTime.Now;
            Estado.ArchivosEscaneados = 0;
            _ocurrencias.Clear();
            HashSet<string> usados = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (string origen in _origenes)
            {
                if (Cancelar) { Estado.Cancelado = true; break; }
                if (!Directory.Exists(Rutas.Largo(origen)))
                {
                    Estado.AnadirFallo(origen, "La carpeta de origen no existe o no es accesible.", false);
                    Anotar("ERROR: no existe " + origen);
                    continue;
                }
                string nombre = Rutas.NombreCarpeta(origen);
                string nd = nombre;
                int k = 2;
                while (usados.Contains(nd))
                {
                    nd = nombre + " (" + k.ToString(Cultura.Es) + ")";
                    k++;
                }
                usados.Add(nd);

                Ocurrencia oc = new Ocurrencia();
                oc.Ruta = origen;
                oc.Nombre = nombre;
                oc.NombreDestino = nd;
                Anotar("Analizando " + origen);
                Recorrer(origen, "", oc);
                Estado.ArchivosTotales += oc.Archivos;
                Estado.BytesTotales += oc.Bytes;
                _ocurrencias.Add(oc);
                Anotar(string.Format(Cultura.Es, "  {0}: {1} ficheros, {2}", nd, Formato.Entero(oc.Archivos), Formato.Bytes(oc.Bytes)));
            }
            Estado.Escaneando = false;
        }

        private void Recorrer(string dirAbs, string rel, Ocurrencia oc)
        {
            if (Cancelar) return;
            string[] entradas = ListarEntradas(dirAbs);
            if (entradas == null)
            {
                Anotar("ERROR al leer " + dirAbs);
                return;
            }

            foreach (string entradaBruta in entradas)
            {
                if (Cancelar) return;
                string entrada = Rutas.SinPrefijo(entradaBruta);
                string nombre;
                try { nombre = Path.GetFileName(entrada); }
                catch { nombre = ""; }
                if (string.IsNullOrEmpty(nombre)) continue;

                string ruta = Path.Combine(dirAbs, nombre);
                FileAttributes at;
                try { at = File.GetAttributes(Rutas.Largo(ruta)); }
                catch (Exception ex)
                {
                    Estado.AnadirFallo(Path.Combine(rel, nombre), "No se pudo leer: " + ex.Message, false);
                    continue;
                }
                if ((at & FileAttributes.ReparsePoint) != 0) continue;

                if ((at & FileAttributes.Directory) != 0)
                {
                    string relDir = rel + nombre + "\\";
                    oc.Directorios.Add(relDir);
                    Recorrer(ruta, relDir, oc);
                }
                else
                {
                    try
                    {
                        FileInfo fi = new FileInfo(Rutas.Largo(ruta));
                        long tam = fi.Length;
                        DateTime fecha = fi.LastWriteTimeUtc;
                        Fichero f = new Fichero();
                        f.Rel = rel + nombre;
                        f.Tam = tam;
                        f.FechaUtc = fecha;
                        oc.Ficheros.Add(f);
                        oc.Archivos++;
                        oc.Bytes += tam;
                        Estado.ArchivosEscaneados++;
                    }
                    catch (Exception ex)
                    {
                        Estado.AnadirFallo(Path.Combine(rel, nombre), "No se pudo leer el fichero: " + ex.Message, false);
                    }
                }
            }
        }

        private string[] ListarEntradas(string carpeta)
        {
            try
            {
                return Directory.GetFileSystemEntries(carpeta);
            }
            catch (PathTooLongException)
            {
                try
                {
                    string[] largas = Directory.GetFileSystemEntries(Rutas.PrefijoSiempre(carpeta));
                    for (int i = 0; i < largas.Length; i++) largas[i] = Rutas.SinPrefijo(largas[i]);
                    return largas;
                }
                catch (Exception ex)
                {
                    Estado.AnadirFallo(carpeta, "No se pudo leer la carpeta: " + ex.Message, false);
                    return null;
                }
            }
            catch (Exception ex)
            {
                Estado.AnadirFallo(carpeta, "No se pudo leer la carpeta: " + ex.Message, false);
                return null;
            }
        }

        public void Copiar()
        {
            Estado.EnMarcha = true;
            Anotar("Copia iniciada: " + _ocurrencias.Count + " carpeta(s) → " + _destino);

            foreach (Ocurrencia oc in _ocurrencias)
            {
                if (Cancelar) break;
                string destinoRaiz = Path.Combine(_destino, oc.NombreDestino);
                try
                {
                    Directory.CreateDirectory(Rutas.Largo(destinoRaiz));
                }
                catch (Exception ex)
                {
                    Estado.AnadirFallo(oc.NombreDestino, "No se pudo crear la carpeta en el destino: " + ex.Message, false);
                    Anotar("ERROR al crear " + destinoRaiz + ": " + ex.Message);
                    continue;
                }

                foreach (string relDir in oc.Directorios)
                {
                    if (Cancelar) break;
                    try
                    {
                        Directory.CreateDirectory(Rutas.Largo(Path.Combine(destinoRaiz, relDir)));
                    }
                    catch (Exception ex)
                    {
                        Estado.AnadirFallo(Path.Combine(oc.NombreDestino, relDir), "No se pudo crear la subcarpeta: " + ex.Message, false);
                    }
                }

                foreach (Fichero f in oc.Ficheros)
                {
                    if (Cancelar) break;
                    string relMostrado = Path.Combine(oc.NombreDestino, f.Rel);
                    Estado.FicheroActual = relMostrado;
                    string destinoFichero = Path.Combine(destinoRaiz, f.Rel);
                    try
                    {
                        FileInfo fiDestino = new FileInfo(Rutas.Largo(destinoFichero));
                        if (fiDestino.Exists)
                        {
                            bool identico = fiDestino.Length == f.Tam &&
                                            Math.Abs((fiDestino.LastWriteTimeUtc - f.FechaUtc).TotalSeconds) <= 3.0;
                            if (identico)
                            {
                                Estado.Omitidos++;
                                Interlocked.Add(ref Estado.BytesProcesados, f.Tam);
                                continue;
                            }
                            if (!_sobrescribir)
                            {
                                Estado.Conflictos++;
                                Estado.AnadirFallo(relMostrado, "Ya existe en el destino con otro contenido (no se sobrescribe).", true);
                                Interlocked.Add(ref Estado.BytesProcesados, f.Tam);
                                continue;
                            }
                        }

                        string padre = Path.GetDirectoryName(destinoFichero);
                        if (!string.IsNullOrEmpty(padre) && !Directory.Exists(Rutas.Largo(padre)))
                        {
                            Directory.CreateDirectory(Rutas.Largo(padre));
                        }

                        string origenFichero = Path.Combine(oc.Ruta, f.Rel);
                        CopiarFichero(Rutas.Largo(origenFichero), Rutas.Largo(destinoFichero), f);
                        Estado.ArchivosCopiados++;

                        if (_verificar)
                        {
                            FileInfo chk = new FileInfo(Rutas.Largo(destinoFichero));
                            bool ok = chk.Exists && chk.Length == f.Tam &&
                                      Math.Abs((chk.LastWriteTimeUtc - f.FechaUtc).TotalSeconds) <= 3.0;
                            if (!ok)
                            {
                                Estado.AnadirFallo(relMostrado, "La comprobación posterior no coincide (tamaño o fecha).", false);
                                Anotar("AVISO de verificación: " + relMostrado);
                            }
                        }
                        Interlocked.Add(ref Estado.BytesProcesados, f.Tam);
                        Estado.ArchivosHechos++;
                    }
                    catch (OperationCanceledException)
                    {
                        Cancelar = true;
                        break;
                    }
                    catch (Exception ex)
                    {
                        Estado.AnadirFallo(relMostrado, ex.Message, false);
                        Anotar("ERROR: " + relMostrado + " → " + ex.Message);
                        Interlocked.Add(ref Estado.BytesProcesados, f.Tam);
                    }
                }
            }

            Interlocked.Exchange(ref Estado.BytesEnCurso, 0);
            Estado.EnMarcha = false;
            Estado.Terminado = true;
            Estado.Cancelado = Cancelar;
            Estado.Segundos = (DateTime.Now - Estado.Inicio).TotalSeconds;
            Anotar(string.Format(Cultura.Es, "Fin: {0} copiados, {1} idénticos omitidos, {2} avisos, {3} errores.",
                Formato.Entero(Estado.ArchivosCopiados), Formato.Entero(Estado.Omitidos), Formato.Entero(Estado.Conflictos), Formato.Entero(Estado.NumErrores)));
        }

        private void CopiarFichero(string origen, string destino, Fichero f)
        {
            byte[] buffer = new byte[1048576];
            Interlocked.Exchange(ref Estado.BytesEnCurso, 0);
            try
            {
                using (FileStream fsIn = new FileStream(origen, FileMode.Open, FileAccess.Read, FileShare.Read, 65536))
                using (FileStream fsOut = new FileStream(destino, FileMode.Create, FileAccess.Write, FileShare.None, 65536))
                {
                    int leidos;
                    while ((leidos = fsIn.Read(buffer, 0, buffer.Length)) > 0)
                    {
                        if (Cancelar) throw new OperationCanceledException();
                        fsOut.Write(buffer, 0, leidos);
                        Interlocked.Add(ref Estado.BytesEnCurso, leidos);
                    }
                }
            }
            catch (OperationCanceledException)
            {
                try { File.Delete(destino); } catch { }
                throw;
            }
            catch
            {
                try { File.Delete(destino); } catch { }
                throw;
            }

            try
            {
                File.SetLastWriteTimeUtc(destino, f.FechaUtc);
                File.SetCreationTimeUtc(destino, f.FechaUtc);
            }
            catch { }
        }

        public static void Contar(string ruta, out long archivos, out long bytes)
        {
            archivos = 0;
            bytes = 0;
            ContarDir(ruta, ref archivos, ref bytes);
        }

        private static void ContarDir(string dir, ref long archivos, ref long bytes)
        {
            string[] entradas;
            try { entradas = Directory.GetFileSystemEntries(dir); }
            catch { return; }
            foreach (string entrada in entradas)
            {
                string limpio = Rutas.SinPrefijo(entrada);
                try
                {
                    FileAttributes at = File.GetAttributes(Rutas.Largo(limpio));
                    if ((at & FileAttributes.ReparsePoint) != 0) continue;
                    if ((at & FileAttributes.Directory) != 0)
                    {
                        ContarDir(limpio, ref archivos, ref bytes);
                    }
                    else
                    {
                        archivos++;
                        bytes += new FileInfo(Rutas.Largo(limpio)).Length;
                    }
                }
                catch { }
            }
        }
    }

    internal static class Json
    {
        public static string Esc(string s)
        {
            if (s == null) return "";
            StringBuilder b = new StringBuilder();
            foreach (char c in s)
            {
                switch (c)
                {
                    case '\\': b.Append("\\\\"); break;
                    case '"': b.Append("\\\""); break;
                    case '\n': b.Append("\\n"); break;
                    case '\r': b.Append("\\r"); break;
                    case '\t': b.Append("\\t"); break;
                    default:
                        if (c < 32) b.Append("\\u").Append(((int)c).ToString("x4"));
                        else b.Append(c);
                        break;
                }
            }
            return b.ToString();
        }
    }

    internal static class Informes
    {
        public static string Escribir(MotorCopia motor, bool cancelado)
        {
            EstadoCopia e = motor.Estado;
            string dir = Path.Combine(Config.Dir, "informes");
            try
            {
                Directory.CreateDirectory(dir);
            }
            catch
            {
                dir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "data", "informes");
                Directory.CreateDirectory(dir);
            }
            string baseNombre = "copia-" + DateTime.Now.ToString("yyyyMMdd-HHmmss", Cultura.Es);
            string rutaJson = Path.Combine(dir, baseNombre + ".json");
            string rutaLog = Path.Combine(dir, baseNombre + ".log");

            StringBuilder j = new StringBuilder();
            j.Append("{\n");
            j.Append("  \"app\": \"PASAFOTOS\",\n");
            j.Append("  \"version\": \"").Append(Json.Esc(Constantes.Version)).Append("\",\n");
            j.Append("  \"fecha\": \"").Append(DateTime.Now.ToString("yyyy-MM-ddTHH:mm:sszzz", Cultura.Es)).Append("\",\n");
            j.Append("  \"equipo\": \"").Append(Json.Esc(Environment.MachineName)).Append("\",\n");
            j.Append("  \"usuario\": \"").Append(Json.Esc(Environment.UserName)).Append("\",\n");
            j.Append("  \"destino\": \"").Append(Json.Esc(motor.Destino)).Append("\",\n");
            j.Append("  \"origenes\": [");
            List<string> origenes = motor.Origenes;
            for (int i = 0; i < origenes.Count; i++)
            {
                if (i > 0) j.Append(", ");
                j.Append("\"").Append(Json.Esc(origenes[i])).Append("\"");
            }
            j.Append("],\n");
            j.Append("  \"opciones\": { \"sobrescribir\": ").Append(motor.Sobrescribir ? "true" : "false")
             .Append(", \"verificar\": ").Append(motor.Verificar ? "true" : "false").Append(" },\n");
            j.Append("  \"totales\": { \"archivos\": ").Append(e.ArchivosTotales).Append(", \"bytes\": ").Append(e.BytesTotales).Append(" },\n");
            j.Append("  \"resultado\": {\n");
            j.Append("    \"copiados\": ").Append(e.ArchivosCopiados).Append(",\n");
            j.Append("    \"omitidos_identicos\": ").Append(e.Omitidos).Append(",\n");
            j.Append("    \"conflictos\": ").Append(e.Conflictos).Append(",\n");
            j.Append("    \"errores\": ").Append(e.NumErrores).Append(",\n");
            j.Append("    \"cancelado\": ").Append(cancelado ? "true" : "false").Append(",\n");
            j.Append("    \"segundos\": ").Append(e.Segundos.ToString("0.0", CultureInfo.InvariantCulture)).Append(",\n");
            j.Append("    \"velocidad_mb_s\": ").Append((e.Segundos > 0 ? e.BytesProcesados / 1048576.0 / e.Segundos : 0).ToString("0.00", CultureInfo.InvariantCulture)).Append(",\n");
            j.Append("    \"verificado\": ").Append(motor.Verificar ? "true" : "false").Append("\n");
            j.Append("  },\n");
            j.Append("  \"fallos\": [");
            List<Fallo> fallos = e.CopiaFallos();
            for (int i = 0; i < fallos.Count; i++)
            {
                if (i > 0) j.Append(",");
                j.Append("\n    { \"tipo\": \"").Append(fallos[i].Conflicto ? "conflicto" : "error")
                 .Append("\", \"ruta\": \"").Append(Json.Esc(fallos[i].Ruta))
                 .Append("\", \"mensaje\": \"").Append(Json.Esc(fallos[i].Mensaje)).Append("\" }");
            }
            j.Append("\n  ]\n");
            j.Append("}\n");
            File.WriteAllText(rutaJson, j.ToString(), new UTF8Encoding(false));

            StringBuilder log = new StringBuilder();
            log.AppendLine("PASAFOTOS " + Constantes.Version + " · informe de copia");
            log.AppendLine("Fecha: " + Formato.Fecha(DateTime.Now));
            log.AppendLine("Equipo: " + Environment.MachineName + " · usuario " + Environment.UserName);
            log.AppendLine("Destino: " + motor.Destino);
            log.AppendLine("Orígenes:");
            foreach (string o in origenes) log.AppendLine("  · " + o);
            log.AppendLine("Resultado: " + e.ArchivosCopiados + " copiados, " + e.Omitidos + " idénticos omitidos, " +
                           e.Conflictos + " conflictos, " + e.NumErrores + " errores" + (cancelado ? " · CANCELADO" : ""));
            log.AppendLine("Duración: " + Formato.Duracion(e.Segundos));
            log.AppendLine();
            log.AppendLine("REGISTRO:");
            foreach (string l in motor.Log) log.AppendLine(l);
            File.WriteAllText(rutaLog, log.ToString(), new UTF8Encoding(false));
            return rutaJson;
        }
    }

    internal static class Config
    {
        public static string Destino = "";
        private static string _dirCalculado;

        public static string Dir
        {
            get
            {
                if (_dirCalculado != null) return _dirCalculado;
                string overrideDir = Environment.GetEnvironmentVariable("PASAFOTOS_DATA");
                if (!string.IsNullOrEmpty(overrideDir))
                {
                    _dirCalculado = overrideDir;
                    return _dirCalculado;
                }
                string appData = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "PasaFotos");
                if (SePuedeEscribir(appData))
                {
                    _dirCalculado = appData;
                }
                else
                {
                    _dirCalculado = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "data");
                }
                return _dirCalculado;
            }
        }

        private static bool SePuedeEscribir(string carpeta)
        {
            try
            {
                Directory.CreateDirectory(carpeta);
                string prueba = Path.Combine(carpeta, ".test-" + Guid.NewGuid().ToString("N"));
                File.WriteAllText(prueba, "x");
                File.Delete(prueba);
                return true;
            }
            catch { return false; }
        }

        private static string RutaIni { get { return Path.Combine(Dir, "config.ini"); } }

        public static void Cargar()
        {
            try
            {
                if (!File.Exists(RutaIni)) return;
                foreach (string linea in File.ReadAllLines(RutaIni, Encoding.UTF8))
                {
                    string l = linea.Trim();
                    if (l.Length == 0 || l.StartsWith("#")) continue;
                    int pos = l.IndexOf('=');
                    if (pos <= 0) continue;
                    string clave = l.Substring(0, pos).Trim().ToLowerInvariant();
                    string valor = l.Substring(pos + 1).Trim();
                    if (clave == "destino") Destino = valor;
                }
            }
            catch { }
        }

        public static void Guardar()
        {
            try
            {
                Directory.CreateDirectory(Dir);
                StringBuilder b = new StringBuilder();
                b.AppendLine("# PASAFOTOS · ajustes locales (no contiene contraseñas)");
                b.AppendLine("destino=" + Destino);
                File.WriteAllText(RutaIni, b.ToString(), new UTF8Encoding(false));
            }
            catch { }
        }
    }

    internal static class Historial
    {
        private static string Ruta { get { return Path.Combine(Config.Dir, "historial.tsv"); } }

        public static void Anadir(string destino, long archivos, long bytes, int errores, int conflictos, bool cancelado, double segundos)
        {
            try
            {
                Directory.CreateDirectory(Config.Dir);
                string resultado = cancelado ? "CANCELADA" : (errores > 0 ? "CON ERRORES" : (conflictos > 0 ? "CON AVISOS" : "OK"));
                string linea = string.Join("\t", new string[] {
                    DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss", Cultura.Es),
                    destino,
                    archivos.ToString(),
                    bytes.ToString(),
                    errores.ToString(),
                    conflictos.ToString(),
                    segundos.ToString("0.0", CultureInfo.InvariantCulture),
                    resultado
                });
                File.AppendAllText(Ruta, linea + Environment.NewLine, new UTF8Encoding(false));
            }
            catch { }
        }

        public static string UltimaLinea()
        {
            try
            {
                if (!File.Exists(Ruta)) return null;
                string ultima = null;
                using (StreamReader sr = new StreamReader(Ruta, Encoding.UTF8))
                {
                    string l;
                    while ((l = sr.ReadLine()) != null) if (l.Trim().Length > 0) ultima = l;
                }
                return ultima;
            }
            catch { return null; }
        }
    }

    internal static class Win32
    {
        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern bool AttachConsole(uint dwProcessId);

        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern bool AllocConsole();

        [DllImport("dwmapi.dll")]
        private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);

        public static void BarraTituloOscura(IntPtr hwnd)
        {
            try
            {
                int uno = 1;
                int r = DwmSetWindowAttribute(hwnd, 20, ref uno, sizeof(int));
                if (r != 0) DwmSetWindowAttribute(hwnd, 19, ref uno, sizeof(int));
            }
            catch { }
        }

        public static void PrepararConsola()
        {
            // Si nos lanzan desde una consola, nos enganchamos a ella. Si la salida está
            // redirigida a un pipe/fichero, los handles estándar ya son válidos.
            try { AttachConsole(0xFFFFFFFF); } catch { }
            try
            {
                StreamWriter salida = new StreamWriter(Console.OpenStandardOutput(), new UTF8Encoding(false));
                salida.AutoFlush = true;
                Console.SetOut(salida);
                StreamWriter error = new StreamWriter(Console.OpenStandardError(), new UTF8Encoding(false));
                error.AutoFlush = true;
                Console.SetError(error);
            }
            catch { }
        }
    }

    internal static class Cli
    {
        public static int Ejecutar(Args a)
        {
            if (a.Diagnostico)
            {
                Diagnostico(a.Destino);
                return 0;
            }

            if (a.Origenes.Count == 0 || string.IsNullOrEmpty(a.Destino))
            {
                Console.Error.WriteLine("Uso: PasaFotos.exe --cli --origen \"C:\\fotos\\viaje|D:\\fotos\\playa\" --destino \"\\\\192.168.18.10\\D\\Media\\Fotos\"");
                Console.Error.WriteLine("     [--sobrescribir] [--sin-verificar] [--informe \"ruta\\informe.json\"]");
                return 2;
            }

            foreach (string o in a.Origenes)
            {
                if (!Directory.Exists(Rutas.Largo(o)))
                {
                    Console.Error.WriteLine("ERROR: no existe la carpeta de origen: " + o);
                    return 5;
                }
            }

            MotorCopia motor = new MotorCopia(a.Origenes, a.Destino, a.Sobrescribir, a.Verificar);
            string error;
            long libres;
            if (!MotorCopia.ComprobarEscribible(motor.Destino, true, out error, out libres))
            {
                Console.Error.WriteLine("ERROR: " + error);
                return 3;
            }

            Console.WriteLine("PASAFOTOS " + Constantes.Version + " · modo automático");
            Console.WriteLine("Destino: " + motor.Destino + (libres > 0 ? "  (" + Formato.Bytes(libres) + " libres)" : ""));
            motor.Escanear();
            Console.WriteLine("Analizado: " + Formato.Entero(motor.Estado.ArchivosTotales) + " ficheros, " + Formato.Bytes(motor.Estado.BytesTotales));
            motor.Copiar();

            string rutaInforme = Informes.Escribir(motor, motor.Cancelar || motor.Estado.Cancelado);
            if (!string.IsNullOrEmpty(a.Informe))
            {
                try
                {
                    string dir = Path.GetDirectoryName(Path.GetFullPath(a.Informe));
                    if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
                    File.Copy(rutaInforme, a.Informe, true);
                    rutaInforme = a.Informe;
                }
                catch (Exception ex) { Console.Error.WriteLine("AVISO: no se pudo copiar el informe: " + ex.Message); }
            }

            Console.WriteLine(string.Format(Cultura.Es,
                "RESULTADO: {0} copiados · {1} idénticos omitidos · {2} conflictos · {3} errores · {4}",
                Formato.Entero(motor.Estado.ArchivosCopiados), Formato.Entero(motor.Estado.Omitidos),
                Formato.Entero(motor.Estado.Conflictos), Formato.Entero(motor.Estado.NumErrores), Formato.Duracion(motor.Estado.Segundos)));
            Console.WriteLine("Informe: " + rutaInforme);

            if (motor.Cancelar || motor.Estado.Cancelado) return 4;
            return (motor.Estado.NumErrores > 0 || motor.Estado.Conflictos > 0) ? 1 : 0;
        }

        private static void Diagnostico(string destino)
        {
            Console.WriteLine("PASAFOTOS " + Constantes.Version + " · diagnóstico");
            try { Console.WriteLine("Usuario: " + System.Security.Principal.WindowsIdentity.GetCurrent().Name); } catch { }
            Console.WriteLine("Equipo: " + Environment.MachineName + " · SO " + Environment.OSVersion.VersionString);
            Console.WriteLine("Ejecutable: " + System.Reflection.Assembly.GetExecutingAssembly().Location);
            Console.WriteLine("Directorio actual: " + Environment.CurrentDirectory);
            Console.WriteLine("Carpeta de datos: " + Config.Dir);
            Console.WriteLine("Cultura: " + Cultura.Es.Name + " · UI " + System.Globalization.CultureInfo.CurrentUICulture.Name);
            Console.WriteLine();
            Console.WriteLine("Pruebas de escritura:");
            ProbarEscritura("TEMP", Environment.GetEnvironmentVariable("TEMP"));
            ProbarEscritura("APPDATA", Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData));
            ProbarEscritura("Escritorio", Environment.GetFolderPath(Environment.SpecialFolder.Desktop));
            ProbarEscritura("Carpeta de datos", Config.Dir);
            ProbarEscritura("Carpeta de la app", AppDomain.CurrentDomain.BaseDirectory);
            if (!string.IsNullOrEmpty(destino)) ProbarEscritura("Destino", destino);
        }

        private static void ProbarEscritura(string etiqueta, string ruta)
        {
            if (string.IsNullOrEmpty(ruta)) { Console.WriteLine("  OMITIDO " + etiqueta + " (sin ruta)"); return; }
            try
            {
                string p = Path.Combine(ruta, "prueba-" + Guid.NewGuid().ToString("N") + ".txt");
                File.WriteAllText(p, "x");
                File.Delete(p);
                Console.WriteLine("  OK      " + etiqueta + " → " + ruta);
            }
            catch (Exception ex)
            {
                Console.WriteLine("  FALLO   " + etiqueta + " → " + ruta + " :: " + ex.GetType().Name + ": " + ex.Message);
            }
        }
    }

    // ------------------------------------------------------------------
    // Diálogo moderno de selección de carpetas (IFileOpenDialog)
    // ------------------------------------------------------------------
    internal static class FolderDialog
    {
        [Flags]
        private enum FOS : uint
        {
            FOS_PICKFOLDERS = 0x20,
            FOS_FORCEFILESYSTEM = 0x40,
            FOS_ALLOWMULTISELECT = 0x200,
            FOS_PATHMUSTEXIST = 0x800
        }

        private enum SIGDN : uint
        {
            FILESYSPATH = 0x80058000
        }

        [ComImport, Guid("DC1C5A9C-E88A-4dde-A5A1-60F82A20AEF7")]
        private class FileOpenDialogRCW { }

        [ComImport, Guid("42f85136-db7e-439c-85f1-e4075d135fc8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        private interface IFileDialog
        {
            [PreserveSig] int Show(IntPtr parent);
            void SetFileTypes(uint cFileTypes, IntPtr rgFilterSpec);
            void SetFileTypeIndex(uint iFileType);
            void GetFileTypeIndex(out uint piFileType);
            void Advise(IntPtr pfde, out uint pdwCookie);
            void Unadvise(uint dwCookie);
            void SetOptions(FOS fos);
            void GetOptions(out FOS pfos);
            void SetDefaultFolder(IShellItem psi);
            void SetFolder(IShellItem psi);
            void GetFolder(out IShellItem ppsi);
            void GetCurrentSelection(out IShellItem ppsi);
            void SetFileName([MarshalAs(UnmanagedType.LPWStr)] string pszName);
            void GetFileName([MarshalAs(UnmanagedType.LPWStr)] out string pszName);
            void SetTitle([MarshalAs(UnmanagedType.LPWStr)] string pszTitle);
            void SetOkButtonLabel([MarshalAs(UnmanagedType.LPWStr)] string pszText);
            void SetFileNameLabel([MarshalAs(UnmanagedType.LPWStr)] string pszLabel);
            void GetResult(out IShellItem ppsi);
            void AddPlace([MarshalAs(UnmanagedType.LPWStr)] string pszName, int fdap);
            void SetDefaultExtension([MarshalAs(UnmanagedType.LPWStr)] string pszDefaultExtension);
            void Close(int hr);
            void SetClientGuid(ref Guid guid);
            void ClearClientData();
            void SetFilter(IntPtr pFilter);
        }

        [ComImport, Guid("d57c7288-d4ad-4768-be02-9d969532d960"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        private interface IFileOpenDialog : IFileDialog
        {
            void GetResults(out IShellItemArray ppenum);
            void GetSelectedItems(out IShellItemArray ppsai);
        }

        [ComImport, Guid("43826d1e-e718-42ee-bc55-a1e261c37bfe"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        private interface IShellItem
        {
            void BindToHandler(IntPtr pbc, ref Guid bhid, ref Guid riid, out IntPtr ppv);
            void GetParent(out IShellItem ppsi);
            void GetDisplayName(SIGDN sigdnName, out IntPtr ppszName);
            void GetAttributes(uint sfgaoMask, out uint psfgaoAttribs);
            void Compare(IShellItem psi, uint hint, out int piOrder);
        }

        [ComImport, Guid("b63ea76d-1f85-456f-a19c-48159efa858b"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        private interface IShellItemArray
        {
            void BindToHandler(IntPtr pbc, ref Guid bhid, ref Guid riid, out IntPtr ppv);
            void GetPropertyStore(int flags, ref Guid riid, out IntPtr ppv);
            void GetPropertyDescriptionList(IntPtr keyType, ref Guid riid, out IntPtr ppv);
            void GetAttributes(uint dwAttribFlags, out uint pdwAttribValue);
            void GetCount(out uint pdwNumItems);
            void GetItemAt(uint dwIndex, out IShellItem ppsi);
            void EnumItems(out IntPtr ppenumShellItems);
        }

        [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
        private static extern int SHCreateItemFromParsingName(string pszPath, IntPtr pbc, ref Guid riid, out IShellItem ppv);

        private static IShellItem CrearItem(string ruta)
        {
            if (string.IsNullOrEmpty(ruta)) return null;
            try
            {
                Guid iid = new Guid("43826d1e-e718-42ee-bc55-a1e261c37bfe");
                IShellItem item;
                int hr = SHCreateItemFromParsingName(ruta, IntPtr.Zero, ref iid, out item);
                if (hr == 0) return item;
            }
            catch { }
            return null;
        }

        private static string RutaDeItem(IShellItem item)
        {
            IntPtr ptr;
            item.GetDisplayName(SIGDN.FILESYSPATH, out ptr);
            try
            {
                return Marshal.PtrToStringUni(ptr);
            }
            finally
            {
                if (ptr != IntPtr.Zero) Marshal.FreeCoTaskMem(ptr);
            }
        }

        public static string[] ElegirVarias(IntPtr ventana, string inicial)
        {
            IFileOpenDialog dlg = null;
            try
            {
                dlg = (IFileOpenDialog)new FileOpenDialogRCW();
                FOS opciones;
                dlg.GetOptions(out opciones);
                dlg.SetOptions(opciones | FOS.FOS_PICKFOLDERS | FOS.FOS_ALLOWMULTISELECT | FOS.FOS_FORCEFILESYSTEM | FOS.FOS_PATHMUSTEXIST);
                dlg.SetTitle("Elige las carpetas que quieres copiar (Ctrl+clic para varias)");
                dlg.SetOkButtonLabel("Añadir estas carpetas");
                IShellItem item = CrearItem(inicial);
                if (item != null)
                {
                    try { dlg.SetFolder(item); }
                    catch { }
                    finally { Marshal.ReleaseComObject(item); }
                }
                int hr = dlg.Show(ventana);
                if (hr != 0) return new string[0];
                IShellItemArray array;
                dlg.GetResults(out array);
                uint n;
                array.GetCount(out n);
                List<string> res = new List<string>();
                for (uint i = 0; i < n; i++)
                {
                    IShellItem it;
                    array.GetItemAt(i, out it);
                    try { res.Add(RutaDeItem(it)); }
                    finally { Marshal.ReleaseComObject(it); }
                }
                Marshal.ReleaseComObject(array);
                return res.ToArray();
            }
            catch
            {
                return new string[0];
            }
            finally
            {
                if (dlg != null) Marshal.ReleaseComObject(dlg);
            }
        }

        public static string ElegirUna(IntPtr ventana, string inicial)
        {
            IFileOpenDialog dlg = null;
            try
            {
                dlg = (IFileOpenDialog)new FileOpenDialogRCW();
                FOS opciones;
                dlg.GetOptions(out opciones);
                dlg.SetOptions(opciones | FOS.FOS_PICKFOLDERS | FOS.FOS_FORCEFILESYSTEM | FOS.FOS_PATHMUSTEXIST);
                dlg.SetTitle("Elige la carpeta de destino en el servidor");
                dlg.SetOkButtonLabel("Usar esta carpeta");
                IShellItem item = CrearItem(inicial);
                if (item != null)
                {
                    try { dlg.SetFolder(item); }
                    catch { }
                    finally { Marshal.ReleaseComObject(item); }
                }
                int hr = dlg.Show(ventana);
                if (hr != 0) return null;
                IShellItem res;
                dlg.GetResult(out res);
                try { return RutaDeItem(res); }
                finally { Marshal.ReleaseComObject(res); }
            }
            catch
            {
                return null;
            }
            finally
            {
                if (dlg != null) Marshal.ReleaseComObject(dlg);
            }
        }
    }
}
