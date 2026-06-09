using UnityEngine;

namespace ArtPortal
{
    public class ArtworkFrameView : MonoBehaviour
    {
        [Header("Artwork")]
        [SerializeField] private ArtworkData artworkData = new ArtworkData();

        [Header("Renderers")]
        [SerializeField] private Renderer artworkSurfaceRenderer;
        [SerializeField] private Renderer frameRenderer;

        [Header("Interaction")]
        [SerializeField] private bool logClickInConsole = true;
        [SerializeField] private bool openInfoPanelOnClick = true;

        [Header("Selection Visual")]
        [SerializeField] private Color defaultFrameColor = new Color(0.05f, 0.05f, 0.05f);
        [SerializeField] private Color selectedFrameColor = new Color(1.0f, 0.72f, 0.18f);

        private Vector3 originalScale;
        private Material runtimeSurfaceMaterial;
        private Material runtimeFrameMaterial;
        private bool isSelected;

        public string ArtworkId => artworkData != null ? artworkData.artworkId : string.Empty;
        public string GalleryArtworkId => artworkData != null ? artworkData.galleryArtworkId : string.Empty;
        public ArtworkData Data => artworkData;

        private void Awake()
        {
            originalScale = transform.localScale;

            if (artworkSurfaceRenderer == null)
            {
                Debug.LogWarning($"[ArtPortal] ArtworkFrameView su {name}: manca artworkSurfaceRenderer.");
            }
            else
            {
                runtimeSurfaceMaterial = new Material(artworkSurfaceRenderer.sharedMaterial);
                artworkSurfaceRenderer.material = runtimeSurfaceMaterial;
            }

            if (frameRenderer == null)
            {
                Transform frameTransform = transform.Find("Frame_Backboard");

                if (frameTransform != null)
                {
                    frameRenderer = frameTransform.GetComponent<Renderer>();
                }
            }

            if (frameRenderer != null)
            {
                runtimeFrameMaterial = new Material(frameRenderer.sharedMaterial);
                frameRenderer.material = runtimeFrameMaterial;
                ApplyFrameColor(defaultFrameColor);
            }
        }

        public void SetArtwork(ArtworkData data, Texture texture)
        {
            artworkData = data;

            if (artworkSurfaceRenderer == null)
            {
                Debug.LogWarning($"[ArtPortal] {name}: artworkSurfaceRenderer nullo.");
                return;
            }

            if (runtimeSurfaceMaterial == null)
            {
                runtimeSurfaceMaterial = new Material(artworkSurfaceRenderer.sharedMaterial);
                artworkSurfaceRenderer.material = runtimeSurfaceMaterial;
            }

            if (texture != null)
            {
                ApplyTextureToMaterial(runtimeSurfaceMaterial, texture);
            }
            else
            {
                Debug.LogWarning($"[ArtPortal] Texture null per opera: {artworkData.title}");
            }

            Debug.Log($"[ArtPortal] Opera impostata: {artworkData.title} ({artworkData.artworkId})");
        }

        public void SetSelected(bool selected)
        {
            isSelected = selected;

            ApplyFrameColor(isSelected ? selectedFrameColor : defaultFrameColor);
        }

        public void RefreshOriginalScale()
        {
            originalScale = transform.localScale;
        }

        private void ApplyTextureToMaterial(Material material, Texture texture)
        {
            if (material == null || texture == null)
            {
                return;
            }

            if (material.HasProperty("_BaseMap"))
            {
                material.SetTexture("_BaseMap", texture);
            }

            if (material.HasProperty("_MainTex"))
            {
                material.SetTexture("_MainTex", texture);
            }

            if (material.HasProperty("_BaseColorMap"))
            {
                material.SetTexture("_BaseColorMap", texture);
            }

            if (material.HasProperty("_BaseColor"))
            {
                material.SetColor("_BaseColor", Color.white);
            }

            if (material.HasProperty("_Color"))
            {
                material.SetColor("_Color", Color.white);
            }

            Debug.Log($"[ArtPortal] Texture applicata al materiale: {material.name} | Texture: {texture.name}");
        }

        private void ApplyFrameColor(Color color)
        {
            if (runtimeFrameMaterial == null)
            {
                return;
            }

            if (runtimeFrameMaterial.HasProperty("_BaseColor"))
            {
                runtimeFrameMaterial.SetColor("_BaseColor", color);
            }

            if (runtimeFrameMaterial.HasProperty("_Color"))
            {
                runtimeFrameMaterial.SetColor("_Color", color);
            }
        }

        private void OnMouseDown()
        {
            if (logClickInConsole)
            {
                Debug.Log(
                    $"[ArtPortal] Click opera: {artworkData.title} | " +
                    $"Artista: {artworkData.artistName} | " +
                    $"Anno: {artworkData.year} | " +
                    $"ID: {artworkData.artworkId} | " +
                    $"GalleryArtworkId: {artworkData.galleryArtworkId}"
                );
            }

            bool isEditorMode =
                ArtPortalRuntimeContext.Instance != null &&
                ArtPortalRuntimeContext.Instance.IsEditorMode();

            if (isEditorMode && ArtPortalArtworkEditorManager.Instance != null)
            {
                ArtPortalArtworkEditorManager.Instance.SelectArtwork(this);
                return;
            }

            if (openInfoPanelOnClick)
            {
                if (ArtworkSelectionManager.Instance != null)
                {
                    ArtworkSelectionManager.Instance.SelectArtwork(this);
                }
                else
                {
                    Debug.LogWarning("[ArtPortal] Nessun ArtworkSelectionManager presente in scena.");
                }
            }
        }

        private void OnMouseEnter()
        {
            if (isSelected)
            {
                return;
            }

            transform.localScale = originalScale * 1.03f;
        }

        private void OnMouseExit()
        {
            if (isSelected)
            {
                return;
            }

            transform.localScale = originalScale;
        }
    }
}