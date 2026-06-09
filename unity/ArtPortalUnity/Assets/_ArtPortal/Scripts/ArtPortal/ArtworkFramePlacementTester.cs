using UnityEngine;

public class ArtworkFramePlacementTester : MonoBehaviour
{
    [Header("Riferimenti")]
    [SerializeField] private WallSelectionManager wallSelectionManager;

    [Header("Prefab opera")]
    [SerializeField] private ArtworkFrame artworkFramePrefab;

    [Header("Dimensioni test")]
    [SerializeField] private float displayWidthCm = 70f;
    [SerializeField] private float displayHeightCm = 100f;

    [Header("Cornice test")]
    [SerializeField] private bool frameEnabled = true;
    [SerializeField] private string frameColor = "#000000";
    [SerializeField] private float frameWidthCm = 3f;
    [SerializeField] private float frameDepthCm = 2f;

    [Header("Posizionamento")]
    [SerializeField] private float surfaceOffsetMeters = 0.005f;

    [Header("Debug")]
    [SerializeField] private bool logPlacement = true;

    private ArtworkFrame currentArtworkFrame;

    private void Awake()
    {
        if (!wallSelectionManager)
        {
            wallSelectionManager = FindFirstObjectByType<WallSelectionManager>();
        }
    }

    private void OnEnable()
    {
        if (wallSelectionManager)
        {
            wallSelectionManager.WallSurfaceSelected += HandleWallSurfaceSelected;
        }
    }

    private void OnDisable()
    {
        if (wallSelectionManager)
        {
            wallSelectionManager.WallSurfaceSelected -= HandleWallSurfaceSelected;
        }
    }

    private void HandleWallSurfaceSelected(WallSurfaceHit surface)
    {
        if (!surface.isValid)
        {
            return;
        }

        EnsureArtworkFrame();

        float effectiveFrameWidthCm = frameEnabled ? frameWidthCm : 0f;

        currentArtworkFrame.ConfigureFromCentimeters(
            displayWidthCm,
            displayHeightCm,
            frameEnabled,
            frameColor,
            effectiveFrameWidthCm,
            frameDepthCm,
            null
        );

        WallPlacementData placementData = WallPlacementUtility.PlaceTransformOnSurface(
            currentArtworkFrame.transform,
            surface,
            displayWidthCm,
            displayHeightCm,
            effectiveFrameWidthCm,
            frameDepthCm,
            surfaceOffsetMeters,
            false
        );

        if (logPlacement)
        {
            Debug.Log(
                $"[ArtworkFramePlacementTester] Opera piazzata. " +
                $"wallKey={placementData.wallKey}, " +
                $"surfaceKey={placementData.surfaceKey}, " +
                $"opera={displayWidthCm}x{displayHeightCm}cm, " +
                $"frameEnabled={frameEnabled}, " +
                $"frameWidth={effectiveFrameWidthCm}cm, " +
                $"frameColor={frameColor}, " +
                $"totale={placementData.totalWidthMeters:F2}m x {placementData.totalHeightMeters:F2}m"
            );
        }
    }

    private void EnsureArtworkFrame()
    {
        if (currentArtworkFrame)
        {
            return;
        }

        if (artworkFramePrefab)
        {
            currentArtworkFrame = Instantiate(artworkFramePrefab);
            currentArtworkFrame.name = "ArtworkFrame_Runtime_Test";
            return;
        }

        GameObject root = new GameObject("ArtworkFrame_Runtime_Test");
        currentArtworkFrame = root.AddComponent<ArtworkFrame>();

        currentArtworkFrame.ConfigureFromCentimeters(
            displayWidthCm,
            displayHeightCm,
            frameEnabled,
            frameColor,
            frameEnabled ? frameWidthCm : 0f,
            frameDepthCm,
            null
        );
    }
}
