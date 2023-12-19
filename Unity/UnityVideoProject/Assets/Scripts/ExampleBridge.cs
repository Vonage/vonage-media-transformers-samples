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
    private static extern void initInputBuffersCS(UInt32 rgb_size, UInt32 augmented_size);

    [DllImport("__Internal")]
    private static extern void initOutputBufferCS(UInt32 size);

    [DllImport("__Internal")]
    private static extern void getInputBufferCS(UInt32[] outBuffer, byte[] outAugmentedBuffer);

    [DllImport("__Internal")]
    private static extern int getInputRotationCS();

    [DllImport("__Internal")]
    private static extern void setOutputRotationCS(UInt32 rotation);

    [DllImport("__Internal")]
    private static extern void setInputWidthCS(UInt32 width);

    [DllImport("__Internal")]
    private static extern void setInputHeightCS(UInt32 height);

    [DllImport("__Internal")]
    private static extern void setOutputWidthCS(UInt32 width);

    [DllImport("__Internal")]
    private static extern void setOutputHeightCS(UInt32 height);

    [DllImport("__Internal")]
    private static extern void setOutputBufferDataCS(UInt32[] bufferData);

    [DllImport("__Internal")]
    private static extern bool isNewBufferDataAvailable();

#endif

    const int inputWidth = 640;
    const int inputHeight = 480;

    const int outputWidth = 640;
    const int outputHeight = 480;
    const int outputRotation = 90;

    private const int inputNumTexturePixels = inputWidth * inputHeight;
    private const int inputNumAugmentedBytes = inputWidth * inputHeight * 2;
    private const int outputNumTexturePixels = outputWidth * outputHeight;

    UInt32[] inputArray = new UInt32[inputNumTexturePixels];
    byte[] inputAugmentedArray = new byte[inputNumAugmentedBytes];
    UInt32[] outputArray = new UInt32[outputNumTexturePixels];

    private Texture2D texture, texture2;
    private RawImage img;
    private Color32[] texturePixels;

    Rect rect;

    private void Start()
    {
#if UNITY_WEBGL
        SetUnityData(inputArray, inputArray.Length, outputArray, outputArray.Length, width, height);
#else
        setInputWidthCS(inputWidth);
        setInputHeightCS(inputHeight);
        setOutputWidthCS(outputWidth);
        setOutputHeightCS(outputHeight);

        initInputBuffersCS(inputNumTexturePixels, inputNumAugmentedBytes);
        initOutputBufferCS(outputNumTexturePixels);
#endif
        img = myPlane.GetComponent<RawImage>();
        texture = new Texture2D(inputWidth, inputHeight, TextureFormat.RGBA32, false)
        {
            wrapMode = TextureWrapMode.Clamp,
            filterMode = FilterMode.Point,
            anisoLevel = 1
        };

        texturePixels = new Color32[inputNumTexturePixels];

        texture2 = new Texture2D(outputWidth, outputHeight, TextureFormat.RGBA32, false);
        rect = new Rect(0, 0, outputWidth, outputHeight);
    }

    public void SetTexture()
    {
        try
        {
#if !UNITY_WEBGL
            int rotation = getInputRotationCS();
            getInputBufferCS(inputArray, inputAugmentedArray);
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

            texture.SetPixels32(0, 0, inputWidth, inputHeight, texturePixels, 0);
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
        setOutputRotationCS(outputRotation);
        setOutputBufferDataCS(outputArray);
#endif
    }

    IEnumerator WaitAndCopyOutputArray()
    {
        yield return new WaitForEndOfFrame();
        CopyOutputArray();
    }
}
