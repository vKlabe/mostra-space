using System;
using UnityEngine;

namespace ArtPortal
{
    [Serializable]
    public class ArtworkData
    {
        [Header("Identity")]
        public string galleryArtworkId;
        public string artworkId;
        public string title;
        public string artistName;
        public string year;

        [Header("Technical Data")]
        public string technique;
        public string dimensions;
        public string price;
        public string currency;

        [Header("Content")]
        [TextArea(3, 8)]
        public string description;

        [Header("Image")]
        public string imageUrl;
    }
}