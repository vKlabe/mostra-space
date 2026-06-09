using System;

namespace ArtPortal
{
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

        public ArtPortalGalleryArtworkPayload[] artworks;
    }

    [Serializable]
    public class ArtPortalGalleryArtworkPayload
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

        public float positionX;
        public float positionY;
        public float positionZ;

        public float rotationX;
        public float rotationY;
        public float rotationZ;

        public float scaleX = 1f;
        public float scaleY = 1f;
        public float scaleZ = 1f;

        public string wallKey;
        public int sortOrder;
    }
}