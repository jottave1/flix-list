$ErrorActionPreference = 'Stop'
$projectPath = $PSScriptRoot
$cachePath = Join-Path $projectPath '.cache'
New-Item -ItemType Directory -Path $cachePath -Force | Out-Null
$genreIds = @('34399','1365','6548','8711','8883','5763','1492','783','6839','8933','7424')
foreach ($genreId in $genreIds) {
    $response = Invoke-WebRequest -Uri "https://www.netflix.com/br/browse/genre/$genreId" -TimeoutSec 45
    [IO.File]::WriteAllText((Join-Path $cachePath "$genreId.html"), $response.Content, [Text.UTF8Encoding]::new($false))
    Write-Output "Página $genreId recebida."
}
node (Join-Path $PSScriptRoot 'update-catalog.mjs') --cached
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível atualizar o catálogo.' }
