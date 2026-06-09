using System;
using UnityEngine;

namespace ArtPortal
{
    public class ArtPortalRuntimeContext : MonoBehaviour
    {
        public static ArtPortalRuntimeContext Instance { get; private set; }

        public event Action OnContextChanged;

        [Header("Runtime State")]
        [SerializeField] private string galleryId = "";
        [SerializeField] private ArtPortalRuntimeMode runtimeMode = ArtPortalRuntimeMode.Visitor;
        [SerializeField] private bool hasReceivedExternalConfig;

        [Header("API")]
        [SerializeField] private string apiBaseUrl = "http://localhost:3000/api/unity/galleries";
        [SerializeField] private string transformApiBaseUrl = "http://localhost:3000/api/unity/gallery-artworks";

        public string GalleryId => galleryId;
        public ArtPortalRuntimeMode RuntimeMode => runtimeMode;
        public bool HasReceivedExternalConfig => hasReceivedExternalConfig;

        public string ApiBaseUrl => apiBaseUrl;
        public string TransformApiBaseUrl => transformApiBaseUrl;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Debug.LogWarning("[ArtPortal] Esiste gia un ArtPortalRuntimeContext. Distruggo il duplicato.");
                Destroy(gameObject);
                return;
            }

            Instance = this;

            Debug.Log("[ArtPortal] RuntimeContext pronto.");
        }

        public void Configure(
            string newGalleryId,
            ArtPortalRuntimeMode newMode,
            bool externalConfig = true
        )
        {
            Configure(
                newGalleryId,
                newMode,
                apiBaseUrl,
                transformApiBaseUrl,
                externalConfig
            );
        }

        public void Configure(
            string newGalleryId,
            ArtPortalRuntimeMode newMode,
            string newApiBaseUrl,
            string newTransformApiBaseUrl,
            bool externalConfig = true
        )
        {
            galleryId = string.IsNullOrWhiteSpace(newGalleryId)
                ? ""
                : newGalleryId.Trim();

            runtimeMode = newMode;
            hasReceivedExternalConfig = externalConfig;

            if (!string.IsNullOrWhiteSpace(newApiBaseUrl))
            {
                apiBaseUrl = newApiBaseUrl.Trim().TrimEnd('/');
            }

            if (!string.IsNullOrWhiteSpace(newTransformApiBaseUrl))
            {
                transformApiBaseUrl = newTransformApiBaseUrl.Trim().TrimEnd('/');
            }

            Debug.Log(
                "[ArtPortal] Runtime configurato. " +
                $"GalleryId: {galleryId} | " +
                $"Mode: {runtimeMode} | " +
                $"External: {hasReceivedExternalConfig} | " +
                $"ApiBaseUrl: {apiBaseUrl} | " +
                $"TransformApiBaseUrl: {transformApiBaseUrl}"
            );

            OnContextChanged?.Invoke();
        }

        public void SetGalleryId(string newGalleryId)
        {
            galleryId = string.IsNullOrWhiteSpace(newGalleryId)
                ? ""
                : newGalleryId.Trim();

            hasReceivedExternalConfig = true;

            Debug.Log($"[ArtPortal] GalleryId aggiornato: {galleryId}");

            OnContextChanged?.Invoke();
        }

        public void SetRuntimeMode(ArtPortalRuntimeMode newMode)
        {
            runtimeMode = newMode;
            hasReceivedExternalConfig = true;

            Debug.Log($"[ArtPortal] RuntimeMode aggiornato: {runtimeMode}");

            OnContextChanged?.Invoke();
        }

        public void SetApiBaseUrl(string newApiBaseUrl)
        {
            if (string.IsNullOrWhiteSpace(newApiBaseUrl))
            {
                return;
            }

            apiBaseUrl = newApiBaseUrl.Trim().TrimEnd('/');

            Debug.Log($"[ArtPortal] ApiBaseUrl aggiornato: {apiBaseUrl}");

            OnContextChanged?.Invoke();
        }

        public void SetTransformApiBaseUrl(string newTransformApiBaseUrl)
        {
            if (string.IsNullOrWhiteSpace(newTransformApiBaseUrl))
            {
                return;
            }

            transformApiBaseUrl = newTransformApiBaseUrl.Trim().TrimEnd('/');

            Debug.Log($"[ArtPortal] TransformApiBaseUrl aggiornato: {transformApiBaseUrl}");
        }

        public bool IsEditorMode()
        {
            return runtimeMode == ArtPortalRuntimeMode.Editor;
        }

        public bool IsVisitorMode()
        {
            return runtimeMode == ArtPortalRuntimeMode.Visitor;
        }
    }
}