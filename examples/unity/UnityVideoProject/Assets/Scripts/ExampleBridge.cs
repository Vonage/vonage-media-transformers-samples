using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System.Runtime.InteropServices;
using UnityEngine.UI;
using System.Threading;
using System.Text;
using System.IO;
using System;

public class ExampleBridge : MonoBehaviour
{

    public GameObject myPlane;
    
    public RenderTexture src_render_texture;

    public GameObject panelRenderer;

#if UNITY_WEBGL
    [DllImport("__Internal")]
    private static extern void SetUnityData(float[] inputArray, int inputSize, float[] outputArray, int outputSize, int width, int height);

    const int WIDTH = 640;
    const int HEIGHT = 480;
    const int BUFFER_SIZE = 640 * 480 * 4;

    float[] inputArray = new float[BUFFER_SIZE];
    float[] outputArray = new float[BUFFER_SIZE];
    Texture2D texture,texture2;
    private RawImage img;
    Color[] t;
    int len;
    Rect rect;

    void Start()
    {
        SetUnityData(inputArray, inputArray.Length, outputArray, outputArray.Length, WIDTH, HEIGHT);
        len = inputArray.Length / 4;
        t = new Color[len];
        img = (RawImage)myPlane.GetComponent<RawImage>();
        texture = new Texture2D(WIDTH, HEIGHT, TextureFormat.RGBA32, false);
        texture.wrapMode = TextureWrapMode.Clamp;
        texture.filterMode = FilterMode.Point;
        texture.anisoLevel = 1;
        texture2 = new Texture2D(WIDTH, HEIGHT, TextureFormat.RGBA32, false);
        rect = new Rect(0, 0, WIDTH, HEIGHT);
    }

    void CopyOutputArray()
    {
        RenderTexture.active = src_render_texture;
        texture2.ReadPixels(rect, 0, 0);
        texture2.Apply();
        RenderTexture.active = null;
        Color[] pixels = texture2.GetPixels(0);
        System.Array.Reverse(pixels, 0, pixels.Length);
        int y = 0;
        for (int i = 0; i < outputArray.Length; i += 4)
        {
            outputArray[i] = pixels[y].r;
            outputArray[i + 1] = pixels[y].g;
            outputArray[i + 2] = pixels[y].b;
            outputArray[i + 3] = pixels[y].a;
            y++;
        }
    }
    public void SetTexture()
    {
        for (int x = 0; x < len; x++)
        {
            int currentIndex = x * 4;
            Color color = new Color(inputArray[currentIndex],
                                    inputArray[currentIndex + 1],
                                    inputArray[currentIndex + 2],
                                    inputArray[currentIndex + 3]);
            t[x] = color;
        }
      
        texture.SetPixels(0, 0, WIDTH, HEIGHT, t, 0);
        texture.Apply();
        img.texture = texture;
        StartCoroutine(wait());

    }
    IEnumerator wait()
    {
        yield return new WaitForEndOfFrame();
        CopyOutputArray();
    }
#else

    [DllImport("__Internal")]
    private static extern void initInputBufferCS(UInt32 size);

    [DllImport("__Internal")]
    private static extern void getInputBufferCS(UInt32[] outBuffer);

    [DllImport("__Internal")]
    private static extern void setInputBufferDataCS(UInt32[] bufferData);

    [DllImport("__Internal")]
    private static extern bool isNewBufferDataAvailable();

    const int WIDTH = 640;
    const int HEIGHT = 480;
    const int BUFFER_SIZE = 640 * 480 * 4;

    private const int numTexturePixels = WIDTH * HEIGHT;

    UInt32[] inputArray;

    private Texture2D texture;
    private RawImage img;
    private Color32[] texturePixels;
    
    private void Start()
    {
        initInputBufferCS(numTexturePixels);
        inputArray = new UInt32[numTexturePixels];

        img = myPlane.GetComponent<RawImage>();
        texture = new Texture2D(WIDTH, HEIGHT, TextureFormat.RGBA32, false)
        {
            wrapMode = TextureWrapMode.Clamp,
            filterMode = FilterMode.Point,
            anisoLevel = 1
        };

        texturePixels = new Color32[numTexturePixels];

        StartCoroutine(UpdateTexture());
    }

    private IEnumerator UpdateTexture()
    {
        while (gameObject.activeSelf)
        {
            yield return new WaitForEndOfFrame();

            if (isNewBufferDataAvailable() == false) continue;

            Array.Clear(inputArray, 0, inputArray.Length);

            getInputBufferCS(inputArray);

            yield return SetTexture();
        }
    }

    public IEnumerator SetTexture()
    {
        Array.Clear(texturePixels, 0, texturePixels.Length);

        try
        {
            for (int i = 0; i < inputArray.Length; i++)
            {
                texturePixels[i].b = (byte)((inputArray[i]) & 0xFF);
                texturePixels[i].g = (byte)((inputArray[i] >> 8) & 0xFF);
                texturePixels[i].r = (byte)((inputArray[i] >> 16) & 0xFF);
                texturePixels[i].a = (byte)((inputArray[i] >> 24) & 0xFF);
            }

            texture.SetPixels32(0, 0, WIDTH, HEIGHT, texturePixels, 0);
            texture.Apply();
            img.texture = texture;
        }
        catch (Exception ex)
        {
            Debug.LogError(ex.Message);
            yield break;
        }
    }

#endif
}
