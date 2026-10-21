# Генерация favicon и OG-изображения для vicgames.ru
# Запуск: powershell -ExecutionPolicy Bypass -File tools\generate-assets.ps1
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$games = Join-Path $root 'assets\img\games'
$out = Join-Path $root 'assets\img'

$c1 = [System.Drawing.Color]::FromArgb(167, 139, 250)
$c2 = [System.Drawing.Color]::FromArgb(34, 211, 238)
$c3 = [System.Drawing.Color]::FromArgb(163, 230, 53)
$dark = [System.Drawing.Color]::FromArgb(7, 9, 18)
$white = [System.Drawing.Color]::FromArgb(245, 246, 251)
$muted = [System.Drawing.Color]::FromArgb(161, 166, 189)

function New-RoundedPath([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function Draw-Mark($g, [float]$x, [float]$y, [float]$size) {
  $rect = [System.Drawing.RectangleF]::new($x, $y, $size, $size)
  $brush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($rect, $c1, $c2, 45)
  $colorBlend = [System.Drawing.Drawing2D.ColorBlend]::new(3)
  $colorBlend.Colors = @($c1, $c2, $c3)
  $colorBlend.Positions = @(0.0, 0.55, 1.0)
  $brush.InterpolationColors = $colorBlend
  $path = New-RoundedPath $x $y $size $size ($size * 0.27)
  $g.FillPath($brush, $path)
  $pen = [System.Drawing.Pen]::new($dark, [float]($size * 0.025))
  $g.DrawPath($pen, $path)

  $font = [System.Drawing.Font]::new('Segoe UI', [float]($size * 0.56), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $sf = [System.Drawing.StringFormat]::new()
  $sf.Alignment = 'Center'
  $sf.LineAlignment = 'Center'
  $textRect = [System.Drawing.RectangleF]::new($x, $y - ($size * 0.03), $size, $size)
  $g.DrawString('V', $font, ([System.Drawing.SolidBrush]::new($dark)), $textRect, $sf)

  $brush.Dispose(); $path.Dispose(); $pen.Dispose(); $font.Dispose(); $sf.Dispose()
}

function New-Icon([int]$size, [string]$file) {
  $bmp = [System.Drawing.Bitmap]::new($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'HighQuality'
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.TextRenderingHint = 'AntiAliasGridFit'
  $g.Clear([System.Drawing.Color]::Transparent)
  Draw-Mark $g 0 0 ([float]$size)
  $bmp.Save((Join-Path $root $file), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

function Draw-RoundedImage($g, [string]$src, [float]$x, [float]$y, [float]$size, [float]$angle) {
  $img = [System.Drawing.Image]::FromFile($src)
  $state = $g.Save()
  $g.TranslateTransform($x + $size / 2, $y + $size / 2)
  $g.RotateTransform($angle)
  $path = New-RoundedPath (-$size / 2) (-$size / 2) $size $size ($size * 0.22)
  $g.SetClip($path)
  $g.DrawImage($img, [float](-$size / 2), [float](-$size / 2), [float]$size, [float]$size)
  $g.ResetClip()
  $pen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(70, 255, 255, 255), 1.4)
  $g.DrawPath($pen, $path)
  $pen.Dispose(); $path.Dispose()
  $g.Restore($state)
  $img.Dispose()
}

New-Icon 32 'favicon-32.png'
New-Icon 180 'apple-touch-icon.png'
New-Icon 192 'favicon-192.png'
New-Icon 512 'favicon-512.png'

# --- OG image 1200x630 ---
$bmp = [System.Drawing.Bitmap]::new(1200, 630)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'HighQuality'
$g.InterpolationMode = 'HighQualityBicubic'
$g.TextRenderingHint = 'AntiAliasGridFit'
$g.Clear([System.Drawing.Color]::FromArgb(6, 7, 14))

# Мягкие свечения
for ($i = 18; $i -ge 1; $i--) {
  $alpha = [int](4 + (18 - $i) * 0.8)
  $size = 260 + $i * 34
  $b = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb($alpha, 139, 92, 246))
  $g.FillEllipse($b, 760 - $size / 2, -130 - $size / 2, $size, $size)
  $b.Dispose()
}
for ($i = 14; $i -ge 1; $i--) {
  $alpha = [int](3 + (14 - $i) * 0.6)
  $size = 200 + $i * 30
  $b = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb($alpha, 34, 211, 238))
  $g.FillEllipse($b, -60 - $size / 2, 520 - $size / 2, $size, $size)
  $b.Dispose()
}

# Сетка
$gridPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(16, 255, 255, 255), 1)
for ($x = 0; $x -le 1200; $x += 64) { $g.DrawLine($gridPen, $x, 0, $x, 630) }
for ($y = 0; $y -le 630; $y += 64) { $g.DrawLine($gridPen, 0, $y, 1200, $y) }
$gridPen.Dispose()

# Коллаж иконок
Draw-RoundedImage $g (Join-Path $games 'santa.png') 880 112 190 -7
Draw-RoundedImage $g (Join-Path $games 'ball.png') 1046 92 112 8
Draw-RoundedImage $g (Join-Path $games 'country.png') 1018 256 136 4
Draw-RoundedImage $g (Join-Path $games 'match3d.png') 888 338 116 -5

# Логотип и бренд
Draw-Mark $g 84 76 88
$brandFont = [System.Drawing.Font]::new('Segoe UI', 31, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$whiteBrush = [System.Drawing.SolidBrush]::new($white)
$cyanBrush = [System.Drawing.SolidBrush]::new($c2)
$g.DrawString('VIC', $brandFont, $whiteBrush, 194, 88)
$sizeVic = $g.MeasureString('VIC', $brandFont)
$g.DrawString('GAMES', $brandFont, $cyanBrush, 194 + $sizeVic.Width - 4, 88)

# Заголовок
$hFont = [System.Drawing.Font]::new('Segoe UI', 55, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$g.DrawString('Игры, в которые', $hFont, $whiteBrush, 82, 205)
$g.DrawString('хочется возвращаться', $hFont, $whiteBrush, 82, 272)

# Подзаголовок
$subFont = [System.Drawing.Font]::new('Segoe UI', 23, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$g.DrawString('Хорроры, головоломки и аркады · Google Play, RuStore, браузер', $subFont, ([System.Drawing.SolidBrush]::new($muted)), 88, 372)

# Чипы внизу
$chipFont = [System.Drawing.Font]::new('Segoe UI', 18, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$chipX = 88
foreach ($label in @('Google Play', 'RuStore', 'Браузер')) {
  $m = $g.MeasureString($label, $chipFont)
  $w = [float]($m.Width + 38)
  $h = 46
  $path = New-RoundedPath $chipX 452 $w $h 23
  $bg = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(18, 255, 255, 255))
  $pen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(48, 255, 255, 255), 1)
  $g.FillPath($bg, $path)
  $g.DrawPath($pen, $path)
  $g.DrawString($label, $chipFont, $whiteBrush, $chipX + 19, 462)
  $bg.Dispose(); $pen.Dispose(); $path.Dispose()
  $chipX += $w + 12
}

# Нижняя подпись
$footFont = [System.Drawing.Font]::new('Segoe UI', 17, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$footBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(118, 125, 150))
$g.DrawString('Независимая игровая студия · Иркутск · vicgames.ru', $footFont, $footBrush, 88, 548)

$bmp.Save((Join-Path $out 'og-image.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()

$whiteBrush.Dispose(); $cyanBrush.Dispose(); $footBrush.Dispose()
Write-Output 'Assets generated: favicon-32.png, apple-touch-icon.png, favicon-192.png, favicon-512.png, assets/img/og-image.png'
