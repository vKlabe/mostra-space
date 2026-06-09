using UnityEngine;
using UnityEngine.UI;

namespace ArtPortal
{
    public class ArtPortalRuntimeDebugPanel : MonoBehaviour
    {
        [Header("UI")]
        [SerializeField] private Text debugText;

        [Header("Options")]
        [SerializeField] private bool refreshEveryFrame = true;

        private bool isSubscribed;

        private void Start()
        {
            TrySubscribe();
            Refresh();
        }

        private void OnEnable()
        {
            TrySubscribe();
            Refresh();
        }

        private void OnDisable()
        {
            Unsubscribe();
        }

        private void Update()
        {
            if (!isSubscribed)
            {
                TrySubscribe();
            }

            if (refreshEveryFrame)
            {
                Refresh();
            }
        }

        private void TrySubscribe()
        {
            if (isSubscribed)
            {
                return;
            }

            if (ArtPortalRuntimeContext.Instance == null)
            {
                return;
            }

            ArtPortalRuntimeContext.Instance.OnContextChanged += Refresh;
            isSubscribed = true;

            Refresh();

            Debug.Log("[ArtPortal] RuntimeDebugPanel collegato al RuntimeContext.");
        }

        private void Unsubscribe()
        {
            if (!isSubscribed)
            {
                return;
            }

            if (ArtPortalRuntimeContext.Instance != null)
            {
                ArtPortalRuntimeContext.Instance.OnContextChanged -= Refresh;
            }

            isSubscribed = false;
        }

        public void Refresh()
        {
            if (debugText == null)
            {
                return;
            }

            if (ArtPortalRuntimeContext.Instance == null)
            {
                debugText.text =
                    "ArtPortal Runtime\n" +
                    "Context: missing";
                return;
            }

            ArtPortalRuntimeContext context = ArtPortalRuntimeContext.Instance;

            debugText.text =
                "ArtPortal Runtime\n" +
                $"GalleryId: {context.GalleryId}\n" +
                $"Mode: {context.RuntimeMode}\n" +
                $"External Config: {context.HasReceivedExternalConfig}";
        }
    }
}