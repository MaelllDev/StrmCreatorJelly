# Gera plugins/icon.png (icone do plugin Strm Creator)
Add-Type -AssemblyName System.Drawing

$size = 256
$bmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

# Fundo azul arredondado
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$r = 48
$path.AddArc(0, 0, $r, $r, 180, 90)
$path.AddArc($size - $r, 0, $r, $r, 270, 90)
$path.AddArc($size - $r, $size - $r, $r, $r, 0, 90)
$path.AddArc(0, $size - $r, $r, $r, 90, 90)
$path.CloseFigure()
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(0, 0)),
    (New-Object System.Drawing.Point($size, $size)),
    [System.Drawing.Color]::FromArgb(255, 0, 164, 220),
    [System.Drawing.Color]::FromArgb(255, 0, 90, 160))
$g.FillPath($brush, $path)

# Texto ".strm" centralizado
$font = New-Object System.Drawing.Font("Segoe UI", 56, [System.Drawing.FontStyle]::Bold)
$fmt = New-Object System.Drawing.StringFormat
$fmt.Alignment = [System.Drawing.StringAlignment]::Center
$fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
$rect = New-Object System.Drawing.RectangleF(0, -8, $size, $size)
$g.DrawString(".strm", $font, [System.Drawing.Brushes]::White, $rect, $fmt)

# Disquete no canto superior direito (sugere "salvar arquivo")
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, 6)
$g.DrawRectangle($pen, 176, 20, 56, 48)
$g.FillRectangle([System.Drawing.Brushes]::White, 192, 20, 26, 22)
$g.FillRectangle([System.Drawing.Brushes]::White, 188, 52, 34, 16)

$g.Dispose()
$dir = "plugins"
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
$bmp.Save("$dir/icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "OK: $dir/icon.png"
