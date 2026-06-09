using UnityEngine;

namespace ArtPortal
{
    public class ArtPortalEditorSimulationInput : MonoBehaviour
    {
        [Header("Demo Gallery IDs")]
        [SerializeField] private string visitorGalleryId = "e08494f9-9439-416c-9706-10e00ab222cc";
        [SerializeField] private string editorGalleryId = "e08494f9-9439-416c-9706-10e00ab222cc";

        [Header("Keys")]
        [SerializeField] private KeyCode setVisitorKey = KeyCode.Alpha1;
        [SerializeField] private KeyCode setEditorKey = KeyCode.Alpha2;

        private void Update()
        {
            if (ArtPortalRuntimeContext.Instance == null)
            {
                return;
            }

            if (Input.GetKeyDown(setVisitorKey))
            {
                ArtPortalRuntimeContext.Instance.Configure(
                    visitorGalleryId,
                    ArtPortalRuntimeMode.Visitor,
                    externalConfig: false
                );

                Debug.Log("[ArtPortal] Simulazione: caricamento galleria reale in modalità visitor.");
            }

            if (Input.GetKeyDown(setEditorKey))
            {
                ArtPortalRuntimeContext.Instance.Configure(
                    editorGalleryId,
                    ArtPortalRuntimeMode.Editor,
                    externalConfig: false
                );

                Debug.Log("[ArtPortal] Simulazione: caricamento galleria reale in modalità editor.");
            }
        }
    }
}