namespace Jellyfin.Plugin.StrmCreator.Models;

public class StrmLibrary
{
    public string Name { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public string? CollectionType { get; set; }
}

public class StrmFolder
{
    public string Name { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
}

public class CreateFolderRequest
{
    public string ParentPath { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

public class CreateStrmRequest
{
    public string FolderPath { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string StreamUrl { get; set; } = string.Empty;
}

public class EpisodeStream
{
    /// <summary>Temporada específica deste episódio; 0 usa a da requisição.</summary>
    public int Season { get; set; }
    public int Episode { get; set; }
    public string StreamUrl { get; set; } = string.Empty;
}

public class CreateEpisodesRequest
{
    public string FolderPath { get; set; } = string.Empty;
    public string SeriesName { get; set; } = string.Empty;
    public int Season { get; set; } = 1;
    public List<EpisodeStream> Episodes { get; set; } = new();
}

public class CreateEpisodesResult
{
    public bool Success { get; set; }
    public int Created { get; set; }
    public int Skipped { get; set; }
    public int Failed { get; set; }
    public string Message { get; set; } = string.Empty;
    public List<string> Messages { get; set; } = new();
}

public class CreateStrmResult
{
    public bool Success { get; set; }
    public string FilePath { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}
