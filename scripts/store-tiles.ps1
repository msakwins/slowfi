# Génère build/appx/ : les images du paquet Microsoft Store, à partir de
# l'icône de l'application (electron/icon.png, 1024 × 1024).
#   powershell -ExecutionPolicy Bypass -File scripts/store-tiles.ps1
# Carrées : l'icône seule, fond transparent, avec une petite marge. Large :
# l'icône centrée sur le fond sombre de l'application.
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot -Parent
$out = Join-Path $root "build\appx"
New-Item -ItemType Directory -Force $out | Out-Null
$icon = [System.Drawing.Image]::FromFile((Join-Path $root "electron\icon.png"))

function Save-Tile($name, $w, $h, $scale, $background) {
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  if ($background) { $g.Clear([System.Drawing.ColorTranslator]::FromHtml($background)) }
  else { $g.Clear([System.Drawing.Color]::Transparent) }
  $size = [math]::Round([math]::Min($w, $h) * $scale)
  $x = [math]::Round(($w - $size) / 2)
  $y = [math]::Round(($h - $size) / 2)
  $g.DrawImage($icon, $x, $y, $size, $size)
  $g.Dispose()
  $bmp.Save((Join-Path $out $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

Save-Tile "StoreLogo.png" 50 50 0.9 $null
Save-Tile "Square44x44Logo.png" 44 44 0.9 $null
Save-Tile "SmallTile.png" 71 71 0.84 $null
Save-Tile "Square150x150Logo.png" 150 150 0.84 $null
Save-Tile "LargeTile.png" 310 310 0.84 $null
Save-Tile "Wide310x150Logo.png" 310 150 0.72 "#020617"

# Logos de la fiche du Store (envoyés dans Partner Center, pas dans le
# paquet) : affiche 9:16 et carré 1:1, l'icône sur le fond sombre.
$listing = Join-Path $root "docs\store\logos"
New-Item -ItemType Directory -Force $listing | Out-Null
$saved = $out
$out = $listing
Save-Tile "affiche-9x16.png" 1440 2160 0.5 "#020617"
Save-Tile "carre-1x1.png" 2160 2160 0.5 "#020617"
$out = $saved
$icon.Dispose()
Get-ChildItem $out | Select-Object Name, Length
