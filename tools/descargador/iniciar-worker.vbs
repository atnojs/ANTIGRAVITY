' =====================================================================
'  Worker local de descargas - Antigravity
'  Arranca worker.mjs directamente con Node, OCULTO y sin pasar por el
'  .bat (asi Windows no muestra el aviso de "editor desconocido").
'  Bucle: si el worker termina, espera 10 s y lo relanza. Codigo 2 =
'  error de configuracion: no se relanza.
'  Si ya hay un worker corriendo, no lanza otro.
' =====================================================================
Option Explicit

Dim sh, fso, dir, worker, nodeExe, log, codigo, wmi, procesos, p, yaCorre
Set sh  = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

dir    = "E:\ANTIGRAVITY\tools\descargador"
worker = dir & "\worker.mjs"
If Not fso.FileExists(worker) Then WScript.Quit 0

nodeExe = "C:\Program Files\nodejs\node.exe"
If Not fso.FileExists(nodeExe) Then nodeExe = "C:\Program Files\nodejs\node.exe"
If Not fso.FileExists(nodeExe) Then WScript.Quit 0

yaCorre = False
On Error Resume Next
Set wmi = GetObject("winmgmts:\\.\root\cimv2")
Set procesos = wmi.ExecQuery("SELECT ProcessId, CommandLine FROM Win32_Process WHERE Name = 'node.exe'")
For Each p In procesos
  If InStr(LCase(p.CommandLine & ""), "worker.mjs") > 0 Then yaCorre = True
Next
On Error GoTo 0
If yaCorre Then WScript.Quit 0

sh.CurrentDirectory = dir

Do
  codigo = sh.Run("""" & nodeExe & """ """ & worker & """", 0, True)
  If codigo = 2 Then Exit Do
  WScript.Sleep 10000
Loop