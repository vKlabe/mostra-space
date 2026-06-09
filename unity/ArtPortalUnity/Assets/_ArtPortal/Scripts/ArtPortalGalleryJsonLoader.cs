using System.Collections;
using System.IO;
using UnityEngine;
using UnityEngine.Networking;

namespace ArtPortal
{
    public class ArtPortalGalleryJsonLoader : MonoBehaviour
    {
        private enum GalleryDataSource
        {
            StreamingAssets,
            RemoteFixedUrl,
            RuntimeContextApi
        }

        [Header("Source")]
        [SerializeField] private GalleryDataSource dataSource = GalleryDataSource.RuntimeContextApi;
        [SerializeField] private bool loadOnStart = false;
        [SerializeField] private bool loadWhenRuntimeContextChanges = true;

        [Header("StreamingAssets Source")]
        [SerializeField] private string streamingAssetsRelativePath = "ArtPortal/demo-gallery.json";

        [Header("Remote Fixed URL Source")]
        [SerializeField] private string remoteJsonUrl = "http://localhost:3000/api/unity/galleries/e08494f9-9439-416c-9706-10e00ab222cc";
        [SerializeField] private bool appendModeQueryToRemoteUrl = true;
        [SerializeField] private ArtPortalRuntimeMode remoteMode = ArtPortalRuntimeMode.Visitor;

        [Header("Runtime Context API Source")]
        [SerializeField] private string apiBaseUrl = "http://localhost:3000/api/unity/galleries";
        [SerializeField] private bool appendModeQueryToRuntimeApiUrl = true;

        [Header("Template Registry")]
        [SerializeField] private ArtPortalTemplateRegistry templateRegistry;
        [SerializeField] private bool activateTemplateFromPayload = true;
        [SerializeField] private bool continueIfTemplateNotFound = true;

        [Header("Prefab")]
        [SerializeField] private ArtworkFrameView artworkFramePrefab;

        [Header("Spawn")]
        [SerializeField] private Transform spawnParent;
        [SerializeField] private bool clearSpawnParentBeforeLoad = true;

        [Header("Runtime Context")]
        [SerializeField] private bool configureRuntimeContextFromPayload = true;

        [Header("Debug")]
        [SerializeField] private bool logJsonContent;
        [SerializeField] private string lastLoadedUrl = "";

        private Coroutine currentLoadCoroutine;

        private void Awake()
        {
            if (templateRegistry == null)
            {
                templateRegistry = FindFirstObjectByType<ArtPortalTemplateRegistry>();
            }
        }

        private void OnEnable()
        {
            TrySubscribeToRuntimeContext();
        }

        private void Start()
        {
            TrySubscribeToRuntimeContext();

            if (loadOnStart)
            {
                LoadGallery();
            }
        }

        private void OnDisable()
        {
            if (ArtPortalRuntimeContext.Instance != null)
            {
                ArtPortalRuntimeContext.Instance.OnContextChanged -= HandleRuntimeContextChanged;
            }
        }

        private void TrySubscribeToRuntimeContext()
        {
            if (ArtPortalRuntimeContext.Instance == null)
            {
                return;
            }

            ArtPortalRuntimeContext.Instance.OnContextChanged -= HandleRuntimeContextChanged;
            ArtPortalRuntimeContext.Instance.OnContextChanged += HandleRuntimeContextChanged;
        }

        private void HandleRuntimeContextChanged()
        {
            if (!loadWhenRuntimeContextChanges)
            {
                return;
            }

            if (dataSource != GalleryDataSource.RuntimeContextApi)
            {
                return;
            }

            if (ArtPortalRuntimeContext.Instance == null)
            {
                return;
            }

            string galleryId = ArtPortalRuntimeContext.Instance.GalleryId;

            if (string.IsNullOrWhiteSpace(galleryId))
            {
                Debug.Log("[ArtPortal] GalleryJsonLoader: RuntimeContext cambiato ma GalleryId vuoto. Non carico.");
                return;
            }

            LoadGalleryFromRuntimeContextApi();
        }

        public void LoadGallery()
        {
            if (dataSource == GalleryDataSource.RuntimeContextApi)
            {
                LoadGalleryFromRuntimeContextApi();
                return;
            }

            if (dataSource == GalleryDataSource.RemoteFixedUrl)
            {
                LoadGalleryFromRemoteFixedUrl();
                return;
            }

            LoadGalleryFromStreamingAssets();
        }

        public void LoadGalleryFromStreamingAssets()
        {
            string fullPath = Path.Combine(Application.streamingAssetsPath, streamingAssetsRelativePath);
            fullPath = fullPath.Replace("\\", "/");

            if (!fullPath.Contains("://"))
            {
                fullPath = "file://" + fullPath;
            }

            StartLoad(fullPath, "StreamingAssets");
        }

        public void LoadGalleryFromRemoteFixedUrl()
        {
            string finalUrl = BuildRemoteFixedUrl();
            StartLoad(finalUrl, "Remote Fixed URL");
        }

        public void LoadGalleryFromRuntimeContextApi()
        {
            string finalUrl = BuildRuntimeContextApiUrl();

            if (string.IsNullOrWhiteSpace(finalUrl))
            {
                Debug.LogWarning("[ArtPortal] RuntimeContextApi URL vuoto. Impossibile caricare.");
                return;
            }

            StartLoad(finalUrl, "Runtime Context API");
        }

        private void StartLoad(string url, string sourceLabel)
        {
            if (string.IsNullOrWhiteSpace(url))
            {
                Debug.LogWarning("[ArtPortal] StartLoad chiamato con URL vuoto.");
                return;
            }

            if (url == lastLoadedUrl && currentLoadCoroutine != null)
            {
                Debug.Log($"[ArtPortal] Caricamento già in corso per: {url}");
                return;
            }

            if (currentLoadCoroutine != null)
            {
                StopCoroutine(currentLoadCoroutine);
                currentLoadCoroutine = null;
            }

            lastLoadedUrl = url;
            currentLoadCoroutine = StartCoroutine(LoadGalleryFromUrlCoroutine(url, sourceLabel));
        }

        private string BuildRemoteFixedUrl()
        {
            string finalUrl = remoteJsonUrl.Trim();

            if (!appendModeQueryToRemoteUrl)
            {
                return finalUrl;
            }

            string modeText = remoteMode == ArtPortalRuntimeMode.Editor ? "editor" : "visitor";

            if (finalUrl.Contains("?"))
            {
                return $"{finalUrl}&mode={modeText}";
            }

            return $"{finalUrl}?mode={modeText}";
        }

        private string BuildRuntimeContextApiUrl()
        {
            if (ArtPortalRuntimeContext.Instance == null)
            {
                Debug.LogWarning("[ArtPortal] BuildRuntimeContextApiUrl: RuntimeContext mancante.");
                return "";
            }

            string galleryId = ArtPortalRuntimeContext.Instance.GalleryId;

            if (string.IsNullOrWhiteSpace(galleryId))
            {
                Debug.LogWarning("[ArtPortal] BuildRuntimeContextApiUrl: GalleryId vuoto.");
                return "";
            }

            string runtimeApiBaseUrl = ArtPortalRuntimeContext.Instance.ApiBaseUrl;

            if (string.IsNullOrWhiteSpace(runtimeApiBaseUrl))
            {
                runtimeApiBaseUrl = apiBaseUrl;
            }

            string cleanBaseUrl = runtimeApiBaseUrl.Trim().TrimEnd('/');
            string finalUrl = $"{cleanBaseUrl}/{galleryId.Trim()}";

            if (!appendModeQueryToRuntimeApiUrl)
            {
                return finalUrl;
            }

            string modeText = ArtPortalRuntimeContext.Instance.RuntimeMode == ArtPortalRuntimeMode.Editor
                ? "editor"
                : "visitor";

            return $"{finalUrl}?mode={modeText}";
        }

        private IEnumerator LoadGalleryFromUrlCoroutine(string url, string sourceLabel)
        {
            if (artworkFramePrefab == null)
            {
                Debug.LogError("[ArtPortal] GalleryJsonLoader: manca artworkFramePrefab.");
                currentLoadCoroutine = null;
                yield break;
            }

            Debug.Log($"[ArtPortal] Caricamento JSON galleria da {sourceLabel}: {url}");

            using UnityWebRequest request = UnityWebRequest.Get(url);

            yield return request.SendWebRequest();

            if (request.result != UnityWebRequest.Result.Success)
            {
                Debug.LogError(
                    $"[ArtPortal] Errore caricamento JSON da {sourceLabel}. " +
                    $"HTTP: {request.responseCode} | Error: {request.error} | URL: {url}"
                );

                if (!string.IsNullOrWhiteSpace(request.downloadHandler?.text))
                {
                    Debug.LogError($"[ArtPortal] Risposta server:\n{request.downloadHandler.text}");
                }

                currentLoadCoroutine = null;
                yield break;
            }

            string json = request.downloadHandler.text;

            if (logJsonContent)
            {
                Debug.Log($"[ArtPortal] JSON ricevuto da {sourceLabel}:\n{json}");
            }

            ArtPortalGalleryPayload payload = null;

            try
            {
                payload = JsonUtility.FromJson<ArtPortalGalleryPayload>(json);
            }
            catch (System.Exception exception)
            {
                Debug.LogError($"[ArtPortal] Errore parsing JSON: {exception.Message}");
                currentLoadCoroutine = null;
                yield break;
            }

            if (payload == null)
            {
                Debug.LogError("[ArtPortal] Payload galleria null dopo parsing JSON.");
                currentLoadCoroutine = null;
                yield break;
            }

            ApplyPayloadToRuntime(payload);

            bool templateApplied = ApplyTemplateFromPayload(payload);

            if (!templateApplied && !continueIfTemplateNotFound)
            {
                Debug.LogError("[ArtPortal] Template non applicato e continueIfTemplateNotFound=false. Stop caricamento galleria.");
                currentLoadCoroutine = null;
                yield break;
            }

            SpawnGallery(payload);

            currentLoadCoroutine = null;
        }

        private void ApplyPayloadToRuntime(ArtPortalGalleryPayload payload)
        {
            if (!configureRuntimeContextFromPayload)
            {
                return;
            }

            if (ArtPortalRuntimeContext.Instance == null)
            {
                Debug.LogWarning("[ArtPortal] GalleryJsonLoader: RuntimeContext mancante, impossibile configurare galleryId/mode.");
                return;
            }

            ArtPortalRuntimeMode parsedMode = ParseMode(payload.mode);

            bool sameGallery =
                ArtPortalRuntimeContext.Instance.GalleryId == payload.galleryId &&
                ArtPortalRuntimeContext.Instance.RuntimeMode == parsedMode;

            if (sameGallery)
            {
                return;
            }

            ArtPortalRuntimeContext.Instance.Configure(
                payload.galleryId,
                parsedMode,
                externalConfig: false
            );
        }

        private bool ApplyTemplateFromPayload(ArtPortalGalleryPayload payload)
        {
            if (!activateTemplateFromPayload)
            {
                return true;
            }

            if (templateRegistry == null)
            {
                templateRegistry = FindFirstObjectByType<ArtPortalTemplateRegistry>();
            }

            if (templateRegistry == null)
            {
                Debug.LogWarning(
                    "[ArtPortal] GalleryJsonLoader: nessun ArtPortalTemplateRegistry trovato in scena. " +
                    "Continuo con ambiente corrente."
                );

                return false;
            }

            string templateKey = string.IsNullOrWhiteSpace(payload.unitySceneKey)
                ? "basic_room"
                : payload.unitySceneKey.Trim();

            ArtPortalRuntimeMode mode = ParseMode(payload.mode);

            bool result = templateRegistry.ActivateTemplate(templateKey, mode);

            if (result)
            {
                Debug.Log($"[ArtPortal] Template applicato dal payload: {templateKey}");
            }
            else
            {
                Debug.LogWarning($"[ArtPortal] Template non applicato dal payload: {templateKey}");
            }

            return result;
        }

        private void SpawnGallery(ArtPortalGalleryPayload payload)
        {
            if (payload.artworks == null)
            {
                Debug.LogWarning("[ArtPortal] Payload senza artworks.");
                return;
            }

            if (spawnParent == null)
            {
                spawnParent = transform;
            }

            if (clearSpawnParentBeforeLoad)
            {
                ClearSpawnParent();
            }

            Debug.Log(
                $"[ArtPortal] Spawn galleria: {payload.title} | " +
                $"GalleryId: {payload.galleryId} | " +
                $"UnitySceneKey: {payload.unitySceneKey} | " +
                $"Opere: {payload.artworks.Length}"
            );

            foreach (ArtPortalGalleryArtworkPayload item in payload.artworks)
            {
                SpawnArtwork(item);
            }
        }

        private void ClearSpawnParent()
        {
            if (spawnParent == null)
            {
                return;
            }

            for (int i = spawnParent.childCount - 1; i >= 0; i--)
            {
                Transform child = spawnParent.GetChild(i);
                Destroy(child.gameObject);
            }
        }

        private void SpawnArtwork(ArtPortalGalleryArtworkPayload item)
        {
            Vector3 position = new Vector3(
                item.positionX,
                item.positionY,
                item.positionZ
            );

            Quaternion rotation = Quaternion.Euler(
                item.rotationX,
                item.rotationY,
                item.rotationZ
            );

            ArtworkFrameView instance = Instantiate(
                artworkFramePrefab,
                position,
                rotation,
                spawnParent
            );

            instance.name = $"ArtworkFrame_{SafeName(item.title)}";

            Vector3 scale = new Vector3(
                SafeScale(item.scaleX),
                SafeScale(item.scaleY),
                SafeScale(item.scaleZ)
            );

            instance.transform.localScale = scale;
            instance.RefreshOriginalScale();

            ArtworkData data = new ArtworkData
            {
                galleryArtworkId = item.galleryArtworkId,
                artworkId = item.artworkId,
                title = item.title,
                artistName = item.artistName,
                year = item.year,
                technique = item.technique,
                dimensions = item.dimensions,
                price = item.price,
                currency = item.currency,
                description = item.description,
                imageUrl = item.imageUrl
            };

            Texture2D placeholderTexture = CreateTextureFromImageUrlHint(item.imageUrl);

            instance.SetArtwork(data, placeholderTexture);

            if (IsHttpUrl(item.imageUrl))
            {
                StartCoroutine(DownloadAndApplyTexture(item.imageUrl, instance, data));
            }
        }

        private IEnumerator DownloadAndApplyTexture(
            string imageUrl,
            ArtworkFrameView target,
            ArtworkData data
        )
        {
            Debug.Log($"[ArtPortal] Download texture opera: {imageUrl}");

            using UnityWebRequest request = UnityWebRequestTexture.GetTexture(imageUrl);

            yield return request.SendWebRequest();

            if (request.result != UnityWebRequest.Result.Success)
            {
                Debug.LogWarning(
                    $"[ArtPortal] Errore download texture. " +
                    $"HTTP: {request.responseCode} | Error: {request.error} | URL: {imageUrl}"
                );

                yield break;
            }

            Texture texture = DownloadHandlerTexture.GetContent(request);

            if (texture == null)
            {
                Debug.LogWarning("[ArtPortal] Texture scaricata null.");
                yield break;
            }

            target.SetArtwork(data, texture);

            Debug.Log($"[ArtPortal] Texture applicata da URL: {data.title}");
        }

        private Texture2D CreateTextureFromImageUrlHint(string imageUrl)
        {
            Color colorA = new Color(0.85f, 0.85f, 0.85f);
            Color colorB = new Color(0.12f, 0.12f, 0.12f);

            string normalized = string.IsNullOrWhiteSpace(imageUrl)
                ? ""
                : imageUrl.Trim().ToLowerInvariant();

            if (normalized.Contains("red"))
            {
                colorA = new Color(0.90f, 0.22f, 0.18f);
                colorB = new Color(0.16f, 0.04f, 0.03f);
            }
            else if (normalized.Contains("blue"))
            {
                colorA = new Color(0.20f, 0.45f, 0.95f);
                colorB = new Color(0.03f, 0.06f, 0.16f);
            }
            else if (normalized.Contains("yellow"))
            {
                colorA = new Color(0.95f, 0.78f, 0.18f);
                colorB = new Color(0.16f, 0.12f, 0.03f);
            }
            else if (normalized.Contains("green"))
            {
                colorA = new Color(0.22f, 0.75f, 0.35f);
                colorB = new Color(0.03f, 0.14f, 0.06f);
            }

            return CreateGeneratedTexture(512, 512, colorA, colorB);
        }

        private Texture2D CreateGeneratedTexture(int width, int height, Color colorA, Color colorB)
        {
            Texture2D texture = new Texture2D(width, height, TextureFormat.RGBA32, false);

            for (int y = 0; y < height; y++)
            {
                for (int x = 0; x < width; x++)
                {
                    float horizontal = (float)x / (width - 1);
                    float vertical = (float)y / (height - 1);

                    Color gradient = Color.Lerp(colorA, colorB, horizontal);

                    bool stripe = Mathf.Sin((vertical * 24f) + (horizontal * 8f)) > 0.35f;

                    if (stripe)
                    {
                        gradient = Color.Lerp(gradient, Color.white, 0.16f);
                    }

                    texture.SetPixel(x, y, gradient);
                }
            }

            texture.Apply();
            texture.name = "Generated_API_Artwork_Texture";

            return texture;
        }

        private ArtPortalRuntimeMode ParseMode(string mode)
        {
            if (string.IsNullOrWhiteSpace(mode))
            {
                return ArtPortalRuntimeMode.Visitor;
            }

            string normalized = mode.Trim().ToLowerInvariant();

            if (normalized == "editor")
            {
                return ArtPortalRuntimeMode.Editor;
            }

            return ArtPortalRuntimeMode.Visitor;
        }

        private bool IsHttpUrl(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return false;
            }

            string normalized = value.Trim().ToLowerInvariant();

            return normalized.StartsWith("http://") || normalized.StartsWith("https://");
        }

        private float SafeScale(float value)
        {
            if (value <= 0f)
            {
                return 1f;
            }

            return value;
        }

        private string SafeName(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return "Untitled";
            }

            foreach (char invalidChar in Path.GetInvalidFileNameChars())
            {
                value = value.Replace(invalidChar, '_');
            }

            return value.Replace(" ", "_");
        }
    }
}