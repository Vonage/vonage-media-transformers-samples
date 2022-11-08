using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class Texture2DExample : MonoBehaviour
{
    public Texture2D source;
    public Texture2D destination;
    public Renderer rend;
    public RenderTexture src_render_texture;
    int width = 640;
    int height = 480;
    Rect rect;
    Texture2D tmp_texture_2d;
    public GameObject panelRenderer;
    void Start()
    {

        //RenderTexture src_render_texture =
        //    new RenderTexture(width, height, 0,
        //                       RenderTextureFormat.ARGBHalf, RenderTextureReadWrite.Linear);
        //src_render_texture.autoGenerateMips = false;
        //src_render_texture.enableRandomWrite = false;
        //src_render_texture.filterMode = FilterMode.Bilinear;
        tmp_texture_2d =
          new Texture2D(width, height, TextureFormat.RGBA32, false, true);
        RenderTexture.active = src_render_texture;
        Vector3 screenPos = Camera.main.WorldToScreenPoint(panelRenderer.transform.position);
        // rect = new Rect(panelRenderer.transform.position.x, panelRenderer.transform.position.y, 640, 480);
        //rect = new Rect(0, 0, 640, 480);
        // rect = new Rect(0, 0, screenPos.x, screenPos.y);

        rect = new Rect(0, 0, 640, 480);
        //rect = new Rect(panelRenderer.transform.position.x, panelRenderer.transform.position.y, 640, 480);
        panelRenderer.transform.position = new Vector2(rect.center.x, rect.center.y);
        // panelRenderer.transform.position = new Vector2(rect.center.x,rect.center.y);
        // rect.center = new Vector2(panelRenderer.transform.position.x, panelRenderer.transform.position.y);
        // StartCoroutine(wait());

    }
    IEnumerator wait()
    {
        yield return new WaitForSeconds(2);
      
        //DrawRect(rect);
        tmp_texture_2d.ReadPixels(rect, 0, 0);
        Color[] pixels = tmp_texture_2d.GetPixels(0);
        for (int i = 0; i < pixels.Length * 4; i += 4)
        {
            Debug.Log(pixels[i]);
           
        }
        // tmp_texture_2d.Apply();


        //for (int pixel_y = 0; pixel_y < height; ++pixel_y)
        //{
        //    for (int pixel_x = 0; pixel_x < width; ++pixel_x)
        //    {
        //        Color c = tmp_texture_2d.GetPixel(pixel_x, pixel_y);
        //        Debug.LogFormat("pixel[{0},{1}] = {2}", pixel_x, pixel_y, c);
        //    }
        //}
    }
    void OnDrawGizmos()
    {
        // Green
        Gizmos.color = new Color(0.0f, 1.0f, 0.0f);
        DrawRect(rect);
    }

    void OnDrawGizmosSelected()
    {
        // Orange
        Gizmos.color = new Color(1.0f, 0.5f, 0.0f);
        DrawRect(rect);
    }

    void DrawRect(Rect rect)
    {
        Gizmos.DrawWireCube(new Vector3(rect.center.x, rect.center.y, 0.01f), new Vector3(rect.size.x, rect.size.y, 0.01f));
    }


}
