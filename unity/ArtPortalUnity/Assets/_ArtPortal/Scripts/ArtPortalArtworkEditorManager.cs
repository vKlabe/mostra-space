using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace ArtPortal
{
    public class ArtPortalArtworkEditorManager : MonoBehaviour
    {
        public static ArtPortalArtworkEditorManager Instance { get; private set; }

        [Header("UI")]
        [SerializeField] private Text editorText;

        [Header("API Save")]
        [SerializeField] private ArtPortalArtworkTransformApiClient transformApiClient;
        [SerializeField] private bool sendToServerWhenPressingP = true;

        [Header("Movement")]
        [SerializeField] private float moveStep = 0.05f;
        [SerializeField] private float depthStep = 0.05f;
        [SerializeField] private float rotationStep = 2.5f;
        [SerializeField] private float scaleStep = 0.025f;
        [SerializeField] private float shiftMultiplier = 4f;

        [Header("Keys")]
        [SerializeField] private KeyCode moveLeftKey = KeyCode.J;
        [SerializeField] private KeyCode moveRightKey = KeyCode.L;
        [SerializeField] private KeyCode moveUpKey = KeyCode.I;
        [SerializeField] private KeyCode moveDownKey = KeyCode.K;

        [SerializeField] private KeyCode moveForwardKey = KeyCode.O;
        [SerializeField] private KeyCode moveBackwardKey = KeyCode.U;

        [SerializeField] private KeyCode rotateLeftKey = KeyCode.Q;
        [SerializeField] private KeyCode rotateRightKey = KeyCode.E;

        [SerializeField] private KeyCode scaleUpKey = KeyCode.Equals;
        [SerializeField] private KeyCode scaleDownKey = KeyCode.Minus;

        [SerializeField] private KeyCode saveDraftKey = KeyCode.P;
        [SerializeField] private KeyCode dumpDraftsKey = KeyCode.Alpha0;
        [SerializeField] private KeyCode deselectKey = KeyCode.Escape;

        private readonly Dictionary<string, ArtPortalArtworkTransformDraft> drafts =
            new Dictionary<string, ArtPortalArtworkTransformDraft>();

        private ArtworkFrameView selectedArtwork;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Debug.LogWarning("[ArtPortal] Esiste già un ArtPortalArtworkEditorManager. Distruggo duplicato.");
                Destroy(gameObject);
                return;
            }

            if (transformApiClient == null)
            {
                transformApiClient = FindFirstObjectByType<ArtPortalArtworkTransformApiClient>();
            }

            Instance = this;
        }

        private void Update()
        {
            if (!IsEditorMode())
            {
                if (selectedArtwork != null)
                {
                    DeselectArtwork(reEnableWalkerControls: true);
                }

                RefreshEditorText("Editor non attivo. Premi 2 per entrare in modalità editor.");
                return;
            }

            if (selectedArtwork == null)
            {
                RefreshEditorText(
                    "EDITOR MODE\n" +
                    "Clicca un'opera per selezionarla.\n" +
                    "WASD/mouse: navigazione camera.\n" +
                    "Quando selezioni un'opera, la camera si blocca."
                );
                return;
            }

            HandleSelectedArtworkInput();
            RefreshSelectedArtworkText();
        }

        public void SelectArtwork(ArtworkFrameView artwork)
        {
            if (artwork == null)
            {
                return;
            }

            if (!IsEditorMode())
            {
                Debug.Log("[ArtPortal] SelectArtwork ignorato: non siamo in editor mode.");
                return;
            }

            if (selectedArtwork != null)
            {
                selectedArtwork.SetSelected(false);
            }

            selectedArtwork = artwork;
            selectedArtwork.SetSelected(true);

            if (SimpleDesktopWalker.Instance != null)
            {
                SimpleDesktopWalker.Instance.DisableControlsForUI();
            }

            Cursor.lockState = CursorLockMode.None;
            Cursor.visible = true;

            Debug.Log(
                $"[ArtPortal] Editor: opera selezionata: " +
                $"{selectedArtwork.Data.title} | GalleryArtworkId: {selectedArtwork.Data.galleryArtworkId}"
            );
        }

        public void DeselectArtwork(bool reEnableWalkerControls)
        {
            if (selectedArtwork != null)
            {
                selectedArtwork.SetSelected(false);
            }

            selectedArtwork = null;

            if (reEnableWalkerControls && SimpleDesktopWalker.Instance != null)
            {
                SimpleDesktopWalker.Instance.EnableControls();
            }

            Debug.Log("[ArtPortal] Editor: selezione opera annullata.");
        }

        private void HandleSelectedArtworkInput()
        {
            float multiplier = IsShiftPressed() ? shiftMultiplier : 1f;

            Vector3 position = selectedArtwork.transform.position;
            Vector3 rotation = selectedArtwork.transform.rotation.eulerAngles;
            Vector3 scale = selectedArtwork.transform.localScale;

            bool changed = false;

            if (Input.GetKey(moveLeftKey))
            {
                position.x -= moveStep * multiplier;
                changed = true;
            }

            if (Input.GetKey(moveRightKey))
            {
                position.x += moveStep * multiplier;
                changed = true;
            }

            if (Input.GetKey(moveUpKey))
            {
                position.y += moveStep * multiplier;
                changed = true;
            }

            if (Input.GetKey(moveDownKey))
            {
                position.y -= moveStep * multiplier;
                changed = true;
            }

            if (Input.GetKey(moveForwardKey))
            {
                position.z += depthStep * multiplier;
                changed = true;
            }

            if (Input.GetKey(moveBackwardKey))
            {
                position.z -= depthStep * multiplier;
                changed = true;
            }

            if (Input.GetKey(rotateLeftKey))
            {
                rotation.y -= rotationStep * multiplier;
                changed = true;
            }

            if (Input.GetKey(rotateRightKey))
            {
                rotation.y += rotationStep * multiplier;
                changed = true;
            }

            if (Input.GetKey(scaleUpKey))
            {
                scale += Vector3.one * scaleStep * multiplier;
                changed = true;
            }

            if (Input.GetKey(scaleDownKey))
            {
                scale -= Vector3.one * scaleStep * multiplier;
                scale.x = Mathf.Max(0.1f, scale.x);
                scale.y = Mathf.Max(0.1f, scale.y);
                scale.z = Mathf.Max(0.1f, scale.z);
                changed = true;
            }

            if (changed)
            {
                selectedArtwork.transform.position = position;
                selectedArtwork.transform.rotation = Quaternion.Euler(rotation);
                selectedArtwork.transform.localScale = scale;
                selectedArtwork.RefreshOriginalScale();
            }

            if (Input.GetKeyDown(saveDraftKey))
            {
                SaveDraftForSelectedArtwork();
            }

            if (Input.GetKeyDown(dumpDraftsKey))
            {
                DumpAllDrafts();
            }

            if (Input.GetKeyDown(deselectKey))
            {
                DeselectArtwork(reEnableWalkerControls: true);
            }
        }

        private void SaveDraftForSelectedArtwork()
        {
            if (selectedArtwork == null)
            {
                return;
            }

            ArtPortalArtworkTransformDraft draft =
                ArtPortalArtworkTransformDraft.FromArtworkFrame(selectedArtwork);

            string key = string.IsNullOrWhiteSpace(draft.galleryArtworkId)
                ? draft.artworkId
                : draft.galleryArtworkId;

            drafts[key] = draft;

            Debug.Log(
                "[ArtPortal] DRAFT transform salvato localmente:\n" +
                JsonUtility.ToJson(draft, prettyPrint: true)
            );

            if (sendToServerWhenPressingP)
            {
                if (transformApiClient != null)
                {
                    transformApiClient.SaveTransform(draft);
                }
                else
                {
                    Debug.LogWarning("[ArtPortal] Nessun ArtPortalArtworkTransformApiClient trovato in scena.");
                }
            }
        }

        private void DumpAllDrafts()
        {
            Debug.Log($"[ArtPortal] Draft transform totali: {drafts.Count}");

            foreach (KeyValuePair<string, ArtPortalArtworkTransformDraft> item in drafts)
            {
                Debug.Log(
                    $"[ArtPortal] Draft key: {item.Key}\n" +
                    JsonUtility.ToJson(item.Value, prettyPrint: true)
                );
            }
        }

        private bool IsEditorMode()
        {
            return ArtPortalRuntimeContext.Instance != null &&
                   ArtPortalRuntimeContext.Instance.IsEditorMode();
        }

        private bool IsShiftPressed()
        {
            return Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift);
        }

        private void RefreshSelectedArtworkText()
        {
            if (selectedArtwork == null)
            {
                return;
            }

            Transform target = selectedArtwork.transform;
            Vector3 position = target.position;
            Vector3 rotation = target.rotation.eulerAngles;
            Vector3 scale = target.localScale;

            RefreshEditorText(
                "EDITOR MODE\n" +
                $"Opera selezionata: {selectedArtwork.Data.title}\n" +
                $"GalleryArtworkId: {selectedArtwork.Data.galleryArtworkId}\n\n" +
                "Comandi:\n" +
                "J/L = sinistra/destra\n" +
                "I/K = su/giù\n" +
                "U/O = profondità Z\n" +
                "Q/E = rotazione Y\n" +
                "+/- = scala\n" +
                "SHIFT = movimento veloce\n" +
                "P = salva draft locale\n" +
                "0 = stampa tutti i draft\n" +
                "ESC = deseleziona\n\n" +
                $"Position: {position.x:F2}, {position.y:F2}, {position.z:F2}\n" +
                $"Rotation: {rotation.x:F2}, {rotation.y:F2}, {rotation.z:F2}\n" +
                $"Scale: {scale.x:F2}, {scale.y:F2}, {scale.z:F2}"
            );
        }

        private void RefreshEditorText(string value)
        {
            if (editorText != null)
            {
                editorText.text = value;
            }
        }
    }
}