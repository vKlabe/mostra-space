using UnityEngine;

public class WallPlacementTester : MonoBehaviour
{
    [Header("Riferimenti")]
    [SerializeField] private WallSelectionManager wallSelectionManager;

    [Header("Placeholder")]
    [SerializeField] private GameObject placeholderPrefab;

    [Header("Dimensioni test")]
    [SerializeField] private float testWidthCm = 70f;
    [SerializeField] private float testHeightCm = 100f;
    [SerializeField] private float testFrameWidthCm = 3f;
    [SerializeField] private float testFrameDepthCm = 2f;

    [Header("Posizionamento")]
    [SerializeField] private float surfaceOffsetMeters = 0.005f;

    [Header("Debug")]
    [SerializeField] private bool logPlacement = true;

    private GameObject currentPlaceholder;

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

        EnsurePlaceholder();

        WallPlacementData data = WallPlacementUtility.PlaceTransformOnSurface(
            currentPlaceholder.transform,
            surface,
            testWidthCm,
            testHeightCm,
            testFrameWidthCm,
            testFrameDepthCm,
            surfaceOffsetMeters,
            true
        );

        if (logPlacement)
        {
            Debug.Log(
                $"[WallPlacementTester] Placeholder piazzato. " +
                $"wallKey={data.wallKey}, surfaceKey={data.surfaceKey}, " +
                $"point={data.surfacePoint}, normal={data.surfaceNormal}, " +
                $"opera={testWidthCm}x{testHeightCm}cm, " +
                $"cornice={testFrameWidthCm}cm, " +
                $"ingombro={data.totalWidthMeters:F2}m x {data.totalHeightMeters:F2}m x {data.totalDepthMeters:F2}m"
            );
        }
    }

    private void EnsurePlaceholder()
    {
        if (currentPlaceholder)
        {
            return;
        }

        if (placeholderPrefab)
        {
            currentPlaceholder = Instantiate(placeholderPrefab);
            currentPlaceholder.name = "Artwork_Surface_Placement_Preview";
            return;
        }

        currentPlaceholder = GameObject.CreatePrimitive(PrimitiveType.Cube);
        currentPlaceholder.name = "Artwork_Surface_Placement_Preview";

        Renderer renderer = currentPlaceholder.GetComponent<Renderer>();

        if (renderer)
        {
            Shader shader = Shader.Find("Universal Render Pipeline/Lit");

            if (!shader)
            {
                shader = Shader.Find("Standard");
            }

            Material material = new Material(shader);
            material.color = Color.white;
            renderer.sharedMaterial = material;
        }

        Collider collider = currentPlaceholder.GetComponent<Collider>();

        if (collider)
        {
            Destroy(collider);
        }
    }
}