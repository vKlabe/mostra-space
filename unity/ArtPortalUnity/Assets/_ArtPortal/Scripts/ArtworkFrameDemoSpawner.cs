using UnityEngine;

namespace ArtPortal
{
    public class ArtworkFrameDemoSpawner : MonoBehaviour
    {
        [Header("Prefab")]
        [SerializeField] private ArtworkFrameView artworkFramePrefab;

        [Header("Spawn Parent")]
        [SerializeField] private Transform spawnParent;

        [Header("Placement")]
        [SerializeField] private float wallZ = 3.85f;
        [SerializeField] private float artworkY = 1.8f;
        [SerializeField] private float spacing = 2.1f;

        private void Start()
        {
            if (artworkFramePrefab == null)
            {
                Debug.LogError("[ArtPortal] ArtworkFrameDemoSpawner: manca artworkFramePrefab.");
                return;
            }

            SpawnDemoArtworks();
        }

        private void SpawnDemoArtworks()
        {
            SpawnOne(
                index: 0,
                position: new Vector3(-spacing, artworkY, wallZ),
                title: "Opera Demo 01",
                artist: "Artista Test",
                year: "2026",
                colorA: new Color(0.90f, 0.25f, 0.20f),
                colorB: new Color(0.15f, 0.10f, 0.08f)
            );

            SpawnOne(
                index: 1,
                position: new Vector3(0f, artworkY, wallZ),
                title: "Opera Demo 02",
                artist: "Galleria Demo",
                year: "2025",
                colorA: new Color(0.20f, 0.45f, 0.95f),
                colorB: new Color(0.05f, 0.08f, 0.18f)
            );

            SpawnOne(
                index: 2,
                position: new Vector3(spacing, artworkY, wallZ),
                title: "Opera Demo 03",
                artist: "Archivio Test",
                year: "2024",
                colorA: new Color(0.95f, 0.78f, 0.20f),
                colorB: new Color(0.10f, 0.10f, 0.10f)
            );
        }

        private void SpawnOne(
            int index,
            Vector3 position,
            string title,
            string artist,
            string year,
            Color colorA,
            Color colorB
        )
        {
            ArtworkFrameView instance = Instantiate(
                artworkFramePrefab,
                position,
                Quaternion.Euler(0f, 180f, 0f),
                spawnParent
            );

            instance.name = $"ArtworkFrame_Demo_{index + 1:00}";

            ArtworkData data = new ArtworkData
            {
                artworkId = $"demo-artwork-{index + 1:00}",
                title = title,
                artistName = artist,
                year = year,
                technique = "Texture generata in Unity",
                dimensions = "Demo",
                price = "N/D",
                currency = "EUR",
                description = "Opera demo generata localmente per testare il prefab ArtworkFrame.",
                imageUrl = "local-demo-texture"
            };

            Texture2D texture = CreateDemoTexture(512, 512, colorA, colorB);

            instance.SetArtwork(data, texture);
        }

        private Texture2D CreateDemoTexture(int width, int height, Color colorA, Color colorB)
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
                        gradient = Color.Lerp(gradient, Color.white, 0.18f);
                    }

                    texture.SetPixel(x, y, gradient);
                }
            }

            texture.Apply();

            texture.name = "Generated_Demo_Artwork_Texture";

            return texture;
        }
    }
}
