Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get directory of this script (backend folder)
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Check if backend is already responding on port 8000
On Error Resume Next
Set xmlhttp = CreateObject("MSXML2.ServerXMLHTTP.6.0")
xmlhttp.open "GET", "http://127.0.0.1:8000/", False
xmlhttp.setTimeouts 1000, 1000, 1000, 1000
xmlhttp.send

If Err.Number = 0 And xmlhttp.status >= 200 And xmlhttp.status < 400 Then
    ' Backend is already running
    WScript.Quit
End If
On Error GoTo 0

' Command to launch uvicorn without a command window (0 = hidden)
pythonPath = "C:\Users\NIPUN\AppData\Local\Programs\Python\Python312\python.exe"
If Not fso.FileExists(pythonPath) Then
    pythonPath = "python"
End If

cmd = "cmd.exe /c cd /d """ & scriptDir & """ && """ & pythonPath & """ -m uvicorn main:app --host 127.0.0.1 --port 8000 >> backend.log 2>&1"
WshShell.Run cmd, 0, False
