using Jellyfin.Plugin.StrmCreator.Configuration;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace Jellyfin.Plugin.StrmCreator;

/// <summary>
/// Plugin que adiciona um botão na página de detalhes do Jellyfin para
/// criar arquivos .strm (escolher biblioteca, navegar pastas, nomear e
/// colar o link de stream).
/// </summary>
public class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
    }

    public static Plugin? Instance { get; private set; }

    public override string Name => "Strm Creator";

    public override string Description =>
        "Cria arquivos .strm direto do Painel: escolha a biblioteca, navegue pelas pastas, crie uma pasta nova, nomeie o arquivo (modo série com S01E01 e lote de episódios) e cole o link de stream.\n\nRepositório oficial: https://github.com/MaelllDev/StrmCreatorJelly";

    public override Guid Id => Guid.Parse("e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b");

    /// <inheritdoc />
    public IEnumerable<PluginPageInfo> GetPages()
    {
        yield return new PluginPageInfo
        {
            Name = Name,
            DisplayName = "Strm Creator",
            EnableInMainMenu = true,
            EmbeddedResourcePath = $"{GetType().Namespace}.Configuration.configPage.html",
            MenuIcon = "note_add"
        };
    }
}
