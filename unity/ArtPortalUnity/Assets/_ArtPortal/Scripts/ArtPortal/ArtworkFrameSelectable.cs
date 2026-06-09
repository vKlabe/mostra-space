using UnityEngine;

[DisallowMultipleComponent]
public class ArtworkFrameSelectable : MonoBehaviour
{
    private SimpleUnityGalleryEditor editor;
    private ArtworkFrame artworkFrame;
    private ArtPortalArtworkPayload payload;
    private BoxCollider boxCollider;

    private GameObject selectionOutlineRoot;
    private Transform outlineTop;
    private Transform outlineBottom;
    private Transform outlineLeft;
    private Transform outlineRight;

    public string GalleryArtworkId => payload != null ? payload.galleryArtworkId : "";
    public ArtPortalArtworkPayload Payload => payload;
    public ArtworkFrame ArtworkFrame => artworkFrame;

    public void Initialize(
        SimpleUnityGalleryEditor ownerEditor,
        ArtworkFrame frame,
        ArtPortalArtworkPayload artworkPayload
    )
    {
        editor = ownerEditor;
        artworkFrame = frame;
        payload = artworkPayload;

        DisableOldSolidHighlightIfPresent();
        EnsureCollider();
        EnsureSelectionOutline();
        RefreshCollider();
        SetSelected(false);
    }

    public void RefreshCollider()
    {
        EnsureCollider();

        if (!artworkFrame)
        {
            boxCollider.size = new Vector3(0.5f, 0.5f, 0.05f);
            boxCollider.center = Vector3.zero;
            return;
        }

        float width = Mathf.Max(0.05f, artworkFrame.TotalWidthMeters);
        float height = Mathf.Max(0.05f, artworkFrame.TotalHeightMeters);
        float depth = Mathf.Max(0.03f, artworkFrame.FrameDepthMeters);

        /*
         * ArtworkFrame è centrato nello spessore:
         * - fronte = +depth/2
         * - retro  = -depth/2
         *
         * Quindi il collider resta centrato a zero.
         */
        boxCollider.size = new Vector3(width, height, depth + 0.04f);
        boxCollider.center = Vector3.zero;

        RefreshSelectionOutlineSize();
    }

    public void SetSelected(bool selected)
    {
        EnsureSelectionOutline();

        if (selectionOutlineRoot)
        {
            selectionOutlineRoot.SetActive(selected);
        }
    }

    private void EnsureCollider()
    {
        if (boxCollider)
        {
            return;
        }

        boxCollider = GetComponent<BoxCollider>();

        if (!boxCollider)
        {
            boxCollider = gameObject.AddComponent<BoxCollider>();
        }

        boxCollider.isTrigger = false;
    }

    private void DisableOldSolidHighlightIfPresent()
    {
        /*
         * Le versioni precedenti creavano un cubo chiamato SelectionHighlight.
         * Quel cubo poteva diventare opaco e coprire completamente l'opera.
         * Lo disattiviamo per sicurezza.
         */
        Transform oldHighlight = transform.Find("SelectionHighlight");

        if (oldHighlight)
        {
            oldHighlight.gameObject.SetActive(false);
        }
    }

    private void EnsureSelectionOutline()
    {
        if (selectionOutlineRoot)
        {
            return;
        }

        DisableOldSolidHighlightIfPresent();

        Transform existing = transform.Find("SelectionOutline");

        if (existing)
        {
            selectionOutlineRoot = existing.gameObject;

            outlineTop = existing.Find("OutlineTop");
            outlineBottom = existing.Find("OutlineBottom");
            outlineLeft = existing.Find("OutlineLeft");
            outlineRight = existing.Find("OutlineRight");

            RefreshSelectionOutlineSize();
            return;
        }

        selectionOutlineRoot = new GameObject("SelectionOutline");
        selectionOutlineRoot.transform.SetParent(transform);
        selectionOutlineRoot.transform.localPosition = Vector3.zero;
        selectionOutlineRoot.transform.localRotation = Quaternion.identity;
        selectionOutlineRoot.transform.localScale = Vector3.one;

        outlineTop = CreateOutlineBar("OutlineTop");
        outlineBottom = CreateOutlineBar("OutlineBottom");
        outlineLeft = CreateOutlineBar("OutlineLeft");
        outlineRight = CreateOutlineBar("OutlineRight");

        RefreshSelectionOutlineSize();
    }

    private Transform CreateOutlineBar(string barName)
    {
        GameObject bar = GameObject.CreatePrimitive(PrimitiveType.Cube);
        bar.name = barName;
        bar.transform.SetParent(selectionOutlineRoot.transform);
        bar.transform.localPosition = Vector3.zero;
        bar.transform.localRotation = Quaternion.identity;
        bar.transform.localScale = Vector3.one;

        Collider collider = bar.GetComponent<Collider>();

        if (collider)
        {
            Destroy(collider);
        }

        Renderer renderer = bar.GetComponent<Renderer>();

        if (renderer)
        {
            Shader shader = Shader.Find("Universal Render Pipeline/Lit");

            if (!shader)
            {
                shader = Shader.Find("Standard");
            }

            Material material = new Material(shader);
            Color color = new Color(1f, 0.82f, 0.05f, 1f);

            if (material.HasProperty("_BaseColor"))
            {
                material.SetColor("_BaseColor", color);
            }

            if (material.HasProperty("_Color"))
            {
                material.SetColor("_Color", color);
            }

            renderer.sharedMaterial = material;
        }

        return bar.transform;
    }

    private void RefreshSelectionOutlineSize()
    {
        if (!selectionOutlineRoot || !artworkFrame)
        {
            return;
        }

        float width = Mathf.Max(0.05f, artworkFrame.TotalWidthMeters + 0.08f);
        float height = Mathf.Max(0.05f, artworkFrame.TotalHeightMeters + 0.08f);
        float depth = Mathf.Max(0.01f, artworkFrame.FrameDepthMeters);

        float barThickness = 0.018f;
        float barDepth = 0.012f;

        /*
         * Il contorno sta davanti all'opera, ma è solo bordo.
         * Non copre l'immagine.
         */
        float z = depth * 0.5f + 0.012f;

        selectionOutlineRoot.transform.localPosition = Vector3.zero;
        selectionOutlineRoot.transform.localRotation = Quaternion.identity;
        selectionOutlineRoot.transform.localScale = Vector3.one;

        if (outlineTop)
        {
            outlineTop.localPosition = new Vector3(0f, height * 0.5f, z);
            outlineTop.localRotation = Quaternion.identity;
            outlineTop.localScale = new Vector3(width, barThickness, barDepth);
        }

        if (outlineBottom)
        {
            outlineBottom.localPosition = new Vector3(0f, -height * 0.5f, z);
            outlineBottom.localRotation = Quaternion.identity;
            outlineBottom.localScale = new Vector3(width, barThickness, barDepth);
        }

        if (outlineLeft)
        {
            outlineLeft.localPosition = new Vector3(-width * 0.5f, 0f, z);
            outlineLeft.localRotation = Quaternion.identity;
            outlineLeft.localScale = new Vector3(barThickness, height, barDepth);
        }

        if (outlineRight)
        {
            outlineRight.localPosition = new Vector3(width * 0.5f, 0f, z);
            outlineRight.localRotation = Quaternion.identity;
            outlineRight.localScale = new Vector3(barThickness, height, barDepth);
        }
    }

    private void OnMouseDown()
    {
        if (!editor)
        {
            return;
        }

        editor.TryBeginSceneArtworkDrag(this);
    }

    private void OnMouseUp()
    {
        if (!editor)
        {
            return;
        }

        editor.TryEndArtworkDragFromSelectable(this);
    }
}