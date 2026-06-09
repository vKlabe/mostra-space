using System;
using UnityEngine;

namespace ArtPortal
{
    [Serializable]
    public class ArtPortalArtworkTransformDraft
    {
        public string galleryArtworkId;
        public string artworkId;

        public float positionX;
        public float positionY;
        public float positionZ;

        public float rotationX;
        public float rotationY;
        public float rotationZ;

        public float scaleX;
        public float scaleY;
        public float scaleZ;

        public static ArtPortalArtworkTransformDraft FromArtworkFrame(ArtworkFrameView frame)
        {
            Transform target = frame.transform;
            Vector3 position = target.position;
            Vector3 rotation = target.rotation.eulerAngles;
            Vector3 scale = target.localScale;

            ArtworkData data = frame.Data;

            return new ArtPortalArtworkTransformDraft
            {
                galleryArtworkId = data.galleryArtworkId,
                artworkId = data.artworkId,

                positionX = position.x,
                positionY = position.y,
                positionZ = position.z,

                rotationX = rotation.x,
                rotationY = rotation.y,
                rotationZ = rotation.z,

                scaleX = scale.x,
                scaleY = scale.y,
                scaleZ = scale.z
            };
        }
    }
}
