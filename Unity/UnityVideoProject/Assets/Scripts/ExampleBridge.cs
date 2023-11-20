using System.Collections;
using UnityEngine;
using System.Runtime.InteropServices;
using UnityEngine.UI;
using System;

public class ExampleBridge : MonoBehaviour
{

    public GameObject myPlane;
    
    public RenderTexture src_render_texture;

    public GameObject panelRenderer;

#if UNITY_WEBGL
    [DllImport("__Internal")]
    private static extern void SetUnityData(UInt32[] inputArray, int inputSize, UInt32[] outputArray, int outputSize, int width, int height);
#else

    [DllImport("__Internal")]
    private static extern void initInputBufferCS(UInt32 size);

    [DllImport("__Internal")]
    private static extern void initOutputBufferCS(UInt32 size);

    [DllImport("__Internal")]
    private static extern void getInputBufferCS(UInt32[] outBuffer);

    [DllImport("__Internal")]
    private static extern int getRotationCS();

    [DllImport("__Internal")]
    private static extern void setInputBufferDataCS(UInt32[] bufferData);

    [DllImport("__Internal")]
    private static extern void setOutputBufferDataCS(UInt32[] bufferData);

    [DllImport("__Internal")]
    private static extern bool isNewBufferDataAvailable();

#endif



    const int width = 640;
    const int height = 480;

    private const int numTexturePixels = width * height;

    UInt32[] inputArray = new UInt32[numTexturePixels];
    UInt32[] outputArray = new UInt32[numTexturePixels];


    private Texture2D texture, texture2;
    private RawImage img;
    private Color32[] texturePixels;

    Rect rect;

    private void Start()
    {
#if UNITY_WEBGL
        SetUnityData(inputArray, inputArray.Length, outputArray, outputArray.Length, width, height);
#else
        initInputBufferCS(numTexturePixels);
        initOutputBufferCS(numTexturePixels);
#endif
        img = myPlane.GetComponent<RawImage>();
        texture = new Texture2D(width, height, TextureFormat.RGBA32, false)
        {
            wrapMode = TextureWrapMode.Clamp,
            filterMode = FilterMode.Point,
            anisoLevel = 1
        };

        texturePixels = new Color32[numTexturePixels];

        texture2 = new Texture2D(width, height, TextureFormat.RGBA32, false);
        rect = new Rect(0, 0, width, height);
    }

    public void SetTexture()
    {
        try
        {
#if !UNITY_WEBGL
            int rotation = getRotationCS();
            getInputBufferCS(inputArray);
#endif
            for (int i = 0; i < inputArray.Length; i++)
            {
                texturePixels[i].a = (byte)((inputArray[i] >> 24) & 0xFF);
                texturePixels[i].r = (byte)((inputArray[i] >> 16) & 0xFF);
                texturePixels[i].g = (byte)((inputArray[i] >> 8) & 0xFF);
                texturePixels[i].b = (byte)((inputArray[i]) & 0xFF);
            }

            if(rotation == 90){
                System.Array.Reverse(texturePixels, 0, texturePixels.Length);
            }

            texture.SetPixels32(0, 0, width, height, texturePixels, 0);
            texture.Apply();
            img.texture = texture;

            StartCoroutine(WaitAndCopyOutputArray());
        }
        catch (Exception ex)
        {
            Debug.LogError(ex.Message);
        }
    }

    void CopyOutputArray()
    {
        RenderTexture.active = src_render_texture;
        texture2.ReadPixels(rect, 0, 0);
        texture2.Apply();
        RenderTexture.active = null;
        Color32[] pixels = texture2.GetPixels32(0);
        Array.Reverse(pixels, 0, pixels.Length);
        for (int i = 0; i < outputArray.Length; i++)
        {
            outputArray[i] = BitConverter.ToUInt32(new byte[] { pixels[i].b, pixels[i].g, pixels[i].r, pixels[i].a }, 0);
        }

#if !UNITY_WEBGL
        setOutputBufferDataCS(outputArray);
#endif
    }

    IEnumerator WaitAndCopyOutputArray()
    {
        yield return new WaitForEndOfFrame();
        CopyOutputArray();
    }
}
