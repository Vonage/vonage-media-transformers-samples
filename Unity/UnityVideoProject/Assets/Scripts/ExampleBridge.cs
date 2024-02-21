using System.Collections;
using UnityEngine;
using System.Runtime.InteropServices;
using UnityEngine.UI;
using System;
using System.Text;
using System.Threading.Tasks;

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
    private static extern void initInputBuffersCS(byte[] rgb_buffer, UInt32 rgb_size, byte[] augmented_buffer, UInt32 augmented_size);

    [DllImport("__Internal")]
    private static extern void initOutputBufferCS(byte[] output_buffer, UInt32 size);

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
    private static extern void setRoomNameAndRoleCS(byte[] roomName, bool isSender, bool enableLogs);

    [DllImport("__Internal")]
    private static extern void hangupCS();

    [DllImport("__Internal")]
    private static extern bool getUnityRendererCS();

#endif

    const int inputWidth = 640;
    const int inputHeight = 480;

    int outputWidth = 0;
    int outputHeight = 0;
    const int outputRotation = 90;

    private const int inputNumTexturePixels = inputWidth * inputHeight * 4;
    private const int inputNumAugmentedBytes = inputWidth * inputHeight * 4;
    private int outputNumTexturePixels = 0;

    byte[] inputArray = new byte[inputNumTexturePixels];
    byte[] inputAugmentedArray = new byte[inputNumAugmentedBytes];
    byte[] outputArray;

    private Texture2D inputTexture, outputTexture;
    private RawImage img;
    Rect rect;

    private void Start()
    {
#if UNITY_WEBGL
        SetUnityData(inputArray, inputArray.Length, outputArray, outputArray.Length, width, height);
#else
        setInputWidthCS(inputWidth);
        setInputHeightCS(inputHeight);
        
        initInputBuffersCS(inputArray, inputNumTexturePixels, inputAugmentedArray, inputNumAugmentedBytes);
        
#endif
        img = myPlane.GetComponent<RawImage>();
        inputTexture = new Texture2D(inputWidth, inputHeight, TextureFormat.BGRA32, false)
        {
            wrapMode = TextureWrapMode.Clamp,
            filterMode = FilterMode.Point,
            anisoLevel = 1
        };
    }

    public void setRoomNameAndRole(string roomName, bool isSender, bool enableLogs)
    {
        setRoomNameAndRoleCS(Encoding.UTF8.GetBytes(roomName), isSender, enableLogs);
    }

    public void hangup(){
        hangupCS();
    }

    public void SetTexture()
    {
        try
        {
#if !UNITY_WEBGL
            int rotation = getInputRotationCS();
#endif
            inputTexture.LoadRawTextureData(inputArray);

            inputTexture.Apply(false);
            img.texture = inputTexture;
            if(getUnityRendererCS() == false){
                StartCoroutine(WaitAndCopyOutputArray());
            }
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
            outputTexture = new Texture2D(outputWidth, outputHeight, TextureFormat.BGRA32, false);
            rect = new Rect(0, 0, outputWidth, outputHeight);
            setOutputWidthCS((uint)outputWidth);
            setOutputHeightCS((uint)outputHeight);
            outputArray = new byte[outputNumTexturePixels];
            initOutputBufferCS(outputArray, (uint)outputNumTexturePixels);
        }

        RenderTexture.active = src_render_texture;
        outputTexture.ReadPixels(rect, 0, 0);
        outputTexture.Apply(false);
        RenderTexture.active = null;
        outputArray = outputTexture.GetRawTextureData();

#if !UNITY_WEBGL
        setOutputRotationCS(outputRotation);
#endif
    }

    IEnumerator WaitAndCopyOutputArray()
    {
        yield return new WaitForEndOfFrame();
        CopyOutputArray();
    }
}
