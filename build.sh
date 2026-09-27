#!/usr/bin/env bash
# Build Strm Creator para ambas as linhas do Jellyfin.
# Saída: dist/jf10/Jellyfin.Plugin.StrmCreator.dll  (Jellyfin 10.11.x)
#        dist/jf12/Jellyfin.Plugin.StrmCreator.dll  (Jellyfin 12.x)
set -euo pipefail

for target in jf10 jf12; do
    echo "==> Building ${target}..."
    dotnet build -c Release -p:JellyfinTarget=${target} -v q
    out="dist/${target}"
    mkdir -p "${out}"
    cp "bin/Release/$( [ ${target} = jf10 ] && echo net9.0 || echo net10.0 )/Jellyfin.Plugin.StrmCreator.dll" "${out}/"
done

echo "==> Done:"
ls -la dist/jf10 dist/jf12
