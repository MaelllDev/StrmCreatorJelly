using System.Net.Mime;
using Jellyfin.Plugin.StrmCreator.Models;
using MediaBrowser.Common.Api;
using MediaBrowser.Controller.Configuration;
using MediaBrowser.Controller.Library;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.StrmCreator.Controllers;

/// <summary>
/// Endpoints usados pela UI do plugin:
/// - listar bibliotecas
/// - navegar pastas de uma biblioteca (com criar pasta)
/// - criar o arquivo .strm
/// </summary>
[Authorize(Policy = Policies.RequiresElevation)]
[Route("StrmCreator")]
[Produces(MediaTypeNames.Application.Json)]
public class StrmCreatorController : ControllerBase
{
    private readonly ILibraryManager _libraryManager;
    private readonly IServerConfigurationManager _serverConfig;

    public StrmCreatorController(ILibraryManager libraryManager, IServerConfigurationManager serverConfig)
    {
        _libraryManager = libraryManager;
        _serverConfig = serverConfig;
    }

    /// <summary>Lista as bibliotecas de mídia (CollectionFolder) do servidor.</summary>
    [HttpGet("Libraries")]
    public ActionResult<IReadOnlyList<StrmLibrary>> GetLibraries()
    {
        var libraries = _libraryManager
            .GetVirtualFolders()
            .Select(f => new StrmLibrary
            {
                Name = f.Name,
                // usa o primeiro caminho configurado da biblioteca como raiz
                Path = f.Locations.FirstOrDefault() ?? string.Empty,
                CollectionType = f.CollectionType?.ToString()
            })
            .Where(l => !string.IsNullOrEmpty(l.Path))
            .OrderBy(l => l.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();

        return Ok(libraries);
    }

    /// <summary>Lista subpastas de um diretório dentro da biblioteca.</summary>
    [HttpGet("Folders")]
    public ActionResult<IReadOnlyList<StrmFolder>> GetFolders([FromQuery] string path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return BadRequest("Informe o parâmetro 'path'.");
        }

        var root = _serverConfig.ApplicationPaths;
        var allowedRoots = new[] { root.RootFolderPath } // pasta padrão de bibliotecas
            .Concat(_libraryManager.GetVirtualFolders().SelectMany(f => f.Locations))
            .Where(p => !string.IsNullOrEmpty(p))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var fullPath = Path.GetFullPath(path);
        var isAllowed = allowedRoots.Any(root =>
            fullPath.Equals(Path.GetFullPath(root), StringComparison.OrdinalIgnoreCase) ||
            fullPath.StartsWith(Path.GetFullPath(root) + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase) ||
            fullPath.StartsWith(Path.GetFullPath(root) + Path.AltDirectorySeparatorChar, StringComparison.OrdinalIgnoreCase));

        if (!isAllowed)
        {
            return Forbid();
        }

        if (!Directory.Exists(fullPath))
        {
            return NotFound($"Pasta não encontrada: {path}");
        }

        var folders = Directory.EnumerateDirectories(fullPath)
            .Select(d => new StrmFolder
            {
                Name = Path.GetFileName(d),
                Path = d
            })
            .OrderBy(f => f.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();

        return Ok(folders);
    }

    /// <summary>Cria uma nova pasta dentro de um diretório existente.</summary>
    [HttpPost("Folders/Create")]
    public ActionResult<StrmFolder> CreateFolder([FromBody] CreateFolderRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ParentPath) || string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Informe 'parentPath' e 'name'.");
        }

        // Nome simples de pasta: sem separadores nem caracteres inválidos
        var name = SanitizeName(request.Name);
        if (name.Length == 0)
        {
            return BadRequest("O nome da pasta ficou vazio após a normalização.");
        }

        if (name.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0)
        {
            return BadRequest("O nome da pasta contém caracteres inválidos.");
        }

        var parent = Path.GetFullPath(request.ParentPath);
        if (!Directory.Exists(parent))
        {
            return NotFound($"Pasta pai não encontrada: {request.ParentPath}");
        }

        var newFolder = Path.Combine(parent, name);
        Directory.CreateDirectory(newFolder); // idempotente

        return Ok(new StrmFolder { Name = name, Path = newFolder });
    }

    /// <summary>
    /// Normaliza nomes de arquivos/pastas: espaços viram "-", hífens
    /// repetidos são colapsados e hífens das pontas são removidos.
    /// Ex.: "Meu  Filme (2024) " -> "Meu-Filme-(2024)".
    /// </summary>
    private static string SanitizeName(string name)
    {
        var normalized = name.Trim().Replace(' ', '-');
        while (normalized.Contains("--"))
        {
            normalized = normalized.Replace("--", "-");
        }

        return normalized.Trim('-');
    }

    /// <summary>Cria o arquivo .strm com o link de stream informado.</summary>
    [HttpPost("Strm")]
    public ActionResult<CreateStrmResult> CreateStrm([FromBody] CreateStrmRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FolderPath) || string.IsNullOrWhiteSpace(request.FileName))
        {
            return BadRequest("Informe 'folderPath' e 'fileName'.");
        }

        if (string.IsNullOrWhiteSpace(request.StreamUrl))
        {
            return BadRequest("Informe 'streamUrl'.");
        }

        var folder = Path.GetFullPath(request.FolderPath);
        if (!Directory.Exists(folder))
        {
            return NotFound($"Pasta não encontrada: {request.FolderPath}");
        }

        var safeName = SanitizeName(request.FileName);
        if (safeName.Length == 0)
        {
            return BadRequest("O nome do arquivo ficou vazio após a normalização.");
        }

        if (safeName.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0)
        {
            return BadRequest("O nome do arquivo contém caracteres inválidos.");
        }

        if (!string.Equals(Path.GetExtension(safeName), ".strm", StringComparison.OrdinalIgnoreCase))
        {
            safeName += ".strm";
        }

        var filePath = Path.Combine(folder, safeName);
        if (System.IO.File.Exists(filePath))
        {
            return Conflict(new CreateStrmResult { Success = false, Message = $"Já existe um arquivo '{safeName}' nessa pasta." });
        }

        try
        {
            System.IO.File.WriteAllText(filePath, request.StreamUrl.Trim() + Environment.NewLine);
            return Ok(new CreateStrmResult { Success = true, FilePath = filePath, Message = $"Arquivo '{safeName}' criado." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new CreateStrmResult { Success = false, Message = $"Erro ao criar arquivo: {ex.Message}" });
        }
    }
}
