using OpenCvSharp;

namespace BloodTracker.Infrastructure.Services;

internal static class ImagePreprocessor
{
    public static byte[] PreprocessImage(byte[] bgraBytes, int width, int height)
    {
        var handle = System.Runtime.InteropServices.GCHandle.Alloc(
            bgraBytes, System.Runtime.InteropServices.GCHandleType.Pinned);
        try
        {
            using var mat = new Mat(height, width, MatType.CV_8UC4, handle.AddrOfPinnedObject());
            using var gray = new Mat();
            Cv2.CvtColor(mat, gray, ColorConversionCodes.BGRA2GRAY);
            
            using var clahe = Cv2.CreateCLAHE(2.0, new Size(8, 8));
            using var enhanced = new Mat();
            clahe.Apply(gray, enhanced);
            
            using var binary = new Mat();
            Cv2.AdaptiveThreshold(enhanced, binary, 255,
                AdaptiveThresholdTypes.GaussianC,
                ThresholdTypes.Binary, 15, 8);
            
            Cv2.ImEncode(".png", binary, out var pngBytes);
            return pngBytes;
        }
        finally
        {
            handle.Free();
        }
    }
}
