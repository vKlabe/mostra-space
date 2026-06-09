using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace ArtPortal
{
    public class ArtPortalArtworkTransformApiClient : MonoBehaviour
    {
        [Header("API")]
        [SerializeField] private string apiBaseUrl = "http://localhost:3000/api/unity/gallery-artworks";

        [Header("Local Development")]
        [SerializeField] private bool useDevTokenInEditor = true;
        [SerializeField] private string devToken = "dev-local-artportal-123456789";

        [Header("Debug")]
        [SerializeField] private bool logRequestBody = true;
        [SerializeField] private bool logResponseBody = true;

        public void SaveTransform(ArtPortalArtworkTransformDraft draft)
        {
            if (draft == null)
            {
                Debug.LogWarning("[ArtPortal] SaveTransform chiamato con draft null.");
                return;
            }

            if (string.IsNullOrWhiteSpace(draft.galleryArtworkId))
            {
                Debug.LogWarning("[ArtPortal] Impossibile salvare: galleryArtworkId vuoto.");
                return;
            }

            StartCoroutine(SaveTransformCoroutine(draft));
        }

        private IEnumerator SaveTransformCoroutine(ArtPortalArtworkTransformDraft draft)
        {
            string runtimeTransformApiBaseUrl =
    ArtPortalRuntimeContext.Instance != null
        ? ArtPortalRuntimeContext.Instance.TransformApiBaseUrl
        : "";

            string effectiveBaseUrl = string.IsNullOrWhiteSpace(runtimeTransformApiBaseUrl)
                ? apiBaseUrl
                : runtimeTransformApiBaseUrl;

            string cleanBaseUrl = effectiveBaseUrl.Trim().TrimEnd('/');
            string url = $"{cleanBaseUrl}/{draft.galleryArtworkId}/transform";

            string json = JsonUtility.ToJson(draft, prettyPrint: false);

            if (logRequestBody)
            {
                Debug.Log($"[ArtPortal] PATCH transform URL: {url}\nBODY:\n{json}");
            }

            byte[] bodyRaw = Encoding.UTF8.GetBytes(json);

            using UnityWebRequest request = new UnityWebRequest(url, "PATCH");

            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();

            request.SetRequestHeader("Content-Type", "application/json");

#if UNITY_EDITOR
            if (useDevTokenInEditor && !string.IsNullOrWhiteSpace(devToken))
            {
                request.SetRequestHeader("x-artportal-dev-token", devToken);
            }
#endif

            yield return request.SendWebRequest();

            string responseText = request.downloadHandler != null
                ? request.downloadHandler.text
                : "";

            if (request.result != UnityWebRequest.Result.Success)
            {
                Debug.LogError(
                    $"[ArtPortal] Errore salvataggio transform. " +
                    $"HTTP: {request.responseCode} | Error: {request.error}\n" +
                    $"Response:\n{responseText}"
                );

                yield break;
            }

            if (logResponseBody)
            {
                Debug.Log(
                    $"[ArtPortal] Transform salvato correttamente. " +
                    $"HTTP: {request.responseCode}\nResponse:\n{responseText}"
                );
            }
        }
    }
}
