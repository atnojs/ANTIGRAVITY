<#
  elegir-carpeta.ps1 — Abre el explorador de carpetas MODERNO de Windows (el
  grande, con barra de ruta y redimensionable) y escribe la carpeta elegida en
  la salida estándar. Si se cancela, no escribe nada y sale con código 2.

  El diálogo clásico de .NET (System.Windows.Forms.FolderBrowserDialog) de
  PowerShell 5.1 es el antiguo, pequeño y de tamaño fijo; por eso se usa el
  IFileOpenDialog de Windows Vista+ con FOS_PICKFOLDERS.

  Uso:
    powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File elegir-carpeta.ps1 `
      -Titulo "Elige la carpeta donde guardar las descargas" -Inicial "D:\Vídeos"
#>

param(
    [string]$Titulo = 'Elige la carpeta donde guardar las descargas',
    [string]$Inicial = '',
    [string]$Boton = 'Elegir esta carpeta'
)

$ErrorActionPreference = 'Stop'

# La ruta puede llevar tildes (D:\Vídeos). Sin esto, la consola la escribe con el
# juego de caracteres local y al worker le llega corrupta ("D:\V¡deos").
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)

if (-not ('FileDialogPicker' -as [type])) {
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

[ComImport, Guid("42f85136-db7e-439c-85f1-e4075d135fc8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IFileDialog
{
    [PreserveSig] int Show(IntPtr parent);
    void SetFileTypes(uint cFileTypes, IntPtr rgFilterSpec);
    void SetFileTypeIndex(uint iFileType);
    void GetFileTypeIndex(out uint piFileType);
    void Advise(IntPtr pfde, out uint pdwCookie);
    void Unadvise(uint dwCookie);
    void SetOptions(uint fos);
    void GetOptions(out uint pfos);
    void SetDefaultFolder(IntPtr psi);
    void SetFolder(IntPtr psi);
    void GetFolder(out IntPtr ppsi);
    void GetCurrentSelection(out IntPtr ppsi);
    void SetFileName([MarshalAs(UnmanagedType.LPWStr)] string pszName);
    void GetFileName([MarshalAs(UnmanagedType.LPWStr)] out string pszName);
    void SetTitle([MarshalAs(UnmanagedType.LPWStr)] string pszTitle);
    void SetOkButtonLabel([MarshalAs(UnmanagedType.LPWStr)] string pszText);
    void SetFileNameLabel([MarshalAs(UnmanagedType.LPWStr)] string pszLabel);
    void GetResult(out IShellItem ppsi);
}

[ComImport, Guid("43826d1e-e718-42ee-bc55-a1e261c37bfe"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IShellItem
{
    void BindToHandler(IntPtr pbc, ref Guid bhid, ref Guid riid, out IntPtr ppv);
    void GetParent(out IShellItem ppsi);
    void GetDisplayName(uint sigdnName, out IntPtr ppszName);
    void GetAttributes(uint sfgaoMask, out uint psfgaoAttribs);
    void Compare(IShellItem psi, uint hint, out int piOrder);
}

public static class FileDialogPicker
{
    [DllImport("ole32.dll")]
    private static extern int CoCreateInstance(ref Guid clsid, IntPtr punkOuter, uint dwClsCtx, ref Guid riid, out IntPtr ppv);

    [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
    private static extern int SHCreateItemFromParsingName(string pszPath, IntPtr pbc, ref Guid riid, out IntPtr ppv);

    private const uint FOS_PICKFOLDERS     = 0x00000020;
    private const uint FOS_FORCEFILESYSTEM = 0x00000040;
    private const uint FOS_PATHMUSTEXIST   = 0x00000800;
    private const uint SIGDN_FILESYSPATH   = 0x80058000;

    /// <summary>Devuelve la ruta elegida, o null si se cancela.</summary>
    public static string Elegir(string titulo, string inicial, string boton, IntPtr propietario)
    {
        Guid clsid = new Guid("DC1C5A9C-E88A-4dde-A5A1-60F82A20AEF7");
        Guid iidDialog = new Guid("42f85136-db7e-439c-85f1-e4075d135fc8");
        IntPtr ptr;
        int hr = CoCreateInstance(ref clsid, IntPtr.Zero, 1 /* CLSCTX_INPROC_SERVER */, ref iidDialog, out ptr);
        if (hr != 0 || ptr == IntPtr.Zero) { return null; }

        IFileDialog dialogo = null;
        try
        {
            dialogo = (IFileDialog)Marshal.GetObjectForIUnknown(ptr);
            dialogo.SetOptions(FOS_PICKFOLDERS | FOS_FORCEFILESYSTEM | FOS_PATHMUSTEXIST);
            if (!string.IsNullOrEmpty(titulo)) { dialogo.SetTitle(titulo); }
            if (!string.IsNullOrEmpty(boton)) { dialogo.SetOkButtonLabel(boton); }

            if (!string.IsNullOrEmpty(inicial))
            {
                Guid iidItem = new Guid("43826d1e-e718-42ee-bc55-a1e261c37bfe");
                IntPtr ptrItem;
                if (SHCreateItemFromParsingName(inicial, IntPtr.Zero, ref iidItem, out ptrItem) == 0 && ptrItem != IntPtr.Zero)
                {
                    try { dialogo.SetFolder(ptrItem); }
                    finally { Marshal.Release(ptrItem); }
                }
            }

            int resultado = dialogo.Show(propietario);
            if (resultado != 0) { return null; }  // cancelado

            IShellItem item;
            dialogo.GetResult(out item);
            if (item == null) { return null; }

            IntPtr ptrRuta;
            item.GetDisplayName(SIGDN_FILESYSPATH, out ptrRuta);
            try { return Marshal.PtrToStringUni(ptrRuta); }
            finally { Marshal.FreeCoTaskMem(ptrRuta); }
        }
        finally
        {
            if (dialogo != null) { Marshal.ReleaseComObject(dialogo); }
            Marshal.Release(ptr);
        }
    }
}
'@
}

# Ventana invisible como propietaria: centra el dialogo en la pantalla y lo pone
# por delante (el worker corre minimizado y si no, el explorador saldria detras).
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$dueno = New-Object System.Windows.Forms.Form
$dueno.Text = 'Elegir carpeta'
$dueno.FormBorderStyle = 'None'
$dueno.StartPosition = 'CenterScreen'
$dueno.Size = New-Object System.Drawing.Size(2, 2)
$dueno.ShowInTaskbar = $false
$dueno.TopMost = $true
$dueno.Opacity = 0
$dueno.Show()
try {
    $ruta = [FileDialogPicker]::Elegir($Titulo, $Inicial, $Boton, $dueno.Handle)
} finally {
    $dueno.Close()
    $dueno.Dispose()
}
if ($env:DESCARGAS_DEBUG_CARPETA) {
    $diag = "INICIAL=[" + $Inicial + "]`r`nRESULTADO=[" + $ruta + "]`r`nPUNTOS=" + (($ruta.ToCharArray() | ForEach-Object { [int]$_ }) -join ',')
    [System.IO.File]::WriteAllText($env:DESCARGAS_DEBUG_CARPETA, $diag, (New-Object System.Text.UTF8Encoding($false)))
}
if ([string]::IsNullOrWhiteSpace($ruta)) {
    exit 2
}
[Console]::Out.Write($ruta)
exit 0
