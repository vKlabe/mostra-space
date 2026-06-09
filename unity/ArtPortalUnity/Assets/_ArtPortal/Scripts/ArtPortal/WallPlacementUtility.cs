using UnityEngine;

public struct WallPlacementData
{
    public string wallKey;
    public string surfaceKey;

    public Vector3 surfacePoint;
    public Vector3 surfaceNormal;

    public Vector3 position;
    public Quaternion rotation;
    public Vector3 scale;

    public float displayWidthMeters;
    public float displayHeightMeters;

    public float frameWidthMeters;
    public float frameDepthMeters;

    public float totalWidthMeters;
    public float totalHeightMeters;
    public float totalDepthMeters;
}

public static class WallPlacementUtility
{
    public const float CentimetersToMeters = 0.01f;

    public static float CmToMeters(float centimeters)
    {
        return Mathf.Max(0f, centimeters) * CentimetersToMeters;
    }

    public static float ResolveArtworkDimensionCm(float valueCm, float fallbackCm = 50f)
    {
        return valueCm > 0f ? valueCm : fallbackCm;
    }

    public static WallPlacementData BuildPlacementData(
        WallSurfaceHit surface,
        float displayWidthCm,
        float displayHeightCm,
        float frameWidthCm = 0f,
        float frameDepthCm = 2f,
        float surfaceOffsetMeters = 0.005f
    )
    {
        float safeWidthCm = ResolveArtworkDimensionCm(displayWidthCm);
        float safeHeightCm = ResolveArtworkDimensionCm(displayHeightCm);
        float safeFrameWidthCm = Mathf.Max(0f, frameWidthCm);
        float safeFrameDepthCm = Mathf.Max(0f, frameDepthCm);

        float artworkWidthM = CmToMeters(safeWidthCm);
        float artworkHeightM = CmToMeters(safeHeightCm);
        float frameWidthM = CmToMeters(safeFrameWidthCm);
        float frameDepthM = CmToMeters(safeFrameDepthCm);

        float totalWidthM = artworkWidthM + frameWidthM * 2f;
        float totalHeightM = artworkHeightM + frameWidthM * 2f;
        float totalDepthM = Mathf.Max(0.01f, frameDepthM);

        if (!surface.isValid)
        {
            Debug.LogWarning("[WallPlacementUtility] SurfaceHit non valido. Uso posizione fallback.");

            return new WallPlacementData
            {
                wallKey = "",
                surfaceKey = "",
                surfacePoint = Vector3.zero,
                surfaceNormal = Vector3.forward,
                position = Vector3.zero,
                rotation = Quaternion.identity,
                scale = new Vector3(totalWidthM, totalHeightM, totalDepthM),
                displayWidthMeters = artworkWidthM,
                displayHeightMeters = artworkHeightM,
                frameWidthMeters = frameWidthM,
                frameDepthMeters = frameDepthM,
                totalWidthMeters = totalWidthM,
                totalHeightMeters = totalHeightM,
                totalDepthMeters = totalDepthM
            };
        }

        Vector3 position =
            surface.point +
            surface.normal * (surfaceOffsetMeters + totalDepthM * 0.5f);

        Quaternion rotation = surface.GetRotationFacingSurface();

        return new WallPlacementData
        {
            wallKey = surface.wallKey,
            surfaceKey = surface.surfaceKey,

            surfacePoint = surface.point,
            surfaceNormal = surface.normal,

            position = position,
            rotation = rotation,
            scale = new Vector3(totalWidthM, totalHeightM, totalDepthM),

            displayWidthMeters = artworkWidthM,
            displayHeightMeters = artworkHeightM,

            frameWidthMeters = frameWidthM,
            frameDepthMeters = frameDepthM,

            totalWidthMeters = totalWidthM,
            totalHeightMeters = totalHeightM,
            totalDepthMeters = totalDepthM
        };
    }

    public static WallPlacementData PlaceTransformOnSurface(
        Transform target,
        WallSurfaceHit surface,
        float displayWidthCm,
        float displayHeightCm,
        float frameWidthCm = 0f,
        float frameDepthCm = 2f,
        float surfaceOffsetMeters = 0.005f,
        bool resizeTarget = true
    )
    {
        WallPlacementData data = BuildPlacementData(
            surface,
            displayWidthCm,
            displayHeightCm,
            frameWidthCm,
            frameDepthCm,
            surfaceOffsetMeters
        );

        if (!target)
        {
            return data;
        }

        target.position = data.position;
        target.rotation = data.rotation;

        if (resizeTarget)
        {
            target.localScale = data.scale;
        }

        return data;
    }
}