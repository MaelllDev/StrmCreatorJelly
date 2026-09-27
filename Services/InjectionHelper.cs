using System.Text;
using Microsoft.AspNetCore.Http;

namespace Jellyfin.Plugin.StrmCreator.Services;

/// <summary>
/// Monta o bloco &lt;script&gt; injetado no index.html. O script baixa o
/// strm-creator.js (embutido no plugin) e o executa na página.
/// </summary>
public static class InjectionHelper
{
    public const string StartComment = "<!-- StrmCreator:start -->";
    public const string EndComment = "<!-- StrmCreator:end -->";

    public static string BuildInjectionBlock(PathString pathBase, bool adminOnly)
    {
        var baseUrl = pathBase.HasValue ? pathBase.Value!.TrimEnd('/') : string.Empty;
        var scriptUrl = $"{baseUrl}/StrmCreator/Script";
        // cache-buster baseado na versão do plugin
        var version = Jellyfin.Plugin.StrmCreator.Plugin.Instance?.Version.ToString() ?? "0";

        var sb = new StringBuilder();
        sb.Append(StartComment).Append('\n');
        sb.Append("<script>window.__StrmCreator={adminOnly:").Append(adminOnly ? "true" : "false").Append(",version:\"").Append(version).Append("\"};</script>\n");
        sb.Append("<script src=\"").Append(scriptUrl).Append("?v=").Append(version).Append("\" defer></script>\n");
        sb.Append(EndComment);
        return sb.ToString();
    }
}
