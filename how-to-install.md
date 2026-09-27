# Como instalar o Strm Creator

Tutorial passo a passo, do zero até o botão aparecendo no Jellyfin.

---

## Passo 1 — Descubra a versão do seu Jellyfin

Você precisa saber a versão do **servidor** pra escolher a DLL certa:

1. Abra o Jellyfin no navegador e faça login
2. Vá em **Painel** (Dashboard) → **Informações do Servidor** (Server Info)
3. Olhe o campo **Versão**:
   - `12.x.x` → você vai usar a DLL da pasta **`jf12`**
   - `10.11.x` → você vai usar a DLL da pasta **`jf10`**

> Se usar a errada, o plugin aparece como **"NotSupported"** na lista — é só trocar pela outra.

---

## Passo 2 — Baixe a DLL

Opção A — **baixar o código e compilar** (você precisa do .NET SDK 9 ou 10):

```bash
git clone https://github.com/MaelllDev/StrmCreatorJelly.git
cd StrmCreatorJelly
bash build.sh
```

No final, as DLLs estarão em:

```
dist/jf10/Jellyfin.Plugin.StrmCreator.dll   ← Jellyfin 10.11.x
dist/jf12/Jellyfin.Plugin.StrmCreator.dll   ← Jellyfin 12.x
```

Opção B — compilar só o seu alvo:

```bash
dotnet build -c Release -p:JellyfinTarget=jf12   # Jellyfin 12
dotnet build -c Release -p:JellyfinTarget=jf10   # Jellyfin 10.11
```

A DLL fica em `bin/Release/net10.0/` (jf12) ou `bin/Release/net9.0/` (jf10).

> Não existe DLL pronta pra download ainda — em breve teremos releases no GitHub.

---

## Passo 3 — Copie a DLL pra pasta de plugins

Copie **apenas o arquivo `Jellyfin.Plugin.StrmCreator.dll`** para a pasta de plugins do Jellyfin, dentro de uma subpasta chamada `StrmCreator`:

| Instalação | Caminho |
|---|---|
| **Windows** (instalador normal) | `C:\Users\SEU_USUARIO\AppData\Local\jellyfin\plugins\StrmCreator\` |
| **Windows** (serviço/tray) | `C:\ProgramData\Jellyfin\Server\plugins\StrmCreator\` |
| **Linux** (apt/dnf) | `/var/lib/jellyfin/plugins/StrmCreator/` |
| **Docker** | `/config/plugins/StrmCreator/` (dentro do volume do config) |

Dica rápida no Windows: aperte `Win + R`, cole o caminho e Enter.

**Docker (docker-compose):** se o compose já mapeia o config (ex.: `./jellyfin/config:/config`), a pasta fica em `./jellyfin/config/plugins/StrmCreator/` no seu host. Se não mapeia, adicione ao compose:

```yaml
volumes:
  - ./jellyfin/config:/config
```

> ⚠️ Importante: dentro de `plugins\StrmCreator\` deve ficar **só a DLL do plugin**. Se aparecerem outros arquivos (ex.: `Jellyfin.Model.dll`), apague — são da versão errada do build e impedem o plugin de carregar.

---

## Passo 4 — Reinicie o Jellyfin

O plugin só carrega no startup:

- **Windows**: feche e abra o Jellyfin (ou reinicie o serviço)
- **Linux**: `sudo systemctl restart jellyfin`
- **Docker**: `docker restart jellyfin` (ou o nome do seu container)

---

## Passo 5 — Confirme que instalou

1. **Painel** → **Plugins** → deve aparecer **"Strm Creator"** na lista (status ativo, sem "NotSupported")
2. No menu lateral do Painel, deve ter o item **"Strm Creator"** (página de configuração)

Se aparecer **"NotSupported"**: a DLL não bate com a versão do servidor — volte ao Passo 1 e troque pela DLL da outra pasta (`jf10` ↔ `jf12`).

Se **não aparecer nada**: confira se a DLL está mesmo dentro da subpasta `StrmCreator` e se não há outros arquivos lá (veja o aviso do Passo 3), e olhe o log do servidor (`Painel → Logs`) por erros de carregamento de plugin.

---

## Passo 6 — Use o botão

1. Abra a página de detalhes de **qualquer item** (um filme, uma série, qualquer coisa)
2. Vai aparecer um botão **＋** junto aos botões de ação da página
3. Clique nele e o popup abre:
   - **Biblioteca**: escolha pra onde vai o arquivo
   - **Navegador**: entre nas subpastas (ou crie uma nova ali mesmo)
   - **Filme/Série**: no modo série, informe temporada e o número do primeiro episódio
   - **Nome**: do arquivo (ou da série)
   - **Links**: cole o link de stream — no modo série, **um link por linha** (cada linha vira um episódio: `Nome-Serie S01E01.strm`, `S01E02.strm`, ...)
   - A **prévia** mostra os nomes dos arquivos que serão criados
4. Clique em **Criar** ✅
5. Rode um **Verificar biblioteca** (Scan) pra o Jellyfin enxergar os novos `.strm`

> Por padrão, só **administradores** veem o botão (dá pra mudar em Painel → Plugins → Strm Creator).

---

## Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| Plugin "NotSupported" | DLL errada pra versão do servidor | Troque `jf10` ↔ `jf12` (Passo 1) |
| Plugin não aparece | DLL fora da subpasta / arquivos demais na pasta | Refaça o Passo 3 |
| Botão não aparece na página de detalhes | Não é admin, ou a página ficou em cache | Faça login como admin e dê Ctrl+F5 |
| Erro ao criar arquivo | Permissão de escrita na pasta da biblioteca | No Docker/Linux, verifique o dono/permissão da pasta de mídia |
| `.strm` criado mas não aparece | Falta o scan | Rode "Verificar todas as bibliotecas" |

Ainda com problema? Abra uma issue: https://github.com/MaelllDev/StrmCreatorJelly/issues
