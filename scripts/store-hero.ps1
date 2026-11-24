# Image « héros » 16:9 de la fiche du Microsoft Store (1920 × 1080), une par
# langue : la capture du diagnostic, centrée sur le fond sombre de
# l'application, avec un fin contour. Sans le nom du produit, comme le
# demande le Store : la barre de titre de la fenêtre est retirée.
#   powershell -ExecutionPolicy Bypass -File scripts/store-hero.ps1
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot -Parent
$shots = Join-Path $root "docs\store\screens"
$out = Join-Path $root "docs\store\logos"
New-Item -ItemType Directory -Force $out | Out-Null

foreach ($lang in @("fr", "en")) {
  $shot = [System.Drawing.Image]::FromFile((Join-Path $shots "$lang-2-diagnostic.png"))
  $bmp = New-Object System.Drawing.Bitmap 1920, 1080
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.Clear([System.Drawing.ColorTranslator]::FromHtml("#020617"))
  # La barre de titre (avec « Slowfi ») est coupée.
  $top = 40
  $src = New-Object System.Drawing.Rectangle 0, $top, $shot.Width, ($shot.Height - $top)
  $w = 1560
  $h = [math]::Round($w * $src.Height / $src.Width)
  $x = [math]::Round((1920 - $w) / 2)
  $y = [math]::Round((1080 - $h) / 2)
  $dst = New-Object System.Drawing.Rectangle $x, $y, $w, $h
  $g.DrawImage($shot, $dst, $src, [System.Drawing.GraphicsUnit]::Pixel)
  $pen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#1e293b")), 2
  $g.DrawRectangle($pen, $x - 1, $y - 1, $w + 1, $h + 1)
  $g.Dispose()
  $bmp.Save((Join-Path $out "heros-16x9-$lang.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  $shot.Dispose()
}
Get-ChildItem $out -Filter "heros-*" | Select-Object Name, Length
