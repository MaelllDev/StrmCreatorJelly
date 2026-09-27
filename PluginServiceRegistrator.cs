using Jellyfin.Plugin.StrmCreator.Services;
using MediaBrowser.Controller;
using MediaBrowser.Controller.Plugins;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;

namespace Jellyfin.Plugin.StrmCreator;

/// <summary>
/// Descoberto pelo Jellyfin no startup; registra os serviços do plugin no DI.
/// </summary>
public class PluginServiceRegistrator : IPluginServiceRegistrator
{
    public void RegisterServices(IServiceCollection serviceCollection, IServerApplicationHost applicationHost)
    {
        // Middleware que injeta o botão no index.html do jellyfin-web em
        // tempo de resposta (não escreve nada em disco — funciona em Docker).
        serviceCollection.AddSingleton<IStartupFilter, ScriptInjectionStartupFilter>();
    }
}
