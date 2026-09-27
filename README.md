# Strm Creator (plugin Jellyfin)

Adiciona um botão **"Adicionar .strm"** na página de detalhes do Jellyfin. Ao clicar, abre um popup onde você:

1. Escolhe a **biblioteca**
2. **Navega** pelas pastas e subpastas (com opção de **criar pasta nova**)
3. Define o **nome do arquivo**
4. Cola o **link de stream**
5. Clica em **Criar** → o arquivo `.strm` é gravado na pasta escolhida

### Modo Série

Alternando para **Série**, o popup pede **temporada** e **número do 1º episódio**, e aceita **vários links de uma vez** (um por linha). Cada link vira um episódio em sequência, no padrão:

```
Nome-Serie S01E01.strm
Nome-Serie S01E02.strm
Nome-Serie S01E03.strm
...
```

Há uma **prévia em tempo real** dos nomes que serão criados. Arquivos já existentes são pulados (não sobrescrevem).

## Requisitos

- Jellyfin Server **12.x** (o plugin foi montado contra os pacotes `Jellyfin.Controller`/`Jellyfin.Model` **12.1.0**, .NET 10)
- Para Jellyfin **10.11.x**: no `.csproj`, troque para `net9.0` e pacotes `10.11.11`

## Build

```bash
dotnet build -c Release
```

A DLL fica em `bin/Release/net10.0/Jellyfin.Plugin.StrmCreator.dll`.

## Instalação manual

1. Copie **apenas o `Jellyfin.Plugin.StrmCreator.dll`** para:

   - **Windows**: `%ProgramData%\Jellyfin\Server\plugins\StrmCreator\` (ou `C:\Users\<vc>\AppData\Local\jellyfin\plugins\StrmCreator\`)
   - **Linux**: `/var/lib/jellyfin/plugins/StrmCreator/`
   - **Docker**: monte um volume apontando para `/config/plugins/StrmCreator/`

2. Reinicie o Jellyfin.
3. Vá em **Painel → Plugins** e confira se "Strm Creator" aparece ativo.

> ⚠️ Recomendado: remova os demais arquivos (`Jellyfin.Model.dll`, `Jellyfin.Controller.dll` etc.) da pasta — só a DLL do plugin deve ficar lá.

## Uso

1. Abra a página de detalhes de qualquer item.
2. Clique no botão **+** ao lado dos botões de ação.
3. No popup: escolha a biblioteca → navegue as pastas (ou crie uma nova) → nome do arquivo → cole o link → **Criar**.
4. Rode um **Scan da biblioteca** para o novo `.strm` aparecer.

## Endpoints do plugin

| Método | Rota | Função |
|---|---|---|
| GET | `/StrmCreator/Libraries` | Lista bibliotecas |
| GET | `/StrmCreator/Folders?path=...` | Lista subpastas (validado contra raízes das bibliotecas) |
| POST | `/StrmCreator/Folders/Create` | Cria pasta (`{ parentPath, name }`) |
| POST | `/StrmCreator/Strm` | Cria o `.strm` (`{ folderPath, fileName, streamUrl }`) |
| POST | `/StrmCreator/Episodes` | Cria lote de episódios (`{ folderPath, seriesName, season, episodes: [{ episode, streamUrl }] }`) |
| GET | `/StrmCreator/Script` | Serve o JS injetado na UI |

Todos exigem permissão de **administrador** (política `RequiresElevation`), exceto o script.

## Como funciona

- Um `IStartupFilter` (middleware ASP.NET) injeta uma tag `<script>` no `index.html` do jellyfin-web **em tempo de resposta** — nada é escrito em disco, então funciona em Docker sem ajustes de permissão.
- O script adiciona o botão na página de detalhes e abre o popup de criação.

## Configuração

**Painel → Plugins → Strm Creator**: opção "Apenas administradores podem ver o botão" (padrão: ligado).
