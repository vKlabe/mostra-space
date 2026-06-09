using System;
using UnityEngine;
using UnityEngine.EventSystems;

public class WallSelectionManager : MonoBehaviour
{
    [Header("Modalità")]
    [SerializeField] private bool editorMode = true;

    [Header("Raycast")]
    [SerializeField] private Camera targetCamera;
    [SerializeField] private LayerMask wallLayerMask = ~0;
    [SerializeField] private float maxRayDistance = 200f;

    [Header("Filtro superfici")]
    [Tooltip("Se la normale ha una componente Y troppo alta, viene ignorata. Serve a evitare pavimento/soffitto/bordi.")]
    [Range(0f, 1f)]
    [SerializeField] private float maxAbsNormalY = 0.55f;

    [Header("Debug")]
    [SerializeField] private bool logSelection = true;

    private WallSurfaceHit hoveredSurface;
    private WallSurfaceHit selectedSurface;

    private WallAnchor highlightedWall;
    private WallAnchor selectedWall;

    public event Action<WallSurfaceHit> WallSurfaceHovered;
    public event Action<WallSurfaceHit> WallSurfaceSelected;

    public bool EditorMode => editorMode;
    public bool HasSelectedSurface => selectedSurface.isValid;
    public WallSurfaceHit SelectedSurface => selectedSurface;
    public string SelectedWallKey => selectedSurface.isValid ? selectedSurface.wallKey : "";
    public string SelectedSurfaceKey => selectedSurface.isValid ? selectedSurface.surfaceKey : "";

    private void Awake()
    {
        hoveredSurface = WallSurfaceHit.Invalid;
        selectedSurface = WallSurfaceHit.Invalid;

        if (!targetCamera)
        {
            targetCamera = Camera.main;
        }
    }

    private void Update()
    {
        if (!editorMode)
        {
            ClearHover();
            return;
        }

        if (!targetCamera)
        {
            targetCamera = Camera.main;
        }

        if (!targetCamera)
        {
            return;
        }

        if (IsPointerOverUi())
        {
            ClearHover();
            return;
        }

        WallSurfaceHit surfaceUnderPointer = RaycastWallSurface();

        SetHoveredSurface(surfaceUnderPointer);

        if (Input.GetMouseButtonDown(0) && surfaceUnderPointer.isValid)
        {
            SelectSurface(surfaceUnderPointer);
        }
    }

    private bool IsPointerOverUi()
    {
        if (!EventSystem.current)
        {
            return false;
        }

        return EventSystem.current.IsPointerOverGameObject();
    }

    private WallSurfaceHit RaycastWallSurface()
    {
        Ray ray = targetCamera.ScreenPointToRay(Input.mousePosition);

        if (!Physics.Raycast(ray, out RaycastHit hit, maxRayDistance, wallLayerMask))
        {
            return WallSurfaceHit.Invalid;
        }

        if (!WallSurfaceHit.TryCreateFromRaycastHit(hit, maxAbsNormalY, out WallSurfaceHit surfaceHit))
        {
            return WallSurfaceHit.Invalid;
        }

        return surfaceHit;
    }

    private void SetHoveredSurface(WallSurfaceHit surface)
    {
        bool sameHover =
            hoveredSurface.isValid &&
            surface.isValid &&
            hoveredSurface.wall == surface.wall &&
            hoveredSurface.surfaceKey == surface.surfaceKey;

        if (sameHover)
        {
            hoveredSurface = surface;
            return;
        }

        if (highlightedWall && highlightedWall != selectedWall)
        {
            highlightedWall.SetHighlighted(false);
        }

        hoveredSurface = surface;
        highlightedWall = surface.isValid ? surface.wall : null;

        if (highlightedWall)
        {
            highlightedWall.SetHighlighted(true);
            WallSurfaceHovered?.Invoke(hoveredSurface);
        }
    }

    public void SelectSurface(WallSurfaceHit surface)
    {
        if (!surface.isValid)
        {
            ClearSelection();
            return;
        }

        if (selectedWall && selectedWall != surface.wall && selectedWall != highlightedWall)
        {
            selectedWall.SetHighlighted(false);
        }

        selectedSurface = surface;
        selectedWall = surface.wall;

        if (selectedWall)
        {
            selectedWall.SetHighlighted(true);
        }

        if (logSelection)
        {
            Debug.Log(
                $"[WallSelectionManager] Superficie selezionata: " +
                $"wallKey={selectedSurface.wallKey}, " +
                $"surfaceKey={selectedSurface.surfaceKey}, " +
                $"point={selectedSurface.point}, " +
                $"normal={selectedSurface.normal}"
            );
        }

        WallSurfaceSelected?.Invoke(selectedSurface);
    }

    public void ClearSelection()
    {
        if (selectedWall && selectedWall != highlightedWall)
        {
            selectedWall.SetHighlighted(false);
        }

        selectedSurface = WallSurfaceHit.Invalid;
        selectedWall = null;
    }

    private void ClearHover()
    {
        if (highlightedWall && highlightedWall != selectedWall)
        {
            highlightedWall.SetHighlighted(false);
        }

        hoveredSurface = WallSurfaceHit.Invalid;
        highlightedWall = null;
    }

    public void SetEditorMode(bool enabled)
    {
        editorMode = enabled;

        if (!editorMode)
        {
            ClearHover();
            ClearSelection();
        }
    }

    public void SetModeFromString(string mode)
    {
        SetEditorMode(string.Equals(mode, "editor", StringComparison.OrdinalIgnoreCase));
    }
}