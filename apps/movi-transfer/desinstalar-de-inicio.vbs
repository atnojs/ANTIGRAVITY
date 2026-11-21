Option Explicit
' Movi Transfer — quita el arranque automático con Windows.
Dim sh, inicio, lnk
Set sh = CreateObject("WScript.Shell")
inicio = sh.SpecialFolders("Startup")
lnk = inicio & "\Movi Transfer.lnk"

If CreateObject("Scripting.FileSystemObject").FileExists(lnk) Then
  CreateObject("Scripting.FileSystemObject").DeleteFile lnk, True
  MsgBox "Arranque automatico desactivado.", 64, "Movi Transfer"
Else
  MsgBox "No habia ningun arranque automatico instalado.", 64, "Movi Transfer"
End If
