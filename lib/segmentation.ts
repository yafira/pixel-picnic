import {
  FilesetResolver,
  ImageSegmenter,
  type ImageSegmenterResult,
} from "@mediapipe/tasks-vision";

// pinned to a specific version rather than @latest, since the wasm
// runtime and model need to actually match -- an unpinned version
// could silently drift out of sync between deploys.
const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";

let segmenterPromise: Promise<ImageSegmenter> | null = null;

/**
 * Lazily creates (and caches) the on-device selfie segmentation model.
 * Everything happens client-side via wasm/GPU -- the model file and
 * wasm runtime are fetched once, then every frame after that is
 * processed locally. No frame is ever sent anywhere.
 */
export function getSegmenter(): Promise<ImageSegmenter> {
  if (!segmenterPromise) {
    segmenterPromise = FilesetResolver.forVisionTasks(WASM_BASE).then(
      (vision) =>
        ImageSegmenter.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          outputCategoryMask: false,
          outputConfidenceMasks: true,
        }),
    );
  }
  return segmenterPromise;
}

export interface SegmentationMask {
  /** foreground confidence, 0..1, row-major, at the model's native size */
  data: Float32Array;
  width: number;
  height: number;
}

/**
 * Runs segmentation on a single video frame. timestampMs must be
 * monotonically increasing across calls for the same segmenter
 * instance -- MediaPipe's video-mode API uses it for internal
 * temporal smoothing between frames.
 */
export function segmentVideoFrame(
  segmenter: ImageSegmenter,
  video: HTMLVideoElement,
  timestampMs: number,
): Promise<SegmentationMask | null> {
  return new Promise((resolve) => {
    segmenter.segmentForVideo(
      video,
      timestampMs,
      (result: ImageSegmenterResult) => {
        const confidenceMask = result.confidenceMasks?.[0];
        if (!confidenceMask) {
          resolve(null);
          return;
        }
        const data = confidenceMask.getAsFloat32Array();
        const width = confidenceMask.width;
        const height = confidenceMask.height;
        confidenceMask.close();
        resolve({ data, width, height });
      },
    );
  });
}

export function disposeSegmenter(): void {
  if (segmenterPromise) {
    segmenterPromise.then((s) => s.close());
    segmenterPromise = null;
  }
}
