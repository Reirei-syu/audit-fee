param(
    [string]$OutputDir = "D:\coding\completed\audit-fee",
    [string]$OutputName = "audit-fee-standalone.html"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $repoRoot "index.html"

if (-not (Test-Path $sourcePath)) {
    throw "Source file not found: $sourcePath"
}

$html = Get-Content -Path $sourcePath -Raw -Encoding UTF8

$vendorFiles = @(
    "tailwind-browser.js",
    "lucide.min.js",
    "react.production.min.js",
    "react-dom.production.min.js",
    "babel.min.js",
    "xlsx.full.min.js"
)

foreach ($vendorFile in $vendorFiles) {
    $vendorPath = Join-Path $repoRoot "vendor\$vendorFile"
    if (-not (Test-Path $vendorPath)) {
        throw "Vendor file not found: $vendorPath"
    }

    $originalTag = "<script src=`"vendor/$vendorFile`"></script>"
    $scriptContent = Get-Content -Path $vendorPath -Raw -Encoding UTF8
    $safeScriptContent = $scriptContent -replace "</script>", "<\/script>"
    $inlineTag = "<script>`r`n$safeScriptContent`r`n</script>"
    $html = $html.Replace($originalTag, $inlineTag)
}

if ($html -match 'src="vendor/' -or $html -match "src='vendor/") {
    throw "Vendor references still exist after bundling."
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$outputPath = Join-Path $OutputDir $OutputName

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($outputPath, $html, $utf8NoBom)

if (-not (Test-Path $outputPath)) {
    throw "Output file was not created: $outputPath"
}

$result = [ordered]@{
    status = "success"
    data = [ordered]@{
        outputPath = $outputPath
        outputDir = $OutputDir
        outputName = $OutputName
        embeddedFiles = $vendorFiles
        sizeBytes = (Get-Item $outputPath).Length
    }
    error = $null
}

$result | ConvertTo-Json -Depth 4
