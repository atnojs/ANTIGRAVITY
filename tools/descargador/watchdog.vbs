' Watchdog del worker de descargas.
'
' Lo ejecuta la tarea programada "DescargasWorkerWatchdog" cada 5 minutos.
' Comprueba si hay un worker.mjs vivo:
'   - si lo hay, termina al instante (no duplica nada);
'   - si no lo hay, lanza iniciar-worker.vbs en segundo plano y termina.
'
' Es a proposito un script CORTO: la tarea no se queda colgada esperando al
' worker (si se quedara, el planificador la mataria a los 10 minutos y se
' llevaria por delante la descarga en curso).
Option Explicit

Dim sh, fso, wmi, procesos, p, yaCorre, dir, vbs
Set sh  = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

dir = "E:\ANTIGRAVITY\tools\descargador"
vbs = dir & "\iniciar-worker.vbs"
If Not fso.FileExists(vbs) Then WScript.Quit 0

yaCorre = False
On Error Resume Next
Set wmi = GetObject("winmgmts:\\.\root\cimv2")
Set procesos = wmi.ExecQuery("SELECT CommandLine FROM Win32_Process WHERE Name = 'node.exe'")
For Each p In procesos
  If InStr(LCase(p.CommandLine & ""), "worker.mjs") > 0 Then yaCorre = True
Next
On Error GoTo 0

If yaCorre Then WScript.Quit 0

' Lanza el supervisor oculto y SIN esperar: este script debe salir ya.
sh.CurrentDirectory = dir
sh.Run "wscript.exe """ & vbs & """", 0, False
