Option Explicit
' Movi Transfer — arranca el servidor oculto (sin ventana), para el inicio de sesión.
Dim fso, sh, base
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
base = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = base
sh.Run "node.exe """ & base & "\server.mjs""", 0, False
