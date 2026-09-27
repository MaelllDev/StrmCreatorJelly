using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.StrmCreator.Configuration;

/// <summary>
/// A criação de .strm acontece na página do plugin no Painel (que já exige
/// admin), então não há configurações por enquanto.
/// </summary>
public class PluginConfiguration : BasePluginConfiguration
{
}
