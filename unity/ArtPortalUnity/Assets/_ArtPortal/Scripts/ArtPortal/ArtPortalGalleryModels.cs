using System;

[Serializable]
public class ArtPortalLaunchConfig
{
    public string galleryId;
    public string mode;
    public string apiBaseUrl;
    public string transformApiBaseUrl;
}

[Serializable]
public class ArtPortalEditorPermissionsPayload
{
    public string plan;
    public string role;
    public bool isAdmin;
    public bool isOwner;
    public bool isLocalDev;
    public bool canUseAdvancedMode;
}

[Serializable]
public class ArtPortalGalleryPayload
{
    public string galleryId;
    public string slug;
    public string title;
    public string description;
    public string status;
    public string unitySceneKey;
    public string mode;
    public ArtPortalEditorPermissionsPayload editorPermissions;
    public ArtPortalArtworkPayload[] artworks;
}

[Serializable]
public class ArtPortalArtworkPayload
{
    public string galleryArtworkId;
    public string artworkId;

    public string title;
    public string artistName;
    public string year;
    public string technique;
    public string dimensions;
    public string price;
    public string currency;
    public string description;
    public string imageUrl;

    public bool isForSale;
    public bool isPublic;

    public float artworkWidthCm;
    public float artworkHeightCm;
    public float artworkDepthCm;

    public float widthCm;
    public float heightCm;
    public float depthCm;

    public float displayWidthCm;
    public float displayHeightCm;

    public bool frameEnabled;
    public string frameColor;
    public float frameWidthCm;
    public float frameDepthCm;

    public float positionX;
    public float positionY;
    public float positionZ;

    public float rotationX;
    public float rotationY;
    public float rotationZ;

    public float scaleX;
    public float scaleY;
    public float scaleZ;

    public string wallKey;
    public int sortOrder;
}

[Serializable]
public class ArtPortalTransformSavePayload
{
    public string galleryArtworkId;
    public string artworkId;

    public float positionX;
    public float positionY;
    public float positionZ;

    public float rotationX;
    public float rotationY;
    public float rotationZ;

    public float scaleX;
    public float scaleY;
    public float scaleZ;

    public string wallKey;

    public float displayWidthCm;
    public float displayHeightCm;

    public bool frameEnabled;
    public string frameColor;
    public float frameWidthCm;
    public float frameDepthCm;
}