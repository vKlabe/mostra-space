using System;

namespace ArtPortal
{
    [Serializable]
    public class ArtPortalLaunchConfig
    {
        public string galleryId;
        public string mode;

        public string apiBaseUrl;
        public string transformApiBaseUrl;
    }
}