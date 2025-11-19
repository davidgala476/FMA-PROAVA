param(
    [int]$DurationSeconds = 15
)

$uri = 'ws://localhost:8080/ws'
$ws = New-Object System.Net.WebSockets.ClientWebSocket
try {
    $ws.ConnectAsync([Uri]$uri, [Threading.CancellationToken]::None).Wait()
    Write-Output "WS Connected to $uri"
    $buffer = New-Object byte[] 8192
    $segment = [System.ArraySegment[byte]]::new($buffer, 0, $buffer.Length)
    $end = [DateTime]::UtcNow.AddSeconds($DurationSeconds)
    while ([DateTime]::UtcNow -lt $end) {
        $result = $ws.ReceiveAsync($segment, [Threading.CancellationToken]::None).Result
        if ($result.Count -gt 0) {
            $msg = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $result.Count)
            Write-Output "WS: $msg"
        }
        if ($result.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Close) { break }
    }
    $ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, 'bye', [Threading.CancellationToken]::None).Wait()
    Write-Output "WS Closed"
} catch {
    Write-Output "WS Error: $_"
}
finally {
    if ($ws.State -ne [System.Net.WebSockets.WebSocketState]::Closed) {
        $ws.Dispose()
    }
}
