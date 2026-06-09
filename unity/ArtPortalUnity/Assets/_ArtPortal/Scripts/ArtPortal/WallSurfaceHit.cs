using UnityEngine;

public struct WallSurfaceHit
{
    public bool isValid;

    public WallAnchor wall;
    public Collider collider;

    public string wallKey;
    public string surfaceKey;

    public Vector3 point;
    public Vector3 normal;
    public Vector3 up;
    public Vector3 right;

    public float distance;

    public static WallSurfaceHit Invalid
    {
        get
        {
            return new WallSurfaceHit
            {
                isValid = false,
                wall = null,
                collider = null,
                wallKey = "",
                surfaceKey = "",
                point = Vector3.zero,
                normal = Vector3.forward,
                up = Vector3.up,
                right = Vector3.right,
                distance = 0f
            };
        }
    }

    public static bool TryCreateFromRaycastHit(
        RaycastHit hit,
        float maxAbsNormalY,
        out WallSurfaceHit surfaceHit
    )
    {
        surfaceHit = Invalid;

        WallAnchor wallAnchor = hit.collider.GetComponentInParent<WallAnchor>();

        if (!wallAnchor)
        {
            return false;
        }

        Vector3 normal = hit.normal.normalized;

        // Evita soffitto, pavimento, bordi superiori o facce troppo orizzontali.
        if (Mathf.Abs(normal.y) > maxAbsNormalY)
        {
            return false;
        }

        Vector3 up = Vector3.ProjectOnPlane(Vector3.up, normal);

        if (up.sqrMagnitude < 0.0001f)
        {
            up = Vector3.ProjectOnPlane(wallAnchor.transform.up, normal);
        }

        if (up.sqrMagnitude < 0.0001f)
        {
            up = Vector3.up;
        }

        up.Normalize();

        Vector3 right = Vector3.Cross(up, normal);

        if (right.sqrMagnitude < 0.0001f)
        {
            right = Vector3.right;
        }

        right.Normalize();

        string wallKey = wallAnchor.WallKey;
        string surfaceKey = wallAnchor.GetSurfaceKey(normal);

        surfaceHit = new WallSurfaceHit
        {
            isValid = true,
            wall = wallAnchor,
            collider = hit.collider,
            wallKey = wallKey,
            surfaceKey = surfaceKey,
            point = hit.point,
            normal = normal,
            up = up,
            right = right,
            distance = hit.distance
        };

        return true;
    }

    public Quaternion GetRotationFacingSurface()
    {
        return Quaternion.LookRotation(normal, up);
    }

    public Vector3 GetPointWithOffset(float surfaceOffsetMeters)
    {
        return point + normal * surfaceOffsetMeters;
    }
}
