# Dessine les images de public/ : favicon-48.png, apple-touch-icon.png et
# og-image.png (aperçu des liens partagés), à partir du tracé du logo.
# A relancer si le logo change :
#   powershell -File scripts/draw-images.ps1 -OutDir public

param([string]$OutDir)
Add-Type -AssemblyName System.Drawing

$BG    = [System.Drawing.ColorTranslator]::FromHtml("#020617")
$CYAN  = [System.Drawing.ColorTranslator]::FromHtml("#22d3ee")
$TEXT  = [System.Drawing.ColorTranslator]::FromHtml("#f1f5f9")
$MUTED = [System.Drawing.ColorTranslator]::FromHtml("#94a3b8")

# Tracé du logo, en unités du viewBox 38 x 24 (M1.5 14H5l3.8 7 4.6-15 4.6 15 3.6-10 2.6 3H36)
$PTS = @(@(1.5,14),@(5,14),@(8.8,21),@(13.4,6),@(18,21),@(21.6,11),@(24.2,14),@(36,14))

function New-Canvas($w, $h) {
  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = "AntiAlias"
  $g.TextRenderingHint = "AntiAliasGridFit"
  $g.InterpolationMode = "HighQualityBicubic"
  return @($bmp, $g)
}

# Trace le tracé avec un halo : plusieurs passes larges et transparentes, puis le trait net.
function Draw-Trace($g, [double]$x, [double]$y, [double]$scale, [double]$stroke) {
  $pts = $PTS | ForEach-Object { New-Object System.Drawing.PointF(($x + $_[0] * $scale), ($y + $_[1] * $scale)) }
  # Passes nombreuses et légères : le halo s'estompe en douceur, sans anneaux.
  for ($i = 14; $i -ge 1; $i--) {
    $c = [System.Drawing.Color]::FromArgb(9, $CYAN)
    $pen = New-Object System.Drawing.Pen($c, [single]($stroke * (1 + $i * 0.32)))
    $pen.LineJoin = "Round"; $pen.StartCap = "Round"; $pen.EndCap = "Round"
    $g.DrawLines($pen, $pts); $pen.Dispose()
  }
  $pen = New-Object System.Drawing.Pen($CYAN, [single]$stroke)
  $pen.LineJoin = "Round"; $pen.StartCap = "Round"; $pen.EndCap = "Round"
  $g.DrawLines($pen, $pts); $pen.Dispose()
}

function Fill-RoundRect($g, $brush, $w, $h, $r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = 2 * $r
  $p.AddArc(0, 0, $d, $d, 180, 90); $p.AddArc($w - $d, 0, $d, $d, 270, 90)
  $p.AddArc($w - $d, $h - $d, $d, $d, 0, 90); $p.AddArc(0, $h - $d, $d, $d, 90, 90)
  $p.CloseFigure(); $g.FillPath($brush, $p); $p.Dispose()
}

# Icône carrée : même composition que favicon.svg (fond arrondi, tracé centré).
function Save-Icon($size, $file, $rounded) {
  $c = New-Canvas $size $size; $bmp = $c[0]; $g = $c[1]
  $g.Clear([System.Drawing.Color]::Transparent)
  $bg = New-Object System.Drawing.SolidBrush($BG)
  if ($rounded) { Fill-RoundRect $g $bg $size $size ($size * 14 / 64) } else { $g.FillRectangle($bg, 0, 0, $size, $size) }
  $u = $size / 64
  Draw-Trace $g (5 * $u) (15 * $u) (1.42 * $u) (2.7 * 1.42 * $u)
  $bmp.Save((Join-Path $OutDir $file), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

Save-Icon 48 "favicon-48.png" $true
# iOS arrondit lui-même les coins : fond plein.
Save-Icon 180 "apple-touch-icon.png" $false

# Image d'aperçu 1200 x 630 : le logo au centre, la description dessous.
$W = 1200; $H = 630
$c = New-Canvas $W $H; $bmp = $c[0]; $g = $c[1]
$rect = New-Object System.Drawing.Rectangle(0, 0, $W, $H)
$grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, [System.Drawing.ColorTranslator]::FromHtml("#0b1220"), $BG, 90)
$g.FillRectangle($grad, $rect)

$em = 150.0
$font = New-Object System.Drawing.Font("Segoe UI", [single]$em, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$fmt = [System.Drawing.StringFormat]::GenericTypographic
$track = 0.09 * $em

# Largeur d'un mot lettre par lettre, avec l'espacement du logo (0.09em).
function Measure-Word($word) {
  $w = 0.0
  foreach ($ch in $word.ToCharArray()) { $w += $g.MeasureString([string]$ch, $font, 1000, $fmt).Width + $track }
  return $w
}
function Draw-Word($word, [double]$x, [double]$y) {
  $b = New-Object System.Drawing.SolidBrush($TEXT)
  foreach ($ch in $word.ToCharArray()) {
    $g.DrawString([string]$ch, $font, $b, [single]$x, [single]$y, $fmt)
    $x += $g.MeasureString([string]$ch, $font, 1000, $fmt).Width + $track
  }
  $b.Dispose(); return $x
}

# Tracé : boîte de 1.5em x 0.9em, viewBox 38 x 24 ajusté sans déformation.
$scale = [Math]::Min(1.5 * $em / 38, 0.9 * $em / 24)
$traceW = 1.5 * $em; $gap = 0.05 * $em
$total = (Measure-Word "slo") + $gap + $traceW + $gap + (Measure-Word "fi") - $track
$x0 = ($W - $total) / 2
$textY = 175.0

# Centre vertical du tracé aligné sur le milieu de la hauteur des minuscules.
$xHeightMid = $textY + 0.53 * $em * 1.0 + 0.0
$traceY = $xHeightMid - (24 * $scale) / 2 + 0.06 * $em

$x = Draw-Word "slo" $x0 $textY
$x = $x - $track + $gap
Draw-Trace $g ($x + ($traceW - 38 * $scale) / 2) $traceY $scale (2.7 * $scale)
$x = $x + $traceW + $gap
[void](Draw-Word "fi" $x $textY)

$sub = New-Object System.Drawing.Font("Segoe UI", [single]40, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$line = "Diagnostic de connexion et de mat$([char]0xE9)riel"
$sw = $g.MeasureString($line, $sub, 2000, $fmt).Width
$mb = New-Object System.Drawing.SolidBrush($MUTED)
$g.DrawString($line, $sub, $mb, [single](($W - $sw) / 2), [single]430, $fmt)

$bmp.Save((Join-Path $OutDir "og-image.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
"ok"
