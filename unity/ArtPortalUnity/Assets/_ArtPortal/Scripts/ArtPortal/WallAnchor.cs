using UnityEngine;

[DisallowMultipleComponent]
public class WallAnchor : MonoBehaviour
{
    [Header("Identità muro")]
    [SerializeField] private string wallKey = "Wall_01";

    [Header("Centro e dimensioni")]
    [SerializeField] private bool useRendererBounds = true;
    [SerializeField] private bool useColliderBoundsIfNoRenderer = true;
    [SerializeField] private Vector3 localCenterOffset = Vector3.zero;

    [Header("Dimensioni manuali fallback")]
    [SerializeField] private float wallWidthMeters = 4f;
    [SerializeField] private float wallHeightMeters = 3f;

    [Header("Highlight editor")]
    [SerializeField] private Color highlightColor = new Color(1f, 0.85f, 0.25f, 1f);

    private Renderer[] cachedRenderers;
    private Collider[] cachedColliders;
    private MaterialPropertyBlock propertyBlock;

    private static readonly int BaseColorId = Shader.PropertyToID("_BaseColor");
    private static readonly int ColorId = Shader.PropertyToID("_Color");
    private static readonly int EmissionColorId = Shader.PropertyToID("_EmissionColor");

    public string WallKey => wallKey;

    public Vector3 CenterPoint
    {
        get
        {
            Bounds bounds;

            if (TryGetBestBounds(out bounds))
            {
                return bounds.center + transform.TransformVector(localCenterOffset);
            }

            return transform.TransformPoint(localCenterOffset);
        }
    }

    public float WallWidthMeters => wallWidthMeters;
    public float WallHeightMeters => wallHeightMeters;

    private void Awake()
    {
        CacheComponents();
    }

    private void Reset()
    {
        CacheComponents();

        if (string.IsNullOrWhiteSpace(wallKey))
        {
            wallKey = gameObject.name;
        }
    }

    private void OnValidate()
    {
        if (string.IsNullOrWhiteSpace(wallKey))
        {
            wallKey = gameObject.name;
        }

        wallWidthMeters = Mathf.Max(0.01f, wallWidthMeters);
        wallHeightMeters = Mathf.Max(0.01f, wallHeightMeters);
    }

    private void CacheComponents()
    {
        cachedRenderers = GetComponentsInChildren<Renderer>();
        cachedColliders = GetComponentsInChildren<Collider>();
        propertyBlock = new MaterialPropertyBlock();
    }

    private bool TryGetBestBounds(out Bounds bounds)
    {
        if (useRendererBounds && TryGetRendererBounds(out bounds))
        {
            return true;
        }

        if (useColliderBoundsIfNoRenderer && TryGetColliderBounds(out bounds))
        {
            return true;
        }

        bounds = new Bounds(transform.position, Vector3.zero);
        return false;
    }

    private bool TryGetRendererBounds(out Bounds bounds)
    {
        if (cachedRenderers == null || cachedRenderers.Length == 0)
        {
            CacheComponents();
        }

        if (cachedRenderers == null || cachedRenderers.Length == 0)
        {
            bounds = new Bounds(transform.position, Vector3.zero);
            return false;
        }

        bool hasBounds = false;
        bounds = new Bounds(transform.position, Vector3.zero);

        foreach (Renderer renderer in cachedRenderers)
        {
            if (!renderer)
            {
                continue;
            }

            if (!hasBounds)
            {
                bounds = renderer.bounds;
                hasBounds = true;
            }
            else
            {
                bounds.Encapsulate(renderer.bounds);
            }
        }

        return hasBounds;
    }

    private bool TryGetColliderBounds(out Bounds bounds)
    {
        if (cachedColliders == null || cachedColliders.Length == 0)
        {
            CacheComponents();
        }

        if (cachedColliders == null || cachedColliders.Length == 0)
        {
            bounds = new Bounds(transform.position, Vector3.zero);
            return false;
        }

        bool hasBounds = false;
        bounds = new Bounds(transform.position, Vector3.zero);

        foreach (Collider collider in cachedColliders)
        {
            if (!collider)
            {
                continue;
            }

            if (!hasBounds)
            {
                bounds = collider.bounds;
                hasBounds = true;
            }
            else
            {
                bounds.Encapsulate(collider.bounds);
            }
        }

        return hasBounds;
    }

    public string GetSurfaceKey(Vector3 worldNormal)
    {
        Vector3 localNormal = transform.InverseTransformDirection(worldNormal.normalized);

        float absX = Mathf.Abs(localNormal.x);
        float absY = Mathf.Abs(localNormal.y);
        float absZ = Mathf.Abs(localNormal.z);

        string side;

        if (absX >= absY && absX >= absZ)
        {
            side = localNormal.x >= 0f ? "PX" : "NX";
        }
        else if (absY >= absX && absY >= absZ)
        {
            side = localNormal.y >= 0f ? "PY" : "NY";
        }
        else
        {
            side = localNormal.z >= 0f ? "PZ" : "NZ";
        }

        return $"{wallKey}__{side}";
    }

    public void SetHighlighted(bool highlighted)
    {
        if (cachedRenderers == null || cachedRenderers.Length == 0)
        {
            CacheComponents();
        }

        foreach (Renderer renderer in cachedRenderers)
        {
            if (!renderer)
            {
                continue;
            }

            if (!highlighted)
            {
                renderer.SetPropertyBlock(null);
                continue;
            }

            renderer.GetPropertyBlock(propertyBlock);

            propertyBlock.SetColor(BaseColorId, highlightColor);
            propertyBlock.SetColor(ColorId, highlightColor);
            propertyBlock.SetColor(EmissionColorId, highlightColor * 0.25f);

            renderer.SetPropertyBlock(propertyBlock);
        }
    }

#if UNITY_EDITOR
    private void OnDrawGizmosSelected()
    {
        Vector3 center = CenterPoint;

        Gizmos.color = Color.yellow;
        Gizmos.DrawSphere(center, 0.07f);

        Gizmos.color = Color.white;
        Gizmos.DrawWireCube(center, new Vector3(wallWidthMeters, wallHeightMeters, 0.05f));
    }
#endif
}