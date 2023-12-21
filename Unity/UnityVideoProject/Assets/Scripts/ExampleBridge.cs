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
    private static extern void getInputBufferCS(byte[] outBuffer, byte[] outAugmentedBuffer);

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
    private static extern void setOutputBufferDataCS(byte[] bufferData);

    [DllImport("__Internal")]
    private static extern bool isNewBufferDataAvailable();

#endif

    const int inputWidth = 640;
    const int inputHeight = 480;

    int outputWidth = 0;
    int outputHeight = 0;
    const int outputRotation = 90;

    private const int inputNumTexturePixels = inputWidth * inputHeight * 4;
    private const int inputNumAugmentedBytes = inputWidth * inputHeight * 2;
    private int outputNumTexturePixels = 0;

    byte[] inputArray = new byte[inputNumTexturePixels];
    byte[] inputAugmentedArray = new byte[inputNumAugmentedBytes];
    byte[] outputArray;

    private Texture2D texture, texture2;
    private RawImage img;
    Rect rect;

    private void Start()
    {
#if UNITY_WEBGL
        SetUnityData(inputArray, inputArray.Length, outputArray, outputArray.Length, width, height);
#else
        setInputWidthCS(inputWidth);
        setInputHeightCS(inputHeight);
        
        initInputBuffersCS(inputNumTexturePixels, inputNumAugmentedBytes);
        
#endif
        img = myPlane.GetComponent<RawImage>();
        texture = new Texture2D(inputWidth, inputHeight, TextureFormat.BGRA32, false)
        {
            wrapMode = TextureWrapMode.Clamp,
            filterMode = FilterMode.Point,
            anisoLevel = 1
        };
    }

    public void SetTexture()
    {
        try
        {
#if !UNITY_WEBGL
            int rotation = getInputRotationCS();
            getInputBufferCS(inputArray, inputAugmentedArray);
#endif
            texture.LoadRawTextureData(inputArray);

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
        if(outputWidth != src_render_texture.width || outputHeight != src_render_texture.height){
            outputWidth = src_render_texture.width;
            outputHeight = src_render_texture.height;
            outputNumTexturePixels = outputWidth * outputHeight * 4;
            texture2 = new Texture2D(outputWidth, outputHeight, TextureFormat.BGRA32, false);
            rect = new Rect(0, 0, outputWidth, outputHeight);
            setOutputWidthCS((uint)outputWidth);
            setOutputHeightCS((uint)outputHeight);
            initOutputBufferCS((uint)outputNumTexturePixels);
            outputArray = new byte[outputNumTexturePixels];
        }
        
        RenderTexture.active = src_render_texture;
        texture2.ReadPixels(rect, 0, 0);
        texture2.Apply();
        RenderTexture.active = null;
        outputArray = texture2.GetRawTextureData();

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
