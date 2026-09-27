using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.StrmCreator.Configuration;

public class PluginConfiguration : BasePluginConfiguration
{
    /// <summary>
    /// Mostra o botão "Adicionar .strm" apenas para usuários administradores.
    /// </summary>
    public bool AdminOnly { get; set; } = true;
}
