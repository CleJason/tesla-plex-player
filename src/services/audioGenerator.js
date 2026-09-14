/**
 * Generates a valid 16-bit PCM mono WAV buffer of a given duration and frequency.
 * Perfect for test playback, stream simulation, seeking, and range requests.
 */
export function generateToneWav(durationSeconds = 15, frequency = 440, sampleRate = 22050) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const totalSamples = Math.floor(sampleRate * durationSeconds);
  const dataSize = totalSamples * bytesPerSample;
  const headerSize = 44;
  const totalFileSize = headerSize + dataSize;

  const buffer = Buffer.alloc(totalFileSize);

  // RIFF chunk descriptor
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(totalFileSize - 8, 4);
  buffer.write('WAVE', 8);

  // "fmt " sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size for PCM
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28); // ByteRate
  buffer.writeUInt16LE(numChannels * bytesPerSample, 32);              // BlockAlign
  buffer.writeUInt16LE(bitsPerSample, 34);

  // "data" sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Generate pleasant melody / soft chord tone with gentle envelope
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    // Harmonic tone with fade-in and fade-out to prevent clicks
    const envelope = Math.min(1, t / 0.1) * Math.min(1, (durationSeconds - t) / 0.1);
    const sampleVal = Math.sin(2 * Math.PI * frequency * t) * 0.5 +
                      Math.sin(2 * Math.PI * (frequency * 1.5) * t) * 0.25;
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sampleVal * envelope * 24000)));
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  return buffer;
}
