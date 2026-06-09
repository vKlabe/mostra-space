using UnityEngine;

namespace ArtPortal
{
    public class ArtworkSelectionManager : MonoBehaviour
    {
        public static ArtworkSelectionManager Instance { get; private set; }

        [Header("UI")]
        [SerializeField] private ArtworkInfoPanel artworkInfoPanel;

        [Header("Camera Controls")]
        [SerializeField] private bool disableWalkerControlsWhenSelectingArtwork = true;
        [SerializeField] private bool reEnableWalkerControlsOnClose = true;

        private ArtworkFrameView currentSelectedArtwork;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Debug.LogWarning("[ArtPortal] Esiste già un ArtworkSelectionManager. Distruggo il duplicato.");
                Destroy(gameObject);
                return;
            }

            Instance = this;
        }

        public void SelectArtwork(ArtworkFrameView artworkFrameView)
        {
            if (artworkFrameView == null)
            {
                Debug.LogWarning("[ArtPortal] SelectArtwork chiamato con artworkFrameView null.");
                return;
            }

            currentSelectedArtwork = artworkFrameView;

            if (disableWalkerControlsWhenSelectingArtwork && SimpleDesktopWalker.Instance != null)
            {
                SimpleDesktopWalker.Instance.DisableControlsForUI();
            }
            else
            {
                Cursor.lockState = CursorLockMode.None;
                Cursor.visible = true;
            }

            if (artworkInfoPanel == null)
            {
                Debug.LogWarning("[ArtPortal] ArtworkSelectionManager: manca ArtworkInfoPanel.");
                return;
            }

            artworkInfoPanel.Show(artworkFrameView.Data);

            Debug.Log($"[ArtPortal] Opera selezionata: {artworkFrameView.Data.title}");
        }

        public void ClearSelection()
        {
            currentSelectedArtwork = null;

            if (artworkInfoPanel != null)
            {
                artworkInfoPanel.Hide();
            }

            if (reEnableWalkerControlsOnClose && SimpleDesktopWalker.Instance != null)
            {
                SimpleDesktopWalker.Instance.EnableControls();
            }
        }
    }
}