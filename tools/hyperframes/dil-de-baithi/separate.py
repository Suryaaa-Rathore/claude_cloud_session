#!/usr/bin/env python3
"""Splits the song into vocals / music with the UVR-MDX-NET-Voc_FT model (sherpa-onnx)."""
import sys, time
import numpy as np, soundfile as sf, sherpa_onnx
model = "/opt/tools/models/UVR-MDX-NET-Voc_FT.onnx"
cfg = sherpa_onnx.OfflineSourceSeparationConfig(model=sherpa_onnx.OfflineSourceSeparationModelConfig(
    uvr=sherpa_onnx.OfflineSourceSeparationUvrModelConfig(model=model), num_threads=4, provider="cpu"))
sp = sherpa_onnx.OfflineSourceSeparation(cfg)
x, sr = sf.read("stems/song.wav", dtype="float32", always_2d=True)
t = time.time()
out = sp.process(sample_rate=sr, samples=np.ascontiguousarray(x.T))
sf.write("stems/vocals.wav", out.stems[0].data.T, out.sample_rate)
sf.write("stems/music.wav", out.stems[1].data.T, out.sample_rate)
print(f"done in {time.time()-t:.0f}s")
