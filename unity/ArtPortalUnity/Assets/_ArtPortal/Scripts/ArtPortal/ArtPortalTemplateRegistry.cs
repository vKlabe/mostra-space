using System;
using UnityEngine;

namespace ArtPortal
{
    public class ArtPortalTemplateRegistry : MonoBehaviour
    {
        [Serializable]
        public class TemplateEntry
        {
            [Header("Identità template")]
            public string templateKey = "basic_room";
            public string displayName = "Basic Room";

            [Header("Root scena")]
            public GameObject templateRoot;

            [Header("Spawn opzionali")]
            public Transform visitorSpawnPoint;
            public Transform editorSpawnPoint;
        }

        [Header("Templates")]
        [SerializeField] private TemplateEntry[] templates = Array.Empty<TemplateEntry>();

        [Header("Fallback")]
        [SerializeField] private string defaultTemplateKey = "basic_room";
        [SerializeField] private bool activateDefaultOnStart = false;

        [Header("Camera opzionale")]
        [SerializeField] private bool moveCameraToTemplateSpawn = false;
        [SerializeField] private Camera targetCamera;

        [Header("Sicurezza")]
        [SerializeField] private bool skipUnsafeRoots = true;
        [SerializeField] private bool avoidReactivatingSameTemplate = true;

        [Header("Debug")]
        [SerializeField] private bool logDebug = true;

        private TemplateEntry activeTemplate;
        private string activeTemplateKey = "";
        private bool isActivating;

        public string ActiveTemplateKey => activeTemplateKey;
        public TemplateEntry ActiveTemplate => activeTemplate;

        private void Awake()
        {
            if (!targetCamera)
            {
                targetCamera = Camera.main;
            }
        }

        private void Start()
        {
            if (activateDefaultOnStart)
            {
                ActivateTemplate(defaultTemplateKey, ArtPortalRuntimeMode.Visitor);
            }
        }

        public bool ActivateTemplate(string requestedTemplateKey)
        {
            ArtPortalRuntimeMode mode = ArtPortalRuntimeMode.Visitor;

            if (ArtPortalRuntimeContext.Instance != null)
            {
                mode = ArtPortalRuntimeContext.Instance.RuntimeMode;
            }

            return ActivateTemplate(requestedTemplateKey, mode);
        }

        public bool ActivateTemplate(string requestedTemplateKey, ArtPortalRuntimeMode mode)
        {
            if (isActivating)
            {
                if (logDebug)
                {
                    Debug.LogWarning("[ArtPortalTemplateRegistry] Attivazione già in corso. Evito chiamata ricorsiva.");
                }

                return false;
            }

            string normalizedKey = NormalizeKey(requestedTemplateKey);
            string normalizedFallbackKey = NormalizeKey(defaultTemplateKey);

            if (string.IsNullOrWhiteSpace(normalizedKey))
            {
                normalizedKey = normalizedFallbackKey;
            }

            TemplateEntry selected = FindTemplate(normalizedKey);

            if (selected == null && !string.IsNullOrWhiteSpace(normalizedFallbackKey))
            {
                if (logDebug)
                {
                    Debug.LogWarning(
                        $"[ArtPortalTemplateRegistry] Template '{requestedTemplateKey}' non trovato. " +
                        $"Uso fallback '{defaultTemplateKey}'."
                    );
                }

                selected = FindTemplate(normalizedFallbackKey);
            }

            if (selected == null)
            {
                Debug.LogWarning(
                    "[ArtPortalTemplateRegistry] Nessun template valido trovato. " +
                    "Non cambio ambiente."
                );

                return false;
            }

            if (selected.templateRoot == null)
            {
                Debug.LogWarning(
                    $"[ArtPortalTemplateRegistry] Il template '{selected.templateKey}' non ha Template Root assegnato."
                );

                return false;
            }

            string selectedKey = NormalizeKey(selected.templateKey);

            if (
                avoidReactivatingSameTemplate &&
                activeTemplate == selected &&
                activeTemplateKey == selectedKey &&
                selected.templateRoot.activeSelf
            )
            {
                if (logDebug)
                {
                    Debug.Log($"[ArtPortalTemplateRegistry] Template già attivo: {selected.displayName} | key={selectedKey}");
                }

                return true;
            }

            try
            {
                isActivating = true;
                ActivateEntrySafe(selected, selectedKey, mode);
                return true;
            }
            finally
            {
                isActivating = false;
            }
        }

        public bool HasTemplate(string templateKey)
        {
            return FindTemplate(NormalizeKey(templateKey)) != null;
        }

        public Transform GetActiveSpawnPoint(ArtPortalRuntimeMode mode)
        {
            if (activeTemplate == null)
            {
                return null;
            }

            if (mode == ArtPortalRuntimeMode.Editor)
            {
                return activeTemplate.editorSpawnPoint
                    ? activeTemplate.editorSpawnPoint
                    : activeTemplate.visitorSpawnPoint;
            }

            return activeTemplate.visitorSpawnPoint
                ? activeTemplate.visitorSpawnPoint
                : activeTemplate.editorSpawnPoint;
        }

        private void ActivateEntrySafe(
            TemplateEntry selected,
            string selectedKey,
            ArtPortalRuntimeMode mode
        )
        {
            foreach (TemplateEntry entry in templates)
            {
                if (entry == null || entry.templateRoot == null)
                {
                    continue;
                }

                if (skipUnsafeRoots && IsUnsafeRoot(entry.templateRoot))
                {
                    Debug.LogWarning(
                        $"[ArtPortalTemplateRegistry] Root NON sicuro saltato: {entry.templateRoot.name}. " +
                        "Il Template Root non deve contenere ArtPortal_TemplateRegistry, WebBridge, camera o altri manager core."
                    );

                    continue;
                }

                bool shouldBeActive = entry == selected;

                if (entry.templateRoot.activeSelf != shouldBeActive)
                {
                    entry.templateRoot.SetActive(shouldBeActive);
                }
            }

            activeTemplate = selected;
            activeTemplateKey = selectedKey;

            if (logDebug)
            {
                Debug.Log(
                    $"[ArtPortalTemplateRegistry] Template attivo: " +
                    $"{selected.displayName} | key={activeTemplateKey}"
                );
            }

            if (moveCameraToTemplateSpawn)
            {
                MoveCameraToSpawn(mode);
            }
        }

        private bool IsUnsafeRoot(GameObject candidateRoot)
        {
            if (candidateRoot == null)
            {
                return true;
            }

            if (candidateRoot == gameObject)
            {
                return true;
            }

            if (transform.IsChildOf(candidateRoot.transform))
            {
                return true;
            }

            if (targetCamera && targetCamera.transform.IsChildOf(candidateRoot.transform))
            {
                return true;
            }

            ArtPortalRuntimeContext runtimeContext = FindFirstObjectByType<ArtPortalRuntimeContext>();
            if (runtimeContext && runtimeContext.transform.IsChildOf(candidateRoot.transform))
            {
                return true;
            }

            SimpleUnityGalleryEditor editor = FindFirstObjectByType<SimpleUnityGalleryEditor>();
            if (editor && editor.transform.IsChildOf(candidateRoot.transform))
            {
                return true;
            }

            ArtPortalWebBridge webBridge = FindFirstObjectByType<ArtPortalWebBridge>();
            if (webBridge && webBridge.transform.IsChildOf(candidateRoot.transform))
            {
                return true;
            }

            return false;
        }

        private void MoveCameraToSpawn(ArtPortalRuntimeMode mode)
        {
            if (!targetCamera)
            {
                targetCamera = Camera.main;
            }

            if (!targetCamera)
            {
                Debug.LogWarning("[ArtPortalTemplateRegistry] Camera non trovata. Impossibile applicare spawn.");
                return;
            }

            Transform spawnPoint = GetActiveSpawnPoint(mode);

            if (!spawnPoint)
            {
                if (logDebug)
                {
                    Debug.Log("[ArtPortalTemplateRegistry] Nessuno spawn point configurato per il template attivo.");
                }

                return;
            }

            targetCamera.transform.SetPositionAndRotation(
                spawnPoint.position,
                spawnPoint.rotation
            );

            if (logDebug)
            {
                Debug.Log(
                    $"[ArtPortalTemplateRegistry] Camera spostata su spawn {mode}: " +
                    $"{spawnPoint.position}"
                );
            }
        }

        private TemplateEntry FindTemplate(string normalizedTemplateKey)
        {
            if (string.IsNullOrWhiteSpace(normalizedTemplateKey))
            {
                return null;
            }

            foreach (TemplateEntry entry in templates)
            {
                if (entry == null)
                {
                    continue;
                }

                string entryKey = NormalizeKey(entry.templateKey);

                if (entryKey == normalizedTemplateKey)
                {
                    return entry;
                }
            }

            return null;
        }

        private string NormalizeKey(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return "";
            }

            return value.Trim().ToLowerInvariant();
        }
    }
}