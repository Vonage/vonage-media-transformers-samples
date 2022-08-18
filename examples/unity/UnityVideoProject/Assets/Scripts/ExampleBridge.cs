using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System.Runtime.InteropServices;
using UnityEngine.UI;

public class ExampleBridge : MonoBehaviour
{

    float[] inputArray = new float[1228800];//307200
    float[] outputArray = new float[1228800];
    public GameObject myPlane;
    Texture2D texture,texture2;
    public RenderTexture src_render_texture;
    private RawImage img;
    Color[] t;
    int len;
    Rect rect;
    public GameObject panelRenderer;
    [DllImport("__Internal")]
    private static extern void SetArrays(float[] inputArray, int inputSize, float[] outputArray, int outputSize);
    [DllImport("__Internal")]
    private static extern void TestFun();
   
    void Start()
    {
        SetArrays(inputArray, inputArray.Length, outputArray, outputArray.Length);
        len = inputArray.Length / 4;
        t = new Color[len];
        img = (RawImage)myPlane.GetComponent<RawImage>();
        texture = new Texture2D(640, 480, TextureFormat.RGBA32, false);
        texture.wrapMode = TextureWrapMode.Clamp;
        texture.filterMode = FilterMode.Point;
        texture.anisoLevel = 1;
        texture2 = new Texture2D(640, 480, TextureFormat.RGBA32, false);
        rect = new Rect(0, 0, 640, 480);
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
      
        texture.SetPixels(0, 0, 640, 480, t, 0);
        texture.Apply();
        img.texture = texture;
        StartCoroutine(wait());

    }
    IEnumerator wait()
    {
        yield return new WaitForEndOfFrame();
        CopyOutputArray();
    }
}
