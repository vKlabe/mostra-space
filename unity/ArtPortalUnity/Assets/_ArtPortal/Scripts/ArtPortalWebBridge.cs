using UnityEngine;

namespace ArtPortal
{
    public class ArtPortalWebBridge : MonoBehaviour
    {
        [Header("Editor / Fallback")]
        [SerializeField] private bool applyFallbackOnStart = false;
        [SerializeField] private string fallbackGalleryId = "local-demo-gallery";
        [SerializeField] private ArtPortalRuntimeMode fallbackMode = ArtPortalRuntimeMode.Visitor;

        [Header("Fallback API")]
        [SerializeField] private string fallbackApiBaseUrl = "http://localhost:3000/api/unity/galleries";
        [SerializeField] private string fallbackTransformApiBaseUrl = "http://localhost:3000/api/unity/gallery-artworks";

        private void Start()
        {
            if (ArtPortalRuntimeContext.Instance == null)
            {
                Debug.LogError("[ArtPortal] WebBridge: manca ArtPortalRuntimeContext in scena.");
                return;
            }

            if (applyFallbackOnStart && !ArtPortalRuntimeContext.Instance.HasReceivedExternalConfig)
            {
                ArtPortalRuntimeContext.Instance.Configure(
                    fallbackGalleryId,
                    fallbackMode,
                    fallbackApiBaseUrl,
                    fallbackTransformApiBaseUrl,
                    externalConfig: false
                );

                Debug.Log("[ArtPortal] WebBridge: applicato fallback locale.");
            }
            else
            {
                Debug.Log("[ArtPortal] WebBridge pronto. In attesa di configurazione esterna o simulata.");
            }
        }

        public void ConfigureFromJson(string json)
        {
            if (string.IsNullOrWhiteSpace(json))
            {
                Debug.LogWarning("[ArtPortal] ConfigureFromJson ricevuto vuoto.");
                return;
            }

            if (ArtPortalRuntimeContext.Instance == null)
            {
                Debug.LogError("[ArtPortal] ConfigureFromJson: manca RuntimeContext.");
                return;
            }

            try
            {
                ArtPortalLaunchConfig config = JsonUtility.FromJson<ArtPortalLaunchConfig>(json);

                if (config == null)
                {
                    Debug.LogWarning("[ArtPortal] JSON config non valido.");
                    return;
                }

                ArtPortalRuntimeMode parsedMode = ParseMode(config.mode);

                ArtPortalRuntimeContext.Instance.Configure(
                    config.galleryId,
                    parsedMode,
                    config.apiBaseUrl,
                    config.transformApiBaseUrl,
                    externalConfig: true
                );

                Debug.Log($"[ArtPortal] ConfigureFromJson OK: {json}");
            }
            catch (System.Exception exception)
            {
                Debug.LogError($"[ArtPortal] Errore ConfigureFromJson: {exception.Message}");
            }
        }

        public void SetGalleryId(string galleryId)
        {
            if (ArtPortalRuntimeContext.Instance == null)
            {
                Debug.LogError("[ArtPortal] SetGalleryId: manca RuntimeContext.");
                return;
            }

            ArtPortalRuntimeContext.Instance.SetGalleryId(galleryId);
        }

        public void SetMode(string mode)
        {
            if (ArtPortalRuntimeContext.Instance == null)
            {
                Debug.LogError("[ArtPortal] SetMode: manca RuntimeContext.");
                return;
            }

            ArtPortalRuntimeMode parsedMode = ParseMode(mode);
            ArtPortalRuntimeContext.Instance.SetRuntimeMode(parsedMode);
        }

        private ArtPortalRuntimeMode ParseMode(string mode)
        {
            if (string.IsNullOrWhiteSpace(mode))
            {
                return ArtPortalRuntimeMode.Visitor;
            }

            string normalized = mode.Trim().ToLowerInvariant();

            if (normalized == "editor")
            {
                return ArtPortalRuntimeMode.Editor;
            }

            return ArtPortalRuntimeMode.Visitor;
        }
    }
}