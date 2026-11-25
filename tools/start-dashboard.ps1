$ErrorActionPreference = 'Stop'
$dist = Join-Path (Split-Path $PSScriptRoot -Parent) 'dist'
$snapshot = Join-Path $dist 'data\config-snapshot.json'
if (!(Test-Path -LiteralPath $snapshot)) { throw "Missing snapshot: $snapshot" }
$python = (Get-Command python -ErrorAction SilentlyContinue).Source
if (!$python -or $python -like '*\Microsoft\WindowsApps\*') {
    $python = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
}
if (!(Test-Path -LiteralPath $python)) { throw 'Python is required to serve the static dashboard.' }
$expected = [Convert]::ToBase64String([IO.File]::ReadAllBytes($snapshot))
foreach ($port in 8080..8090) {
    $url = "http://127.0.0.1:$port/"
    try {
        $response = Invoke-WebRequest "${url}data/config-snapshot.json" -UseBasicParsing -TimeoutSec 1
        if ([Convert]::ToBase64String($response.RawContentStream.ToArray()) -eq $expected) {
            Start-Process $url
            exit 0
        }
    } catch { }
    $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $port)
    try { $listener.Start() } catch { continue } finally { $listener.Stop() }
    $server = Start-Process -FilePath $python -ArgumentList @('-m', 'http.server', "$port", '--bind', '127.0.0.1', '--directory', ('"' + $dist + '"')) -WindowStyle Hidden -PassThru
    foreach ($attempt in 1..30) {
        try {
            $response = Invoke-WebRequest "${url}data/config-snapshot.json" -UseBasicParsing -TimeoutSec 1
            if ([Convert]::ToBase64String($response.RawContentStream.ToArray()) -eq $expected) {
                Start-Process $url
                exit 0
            }
        } catch { }
        if ($server.HasExited) { break }
        Start-Sleep -Milliseconds 100
    }
    if (!$server.HasExited) { Stop-Process -Id $server.Id }
}
throw 'Cannot start dashboard on local ports 8080-8090.'
