import { BadRequestException } from '@nestjs/common';
import { VideosService } from './videos.service';

describe('VideosService HLS source validation', () => {
  const parseVideoSource = (url: string, provider = 'hls') =>
    (VideosService.prototype as any).parseVideoSource.call({}, url, provider);

  it('accepts direct HTTPS Bunny CDN HLS playlists', () => {
    const source = parseVideoSource('https://vz-example.b-cdn.net/video-guid/playlist.m3u8?token=abc');

    expect(source).toEqual({
      provider: 'hls',
      providerVideoId: 'https://vz-example.b-cdn.net/video-guid/playlist.m3u8?token=abc',
    });
  });

  it('accepts signed playlist URLs longer than the old provider id column', () => {
    const url = `https://vz-example.b-cdn.net/video-guid/playlist.m3u8?token=${'a'.repeat(300)}`;

    expect(parseVideoSource(url).providerVideoId).toBe(url);
  });

  it.each([
    'http://cdn.example.com/video/playlist.m3u8',
    'https://cdn.example.com/video/playlist.mp4',
    'https://user:password@cdn.example.com/video/playlist.m3u8',
    'javascript:alert(1)',
    `https://cdn.example.com/video/playlist.m3u8?token=${'a'.repeat(2050)}`,
  ])('rejects unsafe or non-HLS source %s', url => {
    expect(() => parseVideoSource(url)).toThrow(BadRequestException);
  });

  it('recognizes a direct HLS playlist even when the form still says Bunny Stream', () => {
    expect(parseVideoSource('https://cdn.example.com/video/playlist.m3u8', 'bunny')).toEqual({
      provider: 'hls',
      providerVideoId: 'https://cdn.example.com/video/playlist.m3u8',
    });
  });
});
