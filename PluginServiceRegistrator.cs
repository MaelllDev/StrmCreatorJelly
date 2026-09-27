using MediaBrowser.Controller;
using MediaBrowser.Controller.Plugins;
using Microsoft.Extensions.DependencyInjection;

namespace Jellyfin.Plugin.StrmCreator;

/// <summary>
/// Descoberto pelo Jellyfin no startup. A criação de .strm agora é feita
/// pela página do plugin no Painel (Configuration/configPage.html), então
/// não há mais middleware de injeção na UI web.
/// </summary>
public class PluginServiceRegistrator : IPluginServiceRegistrator
{
    public void RegisterServices(IServiceCollection serviceCollection, IServerApplicationHost applicationHost)
    {
        // Nenhum serviço adicional no momento.
    }
}
