Option Explicit
' Movi Transfer — crea un acceso directo en la carpeta Inicio para arrancar con Windows.
Dim fso, sh, base, inicio, lnk
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
base = fso.GetParentFolderName(WScript.ScriptFullName)
inicio = sh.SpecialFolders("Startup")

Set lnk = sh.CreateShortcut(inicio & "\Movi Transfer.lnk")
lnk.TargetPath = "wscript.exe"
lnk.Arguments = """" & base & "\iniciar-oculto.vbs"""
lnk.WorkingDirectory = base
lnk.Description = "Movi Transfer - servidor local de archivos"
lnk.WindowStyle = 7
lnk.Save

MsgBox "Movi Transfer arrancara al iniciar sesion." & vbCrLf & _
       "Acceso creado en:" & vbCrLf & inicio, 64, "Movi Transfer"
