' Agente de Google Flow en segundo plano (sin ventana).
' Pensado para la carpeta Inicio de Windows: arranca el agente al encender el PC.
' No duplica instancias: si ya hay un agente vivo, el nuevo sale solo con su lock.

Option Explicit

Dim fso, shell, base, python, script, comando, yaVivo, procesos, p, cmd

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

base = fso.GetParentFolderName(WScript.ScriptFullName)
python = base & "\.venv\Scripts\pythonw.exe"
script = base & "\flow_agent.py"

If Not fso.FileExists(python) Then WScript.Quit 3
If Not fso.FileExists(script) Then WScript.Quit 4
If Not fso.FileExists(base & "\agente.json") Then WScript.Quit 5

' ¿Hay ya un agente en marcha? Entonces no se arranca otro.
yaVivo = False
Set procesos = GetObject("winmgmts:\\.\root\cimv2").ExecQuery( _
  "SELECT ProcessId, CommandLine FROM Win32_Process WHERE Name='pythonw.exe' OR Name='python.exe'")
For Each p In procesos
  cmd = "" & p.CommandLine
  If InStr(cmd, "flow_agent.py") > 0 Then
    yaVivo = True
    Exit For
  End If
Next

If Not yaVivo Then
  ' --minutes 720: queda vivo 12 horas; si el PC sigue encendido, se releva
  ' solo cada arranque. Cada trabajo se toma de uno en uno.
  shell.CurrentDirectory = base
  shell.Run """" & python & """ """ & script & """ --minutes 720", 0, False
End If
