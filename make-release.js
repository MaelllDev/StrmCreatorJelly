#!/usr/bin/env node
// Cria a release v0.2.0 no GitHub e anexa as DLLs + zip.
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');

const REPO = 'MaelllDev/StrmCreatorJelly';

// Pega o token do credential helper do git (mesma credencial usada no push)
function getToken() {
    const out = execFileSync('git', ['credential', 'fill'], {
        input: 'protocol=https\nhost=github.com\n\n',
        encoding: 'utf8'
    });
    const line = out.split('\n').find(l => l.startsWith('password='));
    return line ? line.slice('password='.length).trim() : '';
}

const NOTES = `Rebuild das DLLs com a licença atualizada e metadados de atribuição embutidos.

## Mudanças

- Licença agora é **Apache 2.0 + arquivo NOTICE**: o código pode ser modificado e melhorado livremente, mas forks devem manter os créditos do autor original e o link do repositório oficial
- Metadados de autor/repositório embutidos na DLL e visíveis na página do plugin no Painel

## Downloads

| Arquivo | Para quem |
|---|---|
| \`StrmCreator-0.2.1.zip\` | Pacote com as duas DLLs (pastas \`jf10/\` e \`jf12/\`) |
| \`Jellyfin.Plugin.StrmCreator-jf10.dll\` | Servidor Jellyfin **10.11.x** |
| \`Jellyfin.Plugin.StrmCreator-jf12.dll\` | Servidor Jellyfin **12.x** |

## Instalação

1. Descubra a versão do seu servidor: **Painel → Informações do Servidor**
2. Copie **apenas a DLL correspondente** para a pasta de plugins, dentro de uma subpasta \`StrmCreator\`
   (Windows: \`%LocalAppData%\\jellyfin\\plugins\\StrmCreator\\\` · Linux: \`/var/lib/jellyfin/plugins/StrmCreator/\` · Docker: \`/config/plugins/StrmCreator/\`)
3. Reinicie o Jellyfin
4. Confira em **Painel → Plugins** se aparece "Strm Creator" (se aparecer "NotSupported", use a DLL da outra pasta)

Guia completo: [how-to-install.md](https://github.com/MaelllDev/StrmCreatorJelly/blob/main/how-to-install.md)

## Novidades

- Botão **"Adicionar .strm"** na página de detalhes do Jellyfin
- Popup com seleção de biblioteca, navegador de pastas e criação de pasta nova
- **Modo Série**: temporada + episódio inicial, vários links de uma vez (um por linha), nomes no padrão \`Serie S01E01.strm\` com prévia em tempo real
- Nomes normalizados: espaços viram \`-\`
- Builds separados para **Jellyfin 10.11.x** e **12.x**
`;

async function main() {
    const token = getToken();
    if (!token) {
        console.error('ERRO: token do GitHub nao encontrado no credential helper.');
        process.exit(1);
    }
    const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json'
    };

    console.log('==> Criando release v0.2.0...');
    const createRes = await fetch(`https://api.github.com/repos/${REPO}/releases`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            tag_name: 'v0.2.1',
            name: 'Strm Creator v0.2.1',
            body: NOTES,
            draft: false,
            prerelease: false
        })
    });
    const created = await createRes.json();
    if (!createRes.ok) {
        console.error('ERRO ao criar release:', created.message || created);
        process.exit(1);
    }
    const uploadBase = `https://uploads.github.com/repos/${REPO}/releases/${created.id}/assets`;

    for (const [file, uploadName] of [
        ['StrmCreator-0.2.1.zip', 'StrmCreator-0.2.1.zip'],
        ['dist/jf10/Jellyfin.Plugin.StrmCreator.dll', 'Jellyfin.Plugin.StrmCreator-jf10.dll'],
        ['dist/jf12/Jellyfin.Plugin.StrmCreator.dll', 'Jellyfin.Plugin.StrmCreator-jf12.dll']
    ]) {
        const label = file.includes('jf10') ? 'jf10' : (file.includes('jf12') ? 'jf12' : 'zip');
        process.stdout.write(`==> Upload (${label}): ${uploadName} ... `);
        const upRes = await fetch(`${uploadBase}?name=${encodeURIComponent(uploadName)}`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/octet-stream' },
            body: fs.readFileSync(file)
        });
        const up = await upRes.json();
        console.log(up.state || up.message || upRes.status);
        if (!upRes.ok) process.exit(1);
    }

    console.log(`==> Release publicada: https://github.com/${REPO}/releases/tag/v0.2.1`);
}

main().catch(err => {
    console.error('ERRO:', err);
    process.exit(1);
});
