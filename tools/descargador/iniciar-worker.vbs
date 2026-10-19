' =====================================================================
'  Worker local de descargas - Antigravity
'  Arranca iniciar-worker.bat en segundo plano (sin ventana) y sin el
'  aviso de seguridad de Windows, que salta al lanzar .bat desde Inicio.
'  Si ya hay un worker corriendo no lanza otro.
' =====================================================================
Option Explicit

Dim sh, fso, dir, bat, wmi, procesos, p, yaCorre
Set sh  = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

dir = "E:\ANTIGRAVITY\tools\descargador"
bat = dir & "\iniciar-worker.bat"
If Not fso.FileExists(bat) Then WScript.Quit 0

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
sh.Run """" & bat & """", 0, False