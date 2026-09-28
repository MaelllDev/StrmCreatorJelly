using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.StrmCreator.Controllers;

/// <summary>
/// Serve o app standalone (Web/app.html embutido) em /StrmCreator/App.
/// A página autentica via API key configurada pelo usuário (Chaves da API
/// do painel), contornando o fato de o dashboard não executar scripts
/// inline nas páginas de configuração.
/// </summary>
[Route("StrmCreator")]
public class AppController : ControllerBase
{
    [HttpGet("App")]
    [AllowAnonymous]
    public IActionResult GetApp()
    {
        return ServeEmbedded("Jellyfin.Plugin.StrmCreator.Web.app.html", "text/html");
    }

    /// <summary>JavaScript do app (arquivo externo: CSP bloqueia scripts inline).</summary>
    [HttpGet("app.js")]
    [AllowAnonymous]
    public IActionResult GetAppJs()
    {
        return ServeEmbedded("Jellyfin.Plugin.StrmCreator.Web.app.js", "application/javascript");
    }

    private IActionResult ServeEmbedded(string resourceName, string contentType)
    {
        var assembly = typeof(AppController).Assembly;
        using var stream = assembly.GetManifestResourceStream(resourceName);
        if (stream is null)
        {
            return NotFound();
        }

        using var reader = new StreamReader(stream);
        var content = reader.ReadToEnd();

        Response.Headers.CacheControl = "no-cache";
        return Content(content, contentType);
    }
}
