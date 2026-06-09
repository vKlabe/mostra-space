using UnityEngine;

namespace ArtPortal
{
    [DisallowMultipleComponent]
    [RequireComponent(typeof(CharacterController))]
    public class SimpleDesktopWalker : MonoBehaviour
    {
        public static SimpleDesktopWalker Instance { get; private set; }

        [Header("Mode")]
        [SerializeField] private string mode = "visitor";
        [SerializeField] private bool editorMode = false;

        [Header("References")]
        [SerializeField] private Camera targetCamera;

        [Header("Visitor Movement")]
        [SerializeField] private float walkSpeed = 2.4f;
        [SerializeField] private float runSpeed = 4.2f;
        [SerializeField] private float mouseSensitivity = 1.6f;
        [SerializeField] private float minPitch = -75.0f;
        [SerializeField] private float maxPitch = 75.0f;

        [Header("Editor Keyboard Movement")]
        [SerializeField] private float editorMoveSpeed = 3.5f;
        [SerializeField] private float editorVerticalSpeed = 2.5f;
        [SerializeField] private float editorTurnSpeed = 95.0f;

        [Header("Character Controller")]
        [SerializeField] private bool autoConfigureCharacterController = true;
        [SerializeField] private float capsuleHeight = 1.75f;
        [SerializeField] private float capsuleRadius = 0.28f;
        [SerializeField] private float eyeHeight = 1.65f;
        [SerializeField] private float stepOffset = 0.35f;
        [SerializeField] private float slopeLimit = 48.0f;
        [SerializeField] private float skinWidth = 0.04f;
        [SerializeField] private bool useGravity = true;
        [SerializeField] private float gravity = -18.0f;
        [SerializeField] private float groundedStickForce = -2.0f;

        [Header("Visitor UI")]
        [SerializeField] private bool showCrosshair = true;
        [SerializeField] private bool showHelpHint = true;
        [SerializeField] private bool showHelpMenuOnStart = false;

        [Header("Debug")]
        [SerializeField] private bool logDebug = true;

        private CharacterController characterController;
        private Texture2D whiteTexture;

        private float yaw;
        private float pitch;
        private float verticalVelocity;

        private bool controlsEnabled = true;
        private bool inputEnabled = true;
        private bool mouseLookActive = false;
        private bool helpMenuOpen = false;

        private bool IsEditorMode => editorMode || CleanMode(mode) == "editor";
        private bool IsVisitorMode => !IsEditorMode;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Debug.LogWarning("[ArtPortal] Esiste già un SimpleDesktopWalker. Distruggo il duplicato.");
                Destroy(gameObject);
                return;
            }

            Instance = this;

            if (!targetCamera)
            {
                targetCamera = Camera.main;
            }

            if (!targetCamera)
            {
                targetCamera = GetComponentInChildren<Camera>();
            }

            characterController = GetComponent<CharacterController>();

            if (autoConfigureCharacterController)
            {
                ConfigureCharacterController();
            }
        }

        private void Start()
        {
            mode = CleanMode(mode);
            editorMode = mode == "editor";

            Transform lookTransform = targetCamera ? targetCamera.transform : transform;

            Vector3 euler = lookTransform.rotation.eulerAngles;
            yaw = euler.y;
            pitch = NormalizePitch(euler.x);

            helpMenuOpen = showHelpMenuOnStart && IsVisitorMode;

            ApplyCursorState();

            if (logDebug)
            {
                Debug.Log($"[ArtPortal] SimpleDesktopWalker pronto. Mode: {mode} | EditorMode: {editorMode}");
            }
        }

        private void Update()
        {
            mode = CleanMode(mode);
            editorMode = mode == "editor";

            if (IsEditorMode)
            {
                HandleEditorMode();
                return;
            }

            HandleVisitorMode();
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }

        public void SetModeFromString(string nextMode)
        {
            mode = CleanMode(nextMode);
            editorMode = mode == "editor";

            mouseLookActive = false;
            helpMenuOpen = false;
            verticalVelocity = 0f;

            ApplyCursorState();

            if (logDebug)
            {
                Debug.Log($"[ArtPortal] SimpleDesktopWalker mode aggiornato: {mode}");
            }
        }

        public void SetEditorMode(bool active)
        {
            editorMode = active;
            mode = active ? "editor" : "visitor";

            mouseLookActive = false;
            helpMenuOpen = false;
            verticalVelocity = 0f;

            ApplyCursorState();

            if (logDebug)
            {
                Debug.Log($"[ArtPortal] SimpleDesktopWalker editorMode: {editorMode}");
            }
        }

        public void SetInputEnabled(bool enabled)
        {
            inputEnabled = enabled;

            if (!inputEnabled)
            {
                mouseLookActive = false;
                ForceCursorFree();
            }
        }

        public void EnableControls()
        {
            controlsEnabled = true;
            inputEnabled = true;

            mouseLookActive = false;
            helpMenuOpen = false;

            ForceCursorFree();

            if (logDebug)
            {
                Debug.Log("[ArtPortal] Controlli camera riattivati. Clicca nel viewer per riprendere la visita.");
            }
        }

        public void DisableControlsForUI()
        {
            controlsEnabled = false;
            inputEnabled = false;
            mouseLookActive = false;
            helpMenuOpen = false;

            ForceCursorFree();

            if (logDebug)
            {
                Debug.Log("[ArtPortal] Controlli camera disattivati per interazione UI.");
            }
        }

        public void DisableMouseLookOnly()
        {
            mouseLookActive = false;
            ForceCursorFree();

            if (logDebug)
            {
                Debug.Log("[ArtPortal] Mouse look disattivato.");
            }
        }

        public void ForceCursorFree()
        {
            Cursor.lockState = CursorLockMode.None;
            Cursor.visible = true;
        }

        private void HandleEditorMode()
        {
            ForceCursorFree();

            if (!controlsEnabled || !inputEnabled)
            {
                return;
            }

            HandleEditorKeyboardLook();
            HandleEditorKeyboardMove();
        }

        private void HandleVisitorMode()
        {
            if (!controlsEnabled || !inputEnabled)
            {
                mouseLookActive = false;
                ForceCursorFree();
                return;
            }

            if (Input.GetKeyDown(KeyCode.Space))
            {
                ToggleHelpMenu();
            }

            if (helpMenuOpen)
            {
                ForceCursorFree();

                if (Input.GetKeyDown(KeyCode.Escape))
                {
                    CloseHelpMenu();
                }

                return;
            }

            if (Input.GetKeyDown(KeyCode.Escape))
            {
                mouseLookActive = false;
                ForceCursorFree();
                return;
            }

            if (!mouseLookActive && Input.GetMouseButtonDown(0))
            {
                ActivateMouseLook();
            }

            if (mouseLookActive)
            {
                HandleMouseLook();
            }

            HandleVisitorMovement();
        }

        private void HandleEditorKeyboardLook()
        {
            float turnInput = 0f;

            if (Input.GetKey(KeyCode.Q))
            {
                turnInput -= 1f;
            }

            if (Input.GetKey(KeyCode.E))
            {
                turnInput += 1f;
            }

            if (Mathf.Abs(turnInput) > 0.01f)
            {
                yaw += turnInput * editorTurnSpeed * Time.deltaTime;
                ApplyLookRotation();
            }
        }

        private void HandleEditorKeyboardMove()
        {
            Vector3 move = GetPlanarMoveInput();

            float vertical = 0f;

            if (Input.GetKey(KeyCode.R))
            {
                vertical += 1f;
            }

            if (Input.GetKey(KeyCode.F))
            {
                vertical -= 1f;
            }

            move *= editorMoveSpeed;
            move += Vector3.up * (vertical * editorVerticalSpeed);

            MoveCharacter(move * Time.deltaTime);
        }

        private void HandleVisitorMovement()
        {
            Vector3 move = GetPlanarMoveInput();

            float speed = Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift)
                ? runSpeed
                : walkSpeed;

            move *= speed;

            if (useGravity)
            {
                if (characterController.isGrounded && verticalVelocity < 0f)
                {
                    verticalVelocity = groundedStickForce;
                }
                else
                {
                    verticalVelocity += gravity * Time.deltaTime;
                }

                move.y = verticalVelocity;
            }
            else
            {
                verticalVelocity = 0f;
                move.y = 0f;
            }

            MoveCharacter(move * Time.deltaTime);
        }

        private Vector3 GetPlanarMoveInput()
        {
            Vector3 input = Vector3.zero;

            if (Input.GetKey(KeyCode.W))
            {
                input += GetFlatForward();
            }

            if (Input.GetKey(KeyCode.S))
            {
                input -= GetFlatForward();
            }

            if (Input.GetKey(KeyCode.D))
            {
                input += GetFlatRight();
            }

            if (Input.GetKey(KeyCode.A))
            {
                input -= GetFlatRight();
            }

            input.y = 0f;

            if (input.sqrMagnitude > 1f)
            {
                input.Normalize();
            }

            return input;
        }

        private void MoveCharacter(Vector3 delta)
        {
            if (!characterController)
            {
                transform.position += delta;
                return;
            }

            characterController.Move(delta);
        }

        private void ActivateMouseLook()
        {
            mouseLookActive = true;
            Cursor.lockState = CursorLockMode.Locked;
            Cursor.visible = false;
        }

        private void HandleMouseLook()
        {
            float mouseX = Input.GetAxis("Mouse X") * mouseSensitivity;
            float mouseY = Input.GetAxis("Mouse Y") * mouseSensitivity;

            yaw += mouseX;
            pitch -= mouseY;
            pitch = Mathf.Clamp(pitch, minPitch, maxPitch);

            ApplyLookRotation();
        }

        private void ApplyLookRotation()
        {
            if (targetCamera && targetCamera.transform != transform)
            {
                transform.rotation = Quaternion.Euler(0f, yaw, 0f);
                targetCamera.transform.localRotation = Quaternion.Euler(pitch, 0f, 0f);
                return;
            }

            transform.rotation = Quaternion.Euler(pitch, yaw, 0f);
        }

        private Vector3 GetFlatForward()
        {
            Transform lookTransform = targetCamera ? targetCamera.transform : transform;

            Vector3 forward = lookTransform.forward;
            forward.y = 0f;

            if (forward.sqrMagnitude <= 0.0001f)
            {
                forward = transform.forward;
                forward.y = 0f;
            }

            return forward.normalized;
        }

        private Vector3 GetFlatRight()
        {
            Transform lookTransform = targetCamera ? targetCamera.transform : transform;

            Vector3 right = lookTransform.right;
            right.y = 0f;

            if (right.sqrMagnitude <= 0.0001f)
            {
                right = transform.right;
                right.y = 0f;
            }

            return right.normalized;
        }

        private void ToggleHelpMenu()
        {
            helpMenuOpen = !helpMenuOpen;
            mouseLookActive = false;

            if (helpMenuOpen)
            {
                ForceCursorFree();
            }
            else
            {
                ForceCursorFree();
            }
        }

        private void CloseHelpMenu()
        {
            helpMenuOpen = false;
            mouseLookActive = false;
            ForceCursorFree();
        }

        private void ApplyCursorState()
        {
            if (IsEditorMode)
            {
                ForceCursorFree();
                return;
            }

            if (helpMenuOpen)
            {
                ForceCursorFree();
                return;
            }

            mouseLookActive = false;
            ForceCursorFree();
        }

        private void ConfigureCharacterController()
        {
            if (!characterController)
            {
                return;
            }

            characterController.height = Mathf.Max(0.5f, capsuleHeight);
            characterController.radius = Mathf.Max(0.05f, capsuleRadius);
            characterController.stepOffset = Mathf.Clamp(stepOffset, 0f, capsuleHeight);
            characterController.slopeLimit = Mathf.Clamp(slopeLimit, 0f, 89f);
            characterController.skinWidth = Mathf.Max(0.005f, skinWidth);

            /*
             * Il tuo walker storicamente sta sul GameObject camera.
             * Quindi consideriamo transform.position come altezza occhi.
             * La capsula viene centrata sotto la camera, così la visuale resta stabile.
             */
            characterController.center = new Vector3(
                0f,
                -eyeHeight + characterController.height * 0.5f,
                0f
            );
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

        private float NormalizePitch(float value)
        {
            if (value > 180f)
            {
                value -= 360f;
            }

            return Mathf.Clamp(value, minPitch, maxPitch);
        }

        private void EnsureWhiteTexture()
        {
            if (whiteTexture)
            {
                return;
            }

            whiteTexture = new Texture2D(1, 1);
            whiteTexture.SetPixel(0, 0, Color.white);
            whiteTexture.Apply();
        }

        private void OnGUI()
        {
            if (IsVisitorMode && helpMenuOpen)
            {
                DrawHelpMenu();
                return;
            }

            /*
             * Crosshair:
             * - in visitor appare quando il mouse look è attivo
             * - in editor appare sempre come riferimento del centro camera
             *
             * Nota: in editor il click resta sotto il puntatore mouse,
             * non sotto il crosshair. Il crosshair serve solo come riferimento visivo.
             */
            if (showCrosshair && controlsEnabled && inputEnabled)
            {
                bool shouldDrawCrosshair =
                    IsEditorMode ||
                    (IsVisitorMode && mouseLookActive);

                if (shouldDrawCrosshair)
                {
                    DrawCrosshair();
                }
            }

            if (IsVisitorMode && showHelpHint && controlsEnabled && inputEnabled)
            {
                DrawHelpHint();
            }
        }

        private void DrawCrosshair()
        {
            EnsureWhiteTexture();

            /*
             * Crosshair minimal:
             * piccolo quadratino bianco al centro schermo.
             */
            float size = 6f;
            float centerX = Screen.width * 0.5f;
            float centerY = Screen.height * 0.5f;

            Rect squareRect = new Rect(
                centerX - size * 0.5f,
                centerY - size * 0.5f,
                size,
                size
            );

            GUI.color = new Color(1f, 1f, 1f, 0.9f);
            GUI.DrawTexture(squareRect, whiteTexture);
            GUI.color = Color.white;
        }

        private void DrawHelpHint()
        {
            GUIStyle style = new GUIStyle(GUI.skin.label)
            {
                alignment = TextAnchor.LowerCenter,
                fontSize = 12,
                wordWrap = true
            };

            string text = mouseLookActive
                ? "WASD muovi · Mouse guarda · Shift corri · Click opera per info · SPACE comandi · ESC libera mouse"
                : "Clicca nel viewer per entrare nella visita · SPACE comandi";

            Rect rect = new Rect(20f, Screen.height - 42f, Screen.width - 40f, 28f);

            GUI.color = new Color(1f, 1f, 1f, 0.86f);
            GUI.Label(rect, text, style);
            GUI.color = Color.white;
        }

        private void DrawHelpMenu()
        {
            float width = Mathf.Min(560f, Screen.width - 60f);
            float height = 430f;
            float x = (Screen.width - width) * 0.5f;
            float y = (Screen.height - height) * 0.5f;

            Rect panel = new Rect(x, y, width, height);

            GUI.Box(panel, "");

            GUIStyle titleStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 22,
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleLeft
            };

            GUIStyle textStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 14,
                wordWrap = true
            };

            GUIStyle smallStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 12,
                wordWrap = true
            };

            float px = x + 28f;
            float py = y + 24f;
            float contentWidth = width - 56f;

            GUI.Label(new Rect(px, py, contentWidth, 32f), "Comandi visita", titleStyle);
            py += 52f;

            GUI.Label(
                new Rect(px, py, contentWidth, 28f),
                "W / A / S / D  —  Muoviti nello spazio",
                textStyle
            );
            py += 34f;

            GUI.Label(
                new Rect(px, py, contentWidth, 28f),
                "Mouse  —  Guarda intorno quando il viewer è attivo",
                textStyle
            );
            py += 34f;

            GUI.Label(
                new Rect(px, py, contentWidth, 28f),
                "Shift  —  Cammina più velocemente",
                textStyle
            );
            py += 34f;

            GUI.Label(
                new Rect(px, py, contentWidth, 28f),
                "Click su un’opera  —  Apri la scheda dell’opera",
                textStyle
            );
            py += 34f;

            GUI.Label(
                new Rect(px, py, contentWidth, 28f),
                "ESC  —  Libera il mouse / chiudi scheda",
                textStyle
            );
            py += 34f;

            GUI.Label(
                new Rect(px, py, contentWidth, 28f),
                "SPACE  —  Apri o chiudi questo menu",
                textStyle
            );
            py += 48f;

            GUI.Label(
                new Rect(px, py, contentWidth, 60f),
                "Nota: il visitatore non può attraversare muri o oggetti con collider. Per scale e rampe, usa collider puliti: spesso una rampa invisibile sopra i gradini dà il risultato più stabile.",
                smallStyle
            );
            py += 82f;

            if (GUI.Button(new Rect(px, py, contentWidth, 36f), "Chiudi menu"))
            {
                CloseHelpMenu();
            }
        }
    }
}