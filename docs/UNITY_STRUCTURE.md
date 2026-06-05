# Unity Structure — ArtPortalImmersivo

## Versione Unity

Unity 6000.3.12f1

## Render Pipeline

URP — Universal Render Pipeline

Motivo:

- più leggera di HDRP;
- adatta a WebGL;
- più sostenibile per browser e smartphone;
- coerente con un MVP web-first.

## Scene iniziali

### basic_room

Percorso:

Assets/_ArtPortal/Scenes/basic_room.unity

Funzione:

Prima stanza template del portale.

Corrisponde nel database a:

gallery_templates.unity_scene_key = basic_room

## Struttura cartelle

Assets/_ArtPortal/

- Scenes
- Scripts
- Prefabs
- Materials
- Textures
- Models
- UI
- Resources
- StreamingAssets

## Oggetti principali scena basic_room

- ArtPortal_Bootstrap
- BasicRoom_Root
  - Floor
  - Wall_Front
  - Wall_Back
  - Wall_Left
  - Wall_Right
  - Ceiling
- Main Camera
- Directional Light
- Room_PointLight

## Script iniziali

### ArtPortalBootstrap.cs

Log tecnico iniziale della scena.

### SimpleDesktopWalker.cs

Movimento provvisorio desktop con WASD e mouse look.

## Nota

Il database resta la fonte della verità.

Unity deve leggere dati dal backend e visualizzarli.
Unity non deve contenere chiavi segrete Supabase.

## Fase 12 — ArtworkFrame

È stato creato il prefab:

Assets/_ArtPortal/Prefabs/ArtworkFrame.prefab

Struttura prefab:

- ArtworkFrame
  - Frame_Backboard
  - Artwork_Surface

Componenti principali:

- BoxCollider
- ArtworkFrameView

Script aggiunti:

### ArtworkData.cs

Classe dati serializzabile che rappresenta una opera.

Campi principali:

- artworkId
- title
- artistName
- year
- technique
- dimensions
- price
- currency
- description
- imageUrl

### ArtworkFrameView.cs

Gestisce:

- dati opera;
- texture immagine;
- click sull’opera;
- hover provvisorio.

### ArtworkFrameDemoSpawner.cs

Spawner demo che crea 3 opere sulla parete frontale della scena `basic_room`.

Nota:

Le texture sono generate localmente in Unity.  
Nelle prossime fasi saranno scaricate dagli URL pubblici salvati in Supabase Storage.

## Fase 14 — Web Bridge e Runtime Context

È stato aggiunto il primo sistema di comunicazione tra Web e Unity.

### ArtPortalRuntimeContext.cs

Mantiene lo stato runtime globale:

- galleryId
- runtimeMode
- hasReceivedExternalConfig

La modalità può essere:

- Visitor
- Editor

### ArtPortalWebBridge.cs

Riceve dati dal JavaScript della pagina WebGL.

Metodo principale futuro:

```csharp
ConfigureFromJson(string json)

## Fase 15 — Gallery JSON Loader

È stato aggiunto il caricamento locale da JSON.

File demo:

Assets/StreamingAssets/ArtPortal/demo-gallery.json

Script aggiunti:

### ArtPortalGalleryPayload.cs

Definisce il formato dati letto da Unity:

- galleryId
- slug
- title
- description
- status
- unitySceneKey
- mode
- artworks

Ogni artwork contiene:

- galleryArtworkId
- artworkId
- title
- artistName
- year
- technique
- dimensions
- price
- currency
- description
- imageUrl
- positionX / positionY / positionZ
- rotationX / rotationY / rotationZ
- scaleX / scaleY / scaleZ
- wallKey
- sortOrder

### ArtPortalGalleryJsonLoader.cs

Legge il JSON da StreamingAssets, configura il RuntimeContext e istanzia prefab ArtworkFrame nella scena.

Il vecchio `ArtworkFrameDemoSpawner` è stato disattivato perché ora le opere arrivano da dati JSON.

Questa fase prepara il passaggio successivo:

Supabase / Next.js API → JSON → Unity WebGL.

## Fase 18 — Runtime Context API Loader

Il loader Unity è stato collegato al RuntimeContext.

Flusso:

1. ArtPortalWebBridge riceve galleryId e mode da JavaScript.
2. ArtPortalRuntimeContext salva galleryId e runtimeMode.
3. ArtPortalGalleryJsonLoader ascolta OnContextChanged.
4. Il loader costruisce l’URL API:

http://localhost:3000/api/unity/galleries/[galleryId]?mode=[visitor/editor]

5. Unity scarica il JSON e genera le opere.

Nel test editor, `ArtPortalEditorSimulationInput` simula la configurazione:

- tasto 1 = carica galleria reale in visitor mode
- tasto 2 = carica galleria reale in editor mode

Il vecchio Remote Fixed Url resta solo come modalità di test.


## Fase 19 — Artwork Editor Mode

È stato aggiunto il primo sistema editor per le opere.

Script aggiunti:

### ArtPortalArtworkTransformDraft.cs

Rappresenta un aggiornamento locale dei valori transform di una riga `gallery_artworks`:

- galleryArtworkId
- artworkId
- positionX/Y/Z
- rotationX/Y/Z
- scaleX/Y/Z

### ArtPortalArtworkEditorManager.cs

Gestisce la modalità editor:

- selezione opera
- evidenziazione cornice
- blocco camera durante selezione
- movimento con tastiera
- rotazione
- scala
- salvataggio draft locale
- stampa JSON in Console

Comandi editor:

- J/L = sinistra/destra
- I/K = su/giù
- U/O = profondità Z
- Q/E = rotazione Y
- +/- = scala
- SHIFT = movimento veloce
- P = salva draft locale
- 0 = stampa tutti i draft
- ESC = deseleziona

### ArtworkFrameView.cs

Aggiornato per distinguere:

- Visitor mode: click apre scheda opera
- Editor mode: click seleziona l’opera nell’editor

## Fase 20 — Salvataggio transform su Supabase

È stato aggiunto il salvataggio reale della posizione opere.

Endpoint Next.js:

PATCH /api/unity/gallery-artworks/[galleryArtworkId]/transform

Unity invia:

- galleryArtworkId
- artworkId
- positionX/Y/Z
- rotationX/Y/Z
- scaleX/Y/Z

Script Unity aggiunto:

### ArtPortalArtworkTransformApiClient.cs

Invia una richiesta PATCH al portale per aggiornare la riga `gallery_artworks`.

In sviluppo locale usa:

x-artportal-dev-token

Il token deve combaciare con:

ARTPORTAL_UNITY_DEV_TOKEN

Nel file `.env.local` del progetto web.

In produzione il dev token non va usato.