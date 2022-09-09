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
    private static extern void send_named_pipe(byte[] pipePath, byte[] buf);

    [DllImport("__Internal")]
    private static extern int read_from_pipe(byte[] pipePath, byte[] buf);

    private const int textureWidth = 640;
    private const int textureHeight = 480;
    private const int rgbaBytesPerPixel = 4;
    
    private const int maxPipeBufferSize = 16384;

    private const int numTexturePixels = textureWidth * textureHeight;
    private const int rgbaTotalBytes = textureWidth * textureHeight * rgbaBytesPerPixel;

    private static string libraryPath;
    private static string pipePath;

    private Texture2D texture;
    private RawImage img;
    private byte[] rgbaPipeBuffer;
    private Color32[] texturePixels;
    private bool isComponentEnabled;

    private void Start()
    {
#if UNITY_STANDALONE_OSX
        libraryPath = Application.persistentDataPath.Substring(0, Application.persistentDataPath.IndexOf("/Application Support"));
        pipePath = libraryPath + "/Containers/vonage.macOS-Test/Data/rgb_frame.raw";
#else
        pipePath = Application.persistentDataPath + "/myfifo";
#endif

        if(File.Exists(pipePath))
        {
            File.Delete(pipePath);
        }

        img = myPlane.GetComponent<RawImage>();
        texture = new Texture2D(textureWidth, textureHeight, TextureFormat.RGBA32, false)
        {
            wrapMode = TextureWrapMode.Clamp,
            filterMode = FilterMode.Point,
            anisoLevel = 1
        };

      //  rgbaPipeBuffer = new byte[maxPipeBufferSize];
        texturePixels = new Color32[numTexturePixels];

        //Thread th = new(new ThreadStart(() =>
        //{
        //    while (isComponentEnabled)
        //    {

        //        int currentPixelIndex = 0;
        //        // bytesRead += read_from_pipe(Encoding.ASCII.GetBytes(pipePath), rgbaPipeBuffer);
        //        rgbaPipeBuffer = File.ReadAllBytes(pipePath);

        //        for (int i = 0; i < rgbaPipeBuffer.Length; i += 4)
        //        {
        //            texturePixels[currentPixelIndex].r = rgbaPipeBuffer[i];
        //            texturePixels[currentPixelIndex].g = rgbaPipeBuffer[i + 1];
        //            texturePixels[currentPixelIndex].b = rgbaPipeBuffer[i + 2];
        //            texturePixels[currentPixelIndex].a = rgbaPipeBuffer[i + 3];
        //            currentPixelIndex++;
        //        }
        //    }


        //        //int bytesRead = 0;
        //        //int currentPixelIndex = 0;

        //        //while (bytesRead < rgbaTotalBytes)
        //        //{
        //        //    // bytesRead += read_from_pipe(Encoding.ASCII.GetBytes(pipePath), rgbaPipeBuffer);
        //        //    rgbaPipeBuffer = File.ReadAllBytes(pipePath);
        //        //    bytesRead += rgbaPipeBuffer.Length;

        //        //    for (int i = 0; i < rgbaPipeBuffer.Length; i += 4)
        //        //    {
        //        //        texturePixels[currentPixelIndex].r = rgbaPipeBuffer[i];
        //        //        texturePixels[currentPixelIndex].g = rgbaPipeBuffer[i + 1];
        //        //        texturePixels[currentPixelIndex].b = rgbaPipeBuffer[i + 2];
        //        //        texturePixels[currentPixelIndex].a = rgbaPipeBuffer[i + 3];
        //        //        currentPixelIndex++;
        //        //    }
        //        //}
        //}));


       // th.Start();

    }

    private void Update()
    {
        SetTexture();
    }

    public void SetTexture()
    {
        if (File.Exists(pipePath) == false) return;

        int currentPixelIndex = 0;
        try
        {
            rgbaPipeBuffer = File.ReadAllBytes(pipePath);

            for (int i = 0; i < rgbaPipeBuffer.Length; i += 4)
            {
                texturePixels[currentPixelIndex].r = rgbaPipeBuffer[i];
                texturePixels[currentPixelIndex].g = rgbaPipeBuffer[i + 1];
                texturePixels[currentPixelIndex].b = rgbaPipeBuffer[i + 2];
                texturePixels[currentPixelIndex].a = rgbaPipeBuffer[i + 3];
                currentPixelIndex++;
            }

            texture.SetPixels32(0, 0, textureWidth, textureHeight, texturePixels, 0);
            texture.Apply();
            img.texture = texture;
        }
        catch (Exception)
        {
        }
    }

    private void OnEnable()
    {
        isComponentEnabled = enabled;
    }

    private void OnDestroy()
    {
        isComponentEnabled = false;
    }

#endif
}
