' Worker local de descargas - arranque oculto, sin .bat (asi Windows no pregunta)
'
' Quien lo lanza:
'   - el acceso directo de la carpeta Inicio (al entrar en Windows)
'   - la tarea programada "DescargasWorkerWatchdog" (cada 5 minutos)
'
' Si ya hay un worker.mjs vivo, sale sin hacer nada: nunca se duplica.
' Cada arranque, parada y reintento queda apuntado en
'   %LOCALAPPDATA%\descargas-worker\supervisor.log
' para poder saber por que dejo de descargar (antes se moria en silencio).
Option Explicit

Const ESPERA_REINTENTO_MS = 10000    ' espera normal entre reintentos
Const ESPERA_CONFIG_MS = 300000      ' 5 min si el fallo es de configuracion
Const LOG_MAX_BYTES = 1048576        ' rota supervisor.log a 1 MB

Dim sh, fso, dir, worker, nodeExe, codigo, wmi, procesos, p, yaCorre
Dim logDir, logFile

Set sh  = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
dir     = "E:\ANTIGRAVITY\tools\descargador"
worker  = dir & "\worker.mjs"
nodeExe = "C:\Program Files\nodejs\node.exe"
logDir  = sh.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\descargas-worker"
logFile = logDir & "\supervisor.log"

If Not fso.FileExists(worker) Then WScript.Quit 0
If Not fso.FileExists(nodeExe) Then WScript.Quit 0

' Ya hay un worker vivo (lo habra lanzado el Inicio o el watchdog): no duplicar.
yaCorre = False
On Error Resume Next
Set wmi = GetObject("winmgmts:\\.\root\cimv2")
Set procesos = wmi.ExecQuery("SELECT ProcessId, CommandLine FROM Win32_Process WHERE Name = 'node.exe'")
For Each p In procesos
  If InStr(LCase(p.CommandLine & ""), "worker.mjs") > 0 Then yaCorre = True
Next
On Error GoTo 0
If yaCorre Then WScript.Quit 0

Apuntar "supervisor arrancado"
sh.CurrentDirectory = dir

Do
  Apuntar "arrancando el worker"
  codigo = sh.Run("""" & nodeExe & """ """ & worker & """", 0, True)
  If codigo = 2 Then
    ' Error de configuracion: no sirve reintentar cada 10 s, pero tampoco
    ' hay que quedarse parado para siempre. Se reintenta en 5 minutos.
    Apuntar "ERROR DE CONFIGURACION (codigo 2): reintento en 5 minutos"
    WScript.Sleep ESPERA_CONFIG_MS
  Else
    Apuntar "el worker termino con codigo " & codigo & ": reintento en 10 segundos"
    WScript.Sleep ESPERA_REINTENTO_MS
  End If
Loop

' Apunta una linea con fecha y hora en supervisor.log (rota a 1 MB).
Sub Apuntar(texto)
  On Error Resume Next
  Dim f
  If Not fso.FolderExists(logDir) Then fso.CreateFolder logDir
  If fso.FileExists(logFile) Then
    If fso.GetFile(logFile).Size > LOG_MAX_BYTES Then
      If fso.FileExists(logFile & ".1") Then fso.DeleteFile logFile & ".1", True
      fso.MoveFile logFile, logFile & ".1"
    End If
  End If
  Set f = fso.OpenTextFile(logFile, 8, True)
  f.WriteLine Now & "  " & texto
  f.Close
  On Error GoTo 0
End Sub
