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

public class CreateStrmResult
{
    public bool Success { get; set; }
    public string FilePath { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}
