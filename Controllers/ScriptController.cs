using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.StrmCreator.Controllers;

/// <summary>
/// Serve o JavaScript do botão (Web/strm-creator.js embutido no assembly).
/// </summary>
[Route("StrmCreator")]
public class ScriptController : ControllerBase
{
    [HttpGet("Script")]
    [AllowAnonymous]
    public IActionResult GetScript()
    {
        var assembly = typeof(ScriptController).Assembly;
        using var stream = assembly.GetManifestResourceStream("Jellyfin.Plugin.StrmCreator.Web.strm-creator.js");
        if (stream is null)
        {
            return NotFound();
        }

        using var reader = new StreamReader(stream);
        var content = reader.ReadToEnd();

        Response.Headers.CacheControl = "no-cache";
        return Content(content, "application/javascript");
    }
}
