using UnityEngine;
using UnityEngine.UI;

namespace ArtPortal
{
    public class ArtworkInfoPanel : MonoBehaviour
    {
        [Header("Root")]
        [SerializeField] private GameObject panelRoot;

        [Header("Texts")]
        [SerializeField] private Text titleText;
        [SerializeField] private Text artistYearText;
        [SerializeField] private Text techniqueText;
        [SerializeField] private Text dimensionsText;
        [SerializeField] private Text priceText;
        [SerializeField] private Text descriptionText;
        [SerializeField] private Text imageUrlText;

        [Header("Buttons")]
        [SerializeField] private Button closeButton;

        [Header("Options")]
        [SerializeField] private bool notifySelectionManagerOnClose = true;

        private void Awake()
        {
            if (closeButton != null)
            {
                closeButton.onClick.AddListener(HandleCloseButtonClicked);
            }

            Hide();
        }

        public void Show(ArtworkData data)
        {
            if (data == null)
            {
                Debug.LogWarning("[ArtPortal] ArtworkInfoPanel.Show chiamato con data null.");
                return;
            }

            if (panelRoot != null)
            {
                panelRoot.SetActive(true);
            }

            SetText(titleText, string.IsNullOrWhiteSpace(data.title) ? "Opera senza titolo" : data.title);

            string artist = string.IsNullOrWhiteSpace(data.artistName) ? "Artista non indicato" : data.artistName;
            string year = string.IsNullOrWhiteSpace(data.year) ? "Anno non indicato" : data.year;
            SetText(artistYearText, $"{artist}, {year}");

            SetText(techniqueText, $"Tecnica: {Fallback(data.technique)}");
            SetText(dimensionsText, $"Dimensioni: {Fallback(data.dimensions)}");

            string price = Fallback(data.price);
            string currency = string.IsNullOrWhiteSpace(data.currency) ? "" : $" {data.currency}";
            SetText(priceText, $"Prezzo: {price}{currency}");

            SetText(descriptionText, Fallback(data.description));
            SetText(imageUrlText, $"Image URL: {Fallback(data.imageUrl)}");

            Debug.Log($"[ArtPortal] Scheda opera aperta: {data.title}");
        }

        public void Hide()
        {
            if (panelRoot != null)
            {
                panelRoot.SetActive(false);
            }
        }

        private void HandleCloseButtonClicked()
        {
            Hide();

            if (notifySelectionManagerOnClose && ArtworkSelectionManager.Instance != null)
            {
                ArtworkSelectionManager.Instance.ClearSelection();
            }
        }

        private void SetText(Text target, string value)
        {
            if (target != null)
            {
                target.text = value;
            }
        }

        private string Fallback(string value)
        {
            return string.IsNullOrWhiteSpace(value) ? "N/D" : value;
        }
    }
}