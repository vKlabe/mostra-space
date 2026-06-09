using UnityEngine;

namespace ArtPortal
{
    public class ArtPortalBootstrap : MonoBehaviour
    {
        [Header("Debug")]
        [SerializeField] private string sceneKey = "basic_room";

        private void Awake()
        {
            Debug.Log($"[ArtPortal] Bootstrap avviato. SceneKey: {sceneKey}");
            Debug.Log($"[ArtPortal] Unity Version: {Application.unityVersion}");
            Debug.Log($"[ArtPortal] Platform: {Application.platform}");
        }
    }
}
