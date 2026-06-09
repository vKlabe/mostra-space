using UnityEngine;

[DisallowMultipleComponent]
public class ArtworkFrame : MonoBehaviour
{
    [Header("Parti prefab")]
    [SerializeField] private Transform artworkImagePlane;
    [SerializeField] private Transform frameTop;
    [SerializeField] private Transform frameBottom;
    [SerializeField] private Transform frameLeft;
    [SerializeField] private Transform frameRight;
    [SerializeField] private Transform backPanel;

    [Header("Materiali opzionali")]
    [SerializeField] private Material imageMaterialTemplate;
    [SerializeField] private Material frameMaterialTemplate;
    [SerializeField] private Material backPanelMaterialTemplate;

    [Header("Setup automatico")]
    [SerializeField] private bool createMissingPartsOnAwake = true;

    [Header("Regole cornice")]
    [SerializeField] private float defaultNoFrameDepthCm = 2f;
    [SerializeField] private float maxFrameDepthCm = 12f;
    [SerializeField] private float maxFrameWidthCm = 15f;

    [Tooltip("Piccolo offset davanti alla cornice per evitare z-fighting.")]
    [SerializeField] private float imageForwardOffsetMeters = 0.003f;

    [Tooltip("Di solito il Quad di Unity va girato per essere visibile dal lato frontale dell'opera.")]
    [SerializeField] private bool rotateImagePlane180Y = true;

    [Header("Debug ultimo setup")]
    [SerializeField] private float lastArtworkWidthMeters;
    [SerializeField] private float lastArtworkHeightMeters;
    [SerializeField] private float lastFrameWidthMeters;
    [SerializeField] private float lastFrameDepthMeters;
    [SerializeField] private float lastTotalWidthMeters;
    [SerializeField] private float lastTotalHeightMeters;
    [SerializeField] private float lastTotalDepthMeters;

    private Renderer imageRenderer;
    private Renderer frameTopRenderer;
    private Renderer frameBottomRenderer;
    private Renderer frameLeftRenderer;
    private Renderer frameRightRenderer;
    private Renderer backPanelRenderer;

    public float ArtworkWidthMeters => lastArtworkWidthMeters;
    public float ArtworkHeightMeters => lastArtworkHeightMeters;
    public float FrameWidthMeters => lastFrameWidthMeters;
    public float FrameDepthMeters => lastFrameDepthMeters;
    public float TotalWidthMeters => lastTotalWidthMeters;
    public float TotalHeightMeters => lastTotalHeightMeters;
    public float TotalDepthMeters => lastTotalDepthMeters;

    private void Awake()
    {
        if (createMissingPartsOnAwake)
        {
            EnsureParts();
        }

        CacheRenderers();
    }

    private void Reset()
    {
        EnsureParts();
        CacheRenderers();
    }

    [ContextMenu("Create / Refresh ArtworkFrame Children")]
    public void CreateOrRefreshChildren()
    {
        EnsureParts();
        CacheRenderers();

        ConfigureFromCentimeters(
            displayWidthCm: 70f,
            displayHeightCm: 100f,
            frameEnabled: true,
            frameColorHex: "#000000",
            frameWidthCm: 3f,
            frameDepthCm: 2f,
            imageTexture: null
        );
    }

    public void ConfigureFromCentimeters(
        float displayWidthCm,
        float displayHeightCm,
        bool frameEnabled,
        string frameColorHex,
        float frameWidthCm,
        float frameDepthCm,
        Texture imageTexture = null
    )
    {
        EnsureParts();
        CacheRenderers();

        float artworkWidthM = CmToMeters(ResolvePositiveCm(displayWidthCm, 50f));
        float artworkHeightM = CmToMeters(ResolvePositiveCm(displayHeightCm, 50f));

        /*
         * Regola fondamentale:
         * se la cornice NON è personalizzata, non usiamo la profondità inserita nel campo.
         * Altrimenti un valore tipo 50 cm crea un blocco enorme e sposta l'immagine in avanti.
         */
        float safeFrameWidthCm = frameEnabled
            ? Mathf.Clamp(frameWidthCm, 0f, maxFrameWidthCm)
            : 0f;

        float safeFrameDepthCm = frameEnabled
            ? Mathf.Clamp(frameDepthCm, 0.5f, maxFrameDepthCm)
            : defaultNoFrameDepthCm;

        float frameWidthM = CmToMeters(safeFrameWidthCm);
        float frameDepthM = Mathf.Max(0.005f, CmToMeters(safeFrameDepthCm));

        float totalWidthM = artworkWidthM + frameWidthM * 2f;
        float totalHeightM = artworkHeightM + frameWidthM * 2f;
        float totalDepthM = frameDepthM;

        Color frameColor = ParseHexColor(frameColorHex, Color.black);

        lastArtworkWidthMeters = artworkWidthM;
        lastArtworkHeightMeters = artworkHeightM;
        lastFrameWidthMeters = frameWidthM;
        lastFrameDepthMeters = frameDepthM;
        lastTotalWidthMeters = totalWidthM;
        lastTotalHeightMeters = totalHeightM;
        lastTotalDepthMeters = totalDepthM;

        ApplyBackPanel(totalWidthM, totalHeightM, totalDepthM, frameColor);
        ApplyArtworkImage(artworkWidthM, artworkHeightM, totalDepthM, imageTexture);

        if (frameEnabled && frameWidthM > 0f)
        {
            ApplyFrame(
                artworkWidthM,
                artworkHeightM,
                frameWidthM,
                totalDepthM,
                totalWidthM,
                totalHeightM,
                frameColor
            );
        }
        else
        {
            SetFrameVisible(false);
        }
    }

    public void ApplyImageTexture(Texture imageTexture)
    {
        EnsureParts();
        CacheRenderers();

        if (!imageRenderer || !imageTexture)
        {
            return;
        }

        Material material = GetOrCreateRendererMaterial(
            imageRenderer,
            imageMaterialTemplate,
            Color.white
        );

        material.mainTexture = imageTexture;
        MakeMaterialDoubleSidedIfPossible(material);
    }

    private void ApplyBackPanel(
        float totalWidthM,
        float totalHeightM,
        float depthM,
        Color color
    )
    {
        if (!backPanel)
        {
            return;
        }

        float thickness = Mathf.Clamp(depthM * 0.12f, 0.002f, 0.008f);

        backPanel.gameObject.SetActive(true);

        /*
         * Coordinate locali:
         * +Z = fronte opera
         * -Z = retro opera / parete
         */
        backPanel.localPosition = new Vector3(
            0f,
            0f,
            -depthM * 0.5f + thickness * 0.5f
        );

        backPanel.localRotation = Quaternion.identity;
        backPanel.localScale = new Vector3(totalWidthM, totalHeightM, thickness);

        if (backPanelRenderer)
        {
            Material material = GetOrCreateRendererMaterial(
                backPanelRenderer,
                backPanelMaterialTemplate,
                color
            );

            SetMaterialColor(material, color);
        }
    }

    private void ApplyArtworkImage(
        float artworkWidthM,
        float artworkHeightM,
        float depthM,
        Texture imageTexture
    )
    {
        if (!artworkImagePlane)
        {
            return;
        }

        artworkImagePlane.gameObject.SetActive(true);

        /*
         * L'immagine sta sempre davanti.
         */
        artworkImagePlane.localPosition = new Vector3(
            0f,
            0f,
            depthM * 0.5f + imageForwardOffsetMeters
        );

        artworkImagePlane.localRotation = rotateImagePlane180Y
            ? Quaternion.Euler(0f, 180f, 0f)
            : Quaternion.identity;

        artworkImagePlane.localScale = new Vector3(artworkWidthM, artworkHeightM, 1f);

        if (imageRenderer)
        {
            Material material = GetOrCreateRendererMaterial(
                imageRenderer,
                imageMaterialTemplate,
                Color.white
            );

            SetMaterialColor(material, Color.white);
            MakeMaterialDoubleSidedIfPossible(material);

            if (imageTexture)
            {
                material.mainTexture = imageTexture;
            }
        }
    }

    private void ApplyFrame(
        float artworkWidthM,
        float artworkHeightM,
        float frameWidthM,
        float depthM,
        float totalWidthM,
        float totalHeightM,
        Color frameColor
    )
    {
        SetFrameVisible(true);

        /*
         * La cornice è centrata nello spessore:
         * fronte = +depth / 2
         * retro = -depth / 2
         * immagine = davanti al fronte
         */
        float zCenter = 0f;

        if (frameTop)
        {
            frameTop.localPosition = new Vector3(
                0f,
                artworkHeightM * 0.5f + frameWidthM * 0.5f,
                zCenter
            );

            frameTop.localRotation = Quaternion.identity;
            frameTop.localScale = new Vector3(totalWidthM, frameWidthM, depthM);
        }

        if (frameBottom)
        {
            frameBottom.localPosition = new Vector3(
                0f,
                -artworkHeightM * 0.5f - frameWidthM * 0.5f,
                zCenter
            );

            frameBottom.localRotation = Quaternion.identity;
            frameBottom.localScale = new Vector3(totalWidthM, frameWidthM, depthM);
        }

        if (frameLeft)
        {
            frameLeft.localPosition = new Vector3(
                -artworkWidthM * 0.5f - frameWidthM * 0.5f,
                0f,
                zCenter
            );

            frameLeft.localRotation = Quaternion.identity;
            frameLeft.localScale = new Vector3(frameWidthM, artworkHeightM, depthM);
        }

        if (frameRight)
        {
            frameRight.localPosition = new Vector3(
                artworkWidthM * 0.5f + frameWidthM * 0.5f,
                0f,
                zCenter
            );

            frameRight.localRotation = Quaternion.identity;
            frameRight.localScale = new Vector3(frameWidthM, artworkHeightM, depthM);
        }

        ApplyFrameMaterial(frameTopRenderer, frameColor);
        ApplyFrameMaterial(frameBottomRenderer, frameColor);
        ApplyFrameMaterial(frameLeftRenderer, frameColor);
        ApplyFrameMaterial(frameRightRenderer, frameColor);
    }

    private void ApplyFrameMaterial(Renderer renderer, Color color)
    {
        if (!renderer)
        {
            return;
        }

        Material material = GetOrCreateRendererMaterial(
            renderer,
            frameMaterialTemplate,
            color
        );

        SetMaterialColor(material, color);
    }

    private void SetFrameVisible(bool visible)
    {
        if (frameTop)
        {
            frameTop.gameObject.SetActive(visible);
        }

        if (frameBottom)
        {
            frameBottom.gameObject.SetActive(visible);
        }

        if (frameLeft)
        {
            frameLeft.gameObject.SetActive(visible);
        }

        if (frameRight)
        {
            frameRight.gameObject.SetActive(visible);
        }
    }

    private void EnsureParts()
    {
        if (!artworkImagePlane)
        {
            artworkImagePlane = EnsurePrimitiveChild("ArtworkImagePlane", PrimitiveType.Quad);
        }

        if (!frameTop)
        {
            frameTop = EnsurePrimitiveChild("FrameTop", PrimitiveType.Cube);
        }

        if (!frameBottom)
        {
            frameBottom = EnsurePrimitiveChild("FrameBottom", PrimitiveType.Cube);
        }

        if (!frameLeft)
        {
            frameLeft = EnsurePrimitiveChild("FrameLeft", PrimitiveType.Cube);
        }

        if (!frameRight)
        {
            frameRight = EnsurePrimitiveChild("FrameRight", PrimitiveType.Cube);
        }

        if (!backPanel)
        {
            backPanel = EnsurePrimitiveChild("BackPanel", PrimitiveType.Cube);
        }
    }

    private Transform EnsurePrimitiveChild(string childName, PrimitiveType primitiveType)
    {
        Transform existing = transform.Find(childName);

        if (existing)
        {
            RemoveCollider(existing.gameObject);
            return existing;
        }

        GameObject child = GameObject.CreatePrimitive(primitiveType);
        child.name = childName;
        child.transform.SetParent(transform);
        child.transform.localPosition = Vector3.zero;
        child.transform.localRotation = Quaternion.identity;
        child.transform.localScale = Vector3.one;

        RemoveCollider(child);

        return child.transform;
    }

    private void RemoveCollider(GameObject target)
    {
        Collider collider = target.GetComponent<Collider>();

        if (!collider)
        {
            return;
        }

        if (Application.isPlaying)
        {
            Destroy(collider);
        }
        else
        {
            DestroyImmediate(collider);
        }
    }

    private void CacheRenderers()
    {
        imageRenderer = artworkImagePlane ? artworkImagePlane.GetComponent<Renderer>() : null;
        frameTopRenderer = frameTop ? frameTop.GetComponent<Renderer>() : null;
        frameBottomRenderer = frameBottom ? frameBottom.GetComponent<Renderer>() : null;
        frameLeftRenderer = frameLeft ? frameLeft.GetComponent<Renderer>() : null;
        frameRightRenderer = frameRight ? frameRight.GetComponent<Renderer>() : null;
        backPanelRenderer = backPanel ? backPanel.GetComponent<Renderer>() : null;
    }

    private Material GetOrCreateRendererMaterial(
        Renderer renderer,
        Material template,
        Color fallbackColor
    )
    {
        if (!renderer)
        {
            return null;
        }

        if (renderer.sharedMaterial == null)
        {
            Shader shader = Shader.Find("Universal Render Pipeline/Lit");

            if (!shader)
            {
                shader = Shader.Find("Standard");
            }

            Material material = template
                ? new Material(template)
                : new Material(shader);

            SetMaterialColor(material, fallbackColor);
            renderer.sharedMaterial = material;
        }

        return renderer.material;
    }

    private void SetMaterialColor(Material material, Color color)
    {
        if (!material)
        {
            return;
        }

        if (material.HasProperty("_BaseColor"))
        {
            material.SetColor("_BaseColor", color);
        }

        if (material.HasProperty("_Color"))
        {
            material.SetColor("_Color", color);
        }
    }

    private void MakeMaterialDoubleSidedIfPossible(Material material)
    {
        if (!material)
        {
            return;
        }

        if (material.HasProperty("_Cull"))
        {
            material.SetFloat("_Cull", 0f);
        }
    }

    private Color ParseHexColor(string hex, Color fallback)
    {
        if (string.IsNullOrWhiteSpace(hex))
        {
            return fallback;
        }

        if (ColorUtility.TryParseHtmlString(hex.Trim(), out Color color))
        {
            return color;
        }

        return fallback;
    }

    private float CmToMeters(float centimeters)
    {
        return Mathf.Max(0f, centimeters) * 0.01f;
    }

    private float ResolvePositiveCm(float centimeters, float fallbackCm)
    {
        return centimeters > 0f ? centimeters : fallbackCm;
    }
}