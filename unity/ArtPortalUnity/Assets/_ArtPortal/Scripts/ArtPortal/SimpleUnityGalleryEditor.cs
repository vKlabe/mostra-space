using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.Text;
using ArtPortal;
using UnityEngine;
using UnityEngine.Networking;

public class SimpleUnityGalleryEditor : MonoBehaviour
{
    private enum ArtworkListFilter
    {
        All,
        Positioned,
        Unpositioned
    }

    private enum InspectorModeTab
    {
        Simple,
        Advanced
    }

    private class RuntimeArtwork
    {
        public ArtPortalArtworkPayload payload;
        public ArtworkFrameSelectable selectable;
        public Texture2D thumbnailTexture;

        public bool IsPositioned
        {
            get
            {
                return payload != null && !string.IsNullOrWhiteSpace(payload.wallKey);
            }
        }
    }

    [Header("Riferimenti scena")]
    [SerializeField] private Camera targetCamera;
    [SerializeField] private WallSelectionManager wallSelectionManager;
    [SerializeField] private ArtworkFrame artworkFramePrefab;

    [Header("Raycast editor")]
    [SerializeField] private LayerMask wallLayerMask = ~0;
    [SerializeField] private LayerMask artworkLayerMask = ~0;
    [SerializeField] private float maxRayDistance = 500f;

    [Tooltip("Se la normale ha una componente Y troppo alta, viene ignorata. Serve a evitare pavimento/soffitto/bordi.")]
    [Range(0f, 1f)]
    [SerializeField] private float maxAbsNormalY = 0.55f;

    [Header("API")]
    [SerializeField] private string galleryId = "";
    [SerializeField] private string mode = "editor";
    [SerializeField] private string apiBaseUrl = "http://localhost:3000/api/unity/galleries";
    [SerializeField] private string transformApiBaseUrl = "http://localhost:3000/api/unity/gallery-artworks";

    [Header("Template Registry")]
    [SerializeField] private ArtPortalTemplateRegistry templateRegistry;
    [SerializeField] private bool activateTemplateFromPayload = true;
    [SerializeField] private bool continueIfTemplateNotFound = true;

    [Tooltip("Solo per test in Unity Editor. In produzione WebGL non usarlo.")]
    [SerializeField] private string localDevToken = "";

    [Header("Caricamento")]
    [SerializeField] private bool loadOnStart = false;
    [SerializeField] private bool autoLoadOnConfigureFromJson = true;

    [Header("Editor drag & drop")]
    [SerializeField] private bool showEditorGui = true;
    [SerializeField] private float surfaceOffsetMeters = 0.005f;
    [SerializeField] private float scaleStepPercent = 5f;

    [Header("Autosave leggero")]
    [SerializeField] private bool enableAutosave = true;
    [SerializeField] private float autosaveDelaySeconds = 4f;
    [SerializeField] private float autosaveIntervalSeconds = 6f;
    [SerializeField] private bool autosaveOnlyWhenNotDragging = true;

    [Header("Area parcheggio opere non posizionate")]
    [SerializeField] private Vector3 stagingStartPosition = new Vector3(-2.5f, 1.6f, 3.2f);
    [SerializeField] private float stagingHorizontalSpacing = 0.75f;
    [SerializeField] private float stagingVerticalSpacing = 0.75f;
    [SerializeField] private int stagingColumns = 4;
    [SerializeField] private Vector3 stagingEulerRotation = new Vector3(0f, 180f, 0f);

    [Header("Debug")]
    [SerializeField] private bool logDebug = true;

    private ArtPortalGalleryPayload galleryPayload;
    private readonly List<RuntimeArtwork> runtimeArtworks = new List<RuntimeArtwork>();
    private readonly HashSet<string> dirtyGalleryArtworkIds = new HashSet<string>();

    private ArtworkFrameSelectable selectedArtwork;
    private WallSurfaceHit selectedSurface;

    private RuntimeArtwork draggingArtwork;
    private bool isDraggingArtwork;
    private bool dragHasValidSurface;

    private RuntimeArtwork visitorSelectedArtwork;
    private bool visitorArtworkCardOpen = false;
    private bool visitorArtworkClickArmed = false;
    private Vector2 visitorCardScroll;

    private ArtworkListFilter currentFilter = ArtworkListFilter.All;
    private InspectorModeTab currentInspectorTab = InspectorModeTab.Simple;

    private Vector2 artworkListScroll;
    private Vector2 inspectorScroll;

    private string widthInput = "";
    private string heightInput = "";
    private string frameColorInput = "#000000";
    private string frameWidthInput = "0";
    private string frameDepthInput = "2";
    private bool frameEnabledInput = false;

    private string positionXInput = "0";
    private string positionYInput = "0";
    private string positionZInput = "0";

    private string rotationXInput = "0";
    private string rotationYInput = "0";
    private string rotationZInput = "0";

    private string scaleXInput = "1";
    private string scaleYInput = "1";
    private string scaleZInput = "1";

    private string statusMessage = "Editor non caricato.";
    private bool isLoading = false;
    private bool isSaving = false;
    private bool isSavingAll = false;
    private bool isAutosaving = false;
    private int saveAllCurrent = 0;
    private int saveAllTotal = 0;

    private float lastDirtyTime = -999f;
    private float lastAutosaveTime = -999f;
    private string autosaveStatusMessage = "";
    private float autosaveStatusUntil = 0f;

    private Rect topBarRect;
    private Rect artworkListRect;
    private Rect inspectorRect;

    private void Awake()
    {
        if (!targetCamera)
        {
            targetCamera = Camera.main;
        }

        if (!wallSelectionManager)
        {
            wallSelectionManager = FindFirstObjectByType<WallSelectionManager>();
        }

        if (!templateRegistry)
        {
            templateRegistry = FindFirstObjectByType<ArtPortalTemplateRegistry>();
        }
    }

    private void Start()
    {
        mode = CleanMode(mode);

        if (wallSelectionManager)
        {
            wallSelectionManager.SetModeFromString(mode);
            wallSelectionManager.WallSurfaceSelected += HandleWallSurfaceSelected;
        }

        ForceEditorRuntimeMode();

        if (loadOnStart && !string.IsNullOrWhiteSpace(galleryId))
        {
            LoadGallery();
        }
    }

    private void Update()
    {
        mode = CleanMode(mode);

        if (mode == "editor")
        {
            ForceEditorRuntimeMode();
            ForceEditorCursorFree();
            HandleSceneArtworkDragInput();
            HandleAutosave();
            return;
        }

        HandleVisitorArtworkInput();
    }

    private void OnDestroy()
    {
        if (wallSelectionManager)
        {
            wallSelectionManager.WallSurfaceSelected -= HandleWallSurfaceSelected;
        }
    }

    public void ConfigureFromJson(string json)
    {
        if (logDebug)
        {
            Debug.Log("[SimpleUnityGalleryEditor] ConfigureFromJson ricevuto: " + json);
        }

        ArtPortalLaunchConfig config = JsonUtility.FromJson<ArtPortalLaunchConfig>(json);

        if (config == null)
        {
            Debug.LogWarning("[SimpleUnityGalleryEditor] Config non valida.");
            return;
        }

        if (!string.IsNullOrWhiteSpace(config.galleryId))
        {
            galleryId = CleanGalleryId(config.galleryId);
        }

        if (!string.IsNullOrWhiteSpace(config.mode))
        {
            mode = CleanMode(config.mode);
        }

        if (!string.IsNullOrWhiteSpace(config.apiBaseUrl))
        {
            apiBaseUrl = config.apiBaseUrl;
        }

        if (!string.IsNullOrWhiteSpace(config.transformApiBaseUrl))
        {
            transformApiBaseUrl = config.transformApiBaseUrl;
        }

        if (wallSelectionManager)
        {
            wallSelectionManager.SetModeFromString(mode);
        }

        if (SimpleDesktopWalker.Instance)
        {
            SimpleDesktopWalker.Instance.SetModeFromString(mode);
        }

        if (autoLoadOnConfigureFromJson && !string.IsNullOrWhiteSpace(galleryId))
        {
            LoadGallery();
        }
    }

    [ContextMenu("Load Gallery")]
    public void LoadGallery()
    {
        if (isLoading)
        {
            return;
        }

        StartCoroutine(LoadGalleryCoroutine());
    }

    private IEnumerator LoadGalleryCoroutine()
    {
        isLoading = true;
        statusMessage = "Caricamento galleria...";

        string safeBaseUrl = CleanBaseUrl(apiBaseUrl);
        string safeGalleryId = CleanGalleryId(galleryId);
        string safeMode = CleanMode(mode);

        galleryId = safeGalleryId;
        mode = safeMode;

        string url = $"{safeBaseUrl}/{UnityWebRequest.EscapeURL(safeGalleryId)}?mode={safeMode}";

        if (logDebug)
        {
            Debug.Log("[SimpleUnityGalleryEditor] GET " + url);
        }

        UnityWebRequest request = UnityWebRequest.Get(url);

        if (!string.IsNullOrWhiteSpace(localDevToken))
        {
            request.SetRequestHeader("x-artportal-dev-token", localDevToken);
        }

        yield return request.SendWebRequest();

        if (request.result != UnityWebRequest.Result.Success)
        {
            statusMessage = "Errore caricamento galleria: " + request.error;
            Debug.LogError("[SimpleUnityGalleryEditor] " + request.downloadHandler.text);
            isLoading = false;
            yield break;
        }

        string json = request.downloadHandler.text;

        if (logDebug)
        {
            Debug.Log("[SimpleUnityGalleryEditor] Payload galleria: " + json);
        }

        galleryPayload = JsonUtility.FromJson<ArtPortalGalleryPayload>(json);

        if (galleryPayload == null)
        {
            statusMessage = "Payload galleria non valido.";
            isLoading = false;
            yield break;
        }

        bool templateApplied = ApplyTemplateFromPayload(galleryPayload);

        if (!templateApplied && !continueIfTemplateNotFound)
        {
            statusMessage = "Template non applicato. Caricamento galleria interrotto.";
            isLoading = false;
            yield break;
        }

        ClearRuntimeArtworks();

        if (galleryPayload.artworks != null)
        {
            for (int i = 0; i < galleryPayload.artworks.Length; i++)
            {
                yield return CreateRuntimeArtwork(galleryPayload.artworks[i], i);
            }
        }

        currentInspectorTab = InspectorModeTab.Simple;

        statusMessage = $"Galleria caricata: {galleryPayload.title} ({runtimeArtworks.Count} opere).";
        isLoading = false;
    }

    private bool ApplyTemplateFromPayload(ArtPortalGalleryPayload payload)
    {
        if (!activateTemplateFromPayload)
        {
            return true;
        }

        if (payload == null)
        {
            return false;
        }

        if (!templateRegistry)
        {
            templateRegistry = FindFirstObjectByType<ArtPortalTemplateRegistry>();
        }

        if (!templateRegistry)
        {
            Debug.LogWarning(
                "[SimpleUnityGalleryEditor] Nessun ArtPortalTemplateRegistry trovato in scena. " +
                "Continuo con l'ambiente corrente."
            );

            return false;
        }

        string templateKey = string.IsNullOrWhiteSpace(payload.unitySceneKey)
            ? "basic_room"
            : payload.unitySceneKey.Trim();

        ArtPortalRuntimeMode runtimeMode = GetCurrentRuntimeMode();

        bool result = templateRegistry.ActivateTemplate(templateKey, runtimeMode);

        if (result)
        {
            if (logDebug)
            {
                Debug.Log($"[SimpleUnityGalleryEditor] Template applicato dal payload: {templateKey}");
            }

            statusMessage = $"Template attivo: {templateKey}";
        }
        else
        {
            Debug.LogWarning($"[SimpleUnityGalleryEditor] Template non applicato dal payload: {templateKey}");
        }

        return result;
    }

    private ArtPortalRuntimeMode GetCurrentRuntimeMode()
    {
        string safeMode = CleanMode(mode);

        return safeMode == "editor"
            ? ArtPortalRuntimeMode.Editor
            : ArtPortalRuntimeMode.Visitor;
    }

    private IEnumerator CreateRuntimeArtwork(ArtPortalArtworkPayload payload, int index)
    {
        ArtworkFrame frame = CreateArtworkFrameInstance(payload);

        Texture2D imageTexture = null;

        if (!string.IsNullOrWhiteSpace(payload.imageUrl))
        {
            UnityWebRequest textureRequest = UnityWebRequestTexture.GetTexture(payload.imageUrl);
            yield return textureRequest.SendWebRequest();

            if (textureRequest.result == UnityWebRequest.Result.Success)
            {
                imageTexture = DownloadHandlerTexture.GetContent(textureRequest);
            }
            else
            {
                Debug.LogWarning(
                    $"[SimpleUnityGalleryEditor] Immagine non caricata per {payload.title}: {textureRequest.error}"
                );
            }
        }

        ApplyVisualSettingsToFrame(frame, payload, imageTexture);

        if (!string.IsNullOrWhiteSpace(payload.wallKey))
        {
            frame.transform.position = new Vector3(
                payload.positionX,
                payload.positionY,
                payload.positionZ
            );

            frame.transform.rotation = Quaternion.Euler(
                payload.rotationX,
                payload.rotationY,
                payload.rotationZ
            );

            frame.transform.localScale = new Vector3(
                ResolvePositive(payload.scaleX, 1f),
                ResolvePositive(payload.scaleY, 1f),
                ResolvePositive(payload.scaleZ, 1f)
            );
        }
        else
        {
            MoveTransformToStaging(frame.transform, index);
        }

        ArtworkFrameSelectable selectable =
            frame.GetComponent<ArtworkFrameSelectable>();

        if (!selectable)
        {
            selectable = frame.gameObject.AddComponent<ArtworkFrameSelectable>();
        }

        selectable.Initialize(this, frame, payload);
        selectable.RefreshCollider();

        runtimeArtworks.Add(new RuntimeArtwork
        {
            payload = payload,
            selectable = selectable,
            thumbnailTexture = imageTexture
        });
    }

    private ArtworkFrame CreateArtworkFrameInstance(ArtPortalArtworkPayload payload)
    {
        ArtworkFrame frame;

        if (artworkFramePrefab)
        {
            frame = Instantiate(artworkFramePrefab);
        }
        else
        {
            GameObject root = new GameObject("ArtworkFrame_Runtime");
            frame = root.AddComponent<ArtworkFrame>();
        }

        frame.name = $"ArtworkFrame_{CleanName(payload.title)}_{payload.galleryArtworkId}";
        return frame;
    }

    private void ClearRuntimeArtworks()
    {
        selectedArtwork = null;
        draggingArtwork = null;
        isDraggingArtwork = false;
        dragHasValidSurface = false;

        visitorSelectedArtwork = null;
        visitorArtworkCardOpen = false;
        visitorArtworkClickArmed = false;
        visitorCardScroll = Vector2.zero;

        runtimeArtworks.Clear();
        dirtyGalleryArtworkIds.Clear();

        lastDirtyTime = -999f;
        lastAutosaveTime = -999f;
        isAutosaving = false;
        autosaveStatusMessage = "";
        autosaveStatusUntil = 0f;

        ArtworkFrameSelectable[] existing =
            FindObjectsByType<ArtworkFrameSelectable>(FindObjectsSortMode.None);

        foreach (ArtworkFrameSelectable item in existing)
        {
            if (item)
            {
                Destroy(item.gameObject);
            }
        }
    }

    private void HandleWallSurfaceSelected(WallSurfaceHit surface)
    {
        selectedSurface = surface;

        if (surface.isValid)
        {
            statusMessage =
                $"Parete selezionata: {surface.wallKey} / lato {surface.surfaceKey}. Trascina un'opera sul muro.";
        }
    }

    public void SelectArtwork(ArtworkFrameSelectable artwork)
    {
        if (selectedArtwork)
        {
            selectedArtwork.SetSelected(false);
        }

        selectedArtwork = artwork;

        if (selectedArtwork)
        {
            selectedArtwork.SetSelected(true);
        }

        if (!selectedArtwork || selectedArtwork.Payload == null)
        {
            return;
        }

        ArtPortalArtworkPayload payload = selectedArtwork.Payload;

        widthInput = ResolvePositive(payload.displayWidthCm, 50f).ToString(CultureInfo.InvariantCulture);
        heightInput = ResolvePositive(payload.displayHeightCm, 50f).ToString(CultureInfo.InvariantCulture);

        frameEnabledInput = payload.frameEnabled;
        frameColorInput = string.IsNullOrWhiteSpace(payload.frameColor)
            ? "#000000"
            : payload.frameColor;

        frameWidthInput = Mathf.Max(0f, payload.frameWidthCm).ToString(CultureInfo.InvariantCulture);
        frameDepthInput = ResolveNonNegative(payload.frameDepthCm, 2f).ToString(CultureInfo.InvariantCulture);

        SyncAdvancedInputsFromSelectedTransform();

        statusMessage = $"Opera selezionata: {payload.title}";
    }

    public bool IsPointerOverEditorUi()
    {
        return IsPointerOverEditorUi(Input.mousePosition);
    }

    private bool IsPointerOverEditorUi(Vector2 screenMousePosition)
    {
        Vector2 guiPosition = new Vector2(
            screenMousePosition.x,
            Screen.height - screenMousePosition.y
        );

        return IsPointerOverEditorUiGui(guiPosition);
    }

    private bool IsPointerOverEditorUiGui(Vector2 guiPosition)
    {
        UpdateUiRects();

        return topBarRect.Contains(guiPosition) ||
               artworkListRect.Contains(guiPosition) ||
               inspectorRect.Contains(guiPosition);
    }

    public void TryBeginSceneArtworkDrag(ArtworkFrameSelectable selectable)
    {
        if (!selectable || mode != "editor")
        {
            return;
        }

        if (IsPointerOverEditorUi())
        {
            return;
        }

        RuntimeArtwork runtime = GetRuntimeArtwork(selectable);

        if (runtime == null)
        {
            return;
        }

        BeginArtworkDrag(runtime);
    }

    public void TryEndArtworkDragFromSelectable(ArtworkFrameSelectable selectable)
    {
        if (!isDraggingArtwork)
        {
            return;
        }

        if (!selectable || draggingArtwork == null)
        {
            return;
        }

        if (draggingArtwork.selectable != selectable)
        {
            return;
        }

        EndArtworkDrag();
    }

    /*
     * Compatibilità con eventuali versioni di ArtworkFrameSelectable
     * che chiamano questi metodi.
     */
    public void HandleArtworkPointerDown(ArtworkFrameSelectable selectable)
    {
        TryBeginSceneArtworkDrag(selectable);
    }

    public void HandleArtworkPointerUp(ArtworkFrameSelectable selectable)
    {
        TryEndArtworkDragFromSelectable(selectable);
    }

    private void HandleSceneArtworkDragInput()
    {
        if (Input.GetMouseButtonDown(0) && !IsPointerOverEditorUi())
        {
            RuntimeArtwork hitArtwork = RaycastArtworkUnderMouse();

            if (hitArtwork != null)
            {
                BeginArtworkDrag(hitArtwork);
            }
        }

        if (isDraggingArtwork && Input.GetMouseButton(0))
        {
            UpdateArtworkDrag();
        }

        if (isDraggingArtwork && Input.GetMouseButtonUp(0))
        {
            EndArtworkDrag();
        }
    }

    private void HandleVisitorArtworkInput()
    {
        if (mode != "visitor")
        {
            return;
        }

        if (visitorArtworkCardOpen)
        {
            if (Input.GetKeyDown(KeyCode.Escape))
            {
                CloseVisitorArtworkCard();
            }

            return;
        }

        /*
         * In visitor il primo click serve a SimpleDesktopWalker
         * per entrare nella visuale e bloccare il mouse.
         *
         * Quindi NON dobbiamo usare quel primo click per aprire un'opera,
         * altrimenti se il visitatore parte davanti a un quadro apre subito
         * la scheda e non riesce più a prendere il controllo della visita.
         */
        bool mouseIsLockedInViewer = Cursor.lockState == CursorLockMode.Locked;

        if (!mouseIsLockedInViewer)
        {
            visitorArtworkClickArmed = false;
            return;
        }

        /*
         * Primo frame/click dopo il lock:
         * armiamo il click sulle opere, ma non apriamo ancora nulla.
         */
        if (!visitorArtworkClickArmed)
        {
            visitorArtworkClickArmed = true;
            return;
        }

        /*
         * Da qui in poi il visitatore è già dentro la visuale.
         * Ora il click può aprire l'opera puntata dal crosshair.
         */
        if (Input.GetMouseButtonDown(0))
        {
            RuntimeArtwork hitArtwork = RaycastArtworkForVisitor();

            if (hitArtwork != null)
            {
                OpenVisitorArtworkCard(hitArtwork);
            }
        }
    }

    private void OpenVisitorArtworkCard(RuntimeArtwork runtime)
    {
        if (runtime == null || runtime.payload == null)
        {
            return;
        }

        if (visitorSelectedArtwork != null && visitorSelectedArtwork.selectable)
        {
            visitorSelectedArtwork.selectable.SetSelected(false);
        }

        visitorSelectedArtwork = runtime;
        visitorArtworkCardOpen = true;
        visitorCardScroll = Vector2.zero;

        if (visitorSelectedArtwork.selectable)
        {
            visitorSelectedArtwork.selectable.SetSelected(true);
        }

        if (SimpleDesktopWalker.Instance)
        {
            SimpleDesktopWalker.Instance.DisableControlsForUI();
        }

        if (logDebug)
        {
            Debug.Log($"[SimpleUnityGalleryEditor] Visitor click opera: {runtime.payload.title}");
        }
    }

    private void CloseVisitorArtworkCard()
    {
        if (visitorSelectedArtwork != null && visitorSelectedArtwork.selectable)
        {
            visitorSelectedArtwork.selectable.SetSelected(false);
        }

        visitorSelectedArtwork = null;
        visitorArtworkCardOpen = false;

        /*
         * Dopo la chiusura della scheda, il mouse torna libero.
         * Il prossimo click servirà di nuovo solo a rientrare nella visuale,
         * non ad aprire immediatamente un'altra opera.
         */
        visitorArtworkClickArmed = false;

        if (SimpleDesktopWalker.Instance)
        {
            SimpleDesktopWalker.Instance.EnableControls();
        }
    }

    private RuntimeArtwork RaycastArtworkForVisitor()
    {
        Vector3 screenPoint;

        if (Cursor.lockState == CursorLockMode.Locked)
        {
            screenPoint = new Vector3(Screen.width * 0.5f, Screen.height * 0.5f, 0f);
        }
        else
        {
            screenPoint = Input.mousePosition;
        }

        return RaycastArtworkAtScreenPoint(screenPoint);
    }

    private RuntimeArtwork RaycastArtworkUnderMouse()
    {
        return RaycastArtworkAtScreenPoint(Input.mousePosition);
    }

    private RuntimeArtwork RaycastArtworkAtScreenPoint(Vector3 screenPoint)
    {
        if (!targetCamera)
        {
            targetCamera = Camera.main;
        }

        if (!targetCamera)
        {
            return null;
        }

        Ray ray = targetCamera.ScreenPointToRay(screenPoint);
        RaycastHit[] hits = Physics.RaycastAll(
            ray,
            maxRayDistance,
            artworkLayerMask,
            QueryTriggerInteraction.Collide
        );

        if (hits == null || hits.Length == 0)
        {
            return null;
        }

        System.Array.Sort(hits, (a, b) => a.distance.CompareTo(b.distance));

        foreach (RaycastHit hit in hits)
        {
            ArtworkFrameSelectable selectable =
                hit.collider.GetComponentInParent<ArtworkFrameSelectable>();

            if (!selectable)
            {
                continue;
            }

            RuntimeArtwork runtime = GetRuntimeArtwork(selectable);

            if (runtime != null)
            {
                return runtime;
            }
        }

        return null;
    }

    private void BeginArtworkDrag(RuntimeArtwork runtime)
    {
        if (runtime == null || runtime.selectable == null || runtime.payload == null)
        {
            return;
        }

        draggingArtwork = runtime;
        isDraggingArtwork = true;
        dragHasValidSurface = false;

        SelectArtwork(runtime.selectable);

        statusMessage = $"Trascina opera: {runtime.payload.title}";
    }

    private void UpdateArtworkDrag()
    {
        if (draggingArtwork == null || draggingArtwork.selectable == null)
        {
            return;
        }

        if (TryGetWallSurfaceUnderMouse(out WallSurfaceHit surface))
        {
            dragHasValidSurface = true;
            selectedSurface = surface;

            PlaceRuntimeArtworkOnSurface(draggingArtwork, surface, true);
            SyncAdvancedInputsFromSelectedTransform();

            statusMessage = $"Trascinando su {surface.surfaceKey}. Rilascia per confermare.";
        }
        else
        {
            statusMessage = "Trascina l'opera sopra una parete valida.";
        }
    }

    private void EndArtworkDrag()
    {
        if (draggingArtwork != null && dragHasValidSurface)
        {
            CopyTransformToPayload(draggingArtwork.selectable.transform, draggingArtwork.payload);
            MarkDirty(draggingArtwork.payload.galleryArtworkId);
            SyncAdvancedInputsFromSelectedTransform();

            statusMessage = $"Opera posizionata su {draggingArtwork.payload.wallKey}. Modifiche non salvate.";
        }

        draggingArtwork = null;
        isDraggingArtwork = false;
        dragHasValidSurface = false;
    }

    private bool TryGetWallSurfaceUnderMouse(out WallSurfaceHit surface)
    {
        surface = WallSurfaceHit.Invalid;

        if (!targetCamera)
        {
            targetCamera = Camera.main;
        }

        if (!targetCamera)
        {
            return false;
        }

        Ray ray = targetCamera.ScreenPointToRay(Input.mousePosition);
        RaycastHit[] hits = Physics.RaycastAll(ray, maxRayDistance, wallLayerMask);

        if (hits == null || hits.Length == 0)
        {
            return false;
        }

        System.Array.Sort(hits, (a, b) => a.distance.CompareTo(b.distance));

        foreach (RaycastHit hit in hits)
        {
            ArtworkFrameSelectable selectable =
                hit.collider.GetComponentInParent<ArtworkFrameSelectable>();

            if (draggingArtwork != null && selectable == draggingArtwork.selectable)
            {
                continue;
            }

            if (WallSurfaceHit.TryCreateFromRaycastHit(hit, maxAbsNormalY, out surface))
            {
                return true;
            }
        }

        surface = WallSurfaceHit.Invalid;
        return false;
    }

    private void OnGUI()
    {
        if (mode == "visitor")
        {
            if (visitorArtworkCardOpen)
            {
                DrawVisitorArtworkCard();
            }

            return;
        }

        if (!showEditorGui || mode != "editor")
        {
            return;
        }

        ForceEditorCursorFree();
        UpdateUiRects();

        Event currentEvent = Event.current;

        if (currentEvent != null &&
            currentEvent.type == EventType.MouseDown &&
            !IsPointerOverEditorUiGui(currentEvent.mousePosition))
        {
            GUI.FocusControl(null);
        }

        DrawTopBar();
        DrawArtworkList();
        DrawInspector();

        UpdateWalkerInputStateFromGuiFocus();
    }

    private void DrawVisitorArtworkCard()
    {
        if (visitorSelectedArtwork == null || visitorSelectedArtwork.payload == null)
        {
            return;
        }

        ArtPortalArtworkPayload payload = visitorSelectedArtwork.payload;

        float width = Mathf.Min(720f, Screen.width - 48f);
        float height = Mathf.Min(520f, Screen.height - 48f);
        float x = (Screen.width - width) * 0.5f;
        float y = (Screen.height - height) * 0.5f;

        Rect panelRect = new Rect(x, y, width, height);
        GUI.Box(panelRect, "");

        GUIStyle titleStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 22,
            fontStyle = FontStyle.Bold,
            wordWrap = true
        };

        GUIStyle subtitleStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 13,
            wordWrap = true
        };

        GUIStyle smallStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 12,
            wordWrap = true
        };

        float padding = 24f;
        float imageW = 220f;
        float imageH = 280f;

        Rect imageRect = new Rect(x + padding, y + padding + 44f, imageW, imageH);

        if (visitorSelectedArtwork.thumbnailTexture)
        {
            GUI.DrawTexture(imageRect, visitorSelectedArtwork.thumbnailTexture, ScaleMode.ScaleToFit);
        }
        else
        {
            GUI.Box(imageRect, "Immagine non disponibile");
        }

        float contentX = x + padding + imageW + 24f;
        float contentY = y + padding;
        float contentW = width - imageW - padding * 2f - 24f;

        GUI.Label(
            new Rect(contentX, contentY, contentW, 62f),
            string.IsNullOrWhiteSpace(payload.title) ? "Opera senza titolo" : payload.title,
            titleStyle
        );

        contentY += 66f;

        string artistLine = string.IsNullOrWhiteSpace(payload.artistName)
            ? "Artista non indicato"
            : payload.artistName;

        if (!string.IsNullOrWhiteSpace(payload.year))
        {
            artistLine += $" · {payload.year}";
        }

        GUI.Label(new Rect(contentX, contentY, contentW, 28f), artistLine, subtitleStyle);
        contentY += 34f;

        string techniqueLine = string.IsNullOrWhiteSpace(payload.technique)
            ? "Tecnica non indicata"
            : payload.technique;

        GUI.Label(new Rect(contentX, contentY, contentW, 28f), techniqueLine, smallStyle);
        contentY += 30f;

        string dimensionsLine = !string.IsNullOrWhiteSpace(payload.dimensions)
            ? payload.dimensions
            : $"{ResolvePositive(payload.displayWidthCm, 50f):0.##} x {ResolvePositive(payload.displayHeightCm, 50f):0.##} cm";

        GUI.Label(new Rect(contentX, contentY, contentW, 28f), $"Dimensioni: {dimensionsLine}", smallStyle);
        contentY += 30f;

        string priceLine = "Prezzo su richiesta";

        if (payload.isForSale)
        {
            if (!string.IsNullOrWhiteSpace(payload.price))
            {
                priceLine = $"Prezzo: {payload.price} {payload.currency}";
            }
            else
            {
                priceLine = "Opera in vendita · prezzo su richiesta";
            }
        }

        GUI.Label(new Rect(contentX, contentY, contentW, 28f), priceLine, smallStyle);
        contentY += 38f;

        Rect descriptionRect = new Rect(contentX, contentY, contentW, 146f);
        GUI.Box(descriptionRect, "");

        visitorCardScroll = GUI.BeginScrollView(
            new Rect(contentX + 10f, contentY + 10f, contentW - 20f, 126f),
            visitorCardScroll,
            new Rect(0f, 0f, contentW - 40f, 260f)
        );

        string description = string.IsNullOrWhiteSpace(payload.description)
            ? "Nessuna descrizione disponibile."
            : payload.description;

        GUI.Label(new Rect(0f, 0f, contentW - 44f, 250f), description, smallStyle);
        GUI.EndScrollView();

        float buttonY = y + height - 58f;

        if (GUI.Button(new Rect(x + padding, buttonY, 160f, 34f), "Chiudi scheda"))
        {
            CloseVisitorArtworkCard();
        }

        if (GUI.Button(new Rect(x + padding + 174f, buttonY, 210f, 34f), "Richiedi informazioni"))
        {
            OpenVisitorInquiryPage(payload);
        }

        GUI.Label(
            new Rect(x + padding + 400f, buttonY + 7f, width - padding * 2f - 400f, 24f),
            "ESC chiude la scheda",
            smallStyle
        );
    }

    private void OpenVisitorInquiryPage(ArtPortalArtworkPayload payload)
    {
        string siteBaseUrl = CleanSiteBaseUrlFromApiBaseUrl(apiBaseUrl);

        if (galleryPayload == null ||
            string.IsNullOrWhiteSpace(siteBaseUrl) ||
            string.IsNullOrWhiteSpace(galleryPayload.slug))
        {
            Debug.LogWarning("[SimpleUnityGalleryEditor] Impossibile aprire richiesta informazioni: dati galleria mancanti.");
            return;
        }

        string url =
            $"{siteBaseUrl}/gallerie/{EncodeUrl(galleryPayload.slug)}" +
            $"?artworkId={EncodeUrl(payload.artworkId)}" +
            $"&galleryArtworkId={EncodeUrl(payload.galleryArtworkId)}" +
            "#richiesta";

        Application.OpenURL(url);
    }

    private void UpdateUiRects()
    {
        topBarRect = new Rect(12, 12, Screen.width - 24, 64);
        artworkListRect = new Rect(12, 88, 360, Screen.height - 100);
        inspectorRect = new Rect(Screen.width - 382, 88, 370, Screen.height - 100);
    }

    private void DrawTopBar()
    {
        GUI.Box(topBarRect, "");

        string galleryTitle = galleryPayload != null && !string.IsNullOrWhiteSpace(galleryPayload.title)
            ? galleryPayload.title
            : "Galleria non caricata";

        string saveState = dirtyGalleryArtworkIds.Count > 0
            ? $"Modifiche non salvate: {dirtyGalleryArtworkIds.Count}"
            : "Tutto salvato";

        if (isAutosaving)
        {
            saveState = $"Autosalvataggio {saveAllCurrent}/{saveAllTotal}";
        }
        else if (isSavingAll)
        {
            saveState = $"Salvataggio {saveAllCurrent}/{saveAllTotal}";
        }
        else if (isSaving)
        {
            saveState = "Salvataggio opera...";
        }
        else if (!string.IsNullOrWhiteSpace(autosaveStatusMessage) && Time.time <= autosaveStatusUntil)
        {
            saveState = autosaveStatusMessage;
        }

        string permissionLabel = GetEditorPermissionLabel();

        GUIStyle titleStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 16,
            fontStyle = FontStyle.Bold,
            alignment = TextAnchor.MiddleLeft
        };

        GUIStyle metaStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 11,
            alignment = TextAnchor.MiddleLeft
        };

        GUI.Label(new Rect(24, 18, 360, 24), galleryTitle, titleStyle);

        GUI.Label(
            new Rect(24, 42, 680, 20),
            $"{saveState}  ·  {permissionLabel}  ·  {statusMessage}",
            metaStyle
        );

        float buttonY = 25f;
        float buttonH = 30f;
        float gap = 8f;
        float right = Screen.width - 24f;

        float exitW = 74f;
        right -= exitW;
        if (GUI.Button(new Rect(right, buttonY, exitW, buttonH), "Esci"))
        {
            OpenDashboardGalleryDetail();
        }

        right -= gap;

        float deselectW = 92f;
        right -= deselectW;
        GUI.enabled = !isLoading && !isSaving && !isSavingAll && !isAutosaving && selectedArtwork != null;
        if (GUI.Button(new Rect(right, buttonY, deselectW, buttonH), "Deseleziona"))
        {
            SelectArtwork(null);
        }

        right -= gap;

        float previewW = 138f;
        right -= previewW;
        GUI.enabled = !isLoading && !isSaving && !isSavingAll && !isAutosaving;
        if (GUI.Button(new Rect(right, buttonY, previewW, buttonH), "Anteprima visitor"))
        {
            OpenVisitorPreview();
        }

        right -= gap;

        float saveAllW = 102f;
        right -= saveAllW;
        GUI.enabled = !isLoading && !isSaving && !isSavingAll && !isAutosaving && dirtyGalleryArtworkIds.Count > 0;
        if (GUI.Button(new Rect(right, buttonY, saveAllW, buttonH), "Salva tutto"))
        {
            SaveAllDirtyArtworks();
        }

        right -= gap;

        float saveOneW = 98f;
        right -= saveOneW;
        GUI.enabled = !isLoading && !isSaving && !isSavingAll && !isAutosaving && selectedArtwork != null;
        if (GUI.Button(new Rect(right, buttonY, saveOneW, buttonH), "Salva opera"))
        {
            SaveSelectedArtwork();
        }

        right -= gap;

        float reloadW = 84f;
        right -= reloadW;
        GUI.enabled = !isLoading && !isSaving && !isSavingAll && !isAutosaving;
        if (GUI.Button(new Rect(right, buttonY, reloadW, buttonH), "Ricarica"))
        {
            LoadGallery();
        }

        GUI.enabled = true;
    }

    private void DrawArtworkList()
    {
        GUI.Box(artworkListRect, "");

        GUIStyle titleStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 15,
            fontStyle = FontStyle.Bold
        };

        GUIStyle smallStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 11,
            wordWrap = true
        };

        GUI.Label(new Rect(28, 102, 250, 22), "Opere", titleStyle);

        int positionedCount = 0;
        int unpositionedCount = 0;

        foreach (RuntimeArtwork item in runtimeArtworks)
        {
            if (item == null || item.payload == null)
            {
                continue;
            }

            if (item.IsPositioned)
            {
                positionedCount++;
            }
            else
            {
                unpositionedCount++;
            }
        }

        GUI.Label(
            new Rect(28, 124, 320, 34),
            $"Totale: {runtimeArtworks.Count} · Posizionate: {positionedCount} · Non posizionate: {unpositionedCount}",
            smallStyle
        );

        if (isLoading)
        {
            GUI.Label(new Rect(28, 166, 300, 24), "Caricamento opere...");
            return;
        }

        float tabY = 166f;

        if (GUI.Button(new Rect(24, tabY, 96, 30), currentFilter == ArtworkListFilter.All ? "✓ Tutte" : "Tutte"))
        {
            currentFilter = ArtworkListFilter.All;
        }

        if (GUI.Button(new Rect(128, tabY, 108, 30), currentFilter == ArtworkListFilter.Positioned ? "✓ Posiz." : "Posiz."))
        {
            currentFilter = ArtworkListFilter.Positioned;
        }

        if (GUI.Button(new Rect(244, tabY, 108, 30), currentFilter == ArtworkListFilter.Unpositioned ? "✓ Non pos." : "Non pos."))
        {
            currentFilter = ArtworkListFilter.Unpositioned;
        }

        List<RuntimeArtwork> visible = GetVisibleArtworks();

        if (visible.Count <= 0)
        {
            GUI.Label(
                new Rect(28, 216, 310, 80),
                "Nessuna opera in questo filtro. Aggiungi opere alla galleria dal portale oppure cambia filtro.",
                smallStyle
            );
            return;
        }

        artworkListScroll = GUI.BeginScrollView(
            new Rect(20, 208, 340, Screen.height - 228),
            artworkListScroll,
            new Rect(0, 0, 314, Mathf.Max(500, visible.Count * 104))
        );

        float y = 0f;

        foreach (RuntimeArtwork item in visible)
        {
            if (item == null || item.payload == null || item.selectable == null)
            {
                continue;
            }

            bool isSelected = selectedArtwork == item.selectable;
            bool isDirty = dirtyGalleryArtworkIds.Contains(item.payload.galleryArtworkId);

            Rect itemRect = new Rect(0, y, 310, 94);
            GUI.Box(itemRect, "");

            if (item.thumbnailTexture)
            {
                GUI.DrawTexture(new Rect(10, y + 10, 68, 68), item.thumbnailTexture, ScaleMode.ScaleToFit);
            }
            else
            {
                GUI.Box(new Rect(10, y + 10, 68, 68), "No img");
            }

            string selected = isSelected ? "▶ " : "";
            string dirty = isDirty ? "  • non salvata" : "";
            string status = item.IsPositioned ? "Posizionata" : "Non posizionata";

            GUIStyle nameStyle = new GUIStyle(GUI.skin.label)
            {
                fontStyle = isSelected ? FontStyle.Bold : FontStyle.Normal,
                fontSize = 12,
                wordWrap = true
            };

            GUI.Label(
                new Rect(88, y + 10, 210, 34),
                $"{selected}{item.payload.title}",
                nameStyle
            );

            GUI.Label(
                new Rect(88, y + 43, 210, 18),
                string.IsNullOrWhiteSpace(item.payload.artistName)
                    ? "Artista non indicato"
                    : item.payload.artistName,
                smallStyle
            );

            GUI.Label(
                new Rect(88, y + 61, 210, 18),
                $"{ResolvePositive(item.payload.displayWidthCm, 50f):0.##} x {ResolvePositive(item.payload.displayHeightCm, 50f):0.##} cm",
                smallStyle
            );

            GUI.Label(
                new Rect(88, y + 77, 210, 18),
                $"{status}{dirty}",
                smallStyle
            );

            Event currentEvent = Event.current;

            if (currentEvent != null &&
                currentEvent.type == EventType.MouseDown &&
                currentEvent.button == 0 &&
                itemRect.Contains(currentEvent.mousePosition))
            {
                BeginArtworkDrag(item);
                currentEvent.Use();
            }

            y += 104f;
        }

        GUI.EndScrollView();
    }

    private void DrawInspector()
    {
        GUI.Box(inspectorRect, "");

        GUIStyle titleStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 15,
            fontStyle = FontStyle.Bold,
            wordWrap = true
        };

        GUIStyle smallStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 11,
            wordWrap = true
        };

        GUI.Label(new Rect(Screen.width - 362, 102, 320, 22), "Opera selezionata", titleStyle);

        inspectorScroll = GUI.BeginScrollView(
            new Rect(Screen.width - 362, 132, 342, Screen.height - 152),
            inspectorScroll,
            new Rect(0, 0, 318, 1080)
        );

        if (!selectedArtwork || selectedArtwork.Payload == null)
        {
            GUI.Label(
                new Rect(0, 0, 310, 90),
                "Nessuna opera selezionata.\n\nTrascina un'opera dalla lista sulla parete, oppure clicca un'opera già appesa per modificarla.",
                smallStyle
            );

            GUI.EndScrollView();
            return;
        }

        ArtPortalArtworkPayload payload = selectedArtwork.Payload;
        bool isDirty = dirtyGalleryArtworkIds.Contains(payload.galleryArtworkId);

        float y = 0f;

        GUIStyle artworkTitleStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 14,
            fontStyle = FontStyle.Bold,
            wordWrap = true
        };

        GUI.Label(new Rect(0, y, 310, 44), string.IsNullOrWhiteSpace(payload.title) ? "Opera senza titolo" : payload.title, artworkTitleStyle);
        y += 48f;

        GUI.Label(
            new Rect(0, y, 310, 22),
            string.IsNullOrWhiteSpace(payload.artistName) ? "Artista non indicato" : payload.artistName,
            smallStyle
        );
        y += 28f;

        GUI.Box(new Rect(0, y, 310, 84), "");
        GUI.Label(new Rect(12, y + 10, 286, 18), "Stato allestimento", smallStyle);
        GUI.Label(
            new Rect(12, y + 30, 286, 18),
            string.IsNullOrWhiteSpace(payload.wallKey) ? "Non posizionata" : $"Parete: {payload.wallKey}",
            smallStyle
        );
        GUI.Label(
            new Rect(12, y + 48, 286, 18),
            isDirty ? "Modifiche non salvate" : "Salvata",
            smallStyle
        );
        GUI.Label(
            new Rect(12, y + 66, 286, 18),
            GetEditorPermissionLabel(),
            smallStyle
        );
        y += 100f;

        if (GUI.Button(new Rect(0, y, 150, 30), currentInspectorTab == InspectorModeTab.Simple ? "✓ Semplice" : "Semplice"))
        {
            currentInspectorTab = InspectorModeTab.Simple;
            GUI.FocusControl(null);
        }

        string advancedLabel = CanUseAdvancedMode() ? "Avanzata" : "Avanzata PRO";
        if (GUI.Button(new Rect(160, y, 150, 30), currentInspectorTab == InspectorModeTab.Advanced ? $"✓ {advancedLabel}" : advancedLabel))
        {
            currentInspectorTab = InspectorModeTab.Advanced;
            SyncAdvancedInputsFromSelectedTransform();
            GUI.FocusControl(null);
        }

        y += 46f;

        if (currentInspectorTab == InspectorModeTab.Simple)
        {
            y = DrawSimpleInspectorControls(y, titleStyle, smallStyle);
        }
        else
        {
            y = DrawAdvancedInspectorControls(y, titleStyle, smallStyle);
        }

        GUI.EndScrollView();
    }

    private float DrawSimpleInspectorControls(float y, GUIStyle titleStyle, GUIStyle smallStyle)
    {
        if (!selectedArtwork || selectedArtwork.Payload == null)
        {
            return y;
        }

        GUI.Label(new Rect(0, y, 310, 22), "Dimensioni esposizione", titleStyle);
        y += 28f;

        GUI.Label(new Rect(0, y, 310, 22), "Larghezza cm", smallStyle);
        y += 22f;
        GUI.SetNextControlName("EditorInputWidth");
        widthInput = GUI.TextField(new Rect(0, y, 310, 28), widthInput);
        y += 40f;

        GUI.Label(new Rect(0, y, 310, 22), "Altezza cm", smallStyle);
        y += 22f;
        GUI.SetNextControlName("EditorInputHeight");
        heightInput = GUI.TextField(new Rect(0, y, 310, 28), heightInput);
        y += 42f;

        GUI.Label(new Rect(0, y, 310, 22), "Cornice", titleStyle);
        y += 30f;

        frameEnabledInput = GUI.Toggle(new Rect(0, y, 310, 24), frameEnabledInput, "Cornice personalizzata");
        y += 34f;

        GUI.Label(new Rect(0, y, 310, 22), "Colore cornice HEX", smallStyle);
        y += 22f;
        GUI.SetNextControlName("EditorInputFrameColor");
        frameColorInput = GUI.TextField(new Rect(0, y, 310, 28), frameColorInput);
        y += 40f;

        GUI.Label(new Rect(0, y, 310, 22), "Larghezza cornice cm", smallStyle);
        y += 22f;
        GUI.SetNextControlName("EditorInputFrameWidth");
        frameWidthInput = GUI.TextField(new Rect(0, y, 310, 28), frameWidthInput);
        y += 40f;

        GUI.Label(new Rect(0, y, 310, 22), "Profondità cornice cm", smallStyle);
        y += 22f;
        GUI.SetNextControlName("EditorInputFrameDepth");
        frameDepthInput = GUI.TextField(new Rect(0, y, 310, 28), frameDepthInput);
        y += 44f;

        GUI.enabled = !isSaving && !isSavingAll && !isAutosaving;

        if (GUI.Button(new Rect(0, y, 310, 34), "Applica dimensioni e cornice"))
        {
            ApplySelectedArtworkVisualSettings(true);
        }

        y += 46f;

        if (GUI.Button(new Rect(0, y, 150, 32), "Scala +"))
        {
            ScaleSelectedArtwork(1f + scaleStepPercent / 100f);
        }

        if (GUI.Button(new Rect(160, y, 150, 32), "Scala -"))
        {
            ScaleSelectedArtwork(1f - scaleStepPercent / 100f);
        }

        y += 48f;

        if (GUI.Button(new Rect(0, y, 310, 34), "Rimuovi dalla parete"))
        {
            RemoveSelectedArtworkFromWall();
        }

        y += 46f;

        if (GUI.Button(new Rect(0, y, 310, 36), isSaving ? "Salvataggio..." : "Salva opera"))
        {
            SaveSelectedArtwork();
        }

        GUI.enabled = true;

        y += 50f;

        GUI.Label(
            new Rect(0, y, 310, 96),
            "Suggerimento: trascina l'opera direttamente sulla parete. Il sistema riconosce automaticamente il lato del muro.\n\nPer posizione, rotazione e scala numerica usa la modalità Avanzata, disponibile dal piano Pro.",
            smallStyle
        );

        return y + 110f;
    }

    private float DrawAdvancedInspectorControls(float y, GUIStyle titleStyle, GUIStyle smallStyle)
    {
        if (!selectedArtwork || selectedArtwork.Payload == null)
        {
            return y;
        }

        if (!CanUseAdvancedMode())
        {
            GUI.Box(new Rect(0, y, 310, 176), "");
            GUI.Label(new Rect(12, y + 12, 286, 24), "Modalità avanzata PRO", titleStyle);
            GUI.Label(
                new Rect(12, y + 42, 286, 88),
                "La modalità avanzata permette di modificare manualmente posizione X/Y/Z, rotazione X/Y/Z e scala X/Y/Z dell'opera.\n\nÈ disponibile dal piano Pro in poi.",
                smallStyle
            );

            if (GUI.Button(new Rect(12, y + 132, 286, 32), "Torna alla modalità semplice"))
            {
                currentInspectorTab = InspectorModeTab.Simple;
            }

            return y + 196f;
        }

        GUI.Label(new Rect(0, y, 310, 22), "Trasformazione avanzata", titleStyle);
        y += 28f;

        GUI.Label(
            new Rect(0, y, 310, 42),
            "Modifica manuale dei valori reali salvati su Supabase. Usala solo se vuoi precisione numerica.",
            smallStyle
        );
        y += 52f;

        GUI.Label(new Rect(0, y, 310, 22), "Posizione", titleStyle);
        y += 28f;

        DrawVector3Inputs(
            ref y,
            "Position",
            "X",
            "Y",
            "Z",
            ref positionXInput,
            ref positionYInput,
            ref positionZInput
        );

        y += 14f;

        GUI.Label(new Rect(0, y, 310, 22), "Rotazione", titleStyle);
        y += 28f;

        DrawVector3Inputs(
            ref y,
            "Rotation",
            "X°",
            "Y°",
            "Z°",
            ref rotationXInput,
            ref rotationYInput,
            ref rotationZInput
        );

        y += 14f;

        GUI.Label(new Rect(0, y, 310, 22), "Scala", titleStyle);
        y += 28f;

        DrawVector3Inputs(
            ref y,
            "Scale",
            "X",
            "Y",
            "Z",
            ref scaleXInput,
            ref scaleYInput,
            ref scaleZInput
        );

        y += 18f;

        GUI.enabled = !isSaving && !isSavingAll && !isAutosaving;

        if (GUI.Button(new Rect(0, y, 310, 34), "Applica trasformazione avanzata"))
        {
            ApplyAdvancedTransformInputs(true);
        }

        y += 46f;

        if (GUI.Button(new Rect(0, y, 150, 32), "Rileggi valori"))
        {
            SyncAdvancedInputsFromSelectedTransform();
            statusMessage = "Valori avanzati riletti dalla scena.";
        }

        if (GUI.Button(new Rect(160, y, 150, 32), "Scala 1:1:1"))
        {
            scaleXInput = "1";
            scaleYInput = "1";
            scaleZInput = "1";
            ApplyAdvancedTransformInputs(true);
        }

        y += 46f;

        if (GUI.Button(new Rect(0, y, 310, 34), "Reset rotazione"))
        {
            rotationXInput = "0";
            rotationYInput = "0";
            rotationZInput = "0";
            ApplyAdvancedTransformInputs(true);
        }

        y += 46f;

        if (GUI.Button(new Rect(0, y, 310, 34), "Rimuovi dalla parete"))
        {
            RemoveSelectedArtworkFromWall();
        }

        y += 46f;

        if (GUI.Button(new Rect(0, y, 310, 36), isSaving ? "Salvataggio..." : "Salva opera"))
        {
            SaveSelectedArtwork();
        }

        GUI.enabled = true;

        y += 50f;

        GUI.Label(
            new Rect(0, y, 310, 96),
            "Nota: i valori avanzati possono spostare l'opera fuori dalla parete. Per tornare a un posizionamento sicuro, trascina di nuovo l'opera su una parete.",
            smallStyle
        );

        return y + 110f;
    }

    private void DrawVector3Inputs(
        ref float y,
        string controlPrefix,
        string labelX,
        string labelY,
        string labelZ,
        ref string xValue,
        ref string yValue,
        ref string zValue
    )
    {
        GUIStyle smallStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 11
        };

        float labelWidth = 24f;
        float inputWidth = 76f;
        float gap = 8f;

        GUI.Label(new Rect(0, y + 5, labelWidth, 20), labelX, smallStyle);
        GUI.SetNextControlName($"EditorInput{controlPrefix}X");
        xValue = GUI.TextField(new Rect(labelWidth, y, inputWidth, 28), xValue);

        float secondX = labelWidth + inputWidth + gap;
        GUI.Label(new Rect(secondX, y + 5, labelWidth, 20), labelY, smallStyle);
        GUI.SetNextControlName($"EditorInput{controlPrefix}Y");
        yValue = GUI.TextField(new Rect(secondX + labelWidth, y, inputWidth, 28), yValue);

        float thirdX = secondX + labelWidth + inputWidth + gap;
        GUI.Label(new Rect(thirdX, y + 5, labelWidth, 20), labelZ, smallStyle);
        GUI.SetNextControlName($"EditorInput{controlPrefix}Z");
        zValue = GUI.TextField(new Rect(thirdX + labelWidth, y, inputWidth, 28), zValue);

        y += 38f;
    }

    private List<RuntimeArtwork> GetVisibleArtworks()
    {
        List<RuntimeArtwork> result = new List<RuntimeArtwork>();

        foreach (RuntimeArtwork item in runtimeArtworks)
        {
            if (item == null || item.payload == null)
            {
                continue;
            }

            if (currentFilter == ArtworkListFilter.Positioned && !item.IsPositioned)
            {
                continue;
            }

            if (currentFilter == ArtworkListFilter.Unpositioned && item.IsPositioned)
            {
                continue;
            }

            result.Add(item);
        }

        return result;
    }

    private RuntimeArtwork GetRuntimeArtwork(ArtworkFrameSelectable selectable)
    {
        if (!selectable)
        {
            return null;
        }

        foreach (RuntimeArtwork item in runtimeArtworks)
        {
            if (item != null && item.selectable == selectable)
            {
                return item;
            }
        }

        return null;
    }

    private void ApplySelectedArtworkVisualSettings(bool markDirty)
    {
        if (!selectedArtwork || !selectedArtwork.ArtworkFrame || selectedArtwork.Payload == null)
        {
            return;
        }

        RuntimeArtwork runtime = GetRuntimeArtwork(selectedArtwork);
        ApplyVisualSettingsToPayloadAndFrame(
            selectedArtwork.Payload,
            selectedArtwork.ArtworkFrame,
            runtime != null ? runtime.thumbnailTexture : null
        );

        selectedArtwork.RefreshCollider();

        if (markDirty)
        {
            MarkDirty(selectedArtwork.Payload.galleryArtworkId);
        }

        statusMessage = "Dimensioni/cornice applicate localmente.";
    }

    private void ApplyVisualSettingsToPayloadAndFrame(
        ArtPortalArtworkPayload payload,
        ArtworkFrame frame,
        Texture imageTexture
    )
    {
        float widthCm = ParseFloat(widthInput, ResolvePositive(payload.displayWidthCm, 50f));
        float heightCm = ParseFloat(heightInput, ResolvePositive(payload.displayHeightCm, 50f));
        float frameWidthCm = frameEnabledInput ? ParseFloat(frameWidthInput, 0f) : 0f;
        float frameDepthCm = ParseFloat(frameDepthInput, 2f);

        widthCm = Mathf.Max(1f, widthCm);
        heightCm = Mathf.Max(1f, heightCm);
        frameWidthCm = Mathf.Max(0f, frameWidthCm);
        frameDepthCm = Mathf.Max(0f, frameDepthCm);

        string color = NormalizeColor(frameColorInput);

        payload.displayWidthCm = widthCm;
        payload.displayHeightCm = heightCm;
        payload.frameEnabled = frameEnabledInput;
        payload.frameColor = color;
        payload.frameWidthCm = frameWidthCm;
        payload.frameDepthCm = frameDepthCm;

        frame.ConfigureFromCentimeters(
            widthCm,
            heightCm,
            frameEnabledInput,
            color,
            frameWidthCm,
            frameDepthCm,
            imageTexture
        );
    }

    private void ApplyVisualSettingsToFrame(
        ArtworkFrame frame,
        ArtPortalArtworkPayload payload,
        Texture imageTexture
    )
    {
        frame.ConfigureFromCentimeters(
            ResolvePositive(payload.displayWidthCm, 50f),
            ResolvePositive(payload.displayHeightCm, 50f),
            payload.frameEnabled,
            string.IsNullOrWhiteSpace(payload.frameColor) ? "#000000" : payload.frameColor,
            payload.frameEnabled ? Mathf.Max(0f, payload.frameWidthCm) : 0f,
            ResolveNonNegative(payload.frameDepthCm, 2f),
            imageTexture
        );
    }

    private void ApplyAdvancedTransformInputs(bool markDirty)
    {
        if (!selectedArtwork || selectedArtwork.Payload == null)
        {
            return;
        }

        if (!CanUseAdvancedMode())
        {
            statusMessage = "Modalità avanzata disponibile dal piano Pro.";
            return;
        }

        Transform target = selectedArtwork.transform;

        Vector3 fallbackPosition = target.position;
        Vector3 fallbackRotation = target.rotation.eulerAngles;
        Vector3 fallbackScale = target.localScale;

        Vector3 nextPosition = new Vector3(
            ParseFloat(positionXInput, fallbackPosition.x),
            ParseFloat(positionYInput, fallbackPosition.y),
            ParseFloat(positionZInput, fallbackPosition.z)
        );

        Vector3 nextRotation = new Vector3(
            ParseFloat(rotationXInput, fallbackRotation.x),
            ParseFloat(rotationYInput, fallbackRotation.y),
            ParseFloat(rotationZInput, fallbackRotation.z)
        );

        Vector3 nextScale = new Vector3(
            Mathf.Max(0.01f, ParseFloat(scaleXInput, fallbackScale.x)),
            Mathf.Max(0.01f, ParseFloat(scaleYInput, fallbackScale.y)),
            Mathf.Max(0.01f, ParseFloat(scaleZInput, fallbackScale.z))
        );

        target.position = nextPosition;
        target.rotation = Quaternion.Euler(nextRotation);
        target.localScale = nextScale;

        CopyTransformToPayload(target, selectedArtwork.Payload);
        selectedArtwork.RefreshCollider();
        SyncAdvancedInputsFromSelectedTransform();

        if (markDirty)
        {
            MarkDirty(selectedArtwork.Payload.galleryArtworkId);
        }

        statusMessage = "Trasformazione avanzata applicata localmente.";
    }

    private void SyncAdvancedInputsFromSelectedTransform()
    {
        if (!selectedArtwork)
        {
            return;
        }

        Transform target = selectedArtwork.transform;
        Vector3 position = target.position;
        Vector3 rotation = target.rotation.eulerAngles;
        Vector3 scale = target.localScale;

        positionXInput = FormatFloat(position.x);
        positionYInput = FormatFloat(position.y);
        positionZInput = FormatFloat(position.z);

        rotationXInput = FormatFloat(NormalizeEuler(rotation.x));
        rotationYInput = FormatFloat(NormalizeEuler(rotation.y));
        rotationZInput = FormatFloat(NormalizeEuler(rotation.z));

        scaleXInput = FormatFloat(scale.x);
        scaleYInput = FormatFloat(scale.y);
        scaleZInput = FormatFloat(scale.z);
    }

    private void CopyTransformToPayload(Transform source, ArtPortalArtworkPayload payload)
    {
        if (!source || payload == null)
        {
            return;
        }

        Vector3 euler = source.rotation.eulerAngles;

        payload.positionX = source.position.x;
        payload.positionY = source.position.y;
        payload.positionZ = source.position.z;

        payload.rotationX = euler.x;
        payload.rotationY = euler.y;
        payload.rotationZ = euler.z;

        payload.scaleX = source.localScale.x;
        payload.scaleY = source.localScale.y;
        payload.scaleZ = source.localScale.z;
    }

    private void PlaceRuntimeArtworkOnSurface(RuntimeArtwork runtime, WallSurfaceHit surface, bool markDirty)
    {
        if (runtime == null || runtime.selectable == null || runtime.payload == null)
        {
            return;
        }

        ArtPortalArtworkPayload payload = runtime.payload;

        float widthCm = ResolvePositive(payload.displayWidthCm, 50f);
        float heightCm = ResolvePositive(payload.displayHeightCm, 50f);
        float frameWidthCm = payload.frameEnabled ? Mathf.Max(0f, payload.frameWidthCm) : 0f;
        float frameDepthCm = ResolveNonNegative(payload.frameDepthCm, 2f);

        WallPlacementData data = WallPlacementUtility.PlaceTransformOnSurface(
            runtime.selectable.transform,
            surface,
            widthCm,
            heightCm,
            frameWidthCm,
            frameDepthCm,
            surfaceOffsetMeters,
            false
        );

        runtime.selectable.transform.localScale = Vector3.one;
        payload.wallKey = data.surfaceKey;

        CopyTransformToPayload(runtime.selectable.transform, payload);

        if (markDirty)
        {
            MarkDirty(payload.galleryArtworkId);
        }
    }

    private void ScaleSelectedArtwork(float factor)
    {
        if (!selectedArtwork || selectedArtwork.Payload == null)
        {
            return;
        }

        ArtPortalArtworkPayload payload = selectedArtwork.Payload;

        float width = ResolvePositive(payload.displayWidthCm, 50f) * factor;
        float height = ResolvePositive(payload.displayHeightCm, 50f) * factor;

        widthInput = Mathf.Max(1f, width).ToString("0.##", CultureInfo.InvariantCulture);
        heightInput = Mathf.Max(1f, height).ToString("0.##", CultureInfo.InvariantCulture);

        ApplySelectedArtworkVisualSettings(true);
    }

    private void RemoveSelectedArtworkFromWall()
    {
        if (!selectedArtwork || selectedArtwork.Payload == null)
        {
            return;
        }

        RuntimeArtwork runtime = GetRuntimeArtwork(selectedArtwork);

        selectedArtwork.Payload.wallKey = "";

        int index = runtimeArtworks.IndexOf(runtime);
        MoveTransformToStaging(selectedArtwork.transform, Mathf.Max(0, index));
        CopyTransformToPayload(selectedArtwork.transform, selectedArtwork.Payload);
        SyncAdvancedInputsFromSelectedTransform();

        MarkDirty(selectedArtwork.Payload.galleryArtworkId);
        statusMessage = "Opera rimossa dalla parete. Modifiche non salvate.";
    }

    private void MoveTransformToStaging(Transform target, int index)
    {
        int columns = Mathf.Max(1, stagingColumns);
        int column = index % columns;
        int row = index / columns;

        Vector3 position = stagingStartPosition
            + Vector3.right * (column * stagingHorizontalSpacing)
            + Vector3.down * (row * stagingVerticalSpacing);

        target.position = position;
        target.rotation = Quaternion.Euler(stagingEulerRotation);
        target.localScale = Vector3.one;
    }

    private void MarkDirty(string galleryArtworkId)
    {
        if (string.IsNullOrWhiteSpace(galleryArtworkId))
        {
            return;
        }

        dirtyGalleryArtworkIds.Add(galleryArtworkId);
        lastDirtyTime = Time.time;

        if (enableAutosave)
        {
            autosaveStatusMessage = "Autosave in attesa...";
            autosaveStatusUntil = Time.time + autosaveDelaySeconds;
        }
    }

    public void SaveSelectedArtwork()
    {
        if (!selectedArtwork || selectedArtwork.Payload == null || isSaving || isSavingAll || isAutosaving)
        {
            return;
        }

        ApplySelectedArtworkVisualSettings(false);

        if (currentInspectorTab == InspectorModeTab.Advanced && CanUseAdvancedMode())
        {
            ApplyAdvancedTransformInputs(false);
        }
        else
        {
            CopyTransformToPayload(selectedArtwork.transform, selectedArtwork.Payload);
        }

        StartCoroutine(SaveArtworkCoroutine(selectedArtwork, true));
    }

    public void SaveAllDirtyArtworks()
    {
        if (isSaving || isSavingAll || isAutosaving || dirtyGalleryArtworkIds.Count <= 0)
        {
            return;
        }

        StartCoroutine(SaveAllDirtyArtworksCoroutine());
    }

    private void HandleAutosave()
    {
        if (!CanAutosaveNow())
        {
            return;
        }

        lastAutosaveTime = Time.time;
        StartCoroutine(SaveAllDirtyArtworksAutosaveCoroutine());
    }

    private bool CanAutosaveNow()
    {
        if (!enableAutosave)
        {
            return false;
        }

        if (mode != "editor")
        {
            return false;
        }

        if (dirtyGalleryArtworkIds.Count <= 0)
        {
            return false;
        }

        if (isLoading || isSaving || isSavingAll || isAutosaving)
        {
            return false;
        }

        if (autosaveOnlyWhenNotDragging && isDraggingArtwork)
        {
            return false;
        }

        if (IsEditorTextInputFocused())
        {
            return false;
        }

        if (Time.time - lastDirtyTime < Mathf.Max(0.5f, autosaveDelaySeconds))
        {
            return false;
        }

        if (Time.time - lastAutosaveTime < Mathf.Max(1f, autosaveIntervalSeconds))
        {
            return false;
        }

        return true;
    }

    private IEnumerator SaveAllDirtyArtworksAutosaveCoroutine()
    {
        isAutosaving = true;
        saveAllCurrent = 0;
        saveAllTotal = dirtyGalleryArtworkIds.Count;

        autosaveStatusMessage = "Autosalvataggio...";
        autosaveStatusUntil = Time.time + 3f;
        statusMessage = $"Autosalvataggio di {saveAllTotal} opere...";

        List<ArtworkFrameSelectable> artworksToSave = new List<ArtworkFrameSelectable>();

        foreach (string dirtyId in dirtyGalleryArtworkIds)
        {
            ArtworkFrameSelectable selectable = FindSelectableByGalleryArtworkId(dirtyId);

            if (selectable)
            {
                artworksToSave.Add(selectable);
            }
        }

        saveAllTotal = artworksToSave.Count;

        if (saveAllTotal <= 0)
        {
            dirtyGalleryArtworkIds.Clear();
            isAutosaving = false;
            saveAllCurrent = 0;
            saveAllTotal = 0;
            autosaveStatusMessage = "Nessuna modifica da autosalvare.";
            autosaveStatusUntil = Time.time + 3f;
            statusMessage = "Nessuna opera da autosalvare.";
            yield break;
        }

        int dirtyCountBefore = dirtyGalleryArtworkIds.Count;

        for (int i = 0; i < artworksToSave.Count; i++)
        {
            saveAllCurrent = i + 1;

            ArtworkFrameSelectable artwork = artworksToSave[i];

            if (!artwork || artwork.Payload == null)
            {
                continue;
            }

            statusMessage = $"Autosalvataggio {saveAllCurrent}/{saveAllTotal}: {artwork.Payload.title}";
            yield return SaveArtworkCoroutine(artwork, false);
        }

        isAutosaving = false;
        saveAllCurrent = 0;
        saveAllTotal = 0;

        if (dirtyGalleryArtworkIds.Count <= 0)
        {
            autosaveStatusMessage = "Salvato automaticamente.";
            autosaveStatusUntil = Time.time + 4f;
            statusMessage = "Tutte le modifiche sono state salvate automaticamente.";
        }
        else if (dirtyGalleryArtworkIds.Count < dirtyCountBefore)
        {
            autosaveStatusMessage = "Autosave parziale.";
            autosaveStatusUntil = Time.time + 4f;
            statusMessage = $"Autosave parziale: restano {dirtyGalleryArtworkIds.Count} modifiche non salvate.";
        }
        else
        {
            autosaveStatusMessage = "Errore autosalvataggio.";
            autosaveStatusUntil = Time.time + 5f;
            statusMessage = $"Errore autosalvataggio: restano {dirtyGalleryArtworkIds.Count} modifiche non salvate.";
        }
    }

    private IEnumerator SaveAllDirtyArtworksCoroutine()
    {
        isSavingAll = true;
        saveAllCurrent = 0;
        saveAllTotal = dirtyGalleryArtworkIds.Count;

        statusMessage = $"Salvataggio di {saveAllTotal} opere...";

        List<ArtworkFrameSelectable> artworksToSave = new List<ArtworkFrameSelectable>();

        foreach (string dirtyId in dirtyGalleryArtworkIds)
        {
            ArtworkFrameSelectable selectable = FindSelectableByGalleryArtworkId(dirtyId);

            if (selectable)
            {
                artworksToSave.Add(selectable);
            }
        }

        saveAllTotal = artworksToSave.Count;

        if (saveAllTotal <= 0)
        {
            dirtyGalleryArtworkIds.Clear();
            isSavingAll = false;
            saveAllCurrent = 0;
            saveAllTotal = 0;
            statusMessage = "Nessuna opera da salvare.";
            yield break;
        }

        for (int i = 0; i < artworksToSave.Count; i++)
        {
            saveAllCurrent = i + 1;

            ArtworkFrameSelectable artwork = artworksToSave[i];

            if (!artwork || artwork.Payload == null)
            {
                continue;
            }

            statusMessage = $"Salvataggio {saveAllCurrent}/{saveAllTotal}: {artwork.Payload.title}";
            yield return SaveArtworkCoroutine(artwork, false);
        }

        isSavingAll = false;
        saveAllCurrent = 0;
        saveAllTotal = 0;

        if (dirtyGalleryArtworkIds.Count <= 0)
        {
            statusMessage = "Tutte le modifiche sono state salvate.";
        }
        else
        {
            statusMessage = $"Salvataggio completato, ma restano {dirtyGalleryArtworkIds.Count} modifiche non salvate.";
        }
    }

    private ArtworkFrameSelectable FindSelectableByGalleryArtworkId(string galleryArtworkId)
    {
        if (string.IsNullOrWhiteSpace(galleryArtworkId))
        {
            return null;
        }

        foreach (RuntimeArtwork runtime in runtimeArtworks)
        {
            if (runtime == null || runtime.payload == null || runtime.selectable == null)
            {
                continue;
            }

            if (runtime.payload.galleryArtworkId == galleryArtworkId)
            {
                return runtime.selectable;
            }
        }

        return null;
    }

    private IEnumerator SaveArtworkCoroutine(ArtworkFrameSelectable artwork, bool showDetailedStatus)
    {
        if (!artwork || artwork.Payload == null)
        {
            yield break;
        }

        isSaving = true;

        if (showDetailedStatus)
        {
            statusMessage = "Salvataggio opera...";
        }

        ArtPortalArtworkPayload payload = artwork.Payload;
        Transform target = artwork.transform;
        CopyTransformToPayload(target, payload);

        Vector3 euler = target.rotation.eulerAngles;

        ArtPortalTransformSavePayload savePayload = new ArtPortalTransformSavePayload
        {
            galleryArtworkId = payload.galleryArtworkId,
            artworkId = payload.artworkId,

            positionX = target.position.x,
            positionY = target.position.y,
            positionZ = target.position.z,

            rotationX = euler.x,
            rotationY = euler.y,
            rotationZ = euler.z,

            scaleX = target.localScale.x,
            scaleY = target.localScale.y,
            scaleZ = target.localScale.z,

            wallKey = payload.wallKey,

            displayWidthCm = ResolvePositive(payload.displayWidthCm, 50f),
            displayHeightCm = ResolvePositive(payload.displayHeightCm, 50f),

            frameEnabled = payload.frameEnabled,
            frameColor = NormalizeColor(payload.frameColor),
            frameWidthCm = payload.frameEnabled ? Mathf.Max(0f, payload.frameWidthCm) : 0f,
            frameDepthCm = ResolveNonNegative(payload.frameDepthCm, 2f)
        };

        string json = JsonUtility.ToJson(savePayload);

        string url = $"{transformApiBaseUrl}/{payload.galleryArtworkId}/transform";

        if (logDebug)
        {
            Debug.Log("[SimpleUnityGalleryEditor] PATCH " + url);
            Debug.Log("[SimpleUnityGalleryEditor] BODY " + json);
        }

        byte[] bodyRaw = Encoding.UTF8.GetBytes(json);

        UnityWebRequest request = new UnityWebRequest(url, "PATCH");
        request.uploadHandler = new UploadHandlerRaw(bodyRaw);
        request.downloadHandler = new DownloadHandlerBuffer();
        request.SetRequestHeader("Content-Type", "application/json");

        if (!string.IsNullOrWhiteSpace(localDevToken))
        {
            request.SetRequestHeader("x-artportal-dev-token", localDevToken);
        }

        yield return request.SendWebRequest();

        if (request.result != UnityWebRequest.Result.Success)
        {
            statusMessage = "Errore salvataggio: " + request.error;
            Debug.LogError("[SimpleUnityGalleryEditor] " + request.downloadHandler.text);
            isSaving = false;
            yield break;
        }

        dirtyGalleryArtworkIds.Remove(payload.galleryArtworkId);

        if (showDetailedStatus)
        {
            statusMessage = "Opera salvata correttamente.";
        }

        isSaving = false;
    }

    private void OpenVisitorPreview()
    {
        string url = BuildVisitorFrameUrl();

        if (string.IsNullOrWhiteSpace(url))
        {
            statusMessage = "Impossibile aprire anteprima visitor: URL non valido.";
            return;
        }

        Application.OpenURL(url);
        statusMessage = "Anteprima visitor aperta in una nuova scheda.";
    }

    private void OpenDashboardGalleryDetail()
    {
        string siteBaseUrl = CleanSiteBaseUrlFromApiBaseUrl(apiBaseUrl);
        string safeGalleryId = CleanGalleryId(galleryId);

        if (string.IsNullOrWhiteSpace(siteBaseUrl) || string.IsNullOrWhiteSpace(safeGalleryId))
        {
            statusMessage = "Impossibile uscire: dati galleria mancanti.";
            return;
        }

        Application.OpenURL($"{siteBaseUrl}/dashboard/gallerie/{EncodeUrl(safeGalleryId)}");
    }

    private string BuildVisitorFrameUrl()
    {
        string siteBaseUrl = CleanSiteBaseUrlFromApiBaseUrl(apiBaseUrl);
        string safeGalleryId = CleanGalleryId(galleryId);

        if (string.IsNullOrWhiteSpace(siteBaseUrl) || string.IsNullOrWhiteSpace(safeGalleryId))
        {
            return "";
        }

        return $"{siteBaseUrl}/unity-frame?galleryId={EncodeUrl(safeGalleryId)}&mode=visitor";
    }

    private string CleanSiteBaseUrlFromApiBaseUrl(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "";
        }

        string cleaned = value.Trim();

        while (cleaned.EndsWith("/"))
        {
            cleaned = cleaned.Substring(0, cleaned.Length - 1);
        }

        string[] apiSuffixes =
        {
            "/api/unity/galleries",
            "/api/unity/gallery-artworks"
        };

        foreach (string suffix in apiSuffixes)
        {
            int index = cleaned.IndexOf(suffix);

            if (index >= 0)
            {
                return cleaned.Substring(0, index);
            }
        }

        return cleaned;
    }

    private string EncodeUrl(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "";
        }

        return System.Uri.EscapeDataString(value);
    }

    private bool IsEditorTextInputFocused()
    {
        string focusedControl = GUI.GetNameOfFocusedControl();

        return !string.IsNullOrWhiteSpace(focusedControl) &&
               focusedControl.StartsWith("EditorInput");
    }

    private void UpdateWalkerInputStateFromGuiFocus()
    {
        if (!SimpleDesktopWalker.Instance)
        {
            return;
        }

        bool textInputFocused = IsEditorTextInputFocused();

        SimpleDesktopWalker.Instance.SetInputEnabled(!textInputFocused);

        if (textInputFocused)
        {
            SimpleDesktopWalker.Instance.ForceCursorFree();
        }
    }

    private void ForceEditorCursorFree()
    {
        Cursor.lockState = CursorLockMode.None;
        Cursor.visible = true;
    }

    private bool CanUseAdvancedMode()
    {
        if (galleryPayload == null || galleryPayload.editorPermissions == null)
        {
            return false;
        }

        return galleryPayload.editorPermissions.canUseAdvancedMode;
    }

    private string GetEditorPermissionLabel()
    {
        if (galleryPayload == null || galleryPayload.editorPermissions == null)
        {
            return "Permessi editor non caricati";
        }

        ArtPortalEditorPermissionsPayload permissions = galleryPayload.editorPermissions;

        string plan = string.IsNullOrWhiteSpace(permissions.plan)
            ? "free"
            : permissions.plan;

        string role = string.IsNullOrWhiteSpace(permissions.role)
            ? "user"
            : permissions.role;

        string advanced = permissions.canUseAdvancedMode
            ? "Avanzata attiva"
            : "Avanzata bloccata";

        if (permissions.isLocalDev)
        {
            return $"Local dev · {advanced}";
        }

        return $"Piano {plan} · Ruolo {role} · {advanced}";
    }

    private float ParseFloat(string value, float fallback)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return fallback;
        }

        string normalized = value.Replace(",", ".").Trim();

        if (
            float.TryParse(
                normalized,
                NumberStyles.Float,
                CultureInfo.InvariantCulture,
                out float result
            )
        )
        {
            return result;
        }

        return fallback;
    }

    private float ResolvePositive(float value, float fallback)
    {
        return value > 0f ? value : fallback;
    }

    private float ResolveNonNegative(float value, float fallback)
    {
        return value >= 0f ? value : fallback;
    }

    private string FormatFloat(float value)
    {
        return value.ToString("0.###", CultureInfo.InvariantCulture);
    }

    private float NormalizeEuler(float value)
    {
        if (value > 180f)
        {
            value -= 360f;
        }

        return value;
    }

    private string NormalizeColor(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "#000000";
        }

        string cleaned = value.Trim();

        if (ColorUtility.TryParseHtmlString(cleaned, out _))
        {
            return cleaned;
        }

        return "#000000";
    }

    private string CleanName(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "Artwork";
        }

        foreach (char invalid in System.IO.Path.GetInvalidFileNameChars())
        {
            value = value.Replace(invalid, '_');
        }

        return value.Replace(" ", "_");
    }

    private void ForceEditorRuntimeMode()
    {
        if (mode != "editor")
        {
            return;
        }

        ForceEditorCursorFree();

        if (SimpleDesktopWalker.Instance)
        {
            SimpleDesktopWalker.Instance.SetEditorMode(true);
            SimpleDesktopWalker.Instance.SetInputEnabled(true);
        }

        if (wallSelectionManager)
        {
            wallSelectionManager.SetEditorMode(true);
        }
    }

    private string CleanMode(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "visitor";
        }

        string cleaned = value.Trim().ToLowerInvariant();

        return cleaned == "editor" ? "editor" : "visitor";
    }

    private string CleanBaseUrl(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "http://localhost:3000/api/unity/galleries";
        }

        string cleaned = value.Trim();

        while (cleaned.EndsWith("/"))
        {
            cleaned = cleaned.Substring(0, cleaned.Length - 1);
        }

        int queryIndex = cleaned.IndexOf("?");

        if (queryIndex >= 0)
        {
            cleaned = cleaned.Substring(0, queryIndex);
        }

        return cleaned;
    }

    private string CleanGalleryId(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "";
        }

        string cleaned = value.Trim();

        // Se per errore viene incollato un URL intero, teniamo solo l'ultima parte.
        if (cleaned.StartsWith("http://") || cleaned.StartsWith("https://"))
        {
            try
            {
                System.Uri uri = new System.Uri(cleaned);
                string path = uri.AbsolutePath.Trim('/');
                string[] parts = path.Split('/');

                if (parts.Length > 0)
                {
                    cleaned = parts[parts.Length - 1];
                }
            }
            catch
            {
                // Se non riesce a parsare, continuiamo con la pulizia semplice.
            }
        }

        int queryIndex = cleaned.IndexOf("?");

        if (queryIndex >= 0)
        {
            cleaned = cleaned.Substring(0, queryIndex);
        }

        int slashIndex = cleaned.LastIndexOf("/");

        if (slashIndex >= 0)
        {
            cleaned = cleaned.Substring(slashIndex + 1);
        }

        return cleaned.Trim();
    }
}